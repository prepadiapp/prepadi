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

// --- Type ---
// This matches the `history` array from our API
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
    <Card>
      <CardHeader>
        <CardTitle>Performance History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Score</TableHead>
              <TableHead className="hidden md:table-cell">Correct</TableHead>
              <TableHead className="hidden md:table-cell">Time</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((attempt) => (
              <TableRow key={attempt.id}>
                <TableCell>
                  <div className="font-medium">{attempt.subject}</div>
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