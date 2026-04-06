const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// GET /api/users/profile/:userId
router.get('/profile/:userId', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { 
      _id: user._id, 
      username: user.username, 
      displayName: user.displayName, 
      avatar: user.avatar, 
      avatarPublicId: user.avatarPublicId,
      status: user.status, 
      statusMessage: user.statusMessage, 
      bio: user.bio, 
      title: user.title, 
      timezone: user.timezone, 
      lastSeen: user.lastSeen, 
      createdAt: user.createdAt 
    } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/users/profile
router.put('/profile', authenticate, [
  body('displayName').isLength({ min: 1, max: 50 }).optional(),
  body('bio').isLength({ max: 200 }).optional(),
  body('title').isLength({ max: 80 }).optional(),
  body('statusMessage').isLength({ max: 100 }).optional(),
  body('status').isIn(['online', 'away', 'busy', 'offline']).optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed' });

    const updates = {};
    const fields = ['displayName', 'bio', 'title', 'timezone', 'phone', 'status', 'statusMessage', 'theme'];
    fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    
    if (req.body.avatar) {
      updates.avatar = req.body.avatar;
      if (req.body.avatarPublicId) {
        updates.avatarPublicId = req.body.avatarPublicId;
        
        // Delete old avatar from Cloudinary if it exists
        const user = await User.findById(req.userId);
        if (user && user.avatarPublicId && process.env.CLOUDINARY_CLOUD_NAME) {
          const cloudinary = require('cloudinary').v2;
          cloudinary.uploader.destroy(user.avatarPublicId).catch(err => {
            console.error('Failed to delete old avatar:', err);
          });
        }
      }
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const io = req.app.get('io');
    io.emit('user:presence_update', { userId: req.userId, status: user.status, statusMessage: user.statusMessage });

    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/users/password
router.put('/password', authenticate, [
  body('currentPassword').exists(),
  body('newPassword').isLength({ min: 6 }),
], async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('+password');
    if (!user) return res.status(404).json({ error: 'Not found' });
    const valid = await user.comparePassword(req.body.currentPassword);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });
    user.password = req.body.newPassword;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// GET /api/users/search
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, workspaceId } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const Workspace = require('../models/Workspace');
    const ws = await Workspace.findById(workspaceId).select('members');
    const memberIds = ws ? ws.members.map(m => m.user) : [];
    const regex = new RegExp(q, 'i');
    const users = await User.find({
      _id: { $in: memberIds },
      $or: [{ displayName: regex }, { username: regex }],
    }).limit(20).select('displayName avatar username status statusMessage title');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// PUT /api/users/notification-settings
router.put('/notification-settings', authenticate, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.userId, { notificationSettings: req.body }, { new: true });
    res.json({ notificationSettings: user.notificationSettings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST /api/users/push-token
router.post('/push-token', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    await User.findByIdAndUpdate(req.userId, { $addToSet: { pushTokens: token } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save push token' });
  }
});

module.exports = router;
