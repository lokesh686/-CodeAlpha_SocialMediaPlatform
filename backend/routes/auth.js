const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { protect } = require('../middleware/auth');

const signToken = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { username, name, email, password } = req.body;
    if (!username || !name || !email || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase()))
      return res.status(400).json({ success: false, message: 'Email already in use' });
    if (db.prepare('SELECT id FROM users WHERE username = ?').get(username))
      return res.status(400).json({ success: false, message: 'Username taken' });
    const hashed = await bcrypt.hash(password, 12);
    const result = db.prepare('INSERT INTO users (username, name, email, password) VALUES (?,?,?,?)').run(username, name, email.toLowerCase(), hashed);
    const token = signToken(result.lastInsertRowid);
    res.status(201).json({ success: true, token, user: { _id: result.lastInsertRowid, username, name, email: email.toLowerCase() } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = signToken(user.id);
    res.json({ success: true, token, user: { _id: user.id, username: user.username, name: user.name, email: user.email, avatar: user.avatar, bio: user.bio } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/me', protect, (req, res) => res.json({ success: true, user: req.user }));

router.put('/profile', protect, (req, res) => {
  try {
    const { name, bio, website, avatar } = req.body;
    db.prepare('UPDATE users SET name=?, bio=?, website=?, avatar=? WHERE id=?').run(name, bio, website, avatar, req.user.id);
    const user = db.prepare('SELECT id, username, name, email, bio, avatar, website FROM users WHERE id=?').get(req.user.id);
    res.json({ success: true, user });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
