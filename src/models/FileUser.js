const mongoose = require("mongoose");
const { Schema } = mongoose;

const fileUserSchema = new Schema({
    name: String,
    size: Number,
    key: String,
    alt: String,
    url: String,
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        default: null
    },
});

const FileUser = mongoose.model("FileUser", fileUserSchema);

module.exports = FileUser;