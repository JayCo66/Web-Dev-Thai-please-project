const path = require('path');
const prisma = require('../config/prisma');
const { generateBingoMissionsWithAI } = require('../services/questService');
const { getUserTotalTokens } = require('../services/authService');

// All 12 possible Bingo lines in a 5x5 board
const BINGO_LINES = [
  // 5 Rows
  { id: 'R1', type: 'ROW', name: 'แนวนอนแถวที่ 1', positions: [0, 1, 2, 3, 4] },
  { id: 'R2', type: 'ROW', name: 'แนวนอนแถวที่ 2', positions: [5, 6, 7, 8, 9] },
  { id: 'R3', type: 'ROW', name: 'แนวนอนแถวที่ 3 (ผ่านใจกลาง)', positions: [10, 11, 12, 13, 14] },
  { id: 'R4', type: 'ROW', name: 'แนวนอนแถวที่ 4', positions: [15, 16, 17, 18, 19] },
  { id: 'R5', type: 'ROW', name: 'แนวนอนแถวที่ 5', positions: [20, 21, 22, 23, 24] },
  // 5 Columns
  { id: 'C1', type: 'COL', name: 'แนวตั้งแถวที่ 1', positions: [0, 5, 10, 15, 20] },
  { id: 'C2', type: 'COL', name: 'แนวตั้งแถวที่ 2', positions: [1, 6, 11, 16, 21] },
  { id: 'C3', type: 'COL', name: 'แนวตั้งแถวที่ 3 (ผ่านใจกลาง)', positions: [2, 7, 12, 17, 22] },
  { id: 'C4', type: 'COL', name: 'แนวตั้งแถวที่ 4', positions: [3, 8, 13, 18, 23] },
  { id: 'C5', type: 'COL', name: 'แนวตั้งแถวที่ 5', positions: [4, 9, 14, 19, 24] },
  // 2 Diagonals
  { id: 'D1', type: 'DIAG', name: 'แนวทแยงซ้ายไปขวา (＼)', positions: [0, 6, 12, 18, 24] },
  { id: 'D2', type: 'DIAG', name: 'แนวทแยงขวาไปซ้าย (／)', positions: [4, 8, 12, 16, 20] },
];

/**
 * Helper to check lines status
 */
function analyzeBingoLines(cells) {
  const completedPosSet = new Set(
    cells.filter((c) => c.status === 'COMPLETED' || c.status === 'CLAIMED').map((c) => c.position)
  );

  return BINGO_LINES.map((line) => {
    const completedCount = line.positions.filter((pos) => completedPosSet.has(pos)).length;
    const isCompleted = completedCount === 5;
    return {
      ...line,
      completedCount,
      isCompleted,
      progressPercent: Math.round((completedCount / 5) * 100),
    };
  });
}

/**
 * Load default mock data from examples
 */
function getDefaultMockInput() {
  try {
    const mockPath = path.resolve(__dirname, '../../examples/generate-board.mock.json');
    return require(mockPath);
  } catch (err) {
    console.error('Error loading default mock input:', err);
    return null;
  }
}

/**
 * Monthly store for the 4 fixed boards per user
 * Key: `${userId}-${yearMonth}` -> Array of 4 boards
 */
const userMonthlyBoardsStore = new Map();

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7); // e.g. "2026-10"
}

/**
 * Titles and themes for the 4 monthly boards
 */
const BOARD_THEMES = [
  {
    title: 'ตารางที่ 1: การใช้จ่ายและชีวิตประจำวัน',
    subtitle: 'ภารกิจกิจกรรมการใช้จ่ายทั่วไปและยอดซื้อพื้นฐาน',
    theme: 'ACTIVITY',
  },
  {
    title: 'ตารางที่ 2: ความหลากหลายและร้านค้าชุมชน',
    subtitle: 'สนับสนุนร้านค้าหลากหลายประเภท กระจายรายได้สู่ชุมชน',
    theme: 'VARIETY',
  },
  {
    title: 'ตารางที่ 3: ช่วงเวลาและวันสร้างสรรค์',
    subtitle: 'ภารกิจมื้อเช้า มื้อบ่าย และวันธรรมดา',
    theme: 'TIME',
  },
  {
    title: 'ตารางที่ 4: ยอดสะสมและพลังใจฟูเพื่อสังคม',
    subtitle: 'ยอดสะสมคนละครึ่ง พร้อมภารกิจบริจาคเพื่อสังคม',
    theme: 'SPEND',
  },
];

/**
 * Generate 4 distinct 5x5 boards for a citizen user for the current month
 * STRICT INDEPENDENCE RULE:
 * - Each board has its own completely isolated 25 cells.
 * - Board 0 starts as 'ACTIVE'.
 * - Boards 1, 2, 3 start as 'ACCEPTED' with progress = 0 on ALL cells!
 * - When user switches active board, duplicate quests start FRESH at 0!
 */
async function generateFourMonthlyBoards(userId, monthKey) {
  const baseMock = getDefaultMockInput();
  const boards = [];

  // Check or register boards in MySQL database
  let dbBoards = [];
  try {
    dbBoards = await prisma.bingo_boards.findMany({
      where: { user_id: BigInt(userId) },
      orderBy: { board_id: 'asc' },
    });

    if (dbBoards.length === 0) {
      for (let i = 0; i < 4; i++) {
        const created = await prisma.bingo_boards.create({
          data: {
            user_id: BigInt(userId),
            board_size: 5,
            status: i === 0 ? 'ACTIVE' : 'ACCEPTED',
            generated_by_ai: true,
          },
        });
        dbBoards.push(created);
      }
    }
  } catch (dbErr) {
    console.warn('DB bingo_boards query warning:', dbErr.message);
  }

  for (let i = 0; i < 4; i++) {
    const themeInfo = BOARD_THEMES[i];
    const clonedInput = JSON.parse(JSON.stringify(baseMock));
    const offset = i * 4;
    clonedInput.quests = [
      ...clonedInput.quests.slice(offset),
      ...clonedInput.quests.slice(0, offset),
    ];

    const generated = await generateBingoMissionsWithAI(clonedInput);

    // Initial cells: ALL start at progress 0, status IN_PROGRESS
    const cells = generated.bingo_board_5x5.map((c) => {
      const isDonation = c.family === 'DONATION' || c.position === 12;
      const tokenReward = isDonation ? 50 : (c.level || 1) * 10;

      return {
        position: c.position,
        row: Math.floor(c.position / 5),
        col: c.position % 5,
        quest_code: isDonation ? 'DONATION' : c.quest_code,
        family: isDonation ? 'DONATION' : c.family,
        unit: isDonation ? 'ครั้ง' : c.unit,
        level: isDonation ? 1 : c.level,
        target_value: isDonation ? 1 : c.target_value,
        progress: 0,
        status: 'IN_PROGRESS',
        token_reward: tokenReward,
        title: isDonation ? 'บริจาคให้มูลนิธิ 1 ครั้ง' : c.title,
        reason: isDonation ? 'ร่วมบริจาคช่วยเหลือสังคมผ่าน e-Donation ไม่นับรวม budget' : c.reason,
        reason_source: isDonation ? 'SERVER_DATA' : (c.reason_source || 'AI_TYPHOON'),
        level_adjusted: c.level_adjusted || false,
      };
    });

    const lines = analyzeBingoLines(cells);
    const initialStatus = dbBoards[i]?.status || (i === 0 ? 'ACTIVE' : 'ACCEPTED');

    boards.push({
      boardId: dbBoards[i]?.board_id ? dbBoards[i].board_id.toString() : `BOARD-${userId}-${monthKey}-T${i + 1}`,
      boardIndex: i,
      title: themeInfo.title,
      subtitle: themeInfo.subtitle,
      theme: themeInfo.theme,
      userId,
      periodDays: 30,
      budget: generated.budget || 63,
      totalCells: 25,
      period: generated.period,
      status: initialStatus,
      activatedAt: initialStatus === 'ACTIVE' ? new Date().toISOString() : null,
      cells,
      lines,
      bingoCount: 0,
      completedCellsCount: 0,
    });
  }

  // Populate Board 0 initial progress from past user activities if available
  try {
    const donations = await prisma.donations.findMany({ where: { user_id: BigInt(userId) } });
    const txs = await prisma.transactions.findMany({ where: { user_id: BigInt(userId), status: 'COMPLETED' }, include: { shops: true } });

    const b0 = boards[0];
    if (donations.length > 0) {
      const donCell = b0.cells.find((c) => c.position === 12);
      if (donCell) {
        donCell.progress = donations.length;
        if (donCell.progress >= donCell.target_value) {
          donCell.status = 'COMPLETED';
          donCell.completed_at = donations[donations.length - 1].donated_at;
        }
      }
    }

    if (txs.length > 0) {
      const txCell = b0.cells.find((c) => c.quest_code === 'TX_COUNT_ANY');
      if (txCell) {
        txCell.progress = txs.length;
        if (txCell.progress >= txCell.target_value) txCell.status = 'COMPLETED';
      }
    }

    b0.lines = analyzeBingoLines(b0.cells);
    b0.bingoCount = b0.lines.filter((l) => l.isCompleted).length;
    b0.completedCellsCount = b0.cells.filter((c) => c.status === 'COMPLETED').length;
  } catch (err) {
    console.warn('Initial b0 sync warning:', err.message);
  }

  return boards;
}

/**
 * Get or initialize the 4 monthly boards for a user
 */
async function getOrInitializeUserBoards(userId, monthKey = getCurrentMonthKey()) {
  const storeKey = `${userId}-${monthKey}`;
  let boards = userMonthlyBoardsStore.get(storeKey);
  if (!boards) {
    boards = await generateFourMonthlyBoards(userId, monthKey);
    userMonthlyBoardsStore.set(storeKey, boards);
  }
  return boards;
}

/**
 * Real-time event hook: called when user makes a donation.
 * STRICT ISOLATION RULE:
 * - Updates ONLY the currently ACTIVE board!
 * - Other boards (ACCEPTED or COMPLETED) are NEVER updated.
 * - Even duplicate donation quests on other boards start at 0 and require fresh donations.
 */
async function syncDonationProgress(userId, donationAmount, donationId) {
  const monthKey = getCurrentMonthKey();
  const boards = await getOrInitializeUserBoards(userId, monthKey);

  // Find currently active board ONLY
  const activeBoard = boards.find((b) => b.status === 'ACTIVE') || boards[0];

  const oldCompletedLines = activeBoard.lines.filter((l) => l.isCompleted).length;
  let newlyCompletedCell = null;
  let tokensAwarded = 0;

  // Find donation cell on the active board
  const donationCell = activeBoard.cells.find((c) => c.family === 'DONATION' || c.position === 12);
  if (donationCell) {
    const oldStatus = donationCell.status;
    donationCell.progress += 1;
    if (donationCell.progress >= donationCell.target_value) {
      donationCell.status = 'COMPLETED';
      donationCell.completed_at = new Date().toISOString();
    }

    if (oldStatus !== 'COMPLETED' && donationCell.status === 'COMPLETED') {
      newlyCompletedCell = donationCell;
      tokensAwarded = donationCell.token_reward;
      try {
        await prisma.token_transactions.create({
          data: {
            user_id: BigInt(userId),
            amount: tokensAwarded,
            type: 'EARN_CELL',
            board_id: activeBoard.boardId && !isNaN(activeBoard.boardId) ? BigInt(activeBoard.boardId) : null,
          },
        });
      } catch (err) {
        console.warn('Token award warning:', err.message);
      }
    }
  }

  // Re-check lines on the active board
  activeBoard.lines = analyzeBingoLines(activeBoard.cells);
  const newCompletedLines = activeBoard.lines.filter((l) => l.isCompleted).length;
  activeBoard.bingoCount = newCompletedLines;
  activeBoard.completedCellsCount = activeBoard.cells.filter((c) => c.status === 'COMPLETED').length;

  let bingoBonusTokens = 0;
  if (newCompletedLines > oldCompletedLines) {
    const lineDiff = newCompletedLines - oldCompletedLines;
    bingoBonusTokens = lineDiff * 100;
    try {
      await prisma.token_transactions.create({
        data: {
          user_id: BigInt(userId),
          amount: bingoBonusTokens,
          type: 'EARN_LINE',
          board_id: activeBoard.boardId && !isNaN(activeBoard.boardId) ? BigInt(activeBoard.boardId) : null,
        },
      });
    } catch (err) {
      console.warn('Line bonus token warning:', err.message);
    }
  }

  // Save back to store
  const storeKey = `${userId}-${monthKey}`;
  userMonthlyBoardsStore.set(storeKey, boards);

  return {
    success: true,
    message: `อัปเดตภารกิจบริจาคบน "${activeBoard.title.split(':')[0]}" (Active) สำเร็จ`,
    activeBoardIndex: activeBoard.boardIndex,
    newlyCompleted: !!newlyCompletedCell,
    donationProgress: donationCell ? `${donationCell.progress}/${donationCell.target_value}` : '1/1',
    boardsSummary: boards.map((b) => ({
      boardIndex: b.boardIndex,
      title: b.title,
      status: b.status,
      completedCells: b.completedCellsCount,
      bingoCount: b.bingoCount,
    })),
  };
}

/**
 * Real-time event hook: called when user makes a payment transaction.
 * STRICT ISOLATION RULE:
 * - Updates ONLY the currently ACTIVE board!
 * - Other boards (ACCEPTED or COMPLETED) are NEVER updated.
 */
async function syncPaymentProgress(userId, transaction) {
  const monthKey = getCurrentMonthKey();
  const boards = await getOrInitializeUserBoards(userId, monthKey);

  // Find currently active board ONLY
  const activeBoard = boards.find((b) => b.status === 'ACTIVE') || boards[0];

  const oldCompletedLines = activeBoard.lines.filter((l) => l.isCompleted).length;
  let newlyCompletedCount = 0;
  let totalCellTokensAwarded = 0;

  const totalAmount = Number(transaction.total_amount || 0);
  const shopCat = (transaction.shops?.category || '').toLowerCase();
  const isFood = shopCat.includes('food') || shopCat.includes('อาหาร') || shopCat.includes('เครื่องดื่ม') || shopCat.includes('cafe');
  const isGoods = !isFood;
  const paidHour = new Date(transaction.paid_at || Date.now()).getHours();
  const paidDay = new Date(transaction.paid_at || Date.now()).getDay();
  const isMorning = paidHour < 11;
  const isLunch = paidHour >= 11 && paidHour < 14;
  const isAfternoon = paidHour >= 14 && paidHour < 18;
  const isWeekday = paidDay >= 1 && paidDay <= 5;
  const isWeekend = paidDay === 0 || paidDay === 6;

  for (const cell of activeBoard.cells) {
    if (cell.status === 'COMPLETED') continue;

    let increment = 0;
    if (cell.quest_code === 'TX_COUNT_ANY') {
      increment = 1;
    } else if (cell.quest_code === 'SPEND_TOTAL_ANY') {
      increment = Math.floor(totalAmount);
    } else if (cell.quest_code === 'CATEGORY_COUNT_FD' || cell.quest_code === 'FD_ANY') {
      if (isFood) increment = 1;
    } else if (cell.quest_code === 'CATEGORY_COUNT_GD' || cell.quest_code === 'GD_ANY') {
      if (isGoods) increment = 1;
    } else if (cell.quest_code === 'DAYPART_MORNING' || cell.quest_code === 'FD_MORNING') {
      if (isMorning) increment = 1;
    } else if (cell.quest_code === 'DAYPART_LUNCH' || cell.quest_code === 'FD_LUNCH') {
      if (isLunch) increment = 1;
    } else if (cell.quest_code === 'DAYPART_AFTERNOON' || cell.quest_code === 'FD_AFTERNOON') {
      if (isAfternoon) increment = 1;
    } else if (cell.quest_code === 'WEEKDAY_COUNT' || cell.quest_code === 'GD_WEEKDAY') {
      if (isWeekday) increment = 1;
    } else if (cell.quest_code === 'WEEKEND_COUNT') {
      if (isWeekend) increment = 1;
    } else if (cell.quest_code === 'SINGLE_TICKET_ANY') {
      if (totalAmount >= cell.target_value) {
        cell.progress = cell.target_value;
      }
    } else if (cell.quest_code === 'DISTINCT_MERCHANTS_ANY') {
      increment = 1;
    }

    if (increment > 0) {
      cell.progress = Math.min(cell.target_value, cell.progress + increment);
    }

    if (cell.progress >= cell.target_value) {
      cell.status = 'COMPLETED';
      cell.completed_at = new Date().toISOString();
      newlyCompletedCount += 1;
      totalCellTokensAwarded += cell.token_reward;

      try {
        await prisma.token_transactions.create({
          data: {
            user_id: BigInt(userId),
            amount: cell.token_reward,
            type: 'EARN_CELL',
            board_id: activeBoard.boardId && !isNaN(activeBoard.boardId) ? BigInt(activeBoard.boardId) : null,
          },
        });
      } catch (err) {
        console.warn('Token award warning:', err.message);
      }
    }
  }

  // Refresh lines analysis for active board
  activeBoard.lines = analyzeBingoLines(activeBoard.cells);
  const newCompletedLines = activeBoard.lines.filter((l) => l.isCompleted).length;
  activeBoard.bingoCount = newCompletedLines;
  activeBoard.completedCellsCount = activeBoard.cells.filter((c) => c.status === 'COMPLETED').length;

  let bingoBonusTokens = 0;
  if (newCompletedLines > oldCompletedLines) {
    const lineDiff = newCompletedLines - oldCompletedLines;
    bingoBonusTokens = lineDiff * 100;
    try {
      await prisma.token_transactions.create({
        data: {
          user_id: BigInt(userId),
          amount: bingoBonusTokens,
          type: 'EARN_LINE',
          board_id: activeBoard.boardId && !isNaN(activeBoard.boardId) ? BigInt(activeBoard.boardId) : null,
        },
      });
    } catch (err) {
      console.warn('Line bonus token warning:', err.message);
    }
  }

  // Save back to store
  const storeKey = `${userId}-${monthKey}`;
  userMonthlyBoardsStore.set(storeKey, boards);

  return {
    success: true,
    message: `อัปเดตภารกิจการใช้จ่ายบน "${activeBoard.title.split(':')[0]}" (Active) สำเร็จ`,
    activeBoardIndex: activeBoard.boardIndex,
    newlyCompletedCount,
    tokensAwarded: totalCellTokensAwarded,
    bingoBonusTokens,
    boardsSummary: boards.map((b) => ({
      boardIndex: b.boardIndex,
      title: b.title,
      status: b.status,
      completedCells: b.completedCellsCount,
      bingoCount: b.bingoCount,
    })),
  };
}

/**
 * POST /api/v1/quests/set-active
 * Enforce rule: Exactly 1 board can be ACTIVE at any time!
 * Switches active board for the user and sets others to ACCEPTED.
 * CRITICAL: Progress on other boards is preserved and NEVER leaked to the newly activated board.
 */
async function setActiveBoard(req, res) {
  try {
    const userId = req.user?.userId ? req.user.userId.toString() : '1';
    const { boardIndex } = req.body;
    const bIndex = Math.max(0, Math.min(3, parseInt(boardIndex, 10)));

    const monthKey = getCurrentMonthKey();
    const boards = await getOrInitializeUserBoards(userId, monthKey);

    // Update statuses: Only the chosen index is ACTIVE, others are ACCEPTED (or COMPLETED)
    boards.forEach((b, idx) => {
      if (idx === bIndex) {
        b.status = 'ACTIVE';
        if (!b.activatedAt) {
          b.activatedAt = new Date().toISOString();
        }
      } else {
        if (b.status === 'ACTIVE') {
          b.status = 'ACCEPTED';
        }
      }
    });

    // Also persist status update in MySQL database if rows exist
    try {
      const dbBoards = await prisma.bingo_boards.findMany({
        where: { user_id: BigInt(userId) },
        orderBy: { board_id: 'asc' },
      });

      if (dbBoards.length > 0) {
        await prisma.bingo_boards.updateMany({
          where: { user_id: BigInt(userId), status: 'ACTIVE' },
          data: { status: 'ACCEPTED' },
        });

        if (dbBoards[bIndex]) {
          await prisma.bingo_boards.update({
            where: { board_id: dbBoards[bIndex].board_id },
            data: { status: 'ACTIVE' },
          });
        }
      }
    } catch (dbErr) {
      console.warn('Could not update prisma.bingo_boards status:', dbErr.message);
    }

    const storeKey = `${userId}-${monthKey}`;
    userMonthlyBoardsStore.set(storeKey, boards);

    return res.json({
      success: true,
      message: `เปลี่ยนเป็น "${boards[bIndex].title.split(':')[0]}" เป็นตาราง Active เรียบร้อยแล้ว (ภารกิจแยกจากตารางอื่น)`,
      data: {
        activeBoardIndex: bIndex,
        boardsSummary: boards.map((b) => ({
          boardIndex: b.boardIndex,
          boardId: b.boardId,
          title: b.title,
          subtitle: b.subtitle,
          status: b.status,
          completedCells: b.completedCellsCount,
          bingoCount: b.bingoCount,
          progressPercent: Math.round((b.completedCellsCount / 25) * 100),
        })),
        currentBoard: boards[bIndex],
      },
    });
  } catch (error) {
    console.error('Error in setActiveBoard:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการเปลี่ยนตาราง Active',
    });
  }
}

/**
 * GET /api/v1/quests/active-board
 * Serves citizen's monthly boards with clear indication of the ONE active board
 */
async function getActiveBoard(req, res) {
  try {
    const userId = req.user?.userId ? req.user.userId.toString() : '1';
    const monthKey = getCurrentMonthKey();

    const boards = await getOrInitializeUserBoards(userId, monthKey);

    // Find currently active board index
    const activeIndex = boards.findIndex((b) => b.status === 'ACTIVE');
    const realActiveIndex = activeIndex >= 0 ? activeIndex : 0;

    // Requested view index (user can view any board, but only one is ACTIVE)
    const viewIndex = req.query.boardIndex !== undefined
      ? Math.max(0, Math.min(3, parseInt(req.query.boardIndex, 10)))
      : realActiveIndex;

    const currentBoard = boards[viewIndex] || boards[0];

    // Get current total tokens
    let currentTokens = 0;
    try {
      currentTokens = await getUserTotalTokens(userId);
    } catch {
      currentTokens = 50;
    }

    // Summary of all 4 boards
    const boardsSummary = boards.map((b) => ({
      boardIndex: b.boardIndex,
      boardId: b.boardId,
      title: b.title,
      subtitle: b.subtitle,
      theme: b.theme,
      status: b.status, // 'ACTIVE' or 'ACCEPTED'
      isActive: b.status === 'ACTIVE',
      completedCells: b.cells.filter((c) => c.status === 'COMPLETED').length,
      totalCells: 25,
      bingoCount: b.bingoCount,
      progressPercent: Math.round((b.cells.filter((c) => c.status === 'COMPLETED').length / 25) * 100),
      budget: b.budget,
    }));

    return res.json({
      success: true,
      data: {
        month: monthKey,
        monthName: 'ตุลาคม 2569',
        totalBoards: 4,
        activeBoardIndex: realActiveIndex, // The ONE currently active board
        selectedBoardIndex: viewIndex,     // The board currently being viewed
        isViewingActiveBoard: currentBoard.status === 'ACTIVE',
        boardsSummary,
        currentBoard,
        userTokens: currentTokens,
      },
    });
  } catch (error) {
    console.error('Error in getActiveBoard:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลกระดานบิงโก',
    });
  }
}

/**
 * POST /api/v1/quests/progress
 * Interactive progress simulator for testing on the viewed board
 */
async function progressCell(req, res) {
  try {
    const userId = req.user?.userId ? req.user.userId.toString() : '1';
    const { position, increment = 1, markComplete = false, boardIndex = 0 } = req.body;

    const bIndex = Math.max(0, Math.min(3, parseInt(boardIndex, 10)));
    const pos = parseInt(position, 10);
    if (isNaN(pos) || pos < 0 || pos > 24) {
      return res.status(400).json({ success: false, error: 'ตำแหน่งช่องบิงโกต้องอยู่ระหว่าง 0 ถึง 24' });
    }

    const monthKey = getCurrentMonthKey();
    const boards = await getOrInitializeUserBoards(userId, monthKey);
    const board = boards[bIndex];

    const cell = board.cells.find((c) => c.position === pos);
    if (!cell) {
      return res.status(404).json({ success: false, error: 'ไม่พบช่องบิงโกที่ระบุ' });
    }

    const oldLinesCompleted = analyzeBingoLines(board.cells).filter((l) => l.isCompleted).length;

    if (markComplete) {
      cell.progress = cell.target_value;
      cell.status = 'COMPLETED';
      cell.completed_at = new Date().toISOString();
    } else {
      cell.progress = Math.min(cell.target_value, cell.progress + parseInt(increment, 10));
      if (cell.progress >= cell.target_value) {
        cell.status = 'COMPLETED';
        cell.completed_at = new Date().toISOString();
      }
    }

    // Grant tokens if completed
    let tokensAwarded = 0;
    if (cell.status === 'COMPLETED') {
      tokensAwarded = cell.token_reward;
      try {
        await prisma.token_transactions.create({
          data: {
            user_id: BigInt(userId),
            amount: tokensAwarded,
            type: 'EARN_CELL',
            board_id: board.boardId && !isNaN(board.boardId) ? BigInt(board.boardId) : null,
          },
        });
      } catch (err) {
        console.warn('DB token transaction warning:', err.message);
      }
    }

    // Check newly formed Bingo Lines
    const newLines = analyzeBingoLines(board.cells);
    const newLinesCompleted = newLines.filter((l) => l.isCompleted).length;
    let bingoBonusTokens = 0;

    if (newLinesCompleted > oldLinesCompleted) {
      const diff = newLinesCompleted - oldLinesCompleted;
      bingoBonusTokens = diff * 100;

      try {
        await prisma.token_transactions.create({
          data: {
            user_id: BigInt(userId),
            amount: bingoBonusTokens,
            type: 'EARN_LINE',
            board_id: board.boardId && !isNaN(board.boardId) ? BigInt(board.boardId) : null,
          },
        });
      } catch (err) {
        console.warn('DB token transaction warning:', err.message);
      }
    }

    board.lines = newLines;
    board.bingoCount = newLinesCompleted;
    board.completedCellsCount = board.cells.filter((c) => c.status === 'COMPLETED').length;

    const updatedTokens = await getUserTotalTokens(userId);

    return res.json({
      success: true,
      message: cell.status === 'COMPLETED' ? `ภารกิจ "${cell.title}" สำเร็จ! รับ +${tokensAwarded} Tokens` : `อัปเดตความคืบหน้าสำเร็จ (${cell.progress}/${cell.target_value})`,
      data: {
        cell,
        boardIndex: bIndex,
        isBingo: newLinesCompleted > oldLinesCompleted,
        newBingoLinesCount: newLinesCompleted,
        tokensAwarded,
        bingoBonusTokens,
        userTokens: updatedTokens,
        boardLines: newLines,
      },
    });
  } catch (error) {
    console.error('Error in progressCell:', error);
    return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการบันทึกความคืบหน้าภารกิจ' });
  }
}

/**
 * Preview board generator for AI testing
 */
async function generateBoard(req, res) {
  try {
    let input = req.body;
    if (!input || Object.keys(input).length === 0 || !input.user_profile) {
      input = getDefaultMockInput();
    }
    const data = await generateBingoMissionsWithAI(input);
    return res.status(200).json({ success: true, message: 'สร้างกระดานบิงโกสำเร็จ (preview)', data });
  } catch (error) {
    console.error('Error in generateBoard:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      error: status === 500 ? 'เกิดข้อผิดพลาดในการสร้างกระดาน' : error.message,
    });
  }
}

/**
 * Disallow arbitrary reset: 4 boards are fixed per citizen per month
 */
async function resetBoard(req, res) {
  return res.status(403).json({
    success: false,
    error: 'ระบบไม่อนุญาตให้สุ่มภารกิจใหม่ ผู้ใช้ประชาชนจะได้รับภารกิจคงที่ 4 ตารางต่อเดือนเพื่อความเท่าเทียม',
  });
}

module.exports = {
  generateBoard,
  getActiveBoard,
  setActiveBoard,
  progressCell,
  resetBoard,
  syncDonationProgress,
  syncPaymentProgress,
};
