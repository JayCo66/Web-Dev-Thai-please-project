// Add sample merchants without changing existing shops or transaction history.
require("dotenv").config({ quiet: true });
const prisma = require("../src/config/prisma");
const shops = require("../prisma/seeds/demo-shops.json");
const { categoryOf, RULES } = require("../src/services/questMetrics");
async function main() {
  let created = 0;
  await prisma.$transaction(async db => {
    for (const shop of shops) {
      const existing = await db.shops.findFirst({ where: { shop_name: shop.name, category: shop.category } });
      if (existing) continue;
      await db.shops.create({ data: { shop_name: shop.name, category: shop.category, address: shop.address, is_active: true } });
      created++;
    }
  }, { timeout: 20000 });
  const active = await prisma.shops.findMany({ where: { is_active: true } });
  const categories = { FOOD: 0, RETAIL: 0, OTHER: 0 };
  active.forEach(shop => categories[categoryOf(shop)]++);
  const quests = await prisma.bingo_quests.findMany({ where: { is_active: true, quest_code: { not: null } } });
  const coverage = quests.filter(q => ["merchants", "new"].includes(RULES[q.quest_code]?.[0])).map(q => {
    const rule = RULES[q.quest_code];
    const available = rule[1] ? categories[rule[1]] : active.length;
    const ladder = typeof q.levels_json === "string" ? JSON.parse(q.levels_json) : q.levels_json;
    const required = Math.max(...ladder);
    return { code: q.quest_code, required, available, covered: available >= required };
  });
  console.log(JSON.stringify({ created, active: active.length, categories, coverage }, null, 2));
  if (coverage.some(q => !q.covered)) throw new Error("Merchant pool does not cover every quest target");
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
