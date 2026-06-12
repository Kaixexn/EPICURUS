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

firebase.initializeApp(firebaseConfig);
var db = firebase.database();

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

var selectedMusic = null;
var currentPreviewAudio = null;
var currentPreviewBtn = null;

function searchMusic(query) {
  var resultsEl = document.getElementById('musicResults');
  if (!query || query.length < 2) {
    resultsEl.classList.remove('show');
    return;
  }
  
  resultsEl.innerHTML = '<div class="music-result-empty">🔍 Searching...</div>';
  resultsEl.classList.add('show');
  
  var cbName = 'itcb_' + Date.now();
  window[cbName] = function(data) {
    var tracks = (data.results || []).filter(function(t) { return t.previewUrl; });
    delete window[cbName];
    
    if (tracks.length === 0) {
      resultsEl.innerHTML = '<div class="music-result-empty">No songs found</div>';
      return;
    }
    
    resultsEl.innerHTML = '';
    tracks.slice(0, 8).forEach(function(t) {
      var el = document.createElement('div');
      el.className = 'music-result-item';
      el.innerHTML = 
        '<img class="result-art" src="' + (t.artworkUrl60 || t.artworkUrl100) + '" alt="">' +
        '<div class="result-info">' +
          '<div class="result-title">' + (t.trackName || t.collectionName) + '</div>' +
          '<div class="result-artist">' + t.artistName + '</div>' +
        '</div>' +
        '<button class="preview-btn" data-preview="' + t.previewUrl + '">▶</button>';
      
      el.addEventListener('click', function(e) {
        if (e.target.classList.contains('preview-btn')) {
          e.stopPropagation();
          togglePreview(e.target);
          return;
        }
        selectMusic({
          name: t.trackName || t.collectionName,
          artist: t.artistName,
          previewUrl: t.previewUrl,
          artworkUrl: t.artworkUrl100
        });
        resultsEl.classList.remove('show');
      });
      resultsEl.appendChild(el);
    });
  };
  
  var script = document.createElement('script');
  script.src = 'https://itunes.apple.com/search?term=' + encodeURIComponent(query) + '&media=music&entity=song&limit=10&callback=' + cbName;
  script.onerror = function() {
    resultsEl.innerHTML = '<div class="music-result-empty">Search failed</div>';
  };
  document.head.appendChild(script);
}

function togglePreview(btn) {
  var previewUrl = btn.dataset.preview;
  
  if (currentPreviewAudio && currentPreviewAudio !== btn) {
    currentPreviewAudio.pause();
    currentPreviewAudio = null;
    if (currentPreviewBtn) {
      currentPreviewBtn.textContent = '▶';
      currentPreviewBtn.classList.remove('playing');
    }
  }
  
  if (btn.classList.contains('playing')) {
    btn.textContent = '▶';
    btn.classList.remove('playing');
  } else {
    btn.textContent = '⏸';
    btn.classList.add('playing');
    currentPreviewAudio = new Audio(previewUrl);
    currentPreviewAudio.play();
    currentPreviewBtn = btn;
    
    currentPreviewAudio.addEventListener('ended', function() {
      btn.textContent = '▶';
      btn.classList.remove('playing');
    });
  }
}

function selectMusic(music) {
  if (currentPreviewAudio) {
    currentPreviewAudio.pause();
    currentPreviewAudio = null;
    if (currentPreviewBtn) {
      currentPreviewBtn.textContent = '▶';
      currentPreviewBtn.classList.remove('playing');
    }
  }
  
  selectedMusic = music;
  var selectedArt = document.getElementById('selectedArt');
  var selectedTitle = document.getElementById('selectedTitle');
  var selectedArtist = document.getElementById('selectedArtist');
  var musicSelected = document.getElementById('musicSelected');
  
  if (selectedArt) selectedArt.src = music.artworkUrl;
  if (selectedTitle) selectedTitle.textContent = music.name;
  if (selectedArtist) selectedArtist.textContent = music.artist;
  if (musicSelected) musicSelected.style.display = 'flex';
  
  if (document.getElementById('musicSearchInput')) {
    document.getElementById('musicSearchInput').value = '';
  }
  if (document.getElementById('musicResults')) {
    document.getElementById('musicResults').classList.remove('show');
  }
}

function clearSelectedMusic() {
  if (currentPreviewAudio) {
    currentPreviewAudio.pause();
    currentPreviewAudio = null;
    currentPreviewBtn = null;
  }
  
  selectedMusic = null;
  var musicSelected = document.getElementById('musicSelected');
  if (musicSelected) {
    musicSelected.style.display = 'none';
    var selectedArt = document.getElementById('selectedArt');
    if (selectedArt) selectedArt.src = '';
  }
}

var musicSearchInput = document.getElementById('musicSearchInput');
var musicSearchTimer = null;
if (musicSearchInput) {
  musicSearchInput.addEventListener('input', function() {
    clearTimeout(musicSearchTimer);
    musicSearchTimer = setTimeout(function() {
      searchMusic(musicSearchInput.value.trim());
    }, 400);
  });
  
  document.addEventListener('click', function(e) {
    var resultsEl = document.getElementById('musicResults');
    if (resultsEl && !e.target.closest('.music-search-section')) {
      resultsEl.classList.remove('show');
    }
  });
}

var removeMusicBtn = document.getElementById('removeMusicBtn');
if (removeMusicBtn) {
  removeMusicBtn.addEventListener('click', clearSelectedMusic);
}

function getMusicPlayerHtml(music) {
  if (!music || !music.previewUrl) return '';
  return '<div class="post-music">' +
    '<div class="music-info">' +
      '<img src="' + (music.artworkUrl || '') + '" alt="">' +
      '<div><strong>' + (music.name || '') + '</strong><span>' + (music.artist || '') + '</span></div>' +
    '</div>' +
    '<audio controls src="' + music.previewUrl + '"></audio>' +
  '</div>';
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
  var musicPlayerHtml = post.musicData ? getMusicPlayerHtml(post.musicData) : '';

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

  document.querySelectorAll('.comment-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var postId = this.dataset.id;
      var section = document.getElementById('comments-' + postId);
      section.classList.toggle('show');
    });
  });

  document.querySelectorAll('.comments-toggle').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var target = this.dataset.target;
      document.getElementById(target).classList.toggle('show');
    });
  });

  document.querySelectorAll('.delete-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (confirm('Delete this post?')) {
        var postId = this.dataset.id;
        db.ref('posts/' + postId).remove();
      }
    });
  });

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

var postsRef = db.ref('posts');
postsRef.on('value', function(snapshot) {
  var postsData = snapshot.val();
  var activeFilter = document.querySelector('.filter-btn.active');
  renderPosts(postsData, activeFilter ? activeFilter.dataset.filter : 'all');
}, function(error) {
  var container = document.getElementById('postsContainer');
  if (container) {
    container.innerHTML = '<div class="error-message">Error loading posts.</div>';
  }
});

document.querySelectorAll('.filter-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
    this.classList.add('active');
    renderPostsByFilter();
  });
});

var postForm = document.getElementById('postForm');
postForm.addEventListener('submit', function(e) {
  e.preventDefault();

  var submitBtn = document.getElementById('submitBtn');
  var authorName = document.getElementById('authorName').value.trim();
  var content = document.getElementById('postContent').value.trim();

  if (!content) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Posting...</span>';

  var postData = {
    authorName: authorName || null,
    content: content,
    timestamp: Date.now(),
    reactions: {},
    comments: []
  };

  if (selectedMusic) {
    postData.musicData = selectedMusic;
  }

  postsRef.push(postData).then(function() {
    var authorNameEl = document.getElementById('authorName');
    var postContentEl = document.getElementById('postContent');
    
  if (authorNameEl) authorNameEl.value = '';
    if (postContentEl) postContentEl.value = '';
    
    if (currentPreviewAudio) {
      currentPreviewAudio.pause();
      currentPreviewAudio = null;
    }
    if (currentPreviewBtn) {
      currentPreviewBtn.textContent = '▶';
      currentPreviewBtn.classList.remove('playing');
      currentPreviewBtn = null;
    }
    
    clearSelectedMusic();
    
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Post to Wall</span>';
    }
  }).catch(function(error) {
    console.error('Error posting:', error);
    alert('Failed to post. Please try again.');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Post to Wall</span>';
    }
  });
});

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
