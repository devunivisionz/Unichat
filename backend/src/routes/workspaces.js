const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const User = require('../models/User');
const Message = require('../models/Message');
const { authenticate } = require('../middleware/auth');
const { ensureDefaultWorkspaceMembership } = require('../utils/defaultWorkspace');

// GET /api/workspaces - List user's workspaces
router.get('/', authenticate, async (req, res) => {
  try {
    await ensureDefaultWorkspaceMembership(req.userId);
    const workspaces = await Workspace.find({
      'members.user': req.userId,
      isArchived: false,
    }).populate('owner', 'displayName avatar username').lean();
    res.json({ workspaces });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// POST /api/workspaces - Create workspace
router.post('/', authenticate, [
  body('name').isLength({ min: 2, max: 80 }).trim(),
  body('slug').isLength({ min: 2, max: 40 }).matches(/^[a-z0-9-]+$/).optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const { name, description } = req.body;
    const slug = req.body.slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40);

    const existingSlug = await Workspace.findOne({ slug });
    if (existingSlug) return res.status(409).json({ error: 'Workspace slug already taken' });

    const workspace = new Workspace({
      name, slug, description,
      owner: req.userId,
      members: [{ user: req.userId, role: 'owner' }],
    });
    await workspace.save();

    // Create default channels
    const defaultChannels = ['general', 'random'];
    const channels = await Channel.insertMany(defaultChannels.map(cname => ({
      workspace: workspace._id,
      name: cname,
      description: cname === 'general' ? 'Company-wide announcements and work-based matters' : 'A place for non-work banter',
      type: 'public',
      createdBy: req.userId,
      isDefault: true,
      members: [{ user: req.userId, role: 'admin' }],
    })));

    // Update user's workspaces
    await User.findByIdAndUpdate(req.userId, { $addToSet: { workspaces: workspace._id } });

    // Send system message to #general
    await Message.create({
      workspace: workspace._id,
      channel: channels[0]._id,
      sender: req.userId,
      content: `Welcome to ${name}! 🎉`,
      isSystemMessage: true,
      systemMessageType: 'workspace_created',
    });

    const io = req.app.get('io');
    io.to(`user:${req.userId}`).emit('workspace:created', workspace);

    res.status(201).json({ workspace, channels });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// GET /api/workspaces/:workspaceId
router.get('/:workspaceId', authenticate, async (req, res) => {
  try {
    await ensureDefaultWorkspaceMembership(req.userId);
    const workspace = await Workspace.findById(req.params.workspaceId)
      .populate('members.user', 'displayName avatar username status statusMessage title')
      .populate('owner', 'displayName avatar username');

    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    if (!workspace.isMember(req.userId)) return res.status(403).json({ error: 'Not a member' });

    res.json({ workspace });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
});

// POST /api/workspaces/join/:inviteCode
router.post('/join/:inviteCode', authenticate, async (req, res) => {
  try {
    const workspace = await Workspace.findOne({ inviteCode: req.params.inviteCode.toUpperCase() });
    if (!workspace) return res.status(404).json({ error: 'Invalid invite code' });
    if (workspace.isMember(req.userId)) return res.status(409).json({ error: 'Already a member' });

    workspace.members.push({ user: req.userId, role: 'member' });
    await workspace.save();

    // Add user to default channels
    await Channel.updateMany(
      { workspace: workspace._id, isDefault: true },
      { $push: { members: { user: req.userId, role: 'member' } } }
    );

    await User.findByIdAndUpdate(req.userId, { $addToSet: { workspaces: workspace._id } });

    const io = req.app.get('io');
    io.to(`workspace:${workspace._id}`).emit('workspace:member_joined', {
      workspaceId: workspace._id,
      userId: req.userId,
    });

    res.json({ workspace });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join workspace' });
  }
});

// GET /api/workspaces/:workspaceId/members
router.get('/:workspaceId/members', authenticate, async (req, res) => {
  try {
    await ensureDefaultWorkspaceMembership(req.userId);
    const workspace = await Workspace.findById(req.params.workspaceId)
      .populate('members.user', 'displayName avatar username status statusMessage title lastSeen');
    if (!workspace) return res.status(404).json({ error: 'Not found' });
    if (!workspace.isMember(req.userId)) return res.status(403).json({ error: 'Not a member' });

    res.json({ members: workspace.members });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// PUT /api/workspaces/:workspaceId
router.put('/:workspaceId', authenticate, [
  body('name').isLength({ min: 2, max: 80 }).optional(),
  body('description').isLength({ max: 300 }).optional(),
], async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return res.status(404).json({ error: 'Not found' });
    if (!workspace.isAdmin(req.userId)) return res.status(403).json({ error: 'Admin access required' });

    const { name, description, icon } = req.body;
    if (name) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    if (icon) workspace.icon = icon;
    await workspace.save();

    const io = req.app.get('io');
    io.to(`workspace:${workspace._id}`).emit('workspace:updated', workspace);

    res.json({ workspace });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

// POST /api/workspaces/:workspaceId/regenerate-invite
router.post('/:workspaceId/regenerate-invite', authenticate, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return res.status(404).json({ error: 'Not found' });
    if (!workspace.isAdmin(req.userId)) return res.status(403).json({ error: 'Admin required' });

    const { v4: uuidv4 } = require('uuid');
    workspace.inviteCode = uuidv4().slice(0, 8).toUpperCase();
    await workspace.save();

    res.json({ inviteCode: workspace.inviteCode });
  } catch (err) {
    res.status(500).json({ error: 'Failed to regenerate invite' });
  }
});

module.exports = router;
