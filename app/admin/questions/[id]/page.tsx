'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { AlertCircle, ArrowLeft, Loader2, Plus, Trash2, Sparkles, Upload } from 'lucide-react';
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
  
  // --- Form State ---
  const [text, setText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [subjectId, setSubjectId] = useState('');
  const [examId, setExamId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  // --- NEW STATE (AI & Theory) ---
  const [section, setSection] = useState('');
  const [qType, setQType] = useState<QuestionType>(QuestionType.OBJECTIVE);
  const [markingGuide, setMarkingGuide] = useState(''); // For Theory
  const [parsingImage, setParsingImage] = useState(false); // AI Loading State

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
        setTags(question.tags);
        
        // Populate New Fields
        setSection(question.section || ''); 
        setQType(question.type as QuestionType);
        setMarkingGuide(question.markingGuide || '');

        if (question.options && question.options.length > 0) {
          setOptions(question.options.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            isCorrect: opt.isCorrect,
          })));
        } else {
          // Reset options if loading a Theory question
          setOptions([
            { text: '', isCorrect: true },
            { text: '', isCorrect: false },
          ]);
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

  // --- AI Image Parser Handler ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to Base64
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
            
            // Auto-fill fields from AI response
            setText(data.text);
            if (data.type) setQType(data.type);
            if (data.explanation) setExplanation(data.explanation);
            if (data.markingGuide) setMarkingGuide(data.markingGuide);
            
            // Only update options if AI found valid ones
            if (data.options && Array.isArray(data.options) && data.options.length > 0) {
                setOptions(data.options);
            }
            
            toast.success("Question extracted by AI!");
        } catch (err) {
            toast.error("Could not process image. Try entering manually.");
        } finally {
            setParsingImage(false);
        }
    };
  };

  // --- Handlers ---
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
      : '/api/admin/questions';
    
    const method = isEditMode ? 'PATCH' : 'POST';

    // Only send options if Objective. If Theory, send empty array to avoid validation errors.
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
          markingGuide // <-- Include marking guide for Theory
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save question');
      }

      toast.success(`Question ${isEditMode ? 'updated' : 'created'} successfully!`);
      router.push('/admin/questions');

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
      <section className="space-y-6 pb-20">
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

        {/* AI Auto-Fill Card */}
        <Card className="bg-indigo-50 border-indigo-100">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-indigo-700">
                    <Sparkles className="w-5 h-5" /> AI Auto-Fill
                </CardTitle>
                <CardDescription>Upload an image of a question (diagrams supported) to auto-fill this form.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={parsingImage} className="bg-white max-w-sm" />
                    {parsingImage && <span className="text-sm text-indigo-600 animate-pulse flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Analyzing...</span>}
                </div>
            </CardContent>
        </Card>

        {/* Question Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Question Details</CardTitle>
              <CardDescription>Fill out the details for this question.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exam">Exam</Label>
                  <Select value={examId} onValueChange={setExamId} required>
                    <SelectTrigger id="exam">
                      <SelectValue placeholder="Select exam" />
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
                      <SelectValue placeholder="Select subject" />
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
                  <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} placeholder="2023" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select value={qType} onValueChange={(val) => setQType(val as QuestionType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={QuestionType.OBJECTIVE}>Objective (Multiple Choice)</SelectItem>
                      <SelectItem value={QuestionType.THEORY}>Theory (Essay)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section (Optional)</Label>
                  <Input value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g., Section A" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="text">Question Text</Label>
                <Textarea id="text" value={text} onChange={(e) => setText(e.target.value)} rows={5} required />
              </div>

              {/* Conditional Options or Marking Guide */}
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
                <div className="space-y-2 p-4 bg-yellow-50 border border-yellow-100 rounded-md">
                    <Label className="text-yellow-800">AI Marking Guide / Correct Answer</Label>
                    <p className="text-xs text-muted-foreground mb-2">Provide keywords, key points, or the full answer. The AI uses this to grade student answers.</p>
                    <Textarea 
                      value={markingGuide} 
                      onChange={(e) => setMarkingGuide(e.target.value)} 
                      placeholder="e.g., Key points: osmosis, semi-permeable membrane..." 
                      rows={4} 
                      className="bg-white"
                    />
                </div>
              )}

              <div className="space-y-2">
                <Label>Tags</Label>
                <TagInput value={tags} onChange={setTags} placeholder="e.g., trigonometry, algebra..." />
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
    </>
  );
}