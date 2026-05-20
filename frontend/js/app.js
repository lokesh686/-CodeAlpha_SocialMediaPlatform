const API = '/api';
let currentUser = null;
let searchTimer = null;
let feedPage = 1;

// ─── UTILS ────────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('s_token');
const setToken = t => localStorage.setItem('s_token', t);
const clearToken = () => { localStorage.removeItem('s_token'); localStorage.removeItem('s_user'); };
const saveUser = u => localStorage.setItem('s_user', JSON.stringify(u));
const loadUser = () => JSON.parse(localStorage.getItem('s_user') || 'null');

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function authFetch(url, opts = {}) {
  opts.headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (getToken()) opts.headers['Authorization'] = 'Bearer ' + getToken();
  return fetch(url, opts);
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function avatarHTML(user, size = 42) {
  const initials = (user.name || user.username || '?')[0].toUpperCase();
  if (user.avatar) return `<div class="avatar" style="width:${size}px;height:${size}px"><img src="${user.avatar}" alt="${initials}" onerror="this.style.display='none'"/></div>`;
  return `<div class="avatar" style="width:${size}px;height:${size}px">${initials}</div>`;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', (i === 0) === (tab === 'login')));
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const msg = document.getElementById('login-msg');
  msg.textContent = '';
  if (!email || !password) { msg.textContent = 'Fill all fields'; return; }
  try {
    const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (data.success) {
      setToken(data.token); saveUser(data.user); currentUser = data.user;
      initApp();
    } else { msg.textContent = data.message; }
  } catch { msg.textContent = 'Server error'; }
}

async function register() {
  const username = document.getElementById('reg-username').value.trim();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const msg = document.getElementById('reg-msg');
  msg.textContent = '';
  if (!username || !name || !email || !password) { msg.textContent = 'Fill all fields'; return; }
  try {
    const res = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, name, email, password }) });
    const data = await res.json();
    if (data.success) {
      setToken(data.token); saveUser(data.user); currentUser = data.user;
      initApp();
    } else { msg.textContent = data.message; }
  } catch { msg.textContent = 'Server error'; }
}

function logoutUser() {
  clearToken(); currentUser = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
}

// ─── APP INIT ─────────────────────────────────────────────────────────────
function initApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'grid';
  const u = currentUser;
  document.getElementById('sidebar-user').innerHTML = `${avatarHTML(u, 32)}<span style="font-size:0.85rem;margin-left:0.5rem;font-weight:600">${u.name}</span>`;
  showView('feed');
  loadSuggestions();
}

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  const navBtn = document.getElementById('nav-' + name);
  if (navBtn) navBtn.classList.add('active');
  if (name === 'feed') { feedPage = 1; loadFeed(); }
  if (name === 'explore') loadExplore();
  if (name === 'profile') loadMyProfile();
}

// ─── FEED ─────────────────────────────────────────────────────────────────
async function loadFeed() {
  const container = document.getElementById('feed-posts');
  container.innerHTML = '<div class="loading">Loading feed...</div>';
  try {
    const res = await authFetch(`${API}/posts/feed?page=${feedPage}&limit=10`);
    const data = await res.json();
    if (!data.posts || data.posts.length === 0) {
      container.innerHTML = '<div class="loading">No posts yet. Follow people or create your first post! 🚀</div>';
      return;
    }
    container.innerHTML = data.posts.map(renderPostCard).join('');
  } catch { container.innerHTML = '<div class="loading">Failed to load feed. Is the backend running?</div>'; }
}

function renderPostCard(p) {
  const liked = p.likes.includes(currentUser?._id);
  const tagsHTML = p.tags?.length ? `<div class="post-tags">${p.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : '';
  const commentsHTML = p.comments?.slice(-3).map(c => `
    <div class="comment-item">
      <strong onclick="visitProfile('${c.user?.username}')">@${c.user?.username || 'user'}</strong>${c.text}
    </div>`).join('') || '';
  return `
  <div class="post-card" id="post-${p._id}">
    <div class="post-header">
      ${avatarHTML(p.user)}
      <div class="post-meta">
        <div class="post-username" onclick="visitProfile('${p.user?.username}')">${p.user?.name || 'User'} <span style="color:var(--muted);font-weight:400">@${p.user?.username}</span></div>
        <div class="post-time">${timeAgo(p.createdAt)}</div>
      </div>
      ${p.user?._id === currentUser?._id ? `<button onclick="deletePost('${p._id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.2rem">🗑</button>` : ''}
    </div>
    ${p.image ? `<div class="post-image"><img src="${p.image}" alt="post" loading="lazy"/></div>` : ''}
    <div class="post-body">
      <div class="post-caption">${p.caption || ''}</div>
      ${tagsHTML}
    </div>
    <div class="post-actions">
      <button class="action-btn ${liked ? 'liked' : ''}" onclick="toggleLike('${p._id}', this)">
        ${liked ? '❤️' : '🤍'} <span id="likes-${p._id}">${p.likes.length}</span>
      </button>
      <button class="action-btn" onclick="toggleComments('${p._id}')">
        💬 ${p.comments.length}
      </button>
    </div>
    <div class="comment-box" id="comments-${p._id}" style="display:none">
      <div class="comment-list">${commentsHTML}</div>
      <div class="comment-input-row">
        <input type="text" placeholder="Write a comment..." id="comment-input-${p._id}" onkeydown="if(event.key==='Enter')submitComment('${p._id}')"/>
        <button onclick="submitComment('${p._id}')">Post</button>
      </div>
    </div>
  </div>`;
}

function toggleComments(postId) {
  const box = document.getElementById('comments-' + postId);
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

async function toggleLike(postId, btn) {
  try {
    const res = await authFetch(`${API}/posts/${postId}/like`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      btn.classList.toggle('liked', data.liked);
      btn.innerHTML = `${data.liked ? '❤️' : '🤍'} <span id="likes-${postId}">${data.likesCount}</span>`;
    }
  } catch { showToast('Failed to like'); }
}

async function submitComment(postId) {
  const input = document.getElementById('comment-input-' + postId);
  const text = input.value.trim();
  if (!text) return;
  try {
    const res = await authFetch(`${API}/posts/${postId}/comment`, { method: 'POST', body: JSON.stringify({ text }) });
    const data = await res.json();
    if (data.success) {
      const commentList = document.querySelector(`#comments-${postId} .comment-list`);
      commentList.innerHTML += `<div class="comment-item"><strong>@${currentUser.username}</strong>${text}</div>`;
      input.value = '';
    }
  } catch { showToast('Failed to comment'); }
}

async function deletePost(postId) {
  if (!confirm('Delete this post?')) return;
  const res = await authFetch(`${API}/posts/${postId}`, { method: 'DELETE' });
  const data = await res.json();
  if (data.success) { document.getElementById('post-' + postId)?.remove(); showToast('Post deleted'); }
  else showToast(data.message);
}

// ─── EXPLORE ──────────────────────────────────────────────────────────────
async function loadExplore() {
  const grid = document.getElementById('explore-posts');
  grid.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const res = await authFetch(`${API}/posts/explore?limit=18`);
    const data = await res.json();
    grid.innerHTML = (data.posts || []).map(p => `
      <div class="explore-thumb" onclick="quickViewPost('${p._id}')">
        ${p.image ? `<img src="${p.image}" alt="post" loading="lazy"/>` : `<span>${p.caption?.slice(0,30) || '📝'}</span>`}
        <div class="thumb-overlay">❤️ ${p.likes.length} &nbsp; 💬 ${p.comments.length}</div>
      </div>`).join('') || '<div class="loading">No posts yet.</div>';
  } catch { grid.innerHTML = '<div class="loading">Failed to load</div>'; }
}

async function quickViewPost(id) {
  const res = await authFetch(`${API}/posts/${id}`);
  const data = await res.json();
  if (data.success) alert(`@${data.post.user.username}: ${data.post.caption}`);
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(searchUsers, 400);
}

async function searchUsers() {
  const q = document.getElementById('search-q').value.trim();
  const resultsEl = document.getElementById('search-results');
  if (!q) { resultsEl.style.display = 'none'; return; }
  try {
    const res = await authFetch(`${API}/users/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = (data.users || []).map(u => `
      <div class="user-row" onclick="visitProfile('${u.username}')">
        ${avatarHTML(u, 38)}
        <div class="user-row-info">
          <strong>${u.name}</strong>
          <span>@${u.username} • ${u.followers?.length || 0} followers</span>
        </div>
      </div>`).join('') || '<div style="padding:1rem;color:var(--muted)">No users found</div>';
  } catch {}
}

// ─── CREATE POST ──────────────────────────────────────────────────────────
function previewPost() {
  const caption = document.getElementById('post-caption').value;
  const image = document.getElementById('post-image').value;
  const preview = document.getElementById('post-preview');
  preview.style.display = 'block';
  preview.innerHTML = `
    <p style="font-size:0.85rem;color:var(--muted);margin-bottom:0.5rem">Preview:</p>
    ${image ? `<img src="${image}" style="width:100%;border-radius:8px;margin-bottom:0.5rem"/>` : ''}
    <p>${caption}</p>`;
}

async function createPost() {
  const caption = document.getElementById('post-caption').value.trim();
  const image = document.getElementById('post-image').value.trim();
  const tags = document.getElementById('post-tags').value.trim();
  const isPublic = document.getElementById('post-public').checked;
  const msg = document.getElementById('create-msg');
  msg.textContent = '';
  if (!caption && !image) { msg.textContent = 'Write something or add an image'; return; }
  try {
    const res = await authFetch(`${API}/posts`, { method: 'POST', body: JSON.stringify({ caption, image, tags, isPublic }) });
    const data = await res.json();
    if (data.success) {
      document.getElementById('post-caption').value = '';
      document.getElementById('post-image').value = '';
      document.getElementById('post-tags').value = '';
      document.getElementById('post-preview').style.display = 'none';
      showToast('Post published! 🎉');
      showView('feed');
    } else { msg.textContent = data.message; }
  } catch { msg.textContent = 'Server error'; }
}

// ─── PROFILE ──────────────────────────────────────────────────────────────
async function loadMyProfile() {
  if (!currentUser) return;
  loadProfileByUsername(currentUser.username, 'profile-content');
}

async function visitProfile(username) {
  if (!username) return;
  showView('user-profile');
  document.getElementById('nav-profile').classList.remove('active');
  loadProfileByUsername(username, 'user-profile-content');
}

async function loadProfileByUsername(username, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '<div class="loading">Loading profile...</div>';
  try {
    const res = await authFetch(`${API}/users/${username}`);
    const data = await res.json();
    if (!data.success) { container.innerHTML = '<div class="loading">User not found</div>'; return; }
    const u = data.user;
    const isSelf = u._id === currentUser?._id;
    const isFollowing = u.followers?.some(f => f._id === currentUser?._id || f === currentUser?._id);
    container.innerHTML = `
      ${!isSelf ? `<button class="btn-outline" onclick="showView('feed')" style="margin-bottom:1rem;width:auto;padding:0.4rem 1rem">← Back</button>` : ''}
      <div class="profile-header">
        <div class="profile-top">
          ${avatarHTML(u, 80)}
          <div>
            <h2 style="font-family:'Syne',sans-serif;font-size:1.4rem">${u.name}</h2>
            <p style="color:var(--muted);margin-bottom:0.75rem">@${u.username}</p>
            ${!isSelf ? `<button class="follow-btn" id="follow-btn-${u._id}" onclick="toggleFollow('${u._id}','${u.username}')">${isFollowing ? 'Unfollow' : 'Follow'}</button>` : '<button class="btn-outline" style="padding:0.4rem 1rem;width:auto" onclick="editProfile()">Edit Profile</button>'}
          </div>
        </div>
        <div class="profile-stats">
          <div class="stat"><strong>${data.posts?.length || 0}</strong><span>Posts</span></div>
          <div class="stat"><strong>${u.followers?.length || 0}</strong><span>Followers</span></div>
          <div class="stat"><strong>${u.following?.length || 0}</strong><span>Following</span></div>
        </div>
        ${u.bio ? `<p class="profile-bio" style="margin-top:1rem">${u.bio}</p>` : ''}
      </div>
      <div class="profile-grid">
        ${(data.posts || []).map(p => `
          <div class="explore-thumb" onclick="quickViewPost('${p._id}')">
            ${p.image ? `<img src="${p.image}" loading="lazy"/>` : `<span style="font-size:1.5rem;padding:1rem;text-align:center">${(p.caption || '').slice(0,40)}</span>`}
            <div class="thumb-overlay">❤️ ${p.likes?.length || 0} 💬 ${p.comments?.length || 0}</div>
          </div>`).join('') || '<p style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted)">No posts yet</p>'}
      </div>`;
  } catch (e) { container.innerHTML = '<div class="loading">Failed to load profile</div>'; }
}

async function toggleFollow(userId, username) {
  try {
    const res = await authFetch(`${API}/users/${userId}/follow`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      const btn = document.getElementById('follow-btn-' + userId);
      if (btn) btn.textContent = data.following ? 'Unfollow' : 'Follow';
      showToast(data.following ? `Following @${username}` : `Unfollowed @${username}`);
    }
  } catch { showToast('Failed to follow'); }
}

function editProfile() {
  const bio = prompt('Update bio:', currentUser.bio || '');
  if (bio === null) return;
  const avatar = prompt('Avatar URL:', currentUser.avatar || '');
  authFetch(`${API}/auth/profile`, { method: 'PUT', body: JSON.stringify({ name: currentUser.name, bio, avatar }) })
    .then(r => r.json()).then(data => {
      if (data.success) { currentUser = { ...currentUser, ...data.user }; saveUser(currentUser); showToast('Profile updated!'); loadMyProfile(); }
    });
}

// ─── SUGGESTIONS ──────────────────────────────────────────────────────────
async function loadSuggestions() {
  try {
    const res = await authFetch(`${API}/users/suggestions/list`);
    const data = await res.json();
    const el = document.getElementById('suggestions-list');
    el.innerHTML = (data.users || []).map(u => `
      <div class="suggestion-item">
        ${avatarHTML(u, 36)}
        <div class="suggestion-info">
          <strong onclick="visitProfile('${u.username}')" style="cursor:pointer">${u.name}</strong>
          <span>@${u.username}</span>
        </div>
        <button class="follow-btn" onclick="toggleFollow('${u._id}','${u.username}')">Follow</button>
      </div>`).join('') || '<p style="color:var(--muted);font-size:0.85rem">No suggestions</p>';
  } catch {}
}

// ─── BOOT ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const token = getToken();
  const user = loadUser();
  if (token && user) {
    currentUser = user;
    initApp();
  } else {
    document.getElementById('auth-screen').style.display = 'flex';
  }
});
