'use client';

import { Exam, Subject } from '@prisma/client';
import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, Clock, Zap, Tag, RotateCcw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/admin/MultiSelect'; 

interface ExamSelectorProps {
  exams: Exam[];
}

function ExamSelectorContent({ exams }: ExamSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isPracticeMode, setIsPracticeMode] = useState(
    searchParams.get('mode') === 'exam' ? false : true
  );

  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>(''); // "" means not selected

  // --- New Filters ---
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState('20'); // Default for tag mode

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [availableTags, setAvailableTags] = useState<{value: string, label: string}[]>([]);

  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingYears, setIsLoadingYears] = useState(false);

  // Load Subjects on Mount
  useEffect(() => {
    setIsLoadingSubjects(true);
    fetch('/api/subjects')
      .then((res) => res.json())
      .then((data) => setSubjects(data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoadingSubjects(false));

    // Fetch Tags (Public Endpoint)
    fetch('/api/tags')
       .then(res => res.json())
       .then(data => setAvailableTags(data.map((t:any) => ({ value: t.name, label: t.name }))))
       .catch(e => console.error("Tags error", e));
  }, []);

  // When Exam/Subject changes, load Years (if applicable)
  useEffect(() => {
    if (selectedExam && selectedSubject !== 'all') {
      setIsLoadingYears(true);
      setYears([]);
      
      // Only fetch years if we are in "Standard Mode" (No tags yet)
      // or to populate the dropdown just in case
      fetch(`/api/years?examId=${selectedExam.id}&subjectId=${selectedSubject}`)
        .then((res) => res.json())
        .then((data) => setYears(data))
        .catch((err) => console.error(err))
        .finally(() => setIsLoadingYears(false));
    }
  }, [selectedSubject, selectedExam]);
  
  const handleStartExam = () => {
    if (!selectedExam) return;
    
    const examSlug = selectedExam.shortName.toLowerCase();
    const subjectSlug = selectedSubject === 'all' 
        ? 'all' 
        : subjects.find(s => s.id === selectedSubject)?.name.toLowerCase().replace(/\s+/g, '-') || 'all';
    
    // Logic: If tags are selected, Year is "random". If no tags, Year must be selected.
    const yearSlug = selectedTags.length > 0 ? 'random' : selectedYear;

    if (!yearSlug) return; // Validation
    
    const mode = isPracticeMode ? 'practice' : 'exam';
    
    // Build Query String
    const params = new URLSearchParams();
    params.set('mode', mode);
    
    // Only pass limit if we are in Tag mode (Random Year)
    if (selectedTags.length > 0) {
        params.set('limit', questionCount);
        params.set('tags', selectedTags.join(','));
    }

    router.push(`/quiz/${examSlug}/${subjectSlug}/${yearSlug}?${params.toString()}`);
  };

  const isTagMode = selectedTags.length > 0;

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
                        <SelectItem value="all">All Subjects (Random)</SelectItem>
                        {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>

        {/* Row 2: Standard Flow (Year & Mode) - VISIBLE IF TAGS NOT SELECTED */}
        {!isTagMode && (
            <div className="grid md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        3. Choose Year
                    </label>
                    <Select onValueChange={setSelectedYear} disabled={selectedSubject === 'all'}>
                        <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
                            <SelectValue placeholder={selectedSubject === 'all' ? "Select a Subject first" : "Select Year"} />
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
        )}

        {/* Row 3: Tag Mode Override */}
        {isTagMode && (
             <div className="grid md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                        Question Count
                    </label>
                    <Select value={questionCount} onValueChange={setQuestionCount}>
                        <SelectTrigger className="h-11 bg-blue-50 border-blue-200 text-blue-900">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">5 Questions</SelectItem>
                            <SelectItem value="10">10 Questions</SelectItem>
                            <SelectItem value="20">20 Questions</SelectItem>
                            <SelectItem value="40">40 Questions</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                        Mode
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
        )}

        {/* Divider / Topic Input */}
        <div className="relative pt-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center">
                <span className="bg-white px-2 text-xs text-muted-foreground uppercase tracking-widest">
                    OR
                </span>
            </div>
        </div>

        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Tag className="w-3 h-3"/> Filter by Topic (Random Year)
                </label>
                {isTagMode && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedTags([])} 
                        className="h-6 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 px-2"
                    >
                        <RotateCcw className="w-3 h-3 mr-1" /> Reset to Year Mode
                    </Button>
                )}
            </div>
            <MultiSelect 
                options={availableTags} 
                selected={selectedTags} 
                onChange={setSelectedTags} 
                placeholder="Search topics (e.g. Algebra, Motion)..." 
                className={cn("h-11", isTagMode ? "bg-blue-50 border-blue-200" : "bg-slate-50")}
            />
            {!isTagMode && (
                <p className="text-[10px] text-muted-foreground">
                    Selecting a topic will switch to Random Year mode.
                </p>
            )}
        </div>

        <Button
          size="lg"
          className="w-full text-base font-semibold py-6 mt-4"
          disabled={!selectedExam || (!isTagMode && !selectedYear)}
          onClick={handleStartExam}
        >
          Start Session <ChevronRight className="w-5 h-5 ml-2" />
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