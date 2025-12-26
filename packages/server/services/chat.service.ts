// Chat agent that routes user input to appropriate tools or LLM
import { conversationRepository } from '../repositories/conversation.repository';
import { llmClient } from '../llm/client';
import { memoryManager } from './memory.manager';
import { routerService } from './router.service';
import { toolsService } from './tools.service';

type ChatResponse = {
   id: string;
   message: string;
};

type Message = {
   role: 'user' | 'assistant' | 'system';
   content: string;
};

const SYSTEM_PROMPT = `You are a helpful AI assistant. You can help with various tasks including weather inquiries, mathematical calculations, currency conversions, and general conversations. Be concise and helpful in your responses.`;

// Public interface
export const chatService = {
   // Routes: /reset → load history → classify intent → tool/LLM → save history
   async sendMessage(
      prompt: string,
      conversationId: string
   ): Promise<ChatResponse> {
      try {
         // 1. Check for /reset command
         if (prompt.trim() === '/reset') {
            await memoryManager.resetHistory();
            return {
               id: 'reset',
               message: 'Conversation history has been reset. Welcome back!',
            };
         }

         // 2. Load existing history
         const history: Message[] = await memoryManager.loadHistory();

         // 3. Use RouterService to classify intent
         const classification = await routerService.classifyIntent(prompt);

         let botMessage: string;
         let responseId: string = '';

         // 4. Handle different intents
         switch (classification.intent) {
            case 'weather':
               botMessage = await toolsService.getWeather(
                  classification.parameter || ''
               );
               break;

            case 'math':
               botMessage = toolsService.calculateMath(
                  classification.parameter || ''
               );
               break;

            case 'exchange':
               botMessage = toolsService.getExchangeRate(
                  classification.parameter || ''
               );
               break;

            case 'generalChat':
            default:
               // Call LLM with full conversation history
               const response = await llmClient.generateText({
                  model: 'gpt-4o-mini',
                  instructions: SYSTEM_PROMPT,
                  prompt,
                  temperature: 0.7,
                  maxTokens: 300,
                  previousResponseId:
                     conversationRepository.getLastResponseId(conversationId),
               });

               botMessage = response.text;
               responseId = response.id;
               conversationRepository.setLastResponseId(
                  conversationId,
                  responseId
               );
               break;
         }

         // 5. Save updated history
         const updatedHistory: Message[] = [
            ...history,
            { role: 'user', content: prompt },
            { role: 'assistant', content: botMessage },
         ];
         await memoryManager.saveHistory(updatedHistory);

         return {
            id: responseId || 'tool-response',
            message: botMessage,
         };
      } catch (error) {
         console.error('Chat service error:', error);
         throw error;
      }
   },
};
