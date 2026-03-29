import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  enableMultiTabIndexedDbPersistence,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDWBpYLFY6bf1WbApaVu9Zvee5w_WOPsWk',
  authDomain: 'sinus-note-c03c6.firebaseapp.com',
  projectId: 'sinus-note-c03c6',
  storageBucket: 'sinus-note-c03c6.firebasestorage.app',
  messagingSenderId: '892365273822',
  appId: '1:892365273822:web:7fcc739f695a2f74ae204f',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable offline persistence
enableMultiTabIndexedDbPersistence(db).catch(() => {
  // Persistence failed — not critical
});

export { signInWithEmailAndPassword, signOut, onAuthStateChanged };
export type { User };
