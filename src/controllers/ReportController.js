const crypto = require("crypto");
const UserModel = require("../models/User");
const MedicaoModel = require("../models/Medicao");
const ShareReportModel = require("../models/ShareReport");
const {
  computeReportStats,
  filterMarkingsSince,
  getGestationalWeek,
  sanitizePatientName,
  getTargets,
} = require("../lib/reports/stats");
const { sendWeeklySummaryEmail } = require("../lib/email/sendWeeklySummaryEmail");

const SHARE_DAYS = 14;
const SHARE_TTL_DAYS = 7;

function requirePremium(user, res) {
  if (!user?.is_premium) {
    res.status(403).json({ msg: "Recurso disponível no Kit Consulta Premium" });
    return false;
  }
  return true;
}

class ReportController {
  weeklySummary = async (req, res) => {
    try {
      const userId = req.currentUser.userId;
      const user = await UserModel.findById(userId);
      if (!user) return res.status(404).json({ msg: "Usuária não encontrada" });
      if (!requirePremium(user, res)) return;

      const days = Number(req.query.days) || 7;
      const markings = await MedicaoModel.find({ userId }).sort({ date: -1 });
      const stats = computeReportStats(markings, user, days);
      const gestationalWeek = getGestationalWeek(user.pregnancy?.dueDate);

      res.status(200).json({
        stats,
        gestationalWeek,
        pregnancy: user.pregnancy,
        targets: getTargets(user),
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.log("weeklySummary error:", error.message);
      res.status(500).json({ msg: "Erro ao gerar resumo" });
    }
  };

  createShareLink = async (req, res) => {
    try {
      const userId = req.currentUser.userId;
      const user = await UserModel.findById(userId);
      if (!user) return res.status(404).json({ msg: "Usuária não encontrada" });
      if (!requirePremium(user, res)) return;

      await ShareReportModel.deleteMany({
        userId,
        expiresAt: { $lt: new Date() },
      });

      const token = crypto.randomBytes(24).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + SHARE_TTL_DAYS);

      await ShareReportModel.create({ userId, token, expiresAt });

      const appUrl = process.env.APP_URL || "https://app.gestaglic.com.br";
      const shareUrl = `${appUrl}/compartilhar/${token}`;

      res.status(201).json({
        shareUrl,
        token,
        expiresAt,
        expiresInDays: SHARE_TTL_DAYS,
      });
    } catch (error) {
      console.log("createShareLink error:", error.message);
      res.status(500).json({ msg: "Erro ao gerar link" });
    }
  };

  getSharedReport = async (req, res) => {
    try {
      const { token } = req.params;
      const share = await ShareReportModel.findOne({ token });
      if (!share || share.expiresAt < new Date()) {
        return res.status(404).json({ msg: "Link expirado ou inválido" });
      }

      const user = await UserModel.findById(share.userId);
      if (!user) return res.status(404).json({ msg: "Relatório não encontrado" });

      const allMarkings = await MedicaoModel.find({ userId: user._id }).sort({ date: -1 });
      const recentMarkings = filterMarkingsSince(allMarkings, SHARE_DAYS);
      const stats = computeReportStats(recentMarkings, user, SHARE_DAYS);
      const sharedMarkings = recentMarkings.map((m) => ({
        date: m.date,
        period: m.period,
        value: m.value,
      }));

      res.status(200).json({
        patientName: sanitizePatientName(user.name),
        gestationalWeek: getGestationalWeek(user.pregnancy?.dueDate),
        pregnancy: {
          dueDate: user.pregnancy?.dueDate || null,
          fetusCount: user.pregnancy?.fetusCount || 1,
        },
        targets: getTargets(user),
        stats,
        markings: sharedMarkings,
        expiresAt: share.expiresAt,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.log("getSharedReport error:", error.message);
      res.status(500).json({ msg: "Erro ao carregar relatório" });
    }
  };

  sendWeeklySummaryEmails = async (req, res) => {
    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);

      const users = await UserModel.find({
        is_premium: true,
        "preferences.weeklySummaryEmail": true,
        email: { $exists: true, $ne: null },
      });

      let sent = 0;
      let skipped = 0;
      let errors = 0;

      for (const user of users) {
        if (user.lastWeeklySummaryEmailAt && user.lastWeeklySummaryEmailAt >= weekStart) {
          skipped++;
          continue;
        }

        const markings = await MedicaoModel.find({ userId: user._id });
        if (!markings.length) {
          skipped++;
          continue;
        }

        const stats = computeReportStats(markings, user, 7);
        try {
          await sendWeeklySummaryEmail(user, stats);
          user.lastWeeklySummaryEmailAt = now;
          await user.save();
          sent++;
        } catch (err) {
          errors++;
          console.log("weekly email error:", user.email, err.message);
        }
      }

      res.status(200).json({ sent, skipped, errors, candidates: users.length });
    } catch (error) {
      console.log("sendWeeklySummaryEmails error:", error.message);
      res.status(500).json({ msg: "Erro ao enviar resumos semanais" });
    }
  };
}

module.exports = new ReportController();
