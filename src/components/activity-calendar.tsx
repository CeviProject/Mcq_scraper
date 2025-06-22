
'use client'

import React from 'react';
import { eachDayOfInterval, format, startOfWeek, addDays, getMonth, getDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ActivityCalendarProps {
  data: { date: string; count: number }[];
  title?: string;
}

const ActivityCalendar: React.FC<ActivityCalendarProps> = ({ data, title = "Activity" }) => {
  const today = new Date();
  // We go back 364 days (52 weeks) to ensure we get a full year of weeks
  const yearAgo = addDays(today, -364);
  const startDate = startOfWeek(yearAgo);
  
  const days = eachDayOfInterval({ start: startDate, end: today });

  const dateCounts = new Map<string, number>();
  data.forEach(d => {
    const dateKey = format(new Date(d.date), 'yyyy-MM-dd');
    dateCounts.set(dateKey, (dateCounts.get(dateKey) || 0) + d.count);
  });
  
  // Create a grid of 53 columns (for up to 53 weeks in a year)
  const weeks = Array.from({ length: 53 }, (_, weekIndex) => {
    return Array.from({ length: 7 }, (_, dayIndex) => {
        const d = addDays(startDate, weekIndex * 7 + dayIndex);
        return d <= today ? d : null;
    });
  });

  const getColor = (count: number) => {
    if (count === 0) return 'bg-secondary';
    if (count <= 1) return 'bg-green-200 dark:bg-green-900';
    if (count <= 3) return 'bg-green-400 dark:bg-green-700';
    if (count <= 5) return 'bg-green-600 dark:bg-green-500';
    return 'bg-green-800 dark:bg-green-400';
  };

  const monthLabels = weeks.reduce((acc, week, weekIndex) => {
      const firstDayOfMonth = week.find(day => day?.getDate() === 1);
      if (firstDayOfMonth) {
        const monthLabel = format(firstDayOfMonth, 'MMM');
        // Prevent labels from being too close
        const lastLabelWeek = acc.length > 0 ? acc[acc.length-1].weekIndex : -5;
        if(weekIndex > lastLabelWeek + 3){
            acc.push({ label: monthLabel, weekIndex });
        }
      }
      return acc;
  }, [] as { label: string; weekIndex: number }[]);


  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <CardDescription>Your test activity over the last year.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <div className="inline-flex flex-col gap-2">
            <div className="flex gap-3">
              <div className="flex flex-col w-6 text-xs text-muted-foreground justify-between pt-5">
                  <span className="h-2.5">Mon</span>
                  <span className="h-2.5">Wed</span>
                  <span className="h-2.5">Fri</span>
              </div>
              <div className="flex flex-col">
                 <div className="flex">
                    {monthLabels.map(({ label, weekIndex }) => (
                      <div 
                          key={weekIndex} 
                          className="text-xs text-muted-foreground" 
                          style={{
                              // A dot is 0.625rem (w-2.5) + gap is 0.25rem (gap-1) = 0.875rem per column
                              minWidth: `calc(4 * 0.875rem)`
                          }}
                      >
                          {label}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1 mt-1">
                      {weeks.map((week, i) => (
                        <div key={i} className="flex flex-col gap-1">
                          {week.map((day, j) => {
                            if (!day) return <div key={j} className="h-2.5 w-2.5 rounded-sm bg-secondary/60" />;
                            
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const count = dateCounts.get(dateKey) || 0;
                            return (
                              <Tooltip key={dateKey} delayDuration={100}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn('h-2.5 w-2.5 rounded-sm', getColor(count))}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{count} test{count !== 1 ? 's' : ''} on {format(day, 'MMM d, yyyy')}</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      ))}
                  </div>
              </div>
            </div>
            
             <div className="flex justify-end items-center gap-2 text-xs text-muted-foreground pr-1">
                <span>Less</span>
                <div className={cn("w-2.5 h-2.5 rounded-sm border", getColor(0))} />
                <div className={cn("w-2.5 h-2.5 rounded-sm", getColor(1))} />
                <div className={cn("w-2.5 h-2.5 rounded-sm", getColor(3))} />
                <div className={cn("w-2.5 h-2.5 rounded-sm", getColor(5))} />
                <div className={cn("w-2.5 h-2.5 rounded-sm", getColor(6))} />
                <span>More</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ActivityCalendar;
