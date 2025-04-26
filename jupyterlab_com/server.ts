import express from 'express';
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./comments.db');
db.run('CREATE TABLE IF NOT EXISTS comments (cellId TEXT, comment TEXT)');

const app = express();
app.use(express.json());

app.get('/api/comments', (req, res) => {
  const { cellId } = req.query;

  if (!cellId) {
    return res.status(400).json({ error: "cellId is required" });
  }

  db.all('SELECT comment FROM comments WHERE cellId = ?', [cellId], (err, rows: { comment: string }[]) => {

    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ error: "Database query failed" });
    }

    if (!rows || !Array.isArray(rows)) {
      return res.json([]); // ✅ Fix: Always return an array
    }

    res.json(rows.map(row => row.comment));
  });
});


app.post('/api/comments', (req, res) => {
  const { cellId, comment } = req.body;
  db.run('INSERT INTO comments (cellId, comment) VALUES (?, ?)', [cellId, comment], () => {
    res.sendStatus(201);
  });
});

app.listen(5000, () => console.log('Server running on port 5000'));
