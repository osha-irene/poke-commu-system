// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database'; // ⭐ 추가
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL, // ⭐ 추가 (선택사항)
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// 서비스 export
export const auth = getAuth(app);
export const db = getFirestore(app);
export const database = getDatabase(app); // ⭐ Realtime Database 추가
export const storage = getStorage(app);
export const functions = getFunctions(app, 'asia-northeast3');

// 현재 환경 확인 (개발 중에만 표시)
if (process.env.NODE_ENV === 'development') {
  console.log('🔥 Firebase 환경:', process.env.REACT_APP_FIREBASE_PROJECT_ID);
}