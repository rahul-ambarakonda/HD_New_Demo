/**
 * Exports `readStore()`, `addEntry(email, ip)`, and `hasEmail(email)`
 * for managing the waitlist data in `data/waitlist.json`.
 */

import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE = `${__dirname}/../../data/waitlist.json`;
const DATA_DIR = `${__dirname}/../../data`;

let writePromise = Promise.resolve();

export async function readStore() {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { version: 1, entries: [] };
    }
    // If the file is malformed, for now, we'll re-throw for tests to catch.
    // In a production scenario, more robust error handling might be needed,
    // e.g., backing up the corrupted file and starting with an empty store.
    throw error;
  }
}

async function writeStore(data) {
  const tmpFile = `${DATA_FILE}.tmp`;
  const json = JSON.stringify(data, null, 2);

  // Ensure data directory exists
  await fs.mkdir(DATA_DIR, { recursive: true });
  
  // Atomic write: write to temp, fsync, then rename
  await fs.writeFile(tmpFile, json, 'utf8');
  await fs.fsync(await fs.open(tmpFile, 'r')); // fsync the temporary file
  await fs.rename(tmpFile, DATA_FILE);
}

export function addEntry(email, ip) {
  const normalizedEmail = email.trim().toLowerCase();
  const newEntry = {
    email: normalizedEmail,
    joinedAt: new Date().toISOString(),
    ip,
  };

  // Serialize writes through a promise chain
  writePromise = writePromise.then(async () => {
    const store = await readStore();
    store.entries.push(newEntry);
    await writeStore(store);
  });

  return writePromise;
}

export async function hasEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  // Ensure we wait for any pending writes to complete before reading
  await writePromise;
  const store = await readStore();
  return store.entries.some(entry => entry.email === normalizedEmail);
}
