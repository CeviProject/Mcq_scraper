'use server';
/**
 * @fileOverview AI helpers for solving and understanding questions.
 *
 * - getSolution - Generates a detailed solution for a given question.
 * - getTricks - Generates general tips and tricks for solving a given type of question.
 * - askFollowUp - Answers follow-up questions about a problem.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Get Solution Flow
const GetSolutionInputSchema = z.object({
    questionText: z.string().describe("The text of the aptitude question."),
    options: z.array(z.string()).optional().describe("The multiple-choice options for the question. For example, ['(A) 10', '(B) 20']."),
    theoryContext: z.string().optional().describe("The relevant theory content from the PDF to use as the primary context for solving the question."),
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
Your primary goal is to use the provided theory context to answer the question. Only if the theory is insufficient or not provided, should you use your general knowledge.

{{#if theoryContext}}
First, carefully review the following theory content extracted from the student's document:
--- THEORY CONTEXT ---
{{{theoryContext}}}
--- END OF THEORY CONTEXT ---
Based on this theory, provide a clear, step-by-step solution to the question below.
{{else}}
Provide a clear, step-by-step solution to the following question using your expertise.
{{/if}}

Explain the logic and calculations involved.
Format the entire response in Markdown.

Question:
{{{questionText}}}

{{#if options}}
Available Options:
{{#each options}}
- {{{this}}}
{{/each}}

After providing the step-by-step solution, you MUST conclude by stating which option is the correct answer based on your derivation. For example: "Therefore, the correct option is (B) 20."
{{/if}}
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


// Ask Follow Up Flow
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const AskFollowUpInputSchema = z.object({
  questionText: z.string().describe("The original aptitude question."),
  options: z.array(z.string()).optional().describe("The multiple-choice options for the question."),
  solution: z.string().describe("The generated solution to the original question."),
  theoryContext: z.string().optional().describe("The theory context related to the question."),
  chatHistory: z.array(ChatMessageSchema).optional().describe("The history of the conversation so far."),
  userQuery: z.string().describe("The user's latest follow-up question."),
});
export type AskFollowUpInput = z.infer<typeof AskFollowUpInputSchema>;

const AskFollowUpOutputSchema = z.object({
    answer: z.string().describe("The AI's answer to the user's follow-up question, formatted in Markdown."),
});
export type AskFollowUpOutput = z.infer<typeof AskFollowUpOutputSchema>;

export async function askFollowUp(input: AskFollowUpInput): Promise<AskFollowUpOutput> {
  return askFollowUpFlow(input);
}

const followUpPrompt = ai.definePrompt({
  name: 'askFollowUpPrompt',
  input: { schema: AskFollowUpInputSchema },
  output: { schema: AskFollowUpOutputSchema },
  prompt: `You are an expert aptitude test tutor engaged in a conversation with a student.
The student has a follow-up question about a specific aptitude problem and its solution.
Your task is to answer the student's query based on the provided context. Be helpful, clear, and concise.

Here is the full context of the problem:
Original Question: {{{questionText}}}
{{#if options}}
Options: {{#each options}}{{{this}}}{{/each}}
{{/if}}
Solution: {{{solution}}}
{{#if theoryContext}}
Relevant Theory: {{{theoryContext}}}{{/if}}

Below is the conversation history. The user's latest question is at the end. Provide a direct answer to that question.
{{#if chatHistory}}
{{#each chatHistory}}
**{{this.role}}**: {{this.content}}
{{/each}}
{{/if}}
**user**: {{{userQuery}}}

**model**:
  `,
});

const askFollowUpFlow = ai.defineFlow(
    {
        name: 'askFollowUpFlow',
        inputSchema: AskFollowUpInputSchema,
        outputSchema: AskFollowUpOutputSchema,
    },
    async (input) => {
        const {output} = await followUpPrompt(input);
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
