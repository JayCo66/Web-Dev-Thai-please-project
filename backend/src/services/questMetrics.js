const DAY = 86400000;
const THAI_OFFSET = 7 * 3600000;

function thaiDateParts(value) {
  const date = new Date(value);
  const shifted = new Date(date.getTime() + THAI_OFFSET);
  return {
    date: shifted.toISOString().slice(0, 10),
    hour: shifted.getUTCHours(),
    day: shifted.getUTCDay(),
  };
}

function monthKey(now = new Date()) {
  return thaiDateParts(now).date.slice(0, 7);
}

function categoryOf(tx) {
  const category = String(
    tx.shops?.category || tx.category || "",
  ).toLowerCase();
  if (/food|อาหาร|เครื่องดื่ม|คาเฟ่|cafe|coffee|drink/.test(category))
    return "FOOD";
  if (
    /retail|goods|สินค้|ของใช้|เสื้อผ้า|ทั่วไป|grocery|market|ร้านค้า/.test(
      category,
    )
  )
    return "RETAIL";
  return "OTHER";
}

const RULES = {
  TX_COUNT_ANY: ["count"],
  STREAK_DAYS_ANY: ["streak"],
  REPEAT_MERCHANT_ANY: ["repeat"],
  REPEAT_MERCHANT_FD: ["repeat", "FOOD"],
  REPEAT_MERCHANT_GD: ["repeat", "RETAIL"],
  REPEAT_MERCHANT_WEEKEND: ["repeat", null, "weekend"],
  DISTINCT_MERCHANTS_ANY: ["merchants"],
  DISTINCT_MERCHANTS_FD: ["merchants", "FOOD"],
  DISTINCT_MERCHANTS_GD: ["merchants", "RETAIL"],
  NEW_MERCHANTS_ANY: ["new"],
  CATEGORY_COUNT_FD: ["count", "FOOD"],
  CATEGORY_COUNT_GD: ["count", "RETAIL"],
  CATEGORY_DAYS_FD: ["days", "FOOD"],
  CATEGORY_DAYS_GD: ["days", "RETAIL"],
  DAYPART_MORNING: ["count", null, "morning"],
  DAYPART_LUNCH: ["count", null, "lunch"],
  DAYPART_AFTERNOON: ["count", null, "afternoon"],
  WEEKEND_COUNT: ["count", null, "weekend"],
  WEEKDAY_COUNT: ["count", null, "weekday"],
  FRIDAY_COUNT: ["count", null, "friday"],
  FD_MORNING: ["count", "FOOD", "morning"],
  FD_LUNCH: ["count", "FOOD", "lunch"],
  FD_AFTERNOON: ["count", "FOOD", "afternoon"],
  GD_WEEKDAY: ["count", "RETAIL", "weekday"],
  SPEND_TOTAL_ANY: ["spend"],
  SPEND_TOTAL_FD: ["spend", "FOOD"],
  SPEND_TOTAL_GD: ["spend", "RETAIL"],
  SINGLE_TICKET_ANY: ["ticket"],
  SINGLE_TICKET_FD: ["ticket", "FOOD"],
  SINGLE_TICKET_GD: ["ticket", "RETAIL"],
  SPEND_SINGLE_MERCHANT: ["merchantSpend"],
};

function inTime(parts, filter) {
  if (!filter) return true;
  if (filter === "morning") return parts.hour >= 5 && parts.hour < 11;
  if (filter === "lunch") return parts.hour >= 11 && parts.hour < 14;
  if (filter === "afternoon") return parts.hour >= 14 && parts.hour < 18;
  if (filter === "weekend") return parts.day === 0 || parts.day === 6;
  if (filter === "weekday") return parts.day >= 1 && parts.day <= 5;
  return parts.day === 5;
}

// Evaluate from the complete, de-duplicated board period, never increment from an HTTP retry.
function evaluateQuestProgress(
  code,
  transactions,
  { previousMerchantIds = [] } = {},
) {
  const rule = RULES[code];
  if (!rule) throw new Error(`Unsupported quest: ${code}`);
  const [metric, category, time] = rule;
  const seen = new Set();
  const rows = transactions.filter((tx) => {
    if (tx.status && tx.status !== "COMPLETED") return false;
    const id = tx.transaction_id?.toString();
    if (id && seen.has(id)) return false;
    if (id) seen.add(id);
    return (
      (!category || categoryOf(tx) === category) &&
      inTime(thaiDateParts(tx.paid_at), time)
    );
  });
  const amounts = rows.map((tx) => Math.round(Number(tx.total_amount) * 100));
  const merchant = (tx) => String(tx.shop_id ?? tx.shops?.shop_id ?? "");
  const shops = new Map();
  for (let i = 0; i < rows.length; i++) {
    const id = merchant(rows[i]);
    if (id)
      shops.set(
        id,
        (shops.get(id) || 0) + (metric === "merchantSpend" ? amounts[i] : 1),
      );
  }
  if (metric === "count") return rows.length;
  if (metric === "spend")
    return Math.floor(amounts.reduce((a, b) => a + b, 0) / 100);
  if (metric === "ticket") return Math.floor(Math.max(0, ...amounts) / 100);
  if (metric === "merchantSpend")
    return Math.floor(Math.max(0, ...shops.values()) / 100);
  if (metric === "merchants") return shops.size;
  if (metric === "repeat") return Math.max(0, ...shops.values());
  if (metric === "new") {
    const previous = new Set(previousMerchantIds.map(String));
    return [...shops.keys()].filter((id) => !previous.has(id)).length;
  }
  const days = [
    ...new Set(rows.map((tx) => thaiDateParts(tx.paid_at).date)),
  ].sort();
  if (metric === "days") return days.length;
  let longest = 0,
    streak = 0,
    previous = null;
  for (const day of days) {
    const ms = Date.parse(day);
    streak = previous !== null && ms - previous === DAY ? streak + 1 : 1;
    longest = Math.max(longest, streak);
    previous = ms;
  }
  return longest;
}

function familyOf(code) {
  if (code.startsWith("SPEND") || code.startsWith("SINGLE")) return "SPEND";
  if (code.startsWith("DISTINCT") || code.startsWith("NEW")) return "VARIETY";
  if (
    /DAYPART|WEEKDAY|WEEKEND_COUNT|FRIDAY|FD_MORNING|FD_LUNCH|FD_AFTERNOON/.test(
      code,
    )
  )
    return "TIME";
  return "ACTIVITY";
}

module.exports = {
  DAY,
  THAI_OFFSET,
  RULES,
  thaiDateParts,
  monthKey,
  categoryOf,
  evaluateQuestProgress,
  familyOf,
};
