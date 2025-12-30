// Classifies user intent into: weather, math, exchange, or generalChat
import { z } from 'zod';
import { llmClient } from '../llm/client';
import { ROUTER_SYSTEM_PROMPT } from '../prompts/prompts';

// Zod schema for validating the LLM response
const ClassificationSchema = z.object({
   intent: z.enum([
      'getWeather',
      'calculateMath',
      'getExchangeRate',
      'generalChat',
   ]),
   parameters: z.object({
      city: z.string().optional(),
      expression: z.string().optional(),
      currencyCode: z.string().optional(),
   }),
   confidence: z.number().min(0).max(1),
});

type ClassificationResult = z.infer<typeof ClassificationSchema>;

export const routerService = {
   // Classifies user input to route to appropriate tool or LLM
   async classifyIntent(userInput: string): Promise<ClassificationResult> {
      try {
         // Build the full prompt with user input
         const fullPrompt = `${ROUTER_SYSTEM_PROMPT}\n\nUser: "${userInput}"`;

         const response = await llmClient.generateText({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: fullPrompt }],
            temperature: 0.1, // Low temperature for consistent classification
            maxTokens: 150,
         });

         // Safely extract JSON from response
         const jsonMatch = response.text.match(/\{[\s\S]*\}/);
         if (!jsonMatch) {
            throw new Error('No JSON object found in LLM response');
         }

         const jsonString = jsonMatch[0];

         // Parse JSON safely
         let parsedData: unknown;
         try {
            parsedData = JSON.parse(jsonString);
         } catch (parseError) {
            throw new Error(
               `Failed to parse JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
            );
         }

         // Validate against schema (no unsafe casts)
         const result = ClassificationSchema.parse(parsedData);

         return result;
      } catch (error) {
         if (error instanceof z.ZodError) {
            console.error('Validation error:', error.issues);
            // Return safe fallback
            return {
               intent: 'generalChat',
               parameters: {},
               confidence: 0.5,
            };
         }
         console.error('Classification error:', error);
         // Return safe fallback
         return {
            intent: 'generalChat',
            parameters: {},
            confidence: 0.5,
         };
      }
   },
};
