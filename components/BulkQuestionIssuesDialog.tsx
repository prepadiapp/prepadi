'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { BulkQuestionIssue } from '@/lib/bulk-question-validation';

interface BulkQuestionIssuesDialogProps {
  open: boolean;
  issues: BulkQuestionIssue[];
  onOpenChange: (open: boolean) => void;
  onSelectIssue?: (issue: BulkQuestionIssue) => void;
  description?: string;
}

export function BulkQuestionIssuesDialog({
  open,
  issues,
  onOpenChange,
  onSelectIssue,
  description = 'Fix the questions listed below. Your upload has not been saved.',
}: BulkQuestionIssuesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b bg-red-50/70 px-5 py-4 pr-12 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-red-950">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Review {issues.length} {issues.length === 1 ? 'issue' : 'issues'} before saving
          </DialogTitle>
          <DialogDescription className="text-left leading-5 text-red-900/75">
            {description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 px-5 sm:px-6">
          <ul className="space-y-2 py-4">
            {issues.map((issue, index) => (
              <li key={`${issue.questionNumber}-${issue.field}-${index}`}>
                {onSelectIssue ? (
                  <button
                    type="button"
                    onClick={() => onSelectIssue(issue)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-red-100 bg-white p-3 text-left transition hover:border-red-300 hover:bg-red-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">
                        Question {issue.questionNumber} · {issue.field}
                      </span>
                      <span className="mt-0.5 block text-sm leading-5 text-slate-600">{issue.message}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-red-500" />
                  </button>
                ) : (
                  <div className="rounded-lg border border-red-100 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Question {issue.questionNumber} · {issue.field}
                    </p>
                    <p className="mt-0.5 text-sm leading-5 text-slate-600">{issue.message}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </ScrollArea>

        <DialogFooter className="border-t bg-slate-50 px-5 py-3 sm:px-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close and review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
