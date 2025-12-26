import { type Review } from '@prisma/client';
import { reviewRepository } from '../repositories/review.repository';
import { llmClient } from '../llm/client';
import template from '../prompts/summarize-reviews.txt';

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

      const prompt = template.replace('{{reviews}}', joinedReviews);

      const response = await llmClient.generateText({
         model: 'gpt-4o-mini',
         prompt,
         temperature: 0.2,
         maxTokens: 500,
      });
      return response.text;
   },
};
