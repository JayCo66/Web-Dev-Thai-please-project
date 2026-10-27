const prisma = require('../config/prisma');

/**
 * GET /api/v1/transactions/shops
 * Get active participating shops for checkout
 */
async function getShops(req, res) {
  try {
    const shops = await prisma.shops.findMany({
      where: { is_active: true },
      orderBy: { shop_id: 'asc' },
    });

    const formatted = shops.map((s) => ({
      shopId: s.shop_id.toString(),
      shopName: s.shop_name,
      category: s.category,
      address: s.address,
    }));

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('Error fetching shops:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลร้านค้า',
    });
  }
}

/**
 * POST /api/v1/transactions/pay
 * Make a payment using Co-Pay 60/40 benefit
 */
async function createPayment(req, res) {
  try {
    const { shopId, amount } = req.body;
    const userId = BigInt(req.user.userId);

    const totalAmount = parseFloat(amount);
    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอกยอดเงินที่ต้องการชำระให้ถูกต้อง (มากกว่า 0 บาท)',
      });
    }

    if (!shopId) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาเลือกร้านค้าที่ต้องการชำระเงิน',
      });
    }

    const shop = await prisma.shops.findUnique({
      where: { shop_id: BigInt(shopId) },
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบร้านค้าที่เลือก',
      });
    }

    // Co-Payment 60/40 Calculation:
    // Government subsidizes 60%, Citizen pays 40%
    // Standard daily subsidy cap: max 150 THB/day
    const maxDailyGovSubsidy = 150.00;
    let govSubsidy = Math.round(totalAmount * 0.60 * 100) / 100;
    if (govSubsidy > maxDailyGovSubsidy) {
      govSubsidy = maxDailyGovSubsidy;
    }

    const userPayment = Math.round((totalAmount - govSubsidy) * 100) / 100;

    // Record into the transactions table
    const newTransaction = await prisma.transactions.create({
      data: {
        user_id: userId,
        shop_id: shop.shop_id,
        total_amount: totalAmount,
        user_amount: userPayment,
        government_amount: govSubsidy,
        status: 'COMPLETED',
      },
      include: {
        shops: true,
      },
    });

    // Real-time Mission Checker: Synchronize Bingo Mission progress for citizen
    let questUpdate = null;
    try {
      const { syncPaymentProgress } = require('./questController');
      questUpdate = await syncPaymentProgress(userId.toString(), newTransaction);
    } catch (questErr) {
      console.warn('Could not sync quest progress on payment:', questErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `ชำระเงินให้ร้าน "${shop.shop_name}" สำเร็จ`,
      data: {
        transactionId: newTransaction.transaction_id.toString(),
        shopId: shop.shop_id.toString(),
        shopName: shop.shop_name,
        category: shop.category,
        totalAmount: totalAmount,
        userAmount: userPayment,
        governmentAmount: govSubsidy,
        copayRate: '60/40',
        paidAt: newTransaction.paid_at,
        questUpdate,
      },
    });
  } catch (error) {
    console.error('Error creating payment transaction:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการประมวลผลการชำระเงิน',
    });
  }
}

/**
 * GET /api/v1/transactions/my-history
 * Get user's purchase transaction history
 */
async function getMyTransactions(req, res) {
  try {
    const userId = BigInt(req.user.userId);

    const txs = await prisma.transactions.findMany({
      where: { user_id: userId },
      include: {
        shops: true,
      },
      orderBy: { paid_at: 'desc' },
    });

    const formatted = txs.map((t) => ({
      transactionId: t.transaction_id.toString(),
      shopName: t.shops?.shop_name || 'ร้านค้าในโครงการ',
      category: t.shops?.category,
      totalAmount: Number(t.total_amount),
      userAmount: Number(t.user_amount),
      governmentAmount: Number(t.government_amount),
      status: t.status,
      paidAt: t.paid_at,
    }));

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงประวัติการชำระเงิน',
    });
  }
}

module.exports = {
  getShops,
  createPayment,
  getMyTransactions,
};
