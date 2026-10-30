async function syncCatalog(db) {
  const existing = [
    ["คูปองส่วนลด 50 บาท", "/assets/rewards/coupon-50.svg"],
    ["คูปองเครื่องดื่มฟรี 1 แก้ว", "/assets/rewards/coupon-coffee.svg"],
    ["กระเป๋าผ้าลดโลกร้อนรักษ์ชุมชน", "/assets/rewards/tote.jpg"],
  ];
  for (const [name, image_url] of existing)
    await db.rewards.updateMany({ where: { name }, data: { image_url } });
  // Rename the catalog entry in place so existing tickets keep their reward_id.
  const renames = [
    ["ทองคำแท่ง", "ทองคำแท่ง 1 บาท"],
    ["iPhone 18 Pro", "iPhone 18 Pro 256GB"],
    ["รถจักรยานยนต์ Honda Scoopy", "Honda Wave 125i สตาร์ทมือ ล้อซี่ลวด"],
  ];
  for (const [oldName, name] of renames) {
    const current = await db.rewards.findFirst({ where: { name } });
    const old = await db.rewards.findFirst({ where: { name: oldName } });
    if (old && !current)
      await db.rewards.update({
        where: { reward_id: old.reward_id },
        data: { name },
      });
    else if (old && current)
      await db.rewards.update({
        where: { reward_id: old.reward_id },
        data: { is_active: false },
      });
  }
  const additions = [
    {
      name: "ทองคำแท่ง 1 บาท",
      reward_type: "LUCKY_DRAW",
      token_cost: 25,
      image_url: "/assets/rewards/gold.jpg",
      description:
        "สะสมสิทธิ์ลุ้นทองคำแท่งน้ำหนัก 1 บาท ภาพประกอบรางวัลสาธิต ยังไม่มีการจับรางวัลหรือส่งมอบเงินจริง",
    },
    {
      name: "iPhone 18 Pro 256GB",
      reward_type: "LUCKY_DRAW",
      token_cost: 25,
      image_url: "/assets/rewards/iphone18pro.jpg",
      description:
        "สะสมสิทธิ์ลุ้น iPhone 18 Pro ความจุ 256GB ใช้ภาพผลิตภัณฑ์จาก Apple ประกอบโครงงาน ไม่ใช่แคมเปญของ Apple",
    },
    {
      name: "Honda Wave 125i สตาร์ทมือ ล้อซี่ลวด",
      reward_type: "LUCKY_DRAW",
      token_cost: 25,
      image_url: "/assets/rewards/wave125i.png",
      description:
        "สะสมสิทธิ์ลุ้นรถจักรยานยนต์ ภาพ Honda Wave 125i ใช้ประกอบการสาธิต ไม่มีความร่วมมือกับผู้ผลิต",
    },
    {
      name: "แก้วเซรามิก THAI Please",
      reward_type: "PHYSICAL",
      token_cost: 150,
      image_url: "/assets/rewards/mug.jpg",
      description:
        "แก้วเซรามิกของที่ระลึก ภาพประกอบสำหรับโครงงาน ยังไม่มีการจัดส่งสินค้าจริง",
    },
  ];
  for (const data of additions) {
    const row = await db.rewards.findFirst({ where: { name: data.name } });
    if (row)
      await db.rewards.update({
        where: { reward_id: row.reward_id },
        data: { image_url: data.image_url, description: data.description },
      });
    else await db.rewards.create({ data });
  }
  await db.rewards.updateMany({
    where: {
      name: "สิทธิ์ลุ้นรับรางวัลใหญ่ประจำเดือน",
      reward_type: "LUCKY_DRAW",
    },
    data: { is_active: false },
  });
  return { prizes: 3, addedSouvenir: "แก้วเซรามิก THAI Please" };
}
module.exports = { syncCatalog };
