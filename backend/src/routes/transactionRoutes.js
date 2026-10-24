const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Get active participating shops
router.get('/shops', transactionController.getShops);

// Make a payment with 60/40 Co-Pay (Requires login)
router.post('/pay', authenticateToken, transactionController.createPayment);

// Get user's payment transaction history (Requires login)
router.get('/my-history', authenticateToken, transactionController.getMyTransactions);

module.exports = router;
