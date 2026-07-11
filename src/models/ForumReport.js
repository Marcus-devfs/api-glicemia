const mongoose = require("mongoose");
const { Schema } = mongoose;

const forumReportSchema = new Schema(
  {
    targetType: { type: String, enum: ["post", "comment"], required: true },
    postId: {
      type: Schema.Types.ObjectId,
      ref: "ForumPost",
      required: true,
      index: true,
    },
    commentId: {
      type: Schema.Types.ObjectId,
      ref: "ForumComment",
      default: null,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: { type: String, default: "Conteúdo inadequado ou desinformação" },
    status: {
      type: String,
      enum: ["pending", "resolved", "dismissed"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

const ForumReport = mongoose.model("ForumReport", forumReportSchema);

module.exports = ForumReport;
