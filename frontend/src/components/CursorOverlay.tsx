'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CursorMoveEvent } from '@/types';

interface UserCursor {
  id: string;
  username: string;
  position: number;
  color: string;
  lastSeen: number;
}

interface CursorOverlayProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onCursorMoved?: (data: CursorMoveEvent) => void;
  activeUsers: Array<{ id: string; username: string }>;
}

// Generate consistent colors for users
const getUserColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return colors[Math.abs(hash) % colors.length];
};

const CursorOverlay: React.FC<CursorOverlayProps> = ({ 
  textareaRef, 
  onCursorMoved, 
  activeUsers 
}) => {
  const [userCursors, setUserCursors] = useState<Map<string, UserCursor>>(new Map());
  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle cursor move events
  useEffect(() => {
    const handleCursorMove = (data: CursorMoveEvent) => {
      setUserCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.set(data.user.id, {
          id: data.user.id,
          username: data.user.username,
          position: data.position,
          color: getUserColor(data.user.id),
          lastSeen: Date.now()
        });
        return newCursors;
      });
    };

    // Set up the handler to be called from DocumentEditor
    (window as any).__onCursorMoved = handleCursorMove;

    return () => {
      delete (window as any).__onCursorMoved;
    };
  }, []);

  // Also listen for cursor events from the onCursorMoved prop
  useEffect(() => {
    if (onCursorMoved) {
      const handleCursorMove = (data: CursorMoveEvent) => {
        setUserCursors(prev => {
          const newCursors = new Map(prev);
          newCursors.set(data.user.id, {
            id: data.user.id,
            username: data.user.username,
            position: data.position,
            color: getUserColor(data.user.id),
            lastSeen: Date.now()
          });
          return newCursors;
        });
      };

      // Store the handler for the DocumentEditor to call
      (window as any).__onCursorMoved = handleCursorMove;
    }
  }, [onCursorMoved]);

  // Clean up old cursors (remove after 5 seconds of inactivity)
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setUserCursors(prev => {
        const newCursors = new Map();
        prev.forEach((cursor, id) => {
          if (now - cursor.lastSeen < 5000) {
            newCursors.set(id, cursor);
          }
        });
        return newCursors;
      });
    }, 1000);

    return () => clearInterval(cleanup);
  }, []);

  // Calculate cursor position in pixels
  const getCursorPosition = (textPosition: number): { x: number; y: number } => {
    if (!textareaRef.current) return { x: 0, y: 0 };

    const textarea = textareaRef.current;
    const text = textarea.value;
    
    // Create a temporary element to measure text
    const tempDiv = document.createElement('div');
    const computedStyle = window.getComputedStyle(textarea);
    
    // Copy textarea styles to temp element
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.whiteSpace = 'pre-wrap';
    tempDiv.style.wordWrap = 'break-word';
    tempDiv.style.font = computedStyle.font;
    tempDiv.style.fontSize = computedStyle.fontSize;
    tempDiv.style.fontFamily = computedStyle.fontFamily;
    tempDiv.style.lineHeight = computedStyle.lineHeight;
    tempDiv.style.padding = computedStyle.padding;
    tempDiv.style.border = computedStyle.border;
    tempDiv.style.width = computedStyle.width;
    tempDiv.style.height = computedStyle.height;
    
    document.body.appendChild(tempDiv);
    
    // Get text up to cursor position
    const textUpToCursor = text.substring(0, textPosition);
    tempDiv.textContent = textUpToCursor;
    
    // Create a span to measure the last line
    const span = document.createElement('span');
    const lines = textUpToCursor.split('\n');
    span.textContent = lines[lines.length - 1];
    tempDiv.innerHTML = '';
    tempDiv.appendChild(span);
    
    // Get measurements
    const spanRect = span.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    
    // Calculate position relative to textarea
    const x = spanRect.width;
    const y = (lines.length - 1) * (parseInt(computedStyle.lineHeight) || parseInt(computedStyle.fontSize) * 1.2);
    
    document.body.removeChild(tempDiv);
    
    return {
      x: parseInt(computedStyle.paddingLeft) + x,
      y: parseInt(computedStyle.paddingTop) + y
    };
  };

  // Handle local cursor movement
  const handleLocalCursorMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const position = textarea.selectionStart;
    
    // Send cursor position to other users
    if ((window as any).__sendCursorMove) {
      (window as any).__sendCursorMove(position);
    }
  };

  // Handle local cursor movement on keyboard
  const handleLocalCursorKeyMove = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const position = textarea.selectionStart;
    
    // Send cursor position to other users
    if ((window as any).__sendCursorMove) {
      (window as any).__sendCursorMove(position);
    }
  };

  return (
    <div className="relative">
      {/* Cursor overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        {Array.from(userCursors.values()).map((cursor) => {
          const position = getCursorPosition(cursor.position);
          
          return (
            <div
              key={cursor.id}
              className="absolute transition-all duration-100 ease-out"
              style={{
                left: position.x,
                top: position.y,
                transform: 'translateY(-2px)',
              }}
            >
              {/* Cursor line */}
              <div
                className="w-0.5 h-5 absolute"
                style={{ backgroundColor: cursor.color }}
              />
              
              {/* User label */}
              <div
                className="absolute -top-6 left-0 px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.username}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Invisible overlay to capture cursor events */}
      <div
        className="absolute inset-0 pointer-events-auto z-5"
        onMouseMove={handleLocalCursorMove}
        onKeyUp={handleLocalCursorKeyMove}
        style={{ cursor: 'text' }}
      />
    </div>
  );
};

export default CursorOverlay;
