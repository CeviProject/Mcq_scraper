
'use server';
/**
 * @fileOverview Provides AI-powered feedback on mock tests.
 *
 * - generateTestFeedback - A function that analyzes a completed test and provides feedback.
 * - GenerateTestFeedbackInput - The input type for the function.
 * - GenerateTestFeedbackOutput - The return type for the function.
 */

import { defineFlow, ai } from '@/ai/genkit';
import {z} from 'genkit';

const TestQuestionResultSchema = z.object({
  questionText: z.string(),
  topic: z.string(),
  userAnswer: z.string().optional(),
  correctAnswer: z.string().optional(),
  isCorrect: z.boolean(),
});

const GenerateTestFeedbackInputSchema = z.object({
  results: z.array(TestQuestionResultSchema).describe("An array of the user's results for each question in the test."),
});
export type GenerateTestFeedbackInput = z.infer<typeof GenerateTestFeedbackInputSchema>;

const GenerateTestFeedbackOutputSchema = z.object({
    overallFeedback: z.string().describe("A comprehensive, encouraging feedback summary for the user in Markdown format. Mention the score and give general advice."),
    areasOfWeakness: z.array(z.string()).describe("A list of topics where the user struggled the most, based on incorrect answers."),
});
export type GenerateTestFeedbackOutput = z.infer<typeof GenerateTestFeedbackOutputSchema>;

export async function generateTestFeedback(input: GenerateTestFeedbackInput): Promise<GenerateTestFeedbackOutput> {
  return generateTestFeedbackFlow(input);
}


const generateTestFeedbackFlow = defineFlow(
    {
        name: 'generateTestFeedbackFlow',
        inputSchema: GenerateTestFeedbackInputSchema,
        outputSchema: GenerateTestFeedbackOutputSchema,
    },
    async (input) => {
        const feedbackPrompt = ai.definePrompt({
            name: 'generateTestFeedbackPrompt',
            input: {schema: GenerateTestFeedbackInputSchema},
            output: {schema: GenerateTestFeedbackOutputSchema},
            prompt: `You are an expert aptitude test coach. A student has just completed a mock test. Analyze their performance based on the results provided and give them constructive feedback.

The user's test results are provided as a JSON object. For each question, you'll see the topic, their answer, the correct answer, and whether they got it right.

Test Results:
{{{json results}}}

Your tasks are:
1.  **Write Overall Feedback**: Start with an encouraging tone. Calculate the user's score (number of correct answers out of total questions). Provide a summary of their performance. Offer general tips for improvement. Format this as Markdown.
2.  **Identify Areas of Weakness**: Based on the topics of the questions they answered incorrectly, identify the topics they seem to be struggling with. List these topics in the 'areasOfWeakness' field. If they got everything right, return an empty array.
`,
        });
        
        const {output} = await feedbackPrompt(input);
        return output!;
    }
);
