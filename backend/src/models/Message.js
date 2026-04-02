const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  count: { type: Number, default: 0 },
}, { _id: false });

const attachmentSchema = new mongoose.Schema({
  type: { type: String, enum: ['image', 'video', 'audio', 'document', 'link'], required: true },
  url: { type: String, required: true },
  publicId: { type: String },
  name: { type: String },
  size: { type: Number },
  mimeType: { type: String },
  width: { type: Number },
  height: { type: Number },
  thumbnail: { type: String },
  duration: { type: Number },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', index: true },
  dm: { type: mongoose.Schema.Types.ObjectId, ref: 'DirectMessage', index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '', maxlength: 40000 },
  formattedContent: { type: String, default: '' },
  attachments: [attachmentSchema],
  reactions: [reactionSchema],
  thread: {
    parentMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    replyCount: { type: Number, default: 0 },
    lastReplyAt: { type: Date },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  channelMentions: [{ type: String }],
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  isPinned: { type: Boolean, default: false },
  isSystemMessage: { type: Boolean, default: false },
  systemMessageType: { type: String },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ dm: 1, createdAt: -1 });
messageSchema.index({ workspace: 1, content: 'text' });
messageSchema.index({ 'thread.parentMessage': 1 });

module.exports = mongoose.model('Message', messageSchema);
