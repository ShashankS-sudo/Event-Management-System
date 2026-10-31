require("dotenv").config();

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../src/models/User");

async function createAdmin() {
  const { MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!MONGODB_URI || !ADMIN_NAME?.trim() || !ADMIN_EMAIL?.trim() || !ADMIN_PASSWORD) {
    throw new Error("Set MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD before provisioning.");
  }
  if (ADMIN_NAME.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL.trim()) || ADMIN_PASSWORD.length < 12) {
    throw new Error("Use a name of at least 2 characters, a valid email, and an administrator password of at least 12 characters.");
  }

  await mongoose.connect(MONGODB_URI);
  try {
    const email = ADMIN_EMAIL.trim().toLowerCase();
    const existing = await User.findOne({ email }).select("_id").lean();
    if (existing) throw new Error("An account with that email already exists. No account was changed.");

    const password = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await User.create({ name: ADMIN_NAME.trim(), email, password, role: "ADMIN", isActive: true });
    process.stdout.write("Administrator account created. Clear the provisioning environment variables now.\n");
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin().catch(async (error) => {
  process.stderr.write(`${error.message}\n`);
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  process.exitCode = 1;
});
