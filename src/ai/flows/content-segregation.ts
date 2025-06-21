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

const SegregatedQuestionSchema = z.object({
  questionText: z.string().describe("The full, complete text of the question, without the question number."),
  options: z.array(z.string()).optional().describe("An array of multiple-choice options for the question. For example, ['(A) 10', '(B) 20', '(C) 30', '(D) 40']. Extract the full option text including the letter/number."),
});


const ContentSegregationOutputSchema = z.object({
  theory: z.string().describe('The extracted theory content from the PDF. Preserve formatting and use Markdown for structure (headings, lists, etc.).'),
  questions: z.array(SegregatedQuestionSchema).describe('An array of all extracted questions. Each question should be an object with its text and options.'),
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

  2.  **Extract Questions**: Identify and extract all individual questions, problems, and exercises. For each question:
      - Extract the full question text. Do not include the question number (e.g., "1.", "Q2.", etc.).
      - If the question has multiple-choice options, extract them into an array of strings. Include the option label (e.g., "(A)", "1)") as part of the string.
      - If there are no options, do not include the 'options' field.

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
