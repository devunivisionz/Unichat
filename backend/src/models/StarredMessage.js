const mongoose = require('mongoose');

const starredMessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },
  dm: { type: mongoose.Schema.Types.ObjectId, ref: 'DirectMessage' },
}, { timestamps: true });

starredMessageSchema.index({ user: 1, message: 1 }, { unique: true });
starredMessageSchema.index({ user: 1, workspace: 1, createdAt: -1 });

module.exports = mongoose.model('StarredMessage', starredMessageSchema);
