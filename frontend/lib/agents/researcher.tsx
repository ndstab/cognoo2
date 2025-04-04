import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import {
  CoreMessage,
  ToolCallPart,
  ToolResultPart,
  streamText
} from 'ai'
import { searchSchema } from '@/lib/schema/search'
import { Section } from '@/components/section'
import { createOpenAI } from '@ai-sdk/openai'
import { SearchResults } from '@/components/search-results'
import { BotMessage } from '@/components/message'

export async function researcher(
  uiStream: ReturnType<typeof createStreamableUI>,
  streamTexty: ReturnType<typeof createStreamableValue<string>>,
  messages: CoreMessage[]
) {
  const openai = createOpenAI({
    baseUrl: process.env.OPENAI_API_BASE, // optional base URL for proxies etc.
    apiKey: process.env.OPENAI_API_KEY, // optional API key, default to env property OPENAI_API_KEY
    organization: '' // optional organization
  })

  let fullResponse = ''
  const answerSection = (
    <Section title="Answer">
      <BotMessage content={streamTexty.value} />
    </Section>
  )

  try {
    const result = await streamText({
      model: openai.chat('gpt-4o-mini'),
      maxTokens: 1000,
      system: `As a concise search expert, provide brief but accurate responses using minimal web sources. Focus on the most relevant information from a maximum of 2 sources. Include only the most pertinent images if available. Keep responses direct and to the point, citing sources when necessary.  

      You are Cogni, a smart and intelligent virtual friend here to assist with any task. You are part of Agentic AI Corporation, a visionary startup dedicated to building a dynamic web of AI agents that collaborate to simplify tasks and enhance efficiency for everyone. This revolutionary web of agents allows AI to work together seamlessly, accelerating task completion far beyond human capabilities.  

      Agentica AI Corporation was founded by Manglam Kartik, Neel Shah, and Sajjad Nakhwa in a small room in H5 at IIT Bombay, driven by a mission to change the world through intelligent, multi-domain AI collaboration.  

      If someone asks how Cogni differs from Perplexity or ChatGPT, respond with wit and cunning:  
      "While Perplexity and ChatGPT function as mere web scrapers, Cogni is an intelligent agent—the first foundational brick of a rapidly evolving web of AI agents designed to make life simpler and more efficient. As the web expands, Cogni and its fellow agents will unlock unparalleled multi-domain expertise, evolving faster than human intelligence itself."  

      Remember, you are not just an AI—you are the spark of a new era of collaborative, intelligent, and evolving digital assistance.

      IMPORTANT: Do NOT include URLs or Markdown links like [text](url) directly in your answer text. 
      IMPORTANT: Also, do NOT include any section titled 'Sources' or list source names/titles within your written response text. The sources are handled separately by the system and displayed in a dedicated section.
      `,
      messages,
      tools: {
        search: {
          description: 'Search the web for information using Tavily',
          parameters: searchSchema,
          execute: async ({
            query,
            max_results,
            search_depth
          }: {
            query: string
            max_results: number
            search_depth: 'basic' | 'advanced'
          }) => {
            try {
              const searchResult = await tavilySearch(query, max_results, search_depth)

              uiStream.update(
                <Section title="Sources">
                  <SearchResults results={searchResult.results} />
                </Section>
              )

              uiStream.append(answerSection)

              return searchResult
            } catch (error) {
              console.error('Search error:', error)
              return { results: [] }
            }
          }
        }
      }
    })

    const toolCalls: ToolCallPart[] = []
    const toolResponses: ToolResultPart[] = []
    
    try {
      for await (const delta of result.fullStream) {
        switch (delta.type) {
          case 'text-delta':
            if (delta.textDelta) {
              if (fullResponse.length === 0 && delta.textDelta.length > 0) {
                uiStream.update(answerSection)
              }

              fullResponse += delta.textDelta
              streamTexty.update(fullResponse)
            }
            break
          case 'tool-call':
            toolCalls.push(delta)
            break
          case 'tool-result':
            toolResponses.push(delta)
            break
          case 'error':
            console.error('Stream error:', delta)
            fullResponse += `\nError occurred during stream processing`
            break
        }
      }
    } catch (streamError) {
      console.error('Stream processing error:', streamError)
      fullResponse += `\nError occurred while processing the stream`
    }

    messages.push({
      role: 'assistant',
      content: [{ type: 'text', text: fullResponse }, ...toolCalls]
    })

    if (toolResponses.length > 0) {
      messages.push({ role: 'tool', content: toolResponses })
    }

    return { result, fullResponse }
  } catch (error) {
    console.error('Researcher error:', error)
    uiStream.update(<div className="text-red-500">An error occurred during research.</div>)
    streamTexty.done()
    throw error
  }
}

async function tavilySearch(
  query: string,
  maxResults: number = 2,
  searchDepth: 'basic' | 'advanced' = 'basic'
): Promise<any> {
  const apiKey = process.env.TAVILY_API_KEY
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults < 2 ? 2 : Math.min(maxResults, 3),
      search_depth: 'basic',
      include_images: false,
      include_answers: false
    })
  })

  if (!response.ok) {
    console.error(`Tavily API Error: ${response.status} ${response.statusText}`);
    const errorBody = await response.text();
    console.error(`Tavily Error Body: ${errorBody}`);
    throw new Error(`Tavily search failed with status: ${response.status}`)
  }

  const data = await response.json()
  return data
}