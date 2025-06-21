'use server';

/**
 * @fileOverview Automatically classifies and separates theory from questions in uploaded PDFs using AI.
 *
 * - contentSegregation - A function that handles the content segregation process.
 * - ContentSegregationInput - The input type for the contentSegregation function.
 * - ContentSegregationOutput - The return type for the contentSegregation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ContentSegregationInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ContentSegregationInput = z.infer<typeof ContentSegregationInputSchema>;

const ContentSegregationOutputSchema = z.object({
  theory: z.string().describe('The extracted theory content from the PDF.'),
  questions: z.string().describe('The extracted questions from the PDF.'),
});
export type ContentSegregationOutput = z.infer<typeof ContentSegregationOutputSchema>;

export async function contentSegregation(input: ContentSegregationInput): Promise<ContentSegregationOutput> {
  return contentSegregationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contentSegregationPrompt',
  input: {schema: ContentSegregationInputSchema},
  output: {schema: ContentSegregationOutputSchema},
  prompt: `You are an expert in parsing and understanding PDF documents, especially those containing aptitude test materials. Your task is to analyze the content of the uploaded PDF and separate it into two distinct categories: theory and questions.

  Here's the content of the PDF:
  {{media url=pdfDataUri}}

  Identify and extract all theory, explanations, and concepts presented in the document. These are generally descriptive sections intended to educate the reader.

  Also, identify and extract all questions, problems, and exercises presented in the document. These are generally sections that require the reader to apply their knowledge to find a solution.

  Return the extracted theory and questions in a structured format.
  `,
});

const contentSegregationFlow = ai.defineFlow(
  {
    name: 'contentSegregationFlow',
    inputSchema: ContentSegregationInputSchema,
    outputSchema: ContentSegregationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
