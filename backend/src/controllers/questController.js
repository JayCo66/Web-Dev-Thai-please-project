const prisma = require("../config/prisma");
const { generateBingoMissionsWithAI } = require("../services/questService");
const { buildUserMissionInput, safeJson } = require("../services/bingoProfile");
const {
  evaluateQuestProgress,
  monthKey,
  thaiDateParts,
} = require("../services/questMetrics");

const BINGO_LINE_BONUS_TOKENS = 20;
const BINGO_LINES = [
  ...Array.from({ length: 5 }, (_, r) => ({
    id: `R${r + 1}`,
    type: "ROW",
    name: `แถว ${r + 1}`,
    positions: Array.from({ length: 5 }, (_, c) => r * 5 + c),
  })),
  ...Array.from({ length: 5 }, (_, c) => ({
    id: `C${c + 1}`,
    type: "COL",
    name: `คอลัมน์ ${c + 1}`,
    positions: Array.from({ length: 5 }, (_, r) => r * 5 + c),
  })),
  { id: "D1", type: "DIAG", name: "ทแยงซ้าย", positions: [0, 6, 12, 18, 24] },
  { id: "D2", type: "DIAG", name: "ทแยงขวา", positions: [4, 8, 12, 16, 20] },
];

function fail(message, statusCode = 400) {
  throw Object.assign(new Error(message), { statusCode });
}

function calculateBoardYield(budget = 24) {
  return {
    cellTokens: budget * 2,
    donationTokens: 10,
    lineTokens: BINGO_LINE_BONUS_TOKENS,
    totalTokens: budget * 2 + 10 + BINGO_LINE_BONUS_TOKENS,
  };
}

function analyzeBingoLines(cells, selectedLine = null) {
  const completed = new Set(
    cells
      .filter((c) => ["COMPLETED", "CLAIMED"].includes(c.status))
      .map((c) => c.position),
  );
  return BINGO_LINES.map((line) => {
    const count = line.positions.filter((p) => completed.has(p)).length;
    return {
      ...line,
      completedCount: count,
      isCompleted: count === 5,
      progressPercent: count * 20,
      tokenReward: BINGO_LINE_BONUS_TOKENS,
      isClaimed: selectedLine === line.id,
    };
  });
}

// Compatibility helper for isolated consumers. Stateful rules use evaluateQuestProgress
// with the full board-period history, not this single-payment helper.
function evaluateQuestIncrement(cell, transaction) {
  const value = evaluateQuestProgress(cell.quest_code, [
    {
      ...transaction,
      paid_at: transaction.paid_at || new Date(),
      status: "COMPLETED",
    },
  ]);
  if (cell.quest_code.startsWith("SINGLE_TICKET"))
    return value >= cell.target_value
      ? Math.max(0, cell.target_value - (cell.progress || 0))
      : 0;
  return value;
}

async function lockUser(db, userId) {
  const found =
    await db.$queryRaw`SELECT user_id FROM users WHERE user_id = ${BigInt(userId)} FOR UPDATE`;
  if (!found.length) fail("ไม่พบบัญชีผู้ใช้", 404);
}

async function withUserLock(userId, callback) {
  return prisma.$transaction(
    async (db) => {
      await lockUser(db, userId);
      return callback(db);
    },
    { timeout: 20000 },
  );
}

async function prepareBoard(userId) {
  const input = await buildUserMissionInput(prisma, userId);
  const generated = await generateBingoMissionsWithAI(input);
  return {
    version: 2,
    source: generated.source,
    sourceReason: generated.sourceReason,
    difficultyMix: generated.difficultyMix,
    period: generated.period,
    budget: generated.total_level,
    cells: generated.bingo_board_5x5.map((cell) => ({
      ...cell,
      short_title: cell.title,
      row: Math.floor(cell.position / 5),
      col: cell.position % 5,
      progress: 0,
      status: "IN_PROGRESS",
      token_reward: cell.family === "DONATION" ? 10 : cell.level * 2,
    })),
  };
}

async function withActivityBaseline(db, userId, snapshot) {
  const [payment, donation] = await Promise.all([
    db.transactions.findFirst({
      where: { user_id: BigInt(userId) },
      orderBy: { transaction_id: "desc" },
      select: { transaction_id: true },
    }),
    db.donations.findFirst({
      where: { user_id: BigInt(userId) },
      orderBy: { donation_id: "desc" },
      select: { donation_id: true },
    }),
  ]);
  return {
    ...snapshot,
    baselineTransactionId: String(payment?.transaction_id || 0),
    baselineDonationId: String(donation?.donation_id || 0),
  };
}

async function ensureCurrentBoard(userId) {
  const key = monthKey();
  const existing = await prisma.bingo_boards.findFirst({
    where: { user_id: BigInt(userId), month_key: key },
    orderBy: { board_index: "desc" },
  });
  if (existing) return existing;
  // Network generation is outside the transaction; recheck after locking to serialize first visits.
  const snapshot = await prepareBoard(userId);
  return withUserLock(userId, async (db) => {
    const raced = await db.bingo_boards.findFirst({
      where: { user_id: BigInt(userId), month_key: key },
      orderBy: { board_index: "desc" },
    });
    if (raced) return raced;
    if (monthKey() !== key) fail("เริ่มเดือนใหม่แล้ว กรุณาโหลดอีกครั้ง", 409);
    await db.bingo_boards.updateMany({
      where: {
        user_id: BigInt(userId),
        status: "ACTIVE",
        OR: [{ month_key: null }, { month_key: { not: key } }],
      },
      data: { status: "EXPIRED" },
    });
    return db.bingo_boards.create({
      data: {
        user_id: BigInt(userId),
        month_key: key,
        board_index: 0,
        board_size: 5,
        status: "ACTIVE",
        generated_by_ai: snapshot.source === "AI",
        snapshot: await withActivityBaseline(db, userId, snapshot),
      },
    });
  });
}

function rowToBoard(row) {
  const snapshot = safeJson(row.snapshot, {});
  const cells = snapshot.cells || [];
  const lines = analyzeBingoLines(cells, row.selected_line);
  return {
    ...snapshot,
    boardId: row.board_id.toString(),
    boardIndex: row.board_index,
    title: `กระดานที่ ${row.board_index + 1}`,
    status: row.status,
    cells,
    lines,
    totalCells: 25,
    source: snapshot.source || (row.generated_by_ai ? "AI" : "RULE_BASED"),
    activatedAt: row.started_at,
    acceptedAt: row.accepted_at,
    completedCellsCount: cells.filter((c) =>
      ["COMPLETED", "CLAIMED"].includes(c.status),
    ).length,
    bingoCount: lines.filter((l) => l.isCompleted).length,
    claimedLineId: row.selected_line,
    selectedLine: row.selected_line,
    canAccept: row.status === "ACTIVE" && !!row.selected_line,
  };
}

async function viewData(db, userId, requestedIndex) {
  const key = monthKey();
  const rows = await db.bingo_boards.findMany({
    where: { user_id: BigInt(userId), month_key: key },
    orderBy: { board_index: "asc" },
  });
  const active = rows.find((r) => r.status === "ACTIVE") || rows.at(-1);
  if (!active) fail("ยังไม่มีกระดานสำหรับเดือนนี้", 404);
  const index =
    requestedIndex === undefined
      ? active.board_index
      : parseBoardIndex(requestedIndex);
  const selected = rows.find((r) => r.board_index === index);
  if (!selected) fail("ยืนยันกระดานปัจจุบันก่อนเริ่มกระดานถัดไป", 409);
  const boards = rows.map(rowToBoard);
  const summary = Array.from({ length: 4 }, (_, i) => {
    const board = boards.find((b) => b.boardIndex === i);
    return {
      boardIndex: i,
      boardId: board?.boardId || null,
      title: `กระดานที่ ${i + 1}`,
      status: board?.status || "LOCKED",
      isActive: board?.status === "ACTIVE",
      completedCells: board?.completedCellsCount || 0,
      totalCells: 25,
      bingoCount: board?.bingoCount || 0,
      progressPercent: (board?.completedCellsCount || 0) * 4,
    };
  });
  const balance = await db.token_transactions.aggregate({
    where: { user_id: BigInt(userId) },
    _sum: { amount: true },
  });
  return {
    month: key,
    monthName: new Intl.DateTimeFormat("th-TH", {
      timeZone: "Asia/Bangkok",
      month: "long",
      year: "numeric",
    }).format(new Date()),
    totalBoards: 4,
    activeBoardIndex: active.board_index,
    selectedBoardIndex: index,
    isViewingActiveBoard: selected.status === "ACTIVE",
    boardsSummary: summary,
    currentBoard: rowToBoard(selected),
    userTokens: Number(balance._sum.amount || 0),
  };
}

function parseBoardIndex(value) {
  const index = Number(value);
  if (!Number.isInteger(index) || index < 0 || index > 3)
    fail("หมายเลขกระดานไม่ถูกต้อง");
  return index;
}

async function syncActivityInTransaction(db, userId) {
  // Caller must hold users row FOR UPDATE. Root payment/donation controllers use this
  // inside their ledger transaction, keeping activity, progress and rewards atomic.
  const row = await db.bingo_boards.findFirst({
    where: { user_id: BigInt(userId), month_key: monthKey(), status: "ACTIVE" },
  });
  if (!row || row.selected_line)
    return { tokensAwarded: 0, newBingoLinesCount: 0, bingoBonusTokens: 0 };
  const state = safeJson(row.snapshot, {});
  if (!Array.isArray(state.cells) || state.cells.length !== 25)
    fail("ข้อมูลกระดานไม่สมบูรณ์ กรุณาติดต่อผู้ดูแล", 500);
  const [payments, donations, previous] = await Promise.all([
    db.transactions.findMany({
      where: {
        user_id: BigInt(userId),
        status: "COMPLETED",
        transaction_id: { gt: BigInt(state.baselineTransactionId || 0) },
      },
      include: { shops: true },
    }),
    db.donations.findMany({
      where: {
        user_id: BigInt(userId),
        donation_id: { gt: BigInt(state.baselineDonationId || 0) },
      },
      select: { donation_id: true },
    }),
    db.transactions.findMany({
      where: {
        user_id: BigInt(userId),
        status: "COMPLETED",
        transaction_id: { lte: BigInt(state.baselineTransactionId || 0) },
      },
      select: { shop_id: true },
      distinct: ["shop_id"],
    }),
  ]);
  let tokensAwarded = 0;
  const oldLines = analyzeBingoLines(state.cells).filter(
    (l) => l.isCompleted,
  ).length;
  for (const cell of state.cells) {
    if (cell.status === "COMPLETED" || cell.status === "CLAIMED") continue;
    const progress =
      cell.family === "DONATION"
        ? donations.length
        : evaluateQuestProgress(cell.quest_code, payments, {
            previousMerchantIds: previous.map((t) => t.shop_id),
          });
    cell.progress = Math.min(cell.target_value, progress);
    if (cell.progress >= cell.target_value) {
      cell.status = "COMPLETED";
      cell.completed_at = new Date().toISOString();
      const eventKey = `bingo:${row.board_id}:cell:${cell.position}`;
      const existing = await db.token_transactions.findUnique({
        where: { event_key: eventKey },
      });
      if (!existing) {
        await db.token_transactions.create({
          data: {
            user_id: BigInt(userId),
            board_id: row.board_id,
            amount: cell.token_reward,
            type: "EARN_CELL",
            event_key: eventKey,
          },
        });
        tokensAwarded += cell.token_reward;
      }
    }
  }
  await db.bingo_boards.update({
    where: { board_id: row.board_id },
    data: { snapshot: state },
  });
  const linesCount = analyzeBingoLines(state.cells).filter(
    (l) => l.isCompleted,
  ).length;
  return {
    tokensAwarded,
    completedCellsCount: state.cells.filter((c) => c.status === "COMPLETED")
      .length,
    newBingoLinesCount: Math.max(0, linesCount - oldLines),
    bingoBonusTokens: 0,
  };
}

async function syncPaymentProgress(userId) {
  return withUserLock(userId, (db) => syncActivityInTransaction(db, userId));
}
const syncDonationProgress = syncPaymentProgress;

function respondError(res, error) {
  const schemaMissing = ["P2021", "P2022"].includes(error.code);
  if (!error.statusCode) console.error("Bingo:", error.code || error.message);
  return res
    .status(schemaMissing ? 503 : error.statusCode || 500)
    .json({
      success: false,
      error: schemaMissing
        ? "ระบบกำลังเตรียมข้อมูลกระดาน กรุณาให้ผู้ดูแลอัปเดตฐานข้อมูล"
        : error.statusCode
          ? error.message
          : "โหลดกระดานไม่สำเร็จ กรุณาลองอีกครั้ง",
    });
}

async function getActiveBoard(req, res) {
  try {
    const userId = req.user.userId;
    await ensureCurrentBoard(userId);
    const data = await withUserLock(userId, async (db) => {
      await syncActivityInTransaction(db, userId);
      return viewData(db, userId, req.query.boardIndex);
    });
    return res.json({ success: true, data });
  } catch (error) {
    return respondError(res, error);
  }
}

async function claimLine(req, res) {
  try {
    const userId = req.user.userId;
    const index = parseBoardIndex(req.body.boardIndex);
    const mode = req.body.mode || "AUTO_MAX_TOKEN";
    if (!["MANUAL", "AUTO_MAX_TOKEN"].includes(mode))
      fail("รูปแบบการเลือกเส้นไม่ถูกต้อง");
    const data = await withUserLock(userId, async (db) => {
      await syncActivityInTransaction(db, userId);
      const row = await db.bingo_boards.findUnique({
        where: {
          user_id_month_key_board_index: {
            user_id: BigInt(userId),
            month_key: monthKey(),
            board_index: index,
          },
        },
      });
      if (!row) fail("ไม่พบกระดาน", 404);
      if (row.selected_line) return viewData(db, userId, index); // retry returns the original claim
      if (row.status !== "ACTIVE") fail("กระดานนี้ยังรับโบนัสไม่ได้", 409);
      const completed = analyzeBingoLines(
        safeJson(row.snapshot, {}).cells,
      ).filter((l) => l.isCompleted);
      const chosen =
        mode === "MANUAL"
          ? completed.find((l) => l.id === req.body.lineId)
          : completed.sort(
              (a, b) =>
                b.tokenReward - a.tokenReward || a.id.localeCompare(b.id),
            )[0];
      if (!chosen) fail("ทำภารกิจให้ครบเส้นก่อนรับโบนัส", 409);
      await db.token_transactions.create({
        data: {
          user_id: BigInt(userId),
          board_id: row.board_id,
          amount: chosen.tokenReward,
          type: "EARN_LINE",
          event_key: `bingo:${row.board_id}:line`,
        },
      });
      await db.bingo_boards.update({
        where: { board_id: row.board_id },
        data: {
          selected_line: chosen.id,
          line_select_mode: mode,
          completed_at: new Date(),
        },
      });
      return viewData(db, userId, index);
    });
    return res.json({ success: true, message: "รับโบนัสบิงโกแล้ว", data });
  } catch (error) {
    return respondError(res, error);
  }
}

async function acceptBoard(req, res) {
  try {
    const userId = req.user.userId;
    const index = parseBoardIndex(req.body.boardIndex);
    const key = monthKey();
    const current = await prisma.bingo_boards.findUnique({
      where: {
        user_id_month_key_board_index: {
          user_id: BigInt(userId),
          month_key: key,
          board_index: index,
        },
      },
    });
    if (!current?.selected_line)
      fail("เลือกเส้นและรับโบนัสก่อนไปกระดานถัดไป", 409);
    // Idempotent retry never asks AI to replace an existing board.
    const nextExists =
      index < 3
        ? await prisma.bingo_boards.findUnique({
            where: {
              user_id_month_key_board_index: {
                user_id: BigInt(userId),
                month_key: key,
                board_index: index + 1,
              },
            },
          })
        : null;
    const snapshot =
      index < 3 && !nextExists ? await prepareBoard(userId) : null;
    const data = await withUserLock(userId, async (db) => {
      if (monthKey() !== key)
        fail("เริ่มเดือนใหม่แล้ว กรุณาโหลดกระดานอีกครั้ง", 409);
      const row = await db.bingo_boards.findUnique({
        where: { board_id: current.board_id },
      });
      if (!row.selected_line) fail("ยังไม่ได้รับโบนัส", 409);
      if (row.status === "ACCEPTED") return viewData(db, userId);
      if (row.status !== "ACTIVE") fail("กระดานนี้หมดรอบแล้ว", 409);
      await db.bingo_boards.update({
        where: { board_id: row.board_id },
        data: { status: "ACCEPTED", accepted_at: new Date() },
      });
      if (index < 3) {
        await db.bingo_boards.create({
          data: {
            user_id: BigInt(userId),
            month_key: key,
            board_index: index + 1,
            status: "ACTIVE",
            board_size: 5,
            generated_by_ai: snapshot.source === "AI",
            snapshot: await withActivityBaseline(db, userId, snapshot),
          },
        });
      }
      return viewData(db, userId);
    });
    return res.json({
      success: true,
      message:
        index === 3 ? "ครบ 4 กระดานเดือนนี้แล้ว" : "กระดานถัดไปพร้อมแล้ว",
      data,
    });
  } catch (error) {
    return respondError(res, error);
  }
}

async function setActiveBoard(req, res) {
  try {
    const data = await viewData(prisma, req.user.userId, req.body.boardIndex);
    if (!data.isViewingActiveBoard)
      fail("เริ่มกระดานใหม่ด้วยปุ่มยืนยันกระดานปัจจุบัน", 409);
    return res.json({ success: true, data });
  } catch (error) {
    return respondError(res, error);
  }
}
const progressCell = (_req, res) =>
  res
    .status(403)
    .json({
      success: false,
      error: "ภารกิจอัปเดตจากการชำระเงินหรือบริจาคเท่านั้น",
    });
const resetBoard = (_req, res) =>
  res
    .status(403)
    .json({
      success: false,
      error: "กระดานนี้บันทึกไว้แล้ว ทำภารกิจต่อจากเดิมได้เลย",
    });
const generateBoard = getActiveBoard;

module.exports = {
  BINGO_LINES,
  BINGO_LINE_BONUS_TOKENS,
  calculateBoardYield,
  analyzeBingoLines,
  evaluateQuestIncrement,
  getActiveBoard,
  generateBoard,
  setActiveBoard,
  progressCell,
  resetBoard,
  claimLine,
  acceptBoard,
  ensureCurrentBoard,
  syncActivityInTransaction,
  syncPaymentProgress,
  syncDonationProgress,
  rowToBoard,
};
