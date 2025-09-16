'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Document, TextChangeEvent, CursorMoveEvent } from '@/types';
import toast from 'react-hot-toast';
import CursorOverlay from './CursorOverlay';

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
      setContent(data.document.content);
      setIsDocumentJoined(true);
      setCanWrite(data.canWrite ?? true);
      toast.success('Connected to document');
    },
    onTextChanged: (data: TextChangeEvent) => {
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
      if ((window as any).__onCursorMoved) {
        (window as any).__onCursorMoved(data);
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
      hasJoinedDocumentRef.current = true;
      joinDocument(document.id);
    }
  }, [document.id, isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (document.id && hasJoinedDocumentRef.current) {
        hasJoinedDocumentRef.current = false;
        leaveDocument(document.id);
      }
    };
  }, []);

  // Set up global cursor move handler
  useEffect(() => {
    (window as any).__sendCursorMove = (position: number) => {
      if (isConnected) {
        sendCursorMove(document.id, position);
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
      sendTextChange(document.id, newContent);
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
    
    // Throttle cursor updates (max 10 per second)
    if (cursorMoveTimeoutRef.current) {
      clearTimeout(cursorMoveTimeoutRef.current);
    }
    
    cursorMoveTimeoutRef.current = setTimeout(() => {
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
      <div className="flex-shrink-0 backdrop-blur-md bg-slate-900/50 border-b border-slate-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-3">
              <h1 className="text-2xl font-bold text-white">{document.title}</h1>
              {document.isOwner && onShareClick && (
                <button
                  onClick={onShareClick}
                  className="inline-flex items-center px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/20 hover:border-white/30 rounded-xl transition-all duration-200 font-medium"
                  title="Share document"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Share
                </button>
              )}
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} ${isConnected ? 'animate-pulse' : ''}`}></div>
                <span className="text-sm text-slate-300 font-medium">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {lastSaved && (
                <span className="text-sm text-slate-400 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              
              {isSaving && (
                <span className="text-sm text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">
                  Saving...
                </span>
              )}
              
              {!canWrite && (
                <span className="text-sm text-orange-400 bg-orange-500/10 px-3 py-1 rounded-lg border border-orange-500/20 font-medium">
                  Read-only mode
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Active users */}
            <div className="flex items-center space-x-3">
              <span className="text-sm text-slate-300 font-medium">Active users:</span>
              <div className="flex -space-x-2">
                {activeUsers.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-white/20 shadow-lg"
                    title={user.username}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                ))}
                {activeUsers.length > 5 && (
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-500 to-slate-600 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-white/20 shadow-lg">
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
            className={`flex-1 w-full p-8 text-white bg-transparent placeholder-slate-400 border-none resize-none focus:outline-none font-mono text-base leading-7 ${
              !canWrite ? 'cursor-not-allowed opacity-75' : ''
            }`}
            placeholder={canWrite ? "Start writing your markdown here..." : "You have read-only access to this document"}
            style={{ minHeight: '400px' }}
          />
        </div>

        {/* Preview panel - could be enhanced later */}
        <div className="hidden lg:block w-1/2 border-l border-slate-700/50 bg-white/5 backdrop-blur-sm">
          <div className="p-8">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <h3 className="text-lg font-semibold text-white">Preview</h3>
            </div>
            <div className="prose prose-sm max-w-none prose-invert">
              <div 
                className="text-sm text-slate-300 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: content
                    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mb-2 text-white">$1</h1>')
                    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mb-2 text-white">$1</h2>')
                    .replace(/^### (.*$)/gim, '<h3 class="text-md font-medium mb-1 text-white">$1</h3>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em class="text-slate-200">$1</em>')
                    .replace(/`(.*?)`/g, '<code class="bg-white/10 text-blue-300 px-2 py-1 rounded border border-white/20">$1</code>')
                    .replace(/\n/g, '<br>')
                    || '<span class="text-slate-400 italic">Nothing to preview yet...</span>'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex-shrink-0 border-t border-slate-700/50 bg-white/5 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <div className="flex items-center space-x-6">
            <span className="bg-white/5 px-3 py-1 rounded-lg border border-white/10">
              Characters: {content.length}
            </span>
            <span className="bg-white/5 px-3 py-1 rounded-lg border border-white/10">
              Words: {content.trim() ? content.trim().split(/\s+/).length : 0}
            </span>
            <span className="bg-white/5 px-3 py-1 rounded-lg border border-white/10">
              Lines: {content.split('\n').length}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            {!document.isOwner && (
              <span className="text-orange-400 bg-orange-500/10 px-3 py-1 rounded-lg border border-orange-500/20 font-medium">
                Read-only mode
              </span>
            )}
            <span className="bg-white/5 px-3 py-1 rounded-lg border border-white/10">
              Owner: {document.owner_username}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DocumentEditor;
