import * as admin from 'firebase-admin';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

// Get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'mcp-server/hostel-management-834b9-firebase-adminsdk-fbsvc-590e86999b.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function populateMeals() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const meals = [
    {
      id: `${today}-breakfast`,
      type: 'breakfast',
      date: today,
      menu: 'Idli, Sambar, Chutney',
      availability: true,
      startTime: '07:00',
      closingTime: '09:30',
      registeredCount: 0,
      verifiedCount: 0,
      absentCount: 0,
      fineCount: 0,
    },
    {
      id: `${today}-lunch`,
      type: 'lunch',
      date: today,
      menu: 'Rice, Dal, Vegetables',
      availability: true,
      startTime: '12:00',
      closingTime: '14:00',
      registeredCount: 0,
      verifiedCount: 0,
      absentCount: 0,
      fineCount: 0,
    },
    {
      id: `${today}-dinner`,
      type: 'dinner',
      date: today,
      menu: 'Roti, Curry, Rice',
      availability: true,
      startTime: '19:00',
      closingTime: '20:30',
      registeredCount: 0,
      verifiedCount: 0,
      absentCount: 0,
      fineCount: 0,
    },
  ];

  try {
    for (const meal of meals) {
      await db.collection('meals').doc(meal.id).set(meal);
      console.log(`✅ Created meal: ${meal.id}`);
    }
    console.log('✅ All meals populated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating meals:', error);
    process.exit(1);
  }
}

populateMeals();
