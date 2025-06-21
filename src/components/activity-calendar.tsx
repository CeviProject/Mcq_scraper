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
  
  const days = eachDayOfInterval({ start: startDate, end: today });
  
  const weeks: (Date | null)[][] = Array.from({ length: 53 }, () => Array(7).fill(null));

  days.forEach(day => {
    const weekIndex = Math.floor((day.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const dayIndex = day.getDay() === 0 ? 6 : day.getDay() - 1; // Monday as 0
    if (weekIndex >= 0 && weekIndex < 53) {
      weeks[weekIndex][dayIndex] = day;
    }
  });


  const getColor = (count: number) => {
    if (count === 0) return 'bg-muted/50';
    if (count <= 1) return 'bg-primary/20';
    if (count <= 3) return 'bg-primary/40';
    if (count <= 5) return 'bg-primary/70';
    return 'bg-primary';
  };

  const monthLabels = weeks.reduce((acc, week, weekIndex) => {
      const firstDay = week.find(d => d);
      if (firstDay) {
        const month = getMonth(firstDay);
        if (!acc.some(m => m.month === month)) {
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
          <div className="inline-block relative" style={{ paddingLeft: '24px' }}>
            <div className="flex" style={{ marginLeft: '-2px' }}>
              {monthLabels.map(({ label, weekIndex }) => (
                  <div key={label} className="text-xs text-muted-foreground absolute" style={{ left: `${24 + weekIndex * 14}px`, top: '-1.25rem' }}>
                      {label}
                  </div>
              ))}
            </div>
            <div className="flex">
              <div className="flex flex-col gap-1 pr-2 text-xs text-muted-foreground text-right" style={{marginTop: '2px'}}>
                  <div className="h-2.5">Mon</div>
                  <div className="h-2.5" style={{marginTop: '4px'}}>Wed</div>
                  <div className="h-2.5" style={{marginTop: '4px'}}>Fri</div>
              </div>
              <div className="flex gap-1">
                  {weeks.map((week, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      {week.map((day, j) => {
                        if (!day || day > today) return <div key={j} className="h-2.5 w-2.5 rounded-sm bg-transparent" />;
                        
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
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ActivityCalendar;
