// Pure analytics for the government BI tab: rows in, numbers out. No database access, so it is unit tested.

const FAMILIES = ['ACTIVITY', 'VARIETY', 'TIME', 'SPEND'];
const FAMILY_LABELS = { ACTIVITY: 'ความสม่ำเสมอ', VARIETY: 'ความหลากหลายของร้าน', TIME: 'ช่วงเวลา/วัน', SPEND: 'ยอดใช้จ่าย' };
const HOUR_BANDS = [
  { key: 'morning', label: 'เช้า 05–10', from: 5, to: 10 },
  { key: 'lunch', label: 'กลางวัน 11–13', from: 11, to: 13 },
  { key: 'afternoon', label: 'บ่าย 14–18', from: 14, to: 18 },
  { key: 'evening', label: 'ค่ำ 19–23', from: 19, to: 23 },
  { key: 'night', label: 'ดึก 00–04', from: 0, to: 4 },
];
// Below this many offered cells a rate is noise, so it is shown but never named as a finding.
const MIN_SAMPLE = 5;

const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;
const pct = (part, whole) => (whole > 0 ? round((part / whole) * 100) : 0);
const thaiParts = (value) => {
  const shifted = new Date(new Date(value).getTime() + 7 * 3600000);
  return { hour: shifted.getUTCHours(), day: shifted.toISOString().slice(0, 10) };
};

function parseSnapshot(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function analyzeQuests(boards, questTitles) {
  const byQuest = new Map();
  const byFamily = Object.fromEntries(FAMILIES.map((f) => [f, { offered: 0, completed: 0 }]));
  const byLevel = { 1: { offered: 0, completed: 0 }, 2: { offered: 0, completed: 0 }, 3: { offered: 0, completed: 0 } };
  const source = {};
  let cellsTotal = 0;
  let cellsDone = 0;
  let boardsWithSnapshot = 0;

  for (const board of boards) {
    const snapshot = parseSnapshot(board.snapshot);
    if (!snapshot?.cells) continue;
    boardsWithSnapshot += 1;
    const key = snapshot.source || 'UNKNOWN';
    source[key] = (source[key] || 0) + 1;

    for (const cell of snapshot.cells) {
      // The centre donation cell is not a spending quest; it is reported under donations instead.
      if (cell.family === 'DONATION' || !cell.quest_code) continue;
      const done = cell.status === 'COMPLETED' || cell.status === 'CLAIMED';
      cellsTotal += 1;
      if (done) cellsDone += 1;

      const entry = byQuest.get(cell.quest_code) || {
        questCode: cell.quest_code,
        family: cell.family,
        offered: 0,
        completed: 0,
        levelSum: 0,
        progressSum: 0,
        users: new Set(),
      };
      entry.offered += 1;
      if (done) entry.completed += 1;
      entry.levelSum += cell.level || 0;
      entry.progressSum += Math.min(1, (cell.progress || 0) / (cell.target_value || 1));
      entry.users.add(String(board.user_id));
      byQuest.set(cell.quest_code, entry);

      if (byFamily[cell.family]) {
        byFamily[cell.family].offered += 1;
        if (done) byFamily[cell.family].completed += 1;
      }
      if (byLevel[cell.level]) {
        byLevel[cell.level].offered += 1;
        if (done) byLevel[cell.level].completed += 1;
      }
    }
  }

  const quests = [...byQuest.values()]
    .map((q) => ({
      questCode: q.questCode,
      title: questTitles.get(q.questCode) || q.questCode,
      family: q.family,
      offered: q.offered,
      completed: q.completed,
      rate: pct(q.completed, q.offered),
      avgLevel: round(q.levelSum / q.offered),
      avgProgress: pct(q.progressSum, q.offered),
      users: q.users.size,
      reliable: q.offered >= MIN_SAMPLE,
    }))
    .sort((a, b) => b.rate - a.rate || b.offered - a.offered);

  return {
    quests,
    families: FAMILIES.map((f) => ({ family: f, label: FAMILY_LABELS[f], ...byFamily[f], rate: pct(byFamily[f].completed, byFamily[f].offered) })),
    levels: [1, 2, 3].map((l) => ({ level: l, ...byLevel[l], rate: pct(byLevel[l].completed, byLevel[l].offered) })),
    boards: { count: boardsWithSnapshot, source, cellsTotal, cellsDone, completionRate: pct(cellsDone, cellsTotal), avgCellsDonePerBoard: round(boardsWithSnapshot ? cellsDone / boardsWithSnapshot : 0) },
  };
}

function analyzeSpending(transactions, days = 14, now = new Date()) {
  const byCategory = new Map();
  const byHour = HOUR_BANDS.map((b) => ({ ...b, count: 0, total: 0 }));
  const perUser = new Map();
  const perShop = new Map();
  const daily = new Map();

  for (const tx of transactions) {
    const amount = Number(tx.total_amount);
    const { hour, day } = thaiParts(tx.paid_at);
    const category = tx.shops?.category || 'ไม่ระบุ';

    const cat = byCategory.get(category) || { category, count: 0, total: 0 };
    cat.count += 1;
    cat.total += amount;
    byCategory.set(category, cat);

    const band = byHour.find((b) => hour >= b.from && hour <= b.to);
    if (band) {
      band.count += 1;
      band.total += amount;
    }

    perUser.set(String(tx.user_id), (perUser.get(String(tx.user_id)) || 0) + 1);

    const shop = perShop.get(String(tx.shop_id)) || { name: tx.shops?.shop_name || '-', category, count: 0, total: 0, customers: new Set() };
    shop.count += 1;
    shop.total += amount;
    shop.customers.add(String(tx.user_id));
    perShop.set(String(tx.shop_id), shop);

    const d = daily.get(day) || { date: day, count: 0, total: 0 };
    d.count += 1;
    d.total += amount;
    daily.set(day, d);
  }

  const today = thaiParts(now).day;
  const trend = Array.from({ length: days }, (_, i) => {
    const date = new Date(new Date(`${today}T00:00:00Z`).getTime() - (days - 1 - i) * 86400000).toISOString().slice(0, 10);
    const d = daily.get(date);
    return { date, count: d?.count || 0, total: round(d?.total || 0, 2) };
  });

  const payers = perUser.size;
  const repeat = [...perUser.values()].filter((n) => n >= 2).length;
  const total = transactions.reduce((s, t) => s + Number(t.total_amount), 0);

  return {
    summary: { count: transactions.length, total: round(total, 2), average: round(transactions.length ? total / transactions.length : 0, 2), payers, repeatPayers: repeat, repeatRate: pct(repeat, payers) },
    categories: [...byCategory.values()].map((c) => ({ ...c, total: round(c.total, 2), share: pct(c.total, total) })).sort((a, b) => b.total - a.total),
    hours: byHour.map((b) => ({ key: b.key, label: b.label, count: b.count, total: round(b.total, 2) })),
    trend,
    topShops: [...perShop.values()].map((s) => ({ name: s.name, category: s.category, count: s.count, total: round(s.total, 2), customers: s.customers.size })).sort((a, b) => b.total - a.total).slice(0, 5),
  };
}

function buildInsights({ quests, spending, funnel }) {
  const insights = [];
  const reliable = quests.quests.filter((q) => q.reliable);
  if (reliable.length >= 2) {
    const best = reliable[0];
    const worst = reliable[reliable.length - 1];
    insights.push({ tone: 'good', text: `ภารกิจที่สำเร็จมากสุด: "${best.title}" ${best.rate}% (จาก ${best.offered} ช่อง)` });
    if (worst.rate < best.rate) insights.push({ tone: 'warn', text: `ภารกิจที่สำเร็จน้อยสุด: "${worst.title}" ${worst.rate}% (จาก ${worst.offered} ช่อง) ควรทบทวนเป้าหมายหรือระดับความยาก` });
  } else {
    insights.push({ tone: 'info', text: `ยังมีข้อมูลน้อยเกินสรุปรายภารกิจ (ต้องมีอย่างน้อย ${MIN_SAMPLE} ช่องต่อภารกิจ)` });
  }
  const families = quests.families.filter((f) => f.offered >= MIN_SAMPLE);
  if (families.length >= 2) {
    const sorted = [...families].sort((a, b) => a.rate - b.rate);
    insights.push({ tone: 'info', text: `กลุ่มภารกิจที่ผู้ใช้ทำได้ยากที่สุดคือ "${sorted[0].label}" (${sorted[0].rate}%) ง่ายที่สุดคือ "${sorted[sorted.length - 1].label}" (${sorted[sorted.length - 1].rate}%)` });
  }
  const peak = [...spending.hours].sort((a, b) => b.count - a.count)[0];
  if (peak?.count > 0) insights.push({ tone: 'info', text: `ช่วงที่มีการจ่ายมากสุดคือ ${peak.label} (${peak.count} รายการ) เหมาะกับการตั้งภารกิจตามช่วงเวลา` });
  if (spending.summary.payers > 0) insights.push({ tone: spending.summary.repeatRate >= 50 ? 'good' : 'warn', text: `ผู้ใช้ที่จ่ายซ้ำตั้งแต่ 2 ครั้งขึ้นไป ${spending.summary.repeatRate}% ของผู้ที่เคยจ่าย` });
  const stage = funnel.find((f, i) => i > 0 && f.percentOfPrevious < 50);
  if (stage) insights.push({ tone: 'warn', text: `จุดที่ผู้ใช้หลุดมากสุดในเส้นทาง: "${stage.label}" เหลือ ${stage.percentOfPrevious}% จากขั้นก่อนหน้า` });
  return insights;
}

function buildFunnel({ citizens, payers, repeatPayers, completers, donors, redeemers }) {
  const steps = [
    ['ลงทะเบียนประชาชน', citizens],
    ['เคยจ่ายเงินอย่างน้อย 1 ครั้ง', payers],
    ['ทำภารกิจสำเร็จอย่างน้อย 1 ช่อง', completers],
    ['จ่ายซ้ำ 2 ครั้งขึ้นไป', repeatPayers],
    ['เคยบริจาค', donors],
    ['เคยแลกรางวัล', redeemers],
  ];
  return steps.map(([label, count], i) => ({
    label,
    count,
    percentOfTotal: pct(count, citizens),
    percentOfPrevious: i === 0 ? 100 : pct(count, steps[i - 1][1]),
  }));
}

function buildAnalytics({ boards, questTitles, transactions, donations, tokenGroups, redemptions, citizens, shopStatuses, now = new Date() }) {
  const quests = analyzeQuests(boards, questTitles);
  const spending = analyzeSpending(transactions, 14, now);

  // A funnel only means something if each step is a subset of the one before, so every step intersects with the last.
  const paymentsPerUser = new Map();
  for (const tx of transactions) paymentsPerUser.set(String(tx.user_id), (paymentsPerUser.get(String(tx.user_id)) || 0) + 1);
  const payers = new Set(paymentsPerUser.keys());
  const completers = new Set();
  for (const board of boards) {
    const snapshot = parseSnapshot(board.snapshot);
    if (snapshot?.cells?.some((c) => c.family !== 'DONATION' && (c.status === 'COMPLETED' || c.status === 'CLAIMED'))) completers.add(String(board.user_id));
  }
  const within = (previous, ids) => new Set([...ids].filter((id) => previous.has(id)));
  const completedFromPayers = within(payers, completers);
  const repeatFromCompleted = within(completedFromPayers, [...paymentsPerUser].filter(([, n]) => n >= 2).map(([id]) => id));
  const donorsFromRepeat = within(repeatFromCompleted, donations.map((d) => String(d.user_id)));
  const redeemersFromDonors = within(donorsFromRepeat, redemptions.map((r) => String(r.user_id)));

  const funnel = buildFunnel({ citizens, payers: payers.size, completers: completedFromPayers.size, repeatPayers: repeatFromCompleted.size, donors: donorsFromRepeat.size, redeemers: redeemersFromDonors.size });

  const byImpact = new Map();
  for (const d of donations) {
    const key = d.charities?.impact_type || 'OTHER';
    const e = byImpact.get(key) || { impactType: key, count: 0, total: 0 };
    e.count += 1;
    e.total += Number(d.amount);
    byImpact.set(key, e);
  }

  const issued = tokenGroups.filter((g) => g.amount > 0).reduce((s, g) => s + g.amount, 0);
  const spent = Math.abs(tokenGroups.filter((g) => g.amount < 0).reduce((s, g) => s + g.amount, 0));

  return {
    generatedAt: now.toISOString(),
    quests,
    spending,
    funnel,
    donations: { count: donations.length, total: round(donations.reduce((s, d) => s + Number(d.amount), 0), 2), byImpact: [...byImpact.values()].map((e) => ({ ...e, total: round(e.total, 2) })).sort((a, b) => b.total - a.total) },
    tokens: { issued, spent, outstanding: issued - spent, byType: tokenGroups.map((g) => ({ type: g.type, amount: g.amount })), redemptionRate: pct(spent, issued) },
    shops: shopStatuses,
    insights: buildInsights({ quests, spending, funnel }),
  };
}

module.exports = { MIN_SAMPLE, analyzeQuests, analyzeSpending, buildFunnel, buildAnalytics };
