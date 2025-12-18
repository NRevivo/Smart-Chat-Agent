import { type Review } from '@prisma/client';
import { reviewRepository } from '../repositories/review.repository';
import OpenAI from 'openai';

const client = new OpenAI();

export const reviewService = {
   async getReviews(productId: number): Promise<Review[]> {
      return reviewRepository.getReviews(productId);
   },

   async summarizeReviews(productId: number): Promise<string> {
      const reviews = await reviewRepository.getReviews(productId, 10);
      const joinedReviews = reviews
         .map((r) => r.content)
         .filter(Boolean)
         .join('\n\n');

      const prompt = `
Summarize the following customer reviews into a short paragraph,
highlighting the key themes, both positive and negative:

${joinedReviews}
    `;

      const response = await client.responses.create({
         model: 'gpt-4o-mini',
         input: prompt,
         temperature: 0.2,
         max_output_tokens: 500,
      });

      return response.output_text;
   },
};
