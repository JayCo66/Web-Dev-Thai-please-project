const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { generateBingoMissionsWithAI } = require('../src/services/questService');
const baseFixture = require('../examples/generate-board.mock.json');

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

describe('questService: generateBingoMissionsWithAI', () => {

  describe('Slice 1: Board Structure & Invariants', () => {
    test('generates exactly 25 cells with center donation tile locked at index 12', async () => {
      const input = clone(baseFixture);
      const result = await generateBingoMissionsWithAI(input);

      assert.equal(result.total_cells, 25);
      assert.equal(result.bingo_board_5x5.length, 25);
      assert.equal(result.total_level, input.board.budget);

      // Verify center tile at position 12
      const centerTile = result.bingo_board_5x5[12];
      assert.equal(centerTile.position, 12);
      assert.equal(centerTile.quest_code, 'DONATION');
      assert.equal(centerTile.family, 'DONATION');
      assert.equal(centerTile.level, null);

      // Verify the other 24 cells
      const nonDonationCells = result.bingo_board_5x5.filter((c) => c.position !== 12);
      assert.equal(nonDonationCells.length, 24);

      // No duplicate quest_code in the other 24 cells
      const codes = new Set(nonDonationCells.map((c) => c.quest_code));
      assert.equal(codes.size, 24);

      // Every normal cell has level between 1 and 3
      for (const cell of nonDonationCells) {
        assert.ok(cell.level >= 1 && cell.level <= 3, `Cell ${cell.quest_code} level out of bounds: ${cell.level}`);
        assert.equal(cell.reason_source, 'SERVER_DATA');
      }

      // Sum of levels must match budget exactly
      const sumLevels = nonDonationCells.reduce((acc, c) => acc + c.level, 0);
      assert.equal(sumLevels, input.board.budget);
    });
  });

  describe('Slice 2: Input Validation & Precondition Rejections', () => {
    test('rejects when budget is outside allowed range (24 - 72)', async () => {
      const inputLow = clone(baseFixture);
      inputLow.board.budget = 20;
      await assert.rejects(
        () => generateBingoMissionsWithAI(inputLow),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /budget สำหรับ 24 ภารกิจระดับ 1–3 ต้องอยู่ระหว่าง 24–72/);
          return true;
        }
      );

      const inputHigh = clone(baseFixture);
      inputHigh.board.budget = 75;
      await assert.rejects(
        () => generateBingoMissionsWithAI(inputHigh),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /budget สำหรับ 24 ภารกิจระดับ 1–3 ต้องอยู่ระหว่าง 24–72/);
          return true;
        }
      );
    });

    test('rejects when budget exceeds maximum possible capacity of eligible quests', async () => {
      const input = clone(baseFixture);
      // Set all quests safe_level to 1, max capacity for 24 cells is 24 * 1 = 24
      input.quests.forEach((q) => { q.safe_level = 1; });
      input.board.budget = 50;

      await assert.rejects(
        () => generateBingoMissionsWithAI(input),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /ระดับรวมสูงสุดที่เลือกได้คือ 24/);
          return true;
        }
      );
    });

    test('rejects when eligible quests with safe_level > 0 is less than 24', async () => {
      const input = clone(baseFixture);
      // Make 10 quests have safe_level = 0, leaving only 21 eligible quests
      for (let i = 0; i < 10; i++) {
        input.quests[i].safe_level = 0;
      }

      await assert.rejects(
        () => generateBingoMissionsWithAI(input),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /ต้องมี quests ที่ safe_level > 0 อย่างน้อย 24 รายการ/);
          return true;
        }
      );
    });

    test('rejects when category_mix sum does not match transactions_last_period', async () => {
      const input = clone(baseFixture);
      input.user_profile.category_mix_last_period = {
        food_drink: 10,
        general_goods: 10,
        other: 0,
      };
      // transactions_last_period is 27, but sum is 20
      input.user_profile.transactions_last_period = 27;

      await assert.rejects(
        () => generateBingoMissionsWithAI(input),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /ผลรวม category_mix ต้องเท่ากับ transactions_last_period/);
          return true;
        }
      );
    });
  });

  describe('Slice 3: Budget Balancing Heuristic via Injected Adapter', () => {
    test('automatically adjusts levels to balance budget when AI returns sum below budget', async () => {
      const input = clone(baseFixture);
      input.board.budget = 63;

      // Provide custom createCompletion that returns all level 1 (sum = 24, budget is 63)
      const selectedCodes = input.quests.slice(0, 24).map((q) => q.quest_code);
      const underBudgetCells = selectedCodes.map((code) => ({
        quest_code: code,
        level: 1,
        reason: 'เป้าหมาย 1 ครั้ง',
      }));

      const fakeCreateCompletion = async () => ({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: JSON.stringify({ cells: underBudgetCells }),
            },
          },
        ],
      });

      const result = await generateBingoMissionsWithAI(input, {
        createCompletion: fakeCreateCompletion,
      });

      assert.equal(result.total_level, 63);
      assert.ok(result.adjusted_cells_count > 0);

      // Verify that target_value matches ladder[level - 1] after adjustment
      const nonDonation = result.bingo_board_5x5.filter((c) => c.position !== 12);
      for (const cell of nonDonation) {
        const originalQuest = input.quests.find((q) => q.quest_code === cell.quest_code);
        assert.equal(cell.target_value, originalQuest.ladder[cell.level - 1]);
        assert.ok(cell.level <= originalQuest.safe_level);
      }
    });
  });

  describe('Slice 4: AI Retry and Fallback Recovery', () => {
    test('retries on first invalid response and succeeds when second response is valid', async () => {
      const input = clone(baseFixture);
      const selectedCodes = input.quests.slice(0, 24).map((q) => q.quest_code);
      const validCells = selectedCodes.map((code) => ({
        quest_code: code,
        level: 2,
        reason: 'ทดสอบ',
      }));

      let callCount = 0;
      const fakeCreateCompletion = async () => {
        callCount++;
        if (callCount === 1) {
          // First response is broken JSON
          return {
            choices: [
              {
                finish_reason: 'stop',
                message: { content: 'INVALID JSON FORMAT {' },
              },
            ],
          };
        }
        // Second response is valid
        return {
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({ cells: validCells }),
              },
            },
          ],
        };
      };

      const result = await generateBingoMissionsWithAI(input, {
        createCompletion: fakeCreateCompletion,
      });

      assert.equal(callCount, 2);
      assert.equal(result.ai_attempts, 2);
      assert.equal(result.total_cells, 25);
    });

    test('fails with status 502 when AI response fails both attempts', async () => {
      const input = clone(baseFixture);

      const fakeCreateCompletion = async () => ({
        choices: [
          {
            finish_reason: 'stop',
            message: { content: 'MALFORMED OUTPUT' },
          },
        ],
      });

      await assert.rejects(
        () => generateBingoMissionsWithAI(input, { createCompletion: fakeCreateCompletion }),
        (err) => {
          assert.equal(err.statusCode, 502);
          assert.match(err.message, /Typhoon ส่ง JSON ที่ parse ไม่ได้/);
          return true;
        }
      );
    });
  });

});
