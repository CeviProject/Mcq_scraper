'use server';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This instance is now primarily for defining flows.
// The API key from .env.local will be used as a fallback if the user hasn't provided their own.
export const ai = genkit({
  plugins: [googleAI({apiKey: process.env.GOOGLE_API_KEY})],
  model: 'googleai/gemini-1.5-pro-latest',
});
