'use client';

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Delete, CornerDownLeft, Trophy, Clock } from 'lucide-react';

type LetterResult = 'correct' | 'present' | 'absent';

interface WordleGuess {
  word: string;
  result: LetterResult[];
}

interface WordleBoardProps {
  myGuesses: WordleGuess[];
  opponentGuesses: WordleGuess[];
  mySolved: boolean;
  opponentSolved: boolean;
  myRole: 'host' | 'peer';
  status: 'waiting' | 'playing' | 'finished';
  winner: 'host' | 'peer' | 'draw' | null;
  maxGuesses: number;
  wordLength: number;
  targetWord: string | null;
  onGuess: (word: string) => void;
  disabled?: boolean;
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DELETE'],
];

function getLetterColor(result: LetterResult): string {
  switch (result) {
    case 'correct':
      return 'bg-green-500 text-white border-green-500';
    case 'present':
      return 'bg-yellow-500 text-white border-yellow-500';
    case 'absent':
      return 'bg-gray-500 text-white border-gray-500';
    default:
      return 'bg-background border-border';
  }
}

export function WordleBoard({
  myGuesses,
  opponentGuesses,
  mySolved,
  opponentSolved,
  myRole,
  status,
  winner,
  maxGuesses,
  wordLength,
  targetWord,
  onGuess,
  disabled = false,
}: WordleBoardProps) {
  const [currentInput, setCurrentInput] = useState('');
  const [shake, setShake] = useState(false);

  // Build keyboard letter states from guesses
  const letterStates = new Map<string, LetterResult>();
  for (const guess of myGuesses) {
    for (let i = 0; i < guess.word.length; i++) {
      const letter = guess.word[i];
      const result = guess.result[i];
      const current = letterStates.get(letter);
      
      // Priority: correct > present > absent
      if (!current || result === 'correct' || (result === 'present' && current === 'absent')) {
        letterStates.set(letter, result);
      }
    }
  }

  const canSubmit = status === 'playing' && !mySolved && myGuesses.length < maxGuesses && !disabled;

  const handleKeyPress = useCallback((key: string) => {
    if (!canSubmit) return;

    if (key === 'ENTER') {
      if (currentInput.length === wordLength) {
        onGuess(currentInput);
        setCurrentInput('');
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } else if (key === 'DELETE' || key === 'BACKSPACE') {
      setCurrentInput(prev => prev.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && currentInput.length < wordLength) {
      setCurrentInput(prev => prev + key);
    }
  }, [canSubmit, currentInput, wordLength, onGuess]);

  // Keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canSubmit) return;
      
      const key = e.key.toUpperCase();
      if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
        e.preventDefault();
        handleKeyPress(key === 'BACKSPACE' ? 'DELETE' : key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canSubmit, handleKeyPress]);

  const iWon = winner === myRole;
  const iLost = winner !== null && winner !== myRole && winner !== 'draw';
  const isDraw = winner === 'draw';

  // Build grid rows with proper typing
  type GridRow = 
    | { type: 'completed'; guess: WordleGuess }
    | { type: 'current'; input: string }
    | { type: 'empty' };
  
  const gridRows: GridRow[] = [];
  for (let i = 0; i < maxGuesses; i++) {
    if (i < myGuesses.length) {
      // Completed guess
      gridRows.push({ type: 'completed' as const, guess: myGuesses[i] });
    } else if (i === myGuesses.length && canSubmit) {
      // Current input row
      gridRows.push({ type: 'current' as const, input: currentInput });
    } else {
      // Empty row
      gridRows.push({ type: 'empty' as const });
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center w-full">
        <Badge variant="outline">
          {myGuesses.length}/{maxGuesses} guesses
        </Badge>
        {opponentSolved && !mySolved && status === 'playing' && (
          <Badge variant="destructive" className="animate-pulse">
            Opponent solved!
          </Badge>
        )}
        {mySolved && (
          <Badge variant="default" className="bg-green-500">
            Solved!
          </Badge>
        )}
      </div>

      {/* Game finished state */}
      {status === 'finished' && (
        <div className={cn(
          "w-full p-4 rounded-lg text-center",
          iWon ? 'bg-green-500/20 border border-green-500' : 
          isDraw ? 'bg-yellow-500/20 border border-yellow-500' :
          'bg-red-500/20 border border-red-500'
        )}>
          <Trophy className={cn(
            "h-8 w-8 mx-auto mb-2",
            iWon ? 'text-yellow-500' : isDraw ? 'text-yellow-500' : 'text-gray-400'
          )} />
          <h3 className="font-bold">
            {iWon ? 'You Won!' : isDraw ? "It's a Draw!" : 'You Lost'}
          </h3>
          {targetWord && (
            <p className="text-sm text-muted-foreground mt-1">
              The word was: <span className="font-bold">{targetWord}</span>
            </p>
          )}
        </div>
      )}

      {/* Wordle Grid */}
      <div className={cn("grid gap-1.5", shake && 'animate-shake')}>
        {gridRows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1.5">
            {Array.from({ length: wordLength }).map((_, colIndex) => {
              let letter = '';
              let colorClass = 'bg-background border-2 border-border';
              let animate = '';

              if (row.type === 'completed' && row.guess) {
                letter = row.guess.word[colIndex];
                colorClass = getLetterColor(row.guess.result[colIndex]);
              } else if (row.type === 'current' && 'input' in row) {
                letter = row.input[colIndex] || '';
                if (letter) {
                  colorClass = 'bg-background border-2 border-foreground';
                  animate = 'scale-110';
                }
              }

              return (
                <div
                  key={colIndex}
                  className={cn(
                    "w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center",
                    "text-xl sm:text-2xl font-bold uppercase rounded",
                    "transition-all duration-150",
                    colorClass,
                    animate
                  )}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Opponent progress indicator */}
      <div className="w-full bg-muted/50 rounded p-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Opponent progress:</span>
          <div className="flex gap-1">
            {Array.from({ length: maxGuesses }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-3 h-3 rounded-sm",
                  i < opponentGuesses.length 
                    ? opponentSolved ? 'bg-green-500' : 'bg-muted-foreground'
                    : 'bg-muted'
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Keyboard */}
      {canSubmit && (
        <div className="w-full space-y-1.5">
          {KEYBOARD_ROWS.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-1">
              {row.map(key => {
                const letterState = letterStates.get(key);
                const isSpecial = key === 'ENTER' || key === 'DELETE';
                
                return (
                  <Button
                    key={key}
                    variant="secondary"
                    size="sm"
                    className={cn(
                      "h-12 font-bold uppercase",
                      isSpecial ? 'px-2 text-xs' : 'w-8 sm:w-10 px-0',
                      letterState === 'correct' && 'bg-green-500 hover:bg-green-600 text-white',
                      letterState === 'present' && 'bg-yellow-500 hover:bg-yellow-600 text-white',
                      letterState === 'absent' && 'bg-gray-500 hover:bg-gray-600 text-white'
                    )}
                    onClick={() => handleKeyPress(key)}
                  >
                    {key === 'DELETE' ? <Delete className="h-4 w-4" /> :
                     key === 'ENTER' ? <CornerDownLeft className="h-4 w-4" /> : key}
                  </Button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WordleBoard;

