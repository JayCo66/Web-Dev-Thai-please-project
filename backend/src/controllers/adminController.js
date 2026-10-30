const prisma = require('../config/prisma');
const { buildAnalytics } = require('../services/adminAnalytics');

/**
 * GET /api/admin/stats
 * Overview numbers for the Government & Admin dashboard
 */
async function getAdminStats(req, res) {
  try {
    const [
      totalUsers,
      roleCounts,
      totalShops,
      activeShops,
      pendingShops,
      totalRewards,
      activeRewards,
      txAggregate,
      donationAggregate,
      redemptionsCount,
    ] = await Promise.all([
      prisma.users.count(),
      prisma.users.groupBy({
        by: ['role'],
        _count: { user_id: true },
      }),
      prisma.shops.count(),
      prisma.shops.count({ where: { is_active: true, status: 'APPROVED' } }),
      prisma.shops.count({ where: { status: 'PENDING' } }),
      prisma.rewards.count(),
      prisma.rewards.count({ where: { is_active: true } }),
      prisma.transactions.aggregate({
        _count: { transaction_id: true },
        _sum: { total_amount: true, government_amount: true },
      }),
      prisma.donations.aggregate({
        _count: { donation_id: true },
        _sum: { amount: true },
      }),
      prisma.reward_redemptions.count(),
    ]);

    const rolesMap = {
      CITIZEN: 0,
      MERCHANT: 0,
      ADMIN: 0,
      GOV_EXECUTIVE: 0,
    };
    roleCounts.forEach((r) => {
      rolesMap[r.role] = r._count.user_id;
    });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          citizens: rolesMap.CITIZEN,
          merchants: rolesMap.MERCHANT,
          admins: rolesMap.ADMIN,
          executives: rolesMap.GOV_EXECUTIVE,
        },
        shops: {
          total: totalShops,
          active: activeShops,
          pending: pendingShops,
          inactive: totalShops - activeShops - pendingShops,
        },
        rewards: {
          total: totalRewards,
          active: activeRewards,
          inactive: totalRewards - activeRewards,
          redemptionsCount,
        },
        financials: {
          transactionCount: txAggregate._count.transaction_id || 0,
          totalVolume: Number(txAggregate._sum.total_amount || 0),
          subsidySpent: Number(txAggregate._sum.government_amount || 0),
          donationCount: donationAggregate._count.donation_id || 0,
          totalDonations: Number(donationAggregate._sum.amount || 0),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลสรุปสถิติภาพรวมได้',
    });
  }
}

/**
 * GET /api/admin/rewards
 * Get all rewards (active & inactive) with redemption stats
 */
async function getAdminRewards(req, res) {
  try {
    const [rewardsList, redemptionCounts] = await Promise.all([
      prisma.rewards.findMany({
        orderBy: [{ is_active: 'desc' }, { reward_id: 'desc' }],
      }),
      prisma.reward_redemptions.groupBy({
        by: ['reward_id'],
        _count: { redemption_id: true },
      }),
    ]);

    const countMap = new Map();
    redemptionCounts.forEach((rc) => {
      if (rc.reward_id != null) {
        countMap.set(rc.reward_id.toString(), rc._count.redemption_id);
      }
    });

    const data = rewardsList.map((r) => ({
      rewardId: r.reward_id.toString(),
      name: r.name,
      description: r.description || '',
      imageUrl: r.image_url || '',
      rewardType: r.reward_type,
      tokenCost: r.token_cost,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      redemptionsCount: countMap.get(r.reward_id.toString()) || 0,
    }));

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching admin rewards:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถโหลดรายการของรางวัลได้',
    });
  }
}

/**
 * POST /api/admin/rewards
 * Create a new reward
 */
async function createAdminReward(req, res) {
  try {
    const { name, description, image_url, reward_type, token_cost, is_active } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุชื่อของรางวัล',
      });
    }

    const validTypes = ['COUPON', 'DISCOUNT', 'PHYSICAL', 'LUCKY_DRAW'];
    const type = (reward_type || 'COUPON').toUpperCase();
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `ประเภทของรางวัลไม่ถูกต้อง (${validTypes.join(', ')})`,
      });
    }

    const cost = parseInt(token_cost, 10);
    if (isNaN(cost) || cost < 1) {
      return res.status(400).json({
        success: false,
        error: 'จำนวนแต้มที่ต้องใช้ต้องเป็นจำนวนเต็มมากกว่าหรือเท่ากับ 1',
      });
    }

    const newReward = await prisma.rewards.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        image_url: image_url ? image_url.trim() : null,
        reward_type: type,
        token_cost: cost,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'เพิ่มของรางวัลใหม่สำเร็จ',
      data: {
        rewardId: newReward.reward_id.toString(),
        name: newReward.name,
        description: newReward.description,
        imageUrl: newReward.image_url,
        rewardType: newReward.reward_type,
        tokenCost: newReward.token_cost,
        isActive: Boolean(newReward.is_active),
        createdAt: newReward.created_at,
      },
    });
  } catch (error) {
    console.error('Error creating reward:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างของรางวัล',
    });
  }
}

/**
 * PUT /api/admin/rewards/:id
 * Update an existing reward
 */
async function updateAdminReward(req, res) {
  try {
    const rewardId = BigInt(req.params.id);
    const existing = await prisma.rewards.findUnique({
      where: { reward_id: rewardId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบของรางวัลที่ต้องการแก้ไข',
      });
    }

    const { name, description, image_url, reward_type, token_cost, is_active } = req.body;

    const data = {};
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, error: 'ชื่อของรางวัลต้องไม่ว่างเปล่า' });
      }
      data.name = name.trim();
    }
    if (description !== undefined) {
      data.description = description ? description.trim() : null;
    }
    if (image_url !== undefined) {
      data.image_url = image_url ? image_url.trim() : null;
    }
    if (reward_type !== undefined) {
      const validTypes = ['COUPON', 'DISCOUNT', 'PHYSICAL', 'LUCKY_DRAW'];
      const type = reward_type.toUpperCase();
      if (!validTypes.includes(type)) {
        return res.status(400).json({ success: false, error: 'ประเภทของรางวัลไม่ถูกต้อง' });
      }
      data.reward_type = type;
    }
    if (token_cost !== undefined) {
      const cost = parseInt(token_cost, 10);
      if (isNaN(cost) || cost < 1) {
        return res.status(400).json({ success: false, error: 'จำนวนแต้มต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป' });
      }
      data.token_cost = cost;
    }
    if (is_active !== undefined) {
      data.is_active = Boolean(is_active);
    }

    const updated = await prisma.rewards.update({
      where: { reward_id: rewardId },
      data,
    });

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลของรางวัลสำเร็จ',
      data: {
        rewardId: updated.reward_id.toString(),
        name: updated.name,
        description: updated.description,
        imageUrl: updated.image_url,
        rewardType: updated.reward_type,
        tokenCost: updated.token_cost,
        isActive: Boolean(updated.is_active),
      },
    });
  } catch (error) {
    console.error('Error updating reward:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการแก้ไขของรางวัล',
    });
  }
}

/**
 * PATCH /api/admin/rewards/:id/toggle
 * Toggle reward active status
 */
async function toggleRewardStatus(req, res) {
  try {
    const rewardId = BigInt(req.params.id);
    const existing = await prisma.rewards.findUnique({
      where: { reward_id: rewardId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบของรางวัล',
      });
    }

    const updated = await prisma.rewards.update({
      where: { reward_id: rewardId },
      data: { is_active: !existing.is_active },
    });

    res.json({
      success: true,
      message: `เปลี่ยนสถานะเป็น ${updated.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} เรียบร้อยแล้ว`,
      data: {
        rewardId: updated.reward_id.toString(),
        isActive: Boolean(updated.is_active),
      },
    });
  } catch (error) {
    console.error('Error toggling reward status:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถเปลี่ยนสถานะของรางวัลได้',
    });
  }
}

/**
 * DELETE /api/admin/rewards/:id
 * Delete or soft-deactivate reward
 */
async function deleteAdminReward(req, res) {
  try {
    const rewardId = BigInt(req.params.id);
    const existing = await prisma.rewards.findUnique({
      where: { reward_id: rewardId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบของรางวัลที่ต้องการลบ',
      });
    }

    // Check if redemptions exist
    const redemptionsCount = await prisma.reward_redemptions.count({
      where: { reward_id: rewardId },
    });

    if (redemptionsCount > 0) {
      // Soft-delete to preserve user transaction & audit history
      await prisma.rewards.update({
        where: { reward_id: rewardId },
        data: { is_active: false },
      });

      return res.json({
        success: true,
        message: 'รางวัลนี้มีประวัติการแลกแล้ว ระบบได้เปลี่ยนสถานะเป็น "ปิดใช้งาน" ให้เพื่อคงประวัติการแลกไว้',
        softDeleted: true,
      });
    }

    // Hard delete if never redeemed
    await prisma.rewards.delete({
      where: { reward_id: rewardId },
    });

    res.json({
      success: true,
      message: 'ลบของรางวัลเรียบร้อยแล้ว',
      softDeleted: false,
    });
  } catch (error) {
    console.error('Error deleting reward:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบของรางวัล',
    });
  }
}

/**
 * GET /api/admin/users
 * List all users with wallet balance, tokens, and role stats
 */
async function getAdminUsers(req, res) {
  try {
    const { search, role } = req.query;

    const where = {};
    if (role && ['CITIZEN', 'MERCHANT', 'ADMIN', 'GOV_EXECUTIVE'].includes(role.toUpperCase())) {
      where.role = role.toUpperCase();
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone_number: { contains: q } },
      ];
    }

    const [usersList, tokensByUserId, txCountsByUserId, donationCountsByUserId, shopsList] =
      await Promise.all([
        prisma.users.findMany({
          where,
          orderBy: { user_id: 'desc' },
          select: {
            user_id: true,
            name: true,
            email: true,
            phone_number: true,
            role: true,
            province_code: true,
            demo_balance: true,
            created_at: true,
          },
        }),
        prisma.token_transactions.groupBy({
          by: ['user_id'],
          _sum: { amount: true },
        }),
        prisma.transactions.groupBy({
          by: ['user_id'],
          _count: { transaction_id: true },
        }),
        prisma.donations.groupBy({
          by: ['user_id'],
          _count: { donation_id: true },
        }),
        prisma.shops.findMany({
          select: {
            shop_id: true,
            shop_name: true,
            owner_user_id: true,
          },
        }),
      ]);

    const tokenMap = new Map();
    tokensByUserId.forEach((t) => {
      tokenMap.set(t.user_id.toString(), t._sum.amount || 0);
    });

    const txMap = new Map();
    txCountsByUserId.forEach((tx) => {
      txMap.set(tx.user_id.toString(), tx._count.transaction_id || 0);
    });

    const donMap = new Map();
    donationCountsByUserId.forEach((d) => {
      donMap.set(d.user_id.toString(), d._count.donation_id || 0);
    });

    const shopMap = new Map();
    shopsList.forEach((s) => {
      if (s.owner_user_id) {
        shopMap.set(s.owner_user_id.toString(), s.shop_name);
      }
    });

    const data = usersList.map((u) => {
      const uid = u.user_id.toString();
      return {
        userId: uid,
        name: u.name,
        email: u.email || '-',
        phoneNumber: u.phone_number || '-',
        role: u.role,
        provinceCode: u.province_code || 'BKK',
        demoBalance: Number(u.demo_balance || 0),
        tokenBalance: tokenMap.get(uid) || 0,
        transactionCount: txMap.get(uid) || 0,
        donationCount: donMap.get(uid) || 0,
        shopName: shopMap.get(uid) || null,
        createdAt: u.created_at,
      };
    });

    res.json({
      success: true,
      total: data.length,
      data,
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถโหลดรายชื่อผู้ใช้งานได้',
    });
  }
}

/**
 * GET /api/admin/shops
 * List all shops with owner details, sales volume, and transaction count
 */
async function getAdminShops(req, res) {
  try {
    const { search, category, status } = req.query;

    const where = {};
    if (category && category.trim()) {
      where.category = category.trim();
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { shop_name: { contains: q } },
        { address: { contains: q } },
      ];
    }
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    const [shopsList, txStatsByShop] = await Promise.all([
      prisma.shops.findMany({
        where,
        orderBy: [{ status: 'asc' }, { is_active: 'desc' }, { shop_id: 'desc' }],
        include: {
          users: {
            select: {
              user_id: true,
              name: true,
              email: true,
              phone_number: true,
            },
          },
        },
      }),
      prisma.transactions.groupBy({
        by: ['shop_id'],
        _count: { transaction_id: true },
        _sum: { total_amount: true, government_amount: true },
      }),
    ]);

    const txMap = new Map();
    txStatsByShop.forEach((tx) => {
      txMap.set(tx.shop_id.toString(), {
        count: tx._count.transaction_id || 0,
        sales: Number(tx._sum.total_amount || 0),
        subsidy: Number(tx._sum.government_amount || 0),
      });
    });

    const data = shopsList.map((s) => {
      const sid = s.shop_id.toString();
      const stats = txMap.get(sid) || { count: 0, sales: 0, subsidy: 0 };
      return {
        shopId: sid,
        shopName: s.shop_name,
        category: s.category,
        address: s.address || '-',
        isActive: Boolean(s.is_active),
        status: s.status,
        reviewNote: s.review_note,
        reviewedAt: s.reviewed_at,
        createdAt: s.created_at,
        owner: s.users
          ? {
              userId: s.users.user_id.toString(),
              name: s.users.name,
              email: s.users.email || '-',
              phoneNumber: s.users.phone_number || '-',
            }
          : null,
        transactionCount: stats.count,
        totalSales: stats.sales,
        governmentSubsidy: stats.subsidy,
      };
    });

    res.json({
      success: true,
      total: data.length,
      data,
    });
  } catch (error) {
    console.error('Error fetching admin shops:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถโหลดรายชื่อร้านค้าได้',
    });
  }
}

/**
 * PATCH /api/admin/shops/:id/toggle
 * Toggle shop active/inactive
 */
async function toggleShopStatus(req, res) {
  try {
    const shopId = BigInt(req.params.id);
    const existing = await prisma.shops.findUnique({
      where: { shop_id: shopId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบร้านค้าที่ต้องการเปลี่ยนสถานะ',
      });
    }

    const updated = await prisma.shops.update({
      where: { shop_id: shopId },
      data: { is_active: !existing.is_active },
    });

    res.json({
      success: true,
      message: `ร้าน "${updated.shop_name}" เปลี่ยนสถานะเป็น ${updated.is_active ? 'เปิดให้บริการ' : 'ระงับชั่วคราว'} เรียบร้อยแล้ว`,
      data: {
        shopId: updated.shop_id.toString(),
        isActive: Boolean(updated.is_active),
      },
    });
  } catch (error) {
    console.error('Error toggling shop status:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะร้านค้า',
    });
  }
}

/**
 * POST /api/admin/shops/:id/review
 * Government decision on a registered shop: { decision: 'APPROVE' | 'REJECT', note }
 * Only a PENDING shop can be decided, so a double click or two officers cannot overwrite each other.
 */
async function reviewShop(req, res) {
  try {
    const shopId = BigInt(req.params.id);
    const decision = String(req.body.decision || '').toUpperCase();
    const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 255) : '';

    if (!['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({ success: false, error: 'คำสั่งไม่ถูกต้อง (APPROVE หรือ REJECT)' });
    }
    if (decision === 'REJECT' && !note) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ เพื่อให้ร้านค้าทราบ' });
    }

    const result = await prisma.shops.updateMany({
      where: { shop_id: shopId, status: 'PENDING' },
      data: {
        status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        review_note: note || null,
        reviewed_at: new Date(),
        reviewed_by: BigInt(req.user.userId),
      },
    });

    if (result.count === 0) {
      const exists = await prisma.shops.findUnique({ where: { shop_id: shopId }, select: { shop_name: true, status: true } });
      return res.status(exists ? 409 : 404).json({
        success: false,
        error: exists ? 'ร้านนี้ถูกพิจารณาไปแล้ว' : 'ไม่พบร้านค้า',
      });
    }

    const shop = await prisma.shops.findUnique({ where: { shop_id: shopId } });
    return res.json({
      success: true,
      message: `${decision === 'APPROVE' ? 'อนุมัติ' : 'ไม่อนุมัติ'}ร้าน "${shop.shop_name}" เรียบร้อยแล้ว`,
      data: { shopId: shop.shop_id.toString(), status: shop.status },
    });
  } catch (error) {
    console.error('Error reviewing shop:', error);
    return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการพิจารณาร้านค้า' });
  }
}

/**
 * GET /api/admin/analytics
 * Read-only BI numbers: quest success rates, spending patterns, user funnel, tokens, donations.
 */
async function getAdminAnalytics(req, res) {
  try {
    const [boards, quests, transactions, donations, tokenGroups, redemptions, citizens, shopGroups] = await Promise.all([
      prisma.bingo_boards.findMany({ select: { user_id: true, snapshot: true } }),
      prisma.bingo_quests.findMany({ select: { quest_code: true, title: true } }),
      prisma.transactions.findMany({
        where: { status: 'COMPLETED' },
        select: { user_id: true, shop_id: true, total_amount: true, paid_at: true, shops: { select: { category: true, shop_name: true } } },
      }),
      prisma.donations.findMany({ select: { user_id: true, amount: true, charities: { select: { impact_type: true } } } }),
      tokenTotals(),
      prisma.reward_redemptions.findMany({ select: { user_id: true } }),
      prisma.users.count({ where: { role: 'CITIZEN' } }),
      prisma.shops.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    // Titles carry {n} for the target; in a report it reads better as N.
    const questTitles = new Map(quests.filter((q) => q.quest_code).map((q) => [q.quest_code, q.title.replace('{n}', 'N')]));
    const data = buildAnalytics({
      boards,
      questTitles,
      transactions,
      donations,
      tokenGroups,
      redemptions,
      citizens,
      shopStatuses: Object.fromEntries(shopGroups.map((g) => [g.status, g._count._all])),
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error building admin analytics:', error);
    res.status(500).json({ success: false, error: 'ไม่สามารถสร้างข้อมูลวิเคราะห์ได้' });
  }
}

// Earned (positive) and spent (negative) token amounts per type.
async function tokenTotals() {
  const [earned, spent] = await Promise.all([
    prisma.token_transactions.groupBy({ by: ['type'], where: { amount: { gt: 0 } }, _sum: { amount: true } }),
    prisma.token_transactions.groupBy({ by: ['type'], where: { amount: { lt: 0 } }, _sum: { amount: true } }),
  ]);
  return [...earned, ...spent].map((g) => ({ type: g.type, amount: g._sum.amount || 0 }));
}

module.exports = {
  getAdminAnalytics,
  getAdminStats,
  getAdminRewards,
  createAdminReward,
  updateAdminReward,
  toggleRewardStatus,
  deleteAdminReward,
  getAdminUsers,
  getAdminShops,
  toggleShopStatus,
  reviewShop,
};

