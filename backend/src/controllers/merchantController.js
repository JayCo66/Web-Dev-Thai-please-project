const { randomBytes } = require('crypto');
const prisma = require('../config/prisma');
const { fail, money, handleError, bangkokPeriod } = require('../utils/operations');

const BILL_MINUTES = 15;
const dayKey = (value) => new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 10);

async function ownShop(userId) {
  const shop = await prisma.shops.findFirst({ where: { owner_user_id: BigInt(userId) }, orderBy: { shop_id: 'asc' } });
  if (!shop) fail('บัญชีนี้ยังไม่มีร้านค้าที่ลงทะเบียน', 404);
  return shop;
}

function formatBill(bill, now = new Date()) {
  // EXPIRED is derived from the clock, so no background job has to flip it.
  const expired = bill.status === 'PENDING' && bill.expires_at <= now;
  return {
    billId: bill.request_id.toString(),
    code: bill.code,
    amount: Number(bill.amount),
    note: bill.note,
    status: expired ? 'EXPIRED' : bill.status,
    createdAt: bill.created_at,
    expiresAt: bill.expires_at,
  };
}

/** GET /api/v1/merchants/me: shop, approval status and a small sales summary */
async function getMyShop(req, res) {
  try {
    const shop = await ownShop(req.user.userId);
    const sales = await prisma.transactions.aggregate({
      where: { shop_id: shop.shop_id, status: 'COMPLETED' },
      _count: { transaction_id: true },
      _sum: { total_amount: true },
    });
    return res.json({
      success: true,
      data: {
        shopId: shop.shop_id.toString(),
        shopName: shop.shop_name,
        category: shop.category,
        address: shop.address || '',
        status: shop.status,
        isActive: Boolean(shop.is_active),
        reviewNote: shop.review_note,
        reviewedAt: shop.reviewed_at,
        registeredAt: shop.created_at,
        transactionCount: sales._count.transaction_id,
        totalSales: Number(sales._sum.total_amount || 0),
      },
    });
  } catch (error) {
    return handleError(res, error, 'ไม่สามารถโหลดข้อมูลร้านค้าได้');
  }
}

/** GET /api/v1/merchants/dashboard: today, last 7 days, recent sales */
async function getDashboard(req, res) {
  try {
    const shop = await ownShop(req.user.userId);
    const { dayStart } = bangkokPeriod();
    const weekStart = new Date(dayStart.getTime() - 6 * 86400000);
    const rows = await prisma.transactions.findMany({
      where: { shop_id: shop.shop_id, status: 'COMPLETED', paid_at: { gte: weekStart } },
      select: { transaction_id: true, total_amount: true, user_amount: true, government_amount: true, paid_at: true },
      orderBy: { paid_at: 'desc' },
    });
    const all = await prisma.transactions.aggregate({
      where: { shop_id: shop.shop_id, status: 'COMPLETED' },
      _count: { transaction_id: true },
      _sum: { total_amount: true, user_amount: true, government_amount: true },
    });
    const customers = await prisma.transactions.groupBy({
      by: ['user_id'],
      where: { shop_id: shop.shop_id, status: 'COMPLETED' },
    });

    const days = Array.from({ length: 7 }, (_, i) => ({ date: dayKey(new Date(weekStart.getTime() + i * 86400000)), total: 0, count: 0 }));
    for (const tx of rows) {
      const bucket = days.find((d) => d.date === dayKey(tx.paid_at));
      if (bucket) {
        bucket.total += Number(tx.total_amount);
        bucket.count += 1;
      }
    }
    const today = days[6];
    const bills = await prisma.payment_requests.findMany({ where: { shop_id: shop.shop_id }, orderBy: { request_id: 'desc' }, take: 10 });

    return res.json({
      success: true,
      data: {
        today: { sales: today.total, count: today.count },
        week: { sales: days.reduce((s, d) => s + d.total, 0), count: days.reduce((s, d) => s + d.count, 0) },
        total: {
          sales: Number(all._sum.total_amount || 0),
          count: all._count.transaction_id,
          fromCitizens: Number(all._sum.user_amount || 0),
          fromGovernment: Number(all._sum.government_amount || 0),
          customers: customers.length,
        },
        days,
        recent: rows.slice(0, 8).map((tx) => ({
          transactionId: tx.transaction_id.toString(),
          amount: Number(tx.total_amount),
          paidAt: tx.paid_at,
        })),
        bills: bills.map((b) => formatBill(b)),
      },
    });
  } catch (error) {
    return handleError(res, error, 'โหลดแดชบอร์ดไม่สำเร็จ');
  }
}

/** POST /api/v1/merchants/bills { amount, note } */
async function createBill(req, res) {
  try {
    const shop = await ownShop(req.user.userId);
    if (shop.status !== 'APPROVED' || !shop.is_active) fail('ร้านยังไม่ได้รับอนุมัติ จึงสร้างบิลไม่ได้', 403);
    const amount = money(req.body.amount);
    const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 200) : '';
    // 4 random bytes as hex: short enough to read out, unguessable within a bill's short life.
    const bill = await prisma.payment_requests.create({
      data: {
        code: randomBytes(4).toString('hex').toUpperCase(),
        shop_id: shop.shop_id,
        amount,
        note: note || null,
        expires_at: new Date(Date.now() + BILL_MINUTES * 60000),
      },
    });
    return res.status(201).json({ success: true, data: formatBill(bill) });
  } catch (error) {
    return handleError(res, error, 'สร้างบิลไม่สำเร็จ');
  }
}

/** GET /api/v1/merchants/bills/:id: the bill screen polls this until the citizen has paid */
async function getBill(req, res) {
  try {
    const shop = await ownShop(req.user.userId);
    const bill = await prisma.payment_requests.findFirst({ where: { request_id: BigInt(req.params.id), shop_id: shop.shop_id } });
    if (!bill) fail('ไม่พบบิล', 404);
    return res.json({ success: true, data: formatBill(bill) });
  } catch (error) {
    return handleError(res, error, 'โหลดบิลไม่สำเร็จ');
  }
}

/** POST /api/v1/merchants/bills/:id/cancel */
async function cancelBill(req, res) {
  try {
    const shop = await ownShop(req.user.userId);
    const result = await prisma.payment_requests.updateMany({
      where: { request_id: BigInt(req.params.id), shop_id: shop.shop_id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    if (result.count === 0) fail('ยกเลิกบิลนี้ไม่ได้ (ชำระแล้วหรือถูกยกเลิกไปแล้ว)', 409);
    return res.json({ success: true, message: 'ยกเลิกบิลแล้ว' });
  } catch (error) {
    return handleError(res, error, 'ยกเลิกบิลไม่สำเร็จ');
  }
}

module.exports = { getMyShop, getDashboard, createBill, getBill, cancelBill };
