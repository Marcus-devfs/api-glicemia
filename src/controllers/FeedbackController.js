const FeedbackModel = require("../models/Feedback");

class FeedbackController {
  create = async (req, res) => {
    try {
      const { category, message } = req.body;

      if (!["feedback", "help", "bug"].includes(category)) {
        return res.status(400).json({ msg: "Categoria inválida" });
      }

      const trimmed = String(message || "").trim();
      if (trimmed.length < 5) {
        return res.status(400).json({ msg: "Mensagem muito curta (mínimo 5 caracteres)" });
      }
      if (trimmed.length > 2000) {
        return res.status(400).json({ msg: "Mensagem muito longa (máximo 2000 caracteres)" });
      }

      const feedback = await FeedbackModel.create({
        userId: req.currentUser.userId,
        category,
        message: trimmed,
        userAgent: req.headers["user-agent"] || null,
      });

      res.status(201).json({
        _id: feedback._id,
        category: feedback.category,
        message: feedback.message,
        status: feedback.status,
        createdAt: feedback.createdAt,
      });
    } catch (error) {
      console.log("feedback create error:", error);
      res.status(500).json({ msg: "Erro ao enviar mensagem" });
    }
  };

  listAdmin = async (req, res) => {
    try {
      const status = req.query.status;
      const filter = {};
      if (status && ["open", "read", "resolved"].includes(status)) {
        filter.status = status;
      }

      const items = await FeedbackModel.find(filter)
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();

      res.status(200).json(items);
    } catch (error) {
      console.log("feedback listAdmin error:", error);
      res.status(500).json({ msg: "Erro ao listar feedback" });
    }
  };

  updateStatus = async (req, res) => {
    try {
      const { status } = req.body;
      if (!["open", "read", "resolved"].includes(status)) {
        return res.status(400).json({ msg: "Status inválido" });
      }

      const feedback = await FeedbackModel.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      ).populate("userId", "name email");

      if (!feedback) return res.status(404).json({ msg: "Feedback não encontrado" });

      res.status(200).json(feedback);
    } catch (error) {
      console.log("feedback updateStatus error:", error);
      res.status(500).json({ msg: "Erro ao atualizar feedback" });
    }
  };
}

module.exports = new FeedbackController();
