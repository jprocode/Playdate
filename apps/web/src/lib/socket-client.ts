// Socket.IO client singleton

import { io, Socket } from 'socket.io-client';

import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@playdate/shared';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function connectSocket(): TypedSocket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

// Helper to ensure socket is connected before emitting
export async function ensureConnected(): Promise<TypedSocket> {
  const s = getSocket();
  
  if (s.connected) {
    return s;
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Socket connection timeout'));
    }, 10000);

    s.once('connect', () => {
      clearTimeout(timeout);
      resolve(s);
    });

    s.once('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    s.connect();
  });
}

export default getSocket;

