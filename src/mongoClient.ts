import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connects once and returns the database instance.
 * Subsequent calls return the cached Db.
 */
export async function connectMongo(uri?: string): Promise<Db> {
  if (db) return db;
  const mongoUri = uri || process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not defined');

  client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  db = client.db();
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error('MongoDB not connected. Call connectMongo() first.');
  return db;
}

export function getClient(): MongoClient {
  if (!client) throw new Error('MongoClient not connected. Call connectMongo() first.');
  return client;
}

export async function closeMongo(): Promise<void> {
  if (client) {
    try {
      await client.close();
    } finally {
      client = null;
      db = null;
    }
  }
}

export default connectMongo;
