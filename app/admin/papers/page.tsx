'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Exam, Subject } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, Library, Search, Database, RefreshCw } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { Badge } from '@/components/ui/badge'; 
import { QuestionsManager } from '@/components/admin/QuestionsManager';
import { EditPaperDialog } from '@/components/admin/EditPaperDialog'; 
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';

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
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [examsRes, subjectsRes, papersRes] = await Promise.all([
        fetch('/api/admin/exams'),
        fetch('/api/admin/subjects'),
        fetch('/api/admin/papers') 
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
    <div className="space-y-6 md:space-y-8 pb-20 p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/30 font-sans">
      <Toaster richColors position="top-center" />
      
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Paper Manager</h1>
        <p className="text-sm text-slate-500">Curate and manage exam papers for your organization.</p>
      </div>

      {/* Selector Card */}
      <Card className="border-l-4 border-l-primary shadow-sm border-t border-r border-b border-slate-200 bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Search className="w-4 h-4 text-primary"/> Find or Create Paper
          </CardTitle>
          <CardDescription className="text-xs md:text-sm text-slate-500">
            Select parameters to load questions for management. If it doesn't exist, we'll create it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Exam Body</Label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                  <SelectTrigger className="h-9 text-sm bg-slate-50 border-slate-200 focus:ring-primary/20"><SelectValue placeholder="Select Exam"/></SelectTrigger>
                  <SelectContent>
                      {exams.map(e => <SelectItem key={e.id} value={e.id} className="text-sm">{e.name}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="h-9 text-sm bg-slate-50 border-slate-200 focus:ring-primary/20"><SelectValue placeholder="Select Subject"/></SelectTrigger>
                  <SelectContent>
                      {subjects.map(s => <SelectItem key={s.id} value={s.id} className="text-sm">{s.name}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Year</Label>
              <Input 
                type="number" 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))} 
                className="h-9 text-sm bg-slate-50 border-slate-200 focus:ring-primary/20"
              />
            </div>

            <Button 
              onClick={handleOpenPaper} 
              disabled={processing || loading} 
              className="w-full h-9 font-semibold text-sm shadow-sm"
            >
              {processing ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin"/> : <ArrowRight className="w-3.5 h-3.5 mr-2"/>}
              Manage Paper
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Papers List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-base md:text-lg font-semibold flex items-center gap-2 text-slate-800">
              <Library className="w-4 h-4 md:w-5 md:h-5 text-slate-400"/> Recently Managed
          </h2>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} className="h-8 text-xs text-slate-500 hover:text-slate-900">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
            <div className="p-12 flex justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400"/>
            </div>
        ) : recentPapers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                <Library className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-slate-900 font-medium text-sm">No history yet</p>
              <p className="text-slate-500 text-xs mt-1">Use the "Find or Create" tool above to start managing papers.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentPapers.map(paper => (
                    <Card key={paper.id} className="group hover:border-primary/30 hover:shadow-md transition-all duration-200 border-slate-200 shadow-sm bg-white">
                        <CardHeader className="p-4 relative">
                            {/* --- EDIT BUTTON (Opens Modal) --- */}
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <EditPaperDialog 
                                paper={paper} 
                                onSuccess={fetchData} 
                              />
                            </div>

                            <CardTitle 
                              className="text-sm md:text-base font-semibold text-slate-800 line-clamp-1 pr-8 cursor-pointer hover:text-primary transition-colors mb-1.5" 
                              title={paper.title}
                              onClick={() => router.push(`/admin/papers/${paper.id}`)}
                            >
                              {paper.title}
                            </CardTitle>
                            
                            <CardDescription className="text-xs flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">
                                    {paper.questions?.length || 0} Qs
                                  </span>
                                  {paper.isPublic && (
                                    <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                      <span className="w-1 h-1 rounded-full bg-green-500"></span> Public
                                    </span>
                                  )}
                                </div>
                                
                                <Badge variant={paper.isVerified ? 'default' : 'secondary'} className="text-[10px] h-5 font-medium border-slate-100">
                                  {paper.isVerified ? 'Verified' : 'Draft'}
                                </Badge>
                            </CardDescription>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        )}
      </div>

      {/* --- QUESTIONS ACCORDION --- */}
      <div className="pt-6 md:pt-10">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Database className="h-4 w-4 md:h-5 md:w-5 text-slate-400" />
          <h2 className="text-base md:text-lg font-semibold text-slate-800">Master Data Resources</h2>
        </div>

        <Accordion type="single" collapsible className="w-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <AccordionItem value="questions-db" className="border-none">
            <AccordionTrigger className="px-4 py-4 md:px-6 md:py-5 hover:bg-slate-50 hover:no-underline transition-all group">
              <div className="flex items-start gap-3 md:gap-4 text-left w-full">
                <div className="p-2 md:p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors mt-0.5">
                  <Database className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm md:text-base font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                    Global Question Bank
                  </h3>
                  <p className="text-xs text-slate-500 font-normal mt-0.5 md:mt-1 pr-4 leading-relaxed">
                    Access and manage the raw pool of questions sourced from all exams. 
                    <span className="hidden sm:inline"> Use this to fix typos or delete outdated content directly.</span>
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            
            <AccordionContent className="px-0 pb-0 border-t border-slate-100 bg-slate-50/30">
              <div className="p-4 md:p-6">
                <QuestionsManager />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

    </div>
  );
}