
import {genkit, Flow} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export let ai: Flow<any, any>;

if (!process.env.GOOGLE_API_KEY) {
  console.warn(`GOOGLE_API_KEY is not set. Using a placeholder flow that will throw an error. 
    If you are running this locally, you can set this in your .env or .env.local file.
    If you are running this in the cloud, you can set this in your environment variables.`);

  ai = genkit({
    plugins: [],
  });
  
  // Define a placeholder flow that throws an error when called.
  // This is to prevent the app from crashing when the API key is not set.
  ai.defineFlow({ name: 'placeholderFlow' }, async () => {
    throw new Error('GOOGLE_API_KEY is not set. Please set it in your environment.');
  });
  
} else {
  ai = genkit({
    plugins: [googleAI({apiKey: process.env.GOOGLE_API_KEY})],
  });
}
