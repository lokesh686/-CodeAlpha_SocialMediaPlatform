const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

require('./db');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Social Media Server on port ${PORT}`));

module.exports = app;
