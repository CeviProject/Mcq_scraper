
'use client'

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { File, HelpCircle, Info, List, Trophy } from 'lucide-react';
import Image from 'next/image';
import { Test } from '@/lib/types';
import ActivityCalendar from './activity-calendar';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { createClient } from '@/lib/supabase';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import { LineChart, Line, PieChart, Pie, Cell as PieCell, RadialBarChart, RadialBar } from 'recharts';
import { Tooltip as RechartsTooltip } from 'recharts';


interface DashboardTabProps {
  sourceFiles: string[];
  questionCount: number;
  testHistory: Test[];
}

export default function DashboardTab({ sourceFiles, questionCount, testHistory }: DashboardTabProps) {
  const supabase = createClient();
  const [topicPerformance, setTopicPerformance] = React.useState<{name: string, Accuracy: number}[]>([]);

  React.useEffect(() => {
    const fetchPerformance = async () => {
        if (testHistory.length === 0) return;

        const { data, error } = await supabase.rpc('get_topic_performance');

        if (error) {
            console.error("Error fetching topic performance", error);
            return;
        }

        const formattedData = data.map((d: any) => ({
            name: d.topic,
            Accuracy: d.accuracy
        })).sort((a: any, b: any) => b.Accuracy - a.Accuracy);
        
        setTopicPerformance(formattedData);
    };
    
    fetchPerformance();
  }, [testHistory, supabase]);

  const analyticsData = useMemo(() => {
    if (testHistory.length === 0) {
      return {
        totalTests: 0,
        avgScore: 0,
        activityData: [],
      };
    }

    let totalCorrect = 0;
    let totalAnswered = 0;
    const activityMap = new Map<string, number>();

    testHistory.forEach(test => {
      totalCorrect += test.score;
      totalAnswered += test.total;
      const dateKey = format(new Date(test.created_at), 'yyyy-MM-dd');
      activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1);
    });

    const activityData = Array.from(activityMap.entries()).map(([date, count]) => ({ date, count }));

    return {
      totalTests: testHistory.length,
      avgScore: totalAnswered > 0 ? parseFloat(((totalCorrect / totalAnswered) * 100).toFixed(1)) : 0,
      activityData,
    };
  }, [testHistory]);

  // Modern color palette
  const MODERN_COLORS = ['#6366F1', '#06B6D4', '#F59E42', '#F43F5E', '#10B981', '#A21CAF'];
  const GLASS_CARD = 'bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/30 dark:border-zinc-800/40 shadow-2xl';

  // Score trend data for line chart
  const scoreTrend = testHistory.slice(-10).map(test => ({
    date: format(new Date(test.created_at), 'MMM d'),
    score: Math.round((test.score / test.total) * 100),
  }));

  // Topic distribution for pie chart
  const topicCounts = testHistory.reduce((acc, test) => {
    (test.topics || []).forEach(topic => {
      acc[topic] = (acc[topic] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  const topicDist = Object.entries(topicCounts).map(([name, value]) => ({ name, value }));

  // Completion stats for radial progress
  const completion = testHistory.length > 0 ? Math.round((testHistory.filter(t => t.score / t.total >= 0.7).length / testHistory.length) * 100) : 0;

  return (
    <div className="grid gap-8 bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#e0e7ef] dark:from-[#18181b] dark:via-[#23272f] dark:to-[#23272f] rounded-xl p-4 md:p-8 min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Cards with glassmorphism and transitions */}
        {[
          {
            title: 'Uploaded PDFs',
            value: sourceFiles.length,
            icon: <File className="h-5 w-5 text-indigo-500" />,
            content: sourceFiles.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="link" className="p-0 h-auto text-xs text-muted-foreground -mt-1">View files</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Uploaded Files</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {sourceFiles.map((file) => (
                    <DropdownMenuItem key={file} className="truncate">{file}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
          {
            title: 'Question Pool',
            value: questionCount,
            icon: <HelpCircle className="h-5 w-5 text-cyan-500" />,
            content: <p className="text-xs text-muted-foreground">Total questions available</p>,
          },
          {
            title: 'Tests Taken',
            value: analyticsData.totalTests,
            icon: <List className="h-5 w-5 text-orange-400" />,
            content: <p className="text-xs text-muted-foreground">Total mock tests completed</p>,
          },
          {
            title: 'Avg. Score',
            value: analyticsData.avgScore + '%',
            icon: <Trophy className="h-5 w-5 text-pink-500" />,
            content: <p className="text-xs text-muted-foreground">Across all tests</p>,
          },
        ].map((card, idx) => (
          <Card key={card.title} className={`${GLASS_CARD} transition-all hover:scale-[1.03] active:scale-100 duration-300`}> 
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight mb-1 animate-fade-in-up">{card.value}</div>
              {card.content}
            </CardContent>
          </Card>
        ))}
      </div>
      {testHistory.length > 0 ? (
        <div className="space-y-8">
          {/* Move the activity calendar to its own full-width row above the analytics cards */}
          <div className="w-full mb-8">
            <div className={`${GLASS_CARD} p-4 flex flex-col items-center justify-center w-full min-h-[180px] overflow-x-auto`} style={{zIndex:1}}>
              <ActivityCalendar data={analyticsData.activityData} title="Test Activity" />
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Score Trend Line Chart */}
            <Card className={`${GLASS_CARD} p-4 flex flex-col items-center justify-center`}> 
              <CardHeader>
                <CardTitle className="text-base font-semibold">Score Trend</CardTitle>
                <CardDescription>Your last 10 test scores</CardDescription>
              </CardHeader>
              <CardContent className="h-[220px] w-full flex items-center justify-center">
                <LineChart width={320} height={180} data={scoreTrend} className="w-full">
                  <Line type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={3} dot={{ r: 5, fill: '#06B6D4', stroke: '#fff', strokeWidth: 2 }} isAnimationActive animationDuration={900} />
                  <RechartsTooltip contentStyle={{background: 'rgba(30,41,59,0.95)', color: '#fff', borderRadius: 8, border: '1px solid #334155'}} labelStyle={{color:'#a5b4fc'}} itemStyle={{color:'#fff'}} />
                </LineChart>
              </CardContent>
            </Card>
            {/* Completion Radial Progress */}
            <Card className={`${GLASS_CARD} p-4 flex flex-col items-center justify-center`}> 
              <CardHeader>
                <CardTitle className="text-base font-semibold">High Score Completion</CardTitle>
                <CardDescription>Tests with ≥70% score</CardDescription>
              </CardHeader>
              <CardContent className="h-[220px] w-full flex items-center justify-center">
                <RadialBarChart width={180} height={180} innerRadius="80%" outerRadius="100%" data={[{ name: 'Completion', value: completion }]} startAngle={90} endAngle={-270} >
                  <RadialBar minAngle={15} background clockWise dataKey="value" fill="#10B981" cornerRadius={20} isAnimationActive animationDuration={900} />
                  <RechartsTooltip formatter={(v) => `${v}%`} contentStyle={{background: 'rgba(30,41,59,0.95)', color: '#fff', borderRadius: 8, border: '1px solid #334155'}} />
                </RadialBarChart>
                <div className="absolute text-3xl font-bold text-emerald-600 dark:text-emerald-400 drop-shadow-lg">{completion}%</div>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Topic Distribution Pie Chart */}
            <Card className={`${GLASS_CARD} p-4 flex flex-col items-center justify-center`}> 
              <CardHeader>
                <CardTitle className="text-base font-semibold">Topic Distribution</CardTitle>
                <CardDescription>Most tested topics</CardDescription>
              </CardHeader>
              <CardContent className="h-[250px] w-full flex items-center justify-center">
                <PieChart width={220} height={220} className="w-full">
                  <Pie data={topicDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3} isAnimationActive animationDuration={900} >
                    {topicDist.map((entry, idx) => (
                      <PieCell key={`cell-${idx}`} fill={MODERN_COLORS[idx % MODERN_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(v, n) => [`${v}`, n]} contentStyle={{background: 'rgba(30,41,59,0.95)', color: '#fff', borderRadius: 8, border: '1px solid #334155'}} />
                </PieChart>
              </CardContent>
            </Card>
            {/* Top Topic Performance Bar Chart (already beautiful) */}
            <Card className={`${GLASS_CARD} shadow-lg hover:shadow-2xl transition-all border-0 bg-gradient-to-br from-primary/5 to-background/80`}> 
              <CardHeader>
                <CardTitle className="text-base font-semibold">Top Topic Performance</CardTitle>
                <CardDescription>Your accuracy in your best-performing topics.</CardDescription>
              </CardHeader>
              <CardContent className="h-[250px] flex items-center justify-center">
                {topicPerformance.length > 0 ? (
                  <ChartContainer
                    config={{
                      Accuracy: {
                        label: 'Your Accuracy',
                        color: MODERN_COLORS[0],
                      },
                    }}
                    className="w-full h-full"
                  >
                    <RechartsBarChart data={topicPerformance.slice(0, 5)} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis dataKey="name" type="category" width={120} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <RechartsTooltip formatter={(v) => `${v}%`} contentStyle={{background: 'rgba(30,41,59,0.95)', color: '#fff', borderRadius: 8, border: '1px solid #334155'}} />
                      <ChartLegendContent />
                      <Bar dataKey="Accuracy" radius={[8, 8, 8, 8]} barSize={24} isAnimationActive animationDuration={900}>
                        {topicPerformance.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={MODERN_COLORS[index % MODERN_COLORS.length]} />
                        ))}
                      </Bar>
                    </RechartsBarChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">Take more tests to see your topic performance.</p>
                )}
              </CardContent>
            </Card>
          </div>
          <Card className={`${GLASS_CARD} shadow-lg hover:shadow-2xl transition-all border-0 bg-gradient-to-br from-primary/5 to-background/80`}> 
            <CardHeader>
              <CardTitle className="font-semibold">Recent Tests</CardTitle>
              <CardDescription>Your last 5 completed tests.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="text-right">Accuracy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testHistory.slice(0, 5).map(test => (
                    <TableRow key={test.id} className="hover:bg-primary/5 transition-colors">
                      <TableCell>
                        <div className="font-medium">{format(new Date(test.created_at), 'MMMM d, yyyy')}</div>
                        <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(test.created_at), { addSuffix: true })}</div>
                      </TableCell>
                      <TableCell className="font-semibold">{test.score} / {test.total}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={test.score/test.total >= 0.7 ? "default" : "destructive"} className="text-base px-3 py-1 rounded-full">
                          {((test.score / test.total) * 100).toFixed(0)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden shadow-xl border-0 bg-gradient-to-br from-primary/10 to-background/80 flex items-center justify-center">
          <Image src="https://placehold.co/1200x400.png" alt="Student studying" fill priority className="object-cover" data-ai-hint="learning study" />
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-center text-white p-4">
              <h2 className="text-3xl font-bold font-headline drop-shadow-lg">Unlock Your Potential</h2>
              <p className="mt-2 max-w-2xl text-lg">Take a test to start tracking your progress and get personalized AI-powered feedback!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

    