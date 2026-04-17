'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Activity, CreditCard, Loader2, CheckCircle2, Clock3 } from 'lucide-react';

interface OrgStats {
  totalStudents: number;
  activeStudents: number;
  customQuestions: number;
  totalAssignments: number;
  totalExaminations: number;
  draftExaminations: number;
  publishedExaminations: number;
  planName: string;
  subscriptionStatus: string;
}

export default function OrgDashboardPage() {
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/organization/stats');
        if (res.ok) {
          setStats(await res.json());
        }
      } catch (error) {
        console.error('Failed to load org stats');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_22px_70px_-36px_rgba(37,99,235,0.45)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              Organization Overview
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Run examinations, assignments, and student performance from one calm workspace.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Draft content privately, publish only when it is ready, and keep a clear picture of student activity across your organization.
              </p>
            </div>
          </div>
          <div className={`w-fit rounded-full px-4 py-2 text-sm font-medium ${stats.subscriptionStatus === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {stats.planName} ({stats.subscriptionStatus})
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active (7d)</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeStudents}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Examinations</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExaminations}</div>
            <p className="mt-2 text-xs text-slate-500">{stats.publishedExaminations} published • {stats.draftExaminations} draft</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assignments</CardTitle>
            <CreditCard className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssignments}</div>
            <p className="mt-2 text-xs text-slate-500">{stats.customQuestions} custom questions in your library</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Publishing Workflow
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="rounded-xl bg-slate-50 px-4 py-3">Draft examinations stay private until you publish them.</div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">Published examinations can be scheduled as assignments or exposed for practice.</div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">Question order stays fixed by default unless you intentionally enable randomization.</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock3 className="h-5 w-5 text-amber-600" /> Delivery Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="rounded-xl bg-slate-50 px-4 py-3">Assignment scheduling now uses timezone-safe datetime handling.</div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">Content can be built as reusable examinations before it is assigned to students.</div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">The next step is deeper student performance history wired into the students area.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
