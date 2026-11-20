'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge'; 


type HistoryData = {
  id: string;
  exam: string;
  subject: string;
  score: number;
  correct: number;
  total: number;
  timeTaken: string;
  date: string;
};

export function AttemptHistoryTable({ data }: { data: HistoryData[] }) {
  const router = useRouter();

  return (
    <Card className="min-w-0 overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="px-4 pb-3 pt-5 sm:px-6">
        <CardTitle className="text-base font-bold tracking-tight text-slate-950 sm:text-lg">Performance History</CardTitle>
        <p className="text-xs text-slate-500">Review your recent quiz attempts</p>
      </CardHeader>
      <CardContent className="min-w-0 px-2 pb-3 sm:px-4 sm:pb-5">
        <Table className="w-full min-w-0">
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-slate-500">Subject</TableHead>
              <TableHead className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-slate-500">Score</TableHead>
              <TableHead className="hidden whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-slate-500 md:table-cell">Correct</TableHead>
              <TableHead className="hidden whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-slate-500 md:table-cell">Time</TableHead>
              <TableHead className="hidden whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-slate-500 md:table-cell">Date</TableHead>
              <TableHead className="whitespace-nowrap text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((attempt) => (
              <TableRow key={attempt.id} className="border-slate-100 hover:bg-slate-50/70">
                <TableCell>
                  <div className="max-w-[150px] truncate font-semibold text-slate-900">{attempt.subject}</div>
                  <div className="text-xs text-muted-foreground">{attempt.exam}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={attempt.score < 50 ? 'destructive' : 'default'}>
                    {attempt.score}%
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {attempt.correct} / {attempt.total}
                </TableCell>
                <TableCell className="hidden md:table-cell">{attempt.timeTaken}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {new Date(attempt.date).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg border-slate-200 px-2.5 text-xs font-semibold text-[#0000FE] hover:bg-[#F1F4FF] hover:text-[#0000CC]"
                    onClick={() => router.push(`/quiz/results/${attempt.id}`)}
                  >
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
