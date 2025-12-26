// Conversation history manager - loads, saves, and resets using Bun.file
import { join } from 'path';

type Message = {
   role: 'user' | 'assistant' | 'system';
   content: string;
};

const HISTORY_FILE = join(import.meta.dir, '../history.json');

export const memoryManager = {
   // Loads history.json if exists, prints welcome back message
   async loadHistory(): Promise<Message[]> {
      try {
         const file = Bun.file(HISTORY_FILE);
         const exists = await file.exists();

         if (exists) {
            console.log('Welcome Back!');
            const content = await file.text();
            return JSON.parse(content);
         }
         return [];
      } catch (error) {
         console.error('Error loading history:', error);
         return [];
      }
   },

   // Saves conversation messages to history.json
   async saveHistory(messages: Message[]): Promise<void> {
      try {
         const jsonContent = JSON.stringify(messages, null, 2);
         await Bun.write(HISTORY_FILE, jsonContent);
      } catch (error) {
         console.error('Error saving history:', error);
      }
   },

   // Deletes history.json for /reset command
   async resetHistory(): Promise<void> {
      try {
         const file = Bun.file(HISTORY_FILE);
         const exists = await file.exists();

         if (exists) {
            await Bun.file(HISTORY_FILE).delete?.();
         }
      } catch (error) {
         console.error('Error resetting history:', error);
      }
   },
};
