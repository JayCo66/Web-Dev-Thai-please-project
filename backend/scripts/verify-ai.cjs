const assert = require("node:assert/strict");
const http = require("node:http");
process.env.TYPHOON_API_KEY = "local-simulation-only";
process.env.TYPHOON_BASE_URL = "http://127.0.0.1:5093/typhoon/v1";
process.env.TYPHOON_TIMEOUT_MS = "500";
const root = require("node:path").resolve(__dirname, "../..");
const { generateBingoMissionsWithAI } = require(
  root + "/backend/src/services/questService",
);
const input = require(root + "/backend/examples/generate-board.mock.json");
function request(path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      "http://127.0.0.1:5093/typhoon" + path,
      {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        agent: new http.Agent(),
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(JSON.parse(data)));
      },
    );
    req.on("error", reject);
    req.end(body ? JSON.stringify(body) : undefined);
  });
}
(async () => {
  for (const mode of ["success", "rate_limit", "malformed", "timeout"]) {
    await request("/__control", { scenario: mode });
    const board = await generateBingoMissionsWithAI(structuredClone(input));
    const stats = await request("/__stats");
    assert.equal(board.source, mode === "success" ? "AI" : "RULE_BASED", mode);
    assert.equal(
      stats.requests,
      mode === "malformed" ? 2 : 1,
      mode + " request count",
    );
    assert.equal(board.total_cells, 25);
    assert.equal(
      board.difficultyMix.easy + board.difficultyMix.medium + board.difficultyMix.hard,
      24,
    );
    assert.equal(board.personalizationEvidence.selectionAudit.checks.valid24UniqueCatalogMissions, true);
    if (mode === "success") {
      assert.equal(board.source, "AI");
      const finalLevels = new Map(
        board.bingo_board_5x5
          .filter((cell) => cell.family !== "DONATION")
          .map((cell) => [cell.quest_code, cell.level]),
      );
      for (const proposed of board.aiEvidence.selectedQuests)
        assert.equal(finalLevels.get(proposed.quest_code), proposed.level);
    }
    console.log(
      JSON.stringify({
        scenario: mode,
        source: board.source,
        httpRequests: stats.requests,
        difficultyMix: board.difficultyMix,
        selectionAudit: board.personalizationEvidence.selectionAudit.checks,
      }),
    );
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
