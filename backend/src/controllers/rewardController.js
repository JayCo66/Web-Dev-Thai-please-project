const prisma = require('../config/prisma');
const { getUserTotalTokens } = require('../services/authService');

/**
 * GET /api/v1/rewards
 * Get list of available rewards and lucky draw campaigns
 */
exports.getRewards = async (req, res) => {
  try {
    const rawRewards = await prisma.rewards.findMany({
      where: { is_active: true },
      orderBy: [
        { reward_type: 'asc' },
        { token_cost: 'asc' },
      ],
    });

    // Enrich rewards with visual assets, categories, and stock metadata
    const rewards = rawRewards.map((r) => {
      let category = 'COUPON';
      let tag = 'คูปองดิจิทัล';
      let stock = 100;
      let badgeColor = '#2563EB';

      if (r.reward_type === 'LUCKY_DRAW') {
        category = 'LUCKY_DRAW';
        tag = 'ชิงโชครางวัลใหญ่';
        stock = 999;
        badgeColor = '#D97706';
      } else if (r.reward_type === 'PHYSICAL') {
        category = 'PHYSICAL';
        tag = 'ของพรีเมียมจัดส่งฟรี';
        stock = 45;
        badgeColor = '#059669';
      } else if (r.reward_type === 'DISCOUNT') {
        category = 'DISCOUNT';
        tag = 'ส่วนลดพิเศษ';
        stock = 150;
        badgeColor = '#7C3AED';
      }

      return {
        rewardId: r.reward_id.toString(),
        name: r.name,
        description: r.description,
        rewardType: r.reward_type,
        tokenCost: r.token_cost,
        imageUrl: r.image_url,
        category,
        tag,
        stock,
        badgeColor,
        partner: 'โครงการไทยช่วยไทยพลัส & วิสาหกิจชุมชน',
      };
    });

    // Current Monthly Lucky Draw Campaign Info
    const luckyDrawCampaign = {
      campaignId: 'LUCKY-2026-M10',
      title: 'ไทยช่วยไทยพลัส สัญจรลุ้นโชคใหญ่ ประจำงวดสิ้นเดือน',
      subtitle: 'ใช้ Impact Tokens ลงชื่อลุ้นรับรางวัลมูลค่ารวมกว่า 300,000 บาท',
      drawDate: '31 มีนาคม 2026 (เวลา 18:00 น.)',
      status: 'OPEN_FOR_ENTRY',
      costPerTicket: 20,
      prizes: [
        { rank: 1, name: 'ทองคำแท่ง หนัก 1 บาท', value: '45,000 บาท', quantity: 2, icon: 'Crown' },
        { rank: 2, name: 'สมาร์ทโฟน iPhone 16 Pro 256GB', value: '39,900 บาท', quantity: 3, icon: 'Smartphone' },
        { rank: 3, name: 'รถจักรยานยนต์ไฟฟ้า EV Eco City', value: '35,000 บาท', quantity: 2, icon: 'Bike' },
        { rank: 4, name: 'บัตรเติมน้ำมัน PTT Station 5,000 บาท', value: '5,000 บาท', quantity: 10, icon: 'Fuel' },
        { rank: 5, name: 'Gift Voucher ห้างสรรพสินค้า 2,000 บาท', value: '2,000 บาท', quantity: 20, icon: 'ShoppingBag' },
      ],
      packages: [
        { tickets: 1, tokens: 20, label: '1 สิทธิ์ (20 Tokens)', badge: null },
        { tickets: 3, tokens: 50, label: '3 สิทธิ์ (50 Tokens)', badge: 'ประหยัด 10 Tokens' },
        { tickets: 5, tokens: 80, label: '5 สิทธิ์ (80 Tokens)', badge: 'คุ้มสุด! ประหยัด 20 Tokens' },
      ],
    };

    return res.json({
      success: true,
      data: {
        rewards,
        luckyDrawCampaign,
      },
    });
  } catch (error) {
    console.error('Error fetching rewards:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลของรางวัล',
    });
  }
};

/**
 * POST /api/v1/rewards/redeem
 * Redeem a reward using Impact Tokens
 */
exports.redeemReward = async (req, res) => {
  try {
    const userId = BigInt(req.user.userId);
    const { rewardId } = req.body;

    if (!rewardId) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุรหัสของรางวัลที่ต้องการแลก',
      });
    }

    const reward = await prisma.rewards.findUnique({
      where: { reward_id: BigInt(rewardId) },
    });

    if (!reward || !reward.is_active) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบของรางวัลที่เลือก หรือของรางวัลนี้หมดอายุแล้ว',
      });
    }

    // Check user's current token balance
    const currentTokens = await getUserTotalTokens(userId);
    if (currentTokens < reward.token_cost) {
      return res.status(400).json({
        success: false,
        error: `Impact Tokens ของคุณไม่เพียงพอ (ต้องการ ${reward.token_cost} Tokens แต่คุณมี ${currentTokens} Tokens)`,
      });
    }

    // Deduct tokens via token_transactions (negative amount)
    await prisma.token_transactions.create({
      data: {
        user_id: userId,
        amount: -reward.token_cost,
        type: 'REDEEM_REWARD',
      },
    });

    // Calculate new token balance
    const newTokens = await getUserTotalTokens(userId);

    // Generate unique Voucher Code and Barcode Number
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const voucherCode = `TP-${reward.reward_type.substring(0, 3)}-${randomHex}`;
    const barcodeNumber = '885' + Math.floor(100000000 + Math.random() * 900000000).toString();

    // Expiry date (45 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 45);

    return res.status(201).json({
      success: true,
      message: `แลกรับ "${reward.name}" สำเร็จ!`,
      data: {
        rewardId: reward.reward_id.toString(),
        rewardName: reward.name,
        rewardType: reward.reward_type,
        tokensSpent: reward.token_cost,
        remainingTokens: newTokens,
        voucherCode,
        barcodeNumber,
        redeemedAt: new Date().toISOString(),
        expiresAt: expiryDate.toISOString(),
        instructions:
          reward.reward_type === 'PHYSICAL'
            ? 'เจ้าหน้าที่จะติดต่อกลับผ่านเบอร์โทรศัพท์ที่ลงทะเบียนไว้ เพื่อยืนยันที่อยู่จัดส่งพัสดุ (ส่งฟรีทั่วไทย)'
            : 'แสดงรหัสคูปองนี้แก่พนักงานที่หน้าร้านค้าชุมชนหรือเครือข่ายไทยช่วยไทยที่ร่วมรายการ',
      },
    });
  } catch (error) {
    console.error('Error redeeming reward:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการแลกของรางวัล',
    });
  }
};

/**
 * POST /api/v1/rewards/lucky-draw
 * Enter the Lucky Draw with Impact Tokens
 */
exports.enterLuckyDraw = async (req, res) => {
  try {
    const userId = BigInt(req.user.userId);
    const { rewardId, ticketsCount = 1, campaignId = 'LUCKY-2026-M10' } = req.body;

    const count = parseInt(ticketsCount, 10);
    if (isNaN(count) || count <= 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุจำนวนสิทธิ์ชิงโชคที่ถูกต้อง',
      });
    }

    // Determine package price
    let totalCost = 0;
    if (count === 1) totalCost = 20;
    else if (count === 3) totalCost = 50;
    else if (count === 5) totalCost = 80;
    else totalCost = count * 20;

    // Check user's token balance
    const currentTokens = await getUserTotalTokens(userId);
    if (currentTokens < totalCost) {
      return res.status(400).json({
        success: false,
        error: `Impact Tokens ของคุณไม่เพียงพอ (ต้องการ ${totalCost} Tokens แต่คุณมี ${currentTokens} Tokens)`,
      });
    }

    // Deduct tokens
    await prisma.token_transactions.create({
      data: {
        user_id: userId,
        amount: -totalCost,
        type: 'REDEEM_REWARD',
      },
    });

    const newTokens = await getUserTotalTokens(userId);

    // Generate ticket numbers
    const tickets = [];
    for (let i = 0; i < count; i++) {
      const ticketNum = 'TP-LUCK-' + Math.floor(100000 + Math.random() * 900000).toString();
      tickets.push({
        ticketNumber: ticketNum,
        campaignId,
        issuedAt: new Date().toISOString(),
      });
    }

    return res.status(201).json({
      success: true,
      message: `ลงชื่อลุ้นโชคใหญ่สำเร็จ! ได้รับสิทธิ์ทั้งหมด ${count} สิทธิ์`,
      data: {
        campaignId,
        ticketsCount: count,
        tokensSpent: totalCost,
        remainingTokens: newTokens,
        tickets,
        drawDate: '31 มีนาคม 2026 (เวลา 18:00 น.)',
        announcementUrl: 'ประกาศผลผ่านหน้าแอปพลิเคชันและถ่ายทอดสดออนไลน์',
      },
    });
  } catch (error) {
    console.error('Error entering lucky draw:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลงชื่อชิงโชค',
    });
  }
};

/**
 * POST /api/v1/rewards/instant-spin
 * Interactive spin wheel mini-game
 */
exports.instantSpin = async (req, res) => {
  try {
    const userId = BigInt(req.user.userId);
    const spinCost = 15;

    const currentTokens = await getUserTotalTokens(userId);
    if (currentTokens < spinCost) {
      return res.status(400).json({
        success: false,
        error: `คุณต้องมีอย่างน้อย ${spinCost} Tokens เพื่อหมุนวงล้อเสี่ยงโชค (คงเหลือ ${currentTokens} Tokens)`,
      });
    }

    // Deduct spin cost
    await prisma.token_transactions.create({
      data: {
        user_id: userId,
        amount: -spinCost,
        type: 'REDEEM_REWARD',
      },
    });

    // Spin outcomes table
    const outcomes = [
      { id: 't50', label: 'แจ็กพอต! ได้รับ 50 Tokens คืน', type: 'TOKENS', value: 50, color: '#D97706', isWin: true },
      { id: 'drink', label: 'คูปองเครื่องดื่มฟรี 1 แก้ว', type: 'COUPON', value: 'FREE-DRINK', color: '#2563EB', isWin: true },
      { id: 'luck2', label: 'สิทธิ์ลุ้นทองคำ 2 ใบ', type: 'LUCKY_TICKETS', value: 2, color: '#DC2626', isWin: true },
      { id: 't20', label: 'ได้รับ 20 Tokens คืน', type: 'TOKENS', value: 20, color: '#059669', isWin: true },
      { id: 'cpn20', label: 'คูปองส่วนลด 20 บาท ร้านชุมชน', type: 'COUPON', value: 'DISCOUNT-20', color: '#7C3AED', isWin: true },
      { id: 't10', label: 'แต้มบุญสมทบชุมชน +10 Tokens', type: 'TOKENS', value: 10, color: '#F59E0B', isWin: true },
    ];

    // Pick random outcome
    const chosenIndex = Math.floor(Math.random() * outcomes.length);
    const chosen = outcomes[chosenIndex];

    // If won tokens, grant tokens back
    if (chosen.type === 'TOKENS' && chosen.value > 0) {
      await prisma.token_transactions.create({
        data: {
          user_id: userId,
          amount: chosen.value,
          type: 'EARN_CELL',
        },
      });
    }

    const finalTokens = await getUserTotalTokens(userId);

    return res.json({
      success: true,
      message: `ผลการหมุนวงล้อ: ${chosen.label}`,
      data: {
        outcomeIndex: chosenIndex,
        prize: chosen,
        spinCost,
        remainingTokens: finalTokens,
      },
    });
  } catch (error) {
    console.error('Error during instant spin:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการหมุนวงล้อ',
    });
  }
};

/**
 * GET /api/v1/rewards/my-history
 * Get token history (earned and spent)
 */
exports.getMyTokenHistory = async (req, res) => {
  try {
    const userId = BigInt(req.user.userId);

    const txs = await prisma.token_transactions.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const totalBalance = await getUserTotalTokens(userId);

    const formattedHistory = txs.map((tx) => {
      let description = 'ทำรายการโทเค็น';
      let icon = 'Coins';

      if (tx.amount > 0) {
        if (tx.type === 'EARN_CELL') {
          description = 'ได้รับ Impact Tokens (ต้อนรับ / บริจาค / ทำภารกิจ)';
          icon = 'Sparkles';
        } else if (tx.type === 'EARN_LINE') {
          description = 'พิชิตบิงโกสำเร็จ (รับโบนัสแถว)';
          icon = 'Trophy';
        }
      } else {
        if (tx.type === 'REDEEM_REWARD') {
          description = 'ใช้ Tokens แลกของรางวัล / สิทธิ์ชิงโชคไทยช่วยไทยพลัส';
          icon = 'Gift';
        } else {
          description = 'ตัดยอดโทเค็น';
          icon = 'Coins';
        }
      }

      return {
        id: tx.token_transaction_id.toString(),
        amount: tx.amount,
        type: tx.type,
        description,
        icon,
        createdAt: tx.created_at,
      };
    });

    return res.json({
      success: true,
      data: {
        totalTokens: totalBalance,
        history: formattedHistory,
      },
    });
  } catch (error) {
    console.error('Error fetching token history:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงประวัติโทเค็น',
    });
  }
};

/**
 * POST /api/v1/rewards/demo-faucet
 * Demo helper to get free tokens for testing
 */
exports.faucetTokens = async (req, res) => {
  try {
    const userId = BigInt(req.user.userId);
    const amount = 50;

    await prisma.token_transactions.create({
      data: {
        user_id: userId,
        amount: amount,
        type: 'EARN_CELL',
      },
    });

    const newTokens = await getUserTotalTokens(userId);

    return res.json({
      success: true,
      message: `รับฟรี +${amount} Impact Tokens สำหรับทดสอบเรียบร้อยแล้ว!`,
      data: {
        added: amount,
        totalTokens: newTokens,
      },
    });
  } catch (error) {
    console.error('Error faucet tokens:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถรับโทเค็นจำลองได้',
    });
  }
};
