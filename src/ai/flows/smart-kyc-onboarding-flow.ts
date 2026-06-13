'use server';
/**
 * @fileOverview A Genkit flow for Smart KYC Onboarding.
 *
 * - smartKycOnboarding - A function that handles the smart KYC onboarding process.
 * - SmartKycOnboardingInput - The input type for the smartKycOnboarding function.
 * - SmartKycOnboardingOutput - The return type for the smartKycOnboarding function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const PersonalInformationSchema = z.object({
  fullName: z.string().describe('The full legal name of the user.'),
  dateOfBirth: z.string().describe('The date of birth of the user in YYYY-MM-DD format.'),
  address: z.string().describe('The residential address of the user.'),
  documentType: z.string().describe('The type of identification document (e.g., Passport, Driver\'s License).'),
  documentNumber: z.string().describe('The identification document number.'),
  nationality: z.string().describe('The nationality of the user.'),
});

const SmartKycOnboardingInputSchema = z.object({
  documentPhotoDataUri: z
    .string()
    .describe(
      "A photo of the identification document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  faceScanDataUri: z
    .string()
    .describe(
      "A photo of the user's face scan, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  personalInformation: PersonalInformationSchema.describe('Detailed personal information provided by the user.'),
});
export type SmartKycOnboardingInput = z.infer<typeof SmartKycOnboardingInputSchema>;

// Output Schema
const SmartKycOnboardingOutputSchema = z.object({
  isVerified: z.boolean().describe('True if the identity verification was successful, false otherwise.'),
  verificationDetails: z.string().describe('A detailed explanation of the verification outcome, including any discrepancies or reasons for failure.'),
  confidenceScore: z.number().min(0).max(1).describe('A confidence score (0 to 1) of the AI verification process.'),
  issuesDetected: z.array(z.string()).describe('A list of any specific issues detected during the verification process.'),
});
export type SmartKycOnboardingOutput = z.infer<typeof SmartKycOnboardingOutputSchema>;

// Wrapper function
export async function smartKycOnboarding(input: SmartKycOnboardingInput): Promise<SmartKycOnboardingOutput> {
  return smartKycOnboardingFlow(input);
}

// Genkit Prompt Definition
const smartKycOnboardingPrompt = ai.definePrompt({
  name: 'smartKycOnboardingPrompt',
  input: { schema: SmartKycOnboardingInputSchema },
  output: { schema: SmartKycOnboardingOutputSchema },
  prompt: `You are an AI-powered KYC (Know Your Customer) verification agent for a digital bank. Your task is to verify a new user's identity based on provided identification documents, a facial scan, and personal information.\n\nCarefully review the following data:\n\nUser's Personal Information:\nFull Name: {{{personalInformation.fullName}}}\nDate of Birth: {{{personalInformation.dateOfBirth}}}\nAddress: {{{personalInformation.address}}}\nDocument Type: {{{personalInformation.documentType}}}\nDocument Number: {{{personalInformation.documentNumber}}}\nNationality: {{{personalInformation.nationality}}}\n\nIdentification Document: {{media url=documentPhotoDataUri}}\nFacial Scan: {{media url=faceScanDataUri}}\n\nPerform the following checks:\n1. Compare the face in the 'Facial Scan' with any facial images present on the 'Identification Document'.\n2. Verify that the 'Personal Information' provided matches the details visible on the 'Identification Document'.\n3. Check for any signs of tampering or fraud in the uploaded images.\n\nBased on your analysis, determine if the identity verification is successful. Provide a detailed explanation of your decision, a confidence score (0 to 1), and list any specific issues detected.\nSet 'isVerified' to true if all checks pass with high confidence, otherwise set it to false.`,
});

// Genkit Flow Definition
const smartKycOnboardingFlow = ai.defineFlow(
  {
    name: 'smartKycOnboardingFlow',
    inputSchema: SmartKycOnboardingInputSchema,
    outputSchema: SmartKycOnboardingOutputSchema,
  },
  async (input) => {
    const { output } = await smartKycOnboardingPrompt(input);
    if (!output) {
      throw new Error('AI prompt did not return any output for KYC verification.');
    }
    return output;
  }
);
