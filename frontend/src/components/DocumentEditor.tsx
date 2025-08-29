'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Document, TextChangeEvent } from '@/types';
import toast from 'react-hot-toast';

interface DocumentEditorProps {
  document: Document;
  onContentChange?: (content: string) => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ document, onContentChange }) => {
  const [content, setContent] = useState(document.current_content || document.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isConnected,
    activeUsers,
    joinDocument,
    leaveDocument,
    sendTextChange,
    saveDocument,
  } = useSocket({
    onDocumentJoined: (data) => {
      console.log('Joined document successfully', data);
      setContent(data.document.content);
      toast.success('Connected to document');
    },
    onTextChanged: (data: TextChangeEvent) => {
      // Update content from other users
      setContent(data.content);
      onContentChange?.(data.content);
    },
    onUserJoined: (data) => {
      toast.success(`${data.user.username} joined the document`);
    },
    onUserLeft: (data) => {
      toast(`${data.user.username} left the document`, { icon: '👋' });
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
    if (document.id) {
      joinDocument(document.id);
    }

    return () => {
      if (document.id) {
        leaveDocument(document.id);
      }
    };
  }, [document.id, joinDocument, leaveDocument]);

  // Handle content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onContentChange?.(newContent);

    // Send real-time changes to other users
    if (isConnected) {
      sendTextChange(document.id, newContent);
    }

    // Auto-save after 2 seconds of inactivity
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 2000);
  };

  // Handle manual save
  const handleSave = () => {
    if (isConnected && document.isOwner) {
      setIsSaving(true);
      saveDocument(document.id, content);
    }
  };

  // Handle cursor position updates
  const handleCursorMove = () => {
    if (textareaRef.current && isConnected) {
      const position = textareaRef.current.selectionStart;
      // sendCursorMove(document.id, position); // Uncomment if you want to show cursor positions
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
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {lastSaved && (
                <span className="text-sm text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              
              {isSaving && (
                <span className="text-sm text-blue-600">Saving...</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Active users */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Active users:</span>
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

            {/* Manual save button */}
            {document.isOwner && (
              <button
                onClick={handleSave}
                disabled={isSaving || !isConnected}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onSelect={handleCursorMove}
            onKeyUp={handleCursorMove}
            className="flex-1 w-full p-6 text-gray-900 placeholder-gray-500 border-none resize-none focus:outline-none font-mono text-sm leading-6"
            placeholder="Start writing your markdown here..."
            style={{ minHeight: '400px' }}
          />
        </div>

        {/* Preview panel - could be enhanced later */}
        <div className="hidden lg:block w-1/2 border-l border-gray-200 bg-gray-50">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Preview</h3>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {content || 'Nothing to preview yet...'}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
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
    </div>
  );
};

export default DocumentEditor;
