'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Prisma } from '@prisma/client';
import DOMPurify from 'isomorphic-dompurify';


type UserAnswerWithDetails = Prisma.UserAnswerGetPayload<{
  include: {
    question: {
      include: {
        options: true;
      };
    };
    option: true; // The option the user selected
  };
}>;

interface QuizReviewProps {
  userAnswers: UserAnswerWithDetails[];
}

function SafeHTML({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}

export function QuizReview({ userAnswers }: QuizReviewProps) {
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold mb-4">Review Your Answers</h2>
      <Accordion type="single" collapsible className="w-full">
        {userAnswers.map((ua, index) => {
          const question = ua.question;
          const selectedOptionId = ua.selectedOptionId;
          const correctOption = question.options.find(o => o.isCorrect);

          return (
            <AccordionItem value={`item-${index}`} key={ua.id}>
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-4">
                  {ua.isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                  <span className="flex-1">
                    Question {index + 1}: {question.text.replace(/<[^>]+>/g, '').substring(0, 50)}...
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                {/* Full Question Text */}
                <SafeHTML html={question.text} className="text-base font-medium prose prose-sm max-w-none" />
                
                {/* Options List */}
                <div className="space-y-2">
                  {question.options.map((option) => {
                    const isSelected = option.id === selectedOptionId;
                    const isCorrect = option.isCorrect;

                    // Determine the visual state for the option
                    let variant: "default" | "destructive" | "secondary" = "secondary";
                    if (isCorrect) variant = "default"; // Always highlight correct green
                    if (isSelected && !isCorrect) variant = "destructive"; // Highlight user's wrong answer red

                    return (
                      <div
                        key={option.id}
                        className={`p-3 rounded-md border ${
                          isCorrect ? 'border-green-500 bg-green-50' :
                          isSelected && !isCorrect ? 'border-red-500 bg-red-50' :
                          'border-border'
                        }`}
                      >
                        <div className="font-medium">
                          <SafeHTML html={option.text} />
                          {isCorrect && <span className="text-xs font-bold text-green-600"> (Correct Answer)</span>}
                          {isSelected && !isCorrect && <span className="text-xs font-bold text-red-600"> (Your Answer)</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Explanation */}
                {question.explanation && (
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <h4 className="font-semibold mb-2">Explanation</h4>
                    <SafeHTML html={question.explanation} className="text-sm text-muted-foreground prose prose-sm max-w-none" />
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
