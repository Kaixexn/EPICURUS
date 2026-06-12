// js/hall-of-fame.js
// Hall of Fame — Firebase Realtime DB + Cloudinary photo upload
// Admin password: EPICURUS2027

import { db } from "./firebase-config.js";
import {
  ref, onValue, push, set, update, remove, get
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ── CONSTANTS ──────────────────────────────────────────────────
const ADMIN_PASSWORD   = "EPICURUS2027";
const CLOUDINARY_NAME  = "dpses7bp6";
const CLOUDINARY_PRESET = "epicurus_unsigned"; // create an unsigned preset in your Cloudinary dashboard named this
const CLOUDINARY_URL   = `https://api.cloudinary.com/v1_1/${CLOUDINARY_NAME}/image/upload`;

const DB_ROOT = "hallOfFame";

// Default sections seeded on first load if DB is empty
const DEFAULT_SECTIONS = [
  {
    id:    "exec",
    title: "The Executive Council",
    style: "wide",
    order: 0,
    officers: {
      pres: {
        name:     "Class President",
        position: "President",
        quote:    "True leadership is not an exercise of dominance, but the strategic cultivation of our student community's shared peace.",
        legacy:   "Governed with institutional empathy. Led the class through every milestone with vision and grace.",
        photoUrl: "",
        order:    0,
      },
      vp: {
        name:     "Vice President",
        position: "Vice President",
        quote:    "Do not disturb what is present by anxious longings for what is missing.",
        legacy:   "Headed internal restructures and coordinated cross-departmental operations.",
        photoUrl: "",
        order:    1,
      },
    },
  },
  {
    id:    "secretariat",
    title: "The Secretarial Bench",
    style: "grid",
    order: 1,
    officers: {
      sec: {
        name: "Secretary", position: "Secretary",
        quote: "Orderly organization produces an orderly graduation year.",
        legacy: "Maintained the class records with precision and care.",
        photoUrl: "", order: 0,
      },
      tres: {
        name: "Treasurer", position: "Treasurer",
        quote: "Absolute clarity in tracking dissolves all unnecessary friction.",
        legacy: "Introduced real-time budget visibility for the whole batch.",
        photoUrl: "", order: 1,
      },
      aud: {
        name: "Auditor", position: "Auditor",
        quote: "True fairness balances collective utility with absolute integrity.",
        legacy: "Re-architected validation systems for class resources.",
        photoUrl: "", order: 2,
      },
    },
  },
  {
    id:    "reps",
    title: "Class Representatives",
    style: "grid",
    order: 2,
    officers: {},
  },
  {
    id:    "royalty",
    title: "The Royal Court",
    style: "grid",
    order: 3,
    officers: {
      muse: {
        name: "Class Muse", position: "Muse",
        quote: "Beauty is wisdom in its finest form.",
        legacy: "The radiant face of our class, embodying grace and spirit.",
        photoUrl: "", order: 0,
      },
      prince: {
        name: "Class Prince", position: "Prince",
        quote: "A gentleman leads by example.",
        legacy: "Carried the class with dignity and charm.",
        photoUrl: "", order: 1,
      },
    },
  },
];

// ── STATE ──────────────────────────────────────────────────────
let isAdmin      = false;
let sections     = [];          // live data from Firebase
let editingState = {            // tracks what we're editing
  sectionId:  null,
  officerId:  null,
  photoUrl:   null,
  isNew:      false,
};
let deleteState  = { type: null, sectionId: null, officerId: null };

// ── DOM REFS ───────────────────────────────────────────────────
const sectionsContainer  = document.getElementById("sectionsContainer");
const adminToolbar       = document.getElementById("adminToolbar");
const adminLoginRow      = document.getElementById("adminLoginRow");

// Modals
const officerModal       = document.getElementById("officerModal");
const adminLoginModal    = document.getElementById("adminLoginModal");
const addSectionModal    = document.getElementById("addSectionModal");
const editOfficerModal   = document.getElementById("editOfficerModal");
const confirmDeleteModal = document.getElementById("confirmDeleteModal");

// ── TOAST ──────────────────────────────────────────────────────
function showToast(msg, duration = 2800) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), duration);
}

// ── MODAL HELPERS ──────────────────────────────────────────────
function openModal(el)  { el.classList.add("open");  document.body.style.overflow = "hidden"; }
function closeModal(el) { el.classList.remove("open"); document.body.style.overflow = ""; }

function closeAllModals() {
  [officerModal, adminLoginModal, addSectionModal, editOfficerModal, confirmDeleteModal]
    .forEach(closeModal);
}

// Close on backdrop click
[officerModal, adminLoginModal, addSectionModal, editOfficerModal, confirmDeleteModal]
  .forEach(m => m.addEventListener("click", e => { if (e.target === m) closeModal(m); }));

// ── FIREBASE SEED ──────────────────────────────────────────────
async function seedDefaultsIfEmpty() {
  const snap = await get(ref(db, DB_ROOT));
  if (snap.exists()) return;

  const batch = {};
  DEFAULT_SECTIONS.forEach(sec => {
    const { id, officers, ...secMeta } = sec;
    batch[`${DB_ROOT}/sections/${id}`] = secMeta;
    Object.entries(officers).forEach(([oid, o]) => {
      batch[`${DB_ROOT}/sections/${id}/officers/${oid}`] = o;
    });
  });

  const updates = {};
  Object.entries(batch).forEach(([k, v]) => { updates[k] = v; });
  await set(ref(db, DB_ROOT), buildFirebaseTree(DEFAULT_SECTIONS));
}

function buildFirebaseTree(secs) {
  const tree = { sections: {} };
  secs.forEach(sec => {
    const { officers, ...meta } = sec;
    tree.sections[sec.id] = { ...meta, officers: officers || {} };
  });
  return tree;
}

// ── FIREBASE LISTENER ──────────────────────────────────────────
function listenToData() {
  const dbRef = ref(db, `${DB_ROOT}/sections`);
  onValue(dbRef, snap => {
    const raw = snap.val() || {};
    sections = Object.entries(raw)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    renderAll();
  });
}

// ── RENDER ────────────────────────────────────────────────────
function renderAll() {
  sectionsContainer.innerHTML = "";

  if (!sections.length) {
    sectionsContainer.innerHTML = `<div class="hof-loading">The ledger is empty — add the first section.</div>`;
    return;
  }

  sections.forEach((sec, idx) => {
    sectionsContainer.appendChild(buildSection(sec, idx + 1));
  });
}

function buildSection(sec, num) {
  const officers = Object.entries(sec.officers || {})
    .map(([id, o]) => ({ id, ...o }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const wrap = document.createElement("div");
  wrap.className = "hof-section";
  wrap.dataset.sectionId = sec.id;

  const gridClass = sec.style === "wide" ? "officers-wide" : "officers-grid";

  wrap.innerHTML = `
    <!-- Section banner -->
    <div class="section-header">
      <div class="section-banner-inner">
        <div class="section-banner-line"></div>
        <h2 class="section-title">${escHtml(sec.title)}</h2>
        <div class="section-banner-line right"></div>
        <span class="section-number">0${num}</span>
      </div>
      <div class="section-admin-btns">
        <button class="section-btn rename-section-btn" data-id="${sec.id}">Rename</button>
        <button class="section-btn danger delete-section-btn" data-id="${sec.id}">Remove</button>
      </div>
    </div>

    <!-- Officers grid -->
    <div class="${gridClass}" id="grid-${sec.id}">
      ${officers.map(o => buildOfficerCard(sec.id, o)).join("")}
      <!-- Add officer card (admin only) -->
      <div class="add-officer-card" data-section-id="${sec.id}">
        <span class="add-officer-card-icon">+</span>
        <span>Add Officer</span>
      </div>
    </div>
  `;

  // Bind section admin events
  wrap.querySelector(".rename-section-btn")?.addEventListener("click", e => {
    e.stopPropagation();
    promptRenameSection(sec.id, sec.title);
  });
  wrap.querySelector(".delete-section-btn")?.addEventListener("click", e => {
    e.stopPropagation();
    openDeleteConfirm("section", sec.id, null, `Remove section "${sec.title}"?`);
  });
  wrap.querySelector(".add-officer-card")?.addEventListener("click", () => {
    openEditOfficerModal(sec.id, null);
  });

  // Bind officer card events
  wrap.querySelectorAll(".officer-card").forEach(card => {
    const sid = card.dataset.sectionId;
    const oid = card.dataset.officerId;

    card.addEventListener("click", e => {
      if (e.target.closest(".card-admin-controls")) return;
      openOfficerDetail(sid, oid);
    });

    card.querySelector(".edit-card-btn")?.addEventListener("click", e => {
      e.stopPropagation();
      openEditOfficerModal(sid, oid);
    });
    card.querySelector(".del-card-btn")?.addEventListener("click", e => {
      e.stopPropagation();
      const o = findOfficer(sid, oid);
      openDeleteConfirm("officer", sid, oid, `Remove "${o?.name}"?`);
    });
  });

  return wrap;
}

function buildOfficerCard(sectionId, o) {
  const photoHtml = o.photoUrl
    ? `<img src="${escHtml(o.photoUrl)}" alt="${escHtml(o.name)}" loading="lazy" />`
    : `<div class="photo-empty">⚘</div>`;

  return `
    <div class="officer-card" data-section-id="${sectionId}" data-officer-id="${o.id}" tabindex="0" role="button" aria-label="View ${escHtml(o.name)}">
      <!-- Admin controls (shown only in admin mode) -->
      <div class="card-admin-controls">
        <button class="card-ctrl-btn edit-card-btn" title="Edit" aria-label="Edit officer">✎</button>
        <button class="card-ctrl-btn del card-ctrl-btn del-card-btn" title="Remove" aria-label="Remove officer">✕</button>
      </div>
      <!-- Photo -->
      <div class="officer-photo-wrap">${photoHtml}</div>
      <!-- Body -->
      <div class="officer-card-body">
        <div class="officer-card-position">${escHtml(o.position || "")}</div>
        <div class="officer-card-name">${escHtml(o.name || "")}</div>
        ${o.quote ? `<p class="officer-card-quote">${escHtml(o.quote)}</p>` : ""}
      </div>
    </div>
  `;
}

// ── OFFICER DETAIL MODAL ───────────────────────────────────────
function findOfficer(sectionId, officerId) {
  const sec = sections.find(s => s.id === sectionId);
  if (!sec?.officers) return null;
  const o = sec.officers[officerId];
  return o ? { id: officerId, ...o } : null;
}

function openOfficerDetail(sectionId, officerId) {
  const o = findOfficer(sectionId, officerId);
  if (!o) return;

  document.getElementById("omPhoto").src   = o.photoUrl || "";
  document.getElementById("omPhoto").style.display = o.photoUrl ? "block" : "none";
  document.getElementById("omPosition").textContent = o.position || "";
  document.getElementById("omName").textContent     = o.name     || "";
  document.getElementById("omQuote").textContent    = o.quote    || "";
  document.getElementById("omLegacy").textContent   = o.legacy   || "";
  openModal(officerModal);
}

document.getElementById("closeOfficerModal")
  .addEventListener("click", () => closeModal(officerModal));

// ── ADMIN LOGIN ────────────────────────────────────────────────
document.getElementById("openAdminLogin")
  .addEventListener("click", () => openModal(adminLoginModal));

document.getElementById("closeAdminLogin")
  .addEventListener("click", () => closeModal(adminLoginModal));

document.getElementById("adminLoginBtn")
  .addEventListener("click", attemptAdminLogin);

document.getElementById("adminPasswordInput")
  .addEventListener("keydown", e => { if (e.key === "Enter") attemptAdminLogin(); });

function attemptAdminLogin() {
  const pw  = document.getElementById("adminPasswordInput").value.trim();
  const err = document.getElementById("adminError");

  if (pw === ADMIN_PASSWORD) {
    isAdmin = true;
    document.body.classList.add("admin-mode");
    adminToolbar.style.display    = "flex";
    adminLoginRow.style.display   = "none";
    closeModal(adminLoginModal);
    document.getElementById("adminPasswordInput").value = "";
    err.style.display = "none";
    showToast("Admin mode unlocked ✦");
  } else {
    err.style.display = "block";
    document.getElementById("adminPasswordInput").select();
  }
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  isAdmin = false;
  document.body.classList.remove("admin-mode");
  adminToolbar.style.display  = "none";
  adminLoginRow.style.display = "flex";
  showToast("Logged out of admin mode");
});

// ── ADD SECTION ────────────────────────────────────────────────
document.getElementById("addSectionBtn")
  .addEventListener("click", () => openModal(addSectionModal));

document.getElementById("closeAddSection")
  .addEventListener("click", () => closeModal(addSectionModal));

document.getElementById("confirmAddSection")
  .addEventListener("click", async () => {
    const title = document.getElementById("newSectionTitle").value.trim();
    const style = document.getElementById("newSectionStyle").value;

    if (!title) { showToast("Please enter a section title."); return; }

    const newId = `sec_${Date.now()}`;
    await set(ref(db, `${DB_ROOT}/sections/${newId}`), {
      title,
      style,
      order: sections.length,
      officers: {},
    });

    document.getElementById("newSectionTitle").value = "";
    closeModal(addSectionModal);
    showToast(`Section "${title}" added ✦`);
  });

// ── RENAME SECTION ─────────────────────────────────────────────
async function promptRenameSection(sectionId, currentTitle) {
  const newTitle = prompt(`Rename section:\n\nCurrent: "${currentTitle}"`, currentTitle);
  if (!newTitle || newTitle.trim() === currentTitle) return;

  await update(ref(db, `${DB_ROOT}/sections/${sectionId}`), { title: newTitle.trim() });
  showToast("Section renamed ✦");
}

// ── DELETE CONFIRM ─────────────────────────────────────────────
function openDeleteConfirm(type, sectionId, officerId, labelText) {
  deleteState = { type, sectionId, officerId };
  document.getElementById("deleteModalTitle").textContent = labelText;
  document.getElementById("deleteModalSub").textContent  =
    type === "section"
      ? "All officers in this section will also be removed. This cannot be undone."
      : "This officer record will be permanently removed.";
  openModal(confirmDeleteModal);
}

document.getElementById("closeConfirmDelete")
  .addEventListener("click", () => closeModal(confirmDeleteModal));

document.getElementById("cancelDelete")
  .addEventListener("click", () => closeModal(confirmDeleteModal));

document.getElementById("confirmDelete")
  .addEventListener("click", async () => {
    const { type, sectionId, officerId } = deleteState;

    if (type === "section") {
      await remove(ref(db, `${DB_ROOT}/sections/${sectionId}`));
      showToast("Section removed");
    } else if (type === "officer") {
      await remove(ref(db, `${DB_ROOT}/sections/${sectionId}/officers/${officerId}`));
      showToast("Officer removed");
    }
    closeModal(confirmDeleteModal);
  });

// ── EDIT / ADD OFFICER MODAL ───────────────────────────────────
function openEditOfficerModal(sectionId, officerId) {
  editingState = { sectionId, officerId, photoUrl: null, isNew: !officerId };

  const isNew = !officerId;
  document.getElementById("editOfficerModalTitle").textContent = isNew ? "Add Officer" : "Edit Officer";

  // Reset form
  const fields = ["officerName", "officerPosition", "officerQuote", "officerLegacy"];
  fields.forEach(id => { document.getElementById(id).value = ""; });

  // Reset photo preview
  const img       = document.getElementById("photoPreviewImg");
  const placeholder = document.getElementById("photoPlaceholder");
  img.style.display = "none";
  img.src           = "";
  placeholder.style.display = "flex";
  document.getElementById("officerUploadProgress").classList.remove("visible");
  document.getElementById("officerProgressFill").style.width = "0%";

  if (!isNew) {
    const o = findOfficer(sectionId, officerId);
    if (o) {
      document.getElementById("officerName").value     = o.name     || "";
      document.getElementById("officerPosition").value = o.position || "";
      document.getElementById("officerQuote").value    = o.quote    || "";
      document.getElementById("officerLegacy").value   = o.legacy   || "";

      if (o.photoUrl) {
        img.src           = o.photoUrl;
        img.style.display = "block";
        placeholder.style.display = "none";
        editingState.photoUrl     = o.photoUrl;
      }
    }
  }

  openModal(editOfficerModal);
}

document.getElementById("closeEditOfficer")
  .addEventListener("click", () => closeModal(editOfficerModal));

// Photo preview click → file input
document.getElementById("photoUploadArea")
  .addEventListener("click", () => {
    document.getElementById("officerPhotoInput").click();
  });

document.getElementById("officerPhotoInput")
  .addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;

    const progress   = document.getElementById("officerUploadProgress");
    const fill       = document.getElementById("officerProgressFill");
    const progressTxt = document.getElementById("officerProgressText");
    const img        = document.getElementById("photoPreviewImg");
    const placeholder = document.getElementById("photoPlaceholder");

    progress.classList.add("visible");
    fill.style.width = "10%";
    progressTxt.textContent = "Uploading…";

    try {
      const url = await uploadToCloudinary(file, pct => {
        fill.style.width = pct + "%";
      });
      editingState.photoUrl   = url;
      img.src                 = url;
      img.style.display       = "block";
      placeholder.style.display = "none";
      fill.style.width        = "100%";
      progressTxt.textContent = "Uploaded ✦";
      setTimeout(() => progress.classList.remove("visible"), 1200);
    } catch (err) {
      progressTxt.textContent = "Upload failed — try again";
      console.error("Cloudinary upload error:", err);
    }

    // Reset input so same file can be re-selected
    e.target.value = "";
  });

// Save officer
document.getElementById("saveOfficerBtn")
  .addEventListener("click", async () => {
    const name     = document.getElementById("officerName").value.trim();
    const position = document.getElementById("officerPosition").value.trim();
    const quote    = document.getElementById("officerQuote").value.trim();
    const legacy   = document.getElementById("officerLegacy").value.trim();

    if (!name || !position) {
      showToast("Name and position are required.");
      return;
    }

    const { sectionId, officerId, photoUrl, isNew } = editingState;

    const officerData = {
      name,
      position,
      quote,
      legacy,
      photoUrl: photoUrl || "",
      order: isNew
        ? Object.keys((sections.find(s => s.id === sectionId)?.officers) || {}).length
        : (findOfficer(sectionId, officerId)?.order ?? 0),
    };

    if (isNew) {
      const newOfficerRef = push(ref(db, `${DB_ROOT}/sections/${sectionId}/officers`));
      await set(newOfficerRef, officerData);
      showToast(`${name} added to the ledger ✦`);
    } else {
      await update(ref(db, `${DB_ROOT}/sections/${sectionId}/officers/${officerId}`), officerData);
      showToast(`${name} updated ✦`);
    }

    closeModal(editOfficerModal);
  });

// ── CLOUDINARY UPLOAD ──────────────────────────────────────────
function uploadToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file",          file);
    fd.append("upload_preset", CLOUDINARY_PRESET);
    fd.append("folder",        "epicurus/officers");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", CLOUDINARY_URL);

    xhr.upload.addEventListener("progress", e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 95));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText);
        resolve(res.secure_url);
      } else {
        reject(new Error(`Cloudinary error: ${xhr.status} ${xhr.responseText}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.send(fd);
  });
}

// ── UTILITY ───────────────────────────────────────────────────
function escHtml(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}

// ── HAMBURGER ─────────────────────────────────────────────────
const hamburger  = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");

hamburger?.addEventListener("click", () => {
  const open = mobileMenu.classList.toggle("open");
  hamburger.setAttribute("aria-expanded", open);
});

// Keyboard accessibility on officer cards
sectionsContainer.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.classList.contains("officer-card")) {
    e.target.click();
  }
});

// ── INIT ──────────────────────────────────────────────────────
(async () => {
  await seedDefaultsIfEmpty();
  listenToData();
})();
