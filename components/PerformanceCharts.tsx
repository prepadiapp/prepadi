'use client';

import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// --- Types ---
type ScoreTrendData = {
  name: string;
  score: number;
};

type SubjectPerfData = {
  name: string;
  avgScore: number;
};

// --- Score Trend Line Chart ---
export function ScoreTrendChart({ data }: { data: ScoreTrendData[] }) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="px-4 pb-2 pt-5 sm:px-6">
        <CardTitle className="text-base font-bold tracking-tight text-slate-950 sm:text-lg">Overall Score Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-64 min-w-0 px-2 pb-4 sm:h-80 sm:px-4 sm:pb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -22, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF5" />
            <XAxis dataKey="name" fontSize={10} tickMargin={8} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={10} tickLine={false} axisLine={false} width={38} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                borderRadius: '14px',
                boxShadow: '0 12px 30px rgba(15,23,42,0.12)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#0000FE"
              strokeWidth={3}
              dot={{ r: 3, fill: '#FFFFFF', stroke: '#0000FE', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#FF6600', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// --- Subject Performance Bar Chart ("Weak Areas") ---
export function SubjectPerformanceChart({ data }: { data: SubjectPerfData[] }) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="px-4 pb-2 pt-5 sm:px-6">
        <CardTitle className="text-base font-bold tracking-tight text-slate-950 sm:text-lg">Average Score by Subject</CardTitle>
        <p className="text-xs text-slate-500">Your scores, starting with the areas needing most practice</p>
      </CardHeader>
      <CardContent className="h-64 min-w-0 px-2 pb-4 sm:h-80 sm:px-4 sm:pb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF5" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={10} tickLine={false} axisLine={false} />
            <YAxis
              dataKey="name"
              type="category"
              width={72}
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                borderRadius: '14px',
                boxShadow: '0 12px 30px rgba(15,23,42,0.12)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [`${value}%`, 'Avg. Score']}
            />
          <Bar dataKey="avgScore" barSize={24} fill="#4C72FE" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
