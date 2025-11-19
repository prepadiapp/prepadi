'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Exam, Subject } from '@/lib/generated/prisma/client'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TagInput } from '@/components/admin/TagInput';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import Link from 'next/link';


type FormOption = {
  id?: string;
  text: string;
  isCorrect: boolean;
};

type FilterData = {
  exams: Exam[];
  subjects: Subject[];
};

export default function QuestionEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditMode = id !== 'new';


  const [filterData, setFilterData] = useState<FilterData>({ exams: [], subjects: [] });
  

  const [text, setText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [subjectId, setSubjectId] = useState('');
  const [examId, setExamId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [options, setOptions] = useState<FormOption[]>([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Fetch Data for Edit Mode and Filters ---
  useEffect(() => {
    // 1. Fetch filter data (Exams, Subjects)
    const fetchFilterData = async () => {
      try {
        const [examsRes, subjectsRes] = await Promise.all([
          fetch('/api/admin/exams'),
          fetch('/api/admin/subjects'),
        ]);
        if (!examsRes.ok || !subjectsRes.ok) throw new Error('Failed to load form data');
        const [exams, subjects] = await Promise.all([examsRes.json(), subjectsRes.json()]);
        setFilterData({ exams, subjects });
      } catch (err: any) {
        setError(err.message);
      }
    };

    // 2. Fetch question data if in Edit Mode
    const fetchQuestionData = async () => {
      if (!isEditMode) return;
      
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/questions/${id}`);
        if (!res.ok) throw new Error('Failed to fetch question data');
        const question = await res.json();
        
        // Populate the form
        setText(question.text);
        setExplanation(question.explanation || '');
        setYear(question.year);
        setSubjectId(question.subjectId);
        setExamId(question.examId);
        setTags(question.tags); // API returns tags as string[]
        setOptions(question.options.map((opt: any) => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
        })));

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFilterData();
    fetchQuestionData();
  }, [id, isEditMode]);

  const handleOptionTextChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index].text = value;
    setOptions(newOptions);
  };

  const handleCorrectAnswerChange = (index: number) => {
    const newOptions = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 5) {
      setOptions([...options, { text: '', isCorrect: false }]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = [...options];
      newOptions.splice(index, 1);
      // If we deleted the correct answer, make the first one correct
      if (!newOptions.some(opt => opt.isCorrect)) {
        newOptions[0].isCorrect = true;
      }
      setOptions(newOptions);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const apiPath = isEditMode
      ? `/api/admin/questions/${id}`
      : '/api/admin/questions'; // Create
    
    const method = isEditMode ? 'PATCH' : 'POST';

    try {
      const response = await fetch(apiPath, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          explanation,
          year,
          subjectId,
          examId,
          options,
          tags,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save question');
      }

      toast.success(`Question ${isEditMode ? 'updated' : 'created'} successfully!`);
      router.push('/admin/questions'); // Redirect to list

    } catch (err: any) {
      toast.error(err.message);
      setSubmitting(false);
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
      <section className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/admin/questions">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">
            {isEditMode ? 'Edit Question' : 'Add New Question'}
          </h1>
        </div>

        {/* Editor Form Card */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Question Details</CardTitle>
              <CardDescription>
                Fill out the details for this question.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Row 1: Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exam">Exam</Label>
                  <Select value={examId} onValueChange={setExamId} required>
                    <SelectTrigger id="exam">
                      <SelectValue placeholder="Select an exam..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filterData.exams.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={subjectId} onValueChange={setSubjectId} required>
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="Select a subject..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filterData.subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    placeholder="e.g., 2023"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Question Text */}
              <div className="space-y-2">
                <Label htmlFor="text">Question Text</Label>
                <Textarea
                  id="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type the full question text here..."
                  rows={5}
                  required
                />
              </div>

              {/* Row 3: Options */}
              <div className="space-y-2">
                <Label>Options</Label>
                <RadioGroup
                  value={String(options.findIndex(o => o.isCorrect))}
                  onValueChange={(index) => handleCorrectAnswerChange(Number(index))}
                  className="space-y-3"
                >
                  {options.map((opt, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <RadioGroupItem value={String(index)} id={`opt-${index}`} />
                      <Input
                        value={opt.text}
                        onChange={(e) => handleOptionTextChange(index, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        required
                        className="flex-1"
                      />
                      {options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOption(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                </RadioGroup>
                {options.length < 5 && (
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Option
                  </Button>
                )}
              </div>

              {/* Row 4: Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <TagInput
                  value={tags}
                  onChange={setTags}
                  placeholder="e.g., trigonometry, algebra..."
                />
              </div>

              {/* Row 5: Explanation */}
              <div className="space-y-2">
                <Label htmlFor="explanation">Explanation (Optional)</Label>
                <Textarea
                  id="explanation"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explain why the correct answer is right..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-6">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Question
            </Button>
          </div>
        </form>
      </section>
    </>
  );
}