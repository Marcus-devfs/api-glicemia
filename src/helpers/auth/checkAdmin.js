const UserModel = require("../../models/User");

async function checkAdmin(req, res, next) {
  try {
    const user = await UserModel.findById(req.currentUser.userId);

    if (!user) {
      return res.status(403).json({ msg: "Acesso restrito a administradores" });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const isAdmin = user.is_admin || adminEmails.includes(user.email);

    if (!isAdmin) {
      return res.status(403).json({ msg: "Acesso restrito a administradores" });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    return res.status(403).json({ msg: "Acesso restrito a administradores" });
  }
}

module.exports = { checkAdmin };
