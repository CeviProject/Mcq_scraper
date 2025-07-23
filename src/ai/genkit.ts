
import {genkit, Flow} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {createClient} from '@/lib/supabase/server';

export const ai = genkit({
  plugins: [],
});

const defaultGoogleAI = process.env.GOOGLE_API_KEY
  ? googleAI({apiKey: process.env.GOOGLE_API_KEY})
  : null;

// This function dynamically gets the user's API key or falls back to the default.
async function getGoogleAIPluginForUser() {
  const supabase = createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (user) {
    const {data: profile} = await supabase
      .from('profiles')
      .select('gemini_api_key')
      .eq('id', user.id)
      .single();

    if (profile?.gemini_api_key) {
      return googleAI({apiKey: profile.gemini_api_key});
    }
  }

  if (defaultGoogleAI) {
    return defaultGoogleAI;
  }

  throw new Error(
    'No Gemini API key found. Please provide one in your settings or configure a global key.'
  );
}

// Define a placeholder flow that throws an error if no API key is set.
// This is to prevent the app from crashing.
ai.defineFlow({name: 'placeholderFlow'}, async () => {
  throw new Error(
    'No Gemini API key available. Please add one in the settings menu.'
  );
});

// Helper function to create a flow that uses the dynamic API key.
// All flows should use this wrapper.
export function defineFlow<
  I extends z.ZodTypeAny,
  O extends z.ZodTypeAny,
>(
  config: Omit<Flow<I, O>['config'], 'name'> & { name: string },
  handler: (input: z.infer<I>) => Promise<z.infer<O>>
): Flow<I, O> {
  return ai.defineFlow(
    config,
    async (input) => {
      // Dynamically get the plugin (and thus the API key) for the current user.
      const googleAIPlugin = await getGoogleAIPluginForUser();
      
      // We create a temporary Genkit instance with the user-specific plugin.
      // This ensures that the `generate` call within the handler uses the correct key.
      const userAi = genkit({
        plugins: [googleAIPlugin],
      });
      
      // Temporarily replace the global `ai` instance for the scope of this handler.
      // This is a workaround to allow existing `generate` calls to use the user-specific instance.
      const originalAi = (globalThis as any).ai;
      (globalThis as any).ai = userAi;
      
      try {
        const result = await handler(input);
        return result;
      } finally {
        // Restore the original global `ai` instance.
        (globalThis as any).ai = originalAi;
      }
    }
  );
}
