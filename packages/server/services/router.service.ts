// Classifies user intent into: weather, math, exchange, or generalChat
import { z } from 'zod';
import { llmClient } from '../llm/client';

// Zod schema for validating the LLM response
const ClassificationSchema = z.object({
   intent: z.enum(['weather', 'math', 'exchange', 'generalChat']),
   parameter: z.string().optional(),
});

type ClassificationResult = z.infer<typeof ClassificationSchema>;

const CLASSIFICATION_PROMPT = `You are an intent classifier for a customer service chatbot. Analyze the user's message and classify it into one of these intents:

1. **weather** - User is asking about weather conditions (e.g., "What's the weather in Paris?", "Is it raining in London?")
2. **math** - User is asking you to perform a mathematical calculation (e.g., "What is 25 * 4?", "Calculate 100 + 50 - 30")
3. **exchange** - User is asking about currency exchange rates (e.g., "What's the USD to ILS rate?", "How much is 100 EUR in Israeli Shekel?")
4. **generalChat** - Any other question or conversation topic

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "intent": "weather",
  "parameter": "extracted_value_or_empty_string"
}

Where intent must be one of: weather, math, exchange, or generalChat.

For weather intent, extract the city name.
For math intent, extract the mathematical expression to calculate.
For exchange intent, extract the currency code (e.g., USD, EUR, GBP).
For generalChat, leave parameter empty.

User message: {{USER_INPUT}}`;

export const routerService = {
   // Classifies user input to route to appropriate tool or LLM
   async classifyIntent(userInput: string): Promise<ClassificationResult> {
      try {
         const prompt = CLASSIFICATION_PROMPT.replace(
            '{{USER_INPUT}}',
            userInput
         );

         const response = await llmClient.generateText({
            model: 'gpt-4o-mini',
            prompt,
            temperature: 0.1, // Low temperature for consistent classification
            maxTokens: 100,
         });

         // Parse the JSON response
         const jsonMatch = response.text.match(/\{[\s\S]*\}/);
         if (!jsonMatch) {
            throw new Error('No JSON object found in LLM response');
         }

         const jsonString = jsonMatch[0];
         const parsedData = JSON.parse(jsonString);

         // Validate against schema
         const result = ClassificationSchema.parse(parsedData);

         return result;
      } catch (error) {
         if (error instanceof z.ZodError) {
            console.error('Validation error:', error.issues);
            return {
               intent: 'generalChat',
               parameter: '',
            };
         }
         console.error('Classification error:', error);
         return {
            intent: 'generalChat',
            parameter: '',
         };
      }
   },
};
