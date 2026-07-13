const LpEventModel = require("../models/LpEvent");
const { LP_EVENT_TYPES } = require("../models/LpEvent");

const CTA_EVENTS = [
  "cta_install",
  "cta_app",
  "cta_register",
  "install_banner_click",
  "install_modal_open",
];

function parseDateRange(query) {
  const fromRaw = query.from;
  const toRaw = query.to;

  if (fromRaw && toRaw) {
    const since = new Date(fromRaw);
    const until = new Date(toRaw);
    if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime())) {
      return null;
    }
    since.setHours(0, 0, 0, 0);
    until.setHours(23, 59, 59, 999);
    const days = Math.max(1, Math.ceil((until - since) / 86400000));
    return { since, until, days };
  }

  const days = Math.min(180, Math.max(1, parseInt(query.days, 10) || 7));
  const until = new Date();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);
  return { since, until, days };
}

function buildMatch(query, since, until) {
  const match = { createdAt: { $gte: since, $lte: until } };

  const utmSource = String(query.utmSource || "").trim();
  if (utmSource) {
    if (utmSource === "(direto)") {
      match.$or = [{ utmSource: null }, { utmSource: "" }];
    } else {
      match.utmSource = utmSource;
    }
  }

  const event = String(query.event || "").trim();
  if (event && LP_EVENT_TYPES.includes(event)) {
    match.event = event;
  }

  const sessionId = String(query.sessionId || "").trim();
  if (sessionId.length >= 8) {
    match.sessionId = sessionId;
  }

  const path = String(query.path || "").trim();
  if (path) {
    match.path = path;
  }

  return match;
}

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
      const range = parseDateRange(req.query);
      if (!range) {
        return res.status(400).json({ msg: "Período inválido" });
      }

      const { since, until, days } = range;
      const match = buildMatch(req.query, since, until);
      const pageViewMatch = { ...match, event: "page_view" };
      const ctaMatch = { ...match, event: { $in: CTA_EVENTS } };

      const [
        pageViews,
        uniqueSessions,
        ctaClicks,
        byDay,
        bySource,
        topPaths,
        byEvent,
        topSessions,
        availableSources,
      ] = await Promise.all([
        LpEventModel.countDocuments(pageViewMatch),
        LpEventModel.distinct("sessionId", pageViewMatch),
        LpEventModel.countDocuments(ctaMatch),
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
              sessions: { $addToSet: "$sessionId" },
            },
          },
          { $sort: { "_id.date": 1 } },
          {
            $project: {
              _id: 0,
              date: "$_id.date",
              pageViews: 1,
              ctaClicks: 1,
              uniqueSessions: { $size: "$sessions" },
            },
          },
        ]),
        LpEventModel.aggregate([
          { $match: pageViewMatch },
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
          { $limit: 15 },
        ]),
        LpEventModel.aggregate([
          { $match: pageViewMatch },
          { $group: { _id: "$path", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 15 },
          { $project: { _id: 0, path: "$_id", count: 1 } },
        ]),
        LpEventModel.aggregate([
          { $match: match },
          { $group: { _id: "$event", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $project: { _id: 0, event: "$_id", count: 1 } },
        ]),
        LpEventModel.aggregate([
          { $match: match },
          {
            $group: {
              _id: "$sessionId",
              pageViews: {
                $sum: { $cond: [{ $eq: ["$event", "page_view"] }, 1, 0] },
              },
              ctaClicks: {
                $sum: { $cond: [{ $in: ["$event", CTA_EVENTS] }, 1, 0] },
              },
              events: { $sum: 1 },
              utmSource: { $first: "$utmSource" },
              utmCampaign: { $first: "$utmCampaign" },
              firstSeen: { $min: "$createdAt" },
              lastSeen: { $max: "$createdAt" },
            },
          },
          { $sort: { lastSeen: -1 } },
          { $limit: 30 },
          {
            $project: {
              _id: 0,
              sessionId: "$_id",
              pageViews: 1,
              ctaClicks: 1,
              events: 1,
              utmSource: { $ifNull: ["$utmSource", "(direto)"] },
              utmCampaign: { $ifNull: ["$utmCampaign", "—"] },
              firstSeen: 1,
              lastSeen: 1,
            },
          },
        ]),
        LpEventModel.aggregate([
          { $match: { createdAt: { $gte: since, $lte: until }, event: "page_view" } },
          {
            $group: {
              _id: { $ifNull: ["$utmSource", "(direto)"] },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $project: { _id: 0, source: "$_id", count: 1 } },
        ]),
      ]);

      const conversionRate =
        pageViews > 0 ? Math.round((ctaClicks / pageViews) * 1000) / 1000 : 0;

      res.status(200).json({
        days,
        from: since.toISOString(),
        to: until.toISOString(),
        pageViews,
        uniqueSessions: uniqueSessions.length,
        ctaClicks,
        conversionRate,
        byDay,
        bySource,
        topPaths,
        byEvent,
        topSessions,
        availableSources: availableSources.map((s) => s.source),
        filters: {
          utmSource: req.query.utmSource || null,
          event: req.query.event || null,
          sessionId: req.query.sessionId || null,
          path: req.query.path || null,
        },
      });
    } catch (error) {
      console.log("lp metrics error:", error);
      res.status(500).json({ msg: "Erro ao carregar métricas da LP" });
    }
  };
}

module.exports = new LpAnalyticsController();
