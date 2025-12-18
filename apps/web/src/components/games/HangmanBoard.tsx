'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trophy, Send } from 'lucide-react';

interface HangmanBoardProps {
  maskedWord: string;
  guessedLetters: string[];
  wrongGuesses: number;
  maxWrongGuesses: number;
  phase: 'setting' | 'guessing' | 'finished';
  isSetter: boolean;
  isGuesser: boolean;
  secretWord: string | null;
  myScore: number;
  opponentScore: number;
  winner: 'host' | 'peer' | null;
  roundNumber: number;
  myRole: 'host' | 'peer';
  onSetWord: (word: string) => void;
  onGuessLetter: (letter: string) => void;
  onGuessWord: (word: string) => void;
  disabled?: boolean;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Hangman SVG parts based on wrong guesses
function HangmanFigure({ wrongGuesses }: { wrongGuesses: number }) {
  return (
    <svg viewBox="0 0 200 250" className="w-32 h-40">
      {/* Gallows */}
      <line x1="20" y1="230" x2="100" y2="230" stroke="currentColor" strokeWidth="4" className="text-foreground" />
      <line x1="60" y1="230" x2="60" y2="20" stroke="currentColor" strokeWidth="4" className="text-foreground" />
      <line x1="60" y1="20" x2="140" y2="20" stroke="currentColor" strokeWidth="4" className="text-foreground" />
      <line x1="140" y1="20" x2="140" y2="50" stroke="currentColor" strokeWidth="4" className="text-foreground" />
      
      {/* Head */}
      {wrongGuesses >= 1 && (
        <circle cx="140" cy="70" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-foreground" />
      )}
      
      {/* Body */}
      {wrongGuesses >= 2 && (
        <line x1="140" y1="90" x2="140" y2="150" stroke="currentColor" strokeWidth="4" className="text-foreground" />
      )}
      
      {/* Left Arm */}
      {wrongGuesses >= 3 && (
        <line x1="140" y1="110" x2="110" y2="130" stroke="currentColor" strokeWidth="4" className="text-foreground" />
      )}
      
      {/* Right Arm */}
      {wrongGuesses >= 4 && (
        <line x1="140" y1="110" x2="170" y2="130" stroke="currentColor" strokeWidth="4" className="text-foreground" />
      )}
      
      {/* Left Leg */}
      {wrongGuesses >= 5 && (
        <line x1="140" y1="150" x2="110" y2="190" stroke="currentColor" strokeWidth="4" className="text-foreground" />
      )}
      
      {/* Right Leg */}
      {wrongGuesses >= 6 && (
        <line x1="140" y1="150" x2="170" y2="190" stroke="currentColor" strokeWidth="4" className="text-foreground" />
      )}
    </svg>
  );
}

export function HangmanBoard({
  maskedWord,
  guessedLetters,
  wrongGuesses,
  maxWrongGuesses,
  phase,
  isSetter,
  isGuesser,
  secretWord,
  myScore,
  opponentScore,
  winner,
  roundNumber,
  myRole,
  onSetWord,
  onGuessLetter,
  onGuessWord,
  disabled = false,
}: HangmanBoardProps) {
  const [wordInput, setWordInput] = useState('');
  const [guessInput, setGuessInput] = useState('');

  const handleSetWord = useCallback(() => {
    if (wordInput.trim().length >= 3) {
      onSetWord(wordInput.trim());
      setWordInput('');
    }
  }, [wordInput, onSetWord]);

  const handleGuessWord = useCallback(() => {
    if (guessInput.trim().length > 0) {
      onGuessWord(guessInput.trim());
      setGuessInput('');
    }
  }, [guessInput, onGuessWord]);

  const canPlay = !disabled && phase !== 'finished';
  const iWon = winner === myRole;
  const iLost = winner !== null && winner !== myRole;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto p-4">
      {/* Scoreboard */}
      <div className="flex justify-between items-center w-full">
        <Badge variant="outline">Round {roundNumber}</Badge>
        <div className="flex gap-4 text-sm">
          <span>You: <strong>{myScore}</strong></span>
          <span>Opponent: <strong>{opponentScore}</strong></span>
        </div>
      </div>

      {/* Role indicator */}
      <div className={cn(
        "px-4 py-2 rounded-full text-sm font-medium",
        isSetter ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" : 
                   "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      )}>
        {isSetter ? "You are setting the word" : "You are guessing"}
      </div>

      {/* Game finished state */}
      {phase === 'finished' && (
        <div className={cn(
          "w-full p-4 rounded-lg text-center",
          iWon ? 'bg-green-500/20 border border-green-500' : 'bg-red-500/20 border border-red-500'
        )}>
          <Trophy className={cn(
            "h-8 w-8 mx-auto mb-2",
            iWon ? 'text-yellow-500' : 'text-gray-400'
          )} />
          <h3 className="font-bold">
            {iWon ? 'You Won!' : 'You Lost'}
          </h3>
          {secretWord && (
            <p className="text-sm text-muted-foreground mt-1">
              The word was: <span className="font-bold">{secretWord}</span>
            </p>
          )}
        </div>
      )}

      {/* Word setting phase */}
      {phase === 'setting' && isSetter && (
        <div className="w-full space-y-4">
          <p className="text-center text-muted-foreground">
            Enter a word for your opponent to guess
          </p>
          <div className="flex gap-2">
            <Input
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
              placeholder="Enter a word..."
              className="flex-1"
              disabled={disabled}
            />
            <Button onClick={handleSetWord} disabled={disabled || wordInput.trim().length < 3}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            At least 3 letters, only letters and spaces allowed
          </p>
        </div>
      )}

      {/* Waiting for word */}
      {phase === 'setting' && !isSetter && (
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Waiting for opponent to set a word...</p>
        </div>
      )}

      {/* Guessing phase */}
      {phase === 'guessing' && (
        <>
          {/* Hangman figure */}
          <HangmanFigure wrongGuesses={wrongGuesses} />
          
          {/* Guesses remaining */}
          <div className="text-sm text-muted-foreground">
            Wrong guesses: {wrongGuesses}/{maxWrongGuesses}
          </div>

          {/* Masked word display */}
          <div className="text-3xl font-mono tracking-widest">
            {maskedWord}
          </div>

          {/* Secret word (for setter) */}
          {isSetter && secretWord && (
            <div className="text-sm text-muted-foreground">
              Your word: <span className="font-bold">{secretWord}</span>
            </div>
          )}

          {/* Keyboard for guessing */}
          {isGuesser && (
            <div className="space-y-4 w-full">
              {/* Letter keyboard */}
              <div className="flex flex-wrap justify-center gap-1">
                {ALPHABET.map(letter => {
                  const isGuessed = guessedLetters.includes(letter);
                  return (
                    <Button
                      key={letter}
                      variant={isGuessed ? 'ghost' : 'secondary'}
                      size="sm"
                      className={cn(
                        "w-8 h-8 p-0 font-bold",
                        isGuessed && 'opacity-30'
                      )}
                      onClick={() => onGuessLetter(letter)}
                      disabled={disabled || isGuessed}
                    >
                      {letter}
                    </Button>
                  );
                })}
              </div>

              {/* Guess whole word */}
              <div className="flex gap-2">
                <Input
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                  placeholder="Guess the whole word..."
                  className="flex-1"
                  disabled={disabled}
                  onKeyDown={(e) => e.key === 'Enter' && handleGuessWord()}
                />
                <Button onClick={handleGuessWord} disabled={disabled || guessInput.trim().length === 0}>
                  Guess
                </Button>
              </div>
            </div>
          )}

          {/* Setter waiting */}
          {isSetter && (
            <div className="text-center text-muted-foreground">
              Waiting for opponent to guess...
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default HangmanBoard;

