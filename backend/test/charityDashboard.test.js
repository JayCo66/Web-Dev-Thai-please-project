const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildDonationDashboard } = require("../src/services/charityDashboard");
const charity = (id, type, active = true) => ({ charity_id: BigInt(id), name: "Foundation " + id, impact_type: type, is_active: active });
const total = (id, amount, count) => ({ charity_id: BigInt(id), _sum: {amount}, _count: {donation_id: count} });
test("dashboard totals include inactive charities, preserve cents and sum categories once", () => {
  const result = buildDonationDashboard([charity(1,"EDUCATION"),charity(2,"EDUCATION",false),charity(3,"HEALTHCARE")],[total(1,"10.10",2),total(2,"20.20",1)]);
  assert.equal(result.summary.totalAmount,30.3);
  assert.equal(result.summary.donationCount,3);
  assert.equal(result.summary.receivingCharityCount,2);
  assert.equal(result.categories.length,4);
  const education = result.categories.find(c=>c.impactType==="EDUCATION");
  assert.equal(education.totalAmount,30.3);
  assert.equal(education.sharePercent,100);
  assert.equal(education.charities[0].isActive,false);
  assert.equal(result.categories.reduce((n,c)=>n+c.donationCount,0),3);
});
test("no donations still returns all categories and zero shares without fabricated amounts", () => {
  const result=buildDonationDashboard([charity(1,"COMMUNITY")],[]);
  assert.equal(result.summary.totalAmount,0);
  assert.equal(result.summary.receivingCharityCount,0);
  assert.ok(result.categories.every(c=>c.totalAmount===0&&c.sharePercent===0));
});
