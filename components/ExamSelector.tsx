'use client';

import { Exam, Subject } from '@prisma/client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Calendar, ChevronRight, Loader2, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ExamSelectorProps {
  exams: Exam[];
}

// Define the steps for our multi-step flow
type SelectionStep = 'exam' | 'subject' | 'year';

export function ExamSelector({ exams }: ExamSelectorProps) {
  const router = useRouter();

  // State for the selection flow
  const [step, setStep] = useState<SelectionStep>('exam');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // State for loading data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingYears, setIsLoadingYears] = useState(true);

  // Fetch subjects when an exam is selected
  useEffect(() => {
    setIsLoadingSubjects(true);
    // Fetch all subjects without any examId
    fetch('/api/subjects')
      .then((res) => res.json())
      .then((data) => {
        setSubjects(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoadingSubjects(false));
  }, []); // Empty array means this runs ONCE on mount


  useEffect(() => {
    if (selectedExam) {
      // Just reset the selections, don't re-fetch subjects
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

      fetch(`/api/years?examId=${selectedExam.id}&subjectId=${selectedSubject.id}`)
        .then((res) => {
          if (!res.ok) {
            // If the response is not 200, throw an error
            throw new Error(`API failed with status ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setYears(data);
          setStep('year');
        })
        .catch((err) => {
         
          console.error("Failed to fetch years:", err);
          
          setStep('year');
        })
        .finally(() => setIsLoadingYears(false));
    }
  }, [selectedSubject, selectedExam]);
  
  
  const handleStartExam = () => {
    if (!selectedExam || !selectedSubject || !selectedYear) return;
    
    const examSlug = selectedExam.shortName.toLowerCase();
    const subjectSlug = selectedSubject.name.toLowerCase().replace(/\s+/g, '-');
    
    router.push(`/quiz/${examSlug}/${subjectSlug}/${selectedYear}`);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Start a New Exam</CardTitle>
        <CardDescription>
          Select your exam, subject, and year to begin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* --- Step 1: Select Exam --- */}
        <div className="space-y-3">
          <label className="flex items-center text-lg font-semibold">
            <Target className="w-5 h-5 mr-2 text-blue-500" />
            1. Choose Exam
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {exams.map((exam) => (
              <Button
                key={exam.id}
                variant={selectedExam?.id === exam.id ? 'default' : 'outline'}
                className="h-auto py-4"
                onClick={() => setSelectedExam(exam)}
              >
                <span className="text-md font-medium">{exam.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* --- Step 2: Select Subject --- */}
        {(step === 'subject' || step === 'year') && (
          <div className="space-y-3 p-4 bg-secondary/30 rounded-lg">
            <label className="flex items-center text-lg font-semibold">
              <BookOpen className="w-5 h-5 mr-2 text-green-500" />
              2. Choose Subject
            </label>
            {isLoading && !subjects.length ? (
              <div className="flex items-center text-muted-foreground">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading subjects...
              </div>
            ) : (
              <Select
                onValueChange={(value) => {
                  setSelectedSubject(subjects.find(s => s.id === value) || null);
                }}
                disabled={!subjects.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder={subjects.length ? "Select a subject..." : "No subjects found for this exam"} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* --- Step 3: Select Year --- */}
        {step === 'year' && (
          <div className="space-y-3 p-4 bg-secondary/30 rounded-lg">
            <label className="flex items-center text-lg font-semibold">
              <Calendar className="w-5 h-5 mr-2 text-purple-500" />
              3. Choose Year
            </label>
            {isLoading && !years.length ? (
              <div className="flex items-center text-muted-foreground">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading years...
              </div>
            ) : (
              <Select
                onValueChange={(value) => setSelectedYear(Number(value))}
                disabled={!years.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder={years.length ? "Select a year..." : "No questions found for this subject"} />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
        
        {/* --- Final "Start" Button --- */}
        <Button
          size="lg"
          className="w-full text-lg"
          disabled={!selectedExam || !selectedSubject || !selectedYear}
          onClick={handleStartExam}
        >
          Start Exam
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}