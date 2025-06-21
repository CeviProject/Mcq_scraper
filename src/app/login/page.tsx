import LoginForm from '@/components/login-form';
import { BrainCircuit } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
        <div className="flex items-center gap-3 mb-8">
            <BrainCircuit className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Aptitude Ace</h1>
        </div>
        <div className="w-full max-w-sm">
            <LoginForm />
        </div>
    </main>
  );
}
