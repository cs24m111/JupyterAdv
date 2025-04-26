const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

(async () => {
  const db = await open({
    filename: './comments.db',
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      cellId TEXT,
      user TEXT,
      comment TEXT,
      timestamp TEXT,
      parentId TEXT,
      permissionLevel INTEGER DEFAULT 0
    )
  `);
  console.log('Database initialized successfully');
  await db.close();
})();