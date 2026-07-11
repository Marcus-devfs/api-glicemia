const ArticleModel = require("../models/Article");

class ContentController {
  listArticles = async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

      const articles = await ArticleModel.find({ published: true })
        .select("title slug excerpt category readMinutes publishedAt createdAt")
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(limit)
        .lean();

      res.status(200).json(articles);
    } catch (error) {
      console.log("listArticles error:", error);
      res.status(500).json({ msg: "Erro ao listar artigos" });
    }
  };

  getArticleBySlug = async (req, res) => {
    try {
      const article = await ArticleModel.findOne({
        slug: req.params.slug,
        published: true,
      }).lean();

      if (!article) {
        return res.status(404).json({ msg: "Artigo não encontrado" });
      }

      res.status(200).json(article);
    } catch (error) {
      console.log("getArticleBySlug error:", error);
      res.status(500).json({ msg: "Erro ao carregar artigo" });
    }
  };
}

module.exports = new ContentController();
