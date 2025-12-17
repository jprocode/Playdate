// Room Socket Handlers
// Handles room creation, joining, leaving, and closing

import * as argon2 from 'argon2';
import { nanoid } from 'nanoid';

import {
  SocketEvents,
  ErrorCodes,
  type RoomCreatePayload,
  type RoomJoinPayload,
  type RoomLeavePayload,
  type RoomClosePayload,
  type RoomCreatedPayload,
  type RoomJoinedPayload,
  type RoomWaitingPayload,
  type RoomErrorPayload,
  type RoomState,
  type PlayerRole,
  roomCreatePayloadSchema,
  roomJoinPayloadSchema,
} from '@playdate/shared';

import type { TypedSocket, TypedServer } from '../index.js';
import { socketLogger } from '../../utils/logger.js';
import {
  isRateLimited,
  recordFailedAttempt,
  resetAttempts,
} from '../../utils/rate-limit.js';

// In-memory room storage
interface InMemoryRoom {
  roomId: string;
  passwordHash: string;
  status: 'open' | 'closed';
  hostSocketId: string | null;
  hostDisplayName: string | null;
  peerSocketId: string | null;
  peerDisplayName: string | null;
  currentGameKey: string | null;
  gameState: unknown | null;
  serverSeq: number;
  createdAt: Date;
}

export const rooms = new Map<string, InMemoryRoom>();

// Generate a URL-safe room ID using NanoID
function generateRoomId(): string {
  // Use custom alphabet without ambiguous characters
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return nanoid(10);
}

// Generate a strong password (8+ chars, mixed case + numbers)
function generatePassword(): string {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const all = lower + upper + numbers;
  
  let result = '';
  // Ensure at least one of each type
  result += lower.charAt(Math.floor(Math.random() * lower.length));
  result += upper.charAt(Math.floor(Math.random() * upper.length));
  result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  // Fill remaining 9 characters
  for (let i = 3; i < 12; i++) {
    result += all.charAt(Math.floor(Math.random() * all.length));
  }
  
  // Shuffle the password
  return result.split('').sort(() => Math.random() - 0.5).join('');
}

// Get room state for client
function getRoomState(room: InMemoryRoom): RoomState {
  return {
    roomId: room.roomId,
    status: room.status,
    hostConnected: room.hostSocketId !== null,
    peerConnected: room.peerSocketId !== null,
    currentGameKey: room.currentGameKey,
    createdAt: room.createdAt.toISOString(),
  };
}

export function registerRoomHandlers(io: TypedServer, socket: TypedSocket): void {
  // Handle room creation
  socket.on(SocketEvents.ROOM_CREATE, async (
    payload: RoomCreatePayload,
    callback: (response: RoomCreatedPayload | RoomErrorPayload) => void
  ) => {
    try {
      // Validate payload
      const validation = roomCreatePayloadSchema.safeParse(payload);
      if (!validation.success) {
        socketLogger.warn({ errors: validation.error.errors }, 'Invalid room create payload');
        return callback({
          code: ErrorCodes.VALIDATION_ERROR,
          message: validation.error.errors[0]?.message || 'Invalid input',
        });
      }

      const { desiredRoomId, desiredPassword, displayName } = validation.data;

      // Generate or use provided room ID
      let roomId = desiredRoomId || generateRoomId();
      
      // Check if room ID is already taken
      if (rooms.has(roomId)) {
        if (desiredRoomId) {
          return callback({
            code: ErrorCodes.ROOM_CREATE_FAILED,
            message: 'Room ID is already taken',
          });
        }
        // Generate a new one if auto-generated conflicted
        roomId = generateRoomId();
      }

      // Generate or use provided password
      const password = desiredPassword || generatePassword();

      // Hash the password
      const passwordHash = await argon2.hash(password);

      // Create the room
      const room: InMemoryRoom = {
        roomId,
        passwordHash,
        status: 'open',
        hostSocketId: socket.id,
        hostDisplayName: displayName,
        peerSocketId: null,
        peerDisplayName: null,
        currentGameKey: null,
        gameState: null,
        serverSeq: 0,
        createdAt: new Date(),
      };

      rooms.set(roomId, room);

      // Update socket data
      socket.data.roomId = roomId;
      socket.data.role = 'host';
      socket.data.displayName = displayName;

      // Join the socket room
      socket.join(roomId);

      socketLogger.info({ roomId, socketId: socket.id, displayName }, 'Room created');

      // Return success
      callback({
        roomId,
        inviteLink: `/join?roomId=${roomId}`,
        password,
        role: 'host',
      });
    } catch (error) {
      socketLogger.error({ error }, 'Failed to create room');
      callback({
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to create room',
      });
    }
  });

  // Handle room joining
  socket.on(SocketEvents.ROOM_JOIN, async (
    payload: RoomJoinPayload,
    callback: (response: RoomJoinedPayload | RoomWaitingPayload | RoomErrorPayload) => void
  ) => {
    try {
      // Validate payload
      const validation = roomJoinPayloadSchema.safeParse(payload);
      if (!validation.success) {
        socketLogger.warn({ errors: validation.error.errors }, 'Invalid room join payload');
        return callback({
          code: ErrorCodes.VALIDATION_ERROR,
          message: validation.error.errors[0]?.message || 'Invalid input',
        });
      }

      const { roomId, password, displayName } = validation.data;

      // Check rate limiting
      const rateLimitStatus = isRateLimited(roomId);
      if (rateLimitStatus.limited) {
        const minutesRemaining = Math.ceil((rateLimitStatus.lockoutRemaining || 0) / 60000);
        return callback({
          code: ErrorCodes.ROOM_LOCKED,
          message: `Too many failed attempts. Try again in ${minutesRemaining} minute(s).`,
        });
      }

      // Find the room
      const room = rooms.get(roomId);
      if (!room) {
        recordFailedAttempt(roomId);
        return callback({
          code: ErrorCodes.ROOM_NOT_FOUND,
          message: 'Room not found',
        });
      }

      // Check if room is closed
      if (room.status === 'closed') {
        return callback({
          code: ErrorCodes.ROOM_CLOSED,
          message: 'This room has been closed',
        });
      }

      // Verify password
      const isValidPassword = await argon2.verify(room.passwordHash, password);
      if (!isValidPassword) {
        const result = recordFailedAttempt(roomId);
        if (result.locked) {
          return callback({
            code: ErrorCodes.ROOM_LOCKED,
            message: 'Too many failed attempts. Room is temporarily locked.',
          });
        }
        return callback({
          code: ErrorCodes.ROOM_PASSWORD_INVALID,
          message: `Invalid password. ${result.attemptsRemaining} attempts remaining.`,
        });
      }

      // Password correct - reset rate limit
      resetAttempts(roomId);

      // Check if room is full
      if (room.peerSocketId !== null && room.hostSocketId !== null) {
        return callback({
          code: ErrorCodes.ROOM_FULL,
          message: 'Room is full',
        });
      }

      // Determine role and join
      let role: PlayerRole;
      
      if (room.hostSocketId === null) {
        // Rejoin as host (rare case - original host disconnected)
        room.hostSocketId = socket.id;
        room.hostDisplayName = displayName;
        role = 'host';
      } else if (room.peerSocketId === null) {
        // Join as peer
        room.peerSocketId = socket.id;
        room.peerDisplayName = displayName;
        role = 'peer';
      } else {
        return callback({
          code: ErrorCodes.ROOM_FULL,
          message: 'Room is full',
        });
      }

      // Update socket data
      socket.data.roomId = roomId;
      socket.data.role = role;
      socket.data.displayName = displayName;

      // Join the socket room
      socket.join(roomId);

      socketLogger.info({ roomId, socketId: socket.id, displayName, role }, 'Joined room');

      // Check if both participants are connected
      const bothConnected = room.hostSocketId !== null && room.peerSocketId !== null;

      if (bothConnected) {
        // Notify both parties that room is ready
        const roomState = getRoomState(room);
        
        // Send joined response to the joiner
        callback({
          roomId,
          role,
          roomState,
          peer: {
            displayName: role === 'host' ? room.peerDisplayName! : room.hostDisplayName!,
            connected: true,
          },
        });

        // Notify the other participant
        const otherSocketId = role === 'host' ? room.peerSocketId : room.hostSocketId;
        if (otherSocketId) {
          io.to(otherSocketId).emit(SocketEvents.ROOM_READY, {
            roomId,
            peerDisplayName: displayName,
          });
        }
      } else {
        // Send waiting response
        callback({
          roomId,
          role,
        } as RoomWaitingPayload);
      }
    } catch (error) {
      socketLogger.error({ error }, 'Failed to join room');
      callback({
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to join room',
      });
    }
  });

  // Handle room leaving
  socket.on(SocketEvents.ROOM_LEAVE, (payload: RoomLeavePayload) => {
    const { roomId } = payload;
    const room = rooms.get(roomId);

    if (!room) {
      return;
    }

    // Leave the socket room
    socket.leave(roomId);

    // Update room state
    if (room.hostSocketId === socket.id) {
      const peerSocketId = room.peerSocketId;
      room.hostSocketId = null;
      room.hostDisplayName = null;
      
      // Notify peer if connected
      if (peerSocketId) {
        io.to(peerSocketId).emit(SocketEvents.ROOM_PEER_DISCONNECTED, {
          roomId,
          peerDisplayName: socket.data.displayName,
        });
      }
    } else if (room.peerSocketId === socket.id) {
      const hostSocketId = room.hostSocketId;
      room.peerSocketId = null;
      room.peerDisplayName = null;
      
      // Notify host if connected
      if (hostSocketId) {
        io.to(hostSocketId).emit(SocketEvents.ROOM_PEER_DISCONNECTED, {
          roomId,
          peerDisplayName: socket.data.displayName,
        });
      }
    }

    // Clear socket data
    socket.data.roomId = null;
    socket.data.role = null;

    socketLogger.info({ roomId, socketId: socket.id }, 'Left room');

    // Clean up empty rooms
    if (!room.hostSocketId && !room.peerSocketId) {
      rooms.delete(roomId);
      socketLogger.info({ roomId }, 'Room deleted (empty)');
    }
  });

  // Handle room closing (host only)
  socket.on(SocketEvents.ROOM_CLOSE, (payload: RoomClosePayload) => {
    const { roomId } = payload;
    const room = rooms.get(roomId);

    if (!room) {
      return;
    }

    // Only host can close the room
    if (room.hostSocketId !== socket.id) {
      socketLogger.warn({ roomId, socketId: socket.id }, 'Non-host tried to close room');
      return;
    }

    // Mark room as closed
    room.status = 'closed';

    // Notify peer if connected
    if (room.peerSocketId) {
      io.to(room.peerSocketId).emit(SocketEvents.ROOM_CLOSED, {
        roomId,
        reason: 'host_closed',
      });
    }

    // Leave both parties from the room
    io.socketsLeave(roomId);

    // Clean up
    rooms.delete(roomId);

    socketLogger.info({ roomId, socketId: socket.id }, 'Room closed by host');
  });
}

// Handle disconnection (called from main socket handler)
export function handleRoomDisconnect(io: TypedServer, socket: TypedSocket): void {
  const roomId = socket.data.roomId;
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  if (room.hostSocketId === socket.id) {
    room.hostSocketId = null;
    room.hostDisplayName = null;
    
    // Notify peer
    if (room.peerSocketId) {
      io.to(room.peerSocketId).emit(SocketEvents.ROOM_PEER_DISCONNECTED, {
        roomId,
        peerDisplayName: socket.data.displayName,
      });
    }
  } else if (room.peerSocketId === socket.id) {
    room.peerSocketId = null;
    room.peerDisplayName = null;
    
    // Notify host
    if (room.hostSocketId) {
      io.to(room.hostSocketId).emit(SocketEvents.ROOM_PEER_DISCONNECTED, {
        roomId,
        peerDisplayName: socket.data.displayName,
      });
    }
  }

  // Clean up empty rooms after a delay (allow for reconnection)
  if (!room.hostSocketId && !room.peerSocketId) {
    setTimeout(() => {
      const currentRoom = rooms.get(roomId);
      if (currentRoom && !currentRoom.hostSocketId && !currentRoom.peerSocketId) {
        rooms.delete(roomId);
        socketLogger.info({ roomId }, 'Room cleaned up after disconnect timeout');
      }
    }, 60000); // 1 minute timeout for reconnection
  }
}

// Get room by ID (for other handlers)
export function getRoom(roomId: string): InMemoryRoom | undefined {
  return rooms.get(roomId);
}

