'use client';

import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function LoginForm() {
    const [supabase, setSupabase] = React.useState<ReturnType<typeof createClient> | null>(null);
    const [configError, setConfigError] = React.useState<string | null>(null);

    React.useEffect(() => {
        try {
            setSupabase(createClient());
        } catch (e: any) {
            setConfigError(e.message);
        }
    }, []);

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
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Welcome</CardTitle>
                    <CardDescription>Loading...</CardDescription>
                </CardHeader>
            </Card>>
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
                                }
                            }
                        }
                    }}
                    providers={['google', 'github']}
                    redirectTo={`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/`}
                />
            </CardContent>
        </Card>
    );
}
