const { generateBingoMissionsWithAI } = require('../services/questService');

async function generateBoard(req, res) {
  try {
    const data = await generateBingoMissionsWithAI(req.body);
    return res.status(200).json({ success: true, message: 'สร้างกระดานบิงโกสำเร็จ (preview)', data });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, error: status === 500 ? 'เกิดข้อผิดพลาดในการสร้างกระดาน' : error.message });
  }
}

module.exports = { generateBoard };
