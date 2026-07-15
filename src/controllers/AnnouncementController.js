const AnnouncementModel = require("../models/Announcement");
const UserModel = require("../models/User");

const MAX_DISMISSED = 40;

function isActiveNow(announcement, now = new Date()) {
  if (!announcement.active) return false;
  if (announcement.startsAt && new Date(announcement.startsAt) > now) return false;
  if (announcement.endsAt && new Date(announcement.endsAt) < now) return false;
  return true;
}

function matchesAudience(announcement, user) {
  if (announcement.audience === "all") return true;
  if (announcement.audience === "premium") return !!user?.is_premium;
  if (announcement.audience === "free") return !user?.is_premium;
  return true;
}

class AnnouncementController {
  listActive = async (req, res) => {
    try {
      const user = await UserModel.findById(req.currentUser.userId)
        .select("is_premium preferences.dismissedAnnouncementIds")
        .lean();
      if (!user) return res.status(404).json({ msg: "Usuária não encontrada" });

      const now = new Date();
      const dismissed = (user.preferences?.dismissedAnnouncementIds || []).map(String);

      const candidates = await AnnouncementModel.find({ active: true })
        .sort({ priority: -1, publishedAt: -1, createdAt: -1 })
        .limit(30)
        .lean();

      const items = candidates
        .filter((a) => isActiveNow(a, now))
        .filter((a) => matchesAudience(a, user))
        .filter((a) => !dismissed.includes(String(a._id)))
        .slice(0, 3)
        .map((a) => ({
          _id: a._id,
          title: a.title,
          body: a.body,
          kind: a.kind,
          ctaLabel: a.ctaLabel,
          ctaHref: a.ctaHref,
          publishedAt: a.publishedAt || a.createdAt,
        }));

      res.status(200).json(items);
    } catch (error) {
      console.log("announcements listActive error:", error);
      res.status(500).json({ msg: "Erro ao carregar novidades" });
    }
  };

  dismiss = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.currentUser.userId;

      const announcement = await AnnouncementModel.findById(id).select("_id").lean();
      if (!announcement) return res.status(404).json({ msg: "Novidade não encontrada" });

      const user = await UserModel.findByIdAndUpdate(
        userId,
        { $addToSet: { "preferences.dismissedAnnouncementIds": announcement._id } },
        { new: true }
      ).select("preferences.dismissedAnnouncementIds");

      if (!user) return res.status(404).json({ msg: "Usuária não encontrada" });

      const dismissed = user.preferences?.dismissedAnnouncementIds || [];
      if (dismissed.length > MAX_DISMISSED) {
        user.preferences.dismissedAnnouncementIds = dismissed.slice(-MAX_DISMISSED);
        await user.save();
      }

      res.status(200).json({ ok: true });
    } catch (error) {
      console.log("announcements dismiss error:", error);
      res.status(500).json({ msg: "Erro ao fechar novidade" });
    }
  };

  // --- Admin ---

  listAdmin = async (req, res) => {
    try {
      const items = await AnnouncementModel.find().sort({ priority: -1, createdAt: -1 }).lean();
      res.status(200).json(items);
    } catch (error) {
      console.log("announcements listAdmin error:", error);
      res.status(500).json({ msg: "Erro ao listar novidades" });
    }
  };

  createAdmin = async (req, res) => {
    try {
      const {
        title,
        body,
        kind,
        ctaLabel,
        ctaHref,
        audience,
        active,
        priority,
        startsAt,
        endsAt,
      } = req.body;

      if (!title?.trim() || !body?.trim()) {
        return res.status(400).json({ msg: "Título e texto são obrigatórios" });
      }

      const isActive = active !== false;
      const item = await AnnouncementModel.create({
        title: String(title).trim().slice(0, 120),
        body: String(body).trim().slice(0, 600),
        kind: ["feature", "campaign", "info"].includes(kind) ? kind : "feature",
        ctaLabel: ctaLabel?.trim()?.slice(0, 60) || null,
        ctaHref: ctaHref?.trim()?.slice(0, 200) || null,
        audience: ["all", "free", "premium"].includes(audience) ? audience : "all",
        active: isActive,
        priority: Number.isFinite(Number(priority)) ? Number(priority) : 0,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        publishedAt: isActive ? new Date() : null,
      });

      res.status(201).json(item);
    } catch (error) {
      console.log("announcements createAdmin error:", error);
      res.status(500).json({ msg: "Erro ao criar novidade" });
    }
  };

  updateAdmin = async (req, res) => {
    try {
      const item = await AnnouncementModel.findById(req.params.id);
      if (!item) return res.status(404).json({ msg: "Novidade não encontrada" });

      const {
        title,
        body,
        kind,
        ctaLabel,
        ctaHref,
        audience,
        active,
        priority,
        startsAt,
        endsAt,
      } = req.body;

      if (title?.trim()) item.title = title.trim().slice(0, 120);
      if (body?.trim()) item.body = body.trim().slice(0, 600);
      if (["feature", "campaign", "info"].includes(kind)) item.kind = kind;
      if (ctaLabel !== undefined) item.ctaLabel = ctaLabel?.trim()?.slice(0, 60) || null;
      if (ctaHref !== undefined) item.ctaHref = ctaHref?.trim()?.slice(0, 200) || null;
      if (["all", "free", "premium"].includes(audience)) item.audience = audience;
      if (priority !== undefined && Number.isFinite(Number(priority))) {
        item.priority = Number(priority);
      }
      if (startsAt !== undefined) item.startsAt = startsAt ? new Date(startsAt) : null;
      if (endsAt !== undefined) item.endsAt = endsAt ? new Date(endsAt) : null;

      if (active !== undefined) {
        const wasActive = item.active;
        item.active = !!active;
        if (item.active && !wasActive) item.publishedAt = new Date();
      }

      await item.save();
      res.status(200).json(item);
    } catch (error) {
      console.log("announcements updateAdmin error:", error);
      res.status(500).json({ msg: "Erro ao atualizar novidade" });
    }
  };

  deleteAdmin = async (req, res) => {
    try {
      const item = await AnnouncementModel.findByIdAndDelete(req.params.id);
      if (!item) return res.status(404).json({ msg: "Novidade não encontrada" });
      res.status(200).json({ msg: "Novidade removida" });
    } catch (error) {
      console.log("announcements deleteAdmin error:", error);
      res.status(500).json({ msg: "Erro ao remover novidade" });
    }
  };
}

module.exports = new AnnouncementController();
