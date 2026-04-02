const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  isGroup: { type: Boolean, default: false },
  groupName: { type: String },
  groupIcon: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  lastActivity: { type: Date, default: Date.now },
  memberData: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastRead: { type: Date, default: Date.now },
    isArchived: { type: Boolean, default: false },
    isMuted: { type: Boolean, default: false },
    notificationLevel: { type: String, enum: ['all', 'mentions', 'nothing'], default: 'all' },
  }],
}, { timestamps: true });

directMessageSchema.index({ workspace: 1, participants: 1 });

module.exports = mongoose.model('DirectMessage', directMessageSchema);
