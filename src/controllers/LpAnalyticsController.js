const LpEventModel = require("../models/LpEvent");
const { LP_EVENT_TYPES } = require("../models/LpEvent");

const CTA_EVENTS = [
  "cta_install",
  "cta_app",
  "cta_register",
  "install_banner_click",
  "install_modal_open",
];

class LpAnalyticsController {
  track = async (req, res) => {
    try {
      const { event, path, sessionId, utmSource, utmMedium, utmCampaign, referrer, metadata } =
        req.body;

      if (!LP_EVENT_TYPES.includes(event)) {
        return res.status(400).json({ msg: "Evento inválido" });
      }

      const sid = String(sessionId || "").trim();
      if (sid.length < 8 || sid.length > 64) {
        return res.status(400).json({ msg: "sessionId inválido" });
      }

      await LpEventModel.create({
        event,
        path: String(path || "/").slice(0, 256),
        sessionId: sid,
        utmSource: utmSource ? String(utmSource).slice(0, 128) : null,
        utmMedium: utmMedium ? String(utmMedium).slice(0, 128) : null,
        utmCampaign: utmCampaign ? String(utmCampaign).slice(0, 128) : null,
        referrer: referrer ? String(referrer).slice(0, 512) : null,
        userAgent: req.headers["user-agent"] || null,
        metadata: metadata && typeof metadata === "object" ? metadata : null,
      });

      res.status(204).end();
    } catch (error) {
      console.log("lp track error:", error);
      res.status(500).json({ msg: "Erro ao registrar evento" });
    }
  };

  metrics = async (req, res) => {
    try {
      const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 7));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const match = { createdAt: { $gte: since } };

      const [
        pageViews,
        uniqueSessions,
        ctaClicks,
        byDay,
        bySource,
        topPaths,
        byEvent,
      ] = await Promise.all([
        LpEventModel.countDocuments({ ...match, event: "page_view" }),
        LpEventModel.distinct("sessionId", { ...match, event: "page_view" }),
        LpEventModel.countDocuments({ ...match, event: { $in: CTA_EVENTS } }),
        LpEventModel.aggregate([
          { $match: match },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              },
              pageViews: {
                $sum: { $cond: [{ $eq: ["$event", "page_view"] }, 1, 0] },
              },
              ctaClicks: {
                $sum: {
                  $cond: [{ $in: ["$event", CTA_EVENTS] }, 1, 0],
                },
              },
            },
          },
          { $sort: { "_id.date": 1 } },
          {
            $project: {
              _id: 0,
              date: "$_id.date",
              pageViews: 1,
              ctaClicks: 1,
            },
          },
        ]),
        LpEventModel.aggregate([
          { $match: { ...match, event: "page_view" } },
          {
            $group: {
              _id: { $ifNull: ["$utmSource", "(direto)"] },
              pageViews: { $sum: 1 },
              sessions: { $addToSet: "$sessionId" },
            },
          },
          {
            $project: {
              _id: 0,
              source: "$_id",
              pageViews: 1,
              uniqueSessions: { $size: "$sessions" },
            },
          },
          { $sort: { pageViews: -1 } },
          { $limit: 10 },
        ]),
        LpEventModel.aggregate([
          { $match: { ...match, event: "page_view" } },
          { $group: { _id: "$path", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $project: { _id: 0, path: "$_id", count: 1 } },
        ]),
        LpEventModel.aggregate([
          { $match: match },
          { $group: { _id: "$event", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $project: { _id: 0, event: "$_id", count: 1 } },
        ]),
      ]);

      const conversionRate =
        pageViews > 0 ? Math.round((ctaClicks / pageViews) * 1000) / 1000 : 0;

      res.status(200).json({
        days,
        pageViews,
        uniqueSessions: uniqueSessions.length,
        ctaClicks,
        conversionRate,
        byDay,
        bySource,
        topPaths,
        byEvent,
      });
    } catch (error) {
      console.log("lp metrics error:", error);
      res.status(500).json({ msg: "Erro ao carregar métricas da LP" });
    }
  };
}

module.exports = new LpAnalyticsController();
