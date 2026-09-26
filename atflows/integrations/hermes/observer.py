"""No hook bodies, model responses, tool arguments, results or credentials exported."""

import atexit
import hashlib
import hmac
import http.client
import json
import math
import os
from pathlib import Path
import queue
import re
import stat
import threading
import time
import uuid

FORMAT = "atflows.hermes.v1"
IDENTITIES = ("session_id", "task_id", "turn_id", "request_id", "tool_id")
_SECRET = re.compile(r"bearer|password|secret|api[_-]?key|authorization|(?:sk-|gh[pousr]_|github_pat_|xox[baprs]-|AKIA)[A-Za-z0-9_-]*|eyJ[A-Za-z0-9_-]+\.", re.I)
_OBSERVERS = {}


def safe_label(value):
    return value if isinstance(value, str) and len(value) <= 128 and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:/-]*", value) and not _SECRET.search(value) else "other"


def number(value, maximum=1_000_000_000):
    return value if type(value) is int and 0 <= value <= maximum else None


def event_identity(event):
    values = [event["connection_id"], *(event[k] for k in IDENTITIES), event["kind"], event["started_at"], event["ended_at"], event["retry_count"]]
    return hashlib.sha256(json.dumps(values, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()


def normalize(config, hook, payload, dropped=0):
    def identity(value):
        if not isinstance(value, str) or not value or len(value) > 4096:
            return None
        return hmac.new(bytes.fromhex(config["token"]), value.encode(), hashlib.sha256).hexdigest()

    def milliseconds(value, fallback):
        if type(value) not in (float, int) or not math.isfinite(value) or value < 0 or value > 10**12:
            return fallback
        return int(value * 1000)

    now = int(time.time() * 1000)
    end = milliseconds(payload.get("ended_at"), now)
    start = milliseconds(payload.get("started_at"), end)
    if hook == "post_tool_call":
        duration = number(payload.get("duration_ms"))
        start = end - duration if duration is not None else end
    kind = {"post_api_request": "request", "api_request_error": "request_error", "post_tool_call": "tool"}[hook]
    event = {"format": FORMAT, "connection_id": config["connection_id"],
             "session_id": identity(payload.get("session_id")), "task_id": identity(payload.get("task_id")),
             "turn_id": identity(payload.get("turn_id")), "request_id": identity(payload.get("api_request_id")),
             "tool_id": identity(payload.get("tool_call_id")), "kind": kind,
             "started_at": max(0, min(start, end)), "ended_at": end,
             "retry_count": number(payload.get("retry_count")),
             "model": safe_label(payload.get("model")), "provider": payload.get("provider") if payload.get("provider") in ("openai", "anthropic", "openrouter", "ollama", "custom", "google", "nous") else "other",
             "tool": safe_label(payload.get("tool_name")), "outcome": "ok" if kind == "request" else "error" if kind == "request_error" else payload.get("status") if payload.get("status") in ("ok", "error") else "unknown",
             "status_code": number(payload.get("status_code"), 599), "input_tokens": None, "output_tokens": None,
             "dropped_total": min(dropped, 1_000_000_000)}
    if event["status_code"] is not None and event["status_code"] < 100:
        event["status_code"] = None
    if (kind in ("request", "request_error") and not event["request_id"]) or (kind == "tool" and not event["tool_id"]):
        event["kind"] = "diagnostic"
    usage = payload.get("usage")
    if event["kind"] == "request" and isinstance(usage, dict):
        event["input_tokens"] = number(usage.get("prompt_tokens"))
        event["output_tokens"] = number(usage.get("output_tokens"))
    event["event_id"] = event_identity(event)
    return event


def private_json(file):
    fd = os.open(file, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077 or info.st_size > 8192 or info.st_nlink != 1:
            raise ValueError("unsafe_connection")
        with os.fdopen(fd, "r", closefd=False) as stream:
            return json.load(stream)
    finally:
        os.close(fd)


class Observer:
    def __init__(self, config, home, directory):
        self.config, self.home, self.directory = config, home, directory
        self.pending = queue.Queue(maxsize=128)
        self.dropped = 0
        self.sent = 0
        self.error = None
        self.lock = threading.Lock()
        self.closed = threading.Event()
        self.sessions = set()

    def observe(self, hook, **payload):
        try:
            if self.closed.is_set():
                return
            from hermes_constants import get_hermes_home
            if str(get_hermes_home().resolve()) != self.home or payload.get("platform") not in (None, "", "cli"):
                return
            session = payload.get("session_id")
            if hook == "post_tool_call" and session not in self.sessions:
                return
            if hook != "post_tool_call" and payload.get("platform") == "cli" and isinstance(session, str):
                if len(self.sessions) >= 1024:
                    self.sessions.clear()
                self.sessions.add(session)
            event = normalize(self.config, hook, payload, self.dropped)
            self.pending.put_nowait(event)
        except Exception:
            with self.lock:
                self.dropped += 1

    def report(self):
        try:
            target = self.directory / "status.json"
            temporary = self.directory / (".status-" + str(uuid.uuid4()))
            fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
            with os.fdopen(fd, "w") as stream:
                json.dump({"format": FORMAT, "sent": self.sent, "dropped": self.dropped, "error": self.error, "updated_at": int(time.time() * 1000)}, stream)
            os.replace(temporary, target)
        except Exception:
            pass

    def worker(self):
        port = int(self.config["endpoint"].rsplit(":", 1)[1])
        while not self.closed.is_set() or not self.pending.empty():
            try:
                event = self.pending.get(timeout=0.25)
            except queue.Empty:
                continue
            connection = http.client.HTTPConnection("127.0.0.1", port, timeout=1)
            try:
                encoded = json.dumps(event, separators=(",", ":")).encode()
                connection.request("POST", "/v1/hermes/events", encoded, {"Content-Type": "application/json", "Authorization": "Bearer " + self.config["token"]})
                response = connection.getresponse()
                if response.status != 200:
                    raise ValueError("delivery_failed")
                self.sent += 1
                self.error = None
            except Exception:
                with self.lock:
                    self.dropped += 1
                self.error = "receiver_unavailable_or_rejected"
            finally:
                connection.close()
                self.pending.task_done()
                self.report()

    def shutdown(self):
        self.closed.set()
        self.thread.join(timeout=2)


def register(ctx):
    try:
        from hermes_constants import get_hermes_home
        from agent.memory_provider import spawn_context_thread
        directory = Path(__file__).resolve().parent
        home = str(get_hermes_home().resolve())
        if os.name == "nt" or directory != Path(home) / "plugins" / "atflows":
            return
        config = private_json(directory / "connection.json")
        uuid.UUID(config.get("connection_id", ""))
        uuid.UUID(config.get("profile_id", ""))
        if config.get("format") != FORMAT or config.get("home") != home or not re.fullmatch(r"[a-f0-9]{64}", config.get("token", "")):
            return
        if not re.fullmatch(r"http://127\.0\.0\.1:[0-9]{1,5}", config.get("endpoint", "")) or not 1 <= int(config["endpoint"].rsplit(":", 1)[1]) <= 65535:
            return
        previous = _OBSERVERS.get(home)
        if previous:
            previous.closed.set()
        observer = Observer(config, home, directory)
        _OBSERVERS[home] = observer
        for hook in ("post_api_request", "api_request_error", "post_tool_call"):
            ctx.register_hook(hook, lambda _hook=hook, **payload: observer.observe(_hook, **payload))
        observer.thread = spawn_context_thread(observer.worker, name="atflows-hermes-observer", daemon=True)
        observer.thread.start()
        atexit.register(observer.shutdown)
    except Exception:
        return
