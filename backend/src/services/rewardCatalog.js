// Edit display names, reference prices and images here. Keep key and legacy aliases.
const luckyPrizes = [
  {
    key: "gold-one-baht",
    name: "ทองคำแท่ง 1 บาท",
    referenceValue: 63800,
    tokenCost: 25,
    imageUrl: "/assets/rewards/gold.jpg",
    legacyNames: ["ทองคำแท่ง"],
    legacyImages: [],
    description:
      "สะสมสิทธิ์ลุ้นทองคำแท่งน้ำหนัก 1 บาท ภาพประกอบรางวัลสาธิต ยังไม่มีการจับรางวัลหรือส่งมอบเงินจริง",
  },
  {
    key: "iphone18pro-256gb",
    name: "iPhone 18 Pro 256GB",
    referenceValue: 48900,
    tokenCost: 25,
    imageUrl: "/assets/rewards/iphone18pro.jpg",
    legacyNames: ["iPhone 18 Pro"],
    legacyImages: [],
    description:
      "สะสมสิทธิ์ลุ้น iPhone 18 Pro ความจุ 256GB ใช้ภาพผลิตภัณฑ์จาก Apple ประกอบโครงงาน ไม่ใช่แคมเปญของ Apple",
  },
  {
    key: "wave125i",
    name: "Honda Wave 125i",
    referenceValue: 58000,
    tokenCost: 25,
    imageUrl: "/assets/rewards/wave125i.png",
    legacyNames: [
      "รถจักรยานยนต์ Honda Scoopy",
      "Honda Wave 125i สตาร์ทมือ ล้อซี่ลวด",
      "Honda Wave 125i",
    ],
    legacyImages: ["/assets/rewards/motorcycle.png"],
    description:
      "สะสมสิทธิ์ลุ้นรถจักรยานยนต์ ภาพ Honda Wave 125i ใช้ประกอบการสาธิต ไม่มีความร่วมมือกับผู้ผลิต",
  },
];
const normalizeName = (name) =>
  String(name || "")
    .trim()
    .replace(/\s+/g, " ");
function matchesPrize(row, prize) {
  if (row.reward_type !== "LUCKY_DRAW") return false;
  return (
    [prize.name, ...prize.legacyNames].some(
      (name) => normalizeName(name) === normalizeName(row.name),
    ) || [prize.imageUrl, ...prize.legacyImages].includes(row.image_url)
  );
}
function prizeReference(row) {
  const prize = luckyPrizes.find((p) => matchesPrize(row, p));
  return {
    prizeKey: prize?.key || null,
    prizeValue: prize?.referenceValue ?? null,
    prizeValueBasis: "OWNER_REFERENCE",
    currency: "THB",
  };
}
module.exports = { luckyPrizes, matchesPrize, prizeReference };
