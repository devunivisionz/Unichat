const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
  type: {
    type: String,
    enum: ['mention', 'reply', 'reaction', 'dm', 'channel_invite', 'workspace_invite', 'thread_reply', 'system'],
    required: true,
  },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },
  dm: { type: mongoose.Schema.Types.ObjectId, ref: 'DirectMessage' },
  content: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
