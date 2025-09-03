const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentVersions
} = require('../controllers/documentController');

// All document routes require authentication
router.use(authenticateToken);

// Document CRUD operations
router.get('/', getDocuments);
router.post('/', createDocument);
router.get('/:id', getDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

// Document version history
router.get('/:id/versions', getDocumentVersions);

module.exports = router;
