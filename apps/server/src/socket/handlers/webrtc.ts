// WebRTC Signaling Handlers
// Handles WebRTC offer/answer/ICE candidate exchange between peers

import {
  SocketEvents,
  type RTCOfferPayload,
  type RTCAnswerPayload,
  type RTCIcePayload,
  type RTCReadyPayload,
} from '@playdate/shared';

import type { TypedSocket, TypedServer } from '../index.js';
import { socketLogger } from '../../utils/logger.js';
import { getRoom } from './room.js';

// Track WebRTC ready state per room
interface RoomRTCState {
  hostReady: boolean;
  peerReady: boolean;
}

const roomRTCStates = new Map<string, RoomRTCState>();

// Get or create RTC state for a room
function getRTCState(roomId: string): RoomRTCState {
  let state = roomRTCStates.get(roomId);
  if (!state) {
    state = { hostReady: false, peerReady: false };
    roomRTCStates.set(roomId, state);
  }
  return state;
}

// Reset RTC state for a room
export function resetRTCState(roomId: string): void {
  roomRTCStates.delete(roomId);
}

// Clean up RTC state when a socket disconnects
export function handleRTCDisconnect(roomId: string, role: 'host' | 'peer'): void {
  const state = roomRTCStates.get(roomId);
  if (state) {
    if (role === 'host') {
      state.hostReady = false;
    } else {
      state.peerReady = false;
    }
  }
}

export function registerWebRTCHandlers(io: TypedServer, socket: TypedSocket): void {
  // Handle RTC Ready - both peers must signal ready before negotiation starts
  socket.on(SocketEvents.RTC_READY, (payload: RTCReadyPayload) => {
    const { roomId } = payload;

    // Validate socket is in a room
    if (socket.data.roomId !== roomId) {
      socketLogger.warn(
        { socketId: socket.id, roomId },
        'RTC ready from socket not in room'
      );
      return;
    }

    // Get room
    const room = getRoom(roomId);
    if (!room) {
      socketLogger.warn({ socketId: socket.id, roomId }, 'Room not found for RTC ready');
      return;
    }

    // Update ready state
    const rtcState = getRTCState(roomId);
    const isHost = room.hostSocketId === socket.id;
    
    if (isHost) {
      rtcState.hostReady = true;
    } else {
      rtcState.peerReady = true;
    }

    socketLogger.info(
      { socketId: socket.id, roomId, isHost, hostReady: rtcState.hostReady, peerReady: rtcState.peerReady },
      'RTC ready state updated'
    );

    // Check if both are ready to start negotiation
    if (rtcState.hostReady && rtcState.peerReady) {
      socketLogger.info({ roomId }, 'Both peers ready, triggering negotiation');
      
      // Emit negotiate event to both peers - host will create offer
      io.to(roomId).emit(SocketEvents.RTC_NEGOTIATE, {
        roomId,
        initiator: 'host',
      });

      // Reset ready state for potential renegotiation
      rtcState.hostReady = false;
      rtcState.peerReady = false;
    }
  });

  // Handle RTC Offer - forward to peer
  socket.on(SocketEvents.RTC_OFFER, (payload: RTCOfferPayload) => {
    const { roomId, sdp } = payload;

    // Validate socket is in a room
    if (socket.data.roomId !== roomId) {
      socketLogger.warn(
        { socketId: socket.id, roomId },
        'RTC offer from socket not in room'
      );
      return;
    }

    // Get room and find peer
    const room = getRoom(roomId);
    if (!room) {
      socketLogger.warn({ socketId: socket.id, roomId }, 'Room not found for RTC offer');
      return;
    }

    // Determine the peer socket ID
    const peerSocketId =
      room.hostSocketId === socket.id ? room.peerSocketId : room.hostSocketId;

    if (!peerSocketId) {
      socketLogger.warn({ socketId: socket.id, roomId }, 'No peer found for RTC offer');
      return;
    }

    // Forward offer to peer
    io.to(peerSocketId).emit(SocketEvents.RTC_OFFER, {
      roomId,
      sdp,
    });

    socketLogger.info(
      { socketId: socket.id, peerSocketId, roomId },
      'RTC offer forwarded'
    );
  });

  // Handle RTC Answer - forward to peer
  socket.on(SocketEvents.RTC_ANSWER, (payload: RTCAnswerPayload) => {
    const { roomId, sdp } = payload;

    // Validate socket is in a room
    if (socket.data.roomId !== roomId) {
      socketLogger.warn(
        { socketId: socket.id, roomId },
        'RTC answer from socket not in room'
      );
      return;
    }

    // Get room and find peer
    const room = getRoom(roomId);
    if (!room) {
      socketLogger.warn({ socketId: socket.id, roomId }, 'Room not found for RTC answer');
      return;
    }

    // Determine the peer socket ID
    const peerSocketId =
      room.hostSocketId === socket.id ? room.peerSocketId : room.hostSocketId;

    if (!peerSocketId) {
      socketLogger.warn({ socketId: socket.id, roomId }, 'No peer found for RTC answer');
      return;
    }

    // Forward answer to peer
    io.to(peerSocketId).emit(SocketEvents.RTC_ANSWER, {
      roomId,
      sdp,
    });

    socketLogger.info(
      { socketId: socket.id, peerSocketId, roomId },
      'RTC answer forwarded'
    );
  });

  // Handle RTC ICE Candidate - forward to peer
  socket.on(SocketEvents.RTC_ICE, (payload: RTCIcePayload) => {
    const { roomId, candidate } = payload;

    // Validate socket is in a room
    if (socket.data.roomId !== roomId) {
      socketLogger.warn(
        { socketId: socket.id, roomId },
        'RTC ICE candidate from socket not in room'
      );
      return;
    }

    // Get room and find peer
    const room = getRoom(roomId);
    if (!room) {
      socketLogger.warn({ socketId: socket.id, roomId }, 'Room not found for RTC ICE');
      return;
    }

    // Determine the peer socket ID
    const peerSocketId =
      room.hostSocketId === socket.id ? room.peerSocketId : room.hostSocketId;

    if (!peerSocketId) {
      // Peer might not be connected yet, log but don't error
      socketLogger.debug(
        { socketId: socket.id, roomId },
        'No peer for RTC ICE candidate, ignoring'
      );
      return;
    }

    // Forward ICE candidate to peer
    io.to(peerSocketId).emit(SocketEvents.RTC_ICE, {
      roomId,
      candidate,
    });

    socketLogger.debug(
      { socketId: socket.id, peerSocketId, roomId },
      'RTC ICE candidate forwarded'
    );
  });
}
