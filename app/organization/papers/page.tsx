'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Exam, Subject } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, Library, Search, RefreshCw, Upload, FileText, Plus, Globe } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { Badge } from '@/components/ui/badge'; 
import { EditPaperDialog } from '@/components/admin/EditPaperDialog';
import Link from 'next/link';

export default function OrgPapersPage() {
  const router = useRouter();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [recentPapers, setRecentPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selector State
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [processing, setProcessing] = useState(false);
  const [manualTitle, setManualTitle] = useState('');

  // Mode: 'browse' (clone global) or 'create' (blank)
  const [createMode, setCreateMode] = useState<'browse' | 'create'>('browse');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // NOTE: Using common metadata route for dropdowns to fix 401 on admin routes
      const [metaRes, papersRes] = await Promise.all([
        fetch('/api/common/metadata'), 
        fetch('/api/organization/papers') 
      ]);
      
      if (metaRes.ok) {
        const data = await metaRes.json();
        setExams(data.exams);
        setSubjects(data.subjects);
      }
      if (papersRes.ok) setRecentPapers(await papersRes.json());
    } catch(e) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    // Validation
    if (createMode === 'browse') {
        if (!selectedExam || !selectedSubject || !selectedYear) {
            toast.error("Please select Exam, Subject, and Year");
            return;
        }
    } else {
        // Manual Create: Subject & Title required. Exam optional (default internal)
        if (!selectedSubject || !manualTitle) {
            toast.error("Subject and Title are required");
            return;
        }
    }

    setProcessing(true);
    try {
      const payload = createMode === 'browse' 
        ? { examId: selectedExam, subjectId: selectedSubject, year: selectedYear, mode: 'clone' }
        : { subjectId: selectedSubject, title: manualTitle, mode: 'create' }; // New 'create' mode payload

      const res = await fetch('/api/organization/papers/find-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Could not initialize paper");
      
      const paper = await res.json();
      router.push(`/organization/papers/${paper.id}`);
    } catch (error) {
      toast.error("Failed to open paper editor");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/30 font-sans">
      <Toaster richColors position="top-center" />
      
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Assessment Library</h1>
        <p className="text-sm text-slate-500">Manage your organization's exams, tests, and assignments.</p>
      </div>

      {/* --- Primary Actions Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Option 1: Bulk Upload (Primary Link) */}
        <Link href="/organization/bulk-upload" className="block group md:col-span-1">
            <Card className="h-full border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg group-hover:text-blue-600 transition-colors">
                        <Upload className="w-5 h-5 text-blue-600"/> Bulk Upload
                    </CardTitle>
                    <CardDescription>
                        Import questions from Word documents. Best for existing exams.
                    </CardDescription>
                </CardHeader>
            </Card>
        </Link>

        {/* Option 2: Browse Global (Trigger) */}
        <div className="block group cursor-pointer md:col-span-1" onClick={() => { setCreateMode('browse'); document.getElementById('manual-tools')?.scrollIntoView({ behavior: 'smooth' }); }}>
            <Card className={`h-full border-l-4 border-l-purple-600 shadow-sm hover:shadow-md transition-all bg-white ${createMode === 'browse' ? 'ring-2 ring-purple-500/20' : ''}`}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg group-hover:text-purple-600 transition-colors">
                        <Globe className="w-5 h-5 text-purple-600"/> Browse Global
                    </CardTitle>
                    <CardDescription>
                        Clone past questions (WAEC, JAMB) from our repository.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>

        {/* Option 3: Manual Create (Trigger) */}
        <div className="block group cursor-pointer md:col-span-1" onClick={() => { setCreateMode('create'); document.getElementById('manual-tools')?.scrollIntoView({ behavior: 'smooth' }); }}>
            <Card className={`h-full border-l-4 border-l-slate-500 shadow-sm hover:shadow-md transition-all bg-white ${createMode === 'create' ? 'ring-2 ring-slate-500/20' : ''}`}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg group-hover:text-slate-700 transition-colors">
                        <Plus className="w-5 h-5 text-slate-500"/> Create Manually
                    </CardTitle>
                    <CardDescription>
                        Start a blank paper and add questions one by one.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
      </div>

      {/* --- Library Section --- */}
      <div className="space-y-4 pt-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2 text-slate-800">
              <Library className="w-5 h-5 text-slate-500"/> Your Library
          </h2>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} className="h-8 text-xs text-slate-500 hover:text-slate-900">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
            <div className="p-12 flex justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400"/>
            </div>
        ) : recentPapers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-slate-900 font-semibold text-base">Library is empty</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                Select an option above to start building your assessment library.
              </p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentPapers.map(paper => (
                    <Card key={paper.id} className="group hover:border-blue-500/30 hover:shadow-md transition-all duration-200 border-slate-200 shadow-sm bg-white">
                        <CardHeader className="p-4 relative">
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <EditPaperDialog 
                                paper={paper} 
                                onSuccess={fetchData} 
                              />
                            </div>

                            <CardTitle 
                              className="text-sm md:text-base font-semibold text-slate-800 line-clamp-1 pr-8 cursor-pointer hover:text-blue-600 transition-colors mb-1.5" 
                              title={paper.title}
                              onClick={() => router.push(`/organization/papers/${paper.id}`)}
                            >
                              {paper.title}
                            </CardTitle>
                            
                            <CardDescription className="text-xs flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">
                                    {paper.questions?.length || 0} Qs
                                  </span>
                                  {paper.isPublic && (
                                    <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                      <span className="w-1 h-1 rounded-full bg-green-500"></span> Published
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">
                                   {paper.year}
                                </span>
                            </CardDescription>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        )}
      </div>

      {/* --- Manual Tools (Collapsible / Scroll Target) --- */}
      <div id="manual-tools" className="pt-8 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            {createMode === 'browse' ? 'Browse Global Repository' : 'Create New Paper'}
        </h3>
        
        <Card className="shadow-sm border-slate-200 bg-white">
            <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                
                {/* Mode Specific Inputs */}
                {createMode === 'browse' ? (
                    <>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Exam Body</Label>
                            <Select value={selectedExam} onValueChange={setSelectedExam}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select Exam"/></SelectTrigger>
                                <SelectContent>
                                    {exams.map(e => <SelectItem key={e.id} value={e.id} className="text-sm">{e.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Year</Label>
                            <Input 
                                type="number" 
                                value={selectedYear} 
                                onChange={(e) => setSelectedYear(Number(e.target.value))} 
                                className="h-9 text-sm"
                            />
                        </div>
                    </>
                ) : (
                    <div className="space-y-1.5 col-span-2 lg:col-span-2">
                        <Label className="text-xs">Paper Title</Label>
                        <Input 
                            value={manualTitle} 
                            onChange={(e) => setManualTitle(e.target.value)} 
                            placeholder="e.g. Grade 10 Biology Test"
                            className="h-9 text-sm"
                        />
                    </div>
                )}
                
                {/* Subject (Common) */}
                <div className="space-y-1.5">
                    <Label className="text-xs">Subject</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select Subject"/></SelectTrigger>
                        <SelectContent>
                            {subjects.map(s => <SelectItem key={s.id} value={s.id} className="text-sm">{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <Button 
                    onClick={handleProcess} 
                    disabled={processing || loading} 
                    className={`w-full h-9 font-semibold text-sm ${createMode === 'browse' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-slate-800 hover:bg-slate-900'}`}
                >
                    {processing ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin"/> : <ArrowRight className="w-3.5 h-3.5 mr-2"/>}
                    {createMode === 'browse' ? 'Clone Paper' : 'Create Blank'}
                </Button>
            </div>
            </CardContent>
        </Card>
      </div>

    </div>
  );
}