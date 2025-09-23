'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { documentsAPI } from '@/utils/api';
import { Document } from '@/types';
import toast from 'react-hot-toast';
import { PlusIcon, DocumentTextIcon, UserGroupIcon, ShareIcon } from '@heroicons/react/24/outline';
import SharingModal from '@/components/SharingModal';

export default function DashboardPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
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

  const handleShareClick = (e: React.MouseEvent, documentId: string, documentTitle: string) => {
    e.stopPropagation();
    setSharingModal({
      isOpen: true,
      documentId,
      documentTitle
    });
  };

  const closeSharingModal = () => {
    setSharingModal({
      isOpen: false,
      documentId: '',
      documentTitle: ''
    });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="backdrop-blur-md bg-slate-900/50 border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <DocumentTextIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">CollabBoard</h1>
                <p className="text-sm text-slate-300">Welcome back, {user.username}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Document
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Create Document Form */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl w-full max-w-md">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-4">
                  <PlusIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Create New Document</h3>
                <p className="text-slate-300 text-sm">Start collaborating on a new markdown document</p>
              </div>
              <form onSubmit={handleCreateDocument} className="space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-semibold text-white mb-2">
                    Document Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter document title..."
                    autoFocus
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewDocTitle('');
                    }}
                    className="flex-1 px-4 py-3 text-slate-300 bg-white/5 border border-white/20 rounded-xl hover:bg-white/10 hover:text-white transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newDocTitle.trim()}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Documents Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Your Documents</h2>
              <p className="text-slate-300">Manage and collaborate on your markdown documents</p>
            </div>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-white/10 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-white/10 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/5 border border-white/10 rounded-2xl mb-6">
                <DocumentTextIcon className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No documents yet</h3>
              <p className="text-slate-300 mb-8 max-w-md mx-auto">Get started by creating your first collaborative markdown document.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Your First Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleDocumentClick(doc.id)}
                  className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors">
                        {doc.title}
                      </h3>
                      <div className="flex items-center text-sm text-slate-400 mb-3">
                        <UserGroupIcon className="h-4 w-4 mr-2" />
                        <span>by {doc.owner_username}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center space-x-2">
                      {doc.user_permission && doc.user_permission !== 'owner' && (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          doc.user_permission === 'write' 
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {doc.user_permission === 'write' ? 'Write' : 'Read'}
                        </span>
                      )}
                      {doc.is_public && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                          Public
                        </span>
                      )}
                      {doc.isOwner && (
                        <button
                          onClick={(e) => handleShareClick(e, doc.id, doc.title)}
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
                          title="Share document"
                        >
                          <ShareIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-400 space-y-1">
                    <p>Updated: {formatDate(doc.updated_at)}</p>
                    {doc.version_count && (
                      <p>{doc.version_count} version{doc.version_count !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

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
