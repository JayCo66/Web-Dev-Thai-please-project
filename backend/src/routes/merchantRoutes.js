const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const merchantController = require('../controllers/merchantController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { MERCHANT_CATEGORIES } = require('../services/merchantCategories');

// POST /api/v1/merchants/register
router.post('/register', authController.registerMerchant);

// GET /api/v1/merchants/categories
router.get('/categories', (req, res) => res.json({ success: true, data: MERCHANT_CATEGORIES }));

// GET /api/v1/merchants/me (the merchant's own shop and its approval status)
router.get('/me', authenticateToken, authorizeRoles('MERCHANT'), merchantController.getMyShop);

module.exports = router;
