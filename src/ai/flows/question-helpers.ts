'use server';
/**
 * @fileOverview AI helpers for solving and understanding questions.
 *
 * - getSolution - Generates a detailed solution for a given question.
 * - getTricks - Generates general tips and tricks for solving a given type of question.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';


// Get Solution Flow
const GetSolutionInputSchema = z.object({
    questionText: z.string().describe("The text of the aptitude question."),
});
export type GetSolutionInput = z.infer<typeof GetSolutionInputSchema>;

const GetSolutionOutputSchema = z.object({
    solution: z.string().describe("A detailed, step-by-step solution to the question, formatted in Markdown."),
});
export type GetSolutionOutput = z.infer<typeof GetSolutionOutputSchema>;

export async function getSolution(input: GetSolutionInput): Promise<GetSolutionOutput> {
  return getSolutionFlow(input);
}

const solutionPrompt = ai.definePrompt({
    name: 'getSolutionPrompt',
    input: {schema: GetSolutionInputSchema},
    output: {schema: GetSolutionOutputSchema},
    prompt: `You are an expert aptitude test tutor. A student needs help with a question.
    Provide a clear, step-by-step solution to the following question. Explain the logic and calculations involved.
    Format the entire response in Markdown.

    Question:
    {{{questionText}}}
    `,
});

const getSolutionFlow = ai.defineFlow(
    {
        name: 'getSolutionFlow',
        inputSchema: GetSolutionInputSchema,
        outputSchema: GetSolutionOutputSchema,
    },
    async (input) => {
        const {output} = await solutionPrompt(input);
        return output!;
    }
);


// Get Tricks Flow
const GetTricksInputSchema = z.object({
    questionText: z.string().describe("The text of an aptitude question, which will be used to identify the topic."),
});
export type GetTricksInput = z.infer<typeof GetTricksInputSchema>;

const GetTricksOutputSchema = z.object({
    tricks: z.string().describe("A list of general tips, tricks, and strategies for solving this type of question, formatted in Markdown."),
});
export type GetTricksOutput = z.infer<typeof GetTricksOutputSchema>;

export async function getTricks(input: GetTricksInput): Promise<GetTricksOutput> {
  return getTricksFlow(input);
}

const tricksPrompt = ai.definePrompt({
    name: 'getTricksPrompt',
    input: {schema: GetTricksInputSchema},
    output: {schema: GetTricksOutputSchema},
    prompt: `You are an expert aptitude test coach. A student wants to know the best strategies for a certain type of problem.
    Based on the question below, identify the general topic (e.g., 'Percentages', 'Work and Time', 'Permutations', etc.).
    Then, provide a list of general tips, common formulas, and quick tricks for solving questions of THAT TOPIC. Do not solve the specific question provided.
    Format the entire response in Markdown, using lists and bold text to make it easy to read.

    Sample Question:
    {{{questionText}}}
    `,
});

const getTricksFlow = ai.defineFlow(
    {
        name: 'getTricksFlow',
        inputSchema: GetTricksInputSchema,
        outputSchema: GetTricksOutputSchema,
    },
    async (input) => {
        const {output} = await tricksPrompt(input);
        return output!;
    }
);
