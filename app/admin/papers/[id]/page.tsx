'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, GripVertical, CheckCircle, Trash2, ArrowLeft, Plus } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import Link from 'next/link';

type QuestionItem = {
  id: string;
  text: string;
  type: 'OBJECTIVE' | 'THEORY';
  order: number;
};

export default function PaperEditorPage() {
  const params = useParams();
  const paperId = params.id as string; 

  const [paper, setPaper] = useState<any>(null);
  const [allQuestions, setAllQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'OBJECTIVE' | 'THEORY'>('OBJECTIVE');
  
  // DnD Hydration Fix
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  useEffect(() => {
    const loadPaper = async () => {
      try {
        const res = await fetch(`/api/admin/papers/${paperId}`);
        if (!res.ok) throw new Error("Failed to load paper");
        const data = await res.json();
        setPaper(data);
        // Ensure default ordering if order is 0 or null
        const sortedQs = (data.questions || []).sort((a: any, b: any) => {
            if (a.order === 0 && b.order === 0) return 0; // Keep DB natural order
            return (a.order || 9999) - (b.order || 9999);
        });
        setAllQuestions(sortedQs);
      } catch (e) {
        toast.error("Could not load paper details");
      } finally {
        setLoading(false);
      }
    };
    loadPaper();
  }, [paperId]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const currentTabQuestions = allQuestions.filter(q => q.type === activeTab);
    const newTabItems = Array.from(currentTabQuestions);
    const [reorderedItem] = newTabItems.splice(result.source.index, 1);
    newTabItems.splice(result.destination.index, 0, reorderedItem);

    // Update order strictly within this view
    const updatedTabItems = newTabItems.map((q, idx) => ({ ...q })); 
    
    const otherTypeItems = allQuestions.filter(q => q.type !== activeTab);
    // Note: This simplistic merge puts all active tab items at the end visually if not carefully sorted again.
    // Ideally, you keep global index, but for now we re-normalize on save.
    setAllQuestions([...otherTypeItems, ...updatedTabItems]);
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      // Strategy: We only care about the order of questions in the *current* tab being saved relative to each other?
      // Or should we save everything? Let's save the current view's order.
      const currentTabQuestions = allQuestions.filter(q => q.type === activeTab);
      
      const payload = currentTabQuestions.map((q, idx) => ({ 
          id: q.id, 
          order: idx + 1 // 1-based index
      }));

      const res = await fetch(`/api/admin/papers/${paperId}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: payload })
      });

      if (!res.ok) throw new Error("Failed to save order");
      toast.success("Order saved successfully!");
    } catch (e) {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    try {
        const res = await fetch(`/api/admin/papers/${paperId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isVerified: true })
        });
        if(res.ok) {
            setPaper({ ...paper, isVerified: true });
            toast.success("Paper verified!");
        }
    } catch(e) { toast.error("Verification failed"); }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

  const questionsToShow = allQuestions.filter(q => q.type === activeTab);

  return (
    <div className="space-y-6 pb-20">
      <Toaster richColors />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
                <Link href={`/admin/papers`}><ArrowLeft className="w-5 h-5"/></Link>
            </Button>
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    {paper?.title || "Untitled Paper"} 
                    {paper?.isVerified && <CheckCircle className="w-5 h-5 text-green-500" />}
                </h1>
                <p className="text-muted-foreground text-sm flex gap-2">
                    <Badge variant="outline">{paper?.subject?.name}</Badge>
                    <Badge variant="outline">{paper?.year}</Badge>
                </p>
            </div>
        </div>
        <div className="flex gap-2">
            {!paper?.isVerified && (
                <Button variant="outline" onClick={handleVerify} className="border-green-200 hover:bg-green-50 text-green-700">
                    <CheckCircle className="w-4 h-4 mr-2"/> Mark Verified
                </Button>
            )}
            <Button onClick={handleSaveOrder} disabled={saving}>
                {saving ? <Loader2 className="animate-spin w-4 h-4 mr-2"/> : <Save className="w-4 h-4 mr-2"/>}
                Save Order
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2 border-b">
            <div className="flex justify-between items-center">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-[400px]">
                    <TabsList>
                        <TabsTrigger value="OBJECTIVE">Objective ({allQuestions.filter(q => q.type === 'OBJECTIVE').length})</TabsTrigger>
                        <TabsTrigger value="THEORY">Theory ({allQuestions.filter(q => q.type === 'THEORY').length})</TabsTrigger>
                    </TabsList>
                </Tabs>
                <Button variant="secondary" size="sm" asChild>
                    <Link href={`/admin/questions/new?paperId=${paperId}&type=${activeTab}&examId=${paper?.examId}&subjectId=${paper?.subjectId}&year=${paper?.year}`}>
                        <Plus className="w-4 h-4 mr-2" /> Add Question
                    </Link>
                </Button>
            </div>
        </CardHeader>
        <CardContent className="pt-6 bg-slate-50/50 min-h-[500px]">
            {questionsToShow.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg bg-white">
                    <p className="mb-4">No {activeTab.toLowerCase()} questions found.</p>
                    <Button variant="outline" asChild>
                        <Link href={`/admin/questions/new?paperId=${paperId}&type=${activeTab}&examId=${paper?.examId}&subjectId=${paper?.subjectId}&year=${paper?.year}`}>
                            Add your first question
                        </Link>
                    </Button>
                </div>
            ) : (
                enabled && (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="questions-list">
                            {(provided) => (
                                <ul 
                                    {...provided.droppableProps} 
                                    ref={provided.innerRef} 
                                    className="space-y-3"
                                >
                                    {questionsToShow.map((q, index) => (
                                        <Draggable key={q.id} draggableId={q.id} index={index}>
                                            {(provided, snapshot) => (
                                                <li
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`flex items-start gap-3 p-4 bg-white border rounded-xl transition-all ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary z-50' : 'hover:border-primary/50'}`}
                                                >
                                                    <div 
                                                        {...provided.dragHandleProps}
                                                        className="mt-1 text-muted-foreground cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 rounded"
                                                    >
                                                        <GripVertical className="w-5 h-5" />
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge variant="secondary" className="font-mono text-xs">
                                                                #{index + 1}
                                                            </Badge>
                                                            {q.type === 'THEORY' && <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-700 bg-purple-50">Theory</Badge>}
                                                        </div>
                                                        <div className="text-sm font-medium text-slate-800 line-clamp-2" dangerouslySetInnerHTML={{ __html: q.text }} />
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="icon" asChild>
                                                            <Link href={`/admin/questions/${q.id}`}>
                                                                <span className="sr-only">Edit</span>✎
                                                            </Link>
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </li>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </ul>
                            )}
                        </Droppable>
                    </DragDropContext>
                )
            )}
        </CardContent>
      </Card>
    </div>
  );
}