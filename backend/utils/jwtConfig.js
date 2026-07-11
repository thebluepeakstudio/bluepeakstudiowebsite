const JWT_ALGORITHMS = ["HS256"];
const DEFAULT_JWT_EXPIRES_IN = "24h";

function parseJwtExpiryMs(expiresIn = process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN) {
  const raw = String(expiresIn || DEFAULT_JWT_EXPIRES_IN).trim();
  const match = /^(\d+)([smhd])$/.exec(raw);
  if (!match) return 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[match[2]];
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN?.trim() || DEFAULT_JWT_EXPIRES_IN;
}

module.exports = {
  JWT_ALGORITHMS,
  DEFAULT_JWT_EXPIRES_IN,
  parseJwtExpiryMs,
  getJwtExpiresIn,
};
