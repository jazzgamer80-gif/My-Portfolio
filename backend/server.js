// server.js — Node.js + Express + PostgreSQL Backend
// Abhishek U | Portfolio Contact API

const express    = require('express');
const cors       = require('cors');
const { Pool }   = require('pg');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ──
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://your-github-username.github.io',  // ← CHANGE THIS
  ],
  methods: ['GET', 'POST', 'DELETE'],
}));
app.use(express.json());

// ── DATABASE ──
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Create table if it doesn't exist
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      email      VARCHAR(150) NOT NULL,
      subject    VARCHAR(200),
      message    TEXT NOT NULL,
      status     VARCHAR(20) DEFAULT 'new',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  console.log('✅ Database table ready');
}

initDB().catch(console.error);

// ── ROUTES ──

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Abhishek Portfolio API is running 🚀' });
});

// POST /api/contact — Receive message from portfolio form
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO messages (name, email, subject, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [name.trim(), email.trim(), subject || null, message.trim()]
    );

    console.log(`📨 New message from ${name} <${email}>`);
    res.status(201).json({
      success: true,
      message: 'Message received! Thank you.',
      id: result.rows[0].id,
    });
  } catch (err) {
    console.error('DB error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// GET /api/messages — Admin: Get all messages
app.get('/api/messages', async (req, res) => {
  // NOTE: In production, add authentication middleware here!
  try {
    const result = await pool.query(
      `SELECT id, name, email, subject, message, status, created_at as date
       FROM messages ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('DB error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/messages/:id — Mark as read
app.patch('/api/messages/:id', async (req, res) => {
  try {
    await pool.query(
      `UPDATE messages SET status = 'read' WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/messages/:id — Delete a message
app.delete('/api/messages/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM messages WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── START ──
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
