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

   let botMessage: string;

   // Route based on intent
   switch (classification.intent) {
      case 'weather':
         // Tool: Weather (no history injection)
         botMessage = await toolsService.getWeather(
            classification.parameter || ''
         );
         break;

      case 'math':
         // Tool: Math Calculator (no history injection)
         botMessage = toolsService.calculateMath(
            classification.parameter || ''
         );
         break;

      case 'exchange':
         // Tool: Exchange Rate (no history injection)
         botMessage = toolsService.getExchangeRate(
            classification.parameter || ''
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
