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

// Get user's reactions from localStorage
function getUserReactions() {
  var reactions = localStorage.getItem('epicurus_reactions');
  return reactions ? JSON.parse(reactions) : {};
}

function saveUserReaction(postId, reaction) {
  var reactions = getUserReactions();
  if (!reactions[postId]) reactions[postId] = {};
  reactions[postId][reaction] = true;
  localStorage.setItem('epicurus_reactions', JSON.stringify(reactions));
}

function hasUserReacted(postId, reaction) {
  var reactions = getUserReactions();
  return reactions[postId] && reactions[postId][reaction];
}

// Convert any music link to embed URL
function getMusicEmbedUrl(inputUrl) {
  if (!inputUrl) return null;
  
  // YouTube
  if (inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be')) {
    var videoId = '';
    if (inputUrl.includes('youtu.be')) {
      videoId = inputUrl.split('/').pop().split('?')[0];
    } else {
      var params = new URLSearchParams(inputUrl.split('?')[1]);
      videoId = params.get('v');
    }
    return 'https://www.youtube.com/embed/' + videoId + '?start=0&autoplay=0';
  }
  
  // SoundCloud
  if (inputUrl.includes('soundcloud.com')) {
    return 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(inputUrl) + '&color=%23d4a843&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false';
  }
  
  // Spotify
  if (inputUrl.includes('spotify.com')) {
    var trackId = inputUrl.split('/').pop().split('?')[0];
    return 'https://open.spotify.com/embed/track/' + trackId + '?theme=0';
  }
  
  // Direct audio file
  if (inputUrl.match(/\.(mp3|wav|ogg)$/i)) {
    return inputUrl;
  }
  
  return null;
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
  var userHasLiked = hasUserReacted(postId, 'like');

  // Music player
  var musicPlayerHtml = '';
  if (post.musicUrl) {
    var embedUrl = getMusicEmbedUrl(post.musicUrl);
    if (embedUrl) {
      musicPlayerHtml = '<div class="post-music">' +
        '<iframe src="' + embedUrl + '" ' +
        'width="100%" height="80" frameborder="0" ' +
        'allow="autoplay; encrypted-media" allowfullscreen></iframe>' +
      '</div>';
    }
  }

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
        '<svg viewBox="0 0 24 24" fill="none">' +
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
    musicPlayerHtml +
    '<div class="post-actions">' +
      '<button class="reaction-btn ' + (hasUserReacted(postId, 'haha') ? 'reacted haha' : '') + '" data-id="' + postId + '" data-reaction="haha">' +
        '<span class="emoji">😂</span><span class="count">' + (post.reactions ? post.reactions.haha || 0 : 0) + '</span>' +
      '</button>' +
      '<button class="reaction-btn ' + (hasUserReacted(postId, 'sad') ? 'reacted sad' : '') + '" data-id="' + postId + '" data-reaction="sad">' +
        '<span class="emoji">😢</span><span class="count">' + (post.reactions ? post.reactions.sad || 0 : 0) + '</span>' +
      '</button>' +
      '<button class="reaction-btn ' + (hasUserReacted(postId, 'angry') ? 'reacted angry' : '') + '" data-id="' + postId + '" data-reaction="angry">' +
        '<span class="emoji">😡</span><span class="count">' + (post.reactions ? post.reactions.angry || 0 : 0) + '</span>' +
      '</button>' +
      '<button class="reaction-btn comment-btn" data-id="' + postId + '">' +
        '<span class="emoji">💬</span><span class="count">' + (post.comments ? post.comments.length : 0) + '</span>' +
      '</button>' +
      '<button class="reaction-btn delete-btn" data-id="' + postId + '">' +
        '<span>🗑</span>' +
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

  filteredPosts.sort(function(a, b) {
    return (b.data.timestamp || 0) - (a.data.timestamp || 0);
  });

  filteredPosts.forEach(function(post) {
    container.appendChild(createPostElement(post.data, post.id));
  });

  attachPostEventListeners();
}

function attachPostEventListeners() {
  // Reaction buttons
  document.querySelectorAll('.reaction-btn:not(.comment-btn):not(.delete-btn)').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var postId = this.dataset.id;
      var reaction = this.dataset.reaction;
      if (hasUserReacted(postId, reaction)) return;
      
      var postRef = db.ref('posts/' + postId);
      postRef.once('value', function(snapshot) {
        var post = snapshot.val();
        if (post) {
          var reactions = post.reactions || {};
          reactions[reaction] = (reactions[reaction] || 0) + 1;
          postRef.update({ reactions: reactions });
          saveUserReaction(postId, reaction);
          renderPostsByFilter();
        }
      });
    });
  });

  // Comment toggle
  document.querySelectorAll('.comment-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var postId = this.dataset.id;
      var section = document.getElementById('comments-' + postId);
      section.classList.toggle('show');
    });
  });

  // View comments toggle
  document.querySelectorAll('.comments-toggle').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var target = this.dataset.target;
      document.getElementById(target).classList.toggle('show');
    });
  });

  // Delete button
  document.querySelectorAll('.delete-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (confirm('Delete this post?')) {
        var postId = this.dataset.id;
        db.ref('posts/' + postId).remove();
      }
    });
  });

  // Comment form
  document.querySelectorAll('.comment-form').forEach(function(form) {
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
          comments.push({ content: content, author: post.authorName || 'Anonymous', timestamp: Date.now() });
          postRef.update({ comments: comments });
        }
      });
      input.value = '';
    });
  });
}

function renderPostsByFilter() {
  var activeFilter = document.querySelector('.filter-btn.active');
  var filter = activeFilter ? activeFilter.dataset.filter : 'all';
  db.ref('posts').once('value', function(snapshot) {
    renderPosts(snapshot.val(), filter);
  });
}

// Real-time updates
var postsRef = db.ref('posts');
postsRef.on('value', function(snapshot) {
  var postsData = snapshot.val();
  var activeFilter = document.querySelector('.filter-btn.active');
  renderPosts(postsData, activeFilter ? activeFilter.dataset.filter : 'all');
}, function(error) {
  document.getElementById('postsContainer').innerHTML = '<div class="error-message">Error loading posts.</div>';
});

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
    this.classList.add('active');
    renderPostsByFilter();
  });
});

// Form submission
var postForm = document.getElementById('postForm');
postForm.addEventListener('submit', function(e) {
  e.preventDefault();

  var submitBtn = document.getElementById('submitBtn');
  var authorName = document.getElementById('authorName').value.trim();
  var content = document.getElementById('postContent').value.trim();
  var musicLink = document.getElementById('musicLink').value.trim();

  if (!content) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Posting...</span>';

  postsRef.push({
    authorName: authorName || null,
    content: content,
    musicUrl: musicLink || null,
    timestamp: Date.now(),
    reactions: {},
    comments: []
  }).then(function() {
    document.getElementById('authorName').value = '';
    document.getElementById('postContent').value = '';
    document.getElementById('musicLink').value = '';
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Post to Wall</span>';
  }).catch(function(error) {
    alert('Failed to post.');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Post to Wall</span>';
  });
});

// Mobile menu
var hamburger = document.getElementById('hamburger');
var mobileMenu = document.getElementById('mobileMenu');
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', function() {
    var isOpen = mobileMenu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', isOpen);
  });
  mobileMenu.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', function() {
      mobileMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}
