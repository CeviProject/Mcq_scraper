'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginForm() {
  const supabase = createClient();

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
                theme="dark"
            />
        </CardContent>
    </Card>
  );
}
