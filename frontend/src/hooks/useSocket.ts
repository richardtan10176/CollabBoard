'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import {
  ActiveUser,
  TextChangeEvent,
  CursorMoveEvent,
  UserJoinedEvent,
  UserLeftEvent,
  SaveCompleteEvent,
  DocumentJoinedEvent,
} from '@/types';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  activeUsers: ActiveUser[];
  joinDocument: (documentId: string) => void;
  leaveDocument: (documentId: string) => void;
  sendTextChange: (documentId: string, content: string, operation?: any) => void;
  sendCursorMove: (documentId: string, position: number) => void;
  saveDocument: (documentId: string, content: string) => void;
}

interface UseSocketProps {
  onDocumentJoined?: (data: DocumentJoinedEvent) => void;
  onTextChanged?: (data: TextChangeEvent) => void;
  onCursorMoved?: (data: CursorMoveEvent) => void;
  onUserJoined?: (data: UserJoinedEvent) => void;
  onUserLeft?: (data: UserLeftEvent) => void;
  onSaveComplete?: (data: SaveCompleteEvent) => void;
  onError?: (error: { message: string }) => void;
}

export const useSocket = ({
  onDocumentJoined,
  onTextChanged,
  onCursorMoved,
  onUserJoined,
  onUserLeft,
  onSaveComplete,
  onError,
}: UseSocketProps = {}): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const pendingDocumentIdRef = useRef<string | null>(null);

  useEffect(() => {
    const token = Cookies.get('token');
    
    if (!token) {
      return;
    }

    // Prevent multiple connections
    if (socketRef.current) {
      return;
    }

    // Connect through NGINX proxy for Socket.IO
    const newSocket = io('/', {
      auth: {
        token,
      },
      transports: ['polling', 'websocket'],
      path: '/socket.io/',
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      setIsConnected(true);
      
      // If there's a pending document to join, join it now
      if (pendingDocumentIdRef.current) {
        newSocket.emit('join-document', pendingDocumentIdRef.current);
        pendingDocumentIdRef.current = null;
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setActiveUsers([]);
    });

    newSocket.on('connect_error', () => {
      setIsConnected(false);
    });

    newSocket.on('reconnect', () => {
      setIsConnected(true);
    });

    // Document collaboration event handlers
    newSocket.on('document-joined', (data: DocumentJoinedEvent) => {
      setActiveUsers(data.activeUsers || []);
      onDocumentJoined?.(data);
    });

    newSocket.on('text-changed', (data: TextChangeEvent) => {
      onTextChanged?.(data);
    });

    newSocket.on('user-joined', (data: UserJoinedEvent) => {
      setActiveUsers(prev => [...prev, {
        id: data.user.id,
        username: data.user.username,
        joined_at: data.joinedAt,
      }]);
      onUserJoined?.(data);
    });

    newSocket.on('user-left', (data: UserLeftEvent) => {
      setActiveUsers(prev => prev.filter(user => user.id !== data.user.id));
      onUserLeft?.(data);
    });

    newSocket.on('cursor-moved', (data: CursorMoveEvent) => {
      onCursorMoved?.(data);
    });

    newSocket.on('save-complete', (data: SaveCompleteEvent) => {
      onSaveComplete?.(data);
    });

    newSocket.on('error', (error: { message: string }) => {
      onError?.(error);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
      setActiveUsers([]);
    };
  }, []);

  const joinDocument = useCallback((documentId: string) => {
    if (socket && isConnected) {
      socket.emit('join-document', documentId);
    } else {
      // Store the document ID to join when socket connects
      pendingDocumentIdRef.current = documentId;
    }
  }, [socket, isConnected]);

  const leaveDocument = useCallback((documentId: string) => {
    if (socket && isConnected) {
      socket.emit('leave-document', documentId);
    }
  }, [socket, isConnected]);

  const sendTextChange = useCallback((documentId: string, content: string, operation?: any) => {
    if (socket && isConnected) {
      socket.emit('text-change', {
        documentId,
        content,
        operation,
      });
    }
  }, [socket, isConnected]);

  const sendCursorMove = useCallback((documentId: string, position: number) => {
    if (socket && isConnected) {
      socket.emit('cursor-move', {
        documentId,
        position,
      });
    }
  }, [socket, isConnected]);

  const saveDocument = useCallback((documentId: string, content: string) => {
    if (socket && isConnected) {
      socket.emit('save-document', {
        documentId,
        content,
      });
    }
  }, [socket, isConnected]);

  return {
    socket,
    isConnected,
    activeUsers,
    joinDocument,
    leaveDocument,
    sendTextChange,
    sendCursorMove,
    saveDocument,
  };
};
