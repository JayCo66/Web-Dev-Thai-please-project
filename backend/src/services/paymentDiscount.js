// Only explicitly configured reward offers can discount a payment.
function discountTerms(item) {
  const kind = item.kind || item.reward_type;
  if (!["COUPON", "DISCOUNT"].includes(kind)) return null;
  const saved = item.metadata?.paymentDiscount;
  if (saved?.type === "FIXED" && Number.isSafeInteger(saved.amount) && saved.amount > 0 && Number.isSafeInteger(saved.minimumAmount) && saved.minimumAmount >= saved.amount) return saved;
  const name = item.name || item.metadata?.rewardName || item.metadata?.title;
  return name === "คูปองส่วนลด 50 บาท" ? { type: "FIXED", amount: 50, minimumAmount: 50 } : null;
}
function calculateDiscount(amount, terms) {
  if (!terms) return 0;
  if (amount < terms.minimumAmount) throw Object.assign(new Error(`คูปองนี้ใช้กับยอดสินค้าตั้งแต่ ${terms.minimumAmount} บาท`), {statusCode:400});
  return Math.min(Math.round(amount * 100), terms.amount * 100) / 100;
}
module.exports = { discountTerms, calculateDiscount };
