
'use client';

import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

// Create client once outside the component.
// This can throw if env vars are missing, so we'll handle it.
let supabase: SupabaseClient | null = null;
let configError: string | null = null;
try {
  supabase = createClient();
} catch (e: any) {
  configError = e.message;
}

export default function LoginForm() {

    if (configError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Configuration Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Action Required</AlertTitle>
                        <AlertDescription>
                            <p className="font-mono text-xs mb-2">{configError}</p>
                            <p>Please update your <code>.env.local</code> file with your Supabase credentials.</p>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        )
    }

    if (!supabase) {
        // This case should ideally not be reached if configError is handled,
        // but it's a good fallback.
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Welcome</CardTitle>
                    <CardDescription>Loading...</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Welcome</CardTitle>
                <CardDescription>Sign in or create an account to continue</CardDescription>
            </CardHeader>
            <CardContent>
                <Auth
                    supabaseClient={supabase}
                    appearance={{
                        theme: ThemeSupa,
                        variables: {
                            default: {
                                colors: {
                                    brand: 'hsl(var(--primary))',
                                    brandAccent: 'hsl(var(--primary) / 0.8)',
                                    defaultButtonBackground: 'hsl(var(--card))',
                                    defaultButtonBackgroundHover: 'hsl(var(--muted))',
                                    anchorTextColor: 'hsl(var(--foreground))',
                                    anchorTextHoverColor: 'hsl(var(--primary))',
                                    inputBackground: 'hsl(var(--input))',
                                    inputBorder: 'hsl(var(--border))',
                                    inputBorderHover: 'hsl(var(--ring))',
                                    inputBorderFocus: 'hsl(var(--ring))',
                                    inputText: 'hsl(var(--foreground))',
                                    messageText: 'hsl(var(--muted-foreground))',
                                    dividerBackground: 'hsl(var(--border))',
                                },
                                radii: {
                                    borderRadiusButton: 'var(--radius)',
                                    buttonBorderRadius: 'var(--radius)',
                                    inputBorderRadius: 'var(--radius)',
                                }
                            }
                        }
                    }}
                    providers={['google', 'github']}
                />
            </CardContent>
        </Card>
    );
}
