require("dotenv").config();

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../src/models/User");

async function createAdmin() {
  const { MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  const ADMIN_ROLE = process.env.ADMIN_ROLE || "ADMIN";
  const ADMIN_DEPARTMENT = process.env.ADMIN_DEPARTMENT?.trim() || null;
  const allowDemoPassword = process.env.ADMIN_ALLOW_WEAK_DEMO_PASSWORD === "true"
    && process.env.NODE_ENV !== "production"
    && ADMIN_ROLE === "PRINCIPAL"
    && ADMIN_EMAIL?.trim().toLowerCase() === "1jb24cs172gdg@gmail.com";
  if (!MONGODB_URI || !ADMIN_NAME?.trim() || !ADMIN_EMAIL?.trim() || !ADMIN_PASSWORD) {
    throw new Error("Set MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD before provisioning. Optional: ADMIN_ROLE and ADMIN_DEPARTMENT.");
  }
  if (ADMIN_NAME.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL.trim()) || (ADMIN_PASSWORD.length < 12 && !allowDemoPassword)) {
    throw new Error("Use a name of at least 2 characters, a valid email, and an administrator password of at least 12 characters (except an explicitly enabled local demo Principal).");
  }
  if (!["ADMIN", "PRINCIPAL", "HOD"].includes(ADMIN_ROLE)) throw new Error("ADMIN_ROLE must be ADMIN, PRINCIPAL, or HOD.");
  if (ADMIN_ROLE === "HOD" && !ADMIN_DEPARTMENT) throw new Error("ADMIN_DEPARTMENT is required for an HOD account.");

  await mongoose.connect(MONGODB_URI);
  try {
    const email = ADMIN_EMAIL.trim().toLowerCase();
    const existing = await User.findOne({ email }).select("_id").lean();
    if (existing) throw new Error("An account with that email already exists. No account was changed.");

    const password = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await User.create({ name: ADMIN_NAME.trim(), email, password, role: ADMIN_ROLE, department: ADMIN_DEPARTMENT, isActive: true });
    process.stdout.write(`${ADMIN_ROLE} account created. Clear the provisioning environment variables now.\n`);
    if (allowDemoPassword && ADMIN_PASSWORD.length < 12) process.stdout.write("Warning: the local demo Principal password is weak; replace it before any shared or production use.\n");
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin().catch(async (error) => {
  process.stderr.write(`${error.message}\n`);
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  process.exitCode = 1;
});
