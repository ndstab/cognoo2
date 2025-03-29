import { createOpenAI } from '@ai-sdk/openai'
import { Copilot } from '@/components/copilot'
import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage, streamObject } from 'ai'
import { PartialInquiry, inquirySchema } from '@/lib/schema/inquiry'

export async function inquire(
  uiStream: ReturnType<typeof createStreamableUI>,
  messages: CoreMessage[]
) {
  // --- Check if an inquiry has already happened ---
  let alreadyInquired = false;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === 'assistant') {
      let contentText = '';
      // Extract text content, handling string or array format
      if (typeof message.content === 'string') {
        contentText = message.content;
      } else if (Array.isArray(message.content)) {
        const textPart = message.content.find(part => part.type === 'text');
        if (textPart) {
          contentText = textPart.text.trim();
        }
      }

      // Check if the content looks like the JSON inquiry structure
      if (contentText.startsWith('{') && contentText.endsWith('}')) {
        try {
          const potentialInquiry = JSON.parse(contentText);
          // Check for core properties of the inquiry schema
          if (potentialInquiry.question && Array.isArray(potentialInquiry.options)) {
            console.log("Detected a previous inquiry message based on JSON structure.");
            alreadyInquired = true;
            break; // Found a prior inquiry, no need to check further back
          }
        } catch (e) {
          // Content looked like JSON but failed to parse or didn't match schema. Ignore and continue checking.
        }
      }
      // Optional: Stop checking after the first assistant message if needed
      // break;
    }
  }

  if (alreadyInquired) {
    console.log("Skipping inquiry because a previous one was detected.");
    // Ensure the UI stream is cleared or completed if it was potentially updated before
    // Depending on how the caller handles it, updating with null might be appropriate
    // uiStream.update(null); // Or uiStream.done();
    return {}; // Return empty object to signal no new inquiry
  }
  // --- End Check ---

  // --- Proceed with inquiry generation if none was detected ---
  const openai = createOpenAI({
    baseUrl: process.env.OPENAI_API_BASE, // optional base URL for proxies etc.
    apiKey: process.env.OPENAI_API_KEY, // optional API key, default to env property OPENAI_API_KEY
    organization: '' // optional organization
  })

  // Create streamables *only* if we are proceeding
  const objectStream = createStreamableValue<PartialInquiry>()
  uiStream.update(<Copilot inquiry={objectStream.value} />) // Update UI to show Copilot pending

  let finalInquiry: PartialInquiry = {}
  await streamObject({
    model: openai.chat('gpt-4o-mini'),
    system: `As a professional web researcher, your role is to deepen your understanding of the user's input by conducting further inquiries when necessary.
    After receiving an initial response from the user, carefully assess whether additional questions are absolutely essential to provide a comprehensive and accurate answer. Only proceed with further inquiries if the available information is insufficient or ambiguous.

    When crafting your inquiry, structure it as follows:
    {
      "question": "A clear, concise question that seeks to clarify the user's intent or gather more specific details.",
      "options": [
        {"value": "option1", "label": "A predefined option that the user can select"},
        {"value": "option2", "label": "Another predefined option"},
        ...
      ],
      "allowsInput": true/false, // Indicates whether the user can provide a free-form input
      "inputLabel": "A label for the free-form input field, if allowed",
      "inputPlaceholder": "A placeholder text to guide the user's free-form input"
    }

    For example:
    {
      "question": "What specific information are you seeking about Rivian?",
      "options": [
        {"value": "history", "label": "History"},
        {"value": "products", "label": "Products"},
        {"value": "investors", "label": "Investors"},
        {"value": "partnerships", "label": "Partnerships"},
        {"value": "competitors", "label": "Competitors"}
      ],
      "allowsInput": true,
      "inputLabel": "If other, please specify",
      "inputPlaceholder": "e.g., Specifications"
    }

    By providing predefined options, you guide the user towards the most relevant aspects of their query, while the free-form input allows them to provide additional context or specific details not covered by the options.
    Remember, your goal is to gather the necessary information to deliver a thorough and accurate response.
    `,
    messages,
    schema: inquirySchema
  })
    .then(async result => {
      for await (const obj of result.partialObjectStream) {
        if (obj) {
          objectStream.update(obj)
          finalInquiry = obj
        }
      }
    })
    .finally(() => {
      objectStream.done()
    })

  // If the final inquiry is empty (meaning the model decided not to ask anything),
  // clear the copilot UI.
  if (Object.keys(finalInquiry).length === 0) {
     uiStream.update(null);
  }


  return finalInquiry
}
