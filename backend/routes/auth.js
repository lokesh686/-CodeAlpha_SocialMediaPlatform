const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const signToken = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { username, name, email, password } = req.body;
    if (!username || !name || !email || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });
    if (await User.findOne({ email }))
      return res.status(400).json({ success: false, message: 'Email already in use' });
    if (await User.findOne({ username }))
      return res.status(400).json({ success: false, message: 'Username taken' });
    const user = await User.create({ username, name, email, password });
    const token = signToken(user._id);
    res.status(201).json({ success: true, token, user: { _id: user._id, username: user.username, name: user.name, email: user.email } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = signToken(user._id);
    res.json({ success: true, token, user: { _id: user._id, username: user.username, name: user.name, email: user.email, avatar: user.avatar, bio: user.bio } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/me', protect, (req, res) => res.json({ success: true, user: req.user }));

router.put('/profile', protect, async (req, res) => {
  try {
    const { name, bio, website, avatar } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, bio, website, avatar }, { new: true });
    res.json({ success: true, user });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
