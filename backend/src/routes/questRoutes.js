const express = require('express');
const router = express.Router();
const { generateBoard } = require('../controllers/questController');

// กำหนด Endpoint เป็น POST /api/quests/generate
router.post('/generate', generateBoard);

module.exports = router;