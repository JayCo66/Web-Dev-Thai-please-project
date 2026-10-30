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

// Everything below is the merchant's own shop
router.use(authenticateToken, authorizeRoles('MERCHANT'));

// GET /api/v1/merchants/me (the merchant's own shop and its approval status)
router.get('/me', merchantController.getMyShop);
router.get('/dashboard', merchantController.getDashboard);

// Bills the citizen pays by QR
router.post('/bills', merchantController.createBill);
router.get('/bills/:id', merchantController.getBill);
router.post('/bills/:id/cancel', merchantController.cancelBill);

module.exports = router;
