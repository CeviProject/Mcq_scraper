'use server';

import { contentSegregation, ContentSegregationInput, ContentSegregationOutput } from '@/ai/flows/content-segregation';
import { getSolution, GetSolutionInput, GetSolutionOutput, getTricks, GetTricksInput, GetTricksOutput, askFollowUp, AskFollowUpInput, AskFollowUpOutput } from '@/ai/flows/question-helpers';
import { generateTestFeedback, GenerateTestFeedbackInput, GenerateTestFeedbackOutput } from '@/ai/flows/test-feedback';
import { batchSolveQuestions, BatchSolveInput, BatchSolveOutput } from '@/ai/flows/batch-question-solver';


export async function segregateContentAction(input: ContentSegregationInput): Promise<ContentSegregationOutput | { error: string }> {
  try {
    const result = await contentSegregation(input);
    return result;
  } catch (error) {
    console.error('Error during content segregation:', error);
    return { error: 'Failed to process PDF. Please try again.' };
  }
}

export async function getSolutionAction(input: GetSolutionInput): Promise<GetSolutionOutput | { error: string }> {
    try {
        const result = await getSolution(input);
        return result;
    } catch (error) {
        console.error('Error getting solution:', error);
        return { error: 'Failed to generate solution. Please try again.' };
    }
}

export async function getTricksAction(input: GetTricksInput): Promise<GetTricksOutput | { error: string }> {
    try {
        const result = await getTricks(input);
        return result;
    } catch (error) {
        console.error('Error getting tricks:', error);
        return { error: 'Failed to generate tricks. Please try again.' };
    }
}

export async function askFollowUpAction(input: AskFollowUpInput): Promise<AskFollowUpOutput | { error: string }> {
    try {
        const result = await askFollowUp(input);
        return result;
    } catch (error) {
        console.error('Error in follow-up conversation:', error);
        return { error: 'Failed to get an answer. Please try again.' };
    }
}

export async function generateTestFeedbackAction(input: GenerateTestFeedbackInput): Promise<GenerateTestFeedbackOutput | { error: string }> {
    try {
        const result = await generateTestFeedback(input);
        return result;
    } catch (error) {
        console.error('Error generating test feedback:', error);
        return { error: 'Failed to generate feedback. Please try again.' };
    }
}


export async function batchSolveQuestionsAction(input: BatchSolveInput): Promise<BatchSolveOutput | { error: string }> {
    try {
        const result = await batchSolveQuestions(input);
        return result;
    } catch (error) {
        console.error('Error batch solving questions:', error);
        return { error: 'Failed to generate solutions for the test. Please try again.' };
    }
}
