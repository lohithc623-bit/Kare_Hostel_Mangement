import { db } from '../src/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

async function verify() {
  console.log("Checking Firestore connectivity...");
  try {
    const docRef = doc(db, 'test', 'connection');
    const snapshot = await getDoc(docRef);
    console.log("✅ Success! Firestore is reachable.");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Firestore connection failed.");
    console.error("Error Code:", error.code);
    console.error("Error Message:", error.message);
    process.exit(1);
  }
}

verify();
