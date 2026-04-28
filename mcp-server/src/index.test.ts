import { db } from './index.js';

// Mock firebase-admin
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  cert: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      get: jest.fn(() => ({
        docs: [
          { id: '1', data: () => ({ name: 'Test User' }) }
        ]
      })),
      doc: jest.fn(() => ({
        get: jest.fn(() => ({
          exists: true,
          id: '1',
          data: () => ({ name: 'Test User' })
        })),
        update: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve()),
      })),
      add: jest.fn(() => Promise.resolve({ id: 'new-id' })),
    })),
    listCollections: jest.fn(() => Promise.resolve([{ id: 'users' }, { id: 'meals' }])),
  })),
}));

describe('MCP Server Internal Logic Tests', () => {
  it('should have db defined (even if mocked)', () => {
    expect(db).toBeDefined();
  });
});