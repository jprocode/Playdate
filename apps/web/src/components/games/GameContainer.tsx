'use client';

import { useState, useCallback, useEffect } from 'react';
import { Trophy, RefreshCw, ArrowLeft } from 'lucide-react';

import type { GameKey, GameStatePayload, GameErrorPayload, GameEndedPayload } from '@playdate/shared';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useSocketEvent, useSocketEmit } from '@/hooks/useSocket';
import { TicTacToeBoard } from './TicTacToeBoard';
import { Connect4Board } from './Connect4Board';

interface GameContainerProps {
  roomId: string;
  gameKey: GameKey;
  myRole: 'host' | 'peer';
  onBack: () => void;
}

export function GameContainer({
  roomId,
  gameKey,
  myRole,
  onBack,
}: GameContainerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gameState, setGameState] = useState<any>(null);
  const [gameEnded, setGameEnded] = useState<{
    winner: 'host' | 'peer' | 'draw';
    reason?: string;
  } | null>(null);
  const [showEndDialog, setShowEndDialog] = useState(false);
  
  const emit = useSocketEmit();

  // Handle game state updates
  const handleGameState = useCallback((payload: GameStatePayload) => {
    if (payload.roomId === roomId && payload.gameKey === gameKey) {
      setGameState(payload.state);
    }
  }, [roomId, gameKey]);

  // Handle game ended
  const handleGameEnded = useCallback((payload: GameEndedPayload) => {
    if (payload.roomId === roomId && payload.gameKey === gameKey) {
      setGameEnded({ winner: payload.winner });
      setShowEndDialog(true);
    }
  }, [roomId, gameKey]);

  useSocketEvent('game:state', handleGameState);
  useSocketEvent('game:ended', handleGameEnded);

  // Send game action
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendAction = useCallback((action: any) => {
    emit('game:action', {
      roomId,
      gameKey,
      action,
    });
  }, [emit, roomId, gameKey]);

  // Request rematch
  const requestRematch = useCallback(() => {
    emit('game:rematch', { roomId, gameKey });
    setShowEndDialog(false);
    setGameEnded(null);
  }, [emit, roomId, gameKey]);

  // Render game-specific UI
  const renderGame = () => {
    if (!gameState) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    switch (gameKey) {
      case 'tic-tac-toe':
        return (
          <TicTacToeBoard
            board={gameState.board}
            mySymbol={myRole === 'host' ? 'X' : 'O'}
            isMyTurn={gameState.currentTurn === myRole}
            onCellClick={(position) => sendAction({ type: 'place', position })}
            disabled={gameState.status !== 'playing'}
          />
        );

      case 'connect-4':
        return (
          <Connect4Board
            board={gameState.board}
            myColor={myRole === 'host' ? 'red' : 'yellow'}
            isMyTurn={gameState.currentTurn === myRole}
            lastMove={gameState.lastMove}
            onColumnClick={(column) => sendAction({ type: 'drop', column })}
            disabled={gameState.status !== 'playing'}
          />
        );

      // Add more game renderers here
      default:
        return (
          <div className="text-center p-8">
            <p className="text-muted-foreground">
              Game UI for {gameKey} is coming soon!
            </p>
            <pre className="mt-4 text-xs text-left bg-muted p-4 rounded overflow-auto max-h-64">
              {JSON.stringify(gameState, null, 2)}
            </pre>
          </div>
        );
    }
  };

  const getWinnerMessage = () => {
    if (!gameEnded) return '';
    if (gameEnded.winner === 'draw') return "It's a draw!";
    if (gameEnded.winner === myRole) return 'You won! 🎉';
    return 'You lost!';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold capitalize">{gameKey.replace('-', ' ')}</h2>
        </div>
        {gameState && (
          <Badge variant={gameState.status === 'playing' ? 'default' : 'secondary'}>
            {gameState.status}
          </Badge>
        )}
      </div>

      {/* Game content */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        {renderGame()}
      </div>

      {/* Game end dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className={cn(
                'h-6 w-6',
                gameEnded?.winner === myRole ? 'text-yellow-500' : 'text-muted-foreground'
              )} />
              Game Over
            </DialogTitle>
            <DialogDescription>
              {getWinnerMessage()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={onBack}>
              Choose Different Game
            </Button>
            <Button onClick={requestRematch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Play Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GameContainer;

