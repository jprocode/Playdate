// Socket.IO React hook

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '@playdate/shared';

import { getSocket, connectSocket, disconnectSocket, type TypedSocket } from '@/lib/socket-client';

interface UseSocketOptions {
  autoConnect?: boolean;
}

interface UseSocketReturn {
  socket: TypedSocket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { autoConnect = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Set initial state
    setIsConnected(socket.connected);

    // Auto-connect if enabled
    if (autoConnect && !socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [autoConnect]);

  const connect = useCallback(() => {
    connectSocket();
  }, []);

  const disconnect = useCallback(() => {
    disconnectSocket();
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connect,
    disconnect,
  };
}

// Hook to listen to socket events
export function useSocketEvent<K extends keyof ServerToClientEvents>(
  event: K,
  handler: ServerToClientEvents[K]
): void {
  useEffect(() => {
    const socket = getSocket();
    
    // @ts-expect-error - TypeScript doesn't understand the event typing here
    socket.on(event, handler);

    return () => {
      // @ts-expect-error - TypeScript doesn't understand the event typing here
      socket.off(event, handler);
    };
  }, [event, handler]);
}

// Hook to emit socket events
export function useSocketEmit() {
  const emit = useCallback(
    <K extends keyof ClientToServerEvents>(
      event: K,
      ...args: Parameters<ClientToServerEvents[K]>
    ) => {
      const socket = getSocket();
      if (socket.connected) {
        // @ts-ignore - TypeScript doesn't understand the emit typing here
        socket.emit(event, ...args);
      } else {
        console.warn(`Socket not connected, cannot emit ${event}`);
      }
    },
    []
  );

  return emit;
}

export default useSocket;

