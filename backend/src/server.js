require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const { getRuntimeConfig } = require("./config/runtimeConfig");
const runtimeConfig = getRuntimeConfig();
const { startEmailOutboxWorker } = require("./services/emailOutboxService");

async function startServer() {
  if (runtimeConfig.errors.length) {
    for (const error of runtimeConfig.errors) console.error(`Configuration error: ${error}`);
    process.exitCode = 1;
    return;
  }
  await connectDB();
  startEmailOutboxWorker();

  app.listen(runtimeConfig.port, () => {
    console.log(`Backend listening on port ${runtimeConfig.port}`);
  });
}

startServer();
