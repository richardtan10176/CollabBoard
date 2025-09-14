'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Document, TextChangeEvent, CursorMoveEvent } from '@/types';
import toast from 'react-hot-toast';
import CursorOverlay from './CursorOverlay';
import ActiveUsersDebug from './ActiveUsersDebug';

interface DocumentEditorProps {
  document: Document;
  onContentChange?: (content: string) => void;
  onShareClick?: () => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ document, onContentChange, onShareClick }) => {
  const [content, setContent] = useState(document.current_content || document.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDocumentJoined, setIsDocumentJoined] = useState(false);
  const [canWrite, setCanWrite] = useState(document.canWrite ?? true);
  const [isReceivingRemoteChange, setIsReceivingRemoteChange] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cursorMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasJoinedDocumentRef = useRef(false);

  const {
    isConnected,
    activeUsers,
    joinDocument,
    leaveDocument,
    sendTextChange,
    sendCursorMove,
    saveDocument,
  } = useSocket({
    onDocumentJoined: (data) => {
      console.log('Document joined event received:', data);
      setContent(data.document.content);
      setIsDocumentJoined(true);
      setCanWrite(data.canWrite ?? true);
      toast.success('Connected to document');
    },
    onTextChanged: (data: TextChangeEvent) => {
      // Update content from other users
      console.log('Received text change from:', data.user.username, 'Content length:', data.content.length);
      setIsReceivingRemoteChange(true);
      setContent(data.content);
      onContentChange?.(data.content);
      
      // Show visual feedback for incoming changes
      toast(`${data.user.username} made changes`, { 
        icon: '✏️',
        duration: 2000 
      });
      
      // Reset flag after a short delay
      setTimeout(() => setIsReceivingRemoteChange(false), 100);
    },
    onUserJoined: (data) => {
      toast.success(`${data.user.username} joined the document`);
    },
    onUserLeft: (data) => {
      toast(`${data.user.username} left the document`, { icon: '👋' });
    },
    onCursorMoved: (data: CursorMoveEvent) => {
      // Handle cursor move from other users
      console.log('DocumentEditor: Cursor moved by:', data.user.username, 'Position:', data.position);
      if ((window as any).__onCursorMoved) {
        (window as any).__onCursorMoved(data);
      } else {
        console.warn('DocumentEditor: __onCursorMoved handler not found');
      }
    },
    onSaveComplete: (data) => {
      setLastSaved(new Date());
      setIsSaving(false);
      toast.success(`Document saved (v${data.version})`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Join document on mount
  useEffect(() => {
    if (document.id && isConnected && !hasJoinedDocumentRef.current) {
      console.log('Attempting to join document:', document.id, 'Socket connected:', isConnected);
      hasJoinedDocumentRef.current = true;
      joinDocument(document.id);
    } else if (document.id && !isConnected) {
      console.log('Cannot join document - socket not connected. Document ID:', document.id, 'Connected:', isConnected);
    }

    return () => {
      if (document.id && hasJoinedDocumentRef.current) {
        console.log('Leaving document:', document.id);
        hasJoinedDocumentRef.current = false;
        leaveDocument(document.id);
      }
    };
  }, [document.id, isConnected]); // Removed joinDocument and leaveDocument from dependencies

  // Set up global cursor move handler
  useEffect(() => {
    (window as any).__sendCursorMove = (position: number) => {
      if (isConnected) {
        console.log('DocumentEditor: Sending cursor move, position:', position);
        sendCursorMove(document.id, position);
      } else {
        console.log('DocumentEditor: Not sending cursor move - not connected');
      }
    };

    return () => {
      delete (window as any).__sendCursorMove;
    };
  }, [isConnected, document.id, sendCursorMove]);

  // Handle content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!canWrite) {
      toast.error('You have read-only access to this document');
      return;
    }

    // Don't send changes if we're receiving a remote change
    if (isReceivingRemoteChange) {
      return;
    }

    const newContent = e.target.value;
    setContent(newContent);
    onContentChange?.(newContent);

    // Send real-time changes to other users
    if (isConnected) {
      console.log('Sending text change:', { documentId: document.id, contentLength: newContent.length });
      sendTextChange(document.id, newContent);
    } else {
      console.log('Not sending text change - connected:', isConnected);
    }

    // Auto-save immediately on every change
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 500);
  };

  // Handle cursor movement
  const handleCursorMove = () => {
    if (!textareaRef.current || !isConnected) return;

    const position = textareaRef.current.selectionStart;
    console.log('DocumentEditor: Local cursor moved to position:', position);
    
    // Throttle cursor updates (max 10 per second)
    if (cursorMoveTimeoutRef.current) {
      clearTimeout(cursorMoveTimeoutRef.current);
    }
    
    cursorMoveTimeoutRef.current = setTimeout(() => {
      console.log('DocumentEditor: Sending throttled cursor move, position:', position);
      sendCursorMove(document.id, position);
    }, 100);
  };

  // Handle manual save
  const handleSave = () => {
    if (isConnected && document.isOwner) {
      setIsSaving(true);
      saveDocument(document.id, content);
    } else {
      // If not owner or not connected, just clear saving state
      setIsSaving(false);
      setLastSaved(new Date());
    }
  };


  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-700 bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">{document.title}</h1>
              {document.isOwner && onShareClick && (
                <button
                  onClick={onShareClick}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                  title="Share document"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Share
                </button>
              )}
            </div>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-300">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {lastSaved && (
                <span className="text-sm text-gray-400">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              
              {isSaving && (
                <span className="text-sm text-blue-600">Saving...</span>
              )}
              
              {!canWrite && (
                <span className="text-sm text-orange-500 font-medium">
                  Read-only mode
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Active users */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Active users:</span>
              <div className="flex -space-x-2">
                {activeUsers.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                    title={user.username}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                ))}
                {activeUsers.length > 5 && (
                  <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                    +{activeUsers.length - 5}
                  </div>
                )}
              </div>
            </div>


          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col relative">
          <CursorOverlay
            textareaRef={textareaRef}
            onCursorMoved={(data) => {
              // Handle cursor move from other users
              console.log('Cursor moved by:', data.user.username, 'Position:', data.position);
            }}
            activeUsers={activeUsers}
          />
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onSelect={handleCursorMove}
            onKeyUp={handleCursorMove}
            onMouseUp={handleCursorMove}
            readOnly={!canWrite}
            className={`flex-1 w-full p-6 text-white bg-gray-800 placeholder-gray-400 border-none resize-none focus:outline-none font-mono text-sm leading-6 ${
              !canWrite ? 'cursor-not-allowed opacity-75' : ''
            }`}
            placeholder={canWrite ? "Start writing your markdown here..." : "You have read-only access to this document"}
            style={{ minHeight: '400px' }}
          />
        </div>

        {/* Preview panel - could be enhanced later */}
        <div className="hidden lg:block w-1/2 border-l border-gray-700 bg-gray-900">
          <div className="p-6">
            <h3 className="text-lg font-medium text-white mb-4">Preview</h3>
            <div className="prose prose-sm max-w-none prose-invert">
              <div 
                className="text-sm text-gray-300"
                dangerouslySetInnerHTML={{
                  __html: content
                    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mb-2">$1</h1>')
                    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mb-2">$1</h2>')
                    .replace(/^### (.*$)/gim, '<h3 class="text-md font-medium mb-1">$1</h3>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`(.*?)`/g, '<code class="bg-gray-700 px-1 rounded">$1</code>')
                    .replace(/\n/g, '<br>')
                    || 'Nothing to preview yet...'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex-shrink-0 border-t border-gray-700 bg-gray-900 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-300">
          <div className="flex items-center space-x-4">
            <span>Characters: {content.length}</span>
            <span>Words: {content.trim() ? content.trim().split(/\s+/).length : 0}</span>
            <span>Lines: {content.split('\n').length}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {!document.isOwner && (
              <span className="text-yellow-600">Read-only mode</span>
            )}
            <span>Owner: {document.owner_username}</span>
          </div>
        </div>
      </div>

      {/* Debug component */}
      <ActiveUsersDebug 
        activeUsers={activeUsers}
        isConnected={isConnected}
        currentDocumentId={document.id}
      />
    </div>
  );
};

export default DocumentEditor;
