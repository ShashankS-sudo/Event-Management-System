function readInteger(name, fallback, min, max) {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return parsed;
}

const CANCELLATION_DEADLINE_DAYS = readInteger("CANCELLATION_DEADLINE_DAYS", 4, 0, 365);

module.exports = { CANCELLATION_DEADLINE_DAYS };
