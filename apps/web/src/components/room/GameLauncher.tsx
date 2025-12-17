'use client';

import { useState, useCallback } from 'react';
import { X, Gamepad2, Check, Clock, Users, Zap } from 'lucide-react';

import { GameKeys, GAMES_METADATA, type GameKey, type GameMetadata } from '@playdate/shared';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useSocketEmit } from '@/hooks/useSocket';

interface GameLauncherProps {
  roomId: string;
  isHost: boolean;
  isOpen: boolean;
  onClose: () => void;
  currentGame: GameKey | null;
  onGameSelect: (gameKey: GameKey) => void;
}

// Game icons by category
const CATEGORY_ICONS = {
  classic: Gamepad2,
  word: Zap,
  drawing: Gamepad2,
  trivia: Clock,
};

// Game specific icons (can be expanded)
function GameIcon({ game }: { game: GameMetadata }) {
  const Icon = CATEGORY_ICONS[game.category];
  return <Icon className="h-8 w-8" />;
}

export function GameLauncher({
  roomId,
  isHost,
  isOpen,
  onClose,
  currentGame,
  onGameSelect,
}: GameLauncherProps) {
  const [selectedGame, setSelectedGame] = useState<GameKey | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const emit = useSocketEmit();

  const handleGameClick = (gameKey: GameKey) => {
    setSelectedGame(gameKey);
    if (isHost) {
      setConfirmDialogOpen(true);
    }
  };

  const handleConfirmSelect = () => {
    if (selectedGame) {
      emit('game:select', { roomId, gameKey: selectedGame });
      onGameSelect(selectedGame);
      setConfirmDialogOpen(false);
      onClose();
    }
  };

  const handleReady = useCallback((gameKey: GameKey, ready: boolean) => {
    emit('game:ready', { roomId, gameKey, ready });
  }, [emit, roomId]);

  if (!isOpen) return null;

  const games = Object.values(GAMES_METADATA);

  return (
    <>
      {/* Game launcher modal */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col">
          <CardHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Choose a Game</CardTitle>
                <CardDescription>
                  {isHost
                    ? 'Select a game to play with your partner'
                    : 'Wait for the host to select a game, or suggest one'}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="overflow-y-auto flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {games.map((game) => {
                const isCurrentGame = currentGame === game.key;
                const isSelected = selectedGame === game.key;

                return (
                  <button
                    key={game.key}
                    onClick={() => handleGameClick(game.key)}
                    className={cn(
                      'relative p-4 rounded-lg border text-left transition-all hover:border-primary hover:shadow-md',
                      isCurrentGame && 'border-primary bg-primary/5',
                      isSelected && !isCurrentGame && 'border-primary/50 bg-primary/5'
                    )}
                  >
                    {isCurrentGame && (
                      <Badge className="absolute top-2 right-2" variant="default">
                        Playing
                      </Badge>
                    )}
                    
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        game.category === 'classic' && 'bg-blue-100 text-blue-600',
                        game.category === 'word' && 'bg-green-100 text-green-600',
                        game.category === 'drawing' && 'bg-purple-100 text-purple-600',
                        game.category === 'trivia' && 'bg-orange-100 text-orange-600',
                      )}>
                        <GameIcon game={game} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{game.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {game.description}
                        </p>
                        
                        <div className="flex gap-2 mt-2">
                          {game.hasTurns && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              Turn-based
                            </Badge>
                          )}
                          {game.hasTimer && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Timed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation dialog for host */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Game</DialogTitle>
            <DialogDescription>
              {selectedGame && (
                <>
                  Start playing <strong>{GAMES_METADATA[selectedGame].name}</strong> with your partner?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSelect}>
              <Check className="h-4 w-4 mr-2" />
              Start Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default GameLauncher;

