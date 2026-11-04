const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const User = require("../src/models/User");
const { register } = require("../src/controllers/authController");

test("register creates a customer session cookie for immediate sign-in", async (t) => {
  const originalFindOne = User.findOne;
  const originalCreate = User.create;
  const originalSecret = process.env.JWT_SECRET;
  const createdUser = {
    _id: new mongoose.Types.ObjectId(),
    name: "New Customer",
    email: "new.customer@example.com",
    role: "CUSTOMER",
    department: undefined,
  };
  let cookie;
  let responseBody;
  User.findOne = async () => null;
  User.create = async () => createdUser;
  process.env.JWT_SECRET = "test-jwt-secret-for-registration";
  t.after(() => {
    User.findOne = originalFindOne;
    User.create = originalCreate;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  const res = {
    status(code) { this.statusCode = code; return this; },
    cookie(name, value, options) { cookie = { name, value, options }; return this; },
    json(body) { responseBody = body; return this; },
  };
  await register({ body: { name: "New Customer", email: "new.customer@example.com", password: "password-123" } }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(responseBody.success, true);
  assert.equal(responseBody.user.role, "CUSTOMER");
  assert.equal(cookie.name, "token");
  assert.equal(cookie.options.httpOnly, true);
  assert.ok(cookie.value);
});
