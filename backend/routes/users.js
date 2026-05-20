const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');

// Search users
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, users: [] });
    const users = await User.find({
      $or: [{ username: { $regex: q, $options: 'i' } }, { name: { $regex: q, $options: 'i' } }]
    }).select('username name bio avatar followers').limit(10);
    res.json({ success: true, users });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Suggestions (people not yet followed)
router.get('/suggestions/list', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    const excluded = [req.user._id, ...me.following];
    const users = await User.find({ _id: { $nin: excluded } })
      .select('username name bio avatar followers').limit(5);
    res.json({ success: true, users });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Get user profile by username
router.get('/:username', protect, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('followers', 'username name avatar')
      .populate('following', 'username name avatar');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const posts = await Post.find({ user: user._id, isPublic: true })
      .sort({ createdAt: -1 })
      .populate('user', 'username name avatar');
    res.json({ success: true, user, posts });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Follow / Unfollow
router.post('/:id/follow', protect, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });
    const isFollowing = target.followers.includes(req.user._id);
    if (isFollowing) {
      target.followers.pull(req.user._id);
      req.user.following.pull(target._id);
    } else {
      target.followers.push(req.user._id);
      req.user.following.push(target._id);
    }
    await target.save();
    await req.user.save();
    res.json({ success: true, following: !isFollowing, followersCount: target.followers.length });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
