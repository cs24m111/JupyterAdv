import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const db = new sqlite3.Database('./comments.db');

// Initialize table
db.run(`
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    cellId TEXT,
    user TEXT,
    comment TEXT,
    timestamp TEXT,
    parentId TEXT,
    permissionLevel INTEGER DEFAULT 0
  )
`, err => {
  if (err) console.error('❌ Error initializing database:', err);
  else console.log('✅ Database initialized');
});

// Development mode to allow all users
const allowAllUsers = true;

// Middleware to check authorization
const authenticate: RequestHandler = (req, res, next) => {
  const user = req.headers['x-username'] as string;
  if (allowAllUsers || (user && user === 'authorized_user')) {
    next();
  } else {
    res.status(403).json({ error: 'Unauthorized' });
  }
};

// GET comments for a given cell
app.get('/api/comments/:cellId', authenticate, (req: Request, res: Response): void => {
  const { cellId } = req.params;

  db.all(
    'SELECT * FROM comments WHERE cellId = ? ORDER BY timestamp ASC',
    [cellId],
    (err, rows) => {
      if (err) {
        console.error(`❌ Failed to fetch comments for ${cellId}:`, err);
        res.status(500).json({ error: 'Error fetching comments' });
        return;
      }
      res.json(rows);
    }
  );
});

// POST: Add a comment
app.post('/api/add-comment', authenticate, (req: Request, res: Response): void => {
  const { comment, cellId, parentId = null } = req.body;
  const user = req.headers['x-username'] as string;

  if (!comment || !cellId) {
    res.status(400).json({ error: 'Comment and cellId are required' });
    return;
  }

  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const newComment = {
    id: uuidv4(),
    cellId,
    user,
    comment,
    timestamp,
    parentId,
    permissionLevel: 0
  };

  db.run(
    'INSERT INTO comments (id, cellId, user, comment, timestamp, parentId, permissionLevel) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      newComment.id,
      newComment.cellId,
      newComment.user,
      newComment.comment,
      newComment.timestamp,
      newComment.parentId,
      newComment.permissionLevel
    ],
    err => {
      if (err) {
        console.error('❌ Failed to add comment:', err);
        res.status(500).json({ error: 'Failed to add comment' });
        return;
      }
      res.json(newComment);
    }
  );
});

// Optional search route
app.get('/api/search-comments', authenticate, (req: Request, res: Response): void => {
  const { user, cellId } = req.query;
  let query = 'SELECT * FROM comments WHERE 1=1';
  const params: any[] = [];

  if (user) {
    query += ' AND user = ?';
    params.push(user);
  }

  if (cellId) {
    query += ' AND cellId = ?';
    params.push(cellId);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('❌ Search failed:', err);
      res.status(500).json({ error: 'Search failed' });
      return;
    }
    res.json(rows);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close(() => {
    console.log('🔌 Closed database.');
    process.exit(0);
  });
});
