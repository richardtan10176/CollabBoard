const { Server } = require('socket.io');
const { authenticateSocket } = require('../middleware/auth');
const { query } = require('../utils/database');

class SocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "https://localhost",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authenticate socket connections
    this.io.use(authenticateSocket);
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.user.username} connected with socket ID: ${socket.id}`);

      // Handle joining a document room
      socket.on('join-document', async (documentId) => {
        try {
          await this.handleJoinDocument(socket, documentId);
        } catch (error) {
          console.error('Error joining document:', error);
          socket.emit('error', { message: 'Failed to join document' });
        }
      });

      // Handle leaving a document room
      socket.on('leave-document', async (documentId) => {
        try {
          await this.handleLeaveDocument(socket, documentId);
        } catch (error) {
          console.error('Error leaving document:', error);
        }
      });

      // Handle text changes
      socket.on('text-change', async (data) => {
        try {
          await this.handleTextChange(socket, data);
        } catch (error) {
          console.error('Error handling text change:', error);
          socket.emit('error', { message: 'Failed to process text change' });
        }
      });

      // Handle cursor position changes
      socket.on('cursor-move', async (data) => {
        try {
          await this.handleCursorMove(socket, data);
        } catch (error) {
          console.error('Error handling cursor move:', error);
        }
      });

      // Handle save document
      socket.on('save-document', async (data) => {
        try {
          await this.handleSaveDocument(socket, data);
        } catch (error) {
          console.error('Error saving document:', error);
          socket.emit('error', { message: 'Failed to save document' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        try {
          await this.handleDisconnect(socket);
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      });
    });
  }

  async handleJoinDocument(socket, documentId) {
    // Verify user has access to the document
    const documentResult = await query(`
      SELECT d.*, u.username as owner_username
      FROM documents d
      JOIN users u ON d.owner_id = u.id
      WHERE d.id = $1 AND (d.owner_id = $2 OR d.is_public = true)
    `, [documentId, socket.user.id]);

    if (documentResult.rows.length === 0) {
      socket.emit('error', { message: 'Document not found or access denied' });
      return;
    }

    const document = documentResult.rows[0];

    // Join the document room
    socket.join(`document-${documentId}`);
    socket.currentDocument = documentId;

    // Add to active sessions
    await query(`
      INSERT INTO active_sessions (document_id, user_id, socket_id, joined_at, last_ping)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (document_id, user_id) 
      DO UPDATE SET socket_id = EXCLUDED.socket_id, joined_at = EXCLUDED.joined_at, last_ping = EXCLUDED.last_ping
    `, [documentId, socket.user.id, socket.id]);

    // Get current active users
    const activeUsersResult = await query(`
      SELECT u.id, u.username, s.cursor_position, s.joined_at
      FROM active_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.document_id = $1 AND s.last_ping > NOW() - INTERVAL '30 seconds'
    `, [documentId]);

    // Notify others that user joined
    socket.to(`document-${documentId}`).emit('user-joined', {
      user: {
        id: socket.user.id,
        username: socket.user.username
      },
      joinedAt: new Date().toISOString()
    });

    // Send document and active users to the joining user
    socket.emit('document-joined', {
      document: {
        id: document.id,
        title: document.title,
        content: document.current_content,
        owner: {
          id: document.owner_id,
          username: document.owner_username
        },
        isOwner: document.owner_id === socket.user.id
      },
      activeUsers: activeUsersResult.rows
    });

    console.log(`User ${socket.user.username} joined document ${documentId}`);
  }

  async handleLeaveDocument(socket, documentId) {
    if (socket.currentDocument === documentId) {
      socket.leave(`document-${documentId}`);
      socket.currentDocument = null;

      // Remove from active sessions
      await query(
        'DELETE FROM active_sessions WHERE document_id = $1 AND user_id = $2',
        [documentId, socket.user.id]
      );

      // Notify others that user left
      socket.to(`document-${documentId}`).emit('user-left', {
        user: {
          id: socket.user.id,
          username: socket.user.username
        },
        leftAt: new Date().toISOString()
      });

      console.log(`User ${socket.user.username} left document ${documentId}`);
    }
  }

  async handleTextChange(socket, data) {
    const { documentId, content, operation } = data;

    if (!socket.currentDocument || socket.currentDocument !== documentId) {
      socket.emit('error', { message: 'Not connected to this document' });
      return;
    }

    // Update document content in database
    await query(
      'UPDATE documents SET current_content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [content, documentId]
    );

    // Broadcast the change to other users in the document
    socket.to(`document-${documentId}`).emit('text-changed', {
      content,
      operation,
      user: {
        id: socket.user.id,
        username: socket.user.username
      },
      timestamp: new Date().toISOString()
    });

    console.log(`Text change in document ${documentId} by user ${socket.user.username}`);
  }

  async handleCursorMove(socket, data) {
    const { documentId, position } = data;

    if (!socket.currentDocument || socket.currentDocument !== documentId) {
      return;
    }

    // Update cursor position in active sessions
    await query(
      'UPDATE active_sessions SET cursor_position = $1, last_ping = CURRENT_TIMESTAMP WHERE document_id = $2 AND user_id = $3',
      [position, documentId, socket.user.id]
    );

    // Broadcast cursor position to other users
    socket.to(`document-${documentId}`).emit('cursor-moved', {
      user: {
        id: socket.user.id,
        username: socket.user.username
      },
      position,
      timestamp: new Date().toISOString()
    });
  }

  async handleSaveDocument(socket, data) {
    const { documentId, content } = data;

    if (!socket.currentDocument || socket.currentDocument !== documentId) {
      socket.emit('error', { message: 'Not connected to this document' });
      return;
    }

    // Verify user has permission to save (is owner for now)
    const documentResult = await query(
      'SELECT owner_id FROM documents WHERE id = $1',
      [documentId]
    );

    if (documentResult.rows.length === 0 || documentResult.rows[0].owner_id !== socket.user.id) {
      socket.emit('error', { message: 'Permission denied' });
      return;
    }

    // Get next version number
    const versionResult = await query(
      'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM document_versions WHERE document_id = $1',
      [documentId]
    );
    
    const nextVersion = versionResult.rows[0].next_version;

    // Create new version
    await query(`
      INSERT INTO document_versions (document_id, content, version_number, created_by, change_description)
      VALUES ($1, $2, $3, $4, 'Manual save')
    `, [documentId, content, nextVersion, socket.user.id]);

    // Notify all users in the document
    this.io.to(`document-${documentId}`).emit('save-complete', {
      version: nextVersion,
      savedBy: {
        id: socket.user.id,
        username: socket.user.username
      },
      timestamp: new Date().toISOString()
    });

    console.log(`Document ${documentId} saved as version ${nextVersion} by user ${socket.user.username}`);
  }

  async handleDisconnect(socket) {
    if (socket.currentDocument) {
      // Remove from active sessions
      await query(
        'DELETE FROM active_sessions WHERE user_id = $1 AND socket_id = $2',
        [socket.user.id, socket.id]
      );

      // Notify others in the document
      socket.to(`document-${socket.currentDocument}`).emit('user-left', {
        user: {
          id: socket.user.id,
          username: socket.user.username
        },
        leftAt: new Date().toISOString()
      });
    }

    console.log(`User ${socket.user.username} disconnected`);
  }

  // Clean up inactive sessions (call this periodically)
  async cleanupInactiveSessions() {
    try {
      const result = await query(
        'DELETE FROM active_sessions WHERE last_ping < NOW() - INTERVAL \'1 minute\' RETURNING document_id, user_id',
        []
      );

      console.log(`Cleaned up ${result.rowCount} inactive sessions`);
    } catch (error) {
      console.error('Error cleaning up inactive sessions:', error);
    }
  }
}

module.exports = SocketService;
