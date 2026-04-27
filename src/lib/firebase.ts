import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // Use default database ID from config
export const auth = getAuth(app);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error.message?.includes('the client is offline')) {
      console.warn("Firestore is operating in offline mode. This is expected if the backend is not yet fully provisioned or if there are network constraints.");
    } else {
      console.error("Firestore connection error:", error);
    }
  }
}
testConnection();
