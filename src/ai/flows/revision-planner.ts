'use server';
/**
 * @fileOverview Generates a personalized revision plan based on user's test performance.
 *
 * - generateRevisionPlan - A function that creates a study schedule.
 * - GenerateRevisionPlanInput - The input type for the function.
 * - GenerateRevisionPlanOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';


const TopicPerformanceSchema = z.object({
    topic: z.string(),
    accuracy: z.number().describe("The user's accuracy for this topic, as a percentage (0-100)."),
});

const GenerateRevisionPlanInputSchema = z.object({
  performanceData: z.array(TopicPerformanceSchema).describe("An array of the user's performance per topic."),
  apiKey: z.string().optional().describe("User's Gemini API key."),
});
export type GenerateRevisionPlanInput = z.infer<typeof GenerateRevisionPlanInputSchema>;


const RevisionDaySchema = z.object({
    day: z.string().describe("The day of the week (e.g., 'Monday')."),
    topic: z.string().describe("The topic to focus on for that day."),
    reason: z.string().describe("A brief, encouraging reason why this topic was chosen for this day."),
});

const GenerateRevisionPlanOutputSchema = z.object({
    plan: z.array(RevisionDaySchema).describe("A 7-day revision plan. Prioritize the user's weakest topics. Include a mix of topics and at least one rest day."),
});
export type GenerateRevisionPlanOutput = z.infer<typeof GenerateRevisionPlanOutputSchema>;


export async function generateRevisionPlan(input: GenerateRevisionPlanInput): Promise<GenerateRevisionPlanOutput> {
  return generateRevisionPlanFlow(input);
}

const generateRevisionPlanFlow = ai.defineFlow(
    {
        name: 'generateRevisionPlanFlow',
        inputSchema: GenerateRevisionPlanInputSchema,
        outputSchema: GenerateRevisionPlanOutputSchema,
    },
    async (input) => {
        const key = input.apiKey || process.env.GOOGLE_API_KEY;
        if (!key) {
            throw new Error("A Gemini API key is required. Please add it in Settings or set GOOGLE_API_KEY in your environment.");
        }
        const dynamicAi = genkit({ plugins: [googleAI({ apiKey: key })] });

        const feedbackPrompt = dynamicAi.definePrompt({
            name: 'generateRevisionPlanPrompt_dynamic',
            model: 'googleai/gemini-1.5-flash-latest',
            input: {schema: GenerateRevisionPlanInputSchema},
            output: {schema: GenerateRevisionPlanOutputSchema},
            prompt: `You are an expert academic coach creating a personalized 7-day revision schedule for a student preparing for aptitude tests.
The student's performance data, showing their accuracy on different topics, is provided below.

Performance Data (Topic, Accuracy %):
{{{json performanceData}}}

Your Task:
1.  **Analyze Performance**: Identify the topics where the student's accuracy is lowest. These are their weak areas and should be prioritized.
2.  **Create a 7-Day Plan**: Generate a structured revision plan for the next seven days (Monday to Sunday).
3.  **Prioritize Weak Topics**: Assign the weakest topics to the earlier days of the week.
4.  **Ensure Variety**: Do not assign the same topic on consecutive days. Mix in some of the user's stronger topics later in the week to build confidence.
5.  **Include a Rest Day**: Designate one day (e.g., Sunday) as a rest day or for light review.
6.  **Provide Encouraging Reasons**: For each study day, provide a short, positive reason for focusing on that topic (e.g., "Let's build a strong foundation here," or "Time to solidify your understanding.").
7.  **Format the Output**: Return the plan as a JSON array of objects, with each object containing the day, the topic to study, and the reason.
`,
        });

        const {output} = await feedbackPrompt(input);
        return output!;
    }
);
