import unittest
from unittest.mock import patch
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import threading
import json
import os

from atflows.continuity import ContinuityObserver


class ObserverTests(unittest.TestCase):
    def test_actual_http_proxy_redirect_and_acknowledgement_boundaries(self):
        paths = []
        reply = {'accepted': True}
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass
            def do_POST(self):
                paths.append(self.path)
                self.rfile.read(int(self.headers.get('Content-Length', '0')))
                if reply.get('redirect'):
                    self.send_response(reply['redirect'])
                    self.send_header('Location', '/stolen')
                    self.end_headers()
                    return
                body = json.dumps(reply).encode()
                self.send_response(200)
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with patch.dict(os.environ, {'http_proxy': 'http://127.0.0.1:1', 'https_proxy': 'http://127.0.0.1:1', 'no_proxy': ''}), patch('urllib.request.proxy_bypass', return_value=False):
                observer = ContinuityObserver(f'http://127.0.0.1:{server.server_port}', 'test-only')
                self.assertTrue(observer({'event': 'test'})['accepted'])
                reply['accepted'] = False
                with self.assertRaisesRegex(ValueError, 'acceptance'):
                    observer({'event': 'test'})
                for status in [301, 302, 303, 307, 308]:
                    reply['redirect'] = status
                    with self.assertRaises(Exception):
                        observer({'event': 'test'})
                self.assertEqual(paths, ['/v1/continuity/events'] * 7)
        finally:
            server.shutdown(); server.server_close(); thread.join(3)

    def test_attempt_emits_linked_usage_without_execution_decisions(self):
        observer = ContinuityObserver('http://127.0.0.1:1337', 'test-token')
        events = []
        with patch.object(ContinuityObserver, '__call__', lambda self, event: events.append(event)):
            with observer.attempt(workflow_id='w', operation_id='o', run_id='r', retry=True) as attempt:
                attempt.charge(charge_id='provider-request', charge_source='provider',
                               cost_microusd=100, price_source='fixed-test-tariff')
        self.assertEqual([e['event'] for e in events], ['execute', 'usage', 'completed'])
        self.assertEqual(len({e['attempt_id'] for e in events}), 1)
        self.assertNotIn('cost_microusd', events[0])
        self.assertTrue(all(e['retry'] for e in events))

    def test_observer_outage_does_not_prevent_or_retry_application(self):
        observer = ContinuityObserver('http://127.0.0.1:1337', 'test-token')
        effects = []
        with patch.object(ContinuityObserver, '__call__', side_effect=ConnectionError('offline')):
            with observer.attempt(workflow_id='w', operation_id='o', run_id='r'):
                effects.append('one call')
        self.assertEqual(effects, ['one call'])
        self.assertEqual(observer.errors, ['ConnectionError', 'ConnectionError'])
        self.assertEqual(observer.error_count, 2)

    def test_error_count_continues_after_diagnostic_sample_fills(self):
        observer = ContinuityObserver('http://127.0.0.1:1337', 'test-only')
        with patch.object(ContinuityObserver, '__call__', side_effect=ConnectionError('offline')):
            for _ in range(110):
                observer._emit({}, 'execute')
        self.assertEqual(observer.error_count, 110)
        self.assertEqual(len(observer.errors), 100)

    def test_application_error_is_not_swallowed(self):
        observer = ContinuityObserver('http://127.0.0.1:1337', 'test-token')
        events = []
        with patch.object(ContinuityObserver, '__call__', lambda self, event: events.append(event)):
            with self.assertRaisesRegex(RuntimeError, 'application'):
                with observer.attempt(workflow_id='w', operation_id='o', run_id='r'):
                    raise RuntimeError('application')
        self.assertEqual([e['event'] for e in events], ['execute', 'unknown'])

    def test_invalid_event_does_not_consume_delivery_capacity(self):
        observer = ContinuityObserver('http://127.0.0.1:1337', 'test-token')
        for _ in range(10):
            with self.assertRaises(ValueError):
                observer({'bad': float('nan')})
        self.assertTrue(observer._slots.acquire(blocking=False))
        observer._slots.release()


if __name__ == '__main__':
    unittest.main()
