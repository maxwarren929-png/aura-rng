const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
const MAX_MSG_LENGTH = 200;
const RATE_LIMIT_MS = 1500; // min ms between messages per user
const lastSent = new Map();

// GET /api/chat?before=<id>&limit=50 — fetch recent messages
router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const before = parseInt(req.query.before) || null;

  try {
    let query, params;
    if (before) {
      query = `SELECT id, username, message, created_at FROM chat_messages WHERE id < $1 ORDER BY id DESC LIMIT $2`;
      params = [before, limit];
    } else {
      query = `SELECT id, username, message, created_at FROM chat_messages ORDER BY id DESC LIMIT $1`;
      params = [limit];
    }
    const result = await db.query(query, params);
    res.json(result.rows.reverse()); // oldest first
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/chat — send a message (auth required)
router.post('/', auth, async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Message required' });
  const text = message.trim();
  if (!text) return res.status(400).json({ error: 'Message cannot be empty' });
  if (text.length > MAX_MSG_LENGTH) return res.status(400).json({ error: `Message too long (max ${MAX_MSG_LENGTH} chars)` });

  // Simple in-memory rate limit
  const now = Date.now();
  const last = lastSent.get(req.player.id) || 0;
  if (now - last < RATE_LIMIT_MS) return res.status(429).json({ error: 'Slow down' });
  lastSent.set(req.player.id, now);

  try {
    const result = await db.query(
      'INSERT INTO chat_messages (player_id, username, message) VALUES ($1, $2, $3) RETURNING id, username, message, created_at',
      [req.player.id, req.player.username, text]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
