function getRuntimeConfig(env = process.env) {
  const errors = [];
  if (!env.MONGODB_URI?.trim()) errors.push("MONGODB_URI must be configured");
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) errors.push("JWT_SECRET must contain at least 32 characters");

  const configuredOrigins = env.FRONTEND_ORIGINS || env.FRONTEND_ORIGIN || (env.NODE_ENV === "production" ? "" : "http://localhost:5173");
  const origins = configuredOrigins.split(",").map((origin) => origin.trim()).filter(Boolean);
  if (origins.length === 0) errors.push("Set FRONTEND_ORIGIN or FRONTEND_ORIGINS before starting in production");
  for (const origin of origins) {
    try {
      const parsed = new URL(origin);
      if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin) errors.push("Frontend origins must be valid http(s) origins without a path");
    } catch { errors.push("Frontend origins must be valid http(s) origins without a path"); }
  }

  const port = Number(env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push("PORT must be an integer between 1 and 65535");
  const trustProxy = env.TRUST_PROXY == null || env.TRUST_PROXY === "" ? 0 : Number(env.TRUST_PROXY);
  if (!Number.isInteger(trustProxy) || trustProxy < 0) errors.push("TRUST_PROXY must be a non-negative integer hop count");

  return { errors, origins, port, trustProxy };
}

module.exports = { getRuntimeConfig };
