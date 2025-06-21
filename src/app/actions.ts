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
    
    const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({ user_id: user.id, source_file: input.fileName, theory: segResult.theory })
        .select()
        .single();
    
    if (docError) {
      throw new Error(`Failed to save document: ${docError.message}`);
    }
    
    let newQuestionsData: Question[] = [];
    if (segResult.questions && segResult.questions.length > 0) {
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
    }
    
    return { document: docData as Document, questions: newQuestionsData };

  } catch (error: any) {
    console.error('Error during content segregation:', error);
    return { error: error.message || 'Failed to process PDF. Please try again.' };
  }
}

export async function deleteDocumentAction({ documentId }: { documentId: string }): Promise<{ success: true } | { error: string }> {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: { get: (name: string) => cookieStore.get(name)?.value },
        }
    );

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("Authentication error: You must be logged in to delete documents.");
        }

        // With ON DELETE CASCADE enabled in the database, we only need to delete the parent document.
        // The database will automatically handle deleting all associated questions and test attempts.
        const { error: documentError } = await supabase
            .from('documents')
            .delete()
            .eq('id', documentId)
            .eq('user_id', user.id); // RLS is also in effect, but this adds an explicit check.

        if (documentError) {
            throw new Error(`Failed to delete document: ${documentError.message}`);
        }

        return { success: true };

    } catch (error: any) {
        console.error('Error during document deletion:', error);
        return { error: error.message || 'Failed to delete document. Please try again.' };
    }
}

export async function renameDocumentAction({ documentId, newName }: { documentId: string; newName: string }): Promise<{ updatedDocument: Document } | { error: string }> {
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
            throw new Error("Authentication error.");
        }

        const { data: updatedDoc, error } = await supabase
            .from('documents')
            .update({ source_file: newName })
            .eq('id', documentId)
            .eq('user_id', user.id)
            .select()
            .single();
        
        if (error) {
            throw new Error(`Failed to rename document: ${error.message}`);
        }
        
        return { updatedDocument: updatedDoc as Document };

    } catch (error: any) {
        console.error('Error renaming document:', error);
        return { error: error.message || 'Failed to rename document.' };
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


export async function batchSolveQuestionsAction(
    input: Omit<BatchSolveInput, 'apiKey'>
): Promise<BatchSolveOutput | { error: string }> {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: { get: (name: string) => cookieStore.get(name)?.value },
        }
    );

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("Authentication error: You must be logged in.");
        }

        const apiKey = await getApiKey();
        const result = await batchSolveQuestions({ ...input, apiKey });

        if (result.solvedQuestions && result.solvedQuestions.length > 0) {
            
            const solvedQuestionMap = new Map(result.solvedQuestions.map(sq => [sq.id, sq]));
            const questionIds = Array.from(solvedQuestionMap.keys());
            
            const { data: originalQuestions, error: fetchError } = await supabase
                .from('questions')
                .select('*')
                .in('id', questionIds)
                .eq('user_id', user.id);

            if (fetchError) {
                throw new Error(`Failed to fetch original questions for update: ${fetchError.message}`);
            }

            const updates = originalQuestions.map(originalQ => {
                const solvedData = solvedQuestionMap.get(originalQ.id);
                if (!solvedData) return null;
                return {
                    ...originalQ,
                    solution: solvedData.solution,
                    correct_option: solvedData.correctOption,
                    difficulty: solvedData.difficulty,
                };
            }).filter(Boolean);


            const { error: updateError } = await supabase.from('questions').upsert(updates as Question[], {
                onConflict: 'id',
                ignoreDuplicates: false, 
            });

            if (updateError) {
                if (updateError.message.includes('violates row-level security policy')) {
                     throw new Error("Database security error: You do not have permission to update these questions.");
                }
                throw updateError;
            }
        }
        
        return result;
    } catch (error: any) {
        console.error('Error batch solving questions:', error);
        return { error: error.message || 'Failed to generate solutions for the test. Please try again.' };
    }
}
