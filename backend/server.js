const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes  = require('./routes/auth');
const postRoutes  = require('./routes/posts');
const userRoutes  = require('./routes/users');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(process.env.PORT || 5001, () =>
      console.log(`🚀 Social Media Server on port ${process.env.PORT || 5001}`));
  })
  .catch(err => { console.error('❌', err); process.exit(1); });

module.exports = app;
