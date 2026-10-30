const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/v1/auth/login-thaid (UC-01: Mock ThaiD / NDID Login)
router.post('/login-thaid', (_req, res) => res.status(501).json({ success: false, error: 'ยังไม่เชื่อม ThaiD จริง กรุณาใช้รหัสผ่านหรือเปิดบัญชีทดลอง' }));
router.post('/demo-login', require('../controllers/demoAuthController').login);

// POST /api/v1/auth/login (Standard credentials login)
router.post('/login', authController.loginCredentials);

// POST /api/v1/auth/seed-demo (Initial setup of demo accounts)
router.post('/seed-demo', authController.seedDemoAccounts);

module.exports = router;
