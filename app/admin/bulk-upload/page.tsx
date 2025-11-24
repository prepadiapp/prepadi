'use client';

import { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { parseBulkText, ParsedQuestion } from '@/lib/parser';
import { TagInput } from '@/components/admin/TagInput'; 
import { QuestionType } from '@/lib/generated/prisma/enums'; 
import { Exam, Subject } from '@/lib/generated/prisma/client'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, UploadCloud, FileText, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function BulkUploadPage() {
  const router = useRouter();
  
  // --- State ---
  const [step, setStep] = useState<1 | 2>(1); // 1 = Input, 2 = Review
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Config Data
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Selection
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Content
  const [rawText, setRawText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);

  // --- Fetch Config Data ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const [examsRes, subjectsRes] = await Promise.all([
          fetch('/api/admin/exams'),
          fetch('/api/admin/subjects'),
        ]);
        if (examsRes.ok && subjectsRes.ok) {
          setExams(await examsRes.json());
          setSubjects(await subjectsRes.json());
        }
      } catch (error) {
        toast.error("Failed to load exams/subjects.");
      }
    };
    loadData();
  }, []);

  // --- Handlers ---

  // 1. Handle File Upload (DOCX)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setRawText(result.value);
      toast.success('File text extracted successfully!');
    } catch (err) {
      toast.error('Failed to read file. Make sure it is a valid .docx');
    } finally {
      setProcessing(false);
    }
  };

  // 2. Process Text -> Questions
  const handleProcess = () => {
    if (!selectedExam || !selectedSubject || !selectedYear) {
      toast.error('Please select Exam, Subject, and Year first.');
      return;
    }
    if (!rawText.trim()) {
      toast.error('Please enter text or upload a file.');
      return;
    }

    setProcessing(true);
    
    try {
      // Use our parser utility
      const questions = parseBulkText(rawText);
      
      if (questions.length === 0) {
        toast.error('Could not find any questions. Please check the format.');
        return;
      }

      setParsedQuestions(questions);
      setStep(2); // Move to Review Step
    } catch (error) {
      console.error(error);
      toast.error("Error parsing questions.");
    } finally {
      setProcessing(false);
    }
  };

  // 3. Update a parsed question (in Review step)
  const updateQuestion = (index: number, field: keyof ParsedQuestion, value: any) => {
    const updated = [...parsedQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setParsedQuestions(updated);
  };

  // 4. Delete a parsed question
  const deleteQuestion = (index: number) => {
    setParsedQuestions(parsedQuestions.filter((_, i) => i !== index));
  };

  // 5. Final Upload
  const handleUpload = async () => {
    setLoading(true);
    try {
      // Transform to the format the API expects
      const payload = parsedQuestions.map(q => ({
        text: q.text,
        explanation: q.explanation,
        year: selectedYear,
        dbExamId: selectedExam,
        dbSubjectId: selectedSubject,
        type: q.type,
        sectionName: q.section,
        options: q.options,
        tags: q.tags,
      }));

      const res = await fetch('/api/admin/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: payload }),
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      toast.success(`Successfully uploaded ${data.count} questions!`);
      router.push('/admin/questions'); // Go to list
    } catch (err) {
      toast.error('Failed to upload questions.');
    } finally {
      setLoading(false);
    }
  };

  // --- Render ---
  return (
    <section className="space-y-6 pb-20">
      <Toaster richColors />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Bulk Upload</h1>
        {step === 2 && (
          <Button variant="outline" onClick={() => setStep(1)}>
            Back to Input
          </Button>
        )}
      </div>

      {/* --- Configuration Card (Always Visible) --- */}
      <Card>
        <CardHeader>
          <CardTitle>1. Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Exam</Label>
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger>
                <SelectValue placeholder="Select Exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <Input 
              type="number" 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))} 
            />
          </div>
        </CardContent>
      </Card>

      {/* --- STEP 1: INPUT --- */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Input Content</CardTitle>
            <CardDescription>
              Paste your questions or upload a .docx file. Use standard format (1. Question... A. Option...).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <Tabs defaultValue="paste">
              <TabsList>
                <TabsTrigger value="paste">Paste Text</TabsTrigger>
                <TabsTrigger value="file">Upload File</TabsTrigger>
              </TabsList>
              
              <TabsContent value="paste" className="mt-4">
                <Textarea 
                  placeholder="Paste your questions here..." 
                  rows={15}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="font-mono text-sm"
                />
              </TabsContent>
              
              <TabsContent value="file" className="mt-4">
                <div className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center bg-muted/30">
                  <UploadCloud className="w-10 h-10 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag and drop a .docx file here, or click to select.
                  </p>
                  <Input 
                    type="file" 
                    accept=".docx" 
                    onChange={handleFileChange}
                    className="max-w-xs"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <Button 
              onClick={handleProcess} 
              size="lg" 
              className="w-full"
              disabled={processing}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
              Process Questions
            </Button>

          </CardContent>
        </Card>
      )}

      {/* --- STEP 2: REVIEW --- */}
      {step === 2 && (
        <div className="space-y-6">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Processed {parsedQuestions.length} Questions</AlertTitle>
            <AlertDescription>
              Review the questions below. Edit any mistakes before uploading.
            </AlertDescription>
          </Alert>

          {parsedQuestions.map((q, index) => (
            <Card key={q.id} className={`relative ${q.error ? 'border-red-500' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs text-muted-foreground uppercase font-bold">Question {index + 1}</Label>
                    {/* SECTION EDITOR */}
                    <Input 
                      value={q.section || ''} 
                      onChange={(e) => updateQuestion(index, 'section', e.target.value)}
                      placeholder="Section Instruction (Optional)"
                      className="text-sm bg-muted/50 border-none h-8"
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteQuestion(index)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* QUESTION TEXT */}
                <Textarea 
                  value={q.text} 
                  onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                  className="font-medium text-base min-h-[80px]"
                />

                {/* OPTIONS (Only for Objective) */}
                {q.type === 'OBJECTIVE' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {q.options.map((opt, optIndex) => (
                      <div key={optIndex} className={`flex items-center gap-2 p-2 rounded border ${opt.isCorrect ? 'border-green-500 bg-green-50' : ''}`}>
                        <span className="font-bold text-sm w-6">{String.fromCharCode(65 + optIndex)}.</span>
                        <Input 
                          value={opt.text}
                          onChange={(e) => {
                            const newOptions = [...q.options];
                            newOptions[optIndex].text = e.target.value;
                            updateQuestion(index, 'options', newOptions);
                          }}
                          className="h-8 text-sm"
                        />
                        <input 
                          type="radio" 
                          name={`q-${q.id}`}
                          checked={opt.isCorrect}
                          onChange={() => {
                            const newOptions = q.options.map((o, i) => ({ ...o, isCorrect: i === optIndex }));
                            updateQuestion(index, 'options', newOptions);
                          }}
                          className="h-4 w-4 accent-green-600"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2">
                  <Label className="text-xs">Tags</Label>
                  <TagInput 
                    value={q.tags} 
                    onChange={(newTags) => updateQuestion(index, 'tags', newTags)}
                    placeholder="e.g. algebra, geometry"
                  />
                </div>

                {/* EXPLANATION */}
                <div className="pt-2">
                  <Label className="text-xs">Explanation</Label>
                  <Textarea 
                    value={q.explanation} 
                    onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                    className="text-sm h-20 bg-muted/20"
                    placeholder="Add explanation..."
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="sticky bottom-6 flex justify-center">
            <Button 
              size="lg" 
              className="shadow-xl w-64" 
              onClick={handleUpload}
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Upload {parsedQuestions.length} Questions
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}