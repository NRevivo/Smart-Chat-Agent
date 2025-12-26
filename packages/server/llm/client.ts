import OpenAI from 'openai';

const client = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY,
});

export type Message = {
   role: 'user' | 'assistant' | 'system';
   content: string;
};

type GenerateTextOptions = {
   model?: string;
   messages: Message[];
   temperature?: number;
   maxTokens?: number;
};

type GenerateTextResult = {
   id: string;
   text: string;
};

export const llmClient = {
   async generateText({
      model = 'gpt-4o-mini',
      messages,
      temperature = 0.2,
      maxTokens = 300,
   }: GenerateTextOptions): Promise<GenerateTextResult> {
      const response = await client.chat.completions.create({
         model,
         messages,
         temperature,
         max_tokens: maxTokens,
      });

      return {
         id: response.id,
         text: response.choices[0]?.message?.content || '',
      };
   },
};
