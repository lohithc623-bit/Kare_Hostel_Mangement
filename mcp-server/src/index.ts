import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase configuration from the project
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'hostel-management-834b9',
  appId: process.env.FIREBASE_APP_ID || '1:410325397186:web:5b02d316f2ce594a72555b',
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyC78SHEUAoMdR1Syr6iYfrXy4koA8MWP-E',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'hostel-management-834b9.firebaseapp.com',
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://hostel-management-834b9-default-rtdb.firebaseio.com',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'hostel-management-834b9.firebasestorage.app',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '410325397186',
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-L0YM03GJC3',
};

// Initialize Firebase Admin
let db: any;
try {
  if (getApps().length === 0) {
    // Use application default credentials or mock for development
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
  db = getFirestore();
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Define available tools
const tools = [
  {
    name: 'firebase_query',
    description: 'Query Firestore database with filters',
    inputSchema: {
      type: 'object',
      properties: {
        collection: { type: 'string', description: 'Firestore collection name' },
        where: { type: 'string', description: 'Field to filter by' },
        operator: { type: 'string', description: 'Comparison operator (==, !=, >, <, etc.)' },
        value: { type: 'string', description: 'Value to compare against' },
        limit: { type: 'number', description: 'Maximum number of results' },
      },
      required: ['collection'],
    },
  },
  {
    name: 'firebase_get_document',
    description: 'Get a specific document from Firestore',
    inputSchema: {
      type: 'object',
      properties: {
        collection: { type: 'string', description: 'Firestore collection name' },
        documentId: { type: 'string', description: 'Document ID to retrieve' },
      },
      required: ['collection', 'documentId'],
    },
  },
  {
    name: 'firebase_create_document',
    description: 'Create a new document in Firestore',
    inputSchema: {
      type: 'object',
      properties: {
        collection: { type: 'string', description: 'Firestore collection name' },
        data: { type: 'string', description: 'JSON data for the document' },
      },
      required: ['collection', 'data'],
    },
  },
  {
    name: 'firebase_update_document',
    description: 'Update an existing document in Firestore',
    inputSchema: {
      type: 'object',
      properties: {
        collection: { type: 'string', description: 'Firestore collection name' },
        documentId: { type: 'string', description: 'Document ID to update' },
        data: { type: 'string', description: 'JSON data to update' },
      },
      required: ['collection', 'documentId', 'data'],
    },
  },
  {
    name: 'firebase_delete_document',
    description: 'Delete a document from Firestore',
    inputSchema: {
      type: 'object',
      properties: {
        collection: { type: 'string', description: 'Firestore collection name' },
        documentId: { type: 'string', description: 'Document ID to delete' },
      },
      required: ['collection', 'documentId'],
    },
  },
  {
    name: 'firebase_list_collections',
    description: 'List all collections in the Firestore database',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Create the server
const server = new Server(
  {
    name: 'firebase-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params as any;
  const toolArgs = args || {};

  try {
    switch (name) {
      case 'firebase_query': {
        if (!db) throw new Error('Firestore not initialized');
        let query = db.collection(toolArgs.collection);
        
        if (toolArgs.where && toolArgs.operator && toolArgs.value !== undefined) {
          query = query.where(toolArgs.where, toolArgs.operator as any, JSON.parse(toolArgs.value));
        }
        
        if (toolArgs.limit) {
          query = query.limit(toolArgs.limit);
        }
        
        const snapshot = await query.get();
        const results = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'firebase_get_document': {
        if (!db) throw new Error('Firestore not initialized');
        const doc = await db.collection(toolArgs.collection).doc(toolArgs.documentId).get();
        
        if (!doc.exists) {
          return {
            content: [
              {
                type: 'text',
                text: `Document ${toolArgs.documentId} not found in ${toolArgs.collection}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ id: doc.id, ...doc.data() }, null, 2),
            },
          ],
        };
      }

      case 'firebase_create_document': {
        if (!db) throw new Error('Firestore not initialized');
        const data = JSON.parse(toolArgs.data as string);
        const docRef = await db.collection(toolArgs.collection).add(data);
        
        return {
          content: [
            {
              type: 'text',
              text: `Document created with ID: ${docRef.id}`,
            },
          ],
        };
      }

      case 'firebase_update_document': {
        if (!db) throw new Error('Firestore not initialized');
        const data = JSON.parse(toolArgs.data as string);
        await db.collection(toolArgs.collection).doc(toolArgs.documentId).update(data);
        
        return {
          content: [
            {
              type: 'text',
              text: `Document ${toolArgs.documentId} updated successfully`,
            },
          ],
        };
      }

      case 'firebase_delete_document': {
        if (!db) throw new Error('Firestore not initialized');
        await db.collection(toolArgs.collection).doc(toolArgs.documentId).delete();
        
        return {
          content: [
            {
              type: 'text',
              text: `Document ${toolArgs.documentId} deleted successfully`,
            },
          ],
        };
      }

      case 'firebase_list_collections': {
        if (!db) throw new Error('Firestore not initialized');
        const collections = await db.listCollections();
        const collectionNames = collections.map((col: any) => col.id);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(collectionNames, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Firebase MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});