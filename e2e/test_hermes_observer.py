"""Offline observer safety checks; no Hermes/model credentials required."""
import queue
import sys
import tempfile
import threading
import types
import unittest
from pathlib import Path
from unittest.mock import patch
from atflows.integrations.hermes.observer import Observer, normalize


class ObserverTests(unittest.TestCase):
    def test_bounded_queue_and_profile_isolation(self):
        with tempfile.TemporaryDirectory() as temporary:
            home = str(Path(temporary).resolve())
            observer = Observer({'token': 'a' * 64, 'connection_id': 'connection'}, home, Path(home))
            module = types.SimpleNamespace(get_hermes_home=lambda: Path(home))
            payload = dict(platform='cli', session_id='session', api_request_id='request')
            with patch.dict(sys.modules, {'hermes_constants': module}):
                for _ in range(130):
                    observer.observe('post_api_request', **payload)
                self.assertEqual(observer.pending.qsize(), 128)
                self.assertEqual(observer.dropped, 2)
                module.get_hermes_home = lambda: Path(home) / 'different-profile'
                observer.observe('post_api_request', **payload)
                self.assertEqual(observer.dropped, 2)
                self.assertEqual(observer.pending.qsize(), 128)

    def test_receiver_failure_is_nonblocking_and_reported_without_raw_error(self):
        with tempfile.TemporaryDirectory() as temporary:
            home = str(Path(temporary).resolve())
            config = {'token': 'a' * 64, 'connection_id': 'connection', 'endpoint': 'http://127.0.0.1:1'}
            observer = Observer(config, home, Path(home))
            observer.pending.put(normalize(config, 'post_api_request', {'api_request_id': 'request'}))
            observer.closed.set()
            with patch('http.client.HTTPConnection', side_effect=lambda *a, **k: BrokenConnection()):
                observer.worker()
            self.assertEqual(observer.dropped, 1)
            self.assertEqual(observer.error, 'receiver_unavailable_or_rejected')
            self.assertNotIn('CANARY', (Path(home) / 'status.json').read_text())

    def test_missing_ids_and_usage_do_not_become_successful_zero_calls(self):
        e = normalize({'token': 'a' * 64, 'connection_id': 'connection'}, 'post_api_request', {})
        self.assertEqual(e['kind'], 'diagnostic')
        self.assertIsNone(e['input_tokens'])
        self.assertIsNone(e['output_tokens'])
        self.assertIsNone(e['request_id'])


class BrokenConnection:
    def request(self, *args, **kwargs):
        raise OSError('CANARY-SECRET')
    def close(self):
        pass


if __name__ == '__main__':
    unittest.main()
