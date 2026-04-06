const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 30 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  displayName: { type: String, required: true, trim: true },
  avatar: { type: String, default: null },
  avatarPublicId: { type: String, default: null },
  status: { type: String, enum: ['online', 'away', 'busy', 'offline'], default: 'offline' },
  statusMessage: { type: String, default: '', maxlength: 100 },
  bio: { type: String, default: '', maxlength: 200 },
  timezone: { type: String, default: 'UTC' },
  phone: { type: String, default: '' },
  title: { type: String, default: '', maxlength: 80 },
  workspaces: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' }],
  lastSeen: { type: Date, default: Date.now },
  refreshToken: { type: String, select: false },
  notificationSettings: {
    mentions: { type: Boolean, default: true },
    directMessages: { type: Boolean, default: true },
    channelMessages: { type: Boolean, default: false },
    sounds: { type: Boolean, default: true },
  },
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  pushTokens: [{ type: String }],
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    displayName: this.displayName,
    avatar: this.avatar,
    avatarPublicId: this.avatarPublicId,
    status: this.status,
    statusMessage: this.statusMessage,
    bio: this.bio,
    title: this.title,
    timezone: this.timezone,
    lastSeen: this.lastSeen,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
