// Isolated MySQL + real HTTP + browser acceptance checks; no live AI or money.
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const http = require("node:http");
// Explicit loopback agent keeps local QA traffic out of host proxy configuration.
function localFetch(address, options = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      address,
      {
        method: options.method || "GET",
        headers: options.headers,
        agent: new http.Agent(),
        timeout: 10000,
      },
      (response) => {
        let body = "";
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () =>
          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 300,
            status: response.statusCode,
            json: async () => JSON.parse(body),
          }),
        );
      },
    );
    request.on("error", reject);
    request.on("timeout", () =>
      request.destroy(new Error("Local request timed out")),
    );
    request.end(options.body);
  });
}
const root = path.resolve(__dirname, "../..");
const backend = path.join(root, "backend");
require(path.join(backend, "node_modules/dotenv")).config({
  path: path.join(backend, ".env"),
  quiet: true,
});
const { PrismaClient } = require(path.join(backend, "generated/prisma"));
const { chromium } = require("playwright");
const url = new URL(process.env.DATABASE_URL);
const dbName = "thai_please_qa_" + Date.now();
const admin = new PrismaClient();
let db,
  browser,
  apiProcess,
  webProcess,
  created = false;
const report = { database: dbName, checks: [], screenshots: [] };
const check = (label) => {
  report.checks.push(label);
  console.log("PASS " + label);
};
async function ready(url) {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await localFetch(url);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Server not ready " + url);
}
async function main() {
  await admin.$executeRawUnsafe(
    `CREATE DATABASE ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  created = true;
  url.pathname = "/" + dbName;
  db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const seed = fs.readFileSync(
    path.join(root, "thai_please_schema.sql"),
    "utf8",
  );
  let statement = "";
  for (const line of seed.split("\n")) {
    if (line.trim().startsWith("--") || !line.trim()) continue;
    statement += line + "\n";
    if (line.trim().endsWith(";")) {
      if (!/^(CREATE DATABASE|USE\s)/i.test(statement.trim()))
        await db.$executeRawUnsafe(statement.trim());
      statement = "";
    }
  }
  // Reproduce the real bug: two rows with different display names for one prize.
  const legacyWave = await db.rewards.create({
    data: {
      name: "Honda Wave 125i สตาร์ทมือ ล้อซี่ลวด",
      reward_type: "LUCKY_DRAW",
      token_cost: 25,
      image_url: "/assets/rewards/wave125i.png",
    },
  });
  const duplicateWave = await db.rewards.create({
    data: {
      name: "Honda Wave 125i",
      reward_type: "LUCKY_DRAW",
      token_cost: 25,
      image_url: "/assets/rewards/wave125i.png",
    },
  });
  const upgrade = cp.spawnSync(process.execPath, ["scripts/upgrade-db.js"], {
    cwd: backend,
    env: { ...process.env, DATABASE_URL: url.toString() },
    encoding: "utf8",
  });
  if (upgrade.status !== 0) throw new Error(upgrade.stdout + upgrade.stderr);
  check("fresh seed + additive upgrade");
  const password = "Qa-" + crypto.randomBytes(16).toString("hex");
  const hash = await require(path.join(backend, "node_modules/bcryptjs")).hash(
    password,
    10,
  );
  const legacyOwner = await db.users.create({
    data: { name: "Legacy QA holder", password_hash: hash },
  });
  const historicalTicket = await db.reward_redemptions.create({
    data: {
      user_id: legacyOwner.user_id,
      reward_id: duplicateWave.reward_id,
      kind: "LUCKY_DRAW",
      code: "QA-LEGACY-TICKET",
      metadata: { ticketsCount: 1, title: "Old ticket" },
      token_cost: 25,
      request_key: "qa:legacy-ticket",
    },
  });
  const { syncCatalog } = require("../src/services/catalogService");
  await syncCatalog(db);
  await syncCatalog(db);
  const waveRows = await db.rewards.findMany({
    where: { image_url: "/assets/rewards/wave125i.png" },
    orderBy: { reward_id: "asc" },
  });
  assert.equal(
    waveRows.length,
    2,
    "repeated synchronization must not create more rows",
  );
  assert.equal(waveRows.filter((row) => row.is_active).length, 1);
  assert.equal(
    waveRows.find((row) => row.is_active).reward_id,
    legacyWave.reward_id,
  );
  assert.equal(
    (
      await db.reward_redemptions.findUnique({
        where: { redemption_id: historicalTicket.redemption_id },
      })
    ).reward_id,
    duplicateWave.reward_id,
  );
  const { prizeReference } = require("../src/services/rewardCatalog");
  assert.equal(
    prizeReference({ ...legacyWave, name: "Honda Wave 125i ชื่อที่แก้ใน DB" })
      .prizeValue,
    58000,
  );
  check(
    "duplicate reward cleanup keeps the original ID and old tickets; repeated sync does not create new rows",
  );
  const user = await db.users.create({
    data: {
      name: "ทดสอบ หนึ่ง",
      email: "qa-one@example.test",
      password_hash: hash,
      demo_balance: 500,
    },
  });
  const user2 = await db.users.create({
    data: {
      name: "ทดสอบ สอง",
      email: "qa-two@example.test",
      password_hash: hash,
      demo_balance: 500,
    },
  });
  await db.token_transactions.create({
    data: {
      user_id: user.user_id,
      amount: 600,
      type: "EARN_CELL",
      event_key: "qa:initial",
    },
  });
  apiProcess = cp.spawn(process.execPath, ["src/server.js"], {
    cwd: backend,
    env: {
      ...process.env,
      DATABASE_URL: url.toString(),
      PORT: "5091",
      TYPHOON_API_KEY: "",
      DEMO_MODE: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let apiLog = "";
  apiProcess.stdout.on("data", (d) => (apiLog += d));
  apiProcess.stderr.on("data", (d) => (apiLog += d));
  apiProcess.on("exit", (code) => {
    if (code)
      console.error(
        "QA backend exit " +
          code +
          " " +
          apiLog.replaceAll(url.toString(), "[database]"),
      );
  });
  webProcess = cp.spawn(
    process.execPath,
    [
      path.join(root, "frontend/node_modules/vite/bin/vite.js"),
      "--host",
      "127.0.0.1",
      "--port",
      "5178",
      "--strictPort",
    ],
    {
      cwd: path.join(root, "frontend"),
      env: { ...process.env, VITE_API_BASE_URL: "http://127.0.0.1:5091/api" },
      stdio: "ignore",
      windowsHide: true,
    },
  );
  try {
    await Promise.all([
      ready("http://127.0.0.1:5091/"),
      ready("http://127.0.0.1:5178/"),
    ]);
  } catch (error) {
    console.error(
      "QA backend log: " + apiLog.replaceAll(url.toString(), "[database]"),
    );
    throw error;
  }
  const request = async (route, token, body, method) => {
    const r = await localFetch("http://127.0.0.1:5091/api" + route, {
      method: method || (body ? "POST" : "GET"),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, ...(await r.json()) };
  };
  const login = await request("/auth/login", null, {
    identifier: "qa-one@example.test",
    password,
  });
  assert.equal(login.success, true, JSON.stringify(login));
  const token = login.data.token;
  const login2 = await request("/auth/login", null, {
    identifier: "qa-two@example.test",
    password,
  });
  const token2 = login2.data.token;
  assert.equal(
    (await request("/auth/login-thaid", null, { citizenId: "1100500123451" }))
      .status,
    501,
  );
  const demo = await request("/auth/demo-login", null, {});
  assert.equal(demo.success, true);
  assert.equal(demo.data.wallet.balance, "500.00");
  check("demo identity needs no personal data and ThaiD is not impersonated");
  assert.equal((await request("/quests/active-board")).status, 401);
  check("Bingo requires authenticated identity");
  let board = await request("/quests/active-board", token);
  assert.equal(board.success, true, JSON.stringify(board));
  assert.deepEqual(board.data.currentBoard.difficultyMix, {
    easy: 12,
    medium: 8,
    hard: 4,
  });
  const boardId = board.data.currentBoard.boardId;
  assert.equal(
    board.data.boardsSummary.filter((b) => b.status === "LOCKED").length,
    3,
  );
  check("new-user mixed starter board, 25 cells, locked future boards");
  const other = await request("/quests/active-board", token2);
  assert.notEqual(other.data.currentBoard.boardId, boardId);
  check("two accounts own different boards");
  const shops = await request("/transactions/shops", token);
  const shop = shops.data[0];
  assert.ok(shop);
  const charities = await request("/charities", token);
  assert.equal(charities.data.length, 28);
  assert.equal(new Set(charities.data.map((c) => c.coverImageUrl)).size, 28);
  for (const c of charities.data) {
    assert.notEqual(
      c.imageKind,
      "illustration",
      c.name + " should have its own image",
    );
    const files = [c.coverImageUrl, c.logoImageUrl].filter(Boolean);
    for (const file of files)
      assert.ok(fs.existsSync(path.join(root, "frontend/public", file)), file);
  }
  check(
    "all 28 charities have distinct local covers with matched logos or the selected poster",
  );
  const payBody = {
    shopId: shop.shopId,
    amount: 50,
    requestId: crypto.randomUUID(),
  };
  const [payA, payB] = await Promise.all([
    request("/transactions/pay", token, payBody),
    request("/transactions/pay", token, payBody),
  ]);
  assert.equal(payA.success, true, JSON.stringify(payA));
  assert.equal(payB.success, true, JSON.stringify(payB));
  assert.equal(payA.data.transactionId, payB.data.transactionId);
  assert.equal(
    await db.transactions.count({ where: { user_id: user.user_id } }),
    1,
  );
  let profile = await request("/users/me", token);
  assert.equal(Number(profile.data.wallet.balance), 480);
  check("concurrent duplicate payment debits once");
  const donateBody = {
    charityId: charities.data[0].charityId,
    amount: 20,
    requestId: crypto.randomUUID(),
  };
  const donation = await request("/charities/donate", token, donateBody);
  assert.equal(donation.success, true, JSON.stringify(donation));
  assert.equal(
    (await request("/charities/donate", token, donateBody)).data.donationId,
    donation.data.donationId,
  );
  profile = await request("/users/me", token);
  assert.equal(Number(profile.data.wallet.balance), 460);
  board = await request("/quests/active-board", token);
  assert.equal(board.data.currentBoard.cells[12].status, "COMPLETED");
  check("donation debit, history, donation-only center and replay safety");
  const balance = profile.data.tokens;
  assert.equal(
    (
      await request("/quests/progress", token, {
        position: 0,
        markComplete: true,
      })
    ).status,
    403,
  );
  assert.equal((await request("/rewards/demo-faucet", token, {})).status, 403);
  assert.equal((await request("/users/me", token)).data.tokens, balance);
  check("manual completion and token farming disabled");
  const catalog = await request("/rewards", token);
  const reward = catalog.data.rewards.find((r) => r.tokenCost <= balance);
  assert.ok(reward, "affordable seeded reward");
  const redemption = {
    rewardId: reward.rewardId,
    requestId: crypto.randomUUID(),
  };
  const [ra, rb] = await Promise.all([
    request("/rewards/redeem", token, redemption),
    request("/rewards/redeem", token, redemption),
  ]);
  assert.equal(ra.success, true, JSON.stringify(ra));
  assert.equal(rb.success, true, JSON.stringify(rb));
  assert.equal(ra.data.code, rb.data.code);
  assert.equal((await request("/rewards/my-items", token)).data.length, 1);
  assert.equal((await request("/rewards/my-items", token2)).data.length, 0);
  check(
    "reward ownership persists and replay cannot double spend or leak across accounts",
  );
  assert.equal(catalog.data.prizes.length, 3);
  for (const prize of catalog.data.prizes) {
    assert.ok(prize.imageUrl.startsWith("/assets/rewards/"));
    const payload = {
      rewardId: prize.rewardId,
      ticketsCount: 3,
      requestId: crypto.randomUUID(),
    };
    const draw = await request("/rewards/lucky-draw", token, payload);
    assert.equal(draw.success, true, JSON.stringify(draw));
    assert.equal(draw.data.rewardId, prize.rewardId);
    assert.equal(draw.data.tokensSpent, 75);
    assert.equal(draw.data.ticketsCount, 3);
    assert.ok(prize.prizeValue > 0);
    const after = (await request("/users/me", token)).data.tokens;
    const replay = await request("/rewards/lucky-draw", token, payload);
    assert.equal(replay.data.code, draw.data.code);
    assert.equal((await request("/users/me", token)).data.tokens, after);
  }
  check(
    "all three specific lucky prizes persist the selected reward and debit once",
  );
  await db.token_transactions.create({
    data: {
      user_id: user2.user_id,
      amount: reward.tokenCost + 10,
      type: "EARN_CELL",
      event_key: "qa:race",
    },
  });
  const races = await Promise.all([
    request("/rewards/redeem", token2, {
      rewardId: reward.rewardId,
      requestId: crypto.randomUUID(),
    }),
    request("/rewards/redeem", token2, {
      rewardId: reward.rewardId,
      requestId: crypto.randomUUID(),
    }),
  ]);
  assert.deepEqual(races.map((r) => r.status).sort(), [201, 400]);
  assert.ok((await request("/users/me", token2)).data.tokens >= 0);
  check("different concurrent reward requests cannot overdraw token balance");
  const persisted = await request("/quests/active-board", token);
  assert.equal(persisted.data.currentBoard.boardId, boardId);
  // Exercise the guarded demo endpoint, including replay safety.
  const row = await db.bingo_boards.findUnique({
    where: { board_id: BigInt(boardId) },
  });
  const completed = await request("/quests/demo-complete", token, {
    boardIndex: 0,
    lineId: "R1",
  });
  assert.equal(completed.success, true, JSON.stringify(completed));
  const tokensAfterDemo = (await request("/users/me", token)).data.tokens;
  const repeated = await request("/quests/demo-complete", token, {
    boardIndex: 0,
    lineId: "R1",
  });
  assert.equal(repeated.success, true, JSON.stringify(repeated));
  assert.equal(
    (await request("/users/me", token)).data.tokens,
    tokensAfterDemo,
  );
  check("guarded demo line completion is persisted and repeat-safe");
  const [ca, cb] = await Promise.all([
    request("/quests/claim", token, {
      boardIndex: 0,
      mode: "MANUAL",
      lineId: "R1",
    }),
    request("/quests/claim", token, {
      boardIndex: 0,
      mode: "MANUAL",
      lineId: "R1",
    }),
  ]);
  assert.equal(ca.success, true, JSON.stringify(ca));
  assert.equal(cb.success, true, JSON.stringify(cb));
  assert.equal(
    await db.token_transactions.count({
      where: { board_id: row.board_id, type: "EARN_LINE" },
    }),
    1,
  );
  const accepted = await request("/quests/accept", token, { boardIndex: 0 });
  assert.equal(accepted.success, true, JSON.stringify(accepted));
  assert.equal(accepted.data.activeBoardIndex, 1);
  assert.ok(accepted.data.currentBoard.cells.every((c) => c.progress === 0));
  check("manual line claim once, explicit accept, next board starts fresh");
  for (let index = 0; index < 4; index++) {
    const row2 = await db.bingo_boards.findFirst({
      where: {
        user_id: user2.user_id,
        board_index: index,
        month_key: other.data.month,
      },
    });
    const state = row2.snapshot;
    state.cells.forEach((c) => {
      if (c.position < 5) {
        c.status = "COMPLETED";
        c.progress = c.target_value;
      }
    });
    await db.bingo_boards.update({
      where: { board_id: row2.board_id },
      data: { snapshot: state },
    });
    assert.equal(
      (
        await request("/quests/claim", token2, {
          boardIndex: index,
          mode: "AUTO_MAX_TOKEN",
        })
      ).success,
      true,
    );
    assert.equal(
      (await request("/quests/accept", token2, { boardIndex: index })).success,
      true,
    );
  }
  assert.equal(
    await db.bingo_boards.count({
      where: { user_id: user2.user_id, month_key: other.data.month },
    }),
    4,
  );
  assert.equal(
    (await request("/quests/accept", token2, { boardIndex: 4 })).status,
    400,
  );
  check("four-board monthly limit with AUTO_MAX selection");
  const beforeRestart = (await request("/quests/active-board", token)).data
    .currentBoard;
  await new Promise((resolve) => {
    apiProcess.once("exit", resolve);
    apiProcess.kill();
  });
  apiProcess = cp.spawn(process.execPath, ["src/server.js"], {
    cwd: backend,
    env: {
      ...process.env,
      DATABASE_URL: url.toString(),
      PORT: "5091",
      TYPHOON_API_KEY: "",
      DEMO_MODE: "true",
    },
    stdio: "ignore",
    windowsHide: true,
  });
  await ready("http://127.0.0.1:5091/");
  const afterRestart = (await request("/quests/active-board", token)).data
    .currentBoard;
  assert.equal(afterRestart.boardId, beforeRestart.boardId);
  assert.deepEqual(afterRestart.cells, beforeRestart.cells);
  check("board and progress survive a backend restart");
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : process.platform === "win32"
        ? { channel: "msedge" }
        : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((t) => localStorage.setItem("token", t), token);
  const screenshots = path.join(root, "docs/qa");
  fs.mkdirSync(screenshots, { recursive: true });
  for (const route of ["/", "/bingo", "/charities", "/rewards", "/payment"]) {
    await page.goto("http://127.0.0.1:5178" + route);
    await page.waitForLoadState("networkidle");
    assert.equal(await page.locator("main h1").count(), 1, route);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    assert.equal(overflow, false, route + " desktop overflow");
    const filename = route === "/" ? "home" : route.slice(1);
    await page.screenshot({
      path: path.join(screenshots, filename + "-desktop.png"),
      fullPage: true,
    });
    report.screenshots.push(filename + "-desktop.png");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", "/bingo", "/charities", "/rewards", "/payment"]) {
    await page.goto("http://127.0.0.1:5178" + route);
    await page.waitForLoadState("networkidle");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      ),
      false,
      route + " mobile overflow",
    );
    const filename = route === "/" ? "home" : route.slice(1);
    await page.screenshot({
      path: path.join(screenshots, filename + "-mobile.png"),
      fullPage: true,
    });
    report.screenshots.push(filename + "-mobile.png");
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://127.0.0.1:5178/bingo");
  await page.waitForLoadState("networkidle");
  assert.equal(await page.locator(".xp-cell-tokens").count(), 25);
  await page.getByText("เครื่องมือทดสอบ", { exact: true }).click();
  await page
    .getByRole("button", { name: "ทดสอบบิงโกแถว 1", exact: true })
    .click();
  await page
    .locator('.xp-bingo-crosses line[data-line="R1"]')
    .waitFor({ state: "attached" });
  assert.ok(await page.locator(".xp-bingo-crosses").isVisible());
  assert.notEqual(
    await page
      .locator('.xp-bingo-crosses line[data-line="R1"]')
      .evaluate((el) => getComputedStyle(el).stroke),
    "none",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(screenshots, "bingo-completed-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(screenshots, "bingo-completed-mobile.png"),
    fullPage: true,
  });
  report.screenshots.push(
    "bingo-completed-desktop.png",
    "bingo-completed-mobile.png",
  );
  check(
    "visible cell tokens, demo button and crossed completed line work in browser",
  );
  await page.goto("http://127.0.0.1:5178/charities");
  await page.waitForLoadState("networkidle");
  assert.ok(
    await page
      .locator(".xp-charity-cover")
      .evaluateAll(
        (imgs) =>
          imgs.length > 0 &&
          imgs.every((img) => img.complete && img.naturalWidth > 0),
      ),
  );
  check("local full-card charity photos load successfully");
  const firstName = await page
    .locator(".xp-charity-card h2")
    .first()
    .innerText();
  await page.getByRole("button", { name: "หน้า 2", exact: true }).click();
  assert.equal(await page.locator(".xp-charity-card").count(), 6);
  assert.notEqual(
    await page.locator(".xp-charity-card h2").first().innerText(),
    firstName,
  );
  assert.equal(
    await page.locator('.xp-pagination [aria-current="page"]').innerText(),
    "2",
  );
  await page.getByRole("button", { name: "หน้าก่อนหน้า", exact: true }).click();
  assert.equal(
    await page.locator(".xp-charity-card h2").first().innerText(),
    firstName,
  );
  await page.getByRole("button", { name: "หน้า 5", exact: true }).click();
  assert.equal(await page.locator(".xp-charity-card").count(), 4);
  assert.ok(
    await page
      .getByRole("button", { name: "หน้าถัดไป", exact: true })
      .isDisabled(),
  );
  await page.getByRole("textbox", { name: "ค้นหามูลนิธิ" }).fill("ยุวพัฒน์");
  assert.equal(await page.locator(".xp-charity-card").count(), 1);
  assert.equal(
    await page.locator('.xp-pagination [aria-current="page"]').innerText(),
    "1",
  );
  check(
    "charity numbered pagination replaces cards, returns to previous page and resets on search",
  );
  await page.goto("http://127.0.0.1:5178/rewards");
  await page.waitForLoadState("networkidle");
  await page.locator(".xp-prize-card button").first().click();
  const quantity = page.getByLabel("จำนวนสิทธิ์ที่ต้องการ", { exact: true });
  await quantity.fill("3");
  assert.match(await page.locator("dialog .xp-receipt").innerText(), /75/);
  const actualTokens = (await request("/users/me", token)).data.tokens;
  const maximum = Math.min(100, Math.floor(actualTokens / 25));
  await quantity.fill("100");
  assert.equal(await quantity.inputValue(), String(maximum));
  assert.match(
    await page.locator("dialog .xp-receipt").innerText(),
    new RegExp(String(maximum * 25)),
  );
  await quantity.fill("0");
  assert.ok(
    await page
      .getByRole("button", { name: "ยืนยันใช้แต้ม", exact: true })
      .isDisabled(),
  );
  await quantity.fill("1.5");
  assert.ok(
    await page
      .getByRole("button", { name: "ยืนยันใช้แต้ม", exact: true })
      .isDisabled(),
  );
  await quantity.fill("5");
  assert.match(await page.locator("dialog .xp-receipt").innerText(), /125/);
  await page.screenshot({
    path: path.join(screenshots, "reward-quantity-mobile.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  check("custom ticket quantity shows linear prices and blocks invalid counts");
  assert.deepEqual(errors, []);
  check("all five pages desktop/mobile: no overflow or browser exceptions");
  await page.goto("http://127.0.0.1:5178/charities");
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: "ร่วมให้", exact: true })
    .first()
    .click();
  assert.equal(await page.locator("dialog[open]").count(), 1);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog[open]").count(), 0);
  check("donation dialog keyboard close and focus behavior");
  const anonymous = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const loginPage = await anonymous.newPage();
  await loginPage.goto("http://127.0.0.1:5178/login");
  await loginPage.waitForLoadState("networkidle");
  await loginPage.screenshot({
    path: path.join(screenshots, "login-desktop.png"),
    fullPage: true,
  });
  await loginPage.setViewportSize({ width: 390, height: 844 });
  await loginPage.screenshot({
    path: path.join(screenshots, "login-mobile.png"),
    fullPage: true,
  });
  await loginPage
    .getByRole("button", { name: "เปิดบัญชีทดลอง", exact: true })
    .click();
  await loginPage.waitForURL("http://127.0.0.1:5178/");
  await loginPage.locator(".xp-wallet-amount").waitFor();
  assert.match(await loginPage.locator(".xp-wallet-amount").innerText(), /500/);
  check("new demo login works from a clean mobile browser");
  // A real isolated account with exactly 60 tokens must clamp 100 to two tickets.
  const freshToken = await loginPage.evaluate(() =>
    localStorage.getItem("token"),
  );
  const freshProfile = (await request("/users/me", freshToken)).data;
  assert.equal(freshProfile.tokens, 50);
  await db.token_transactions.create({
    data: {
      user_id: BigInt(freshProfile.userId),
      amount: 10,
      type: "EARN_CELL",
      event_key: "qa:sixty-tokens",
    },
  });
  await loginPage.goto("http://127.0.0.1:5178/rewards");
  await loginPage.waitForLoadState("networkidle");
  await loginPage.locator(".xp-prize-card button").first().click();
  const sixtyQuantity = loginPage.getByLabel("จำนวนสิทธิ์ที่ต้องการ", {
    exact: true,
  });
  await sixtyQuantity.fill("100");
  assert.equal(await sixtyQuantity.inputValue(), "2");
  assert.match(
    await loginPage.locator("dialog .xp-receipt").innerText(),
    /50 แต้ม/,
  );
  assert.match(
    await loginPage.locator("dialog .xp-receipt").innerText(),
    /10 แต้ม/,
  );
  assert.ok(
    await loginPage
      .getByRole("button", { name: "ยืนยันใช้แต้ม", exact: true })
      .isEnabled(),
  );
  await loginPage.screenshot({
    path: path.join(screenshots, "reward-clamped-60-tokens-mobile.png"),
    fullPage: true,
  });
  await loginPage
    .getByRole("button", { name: "ยืนยันใช้แต้ม", exact: true })
    .click();
  await loginPage.locator("dialog[open]").waitFor({ state: "hidden" });
  assert.equal((await request("/users/me", freshToken)).data.tokens, 10);
  assert.equal(
    (await request("/rewards/my-items", freshToken)).data[0].ticketsCount,
    2,
  );
  check(
    "60 tokens clamp 100 to two tickets and the server deducts 50, leaving 10",
  );
  await anonymous.close();
  report.passed = true;
  fs.writeFileSync(
    path.join(screenshots, "functional-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("QA_REPORT " + JSON.stringify(report));
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    apiProcess?.kill();
    if (webProcess?.pid && process.platform === "win32")
      cp.spawnSync("taskkill", ["/PID", String(webProcess.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    if (process.platform !== "win32") webProcess?.kill();
    await db?.$disconnect();
    if (
      created &&
      process.env.KEEP_QA_DB !== "true" &&
      /^thai_please_qa_\d+$/.test(dbName)
    )
      await admin.$executeRawUnsafe("DROP DATABASE " + dbName);
    await admin.$disconnect();
  });
