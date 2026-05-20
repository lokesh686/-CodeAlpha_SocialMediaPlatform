const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect } = require('../middleware/auth');

// GET /api/users/search
router.get('/search', protect, (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ success: true, users: [] });
  const users = db.prepare(`SELECT id, username, name, bio, avatar FROM users WHERE username LIKE ? OR name LIKE ? LIMIT 10`)
    .all(`%${q}%`, `%${q}%`).map(u => ({ ...u, _id: u.id, followersCount: db.prepare('SELECT COUNT(*) as c FROM follows WHERE followingId=?').get(u.id).c }));
  res.json({ success: true, users });
});

// GET /api/users/suggestions/list
router.get('/suggestions/list', protect, (req, res) => {
  const following = db.prepare('SELECT followingId FROM follows WHERE followerId=?').all(req.user.id).map(r => r.followingId);
  const excluded = [req.user.id, ...following];
  const placeholders = excluded.map(() => '?').join(',');
  const users = db.prepare(`SELECT id, username, name, bio, avatar FROM users WHERE id NOT IN (${placeholders}) LIMIT 5`)
    .all(...excluded).map(u => ({ ...u, _id: u.id }));
  res.json({ success: true, users });
});

// GET /api/users/:username
router.get('/:username', protect, (req, res) => {
  const user = db.prepare('SELECT id, username, name, email, bio, avatar, website, postsCount, isVerified FROM users WHERE username=?').get(req.params.username);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user._id = user.id;
  user.followers = db.prepare('SELECT u.id, u.username, u.name, u.avatar FROM follows f JOIN users u ON u.id=f.followerId WHERE f.followingId=?').all(user.id);
  user.following = db.prepare('SELECT u.id, u.username, u.name, u.avatar FROM follows f JOIN users u ON u.id=f.followingId WHERE f.followerId=?').all(user.id);
  const posts = db.prepare('SELECT * FROM posts WHERE userId=? AND isPublic=1 ORDER BY createdAt DESC').all(user.id).map(p => ({ ...p, _id: p.id, tags: JSON.parse(p.tags || '[]') }));
  res.json({ success: true, user, posts });
});

// POST /api/users/:id/follow
router.post('/:id/follow', protect, (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
  const target = db.prepare('SELECT id FROM users WHERE id=?').get(targetId);
  if (!target) return res.status(404).json({ success: false, message: 'User not found' });
  const isFollowing = db.prepare('SELECT 1 FROM follows WHERE followerId=? AND followingId=?').get(req.user.id, targetId);
  if (isFollowing) {
    db.prepare('DELETE FROM follows WHERE followerId=? AND followingId=?').run(req.user.id, targetId);
  } else {
    db.prepare('INSERT INTO follows (followerId, followingId) VALUES (?,?)').run(req.user.id, targetId);
  }
  const followersCount = db.prepare('SELECT COUNT(*) as c FROM follows WHERE followingId=?').get(targetId).c;
  res.json({ success: true, following: !isFollowing, followersCount });
});

module.exports = router;
