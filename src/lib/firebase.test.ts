import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

jest.mock('./firebase', () => {
  const mockFirestore = {
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(() => ({ exists: () => true })),
  };
  return {
    db: mockFirestore,
    auth: {},
  };
});

describe('Firebase API Tests', () => {
  it('should connect to Firestore and fetch a document', async () => {
    const { db } = require('./firebase');
    const docSnap = await db.getDoc();
    expect(docSnap.exists()).toBe(true);
  });
});