const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// POST /api/v1/users/register-thai-please (FR-CIT-01)
router.post('/register-thai-please', authController.registerCitizen);

// GET /api/v1/users/me (View user profile)
router.get('/me', authenticateToken, authController.getCurrentUser);

// GET /api/v1/users/provinces (Helper for registration form)
router.get('/provinces', authController.getProvinces);

router.post('/demo-topup', authenticateToken, require('../controllers/demoWalletController').topUp);

module.exports = router;
