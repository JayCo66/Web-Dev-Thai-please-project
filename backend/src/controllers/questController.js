const { generateBingoMissionsWithAI } = require('../services/questService');

const generateBoard = async (req, res) => {
  try {
    // รับ userId จาก Body ที่ Postman ส่งมา
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'กรุณาระบุ userId' });
    }

    // เรียกใช้ AI Service
    const boardData = await generateBingoMissionsWithAI(userId);
    
    // ส่งข้อมูล JSON กลับไปให้ Postman แสดงผล
    return res.status(200).json({
      message: 'สร้างกระดานบิงโกสำเร็จ',
      data: boardData
    });

  } catch (error) {
    console.error('Error in generateBoard:', error);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างกระดานบิงโก' });
  }
};

module.exports = {
  generateBoard
};