
'use server';

import { contentSegregation, ContentSegregationInput } from '@/ai/flows/content-segregation';
import { getSolution, GetSolutionInput, GetSolutionOutput, getTricks, GetTricksInput, GetTricksOutput, askFollowUp, AskFollowUpInput, AskFollowUpOutput, getWrongAnswerExplanation, GetWrongAnswerExplanationInput, GetWrongAnswerExplanationOutput } from '@/ai/flows/question-helpers';
import { generateRevisionPlan, GenerateRevisionPlanInput, GenerateRevisionPlanOutput } from '@/ai/flows/revision-planner';
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
    
    // Ensure a profile exists for the user before proceeding.
    // This prevents foreign key constraint violations if a profile wasn't created on sign-up.
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: user.email?.split('@')[0] || `user-${user.id.substring(0, 6)}`,
        });
      
      if (profileError) {
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }
    }
    
    const segResult = await contentSegregation({ pdfDataUri: input.pdfDataUri });
    
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
            is_bookmarked: false,
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

        const { error: documentError } = await supabase
            .from('documents')
            .delete()
            .eq('id', documentId)
            .eq('user_id', user.id); 

        if (documentError) {
            throw new Error(`Failed to delete document: ${documentError.message}`);
        }

        return { success: true };

    } catch (error: any) {
        console.error('Error during document deletion:', error);
        return { error: error.message || 'Failed to delete document. Please try again.' };
    }
}

export async function renameDocumentAction({ documentId, newName }: { documentId: string; newName: string }): Promise<{ success: true } | { error: string }> {
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

        const { data: existing, error: existingError } = await supabase
            .from('documents')
            .select('id')
            .eq('user_id', user.id)
            .eq('source_file', newName)
            .neq('id', documentId) 
            .limit(1);

        if (existingError) {
             throw new Error(`Database error checking for existing name: ${existingError.message}`);
        }
        
        if (existing && existing.length > 0) {
            throw new Error(`A document with the name "${newName}" already exists.`);
        }

        const { error: updateError } = await supabase
            .from('documents')
            .update({ source_file: newName })
            .eq('id', documentId)
            .eq('user_id', user.id);
        
        if (updateError) {
            if (updateError.message.includes('violates row-level security policy')) {
                throw new Error("Database security error: You do not have permission to rename this document.");
            }
            throw new Error(`Failed to rename document: ${updateError.message}`);
        }

        return { success: true };

    } catch (error: any) {
        console.error('Error renaming document:', error);
        return { error: error.message || 'Failed to rename document.' };
    }
}


export async function getSolutionAction(input: GetSolutionInput): Promise<GetSolutionOutput | { error: string }> {
    try {
        const result = await getSolution(input);
        return result;
    } catch (error: any) {
        console.error('Error getting solution:', error);
        return { error: error.message || 'Failed to generate solution. Please try again.' };
    }
}

export async function getTricksAction(input: GetTricksInput): Promise<GetTricksOutput | { error: string }> {
    try {
        const result = await getTricks(input);
        return result;
    } catch (error: any) {
        console.error('Error getting tricks:', error);
        return { error: error.message || 'Failed to generate tricks. Please try again.' };
    }
}

export async function askFollowUpAction(input: AskFollowUpInput): Promise<AskFollowUpOutput | { error: string }> {
    try {
        const result = await askFollowUp(input);
        return result;
    } catch (error: any) {
        console.error('Error in follow-up conversation:', error);
        return { error: error.message || 'Failed to get an answer. Please try again.' };
    }
}

export async function generateTestFeedbackAction(input: GenerateTestFeedbackInput): Promise<GenerateTestFeedbackOutput | { error: string }> {
    try {
        const result = await generateTestFeedback(input);
        return result;
    } catch (error: any) {
        console.error('Error generating test feedback:', error);
        return { error: error.message || 'Failed to generate feedback. Please try again.' };
    }
}


export async function batchSolveQuestionsAction(
    input: BatchSolveInput
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

        const result = await batchSolveQuestions(input);

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

            if (!originalQuestions || originalQuestions.length === 0) {
                throw new Error("Could not find the original questions to update. They may have been deleted or you may not have permission to access them.");
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

export async function getTopicBenchmarkAction({ topic }: { topic: string }): Promise<{ benchmark: number } | { error: string }> {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: { get: (name: string) => cookieStore.get(name)?.value },
        }
    );

    try {
        const { data, error } = await supabase.rpc('get_topic_benchmark', { topic_text: topic }).single();

        if (error) {
            throw new Error(`Failed to fetch topic benchmark: ${error.message}`);
        }
        
        return { benchmark: data.global_accuracy || 0 };

    } catch (error: any) {
        console.error('Error getting topic benchmark:', error);
        return { error: error.message || 'Failed to get topic benchmark. Please try again.' };
    }
}


export async function getWrongAnswerExplanationAction(input: GetWrongAnswerExplanationInput): Promise<GetWrongAnswerExplanationOutput | { error: string }> {
    try {
        const result = await getWrongAnswerExplanation(input);
        return result;
    } catch (error: any) {
        console.error('Error getting wrong answer explanation:', error);
        return { error: error.message || 'Failed to generate explanation. Please try again.' };
    }
}


export async function generateRevisionPlanAction(): Promise<GenerateRevisionPlanOutput | { error: string }> {
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
            throw new Error("Authentication error.");
        }
        
        const { data: performanceData, error: rpcError } = await supabase.rpc('get_topic_performance');

        if (rpcError) {
            throw new Error(`Failed to fetch performance data: ${rpcError.message}`);
        }

        if (!performanceData || performanceData.length === 0) {
            return { error: "Not enough performance data to generate a plan. Please take more tests." };
        }

        const formattedPerformance = performanceData.map((d: any) => ({
            topic: d.topic,
            accuracy: d.accuracy,
        }));
        
        const result = await generateRevisionPlan({ performanceData: formattedPerformance });
        return result;

    } catch (error: any) {
        console.error('Error generating revision plan:', error);
        return { error: error.message || 'Failed to generate revision plan. Please try again.' };
    }
}
