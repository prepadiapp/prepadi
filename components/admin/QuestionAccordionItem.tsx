'use client';

import { useEffect, useRef, useState } from 'react';
import { Option, Question } from '@prisma/client';
import { Draggable } from '@hello-pangea/dnd';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  AlignLeft,
  Tag,
  Flag,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Sigma,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TagInput } from './TagInput';

interface QuestionWithOptions extends Question {
  options: Option[];
  section?: { instruction: string } | null;
  tags?: { id: string; name: string }[];
  questionReviewEntries?: {
    id: string;
    note: string;
    createdAt: string | Date;
    author?: { name?: string | null; email?: string | null } | null;
  }[];
}

interface Props {
  question: QuestionWithOptions;
  index: number;
  onDelete: (id: string) => void;
  onUpdate: (updated: QuestionWithOptions) => void;
  apiPrefix?: string;
}

type AutosaveState = 'idle' | 'saving' | 'saved' | 'error';

export function QuestionAccordionItem({
  question,
  index,
  onDelete,
  onUpdate,
  apiPrefix = '/api/admin',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('idle');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const isAdmin = apiPrefix === '/api/admin';
  const initialLoadRef = useRef(true);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const explanationRef = useRef<HTMLTextAreaElement | null>(null);
  const sectionRef = useRef<HTMLTextAreaElement | null>(null);

  const [formData, setFormData] = useState({
    text: question.text,
    explanation: question.explanation || '',
    imageUrl: question.imageUrl || '',
    options: question.options || [],
    section: question.section?.instruction || '',
    tags: question.tags?.map((t) => t.name) || [],
    isFlagged: question.isFlagged || false,
    reviewNote: '',
  });

  const persistChanges = async (closeAfterSave: boolean) => {
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
          section: formData.section,
          tags: isAdmin ? formData.tags : undefined,
          isFlagged: formData.isFlagged,
          reviewNote: formData.reviewNote || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      const updatedQuestion = await res.json();
      onUpdate(updatedQuestion);
      setFormData((prev) => ({ ...prev, reviewNote: '' }));
      setAutosaveState('saved');

      if (closeAfterSave) {
        toast.success('Changes saved');
        setIsOpen(false);
      }
    } catch (error) {
      setAutosaveState('error');
      if (closeAfterSave) toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      initialLoadRef.current = true;
      setAutosaveState('idle');
      return;
    }

    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    setAutosaveState('saving');
    const timeout = window.setTimeout(() => {
      void persistChanges(false);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [
    isOpen,
    formData.text,
    formData.explanation,
    formData.imageUrl,
    formData.section,
    formData.options,
    formData.tags,
    formData.isFlagged,
  ]);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await persistChanges(true);
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
        { id: `temp-${Date.now()}`, text: '', isCorrect: false, questionId: question.id },
      ],
    });
  };

  const removeOption = (optIndex: number) => {
    const newOptions = formData.options.filter((_, i) => i !== optIndex);
    setFormData({ ...formData, options: newOptions });
  };

  const updateFieldFromRef = (ref: React.RefObject<HTMLTextAreaElement | null>, nextValue: string) => {
    if (ref === explanationRef) {
      setFormData((prev) => ({ ...prev, explanation: nextValue }));
      return;
    }

    if (ref === sectionRef) {
      setFormData((prev) => ({ ...prev, section: nextValue }));
      return;
    }

    setFormData((prev) => ({ ...prev, text: nextValue }));
  };

  const applyFormat = (ref: React.RefObject<HTMLTextAreaElement | null>, before: string, after = before) => {
    const element = ref.current;
    if (!element) return;

    const selectionStart = element.selectionStart ?? 0;
    const selectionEnd = element.selectionEnd ?? 0;
    const value = element.value;
    const selectedText = value.slice(selectionStart, selectionEnd) || 'text';
    const replacement = `${before}${selectedText}${after}`;
    const nextValue = `${value.slice(0, selectionStart)}${replacement}${value.slice(selectionEnd)}`;

    updateFieldFromRef(ref, nextValue);

    requestAnimationFrame(() => {
      element.focus();
      const cursorPosition = selectionStart + replacement.length;
      element.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  const insertSymbol = (ref: React.RefObject<HTMLTextAreaElement | null>, symbol: string) => {
    const element = ref.current;
    if (!element) return;

    const selectionStart = element.selectionStart ?? 0;
    const selectionEnd = element.selectionEnd ?? 0;
    const value = element.value;
    const nextValue = `${value.slice(0, selectionStart)}${symbol}${value.slice(selectionEnd)}`;
    updateFieldFromRef(ref, nextValue);
  };

  const handleImageUpload = async (file?: File | null) => {
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const payload = new FormData();
      payload.append('file', file);

      const res = await fetch('/api/uploads/question-image', {
        method: 'POST',
        body: payload,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setFormData((prev) => ({ ...prev, imageUrl: data.url }));
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const Toolbar = ({ targetRef }: { targetRef: React.RefObject<HTMLTextAreaElement | null> }) => (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1">
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormat(targetRef, '<b>', '</b>')}>
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormat(targetRef, '<i>', '</i>')}>
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormat(targetRef, '<u>', '</u>')}>
        <Underline className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormat(targetRef, '<ul>\n<li>', '</li>\n</ul>')}>
        <List className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormat(targetRef, '<ol>\n<li>', '</li>\n</ol>')}>
        <ListOrdered className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertSymbol(targetRef, 'π')}>
        <Sigma className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => insertSymbol(targetRef, '≤')}>
        ≤
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => insertSymbol(targetRef, '√')}>
        √
      </Button>
      <div className="ml-auto px-2 text-[10px] text-slate-500">
        {autosaveState === 'saving' && 'Autosaving...'}
        {autosaveState === 'saved' && 'Saved'}
        {autosaveState === 'error' && 'Save failed'}
      </div>
    </div>
  );

  return (
    <Draggable draggableId={question.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            'group mb-2 rounded-lg border border-slate-200 bg-white transition-all duration-200 md:mb-3',
            snapshot.isDragging ? 'z-50 rotate-1 shadow-xl ring-1 ring-primary/20' : 'shadow-sm hover:border-primary/30 hover:shadow-md'
          )}
        >
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="flex items-start gap-2 p-2.5 md:gap-3 md:p-3">
              <div
                {...provided.dragHandleProps}
                className="mt-0.5 cursor-grab rounded p-1.5 text-slate-300 hover:bg-slate-50 hover:text-primary active:cursor-grabbing md:mt-1 md:p-1"
              >
                <GripVertical className="h-5 w-5" />
              </div>

              <CollapsibleTrigger asChild>
                <div className="flex min-w-0 flex-1 cursor-pointer select-none flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 md:text-[10px]">
                        Q{index + 1}
                      </span>
                      <Badge variant={question.type === 'THEORY' ? 'secondary' : 'outline'} className="h-4 px-1.5 text-[9px] font-medium text-slate-500 md:h-5 md:text-[10px]">
                        {question.type}
                      </Badge>
                      {formData.section && (
                        <Badge variant="secondary" className="h-4 max-w-[100px] truncate border-purple-100 bg-purple-50 px-1.5 text-[9px] text-purple-700 hover:bg-purple-100 md:h-5 md:text-[10px]">
                          Section
                        </Badge>
                      )}
                      {formData.isFlagged && (
                        <Badge className="h-4 bg-amber-500 px-1.5 text-[9px] text-white hover:bg-amber-500 md:h-5 md:text-[10px]">
                          Flagged
                        </Badge>
                      )}
                      {formData.tags.length > 0 && (
                        <div className="flex gap-1">
                          {formData.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="h-4 border-slate-200 px-1 text-[9px] text-slate-500">
                              {tag}
                            </Badge>
                          ))}
                          {formData.tags.length > 2 && <span className="text-[9px] text-slate-400">+{formData.tags.length - 2}</span>}
                        </div>
                      )}
                    </div>

                    <div className="truncate pr-2 text-xs font-medium text-slate-700 opacity-90 transition-opacity group-hover:opacity-100 md:pr-4 md:text-sm">
                      <span dangerouslySetInnerHTML={{ __html: formData.text.replace(/<[^>]+>/g, '') || 'Empty Question Text...' }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="border-t border-slate-100 bg-slate-50/30">
              <div className="space-y-4 p-3 md:p-5">
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:text-xs">
                    <AlignLeft className="h-3.5 w-3.5" /> Section / Instruction (Optional)
                  </Label>
                  <Toolbar targetRef={sectionRef} />
                  <Textarea
                    ref={sectionRef}
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="min-h-[50px] border-slate-200 bg-white text-xs md:text-sm"
                    placeholder="e.g. Read the passage below and answer questions 1-5..."
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:text-xs">Question Content</Label>
                  <Toolbar targetRef={textRef} />
                  <Textarea
                    ref={textRef}
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    className="min-h-[100px] border-slate-200 bg-white text-xs leading-relaxed focus-visible:ring-primary/20 md:text-sm"
                    placeholder="Enter question text here..."
                  />
                </div>

                <div>
                  <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:text-xs">Illustration</Label>
                  <div className="relative">
                    <ImageIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 md:left-3 md:h-4 md:w-4" />
                    <Input
                      placeholder="Paste image URL here..."
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="h-8 border-slate-200 bg-white pl-8 text-xs md:h-9 md:pl-9"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-300 hover:text-blue-700">
                      <UploadCloud className="h-3.5 w-3.5" />
                      {isUploadingImage ? 'Uploading...' : 'Upload image'}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => void handleImageUpload(e.target.files?.[0])} />
                    </Label>
                    {formData.imageUrl && (
                      <a href={formData.imageUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700">
                        Preview image
                      </a>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:text-xs">
                      <Tag className="h-3.5 w-3.5" /> Tags (Admin Only)
                    </Label>
                    <TagInput value={formData.tags} onChange={(tags) => setFormData({ ...formData, tags })} placeholder="Add topics..." />
                    <p className="text-[10px] text-slate-400">Press Enter to add tags (e.g. Algebra, Motion)</p>
                  </div>
                )}

                {question.type === 'OBJECTIVE' && (
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 md:space-y-3 md:p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:text-xs">Answer Options</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={addOption} className="h-6 px-2 text-[10px] font-bold uppercase text-primary hover:bg-primary/5">
                        <Plus className="mr-1 h-3 w-3" /> Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {formData.options.map((opt, i) => (
                        <div key={i} className="group/opt flex items-center gap-2">
                          <div className="relative flex h-6 w-6 shrink-0 items-center justify-center md:h-8 md:w-8">
                            <input
                              type="radio"
                              name={`correct-opt-${question.id}`}
                              checked={opt.isCorrect}
                              onChange={() => {
                                const newOpts = formData.options.map((option, idx) => ({ ...option, isCorrect: idx === i }));
                                setFormData({ ...formData, options: newOpts });
                              }}
                              className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border-2 border-slate-300 transition-colors checked:border-green-500 checked:bg-green-500 md:h-5 md:w-5"
                            />
                            <Check className="pointer-events-none absolute h-2.5 w-2.5 text-white opacity-0 peer-checked:opacity-100 md:h-3 md:w-3" />
                          </div>
                          <Input
                            value={opt.text}
                            onChange={(e) => updateOption(i, 'text', e.target.value)}
                            className={cn(
                              'h-8 flex-1 bg-transparent text-xs transition-colors md:h-9 md:text-sm',
                              opt.isCorrect ? 'border-green-500 bg-green-50/30 ring-1 ring-green-500/20' : 'border-slate-200 focus-visible:border-slate-400'
                            )}
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(i)} className="h-7 w-7 text-slate-300 hover:bg-red-50 hover:text-red-500 md:h-8 md:w-8">
                            <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:text-xs">Explanation</Label>
                  <Toolbar targetRef={explanationRef} />
                  <Textarea
                    ref={explanationRef}
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    className="min-h-[60px] border-slate-200 bg-white text-xs md:text-sm"
                    placeholder="Why is this answer correct?"
                  />
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800 md:text-xs">
                      <Flag className="h-3.5 w-3.5" /> Quality Review
                    </Label>
                    <Button
                      type="button"
                      variant={formData.isFlagged ? 'default' : 'outline'}
                      size="sm"
                      className={cn('h-8 text-xs', formData.isFlagged && 'bg-amber-600 hover:bg-amber-700')}
                      onClick={() => setFormData((prev) => ({ ...prev, isFlagged: !prev.isFlagged }))}
                    >
                      {formData.isFlagged ? 'Flagged' : 'Flag Question'}
                    </Button>
                  </div>
                  <Textarea
                    value={formData.reviewNote}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reviewNote: e.target.value }))}
                    className="mt-3 min-h-[70px] border-amber-200 bg-white text-xs md:text-sm"
                    placeholder="Add a comment for reviewers or your team..."
                  />
                  {question.questionReviewEntries && question.questionReviewEntries.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {question.questionReviewEntries.slice(0, 3).map((entry) => (
                        <div key={entry.id} className="rounded-md border border-amber-100 bg-white px-3 py-2 text-xs text-slate-600">
                          <div className="font-medium text-slate-800">{entry.author?.name || entry.author?.email || 'Reviewer'}</div>
                          <div className="mt-1">{entry.note}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => onDelete(question.id)} className="h-8 px-2 text-[10px] font-medium text-red-500 hover:bg-red-50 hover:text-red-600 md:h-9 md:px-3 md:text-xs">
                    <Trash2 className="mr-1 h-3.5 w-3.5 md:mr-1.5" /> Remove
                  </Button>

                  <div className="flex gap-2 md:gap-3">
                    <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} className="h-8 text-[10px] md:h-9 md:text-xs">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 min-w-[100px] text-[10px] font-semibold shadow-sm md:h-9 md:text-xs">
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Save className="mr-1.5 h-3.5 w-3.5" /> Save
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
