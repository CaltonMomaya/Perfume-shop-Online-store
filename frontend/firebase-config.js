// Firebase 10 CDN Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyD3VgNQ_w0A5NEiFrEqBbCgbkH1uK_2qcM",
  authDomain: "one-stop-shop-676f9.firebaseapp.com",
  databaseURL: "https://one-stop-shop-676f9-default-rtdb.firebaseio.com",
  projectId: "one-stop-shop-676f9",
  storageBucket: "one-stop-shop-676f9.firebasestorage.app",
  messagingSenderId: "105516341313",
  appId: "1:105516341313:web:0e907ea8ec17852a72cec0",
  measurementId: "G-QGBQW3Z61Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth + DB
export const auth = getAuth(app);
export const db = getDatabase(app);
