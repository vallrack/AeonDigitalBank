'use server';
/**
 * @fileOverview An AI agent for predictive fraud monitoring that analyzes transactions
 * and flags suspicious activities based on unusual patterns, amounts, or locations.
 *
 * - predictiveFraudMonitoring - A function that handles the fraud monitoring process.
 * - PredictiveFraudMonitoringInput - The input type for the predictiveFraudMonitoring function.
 * - PredictiveFraudMonitoringOutput - The return type for the predictiveFraudMonitoring function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TransactionSchema = z.object({
  transactionId: z.string().describe('Unique identifier for the transaction.'),
  userId: z.string().describe('ID of the user performing the transaction.'),
  amount: z.number().positive().describe('The amount of the transaction.'),
  currency: z.string().describe('The currency of the transaction (e.g., USD, EUR).'),
  timestamp: z.string().datetime().describe('ISO 8601 formatted timestamp of the transaction.'),
  merchant: z.string().describe('The name of the merchant involved in the transaction.'),
  location: z.string().describe('Geographic location of the transaction (e.g., "New York, USA").'),
});

const PredictiveFraudMonitoringInputSchema = z.object({
  currentTransaction: TransactionSchema.describe('The current transaction to be analyzed.'),
  userContext: z
    .object({
      transactionHistory: z
        .array(TransactionSchema)
        .max(20)
        .describe('Recent transaction history for the user (up to 20 transactions).'),
      knownLocations: z.array(z.string()).describe('List of known geographic locations for the user.'),
      averageTransactionAmount: z.number().optional().describe('User\'s average transaction amount.'),
      dailySpendLimit: z.number().optional().describe('User\'s daily spending limit.'),
    })
    .describe('Contextual information about the user, including historical data.'),
});
export type PredictiveFraudMonitoringInput = z.infer<typeof PredictiveFraudMonitoringInputSchema>;

const PredictiveFraudMonitoringOutputSchema = z.object({
  isSuspicious: z.boolean().describe('True if the transaction is flagged as suspicious, false otherwise.'),
  reason: z.string().describe('Explanation for why the transaction was flagged or not flagged.'),
  confidenceScore: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('A score (0.0 to 1.0) indicating the AI\'s confidence in its assessment.'),
  alertLevel: z
    .enum(['None', 'Low', 'Medium', 'High'])
    .describe('The severity level of the alert if the transaction is suspicious.'),
});
export type PredictiveFraudMonitoringOutput = z.infer<typeof PredictiveFraudMonitoringOutputSchema>;

export async function predictiveFraudMonitoring(
  input: PredictiveFraudMonitoringInput
): Promise<PredictiveFraudMonitoringOutput> {
  return predictiveFraudMonitoringFlow(input);
}

const predictiveFraudMonitoringPrompt = ai.definePrompt({
  name: 'predictiveFraudMonitoringPrompt',
  input: {schema: PredictiveFraudMonitoringInputSchema},
  output: {schema: PredictiveFraudMonitoringOutputSchema},
  prompt: `You are an expert AI-powered fraud detection system for a digital bank. Your task is to analyze a new financial transaction and determine if it is suspicious based on the user's historical data and common fraud indicators.

**Current Transaction:**
- Transaction ID: {{{currentTransaction.transactionId}}}
- User ID: {{{currentTransaction.userId}}}
- Amount: {{{currentTransaction.amount}}} {{{currentTransaction.currency}}}
- Timestamp: {{{currentTransaction.timestamp}}}
- Merchant: {{{currentTransaction.merchant}}}
- Location: {{{currentTransaction.location}}}

**User Profile & History:**
- Known Locations: {{#each userContext.knownLocations}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Average Transaction Amount: {{{userContext.averageTransactionAmount}}}
- Daily Spend Limit: {{{userContext.dailySpendLimit}}}
- Recent Transaction History (most recent first):
{{#if userContext.transactionHistory}}
{{#each userContext.transactionHistory}}
  - Amount: {{{this.amount}}} {{{this.currency}}}, Merchant: {{{this.merchant}}}, Location: {{{this.location}}}, Timestamp: {{{this.timestamp}}}
{{/each}}
{{else}}
  No recent transaction history available.
{{/if}}

Based on the above information, identify if the current transaction is suspicious by looking for:
1.  **Unusual Amount**: Is the current amount significantly higher than the user's average, recent transactions, or exceeds the daily spend limit?
2.  **Unusual Location**: Is the transaction location unusual compared to the user's known locations or recent transaction history? Consider rapid consecutive transactions from vastly different geographic locations.
3.  **Unusual Pattern**: Are there any other patterns that suggest potential fraud (e.g., multiple small transactions followed by a large one, very rapid transactions in a short period, transaction at an unusual time)?

If the transaction is suspicious, set 'isSuspicious' to 'true', provide a clear 'reason' for flagging it, assign a 'confidenceScore' between 0.0 and 1.0, and set an 'alertLevel' ('Low', 'Medium', 'High'). If not suspicious, set 'isSuspicious' to 'false', 'reason' to 'No suspicious activity detected.', and 'alertLevel' to 'None'.

Ensure your output is a JSON object conforming strictly to the 'PredictiveFraudMonitoringOutputSchema'.`,
});

const predictiveFraudMonitoringFlow = ai.defineFlow(
  {
    name: 'predictiveFraudMonitoringFlow',
    inputSchema: PredictiveFraudMonitoringInputSchema,
    outputSchema: PredictiveFraudMonitoringOutputSchema,
  },
  async (input) => {
    const {output} = await predictiveFraudMonitoringPrompt(input);
    if (!output) {
      throw new Error('AI prompt did not return any output for fraud monitoring.');
    }
    return output;
  }
);