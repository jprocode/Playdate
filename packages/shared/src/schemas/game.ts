// Game validation schemas

import { z } from 'zod';

import { GameKeys } from '../constants/games.js';

// Game key enum
export const gameKeySchema = z.enum([
  GameKeys.TIC_TAC_TOE,
  GameKeys.CONNECT_4,
  GameKeys.CHESS,
  GameKeys.TRIVIA,
  GameKeys.CROSSWORD,
  GameKeys.SPEED_WORDLE,
  GameKeys.CONNECTIONS,
  GameKeys.HANGMAN,
  GameKeys.TWENTY_QUESTIONS,
  GameKeys.PICTIONARY,
]);

// Player role
export const playerRoleSchema = z.enum(['host', 'peer']);

// Base action schema
export const baseActionSchema = z.object({
  type: z.string(),
  clientSeq: z.number().int().min(0),
});

// Game-specific action schemas
export const ticTacToeActionSchema = z.object({
  type: z.literal('place'),
  clientSeq: z.number().int().min(0),
  row: z.number().int().min(0).max(2),
  col: z.number().int().min(0).max(2),
});

export const connect4ActionSchema = z.object({
  type: z.literal('drop'),
  clientSeq: z.number().int().min(0),
  col: z.number().int().min(0).max(6),
});

export const chessActionSchema = z.object({
  type: z.literal('move'),
  clientSeq: z.number().int().min(0),
  from: z.string().regex(/^[a-h][1-8]$/, 'Invalid chess square'),
  to: z.string().regex(/^[a-h][1-8]$/, 'Invalid chess square'),
  promotion: z.enum(['q', 'r', 'b', 'n']).optional(),
});

export const triviaActionSchema = z.object({
  type: z.literal('answer'),
  clientSeq: z.number().int().min(0),
  optionIndex: z.number().int().min(0).max(3),
});

export const speedWordleActionSchema = z.object({
  type: z.literal('guess'),
  clientSeq: z.number().int().min(0),
  word: z.string().length(5).regex(/^[a-zA-Z]+$/, 'Word must contain only letters'),
});

export const connectionsSelectActionSchema = z.object({
  type: z.literal('select'),
  clientSeq: z.number().int().min(0),
  tileId: z.string(),
});

export const connectionsDeselectActionSchema = z.object({
  type: z.literal('deselect'),
  clientSeq: z.number().int().min(0),
  tileId: z.string(),
});

export const connectionsSubmitActionSchema = z.object({
  type: z.literal('submit'),
  clientSeq: z.number().int().min(0),
  tiles: z.array(z.string()).length(4),
});

export const connectionsShuffleActionSchema = z.object({
  type: z.literal('shuffle'),
  clientSeq: z.number().int().min(0),
});

export const hangmanSetWordActionSchema = z.object({
  type: z.literal('set_word'),
  clientSeq: z.number().int().min(0),
  word: z.string().min(1).max(50),
});

export const hangmanGuessLetterActionSchema = z.object({
  type: z.literal('guess_letter'),
  clientSeq: z.number().int().min(0),
  letter: z.string().length(1).regex(/^[a-zA-Z]$/),
});

export const hangmanGuessWordActionSchema = z.object({
  type: z.literal('guess_word'),
  clientSeq: z.number().int().min(0),
  word: z.string().min(1).max(50),
});

export const twentyQuestionsAskActionSchema = z.object({
  type: z.literal('ask'),
  clientSeq: z.number().int().min(0),
  question: z.string().min(1).max(200),
});

export const twentyQuestionsAnswerActionSchema = z.object({
  type: z.literal('answer'),
  clientSeq: z.number().int().min(0),
  answer: z.enum(['yes', 'no', 'maybe']),
});

export const twentyQuestionsGuessActionSchema = z.object({
  type: z.literal('guess_object'),
  clientSeq: z.number().int().min(0),
  guess: z.string().min(1).max(100),
});

export const crosswordSetCellActionSchema = z.object({
  type: z.literal('set_cell'),
  clientSeq: z.number().int().min(0),
  row: z.number().int().min(0),
  col: z.number().int().min(0),
  letter: z.string().length(1).regex(/^[a-zA-Z]$/),
});

export const crosswordClearCellActionSchema = z.object({
  type: z.literal('clear_cell'),
  clientSeq: z.number().int().min(0),
  row: z.number().int().min(0),
  col: z.number().int().min(0),
});

export const crosswordMoveCursorActionSchema = z.object({
  type: z.literal('move_cursor'),
  clientSeq: z.number().int().min(0),
  row: z.number().int().min(0),
  col: z.number().int().min(0),
});

export const crosswordCheckActionSchema = z.object({
  type: z.literal('check'),
  clientSeq: z.number().int().min(0),
});

export const pictionaryStrokeSchema = z.object({
  points: z.array(z.object({
    x: z.number(),
    y: z.number(),
  })),
  color: z.string(),
  size: z.number().positive(),
});

export const pictionaryDrawActionSchema = z.object({
  type: z.literal('draw'),
  clientSeq: z.number().int().min(0),
  stroke: pictionaryStrokeSchema,
});

export const pictionaryGuessActionSchema = z.object({
  type: z.literal('pictionary_guess'),
  clientSeq: z.number().int().min(0),
  guess: z.string().min(1).max(100),
});

export const pictionaryClearActionSchema = z.object({
  type: z.literal('clear'),
  clientSeq: z.number().int().min(0),
});

export const pictionaryUndoActionSchema = z.object({
  type: z.literal('undo'),
  clientSeq: z.number().int().min(0),
});

// Union of all game actions
export const gameActionSchema = z.discriminatedUnion('type', [
  ticTacToeActionSchema,
  connect4ActionSchema,
  chessActionSchema,
  triviaActionSchema,
  speedWordleActionSchema,
  connectionsSelectActionSchema,
  connectionsDeselectActionSchema,
  connectionsSubmitActionSchema,
  connectionsShuffleActionSchema,
  hangmanSetWordActionSchema,
  hangmanGuessLetterActionSchema,
  hangmanGuessWordActionSchema,
  twentyQuestionsAskActionSchema,
  twentyQuestionsAnswerActionSchema,
  twentyQuestionsGuessActionSchema,
  crosswordSetCellActionSchema,
  crosswordClearCellActionSchema,
  crosswordMoveCursorActionSchema,
  crosswordCheckActionSchema,
  pictionaryDrawActionSchema,
  pictionaryGuessActionSchema,
  pictionaryClearActionSchema,
  pictionaryUndoActionSchema,
]);

// Game select payload
export const gameSelectPayloadSchema = z.object({
  roomId: z.string(),
  gameKey: gameKeySchema,
});

// Game ready payload
export const gameReadyPayloadSchema = z.object({
  roomId: z.string(),
  gameKey: gameKeySchema,
  ready: z.boolean(),
});

// Game action payload
export const gameActionPayloadSchema = z.object({
  roomId: z.string(),
  gameKey: gameKeySchema,
  action: gameActionSchema,
});

// Type exports
export type GameKeyInput = z.infer<typeof gameKeySchema>;
export type PlayerRoleInput = z.infer<typeof playerRoleSchema>;
export type GameActionInput = z.infer<typeof gameActionSchema>;
export type GameSelectPayloadInput = z.infer<typeof gameSelectPayloadSchema>;
export type GameReadyPayloadInput = z.infer<typeof gameReadyPayloadSchema>;
export type GameActionPayloadInput = z.infer<typeof gameActionPayloadSchema>;
