import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || supabaseUrl.includes('YOUR_SUPABASE_URL_HERE')) {
        throw new Error('Supabase URL is not configured. Please set NEXT_PUBLIC_SUPABASE_URL in your .env.local file.')
    }

    if (!supabaseAnonKey || supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY_HERE')) {
        throw new Error('Supabase Anon Key is not configured. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.')
    }
    
    return createBrowserClient(
        supabaseUrl,
        supabaseAnonKey
    )
}
