'use client';

import { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { parseBulkText, ParsedQuestion } from '@/lib/parser';
import { TagInput } from '@/components/admin/TagInput'; 
import { Exam, Subject, QuestionType } from '@prisma/client'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Loader2, UploadCloud, FileText, CheckCircle, Trash2, AlertTriangle, Image as ImageIcon, Sparkles } from 'lucide-react';
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

  // Input Modes
  const [useAI, setUseAI] = useState(false);
  const [rawText, setRawText] = useState('');
  const [selectedImages, setSelectedImages] = useState<FileList | null>(null);
  const [processedImagesCount, setProcessedImagesCount] = useState(0);

  // Result
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

  // 1. Handle DOCX File Upload
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

  // 2. Handle Image Selection
  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setSelectedImages(e.target.files);
      }
  };

  // 3. Process Text (Regex or AI)
  const processText = async () => {
      if (!rawText.trim()) {
          toast.error('Please enter text or upload a file.');
          return;
      }
      
      setProcessing(true);

      if (useAI) {
          // Use New AI Endpoint
          try {
              const res = await fetch('/api/admin/questions/parse-text', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ text: rawText })
              });
              
              if (!res.ok) throw new Error("AI Processing Failed");
              
              const data = await res.json();
              if (data.questions && data.questions.length > 0) {
                  // Map AI response to internal ParsedQuestion format
                  const mapped = data.questions.map((q: any) => ({
                      id: Math.random().toString(36).substring(7),
                      text: q.text,
                      options: q.options || [],
                      explanation: q.explanation || '',
                      tags: q.tags || [],
                      type: q.type as QuestionType,
                      section: q.section || null,
                  }));
                  setParsedQuestions(mapped);
                  setStep(2);
              } else {
                  toast.error("AI could not find questions.");
              }
          } catch (e) {
              toast.error("AI Service Error. Try Standard Parser.");
          }
      } else {
          // Use Standard Regex Parser
          const questions = parseBulkText(rawText);
          if (questions.length === 0) {
              toast.error('Could not find any questions. Check format or use AI mode.');
          } else {
              setParsedQuestions(questions);
              setStep(2);
          }
      }
      setProcessing(false);
  };

  // 4. Process Images (Sequential AI)
  const processImages = async () => {
      if (!selectedImages || selectedImages.length === 0) {
          toast.error("No images selected");
          return;
      }

      setProcessing(true);
      setProcessedImagesCount(0);
      const allNewQuestions: ParsedQuestion[] = [];

      try {
          for (let i = 0; i < selectedImages.length; i++) {
              const file = selectedImages[i];
              
              // Convert to Base64
              const base64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.readAsDataURL(file);
              });

              // Send to API
              const res = await fetch('/api/admin/questions/parse-bulk-image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ image: base64 })
              });

              if (res.ok) {
                  const data = await res.json();
                  if (data.questions) {
                      const mapped = data.questions.map((q: any) => ({
                          id: Math.random().toString(36).substring(7),
                          text: q.text,
                          options: q.options || [],
                          explanation: q.explanation || '',
                          tags: q.tags || [],
                          type: q.type as QuestionType,
                          section: q.section || null,
                      }));
                      allNewQuestions.push(...mapped);
                  }
              }
              
              setProcessedImagesCount(prev => prev + 1);
          }

          if (allNewQuestions.length > 0) {
              setParsedQuestions(allNewQuestions);
              setStep(2);
          } else {
              toast.error("No questions could be extracted from these images.");
          }

      } catch (error) {
          console.error(error);
          toast.error("Error processing images.");
      } finally {
          setProcessing(false);
      }
  };

  // 5. Update/Delete in Review
  const updateQuestion = (index: number, field: keyof ParsedQuestion, value: any) => {
    const updated = [...parsedQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setParsedQuestions(updated);
  };

  const deleteQuestion = (index: number) => {
    setParsedQuestions(parsedQuestions.filter((_, i) => i !== index));
  };

  // 6. Final Upload
  const handleUpload = async () => {
    if (!selectedExam || !selectedSubject || !selectedYear) {
        toast.error('Please select Exam, Subject, and Year first.');
        return;
    }
      
    setLoading(true);
    try {
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
        markingGuide: q.type === 'THEORY' ? 'See Answer' : undefined // Basic fallback for theory
      }));

      const res = await fetch('/api/admin/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: payload }),
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      toast.success(`Successfully uploaded ${data.count} questions!`);
      router.push('/admin/questions'); 
    } catch (err) {
      toast.error('Failed to upload questions.');
    } finally {
      setLoading(false);
    }
  };

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

      {/* --- Configuration Card --- */}
      <Card>
        <CardHeader>
          <CardTitle>1. Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Exam</Label>
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger><SelectValue placeholder="Select Exam" /></SelectTrigger>
              <SelectContent>{exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
              <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <Input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      {/* --- STEP 1: INPUT --- */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Input Content</CardTitle>
            <CardDescription>Choose how you want to add questions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <Tabs defaultValue="text">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">Text / Word File</TabsTrigger>
                <TabsTrigger value="images">Exam Paper Images</TabsTrigger>
              </TabsList>
              
              {/* TEXT TAB */}
              <TabsContent value="text" className="space-y-4 mt-4">
                 <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                        <Sparkles className={`w-4 h-4 ${useAI ? 'text-purple-600' : 'text-gray-400'}`} />
                        <Label htmlFor="ai-mode" className="cursor-pointer">Use AI Parser (Slower but flexible)</Label>
                    </div>
                    <Switch id="ai-mode" checked={useAI} onCheckedChange={setUseAI} />
                 </div>

                 <div className="grid gap-4">
                    <Textarea 
                        placeholder="Paste text here..." 
                        rows={10}
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        className="font-mono text-sm"
                    />
                    <div className="text-center text-sm text-muted-foreground">- OR -</div>
                    <div className="flex justify-center">
                        <Input type="file" accept=".docx" onChange={handleFileChange} className="max-w-sm" />
                    </div>
                 </div>

                 <Button onClick={processText} disabled={processing} className="w-full">
                    {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Process Text
                 </Button>
              </TabsContent>
              
              {/* IMAGES TAB */}
              <TabsContent value="images" className="space-y-4 mt-4">
                <div className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center bg-muted/30">
                  <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4 font-medium">
                    Upload photos of question papers (JPG, PNG)
                  </p>
                  <Input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={handleImagesChange}
                    className="max-w-xs"
                  />
                  {selectedImages && (
                      <p className="mt-2 text-xs text-green-600 font-medium">
                          {selectedImages.length} images selected
                      </p>
                  )}
                </div>

                <div className="bg-blue-50 p-4 rounded text-sm text-blue-800 border border-blue-100 flex gap-2">
                   <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                   Images are processed one by one to ensure accuracy. This may take a moment.
                </div>

                <Button onClick={processImages} disabled={processing} className="w-full">
                    {processing ? (
                        <>
                           <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                           Processing {processedImagesCount + 1} / {selectedImages?.length || 0}...
                        </>
                    ) : (
                        "Start Processing Images"
                    )}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* --- STEP 2: REVIEW --- */}
      {step === 2 && (
        <div className="space-y-6">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success! Found {parsedQuestions.length} Questions</AlertTitle>
            <AlertDescription>
              Please review all questions carefully before final upload.
            </AlertDescription>
          </Alert>

          {parsedQuestions.map((q, index) => (
            <Card key={q.id} className={`relative border-l-4 ${q.type === 'THEORY' ? 'border-l-purple-500' : 'border-l-green-500'}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs text-muted-foreground uppercase font-bold flex gap-2 items-center">
                        Question {index + 1} • {q.type}
                    </Label>
                    <Input 
                      value={q.section || ''} 
                      onChange={(e) => updateQuestion(index, 'section', e.target.value)}
                      placeholder="Section Instruction (Optional)"
                      className="text-sm bg-muted/50 border-none h-8 mt-1"
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteQuestion(index)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  value={q.text} 
                  onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                  className="font-medium text-base min-h-[80px]"
                />

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

                <div className="pt-2 grid grid-cols-2 gap-4">
                   <div>
                      <Label className="text-xs">Tags</Label>
                      <TagInput 
                        value={q.tags} 
                        onChange={(newTags) => updateQuestion(index, 'tags', newTags)}
                      />
                   </div>
                   <div>
                      <Label className="text-xs">Explanation</Label>
                      <Textarea 
                        value={q.explanation} 
                        onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                        className="text-sm h-10 bg-muted/20 min-h-[40px]"
                      />
                   </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="sticky bottom-6 flex justify-center gap-4">
            <Button variant="outline" size="lg" onClick={() => setStep(1)}>Cancel</Button>
            <Button 
              size="lg" 
              className="shadow-xl w-64" 
              onClick={handleUpload}
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save All Questions
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}