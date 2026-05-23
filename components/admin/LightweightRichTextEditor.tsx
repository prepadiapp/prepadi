'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bold, Italic, List, ListOrdered, Sigma, Underline } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { normalizeRichTextInput } from '@/lib/rich-text';
import { cn } from '@/lib/utils';
import { escapeHtml, sanitizeRichHtml } from '@/lib/rich-text';

interface LightweightRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

function normalizeIncomingValue(value: string) {
  if (!value) return '';

  const hasMarkup = /<\/?[a-z][\s\S]*>/i.test(value);
  if (hasMarkup) {
    return sanitizeRichHtml(value);
  }

  return escapeHtml(value).replace(/\n/g, '<br>');
}

function sanitizeOutgoingValue(value: string) {
  return sanitizeRichHtml(value);
}

function isEditorEmpty(html: string) {
  const normalized = html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();

  return normalized.length === 0;
}

export function LightweightRichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  rows = 4,
}: LightweightRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const minHeightClass = useMemo(() => {
    if (rows <= 2) return 'min-h-[76px]';
    if (rows <= 4) return 'min-h-[112px]';
    if (rows <= 6) return 'min-h-[140px]';
    return 'min-h-[180px]';
  }, [rows]);

  const normalizedValue = useMemo(() => normalizeIncomingValue(value), [value]);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== normalizedValue) {
      editorRef.current.innerHTML = normalizedValue;
    }
  }, [normalizedValue]);

  const emitChange = () => {
    if (!editorRef.current) return;
    onChange(sanitizeOutgoingValue(editorRef.current.innerHTML));
  };

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const insertHtml = (html: string) => {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    emitChange();
  };

  const insertSymbol = (symbol: string) => {
    runCommand('insertText', symbol);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();

    const html = event.clipboardData.getData('text/html');
    if (html) {
      insertHtml(sanitizeRichHtml(html));
      return;
    }

    const text = event.clipboardData.getData('text/plain');
    if (text) {
      insertHtml(normalizeRichTextInput(text));
    }
  };

  const currentHtml = editorRef.current?.innerHTML ?? normalizedValue;
  const showPlaceholder = !isFocused && isEditorEmpty(currentHtml);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => runCommand('bold')}>
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => runCommand('italic')}>
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => runCommand('underline')}>
          <Underline className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => runCommand('superscript')}>
          x²
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => runCommand('subscript')}>
          x₂
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => runCommand('insertUnorderedList')}>
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => runCommand('insertOrderedList')}>
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

      <div className="relative">
        {showPlaceholder && (
          <div className="pointer-events-none absolute left-3 top-3 text-sm text-slate-400">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            emitChange();
          }}
          onPaste={handlePaste}
          onInput={emitChange}
          className={cn(
            'rounded-md border border-slate-200 bg-white px-3 py-3 text-sm leading-relaxed shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15',
            minHeightClass,
            className
          )}
        />
      </div>
    </div>
  );
}
