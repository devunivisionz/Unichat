const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

const PAGE_SIZE = 50;

// Helper: extract mentions from content
const extractMentions = async (content, workspaceId) => {
  const User = require('../models/User');
  const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
  const matches = [...content.matchAll(mentionRegex)].map(m => m[1]);
  if (!matches.length) return [];
  const users = await User.find({ username: { $in: matches } }).select('_id');
  return users.map(u => u._id);
};

// GET /api/messages/channel/:channelId
router.get('/channel/:channelId', authenticate, async (req, res) => {
  try {
    const { before, limit = PAGE_SIZE } = req.query;
    const channel = await Channel.findById(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const query = {
      channel: req.params.channelId,
      'thread.parentMessage': null,
      isDeleted: false,
    };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('sender', 'displayName avatar username status')
      .populate('thread.participants', 'displayName avatar')
      .lean();

    // Mark channel as read
    await Channel.updateOne(
      { _id: channel._id, 'members.user': req.userId },
      { $set: { 'members.$.lastRead': new Date() } }
    );

    res.json({ messages: messages.reverse(), hasMore: messages.length === parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// GET /api/messages/thread/:parentId
router.get('/thread/:parentId', authenticate, async (req, res) => {
  try {
    const parent = await Message.findById(req.params.parentId)
      .populate('sender', 'displayName avatar username');
    if (!parent) return res.status(404).json({ error: 'Not found' });

    const replies = await Message.find({
      'thread.parentMessage': req.params.parentId,
      isDeleted: false,
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'displayName avatar username')
      .lean();

    res.json({ parent, replies });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// POST /api/messages - Send message
router.post('/', authenticate, [
  body('content').optional().isString(),
  body('channelId').optional().isMongoId(),
  body('dmId').optional().isMongoId(),
  body('workspaceId').isMongoId(),
  body('parentMessageId').optional().isMongoId(),
], async (req, res) => {
  try {
    const { workspaceId, channelId, dmId, content, attachments, parentMessageId } = req.body;

    if (!content && (!attachments || !attachments.length)) {
      return res.status(400).json({ error: 'Message must have content or attachments' });
    }
    if (!channelId && !dmId) {
      return res.status(400).json({ error: 'channelId or dmId required' });
    }

    const messageData = {
      workspace: workspaceId,
      sender: req.userId,
      content: content || '',
      attachments: attachments || [],
    };

    if (channelId) messageData.channel = channelId;
    if (dmId) messageData.dm = dmId;

    if (parentMessageId) {
      messageData.thread = { parentMessage: parentMessageId };
    }

    // Extract mentions
    if (content) {
      messageData.mentions = await extractMentions(content, workspaceId);
    }

    const message = await Message.create(messageData);

    // If reply, update parent thread
    if (parentMessageId) {
      await Message.findByIdAndUpdate(parentMessageId, {
        $inc: { 'thread.replyCount': 1 },
        $set: { 'thread.lastReplyAt': new Date() },
        $addToSet: { 'thread.participants': req.userId },
      });
    }

    // Update channel last activity OR DM lastMessage/lastActivity
    if (channelId) {
      await Channel.findByIdAndUpdate(channelId, {
        lastActivity: new Date(),
        $inc: { messageCount: 1 },
      });
    } else if (dmId) {
      await require('../models/DirectMessage').findByIdAndUpdate(dmId, {
        lastMessage: message._id,
        lastActivity: new Date(),
      });
    }

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'displayName avatar username status');

    const notificationsToCreate = [];

    // Notifications for @mentions
    if (messageData.mentions && messageData.mentions.length > 0) {
      messageData.mentions
        .filter(uid => uid.toString() !== req.userId)
        .forEach(uid => {
          notificationsToCreate.push({
            recipient: uid,
            workspace: workspaceId,
            type: 'mention',
            actor: req.userId,
            message: message._id,
            channel: channelId || undefined,
            dm: dmId || undefined,
            content: content.substring(0, 100),
          });
        });
    }

    // Notification for DM (non-group: notify the other participant)
    if (dmId) {
      const DirectMessage = require('../models/DirectMessage');
      const dm = await DirectMessage.findById(dmId).select('participants isGroup');
      if (dm) {
        const recipients = dm.participants
          .map(p => p.toString())
          .filter(p => p !== req.userId);
        recipients.forEach(uid => {
          notificationsToCreate.push({
            recipient: uid,
            workspace: workspaceId,
            type: 'dm',
            actor: req.userId,
            message: message._id,
            dm: dmId,
            content: content ? content.substring(0, 100) : '',
          });
        });
      }
    }

    // Notification for thread reply — notify parent sender + participants
    if (parentMessageId) {
      const parentMsg = await Message.findById(parentMessageId).select('sender thread workspace');
      if (parentMsg) {
        const notifySet = new Set([
          parentMsg.sender.toString(),
          ...(parentMsg.thread.participants || []).map(p => p.toString()),
        ]);
        notifySet.delete(req.userId);
        notifySet.forEach(uid => {
          notificationsToCreate.push({
            recipient: uid,
            workspace: workspaceId,
            type: 'thread_reply',
            actor: req.userId,
            message: message._id,
            channel: channelId || undefined,
            content: content ? content.substring(0, 100) : '',
          });
        });
      }
    }

    if (notificationsToCreate.length) {
      await Notification.insertMany(notificationsToCreate);
    }

    // Emit via socket
    const io = req.app.get('io');
    const room = channelId ? `channel:${channelId}` : `dm:${dmId}`;
    io.to(room).emit('message:new', populatedMessage);

    if (parentMessageId) {
      io.to(`thread:${parentMessageId}`).emit('message:new_reply', populatedMessage);
    }

    // Push notification events to recipients
    notificationsToCreate.forEach(n => {
      io.to(`user:${n.recipient}`).emit('notification:new', {
        type: n.type,
        message: populatedMessage,
      });
    });

    res.status(201).json({ message: populatedMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// PUT /api/messages/:messageId - Edit message
router.put('/:messageId', authenticate, [
  body('content').isString().isLength({ min: 1 }),
], async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Not found' });
    if (message.sender.toString() !== req.userId) return res.status(403).json({ error: 'Not your message' });

    message.content = req.body.content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populated = await Message.findById(message._id).populate('sender', 'displayName avatar username');

    const io = req.app.get('io');
    const room = message.channel ? `channel:${message.channel}` : `dm:${message.dm}`;
    io.to(room).emit('message:updated', populated);

    res.json({ message: populated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// DELETE /api/messages/:messageId
router.delete('/:messageId', authenticate, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Not found' });

    const isSender = message.sender.toString() === req.userId;

    // Check if requester is a channel admin or workspace owner/admin
    let isAdmin = false;
    if (!isSender && message.channel) {
      const channel = await Channel.findById(message.channel).select('members workspace');
      if (channel) {
        const member = channel.members.find(m => m.user.toString() === req.userId);
        if (member && member.role === 'admin') isAdmin = true;

        if (!isAdmin) {
          const Workspace = require('../models/Workspace');
          const ws = await Workspace.findById(channel.workspace).select('members');
          if (ws && ws.isAdmin(req.userId)) isAdmin = true;
        }
      }
    }

    if (!isSender && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = '';
    message.attachments = [];
    await message.save();

    const io = req.app.get('io');
    const room = message.channel ? `channel:${message.channel}` : `dm:${message.dm}`;
    io.to(room).emit('message:deleted', { messageId: message._id });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// POST /api/messages/:messageId/react
router.post('/:messageId/react', authenticate, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Not found' });

    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    if (existingReaction) {
      const userIdx = existingReaction.users.indexOf(req.userId);
      if (userIdx > -1) {
        existingReaction.users.splice(userIdx, 1);
        existingReaction.count--;
        if (existingReaction.count === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        existingReaction.users.push(req.userId);
        existingReaction.count++;
      }
    } else {
      message.reactions.push({ emoji, users: [req.userId], count: 1 });
    }

    await message.save();

    const io = req.app.get('io');
    const room = message.channel ? `channel:${message.channel}` : `dm:${message.dm}`;
    io.to(room).emit('message:reaction', { messageId: message._id, reactions: message.reactions });

    // Notify original sender
    if (message.sender.toString() !== req.userId) {
      await Notification.create({
        recipient: message.sender,
        workspace: message.workspace,
        type: 'reaction',
        actor: req.userId,
        message: message._id,
        content: emoji,
      });
      io.to(`user:${message.sender}`).emit('notification:new', { type: 'reaction', emoji });
    }

    res.json({ reactions: message.reactions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// POST /api/messages/:messageId/pin
router.post('/:messageId/pin', authenticate, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Not found' });

    message.isPinned = !message.isPinned;
    await message.save();

    if (message.channel) {
      const op = message.isPinned
        ? { $push: { pinnedMessages: { message: message._id, pinnedBy: req.userId } } }
        : { $pull: { pinnedMessages: { message: message._id } } };
      await Channel.findByIdAndUpdate(message.channel, op);
    }

    const io = req.app.get('io');
    const room = message.channel ? `channel:${message.channel}` : `dm:${message.dm}`;
    io.to(room).emit('message:pinned', { messageId: message._id, isPinned: message.isPinned });

    res.json({ isPinned: message.isPinned });
  } catch (err) {
    res.status(500).json({ error: 'Failed to pin message' });
  }
});

module.exports = router;
