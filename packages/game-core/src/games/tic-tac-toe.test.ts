// Tic-Tac-Toe Game Tests

import { describe, it, expect } from 'vitest';

import { ticTacToeGame, type TicTacToeState, type TicTacToeAction } from './tic-tac-toe.js';

describe('Tic-Tac-Toe Game', () => {
  describe('init', () => {
    it('should initialize an empty board', () => {
      const state = ticTacToeGame.init();
      
      expect(state.board).toEqual([null, null, null, null, null, null, null, null, null]);
      expect(state.currentTurn).toBe('host');
      expect(state.status).toBe('playing');
      expect(state.moves).toBe(0);
    });
  });

  describe('validateAction', () => {
    it('should allow valid moves', () => {
      const state = ticTacToeGame.init();
      const action: TicTacToeAction = { type: 'place', position: 4 };
      
      const result = ticTacToeGame.validateAction(state, 'host', action);
      
      expect(result.valid).toBe(true);
    });

    it('should reject moves on occupied cells', () => {
      let state = ticTacToeGame.init();
      const action: TicTacToeAction = { type: 'place', position: 4 };
      
      // First move
      state = ticTacToeGame.applyAction(state, 'host', action);
      
      // Try same cell
      const result = ticTacToeGame.validateAction(state, 'peer', action);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cell is already occupied');
    });

    it('should reject moves when not your turn', () => {
      const state = ticTacToeGame.init();
      const action: TicTacToeAction = { type: 'place', position: 4 };
      
      // It's host's turn, but peer tries to move
      const result = ticTacToeGame.validateAction(state, 'peer', action);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Not your turn');
    });

    it('should reject invalid positions', () => {
      const state = ticTacToeGame.init();
      
      const result1 = ticTacToeGame.validateAction(state, 'host', { type: 'place', position: -1 });
      const result2 = ticTacToeGame.validateAction(state, 'host', { type: 'place', position: 9 });
      
      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
    });
  });

  describe('applyAction', () => {
    it('should place X for host', () => {
      const state = ticTacToeGame.init();
      const newState = ticTacToeGame.applyAction(state, 'host', { type: 'place', position: 4 });
      
      expect(newState.board[4]).toBe('X');
      expect(newState.currentTurn).toBe('peer');
      expect(newState.moves).toBe(1);
    });

    it('should place O for peer', () => {
      let state = ticTacToeGame.init();
      state = ticTacToeGame.applyAction(state, 'host', { type: 'place', position: 0 });
      const newState = ticTacToeGame.applyAction(state, 'peer', { type: 'place', position: 4 });
      
      expect(newState.board[4]).toBe('O');
      expect(newState.currentTurn).toBe('host');
    });
  });

  describe('checkWinCondition', () => {
    it('should detect horizontal win', () => {
      let state = ticTacToeGame.init();
      
      // Host wins with top row: 0, 1, 2
      state = ticTacToeGame.applyAction(state, 'host', { type: 'place', position: 0 });
      state = ticTacToeGame.applyAction(state, 'peer', { type: 'place', position: 3 });
      state = ticTacToeGame.applyAction(state, 'host', { type: 'place', position: 1 });
      state = ticTacToeGame.applyAction(state, 'peer', { type: 'place', position: 4 });
      state = ticTacToeGame.applyAction(state, 'host', { type: 'place', position: 2 });
      
      const result = ticTacToeGame.checkWinCondition(state);
      
      expect(result).not.toBeNull();
      expect(result?.winner).toBe('host');
    });

    it('should detect vertical win', () => {
      let state = ticTacToeGame.init();
      
      // Host wins with left column: 0, 3, 6
      state = ticTacToeGame.applyAction(state, 'host', { type: 'place', position: 0 });
      state = ticTacToeGame.applyAction(state, 'peer', { type: 'place', position: 1 });
      state = ticTacToeGame.applyAction(state, 'host', { type: 'place', position: 3 });
      state = ticTacToeGame.applyAction(state, 'peer', { type: 'place', position: 2 });
      state = ticTacToeGame.applyAction(state, 'host', { type: 'place', position: 6 });
      
      const result = ticTacToeGame.checkWinCondition(state);
      
      expect(result).not.toBeNull();
      expect(result?.winner).toBe('host');
    });

    it('should detect diagonal win', () => {
      let state = ticTacToeGame.init();
      
      // Host wins with diagonal: 0, 4, 8
      state = ticTacToeGame.applyAction(state, 'host', { type: 'place', position: 0 });
      state = ticTacToeGame.applyAction(state, 'peer', { type: 'place', position: 1 });
      state = ticTacToeGame.applyAction(state, 'host', { type: 'place', position: 4 });
      state = ticTacToeGame.applyAction(state, 'peer', { type: 'place', position: 2 });
      state = ticTacToeGame.applyAction(state, 'host', { type: 'place', position: 8 });
      
      const result = ticTacToeGame.checkWinCondition(state);
      
      expect(result).not.toBeNull();
      expect(result?.winner).toBe('host');
    });

    it('should detect draw', () => {
      let state = ticTacToeGame.init();
      
      // Fill board without a winner
      // X O X
      // X X O
      // O X O
      const moves = [0, 1, 3, 4, 2, 6, 5, 8, 7];
      const players: Array<'host' | 'peer'> = ['host', 'peer', 'host', 'peer', 'host', 'peer', 'host', 'peer', 'host'];
      
      for (let i = 0; i < moves.length; i++) {
        state = ticTacToeGame.applyAction(state, players[i], { type: 'place', position: moves[i] });
      }
      
      const result = ticTacToeGame.checkWinCondition(state);
      
      expect(result).not.toBeNull();
      expect(result?.winner).toBe('draw');
    });

    it('should return null for ongoing game', () => {
      let state = ticTacToeGame.init();
      state = ticTacToeGame.applyAction(state, 'host', { type: 'place', position: 0 });
      
      const result = ticTacToeGame.checkWinCondition(state);
      
      expect(result).toBeNull();
    });
  });

  describe('getView', () => {
    it('should show correct symbol and turn for host', () => {
      const state = ticTacToeGame.init();
      const view = ticTacToeGame.getView(state, 'host');
      
      expect(view.mySymbol).toBe('X');
      expect(view.isMyTurn).toBe(true);
    });

    it('should show correct symbol and turn for peer', () => {
      const state = ticTacToeGame.init();
      const view = ticTacToeGame.getView(state, 'peer');
      
      expect(view.mySymbol).toBe('O');
      expect(view.isMyTurn).toBe(false);
    });
  });
});

