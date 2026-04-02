const express = require('express');
const router = express.Router();
const StarredMessage = require('../models/StarredMessage');
const Message = require('../models/Message');
const { authenticate } = require('../middleware/auth');

// GET /api/starred?workspaceId=xxx  — list starred messages for user
router.get('/', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

    const starred = await StarredMessage.find({ user: req.userId, workspace: workspaceId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate({
        path: 'message',
        populate: { path: 'sender', select: 'displayName avatar username' },
      })
      .populate('channel', 'name')
      .lean();

    // Filter out any whose message was deleted
    const active = starred.filter(s => s.message && !s.message.isDeleted);
    res.json({ starred: active });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch starred messages' });
  }
});

// POST /api/starred  — star a message
router.post('/', authenticate, async (req, res) => {
  try {
    const { messageId, workspaceId } = req.body;
    if (!messageId || !workspaceId) return res.status(400).json({ error: 'messageId and workspaceId required' });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const existing = await StarredMessage.findOne({ user: req.userId, message: messageId });
    if (existing) return res.status(409).json({ error: 'Already starred', starred: existing });

    const starred = await StarredMessage.create({
      user: req.userId,
      message: messageId,
      workspace: workspaceId,
      channel: message.channel,
      dm: message.dm,
    });
    res.status(201).json({ starred });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Already starred' });
    res.status(500).json({ error: 'Failed to star message' });
  }
});

// DELETE /api/starred/:messageId  — unstar a message
router.delete('/:messageId', authenticate, async (req, res) => {
  try {
    await StarredMessage.findOneAndDelete({ user: req.userId, message: req.params.messageId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unstar message' });
  }
});

module.exports = router;
