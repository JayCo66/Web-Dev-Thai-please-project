// ไฟล์: backend/src/services/questService.js
const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.TYPHOON_API_KEY,
  baseURL: 'https://api.opentyphoon.ai/v1',
});

/**
 * ฟังก์ชันวิเคราะห์พฤติกรรมผู้ใช้ + จัดกระดาน Bingo 25 ช่อง (24 เควสทั่วไป + 1 เควสบริจาค)
 */
async function generateBingoMissionsWithAI(userId) {
  // 1. ดึงประวัติการใช้จ่ายของผู้ใช้จาก DB
  const transactions = await prisma.transactions.findMany({
    where: { user_id: BigInt(userId), status: 'COMPLETED' },
    include: { shops: true }
  });

  // 2. ดึงประวัติภารกิจที่ผู้ใช้เคยทำสำเร็จแล้ว (ตาม Requirement หน้า 3)
  const completedUserQuests = await prisma.user_quests.findMany({
    where: {
      bingo_boards: { user_id: BigInt(userId) },
      status: { in: ['COMPLETED', 'CLAIMED'] }
    },
    include: { quests: true }
  });

  // สรุปข้อมูลพฤติกรรมการใช้จ่าย (ทั้งยอดเงิน และ จำนวนครั้ง แยกตามหมวดหมู่)
  const spendingSummary = {
    total_transactions: transactions.length,
    total_spent: 0,
    average_per_tx: 0,
    by_category: {}, // เก็บทั้ง spent (บาท) และ count (จำนวนครั้ง)
    completed_quests_count: completedUserQuests.length,
    past_completed_titles: [...new Set(completedUserQuests.map(uq => uq.bingo_quests?.title))].slice(0, 10)
  };

  transactions.forEach(tx => {
    const amount = Number(tx.total_amount);
    const cat = tx.shops?.category || 'OTHER';
    spendingSummary.total_spent += amount;

    if (!spendingSummary.by_category[cat]) {
      spendingSummary.by_category[cat] = { total_amount: 0, tx_count: 0 };
    }
    spendingSummary.by_category[cat].total_amount += amount;
    spendingSummary.by_category[cat].tx_count += 1;
  });

  if (transactions.length > 0) {
    spendingSummary.average_per_tx = Math.round(spendingSummary.total_spent / transactions.length);
  }

  // 3. ดึงคลังภารกิจทั้งหมด (Base Quests) จาก DB
  const allQuests = await prisma.bingo_quests.findMany({
    where: { is_active: true } // ใน MySQL TINYINT(1) ใช้ค่า 1 หรือ true
  });

  const donationQuests = allQuests.filter(q => q.category === 'DONATION');
  const normalQuests = allQuests.filter(q => q.category !== 'DONATION');

  let selected24 = [];
  let userPersona = "ผู้ใช้ใหม่ (Newcomer)";
  let aiReason = "ผู้ใช้ยังไม่มีประวัติการใช้จ่ายในเดือนแรก ระบบจึงจัดชุดภารกิจมาตรฐาน (Base Quests) ที่ระดับความยากเริ่มต้น (target_min) เพื่อเก็บข้อมูลพฤติกรรมเบื้องต้น";

  // =========================================================================
  // กรณีที่ 1: เดือนแรก หรือ ผู้ใช้ใหม่ที่ยังไม่มีประวัติการใช้จ่าย -> ใช้ Base Quest ทันที!
  // =========================================================================
  if (transactions.length === 0) {
    console.log("🌱 ผู้ใช้ใหม่ (ไม่มีประวัติใช้จ่าย): กำลังจัดกระดาน Base Quest มาตรฐาน...");
    
    // คัดเลือก Base Quests จากฐานข้อมูลแบบกระจายหมวดหมู่ และใช้ค่าเริ่มต้น (target_min)
    const shuffledBase = [...normalQuests].sort(() => Math.random() - 0.5);
    while (selected24.length < 24) {
      const q = shuffledBase[selected24.length % shuffledBase.length];
      selected24.push({
        quest_id: Number(q.quest_id),
        title: q.title,
        category: q.category,
        shop_category: q.shop_category,
        target_value: q.target_min, // ใช้ค่าเริ่มต้นสำหรับผู้ใช้ใหม่
        token_reward: q.token_weight
      });
    }
  } 
  // =========================================================================
  // กรณีที่ 2: มีประวัติการใช้จ่ายแล้ว -> ส่งให้ Typhoon AI วิเคราะห์ลักษณะผู้ใช้และคำนวณ n ครั้ง / n บาท
  // =========================================================================
  else {
    const poolForAI = normalQuests.map(q => ({
      quest_id: Number(q.quest_id),
      title: q.title,
      category: q.category, // SPENDING (ยอดเงิน) หรือ FREQUENCY (จำนวนครั้ง) หรือ EXPLORATION
      shop_category: q.shop_category,
      target_min: q.target_min,
      target_max: q.target_max,
      unit: q.category === 'FREQUENCY' || q.category === 'EXPLORATION' ? 'ครั้ง' : (q.target_max > 1 ? 'บาท' : 'ครั้ง'),
      is_adjustable: q.target_min !== q.target_max
    }));

    const systemPrompt = `คุณคือ AI นักวิเคราะห์พฤติกรรมผู้บริโภคและจัดภารกิจ (Personalized Mission Generator) ของโครงการ "ไทยช่วยไทยพลีส"
หน้าที่ของคุณคือวิเคราะห์ลักษณะนิสัยการใช้จ่ายของผู้ใช้ และคัดเลือกภารกิจ 24 ช่อง พร้อมคำนวณเป้าหมาย (target_value) ทั้งแบบจำนวนเงิน (บาท) และจำนวนครั้ง (n ครั้ง) ให้เหมาะสมกับผู้ใช้แต่ละคน
ตอบกลับเป็น JSON Object เท่านั้น ห้ามมีข้อความอื่น`;

    const userPrompt = `
[ข้อมูลประวัติพฤติกรรมผู้ใช้]
${JSON.stringify(spendingSummary)}

[คลังภารกิจ (Mission Pool)]
${JSON.stringify(poolForAI)}

[กติกาการวิเคราะห์และคำนวณเควส]
1. วิเคราะห์ลักษณะผู้ใช้ (user_persona) เช่น "สายกินร้านอาหารท้องถิ่น", "นักช้อป OTOP กระเป๋าหนัก", "สายประหยัดเน้นใช้จ่ายบ่อย"
2. เลือกภารกิจจากคลังภารกิจมาให้ครบ 24 รายการ โดยเน้นหมวดหมู่ที่ผู้ใช้ชอบ (ดูจาก by_category) ผสมกับหมวดหมู่อื่นเพื่อกระตุ้นให้เกิดการกระจายรายได้
3. การคำนวณค่าเป้าหมาย (target_value):
   - หาก is_adjustable = false: ต้องตั้ง target_value = target_min เสมอ
   - หาก is_adjustable = true และเป็นหมวด FREQUENCY (นับจำนวน n ครั้ง): ให้ดูจำนวนครั้ง (tx_count) ที่ผู้ใช้เคยทำได้ แล้วตั้งเป้าหมาย n ครั้งให้อยู่ในช่วง target_min ถึง target_max ที่ท้าทายขึ้นเล็กน้อย
   - หาก is_adjustable = true และเป็นหมวด SPENDING (นับยอดเงิน n บาท): ให้ดูค่าเฉลี่ยต่อบิล (average_per_tx) และยอดรวม (total_amount) แล้วคำนวณยอดเงินเป้าหมายให้อยู่ในช่วง target_min ถึง target_max

ตอบกลับเป็น JSON รูปแบบนี้เท่านั้น:
{
  "user_persona": "ฉายาลักษณะนิสัยการใช้จ่ายของผู้ใช้",
  "ai_analysis_reason": "อธิบายการวิเคราะห์พฤติกรรม ยอดใช้จ่าย ความถี่ และเหตุผลในการตั้งค่าเป้าหมาย",
  "selected_missions": [
    { "quest_id": 7, "target_value": 60 },
    { "quest_id": 9, "target_value": 3 }
  ]
}`;

    try {
      console.log("🤖 พบประวัติการใช้จ่าย! กำลังส่งข้อมูลให้ Typhoon AI วิเคราะห์...");
      const response = await openai.chat.completions.create({
        model: 'typhoon-v2.5-30b-a3b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1800,
        response_format: { type: 'json_object' }
      });

      let rawContent = response.choices[0].message.content.trim();
      if (rawContent.startsWith('```')) {
        rawContent = rawContent.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(rawContent);
      userPersona = parsed.user_persona || "ผู้ใช้งานทั่วไป";
      aiReason = parsed.ai_analysis_reason || "วิเคราะห์จากประวัติการใช้จ่ายสำเร็จ";

      if (Array.isArray(parsed.selected_missions)) {
        selected24 = parsed.selected_missions.slice(0, 24).map(item => {
          const originalQuest = normalQuests.find(q => Number(q.quest_id) === Number(item.quest_id)) || normalQuests[0];
          
          let validTarget = Math.round(Number(item.target_value)) || originalQuest.target_min;
          if (validTarget < originalQuest.target_min) validTarget = originalQuest.target_min;
          if (validTarget > originalQuest.target_max) validTarget = originalQuest.target_max;

          return {
            quest_id: Number(originalQuest.quest_id),
            title: originalQuest.title,
            category: originalQuest.category,
            shop_category: originalQuest.shop_category,
            target_value: validTarget,
            token_reward: originalQuest.token_weight
          };
        });
      }
    } catch (error) {
      console.error("⚠️ Typhoon AI Error (สลับใช้ระบบสุ่มสำรอง):", error.message);
    }

    // Fallback กรณี AI ส่งมาไม่ครบ 24 ช่อง
    while (selected24.length < 24) {
      const randomQ = normalQuests[Math.floor(Math.random() * normalQuests.length)];
      selected24.push({
        quest_id: Number(randomQ.quest_id),
        title: randomQ.title,
        category: randomQ.category,
        shop_category: randomQ.shop_category,
        target_value: randomQ.target_min,
        token_reward: randomQ.token_weight
      });
    }
  }

  // 4. สุ่มเลือกภารกิจบริจาค (DONATION) มาแทรก 1 ช่องเสมอ
  const randomDonation = donationQuests[Math.floor(Math.random() * donationQuests.length)];
  const donationCell = {
    quest_id: Number(randomDonation.quest_id),
    title: randomDonation.title,
    category: randomDonation.category,
    shop_category: randomDonation.shop_category,
    target_value: randomDonation.target_min,
    token_reward: randomDonation.token_weight
  };

  // 5. รวมเป็น 25 ช่อง แล้วสลับตำแหน่ง (Shuffle)
  const final25Cells = [...selected24, donationCell];
  final25Cells.sort(() => Math.random() - 0.5);

  const boardCells = final25Cells.map((cell, index) => ({
    position: index,
    ...cell
  }));

  return {
    user_id: userId,
    is_first_month_base_quest: transactions.length === 0,
    user_persona: userPersona,
    ai_analysis_reason: aiReason,
    user_spending_summary: spendingSummary,
    total_cells: boardCells.length,
    donation_cells_count: boardCells.filter(c => c.category === 'DONATION').length,
    bingo_board_5x5: boardCells
  };
}

module.exports = {
  generateBingoMissionsWithAI
};