const test = require("node:test");
const assert = require("node:assert/strict");
const { getRuntimeConfig } = require("../src/config/runtimeConfig");

test("uses safe local defaults when valid backend secrets are configured", () => {
  const config = getRuntimeConfig({ MONGODB_URI: "mongodb://localhost/test", JWT_SECRET: "s".repeat(32) });
  assert.deepEqual(config.errors, []);
  assert.deepEqual(config.origins, ["http://localhost:5173"]);
  assert.equal(config.port, 5000);
  assert.equal(config.trustProxy, 0);
});

test("requires explicit CORS origins in production and validates origin format", () => {
  const missing = getRuntimeConfig({ NODE_ENV: "production", MONGODB_URI: "mongodb+srv://cluster", JWT_SECRET: "s".repeat(32) });
  assert.ok(missing.errors.some((error) => /FRONTEND_ORIGIN/.test(error)));
  const invalid = getRuntimeConfig({ NODE_ENV: "production", MONGODB_URI: "mongodb+srv://cluster", JWT_SECRET: "s".repeat(32), FRONTEND_ORIGINS: "https://site.test/path" });
  assert.ok(invalid.errors.some((error) => /valid http/.test(error)));
});

test("rejects weak secrets, invalid ports, and non-numeric proxy hop settings", () => {
  const config = getRuntimeConfig({ MONGODB_URI: "mongodb://localhost/test", JWT_SECRET: "weak", PORT: "70000", TRUST_PROXY: "yes" });
  assert.ok(config.errors.some((error) => /JWT_SECRET/.test(error)));
  assert.ok(config.errors.some((error) => /PORT/.test(error)));
  assert.ok(config.errors.some((error) => /TRUST_PROXY/.test(error)));
});
