

import { createServerClient } from '@supabase/ssr'
import { type CookieOptions } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('[Auth Callback] Received request:', request.url);
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    console.log('[Auth Callback] Auth code found:', code);
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
                cookieStore.set({ name, value, ...options })
            } catch (error) {
                // This is a temporary workaround for a known bug in Next.js.
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
                cookieStore.set({ name, value: '', ...options })
            } catch (error) {
                // This is a temporary workaround for a known bug in Next.js.
            }
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      console.log('[Auth Callback] Successfully exchanged code for session. Redirecting to:', `${origin}${next}`);
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[Auth Callback] Error exchanging code for session:', error.message);
    return NextResponse.redirect(`${origin}/login?error=Could not authenticate user: ${error.message}`);
  }

  console.log('[Auth Callback] No auth code found. Redirecting to login with error.');
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user: No code provided.`);
}
