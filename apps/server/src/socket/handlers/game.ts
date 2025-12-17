// Game Socket Handlers
// Handles game selection, actions, and state management

import {
  SocketEvents,
  ErrorCodes,
  type GameSelectPayload,
  type GameReadyPayload,
  type GameActionPayload,
  type GameRematchPayload,
  type GameStatePayload,
  type GameErrorPayload,
  type GameStartPayload,
  type GameEndedPayload,
  type PlayerRole,
} from '@playdate/shared';

import { getGame, isGameRegistered, type GameKey } from '@playdate/game-core';

import type { TypedSocket, TypedServer } from '../index.js';
import { socketLogger } from '../../utils/logger.js';
import { getRoom, rooms } from './room.js';

// Game state per room
interface RoomGameState {
  gameKey: GameKey;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any;
  serverSeq: number;
  hostReady: boolean;
  peerReady: boolean;
}

const roomGameStates = new Map<string, RoomGameState>();

export function registerGameHandlers(io: TypedServer, socket: TypedSocket): void {
  // Handle game selection (host or both-ready)
  socket.on(SocketEvents.GAME_SELECT, (payload: GameSelectPayload) => {
    const { roomId, gameKey } = payload;

    // Validate socket is in room
    if (socket.data.roomId !== roomId) {
      socketLogger.warn({ socketId: socket.id, roomId }, 'Game select from socket not in room');
      return;
    }

    // Get room
    const room = getRoom(roomId);
    if (!room) {
      socketLogger.warn({ socketId: socket.id, roomId }, 'Room not found for game select');
      return;
    }

    // Validate game key
    if (!isGameRegistered(gameKey)) {
      socket.emit(SocketEvents.GAME_ERROR, {
        roomId,
        gameKey,
        code: ErrorCodes.GAME_NOT_FOUND,
        message: 'Game not found',
      });
      return;
    }

    // Only host can directly start a game
    if (socket.data.role !== 'host') {
      // Peer can set ready state but not force start
      const gameState = roomGameStates.get(roomId);
      if (gameState && gameState.gameKey === gameKey) {
        gameState.peerReady = true;
        // Check if both ready
        if (gameState.hostReady && gameState.peerReady) {
          startGame(io, roomId, gameKey);
        }
      }
      return;
    }

    // Initialize game state
    const game = getGame(gameKey);
    if (!game) {
      socket.emit(SocketEvents.GAME_ERROR, {
        roomId,
        gameKey,
        code: ErrorCodes.GAME_NOT_FOUND,
        message: 'Game implementation not found',
      });
      return;
    }

    // Start the game
    startGame(io, roomId, gameKey);
  });

  // Handle game ready
  socket.on(SocketEvents.GAME_READY, (payload: GameReadyPayload) => {
    const { roomId, gameKey, ready } = payload;

    if (socket.data.roomId !== roomId) {
      return;
    }

    let gameState = roomGameStates.get(roomId);
    
    if (!gameState) {
      // Create pending game state
      gameState = {
        gameKey,
        state: null,
        serverSeq: 0,
        hostReady: false,
        peerReady: false,
      };
      roomGameStates.set(roomId, gameState);
    }

    // Update ready state
    if (socket.data.role === 'host') {
      gameState.hostReady = ready;
    } else {
      gameState.peerReady = ready;
    }

    // Notify both players of ready state
    io.to(roomId).emit(SocketEvents.GAME_STATE, {
      roomId,
      gameKey,
      state: {
        hostReady: gameState.hostReady,
        peerReady: gameState.peerReady,
        waiting: true,
      },
      serverSeq: 0,
    });

    // Check if both ready
    if (gameState.hostReady && gameState.peerReady) {
      startGame(io, roomId, gameKey);
    }
  });

  // Handle game actions
  socket.on(SocketEvents.GAME_ACTION, (
    payload: GameActionPayload,
    callback?: (response: GameStatePayload | GameErrorPayload) => void
  ) => {
    const { roomId, gameKey, action } = payload;

    if (socket.data.roomId !== roomId) {
      const error: GameErrorPayload = {
        roomId,
        gameKey,
        code: ErrorCodes.FORBIDDEN,
        message: 'Not in this room',
      };
      if (callback) callback(error);
      return;
    }

    const gameState = roomGameStates.get(roomId);
    if (!gameState || gameState.gameKey !== gameKey) {
      const error: GameErrorPayload = {
        roomId,
        gameKey,
        code: ErrorCodes.GAME_NOT_STARTED,
        message: 'Game not started',
      };
      if (callback) callback(error);
      return;
    }

    const game = getGame(gameKey);
    if (!game) {
      const error: GameErrorPayload = {
        roomId,
        gameKey,
        code: ErrorCodes.GAME_NOT_FOUND,
        message: 'Game not found',
      };
      if (callback) callback(error);
      return;
    }

    const role = socket.data.role as PlayerRole;

    // Validate action
    const validation = game.validateAction(gameState.state, role, action);
    if (!validation.valid) {
      const error: GameErrorPayload = {
        roomId,
        gameKey,
        code: ErrorCodes.GAME_INVALID_ACTION,
        message: validation.error || 'Invalid action',
      };
      if (callback) callback(error);
      return;
    }

    // Apply action
    const newState = game.applyAction(gameState.state, role, action);
    gameState.state = newState;
    gameState.serverSeq++;

    // Check win condition
    const winResult = game.checkWinCondition(newState);

    // Broadcast new state to room
    const statePayload: GameStatePayload = {
      roomId,
      gameKey,
      state: newState,
      serverSeq: gameState.serverSeq,
    };

    io.to(roomId).emit(SocketEvents.GAME_STATE, statePayload);

    if (callback) {
      callback(statePayload);
    }

    // If game ended, emit ended event
    if (winResult) {
      const endedPayload: GameEndedPayload = {
        roomId,
        gameKey,
        winner: winResult.winner,
        finalState: newState,
      };
      io.to(roomId).emit(SocketEvents.GAME_ENDED, endedPayload);
      
      socketLogger.info(
        { roomId, gameKey, winner: winResult.winner },
        'Game ended'
      );
    }
  });

  // Handle rematch
  socket.on(SocketEvents.GAME_REMATCH, (payload: GameRematchPayload) => {
    const { roomId, gameKey } = payload;

    if (socket.data.roomId !== roomId) {
      return;
    }

    // Reset ready states
    const gameState = roomGameStates.get(roomId);
    if (gameState) {
      gameState.hostReady = socket.data.role === 'host';
      gameState.peerReady = socket.data.role === 'peer';
    }

    // Notify room
    io.to(roomId).emit(SocketEvents.GAME_STATE, {
      roomId,
      gameKey,
      state: {
        rematchRequested: true,
        requestedBy: socket.data.role,
        hostReady: gameState?.hostReady || false,
        peerReady: gameState?.peerReady || false,
      },
      serverSeq: 0,
    });

    // Check if both ready for rematch
    if (gameState?.hostReady && gameState?.peerReady) {
      startGame(io, roomId, gameKey);
    }
  });
}

function startGame(io: TypedServer, roomId: string, gameKey: GameKey): void {
  const game = getGame(gameKey);
  if (!game) {
    socketLogger.error({ roomId, gameKey }, 'Failed to start game - not found');
    return;
  }

  // Initialize game state
  const initialState = game.init();
  
  const gameState: RoomGameState = {
    gameKey,
    state: initialState,
    serverSeq: 1,
    hostReady: true,
    peerReady: true,
  };

  roomGameStates.set(roomId, gameState);

  // Update room
  const room = rooms.get(roomId);
  if (room) {
    room.currentGameKey = gameKey;
  }

  // Emit game start to room
  const startPayload: GameStartPayload = {
    roomId,
    gameKey,
    state: initialState,
  };

  io.to(roomId).emit(SocketEvents.GAME_START, startPayload);

  socketLogger.info({ roomId, gameKey }, 'Game started');
}

// Clean up game state when room is closed
export function cleanupGameState(roomId: string): void {
  roomGameStates.delete(roomId);
}

// Get current game state for a room
export function getRoomGameState(roomId: string): RoomGameState | undefined {
  return roomGameStates.get(roomId);
}

