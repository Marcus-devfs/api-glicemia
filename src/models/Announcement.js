const mongoose = require("mongoose");
const { Schema } = mongoose;

const announcementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 600 },
    kind: {
      type: String,
      enum: ["feature", "campaign", "info"],
      default: "feature",
    },
    ctaLabel: { type: String, default: null, maxlength: 60 },
    ctaHref: { type: String, default: null, maxlength: 200 },
    audience: {
      type: String,
      enum: ["all", "free", "premium"],
      default: "all",
    },
    active: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

announcementSchema.index({ active: 1, priority: -1, publishedAt: -1 });

const Announcement = mongoose.model("Announcement", announcementSchema);

module.exports = Announcement;
