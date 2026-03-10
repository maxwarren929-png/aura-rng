const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const SALT_ROUNDS = 10;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'Username must be 3–20 characters' });
  if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await db.query(
      'INSERT INTO players (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, hash]
    );
    const player = result.rows[0];
    // Create empty profile row
    await db.query('INSERT INTO profiles (player_id) VALUES ($1)', [player.id]);

    const token = jwt.sign({ id: player.id, username: player.username }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, username: player.username, id: player.id });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already taken' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const result = await db.query('SELECT id, username, password_hash FROM players WHERE username = $1', [username]);
    const player = result.rows[0];
    if (!player) return res.status(401).json({ error: 'Invalid username or password' });

    const match = await bcrypt.compare(password, player.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign({ id: player.id, username: player.username }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, username: player.username, id: player.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
