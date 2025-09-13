const { query } = require('../utils/database');
const { 
  checkDocumentPermission, 
  canWriteToDocument, 
  canReadDocument, 
  getUserAccessibleDocuments 
} = require('../utils/permissions');

// Get all documents for the authenticated user
const getDocuments = async (req, res) => {
  try {
    const userId = req.user.id;

    const documents = await getUserAccessibleDocuments(userId);

    res.json({
      documents: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        is_public: doc.is_public,
        owner_username: doc.owner_username,
        version_count: doc.version_count,
        user_permission: doc.user_permission,
        isOwner: doc.user_permission === 'owner'
      }))
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      error: 'Internal server error while fetching documents'
    });
  }
};

// Get a specific document by ID
const getDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user has access to the document
    const { hasAccess, permission } = await checkDocumentPermission(userId, id);

    if (!hasAccess) {
      return res.status(404).json({
        error: 'Document not found or access denied'
      });
    }

    // Get document details
    const result = await query(`
      SELECT 
        d.id, 
        d.title, 
        d.current_content, 
        d.created_at, 
        d.updated_at, 
        d.is_public,
        d.owner_id,
        u.username as owner_username
      FROM documents d
      JOIN users u ON d.owner_id = u.id
      WHERE d.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Document not found'
      });
    }

    const document = result.rows[0];

    res.json({
      document: {
        ...document,
        user_permission: permission,
        isOwner: permission === 'owner',
        canWrite: permission === 'owner' || permission === 'write'
      }
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      error: 'Internal server error while fetching document'
    });
  }
};

// Create a new document
const createDocument = async (req, res) => {
  try {
    const { title, content = '', isPublic = false } = req.body;
    const userId = req.user.id;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        error: 'Document title is required'
      });
    }

    // Create the document
    const documentResult = await query(`
      INSERT INTO documents (title, owner_id, current_content, is_public)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, created_at, updated_at, is_public
    `, [title.trim(), userId, content, isPublic]);

    const document = documentResult.rows[0];

    // Create initial version
    await query(`
      INSERT INTO document_versions (document_id, content, version_number, created_by, change_description)
      VALUES ($1, $2, 1, $3, 'Document created')
    `, [document.id, content, userId]);

    res.status(201).json({
      message: 'Document created successfully',
      document: {
        ...document,
        owner_username: req.user.username,
        version_count: 1,
        isOwner: true
      }
    });
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({
      error: 'Internal server error while creating document'
    });
  }
};

// Update a document
const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, isPublic } = req.body;
    const userId = req.user.id;

    // Check if user can write to the document
    const canWrite = await canWriteToDocument(userId, id);

    if (!canWrite) {
      return res.status(403).json({
        error: 'You do not have permission to edit this document'
      });
    }

    // Get current document for comparison
    const documentResult = await query(
      'SELECT * FROM documents WHERE id = $1',
      [id]
    );

    if (documentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Document not found'
      });
    }

    const currentDocument = documentResult.rows[0];

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title.trim());
    }

    if (content !== undefined) {
      updates.push(`current_content = $${paramCount++}`);
      values.push(content);
    }

    if (isPublic !== undefined) {
      updates.push(`is_public = $${paramCount++}`);
      values.push(isPublic);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }

    values.push(id);

    // Update document
    const updateResult = await query(`
      UPDATE documents 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    const updatedDocument = updateResult.rows[0];

    // If content was updated, create a new version
    if (content !== undefined && content !== currentDocument.current_content) {
      // Get the latest version number
      const versionResult = await query(
        'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM document_versions WHERE document_id = $1',
        [id]
      );
      
      const nextVersion = versionResult.rows[0].next_version;

      await query(`
        INSERT INTO document_versions (document_id, content, version_number, created_by, change_description)
        VALUES ($1, $2, $3, $4, 'Document updated')
      `, [id, content, nextVersion, userId]);
    }

    res.json({
      message: 'Document updated successfully',
      document: updatedDocument
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      error: 'Internal server error while updating document'
    });
  }
};

// Delete a document
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if document exists and user has permission
    const result = await query(
      'DELETE FROM documents WHERE id = $1 AND owner_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Document not found or access denied'
      });
    }

    res.json({
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      error: 'Internal server error while deleting document'
    });
  }
};

// Get document version history
const getDocumentVersions = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user has access to the document
    const { hasAccess } = await checkDocumentPermission(userId, id);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Get version history
    const versionsResult = await query(`
      SELECT 
        dv.id,
        dv.version_number,
        dv.created_at,
        dv.change_description,
        u.username as created_by_username
      FROM document_versions dv
      JOIN users u ON dv.created_by = u.id
      WHERE dv.document_id = $1
      ORDER BY dv.version_number DESC
    `, [id]);

    res.json({
      versions: versionsResult.rows
    });
  } catch (error) {
    console.error('Get document versions error:', error);
    res.status(500).json({
      error: 'Internal server error while fetching document versions'
    });
  }
};

module.exports = {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentVersions
};
