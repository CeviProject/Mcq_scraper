'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sun, Moon } from "lucide-react";
import React, { useState } from "react";

interface SettingsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    theme: string;
    setTheme: (theme: 'light' | 'dark') => void;
    username: string;
    setUsername: (name: string) => void;
}

export default function SettingsSheet({ open, onOpenChange, theme, setTheme, username, setUsername }: SettingsSheetProps) {
    const [currentUsername, setCurrentUsername] = useState(username);

    React.useEffect(() => {
        setCurrentUsername(username);
    }, [username]);

    const handleSave = () => {
        setUsername(currentUsername);
        onOpenChange(false);
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
                <SheetFooter>
                    <Button type="submit" onClick={handleSave}>Save changes</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
