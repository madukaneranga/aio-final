
// src/utils/firebase.js
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCg8I0ffnAWnoXOf_2nECrwY2CS6RQItUs",
  authDomain: "all-in-one-98568.firebaseapp.com",
  projectId: "all-in-one-98568",
  storageBucket: "all-in-one-98568.firebasestorage.app",
  messagingSenderId: "86801808333",
  appId: "1:86801808333:web:7bd536c9fa784b32ed2284"
};

const app = initializeApp(firebaseConfig);

const storage = getStorage(app);
const auth = getAuth(app);

export { storage, auth };
