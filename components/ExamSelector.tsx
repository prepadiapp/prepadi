'use client';

import { Subject } from '@prisma/client';
import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, Clock, Zap, Download, WifiOff, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { saveExamForOffline } from '@/lib/offline-storage';
import { toast } from 'sonner';

interface ExamSelectorProps {
  exams: {
    id: string;
    name: string;
    shortName: string;
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

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<number[]>([]);

  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingYears, setIsLoadingYears] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!selectedExam) {
      setSubjects([]);
      setSelectedSubject('');
      setYears([]);
      setSelectedYear('');
      return;
    }

    setIsLoadingSubjects(true);
    setSubjects([]);
    setSelectedSubject('');
    setYears([]);
    setSelectedYear('');

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

      fetch(`/api/practice/availability?examId=${selectedExam.id}&subjectId=${selectedSubject}`)
        .then((res) => res.json())
        .then((data) => setYears(data.years || []))
        .catch((err) => console.error(err))
        .finally(() => setIsLoadingYears(false));
    } else {
      setYears([]);
      setSelectedYear('');
    }
  }, [selectedSubject, selectedExam]);
  
  const handleStartExam = () => {
    if (!selectedExam || !selectedSubject || !selectedYear) return;
    
    const examSlug = selectedExam.shortName.toLowerCase();
    const subjectSlug = subjects.find(s => s.id === selectedSubject)?.name.toLowerCase().replace(/\s+/g, '-') || '';
    
    const mode = isPracticeMode ? 'practice' : 'exam';
    
    const params = new URLSearchParams();
    params.set('mode', mode);

    router.push(`/quiz/${examSlug}/${subjectSlug}/${selectedYear}?${params.toString()}`);
  };

  const handleDownload = async () => {
    if (!selectedExam || !selectedSubject || !selectedYear) return;

    setIsDownloading(true);
    try {
        const res = await fetch('/api/quiz/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                examId: selectedExam.id,
                subjectId: selectedSubject,
                year: selectedYear
            })
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

  const canStart = !!selectedExam && !!selectedSubject && !!selectedYear;
  const canDownload = !!selectedExam && !!selectedSubject && !!selectedYear; 

  return (
    <Card className="w-full border-slate-200 shadow-sm bg-white">
      <CardHeader className="pb-4">
         <CardTitle className="text-xl font-bold text-slate-800">Configure Session</CardTitle>
         <CardDescription>Customize your practice session.</CardDescription>
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
                        {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
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

        {/* Row 2: Standard Flow (Year & Mode) */}
            <div className="grid md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        3. Choose Year
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
