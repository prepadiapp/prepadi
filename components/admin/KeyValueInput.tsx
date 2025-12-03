'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

interface KeyValueInputProps {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueInput({ value, onChange, keyPlaceholder = "Key", valuePlaceholder = "Value" }: KeyValueInputProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const addEntry = () => {
    if (newKey.trim() && newValue.trim()) {
      onChange({ ...value, [newKey.trim()]: newValue.trim() });
      setNewKey('');
      setNewValue('');
    }
  };

  const removeEntry = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  return (
    <div className="space-y-3">
       <div className="flex gap-2">
         <Input 
            value={newKey} 
            onChange={(e) => setNewKey(e.target.value)} 
            placeholder={keyPlaceholder}
            className="flex-1"
         />
         <Input 
            value={newValue} 
            onChange={(e) => setNewValue(e.target.value)} 
            placeholder={valuePlaceholder}
            className="flex-1"
         />
         <Button type="button" onClick={addEntry} size="icon"><Plus className="w-4 h-4" /></Button>
       </div>
       
       <div className="space-y-2">
         {Object.entries(value).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between bg-muted p-2 rounded-md text-sm">
                <span className="font-medium">{k}: <span className="font-normal text-muted-foreground">{v}</span></span>
                <button type="button" onClick={() => removeEntry(k)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                </button>
            </div>
         ))}
         {Object.keys(value).length === 0 && <p className="text-xs text-muted-foreground italic">No mappings added.</p>}
       </div>
    </div>
  );
}