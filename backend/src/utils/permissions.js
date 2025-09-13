const { query } = require('./database');

/**
 * Check if a user has access to a document and what permission level
 * @param {string} userId - The user ID to check
 * @param {string} documentId - The document ID to check access for
 * @returns {Promise<{hasAccess: boolean, permission: 'owner'|'write'|'read'|null}>}
 */
async function checkDocumentPermission(userId, documentId) {
  try {
    // First check if user is the owner
    const ownerResult = await query(`
      SELECT id FROM documents WHERE id = $1 AND owner_id = $2
    `, [documentId, userId]);

    if (ownerResult.rows.length > 0) {
      return { hasAccess: true, permission: 'owner' };
    }

    // Check if document is public
    const publicResult = await query(`
      SELECT id FROM documents WHERE id = $1 AND is_public = true
    `, [documentId]);

    if (publicResult.rows.length > 0) {
      return { hasAccess: true, permission: 'read' };
    }

    // Check if user has been granted access via sharing
    const shareResult = await query(`
      SELECT permission_type 
      FROM document_shares 
      WHERE document_id = $1 AND shared_with_user_id = $2
      AND (expires_at IS NULL OR expires_at > NOW())
    `, [documentId, userId]);

    if (shareResult.rows.length > 0) {
      return { 
        hasAccess: true, 
        permission: shareResult.rows[0].permission_type 
      };
    }

    return { hasAccess: false, permission: null };
  } catch (error) {
    console.error('Error checking document permission:', error);
    return { hasAccess: false, permission: null };
  }
}

/**
 * Check if a user can write to a document
 * @param {string} userId - The user ID to check
 * @param {string} documentId - The document ID to check write access for
 * @returns {Promise<boolean>}
 */
async function canWriteToDocument(userId, documentId) {
  const { hasAccess, permission } = await checkDocumentPermission(userId, documentId);
  return hasAccess && (permission === 'owner' || permission === 'write');
}

/**
 * Check if a user can read a document
 * @param {string} userId - The user ID to check
 * @param {string} documentId - The document ID to check read access for
 * @returns {Promise<boolean>}
 */
async function canReadDocument(userId, documentId) {
  const { hasAccess } = await checkDocumentPermission(userId, documentId);
  return hasAccess;
}

/**
 * Get all documents a user has access to (owned, shared, or public)
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} Array of documents with permission info
 */
async function getUserAccessibleDocuments(userId) {
  try {
    const result = await query(`
      SELECT DISTINCT
        d.id,
        d.title,
        d.created_at,
        d.updated_at,
        d.is_public,
        d.owner_id,
        u.username as owner_username,
        (SELECT COUNT(*) FROM document_versions WHERE document_id = d.id) as version_count,
        CASE 
          WHEN d.owner_id = $1 THEN 'owner'
          WHEN ds.permission_type IS NOT NULL THEN ds.permission_type
          WHEN d.is_public = true THEN 'read'
          ELSE NULL
        END as user_permission
      FROM documents d
      JOIN users u ON d.owner_id = u.id
      LEFT JOIN document_shares ds ON d.id = ds.document_id AND ds.shared_with_user_id = $1
      WHERE d.owner_id = $1 
         OR d.is_public = true 
         OR ds.shared_with_user_id = $1
      ORDER BY d.updated_at DESC
    `, [userId]);

    return result.rows;
  } catch (error) {
    console.error('Error getting user accessible documents:', error);
    throw error;
  }
}

module.exports = {
  checkDocumentPermission,
  canWriteToDocument,
  canReadDocument,
  getUserAccessibleDocuments
};
