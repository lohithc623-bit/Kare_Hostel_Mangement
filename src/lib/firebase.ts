import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase with better handle for re-initialization
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// We try to use the default database, but fallback to project ID if needed
// Based on logs, the project seems to have issues finding '(default)'
export const db = getFirestore(app);
export const auth = getAuth(app);

// Simple connection health check removed to reduce console noise.
