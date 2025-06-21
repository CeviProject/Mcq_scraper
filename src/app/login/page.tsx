'use client';

import LoginForm from '@/components/login-form';
import { BrainCircuit, Terminal } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import React from 'react';

// Next.js now wraps pages that use `useSearchParams` in a <Suspense> boundary automatically.
export default function LoginPage() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
            <div className="flex items-center gap-3 mb-8">
                <BrainCircuit className="h-10 w-10 text-primary" />
                <h1 className="text-4xl font-bold tracking-tight text-foreground">Aptitude Ace</h1>
            </div>
            <div className="w-full max-w-sm">
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Authentication Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                 {message && (
                    <Alert className="mb-4">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Info</AlertTitle>
                        <AlertDescription>{message}</AlertDescription>
                    </Alert>
                )}
                <LoginForm />
            </div>
        </main>
    );
}
