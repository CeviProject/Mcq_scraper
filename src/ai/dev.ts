'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/content-segregation.ts';
import '@/ai/flows/question-helpers.ts';
import '@/ai/flows/test-feedback.ts';
import '@/ai/flows/batch-question-solver.ts';
import '@/ai/flows/revision-planner.ts';
