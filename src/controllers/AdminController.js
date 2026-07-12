const UserModel = require("../models/User");
const MedicaoModel = require("../models/Medicao");
const PixPaymentModel = require("../models/PixPayment");
const AccessLogModel = require("../models/AccessLog");
const ArticleModel = require("../models/Article");
const ForumPostModel = require("../models/ForumPost");
const ForumCommentModel = require("../models/ForumComment");
const ForumReportModel = require("../models/ForumReport");
const mongoose = require("mongoose");
const { slugify } = require("../helpers/slugify");

const { getAppSettings, getPremiumPrice, getFreePdfLimit } = require("../lib/appSettings");
const { fetchPaymentFees } = require("../lib/asaas/paymentFees");

const MONGO_LIMIT_MB = 512;

async function syncMissingPaymentFees(limit = 20) {
  const missing = await PixPaymentModel.find({
    status: "paid",
    netAmount: null,
    asaasPaymentId: { $ne: null },
  })
    .sort({ paidAt: -1 })
    .limit(limit);

  for (const payment of missing) {
    try {
      const fees = await fetchPaymentFees(payment.asaasPaymentId);
      if (fees.netAmount == null) continue;
      payment.amount = fees.amount || payment.amount;
      payment.netAmount = fees.netAmount;
      payment.feeAmount = fees.feeAmount;
      await payment.save();
    } catch (err) {
      console.log("syncMissingPaymentFees:", payment.asaasPaymentId, err.message);
    }
  }
}

async function getFinancialSummary() {
  await syncMissingPaymentFees();
  const settings = await getAppSettings();
  const fallbackPrice = settings.premiumPrice;

  const [paidAgg, pendingAgg, premiumUsers] = await Promise.all([
    PixPaymentModel.aggregate([
      { $match: { status: "paid" } },
      {
        $group: {
          _id: null,
          gross: { $sum: { $ifNull: ["$amount", fallbackPrice] } },
          net: { $sum: { $ifNull: ["$netAmount", 0] } },
          fees: { $sum: { $ifNull: ["$feeAmount", 0] } },
          paidWithFees: {
            $sum: { $cond: [{ $ne: ["$netAmount", null] }, 1, 0] },
          },
          count: { $sum: 1 },
        },
      },
    ]),
    PixPaymentModel.aggregate([
      { $match: { status: { $in: ["generated", "pending"] } } },
      {
        $group: {
          _id: null,
          gross: { $sum: { $ifNull: ["$amount", fallbackPrice] } },
          count: { $sum: 1 },
        },
      },
    ]),
    UserModel.countDocuments({ is_premium: true }),
  ]);

  const paid = paidAgg[0] || {};
  const pending = pendingAgg[0] || {};

  return {
    pixPrice: fallbackPrice,
    received: {
      gross: paid.gross ?? 0,
      net: paid.net ?? 0,
      fees: paid.fees ?? 0,
      count: paid.count ?? 0,
      syncedCount: paid.paidWithFees ?? 0,
    },
    pending: {
      gross: pending.gross ?? 0,
      count: pending.count ?? 0,
    },
    premiumUsers,
  };
}

class AdminController {
  dashboard = async (req, res) => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        newUsers7d,
        totalMedicoes,
        totalPixPayments,
        totalAccessLogs,
        premiumUsers,
        pixGenerated,
        pixPaid,
        notificationsEnabled,
        pushSubscriptionsAgg,
        logins7d,
        pdfDownloads7d,
        activeUsers7d,
      ] = await Promise.all([
        UserModel.countDocuments(),
        UserModel.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
        MedicaoModel.countDocuments(),
        PixPaymentModel.countDocuments(),
        AccessLogModel.countDocuments(),
        UserModel.countDocuments({ is_premium: true }),
        PixPaymentModel.countDocuments({ status: { $in: ["generated", "pending"] } }),
        PixPaymentModel.countDocuments({ status: "paid" }),
        UserModel.countDocuments({ "preferences.notificationsEnabled": true }),
        UserModel.aggregate([
          { $project: { count: { $size: { $ifNull: ["$pushSubscriptions", []] } } } },
          { $group: { _id: null, total: { $sum: "$count" } } },
        ]),
        AccessLogModel.countDocuments({
          action: "login",
          createdAt: { $gte: sevenDaysAgo },
        }),
        AccessLogModel.countDocuments({
          action: "pdf_download",
          createdAt: { $gte: sevenDaysAgo },
        }),
        AccessLogModel.distinct("userId", {
          createdAt: { $gte: sevenDaysAgo },
        }),
      ]);

      let storageSizeMB = null;
      let dataSizeMB = null;
      let mongoObjects = null;

      try {
        const stats = await mongoose.connection.db.stats();
        storageSizeMB = Math.round(stats.storageSize / 1024 / 1024);
        dataSizeMB = Math.round(stats.dataSize / 1024 / 1024);
        mongoObjects = stats.objects;
      } catch (statsErr) {
        console.log("admin dashboard db.stats:", statsErr.message);
      }

      const totalDocuments =
        totalUsers + totalMedicoes + totalPixPayments + totalAccessLogs;
      const estimatedStorageMB = storageSizeMB ?? Math.round(totalDocuments * 2 / 1024);
      const storageUsagePct = Math.min(
        100,
        Math.round((estimatedStorageMB / MONGO_LIMIT_MB) * 100)
      );

      const financial = await getFinancialSummary();
      const revenue = financial.received.gross;

      res.status(200).json({
        users: { total: totalUsers, newLast7Days: newUsers7d },
        infra: {
          totalDocuments,
          users: totalUsers,
          medicoes: totalMedicoes,
          pixPayments: totalPixPayments,
          accessLogs: totalAccessLogs,
          estimatedStorageMB,
          dataSizeMB,
          mongoObjects,
          mongoLimitMB: MONGO_LIMIT_MB,
          storageUsagePct,
          storageSource: storageSizeMB != null ? "mongodb" : "estimate",
          activity: {
            logins7d,
            pdfDownloads7d,
            activeUsers7d: activeUsers7d.length,
          },
          vercelAnalyticsUrl: process.env.VERCEL_ANALYTICS_URL || null,
        },
        financial: {
          pixPrice: financial.pixPrice,
          generated: pixGenerated,
          paid: financial.received.count,
          revenue: financial.received.gross,
          revenueNet: financial.received.net,
          asaasFees: financial.received.fees,
          paidWithFeesSynced: financial.received.syncedCount,
          pendingGross: financial.pending.gross,
          pendingCount: financial.pending.count,
          premiumUsers: financial.premiumUsers,
        },
        notifications: {
          enabled: notificationsEnabled,
          pushSubscriptions: pushSubscriptionsAgg[0]?.total ?? 0,
        },
      });
    } catch (error) {
      console.log("admin dashboard error:", error);
      res.status(500).json({ msg: "Erro ao carregar métricas" });
    }
  };

  financialSummary = async (req, res) => {
    try {
      const summary = await getFinancialSummary();
      res.status(200).json(summary);
    } catch (error) {
      console.log("admin financialSummary error:", error);
      res.status(500).json({ msg: "Erro ao carregar financeiro" });
    }
  };

  me = async (req, res) => {
    try {
      const user = req.adminUser;
      res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        is_admin: true,
      });
    } catch (error) {
      res.status(500).json({ msg: "Erro" });
    }
  };

  listUsers = async (req, res) => {
    try {
      const users = await UserModel.find()
        .select("+createdAt name email telephone is_premium pdf_downloads_count preferences.notificationsEnabled createdAt")
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();

      res.status(200).json(users);
    } catch (error) {
      console.log("admin listUsers error:", error);
      res.status(500).json({ msg: "Erro ao listar usuários" });
    }
  };

  setPremium = async (req, res) => {
    try {
      const { id } = req.params;
      const { is_premium } = req.body;

      const user = await UserModel.findByIdAndUpdate(
        id,
        { is_premium: !!is_premium },
        { new: true }
      );

      if (!user) return res.status(404).json({ msg: "Usuário não encontrado" });

      if (is_premium) {
        const premiumPrice = await getPremiumPrice();

        await PixPaymentModel.findOneAndUpdate(
          { userId: id, status: "generated" },
          { status: "paid", paidAt: new Date() },
          { sort: { createdAt: -1 } }
        );

        const hasPaid = await PixPaymentModel.findOne({ userId: id, status: "paid" });
        if (!hasPaid) {
          await PixPaymentModel.create({
            userId: id,
            amount: premiumPrice,
            status: "paid",
            paidAt: new Date(),
          });
        }
      }

      res.status(200).json(user);
    } catch (error) {
      console.log("admin setPremium error:", error);
      res.status(500).json({ msg: "Erro ao atualizar premium" });
    }
  };

  listPayments = async (req, res) => {
    try {
      await syncMissingPaymentFees();

      const payments = await PixPaymentModel.find()
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      res.status(200).json(payments);
    } catch (error) {
      console.log("admin listPayments error:", error);
      res.status(500).json({ msg: "Erro ao listar pagamentos" });
    }
  };

  getUserDetail = async (req, res) => {
    try {
      const { id } = req.params;

      const user = await UserModel.findById(id)
        .select(
          "+createdAt name email telephone gender birthDate is_premium pdf_downloads_count preferences pushSubscriptions notificationState createdAt"
        )
        .lean();

      if (!user) {
        return res.status(404).json({ msg: "Usuária não encontrada" });
      }

      const [medicoes, payments, accessLogs, totalMedicoes, lastLogin, avgAgg] =
        await Promise.all([
          MedicaoModel.find({ userId: id })
            .sort({ date: -1 })
            .limit(50)
            .lean(),
          PixPaymentModel.find({ userId: id }).sort({ createdAt: -1 }).lean(),
          AccessLogModel.find({ userId: id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean(),
          MedicaoModel.countDocuments({ userId: id }),
          AccessLogModel.findOne({ userId: id, action: "login" })
            .sort({ createdAt: -1 })
            .lean(),
          MedicaoModel.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(id) } },
            { $group: { _id: null, avg: { $avg: "$value" } } },
          ]),
        ]);

      const avgGlucose = avgAgg[0]?.avg ? Math.round(avgAgg[0].avg) : 0;

      res.status(200).json({
        user,
        medicoes,
        payments,
        accessLogs,
        stats: {
          totalMedicoes,
          avgGlucose,
          pushDevices: user.pushSubscriptions?.length ?? 0,
          notificationsEnabled: user.preferences?.notificationsEnabled ?? false,
          lastLoginAt: lastLogin?.createdAt ?? null,
          pdfDownloads: user.pdf_downloads_count ?? 0,
        },
      });
    } catch (error) {
      console.log("admin getUserDetail error:", error);
      res.status(500).json({ msg: "Erro ao carregar usuária" });
    }
  };

  // --- Artigos (blog/dicas) ---

  listArticles = async (req, res) => {
    try {
      const articles = await ArticleModel.find()
        .sort({ createdAt: -1 })
        .lean();
      res.status(200).json(articles);
    } catch (error) {
      console.log("admin listArticles error:", error);
      res.status(500).json({ msg: "Erro ao listar artigos" });
    }
  };

  createArticle = async (req, res) => {
    try {
      const { title, excerpt, body, category, readMinutes, published } = req.body;

      if (!title?.trim() || !body?.trim()) {
        return res.status(400).json({ msg: "Título e conteúdo são obrigatórios" });
      }

      let slug = slugify(title);
      const existing = await ArticleModel.findOne({ slug });
      if (existing) slug = `${slug}-${Date.now()}`;

      const article = await ArticleModel.create({
        title: title.trim(),
        slug,
        excerpt: excerpt?.trim() || body.trim().slice(0, 160) + "...",
        body: body.trim(),
        category: category || "Bem-estar",
        readMinutes: readMinutes || 3,
        published: !!published,
        publishedAt: published ? new Date() : null,
      });

      res.status(201).json(article);
    } catch (error) {
      console.log("admin createArticle error:", error);
      res.status(500).json({ msg: "Erro ao criar artigo" });
    }
  };

  updateArticle = async (req, res) => {
    try {
      const { id } = req.params;
      const { title, excerpt, body, category, readMinutes, published } = req.body;

      const article = await ArticleModel.findById(id);
      if (!article) return res.status(404).json({ msg: "Artigo não encontrado" });

      if (title?.trim()) article.title = title.trim();
      if (excerpt !== undefined) article.excerpt = excerpt.trim();
      if (body?.trim()) article.body = body.trim();
      if (category) article.category = category;
      if (readMinutes) article.readMinutes = readMinutes;

      if (published !== undefined) {
        const wasPublished = article.published;
        article.published = !!published;
        if (published && !wasPublished) article.publishedAt = new Date();
      }

      await article.save();
      res.status(200).json(article);
    } catch (error) {
      console.log("admin updateArticle error:", error);
      res.status(500).json({ msg: "Erro ao atualizar artigo" });
    }
  };

  deleteArticle = async (req, res) => {
    try {
      const article = await ArticleModel.findByIdAndDelete(req.params.id);
      if (!article) return res.status(404).json({ msg: "Artigo não encontrado" });
      res.status(200).json({ msg: "Artigo removido" });
    } catch (error) {
      console.log("admin deleteArticle error:", error);
      res.status(500).json({ msg: "Erro ao remover artigo" });
    }
  };

  // --- Fórum / moderação ---

  listForumPosts = async (req, res) => {
    try {
      const posts = await ForumPostModel.find()
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      res.status(200).json(posts);
    } catch (error) {
      console.log("admin listForumPosts error:", error);
      res.status(500).json({ msg: "Erro ao listar posts" });
    }
  };

  updateForumPost = async (req, res) => {
    try {
      const { hidden } = req.body;
      const post = await ForumPostModel.findByIdAndUpdate(
        req.params.id,
        { hidden: !!hidden },
        { new: true }
      ).populate("userId", "name email");

      if (!post) return res.status(404).json({ msg: "Post não encontrado" });
      res.status(200).json(post);
    } catch (error) {
      console.log("admin updateForumPost error:", error);
      res.status(500).json({ msg: "Erro ao atualizar post" });
    }
  };

  deleteForumPost = async (req, res) => {
    try {
      const { id } = req.params;
      await ForumCommentModel.deleteMany({ postId: id });
      await ForumReportModel.deleteMany({ postId: id });
      const post = await ForumPostModel.findByIdAndDelete(id);
      if (!post) return res.status(404).json({ msg: "Post não encontrado" });
      res.status(200).json({ msg: "Post removido" });
    } catch (error) {
      console.log("admin deleteForumPost error:", error);
      res.status(500).json({ msg: "Erro ao remover post" });
    }
  };

  listForumReports = async (req, res) => {
    try {
      const status = req.query.status || "pending";
      const reports = await ForumReportModel.find({ status })
        .populate("reporterId", "name email")
        .populate("postId", "title category")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      res.status(200).json(reports);
    } catch (error) {
      console.log("admin listForumReports error:", error);
      res.status(500).json({ msg: "Erro ao listar denúncias" });
    }
  };

  resolveForumReport = async (req, res) => {
    try {
      const { status, hidePost } = req.body;
      const report = await ForumReportModel.findById(req.params.id);
      if (!report) return res.status(404).json({ msg: "Denúncia não encontrada" });

      report.status = status === "dismissed" ? "dismissed" : "resolved";
      await report.save();

      if (hidePost && report.postId) {
        await ForumPostModel.findByIdAndUpdate(report.postId, { hidden: true });
      }

      if (report.commentId && hidePost) {
        await ForumCommentModel.findByIdAndUpdate(report.commentId, { hidden: true });
      }

      res.status(200).json(report);
    } catch (error) {
      console.log("admin resolveForumReport error:", error);
      res.status(500).json({ msg: "Erro ao resolver denúncia" });
    }
  };
}

module.exports = new AdminController();
