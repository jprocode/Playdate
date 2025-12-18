'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Eraser, Undo2, Trash2, Send, Clock, Palette } from 'lucide-react';

interface DrawingStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

interface Guess {
  text: string;
  correct: boolean;
  by: 'host' | 'peer';
}

interface PictionaryBoardProps {
  strokes: DrawingStroke[];
  guesses: Guess[];
  isDrawer: boolean;
  isGuesser: boolean;
  currentWord: string | null;
  wordHint: string;
  roundNumber: number;
  maxRounds: number;
  timeRemaining: number;
  myScore: number;
  opponentScore: number;
  phase: 'drawing' | 'revealed' | 'finished';
  status: 'waiting' | 'playing' | 'finished';
  winner: 'host' | 'peer' | 'draw' | null;
  myRole: 'host' | 'peer';
  onStroke: (stroke: DrawingStroke) => void;
  onGuess: (guess: string) => void;
  onClear: () => void;
  onUndo: () => void;
  disabled?: boolean;
}

const COLORS = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FF8000',
];

const BRUSH_SIZES = [2, 4, 8, 12];

export function PictionaryBoard({
  strokes,
  guesses,
  isDrawer,
  isGuesser,
  currentWord,
  wordHint,
  roundNumber,
  maxRounds,
  timeRemaining,
  myScore,
  opponentScore,
  phase,
  status,
  winner,
  myRole,
  onStroke,
  onGuess,
  onClear,
  onUndo,
  disabled = false,
}: PictionaryBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [guessInput, setGuessInput] = useState('');

  const canDraw = !disabled && isDrawer && phase === 'drawing';
  const canGuess = !disabled && isGuesser && phase === 'drawing';

  const iWon = winner === myRole;
  const iLost = winner !== null && winner !== myRole && winner !== 'draw';
  const isDraw = winner === 'draw';

  // Draw strokes on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }

    // Draw current stroke
    if (currentStroke && currentStroke.points.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = currentStroke.color;
      ctx.lineWidth = currentStroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);
      for (let i = 1; i < currentStroke.points.length; i++) {
        ctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes, currentStroke]);

  // Get coordinates from event
  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  // Drawing handlers
  const handleDrawStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!canDraw) return;
    e.preventDefault();
    
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    setCurrentStroke({
      points: [coords],
      color: selectedColor,
      width: brushSize,
    });
  }, [canDraw, getCoordinates, selectedColor, brushSize]);

  const handleDrawMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentStroke) return;
    e.preventDefault();

    const coords = getCoordinates(e);
    if (!coords) return;

    setCurrentStroke({
      ...currentStroke,
      points: [...currentStroke.points, coords],
    });
  }, [isDrawing, currentStroke, getCoordinates]);

  const handleDrawEnd = useCallback(() => {
    if (!isDrawing || !currentStroke) return;
    
    setIsDrawing(false);
    if (currentStroke.points.length >= 2) {
      onStroke(currentStroke);
    }
    setCurrentStroke(null);
  }, [isDrawing, currentStroke, onStroke]);

  const handleGuess = useCallback(() => {
    if (guessInput.trim().length > 0) {
      onGuess(guessInput.trim());
      setGuessInput('');
    }
  }, [guessInput, onGuess]);

  return (
    <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <Badge variant="outline">
          Round {roundNumber}/{maxRounds}
        </Badge>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={cn(
            "font-mono",
            timeRemaining <= 10 && "text-red-500 animate-pulse"
          )}>
            {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
          </span>
        </div>
        <div className="flex gap-4 text-sm">
          <span>You: <strong>{myScore}</strong></span>
          <span>Opponent: <strong>{opponentScore}</strong></span>
        </div>
      </div>

      {/* Role and word */}
      <div className="text-center">
        <Badge variant={isDrawer ? 'default' : 'secondary'} className="mb-2">
          {isDrawer ? 'You are drawing' : 'You are guessing'}
        </Badge>
        
        {isDrawer && currentWord && (
          <div className="text-xl font-bold text-primary">
            Draw: {currentWord}
          </div>
        )}
        
        {isGuesser && (
          <div className="text-2xl font-mono tracking-widest">
            {wordHint}
          </div>
        )}
      </div>

      {/* Game finished state */}
      {status === 'finished' && (
        <Card className={cn(
          iWon ? 'bg-green-500/20 border-green-500' : 
          isDraw ? 'bg-yellow-500/20 border-yellow-500' :
          'bg-red-500/20 border-red-500'
        )}>
          <CardContent className="p-4 text-center">
            <Trophy className={cn(
              "h-8 w-8 mx-auto mb-2",
              iWon ? 'text-yellow-500' : 'text-gray-400'
            )} />
            <h3 className="font-bold">
              {iWon ? 'You Won!' : isDraw ? "It's a Draw!" : 'You Lost'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Final Score: {myScore} - {opponentScore}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Drawing canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className={cn(
            "w-full aspect-[3/2] border-2 rounded-lg bg-white",
            canDraw && "cursor-crosshair",
            !canDraw && "cursor-default"
          )}
          onMouseDown={handleDrawStart}
          onMouseMove={handleDrawMove}
          onMouseUp={handleDrawEnd}
          onMouseLeave={handleDrawEnd}
          onTouchStart={handleDrawStart}
          onTouchMove={handleDrawMove}
          onTouchEnd={handleDrawEnd}
        />
      </div>

      {/* Drawing tools */}
      {isDrawer && phase === 'drawing' && (
        <div className="flex flex-wrap items-center justify-center gap-4">
          {/* Colors */}
          <div className="flex items-center gap-1">
            <Palette className="h-4 w-4 text-muted-foreground mr-1" />
            {COLORS.map(color => (
              <button
                key={color}
                className={cn(
                  "w-6 h-6 rounded-full border-2",
                  selectedColor === color ? 'border-primary ring-2 ring-primary/50' : 'border-gray-300'
                )}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>

          {/* Brush sizes */}
          <div className="flex items-center gap-1">
            {BRUSH_SIZES.map(size => (
              <button
                key={size}
                className={cn(
                  "w-8 h-8 rounded flex items-center justify-center border",
                  brushSize === size ? 'border-primary bg-primary/10' : 'border-gray-300'
                )}
                onClick={() => setBrushSize(size)}
              >
                <div
                  className="rounded-full bg-foreground"
                  style={{ width: size, height: size }}
                />
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onUndo} disabled={disabled}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onClear} disabled={disabled}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Guessing section */}
      {isGuesser && phase === 'drawing' && (
        <div className="space-y-2">
          {/* Previous guesses */}
          {guesses.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {guesses.map((g, i) => (
                <Badge 
                  key={i} 
                  variant={g.correct ? 'default' : 'secondary'}
                  className={g.correct ? 'bg-green-500' : ''}
                >
                  {g.text}
                </Badge>
              ))}
            </div>
          )}

          {/* Guess input */}
          <div className="flex gap-2">
            <Input
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value)}
              placeholder="Type your guess..."
              className="flex-1"
              disabled={!canGuess}
              onKeyDown={(e) => e.key === 'Enter' && canGuess && handleGuess()}
            />
            <Button onClick={handleGuess} disabled={!canGuess || guessInput.trim().length === 0}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PictionaryBoard;

