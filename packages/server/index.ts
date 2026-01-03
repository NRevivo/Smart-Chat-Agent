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
import {
   MATH_TRANSLATION_PROMPT,
   REVIEW_ANALYZER_PROMPT,
   REVIEW_REFINER_PROMPT,
} from './prompts/prompts';
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

   // DEBUG: Confirm function is being called
   console.log('🚀 handleUserMessage called with input:', userInput);

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
      // Do NOT override analyzeReview intent even with low confidence
      if (classification.intent !== 'analyzeReview') {
         console.warn(
            `⚠️  Low confidence (${classification.confidence.toFixed(2)}), falling back to generalChat`
         );
         validatedIntent = 'generalChat';
      } else {
         console.log(
            `ℹ️  Low confidence (${classification.confidence.toFixed(2)}) but keeping analyzeReview intent`
         );
      }
   }

   // =========================================================================
   // 2.3. DETERMINISTIC GUARDRAIL FOR SHORT REVIEW PHRASES
   // Force analyzeReview for common short review phrases
   // =========================================================================
   const shortReviewPatterns = [
      /^לא\s*משהו\.?$/i,
      /^אכזבה\.?$/i,
      /^מעולה\.?$/i,
      /^גרוע\.?$/i,
      /^נורא\.?$/i,
      /^מושלם\.?$/i,
   ];

   console.log('🔍 Guardrail check:', {
      validatedIntent,
      userInputTrimmed: userInput.trim(),
      userInputLength: userInput.trim().length,
   });

   if (validatedIntent === 'generalChat') {
      const isShortReview = shortReviewPatterns.some((pattern) =>
         pattern.test(userInput.trim())
      );

      console.log('🔍 Pattern match result:', isShortReview);

      if (isShortReview) {
         console.log(
            '🛡️  Guardrail: Short review phrase detected, forcing analyzeReview intent'
         );
         validatedIntent = 'analyzeReview';
         classification.parameters.reviewText = userInput.trim();
      }
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

      case 'analyzeReview':
         // ====================================================================
         // 3. REVIEW ANALYSIS - LLM-based sentiment analysis
         // ====================================================================
         console.log('📊 Analyzing Review...');

         try {
            const reviewText = classification.parameters.reviewText || '';

            // Call LLM with review analyzer prompt
            const analyzerPrompt = `${REVIEW_ANALYZER_PROMPT}\n\nReview: "${reviewText}"`;

            const analyzerResponse = await llmClient.generateText({
               model: 'gpt-4o-mini',
               messages: [{ role: 'user', content: analyzerPrompt }],
               temperature: 0.3,
               maxTokens: 500,
            });

            // Safely extract JSON from response
            const jsonMatch = analyzerResponse.text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
               throw new Error('No JSON object found in analyzer response');
            }

            const jsonString = jsonMatch[0];
            const analysisResult = JSON.parse(jsonString);

            // Log raw analyzer JSON (required for submission)
            console.log(
               '📋 Raw Analyzer JSON:',
               JSON.stringify(analysisResult, null, 2)
            );

            // ====================================================================
            // SANITY CHECK & SELF-CORRECTION
            // Detect inconsistencies and refine if needed
            // ====================================================================
            let finalResult = analysisResult;
            const score = analysisResult.score;
            const sentiment = analysisResult.overall_sentiment;

            // Check for inconsistencies
            const hasInconsistency =
               (score < 4 && sentiment === 'Positive') ||
               (score > 7 && sentiment === 'Negative');

            if (hasInconsistency) {
               console.log('⚠️  Inconsistency detected - Refinement triggered');

               try {
                  // Call refiner LLM to correct the inconsistency
                  const refinerPrompt = `${REVIEW_REFINER_PROMPT}\n\nOriginal Review: "${reviewText}"\n\nInconsistent Analysis JSON:\n${JSON.stringify(analysisResult, null, 2)}`;

                  const refinerResponse = await llmClient.generateText({
                     model: 'gpt-4o-mini',
                     messages: [{ role: 'user', content: refinerPrompt }],
                     temperature: 0.2,
                     maxTokens: 500,
                  });

                  // Parse corrected JSON
                  const correctedJsonMatch =
                     refinerResponse.text.match(/\{[\s\S]*\}/);
                  if (correctedJsonMatch) {
                     finalResult = JSON.parse(correctedJsonMatch[0]);
                     console.log(
                        '✅ Corrected JSON:',
                        JSON.stringify(finalResult, null, 2)
                     );
                  }
               } catch (refineError) {
                  console.error('Refinement error:', refineError);
                  // If refinement fails, use original result
               }
            }

            // ====================================================================
            // GENERATE INSIGHT SENTENCE
            // ====================================================================
            let insightSentence = '';
            if (finalResult.aspects && finalResult.aspects.length > 0) {
               const positiveAspects = finalResult.aspects.filter(
                  (a: any) => a.sentiment === 'Positive'
               );
               const negativeAspects = finalResult.aspects.filter(
                  (a: any) => a.sentiment === 'Negative'
               );

               if (positiveAspects.length > 0 && negativeAspects.length > 0) {
                  // Mixed: both positive and negative
                  const negTopic = negativeAspects[0].topic;
                  const posTopic = positiveAspects[0].topic;
                  insightSentence = `💡 User complained about ${negTopic} but loved the ${posTopic}.`;
               } else if (positiveAspects.length > 0) {
                  // Only positives
                  const topics = positiveAspects
                     .slice(0, 2)
                     .map((a: any) => a.topic)
                     .join(' and ');
                  insightSentence = `💡 User praised ${topics}.`;
               } else if (negativeAspects.length > 0) {
                  // Only negatives
                  const topic = negativeAspects[0].topic;
                  insightSentence = `💡 User complained mostly about ${topic}.`;
               }
            }

            if (insightSentence) {
               console.log(insightSentence);
            }

            // Format user output nicely using final result
            let formattedOutput = `📊 Review Analysis:\n\n`;
            formattedOutput += `Summary: ${finalResult.summary}\n`;
            formattedOutput += `Overall Sentiment: ${finalResult.overall_sentiment}\n`;
            formattedOutput += `Score: ${finalResult.score}/10\n`;

            if (finalResult.aspects && finalResult.aspects.length > 0) {
               formattedOutput += `\nDetailed Aspects:\n`;
               finalResult.aspects.forEach((aspect: any, index: number) => {
                  formattedOutput += `${index + 1}. ${aspect.topic} (${aspect.sentiment}): "${aspect.detail}"\n`;
               });
            }

            botMessage = formattedOutput;
         } catch (error) {
            console.error('Review analysis error:', error);
            botMessage = `Error analyzing review: ${error instanceof Error ? error.message : 'Unknown error'}`;
         }
         break;

      case 'generalChat':
      default:
         // ====================================================================
         // 4. GENERAL CHAT - ONLY PLACE WITH FULL HISTORY INJECTION
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
