'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sun, Moon, LogOut, Loader2 } from "lucide-react";
import React, { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface SettingsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    theme: string;
    setTheme: (theme: 'light' | 'dark') => void;
    username: string;
    setUsername: (name: string) => void;
    supabase: SupabaseClient;
}

export default function SettingsSheet({ open, onOpenChange, theme, setTheme, username, setUsername, supabase }: SettingsSheetProps) {
    const [currentUsername, setCurrentUsername] = useState(username);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    React.useEffect(() => {
        setCurrentUsername(username);
    }, [username]);

    const handleSave = async () => {
        setIsSaving(true);
        const finalUsername = currentUsername.trim() === '' ? 'Guest' : currentUsername.trim();
        
        const { data: { user }} = await supabase.auth.getUser();
        if (!user) {
            toast({ variant: 'destructive', title: 'Not authenticated' });
            setIsSaving(false);
            return;
        }

        const { error } = await supabase.from('profiles').update({ username: finalUsername }).eq('id', user.id);
        
        if (error) {
            toast({ variant: 'destructive', title: 'Error saving settings', description: error.message });
        } else {
            setUsername(finalUsername);
            toast({ title: 'Settings saved!' });
            onOpenChange(false);
        }
        setIsSaving(false);
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh(); // This will re-trigger the middleware and redirect to /login
    }
    
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Settings</SheetTitle>
                    <SheetDescription>
                        Customize your Aptitude Ace experience.
                    </SheetDescription>
                </SheetHeader>
                <div className="grid gap-6 py-6">
                    <div className="grid gap-3">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            value={currentUsername}
                            onChange={(e) => setCurrentUsername(e.target.value)}
                            className="col-span-2 h-8"
                        />
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="api-key">Gemini API Key</Label>
                        <Input
                            id="api-key"
                            type="password"
                            placeholder="Set in .env.local"
                            readOnly
                            className="col-span-2 h-8"
                        />
                        <p className="text-xs text-muted-foreground col-span-2">
                            For security, your API key must be set in the <code>.env.local</code> file. This field is for display only. Restart the server after changing the key.
                        </p>
                    </div>
                    <div className="grid gap-3">
                        <Label>Theme</Label>
                        <RadioGroup defaultValue={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark')} className="flex items-center space-x-2">
                             <Label htmlFor="theme-light" className="flex items-center gap-2 border rounded-md p-2 px-3 cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary">
                                <Sun className="h-4 w-4" />
                                Light
                                <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                            </Label>
                            <Label htmlFor="theme-dark" className="flex items-center gap-2 border rounded-md p-2 px-3 cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary">
                                <Moon className="h-4 w-4" />
                                Dark
                                <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                            </Label>
                        </RadioGroup>
                    </div>
                </div>
                <SheetFooter className="flex-col space-y-2 sm:flex-col sm:space-y-2">
                    <Button type="submit" onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save changes
                    </Button>
                    <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
