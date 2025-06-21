import AptitudeAceClient from '@/components/aptitude-ace-client';
import { Toaster } from "@/components/ui/toaster";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Session } from '@supabase/supabase-js';

export default async function Home() {
  const cookieStore = cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || supabaseUrl.includes('YOUR_SUPABASE_URL_HERE') || !supabaseAnonKey || supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY_HERE')) {
    return (
        <main className="flex h-screen w-full items-center justify-center p-6">
            <div className="w-full max-w-md rounded-lg border border-destructive bg-card p-6 text-center shadow-lg">
                <h1 className="text-xl font-bold text-destructive">Configuration Error</h1>
                <p className="mt-2 text-muted-foreground">
                    Your Supabase environment variables are not set. Please add your credentials to the <code>.env.local</code> file and restart the server.
                </p>
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
      const { data } = await supabase.from('profiles').select('username').single();
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
