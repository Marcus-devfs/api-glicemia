const mongoose = require("mongoose");
const { Schema } = mongoose;

const forumCommentSchema = new Schema(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "ForumPost",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: { type: String, required: true, maxlength: 1000 },
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const ForumComment = mongoose.model("ForumComment", forumCommentSchema);

module.exports = ForumComment;
