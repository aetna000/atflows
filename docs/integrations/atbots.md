# AtBots → AtFlows

**Working:** AtBots 0.2.0 completed a task through AtFlows. AtFlows recorded its model call and upstream token usage. AtBots task and tool events are not sent by this proxy recipe.

1. Start AtFlows: `atflows`. Keep your local Ollama server running with the selected model installed.
2. Install AtBots following its [package instructions](https://github.com/aetna000/atbots). Run `atbots init` if you have no config yet.
3. Edit `~/.atbots/config.json` on macOS or Linux. On Windows, edit `%USERPROFILE%\.atbots\config.json`. If your existing installation uses the legacy `~/.atbot/config.json`, edit that active file instead. Add this entry inside `providers`, replacing `your-model` with the installed model name:

   ```json
   {
     "name": "atflows",
     "kind": "openai-compatible",
     "model": "your-model",
     "endpoint": "http://127.0.0.1:8080/ollama",
     "egress_class": "local"
   }
   ```

4. Run an AtBots task and open **Activity → Traces**. The AtBots provider checks `/v1/models` before it runs, so both that route and the selected model must work. Copy the active proxy address from Connect if the port differs.

For a hosted OpenAI-compatible provider, use the appropriate AtFlows proxy path, preserve its existing `api_key_env`, and set the required egress policy in AtBots. The local Ollama route above is the tested recipe.
