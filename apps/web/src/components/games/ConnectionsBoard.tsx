'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shuffle, Check, X, AlertTriangle, Trophy } from 'lucide-react';

interface ConnectionGroup {
  category: string;
  difficulty: 1 | 2 | 3 | 4;
  words: string[];
}

interface ConnectionsBoardProps {
  remainingWords: string[];
  foundGroups: ConnectionGroup[];
  strikes: number;
  maxStrikes: number;
  selectedWords: string[];
  lastGuessResult: 'correct' | 'incorrect' | 'one-away' | null;
  status: 'waiting' | 'playing' | 'finished';
  winner: 'host' | 'peer' | 'draw' | null;
  onSelect: (word: string) => void;
  onDeselect: (word: string) => void;
  onSubmit: () => void;
  onShuffle: () => void;
  disabled?: boolean;
}

const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'bg-yellow-400 text-yellow-900',
  2: 'bg-green-500 text-white',
  3: 'bg-blue-500 text-white',
  4: 'bg-purple-600 text-white',
};

export function ConnectionsBoard({
  remainingWords,
  foundGroups,
  strikes,
  maxStrikes,
  selectedWords,
  lastGuessResult,
  status,
  winner,
  onSelect,
  onDeselect,
  onSubmit,
  onShuffle,
  disabled = false,
}: ConnectionsBoardProps) {
  const canPlay = status === 'playing' && !disabled;
  const canSubmit = canPlay && selectedWords.length === 4;
  const won = winner === 'host'; // Cooperative game
  const lost = winner === 'draw' && status === 'finished';

  const handleWordClick = useCallback((word: string) => {
    if (!canPlay) return;
    
    if (selectedWords.includes(word)) {
      onDeselect(word);
    } else if (selectedWords.length < 4) {
      onSelect(word);
    }
  }, [canPlay, selectedWords, onSelect, onDeselect]);

  const isWordSelected = useCallback((word: string) => {
    return selectedWords.some(w => w.toLowerCase() === word.toLowerCase());
  }, [selectedWords]);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto p-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1">Find the connections!</h2>
        <p className="text-sm text-muted-foreground">
          Select 4 items that share something in common
        </p>
      </div>

      {/* Strikes indicator */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Mistakes remaining:</span>
        <div className="flex gap-1">
          {Array.from({ length: maxStrikes }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-4 h-4 rounded-full transition-all",
                i < (maxStrikes - strikes) ? 'bg-muted-foreground' : 'bg-red-500'
              )}
            />
          ))}
        </div>
      </div>

      {/* Result feedback */}
      {lastGuessResult && (
        <div className={cn(
          "w-full p-3 rounded-lg text-center flex items-center justify-center gap-2 animate-in fade-in",
          lastGuessResult === 'correct' && 'bg-green-500/20 text-green-700',
          lastGuessResult === 'incorrect' && 'bg-red-500/20 text-red-700',
          lastGuessResult === 'one-away' && 'bg-yellow-500/20 text-yellow-700'
        )}>
          {lastGuessResult === 'correct' && <Check className="h-5 w-5" />}
          {lastGuessResult === 'incorrect' && <X className="h-5 w-5" />}
          {lastGuessResult === 'one-away' && <AlertTriangle className="h-5 w-5" />}
          <span className="font-medium">
            {lastGuessResult === 'correct' && 'Correct!'}
            {lastGuessResult === 'incorrect' && 'Not quite...'}
            {lastGuessResult === 'one-away' && 'One away!'}
          </span>
        </div>
      )}

      {/* Game finished state */}
      {status === 'finished' && (
        <div className={cn(
          "w-full p-4 rounded-lg text-center",
          won ? 'bg-green-500/20 border border-green-500' : 'bg-red-500/20 border border-red-500'
        )}>
          <Trophy className={cn(
            "h-8 w-8 mx-auto mb-2",
            won ? 'text-yellow-500' : 'text-gray-400'
          )} />
          <h3 className="font-bold">
            {won ? 'Congratulations!' : 'Game Over'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {won ? 'You found all the connections!' : 'Better luck next time!'}
          </p>
        </div>
      )}

      {/* Found groups */}
      {foundGroups.length > 0 && (
        <div className="w-full space-y-2">
          {foundGroups.map((group, index) => (
            <div
              key={index}
              className={cn(
                "p-3 rounded-lg text-center",
                DIFFICULTY_COLORS[group.difficulty]
              )}
            >
              <div className="font-bold uppercase text-sm">{group.category}</div>
              <div className="text-sm mt-1">{group.words.join(', ')}</div>
            </div>
          ))}
        </div>
      )}

      {/* Word grid */}
      {remainingWords.length > 0 && (
        <div className="grid grid-cols-4 gap-2 w-full">
          {remainingWords.map((word, index) => (
            <button
              key={`${word}-${index}`}
              className={cn(
                "p-2 sm:p-3 rounded-lg font-medium text-xs sm:text-sm uppercase",
                "transition-all duration-150",
                "border-2",
                isWordSelected(word)
                  ? 'bg-foreground text-background border-foreground scale-95'
                  : 'bg-muted border-transparent hover:bg-muted/80',
                !canPlay && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => handleWordClick(word)}
              disabled={!canPlay}
            >
              {word}
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      {canPlay && (
        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onShuffle}
          >
            <Shuffle className="h-4 w-4 mr-2" />
            Shuffle
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => selectedWords.forEach(w => onDeselect(w))}
            disabled={selectedWords.length === 0}
          >
            Deselect All
          </Button>
          <Button
            className="flex-1"
            onClick={onSubmit}
            disabled={!canSubmit}
          >
            Submit
          </Button>
        </div>
      )}

      {/* Selection count */}
      {canPlay && (
        <div className="text-sm text-muted-foreground">
          Selected: {selectedWords.length}/4
        </div>
      )}
    </div>
  );
}

export default ConnectionsBoard;

