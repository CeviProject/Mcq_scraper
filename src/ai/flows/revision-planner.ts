
'use server';
/**
 * @fileOverview Generates a personalized revision plan based on user's test performance.
 *
 * - generateRevisionPlan - A function that creates a study schedule.
 * - GenerateRevisionPlanInput - The input type for the function.
 * - GenerateRevisionPlanOutput - The return type for the function.
 */

import { defineFlow, ai } from '@/ai/genkit';
import {z} from 'genkit';


const TopicPerformanceSchema = z.object({
    topic: z.string(),
    accuracy: z.number().describe("The user's accuracy for this topic, as a percentage (0-100)."),
});

const GenerateRevisionPlanInputSchema = z.object({
  performanceData: z.array(TopicPerformanceSchema).describe("An array of the user's performance per topic."),
});
export type GenerateRevisionPlanInput = z.infer<typeof GenerateRevisionPlanInputSchema>;


const RevisionDaySchema = z.object({
    day: z.string().describe("The day of the week (e.g., 'Monday')."),
    topic: z.string().describe("The topic to focus on for that day. This MUST be one of the topics from the input performance data, or 'Rest Day'."),
    reason: z.string().describe("A brief, encouraging reason why this topic was chosen for this day."),
});

const GenerateRevisionPlanOutputSchema = z.object({
    plan: z.array(RevisionDaySchema).describe("A 7-day revision plan. Prioritize the user's weakest topics. Include a mix of topics and at least one rest day."),
});
export type GenerateRevisionPlanOutput = z.infer<typeof GenerateRevisionPlanOutputSchema>;


export async function generateRevisionPlan(input: GenerateRevisionPlanInput): Promise<GenerateRevisionPlanOutput> {
  return generateRevisionPlanFlow(input);
}


const generateRevisionPlanFlow = defineFlow(
    {
        name: 'generateRevisionPlanFlow',
        inputSchema: GenerateRevisionPlanInputSchema,
        outputSchema: GenerateRevisionPlanOutputSchema,
    },
    async (input) => {
        const revisionPlannerPrompt = ai.definePrompt({
            name: 'generateRevisionPlanPrompt',
            input: {schema: GenerateRevisionPlanInputSchema},
            output: {schema: GenerateRevisionPlanOutputSchema},
            prompt: `You are an expert academic coach creating a personalized 7-day revision schedule for a student preparing for aptitude tests.
The student's performance data, showing their accuracy on different topics, is provided below.

Performance Data (Topic, Accuracy %):
{{{json performanceData}}}

Your Task:
1.  **Analyze Performance**: Identify the topics where the student's accuracy is lowest. These are their weak areas and should be prioritized.
2.  **Create a 7-Day Plan**: Generate a structured revision plan for the next seven days (Monday to Sunday).
3.  **Use Provided Topics**: For each study day, the 'topic' field in your response MUST BE one of the topics from the provided Performance Data. Do not invent new topics.
4.  **Prioritize Weak Topics**: Assign the weakest topics (lowest accuracy) to the earlier days of the week.
5.  **Ensure Variety**: Do not assign the same topic on consecutive days. Mix in some of the user's stronger topics later in the week to build confidence.
6.  **Include a Rest Day**: Designate one day (e.g., Sunday) as a rest day. For this day, set the 'topic' field to "Rest Day".
7.  **Provide Encouraging Reasons**: For each study day, provide a short, positive reason for focusing on that topic (e.g., "Let's build a strong foundation here," or "Time to solidify your understanding.").
8.  **Format the Output**: Return the plan as a JSON array of objects, with each object containing the day, the topic to study, and the reason.
`,
        });

        const {output} = await revisionPlannerPrompt(input);
        return output!;
    }
);
