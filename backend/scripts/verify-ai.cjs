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
    assert.ok(board.difficultyMix.easy >= 12);
    assert.equal(board.total_cells, 25);
    console.log(
      JSON.stringify({
        scenario: mode,
        source: board.source,
        httpRequests: stats.requests,
        difficultyMix: board.difficultyMix,
      }),
    );
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
