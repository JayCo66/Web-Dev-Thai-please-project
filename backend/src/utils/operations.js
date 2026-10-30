const { randomUUID } = require("node:crypto");

function fail(message, statusCode = 400) {
  throw Object.assign(new Error(message), { statusCode });
}
function money(value) {
  const amount = Number(value);
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 100000 ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001
  ) {
    fail("ระบุจำนวนเงิน 0.01–100,000 บาท และทศนิยมไม่เกิน 2 ตำแหน่ง");
  }
  return Math.round(amount * 100) / 100;
}
function positiveId(value) {
  if (!/^\d+$/.test(String(value)) || BigInt(value) <= 0n)
    fail("ไม่พบรายการที่เลือก");
  return BigInt(value);
}
function requestKey(req, operation) {
  const id = req.body?.requestId || req.headers?.["idempotency-key"];
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{16,80}$/.test(id))
    fail("กรุณาลองทำรายการใหม่");
  return `${operation}:${req.user.userId}:${id}`;
}
async function lockUser(tx, userId) {
  await tx.$queryRaw`SELECT user_id FROM users WHERE user_id = ${BigInt(userId)} FOR UPDATE`;
  const user = await tx.users.findUnique({
    where: { user_id: BigInt(userId) },
  });
  if (!user) fail("ไม่พบบัญชีผู้ใช้", 404);
  return user;
}
function bangkokPeriod(now = new Date()) {
  const local = new Date(now.getTime() + 7 * 3600000).toISOString();
  return {
    month: local.slice(0, 7),
    dayStart: new Date(`${local.slice(0, 10)}T00:00:00+07:00`),
    monthStart: new Date(`${local.slice(0, 7)}-01T00:00:00+07:00`),
  };
}
function demoOnly() {
  if (process.env.DEMO_MODE === "false")
    fail("ระบบยังไม่เปิดการทำรายการเงินจริง", 503);
}
function handleError(res, error, fallback) {
  if (!error.statusCode) console.error(fallback, error.code || error.message);
  return res
    .status(error.statusCode || 500)
    .json({
      success: false,
      error: error.statusCode ? error.message : fallback,
    });
}
module.exports = {
  fail,
  money,
  positiveId,
  requestKey,
  lockUser,
  bangkokPeriod,
  demoOnly,
  handleError,
  randomUUID,
};
