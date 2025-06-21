'use server';

import { contentSegregation, ContentSegregationInput, ContentSegregationOutput } from '@/ai/flows/content-segregation';

export async function segregateContentAction(input: ContentSegregationInput): Promise<ContentSegregationOutput | { error: string }> {
  try {
    const result = await contentSegregation(input);
    return result;
  } catch (error) {
    console.error('Error during content segregation:', error);
    return { error: 'Failed to process PDF. Please try again.' };
  }
}
