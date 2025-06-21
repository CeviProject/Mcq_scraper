'use server';
/**
 * @fileOverview Solves a batch of questions efficiently.
 *
 * - batchSolveQuestions - A function that handles solving a list of questions.
 * - BatchSolveInput - The input type for the function.
 * - BatchSolveOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';

const QuestionToSolveSchema = z.object({
  id: z.string().describe("The unique identifier for the question."),
  questionText: z.string(),
  options: z.array(z.string()).optional(),
});

const BatchSolveInputSchema = z.object({
  questions: z.array(QuestionToSolveSchema),
  apiKey: z.string().optional().describe("User's Gemini API key."),
});
export type BatchSolveInput = z.infer<typeof BatchSolveInputSchema>;

const SolvedQuestionSchema = z.object({
    id: z.string().describe("The original ID of the question to map the result back."),
    solution: z.string().describe("A detailed, step-by-step solution to the question, formatted in Markdown with LaTeX for math."),
    correctOption: z.string().optional().describe("The full text of the correct multiple-choice option. Must be one of the provided options."),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).describe("The estimated difficulty of the question.")
});

const BatchSolveOutputSchema = z.object({
  solvedQuestions: z.array(SolvedQuestionSchema),
});
export type BatchSolveOutput = z.infer<typeof BatchSolveOutputSchema>;


export async function batchSolveQuestions(input: BatchSolveInput): Promise<BatchSolveOutput> {
  return batchSolveFlow(input);
}

const batchSolveFlow = ai.defineFlow(
  {
    name: 'batchSolveFlow',
    inputSchema: BatchSolveInputSchema,
    outputSchema: BatchSolveOutputSchema,
  },
  async (input) => {
    const key = input.apiKey || process.env.GOOGLE_API_KEY;
    if (!key) {
        throw new Error("A Gemini API key is required. Please add it in Settings or set GOOGLE_API_KEY in your environment.");
    }
    const dynamicAi = genkit({ plugins: [googleAI({ apiKey: key })] });
    
    const prompt = dynamicAi.definePrompt({
      name: 'batchSolvePrompt_dynamic',
      model: 'googleai/gemini-1.5-pro-latest',
      input: {schema: BatchSolveInputSchema},
      output: {schema: BatchSolveOutputSchema},
      prompt: `You are an expert aptitude test tutor. You will be given a JSON array of questions.
    Your task is to solve each question and provide a detailed solution, identify the correct option, and assess the difficulty.

    For each question in the input array, you must:
    1.  Provide a clear, step-by-step solution. Use your general expertise. Format the response in Markdown. When writing mathematical formulas or equations, use LaTeX syntax (e.g., $...$ for inline, $$...$$ for block).
    2.  Determine the correct multiple-choice option from the provided list. The 'correctOption' field must exactly match one of the strings in the input 'options' array.
    3.  Estimate the difficulty and set it to 'Easy', 'Medium', or 'Hard'.
    4.  Return the original 'id' of the question in your response for mapping.

    Process all questions provided in the input JSON and return the results in the 'solvedQuestions' array.

    Input Questions:
    {{{json questions}}}
    `,
    });

    const {output} = await prompt(input);
    return output!;
  }
);
