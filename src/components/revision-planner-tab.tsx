'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarCheck, Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateRevisionPlanAction } from '@/app/actions';
import { RevisionPlan } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

interface RevisionPlannerTabProps {
    hasTakenTests: boolean;
}

export default function RevisionPlannerTab({ hasTakenTests }: RevisionPlannerTabProps) {
  const [revisionPlan, setRevisionPlan] = useState<RevisionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    setError(null);
    setRevisionPlan(null);

    const result = await generateRevisionPlanAction();
    if ('error' in result) {
        setError(result.error);
        toast({ variant: 'destructive', title: 'Error generating plan', description: result.error });
    } else {
        setRevisionPlan(result);
    }
    setIsLoading(false);
  };
  
  if (!hasTakenTests) {
    return (
      <Card className="flex flex-col items-center justify-center py-20 text-center">
        <CardHeader>
          <div className="mx-auto bg-secondary p-4 rounded-full">
            <CalendarCheck className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="mt-4">Unlock Your Personalized Revision Plan</CardTitle>
          <CardDescription>Take a few mock tests first. The AI will use your performance data to create a custom study schedule tailored to your weak spots.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart Revision Planner</CardTitle>
        <CardDescription>
          Let AI analyze your test history and generate a personalized weekly study schedule to help you focus on what matters most.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
            <Button onClick={handleGeneratePlan} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Your Plan...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate My Weekly Plan
                </>
              )}
            </Button>
        </div>
        
        {error && (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Could not generate plan</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        
        {revisionPlan && revisionPlan.plan && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                {revisionPlan.plan.map((dayPlan) => (
                    <Card key={dayPlan.day} className="flex flex-col">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">{dayPlan.day}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                           <p className="font-semibold text-primary">{dayPlan.topic}</p>
                           <p className="text-xs text-muted-foreground mt-1">{dayPlan.reason}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}

      </CardContent>
    </Card>
  );
}
