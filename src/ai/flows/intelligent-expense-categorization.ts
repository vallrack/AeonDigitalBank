'use server';
/**
 * @fileOverview An AI agent for categorizing financial transactions.
 *
 * - intelligentExpenseCategorization - A function that categorizes a financial transaction.
 * - IntelligentExpenseCategorizationInput - The input type for the intelligentExpenseCategorization function.
 * - IntelligentExpenseCategorizationOutput - The return type for the intelligentExpenseCategorization function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const IntelligentExpenseCategorizationInputSchema = z.object({
  merchant: z.string().describe('The name of the merchant where the transaction occurred.'),
  description: z.string().describe('A detailed description of the transaction.'),
  amount: z.number().describe('The monetary amount of the transaction.'),
});
export type IntelligentExpenseCategorizationInput = z.infer<typeof IntelligentExpenseCategorizationInputSchema>;

// Output Schema
const IntelligentExpenseCategorizationOutputSchema = z.object({
  category: z.string().describe('The category of the transaction (e.g., Groceries, Transport, Utilities, Entertainment, Salary, Rent, Shopping, Bills, Healthcare, Education, Travel, Food & Dining, Personal Care, Investments, Other).'),
});
export type IntelligentExpenseCategorizationOutput = z.infer<typeof IntelligentExpenseCategorizationOutputSchema>;

// Wrapper function to expose the flow as a callable function
export async function intelligentExpenseCategorization(input: IntelligentExpenseCategorizationInput): Promise<IntelligentExpenseCategorizationOutput> {
  return intelligentExpenseCategorizationFlow(input);
}

// Prompt definition for categorizing transactions
const prompt = ai.definePrompt({
  name: 'intelligentExpenseCategorizationPrompt',
  input: {schema: IntelligentExpenseCategorizationInputSchema},
  output: {schema: IntelligentExpenseCategorizationOutputSchema},
  prompt: `You are an AI assistant specialized in categorizing financial transactions.
Your task is to assign the most appropriate financial category to the given transaction details.
Your output MUST be a JSON object with a single field named "category".

Transaction Details:
Merchant: {{{merchant}}}
Description: {{{description}}}
Amount: {{{amount}}}

Please provide the category in JSON format.`,
});

// Genkit flow definition
const intelligentExpenseCategorizationFlow = ai.defineFlow(
  {
    name: 'intelligentExpenseCategorizationFlow',
    inputSchema: IntelligentExpenseCategorizationInputSchema,
    outputSchema: IntelligentExpenseCategorizationOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to categorize transaction: AI model returned no output.');
    }
    return output;
  }
);
