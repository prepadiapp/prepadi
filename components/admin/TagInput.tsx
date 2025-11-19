'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value = [], onChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && inputValue === '') {
      e.preventDefault();
      removeTag(value.length - 1); // Remove the last tag
    }
  };

  const addTag = () => {
    const newTag = inputValue.trim().toLowerCase();
    if (newTag && !value.includes(newTag)) {
      onChange([...value, newTag]);
    }
    setInputValue('');
  };

  const removeTag = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md min-h-[40px]">
      {/* Render existing tags as badges */}
      {value.map((tag, index) => (
        <Badge key={index} variant="secondary" className="text-sm">
          {tag}
          <button
            type="button"
            className="ml-1 rounded-full outline-none"
            onClick={() => removeTag(index)}
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}

      {/* The actual input field */}
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Add a tag...'}
        className="flex-1 border-none shadow-none focus-visible:ring-0 p-0 h-auto"
      />
    </div>
  );
}