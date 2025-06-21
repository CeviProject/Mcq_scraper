
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  console.log(`[Middleware] Path: ${request.nextUrl.pathname}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  
  if (!supabaseUrl || supabaseUrl.includes('YOUR_SUPABASE_URL_HERE') || !supabaseAnonKey || supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY_HERE') || !baseUrl) {
    console.log('[Middleware] Supabase not configured. Bypassing auth.');
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log(`[Middleware] User: ${user ? user.id : 'Not authenticated'}`);

  // if user is signed in and the current path is /login, redirect the user to /
  if (user && request.nextUrl.pathname === '/login') {
    console.log('[Middleware] User is authenticated and on /login. Redirecting to /');
    return NextResponse.redirect(new URL('/', request.url))
  }

  // if user is not signed in and the current path is not /login, redirect the user to /login
  if (!user && request.nextUrl.pathname !== '/login') {
    console.log('[Middleware] User is not authenticated and not on /login. Redirecting to /login');
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  console.log('[Middleware] No redirect needed.');
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/callback (Supabase auth callback)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback).*)',
  ],
}
