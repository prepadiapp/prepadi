'use client';

import { Exam, Subject } from '@prisma/client';
import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronRight, BookOpen, Target, Clock, Zap, CheckCircle2, Tag } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/admin/MultiSelect'; 

interface ExamSelectorProps {
  exams: Exam[];
}

type SelectionStep = 'exam' | 'subject' | 'year';

function ExamSelectorContent({ exams }: ExamSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isPracticeMode, setIsPracticeMode] = useState(
    searchParams.get('mode') === 'exam' ? false : true
  );

  const [step, setStep] = useState<SelectionStep>('exam');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // --- New Filters ---
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState('20');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [availableTags, setAvailableTags] = useState<{value: string, label: string}[]>([]);

  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingYears, setIsLoadingYears] = useState(false);

  useEffect(() => {
    setIsLoadingSubjects(true);
    fetch('/api/subjects')
      .then((res) => res.json())
      .then((data) => setSubjects(data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoadingSubjects(false));
  }, []);

  useEffect(() => {
    if (selectedExam) {
      setStep('subject');
      setSelectedSubject(null);
      setYears([]);
      setSelectedYear(null);
    }
  }, [selectedExam]);

  useEffect(() => {
    if (selectedExam && selectedSubject) {
      setIsLoadingYears(true);
      setYears([]);
      setSelectedYear(null);

      // Fetch Years
      fetch(`/api/years?examId=${selectedExam.id}&subjectId=${selectedSubject.id}`)
        .then((res) => res.json())
        .then((data) => {
          setYears(data);
          setStep('year');
        })
        .catch((err) => console.error(err))
        .finally(() => setIsLoadingYears(false));

      // Fetch Tags (using Admin API for now, ideal to have public endpoint)
      fetch('/api/admin/tags')
         .then(res => res.json())
         .then(data => setAvailableTags(data.map((t:any) => ({ value: t.id, label: t.name }))))
         .catch(e => console.error("Tags error", e));
    }
  }, [selectedSubject, selectedExam]);
  
  const handleStartExam = () => {
    if (!selectedExam || !selectedSubject || !selectedYear) return;
    
    const examSlug = selectedExam.shortName.toLowerCase();
    const subjectSlug = selectedSubject.name.toLowerCase().replace(/\s+/g, '-');
    const mode = isPracticeMode ? 'practice' : 'exam';
    
    // Build Query String with new params
    const params = new URLSearchParams();
    params.set('mode', mode);
    params.set('limit', questionCount);
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));

    router.push(`/quiz/${examSlug}/${subjectSlug}/${selectedYear}?${params.toString()}`);
  };

  return (
    <Card className="w-full border-slate-200 shadow-sm bg-white">
      <CardHeader className="pb-4">
         <CardTitle className="text-xl font-bold text-slate-800">Configure Session</CardTitle>
         <CardDescription>Select your target and how you want to practice.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Step 1: Exam & Subject Row */}
        <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    1. Choose Exam
                </label>
                <Select
                    onValueChange={(val) => {
                        const exam = exams.find(e => e.id === val);
                        if (exam) setSelectedExam(exam);
                    }}
                >
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:ring-offset-0 focus:ring-1 focus:ring-primary">
                        <SelectValue placeholder="Select Exam Body" />
                    </SelectTrigger>
                    <SelectContent>
                        {exams.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    2. Choose Subject
                </label>
                <Select
                    onValueChange={(value) => {
                        setSelectedSubject(subjects.find(s => s.id === value) || null);
                    }}
                    disabled={isLoadingSubjects || !selectedExam}
                >
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:ring-offset-0 focus:ring-1 focus:ring-primary">
                        <SelectValue placeholder={!selectedExam ? "Select Exam First" : "Select Subject"} />
                    </SelectTrigger>
                    <SelectContent>
                        {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>

        {/* Step 3: Year & Question Count */}
        <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    3. Choose Year
                </label>
                <Select
                    onValueChange={(value) => setSelectedYear(Number(value))}
                    disabled={isLoadingYears || !years.length || !selectedSubject}
                >
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:ring-offset-0 focus:ring-1 focus:ring-primary">
                    <SelectValue placeholder={!selectedSubject ? "Select Subject First" : (isLoadingYears ? "Loading years..." : "Select Year")} />
                    </SelectTrigger>
                    <SelectContent>
                    {years.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                        {year}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    4. Question Count
                </label>
                <Select value={questionCount} onValueChange={setQuestionCount}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="5">5 Questions</SelectItem>
                        <SelectItem value="10">10 Questions</SelectItem>
                        <SelectItem value="20">20 Questions</SelectItem>
                        <SelectItem value="40">40 Questions</SelectItem>
                        <SelectItem value="100">Full Paper (100)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        {/* Tags Filter (Practice Only) */}
        {isPracticeMode && (
             <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><Tag className="w-3 h-3"/> Focus Topics (Optional)</label>
                <MultiSelect 
                    options={availableTags} 
                    selected={selectedTags} 
                    onChange={setSelectedTags} 
                    placeholder="Select topics to focus on..." 
                    className="h-11 bg-slate-50"
                />
             </div>
        )}

        {/* Step 5: Mode Selection */}
        <div className="space-y-3 pt-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                5. Select Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div 
                    onClick={() => setIsPracticeMode(true)}
                    className={cn(
                        "relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:bg-orange-50/50",
                        isPracticeMode ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white"
                    )}
                >
                    {isPracticeMode && <div className="absolute top-3 right-3 text-orange-600"><CheckCircle2 className="w-5 h-5" /></div>}
                    <div className="flex items-center gap-3 mb-2">
                        <div className={cn("p-2 rounded-full", isPracticeMode ? "bg-orange-200 text-orange-700" : "bg-slate-100 text-slate-500")}>
                            <Zap className="w-5 h-5" />
                        </div>
                        <span className={cn("font-bold", isPracticeMode ? "text-orange-900" : "text-slate-700")}>Practice</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Untimed. Instant answers. Theory Grading with AI.
                    </p>
                </div>

                <div 
                    onClick={() => setIsPracticeMode(false)}
                    className={cn(
                        "relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:bg-blue-50/50",
                        !isPracticeMode ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"
                    )}
                >
                    {!isPracticeMode && <div className="absolute top-3 right-3 text-blue-600"><CheckCircle2 className="w-5 h-5" /></div>}
                    <div className="flex items-center gap-3 mb-2">
                             <div className={cn("p-2 rounded-full", !isPracticeMode ? "bg-blue-200 text-blue-700" : "bg-slate-100 text-slate-500")}>
                                <Clock className="w-5 h-5" />
                            </div>
                            <span className={cn("font-bold", !isPracticeMode ? "text-blue-900" : "text-slate-700")}>Simulation</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Timed (45m). No hints. Simulates the real exam environment.
                        </p>
                    </div>
                </div>
            </div>
        
        <Button
          size="lg"
          className="w-full text-base font-semibold py-6 mt-4"
          disabled={!selectedExam || !selectedSubject || !selectedYear}
          onClick={handleStartExam}
        >
          Start {isPracticeMode ? 'Practice Session' : 'Exam Simulation'}
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
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