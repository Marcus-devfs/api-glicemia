const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
   name: {
      type: String,
      required: "O campo 'nome' é obrigatório"
   },
   email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true
   },
   telephone: {
      type: String,
      default: null
   },
   gender: {
      type: String,
      default: null
   },
   birthDate: {
      type: Date,
      default: null
   },
   password: {
      type: String,
      select: false,
      required: false,
      default: null
   },

   createdAt: {
      type: Date,
      default: new Date(),
      select: false
   },
   token: {
      type: 'String',
   },

   photoPerfil: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "FileUser",
      default: null,
   }],

   pushSubscriptions: [{
      endpoint: { type: String, required: true },
      keys: {
         p256dh: { type: String, required: true },
         auth: { type: String, required: true },
      },
      createdAt: { type: Date, default: Date.now },
   }],

   preferences: {
      notificationsEnabled: { type: Boolean, default: false },
      timezone: { type: String, default: "America/Sao_Paulo" },
      reminders: [{
         id: String,
         period: String,
         time: String,
         label: String,
      }],
   },

   notificationState: {
      date: String,
      sentSlots: [String],
   },

   pdf_downloads_count: {
      type: Number,
      default: 0,
   },

   is_premium: {
      type: Boolean,
      default: false,
   },

   passwordResetToken: {
      type: String,
      select: false,
      default: null,
   },

   passwordResetExpires: {
      type: Date,
      select: false,
      default: null,
   },
});

const User = mongoose.model("User", userSchema);

module.exports = User;