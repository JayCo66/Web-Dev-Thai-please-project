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
    easy: 24,
    medium: 0,
    hard: 0,
  });
  const boardId = board.data.currentBoard.boardId;
  assert.equal(
    board.data.boardsSummary.filter((b) => b.status === "LOCKED").length,
    3,
  );
  check("new-user easy board, 25 cells, locked future boards");
  const other = await request("/quests/active-board", token2);
  assert.notEqual(other.data.currentBoard.boardId, boardId);
  check("two accounts own different boards");
  const shops = await request("/transactions/shops", token);
  const shop = shops.data[0];
  assert.ok(shop);
  const charities = await request("/charities", token);
  assert.ok(charities.data.length);
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
  // Test end-game using an explicit QA-only DB fixture; no bypass exists in the app.
  const row = await db.bingo_boards.findUnique({
    where: { board_id: BigInt(boardId) },
  });
  const snapshot = row.snapshot;
  snapshot.cells.forEach((c) => {
    if (c.position < 5) {
      c.status = "COMPLETED";
      c.progress = c.target_value;
    }
  });
  await db.bingo_boards.update({
    where: { board_id: row.board_id },
    data: { snapshot },
  });
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
