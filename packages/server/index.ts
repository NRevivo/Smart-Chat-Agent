// ============================================================================
// BOT ORCHESTRATION LAYER - Entry Point
// This file wires the bot together and controls the conversation flow
// Serves both: HTTP API for UI and Terminal interface
// ============================================================================

import express from 'express';
import dotenv from 'dotenv';
import router from './routes';
import { memoryManager } from './services/memory.manager';
import { routerService } from './services/router.service';
import { toolsService } from './services/tools.service';
import { chatService } from './services/chat.service';
import { MATH_TRANSLATION_PROMPT } from './prompts/prompts';
import { llmClient } from './llm/client';

dotenv.config();

// ============================================================================
// TYPES
// ============================================================================

type Message = {
   role: 'user' | 'assistant' | 'system';
   content: string;
};

// ============================================================================
// CORE ORCHESTRATION FUNCTION
// This function shows the complete bot flow end-to-end
// ============================================================================

export async function handleUserMessage(
   userInput: string,
   history: Message[]
): Promise<{ botMessage: string; updatedHistory: Message[] }> {
   // =========================================================================
   // 1. HANDLE /RESET COMMAND
   // =========================================================================
   if (userInput.trim() === '/reset') {
      await memoryManager.resetHistory();
      return {
         botMessage: 'Conversation history has been reset. Starting fresh!',
         updatedHistory: [],
      };
   }

   // =========================================================================
   // 2. ROUTING ORCHESTRATION
   // Classify intent and route to appropriate handler
   // =========================================================================
   const classification = await routerService.classifyIntent(userInput);

   // =========================================================================
   // 2.1. LOG RAW CLASSIFICATION (Required for submission)
   // =========================================================================
   console.log(
      '🔍 Router Classification:',
      JSON.stringify(classification, null, 2)
   );

   // =========================================================================
   // 2.2. VALIDATE CLASSIFICATION
   // Check confidence threshold and JSON structure
   // =========================================================================
   const CONFIDENCE_THRESHOLD = 0.6;
   let validatedIntent = classification.intent;

   if (!classification || typeof classification.confidence !== 'number') {
      console.warn(
         '⚠️  Invalid classification structure, falling back to generalChat'
      );
      validatedIntent = 'generalChat';
   } else if (classification.confidence < CONFIDENCE_THRESHOLD) {
      console.warn(
         `⚠️  Low confidence (${classification.confidence.toFixed(2)}), falling back to generalChat`
      );
      validatedIntent = 'generalChat';
   }

   let botMessage: string;

   // Route based on validated intent
   switch (validatedIntent) {
      case 'getWeather':
         // Tool: Weather (no history injection)
         botMessage = await toolsService.getWeather(
            classification.parameters.city || ''
         );
         break;

      case 'calculateMath':
         // ====================================================================
         // 2.3. MATH TRANSLATION (Chain of Thought)
         // Detect if input is a word problem vs pure math expression
         // ====================================================================
         let mathExpression = classification.parameters.expression || '';

         // Check if the expression contains words (word problem)
         // Pure math: "5 + 3", "sqrt(144)", "2^8"
         // Word problem: "I have 5 apples and bought 3 more"
         const containsWords = /[a-zA-Z]{2,}/.test(mathExpression);

         if (containsWords) {
            console.log(
               '📝 Detected word problem, translating to expression...'
            );

            // Call LLM to translate word problem to expression
            const translationPrompt = `${MATH_TRANSLATION_PROMPT}\n\nUser: "${mathExpression}"`;

            const translationResponse = await llmClient.generateText({
               model: 'gpt-4o-mini',
               messages: [{ role: 'user', content: translationPrompt }],
               temperature: 0.2,
               maxTokens: 100,
            });

            // Extract the translated expression
            mathExpression = translationResponse.text.trim();
            console.log('🔢 Translated expression:', mathExpression);
         }

         // Tool: Math Calculator (deterministic, no LLM)
         botMessage = toolsService.calculateMath(mathExpression);
         break;

      case 'getExchangeRate':
         // Tool: Exchange Rate (no history injection)
         botMessage = toolsService.getExchangeRate(
            classification.parameters.currencyCode || ''
         );
         break;

      case 'generalChat':
      default:
         // ====================================================================
         // 3. GENERAL CHAT - ONLY PLACE WITH FULL HISTORY INJECTION
         // ====================================================================
         botMessage = await chatService.generalChat(history, userInput);
         break;
   }

   // =========================================================================
   // 4. UPDATE HISTORY
   // =========================================================================
   const updatedHistory: Message[] = [
      ...history,
      { role: 'user', content: userInput },
      { role: 'assistant', content: botMessage },
   ];

   // =========================================================================
   // 5. PERSIST HISTORY
   // =========================================================================
   await memoryManager.saveHistory(updatedHistory);

   return { botMessage, updatedHistory };
}

// ============================================================================
// EXPRESS SERVER SETUP (for UI connection)
// ============================================================================

const app = express();
app.use(express.json());
app.use(router);

const PORT = process.env.PORT || 3000;

// Load conversation history on server startup
app.listen(PORT, async () => {
   console.log(`Server is running on http://localhost:${PORT}`);

   // Load history to check if previous conversation exists
   await memoryManager.loadHistory();
});
