const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  shareDocument,
  revokeShare,
  getDocumentShares,
  updateSharePermission,
  searchUsers
} = require('../controllers/sharingController');

// All sharing routes require authentication
router.use(authenticateToken);

// User search for sharing
router.get('/users/search', searchUsers);

// Document sharing management
router.post('/documents/:id/share', shareDocument);
router.get('/documents/:id/shares', getDocumentShares);
router.put('/documents/:id/shares/:userId', updateSharePermission);
router.delete('/documents/:id/shares/:userId', revokeShare);

module.exports = router;
