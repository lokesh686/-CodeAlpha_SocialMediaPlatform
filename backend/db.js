const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'social.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    website TEXT DEFAULT '',
    postsCount INTEGER DEFAULT 0,
    isVerified INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS follows (
    followerId INTEGER NOT NULL,
    followingId INTEGER NOT NULL,
    PRIMARY KEY (followerId, followingId)
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    caption TEXT DEFAULT '',
    image TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    isPublic INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS post_likes (
    postId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    PRIMARY KEY (postId, userId)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    postId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    text TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comment_likes (
    commentId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    PRIMARY KEY (commentId, userId)
  );
`);

module.exports = db;
