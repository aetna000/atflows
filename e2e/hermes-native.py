"""Opt-in installed-Hermes smoke: local Ollama, isolated Home, production plugin."""
import os
import sys
import time
from pathlib import Path

source, isolated_home = sys.argv[1:3]
sys.path.insert(0, source)
import hermes_bootstrap  # Bootstrap installed dependencies before selecting the isolated Home.
os.environ['HERMES_HOME'] = isolated_home
from hermes_cli.plugins import discover_plugins
discover_plugins(force=True)
from hermes_cli.lifecycle import invoke_hook

invoke_hook('post_api_request', platform='cli', session_id='test-session', task_id='task',
            api_request_id='zero-request', started_at=1700000000.0, ended_at=1700000000.01,
            model='qwen3:1.7b', provider='ollama', usage={'prompt_tokens': 0, 'output_tokens': 0},
            response='CANARY_RESPONSE_NEVER_EXPORT')
invoke_hook('api_request_error', platform='cli', session_id='test-session', task_id='task',
            api_request_id='failed-request', started_at=1700000001.0, ended_at=1700000001.01,
            model='qwen3:1.7b', provider='ollama', status_code=429, retry_count=1,
            error='CANARY_ERROR_NEVER_EXPORT')
invoke_hook('post_tool_call', session_id='test-session', task_id='task', api_request_id='zero-request',
            tool_call_id='tool-one', tool_name='terminal', duration_ms=3, status='ok',
            args={'secret': 'CANARY_TOOL_NEVER_EXPORT'}, result='CANARY_RESULT_NEVER_EXPORT')

from run_agent import AIAgent
agent = AIAgent(base_url='http://127.0.0.1:11434/v1', api_key='local-ollama', provider='custom',
                api_mode='chat_completions', model='qwen3:1.7b', max_iterations=2, max_tokens=256,
                enabled_toolsets=[], quiet_mode=True, platform='cli', session_id='atflows-native-smoke',
                skip_context_files=True, skip_memory=True, skip_background_review=True,
                run_budget_seconds=45, reasoning_config={'enabled': False})
result = agent.run_conversation('Reply with the word READY. /no_think')
print('NATIVE_CONVERSATION_RETURNED', bool(result))
time.sleep(2)
