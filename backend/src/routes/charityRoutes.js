const express = require('express');
const router = express.Router();
const charityController = require('../controllers/charityController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public route to list active charities
router.get('/', charityController.getCharities);
router.get('/dashboard', authenticateToken, charityController.getDonationDashboard);

// Authenticated routes
router.post('/donate', authenticateToken, charityController.donateToCharity);
router.get('/my-donations', authenticateToken, charityController.getMyDonations);

module.exports = router;
