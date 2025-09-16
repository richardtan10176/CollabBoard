'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { documentsAPI } from '@/utils/api';
import { Document } from '@/types';
import DocumentEditor from '@/components/DocumentEditor';
import SharingModal from '@/components/SharingModal';
import toast from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function EditorPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;
  
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharingModal, setSharingModal] = useState<{ isOpen: boolean; documentId: string; documentTitle: string }>({
    isOpen: false,
    documentId: '',
    documentTitle: ''
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load document
  useEffect(() => {
    if (user && documentId) {
      loadDocument();
    }
  }, [user, documentId]);

  const loadDocument = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await documentsAPI.getDocument(documentId);
      console.log('Loaded document from API:', { id: response.document.id, contentLength: response.document.current_content?.length || 0 });
      setDocument(response.document);
    } catch (error: any) {
      console.error('Failed to load document:', error);
      const errorMessage = error.response?.data?.error || 'Failed to load document';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    router.back();
  };

  const handleContentChange = (content: string) => {
    // Update local document state when content changes
    if (document) {
      setDocument(prev => prev ? { ...prev, current_content: content } : null);
    }
  };

  const handleShareClick = () => {
    if (document) {
      setSharingModal({
        isOpen: true,
        documentId: document.id,
        documentTitle: document.title
      });
    }
  };

  const closeSharingModal = () => {
    setSharingModal({
      isOpen: false,
      documentId: '',
      documentTitle: ''
    });
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-600 border-t-blue-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-blue-400 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="mt-6 text-slate-300 text-lg font-light">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-600 border-t-blue-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-blue-400 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="mt-6 text-slate-300 text-lg font-light">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-2xl mb-6">
            <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Document not found</h3>
          <p className="text-slate-300 mb-8">
            {error || 'The document you\'re looking for doesn\'t exist or you don\'t have access to it.'}
          </p>
          <button
            onClick={handleBackToDashboard}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Top navigation */}
      <div className="flex-shrink-0 backdrop-blur-md bg-slate-900/50 border-b border-slate-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToDashboard}
            className="inline-flex items-center px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/20 hover:border-white/30 rounded-xl transition-all duration-200 font-medium"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-slate-400 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
              ID: {document.id}
            </div>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-slate-300">Connected</span>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <DocumentEditor 
          document={document} 
          onContentChange={handleContentChange}
          onShareClick={handleShareClick}
        />
      </div>

      {/* Sharing Modal */}
      <SharingModal
        isOpen={sharingModal.isOpen}
        onClose={closeSharingModal}
        documentId={sharingModal.documentId}
        documentTitle={sharingModal.documentTitle}
      />
    </div>
  );
}
