# Document Sharing Test Guide

This guide will help you test the new document sharing functionality with read/write permissions.

## Test Users

The system comes with two test users:

1. **Admin User**
   - Username: `admin`
   - Password: `admin123`
   - Email: `admin@collabboard.com`

2. **Regular User**
   - Username: `user`
   - Password: `user123`
   - Email: `user@collabboard.com`

## Testing Steps

### 1. Start the Application

```bash
# Start the backend and frontend
./start.sh
```

### 2. Test Basic Sharing

1. **Login as Admin**
   - Open `http://localhost:3000` in your browser
   - Login with `admin` / `admin123`
   - You should see the "Welcome to CollabBoard" document

2. **Share Document with Read Permission**
   - Click the share icon (📤) on the document card
   - In the sharing modal, search for "user"
   - Select "Read" permission
   - Click on the user to share
   - You should see a success message

3. **Test Read-Only Access**
   - Open a new incognito/private browser window
   - Login with `user` / `user123`
   - You should see the shared document in your dashboard
   - Click on the document to open it
   - Try to edit the content - you should see "Read-only mode" indicator
   - Any edit attempts should show an error toast

### 3. Test Write Permission

1. **Update Permission to Write**
   - Go back to the admin browser window
   - Open the sharing modal again
   - Change the user's permission from "Read" to "Write"
   - Save the changes

2. **Test Write Access**
   - Go back to the user browser window
   - Refresh the page
   - Open the document again
   - You should now be able to edit the content
   - Changes should sync in real-time between both windows

### 4. Test Real-time Collaboration

1. **Open Multiple Tabs**
   - Keep both admin and user windows open
   - Both should be viewing the same document

2. **Test Real-time Updates**
   - Make changes in one window
   - Changes should appear immediately in the other window
   - Test with both users having write access

3. **Test Permission Changes**
   - Change a user's permission while they're viewing the document
   - The read-only mode should update in real-time

### 5. Test Permission Enforcement

1. **Backend Enforcement**
   - Try to make API calls with insufficient permissions
   - Should receive 403 Forbidden responses

2. **Frontend Enforcement**
   - Read-only users should see disabled textarea
   - Write users should see normal editing interface

## Features Implemented

### Backend
- ✅ Database schema with `document_shares` table
- ✅ Permission checking utilities
- ✅ Sharing management API endpoints
- ✅ Real-time permission enforcement in WebSocket
- ✅ User search functionality

### Frontend
- ✅ Sharing modal with user search
- ✅ Permission indicators on document cards
- ✅ Read-only mode in editor
- ✅ Real-time permission updates
- ✅ Toast notifications for sharing actions

### API Endpoints
- `GET /api/sharing/users/search?q=query` - Search users
- `POST /api/sharing/documents/:id/share` - Share document
- `GET /api/sharing/documents/:id/shares` - List document shares
- `PUT /api/sharing/documents/:id/shares/:userId` - Update permission
- `DELETE /api/sharing/documents/:id/shares/:userId` - Revoke access

## Permission Levels

- **Owner**: Full control (create, read, write, delete, share)
- **Write**: Can read and edit content, cannot delete or manage sharing
- **Read**: Can only view content, cannot edit

## Troubleshooting

1. **Database Issues**
   - Make sure PostgreSQL is running
   - Check that the database schema is up to date
   - Verify test users exist in the database

2. **Permission Issues**
   - Check browser console for errors
   - Verify API responses in Network tab
   - Ensure WebSocket connection is established

3. **Real-time Issues**
   - Check WebSocket connection status
   - Verify both users are connected to the same document
   - Check browser console for socket errors

## Next Steps

The sharing functionality is now complete and ready for testing. You can:

1. Test with multiple browser tabs/windows
2. Create additional test users
3. Test with different permission combinations
4. Verify real-time collaboration works properly

The system now supports full document sharing with granular read/write permissions and real-time collaboration!
