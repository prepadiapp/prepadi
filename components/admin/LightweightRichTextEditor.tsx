'use client';

import { useRef } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Sigma } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface LightweightRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function LightweightRichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  rows = 4,
}: LightweightRichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const applyFormat = (before: string, after = before) => {
    const element = textareaRef.current;
    if (!element) return;

    const selectionStart = element.selectionStart ?? 0;
    const selectionEnd = element.selectionEnd ?? 0;
    const currentValue = value || '';
    const selectedText = currentValue.slice(selectionStart, selectionEnd) || 'text';
    const replacement = `${before}${selectedText}${after}`;
    const nextValue = `${currentValue.slice(0, selectionStart)}${replacement}${currentValue.slice(selectionEnd)}`;

    onChange(nextValue);

    requestAnimationFrame(() => {
      element.focus();
      const cursorPosition = selectionStart + replacement.length;
      element.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  const insertSymbol = (symbol: string) => {
    const element = textareaRef.current;
    if (!element) return;

    const selectionStart = element.selectionStart ?? 0;
    const selectionEnd = element.selectionEnd ?? 0;
    const currentValue = value || '';
    const nextValue = `${currentValue.slice(0, selectionStart)}${symbol}${currentValue.slice(selectionEnd)}`;

    onChange(nextValue);

    requestAnimationFrame(() => {
      element.focus();
      const cursorPosition = selectionStart + symbol.length;
      element.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormat('<b>', '</b>')}>
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormat('<i>', '</i>')}>
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormat('<u>', '</u>')}>
          <Underline className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormat('<ul>\n<li>', '</li>\n</ul>')}>
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormat('<ol>\n<li>', '</li>\n</ol>')}>
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertSymbol('π')}>
          <Sigma className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => insertSymbol('≤')}>
          ≤
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => insertSymbol('≥')}>
          ≥
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => insertSymbol('√')}>
          √
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => insertSymbol('÷')}>
          ÷
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => insertSymbol('×')}>
          ×
        </Button>
      </div>

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn('border-slate-200 bg-white text-sm leading-relaxed', className)}
      />
    </div>
  );
}
