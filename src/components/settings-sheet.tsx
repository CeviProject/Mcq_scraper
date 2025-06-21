'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sun, Moon, LogOut, Loader2, KeyRound } from "lucide-react";
import React, { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Profile } from "@/lib/types";

interface SettingsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    theme: string;
    onThemeChange: (theme: 'light' | 'dark') => void;
    profile: Profile | null;
    onProfileUpdate: (profile: Profile) => void;
    supabase: SupabaseClient;
}

export default function SettingsSheet({ open, onOpenChange, theme, onThemeChange, profile, onProfileUpdate, supabase }: SettingsSheetProps) {
    const [currentUsername, setCurrentUsername] = useState(profile?.username || '');
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    React.useEffect(() => {
        if (profile) {
            setCurrentUsername(profile.username);
        }
    }, [profile]);

    const handleSave = async () => {
        if (!profile) return;
        setIsSaving(true);
        const finalUsername = currentUsername.trim() === '' ? 'Guest' : currentUsername.trim();
        
        const updateData: Partial<Profile> = {
            username: finalUsername,
        };

        if (apiKey.trim() !== '') {
            updateData.gemini_api_key = apiKey.trim();
        }
        
        const { error } = await supabase.from('profiles').update(updateData).eq('id', profile.id);
        
        if (error) {
            toast({ variant: 'destructive', title: 'Error saving settings', description: error.message });
        } else {
            const updatedProfile = { ...profile, ...updateData };
            onProfileUpdate(updatedProfile);
            setApiKey(''); // Clear the input field after saving
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
                        <Label htmlFor="api-key" className="flex items-center gap-2">
                           <KeyRound className="w-4 h-4" /> Your Gemini API Key
                        </Label>
                        <Input
                            id="api-key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={profile?.gemini_api_key ? '••••••••••••••••••••••' : 'Enter your API key'}
                            className="col-span-2 h-8"
                        />
                        <p className="text-xs text-muted-foreground col-span-2">
                            Your key is stored securely in the database. The app will use your key for all AI features. If left blank, it will use the developer's key (if available).
                        </p>
                    </div>
                    <div className="grid gap-3">
                        <Label>Theme</Label>
                        <RadioGroup defaultValue={theme} onValueChange={(value) => onThemeChange(value as 'light' | 'dark')} className="flex items-center space-x-2">
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
