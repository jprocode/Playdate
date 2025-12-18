'use client';

import { useState, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ChessMove {
  from: string;
  to: string;
}

interface ChessBoardProps {
  fen: string;
  moveHistory: string[];
  lastMove: ChessMove | null;
  isMyTurn: boolean;
  myColor: 'white' | 'black';
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  legalMoves?: ChessMove[]; // Made optional since we compute them client-side
  onMove: (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n') => void;
  disabled?: boolean;
}

// Piece unicode characters
const PIECES: Record<string, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

// Parse FEN to get board state
function parseFen(fen: string): (string | null)[][] {
  const board: (string | null)[][] = [];
  const rows = fen.split(' ')[0].split('/');
  
  for (const row of rows) {
    const boardRow: (string | null)[] = [];
    for (const char of row) {
      if (/\d/.test(char)) {
        for (let i = 0; i < parseInt(char); i++) {
          boardRow.push(null);
        }
      } else {
        boardRow.push(char);
      }
    }
    board.push(boardRow);
  }
  
  return board;
}

// Convert row/col to algebraic notation
function toSquare(row: number, col: number): string {
  const file = String.fromCharCode(97 + col); // a-h
  const rank = 8 - row; // 1-8
  return `${file}${rank}`;
}

export function ChessBoard({
  fen,
  moveHistory,
  lastMove,
  isMyTurn,
  myColor,
  isCheck,
  isCheckmate,
  isStalemate,
  isDraw,
  legalMoves: providedLegalMoves,
  onMove,
  disabled = false,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [promotionSquare, setPromotionSquare] = useState<{ from: string; to: string } | null>(null);

  const board = useMemo(() => parseFen(fen), [fen]);
  
  // Compute legal moves client-side using chess.js
  const computedLegalMoves = useMemo((): ChessMove[] => {
    if (!isMyTurn || !fen) return [];
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });
      return moves.map(m => ({ from: m.from, to: m.to }));
    } catch (error) {
      console.warn('[ChessBoard] Failed to compute legal moves:', error);
      return [];
    }
  }, [fen, isMyTurn]);

  // Use computed moves or provided moves (computed takes precedence if available)
  const legalMoves = computedLegalMoves.length > 0 ? computedLegalMoves : (providedLegalMoves || []);
  
  // Flip board for black
  const displayBoard = useMemo(() => {
    if (myColor === 'black') {
      return board.map(row => [...row].reverse()).reverse();
    }
    return board;
  }, [board, myColor]);

  // Get legal moves from selected square
  const legalFromSelected = useMemo(() => {
    if (!selectedSquare) return [];
    return legalMoves
      .filter(m => m.from === selectedSquare)
      .map(m => m.to);
  }, [selectedSquare, legalMoves]);

  // Check if a square can be moved to
  const canMoveTo = useCallback((square: string) => {
    return legalFromSelected.includes(square);
  }, [legalFromSelected]);

  // Handle square click
  const handleSquareClick = useCallback((row: number, col: number) => {
    if (disabled || !isMyTurn) return;

    // Adjust for board flip
    const actualRow = myColor === 'black' ? 7 - row : row;
    const actualCol = myColor === 'black' ? 7 - col : col;
    const square = toSquare(actualRow, actualCol);
    const piece = board[actualRow][actualCol];

    // If a piece is selected and this is a valid destination
    if (selectedSquare && canMoveTo(square)) {
      // Check if this is a pawn promotion
      const selectedPiece = board[myColor === 'white' ? 8 - parseInt(selectedSquare[1]) : parseInt(selectedSquare[1]) - 1]
        ?.[selectedSquare.charCodeAt(0) - 97];
      const isPawn = selectedPiece?.toLowerCase() === 'p';
      const isPromotionRank = (myColor === 'white' && actualRow === 0) || (myColor === 'black' && actualRow === 7);

      if (isPawn && isPromotionRank) {
        setPromotionSquare({ from: selectedSquare, to: square });
      } else {
        onMove(selectedSquare, square);
        setSelectedSquare(null);
      }
      return;
    }

    // Select own piece
    if (piece) {
      const isOwnPiece = (myColor === 'white' && piece === piece.toUpperCase()) ||
                         (myColor === 'black' && piece === piece.toLowerCase());
      if (isOwnPiece) {
        setSelectedSquare(square);
        return;
      }
    }

    // Deselect
    setSelectedSquare(null);
  }, [disabled, isMyTurn, selectedSquare, canMoveTo, board, myColor, onMove]);

  // Handle promotion selection
  const handlePromotion = useCallback((piece: 'q' | 'r' | 'b' | 'n') => {
    if (promotionSquare) {
      onMove(promotionSquare.from, promotionSquare.to, piece);
      setPromotionSquare(null);
      setSelectedSquare(null);
    }
  }, [promotionSquare, onMove]);

  // Get square color
  const getSquareColor = (row: number, col: number): string => {
    const isLight = (row + col) % 2 === 0;
    const actualRow = myColor === 'black' ? 7 - row : row;
    const actualCol = myColor === 'black' ? 7 - col : col;
    const square = toSquare(actualRow, actualCol);

    // Highlight last move
    if (lastMove && (square === lastMove.from || square === lastMove.to)) {
      return isLight ? 'bg-yellow-200' : 'bg-yellow-400';
    }

    // Highlight selected square
    if (square === selectedSquare) {
      return isLight ? 'bg-blue-200' : 'bg-blue-400';
    }

    // Highlight legal moves
    if (canMoveTo(square)) {
      return isLight ? 'bg-green-200' : 'bg-green-400';
    }

    return isLight ? 'bg-amber-100' : 'bg-amber-700';
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Status bar */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Badge variant={isMyTurn ? 'default' : 'secondary'}>
          {isMyTurn ? 'Your turn' : "Opponent's turn"}
        </Badge>
        <Badge variant="outline">Playing as {myColor}</Badge>
        {isCheck && !isCheckmate && (
          <Badge variant="destructive">Check!</Badge>
        )}
        {isCheckmate && (
          <Badge variant="destructive">Checkmate!</Badge>
        )}
        {isStalemate && (
          <Badge variant="secondary">Stalemate</Badge>
        )}
        {isDraw && !isStalemate && (
          <Badge variant="secondary">Draw</Badge>
        )}
      </div>

      {/* Chess board */}
      <div className="relative">
        <div className="grid grid-cols-8 border-2 border-amber-900 rounded overflow-hidden shadow-lg">
          {displayBoard.map((row, rowIndex) => (
            row.map((piece, colIndex) => {
              const actualRow = myColor === 'black' ? 7 - rowIndex : rowIndex;
              const actualCol = myColor === 'black' ? 7 - colIndex : colIndex;
              const square = toSquare(actualRow, actualCol);
              const isLegalTarget = canMoveTo(square);

              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  className={cn(
                    'w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-2xl sm:text-3xl',
                    'transition-colors relative',
                    getSquareColor(rowIndex, colIndex),
                    isMyTurn && !disabled && 'cursor-pointer hover:opacity-80',
                    (!isMyTurn || disabled) && 'cursor-default'
                  )}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                  disabled={disabled || !isMyTurn}
                >
                  {piece && (
                    <span className={cn(
                      piece === piece.toUpperCase() ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]' : 'text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]'
                    )}>
                      {PIECES[piece]}
                    </span>
                  )}
                  {/* Legal move indicator */}
                  {isLegalTarget && !piece && (
                    <div className="absolute w-3 h-3 rounded-full bg-black/30" />
                  )}
                  {isLegalTarget && piece && (
                    <div className="absolute inset-0 border-4 border-black/30 rounded-full" />
                  )}
                </button>
              );
            })
          ))}
        </div>

        {/* File labels */}
        <div className="flex justify-around mt-1 px-0.5">
          {(myColor === 'white' ? ['a','b','c','d','e','f','g','h'] : ['h','g','f','e','d','c','b','a']).map(file => (
            <span key={file} className="text-xs text-muted-foreground w-10 sm:w-12 text-center">{file}</span>
          ))}
        </div>

        {/* Rank labels */}
        <div className="absolute left-[-16px] top-0 bottom-[20px] flex flex-col justify-around">
          {(myColor === 'white' ? [8,7,6,5,4,3,2,1] : [1,2,3,4,5,6,7,8]).map(rank => (
            <span key={rank} className="text-xs text-muted-foreground h-10 sm:h-12 flex items-center">{rank}</span>
          ))}
        </div>
      </div>

      {/* Move history */}
      {moveHistory.length > 0 && (
        <div className="w-full max-w-xs">
          <h4 className="text-sm font-medium mb-2">Moves</h4>
          <div className="text-xs bg-muted p-2 rounded max-h-20 overflow-y-auto font-mono">
            {moveHistory.map((move, i) => (
              <span key={i} className="mr-1">
                {i % 2 === 0 && <span className="text-muted-foreground">{Math.floor(i/2) + 1}.</span>}
                {move}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Promotion dialog */}
      {promotionSquare && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-4 rounded-lg shadow-lg">
            <h3 className="text-sm font-medium mb-3 text-center">Choose promotion</h3>
            <div className="flex gap-2">
              {(['q', 'r', 'b', 'n'] as const).map(piece => (
                <button
                  key={piece}
                  className="w-12 h-12 text-3xl bg-amber-100 hover:bg-amber-200 rounded flex items-center justify-center"
                  onClick={() => handlePromotion(piece)}
                >
                  {PIECES[myColor === 'white' ? piece.toUpperCase() : piece]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChessBoard;

