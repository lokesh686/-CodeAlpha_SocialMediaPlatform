const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect } = require('../middleware/auth');

const enrichPost = (post, userId) => {
  if (!post) return null;
  post._id = post.id;
  post.tags = JSON.parse(post.tags || '[]');
  post.likesCount = db.prepare('SELECT COUNT(*) as c FROM post_likes WHERE postId=?').get(post.id).c;
  post.liked = !!db.prepare('SELECT 1 FROM post_likes WHERE postId=? AND userId=?').get(post.id, userId);
  post.comments = db.prepare(`
    SELECT c.*, u.username, u.name, u.avatar FROM comments c
    JOIN users u ON u.id = c.userId WHERE c.postId=? ORDER BY c.createdAt ASC
  `).all(post.id);
  const u = db.prepare('SELECT id, username, name, avatar, isVerified FROM users WHERE id=?').get(post.userId);
  post.user = u ? { _id: u.id, ...u } : null;
  return post;
};

// GET /api/posts/feed
router.get('/feed', protect, (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  const followingIds = db.prepare('SELECT followingId FROM follows WHERE followerId=?').all(req.user.id).map(r => r.followingId);
  const ids = [req.user.id, ...followingIds];
  const placeholders = ids.map(() => '?').join(',');
  const posts = db.prepare(`SELECT * FROM posts WHERE userId IN (${placeholders}) AND isPublic=1 ORDER BY createdAt DESC LIMIT ? OFFSET ?`)
    .all(...ids, Number(limit), skip).map(p => enrichPost(p, req.user.id));
  const total = db.prepare(`SELECT COUNT(*) as c FROM posts WHERE userId IN (${placeholders}) AND isPublic=1`).get(...ids).c;
  res.json({ success: true, posts, total, hasMore: skip + posts.length < total });
});

// GET /api/posts/explore
router.get('/explore', protect, (req, res) => {
  const { page = 1, limit = 12 } = req.query;
  const skip = (page - 1) * limit;
  const posts = db.prepare('SELECT * FROM posts WHERE isPublic=1 ORDER BY createdAt DESC LIMIT ? OFFSET ?')
    .all(Number(limit), skip).map(p => enrichPost(p, req.user.id));
  res.json({ success: true, posts });
});

// POST /api/posts
router.post('/', protect, (req, res) => {
  try {
    const { caption, image, tags, isPublic } = req.body;
    if (!caption && !image) return res.status(400).json({ success: false, message: 'Caption or image required' });
    const tagsArr = tags ? tags.split(',').map(t => t.trim().replace('#', '')) : [];
    const result = db.prepare('INSERT INTO posts (userId, caption, image, tags, isPublic) VALUES (?,?,?,?,?)')
      .run(req.user.id, caption || '', image || '', JSON.stringify(tagsArr), isPublic !== false ? 1 : 0);
    db.prepare('UPDATE users SET postsCount = postsCount + 1 WHERE id=?').run(req.user.id);
    const post = enrichPost(db.prepare('SELECT * FROM posts WHERE id=?').get(result.lastInsertRowid), req.user.id);
    res.status(201).json({ success: true, post });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/posts/:id
router.get('/:id', protect, (req, res) => {
  const post = enrichPost(db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id), req.user.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
  res.json({ success: true, post });
});

// DELETE /api/posts/:id
router.delete('/:id', protect, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
  if (post.userId !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
  db.prepare('DELETE FROM posts WHERE id=?').run(req.params.id);
  db.prepare('UPDATE users SET postsCount = postsCount - 1 WHERE id=?').run(req.user.id);
  res.json({ success: true, message: 'Post deleted' });
});

// POST /api/posts/:id/like
router.post('/:id/like', protect, (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
  const existing = db.prepare('SELECT 1 FROM post_likes WHERE postId=? AND userId=?').get(req.params.id, req.user.id);
  if (existing) {
    db.prepare('DELETE FROM post_likes WHERE postId=? AND userId=?').run(req.params.id, req.user.id);
  } else {
    db.prepare('INSERT INTO post_likes (postId, userId) VALUES (?,?)').run(req.params.id, req.user.id);
  }
  const likesCount = db.prepare('SELECT COUNT(*) as c FROM post_likes WHERE postId=?').get(req.params.id).c;
  res.json({ success: true, liked: !existing, likesCount });
});

// POST /api/posts/:id/comment
router.post('/:id/comment', protect, (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, message: 'Comment text required' });
  const post = db.prepare('SELECT id FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
  const result = db.prepare('INSERT INTO comments (postId, userId, text) VALUES (?,?,?)').run(req.params.id, req.user.id, text);
  const comment = db.prepare('SELECT c.*, u.username, u.name, u.avatar FROM comments c JOIN users u ON u.id=c.userId WHERE c.id=?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, comment });
});

// DELETE /api/posts/:id/comment/:commentId
router.delete('/:id/comment/:commentId', protect, (req, res) => {
  const post = db.prepare('SELECT userId FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
  const comment = db.prepare('SELECT * FROM comments WHERE id=?').get(req.params.commentId);
  if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
  if (comment.userId !== req.user.id && post.userId !== req.user.id)
    return res.status(403).json({ success: false, message: 'Not authorized' });
  db.prepare('DELETE FROM comments WHERE id=?').run(req.params.commentId);
  res.json({ success: true, message: 'Comment deleted' });
});

module.exports = router;
