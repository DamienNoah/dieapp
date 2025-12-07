import fs from 'fs';
import path from 'path';
import { Database } from './Database';

async function migrate() {
  console.log('Starting database migration...');

  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory');
  }

  // Initialize database and schema
  const db = await Database.ensureInitialized();
  db.initializeSchema();
  console.log('Database schema initialized');

  console.log('Migration completed successfully!');
}

migrate().catch(console.error);
