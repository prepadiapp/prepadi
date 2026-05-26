'use client';

import { Subject } from '@prisma/client';
import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, Clock, Zap, Download, Loader2, FileText, CalendarDays, Sparkles, Tags } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { saveExamForOffline } from '@/lib/offline-storage';
import { toast } from 'sonner';
import { MultiSelect } from '@/components/admin/MultiSelect';
import { Switch } from '@/components/ui/switch';

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
  const [useFocusedTopics, setUseFocusedTopics] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [paperChoices, setPaperChoices] = useState<Array<{ id: string; title: string; questionCount: number; duration?: number | null }>>([]);
  const [topicOptions, setTopicOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionLimit, setQuestionLimit] = useState('20');

  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingYears, setIsLoadingYears] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [subjectLoadError, setSubjectLoadError] = useState<string>('');
  const [availabilityError, setAvailabilityError] = useState<string>('');

  useEffect(() => {
    if (!selectedExam) {
      setSubjects([]);
      setSelectedSubject('');
      setYears([]);
      setSelectedYear('');
      setPaperChoices([]);
      setSelectedPaperId('');
      setTopicOptions([]);
      setSelectedTopics([]);
      setUseFocusedTopics(false);
      setSubjectLoadError('');
      setAvailabilityError('');
      return;
    }

    setIsLoadingSubjects(true);
    setSubjectLoadError('');
    setAvailabilityError('');
    setSubjects([]);
    setSelectedSubject('');
    setYears([]);
    setSelectedYear('');
    setPaperChoices([]);
    setSelectedPaperId('');
    setTopicOptions([]);
    setSelectedTopics([]);
    setUseFocusedTopics(false);

    fetch(`/api/practice/availability?examId=${selectedExam.id}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await res.text());
        }
        return res.json();
      })
      .then((data) => {
        const nextSubjects = Array.isArray(data.subjects) ? data.subjects : [];
        setSubjects(nextSubjects);
        if (nextSubjects.length === 0) {
          setSubjectLoadError('No accessible subjects were found for this exam yet.');
        }
      })
      .catch((err) => {
        console.error(err);
        setSubjectLoadError('We could not load subjects for this exam right now.');
      })
      .finally(() => setIsLoadingSubjects(false));
  }, [selectedExam]);

  useEffect(() => {
    if (selectedExam && selectedSubject) {
      setIsLoadingYears(true);
      setAvailabilityError('');
      setYears([]);
      setSelectedYear('');
      setPaperChoices([]);
      setSelectedPaperId('');
      setTopicOptions([]);
      setSelectedTopics([]);
      setUseFocusedTopics(false);

      fetch(`/api/practice/availability?examId=${selectedExam.id}&subjectId=${selectedSubject}`)
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(await res.text());
          }
          return res.json();
        })
        .then((data) => {
          setYears(data.years || []);
          setPaperChoices(data.papers || []);
          setTopicOptions((data.topics || []).map((topic: { value: string; label: string }) => ({
            value: topic.value,
            label: topic.label,
          })));
          if ((selectedExam.isYearBased === false && (data.papers || []).length === 0) || (selectedExam.isYearBased !== false && (data.years || []).length === 0)) {
            setAvailabilityError('No published practice options are available for this subject yet.');
          }
        })
        .catch((err) => {
          console.error(err);
          setAvailabilityError('We could not load this subject’s practice options right now.');
        })
        .finally(() => setIsLoadingYears(false));
    } else {
      setYears([]);
      setSelectedYear('');
      setPaperChoices([]);
      setSelectedPaperId('');
      setTopicOptions([]);
      setSelectedTopics([]);
      setUseFocusedTopics(false);
      setAvailabilityError('');
    }
  }, [selectedSubject, selectedExam]);

  useEffect(() => {
    if (!selectedExam || !selectedSubject || selectedExam.isYearBased === false) {
      return;
    }

    const params = new URLSearchParams({
      examId: selectedExam.id,
      subjectId: selectedSubject,
    });

    if (selectedYear) {
      params.set('year', selectedYear);
    }

    fetch(`/api/practice/availability?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await res.text());
        }
        return res.json();
      })
      .then((data) => {
        setTopicOptions((data.topics || []).map((topic: { value: string; label: string }) => ({
          value: topic.value,
          label: topic.label,
        })));
        setSelectedTopics((current) => current.filter((topic) => (data.topics || []).some((item: { value: string }) => item.value === topic)));
      })
      .catch((err) => console.error(err));
  }, [selectedExam, selectedSubject, selectedYear]);

  useEffect(() => {
    if (!isPracticeMode && useFocusedTopics) {
      setUseFocusedTopics(false);
      setSelectedTopics([]);
    }
  }, [isPracticeMode, useFocusedTopics]);
  
  const handleStartExam = () => {
    if (!selectedExam || !selectedSubject) return;

    const mode = isPracticeMode ? 'practice' : 'exam';
    const params = new URLSearchParams();
    params.set('mode', mode);

    if (isPracticeMode && selectedTopics.length > 0) {
      const examSlug = selectedExam.shortName.toLowerCase();
      const subjectSlug = subjects.find(s => s.id === selectedSubject)?.name.toLowerCase().replace(/\s+/g, '-') || '';
      params.set('tags', selectedTopics.join(','));
      params.set('limit', questionLimit);
      router.push(`/quiz/${examSlug}/${subjectSlug}/${selectedYear || 'random'}?${params.toString()}`);
      return;
    }

    if (selectedExam.isYearBased === false) {
      if (!selectedPaperId) return;
      router.push(`/quiz/paper/${selectedPaperId}?${params.toString()}`);
      return;
    }

    if (!selectedYear) return;
    
    const examSlug = selectedExam.shortName.toLowerCase();
    const subjectSlug = subjects.find(s => s.id === selectedSubject)?.name.toLowerCase().replace(/\s+/g, '-') || '';
    
    router.push(`/quiz/${examSlug}/${subjectSlug}/${selectedYear}?${params.toString()}`);
  };

  const handleDownload = async () => {
    if (!selectedExam || !selectedSubject) return;
    if (selectedExam.isYearBased !== false && !selectedYear) return;
    if (selectedExam.isYearBased === false && !selectedPaperId) return;
    if (selectedTopics.length > 0) {
      toast.info('Offline save is available for full papers right now, not topic-based random sets.');
      return;
    }

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
  const isTopicPractice = isPracticeMode && useFocusedTopics && selectedTopics.length > 0;
  const canStart =
    !!selectedExam &&
    !!selectedSubject &&
    (isTopicPractice || (isYearBased ? !!selectedYear : !!selectedPaperId));
  const canDownload = canStart && !isTopicPractice; 
  const subjectPlaceholder = !selectedExam
    ? 'Select Exam first'
    : isLoadingSubjects
      ? 'Loading subjects...'
      : subjects.length === 0
        ? 'No subjects available'
        : 'Select Subject';
  const topicPracticeAvailable = !!selectedSubject && topicOptions.length > 0;

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
                <Select onValueChange={setSelectedSubject} value={selectedSubject} disabled={!selectedExam || isLoadingSubjects || subjects.length === 0}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
                        <SelectValue placeholder={subjectPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                {subjectLoadError && (
                  <p className="text-xs text-amber-700">{subjectLoadError}</p>
                )}
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
              {availabilityError && (
                <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {availabilityError}
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
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 text-blue-700" />
            <div className="space-y-3 flex-1">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Focused topic practice <span className="font-normal text-slate-500">(optional)</span></p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Leave this off to follow the normal full-paper route. Turn it on only when you want a random set from selected topics.
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2">
                  <span className="text-xs font-medium text-slate-700">Use focused topics</span>
                  <Switch
                    checked={useFocusedTopics}
                    onCheckedChange={(checked) => {
                      setUseFocusedTopics(checked);
                      if (!checked) {
                        setSelectedTopics([]);
                      }
                    }}
                    disabled={!isPracticeMode || !selectedSubject || topicOptions.length === 0}
                  />
                </div>
              </div>
              {!isPracticeMode && (
                <p className="text-xs text-slate-500">
                  Focused topics are available in Practice mode only.
                </p>
              )}
              {isPracticeMode && selectedSubject && !topicPracticeAvailable && (
                <p className="text-xs text-slate-500">
                  No tagged topics are available for this selection yet, so the normal paper flow is the available route right now.
                </p>
              )}
              {useFocusedTopics && (
                <>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Build by topic</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Pick one or more topics to build a random practice set from seeded published questions already available to you.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[1.6fr_0.8fr]">
                    <div className="space-y-2">
                      <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <Tags className="h-3.5 w-3.5" /> Topics
                      </label>
                      <MultiSelect
                        options={topicOptions}
                        selected={selectedTopics}
                        onChange={setSelectedTopics}
                        placeholder={!selectedSubject ? 'Select a subject first' : topicOptions.length === 0 ? 'No tagged topics yet' : 'Choose topics'}
                        className="min-h-11 bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Question count
                      </label>
                      <Select value={questionLimit} onValueChange={setQuestionLimit}>
                        <SelectTrigger className="h-11 bg-white border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 questions</SelectItem>
                          <SelectItem value="20">20 questions</SelectItem>
                          <SelectItem value="30">30 questions</SelectItem>
                          <SelectItem value="40">40 questions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
              {isTopicPractice && (
                <p className="text-xs text-blue-700">
                  Starting now will build a random seeded set from the selected topics{selectedYear ? ` within ${selectedYear}` : ' across your available years'}.
                </p>
              )}
            </div>
          </div>
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
