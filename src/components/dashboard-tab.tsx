'use client'

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { File, HelpCircle, List, Trophy } from 'lucide-react';
import Image from 'next/image';
import { Test } from '@/lib/types';
import ActivityCalendar from './activity-calendar';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { createClient } from '@/lib/supabase';

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
    // This is a placeholder, in a real app you would create an RPC in Supabase
    // to calculate this efficiently. For now, we just show a message.
    // fetchPerformance();
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

  const COLORS = ['#3498DB', '#1ABC9C', '#F1C40F', '#E67E22', '#9B59B6'];

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uploaded PDFs</CardTitle>
                <File className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{sourceFiles.length}</div>
                 {sourceFiles.length > 0 && (
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
                )}
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Question Pool</CardTitle>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{questionCount}</div>
                <p className="text-xs text-muted-foreground">Total questions available</p>
            </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests Taken</CardTitle>
            <List className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalTests}</div>
            <p className="text-xs text-muted-foreground">Total mock tests completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.avgScore}%</div>
            <p className="text-xs text-muted-foreground">Across all tests</p>
          </CardContent>
        </Card>
      </div>
      
      {testHistory.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ActivityCalendar data={analyticsData.activityData} title="Test Activity" />
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium">Topic Performance</CardTitle>
                    <CardDescription>Performance based on all tests taken.</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center">
                    {topicPerformance.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={topicPerformance.slice(0, 5)} layout="vertical" margin={{ left: 20, right: 20 }}>
                                <XAxis type="number" domain={[0, 100]} hide />
                                <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--background))', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))'}} formatter={(value) => `${value}%`} />
                                <Bar dataKey="Accuracy" radius={[4, 4, 4, 4]} barSize={20}>
                                    {topicPerformance.slice(0, 5).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-sm text-muted-foreground">Take more tests to see your topic performance.</p>
                    )}
                </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
                <CardTitle>Recent Tests</CardTitle>
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
                            <TableRow key={test.id}>
                                <TableCell>
                                    <div className="font-medium">{format(new Date(test.created_at), 'MMMM d, yyyy')}</div>
                                    <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(test.created_at), { addSuffix: true })}</div>
                                </TableCell>
                                <TableCell>{test.score} / {test.total}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant={test.score/test.total >= 0.7 ? "default" : "destructive"}>
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
         <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden shadow-lg border">
             <Image src="https://placehold.co/1200x400.png" alt="Student studying" layout="fill" objectFit="cover" data-ai-hint="learning study" />
             <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-center text-white p-4">
                    <h2 className="text-3xl font-bold font-headline">Unlock Your Potential</h2>
                    <p className="mt-2 max-w-2xl text-lg">Take a test to start tracking your progress and get personalized AI-powered feedback!</p>
                </div>
             </div>
         </div>
      )}
    </div>
  );
}
