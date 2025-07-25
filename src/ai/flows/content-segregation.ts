
'use server';

/**
 * @fileOverview Automatically classifies and separates theory from questions in uploaded PDFs using AI.
 *
 * - contentSegregation - A function that handles the content segregation process.
 * - ContentSegregationInput - The input type for the contentSegregation function.
 * - ContentSegregationOutput - The return type for the contentSegregation function.
 */

import { defineFlow, ai } from '@/ai/genkit';
import {z} from 'genkit';

const ContentSegregationInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type ContentSegregationInput = z.infer<typeof ContentSegregationInputSchema>;

const SegregatedQuestionSchema = z.object({
  questionText: z.string().describe("The full, complete text of the question, without the question number or the multiple-choice options."),
  options: z.array(z.string()).optional().describe("An array of multiple-choice options for the question. For example, ['(A) 10', '(B) 20', '(C) 30', '(D) 40']. Extract the full option text including the letter/number."),
  topic: z.string().describe("A concise topic for the question (e.g., 'Percentages', 'Time and Work', 'Geometry').")
});


const ContentSegregationOutputSchema = z.object({
  theory: z.string().describe('The extracted theory content from the PDF. Preserve formatting and use Markdown for structure (headings, lists, etc.).'),
  questions: z.array(SegregatedQuestionSchema).describe('An array of all extracted questions. Each question should be an object with its text and options.'),
});
export type ContentSegregationOutput = z.infer<typeof ContentSegregationOutputSchema>;

export async function contentSegregation(input: ContentSegregationInput): Promise<ContentSegregationOutput> {
  return contentSegregationFlow(input);
}


const contentSegregationFlow = defineFlow(
  {
    name: 'contentSegregationFlow',
    inputSchema: ContentSegregationInputSchema,
    outputSchema: ContentSegregationOutputSchema,
  },
  async (input) => {
    const contentSegregationPrompt = ai.definePrompt({
      name: 'contentSegregationPrompt',
      input: {schema: ContentSegregationInputSchema},
      output: {schema: ContentSegregationOutputSchema},
      prompt: `You are an expert in parsing and understanding PDF documents, especially those containing aptitude test materials. Your task is to analyze the content of the uploaded PDF and meticulously separate it into two categories: theory and questions.

The PDF content is provided below:
{{media url=pdfDataUri}}

Your goal is to be exhaustive. **Assume everything in the document is either theory or a question.**

1.  **Extract and Format Theory**:
    *   Identify and extract ALL content that is not a direct question or its options. This includes introduction paragraphs, topic explanations, formulas, definitions, examples, and any other explanatory text.
    *   **Crucially, format this content for readability using Markdown.** Your goal is to make it look like a well-structured study guide.
    *   Use Markdown headings ('#', '##', '###') for titles and sub-topics.
    *   Use bullet points ('*' or '-') for lists.
    *   Use bold ('**text**') and italics ('*text*') to emphasize key terms and concepts.
    *   Preserve paragraph breaks. **Ensure there are blank lines between paragraphs.**
    *   For mathematical formulas or equations, use LaTeX syntax. Wrap inline math in single dollar signs (e.g., $ax^2 + bx + c = 0$) and block-level math in double dollar signs (e.g., $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$).
    *   Return this well-structured content as a single Markdown string. Be thorough and ensure no theoretical content is missed.

2.  **Extract Questions**: Identify and extract all individual questions, problems, and exercises. For each question:
    - Extract the full question text. The 'questionText' should NOT include the question number (e.g., "1.", "Q2.") OR the list of multiple-choice options. The options should only be in the 'options' field.
    - If the question has multiple-choice options, extract them into an array of strings. Include the option label (e.g., "(A)", "1)") as part of the string.
    - Based on the question's content, determine its specific topic (e.g., 'Percentages', 'Time and Work', 'Geometry').
    - If there are no options, do not include the 'options' field.

Return the extracted theory and the array of questions in the specified structured format.
      `,
    });
    
    const {output} = await contentSegregationPrompt(input);
    return output!;
  }
);
