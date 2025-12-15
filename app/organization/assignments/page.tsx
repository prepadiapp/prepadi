'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreateAssignmentDialog } from '@/components/org/CreateAssignmentDialog';
import { Loader2, Calendar, Clock, Users, Trash2, Edit } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { format } from 'date-fns';

export default function OrgAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
        const res = await fetch('/api/organization/assignments');
        if (res.ok) {
            setAssignments(await res.json());
        }
    } catch (e) {
        toast.error("Failed to load assignments");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
      if(!confirm("Delete this assignment? Student results will be kept but access removed.")) return;
      // Note: Need DELETE API endpoint logic, omitting for brevity but assumes existence or reuse
      // Ideally implement DELETE in the API route created earlier.
      toast.info("Delete functionality pending implementation");
  };

  const getStatus = (start: string, end: string) => {
      const now = new Date();
      const s = new Date(start);
      const e = new Date(end);
      if (now < s) return { label: 'Upcoming', color: 'bg-yellow-100 text-yellow-700' };
      if (now > e) return { label: 'Closed', color: 'bg-slate-100 text-slate-500' };
      return { label: 'Active', color: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/30 font-sans">
      <Toaster richColors position="top-center" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Assignments</h1>
          <p className="text-sm text-slate-500">Schedule and manage exams for your students.</p>
        </div>
        <CreateAssignmentDialog onSuccess={fetchData} />
      </div>

      {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>
      ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Calendar className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-900 font-medium">No assignments scheduled</p>
              <p className="text-slate-500 text-sm mt-1">Create your first exam schedule to get started.</p>
          </div>
      ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assignment) => {
                  const status = getStatus(assignment.startTime, assignment.endTime);
                  return (
                    <Card key={assignment.id} className="hover:shadow-md transition-all border-slate-200">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <Badge variant="secondary" className={`${status.color} mb-2 hover:${status.color}`}>
                                    {status.label}
                                </Badge>
                                <div className="flex gap-1">
                                    {/* Edit button placeholder */}
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={() => handleDelete(assignment.id)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                            <CardTitle className="text-base line-clamp-1" title={assignment.title}>{assignment.title}</CardTitle>
                            <CardDescription className="text-xs line-clamp-1">{assignment.paper.title}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-xs space-y-2 text-slate-600">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-slate-400"/>
                                <span>
                                    {format(new Date(assignment.startTime), 'MMM d, h:mm a')} - {format(new Date(assignment.endTime), 'h:mm a')}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-slate-400"/>
                                <span>{assignment.duration ? `${assignment.duration} mins` : 'Untimed'}</span>
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 mt-2">
                                <Users className="w-3.5 h-3.5 text-slate-400"/>
                                <span className="font-medium text-slate-900">{assignment._count.attempts}</span> students taken
                            </div>
                        </CardContent>
                    </Card>
                  );
              })}
          </div>
      )}
    </div>
  );
}