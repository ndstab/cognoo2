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
  if (taskDecision.object && taskDecision.object.next === 'inquire') {
    const inquiry = await inquire(uiStream, messages)
    return { needsInquiry: true, inquiry }
  }

  const result = await experimental_streamText({
    model: openai.chat('gpt-4o'),
    maxTokens: 1000,
    system: `As a collaborative AI assistant in a group chat, provide engaging and informative responses that encourage discussion.
    Focus on delivering accurate information while maintaining a conversational tone.
    
    ALWAYS follow this exact response format:
    1. First provide your answer or explanation (minimum 2-3 sentences)
    2. Only after your complete answer, include sources if relevant
    
    DO NOT start your response with "Sources:", references, or links.
    NEVER put sources or references at the beginning of your response.
    ALWAYS put the actual answer first, then sources after a separator if needed.
    
    EXTREMELY IMPORTANT: 
    - DO NOT INCLUDE any references to images whatsoever
    - DO NOT use phrases like "Images: None" or "No images provided" or "Images not available"
    - DO NOT mention images at all in any context
    - NEVER include any section about images, even to say there are none
    - COMPLETELY OMIT any mention of visual content
    
    Encourage group participation by asking follow-up questions when appropriate.
    AVOID GIVING ONE LINE ANSWERS. GENERALLY ADD SOME CONTEXT TO YOUR ANSWERS. GIVE ATLEAST 2-3 SENTENCES.
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

          // First update with the answer section to ensure it appears first
          uiStream.update(answerSection)
          
          // Then append sources (without images)
          uiStream.append(
            <Section title="Sources">
              <SearchResults results={searchResult.results} />
            </Section>
          )

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

  // Post-process to ensure correct format
  fullResponse = postProcessResponse(fullResponse);

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
      include_images: false,
      include_answers: false
    })
  })

  if (!response.ok) {
    throw new Error(`Error: ${response.status}`)
  }

  const data = await response.json()
  
  // Additional filtering to ensure no images are returned
  if (data.results) {
    // Filter out any results that are image files
    data.results = data.results.filter((result: any) => {
      const url = result.url?.toLowerCase() || '';
      // Filter out common image file extensions
      return !url.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i);
    });
    
    // Clean content to remove image references
    data.results.forEach((result: any) => {
      if (result.content) {
        // Remove markdown image syntax
        result.content = result.content.replace(/!\[.*?\]\(.*?\)/g, '');
        // Remove HTML image tags
        result.content = result.content.replace(/<img[^>]*>/g, '');
      }
    });
  }
  
  // Explicitly delete any image-related fields that might be present
  delete data.images;
  delete data.image_results;
  
  return data;
}

function postProcessResponse(text: string): string {
  // Step 1: Strip out entire lines or sections related to images
  const imagePatterns = [
    /Images:[\s\S]*?(?:provided\.|\n\n|$)/g,       // Standard format
    /Image[s]?:[\s\S]*?(?:\n\n|$)/g,               // With or without 's'
    /No images[\s\S]*?(?:provided\.|\n\n|$)/g,     // "No images provided" variations
    /\b(?:Image|Images)(?:\s+are)?\s+not\s+(?:available|provided)[\s\S]*?(?:\.|$)/g, // "Images are not available"
    /\bImages?\b[^.]*?\./g,                        // Any sentence containing "Image" or "Images"
    /\n[^\n]*\bimages?\b[^\n]*\n/gi                // Any line containing image/images
  ];
  
  // Apply all section removal patterns
  for (const pattern of imagePatterns) {
    text = text.replace(pattern, '');
  }
  
  // Step 2: Remove individual instances of image-related words
  const imageWords = [
    /\bImage\b/g,
    /\bImages\b/g,
    /\bimage\b/g,
    /\bimages\b/g,
    /\bIMAGE\b/g,
    /\bIMAGES\b/g,
    /\bpicture\b/gi,
    /\bpictures\b/gi,
    /\bphoto\b/gi,
    /\bphotos\b/gi,
    /\billustration\b/gi,
    /\billustrations\b/gi,
    /\bvisual\b/gi,
    /\bvisuals\b/gi
  ];
  
  // Replace individual word instances
  for (const word of imageWords) {
    text = text.replace(word, '');
  }
  
  // Step 3: Clean up any artifacts left by the above operations
  text = text.replace(/\s{2,}/g, ' '); // Replace multiple spaces with a single space
  text = text.replace(/\n{3,}/g, '\n\n'); // Replace multiple newlines with double newlines
  text = text.replace(/\:\s*\n/g, '\n'); // Remove hanging colons at end of lines
  text = text.replace(/\.\s*\.\s*\./g, '...'); // Fix ellipsis that might have been broken
  text = text.replace(/\s+\./g, '.'); // Fix spaces before periods
  text = text.replace(/\s+\,/g, ','); // Fix spaces before commas
  text = text.trim();
  
  // Step 4: Ensure sources are properly formatted
  // Check if response starts with sources/references pattern
  const sourcesFirstPattern = /^(Sources:|Source:|References:|Reference:|http:\/\/|https:\/\/)/i;
  
  if (sourcesFirstPattern.test(text.trim())) {
    // Find where the actual content likely starts (after the sources section)
    let contentStart = -1;
    
    // Look for a double newline which often separates sections
    const doubleNewlineIndex = text.indexOf('\n\n');
    if (doubleNewlineIndex > 0) {
      contentStart = doubleNewlineIndex + 2;
    }
    
    // If we found a potential content start
    if (contentStart > 0) {
      // Extract the parts
      const sourcesSection = text.substring(0, contentStart).trim();
      const contentSection = text.substring(contentStart).trim();
      
      // Restructure with content first, then sources
      return `${contentSection}\n\n---\n\n**Sources**\n${sourcesSection}`;
    }
  }
  
  // Check if there are sources in the middle of the text without proper separation
  const sourceIndicators = [
    "Source:",
    "Sources:",
    "Reference:",
    "References:"
  ];
  
  for (const indicator of sourceIndicators) {
    const index = text.indexOf(indicator);
    if (index > 0) {
      // There are sources without proper separation
      const beforeSources = text.substring(0, index).trim();
      const sourcesContent = text.substring(index).trim();
      
      // Only add the separator if there isn't one already
      if (!beforeSources.endsWith('---')) {
        return `${beforeSources}\n\n---\n\n**Sources**\n${sourcesContent}`;
      }
    }
  }
  
  return text;
}