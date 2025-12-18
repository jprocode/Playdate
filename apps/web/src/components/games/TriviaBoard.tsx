'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, Zap } from 'lucide-react';

interface TriviaQuestion {
  question: string;
  options: string[];
  category: string;
}

interface TriviaBoardProps {
  currentQuestion: TriviaQuestion | null;
  questionNumber: number;
  myScore: number;
  opponentScore: number;
  myRole: 'host' | 'peer';
  answeredBy: 'host' | 'peer' | null;
  status: 'waiting' | 'playing' | 'finished';
  winner: 'host' | 'peer' | null;
  onAnswer: (choiceIndex: number) => void;
  disabled?: boolean;
}

const WINNING_SCORE = 10;

export function TriviaBoard({
  currentQuestion,
  questionNumber,
  myScore,
  opponentScore,
  myRole,
  answeredBy,
  status,
  winner,
  onAnswer,
  disabled = false,
}: TriviaBoardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleAnswer = useCallback((index: number) => {
    if (disabled || answeredBy !== null || status !== 'playing') return;
    
    setSelectedAnswer(index);
    setIsAnimating(true);
    
    // Brief delay for visual feedback
    setTimeout(() => {
      onAnswer(index);
      setSelectedAnswer(null);
      setIsAnimating(false);
    }, 300);
  }, [disabled, answeredBy, status, onAnswer]);

  const canAnswer = status === 'playing' && answeredBy === null && !disabled;
  const iWon = winner === myRole;
  const iLost = winner !== null && winner !== myRole;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto p-4">
      {/* Scoreboard */}
      <div className="w-full bg-gradient-to-r from-blue-500/10 via-transparent to-orange-500/10 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">You</div>
            <div className={cn(
              "text-4xl font-bold transition-all",
              myScore > opponentScore ? 'text-green-500' : 'text-foreground'
            )}>
              {myScore}
            </div>
            <Progress 
              value={(myScore / WINNING_SCORE) * 100} 
              className="h-2 mt-2 w-20"
            />
          </div>
          
          <div className="flex flex-col items-center">
            <Trophy className="h-6 w-6 text-yellow-500 mb-1" />
            <span className="text-xs text-muted-foreground">First to {WINNING_SCORE}</span>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Opponent</div>
            <div className={cn(
              "text-4xl font-bold transition-all",
              opponentScore > myScore ? 'text-red-500' : 'text-foreground'
            )}>
              {opponentScore}
            </div>
            <Progress 
              value={(opponentScore / WINNING_SCORE) * 100} 
              className="h-2 mt-2 w-20"
            />
          </div>
        </div>
      </div>

      {/* Game finished state */}
      {status === 'finished' && (
        <div className={cn(
          "w-full p-6 rounded-lg text-center",
          iWon ? 'bg-green-500/20 border border-green-500' : 'bg-red-500/20 border border-red-500'
        )}>
          <Trophy className={cn(
            "h-12 w-12 mx-auto mb-3",
            iWon ? 'text-yellow-500' : 'text-gray-400'
          )} />
          <h2 className="text-2xl font-bold mb-2">
            {iWon ? 'You Won!' : 'You Lost'}
          </h2>
          <p className="text-muted-foreground">
            Final Score: {myScore} - {opponentScore}
          </p>
        </div>
      )}

      {/* Current question */}
      {status === 'playing' && currentQuestion && (
        <div className="w-full space-y-4">
          {/* Question header */}
          <div className="flex justify-between items-center">
            <Badge variant="outline">{currentQuestion.category}</Badge>
            <Badge variant="secondary">Question {questionNumber}</Badge>
          </div>

          {/* Question */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-center">
              {currentQuestion.question}
            </h3>
          </div>

          {/* Speed indicator */}
          {canAnswer && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Be quick! First to answer wins the point.</span>
            </div>
          )}

          {/* Answer status */}
          {answeredBy !== null && (
            <div className={cn(
              "text-center p-3 rounded-lg",
              answeredBy === myRole ? 'bg-green-500/20' : 'bg-orange-500/20'
            )}>
              <span className="font-medium">
                {answeredBy === myRole ? 'You answered first!' : 'Opponent answered first!'}
              </span>
            </div>
          )}

          {/* Options */}
          <div className="grid gap-3">
            {currentQuestion.options.map((option, index) => (
              <Button
                key={index}
                variant={selectedAnswer === index ? 'default' : 'outline'}
                className={cn(
                  "w-full py-6 text-left justify-start text-base",
                  "transition-all duration-200",
                  selectedAnswer === index && isAnimating && 'scale-95',
                  !canAnswer && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => handleAnswer(index)}
                disabled={!canAnswer}
              >
                <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3 text-sm font-medium">
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Waiting for question */}
      {status === 'playing' && !currentQuestion && (
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading next question...</p>
        </div>
      )}
    </div>
  );
}

export default TriviaBoard;

