'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface DayCompletionTrackerProps {
  plan: { day: string; topic: string; completed?: boolean }[];
  onToggleDay: (dayIndex: number) => void;
}

export default function DayCompletionTracker({ plan, onToggleDay }: DayCompletionTrackerProps) {
  return (
    <div className="flex items-center justify-center space-x-2 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg mb-4">
      {plan.map((day, index) => (
        <div key={day.day} className="flex flex-col items-center space-y-2">
            <span className="text-xs text-muted-foreground">{day.day.substring(0, 3)}</span>
            <button
                onClick={() => onToggleDay(index)}
                className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                day.completed
                    ? 'bg-green-500 border-green-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:border-sky-500'
                )}
            >
                {day.completed && <Check className="w-5 h-5" />}
            </button>
        </div>
      ))}
    </div>
  );
} 