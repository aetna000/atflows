"""Optional standalone continuity observations, without execution authority."""
from concurrent.futures import Future
from contextlib import contextmanager
import json
from threading import BoundedSemaphore, Thread
import time
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler, ProxyHandler
import uuid


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        raise PermissionError("credentialed observations cannot follow redirects")


class ContinuityObserver:
    _slots = BoundedSemaphore(8)

    def __init__(self, url, token):
        parsed = urlsplit(url)
        if not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError("use a base URL without credentials, query or fragment")
        if parsed.scheme != "https" and not (parsed.scheme == "http" and parsed.hostname in {"127.0.0.1", "::1", "localhost"}):
            raise ValueError("use HTTPS, or HTTP on loopback only")
        if not token:
            raise ValueError("a producer token is required")
        self.url, self.token, self.errors = url.rstrip("/"), token, []
        self.error_count = 0
        self.opener = build_opener(ProxyHandler({}), NoRedirect())

    def __call__(self, event):
        encoded = json.dumps(event, allow_nan=False).encode()
        if len(encoded) > 8192:
            raise ValueError("observation exceeds 8 KiB")
        if not self._slots.acquire(blocking=False):
            raise TimeoutError("observation capacity unavailable")
        future = Future()
        def send():
            try:
                request = Request(self.url + "/v1/continuity/events", data=encoded,
                    headers={"Content-Type": "application/json", "Authorization": "Bearer " + self.token})
                with self.opener.open(request, timeout=2) as response:
                    body = response.read(8193)
                if len(body) > 8192:
                    raise ValueError("observation acknowledgement too large")
                acknowledgement = json.loads(body)
                if not isinstance(acknowledgement, dict) or acknowledgement.get("accepted") is not True:
                    raise ValueError("observer did not acknowledge acceptance")
                future.set_result(acknowledgement)
            except BaseException as exc:
                future.set_exception(exc)
            finally:
                self._slots.release()
        try:
            Thread(target=send, daemon=True).start()
        except BaseException:
            self._slots.release()
            raise
        return future.result(timeout=2)

    def _emit(self, identity, event, **accounting):
        try:
            self({"format": "atmem.continuity.v1", "event_id": "ce_" + uuid.uuid4().hex,
                  **identity, "event": event, "time": time.time(), **accounting})
            return True
        except Exception as exc:
            self.error_count += 1
            if len(self.errors) < 100:
                self.errors.append(type(exc).__name__)
            return False

    @contextmanager
    def attempt(self, *, workflow_id, operation_id, run_id, attempt_id=None, retry=False, recovery=False):
        identity = dict(workflow_id=workflow_id, operation_id=operation_id, run_id=run_id,
            attempt_id=attempt_id or "attempt_" + uuid.uuid4().hex, retry=retry, recovery=recovery)
        self._emit(identity, "execute")
        observer = self
        class Attempt:
            def charge(self, *, charge_id, charge_source, cost_microusd=None, input_tokens=None, output_tokens=None, price_source=None):
                fields = dict(charge_id=charge_id, charge_source=charge_source, cost_microusd=cost_microusd,
                              input_tokens=input_tokens, output_tokens=output_tokens, price_source=price_source)
                return observer._emit(identity, "usage", **{k: v for k, v in fields.items() if v is not None})
        try:
            yield Attempt()
        except BaseException:
            self._emit(identity, "unknown")
            raise
        else:
            self._emit(identity, "completed")
