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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-gray-800 border-gray-600">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white">Share Document</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-300 mb-4">
            Share "{documentTitle}" with other users
          </p>

          {/* Share with new user */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Share with user
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search by username or email..."
                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="px-3 py-2 hover:bg-gray-600 cursor-pointer flex items-center justify-between"
                      onClick={() => handleShare(user)}
                    >
                      <div>
                        <div className="text-white font-medium">{user.username}</div>
                        <div className="text-gray-400 text-sm">{user.email}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedPermission}
                          onChange={(e) => setSelectedPermission(e.target.value as 'read' | 'write')}
                          className="text-xs bg-gray-600 text-white border border-gray-500 rounded px-2 py-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="read">Read</option>
                          <option value="write">Write</option>
                        </select>
                        <UserPlusIcon className="h-4 w-4 text-indigo-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Current shares */}
          <div>
            <h4 className="text-md font-medium text-white mb-3">Current shares</h4>
            
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-gray-400">Loading shares...</p>
              </div>
            ) : shares.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <UserPlusIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No users have been shared with this document</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded-md"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div>
                          <div className="text-white font-medium">{share.shared_with_username}</div>
                          <div className="text-gray-400 text-sm">{share.shared_with_email}</div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {share.permission_type === 'read' ? (
                            <EyeIcon className="h-4 w-4 text-blue-400" />
                          ) : (
                            <PencilIcon className="h-4 w-4 text-green-400" />
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            share.permission_type === 'read' 
                              ? 'bg-blue-900 text-blue-300' 
                              : 'bg-green-900 text-green-300'
                          }`}>
                            {share.permission_type}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Shared by {share.shared_by_username} on {formatDate(share.created_at)}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <select
                        value={share.permission_type}
                        onChange={(e) => handleUpdatePermission(share.id, share.shared_with_username, e.target.value as 'read' | 'write')}
                        className="text-xs bg-gray-600 text-white border border-gray-500 rounded px-2 py-1"
                      >
                        <option value="read">Read</option>
                        <option value="write">Write</option>
                      </select>
                      <button
                        onClick={() => handleRevokeShare(share.id, share.shared_with_username, share.shared_with_username)}
                        className="text-red-400 hover:text-red-300"
                        title="Revoke access"
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

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharingModal;
