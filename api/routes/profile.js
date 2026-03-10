const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/profile/:username — public profile
router.get('/:username', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.username, pr.best_aura_id, pr.total_rolls, pr.total_coins, pr.updated_at
       FROM players p
       JOIN profiles pr ON pr.player_id = p.id
       WHERE p.username = $1`,
      [req.params.username]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Player not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/profile — update your own profile stats (auth required)
router.patch('/', auth, async (req, res) => {
  const { best_aura_id, total_rolls, total_coins } = req.body;
  try {
    await db.query(
      `UPDATE profiles SET
        best_aura_id = COALESCE($1, best_aura_id),
        total_rolls   = COALESCE($2, total_rolls),
        total_coins   = COALESCE($3, total_coins),
        updated_at    = NOW()
       WHERE player_id = $4`,
      [best_aura_id ?? null, total_rolls ?? null, total_coins ?? null, req.player.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/profile — leaderboard (top 20 by total_rolls)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.username, pr.best_aura_id, pr.total_rolls, pr.total_coins
       FROM players p
       JOIN profiles pr ON pr.player_id = p.id
       ORDER BY pr.total_rolls DESC
       LIMIT 20`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
