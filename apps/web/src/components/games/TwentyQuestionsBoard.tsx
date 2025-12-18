'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, HelpCircle, Check, X, Minus, Lightbulb, Send } from 'lucide-react';

interface Question {
  text: string;
  answer: 'yes' | 'no' | 'maybe';
  askedBy: 'host' | 'peer';
}

interface TargetObject {
  id: string;
  name: string;
  category: string;
  hints: string[];
}

interface TwentyQuestionsBoardProps {
  questions: Question[];
  guesses: { text: string; correct: boolean }[];
  questionsRemaining: number;
  maxQuestions: number;
  isAnswerer: boolean;
  isGuesser: boolean;
  targetObject: TargetObject | null;
  phase: 'questioning' | 'guessing' | 'finished';
  pendingQuestion: string | null;
  status: 'waiting' | 'playing' | 'finished';
  winner: 'host' | 'peer' | null;
  myScore: number;
  opponentScore: number;
  myRole: 'host' | 'peer';
  onAsk: (question: string) => void;
  onAnswer: (answer: 'yes' | 'no' | 'maybe') => void;
  onGuess: (guess: string) => void;
  disabled?: boolean;
}

export function TwentyQuestionsBoard({
  questions,
  guesses,
  questionsRemaining,
  maxQuestions,
  isAnswerer,
  isGuesser,
  targetObject,
  phase,
  pendingQuestion,
  status,
  winner,
  myScore,
  opponentScore,
  myRole,
  onAsk,
  onAnswer,
  onGuess,
  disabled = false,
}: TwentyQuestionsBoardProps) {
  const [questionInput, setQuestionInput] = useState('');
  const [guessInput, setGuessInput] = useState('');

  const handleAsk = useCallback(() => {
    if (questionInput.trim().length >= 3) {
      onAsk(questionInput.trim());
      setQuestionInput('');
    }
  }, [questionInput, onAsk]);

  const handleGuess = useCallback(() => {
    if (guessInput.trim().length >= 1) {
      onGuess(guessInput.trim());
      setGuessInput('');
    }
  }, [guessInput, onGuess]);

  const canAsk = !disabled && isGuesser && phase === 'questioning' && !pendingQuestion && questionsRemaining > 0;
  const canAnswer = !disabled && isAnswerer && pendingQuestion !== null;
  const canGuess = !disabled && isGuesser;

  const iWon = winner === myRole;
  const iLost = winner !== null && winner !== myRole;

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Badge variant={isAnswerer ? 'default' : 'secondary'}>
          {isAnswerer ? 'You know the answer' : 'You are guessing'}
        </Badge>
        <Badge variant="outline">
          {questions.length}/{maxQuestions} questions asked
        </Badge>
      </div>

      {/* Target object (for answerer) */}
      {isAnswerer && targetObject && (
        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">The object is:</span>
            </div>
            <div className="text-2xl font-bold">{targetObject.name}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Category: {targetObject.category}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game finished state */}
      {status === 'finished' && (
        <Card className={cn(
          iWon ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'
        )}>
          <CardContent className="p-4 text-center">
            <Trophy className={cn(
              "h-8 w-8 mx-auto mb-2",
              iWon ? 'text-yellow-500' : 'text-gray-400'
            )} />
            <h3 className="font-bold text-lg">
              {iWon ? 'You Won!' : 'You Lost'}
            </h3>
            {targetObject && (
              <p className="text-muted-foreground mt-1">
                The object was: <span className="font-bold">{targetObject.name}</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Questions and answers history */}
      {questions.length > 0 && (
        <Card>
          <CardContent className="p-4 max-h-64 overflow-y-auto">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Questions Asked
            </h4>
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground w-6">{i + 1}.</span>
                  <span className="flex-1">{q.text}</span>
                  <Badge
                    variant={q.answer === 'yes' ? 'default' : q.answer === 'no' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {q.answer === 'yes' && <Check className="h-3 w-3 mr-1" />}
                    {q.answer === 'no' && <X className="h-3 w-3 mr-1" />}
                    {q.answer === 'maybe' && <Minus className="h-3 w-3 mr-1" />}
                    {q.answer}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending question (waiting for answer) */}
      {pendingQuestion && (
        <Card className="border-yellow-500 bg-yellow-500/10">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-2">
              {isAnswerer ? 'Answer this question:' : 'Waiting for answer...'}
            </div>
            <div className="font-medium text-lg mb-4">&ldquo;{pendingQuestion}&rdquo;</div>
            
            {canAnswer && (
              <div className="flex gap-2 justify-center">
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => onAnswer('yes')}
                >
                  <Check className="h-4 w-4 mr-1" /> Yes
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onAnswer('no')}
                >
                  <X className="h-4 w-4 mr-1" /> No
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onAnswer('maybe')}
                >
                  <Minus className="h-4 w-4 mr-1" /> Maybe
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ask a question */}
      {isGuesser && phase === 'questioning' && !pendingQuestion && status === 'playing' && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-2">
              Ask a yes/no question ({questionsRemaining} remaining)
            </div>
            <div className="flex gap-2">
              <Input
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="Is it an animal?"
                className="flex-1"
                disabled={!canAsk}
                onKeyDown={(e) => e.key === 'Enter' && canAsk && handleAsk()}
              />
              <Button onClick={handleAsk} disabled={!canAsk || questionInput.trim().length < 3}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guessing section */}
      {isGuesser && status === 'playing' && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-2">
              Make a guess (3 attempts allowed)
            </div>
            
            {/* Previous guesses */}
            {guesses.length > 0 && (
              <div className="mb-3 space-y-1">
                {guesses.map((g, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Badge variant={g.correct ? 'default' : 'destructive'}>
                      {g.correct ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    </Badge>
                    <span>{g.text}</span>
                  </div>
                ))}
              </div>
            )}
            
            {guesses.length < 3 && (
              <div className="flex gap-2">
                <Input
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder="What is it?"
                  className="flex-1"
                  disabled={!canGuess}
                  onKeyDown={(e) => e.key === 'Enter' && canGuess && handleGuess()}
                />
                <Button onClick={handleGuess} disabled={!canGuess || guessInput.trim().length < 1}>
                  Guess!
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Answerer waiting */}
      {isAnswerer && !pendingQuestion && status === 'playing' && (
        <div className="text-center text-muted-foreground p-4">
          Waiting for opponent to ask a question...
        </div>
      )}
    </div>
  );
}

export default TwentyQuestionsBoard;

