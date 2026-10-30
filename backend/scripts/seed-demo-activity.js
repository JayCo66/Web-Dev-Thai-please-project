// Fills a local database with demo citizens who behave differently, so the BI tab has something to analyse.
// Everything goes through the public API (demo-login, pay, donate), so it exercises the same rules as real use.
// Payments are stamped "now" by the server; the script cannot backdate them.
const API = process.env.API_URL || 'http://localhost:5001/api/v1';
const COUNT = Number(process.argv[2]) || 24;

const call = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, ...(await res.json().catch(() => ({}))) };
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const between = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const uid = () => globalThis.crypto.randomUUID();

const PERSONAS = [
  { name: 'กินข้าวนอกบ้านประจำ', weight: 5, payments: [6, 10], food: 0.9, distinct: false, amount: [50, 120], donate: 0.1 },
  { name: 'นักสำรวจร้านใหม่', weight: 4, payments: [5, 8], food: 0.5, distinct: true, amount: [60, 200], donate: 0.3 },
  { name: 'ยอดใหญ่นาน ๆ ครั้ง', weight: 3, payments: [2, 3], food: 0.3, distinct: false, amount: [250, 600], donate: 0.4 },
  { name: 'ใช้บ้างเป็นครั้งคราว', weight: 5, payments: [1, 2], food: 0.6, distinct: false, amount: [40, 100], donate: 0 },
  { name: 'สมัครแล้วไม่ใช้', weight: 3, payments: [0, 0], food: 0, distinct: false, amount: [0, 0], donate: 0 },
];
const weighted = PERSONAS.flatMap((p) => Array(p.weight).fill(p));

async function main() {
  const shops = (await call('/transactions/shops')).data || [];
  if (!shops.length) throw new Error('No approved shops; start the backend and import the seed first');
  const charities = (await call('/charities')).data || [];
  const isFood = (s) => /อาหาร|เครื่องดื่ม/.test(s.category);
  const summary = { users: 0, payments: 0, donations: 0, refused: 0 };

  for (let i = 0; i < COUNT; i++) {
    const persona = pick(weighted);
    const login = await call('/auth/demo-login', { method: 'POST', body: {} });
    const token = login.data?.token;
    if (!token) throw new Error(`demo-login failed: ${login.error}`);
    summary.users += 1;

    const visited = new Set();
    const n = between(...persona.payments);
    for (let k = 0; k < n; k++) {
      const pool = shops.filter((s) => (Math.random() < persona.food ? isFood(s) : !isFood(s)));
      let candidates = pool.length ? pool : shops;
      if (persona.distinct) candidates = candidates.filter((s) => !visited.has(s.shopId)) || candidates;
      const shop = pick(candidates.length ? candidates : shops);
      visited.add(shop.shopId);
      const amount = between(...persona.amount);
      let res = await call('/transactions/pay', { method: 'POST', token, body: { shopId: shop.shopId, amount, requestId: uid() } });
      if (res.status === 400 && /ไม่พอ/.test(res.error || '')) {
        await call('/users/demo-topup', { method: 'POST', token, body: { requestId: uid() } });
        res = await call('/transactions/pay', { method: 'POST', token, body: { shopId: shop.shopId, amount, requestId: uid() } });
      }
      if (res.success) summary.payments += 1;
      else summary.refused += 1;
    }
    if (charities.length && Math.random() < persona.donate) {
      const res = await call('/charities/donate', { method: 'POST', token, body: { charityId: pick(charities).charityId, amount: pick([20, 50, 100]), requestId: uid() } });
      if (res.success) summary.donations += 1;
    }
  }
  console.log(JSON.stringify(summary));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
