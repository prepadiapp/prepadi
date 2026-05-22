'use client';

import { Subject } from '@prisma/client';
import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, Clock, Zap, Download, Loader2, FileText, CalendarDays } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { saveExamForOffline } from '@/lib/offline-storage';
import { toast } from 'sonner';

interface ExamSelectorProps {
  exams: {
    id: string;
    name: string;
    shortName: string;
    isYearBased?: boolean;
  }[];
}

function ExamSelectorContent({ exams }: ExamSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isPracticeMode, setIsPracticeMode] = useState(
    searchParams.get('mode') === 'exam' ? false : true
  );

  const [selectedExam, setSelectedExam] = useState<ExamSelectorProps['exams'][number] | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [paperChoices, setPaperChoices] = useState<Array<{ id: string; title: string; questionCount: number; duration?: number | null }>>([]);

  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingYears, setIsLoadingYears] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!selectedExam) {
      setSubjects([]);
      setSelectedSubject('');
      setYears([]);
      setSelectedYear('');
      setPaperChoices([]);
      setSelectedPaperId('');
      return;
    }

    setIsLoadingSubjects(true);
    setSubjects([]);
    setSelectedSubject('');
    setYears([]);
    setSelectedYear('');
    setPaperChoices([]);
    setSelectedPaperId('');

    fetch(`/api/practice/availability?examId=${selectedExam.id}`)
      .then((res) => res.json())
      .then((data) => setSubjects(data.subjects || []))
      .catch((err) => console.error(err))
      .finally(() => setIsLoadingSubjects(false));
  }, [selectedExam]);

  useEffect(() => {
    if (selectedExam && selectedSubject) {
      setIsLoadingYears(true);
      setYears([]);
      setSelectedYear('');
      setPaperChoices([]);
      setSelectedPaperId('');

      fetch(`/api/practice/availability?examId=${selectedExam.id}&subjectId=${selectedSubject}`)
        .then((res) => res.json())
        .then((data) => {
          setYears(data.years || []);
          setPaperChoices(data.papers || []);
        })
        .catch((err) => console.error(err))
        .finally(() => setIsLoadingYears(false));
    } else {
      setYears([]);
      setSelectedYear('');
      setPaperChoices([]);
      setSelectedPaperId('');
    }
  }, [selectedSubject, selectedExam]);
  
  const handleStartExam = () => {
    if (!selectedExam || !selectedSubject) return;

    if (selectedExam.isYearBased === false) {
      if (!selectedPaperId) return;
      const mode = isPracticeMode ? 'practice' : 'exam';
      const params = new URLSearchParams();
      params.set('mode', mode);
      router.push(`/quiz/paper/${selectedPaperId}?${params.toString()}`);
      return;
    }

    if (!selectedYear) return;
    
    const examSlug = selectedExam.shortName.toLowerCase();
    const subjectSlug = subjects.find(s => s.id === selectedSubject)?.name.toLowerCase().replace(/\s+/g, '-') || '';
    
    const mode = isPracticeMode ? 'practice' : 'exam';
    
    const params = new URLSearchParams();
    params.set('mode', mode);

    router.push(`/quiz/${examSlug}/${subjectSlug}/${selectedYear}?${params.toString()}`);
  };

  const handleDownload = async () => {
    if (!selectedExam || !selectedSubject) return;
    if (selectedExam.isYearBased !== false && !selectedYear) return;
    if (selectedExam.isYearBased === false && !selectedPaperId) return;

    setIsDownloading(true);
    try {
        const res = await fetch('/api/quiz/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
              selectedExam.isYearBased === false
                ? { paperId: selectedPaperId }
                : {
                    examId: selectedExam.id,
                    subjectId: selectedSubject,
                    year: selectedYear
                  }
            )
        });

        if (!res.ok) {
            const errorMsg = await res.text();
            throw new Error(errorMsg || "Failed to fetch exam data");
        }
        
        const data = await res.json();
        await saveExamForOffline(data);
        toast.success("Exam downloaded for offline use!");
    } catch (error: any) {
        toast.error(error.message || "Download failed.");
        console.error(error);
    } finally {
        setIsDownloading(false);
    }
  };

  const isYearBased = selectedExam?.isYearBased !== false;
  const canStart = !!selectedExam && !!selectedSubject && (isYearBased ? !!selectedYear : !!selectedPaperId);
  const canDownload = canStart; 

  return (
    <Card className="w-full overflow-hidden border-blue-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="h-1 bg-gradient-to-r from-blue-700 via-cyan-500 to-emerald-400" />
      <CardHeader className="pb-4">
         <CardTitle className="text-xl font-bold text-slate-900">Configure your session</CardTitle>
         <CardDescription>Choose only from published papers curated for your access level.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Row 1: Exam & Subject */}
        <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    1. Choose Exam
                </label>
                <Select onValueChange={(val) => setSelectedExam(exams.find(e => e.id === val) || null)}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Select Exam Body" />
                    </SelectTrigger>
                    <SelectContent>
                        {exams.map(e => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name} {e.isYearBased === false ? '(Flexible)' : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    2. Choose Subject
                </label>
                <Select onValueChange={setSelectedSubject} value={selectedSubject}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                        {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>

        {/* Row 2: Year/Paper & Mode */}
            <div className="grid md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              {isYearBased ? (
                <div className="space-y-2">
                    <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <CalendarDays className="h-3.5 w-3.5" /> 3. Choose Year
                    </label>
                    <Select onValueChange={setSelectedYear} value={selectedYear} disabled={!selectedSubject || isLoadingYears}>
                        <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
                            <SelectValue placeholder={!selectedSubject ? "Select a Subject first" : isLoadingYears ? "Loading years..." : "Select Year"} />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
              ) : (
                <div className="space-y-2">
                    <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <FileText className="h-3.5 w-3.5" /> 3. Choose Paper
                    </label>
                    <Select onValueChange={setSelectedPaperId} value={selectedPaperId} disabled={!selectedSubject || isLoadingYears}>
                        <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
                            <SelectValue placeholder={!selectedSubject ? "Select a Subject first" : isLoadingYears ? "Loading papers..." : "Select Paper"} />
                        </SelectTrigger>
                        <SelectContent>
                            {paperChoices.map((paper) => (
                              <SelectItem key={paper.id} value={paper.id}>
                                {paper.title} ({paper.questionCount} questions)
                              </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
              )}
                
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        4. Mode
                    </label>
                    <div className="flex gap-2">
                        <Button 
                            variant={isPracticeMode ? "secondary" : "outline"} 
                            className={cn("flex-1 h-11", isPracticeMode && "bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200")}
                            onClick={() => setIsPracticeMode(true)}
                        >
                            <Zap className="w-4 h-4 mr-2" /> Practice
                        </Button>
                        <Button 
                            variant={!isPracticeMode ? "default" : "outline"} 
                            className={cn("flex-1 h-11", !isPracticeMode && "bg-blue-600 hover:bg-blue-700")}
                            onClick={() => setIsPracticeMode(false)}
                        >
                            <Clock className="w-4 h-4 mr-2" /> Exam
                        </Button>
                    </div>
                </div>
            </div>

        <div className="rounded-xl border border-[color:var(--primary-border)] bg-[color:var(--primary-soft)] px-4 py-3 text-xs text-slate-600">
            Topic-based random practice is temporarily unavailable here while student practice is being aligned strictly to seeded published papers.
        </div>

        {/* Action Buttons - Responsive Stack */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:flex-1 py-6 text-base font-semibold border-2 hover:bg-slate-50"
              disabled={!canDownload || isDownloading}
              onClick={handleDownload}
            >
              {isDownloading ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Saving...</span>
              ) : (
                  <span className="flex items-center gap-2"><Download className="w-5 h-5"/> Save Offline</span>
              )}
            </Button>

            <Button
              size="lg"
              className="w-full sm:flex-[2] py-6 text-base font-semibold"
              disabled={!canStart}
              onClick={handleStartExam}
            >
              Start Session <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExamSelector(props: ExamSelectorProps) {
    return (
        <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading selector...</div>}>
            <ExamSelectorContent {...props} />
        </Suspense>
    )
}
