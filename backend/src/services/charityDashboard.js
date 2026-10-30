const TYPES = {
  EDUCATION: "การศึกษา", ENVIRONMENT: "สิ่งแวดล้อม",
  COMMUNITY: "ชุมชน", HEALTHCARE: "สุขภาพ",
};
function buildDonationDashboard(charities, totals, now = new Date()) {
  const byId = new Map(totals.map(row => [String(row.charity_id), row]));
  const groups = Object.entries(TYPES).map(([impactType, label]) => ({ impactType, label, totalCents: 0, donationCount: 0, charityCount: 0, receivingCharityCount: 0, charities: [] }));
  for (const charity of charities) {
    const group = groups.find(g => g.impactType === charity.impact_type);
    if (!group) throw new Error("Unsupported charity category");
    const total = byId.get(String(charity.charity_id));
    const cents = Math.round(Number(total?._sum.amount || 0) * 100);
    const count = total?._count.donation_id || 0;
    group.totalCents += cents; group.donationCount += count; group.charityCount++;
    if (count > 0) group.receivingCharityCount++;
    group.charities.push({ charityId: String(charity.charity_id), name: charity.name, isActive: charity.is_active, totalAmount: cents / 100, donationCount: count });
  }
  const totalCents = groups.reduce((sum, group) => sum + group.totalCents, 0);
  return {
    simulation: true, scope: "ALL_TIME", updatedAt: now.toISOString(),
    summary: { totalAmount: totalCents / 100, donationCount: groups.reduce((sum,g) => sum + g.donationCount, 0), charityCount: charities.length, receivingCharityCount: groups.reduce((sum,g) => sum + g.receivingCharityCount, 0) },
    categories: groups.map(({totalCents: cents, ...group}) => ({ ...group, totalAmount: cents / 100, sharePercent: totalCents ? Math.round(cents / totalCents * 10000) / 100 : 0, charities: group.charities.sort((a,b) => b.totalAmount - a.totalAmount || a.name.localeCompare(b.name, "th")) })),
  };
}
module.exports = { buildDonationDashboard };
