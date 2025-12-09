'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Exam, Subject } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, Library, Search } from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function PapersPage() {
  const router = useRouter();
  
  // Data
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [recentPapers, setRecentPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection for "Find/Create"
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [examsRes, subjectsRes, papersRes] = await Promise.all([
          fetch('/api/admin/exams'),
          fetch('/api/admin/subjects'),
          fetch('/api/admin/papers') // Fetch recently accessed/created papers
        ]);
        
        if (examsRes.ok) setExams(await examsRes.json());
        if (subjectsRes.ok) setSubjects(await subjectsRes.json());
        if (papersRes.ok) setRecentPapers(await papersRes.json());
      } catch(e) {
        toast.error("Failed to load options");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleOpenPaper = async () => {
    if (!selectedExam || !selectedSubject || !selectedYear) {
      toast.error("Please select Exam, Subject, and Year");
      return;
    }

    setProcessing(true);
    try {
      // "Find or Create" endpoint
      const res = await fetch('/api/admin/papers/find-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExam,
          subjectId: selectedSubject,
          year: selectedYear
        })
      });

      if (!res.ok) throw new Error("Could not initialize paper");
      
      const paper = await res.json();
      router.push(`/admin/papers/${paper.id}`);
    } catch (error) {
      toast.error("Failed to open paper editor");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <Toaster richColors />
      
      <div>
        <h1 className="text-3xl font-bold">Paper Manager</h1>
        <p className="text-muted-foreground">Select a specific exam set to reorder, verify, or manage in bulk.</p>
      </div>

      {/* Selector Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary"/> Find Paper
          </CardTitle>
          <CardDescription>Select parameters to load questions for management.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label>Exam Body</Label>
            <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger><SelectValue placeholder="Select Exam"/></SelectTrigger>
                <SelectContent>
                    {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Select Subject"/></SelectTrigger>
                <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Year</Label>
            <Input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} />
          </div>

          <Button onClick={handleOpenPaper} disabled={processing || loading} className="w-full">
            {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <ArrowRight className="w-4 h-4 mr-2"/>}
            Manage Paper
          </Button>
        </CardContent>
      </Card>

      {/* Recent Papers List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
            <Library className="w-5 h-5"/> Recently Managed
        </h2>
        {loading ? (
            <div className="p-10 flex justify-center"><Loader2 className="animate-spin"/></div>
        ) : recentPapers.length === 0 ? (
            <div className="text-muted-foreground text-sm italic">No history yet. Use the tool above to start.</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentPapers.map(paper => (
                    <Card key={paper.id} 
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/admin/papers/${paper.id}`)}
                    >
                        <CardHeader className="p-4">
                            <CardTitle className="text-base">{paper.title}</CardTitle>
                            <CardDescription className="text-xs">
                                {paper.questions.length} questions • {paper.isVerified ? 'Verified' : 'Draft'}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}