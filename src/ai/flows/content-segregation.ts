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
  theory: z.string().describe('The extracted theory content from the PDF. Preserve formatting and use Markdown for structure (headings, lists, etc.).'),
  questions: z.array(z.string()).describe('An array of all extracted questions. Each question should be a single string in the array.'),
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

  1.  **Extract Theory**: Identify and extract all theory, explanations, and concepts. Preserve the original formatting, including paragraphs, lists, and tables. Return this content as a single string formatted with Markdown.

  2.  **Extract Questions**: Identify and extract all individual questions, problems, and exercises. Each complete question (including all its parts if it's a multi-part question) should be a separate element in a JSON array of strings. Do not include the question numbers (e.g., "1.", "Q2.", etc.) in the extracted question text.

  Return the extracted theory and the array of questions in the specified structured format.
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
