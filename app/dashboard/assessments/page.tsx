'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Clock, CheckCircle2, XCircle, Play } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { format } from 'date-fns';
import Link from 'next/link';

export default function StudentAssessmentsPage() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/assessments')
      .then(res => res.json())
      .then(setAssessments)
      .catch(() => toast.error("Failed to load assessments"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <Toaster richColors />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Assessments</h1>
        <p className="text-muted-foreground">Exams and tests scheduled by your organization.</p>
      </div>

      {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>
      ) : assessments.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-xl bg-slate-50/50">
              <p className="text-slate-500">No assessments scheduled at the moment.</p>
          </div>
      ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assessments.map((exam) => (
                  <Card key={exam.id} className="hover:shadow-md transition-all border-slate-200">
                      <CardHeader className="pb-3">
                          <div className="flex justify-between items-start mb-2">
                              <Badge 
                                variant={exam.uiStatus === 'ACTIVE' ? 'default' : 'secondary'}
                                className={
                                    exam.uiStatus === 'ACTIVE' ? 'bg-green-600 hover:bg-green-700' :
                                    exam.uiStatus === 'MISSED' ? 'bg-red-100 text-red-700' :
                                    exam.uiStatus === 'COMPLETED' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                                }
                              >
                                  {exam.uiStatus}
                              </Badge>
                              {exam.score !== null && <span className="font-bold text-lg">{Math.round(exam.score)}%</span>}
                          </div>
                          <CardTitle className="text-base line-clamp-1">{exam.title}</CardTitle>
                          <CardDescription className="text-xs">{exam.paper.title}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          <div className="text-xs text-slate-600 space-y-2">
                              <div className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400"/>
                                  <span>{format(new Date(exam.startTime), 'MMM d, h:mm a')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-slate-400"/>
                                  <span>{exam.duration ? `${exam.duration} mins` : 'Untimed'}</span>
                              </div>
                          </div>

                          {exam.uiStatus === 'ACTIVE' && (
                              <Button className="w-full font-semibold shadow-md bg-green-600 hover:bg-green-700" asChild>
                                  <Link href={`/quiz/assignment/${exam.id}`}>
                                      <Play className="w-4 h-4 mr-2" /> Start Exam
                                  </Link>
                              </Button>
                          )}
                          {exam.uiStatus === 'UPCOMING' && (
                              <Button disabled variant="outline" className="w-full bg-slate-50">
                                  Not Started Yet
                              </Button>
                          )}
                          {exam.uiStatus === 'COMPLETED' && (
                              <Button variant="outline" className="w-full text-blue-600 border-blue-200 bg-blue-50">
                                  <CheckCircle2 className="w-4 h-4 mr-2"/> View Results
                              </Button>
                          )}
                          {exam.uiStatus === 'MISSED' && (
                              <Button disabled variant="ghost" className="w-full text-red-500">
                                  <XCircle className="w-4 h-4 mr-2"/> Missed
                              </Button>
                          )}
                      </CardContent>
                  </Card>
              ))}
          </div>
      )}
    </div>
  );
}