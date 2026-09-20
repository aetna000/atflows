# LangChain → AtFlows

**Working:** LangChain OpenAI 1.3.3 model calls passed through AtFlows and appeared in Traces with model and token usage. This route records model calls; LangChain chain and tool spans need separate instrumentation.

1. Start AtFlows: `atflows`.
2. Install the Python integration: `pip install langchain-openai`.
3. Use the local Ollama proxy route with a model your Ollama server has installed:

   ```python
   from langchain_openai import ChatOpenAI

   model = ChatOpenAI(
       model="your-model",
       base_url="http://127.0.0.1:8080/ollama/v1",
       api_key="local",
   )
   print(model.invoke("Hello").content)
   ```

4. Open **Activity → Traces** and find the model call. Usage appears when the upstream response provides it.

For a hosted OpenAI model, set `base_url="http://127.0.0.1:8080/v1"` and use your normal `OPENAI_API_KEY` as the client key. The local Ollama route above is the tested recipe. The Connect screen displays the active proxy port if yours differs from 8080.
