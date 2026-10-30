const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

// All endpoints in this router are restricted to ADMIN and GOV_EXECUTIVE
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN', 'GOV_EXECUTIVE'));

// Dashboard Overview Metrics
router.get('/stats', adminController.getAdminStats);
router.get('/analytics', adminController.getAdminAnalytics);

// Rewards CRUD & Toggle
router.get('/rewards', adminController.getAdminRewards);
router.post('/rewards', adminController.createAdminReward);
router.put('/rewards/:id', adminController.updateAdminReward);
router.patch('/rewards/:id/toggle', adminController.toggleRewardStatus);
router.delete('/rewards/:id', adminController.deleteAdminReward);

// Users Directory & Status
router.get('/users', adminController.getAdminUsers);

// Shops Directory & Status
router.get('/shops', adminController.getAdminShops);
router.patch('/shops/:id/toggle', adminController.toggleShopStatus);
router.post('/shops/:id/review', adminController.reviewShop);

module.exports = router;

