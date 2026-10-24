const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/v1/auth/login-thaid (UC-01: Mock ThaiD / NDID Login)
router.post('/login-thaid', authController.loginThaiD);

// POST /api/v1/auth/login (Standard credentials login)
router.post('/login', authController.loginCredentials);

// POST /api/v1/auth/seed-demo (Initial setup of demo accounts)
router.post('/seed-demo', authController.seedDemoAccounts);

module.exports = router;
