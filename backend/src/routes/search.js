const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// GET /api/search
router.get('/', authenticate, async (req, res) => {
  try {
    const { q, workspaceId, type = 'all', limit = 20 } = req.query;
    if (!q || q.length < 1) return res.status(400).json({ error: 'Query required' });

    const results = {};
    const regex = new RegExp(q, 'i');

    if (type === 'all' || type === 'messages') {
      results.messages = await Message.find({
        workspace: workspaceId,
        content: { $regex: regex },
        isDeleted: false,
        'thread.parentMessage': null,
      })
        .limit(parseInt(limit))
        .populate('sender', 'displayName avatar username')
        .populate('channel', 'name')
        .sort({ createdAt: -1 })
        .lean();
    }

    if (type === 'all' || type === 'channels') {
      results.channels = await Channel.find({
        workspace: workspaceId,
        name: { $regex: regex },
        type: 'public',
        isArchived: false,
      }).limit(parseInt(limit)).lean();
    }

    if (type === 'all' || type === 'users') {
      const Workspace = require('../models/Workspace');
      const ws = await Workspace.findById(workspaceId).select('members');
      const memberIds = ws ? ws.members.map(m => m.user) : [];
      results.users = await User.find({
        _id: { $in: memberIds },
        $or: [
          { displayName: { $regex: regex } },
          { username: { $regex: regex } },
          { email: { $regex: regex } },
        ],
      }).limit(parseInt(limit)).lean();
    }

    if (type === 'all' || type === 'files') {
      results.files = await Message.find({
        workspace: workspaceId,
        'attachments.0': { $exists: true },
        isDeleted: false,
      })
        .limit(parseInt(limit))
        .populate('sender', 'displayName avatar username')
        .populate('channel', 'name')
        .sort({ createdAt: -1 })
        .lean();
    }

    res.json({ results, query: q });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
