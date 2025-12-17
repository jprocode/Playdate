// WebRTC Signaling Handlers
// Handles WebRTC offer/answer/ICE candidate exchange between peers

import {
  SocketEvents,
  ErrorCodes,
  type RTCOfferPayload,
  type RTCAnswerPayload,
  type RTCIcePayload,
} from '@playdate/shared';

import type { TypedSocket, TypedServer } from '../index.js';
import { socketLogger } from '../../utils/logger.js';
import { getRoom } from './room.js';

export function registerWebRTCHandlers(io: TypedServer, socket: TypedSocket): void {
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

    socketLogger.debug(
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

    socketLogger.debug(
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
      // Peer might not be connected yet, buffer candidates (not implemented for simplicity)
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

