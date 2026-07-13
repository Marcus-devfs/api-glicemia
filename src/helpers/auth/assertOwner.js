function assertUserId(req, res, userId) {
  const current = String(req.currentUser?.userId || "");
  const target = String(userId || "");
  if (!current || current !== target) {
    res.status(403).json({ msg: "Acesso negado" });
    return false;
  }
  return true;
}

module.exports = { assertUserId };
