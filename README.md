# 📱 Task 2 — ConnectAlpha Social Media Platform

> CodeAlpha Full Stack Internship — Task 2

A mini social media app with user profiles, posts, comments, likes, and a follow system.

## Tech Stack
- **Frontend:** HTML, CSS (dark theme design system), Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB + Mongoose
- **Auth:** JWT + bcrypt

## Features
- ✅ User registration & login
- ✅ User profiles with bio, avatar, follower/following counts
- ✅ Create text + image posts with tags
- ✅ Personalized feed (posts from people you follow)
- ✅ Explore page (public post grid)
- ✅ Like / unlike posts
- ✅ Comment on posts, delete own comments
- ✅ Follow / unfollow users
- ✅ User search
- ✅ People suggestions sidebar
- ✅ Dark mode UI

## Project Structure
```
Task2_SocialMedia/
├── backend/
│   ├── models/       # User, Post
│   ├── routes/       # auth, posts, users
│   ├── middleware/   # JWT auth guard
│   ├── server.js
│   └── package.json
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

## Setup & Run

```bash
cd backend
npm install
cp .env.example .env
# Set MONGO_URI and JWT_SECRET in .env
npm run dev
```
Open: `http://localhost:5001`

## API Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| GET | /api/posts/feed | Personalized feed |
| GET | /api/posts/explore | All public posts |
| POST | /api/posts | Create post |
| POST | /api/posts/:id/like | Toggle like |
| POST | /api/posts/:id/comment | Add comment |
| GET | /api/users/:username | User profile |
| POST | /api/users/:id/follow | Follow/Unfollow |
| GET | /api/users/search?q= | Search users |
| GET | /api/users/suggestions/list | Suggested users |

## GitHub Repo
`CodeAlpha_SocialMediaPlatform`
