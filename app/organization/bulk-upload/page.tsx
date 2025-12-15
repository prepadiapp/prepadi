'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Import router
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, BrainCircuit, Plus, ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Toaster, toast } from 'sonner';
import { Subject } from '@prisma/client';

export default function OrgBulkUploadPage() {
  const router = useRouter(); // Init router
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [useAI, setUseAI] = useState(false);

  // Metadata State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Form State
  const [paperTitle, setPaperTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [newSubjectName, setNewSubjectName] = useState(''); 
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const res = await fetch('/api/common/metadata'); 
        if (res.ok) {
          const data = await res.json();
          setSubjects(data.subjects);
        }
      } catch (e) {
        toast.error("Could not load subjects");
      } finally {
        setLoadingMeta(false);
      }
    };
    loadMeta();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!file || !paperTitle) {
        toast.error("Please provide a file and paper title");
        return;
    }
    
    if (!isCreatingSubject && !selectedSubject) {
        toast.error("Please select a subject");
        return;
    }
    if (isCreatingSubject && !newSubjectName.trim()) {
        toast.error("Please enter a name for the new subject");
        return;
    }

    setUploading(true);
    setProgress(10); 

    const formData = new FormData();
    formData.append('file', file);
    formData.append('paperTitle', paperTitle);
    formData.append('useAI', String(useAI));
    
    if (isCreatingSubject) {
        formData.append('newSubjectName', newSubjectName);
    } else {
        formData.append('subjectId', selectedSubject);
    }

    try {
      const res = await fetch('/api/organization/questions/bulk', {
        method: 'POST',
        body: formData,
      });

      setProgress(60); 

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await res.json();
      setProgress(100);
      setResult(data);
      toast.success(`Success! Created paper with ${data.count} questions`);
      
      // AUTO REDIRECT after short delay
      setTimeout(() => {
          router.push(`/organization/papers/${data.paperId}`);
      }, 1500);

    } catch (error: any) {
      toast.error(error.message);
      setResult({ error: error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-5xl mx-auto min-h-screen bg-slate-50/30 font-sans">
      <Toaster richColors position="top-center" />
      
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Upload Assessment</h1>
        <p className="text-sm text-slate-500">Create a new paper by uploading a document.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Configuration */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Paper Details</CardTitle>
            <CardDescription>Configure the details for this assessment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                    <Label>Subject</Label>
                    {!isCreatingSubject ? (
                        <div className="flex gap-2">
                            <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={loadingMeta}>
                                <SelectTrigger className="flex-1"><SelectValue placeholder="Select Subject"/></SelectTrigger>
                                <SelectContent>
                                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" onClick={() => setIsCreatingSubject(true)} title="Create New Subject">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <Input 
                                value={newSubjectName} 
                                onChange={(e) => setNewSubjectName(e.target.value)} 
                                placeholder="Enter new subject name..." 
                                className="flex-1"
                                autoFocus
                            />
                            <Button variant="ghost" onClick={() => setIsCreatingSubject(false)}>Cancel</Button>
                        </div>
                    )}
                    {isCreatingSubject && <p className="text-xs text-muted-foreground">This subject will be saved to your organization.</p>}
                </div>

                <div className="space-y-1.5">
                    <Label>Paper Title</Label>
                    <Input value={paperTitle} onChange={(e) => setPaperTitle(e.target.value)} placeholder="e.g. First Term Mathematics Assessment" />
                </div>
            </div>

            <div className="border-t border-slate-100 pt-5 space-y-4">
                <div className="flex items-center justify-between bg-purple-50 p-3 rounded-lg border border-purple-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                            <BrainCircuit className="w-5 h-5" />
                        </div>
                        <div>
                            <Label htmlFor="ai-mode" className="font-semibold text-purple-900 cursor-pointer">AI Parsing Mode</Label>
                            <p className="text-xs text-purple-700">Use AI to intelligently extract questions from messy documents.</p>
                        </div>
                    </div>
                    <Switch id="ai-mode" checked={useAI} onCheckedChange={setUseAI} />
                </div>

                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer relative group">
                    <input 
                        type="file" 
                        accept=".docx" 
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-full mb-3 group-hover:bg-blue-100 transition-colors">
                        <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-900">
                        {file ? <span className="text-blue-600">{file.name}</span> : "Drop your exam file here"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">.docx files supported (Max 5MB)</p>
                </div>
            </div>

            {uploading && (
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-2">
                            {useAI ? <Sparkles className="w-3 h-3 text-purple-500 animate-pulse"/> : <Loader2 className="w-3 h-3 animate-spin"/>}
                            {useAI ? "AI is analyzing document..." : "Parsing document..."}
                        </span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            )}

            <Button onClick={handleUpload} disabled={!file || uploading} className="w-full h-10 font-semibold shadow-md">
                {uploading ? "Processing..." : "Create Paper & Upload"}
            </Button>
          </CardContent>
        </Card>

        {/* Right: Results / Guide */}
        <div className="space-y-6">
            {result ? (
                <Card className={result.error ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            {result.error ? <AlertCircle className="text-red-600 w-5 h-5"/> : <CheckCircle2 className="text-green-600 w-5 h-5"/>}
                            {result.error ? "Upload Failed" : "Upload Complete"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {result.error ? (
                            <p className="text-sm text-red-700">{result.error}</p>
                        ) : (
                            <div className="space-y-3 text-sm text-green-800">
                                <div className="bg-white/50 p-3 rounded-md border border-green-200">
                                    <p className="text-xs uppercase font-bold text-green-600 mb-1">Paper Created</p>
                                    <p className="font-semibold">{result.paperTitle}</p>
                                    <p className="text-xs mt-1">{result.count} questions added</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs animate-pulse">
                                    <ArrowRight className="w-4 h-4"/> Redirecting to editor...
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500"/> Formatting Guide
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-slate-600 space-y-3">
                        <p>For best results with Standard Parsing:</p>
                        <ul className="list-disc pl-4 space-y-1.5">
                            <li><strong>Numbering:</strong> 1. What is...</li>
                            <li><strong>Options:</strong> A. Option...</li>
                            <li><strong>Answers:</strong> Ans: A</li>
                        </ul>
                        <div className="bg-purple-50 p-3 rounded border border-purple-100 mt-2">
                            <p className="font-semibold text-purple-900 mb-1 flex items-center gap-1">
                                <Sparkles className="w-3 h-3"/> AI Parsing
                            </p>
                            <p className="text-purple-700">Turn on AI Mode to handle messy formats, scanned text, or non-standard layouts.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}