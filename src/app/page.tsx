import AptitudeAceClient from '@/components/aptitude-ace-client';
import { Toaster } from "@/components/ui/toaster";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Session } from '@supabase/supabase-js';

export default async function Home() {
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
