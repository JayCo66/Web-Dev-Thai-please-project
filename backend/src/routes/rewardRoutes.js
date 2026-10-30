const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public route to list rewards & lucky draw campaigns
router.get('/', rewardController.getRewards);

// Authenticated routes
router.post('/redeem', authenticateToken, rewardController.redeemReward);
router.post('/lucky-draw', authenticateToken, rewardController.enterLuckyDraw);
router.post('/instant-spin', authenticateToken, rewardController.instantSpin);
router.get('/my-history', authenticateToken, rewardController.getMyTokenHistory);
router.get('/my-redemptions', authenticateToken, rewardController.getMyRedemptions);
router.post('/use-voucher', authenticateToken, rewardController.useVoucher);
router.post('/demo-faucet', authenticateToken, rewardController.faucetTokens);

router.get('/my-items', authenticateToken, rewardController.getMyItems);

module.exports = router;
