import { OpenAI } from '@ai-sdk/openai'

type ResponseDecision = {
  shouldRespond: boolean;
  confidence: number;
  reasoning: string;
}

/**
 * Uses GPT-4o mini to determine if the AI should respond to a message in a group chat
 * @param message The user message to evaluate
 * @param recentMessages Optional array of recent messages for context
 * @returns An object with the decision, confidence level, and reasoning
 */
export async function shouldAIRespondLLM(
  message: string,
  recentMessages: Array<{ sender: string; message: string }> = []
): Promise<ResponseDecision> {
  try {
    const openai = new OpenAI({
      baseUrl: process.env.OPENAI_API_BASE, // optional base URL for proxies
      apiKey: process.env.OPENAI_API_KEY,
      organization: '' // optional organization
    })

    // Prepare context from recent messages
    const conversationContext = recentMessages
      .slice(-5) // Only use the last 5 messages for context
      .map(msg => `${msg.sender}: ${msg.message}`)
      .join('\n');
    
    // Prepare the prompt with conversation context
    const prompt = conversationContext 
      ? `Recent conversation:\n${conversationContext}\n\nNew message: "${message}"`
      : `New message in group chat: "${message}"`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a smart decision-making system for a collaborative AI assistant in a group chat.
Your job is to determine if the AI assistant should respond to a user's message.

Consider these factors:
1. Is the message a question or seeking information?
2. Is the message directed at the AI specifically?
3. Could the AI provide valuable input even if not directly addressed?
4. Is this a discussion where an AI's objective perspective would be helpful?
5. Is the message casual conversation that doesn't need AI intervention?

Respond with JSON in this format:
{
  "shouldRespond": true/false,
  "confidence": 0-100,
  "reasoning": "Brief explanation of your decision"
}

High confidence (75-100) means you're very sure of your decision.
Medium confidence (40-74) means there are some factors both ways.
Low confidence (0-39) means you're uncertain, but leaning one way.

Err on the side of NOT responding if it's just casual chat between humans.
DO respond if someone is clearly asking a question or seeking information.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Low temperature for more consistent decisions
      response_format: { type: 'json_object' }
    });

    // Parse the JSON response
    const result = JSON.parse(response.choices[0].message.content || '{"shouldRespond": false, "confidence": 0, "reasoning": "Error processing request"}');
    
    return {
      shouldRespond: result.shouldRespond === true,
      confidence: Number(result.confidence) || 0,
      reasoning: result.reasoning || "No reasoning provided"
    };
  } catch (error) {
    console.error('Error determining if AI should respond:', error);
    // Default to false if there's an error
    return {
      shouldRespond: false,
      confidence: 0,
      reasoning: "Error processing message"
    };
  }
} 