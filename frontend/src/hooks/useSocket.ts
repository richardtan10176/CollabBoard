'use client';

import { useEffect, useRef, useState } from 'react';
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
      transports: ['polling'],
      path: '/socket.io/',
      timeout: 20000,
      reconnection: false,
      autoConnect: true,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
      setActiveUsers([]);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Document collaboration event handlers
    newSocket.on('document-joined', (data: DocumentJoinedEvent) => {
      console.log('Document joined:', data);
      setActiveUsers(data.activeUsers || []);
      onDocumentJoined?.(data);
    });

    newSocket.on('text-changed', (data: TextChangeEvent) => {
      console.log('Text changed:', data);
      onTextChanged?.(data);
    });

    newSocket.on('user-joined', (data: UserJoinedEvent) => {
      console.log('User joined:', data);
      setActiveUsers(prev => [...prev, {
        id: data.user.id,
        username: data.user.username,
        joined_at: data.joinedAt,
      }]);
      onUserJoined?.(data);
    });

    newSocket.on('user-left', (data: UserLeftEvent) => {
      console.log('User left:', data);
      setActiveUsers(prev => prev.filter(user => user.id !== data.user.id));
      onUserLeft?.(data);
    });

    newSocket.on('save-complete', (data: SaveCompleteEvent) => {
      console.log('Save complete:', data);
      onSaveComplete?.(data);
    });

    newSocket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
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

  const joinDocument = (documentId: string) => {
    if (socket && isConnected) {
      console.log('Joining document:', documentId);
      socket.emit('join-document', documentId);
    }
  };

  const leaveDocument = (documentId: string) => {
    if (socket && isConnected) {
      console.log('Leaving document:', documentId);
      socket.emit('leave-document', documentId);
    }
  };

  const sendTextChange = (documentId: string, content: string, operation?: any) => {
    if (socket && isConnected) {
      socket.emit('text-change', {
        documentId,
        content,
        operation,
      });
    }
  };

  const sendCursorMove = (documentId: string, position: number) => {
    if (socket && isConnected) {
      socket.emit('cursor-move', {
        documentId,
        position,
      });
    }
  };

  const saveDocument = (documentId: string, content: string) => {
    if (socket && isConnected) {
      socket.emit('save-document', {
        documentId,
        content,
      });
    }
  };

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
