const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { generateBingoMissionsWithAI, arrangeFairBoardLayout } = require('../src/services/questService');
const baseFixture = require('../examples/generate-board.mock.json');

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

describe('Fairness Engine: Constrained Layout & Dual-Action Center (ADR-0003)', () => {

  describe('Constrained Layout Algorithm', () => {
    test('arranges 24 cells around position 12 with balanced line difficulty', () => {
      // 15 cells level 3, 9 cells level 2 (sum = 63)
      const normalCells = Array.from({ length: 15 }, (_, i) => ({ quest_code: `Q3_${i}`, level: 3 }))
        .concat(Array.from({ length: 9 }, (_, i) => ({ quest_code: `Q2_${i}`, level: 2 })));
      const centerCell = { quest_code: 'COMMUNITY_OR_DONATION', level: null };

      const grid = arrangeFairBoardLayout(normalCells, centerCell);

      assert.equal(grid.length, 25);
      assert.equal(grid[12].quest_code, 'COMMUNITY_OR_DONATION');

      // Check all 5 rows
      for (let r = 0; r < 5; r++) {
        const rowCells = grid.slice(r * 5, r * 5 + 5);
        const normalInRow = rowCells.filter((c, i) => r * 5 + i !== 12);
        const rowSum = normalInRow.reduce((acc, c) => acc + c.level, 0);

        if (r === 2) {
          // Row 2 contains center tile, 4 normal cells should sum to 10-12
          assert.ok(rowSum >= 9 && rowSum <= 12, `Row 2 sum ${rowSum} out of bounds`);
        } else {
          // Rows 0, 1, 3, 4 should sum between 12 and 14
          assert.ok(rowSum >= 12 && rowSum <= 14, `Row ${r} sum ${rowSum} out of bounds`);
        }
      }

      // Check all 5 columns
      for (let c = 0; c < 5; c++) {
        let colSum = 0;
        for (let r = 0; r < 5; r++) {
          const idx = r * 5 + c;
          if (idx !== 12) colSum += grid[idx].level;
        }

        if (c === 2) {
          // Col 2 contains center tile
          assert.ok(colSum >= 9 && colSum <= 12, `Col 2 sum ${colSum} out of bounds`);
        } else {
          assert.ok(colSum >= 12 && colSum <= 14, `Col ${c} sum ${colSum} out of bounds`);
        }
      }
    });

    test('generateBingoMissionsWithAI produces constrained balanced lines across whole board', async () => {
      const input = clone(baseFixture);
      const result = await generateBingoMissionsWithAI(input);

      assert.equal(result.total_cells, 25);
      const cells = result.bingo_board_5x5;

      // Verify Center Tile (position 12) is inclusive Dual-Action
      const center = cells[12];
      assert.equal(center.position, 12);
      assert.match(center.title, /บริจาค|ชุมชน/);

      // Verify line difficulty balance across all 5 rows
      for (let r = 0; r < 5; r++) {
        const rowCells = cells.slice(r * 5, r * 5 + 5);
        const normalCells = rowCells.filter((c) => c.position !== 12);
        const rowSum = normalCells.reduce((acc, c) => acc + c.level, 0);

        if (r === 2) {
          assert.ok(rowSum >= 9 && rowSum <= 12, `Row 2 sum ${rowSum} out of range`);
        } else {
          assert.ok(rowSum >= 12 && rowSum <= 14, `Row ${r} sum ${rowSum} out of range`);
        }
      }
    });
  });

});
