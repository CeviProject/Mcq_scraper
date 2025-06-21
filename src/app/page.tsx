import AptitudeAceClient from '@/components/aptitude-ace-client';
import { Toaster } from "@/components/ui/toaster";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Session } from '@supabase/supabase-js';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default async function Home() {
  const cookieStore = cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes('YOUR_SUPABASE_URL_HERE') && supabaseAnonKey && !supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY_HERE');
  const isBaseUrlConfigured = baseUrl && baseUrl.startsWith('http');

  if (!isSupabaseConfigured || !isBaseUrlConfigured) {
    return (
        <main className="flex h-screen w-full items-center justify-center p-6">
            <div className="w-full max-w-2xl">
              <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Configuration Error</AlertTitle>
                  <AlertDescription>
                      <p className="mb-4">Your application is not configured correctly. Please update the following variables in your <code>.env.local</code> file and restart the server:</p>
                      <ul className="list-disc space-y-2 pl-6 font-mono text-xs">
                          {!isSupabaseConfigured && (
                            <>
                              <li><code>NEXT_PUBLIC_SUPABASE_URL</code></li>
                              <li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
                            </>
                          )}
                          {!isBaseUrlConfigured && (
                            <li><code>NEXT_PUBLIC_BASE_URL</code> (must be a valid URL, e.g., http://localhost:9002)</li>
                          )}
                      </ul>
                  </AlertDescription>
              </Alert>
            </div>
        </main>
    )
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  );

  const { data: { session }} = await supabase.auth.getSession();
  
  let profile = null;
  if (session) {
      const { data } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
      profile = data;
  }

  return (
    <>
      <main>
        <AptitudeAceClient session={session} profile={profile} />
      </main>
      <Toaster />
    </>
  );
}
