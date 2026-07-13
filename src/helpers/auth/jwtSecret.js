function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_KEY;
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";

module.exports = { getJwtSecret, JWT_EXPIRES_IN };
