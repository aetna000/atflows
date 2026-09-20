# Pydantic AI → AtFlows

**Working:** Pydantic AI 1.107.5 and 2.46.0 each sent an agent turn through AtFlows; the model and upstream token usage appeared in Traces. This recipe captures model calls. Agent spans need separate instrumentation.

1. Start AtFlows: `atflows`.
2. Install the client: `pip install 'pydantic-ai-slim[openai]'`.
3. Use a model installed in your local Ollama server:

   ```python
   from pydantic_ai import Agent
   from pydantic_ai.models.openai import OpenAIChatModel
   from pydantic_ai.providers.openai import OpenAIProvider

   model = OpenAIChatModel(
       "your-model",
       provider=OpenAIProvider(
           base_url="http://127.0.0.1:8080/ollama/v1",
           api_key="local",
       ),
   )
   print(Agent(model).run_sync("Hello").output)
   ```

4. Open **Activity → Traces**. Usage appears when the upstream response provides it.

For a hosted OpenAI model, use the AtFlows `/v1` proxy route and your normal provider API key. The local Ollama route above is the tested recipe. Copy your active proxy address from Connect if the port differs.
