// Game Registry
// Central registry for all game implementations

import type { Game, GameState, ValidationResult, WinResult } from './games/base.js';
import { ticTacToeGame } from './games/tic-tac-toe.js';
import { connect4Game } from './games/connect4.js';
import { triviaGame } from './games/trivia.js';
import { hangmanGame } from './games/hangman.js';
import { wordleGame } from './games/wordle.js';
import { chessGame } from './games/chess.js';
import { connectionsGame } from './games/connections.js';
import { twentyQuestionsGame } from './games/twenty-questions.js';
import { crosswordGame } from './games/crossword.js';
import { pictionaryGame } from './games/pictionary.js';

// Re-export types
export type { Game, GameState, ValidationResult, WinResult };

// Game key type
export type GameKey = 
  | 'tic-tac-toe'
  | 'connect-4'
  | 'trivia'
  | 'hangman'
  | 'speed-wordle'
  | 'chess'
  | 'connections'
  | 'twenty-questions'
  | 'crossword'
  | 'pictionary';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyGame = Game<any, any, any>;

// Game registry
const gameRegistry = new Map<GameKey, AnyGame>();

// Register all games
gameRegistry.set('tic-tac-toe', ticTacToeGame);
gameRegistry.set('connect-4', connect4Game);
gameRegistry.set('trivia', triviaGame);
gameRegistry.set('hangman', hangmanGame);
gameRegistry.set('speed-wordle', wordleGame);
gameRegistry.set('chess', chessGame);
gameRegistry.set('connections', connectionsGame);
gameRegistry.set('twenty-questions', twentyQuestionsGame);
gameRegistry.set('crossword', crosswordGame);
gameRegistry.set('pictionary', pictionaryGame);

// Get a game by key
export function getGame(key: GameKey): AnyGame | undefined {
  return gameRegistry.get(key);
}

// Register a new game (for custom games or testing)
export function registerGame(key: GameKey, game: AnyGame): void {
  gameRegistry.set(key, game);
}

// Get all registered game keys
export function getRegisteredGameKeys(): GameKey[] {
  return Array.from(gameRegistry.keys());
}

// Check if a game is registered
export function isGameRegistered(key: string): key is GameKey {
  return gameRegistry.has(key as GameKey);
}

// Export the registry for advanced use cases
export { gameRegistry };
