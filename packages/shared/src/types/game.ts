// Game types

import type { GameKey } from '../constants/games.js';
import type { PlayerRole } from './room.js';

export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface BaseGameState {
  gameKey: GameKey;
  status: GameStatus;
  currentTurn: PlayerRole;
  serverSeq: number;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface GameScore {
  host: number;
  peer: number;
}

export interface GameWinner {
  winner: PlayerRole | 'draw';
  reason?: string;
}

// Generic action types
export interface BaseGameAction {
  type: string;
  clientSeq: number;
}

// Tic Tac Toe
export interface TicTacToeState extends BaseGameState {
  gameKey: 'tic-tac-toe';
  board: (PlayerRole | null)[][];
  winner: GameWinner | null;
}

export interface TicTacToeAction extends BaseGameAction {
  type: 'place';
  row: number;
  col: number;
}

// Connect 4
export interface Connect4State extends BaseGameState {
  gameKey: 'connect-4';
  board: (PlayerRole | null)[][];
  winner: GameWinner | null;
}

export interface Connect4Action extends BaseGameAction {
  type: 'drop';
  col: number;
}

// Chess
export interface ChessState extends BaseGameState {
  gameKey: 'chess';
  fen: string;
  moves: string[];
  winner: GameWinner | null;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
}

export interface ChessAction extends BaseGameAction {
  type: 'move';
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

// Trivia
export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
}

export interface TriviaState extends BaseGameState {
  gameKey: 'trivia';
  currentQuestion: TriviaQuestion | null;
  questionIndex: number;
  scores: GameScore;
  hostAnswered: boolean;
  peerAnswered: boolean;
  winner: GameWinner | null;
  roundEndTime: string | null;
}

export interface TriviaAction extends BaseGameAction {
  type: 'answer';
  optionIndex: number;
}

// Speed Wordle
export interface WordleGuess {
  word: string;
  result: ('correct' | 'present' | 'absent')[];
}

export interface SpeedWordleState extends BaseGameState {
  gameKey: 'speed-wordle';
  targetWord: string; // Hidden from players
  hostGuesses: WordleGuess[];
  peerGuesses: WordleGuess[];
  hostSolved: boolean;
  peerSolved: boolean;
  winner: GameWinner | null;
}

export interface SpeedWordleAction extends BaseGameAction {
  type: 'guess';
  word: string;
}

// Connections
export interface ConnectionsGroup {
  category: string;
  items: string[];
  difficulty: 1 | 2 | 3 | 4;
}

export interface ConnectionsState extends BaseGameState {
  gameKey: 'connections';
  tiles: string[];
  foundGroups: ConnectionsGroup[];
  strikes: number;
  selectedTiles: string[];
  winner: GameWinner | null;
  solution: ConnectionsGroup[]; // Hidden until revealed
}

export interface ConnectionsAction extends BaseGameAction {
  type: 'select' | 'deselect' | 'submit' | 'shuffle';
  tileId?: string;
  tiles?: string[];
}

// Hangman
export interface HangmanState extends BaseGameState {
  gameKey: 'hangman';
  secretWord: string; // Revealed progressively
  maskedWord: string;
  guessedLetters: string[];
  wrongGuesses: number;
  setter: PlayerRole;
  guesser: PlayerRole;
  winner: GameWinner | null;
  round: number;
  scores: GameScore;
}

export interface HangmanAction extends BaseGameAction {
  type: 'set_word' | 'guess_letter' | 'guess_word';
  word?: string;
  letter?: string;
}

// 20 Questions
export interface TwentyQuestionsQuestion {
  text: string;
  answer: 'yes' | 'no' | 'maybe';
}

export interface TwentyQuestionsState extends BaseGameState {
  gameKey: 'twenty-questions';
  secretObject: string; // Only visible to answerer
  answerer: PlayerRole;
  guesser: PlayerRole;
  questions: TwentyQuestionsQuestion[];
  questionsRemaining: number;
  winner: GameWinner | null;
}

export interface TwentyQuestionsAction extends BaseGameAction {
  type: 'ask' | 'answer' | 'guess';
  question?: string;
  answer?: 'yes' | 'no' | 'maybe';
  guess?: string;
}

// Co-op Crossword
export interface CrosswordCell {
  letter: string | null;
  isBlack: boolean;
  number?: number;
  correct?: boolean;
}

export interface CrosswordClue {
  number: number;
  direction: 'across' | 'down';
  text: string;
  answer: string;
}

export interface CrosswordState extends BaseGameState {
  gameKey: 'crossword';
  grid: CrosswordCell[][];
  clues: CrosswordClue[];
  hostCursor: { row: number; col: number } | null;
  peerCursor: { row: number; col: number } | null;
  completed: boolean;
  winner: GameWinner | null;
}

export interface CrosswordAction extends BaseGameAction {
  type: 'set_cell' | 'clear_cell' | 'move_cursor' | 'check';
  row?: number;
  col?: number;
  letter?: string;
}

// Pictionary
export interface PictionaryStroke {
  points: { x: number; y: number }[];
  color: string;
  size: number;
}

export interface PictionaryState extends BaseGameState {
  gameKey: 'pictionary';
  drawer: PlayerRole;
  guesser: PlayerRole;
  currentPrompt: string; // Only visible to drawer
  strokes: PictionaryStroke[];
  guesses: { text: string; correct: boolean }[];
  scores: GameScore;
  round: number;
  roundEndTime: string | null;
  winner: GameWinner | null;
}

export interface PictionaryAction extends BaseGameAction {
  type: 'draw' | 'guess' | 'clear' | 'undo';
  stroke?: PictionaryStroke;
  guess?: string;
}

// Union types for all games
export type GameState =
  | TicTacToeState
  | Connect4State
  | ChessState
  | TriviaState
  | SpeedWordleState
  | ConnectionsState
  | HangmanState
  | TwentyQuestionsState
  | CrosswordState
  | PictionaryState;

export type GameAction =
  | TicTacToeAction
  | Connect4Action
  | ChessAction
  | TriviaAction
  | SpeedWordleAction
  | ConnectionsAction
  | HangmanAction
  | TwentyQuestionsAction
  | CrosswordAction
  | PictionaryAction;

// View types (what each player sees - hides secret info)
export interface GameView<T extends GameState> {
  state: Omit<T, 'targetWord' | 'solution' | 'secretWord' | 'secretObject' | 'currentPrompt'>;
  myRole: PlayerRole;
  isMyTurn: boolean;
}
