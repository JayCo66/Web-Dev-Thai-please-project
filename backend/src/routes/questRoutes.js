const express = require('express');
const router = express.Router();
const {
  generateBoard,
  getActiveBoard,
  setActiveBoard,
  progressCell,
  resetBoard,
} = require('../controllers/questController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Optional auth helper (works with or without token for demo ease)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'thai_please_super_secret_jwt_key_2026');
    req.user = {
      ...decoded,
      userId: (decoded.user_id || decoded.userId || '').toString(),
    };
  } catch {
    // continue without req.user
  }
  next();
};

// POST /api/quests/generate (AI Preview generator)
router.post('/generate', generateBoard);

// GET /api/quests/active-board (Citizen's 5x5 board)
router.get('/active-board', optionalAuth, getActiveBoard);

// POST /api/quests/progress (Simulate progress on cell)
router.post('/progress', optionalAuth, progressCell);

// POST /api/quests/set-active (Set currently active board)
router.post('/set-active', optionalAuth, setActiveBoard);

// POST /api/quests/reset (Regenerate new board)
router.post('/reset', optionalAuth, resetBoard);

module.exports = router;