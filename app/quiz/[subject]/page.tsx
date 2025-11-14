'use client'; 

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// --- DUMMY DATA ---
const dummyQuestions = [
  {
    id: 'q1',
    text: 'What is 2 + 2?',
    options: [
      { id: 'o1', text: '3' },
      { id: 'o2', text: '4' },
      { id: 'o3', text: '5' },
      { id: 'o4', text: '6' },
    ],
    correctOptionId: 'o2',
  },
  {
    id: 'q2',
    text: 'What is the capital of Nigeria?',
    options: [
      { id: 'o5', text: 'Lagos' },
      { id: 'o6', text: 'Kano' },
      { id: 'o7', text: 'Abuja' },
      { id: 'o8', text: 'Port Harcourt' },
    ],
    correctOptionId: 'o7',
  },
  {
    id: 'q3',
    text: 'Who wrote "Things Fall Apart"?',
    options: [
      { id: 'o9', text: 'Wole Soyinka' },
      { id: 'o10', text: 'Chimamanda Ngozi Adichie' },
      { id: 'o11', text: 'Buchi Emecheta' },
      { id: 'o12', text: 'Chinua Achebe' },
    ],
    correctOptionId: 'o12',
  },
];

type AnswerState = {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
};

export default function QuizPage() {
  const params = useParams();
  const subject = params.subject.toString().replace(/-/g, ' '); // e.g., "english-language" -> "english language"

  const [questions] = useState(dummyQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId);
  };

  const handleNext = () => {
    if (selectedOption === null) return;

    const isCorrect = selectedOption === currentQuestion.correctOptionId;
    
    setAnswers([
      ...answers,
      {
        questionId: currentQuestion.id,
        selectedOptionId: selectedOption,
        isCorrect: isCorrect,
      },
    ]);

    setSelectedOption(null);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    const score = answers.filter(a => a.isCorrect).length;
    const total = questions.length;
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Quiz Complete!</CardTitle>
            <CardDescription>Subject: <span className="capitalize">{subject}</span></CardDescription>
          </CardHeader>
          <CardContent>
            <h2 className="text-4xl font-bold text-center">
              Your Score: {score} / {total}
            </h2>
            <p className="text-lg text-center text-gray-600">
              ({((score / total) * 100).toFixed(0)}%)
            </p>
            <div className="mt-8 text-center">
                <Button onClick={() => window.location.href = '/dashboard'}>
                  Back to Dashboard
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="capitalize">{subject} Quiz</CardTitle>
          <CardDescription>
            Question {currentIndex + 1} of {questions.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <h2 className="mb-6 text-lg font-semibold">{currentQuestion.text}</h2>
          <div className="space-y-4">
            {currentQuestion.options.map((option) => (
              <Button
                key={option.id}
                variant={selectedOption === option.id ? 'default' : 'outline'}
                className="w-full h-auto py-3 text-left justify-start"
                onClick={() => handleOptionSelect(option.id)}
              >
                {option.text}
              </Button>
            ))}
          </div>
          <div className="mt-8">
            <Button
              className="w-full"
              onClick={handleNext}
              disabled={selectedOption === null}
            >
              {currentIndex < questions.length - 1 ? 'Next' : 'Finish'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}