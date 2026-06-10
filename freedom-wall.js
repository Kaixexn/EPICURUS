// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCk0tn7-7YhgOrtoYl2EDXjzUaW6MPLA_I",
  authDomain: "epicurus-project.firebaseapp.com",
  databaseURL: "https://epicurus-project-default-rtdb.firebaseio.com",
  projectId: "epicurus-project",
  storageBucket: "epicurus-project.firebasestorage.app",
  messagingSenderId: "605298370739",
  appId: "1:605298370739:web:972e4ac5028334971068c6",
  measurementId: "G-5J2C56NQL4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
var db = firebase.database();

// Get user's liked posts from localStorage
function getLikedPosts() {
  var liked = localStorage.getItem('epicurus_liked');
  return liked ? JSON.parse(liked) : [];
}

function setLiked(postId) {
  var liked = getLikedPosts();
  liked.push(postId);
  localStorage.setItem('epicurus_liked', JSON.stringify(liked));
}

function hasLiked(postId) {
  var liked = getLikedPosts();
  return liked.includes(postId);
}

function formatTime(timestamp) {
  if (!timestamp) return 'Just now';
  var now = Date.now();
  var diff = now - timestamp;
  var minutes = Math.floor(diff / 60000);
  var hours = Math.floor(diff / 3600000);
  var days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return minutes + 'm ago';
  if (hours < 24) return hours + 'h ago';
  if (days < 7) return days + 'd ago';
  return new Date(timestamp).toLocaleDateString();
}

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function createPostElement(post, postId) {
  var article = document.createElement('article');
  article.className = 'post-card';
  article.dataset.author = post.authorName ? 'named' : 'anonymous';
  article.dataset.id = postId;

  var authorDisplay = post.authorName || 'Anonymous';
  var userHasLiked = hasLiked(postId);

  var commentsHtml = '';
  if (post.comments && post.comments.length > 0) {
    commentsHtml = post.comments.map(function(comment) {
      return '<div class="comment">' +
        '<div class="comment-header">' +
          '<span class="comment-author">' + escapeHtml(comment.author || 'Anonymous') + '</span>' +
          '<span class="comment-time">' + formatTime(comment.timestamp) + '</span>' +
        '</div>' +
        '<p class="comment-content">' + escapeHtml(comment.content) + '</p>' +
      '</div>';
    }).join('');
  }

  article.innerHTML = 
    '<div class="post-header">' +
      '<div class="post-avatar">' +
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<circle cx="12" cy="8" r="4" stroke="#d4a843" stroke-width="1.5"/>' +
          '<path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="#d4a843" stroke-width="1.5"/>' +
        '</svg>' +
      '</div>' +
      '<div class="post-meta">' +
        '<div class="post-author ' + (!post.authorName ? 'anonymous' : '') + '">' + escapeHtml(authorDisplay) + '</div>' +
        '<div class="post-time">' + formatTime(post.timestamp) + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="post-content">' + escapeHtml(post.content) + '</div>' +
    '<div class="post-actions">' +
      '<button class="action-btn like-btn ' + (userHasLiked ? 'liked' : '') + '" data-id="' + postId + '" ' + (userHasLiked ? 'disabled' : '') + '>' +
        '<span>♥</span>' +
        '<span class="count">' + (post.likes || 0) + '</span>' +
      '</button>' +
      '<button class="action-btn comment-btn" data-id="' + postId + '">' +
        '<span>💬</span>' +
        '<span class="count">' + (post.comments ? post.comments.length : 0) + '</span>' +
      '</button>' +
      '<button class="action-btn delete-btn" data-id="' + postId + '">' +
        '<span>🗑</span>' +
        '<span class="count">Delete</span>' +
      '</button>' +
    '</div>' +
    '<div class="comments-section" id="comments-' + postId + '">' +
      '<button class="comments-toggle" data-target="comments-' + postId + '">' +
        'View comments (' + (post.comments ? post.comments.length : 0) + ')' +
      '</button>' +
      '<form class="comment-form" data-post-id="' + postId + '">' +
        '<input type="text" class="comment-input" placeholder="Write a comment..." required>' +
        '<button type="submit" class="comment-submit">Post</button>' +
      '</form>' +
      '<div class="comments-list">' + commentsHtml + '</div>' +
    '</div>';

  return article;
}

function renderPosts(postsData, filter) {
  var container = document.getElementById('postsContainer');
  container.innerHTML = '';

  var posts = [];
  
  if (postsData) {
    Object.keys(postsData).forEach(function(id) {
      posts.push({ id: id, data: postsData[id] });
    });
  }

  var filteredPosts = posts.filter(function(post) {
    if (!filter || filter === 'all') return true;
    if (filter === 'anonymous') return !post.data.authorName;
    if (filter === 'named') return post.data.authorName;
    return true;
  });

  if (filteredPosts.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No posts yet. Be the first to share!</p></div>';
    return;
  }

  // Sort by timestamp descending
  filteredPosts.sort(function(a, b) {
    return (b.data.timestamp || 0) - (a.data.timestamp || 0);
  });

  filteredPosts.forEach(function(post) {
    container.appendChild(createPostElement(post.data, post.id));
  });

  attachPostEventListeners();
}

function attachPostEventListeners() {
  // Like buttons - now with spam prevention
  var likeBtns = document.querySelectorAll('.like-btn:not([disabled])');
  likeBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var postId = this.dataset.id;
      var postRef = db.ref('posts/' + postId);
      
      postRef.once('value', function(snapshot) {
        var post = snapshot.val();
        if (post) {
          var newLikes = (post.likes || 0) + 1;
          postRef.update({ likes: newLikes });
          setLiked(postId); // Save that user liked this post
          // Disable button after liking
          btn.classList.add('liked');
          btn.disabled = true;
          var countSpan = btn.querySelector('.count');
          countSpan.textContent = newLikes;
        }
      });
    });
  });

  // Comment toggle buttons
  var commentBtns = document.querySelectorAll('.comment-btn');
  commentBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var postId = this.dataset.id;
      var section = document.getElementById('comments-' + postId);
      section.classList.toggle('show');
    });
  });

  // View comments toggle
  var toggleBtns = document.querySelectorAll('.comments-toggle');
  toggleBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var target = this.dataset.target;
      document.getElementById(target).classList.toggle('show');
    });
  });

  // Delete buttons
  var deleteBtns = document.querySelectorAll('.delete-btn');
  deleteBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (confirm('Delete this post? This cannot be undone.')) {
        var postId = this.dataset.id;
        db.ref('posts/' + postId).remove();
      }
    });
  });

  // Comment forms
  var commentForms = document.querySelectorAll('.comment-form');
  commentForms.forEach(function(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var postId = form.dataset.postId;
      var input = form.querySelector('.comment-input');
      var content = input.value.trim();

      if (!content) return;

      var postRef = db.ref('posts/' + postId);
      
      postRef.once('value', function(snapshot) {
        var post = snapshot.val();
        if (post) {
          var comments = post.comments || [];
          comments.push({
            content: content,
            author: post.authorName || 'Anonymous',
            timestamp: Date.now()
          });
          postRef.update({ comments: comments });
        }
      });

      input.value = '';
    });
  });
}

// Listen to real-time database changes
var postsRef = db.ref('posts');
postsRef.on('value', function(snapshot) {
  var postsData = snapshot.val();
  var activeFilter = document.querySelector('.filter-btn.active');
  renderPosts(postsData, activeFilter ? activeFilter.dataset.filter : 'all');
}, function(error) {
  console.error('Error loading posts:', error);
  document.getElementById('postsContainer').innerHTML = 
    '<div class="error-message">Error loading posts. Please check your internet connection.</div>';
});

// Filter buttons
var filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {
    filterBtns.forEach(function(b) { b.classList.remove('active'); });
    this.classList.add('active');
    
    postsRef.once('value', function(snapshot) {
      renderPosts(snapshot.val(), this.dataset.filter);
    }.bind(this));
  });
});

// Handle form submission
var postForm = document.getElementById('postForm');
postForm.addEventListener('submit', function(e) {
  e.preventDefault();

  var submitBtn = document.getElementById('submitBtn');
  var authorName = document.getElementById('authorName').value.trim();
  var content = document.getElementById('postContent').value.trim();

  if (!content) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Posting...</span>';

  postsRef.push({
    authorName: authorName || null,
    content: content,
    imageUrl: null,
    timestamp: Date.now(),
    likes: 0,
    liked: false,
    comments: []
  }).then(function() {
    document.getElementById('authorName').value = '';
    document.getElementById('postContent').value = '';
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Post to Wall</span>';
  }).catch(function(error) {
    console.error('Error posting:', error);
    alert('Failed to post. Please try again.');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Post to Wall</span>';
  });
});

// Mobile menu toggle
var hamburger = document.getElementById('hamburger');
var mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', function() {
  var isOpen = mobileMenu.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', isOpen);
});

var mobileLinks = mobileMenu.querySelectorAll('a');
mobileLinks.forEach(function(link) {
  link.addEventListener('click', function() {
    mobileMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});
