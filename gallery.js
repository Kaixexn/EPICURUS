import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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

const IMGBB_API_KEY = "c21af3a036d8272c19c7e7f1ae15df6b1";

initializeApp(firebaseConfig);
const db = getDatabase();

let isAdmin = localStorage.getItem('epicurus_admin') === 'true';
let allPhotos = [];
let currentPhotoIndex = 0;

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => toast.className = 'toast', 3000);
}

function getPhotosRef() {
  return ref(db, 'gallery');
}

async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('key', IMGBB_API_KEY);
  
  const response = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) throw new Error('Upload failed');
  const data = await response.json();
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

function loadGallery(filter = 'all') {
  const grid = document.getElementById('galleryGrid');
  const empty = document.getElementById('galleryEmpty');
  const nav = document.getElementById('galleryNav');
  
  onValue(getPhotosRef(), (snapshot) => {
    const data = snapshot.val();
    allPhotos = data ? Object.entries(data).map(([id, photo]) => ({ id, ...photo })) : [];
    allPhotos.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    const filtered = filter === 'all' 
      ? allPhotos 
      : allPhotos.filter(p => p.tags && p.tags.includes(filter));
    
    grid.innerHTML = '';
    
    if (filtered.length === 0) {
      empty.style.display = 'block';
      grid.appendChild(empty);
      return;
    }
    
    empty.style.display = 'none';
    
    filtered.forEach((photo, index) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.dataset.index = index;
      item.innerHTML = `
        <img src="${photo.imageUrl}" alt="${photo.caption || ''}">
        <div class="gallery-item-overlay">
          <p class="gallery-item-caption">${photo.caption || ''}</p>
          <p class="gallery-item-date">${photo.eventDate || ''}</p>
        </div>
        <span class="gallery-item-heart">♥ ${photo.hearts || 0}</span>
      `;
      item.addEventListener('click', () => openLightbox(index));
      grid.appendChild(item);
    });
    
    renderFilterButtons(data);
  });
}

function renderFilterButtons(data) {
  const nav = document.getElementById('galleryNav');
  const tags = new Set();
  
  Object.values(data || {}).forEach(photo => {
    (photo.tags || []).forEach(tag => tags.add(tag));
  });
  
  nav.innerHTML = `
    <button class="gallery-filter active" data-filter="all">All Memories</button>
    ${Array.from(tags).map(tag => `
      <button class="gallery-filter" data-filter="${tag}">${tag}</button>
    `).join('')}
  `;
  
  nav.querySelectorAll('.gallery-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      nav.querySelectorAll('.gallery-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadGallery(btn.dataset.filter);
    });
  });
}

function openLightbox(index) {
  currentPhotoIndex = index;
  const photo = allPhotos[index];
  const lightbox = document.getElementById('lightbox');
  
  document.getElementById('lightboxImg').src = photo.imageUrl;
  document.getElementById('lbDate').textContent = photo.eventDate || '';
  document.getElementById('lbCaption').textContent = photo.caption || '';
  document.getElementById('lbLocation').textContent = photo.location || '';
  document.getElementById('lbHeartCount').textContent = photo.hearts || 0;
  
  const tagsEl = document.getElementById('lbTags');
  tagsEl.innerHTML = (photo.tags || []).map(tag => `<span>${tag}</span>`).join('');
  
  const adminTools = document.getElementById('lbAdminTools');
  adminTools.style.display = isAdmin ? 'block' : 'none';
  
  if (isAdmin) {
    document.getElementById('lbEditCaption').value = photo.caption || '';
    document.getElementById('lbEditLocation').value = photo.location || '';
  }
  
  const heartBtn = document.getElementById('lbHeartBtn');
  heartBtn.classList.toggle('loved', localStorage.getItem(`heart_${photo.id}`) === 'true');
  
  loadComments(photo.id);
  
  lightbox.classList.add('show');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('show');
}

function navigateLightbox(direction) {
  currentPhotoIndex = (currentPhotoIndex + direction + allPhotos.length) % allPhotos.length;
  openLightbox(currentPhotoIndex);
}

function toggleHeart() {
  const photo = allPhotos[currentPhotoIndex];
  const key = `heart_${photo.id}`;
  const hasHearted = localStorage.getItem(key) === 'true';
  
  if (hasHearted) {
    localStorage.setItem(key, 'false');
    update(ref(db, `gallery/${photo.id}/hearts`), { hearts: Math.max(0, (photo.hearts || 1) - 1) });
  } else {
    localStorage.setItem(key, 'true');
    update(ref(db, `gallery/${photo.id}/hearts`), { hearts: (photo.hearts || 0) + 1 });
  }
}

function loadComments(photoId) {
  const list = document.getElementById('lbCommentsList');
  
  onValue(ref(db, `gallery/${photoId}/comments`), (snapshot) => {
    const comments = snapshot.val() ? Object.values(snapshot.val()) : [];
    list.innerHTML = comments.map(c => `
      <div class="lb-comment">
        ${c.text}
        <span class="lb-comment-time">${new Date(c.timestamp).toLocaleString()}</span>
      </div>
    `).join('');
  });
}

function addComment() {
  const input = document.getElementById('lbCommentInput');
  const text = input.value.trim();
  if (!text) return;
  
  const photo = allPhotos[currentPhotoIndex];
  push(ref(db, `gallery/${photo.id}/comments`), {
    text,
    timestamp: Date.now()
  });
  
  input.value = '';
}

function savePhotoEdits() {
  const photo = allPhotos[currentPhotoIndex];
  update(ref(db, `gallery/${photo.id}`), {
    caption: document.getElementById('lbEditCaption').value,
    location: document.getElementById('lbEditLocation').value
  });
  showToast('Changes saved!');
}

function deletePhoto() {
  const photo = allPhotos[currentPhotoIndex];
  if (confirm('Delete this memory?')) {
    remove(ref(db, `gallery/${photo.id}`));
    closeLightbox();
    showToast('Memory deleted');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadGallery();
  
  document.getElementById('adminToggleBtn')?.addEventListener('click', () => {
    document.getElementById('adminModal').classList.add('show');
  });
  
  document.getElementById('adminToggleBtnMobile')?.addEventListener('click', () => {
    document.getElementById('adminModal').classList.add('show');
    document.getElementById('mobileMenu').classList.remove('open');
  });
  
  document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('adminModal').classList.remove('show');
  });
  
  document.getElementById('modalSubmit').addEventListener('click', () => {
    const password = document.getElementById('adminPasswordInput').value;
    const error = document.getElementById('modalError');
    
    if (password === 'EPICURUS2027') {
      localStorage.setItem('epicurus_admin', 'true');
      isAdmin = true;
      document.getElementById('adminModal').classList.remove('show');
      document.getElementById('adminUploadPanel').classList.add('show');
      document.getElementById('adminPasswordInput').value = '';
    } else {
      error.textContent = 'Incorrect passphrase';
      error.classList.add('show');
    }
  });
  
  document.getElementById('closeLightbox').addEventListener('click', closeLightbox);
  document.getElementById('lbPrev').addEventListener('click', () => navigateLightbox(-1));
  document.getElementById('lbNext').addEventListener('click', () => navigateLightbox(1));
  document.getElementById('lbHeartBtn').addEventListener('click', toggleHeart);
  document.getElementById('lbCommentSend').addEventListener('click', addComment);
  document.getElementById('lbSaveBtn').addEventListener('click', savePhotoEdits);
  document.getElementById('lbDeleteBtn').addEventListener('click', deletePhoto);
  
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('imageFileInput');
  
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
  });
  
  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
  
  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    
    const preview = document.getElementById('uploadPreview');
    preview.src = URL.createObjectURL(file);
    document.getElementById('uploadPreviewWrap').classList.add('show');
    window.pendingFile = file;
  }
  
  document.getElementById('uploadSubmitBtn').addEventListener('click', async () => {
    if (!window.pendingFile) {
      showToast('Please select an image', true);
      return;
    }
    
    const caption = document.getElementById('uploadCaption').value.trim();
    if (!caption) {
      showToast('Caption is required', true);
      return;
    }
    
    const status = document.getElementById('uploadStatus');
    status.textContent = 'Uploading...';
    
    try {
      const result = await uploadImage(window.pendingFile);
      
      push(getPhotosRef(), {
        imageUrl: result.url,
        thumbnailUrl: result.thumb.url,
        caption,
        eventDate: document.getElementById('uploadDate').value,
        location: document.getElementById('uploadLocation').value,
        tags: document.getElementById('uploadTags').value.split(',').map(t => t.trim()).filter(Boolean),
        hearts: 0,
        timestamp: Date.now()
      });
      
      showToast('Memory published!');
      status.textContent = '';
      window.pendingFile = null;
      document.getElementById('uploadPreviewWrap').classList.remove('show');
    } catch (err) {
      showToast('Upload failed: ' + err.message, true);
      status.textContent = '';
    }
  });
});
