const { test } = require("node:test");
const assert = require("node:assert/strict");
const { faucetTokens } = require("../src/controllers/rewardController");
test("test token endpoint is blocked in production by default and when explicitly disabled", async () => {
  const saved = { ...process.env };
  try {
    for (const config of [
      { NODE_ENV: "production", ENABLE_DEMO_TOOLS: undefined },
      { NODE_ENV: "development", ENABLE_DEMO_TOOLS: "false" },
    ]) {
      process.env.DEMO_MODE = "true";
      process.env.NODE_ENV = config.NODE_ENV;
      if (config.ENABLE_DEMO_TOOLS === undefined)
        delete process.env.ENABLE_DEMO_TOOLS;
      else process.env.ENABLE_DEMO_TOOLS = config.ENABLE_DEMO_TOOLS;
      const res = {
        status(code) {
          this.code = code;
          return this;
        },
        json(body) {
          this.body = body;
          return this;
        },
      };
      await faucetTokens(
        { user: { userId: "1" }, body: { requestId: "test-token-0000001" } },
        res,
      );
      assert.equal(res.code, 403);
      assert.equal(res.body.success, false);
    }
  } finally {
    for (const name of ["DEMO_MODE", "NODE_ENV", "ENABLE_DEMO_TOOLS"])
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
  }
});
