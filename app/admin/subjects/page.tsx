'use client';

import { useEffect, useState } from 'react';
import { Exam, Subject } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, Plus, Trash2, Edit, BookOpen, GraduationCap } from 'lucide-react';
import { SubjectFormDialog } from '@/components/admin/SubjectFormDialog';
import { ExamFormDialog } from '@/components/admin/ExamFormDialog';
import { Toaster, toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

// --- Types ---
type SubjectWithCount = Subject & {
  _count: {
    questions: number;
  };
};

export default function CurriculumPage() {
  // --- State ---
  const [activeTab, setActiveTab] = useState('subjects');
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog States
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectWithCount | null>(null);
  
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  // --- Fetch Data ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const [subjectsRes, examsRes] = await Promise.all([
        fetch('/api/admin/subjects'),
        fetch('/api/admin/exams'),
      ]);
      
      if (!subjectsRes.ok) throw new Error('Failed to fetch subjects');
      if (!examsRes.ok) throw new Error('Failed to fetch exams');
      
      const subjectsData = await subjectsRes.json();
      const examsData = await examsRes.json();
      
      setSubjects(subjectsData);
      setExams(examsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Subject Handlers ---
  const handleEditSubject = (subject: SubjectWithCount) => {
    setSelectedSubject(subject);
    setSubjectDialogOpen(true);
  };

  const handleNewSubject = () => {
    setSelectedSubject(null);
    setSubjectDialogOpen(true);
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject? All questions under this subject will be lost.')) return;
    try {
      const response = await fetch(`/api/admin/subjects/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete subject.');
      toast.success('Subject deleted successfully');
      fetchData(); 
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // --- Exam Handlers ---
  const handleEditExam = (exam: Exam) => {
    setSelectedExam(exam);
    setExamDialogOpen(true);
  };

  const handleNewExam = () => {
    setSelectedExam(null);
    setExamDialogOpen(true);
  };

  const handleDeleteExam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) return;
    try {
      const response = await fetch(`/api/admin/exams/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete exam.');
      toast.success('Exam deleted successfully');
      fetchData(); 
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // --- Render ---
  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/30">
      <Toaster richColors position="top-center" />
      
      {/* Dialogs */}
      <SubjectFormDialog
        open={subjectDialogOpen}
        onOpenChange={setSubjectDialogOpen}
        subject={selectedSubject}
        onSave={() => { setSubjectDialogOpen(false); fetchData(); }}
      />
      <ExamFormDialog
        open={examDialogOpen}
        onOpenChange={setExamDialogOpen}
        exam={selectedExam}
        onSave={() => { setExamDialogOpen(false); fetchData(); }}
      />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Curriculum Manager</h1>
        <p className="text-sm text-slate-500">Manage Subjects and Exam Bodies in one place.</p>
      </div>

      <Tabs defaultValue="subjects" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="exams">Exams</TabsTrigger>
        </TabsList>

        {/* --- SUBJECTS TAB --- */}
        <TabsContent value="subjects" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary"/>
                <h2 className="text-lg font-semibold">All Subjects</h2>
                <Badge variant="secondary">{subjects.length}</Badge>
            </div>
            <Button onClick={handleNewSubject} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Add Subject
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Total Questions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{subject._count.questions}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditSubject(subject)} className="h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSubject(subject.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- EXAMS TAB --- */}
        <TabsContent value="exams" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary"/>
                <h2 className="text-lg font-semibold">Exam Bodies</h2>
                <Badge variant="secondary">{exams.length}</Badge>
            </div>
            <Button onClick={handleNewExam} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Add Exam
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Short Name</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.name}</TableCell>
                      <TableCell><Badge variant="outline">{exam.shortName}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs truncate text-muted-foreground text-sm">
                        {exam.description || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditExam(exam)} className="h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteExam(exam.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}