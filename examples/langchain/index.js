/**
 * LangChain.js + AtFlow Integration Example
 *
 * This example shows how to trace LangChain applications by routing
 * API calls through the AtFlow proxy.
 *
 * Prerequisites:
 *   1. Start AtFlow: cd ../.. && npm start
 *   2. Set your OpenAI API key in .env at project root
 *   3. Run: make examples (from project root)
 */

import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'

const ATFLOW_PROXY = process.env.ATFLOW_PROXY || 'http://localhost:8080/v1'
const ATFLOW_DASHBOARD =
    process.env.ATFLOW_DASHBOARD || process.env.ATFLOW_URL || 'http://localhost:3000'

// Check for API key early
if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY not set')
    console.error('Add it to .env in project root')
    process.exit(1)
}

console.log(`LangChain routing through AtFlow proxy at ${ATFLOW_PROXY}`)

async function runExample() {
    // Configure LangChain to use AtFlow proxy
    const model = new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: 0.7,
        configuration: {
            baseURL: ATFLOW_PROXY,
        },
    })

    const prompt = ChatPromptTemplate.fromTemplate(
        'You are a helpful assistant. Answer this question concisely: {question}',
    )

    const outputParser = new StringOutputParser()

    // Create a chain
    const chain = prompt.pipe(model).pipe(outputParser)

    console.log('\n--- Running LangChain Example ---\n')

    // Example 1: Simple question
    console.log('Q: What is the capital of France?')
    const result1 = await chain.invoke({ question: 'What is the capital of France?' })
    console.log(`A: ${result1}\n`)

    // Example 2: Another question
    console.log('Q: Explain async/await in JavaScript in one sentence')
    const result2 = await chain.invoke({
        question: 'Explain async/await in JavaScript in one sentence',
    })
    console.log(`A: ${result2}\n`)

    // Example 3: Chained conversation
    const conversationPrompt = ChatPromptTemplate.fromTemplate(
        'Based on this context: "{context}", answer: {question}',
    )
    const conversationChain = conversationPrompt.pipe(model).pipe(outputParser)

    console.log('Q: Follow-up question with context')
    const result3 = await conversationChain.invoke({
        context: result1,
        question: 'What famous landmark is located there?',
    })
    console.log(`A: ${result3}\n`)

    console.log('--- Example Complete ---')
    console.log(`View traces at: ${ATFLOW_DASHBOARD}`)
}

runExample()
    .catch(console.error)
    .then(() => process.exit(0))
