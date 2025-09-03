'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { documentsAPI } from '@/utils/api';
import { Document } from '@/types';
import toast from 'react-hot-toast';
import { PlusIcon, DocumentTextIcon, UserGroupIcon } from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load documents
  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await documentsAPI.getDocuments();
      setDocuments(response.documents);
    } catch (error: any) {
      console.error('Failed to load documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDocTitle.trim()) {
      toast.error('Document title is required');
      return;
    }

    try {
      setIsCreating(true);
      const response = await documentsAPI.createDocument({
        title: newDocTitle.trim(),
        content: '# ' + newDocTitle.trim() + '\n\nStart writing here...',
        isPublic: false
      });
      
      setDocuments(prev => [response.document, ...prev]);
      setNewDocTitle('');
      setShowCreateForm(false);
      toast.success('Document created successfully');
      
      // Navigate to the new document
      router.push(`/editor/${response.document.id}`);
    } catch (error: any) {
      console.error('Failed to create document:', error);
      toast.error('Failed to create document');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDocumentClick = (documentId: string) => {
    router.push(`/editor/${documentId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-white">CollabBoard</h1>
              <p className="text-sm text-gray-300">Welcome back, {user.username}!</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Document
              </button>
              <button
                onClick={logout}
                className="text-gray-300 hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Document Form */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-gray-800 border-gray-600">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-white mb-4">Create New Document</h3>
                <form onSubmit={handleCreateDocument}>
                  <div className="mb-4">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                      Document Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter document title..."
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewDocTitle('');
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating || !newDocTitle.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreating ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Documents Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Your Documents</h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg shadow p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-white">No documents</h3>
              <p className="mt-1 text-sm text-gray-400">Get started by creating a new document.</p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New Document
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleDocumentClick(doc.id)}
                  className="bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-6 border border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-white mb-2">
                        {doc.title}
                      </h3>
                      <div className="flex items-center text-sm text-gray-400 mb-2">
                        <UserGroupIcon className="h-4 w-4 mr-1" />
                        <span>by {doc.owner_username}</span>
                      </div>
                      <div className="text-sm text-gray-400">
                        <p>Updated: {formatDate(doc.updated_at)}</p>
                        {doc.version_count && (
                          <p>{doc.version_count} version{doc.version_count !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {doc.is_public && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Public
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
