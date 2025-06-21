'use client'

import React, { useMemo, useCallback, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, File, HelpCircle, Loader2, List, Trophy, Activity } from 'lucide-react';
import Image from 'next/image';
import { TestResult } from '@/lib/types';
import ActivityCalendar from './activity-calendar';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { normalizeOption } from '@/lib/utils';

interface DashboardTabProps {
  onUpload: (files: File[]) => void;
  isProcessing: boolean;
  pdfCount: number;
  questionCount: number;
  testHistory: TestResult[];
}

export default function DashboardTab({ onUpload, isProcessing, pdfCount, questionCount, testHistory }: DashboardTabProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(Array.from(e.dataTransfer.files));
    }
  }, [onUpload]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      onUpload(Array.from(e.target.files));
    }
  };
  
  const analyticsData = useMemo(() => {
    if (testHistory.length === 0) {
      return {
        totalTests: 0,
        avgScore: 0,
        topicPerformance: [],
        activityData: [],
      };
    }

    let totalCorrect = 0;
    let totalAnswered = 0;
    const topicData: Record<string, { correct: number, total: number }> = {};
    const activityMap = new Map<string, number>();

    testHistory.forEach(test => {
      totalCorrect += test.score;
      totalAnswered += test.total;
      const dateKey = format(new Date(test.date), 'yyyy-MM-dd');
      activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1);

      test.questions.forEach(q => {
          const topic = q.topic || 'Uncategorized';
          if (!topicData[topic]) {
            topicData[topic] = { correct: 0, total: 0 };
          }
          topicData[topic].total++;
          const isCorrect = normalizeOption(test.userAnswers[q.id] || '') === normalizeOption(q.correctOption || '');
          if (isCorrect) {
            topicData[topic].correct++;
          }
      });
    });
    
    const topicPerformance = Object.entries(topicData).map(([topic, {correct, total}]) => ({
        name: topic,
        Accuracy: total > 0 ? parseFloat(((correct / total) * 100).toFixed(1)) : 0,
    })).sort((a,b) => b.Accuracy - a.Accuracy);

    const activityData = Array.from(activityMap.entries()).map(([date, count]) => ({ date, count }));

    return {
      totalTests: testHistory.length,
      avgScore: totalAnswered > 0 ? parseFloat(((totalCorrect / totalAnswered) * 100).toFixed(1)) : 0,
      topicPerformance,
      activityData,
    };
  }, [testHistory]);

  const COLORS = ['#3498DB', '#1ABC9C', '#F1C40F', '#E67E22', '#9B59B6'];

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Card 
                className={`transition-colors h-full ${dragActive ? "border-primary bg-primary/10" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <CardHeader>
                    <CardTitle>Upload Your PDFs</CardTitle>
                    <CardDescription>Drag and drop your aptitude test PDFs here or click to select files.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="flex items-center justify-center w-full">
                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-muted-foreground">PDF files only</p>
                    </div>
                    <input id="dropzone-file" type="file" className="hidden" accept=".pdf" multiple onChange={handleChange} disabled={isProcessing} />
                    </label>
                </div>
                <div className="flex justify-center">
                    <Button onClick={() => document.getElementById('dropzone-file')?.click()} disabled={isProcessing}>
                    {isProcessing ? (
                        <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                        </>
                    ) : (
                        'Select Files'
                    )}
                    </Button>
                </div>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-6">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Uploaded PDFs</CardTitle>
                    <File className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pdfCount}</div>
                    <p className="text-xs text-muted-foreground">Total documents processed</p>
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
        </div>
      </div>
      
      {testHistory.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Last Test</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{testHistory.slice(-1)[0].score}/{testHistory.slice(-1)[0].total}</div>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(testHistory.slice(-1)[0].date), { addSuffix: true })}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Best Topic</CardTitle>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-xl font-bold truncate">{analyticsData.topicPerformance[0]?.name || 'N/A'}</div>
                    <p className="text-xs text-muted-foreground">with {analyticsData.topicPerformance[0]?.Accuracy || 0}% accuracy</p>
                </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ActivityCalendar data={analyticsData.activityData} title="Test Activity" />
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium">Top 5 Topics by Accuracy</CardTitle>
                    <CardDescription>Performance based on all tests taken.</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={analyticsData.topicPerformance.slice(0, 5)} layout="vertical" margin={{ left: 20, right: 20 }}>
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--background))', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))'}} formatter={(value) => `${value}%`} />
                            <Bar dataKey="Accuracy" radius={[4, 4, 4, 4]} barSize={20}>
                                {analyticsData.topicPerformance.slice(0, 5).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </RechartsBarChart>
                    </ResponsiveContainer>
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
                        {testHistory.slice(-5).reverse().map(test => (
                            <TableRow key={test.id}>
                                <TableCell>
                                    <div className="font-medium">{format(new Date(test.date), 'MMMM d, yyyy')}</div>
                                    <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(test.date), { addSuffix: true })}</div>
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
         <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden shadow-lg">
             <Image src="https://placehold.co/1200x400.png" alt="Student studying" layout="fill" objectFit="cover" data-ai-hint="learning study" />
             <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white p-4">
                    <h2 className="text-3xl font-bold font-headline">Turn PDFs into Power</h2>
                    <p className="mt-2 max-w-2xl">Take a test to start tracking your progress and unlock your personalized analytics dashboard!</p>
                </div>
             </div>
         </div>
      )}
    </div>
  );
}
