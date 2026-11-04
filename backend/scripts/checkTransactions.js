require("dotenv").config();

const mongoose = require("mongoose");
const Venue = require("../src/models/Venue");

async function checkTransactions() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured in backend/.env");
  await mongoose.connect(process.env.MONGODB_URI);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const venue = await Venue.findOne({ isActive: true }).select("_id").session(session).lean();
      if (!venue) throw new Error("No active venue is available for the read-only transaction check");
    });
    process.stdout.write("MongoDB accepted a read-only transaction.\n");
  } finally {
    await session.endSession();
    await mongoose.disconnect();
  }
}

checkTransactions().catch(async () => {
  process.stderr.write("MongoDB did not complete the read-only transaction check. Confirm Atlas replica-set/transaction support and network access.\n");
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  process.exitCode = 1;
});
