'use client';

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Clock, Users } from 'lucide-react';

interface CrosswordCell {
  value: string;
  filledBy: 'host' | 'peer' | null;
  isCorrect: boolean | null;
}

interface CrosswordClue {
  number: number;
  direction: 'across' | 'down';
  text: string;
  startRow: number;
  startCol: number;
}

interface CrosswordBoardProps {
  grid: CrosswordCell[][];
  clues: CrosswordClue[];
  completedClues: { clueNumber: number; direction: 'across' | 'down' }[];
  myCursor: { row: number; col: number } | null;
  partnerCursor: { row: number; col: number } | null;
  status: 'waiting' | 'playing' | 'finished';
  winner: 'host' | 'peer' | 'draw' | null;
  elapsedTime: number;
  percentComplete: number;
  myRole: 'host' | 'peer';
  puzzle: { size: number; grid: (string | null)[][] };
  onSetCell: (row: number, col: number, letter: string) => void;
  onClearCell: (row: number, col: number) => void;
  onMoveCursor: (row: number, col: number) => void;
  disabled?: boolean;
}

export function CrosswordBoard({
  grid,
  clues,
  completedClues,
  myCursor,
  partnerCursor,
  status,
  winner,
  elapsedTime,
  percentComplete,
  myRole,
  puzzle,
  onSetCell,
  onClearCell,
  onMoveCursor,
  disabled = false,
}: CrosswordBoardProps) {
  const [selectedClue, setSelectedClue] = useState<{ number: number; direction: 'across' | 'down' } | null>(null);
  const [direction, setDirection] = useState<'across' | 'down'>('across');

  const size = puzzle.size;
  const canPlay = !disabled && status === 'playing';
  const won = status === 'finished' && winner === 'host'; // Cooperative game

  // Get cell number for display
  const getCellNumber = useCallback((row: number, col: number): number | null => {
    const clue = clues.find(c => c.startRow === row && c.startCol === col);
    return clue ? clue.number : null;
  }, [clues]);

  // Check if cell is a black cell
  const isBlackCell = useCallback((row: number, col: number): boolean => {
    return puzzle.grid[row]?.[col] === null;
  }, [puzzle]);

  // Handle cell click
  const handleCellClick = useCallback((row: number, col: number) => {
    if (!canPlay || isBlackCell(row, col)) return;

    // If clicking same cell, toggle direction
    if (myCursor?.row === row && myCursor?.col === col) {
      setDirection(d => d === 'across' ? 'down' : 'across');
    } else {
      onMoveCursor(row, col);
    }
  }, [canPlay, isBlackCell, myCursor, onMoveCursor]);

  // Handle keyboard input
  useEffect(() => {
    if (!canPlay || !myCursor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const { row, col } = myCursor;

      // Arrow keys - move cursor
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const newRow = Math.max(0, row - 1);
        if (!isBlackCell(newRow, col)) onMoveCursor(newRow, col);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const newRow = Math.min(size - 1, row + 1);
        if (!isBlackCell(newRow, col)) onMoveCursor(newRow, col);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const newCol = Math.max(0, col - 1);
        if (!isBlackCell(row, newCol)) onMoveCursor(row, newCol);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const newCol = Math.min(size - 1, col + 1);
        if (!isBlackCell(row, newCol)) onMoveCursor(row, newCol);
      }
      // Letter input
      else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        onSetCell(row, col, e.key.toUpperCase());
        
        // Move to next cell
        if (direction === 'across') {
          const newCol = Math.min(size - 1, col + 1);
          if (!isBlackCell(row, newCol)) onMoveCursor(row, newCol);
        } else {
          const newRow = Math.min(size - 1, row + 1);
          if (!isBlackCell(newRow, col)) onMoveCursor(newRow, col);
        }
      }
      // Backspace - clear cell
      else if (e.key === 'Backspace') {
        e.preventDefault();
        onClearCell(row, col);
        
        // Move to previous cell
        if (direction === 'across') {
          const newCol = Math.max(0, col - 1);
          if (!isBlackCell(row, newCol)) onMoveCursor(row, newCol);
        } else {
          const newRow = Math.max(0, row - 1);
          if (!isBlackCell(newRow, col)) onMoveCursor(newRow, col);
        }
      }
      // Tab - toggle direction
      else if (e.key === 'Tab') {
        e.preventDefault();
        setDirection(d => d === 'across' ? 'down' : 'across');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canPlay, myCursor, direction, size, isBlackCell, onMoveCursor, onSetCell, onClearCell]);

  // Format time
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Get clues by direction
  const acrossClues = clues.filter(c => c.direction === 'across');
  const downClues = clues.filter(c => c.direction === 'down');

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full max-w-5xl mx-auto p-4">
      {/* Main game area */}
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono">{formatTime(elapsedTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={percentComplete} className="w-32 h-2" />
            <span className="text-sm">{percentComplete}%</span>
          </div>
        </div>

        {/* Game finished state */}
        {status === 'finished' && (
          <Card className={cn(
            won ? 'bg-green-500/20 border-green-500' : 'bg-yellow-500/20 border-yellow-500'
          )}>
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <h3 className="font-bold">
                {won ? 'Puzzle Complete!' : 'Game Over'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Completed in {formatTime(elapsedTime)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Crossword grid */}
        <div 
          className="inline-grid gap-0 border-2 border-foreground bg-black"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const isBlack = isBlackCell(rowIndex, colIndex);
              const cellNumber = getCellNumber(rowIndex, colIndex);
              const isMyCell = myCursor?.row === rowIndex && myCursor?.col === colIndex;
              const isPartnerCell = partnerCursor?.row === rowIndex && partnerCursor?.col === colIndex;
              const filledByMe = cell.filledBy === myRole;
              const filledByPartner = cell.filledBy !== null && cell.filledBy !== myRole;

              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  className={cn(
                    "w-8 h-8 sm:w-10 sm:h-10 relative border border-gray-300",
                    "flex items-center justify-center",
                    "font-bold text-lg uppercase",
                    "transition-colors",
                    isBlack ? 'bg-black' : 'bg-white',
                    !isBlack && canPlay && 'hover:bg-blue-50 cursor-pointer',
                    isMyCell && 'bg-blue-100 ring-2 ring-blue-500',
                    isPartnerCell && !isMyCell && 'ring-2 ring-orange-400',
                    filledByMe && 'text-blue-600',
                    filledByPartner && 'text-orange-600',
                  )}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  disabled={disabled || isBlack}
                >
                  {cellNumber && (
                    <span className="absolute top-0 left-0.5 text-[8px] text-gray-500 font-normal">
                      {cellNumber}
                    </span>
                  )}
                  {!isBlack && cell.value}
                </button>
              );
            })
          )}
        </div>

        {/* Direction indicator */}
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={direction === 'across' ? 'default' : 'outline'}>
            Across →
          </Badge>
          <Badge variant={direction === 'down' ? 'default' : 'outline'}>
            Down ↓
          </Badge>
          <span className="text-muted-foreground text-xs ml-2">
            (Press Tab to switch)
          </span>
        </div>

        {/* Collaboration indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Working together - both players can fill in the puzzle!</span>
        </div>
      </div>

      {/* Clues sidebar */}
      <div className="flex-1 grid grid-cols-2 gap-4 lg:flex lg:flex-col lg:gap-4">
        {/* Across clues */}
        <Card>
          <CardContent className="p-3">
            <h4 className="font-bold mb-2">Across</h4>
            <div className="space-y-1 text-sm max-h-48 overflow-y-auto">
              {acrossClues.map(clue => (
                <div
                  key={`across-${clue.number}`}
                  className={cn(
                    "flex gap-2",
                    completedClues.some(c => c.clueNumber === clue.number && c.direction === 'across') &&
                    'text-muted-foreground line-through'
                  )}
                >
                  <span className="font-medium w-4">{clue.number}.</span>
                  <span>{clue.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Down clues */}
        <Card>
          <CardContent className="p-3">
            <h4 className="font-bold mb-2">Down</h4>
            <div className="space-y-1 text-sm max-h-48 overflow-y-auto">
              {downClues.map(clue => (
                <div
                  key={`down-${clue.number}`}
                  className={cn(
                    "flex gap-2",
                    completedClues.some(c => c.clueNumber === clue.number && c.direction === 'down') &&
                    'text-muted-foreground line-through'
                  )}
                >
                  <span className="font-medium w-4">{clue.number}.</span>
                  <span>{clue.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CrosswordBoard;

