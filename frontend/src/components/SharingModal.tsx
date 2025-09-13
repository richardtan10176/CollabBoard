'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserPlusIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { sharingAPI } from '@/utils/api';
import { DocumentShare, UserSearchResult } from '@/types';
import toast from 'react-hot-toast';

interface SharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
}

const SharingModal: React.FC<SharingModalProps> = ({ isOpen, onClose, documentId, documentTitle }) => {
  const [shares, setShares] = useState<DocumentShare[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<'read' | 'write'>('read');

  useEffect(() => {
    if (isOpen) {
      loadShares();
    }
  }, [isOpen, documentId]);

  const loadShares = async () => {
    try {
      setIsLoading(true);
      const response = await sharingAPI.getDocumentShares(documentId);
      setShares(response.shares);
    } catch (error: any) {
      console.error('Failed to load shares:', error);
      toast.error('Failed to load document shares');
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const response = await sharingAPI.searchUsers(query);
      setSearchResults(response.users);
      setShowSearchResults(true);
    } catch (error: any) {
      console.error('Failed to search users:', error);
      toast.error('Failed to search users');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const handleShare = async (user: UserSearchResult) => {
    try {
      setIsSharing(true);
      await sharingAPI.shareDocument(documentId, {
        username: user.username,
        permission: selectedPermission
      });
      
      toast.success(`Document shared with ${user.username} (${selectedPermission} access)`);
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
      loadShares();
    } catch (error: any) {
      console.error('Failed to share document:', error);
      toast.error(error.response?.data?.error || 'Failed to share document');
    } finally {
      setIsSharing(false);
    }
  };

  const handleUpdatePermission = async (shareId: string, userId: string, newPermission: 'read' | 'write') => {
    try {
      await sharingAPI.updateSharePermission(documentId, userId, newPermission);
      toast.success('Permission updated successfully');
      loadShares();
    } catch (error: any) {
      console.error('Failed to update permission:', error);
      toast.error('Failed to update permission');
    }
  };

  const handleRevokeShare = async (shareId: string, userId: string, username: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${username}?`)) {
      return;
    }

    try {
      await sharingAPI.revokeShare(documentId, userId);
      toast.success(`Access revoked for ${username}`);
      loadShares();
    } catch (error: any) {
      console.error('Failed to revoke share:', error);
      toast.error('Failed to revoke access');
    }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-0 border w-full max-w-lg shadow-2xl rounded-lg bg-gray-800 border-gray-600">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-600">
          <h3 className="text-xl font-medium text-white">Share "{documentTitle}"</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">

          {/* Share with new user */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Add people and groups
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Enter email or username..."
                className="w-full px-4 py-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              />
              
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="px-4 py-3 hover:bg-gray-600 cursor-pointer flex items-center justify-between border-b border-gray-600 last:border-b-0"
                      onClick={() => handleShare(user)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-medium">{user.username}</div>
                          <div className="text-gray-400 text-sm">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedPermission}
                          onChange={(e) => setSelectedPermission(e.target.value as 'read' | 'write')}
                          className="text-sm bg-gray-600 text-white border border-gray-500 rounded px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="read">Viewer</option>
                          <option value="write">Editor</option>
                        </select>
                        <UserPlusIcon className="h-5 w-5 text-blue-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Current shares */}
          <div>
            <h4 className="text-md font-medium text-gray-300 mb-3">People with access</h4>
            
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-400">Loading shares...</p>
              </div>
            ) : shares.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <UserPlusIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No people have access to this document</p>
              </div>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {share.shared_with_username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{share.shared_with_username}</div>
                        <div className="text-gray-400 text-sm">{share.shared_with_email}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <select
                        value={share.permission_type}
                        onChange={(e) => handleUpdatePermission(share.id, share.shared_with_user_id, e.target.value as 'read' | 'write')}
                        className="text-sm bg-gray-600 text-white border border-gray-500 rounded px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="read">Viewer</option>
                        <option value="write">Editor</option>
                      </select>
                      <button
                        onClick={() => handleRevokeShare(share.id, share.shared_with_user_id, share.shared_with_username)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Remove access"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-600 bg-gray-700 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 border border-gray-500 rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharingModal;
