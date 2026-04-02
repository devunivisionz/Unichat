const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Channel = require('../models/Channel');
const Workspace = require('../models/Workspace');
const Message = require('../models/Message');
const { authenticate } = require('../middleware/auth');

// GET /api/channels/workspace/:workspaceId
router.get('/workspace/:workspaceId', authenticate, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace || !workspace.isMember(req.userId)) {
      return res.status(403).json({ error: 'Not a member' });
    }

    const channels = await Channel.find({
      workspace: req.params.workspaceId,
      isArchived: false,
      $or: [
        { type: 'public' },
        { 'members.user': req.userId },
      ],
    }).populate('createdBy', 'displayName username').sort({ name: 1 });

    // Attach unread counts
    const channelsWithUnread = await Promise.all(channels.map(async (ch) => {
      const chObj = ch.toObject();
      const memberData = ch.members.find(m => m.user.toString() === req.userId);
      if (memberData && memberData.lastRead) {
        const unreadCount = await Message.countDocuments({
          channel: ch._id,
          createdAt: { $gt: memberData.lastRead },
          sender: { $ne: req.userId },
          isDeleted: false,
        });
        chObj.unreadCount = unreadCount;
        chObj.isMember = true;
      } else {
        chObj.unreadCount = 0;
        chObj.isMember = ch.members.some(m => m.user.toString() === req.userId);
      }
      return chObj;
    }));

    res.json({ channels: channelsWithUnread });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// POST /api/channels - Create channel
router.post('/', authenticate, [
  body('name').isLength({ min: 1, max: 80 }).trim().toLowerCase(),
  body('workspaceId').isMongoId(),
  body('type').isIn(['public', 'private']).optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed' });

    const { workspaceId, name, description, type = 'public', memberIds = [] } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.isMember(req.userId)) {
      return res.status(403).json({ error: 'Not a member' });
    }

    const existing = await Channel.findOne({ workspace: workspaceId, name: name.toLowerCase() });
    if (existing) return res.status(409).json({ error: `Channel #${name} already exists` });

    const initialMembers = [...new Set([req.userId, ...memberIds])].map(uid => ({
      user: uid,
      role: uid === req.userId ? 'admin' : 'member',
    }));

    const channel = new Channel({
      workspace: workspaceId,
      name: name.toLowerCase(),
      description,
      type,
      createdBy: req.userId,
      members: initialMembers,
    });
    await channel.save();

    // System message
    await Message.create({
      workspace: workspaceId,
      channel: channel._id,
      sender: req.userId,
      content: `Channel #${name} created`,
      isSystemMessage: true,
      systemMessageType: 'channel_created',
    });

    const io = req.app.get('io');
    io.to(`workspace:${workspaceId}`).emit('channel:created', channel);

    res.status(201).json({ channel });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// GET /api/channels/:channelId
router.get('/:channelId', authenticate, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId)
      .populate('members.user', 'displayName avatar username status')
      .populate('createdBy', 'displayName username')
      .populate({ path: 'pinnedMessages.message', populate: { path: 'sender', select: 'displayName avatar username' } });

    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const workspace = await Workspace.findById(channel.workspace);
    if (!workspace || !workspace.isMember(req.userId)) {
      return res.status(403).json({ error: 'Not a member' });
    }

    if (channel.type === 'private' && !channel.isMember(req.userId)) {
      return res.status(403).json({ error: 'Private channel' });
    }

    res.json({ channel });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});

// POST /api/channels/:channelId/join
router.post('/:channelId/join', authenticate, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Not found' });
    if (channel.type === 'private') return res.status(403).json({ error: 'Cannot join private channel' });
    if (channel.isMember(req.userId)) return res.status(409).json({ error: 'Already a member' });

    channel.members.push({ user: req.userId, role: 'member' });
    await channel.save();

    const io = req.app.get('io');
    io.to(`channel:${channel._id}`).emit('channel:member_joined', { channelId: channel._id, userId: req.userId });

    res.json({ channel });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join channel' });
  }
});

// POST /api/channels/:channelId/leave
router.post('/:channelId/leave', authenticate, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Not found' });
    if (channel.isDefault) return res.status(400).json({ error: 'Cannot leave default channel' });

    channel.members = channel.members.filter(m => m.user.toString() !== req.userId);
    await channel.save();

    const io = req.app.get('io');
    io.to(`channel:${channel._id}`).emit('channel:member_left', { channelId: channel._id, userId: req.userId });

    res.json({ message: 'Left channel' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to leave channel' });
  }
});

// PUT /api/channels/:channelId/mark-read
router.put('/:channelId/mark-read', authenticate, async (req, res) => {
  try {
    await Channel.updateOne(
      { _id: req.params.channelId, 'members.user': req.userId },
      { $set: { 'members.$.lastRead': new Date() } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

// PUT /api/channels/:channelId
router.put('/:channelId', authenticate, [
  body('name').isLength({ min: 1, max: 80 }).optional(),
  body('description').isLength({ max: 300 }).optional(),
  body('topic').isLength({ max: 250 }).optional(),
], async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Not found' });

    const member = channel.members.find(m => m.user.toString() === req.userId);
    if (!member || member.role !== 'admin') return res.status(403).json({ error: 'Admin required' });

    const { name, description, topic } = req.body;
    if (name) channel.name = name.toLowerCase();
    if (description !== undefined) channel.description = description;
    if (topic !== undefined) channel.topic = topic;
    await channel.save();

    const io = req.app.get('io');
    io.to(`channel:${channel._id}`).emit('channel:updated', channel);

    res.json({ channel });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update channel' });
  }
});

// POST /api/channels/:channelId/invite
router.post('/:channelId/invite', authenticate, async (req, res) => {
  try {
    const { userIds } = req.body;
    const channel = await Channel.findById(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Not found' });

    const newMembers = userIds.filter(uid => !channel.isMember(uid));
    newMembers.forEach(uid => channel.members.push({ user: uid, role: 'member' }));
    await channel.save();

    const io = req.app.get('io');
    newMembers.forEach(uid => {
      io.to(`user:${uid}`).emit('channel:invited', { channelId: channel._id });
    });

    res.json({ channel });
  } catch (err) {
    res.status(500).json({ error: 'Failed to invite members' });
  }
});

module.exports = router;
