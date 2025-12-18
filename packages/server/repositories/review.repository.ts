import { PrismaClient, type Review } from '@prisma/client';
import { OpenAI } from 'openai/index.js';

export const reviewRepository = {
   async getReviews(productId: number, limit?: number): Promise<Review[]> {
      const prisma = new PrismaClient();

      return prisma.review.findMany({
         where: { productId },
         orderBy: { createdAt: 'desc' },
         take: limit,
      });
   },
};

const client = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY,
});
