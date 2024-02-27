const mongoose = require("mongoose");
const { Schema } = mongoose;

const medicaoSchema = new Schema({
  period: {
    type: String,
    default: null
  },
  value: {
    type: Number,
    default: null
  },
  date: {
    type: Date,
    default: Date.now
  },
  diet: {
    type: Boolean,
    default: null
  },
  food: {
    type: String,
    default: null
  },
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Medicao = mongoose.model("Medicao", medicaoSchema);

module.exports = Medicao;