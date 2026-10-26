const prisma = require('../config/prisma');

/**
 * GET /api/v1/charities
 * List all active charities and foundations
 */
async function getCharities(req, res) {
  try {
    const list = await prisma.charities.findMany({
      where: { is_active: true },
      orderBy: { charity_id: 'asc' },
    });

    // Also get donation aggregates for social impact visualization
    const donationsGrouped = await prisma.donations.groupBy({
      by: ['charity_id'],
      _sum: { amount: true },
      _count: { donation_id: true },
    });

    const donationMap = {};
    donationsGrouped.forEach((item) => {
      donationMap[item.charity_id.toString()] = {
        totalAmount: item._sum.amount ? Number(item._sum.amount) : 0,
        donationCount: item._count.donation_id || 0,
      };
    });

    const enriched = list.map((c) => {
      const stats = donationMap[c.charity_id.toString()] || { totalAmount: 0, donationCount: 0 };
      return {
        charityId: c.charity_id.toString(),
        name: c.name,
        taxId: c.tax_id,
        description: c.description,
        impactType: c.impact_type,
        totalDonations: stats.totalAmount,
        donorCount: stats.donationCount,
      };
    });

    return res.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    console.error('Error fetching charities:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลมูลนิธิ',
    });
  }
}

/**
 * POST /api/v1/charities/donate
 * Simulate donation and deduct balance
 */
async function donateToCharity(req, res) {
  try {
    const { charityId, amount, note } = req.body;
    const userId = BigInt(req.user.userId);

    const donationAmount = parseFloat(amount);
    if (!donationAmount || donationAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุจำนวนเงินบริจาคที่ถูกต้อง (มากกว่า 0 บาท)',
      });
    }

    if (!charityId) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาเลือกมูลนิธิที่ต้องการบริจาค',
      });
    }

    const charity = await prisma.charities.findUnique({
      where: { charity_id: BigInt(charityId) },
    });

    if (!charity) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลมูลนิธิที่เลือก',
      });
    }

    // Generate e-Donation reference code (กรมสรรพากร / e-Donation format)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const edonRef = `EDON-${dateStr}-${randomSuffix}`;

    // Record donation in database
    const newDonation = await prisma.donations.create({
      data: {
        charity_id: charity.charity_id,
        user_id: userId,
        amount: donationAmount,
        edonation_ref: edonRef,
      },
    });

    // Award bonus Impact Tokens (1 token for every 20 THB donated)
    const bonusTokens = Math.max(1, Math.floor(donationAmount / 20));
    await prisma.token_transactions.create({
      data: {
        user_id: userId,
        amount: bonusTokens,
        type: 'EARN_CELL',
      },
    });

    // Real-time Mission Checker: Synchronize Bingo Mission progress for citizen
    let questUpdate = null;
    try {
      const { syncDonationProgress } = require('./questController');
      questUpdate = await syncDonationProgress(userId.toString(), donationAmount, newDonation.donation_id);
    } catch (questErr) {
      console.warn('Could not sync quest progress on donation:', questErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `บริจาคให้ ${charity.name} สำเร็จ`,
      data: {
        donationId: newDonation.donation_id.toString(),
        charityName: charity.name,
        impactType: charity.impact_type,
        amount: donationAmount,
        edonationRef: edonRef,
        bonusTokensAwarded: bonusTokens,
        donatedAt: newDonation.donated_at,
        questUpdate,
      },
    });
  } catch (error) {
    console.error('Error processing donation:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการบันทึกการบริจาค',
    });
  }
}

/**
 * GET /api/v1/charities/my-donations
 * Get user's personal donation history
 */
async function getMyDonations(req, res) {
  try {
    const userId = BigInt(req.user.userId);

    const history = await prisma.donations.findMany({
      where: { user_id: userId },
      include: {
        charities: true,
      },
      orderBy: { donated_at: 'desc' },
    });

    const formatted = history.map((d) => ({
      donationId: d.donation_id.toString(),
      charityName: d.charities?.name || 'มูลนิธิเพื่อสังคม',
      impactType: d.charities?.impact_type,
      amount: Number(d.amount),
      edonationRef: d.edonation_ref,
      donatedAt: d.donated_at,
    }));

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('Error fetching donation history:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงประวัติการบริจาค',
    });
  }
}

module.exports = {
  getCharities,
  donateToCharity,
  getMyDonations,
};
