// Base game interface - placeholder for game-core-interface task

export interface GameState {
  gameKey: string;
  status: 'waiting' | 'playing' | 'finished';
  currentTurn: 'host' | 'peer';
  serverSeq: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface WinResult {
  winner: 'host' | 'peer' | 'draw';
  reason?: string;
}

export interface Game<TState extends GameState, TAction, TView> {
  init(seed?: string): TState;
  validateAction(state: TState, role: 'host' | 'peer', action: TAction): ValidationResult;
  applyAction(state: TState, role: 'host' | 'peer', action: TAction): TState;
  getView(state: TState, role: 'host' | 'peer'): TView;
  checkWinCondition(state: TState): WinResult | null;
}

