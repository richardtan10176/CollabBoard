'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { documentsAPI } from '@/utils/api';
import { Document } from '@/types';
import DocumentEditor from '@/components/DocumentEditor';
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

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-white">Document not found</h3>
          <p className="mt-1 text-sm text-gray-400">
            {error || 'The document you\'re looking for doesn\'t exist or you don\'t have access to it.'}
          </p>
          <div className="mt-6">
            <button
              onClick={handleBackToDashboard}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-800 flex flex-col">
      {/* Top navigation */}
      <div className="flex-shrink-0 border-b border-gray-700 bg-gray-900 px-6 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToDashboard}
            className="inline-flex items-center px-3 py-2 border border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-200 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="text-sm text-gray-300">
            Document ID: {document.id}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <DocumentEditor 
          document={document} 
          onContentChange={handleContentChange}
        />
      </div>
    </div>
  );
}
