'use client';

import { useEffect, useState } from 'react';
import { Exam } from '@prisma/client'; 
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
import { ExamFormDialog } from '@/components/admin/ExamFormDialog'; 
import { Toaster, toast } from 'sonner'; 

export default function ManageExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  // --- Data Fetching ---
  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/exams');
      if (!response.ok) throw new Error('Failed to fetch exams');
      const data = await response.json();
      setExams(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

 
  const handleEdit = (exam: Exam) => {
    setSelectedExam(exam);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedExam(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/exams/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete exam. It may be in use by questions or subjects.');
      }
      toast.success('Exam deleted successfully');
      fetchExams(); // Refresh the list
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
      <ExamFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        exam={selectedExam}
        onSave={() => {
          setDialogOpen(false);
          fetchExams(); // Refresh list on save
        }}
      />
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Manage Exams</h1>
          <Button onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Exam
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Exams ({exams.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Short Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.name}</TableCell>
                    <TableCell>{exam.shortName}</TableCell>
                    <TableCell className="max-w-xs truncate">{exam.description || 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(exam)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(exam.id)}>
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