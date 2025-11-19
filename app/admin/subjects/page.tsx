'use client';

import { useEffect, useState } from 'react';
import { Exam, Subject } from '@/lib/generated/prisma'; // Corrected path
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, Plus, Trash2, Edit } from 'lucide-react';
import { SubjectFormDialog } from '@/components/admin/SubjectFormDialog';
import { Toaster, toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

// Full subject type with linked exams
type SubjectWithCount = Subject & {
  _count: {
    questions: number;
  };
};

export default function ManageSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectWithCount | null>(null);


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
      setAllExams(examsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


  const handleEdit = (subject: SubjectWithCount) => {
    setSelectedSubject(subject);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedSubject(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject? All questions under this subject will be lost.')) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/subjects/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete subject.');
      }
      toast.success('Subject deleted successfully');
      fetchData(); // Refresh the list
    } catch (err: any) {
      toast.error(err.message);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Toaster richColors />
      <SubjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subject={selectedSubject}
        onSave={() => {
          setDialogOpen(false);
          fetchData(); // Refresh list on save
        }}
      />
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Manage Subjects</h1>
          <Button onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Subject
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Subjects ({subjects.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Total General Questions</TableHead>
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
                      <Button variant="outline" size="icon" onClick={() => handleEdit(subject)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(subject.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </>
  );
}