'use client';

import { cn } from '@/lib/utils';

interface TicTacToeBoardProps {
  board: (string | null)[];
  mySymbol: 'X' | 'O';
  isMyTurn: boolean;
  onCellClick: (position: number) => void;
  disabled?: boolean;
}

export function TicTacToeBoard({
  board,
  mySymbol,
  isMyTurn,
  onCellClick,
  disabled = false,
}: TicTacToeBoardProps) {
  const getCellContent = (value: string | null) => {
    if (!value) return null;
    return (
      <span
        className={cn(
          'text-4xl md:text-6xl font-bold',
          value === 'X' ? 'text-blue-500' : 'text-red-500'
        )}
      >
        {value}
      </span>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Turn indicator */}
      <div className="text-lg font-medium">
        {isMyTurn ? (
          <span className="text-primary">Your turn ({mySymbol})</span>
        ) : (
          <span className="text-muted-foreground">Opponent&apos;s turn</span>
        )}
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-2 p-4 bg-muted/50 rounded-xl">
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => onCellClick(index)}
            disabled={disabled || !isMyTurn || cell !== null}
            className={cn(
              'w-20 h-20 md:w-24 md:h-24 flex items-center justify-center',
              'bg-background rounded-lg border-2 transition-all',
              'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary',
              cell === null && isMyTurn && 'hover:border-primary cursor-pointer',
              cell !== null && 'cursor-default',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {getCellContent(cell)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TicTacToeBoard;

