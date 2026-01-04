// sqlite-admin.js - Simple interactive SQLite3 database admin tool using PrettyJSON and table rendering

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const sqlite3 = require('sqlite3').verbose();
const PrettyJSON = require('./prettyJSON'); // Ensure prettyJSON.js is in the same directory

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

let db = null;

// Helper to ask questions and return promises
function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

// Scan current working directory for .sqlite, .sqlite3, .db, .s3db files
function findLocalDatabases() {
  try {
    const files = fs.readdirSync(process.cwd());
    const dbs = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.sqlite', '.sqlite3', '.db', '.s3db'].includes(ext);
    }).map(file => path.join(process.cwd(), file));
    return dbs;
  } catch (err) {
    return [];
  }
}

// Attempt to connect to a database path (may prompt for password if encrypted)
async function connectToDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    const tempDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, async (err) => {
      if (err) {
        // Common case: encrypted database
        if (err.message.includes('file is not a database') || err.message.includes('file is encrypted')) {
          const password = await ask('Database appears to be encrypted. Enter password: ');
          const encryptedDb = new sqlite3.Database(dbPath, (err) => {
            if (err) return reject(err);
            encryptedDb.run(`PRAGMA key = '${password}';`, (pragmaErr) => {
              if (pragmaErr) return reject(new Error('Invalid password or connection failed'));
              resolve(encryptedDb);
            });
          });
        } else {
          reject(err);
        }
      } else {
        resolve(tempDb);
      }
    });
  });
}

// List all tables in the database
async function getTables(db) {
  return new Promise((resolve, reject) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';", (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(row => row.name));
    });
  });
}

// Execute a user query and return results as array of objects
async function executeQuery(db, query) {
  return new Promise((resolve, reject) => {
    // Handle both SELECT-like and non-SELECT queries
    if (query.trim().toUpperCase().startsWith('SELECT') || query.trim().toUpperCase().includes('PRAGMA')) {
      db.all(query, (err, rows) => {
        if (err) return reject(err);
        resolve({ type: 'select', rows });
      });
    } else {
      db.run(query, function(err) {
        if (err) return reject(err);
        resolve({ 
          type: 'modify', 
          changes: this.changes,
          lastID: this.lastID
        });
      });
    }
  });
}

// Main flow
async function main() {
  console.log('\u001b[1mSQLite3 Admin Tool (with PrettyJSON table rendering)\u001b[0m\n');

  const localDbs = findLocalDatabases();

  let dbPath = null;

  if (localDbs.length > 0) {
    console.log('Found SQLite databases in current directory:\n');
    localDbs.forEach((p, i) => {
      console.log(`  ${i + 1}. ${path.basename(p)}  \u001b[90m(${p})\u001b[0m`);
    });
    console.log(`  ${localDbs.length + 1}. Enter custom path\n`);

    const choice = await ask('Select a database (number) or choose custom path: ');

    const num = parseInt(choice);
    if (num >= 1 && num <= localDbs.length) {
      dbPath = localDbs[num - 1];
    } else {
      dbPath = await ask('Enter full path to SQLite database: ');
    }
  } else {
    console.log('No SQLite databases found in current directory.\n');
    dbPath = await ask('Enter full path to SQLite database: ');
  }

  dbPath = dbPath.trim().replace(/^["']|["']$/g, ''); // trim quotes

  let connected = false;
  while (!connected) {
    try {
      db = await connectToDatabase(dbPath);
      console.log(`\n\u001b[32m✓ Successfully connected to: ${dbPath}\u001b[0m\n`);
      connected = true;
    } catch (err) {
      console.log(`\u001b[31m✗ Connection failed: ${err.message}\u001b[0m`);
      const retry = await ask('Try again with different path/password? (y/n): ');
      if (retry.toLowerCase() !== 'y') {
        console.log('Goodbye.');
        rl.close();
        return;
      }
      if (err.message.includes('no such file') || err.message.includes('unable to open')) {
        dbPath = await ask('Enter correct path to database: ');
        dbPath = dbPath.trim().replace(/^["']|["']$/g, '');
      }
      // else: password wrong → will prompt again in connectToDatabase
    }
  }

  // Main query loop
  while (true) {
    try {
      const tables = await getTables(db);
      
      if (tables.length > 0) {
        console.log('\u001b[1mAvailable tables:\u001b[0m');
        // Use PrettyJSON table feature for nice display
        const tableData = tables.map(name => ({ table_name: name }));
        console.log(PrettyJSON.print(tableData) + '\n');
      } else {
        console.log('\u001b[33mNo user tables found in this database.\u001b[0m\n');
      }

      const query = await ask('\u001b[1mEnter SQL query\u001b[0m (or "quit" to exit): ');
      
      if (query.toLowerCase().trim() === 'quit' || query.toLowerCase().trim() === 'exit') {
        console.log('\nGoodbye!');
        break;
      }

      if (query.trim() === '') continue;

      const result = await executeQuery(db, query);

      console.log(); // spacing

      if (result.type === 'select') {
        if (result.rows.length === 0) {
          console.log('\u001b[33m(No rows returned)\u001b[0m');
        } else {
          console.log(PrettyJSON.print(result.rows));
        }
      } else {
        console.log(`\u001b[32m✓ Query executed successfully.\u001b[0m`);
        if (result.changes !== undefined) {
          console.log(`   Rows affected: ${result.changes}`);
        }
        if (result.lastID !== undefined) {
          console.log(`   Last inserted ID: ${result.lastID}`);
        }
      }
    } catch (err) {
      console.log(`\u001b[31m✗ SQL Error: ${err.message}\u001b[0m`);
    }

    console.log('\n' + '─'.repeat(60) + '\n');
  }

  if (db) db.close();
  rl.close();
}

main().catch(err => {
  console.error('Unexpected error:', err);
  rl.close();
});