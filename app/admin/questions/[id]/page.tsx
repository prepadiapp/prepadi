'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Exam, Subject, QuestionType } from '@prisma/client';
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
import { AlertCircle, ArrowLeft, Loader2, Plus, Trash2, Sparkles } from 'lucide-react';
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

function QuestionEditorContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const id = params.id as string;
  const isEditMode = id !== 'new';

  // Context Params (from Paper Manager)
  const contextPaperId = searchParams.get('paperId');
  const contextExamId = searchParams.get('examId');
  const contextSubjectId = searchParams.get('subjectId');
  const contextYear = searchParams.get('year');
  const contextType = searchParams.get('type');

  const [filterData, setFilterData] = useState<FilterData>({ exams: [], subjects: [] });
  
  // --- Form State ---
  const [text, setText] = useState('');
  const [explanation, setExplanation] = useState('');
  // Initialize with Context or Default
  const [year, setYear] = useState<number>(contextYear ? Number(contextYear) : new Date().getFullYear());
  const [subjectId, setSubjectId] = useState(contextSubjectId || '');
  const [examId, setExamId] = useState(contextExamId || '');
  
  const [tags, setTags] = useState<string[]>([]);
  const [section, setSection] = useState('');
  const [qType, setQType] = useState<QuestionType>((contextType as QuestionType) || QuestionType.OBJECTIVE);
  const [markingGuide, setMarkingGuide] = useState('');
  const [parsingImage, setParsingImage] = useState(false);

  const [options, setOptions] = useState<FormOption[]>([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Fetch Data ---
  useEffect(() => {
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

    const fetchQuestionData = async () => {
      if (!isEditMode) return;
      
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/questions/${id}`);
        if (!res.ok) throw new Error('Failed to fetch question data');
        const question = await res.json();
        
        setText(question.text);
        setExplanation(question.explanation || '');
        setYear(question.year);
        setSubjectId(question.subjectId);
        setExamId(question.examId);
        setTags(question.tags?.map((t: any) => (typeof t === 'string' ? t : t.name)) || []);
        setSection(question.section?.instruction || ''); 
        setQType(question.type as QuestionType);
        setMarkingGuide(question.markingGuide || '');

        if (question.options && question.options.length > 0) {
          setOptions(question.options.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            isCorrect: opt.isCorrect,
          })));
        } else if (question.type === 'THEORY') {
           setOptions([]);
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFilterData();
    fetchQuestionData();
  }, [id, isEditMode]);

  // --- Handlers ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const base64 = reader.result as string;
        setParsingImage(true);
        try {
            const res = await fetch('/api/admin/questions/parse-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 })
            });

            if(!res.ok) throw new Error("Failed to parse image");
            const data = await res.json();
            
            setText(data.text);
            if (data.type) setQType(data.type);
            if (data.explanation) setExplanation(data.explanation);
            if (data.markingGuide) setMarkingGuide(data.markingGuide);
            if (data.tags && Array.isArray(data.tags)) setTags(data.tags);
            
            if (data.options && Array.isArray(data.options) && data.options.length > 0) {
                setOptions(data.options);
            }
            toast.success("Question extracted by AI!");
        } catch (err) {
            toast.error("Could not process image.");
        } finally {
            setParsingImage(false);
        }
    };
  };

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
      if (!newOptions.some(opt => opt.isCorrect)) newOptions[0].isCorrect = true;
      setOptions(newOptions);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const apiPath = isEditMode ? `/api/admin/questions/${id}` : '/api/admin/questions';
    const method = isEditMode ? 'PATCH' : 'POST';
    const optionsToSend = qType === QuestionType.OBJECTIVE ? options : [];

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
          options: optionsToSend,
          tags,
          type: qType,
          section,
          markingGuide,
          paperId: contextPaperId // Link to paper if context exists
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save question');
      }

      toast.success(`Question ${isEditMode ? 'updated' : 'created'} successfully!`);
      router.back(); // Go back to Paper Manager or Question List

    } catch (err: any) {
      toast.error(err.message);
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;
  if (error) return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;

  // CONDITIONAL RENDERING: Hide Inputs if Context Exists
  const isContextFixed = !!contextPaperId || !!contextExamId;

  return (
    <section className="space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold">
            {isEditMode ? 'Edit Question' : 'Add New Question'}
          </h1>
        </div>

        {/* AI Card */}
        <Card className="bg-indigo-50 border-indigo-100">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-indigo-700">
                    <Sparkles className="w-5 h-5" /> Gemini Auto-Fill
                </CardTitle>
                <CardDescription>Upload an image to auto-fill this form.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={parsingImage} className="bg-white max-w-sm" />
                    {parsingImage && <span className="text-sm text-indigo-600 animate-pulse flex items-center gap-2">Analyzing...</span>}
                </div>
            </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Question Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Context Fields - Hidden if Fixed, Visible if Standard */}
              {!isContextFixed ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Exam</Label>
                      <Select value={examId} onValueChange={setExamId} required>
                        <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                        <SelectContent>{filterData.exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select value={subjectId} onValueChange={setSubjectId} required>
                        <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                        <SelectContent>{filterData.subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} required />
                    </div>
                  </div>
              ) : (
                  <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                      <AlertCircle className="w-4 h-4"/>
                      <AlertDescription>
                          Adding to <strong>{filterData.exams.find(e => e.id === examId)?.name} {filterData.subjects.find(s => s.id === subjectId)?.name} {year}</strong>
                      </AlertDescription>
                  </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select value={qType} onValueChange={(val) => setQType(val as QuestionType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={QuestionType.OBJECTIVE}>Objective</SelectItem>
                      <SelectItem value={QuestionType.THEORY}>Theory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section (Optional)</Label>
                  <Input value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g., Section A" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Question Text</Label>
                <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} required />
              </div>

              {qType === QuestionType.OBJECTIVE ? (
                <div className="space-y-2">
                  <Label>Options</Label>
                  <RadioGroup value={String(options.findIndex(o => o.isCorrect))} onValueChange={(idx) => handleCorrectAnswerChange(Number(idx))} className="space-y-3">
                    {options.map((opt, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <RadioGroupItem value={String(index)} id={`opt-${index}`} />
                        <Input value={opt.text} onChange={(e) => handleOptionTextChange(index, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + index)}`} required className="flex-1" />
                        {options.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>}
                      </div>
                    ))}
                  </RadioGroup>
                  {options.length < 5 && <Button type="button" variant="outline" size="sm" onClick={addOption}><Plus className="w-4 h-4 mr-2" />Add Option</Button>}
                </div>
              ) : (
                <div className="space-y-2">
                    <Label>Marking Guide (AI)</Label>
                    <Textarea value={markingGuide} onChange={(e) => setMarkingGuide(e.target.value)} rows={4} placeholder="Key points for grading..." />
                </div>
              )}

              <div className="space-y-2">
                <Label>Tags</Label>
                <TagInput value={tags} onChange={setTags} />
              </div>

              <div className="space-y-2">
                <Label>Explanation (Optional)</Label>
                <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 mt-6">
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Question</Button>
          </div>
        </form>
    </section>
  );
}

export default function QuestionEditorPage() {
    return <Suspense fallback={<div className="p-10 text-center">Loading...</div>}><QuestionEditorContent /></Suspense>;
}