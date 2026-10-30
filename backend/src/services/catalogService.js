const { luckyPrizes, matchesPrize } = require("./rewardCatalog");

async function syncCatalog(db) {
  return db.$transaction(
    async (tx) => {
      // Match previous names and asset identity as well as the current display name.
      // Preserve the oldest reward_id; retire duplicate offers without deleting tickets.
      const rows = await tx.rewards.findMany({
        where: { reward_type: "LUCKY_DRAW" },
        orderBy: { reward_id: "asc" },
      });
      for (const prize of luckyPrizes) {
        const matches = rows.filter((row) => matchesPrize(row, prize));
        const data = {
          name: prize.name,
          image_url: prize.imageUrl,
          description: prize.description,
          is_active: true,
        };
        if (matches.length) {
          await tx.rewards.update({
            where: { reward_id: matches[0].reward_id },
            data,
          });
          if (matches.length > 1)
            await tx.rewards.updateMany({
              where: {
                reward_id: { in: matches.slice(1).map((row) => row.reward_id) },
              },
              data: { is_active: false },
            });
        } else
          await tx.rewards.create({
            data: {
              ...data,
              reward_type: "LUCKY_DRAW",
              token_cost: prize.tokenCost,
            },
          });
      }
      const images = [
        ["คูปองส่วนลด 50 บาท", "/assets/rewards/coupon-50.svg"],
        ["คูปองเครื่องดื่มฟรี 1 แก้ว", "/assets/rewards/coupon-coffee.svg"],
        ["กระเป๋าผ้าลดโลกร้อนรักษ์ชุมชน", "/assets/rewards/tote.jpg"],
      ];
      for (const [name, image_url] of images)
        await tx.rewards.updateMany({ where: { name }, data: { image_url } });
      const mug = {
        name: "แก้วเซรามิก THAI Please",
        reward_type: "PHYSICAL",
        token_cost: 150,
        image_url: "/assets/rewards/mug.jpg",
        description:
          "แก้วเซรามิกของที่ระลึก ภาพประกอบสำหรับโครงงาน ยังไม่มีการจัดส่งสินค้าจริง",
      };
      const existing = await tx.rewards.findFirst({
        where: { name: mug.name },
      });
      if (existing)
        await tx.rewards.update({
          where: { reward_id: existing.reward_id },
          data: { image_url: mug.image_url, description: mug.description },
        });
      else await tx.rewards.create({ data: mug });
      await tx.rewards.updateMany({
        where: {
          name: "สิทธิ์ลุ้นรับรางวัลใหญ่ประจำเดือน",
          reward_type: "LUCKY_DRAW",
        },
        data: { is_active: false },
      });
      return { prizes: luckyPrizes.length, addedSouvenir: mug.name };
    },
    { isolationLevel: "Serializable", timeout: 20000 },
  );
}
module.exports = { syncCatalog };
