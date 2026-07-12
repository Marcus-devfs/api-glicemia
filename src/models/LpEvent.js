const mongoose = require("mongoose");
const { Schema } = mongoose;

const LP_EVENT_TYPES = [
  "page_view",
  "cta_install",
  "cta_app",
  "cta_register",
  "install_banner_click",
  "install_modal_open",
];

const lpEventSchema = new Schema({
  event: {
    type: String,
    enum: LP_EVENT_TYPES,
    required: true,
    index: true,
  },
  path: { type: String, default: "/" },
  sessionId: { type: String, required: true, index: true },
  utmSource: { type: String, default: null, index: true },
  utmMedium: { type: String, default: null },
  utmCampaign: { type: String, default: null },
  referrer: { type: String, default: null },
  userAgent: { type: String, default: null },
  metadata: { type: Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
});

const LpEvent = mongoose.model("LpEvent", lpEventSchema);

module.exports = LpEvent;
module.exports.LP_EVENT_TYPES = LP_EVENT_TYPES;
