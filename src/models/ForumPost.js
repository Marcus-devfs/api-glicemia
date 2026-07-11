const mongoose = require("mongoose");
const { Schema } = mongoose;

const FORUM_CATEGORIES = ["Alimentação", "Ansiedade", "Sintomas", "Vitórias"];

const forumPostSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, maxlength: 120, trim: true },
    body: { type: String, required: true, maxlength: 2000 },
    category: { type: String, enum: FORUM_CATEGORIES, required: true },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    hidden: { type: Boolean, default: false, index: true },
    reportCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ForumPost = mongoose.model("ForumPost", forumPostSchema);

module.exports = ForumPost;
module.exports.FORUM_CATEGORIES = FORUM_CATEGORIES;
