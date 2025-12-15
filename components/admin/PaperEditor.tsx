'use client';

import { useState, useImperativeHandle, forwardRef } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { Question, Option } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { GripVertical, Layers, ArrowDownUp, Plus } from 'lucide-react';
import { QuestionAccordionItem } from './QuestionAccordionItem';
import { toast } from 'sonner';

interface QuestionWithOptions extends Question {
  options: Option[];
}

interface PaperEditorProps {
  paperId: string;
  initialQuestions: QuestionWithOptions[];
  apiPrefix?: string; 
}

export const PaperEditor = forwardRef((
  { paperId, initialQuestions, apiPrefix = '/api/admin' }: PaperEditorProps, 
  ref
) => {
  const [questions, setQuestions] = useState(initialQuestions);
  const [isReordering, setIsReordering] = useState(false);

  // Expose 'addQuestion' to parent via ref
  useImperativeHandle(ref, () => ({
    addQuestion: handleAddQuestion
  }));

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setQuestions(items);

    setIsReordering(true);
    try {
        const orderMap = items.map((q, index) => ({ id: q.id, order: index }));
        await fetch(`${apiPrefix}/papers/${paperId}/reorder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: orderMap })
        });
        toast.success("Order updated");
    } catch (e) {
        toast.error("Failed to save order");
    } finally {
        setIsReordering(false);
    }
  };

  const handleUpdateQuestion = (updatedQ: QuestionWithOptions) => {
    setQuestions(prev => prev.map(q => q.id === updatedQ.id ? updatedQ : q));
  };

  const handleDeleteQuestion = async (id: string) => {
    if(!confirm("Remove this question from the paper?")) return;
    
    setQuestions(prev => prev.filter(q => q.id !== id));
    try {
        await fetch(`${apiPrefix}/questions/${id}`, { method: 'DELETE' }); 
        toast.success("Question removed");
    } catch(e) {
        toast.error("Failed to remove question");
    }
  };

  const handleAddQuestion = async () => {
      try {
          // Use correct endpoint for creation
          // Admin uses /api/admin/questions (generic)
          // Org uses /api/organization/questions (specific)
          const endpoint = apiPrefix === '/api/organization' 
             ? '/api/organization/questions' 
             : '/api/admin/questions';

          const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  text: "New Question",
                  type: "OBJECTIVE",
                  paperId: paperId, // Link to this paper
                  options: [
                      { text: "Option A", isCorrect: true },
                      { text: "Option B", isCorrect: false }
                  ]
              })
          });
          
          if (!res.ok) throw new Error("Failed to create question");
          const newQuestion = await res.json();
          
          setQuestions(prev => [...prev, newQuestion]);
          toast.success("New question added");
          
          setTimeout(() => {
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          }, 100);

      } catch (error) {
          toast.error("Could not add question");
      }
  };

  return (
    <div className="space-y-4 md:space-y-6">
       
       <div className="flex justify-between items-center bg-white border border-slate-200 px-3 py-2 md:px-4 md:py-3 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
             <div className="p-1 md:p-1.5 bg-slate-100 rounded-md">
                <Layers className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500" />
             </div>
             <span className="font-semibold text-xs md:text-sm">{questions.length} Questions</span>
          </div>
          
          <div className="flex items-center gap-2">
             {isReordering ? (
                <span className="text-[10px] font-medium text-primary animate-pulse bg-primary/10 px-2 py-1 rounded-full">
                    Saving...
                </span>
             ) : (
                <span className="text-[10px] text-muted-foreground hidden sm:flex items-center gap-1">
                    <ArrowDownUp className="w-3 h-3" /> Drag to reorder
                </span>
             )}
          </div>
       </div>

       <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="questions-list">
             {(provided) => (
                <div 
                   {...provided.droppableProps} 
                   ref={provided.innerRef}
                   className="space-y-2 md:space-y-3 min-h-[200px]"
                >
                   {questions.map((q, index) => (
                      <QuestionAccordionItem 
                         key={q.id} 
                         question={q} 
                         index={index}
                         onDelete={handleDeleteQuestion}
                         onUpdate={handleUpdateQuestion}
                         apiPrefix={apiPrefix}
                      />
                   ))}
                   {provided.placeholder}
                </div>
             )}
          </Droppable>
       </DragDropContext>

       {questions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 md:py-16 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50 text-center px-4">
             <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                 <Layers className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
             </div>
             <p className="text-slate-900 font-medium text-sm">No questions yet</p>
             <p className="text-slate-500 text-xs mt-1 max-w-xs">
                Start adding questions to build this exam paper.
             </p>
             <Button className="mt-4 h-8 text-xs" size="sm" variant="outline" onClick={handleAddQuestion}>
                <Plus className="w-3.5 h-3.5 mr-1.5"/> Add First Question
             </Button>
          </div>
       )}
    </div>
  );
});

PaperEditor.displayName = "PaperEditor";