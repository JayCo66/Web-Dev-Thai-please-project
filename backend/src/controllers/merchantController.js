const prisma = require('../config/prisma');

/**
 * GET /api/v1/merchants/me
 * The signed-in merchant's shop, including whether the government has approved it yet.
 */
async function getMyShop(req, res) {
  try {
    const shop = await prisma.shops.findFirst({
      where: { owner_user_id: BigInt(req.user.userId) },
      orderBy: { shop_id: 'asc' },
    });
    if (!shop) {
      return res.status(404).json({ success: false, error: 'บัญชีนี้ยังไม่มีร้านค้าที่ลงทะเบียน' });
    }

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
    console.error('Error fetching merchant shop:', error);
    return res.status(500).json({ success: false, error: 'ไม่สามารถโหลดข้อมูลร้านค้าได้' });
  }
}

module.exports = { getMyShop };
