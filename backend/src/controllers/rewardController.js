const REWARD_FALLBACK_IMAGES = {
  1: '/rewards/coupon50.jpg',
  2: '/rewards/drink.jpg',
  3: '/rewards/gold.jpg',
  4: '/rewards/totebag.jpg',
  5: '/rewards/fuel.jpg',
  6: '/rewards/polo.jpg',
  7: '/rewards/rice.jpg',
  8: '/rewards/tumbler.jpg',
  9: '/rewards/gold.jpg',
  10: '/rewards/iphone.jpg',
  11: '/rewards/ev.jpg',
};
const prisma = require('../config/prisma');
const { getUserTotalTokens } = require('../services/authService');

/**
 * Calculate cost in tokens for Lucky Draw tickets (Soft Sink)
 * 1 ticket: 25 tokens
 * 3 tickets: 60 tokens (save 15)
 * 5 tickets: 90 tokens (save 35)
 * Other: count * 25 tokens
 */
function calculateLuckyDrawCost(count) {
  const parsed = parseInt(count, 10);
  if (isNaN(parsed) || parsed <= 0) {
    const error = new Error('กรุณาระบุจำนวนสิทธิ์ชิงโชคที่ถูกต้อง');
    error.statusCode = 400;
    throw error;
  }
  if (parsed === 1) return 25;
  if (parsed === 3) return 60;
  if (parsed === 5) return 90;
  return parsed * 25;
}

/**
 * Check if citizen has quota remaining for monthly hard sinks (e.g. 50 THB voucher)
 */
function checkMonthlyHardSinkQuota(monthlyRedemptions, maxLimit = 1) {
  return Number(monthlyRedemptions || 0) < maxLimit;
}

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
        tag = 'สินค้าพรีเมียม';
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
        imageUrl: r.image_url || REWARD_FALLBACK_IMAGES[Number(r.reward_id)] || null,
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
      costPerTicket: 25,
      prizes: [
        { rank: 1, name: 'ทองคำแท่ง หนัก 1 บาท', value: '45,000 บาท', quantity: 2, icon: 'Crown', image: '/rewards/gold.jpg' },
        { rank: 2, name: 'สมาร์ทโฟน iPhone 16 Pro 256GB', value: '39,900 บาท', quantity: 3, icon: 'Smartphone', image: '/rewards/iphone.jpg' },
        { rank: 3, name: 'รถจักรยานยนต์ไฟฟ้า EV Eco City', value: '35,000 บาท', quantity: 2, icon: 'Bike', image: '/rewards/ev.jpg' },
        { rank: 4, name: 'บัตรเติมน้ำมัน PTT Station 5,000 บาท', value: '5,000 บาท', quantity: 10, icon: 'Fuel', image: '/rewards/fuel.jpg' },
        { rank: 5, name: 'Gift Voucher ห้างสรรพสินค้า 2,000 บาท', value: '2,000 บาท', quantity: 20, icon: 'ShoppingBag', image: '/rewards/coupon50.jpg' },
      ],
      packages: [
        { tickets: 1, tokens: 25, label: '1 สิทธิ์ (25 Tokens)', badge: null },
        { tickets: 3, tokens: 60, label: '3 สิทธิ์ (60 Tokens)', badge: 'ประหยัด 15 Tokens' },
        { tickets: 5, tokens: 90, label: '5 สิทธิ์ (90 Tokens)', badge: 'คุ้มสุด! ประหยัด 35 Tokens' },
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

    // Enforce Monthly Hard Sink Quota (ADR-0001 & ADR-0002):
    // Max 1 cash discount voucher (50 THB / 500 Tokens) per citizen per calendar month
    if ((reward.reward_type === 'COUPON' || reward.reward_type === 'DISCOUNT') && reward.token_cost >= 500) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const recentRedemptions = await prisma.token_transactions.count({
        where: {
          user_id: userId,
          type: 'REDEEM_REWARD',
          amount: { lte: -500 },
          created_at: { gte: startOfMonth },
        },
      });

      if (!checkMonthlyHardSinkQuota(recentRedemptions, 1)) {
        return res.status(400).json({
          success: false,
          error: 'คุณใช้สิทธิ์แลกคูปองส่วนลด 50 บาทครบโควตาประจำเดือนนี้แล้ว (จำกัด 1 สิทธิ์/คน/เดือน) เพื่อเปิดโอกาสให้ผู้อื่นอย่างทั่วถึง',
        });
      }
    }

    // Generate unique Voucher Code and Barcode Number
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const voucherCode = `TP-${reward.reward_type.substring(0, 3)}-${randomHex}`;
    const barcodeNumber = '885' + Math.floor(100000000 + Math.random() * 900000000).toString();

    // Expiry date (45 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 45);

    const instructions =
      reward.reward_type === 'PHYSICAL'
        ? 'เจ้าหน้าที่จะติดต่อกลับผ่านเบอร์โทรศัพท์ที่ลงทะเบียนไว้ เพื่อยืนยันที่อยู่จัดส่งพัสดุ (ส่งฟรีทั่วไทย)'
        : 'แสดงรหัสคูปองนี้แก่พนักงานที่หน้าร้านค้าชุมชนหรือเครือข่ายไทยช่วยไทยที่ร่วมรายการ';

    // Deduct tokens AND persist redemption to MySQL reward_redemptions inside atomic transaction
    const { newTokens, redemptionId } = await prisma.$transaction(async (tx) => {
      const currentTokens = await getUserTotalTokens(userId, tx);
      if (currentTokens < reward.token_cost) {
        const error = new Error(`Impact Tokens ของคุณไม่เพียงพอ (ต้องการ ${reward.token_cost} Tokens แต่คุณมี ${currentTokens} Tokens)`);
        error.statusCode = 400;
        throw error;
      }

      await tx.token_transactions.create({
        data: {
          user_id: userId,
          amount: -reward.token_cost,
          type: 'REDEEM_REWARD',
        },
      });

      await tx.$executeRawUnsafe(
        `INSERT INTO reward_redemptions (
          user_id, reward_id, reward_name, reward_type, token_cost,
          voucher_code, barcode_number, status, instructions, redeemed_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, NOW(), ?);`,
        userId, reward.reward_id, reward.name, reward.reward_type, reward.token_cost,
        voucherCode, barcodeNumber, instructions, expiryDate
      );

      const [inserted] = await tx.$queryRawUnsafe('SELECT LAST_INSERT_ID() AS id;');
      const idStr = inserted && inserted.id ? inserted.id.toString() : null;

      return { newTokens: currentTokens - reward.token_cost, redemptionId: idStr };
    });

    console.log(`[Reward] User ${userId} successfully redeemed "${reward.name}" (Voucher: ${voucherCode}) saved in DB!`);

    return res.status(201).json({
      success: true,
      message: `แลกรับ "${reward.name}" สำเร็จ!`,
      data: {
        redemptionId,
        rewardId: reward.reward_id.toString(),
        rewardName: reward.name,
        rewardType: reward.reward_type,
        tokensSpent: reward.token_cost,
        remainingTokens: newTokens,
        voucherCode,
        barcodeNumber,
        status: 'ACTIVE',
        redeemedAt: new Date().toISOString(),
        expiresAt: expiryDate.toISOString(),
        instructions,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }
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

    // Calculate package price using rebalanced tokenomics (ADR-0001 & ADR-0002)
    const count = parseInt(ticketsCount, 10);
    const totalCost = calculateLuckyDrawCost(ticketsCount);

    const drawExpiryDate = new Date('2026-03-31T23:59:59');

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

    // Deduct tokens atomically inside transaction AND save each ticket to MySQL reward_redemptions
    const { newTokens } = await prisma.$transaction(async (tx) => {
      const currentTokens = await getUserTotalTokens(userId, tx);
      if (currentTokens < totalCost) {
        const error = new Error(`Impact Tokens ของคุณไม่เพียงพอ (ต้องการ ${totalCost} Tokens แต่คุณมี ${currentTokens} Tokens)`);
        error.statusCode = 400;
        throw error;
      }

      await tx.token_transactions.create({
        data: {
          user_id: userId,
          amount: -totalCost,
          type: 'REDEEM_REWARD',
        },
      });

      const perTicketCost = Math.round(totalCost / count);
      for (const t of tickets) {
        await tx.$executeRawUnsafe(
          `INSERT INTO reward_redemptions (
            user_id, reward_id, reward_name, reward_type, token_cost,
            ticket_number, campaign_id, status, instructions, redeemed_at, expires_at
          ) VALUES (?, NULL, 'สิทธิ์ชิงโชคไทยช่วยไทยพลัส', 'LUCKY_DRAW', ?, ?, ?, 'ACTIVE', 'รอลุ้นรางวัลใหญ่ประจำงวด 31 มีนาคม 2026', NOW(), ?);`,
          userId, perTicketCost, t.ticketNumber, campaignId, drawExpiryDate
        );
      }

      return { newTokens: currentTokens - totalCost };
    });

    console.log(`[LuckyDraw] User ${userId} entered ${count} lucky tickets (Campaign: ${campaignId}) saved in DB!`);

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
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }
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

    let bonusVoucher = null;
    let bonusTickets = [];

    // If won tokens, grant tokens back
    if (chosen.type === 'TOKENS' && chosen.value > 0) {
      await prisma.token_transactions.create({
        data: {
          user_id: userId,
          amount: chosen.value,
          type: 'EARN_CELL',
        },
      });
    } else if (chosen.type === 'COUPON') {
      const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
      const bonusCode = `TP-WHEEL-${randomHex}`;
      const bonusBarcode = '885' + Math.floor(100000000 + Math.random() * 900000000).toString();
      const bonusExpiry = new Date();
      bonusExpiry.setDate(bonusExpiry.getDate() + 30);
      const instructions = 'คูปองรางวัลพิเศษจากวงล้อเสี่ยงโชค แสดงหน้าร้านเพื่อรับสิทธิพิเศษ';

      await prisma.$executeRawUnsafe(
        `INSERT INTO reward_redemptions (
          user_id, reward_id, reward_name, reward_type, token_cost,
          voucher_code, barcode_number, status, instructions, redeemed_at, expires_at
        ) VALUES (?, NULL, ?, 'COUPON', 0, ?, ?, 'ACTIVE', ?, NOW(), ?);`,
        userId, chosen.label, bonusCode, bonusBarcode, instructions, bonusExpiry
      );

      bonusVoucher = {
        rewardName: chosen.label,
        rewardType: 'COUPON',
        voucherCode: bonusCode,
        barcodeNumber: bonusBarcode,
        status: 'ACTIVE',
        redeemedAt: new Date().toISOString(),
        expiresAt: bonusExpiry.toISOString(),
        instructions,
      };
    } else if (chosen.type === 'LUCKY_TICKETS' && chosen.value > 0) {
      const drawExpiryDate = new Date('2026-03-31T23:59:59');
      for (let i = 0; i < chosen.value; i++) {
        const ticketNum = 'TP-LUCK-' + Math.floor(100000 + Math.random() * 900000).toString();
        await prisma.$executeRawUnsafe(
          `INSERT INTO reward_redemptions (
            user_id, reward_id, reward_name, reward_type, token_cost,
            ticket_number, campaign_id, status, instructions, redeemed_at, expires_at
          ) VALUES (?, NULL, 'สิทธิ์ชิงโชค (รางวัลวงล้อ)', 'LUCKY_DRAW', 0, ?, 'LUCKY-2026-M10', 'ACTIVE', 'สิทธิ์ลุ้นรางวัลใหญ่จากการหมุนวงล้อ', NOW(), ?);`,
          userId, ticketNum, drawExpiryDate
        );
        bonusTickets.push({
          ticketNumber: ticketNum,
          campaignId: 'LUCKY-2026-M10',
          issuedAt: new Date().toISOString(),
        });
      }
    }

    const finalTokens = await getUserTotalTokens(userId);

    return res.json({
      success: true,
      message: `ผลการหมุนวงล้อ: ${chosen.label}`,
      data: {
        outcomeIndex: chosenIndex,
        prize: {
          ...chosen,
          bonusVoucher,
          bonusTickets,
        },
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


/**
 * GET /api/v1/rewards/my-redemptions
 * Get user's redeemed vouchers and lucky draw tickets directly from MySQL Database
 */
exports.getMyRedemptions = async (req, res) => {
  try {
    const userId = BigInt(req.user.userId);

    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM reward_redemptions WHERE user_id = ? ORDER BY redeemed_at DESC;`,
      userId
    );

    const vouchers = [];
    const tickets = [];

    rows.forEach((r) => {
      if (r.reward_type === 'LUCKY_DRAW') {
        tickets.push({
          redemptionId: r.redemption_id.toString(),
          ticketNumber: r.ticket_number,
          campaignId: r.campaign_id || 'LUCKY-2026-M10',
          campaignTitle: 'ไทยช่วยไทยพลัส สัญจรลุ้นโชคใหญ่',
          drawDate: '31 มีนาคม 2026 (เวลา 18:00 น.)',
          issuedAt: r.redeemed_at ? new Date(r.redeemed_at).toISOString() : null,
          status: r.status,
        });
      } else {
        vouchers.push({
          redemptionId: r.redemption_id.toString(),
          rewardId: r.reward_id ? r.reward_id.toString() : null,
          rewardName: r.reward_name,
          rewardType: r.reward_type,
          tokensSpent: r.token_cost,
          voucherCode: r.voucher_code,
          barcodeNumber: r.barcode_number,
          status: r.status,
          instructions: r.instructions || 'แสดงรหัสนี้แก่พนักงานที่หน้าร้านเพื่อรับสิทธิพิเศษ',
          redeemedAt: r.redeemed_at ? new Date(r.redeemed_at).toISOString() : null,
          expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
          usedAt: r.used_at ? new Date(r.used_at).toISOString() : null,
        });
      }
    });

    return res.json({
      success: true,
      data: {
        totalVouchers: vouchers.length,
        totalTickets: tickets.length,
        vouchers,
        tickets,
      },
    });
  } catch (error) {
    console.error('Error fetching my redemptions:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการแลกรางวัลจากฐานข้อมูล',
    });
  }
};

/**
 * POST /api/v1/rewards/use-voucher
 * Mark a redeemed voucher as USED at the merchant
 */
exports.useVoucher = async (req, res) => {
  try {
    const userId = BigInt(req.user.userId);
    const { voucherCode, redemptionId } = req.body;

    if (!voucherCode && !redemptionId) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุรหัสคูปองหรือรหัสการแลกรางวัล',
      });
    }

    let rows;
    if (voucherCode) {
      rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM reward_redemptions WHERE voucher_code = ? AND user_id = ?;`,
        voucherCode, userId
      );
    } else {
      rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM reward_redemptions WHERE redemption_id = ? AND user_id = ?;`,
        BigInt(redemptionId), userId
      );
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบคูปองนี้ หรือคูปองไม่ใช่ของคุณ',
      });
    }

    const item = rows[0];
    if (item.status === 'USED') {
      return res.status(400).json({
        success: false,
        error: 'คูปองนี้ถูกใช้งานไปแล้ว',
      });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE reward_redemptions SET status = 'USED', used_at = NOW() WHERE redemption_id = ?;`,
      item.redemption_id
    );

    return res.json({
      success: true,
      message: `ใช้งานคูปอง "${item.reward_name}" เรียบร้อยแล้ว`,
      data: {
        redemptionId: item.redemption_id.toString(),
        voucherCode: item.voucher_code,
        status: 'USED',
        usedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error using voucher:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการใช้งานคูปอง',
    });
  }
};

exports.calculateLuckyDrawCost = calculateLuckyDrawCost;

exports.checkMonthlyHardSinkQuota = checkMonthlyHardSinkQuota;
