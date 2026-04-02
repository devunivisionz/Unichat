const express = require('express');
const router = express.Router();
const DirectMessage = require('../models/DirectMessage');
const Message = require('../models/Message');
const Workspace = require('../models/Workspace');
const { authenticate } = require('../middleware/auth');

// GET /api/dms?workspaceId=xxx - List all DM conversations
// NOTE: kept as query param to avoid route collision with /:dmId/messages
router.get('/', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId query param required' });

    const dms = await DirectMessage.find({
      workspace: workspaceId,
      participants: req.userId,
    })
      .populate('participants', 'displayName avatar username status statusMessage lastSeen')
      .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'displayName username' } })
      .sort({ lastActivity: -1 });

    // Add unread counts
    const dmsWithUnread = await Promise.all(dms.map(async (dm) => {
      const dmObj = dm.toObject();
      const memberData = dm.memberData.find(m => m.user.toString() === req.userId);
      if (memberData) {
        const unreadCount = await Message.countDocuments({
          dm: dm._id,
          createdAt: { $gt: memberData.lastRead },
          sender: { $ne: req.userId },
          isDeleted: false,
        });
        dmObj.unreadCount = unreadCount;
      } else {
        dmObj.unreadCount = 0;
      }
      return dmObj;
    }));

    res.json({ dms: dmsWithUnread });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch DMs' });
  }
});

// POST /api/dms - Create or get DM
router.post('/', authenticate, async (req, res) => {
  try {
    const { workspaceId, participantIds = [], isGroup = false, groupName } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }
    if (!Array.isArray(participantIds)) {
      return res.status(400).json({ error: 'participantIds must be an array' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    if (!workspace.isMember(req.userId)) return res.status(403).json({ error: 'Not a member' });

    const requestedParticipantIds = [...new Set(participantIds.map((id) => id?.toString()).filter(Boolean))];
    if (requestedParticipantIds.length === 0) {
      return res.status(400).json({ error: 'At least one participant is required' });
    }

    const invalidParticipantId = requestedParticipantIds.find((participantId) => !workspace.isMember(participantId));
    if (invalidParticipantId) {
      return res.status(403).json({ error: 'One or more participants are not members of this workspace' });
    }

    const allParticipants = [...new Set([req.userId, ...requestedParticipantIds])];
    if (!isGroup && allParticipants.length !== 2) {
      return res.status(400).json({ error: 'Direct messages must have exactly two participants' });
    }

    if (!isGroup && allParticipants.length === 2) {
      // Find existing DM
      const existing = await DirectMessage.findOne({
        workspace: workspaceId,
        isGroup: false,
        participants: { $all: allParticipants, $size: 2 },
      }).populate('participants', 'displayName avatar username status');

      if (existing) return res.json({ dm: existing });
    }

    const dm = new DirectMessage({
      workspace: workspaceId,
      participants: allParticipants,
      isGroup,
      groupName: isGroup ? groupName : undefined,
      createdBy: req.userId,
      memberData: allParticipants.map(uid => ({ user: uid, lastRead: new Date() })),
    });
    await dm.save();

    const populated = await DirectMessage.findById(dm._id)
      .populate('participants', 'displayName avatar username status');

    const io = req.app.get('io');
    allParticipants.forEach(uid => {
      io.to(`user:${uid}`).emit('dm:created', populated);
    });

    res.status(201).json({ dm: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create DM' });
  }
});

// GET /api/dms/:dmId/messages - Fetch messages for a DM conversation
router.get('/:dmId/messages', authenticate, async (req, res) => {
  try {
    const { before, limit = 50 } = req.query;
    const dm = await DirectMessage.findById(req.params.dmId);
    if (!dm) return res.status(404).json({ error: 'Not found' });
    if (!dm.participants.some(p => p.toString() === req.userId)) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    const query = { dm: req.params.dmId, 'thread.parentMessage': null, isDeleted: false };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('sender', 'displayName avatar username status')
      .lean();

    // Mark as read
    await DirectMessage.updateOne(
      { _id: req.params.dmId, 'memberData.user': req.userId },
      { $set: { 'memberData.$.lastRead': new Date() } }
    );

    res.json({ messages: messages.reverse(), hasMore: messages.length === parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch DM messages' });
  }
});

// PUT /api/dms/:dmId/mark-read
router.put('/:dmId/mark-read', authenticate, async (req, res) => {
  try {
    await DirectMessage.updateOne(
      { _id: req.params.dmId, 'memberData.user': req.userId },
      { $set: { 'memberData.$.lastRead': new Date() } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

module.exports = router;
