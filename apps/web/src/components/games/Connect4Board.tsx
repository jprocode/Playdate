'use client';

import { cn } from '@/lib/utils';

type CellValue = 'red' | 'yellow' | null;

interface Connect4BoardProps {
  board: CellValue[][];
  myColor: 'red' | 'yellow';
  isMyTurn: boolean;
  lastMove: { row: number; col: number } | null;
  onColumnClick: (column: number) => void;
  disabled?: boolean;
}

const COLS = 7;

export function Connect4Board({
  board,
  myColor,
  isMyTurn,
  lastMove,
  onColumnClick,
  disabled = false,
}: Connect4BoardProps) {
  const isColumnFull = (col: number) => {
    return board[board.length - 1][col] !== null;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Turn indicator */}
      <div className="text-lg font-medium">
        {isMyTurn ? (
          <span className={cn(
            'flex items-center gap-2',
            myColor === 'red' ? 'text-red-500' : 'text-yellow-500'
          )}>
            <span
              className={cn(
                'w-4 h-4 rounded-full',
                myColor === 'red' ? 'bg-red-500' : 'bg-yellow-400'
              )}
            />
            Your turn
          </span>
        ) : (
          <span className="text-muted-foreground">Opponent&apos;s turn</span>
        )}
      </div>

      {/* Column buttons */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: COLS }).map((_, col) => (
          <button
            key={col}
            onClick={() => onColumnClick(col)}
            disabled={disabled || !isMyTurn || isColumnFull(col)}
            className={cn(
              'w-10 h-8 md:w-12 md:h-10 flex items-center justify-center',
              'bg-primary/10 rounded-t-lg transition-colors',
              isMyTurn && !isColumnFull(col) && 'hover:bg-primary/30 cursor-pointer',
              (disabled || isColumnFull(col)) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className="text-sm font-medium">↓</span>
          </button>
        ))}
      </div>

      {/* Board */}
      <div className="bg-blue-600 p-2 rounded-lg">
        <div className="grid grid-cols-7 gap-1">
          {/* Render from top to bottom (row 5 to 0) */}
          {[...Array(6)].map((_, rowIndex) => {
            const row = 5 - rowIndex;
            return [...Array(COLS)].map((_, col) => {
              const cell = board[row]?.[col];
              const isLastMove = lastMove?.row === row && lastMove?.col === col;
              
              return (
                <div
                  key={`${row}-${col}`}
                  className={cn(
                    'w-10 h-10 md:w-12 md:h-12 rounded-full',
                    'flex items-center justify-center',
                    'bg-white transition-all',
                    isLastMove && 'ring-2 ring-green-400'
                  )}
                >
                  {cell && (
                    <div
                      className={cn(
                        'w-8 h-8 md:w-10 md:h-10 rounded-full',
                        'transition-transform',
                        cell === 'red' ? 'bg-red-500' : 'bg-yellow-400',
                        isLastMove && 'scale-110'
                      )}
                    />
                  )}
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}

export default Connect4Board;

