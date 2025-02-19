const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  isAnonymous: { type: Boolean, default: false }
});

const PostSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  comments: [CommentSchema],
  isAnonymous: { type: Boolean, default: false }
});

module.exports = mongoose.model('Post', PostSchema);