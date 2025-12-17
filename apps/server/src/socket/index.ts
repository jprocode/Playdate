// Socket.IO handler registration

import type { Server, Socket } from 'socket.io';

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@playdate/shared';

import { socketLogger } from '../utils/logger.js';
import { registerRoomHandlers, handleRoomDisconnect } from './handlers/room.js';
import { registerWebRTCHandlers } from './handlers/webrtc.js';
import { registerChatHandlers } from './handlers/chat.js';
import { registerGameHandlers } from './handlers/game.js';

export type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function registerSocketHandlers(io: TypedServer): void {
  io.on('connection', (socket: TypedSocket) => {
    socketLogger.info({ socketId: socket.id }, 'Client connected');

    // Initialize socket data
    socket.data = {
      roomId: null,
      role: null,
      displayName: 'Guest',
      userId: null,
    };

    // Register room handlers
    registerRoomHandlers(io, socket);

    // Register WebRTC signaling handlers
    registerWebRTCHandlers(io, socket);

    // Register chat and reaction handlers
    registerChatHandlers(io, socket);

    // Register game handlers
    registerGameHandlers(io, socket);

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      socketLogger.info(
        { socketId: socket.id, reason, roomId: socket.data.roomId },
        'Client disconnected'
      );

      // Handle room disconnect cleanup
      handleRoomDisconnect(io, socket);
    });
  });

  socketLogger.info('Socket.IO handlers registered');
}
