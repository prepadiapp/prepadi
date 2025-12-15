'use client';

import { useState } from 'react';
import { Question, Option } from '@prisma/client';
import { Draggable } from '@hello-pangea/dnd';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  GripVertical, 
  ChevronDown, 
  ChevronRight, 
  Save, 
  Trash2, 
  Plus, 
  X,
  ImageIcon,
  Loader2,
  Check,
  AlignLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QuestionWithOptions extends Question {
  options: Option[];
  section?: { instruction: string } | null; // Include section relation
}

interface Props {
  question: QuestionWithOptions;
  index: number;
  onDelete: (id: string) => void;
  onUpdate: (updated: QuestionWithOptions) => void;
  apiPrefix?: string; 
}

export function QuestionAccordionItem({ 
  question, 
  index, 
  onDelete, 
  onUpdate, 
  apiPrefix = '/api/admin' 
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    text: question.text,
    explanation: question.explanation || '',
    imageUrl: question.imageUrl || '',
    options: question.options || [],
    section: question.section?.instruction || '', // NEW: Section text
  });

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    try {
      const res = await fetch(`${apiPrefix}/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: formData.text,
          explanation: formData.explanation,
          imageUrl: formData.imageUrl,
          options: formData.options,
          section: formData.section, // Send section text
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      
      const updatedQuestion = await res.json();
      onUpdate(updatedQuestion);
      toast.success("Changes saved");
      setIsOpen(false);
    } catch (error) {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const updateOption = (optIndex: number, field: keyof Option, value: any) => {
    const newOptions = [...formData.options];
    newOptions[optIndex] = { ...newOptions[optIndex], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [
        ...formData.options, 
        { id: `temp-${Date.now()}`, text: '', isCorrect: false, questionId: question.id }
      ]
    });
  };

  const removeOption = (optIndex: number) => {
    const newOptions = formData.options.filter((_, i) => i !== optIndex);
    setFormData({ ...formData, options: newOptions });
  };

  return (
    <Draggable draggableId={question.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "group border border-slate-200 rounded-lg bg-white mb-2 md:mb-3 transition-all duration-200",
            snapshot.isDragging ? "shadow-xl rotate-1 ring-1 ring-primary/20 z-50" : "shadow-sm hover:shadow-md hover:border-primary/30"
          )}
        >
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            
            {/* --- HEADER --- */}
            <div className="flex items-start p-2.5 md:p-3 gap-2 md:gap-3">
              <div 
                {...provided.dragHandleProps} 
                className="mt-0.5 md:mt-1 cursor-grab hover:text-primary active:cursor-grabbing text-slate-300 p-1.5 md:p-1 hover:bg-slate-50 rounded touch-none"
              >
                <GripVertical className="w-5 h-5" />
              </div>

              <CollapsibleTrigger asChild>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 cursor-pointer select-none min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        Q{index + 1}
                      </span>
                      <Badge variant={question.type === 'THEORY' ? 'secondary' : 'outline'} className="text-[9px] md:text-[10px] h-4 md:h-5 px-1.5 font-medium border-slate-200 text-slate-500">
                        {question.type}
                      </Badge>
                      {/* Section Badge */}
                      {formData.section && (
                          <Badge variant="secondary" className="text-[9px] md:text-[10px] h-4 md:h-5 px-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100 truncate max-w-[100px]">
                             Section
                          </Badge>
                      )}
                    </div>
                    
                    <div className="text-xs md:text-sm font-medium text-slate-700 truncate pr-2 md:pr-4 opacity-90 group-hover:opacity-100 transition-opacity">
                      <span dangerouslySetInnerHTML={{ __html: formData.text.replace(/<[^>]+>/g, '') || 'Empty Question Text...' }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
              </CollapsibleTrigger>
            </div>

            {/* --- EDITABLE CONTENT --- */}
            <CollapsibleContent className="border-t border-slate-100 bg-slate-50/30">
              <div className="p-3 md:p-5 space-y-4">
                
                {/* NEW: Section / Instruction Field */}
                <div className="space-y-1">
                  <Label className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                     <AlignLeft className="w-3.5 h-3.5" /> Section / Instruction (Optional)
                  </Label>
                  <Textarea 
                    value={formData.section}
                    onChange={(e) => setFormData({...formData, section: e.target.value})}
                    className="bg-white min-h-[50px] text-xs md:text-sm border-slate-200"
                    placeholder="e.g. Read the passage below and answer questions 1-5..."
                  />
                </div>

                {/* Text Editor */}
                <div className="space-y-1">
                  <Label className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">Question Content</Label>
                  <Textarea 
                    value={formData.text}
                    onChange={(e) => setFormData({...formData, text: e.target.value})}
                    className="bg-white min-h-[80px] md:min-h-[100px] text-xs md:text-sm leading-relaxed border-slate-200 focus-visible:ring-primary/20"
                    placeholder="Enter question text here..."
                  />
                </div>

                {/* Image Field */}
                <div>
                   <Label className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Illustration</Label>
                   <div className="relative">
                      <ImageIcon className="absolute left-2.5 md:left-3 top-2.5 md:top-2.5 h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400" />
                      <Input 
                        placeholder="Paste image URL here..."
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                        className="pl-8 md:pl-9 bg-white border-slate-200 text-xs h-8 md:h-9"
                      />
                   </div>
                </div>

                {question.type === 'OBJECTIVE' && (
                  <div className="space-y-2 md:space-y-3 bg-white border border-slate-200 p-3 md:p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <Label className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">Answer Options</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={addOption} className="h-6 text-[10px] uppercase font-bold text-primary hover:bg-primary/5 px-2">
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {formData.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2 group/opt">
                           <div className="relative flex items-center justify-center w-6 h-6 md:w-8 md:h-8 shrink-0">
                              <input 
                                type="radio"
                                name={`correct-opt-${question.id}`}
                                checked={opt.isCorrect}
                                onChange={() => {
                                  const newOpts = formData.options.map((o, idx) => ({ ...o, isCorrect: idx === i }));
                                  setFormData({ ...formData, options: newOpts });
                                }}
                                className="peer appearance-none w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-slate-300 checked:border-green-500 checked:bg-green-500 transition-colors cursor-pointer"
                              />
                              <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100" />
                           </div>
                           <Input 
                              value={opt.text}
                              onChange={(e) => updateOption(i, 'text', e.target.value)}
                              className={cn(
                                "flex-1 bg-transparent text-xs md:text-sm h-8 md:h-9 transition-colors",
                                opt.isCorrect ? "border-green-500 ring-1 ring-green-500/20 bg-green-50/30" : "border-slate-200 focus-visible:border-slate-400"
                              )}
                              placeholder={`Option ${String.fromCharCode(65 + i)}`}
                           />
                           <Button 
                             type="button" 
                             variant="ghost" 
                             size="icon" 
                             onClick={() => removeOption(i)}
                             className="h-7 w-7 md:h-8 md:w-8 text-slate-300 hover:text-red-500 hover:bg-red-50"
                           >
                              <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                           </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">Explanation</Label>
                  <Textarea 
                    value={formData.explanation}
                    onChange={(e) => setFormData({...formData, explanation: e.target.value})}
                    className="bg-white min-h-[50px] md:min-h-[60px] text-xs md:text-sm border-slate-200"
                    placeholder="Why is this answer correct?"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-2">
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     onClick={() => onDelete(question.id)} 
                     className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 md:h-9 px-2 md:px-3 text-[10px] md:text-xs font-medium"
                   >
                      <Trash2 className="w-3.5 h-3.5 mr-1 md:mr-1.5" /> Remove
                   </Button>

                   <div className="flex gap-2 md:gap-3">
                      <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} className="h-8 md:h-9 text-[10px] md:text-xs">Cancel</Button>
                      <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 md:h-9 min-w-[90px] md:min-w-[100px] text-[10px] md:text-xs font-semibold shadow-sm">
                         {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                           <>
                             <Save className="w-3.5 h-3.5 mr-1.5" /> Save
                           </>
                         )}
                      </Button>
                   </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </Draggable>
  );
}