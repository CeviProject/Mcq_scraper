
'use client'

import React from 'react';
import { eachDayOfInterval, format, startOfWeek, addDays, getMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ActivityCalendarProps {
  data: { date: string; count: number }[];
  title?: string;
}

const ActivityCalendar: React.FC<ActivityCalendarProps> = ({ data, title = "Activity" }) => {
  const today = new Date();
  const yearAgo = addDays(today, -364);
  const startDate = startOfWeek(yearAgo, { weekStartsOn: 1 });
  
  const dateCounts = new Map<string, number>();
  data.forEach(d => {
    const dateKey = format(new Date(d.date), 'yyyy-MM-dd');
    dateCounts.set(dateKey, (dateCounts.get(dateKey) || 0) + d.count);
  });
  
  const weeks: (Date | null)[][] = Array.from({ length: 53 }, () => Array(7).fill(null));

  eachDayOfInterval({ start: startDate, end: today }).forEach(day => {
    const weekIndex = Math.floor((day.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const dayIndex = day.getDay() === 0 ? 6 : day.getDay() - 1; // Monday as 0
    if (weekIndex >= 0 && weekIndex < 53) {
      weeks[weekIndex][dayIndex] = day;
    }
  });


  const getColor = (count: number) => {
    if (count === 0) return 'bg-secondary';
    if (count <= 1) return 'bg-green-200 dark:bg-green-900';
    if (count <= 3) return 'bg-green-400 dark:bg-green-700';
    if (count <= 5) return 'bg-green-600 dark:bg-green-500';
    return 'bg-green-800 dark:bg-green-400';
  };

  const monthLabels = weeks.reduce((acc, week, weekIndex) => {
      const firstDay = week.find(d => d);
      if (firstDay) {
        const month = getMonth(firstDay);
        if (!acc.some(m => m.month === month) && !acc.some(m => weekIndex - m.weekIndex < 5)) {
          acc.push({ month, label: format(firstDay, 'MMM'), weekIndex });
        }
      }
      return acc;
  }, [] as { month: number; label: string; weekIndex: number }[]);


  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <CardDescription>Your test activity over the last year.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto pb-4">
          <div className="inline-block relative">
            <div className="absolute top-0 flex" style={{ paddingLeft: '2.5rem', gap: '4px' }}>
                {weeks.map((week, weekIndex) => {
                    const firstDay = week.find(d => d);
                    const shouldShowLabel = firstDay && firstDay.getDate() <= 7 && monthLabels.find(m => m.weekIndex === weekIndex);
                    return (
                        <div key={weekIndex} className="w-2.5 text-xs text-muted-foreground -translate-x-1/2">
                            {shouldShowLabel ? shouldShowLabel.label : ''}
                        </div>
                    );
                })}
            </div>
            
            <div className="flex gap-4 pt-5">
              <div className="flex flex-col text-xs text-muted-foreground justify-between py-1 shrink-0 w-8 text-left">
                  <span>Mon</span>
                  <span>Wed</span>
                  <span>Fri</span>
              </div>
              <div className="flex gap-1">
                  {weeks.map((week, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      {week.map((day, j) => {
                        if (!day || day > today) return <div key={j} className="h-2.5 w-2.5 rounded-sm bg-secondary/60" />;
                        
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
            
             <div className="flex justify-end items-center gap-2 text-xs text-muted-foreground mt-4">
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
