
'use server';
/**
 * @fileOverview AI helpers for solving and understanding questions.
 *
 * - getSolution - Generates a detailed solution for a given question.
 * - getTricks - Generates general tips and tricks for solving a given type of question.
 * - askFollowUp - Answers follow-up questions about a problem.
 * - getWrongAnswerExplanation - Explains why a user's incorrect answer was wrong.
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
    correctOption: z.string().optional().describe("The full text of the correct multiple-choice option, if applicable. Must be one of the provided options."),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).describe("The estimated difficulty of the question based on its complexity.")
});
export type GetSolutionOutput = z.infer<typeof GetSolutionOutputSchema>;

export async function getSolution(input: GetSolutionInput): Promise<GetSolutionOutput> {
  return getSolutionFlow(input);
}

const getSolutionPrompt = ai.definePrompt({
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
When writing mathematical formulas or equations, use LaTeX syntax. For inline formulas, wrap them in single dollar signs (e.g., $ax^2 + bx + c = 0$). For block-level formulas, wrap them in double dollar signs (e.g., $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$).
Format the entire response in Markdown.
Based on the complexity of the question, set the 'difficulty' field to 'Easy', 'Medium', or 'Hard'.

Question:
{{{questionText}}}

{{#if options}}
Available Options:
{{#each options}}
- {{{this}}}
{{/each}}

After providing the step-by-step solution, you MUST identify the correct option from the list above and place its full text into the 'correctOption' field.
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
        const {output} = await getSolutionPrompt(input);
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

const askFollowUpPrompt = ai.definePrompt({
    name: 'askFollowUpPrompt',
    input: { schema: AskFollowUpInputSchema },
    output: { schema: AskFollowUpOutputSchema },
    prompt: `You are an expert aptitude test tutor engaged in a conversation with a student.
The student has a follow-up question about a specific aptitude problem and its solution.
Your task is to answer the student's query based on the provided context. Be helpful, clear, and concise.
When writing mathematical formulas or equations, use LaTeX syntax. For inline formulas, wrap them in single dollar signs (e.g., $ax^2 + bx + c = 0$). For block-level formulas, wrap them in double dollar signs (e.g., $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$).

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
        const {output} = await askFollowUpPrompt(input);
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

const getTricksPrompt = ai.definePrompt({
    name: 'getTricksPrompt',
    input: {schema: GetTricksInputSchema},
    output: {schema: GetTricksOutputSchema},
    prompt: `You are an expert aptitude test coach. Your goal is to provide highly specific and actionable advice for solving a certain category of problem, based on a single sample question.

**Your Task:**
1.  **Identify the Core Concept:** Look at the content of the sample question below and identify the fundamental mathematical or logical concept being tested. For example, is it about integer multiplication rules, percentages, ratios, logical deduction, etc.?
2.  **Provide Specific Tricks:** Based on that core concept, generate a list of relevant rules, formulas, and shortcut strategies.
3.  **DO NOT be generic.** Your advice must be tailored to the specific topic you identified. For example, if the question is \`Which of the following statement is correct? a) (+) x (-) = (-) ...\`, the core concept is "rules of integer multiplication". Your tricks should be about how signs behave in multiplication (e.g., "A negative times a positive is always negative"). It should NOT be a generic guide on "how to evaluate statements". Similarly, if the question is about "boats and streams", give tricks for that specific scenario, not general "speed and distance" formulas.
4.  **Do not solve the provided question.** Use it only to understand the problem type.
5.  Format your response in Markdown.

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
        const {output} = await getTricksPrompt(input);
        return output!;
    }
);


// "Why Wrong?" Explanation Flow
const GetWrongAnswerExplanationInputSchema = z.object({
    questionText: z.string().describe("The full text of the question."),
    options: z.array(z.string()).optional().describe("The list of all multiple-choice options."),
    correctOption: z.string().optional().describe("The text of the correct answer."),
    userSelectedOption: z.string().describe("The incorrect option that the user chose."),
});
export type GetWrongAnswerExplanationInput = z.infer<typeof GetWrongAnswerExplanationInputSchema>;

const GetWrongAnswerExplanationOutputSchema = z.object({
    explanation: z.string().describe("A detailed explanation of why the user's chosen answer is incorrect, formatted in Markdown."),
});
export type GetWrongAnswerExplanationOutput = z.infer<typeof GetWrongAnswerExplanationOutputSchema>;

export async function getWrongAnswerExplanation(input: GetWrongAnswerExplanationInput): Promise<GetWrongAnswerExplanationOutput> {
  return getWrongAnswerExplanationFlow(input);
}

const wrongAnswerPrompt = ai.definePrompt({
    name: 'getWrongAnswerExplanationPrompt',
    input: {schema: GetWrongAnswerExplanationInputSchema},
    output: {schema: GetWrongAnswerExplanationOutputSchema},
    prompt: `You are a patient and insightful AI tutor. A student has answered a question incorrectly and needs to understand their mistake.

Your task is to explain **why the user's selected answer is wrong**. Do not just explain why the correct answer is right. Focus on the potential trap or misunderstanding that led to the incorrect choice.

Here is the context:
- Question: {{{questionText}}}
- The user incorrectly chose: **{{{userSelectedOption}}}**
- The actual correct answer is: {{#if correctOption}}**{{{correctOption}}}**{{else}}Not provided{{/if}}

Please provide a clear, concise explanation in Markdown, addressing the specific flaw in the logic of choosing "{{{userSelectedOption}}}". For example, if the user chose an answer that results from a common calculation error, point out that error.
`,
});

const getWrongAnswerExplanationFlow = ai.defineFlow(
    {
        name: 'getWrongAnswerExplanationFlow',
        inputSchema: GetWrongAnswerExplanationInputSchema,
        outputSchema: GetWrongAnswerExplanationOutputSchema,
    },
    async (input) => {
        const {output} = await wrongAnswerPrompt(input);
        return output!;
    }
);
