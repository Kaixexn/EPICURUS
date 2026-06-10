// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCk0tn7-7YhgOrtoYl2EDXjzUaW6MPLA_I",
  authDomain: "epicurus-project.firebaseapp.com",
  projectId: "epicurus-project",
  storageBucket: "epicurus-project.firebasestorage.app",
  messagingSenderId: "605298370739",
  appId: "1:605298370739:web:972e4ac5028334971068c6",
  measurementId: "G-5J2C56NQL4",
  databaseURL: "https://epicurus-project-default-rtdb.firebaseio.com"
};

// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getDatabase, ref, push, onValue, update, set } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';

// Initialize Firebase with compatibility mode
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.getDatabase();

function formatTime(timestamp) {
  if (!timestamp) return 'Just now';
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function createPostElement(post, postId) {
  const article = document.createElement('article');
  article.className = 'post-card';
  article.dataset.author = post.authorName ? 'named' : 'anonymous';
  article.dataset.id = postId;

  const authorDisplay = post.authorName || 'Anonymous';

  const commentsHtml = (post.comments || [])
    .map(
      (comment, idx) => `
    <div class="comment">
      <div class="comment-header">
        <span class="comment-author">${escapeHtml(comment.author || 'Anonymous')}</span>
        <span class="comment-time">${formatTime(comment.timestamp)}</span>
      </div>
      <p class="comment-content">${escapeHtml(comment.content)}</p>
    </div>
  `
    )
    .join('');

  article.innerHTML = `
    <div class="post-header">
      <div class="post-avatar">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="8" r="4" stroke="#d4a843" stroke-width="1.5"/>
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="#d4a843" stroke-width="1.5"/>
        </svg>
      </div>
      <div class="post-meta">
        <div class="post-author ${!post.authorName ? 'anonymous' : ''}">${escapeHtml(authorDisplay)}</div>
        <div class="post-time">${formatTime(post.timestamp)}</div>
      </div>
    </div>
    <div class="post-content">${escapeHtml(post.content)}</div>
    ${
      post.imageUrl
        ? `<img class="post-image" src="${escapeHtml(post.imageUrl)}" alt="Post image">`
        : ''
    }
    <div class="post-actions">
      <button class="action-btn like-btn ${post.liked ? 'liked' : ''}" data-id="${postId}">
        <span>♥</span>
        <span class="count">${post.likes || 0}</span>
      </button>
      <button class="action-btn comment-btn" data-id="${postId}">
        <span>💬</span>
        <span class="count">${(post.comments || []).length}</span>
      </button>
    </div>
    <div class="comments-section" id="comments-${postId}">
      <button class="comments-toggle" data-target="comments-${postId}">
        View comments (${(post.comments || []).length})
      </button>
      <form class="comment-form" data-post-id="${postId}">
        <input type="text" class="comment-input" placeholder="Write a comment..." required>
        <button type="submit" class="comment-submit">Post</button>
      </form>
      <div class="comments-list">${commentsHtml}</div>
    </div>
  `;

  return article;
}

function renderPosts(postsData, filter = 'all') {
  const container = document.getElementById('postsContainer');
  container.innerHTML = '';

  const posts = [];
  
  if (postsData) {
    Object.entries(postsData).forEach(([id, post]) => {
      posts.push({ ...post, id });
    });
  }

  const filteredPosts = posts.filter((post) => {
    if (filter === 'all') return true;
    if (filter === 'anonymous') return !post.authorName;
    if (filter === 'named') return post.authorName;
    return true;
  });

  if (filteredPosts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No posts yet. Be the first to share!</p>
      </div>
    `;
    return;
  }

  // Sort by timestamp descending
  filteredPosts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  filteredPosts.forEach((post) => {
    container.appendChild(createPostElement(post, post.id));
  });

  attachPostEventListeners();
}

function attachPostEventListeners() {
  document.querySelectorAll('.like-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const postId = btn.dataset.id;
      const postRef = firebase.ref(db, `posts/${postId}`);
      
      firebase.get(postRef).then((snapshot) => {
        const post = snapshot.val();
        if (post) {
          const newLikes = (post.likes || 0) + 1;
          firebase.update(postRef, { likes: newLikes, liked: true });
        }
      });
    });
  });

  document.querySelectorAll('.comment-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const postId = btn.dataset.id;
      const section = document.getElementById(`comments-${postId}`);
      section.classList.toggle('show');
    });
  });

  document.querySelectorAll('.comments-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      document.getElementById(target).classList.toggle('show');
    });
  });

  document.querySelectorAll('.comment-form').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const postId = form.dataset.postId;
      const input = form.querySelector('.comment-input');
      const content = input.value.trim();

      if (!content) return;

      firebase.get(firebase.ref(db, `posts/${postId}`)).then((snapshot) => {
        const post = snapshot.val();
        if (post) {
          const comments = post.comments || [];
          comments.push({
            content,
            author: post.authorName || 'Anonymous',
            timestamp: Date.now()
          });
          firebase.update(firebase.ref(db, `posts/${postId}`), { comments });
        }
      });

      input.value = '';
    });
  });
}

// Listen to real-time database changes
const postsRef = firebase.ref(db, 'posts');
firebase.onValue(postsRef, (snapshot) => {
  const postsData = snapshot.val();
  renderPosts(postsData, document.querySelector('.filter-btn.active')?.dataset.filter || 'all');
});

// Filter buttons
document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    
    firebase.get(postsRef).then((snapshot) => {
      renderPosts(snapshot.val(), btn.dataset.filter);
    });
  });
});

// Handle form submission
const postForm = document.getElementById('postForm');

postForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  const authorName = document.getElementById('authorName').value.trim();
  const content = document.getElementById('postContent').value.trim();

  if (!content) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Posting...</span>';

  // Push new post to Firebase
  firebase.push(firebase.ref(db, 'posts'), {
    authorName: authorName || null,
    content,
    imageUrl: null,
    timestamp: Date.now(),
    likes: 0,
    liked: false,
    comments: []
  }).then(() => {
    document.getElementById('authorName').value = '';
    document.getElementById('postContent').value = '';
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Post to Wall</span>';
  }).catch((error) => {
    console.error('Error posting:', error);
    alert('Failed to post. Please try again.');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Post to Wall</span>';
  });
});

// Mobile menu toggle
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', isOpen);
});

mobileMenu.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});
