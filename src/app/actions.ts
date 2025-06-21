'use server';

import { contentSegregation, ContentSegregationInput, ContentSegregationOutput } from '@/ai/flows/content-segregation';
import { getSolution, GetSolutionInput, GetSolutionOutput, getTricks, GetTricksInput, GetTricksOutput, askFollowUp, AskFollowUpInput, AskFollowUpOutput } from '@/ai/flows/question-helpers';

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
