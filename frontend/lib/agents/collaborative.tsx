import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import {
  CoreMessage,
  ToolCallPart,
  ToolResultPart,
  experimental_streamText
} from 'ai'
import { searchSchema } from '@/lib/schema/search'
import { Section } from '@/components/section'
import { OpenAI } from '@ai-sdk/openai'
import { ToolBadge } from '@/components/tool-badge'
import { SearchSkeleton } from '@/components/search-skeleton'
import { SearchResults } from '@/components/search-results'
import { BotMessage } from '@/components/message'
import { SearchResultsImageSection } from '@/components/search-results-image'
import { taskManager } from './task-manager'
import { inquire } from './inquire'
import { querySuggestor } from './query-suggestor'

export async function collaborativeAgent(
  uiStream: ReturnType<typeof createStreamableUI>,
  streamText: ReturnType<typeof createStreamableValue<string>>,
  messages: CoreMessage[],
  roomId: string
) {
  const openai = new OpenAI({
    baseUrl: process.env.OPENAI_API_BASE,
    apiKey: process.env.OPENAI_API_KEY,
    organization: ''
  })

  let fullResponse = ''
  const answerSection = (
    <Section title="Group Response">
      <BotMessage content={streamText.value} />
    </Section>
  )

  // First, determine if we need more information
  const taskDecision = await taskManager(messages)
  if (taskDecision.object.next === 'inquire') {
    const inquiry = await inquire(uiStream, messages)
    return { needsInquiry: true, inquiry }
  }

  const result = await experimental_streamText({
    model: openai.chat('gpt-4o-mini'),
    maxTokens: 1000,
    system: `As a collaborative AI assistant in a group chat, provide engaging and informative responses that encourage discussion.
    Focus on delivering accurate information while maintaining a conversational tone.
    Include relevant images when available and cite sources appropriately.
    Encourage group participation by asking follow-up questions when appropriate.
    `,
    messages,
    tools: {
      search: {
        description: 'Search the web for information',
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
          uiStream.update(
            <Section>
              <ToolBadge tool="search">{`${query}`}</ToolBadge>
            </Section>
          )

          uiStream.append(
            <Section>
              <SearchSkeleton />
            </Section>
          )

          const searchResult = await tavilySearch(query, max_results, search_depth)

          uiStream.update(
            <Section title="Images">
              <SearchResultsImageSection
                images={searchResult.images}
                query={searchResult.query}
              />
            </Section>
          )
          uiStream.append(
            <Section title="Sources">
              <SearchResults results={searchResult.results} />
            </Section>
          )

          uiStream.append(answerSection)

          return searchResult
        }
      }
    }
  })

  const toolCalls: ToolCallPart[] = []
  const toolResponses: ToolResultPart[] = []
  for await (const delta of result.fullStream) {
    switch (delta.type) {
      case 'text-delta':
        if (delta.textDelta) {
          if (fullResponse.length === 0 && delta.textDelta.length > 0) {
            uiStream.update(answerSection)
          }

          fullResponse += delta.textDelta
          streamText.update(fullResponse)
        }
        break
      case 'tool-call':
        toolCalls.push(delta)
        break
      case 'tool-result':
        toolResponses.push(delta)
        break
      case 'error':
        fullResponse += `\nError occurred while executing the tool`
        break
    }
  }

  messages.push({
    role: 'assistant',
    content: [{ type: 'text', text: fullResponse }, ...toolCalls]
  })

  if (toolResponses.length > 0) {
    messages.push({ role: 'tool', content: toolResponses })
  }

  // Generate related queries
  await querySuggestor(uiStream, messages)

  return { result, fullResponse }
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
      include_images: true,
      include_answers: false
    })
  })

  if (!response.ok) {
    throw new Error(`Error: ${response.status}`)
  }

  const data = await response.json()
  return data
}