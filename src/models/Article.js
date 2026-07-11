const mongoose = require("mongoose");
const { Schema } = mongoose;

const articleSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    excerpt: { type: String, default: "" },
    body: { type: String, required: true },
    category: {
      type: String,
      enum: ["Alimentação", "Medição", "Receitas", "Bem-estar"],
      default: "Bem-estar",
    },
    readMinutes: { type: Number, default: 3 },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Article = mongoose.model("Article", articleSchema);

module.exports = Article;
