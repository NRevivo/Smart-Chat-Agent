// General chat handler - calls LLM with full conversation history
import { llmClient } from '../llm/client';
import { memoryManager } from './memory.manager';
import { handleUserMessage } from '../index';

type Message = {
   role: 'user' | 'assistant' | 'system';
   content: string;
};

type ChatResponse = {
   id: string;
   message: string;
};

const SYSTEM_PROMPT = `You are a helpful AI assistant. You can help with various tasks including weather inquiries, mathematical calculations, currency conversions, and general conversations. Be concise and helpful in your responses.`;

// Public interface
export const chatService = {
   // API method for UI - uses the orchestration function from index.ts
   async sendMessage(
      prompt: string,
      conversationId: string
   ): Promise<ChatResponse> {
      try {
         // Load existing history
         const history: Message[] = await memoryManager.loadHistory();

         // Use the centralized orchestration function
         const result = await handleUserMessage(prompt, history);

         return {
            id: conversationId,
            message: result.botMessage,
         };
      } catch (error) {
         console.error('Chat service error:', error);
         throw error;
      }
   },

   // General chat with LLM - ONLY place that injects full conversation history
   async generalChat(history: Message[], userInput: string): Promise<string> {
      try {
         // Build messages array with system prompt, history, and new user input
         const messages: any[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: userInput },
         ];

         const response = await llmClient.generateText({
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.7,
            maxTokens: 300,
         });

         return response.text;
      } catch (error) {
         console.error('Chat service error:', error);
         throw error;
      }
   },
};
