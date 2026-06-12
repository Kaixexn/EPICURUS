// js/firebase-config.js
// Shared Firebase initialization — import this first in every page module

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getStorage }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCk0tn7-7YhgOrtoYl2EDXjzUaW6MPLA_I",
  authDomain:        "epicurus-project.firebaseapp.com",
  databaseURL:       "https://epicurus-project-default-rtdb.firebaseio.com",
  projectId:         "epicurus-project",
  storageBucket:     "epicurus-project.firebasestorage.app",
  messagingSenderId: "605298370739",
  appId:             "1:605298370739:web:972e4ac5028334971068c6",
  measurementId:     "G-5J2C56NQL4",
};

const app     = initializeApp(firebaseConfig);
const db      = getDatabase(app);
const storage = getStorage(app);

export { app, db, storage };
