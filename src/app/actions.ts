'use server';

import { contentSegregation, ContentSegregationInput } from '@/ai/flows/content-segregation';
import { getSolution, GetSolutionInput, GetSolutionOutput, getTricks, GetTricksInput, GetTricksOutput, askFollowUp, AskFollowUpInput, AskFollowUpOutput } from '@/ai/flows/question-helpers';
import { generateTestFeedback, GenerateTestFeedbackInput, GenerateTestFeedbackOutput } from '@/ai/flows/test-feedback';
import { batchSolveQuestions, BatchSolveInput, BatchSolveOutput } from '@/ai/flows/batch-question-solver';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Document, Question } from '@/lib/types';

async function getApiKey(): Promise<string | undefined> {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return undefined;
    }

    const { data: profile } = await supabase.from('profiles').select('gemini_api_key').eq('id', user.id).single();
    
    // Returns user's key if available, otherwise undefined (which will cause fallback to developer key in .env.local)
    return profile?.gemini_api_key || undefined;
}


export async function segregateContentAction(input: Omit<ContentSegregationInput, 'apiKey'> & { fileName: string }): Promise<{ document: Document, questions: Question[] } | { error: string }> {
  const cookieStore = cookies();
  const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
          cookies: {
              get(name: string) {
                  return cookieStore.get(name)?.value
              },
          },
      }
  );

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Authentication error: You must be logged in to upload documents.");
    }

    const apiKey = await getApiKey(); 
    
    const segResult = await contentSegregation({ pdfDataUri: input.pdfDataUri, apiKey });
    
    // Save document to DB
    const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({ user_id: user.id, source_file: input.fileName, theory: segResult.theory })
        .select()
        .single();
    
    if (docError) {
      throw new Error(`Failed to save document: ${docError.message}`);
    }
    
    let newQuestionsData: Question[] = [];
    const questionsToInsert = segResult.questions
      .filter(q => q.questionText && q.questionText.length > 5)
      .map(q => ({
        document_id: docData.id,
        user_id: user.id,
        text: q.questionText,
        options: q.options,
        topic: q.topic || 'Uncategorized',
      }));

    if (questionsToInsert.length > 0) {
        const { data: insertedQuestions, error: qError } = await supabase.from('questions').insert(questionsToInsert).select();
        if (qError) {
          await supabase.from('documents').delete().eq('id', docData.id);
          throw new Error(`Failed to save questions: ${qError.message}`);
        }
        newQuestionsData = insertedQuestions as Question[];
    }
    
    return { document: docData as Document, questions: newQuestionsData };

  } catch (error: any) {
    console.error('Error during content segregation:', error);
    return { error: error.message || 'Failed to process PDF. Please try again.' };
  }
}

export async function getSolutionAction(input: Omit<GetSolutionInput, 'apiKey'>): Promise<GetSolutionOutput | { error: string }> {
    try {
        const apiKey = await getApiKey();
        const result = await getSolution({ ...input, apiKey });
        return result;
    } catch (error: any) {
        console.error('Error getting solution:', error);
        return { error: error.message || 'Failed to generate solution. Please try again.' };
    }
}

export async function getTricksAction(input: Omit<GetTricksInput, 'apiKey'>): Promise<GetTricksOutput | { error: string }> {
    try {
        const apiKey = await getApiKey();
        const result = await getTricks({ ...input, apiKey });
        return result;
    } catch (error: any) {
        console.error('Error getting tricks:', error);
        return { error: error.message || 'Failed to generate tricks. Please try again.' };
    }
}

export async function askFollowUpAction(input: Omit<AskFollowUpInput, 'apiKey'>): Promise<AskFollowUpOutput | { error: string }> {
    try {
        const apiKey = await getApiKey();
        const result = await askFollowUp({ ...input, apiKey });
        return result;
    } catch (error: any) {
        console.error('Error in follow-up conversation:', error);
        return { error: error.message || 'Failed to get an answer. Please try again.' };
    }
}

export async function generateTestFeedbackAction(input: Omit<GenerateTestFeedbackInput, 'apiKey'>): Promise<GenerateTestFeedbackOutput | { error: string }> {
    try {
        const apiKey = await getApiKey();
        const result = await generateTestFeedback({ ...input, apiKey });
        return result;
    } catch (error: any) {
        console.error('Error generating test feedback:', error);
        return { error: error.message || 'Failed to generate feedback. Please try again.' };
    }
}


export async function batchSolveQuestionsAction(input: Omit<BatchSolveInput, 'apiKey'>): Promise<BatchSolveOutput | { error: string }> {
    try {
        const apiKey = await getApiKey();
        const result = await batchSolveQuestions({ ...input, apiKey });
        return result;
    } catch (error: any) {
        console.error('Error batch solving questions:', error);
        return { error: error.message || 'Failed to generate solutions for the test. Please try again.' };
    }
}
