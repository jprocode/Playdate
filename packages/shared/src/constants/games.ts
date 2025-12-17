// Game keys and constants

export const GameKeys = {
  TIC_TAC_TOE: 'tic-tac-toe',
  CONNECT_4: 'connect-4',
  CHESS: 'chess',
  TRIVIA: 'trivia',
  CROSSWORD: 'crossword',
  SPEED_WORDLE: 'speed-wordle',
  CONNECTIONS: 'connections',
  HANGMAN: 'hangman',
  TWENTY_QUESTIONS: 'twenty-questions',
  PICTIONARY: 'pictionary',
} as const;

export type GameKey = (typeof GameKeys)[keyof typeof GameKeys];

export const GAME_LIST: readonly GameKey[] = Object.values(GameKeys);

export interface GameMetadata {
  key: GameKey;
  name: string;
  description: string;
  minPlayers: 2;
  maxPlayers: 2;
  hasTimer: boolean;
  hasTurns: boolean;
  category: 'classic' | 'word' | 'drawing' | 'trivia';
}

export const GAMES_METADATA: Record<GameKey, GameMetadata> = {
  [GameKeys.TIC_TAC_TOE]: {
    key: GameKeys.TIC_TAC_TOE,
    name: 'Tic Tac Toe',
    description: 'Classic 3x3 grid game. Get three in a row to win!',
    minPlayers: 2,
    maxPlayers: 2,
    hasTimer: false,
    hasTurns: true,
    category: 'classic',
  },
  [GameKeys.CONNECT_4]: {
    key: GameKeys.CONNECT_4,
    name: 'Connect 4',
    description: 'Drop discs to connect four in a row!',
    minPlayers: 2,
    maxPlayers: 2,
    hasTimer: false,
    hasTurns: true,
    category: 'classic',
  },
  [GameKeys.CHESS]: {
    key: GameKeys.CHESS,
    name: 'Chess',
    description: 'The classic game of strategy.',
    minPlayers: 2,
    maxPlayers: 2,
    hasTimer: true,
    hasTurns: true,
    category: 'classic',
  },
  [GameKeys.TRIVIA]: {
    key: GameKeys.TRIVIA,
    name: 'Trivia',
    description: 'Race to answer 10 questions correctly first!',
    minPlayers: 2,
    maxPlayers: 2,
    hasTimer: true,
    hasTurns: false,
    category: 'trivia',
  },
  [GameKeys.CROSSWORD]: {
    key: GameKeys.CROSSWORD,
    name: 'Co-op Crossword',
    description: 'Work together to solve the crossword puzzle!',
    minPlayers: 2,
    maxPlayers: 2,
    hasTimer: false,
    hasTurns: false,
    category: 'word',
  },
  [GameKeys.SPEED_WORDLE]: {
    key: GameKeys.SPEED_WORDLE,
    name: 'Speed Wordle',
    description: 'Race to guess the 5-letter word first!',
    minPlayers: 2,
    maxPlayers: 2,
    hasTimer: true,
    hasTurns: false,
    category: 'word',
  },
  [GameKeys.CONNECTIONS]: {
    key: GameKeys.CONNECTIONS,
    name: 'Connections',
    description: 'Find the four groups of four!',
    minPlayers: 2,
    maxPlayers: 2,
    hasTimer: false,
    hasTurns: false,
    category: 'word',
  },
  [GameKeys.HANGMAN]: {
    key: GameKeys.HANGMAN,
    name: 'Hangman',
    description: 'Guess the word before running out of tries!',
    minPlayers: 2,
    maxPlayers: 2,
    hasTimer: false,
    hasTurns: true,
    category: 'word',
  },
  [GameKeys.TWENTY_QUESTIONS]: {
    key: GameKeys.TWENTY_QUESTIONS,
    name: '20 Questions',
    description: 'Ask yes/no questions to guess the object!',
    minPlayers: 2,
    maxPlayers: 2,
    hasTimer: false,
    hasTurns: true,
    category: 'trivia',
  },
  [GameKeys.PICTIONARY]: {
    key: GameKeys.PICTIONARY,
    name: 'Pictionary',
    description: 'Draw and guess to score points!',
    minPlayers: 2,
    maxPlayers: 2,
    hasTimer: true,
    hasTurns: true,
    category: 'drawing',
  },
};

// Game configuration
export const GAME_CONFIG = {
  TRIVIA: {
    WINNING_SCORE: 10,
    QUESTION_TIME_SECONDS: 15,
  },
  SPEED_WORDLE: {
    MAX_GUESSES: 6,
    WORD_LENGTH: 5,
  },
  CONNECTIONS: {
    MAX_STRIKES: 4,
    GROUPS_COUNT: 4,
    ITEMS_PER_GROUP: 4,
  },
  HANGMAN: {
    MAX_WRONG_GUESSES: 6,
  },
  TWENTY_QUESTIONS: {
    MAX_QUESTIONS: 20,
  },
  PICTIONARY: {
    ROUND_TIME_SECONDS: 60,
    ROUNDS_PER_GAME: 6,
  },
} as const;
