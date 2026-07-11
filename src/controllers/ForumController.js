const ForumPostModel = require("../models/ForumPost");
const ForumCommentModel = require("../models/ForumComment");
const ForumReportModel = require("../models/ForumReport");
const { FORUM_CATEGORIES } = require("../models/ForumPost");

class ForumController {
  listPosts = async (req, res) => {
    try {
      const { category } = req.query;
      const filter = { hidden: false };
      if (category && FORUM_CATEGORIES.includes(category)) {
        filter.category = category;
      }

      const posts = await ForumPostModel.find(filter)
        .populate("userId", "name")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      res.status(200).json(posts);
    } catch (error) {
      console.log("listPosts error:", error);
      res.status(500).json({ msg: "Erro ao listar posts" });
    }
  };

  createPost = async (req, res) => {
    try {
      const { title, body, category } = req.body;
      const userId = req.currentUser.userId;

      if (!title?.trim() || !body?.trim() || !category) {
        return res.status(400).json({ msg: "Título, texto e categoria são obrigatórios" });
      }

      if (!FORUM_CATEGORIES.includes(category)) {
        return res.status(400).json({ msg: "Categoria inválida" });
      }

      const post = await ForumPostModel.create({
        userId,
        title: title.trim(),
        body: body.trim(),
        category,
      });

      const populated = await ForumPostModel.findById(post._id)
        .populate("userId", "name")
        .lean();

      res.status(201).json(populated);
    } catch (error) {
      console.log("createPost error:", error);
      res.status(500).json({ msg: "Erro ao criar post" });
    }
  };

  getPost = async (req, res) => {
    try {
      const post = await ForumPostModel.findOne({
        _id: req.params.id,
        hidden: false,
      })
        .populate("userId", "name")
        .lean();

      if (!post) {
        return res.status(404).json({ msg: "Post não encontrado" });
      }

      const comments = await ForumCommentModel.find({
        postId: post._id,
        hidden: false,
      })
        .populate("userId", "name")
        .sort({ createdAt: 1 })
        .lean();

      const userId = req.currentUser?.userId?.toString();
      const supported = userId
        ? post.likes?.some((id) => id.toString() === userId)
        : false;

      res.status(200).json({ post: { ...post, supported }, comments });
    } catch (error) {
      console.log("getPost error:", error);
      res.status(500).json({ msg: "Erro ao carregar post" });
    }
  };

  addComment = async (req, res) => {
    try {
      const { body } = req.body;
      const userId = req.currentUser.userId;
      const { id: postId } = req.params;

      if (!body?.trim()) {
        return res.status(400).json({ msg: "Comentário vazio" });
      }

      const post = await ForumPostModel.findOne({ _id: postId, hidden: false });
      if (!post) {
        return res.status(404).json({ msg: "Post não encontrado" });
      }

      const comment = await ForumCommentModel.create({
        postId,
        userId,
        body: body.trim(),
      });

      post.commentsCount += 1;
      await post.save();

      const populated = await ForumCommentModel.findById(comment._id)
        .populate("userId", "name")
        .lean();

      res.status(201).json(populated);
    } catch (error) {
      console.log("addComment error:", error);
      res.status(500).json({ msg: "Erro ao comentar" });
    }
  };

  toggleSupport = async (req, res) => {
    try {
      const userId = req.currentUser.userId;
      const post = await ForumPostModel.findOne({
        _id: req.params.id,
        hidden: false,
      });

      if (!post) {
        return res.status(404).json({ msg: "Post não encontrado" });
      }

      const idx = post.likes.findIndex((id) => id.toString() === userId.toString());
      if (idx >= 0) {
        post.likes.splice(idx, 1);
      } else {
        post.likes.push(userId);
      }
      post.likesCount = post.likes.length;
      await post.save();

      res.status(200).json({
        likesCount: post.likesCount,
        supported: idx < 0,
      });
    } catch (error) {
      console.log("toggleSupport error:", error);
      res.status(500).json({ msg: "Erro ao apoiar post" });
    }
  };

  reportPost = async (req, res) => {
    try {
      const userId = req.currentUser.userId;
      const { id: postId } = req.params;
      const { reason } = req.body;

      const post = await ForumPostModel.findById(postId);
      if (!post) {
        return res.status(404).json({ msg: "Post não encontrado" });
      }

      const existing = await ForumReportModel.findOne({
        targetType: "post",
        postId,
        reporterId: userId,
        status: "pending",
      });

      if (existing) {
        return res.status(200).json({ msg: "Denúncia já registrada" });
      }

      await ForumReportModel.create({
        targetType: "post",
        postId,
        reporterId: userId,
        reason: reason?.trim() || "Conteúdo inadequado ou desinformação",
      });

      post.reportCount += 1;
      await post.save();

      res.status(201).json({ msg: "Denúncia enviada. Obrigada por ajudar a manter a comunidade segura." });
    } catch (error) {
      console.log("reportPost error:", error);
      res.status(500).json({ msg: "Erro ao denunciar" });
    }
  };

  reportComment = async (req, res) => {
    try {
      const userId = req.currentUser.userId;
      const { id: commentId } = req.params;
      const { reason } = req.body;

      const comment = await ForumCommentModel.findById(commentId);
      if (!comment) {
        return res.status(404).json({ msg: "Comentário não encontrado" });
      }

      const existing = await ForumReportModel.findOne({
        targetType: "comment",
        commentId,
        reporterId: userId,
        status: "pending",
      });

      if (existing) {
        return res.status(200).json({ msg: "Denúncia já registrada" });
      }

      await ForumReportModel.create({
        targetType: "comment",
        postId: comment.postId,
        commentId,
        reporterId: userId,
        reason: reason?.trim() || "Conteúdo inadequado ou desinformação",
      });

      res.status(201).json({ msg: "Denúncia enviada." });
    } catch (error) {
      console.log("reportComment error:", error);
      res.status(500).json({ msg: "Erro ao denunciar" });
    }
  };
}

module.exports = new ForumController();
