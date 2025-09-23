const { query } = require('../utils/database');
const { checkDocumentPermission } = require('../utils/permissions');

// Share a document with a user
const shareDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, permission } = req.body;
    const userId = req.user.id;

    // Validate permission type
    if (!['read', 'write'].includes(permission)) {
      return res.status(400).json({
        error: 'Permission must be either "read" or "write"'
      });
    }

    // Check if user is the owner of the document
    const { hasAccess, permission: userPermission } = await checkDocumentPermission(userId, id);
    
    if (!hasAccess || userPermission !== 'owner') {
      return res.status(403).json({
        error: 'Only document owners can share documents'
      });
    }

    // Find the user to share with
    const userResult = await query(
      'SELECT id, username FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const targetUser = userResult.rows[0];

    // Check if user is trying to share with themselves
    if (targetUser.id === userId) {
      return res.status(400).json({
        error: 'Cannot share document with yourself'
      });
    }

    // Check if document is already shared with this user
    const existingShare = await query(
      'SELECT id FROM document_shares WHERE document_id = $1 AND shared_with_user_id = $2',
      [id, targetUser.id]
    );

    if (existingShare.rows.length > 0) {
      // Update existing share
      await query(
        'UPDATE document_shares SET permission_type = $1, shared_by_user_id = $2 WHERE document_id = $3 AND shared_with_user_id = $4',
        [permission, userId, id, targetUser.id]
      );
    } else {
      // Create new share
      await query(
        'INSERT INTO document_shares (document_id, shared_with_user_id, permission_type, shared_by_user_id) VALUES ($1, $2, $3, $4)',
        [id, targetUser.id, permission, userId]
      );
    }

    res.json({
      message: `Document shared with ${username} (${permission} access)`,
      share: {
        username: targetUser.username,
        permission,
        sharedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Share document error:', error);
    res.status(500).json({
      error: 'Internal server error while sharing document'
    });
  }
};

// Revoke document sharing
const revokeShare = async (req, res) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const userId = req.user.id;

    // Check if user is the owner of the document
    const { hasAccess, permission } = await checkDocumentPermission(userId, id);
    
    if (!hasAccess || permission !== 'owner') {
      return res.status(403).json({
        error: 'Only document owners can revoke sharing'
      });
    }

    // Remove the share
    const result = await query(
      'DELETE FROM document_shares WHERE document_id = $1 AND shared_with_user_id = $2 RETURNING id',
      [id, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Share not found'
      });
    }

    res.json({
      message: 'Document sharing revoked successfully'
    });
  } catch (error) {
    console.error('Revoke share error:', error);
    res.status(500).json({
      error: 'Internal server error while revoking share'
    });
  }
};

// Get document shares
const getDocumentShares = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is the owner of the document
    const { hasAccess, permission } = await checkDocumentPermission(userId, id);
    
    if (!hasAccess || permission !== 'owner') {
      return res.status(403).json({
        error: 'Only document owners can view document shares'
      });
    }

    // Get all shares for this document
    const sharesResult = await query(`
      SELECT 
        ds.id,
        ds.permission_type,
        ds.created_at,
        ds.expires_at,
        ds.shared_with_user_id,
        u.username as shared_with_username,
        u.email as shared_with_email,
        shared_by.username as shared_by_username
      FROM document_shares ds
      JOIN users u ON ds.shared_with_user_id = u.id
      JOIN users shared_by ON ds.shared_by_user_id = shared_by.id
      WHERE ds.document_id = $1
      ORDER BY ds.created_at DESC
    `, [id]);

    res.json({
      shares: sharesResult.rows
    });
  } catch (error) {
    console.error('Get document shares error:', error);
    res.status(500).json({
      error: 'Internal server error while fetching document shares'
    });
  }
};

// Update share permission
const updateSharePermission = async (req, res) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const { permission } = req.body;
    const userId = req.user.id;

    // Validate permission type
    if (!['read', 'write'].includes(permission)) {
      return res.status(400).json({
        error: 'Permission must be either "read" or "write"'
      });
    }

    // Check if user is the owner of the document
    const { hasAccess, permission: userPermission } = await checkDocumentPermission(userId, id);
    
    if (!hasAccess || userPermission !== 'owner') {
      return res.status(403).json({
        error: 'Only document owners can update sharing permissions'
      });
    }

    // Update the share permission
    const result = await query(
      'UPDATE document_shares SET permission_type = $1 WHERE document_id = $2 AND shared_with_user_id = $3 RETURNING id',
      [permission, id, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Share not found'
      });
    }

    res.json({
      message: 'Share permission updated successfully'
    });
  } catch (error) {
    console.error('Update share permission error:', error);
    res.status(500).json({
      error: 'Internal server error while updating share permission'
    });
  }
};

// Search users for sharing
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user.id;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters long'
      });
    }

    // Search for users (excluding current user)
    const usersResult = await query(`
      SELECT id, username, email
      FROM users
      WHERE (username ILIKE $1 OR email ILIKE $1)
      AND id != $2
      AND is_active = true
      ORDER BY username
      LIMIT 10
    `, [`%${q.trim()}%`, userId]);

    res.json({
      users: usersResult.rows
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      error: 'Internal server error while searching users'
    });
  }
};

module.exports = {
  shareDocument,
  revokeShare,
  getDocumentShares,
  updateSharePermission,
  searchUsers
};
