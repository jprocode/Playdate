'use client';

import { useState, useCallback } from 'react';
import { Trophy, RefreshCw, ArrowLeft, AlertTriangle } from 'lucide-react';

import type { GameKey, GameStatePayload, GameEndedPayload, GameStartPayload } from '@playdate/shared';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useSocketEvent, useSocketEmit } from '@/hooks/useSocket';
import { TicTacToeBoard } from './TicTacToeBoard';
import { Connect4Board } from './Connect4Board';
import { ChessBoard } from './ChessBoard';
import { TriviaBoard } from './TriviaBoard';
import { WordleBoard } from './WordleBoard';
import { ConnectionsBoard } from './ConnectionsBoard';
import { HangmanBoard } from './HangmanBoard';
import { TwentyQuestionsBoard } from './TwentyQuestionsBoard';
import { PictionaryBoard } from './PictionaryBoard';
import { CrosswordBoard } from './CrosswordBoard';

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
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  
  const emit = useSocketEmit();

  // Handle game start (initial state)
  const handleGameStart = useCallback((payload: GameStartPayload) => {
    if (payload.roomId === roomId && payload.gameKey === gameKey) {
      console.log('Game started with state:', payload.state);
      setGameState(payload.state);
      setGameEnded(null);
      setShowEndDialog(false);
    }
  }, [roomId, gameKey]);

  // Handle game state updates - clear error on successful state update
  const handleGameStateWithErrorClear = useCallback((payload: GameStatePayload) => {
    if (payload.roomId === roomId && payload.gameKey === gameKey) {
      // Clear error on successful state update
      setActionError(null);
      setIsActionPending(false);
      // Ignore "waiting" lobby states
      if (payload.state && !('waiting' in payload.state)) {
        console.log('Game state updated:', payload.state);
        setGameState(payload.state);
      }
    }
  }, [roomId, gameKey]);

  // Handle game ended
  const handleGameEnded = useCallback((payload: GameEndedPayload) => {
    if (payload.roomId === roomId && payload.gameKey === gameKey) {
      setGameEnded({ winner: payload.winner });
      setShowEndDialog(true);
    }
  }, [roomId, gameKey]);

  useSocketEvent('game:start', handleGameStart);
  useSocketEvent('game:state', handleGameStateWithErrorClear);
  useSocketEvent('game:ended', handleGameEnded);

  // Send game action with error handling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendAction = useCallback((action: any) => {
    // Clear previous errors
    setActionError(null);
    setIsActionPending(true);

    try {
      emit('game:action', {
        roomId,
        gameKey,
        action,
      }, (response: unknown) => {
        setIsActionPending(false);
        // Handle error response from server
        if (response && typeof response === 'object' && 'code' in response) {
          const errorResponse = response as { code: string; message: string };
          console.error('[GameContainer] Action error:', errorResponse.message);
          setActionError(errorResponse.message);
          // Auto-clear error after 5 seconds
          setTimeout(() => setActionError(null), 5000);
        }
      });
    } catch (error) {
      setIsActionPending(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send action';
      console.error('[GameContainer] Action failed:', errorMessage);
      setActionError(errorMessage);
      setTimeout(() => setActionError(null), 5000);
    }
  }, [emit, roomId, gameKey]);

  // Request rematch
  const requestRematch = useCallback(() => {
    emit('game:rematch', { roomId, gameKey });
    setShowEndDialog(false);
    setGameEnded(null);
  }, [emit, roomId, gameKey]);

  // Loading placeholder component
  const LoadingGame = ({ message = 'Loading game...' }: { message?: string }) => (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );

  // Render game-specific UI with validation
  const renderGame = () => {
    if (!gameState) {
      return <LoadingGame />;
    }

    // Helper function to safely get array or default
    const safeArray = <T,>(arr: T[] | undefined | null, defaultVal: T[] = []): T[] => 
      Array.isArray(arr) ? arr : defaultVal;

    // Helper function to safely get number or default
    const safeNumber = (num: number | undefined | null, defaultVal: number = 0): number =>
      typeof num === 'number' ? num : defaultVal;

    // Helper function to safely get boolean or default
    const safeBool = (val: boolean | undefined | null, defaultVal: boolean = false): boolean =>
      typeof val === 'boolean' ? val : defaultVal;

    switch (gameKey) {
      case 'tic-tac-toe':
        // Validate required state
        if (!Array.isArray(gameState.board)) {
          return <LoadingGame message="Initializing Tic-Tac-Toe..." />;
        }
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
        // Validate required state
        if (!Array.isArray(gameState.board)) {
          return <LoadingGame message="Initializing Connect 4..." />;
        }
        return (
          <Connect4Board
            board={gameState.board}
            myColor={myRole === 'host' ? 'red' : 'yellow'}
            isMyTurn={gameState.currentTurn === myRole}
            lastMove={gameState.lastMove || null}
            onColumnClick={(column) => sendAction({ type: 'drop', column })}
            disabled={gameState.status !== 'playing'}
          />
        );

      case 'chess':
        // Validate required state
        if (!gameState.fen || typeof gameState.fen !== 'string') {
          return <LoadingGame message="Initializing Chess..." />;
        }
        return (
          <ChessBoard
            fen={gameState.fen}
            moveHistory={safeArray(gameState.moveHistory)}
            lastMove={gameState.lastMove || null}
            isMyTurn={gameState.currentTurn === myRole}
            myColor={myRole === 'host' ? 'white' : 'black'}
            isCheck={safeBool(gameState.isCheck)}
            isCheckmate={safeBool(gameState.isCheckmate)}
            isStalemate={safeBool(gameState.isStalemate)}
            isDraw={safeBool(gameState.isDraw)}
            onMove={(from, to, promotion) => sendAction({ type: 'move', from, to, promotion })}
            disabled={gameState.status !== 'playing'}
          />
        );

      case 'trivia':
        // Validate required state - currentQuestion may be null between questions
        return (
          <TriviaBoard
            currentQuestion={gameState.currentQuestion || null}
            questionNumber={safeNumber(gameState.currentQuestionIndex, 0) + 1}
            myScore={safeNumber(myRole === 'host' ? gameState.hostScore : gameState.peerScore)}
            opponentScore={safeNumber(myRole === 'host' ? gameState.peerScore : gameState.hostScore)}
            myRole={myRole}
            answeredBy={gameState.answeredBy || null}
            status={gameState.status || 'waiting'}
            winner={
              safeNumber(gameState.hostScore) >= 10 ? 'host' : 
              safeNumber(gameState.peerScore) >= 10 ? 'peer' : null
            }
            onAnswer={(choiceIndex) => sendAction({ type: 'trivia_answer', choiceIndex })}
            disabled={gameState.status !== 'playing'}
          />
        );

      case 'speed-wordle':
        // Validate required state
        return (
          <WordleBoard
            myGuesses={safeArray(myRole === 'host' ? gameState.hostGuesses : gameState.peerGuesses)}
            opponentGuesses={safeArray(myRole === 'host' ? gameState.peerGuesses : gameState.hostGuesses)}
            mySolved={safeBool(myRole === 'host' ? gameState.hostSolved : gameState.peerSolved)}
            opponentSolved={safeBool(myRole === 'host' ? gameState.peerSolved : gameState.hostSolved)}
            myRole={myRole}
            status={gameState.status || 'waiting'}
            winner={
              gameState.status === 'finished'
                ? safeBool(gameState.hostSolved) && safeBool(gameState.peerSolved)
                  ? (safeNumber(gameState.hostSolveTime) < safeNumber(gameState.peerSolveTime) ? 'host' : 
                     safeNumber(gameState.peerSolveTime) < safeNumber(gameState.hostSolveTime) ? 'peer' : 'draw')
                  : safeBool(gameState.hostSolved) ? 'host' : safeBool(gameState.peerSolved) ? 'peer' : 'draw'
                : null
            }
            maxGuesses={safeNumber(gameState.maxGuesses, 6)}
            wordLength={safeNumber(gameState.wordLength, 5)}
            targetWord={gameState.status === 'finished' ? gameState.targetWord : null}
            onGuess={(word) => sendAction({ type: 'guess', word })}
            disabled={gameState.status !== 'playing'}
          />
        );

      case 'connections':
        // Validate required state
        return (
          <ConnectionsBoard
            remainingWords={safeArray(gameState.remainingWords)}
            foundGroups={safeArray(gameState.foundGroups)}
            strikes={safeNumber(gameState.strikes)}
            maxStrikes={safeNumber(gameState.maxStrikes, 4)}
            selectedWords={safeArray(gameState.selectedWords)}
            lastGuessResult={gameState.lastGuessResult || null}
            status={gameState.status || 'waiting'}
            winner={
              safeArray(gameState.foundGroups).length === 4 ? 'host' : 
              safeNumber(gameState.strikes) >= safeNumber(gameState.maxStrikes, 4) ? 'draw' : null
            }
            onSelect={(word) => sendAction({ type: 'select', word })}
            onDeselect={(word) => sendAction({ type: 'deselect', word })}
            onSubmit={() => sendAction({ type: 'submit' })}
            onShuffle={() => sendAction({ type: 'shuffle' })}
            disabled={gameState.status !== 'playing'}
          />
        );

      case 'hangman':
        // Validate required state
        if (!gameState.phase) {
          return <LoadingGame message="Initializing Hangman..." />;
        }
        return (
          <HangmanBoard
            maskedWord={gameState.maskedWord || ''}
            guessedLetters={safeArray(gameState.guessedLetters)}
            wrongGuesses={safeNumber(gameState.wrongGuesses)}
            maxWrongGuesses={safeNumber(gameState.maxWrongGuesses, 6)}
            phase={gameState.phase}
            isSetter={gameState.setterRole === myRole}
            isGuesser={gameState.guesserRole === myRole}
            secretWord={gameState.setterRole === myRole ? gameState.secretWord : null}
            myScore={safeNumber(myRole === 'host' ? gameState.hostScore : gameState.peerScore)}
            opponentScore={safeNumber(myRole === 'host' ? gameState.peerScore : gameState.hostScore)}
            winner={gameState.status === 'finished' ? 
              (safeNumber(gameState.wrongGuesses) >= safeNumber(gameState.maxWrongGuesses, 6) ? gameState.setterRole : gameState.guesserRole) 
              : null}
            roundNumber={safeNumber(gameState.roundNumber, 1)}
            myRole={myRole}
            onSetWord={(word) => sendAction({ type: 'setWord', word })}
            onGuessLetter={(letter) => sendAction({ type: 'guessLetter', letter })}
            onGuessWord={(word) => sendAction({ type: 'guessWord', word })}
            disabled={gameState.status !== 'playing'}
          />
        );

      case 'twenty-questions':
        // Validate required state
        if (!gameState.phase) {
          return <LoadingGame message="Initializing 20 Questions..." />;
        }
        return (
          <TwentyQuestionsBoard
            questions={safeArray(gameState.questions)}
            guesses={safeArray(gameState.guesses)}
            questionsRemaining={safeNumber(gameState.maxQuestions, 20) - safeArray(gameState.questions).length}
            maxQuestions={safeNumber(gameState.maxQuestions, 20)}
            isAnswerer={gameState.answererRole === myRole}
            isGuesser={gameState.guesserRole === myRole}
            targetObject={gameState.answererRole === myRole ? gameState.targetObject : null}
            phase={gameState.phase}
            pendingQuestion={gameState.pendingQuestion || null}
            status={gameState.status || 'waiting'}
            winner={gameState.status === 'finished' ?
              ((safeArray<{ correct: boolean }>(gameState.guesses)).some(g => g.correct) ? gameState.guesserRole : gameState.answererRole)
              : null}
            myScore={safeNumber(myRole === 'host' ? gameState.hostScore : gameState.peerScore)}
            opponentScore={safeNumber(myRole === 'host' ? gameState.peerScore : gameState.hostScore)}
            myRole={myRole}
            onAsk={(question) => sendAction({ type: 'ask', question })}
            onAnswer={(answer) => sendAction({ type: 'twenty_q_answer', answer })}
            onGuess={(guess) => sendAction({ type: 'guess_object', guess })}
            disabled={gameState.status !== 'playing'}
          />
        );

      case 'pictionary': {
        // Validate required state
        if (!gameState.phase) {
          return <LoadingGame message="Initializing Pictionary..." />;
        }
        const roundStartTime = safeNumber(gameState.roundStartTime, Date.now());
        const roundTimeSeconds = safeNumber(gameState.roundTimeSeconds, 60);
        return (
          <PictionaryBoard
            strokes={safeArray(gameState.strokes)}
            guesses={safeArray(gameState.guesses)}
            isDrawer={gameState.drawerRole === myRole}
            isGuesser={gameState.guesserRole === myRole}
            currentWord={gameState.drawerRole === myRole ? gameState.currentWord : null}
            wordHint={gameState.currentWord ? gameState.currentWord.split('').map((c: string) => c === ' ' ? '  ' : '_').join(' ') : ''}
            roundNumber={safeNumber(gameState.roundNumber, 1)}
            maxRounds={safeNumber(gameState.maxRounds, 6)}
            timeRemaining={Math.max(0, roundTimeSeconds - Math.floor((Date.now() - roundStartTime) / 1000))}
            myScore={safeNumber(myRole === 'host' ? gameState.hostScore : gameState.peerScore)}
            opponentScore={safeNumber(myRole === 'host' ? gameState.peerScore : gameState.hostScore)}
            phase={gameState.phase}
            status={gameState.status || 'waiting'}
            winner={gameState.status === 'finished' ?
              (safeNumber(gameState.hostScore) > safeNumber(gameState.peerScore) ? 'host' : 
               safeNumber(gameState.peerScore) > safeNumber(gameState.hostScore) ? 'peer' : 'draw')
              : null}
            myRole={myRole}
            onStroke={(stroke) => sendAction({ type: 'stroke', stroke })}
            onGuess={(guess) => sendAction({ type: 'guess', guess })}
            onClear={() => sendAction({ type: 'clear' })}
            onUndo={() => sendAction({ type: 'undo' })}
            disabled={gameState.status !== 'playing'}
          />
        );
      }

      case 'crossword': {
        // Validate required state
        if (!gameState.playerGrid || !gameState.puzzle) {
          return <LoadingGame message="Initializing Crossword..." />;
        }
        const startTime = safeNumber(gameState.startTime, Date.now());
        return (
          <CrosswordBoard
            grid={gameState.playerGrid}
            clues={gameState.puzzle?.clues || []}
            completedClues={safeArray(gameState.completedClues)}
            myCursor={myRole === 'host' ? gameState.hostCursor : gameState.peerCursor}
            partnerCursor={myRole === 'host' ? gameState.peerCursor : gameState.hostCursor}
            status={gameState.status || 'waiting'}
            winner={gameState.status === 'finished' ? 'host' : null}
            elapsedTime={gameState.completionTime || (Date.now() - startTime)}
            percentComplete={0} // Would need to calculate
            myRole={myRole}
            puzzle={gameState.puzzle}
            onSetCell={(row, col, letter) => sendAction({ type: 'setCell', row, col, letter })}
            onClearCell={(row, col) => sendAction({ type: 'clearCell', row, col })}
            onMoveCursor={(row, col) => sendAction({ type: 'moveCursor', row, col })}
            disabled={gameState.status !== 'playing'}
          />
        );
      }

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
          <h2 className="font-semibold capitalize">{gameKey.replace(/-/g, ' ')}</h2>
        </div>
        <div className="flex items-center gap-2">
          {isActionPending && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          )}
          {gameState && (
            <Badge variant={gameState.status === 'playing' ? 'default' : 'secondary'}>
              {gameState.status}
            </Badge>
          )}
        </div>
      </div>

      {/* Error alert */}
      {actionError && (
        <Alert variant="destructive" className="mx-4 mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

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
