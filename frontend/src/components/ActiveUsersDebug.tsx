'use client';

import React from 'react';
import { ActiveUser } from '@/types';

interface ActiveUsersDebugProps {
  activeUsers: ActiveUser[];
  isConnected: boolean;
  currentDocumentId?: string;
}

const ActiveUsersDebug: React.FC<ActiveUsersDebugProps> = ({ 
  activeUsers, 
  isConnected, 
  currentDocumentId 
}) => {
  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <h3 className="text-sm font-medium text-white mb-2">Debug Info</h3>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-gray-300">
            Socket: {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {currentDocumentId && (
          <div className="text-gray-300">
            <span className="font-medium">Document ID:</span>
            <div className="font-mono text-xs break-all">{currentDocumentId}</div>
          </div>
        )}
        
        <div className="text-gray-300">
          <span className="font-medium">Active Users:</span>
          <div className="mt-1">
            {activeUsers.length === 0 ? (
              <span className="text-gray-500">None</span>
            ) : (
              <div className="space-y-1">
                {activeUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-300">{user.username}</span>
                    {user.joined_at && (
                      <span className="text-gray-500 text-xs">
                        ({new Date(user.joined_at).toLocaleTimeString()})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveUsersDebug;
