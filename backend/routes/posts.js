const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/posts/feed — posts from people you follow + your own
router.get('/feed', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    const ids = [...me.following, req.user._id];
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const posts = await Post.find({ user: { $in: ids }, isPublic: true })
      .sort({ createdAt: -1 })
      .skip(skip).limit(Number(limit))
      .populate('user', 'username name avatar isVerified')
      .populate('comments.user', 'username name avatar');
    const total = await Post.countDocuments({ user: { $in: ids }, isPublic: true });
    res.json({ success: true, posts, total, hasMore: skip + posts.length < total });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/posts/explore — all public posts
router.get('/explore', protect, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (page - 1) * limit;
    const posts = await Post.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .skip(skip).limit(Number(limit))
      .populate('user', 'username name avatar isVerified');
    res.json({ success: true, posts });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/posts — create post
router.post('/', protect, async (req, res) => {
  try {
    const { caption, image, tags, isPublic } = req.body;
    if (!caption && !image)
      return res.status(400).json({ success: false, message: 'Caption or image required' });
    const post = await Post.create({
      user: req.user._id, caption, image,
      tags: tags ? tags.split(',').map(t => t.trim().replace('#', '')) : [],
      isPublic: isPublic !== false
    });
    await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: 1 } });
    await post.populate('user', 'username name avatar');
    res.status(201).json({ success: true, post });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/posts/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username name avatar isVerified')
      .populate('comments.user', 'username name avatar');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, post });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE /api/posts/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });
    await post.deleteOne();
    await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: -1 } });
    res.json({ success: true, message: 'Post deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/posts/:id/like — toggle like
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    const liked = post.likes.includes(req.user._id);
    if (liked) post.likes.pull(req.user._id);
    else post.likes.push(req.user._id);
    await post.save();
    res.json({ success: true, liked: !liked, likesCount: post.likes.length });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/posts/:id/comment
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Comment text required' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    post.comments.push({ user: req.user._id, text });
    await post.save();
    await post.populate('comments.user', 'username name avatar');
    const newComment = post.comments[post.comments.length - 1];
    res.status(201).json({ success: true, comment: newComment });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE /api/posts/:id/comment/:commentId
router.delete('/:id/comment/:commentId', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (comment.user.toString() !== req.user._id.toString() && post.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });
    comment.deleteOne();
    await post.save();
    res.json({ success: true, message: 'Comment deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
