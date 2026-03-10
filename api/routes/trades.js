const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/trades — all open trades (public)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.id, t.from_username, t.aura_id, t.aura_name, t.aura_tier, t.want_description, t.status, t.claimed_by_username, t.created_at
       FROM trades t
       WHERE t.status IN ('open','claimed')
       ORDER BY t.created_at DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/trades/mine — your own trades (auth)
router.get('/mine', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, from_username, aura_id, aura_name, aura_tier, want_description, status, claimed_by_username, created_at
       FROM trades WHERE from_player_id = $1 ORDER BY created_at DESC`,
      [req.player.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/trades/pending — auras queued for you to collect (auth)
router.get('/pending', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, aura_id, aura_name, aura_tier, from_username, created_at
       FROM pending_auras WHERE to_player_id = $1 ORDER BY created_at DESC`,
      [req.player.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/trades — list an aura for trade (auth)
router.post('/', auth, async (req, res) => {
  const { aura_id, aura_name, aura_tier, want_description } = req.body;
  if (!aura_id || !aura_name) return res.status(400).json({ error: 'aura_id and aura_name required' });
  const want = (want_description || '').trim().slice(0, 200);
  try {
    const result = await db.query(
      `INSERT INTO trades (from_player_id, from_username, aura_id, aura_name, aura_tier, want_description)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.player.id, req.player.username, aura_id, aura_name, aura_tier || '', want]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/trades/:id/claim — mark you're interested (auth)
router.post('/:id/claim', auth, async (req, res) => {
  try {
    const trade = await db.query('SELECT * FROM trades WHERE id = $1', [req.params.id]);
    if (!trade.rows[0]) return res.status(404).json({ error: 'Trade not found' });
    const t = trade.rows[0];
    if (t.status !== 'open') return res.status(409).json({ error: 'Trade is no longer open' });
    if (t.from_player_id === req.player.id) return res.status(400).json({ error: 'Cannot claim your own trade' });

    await db.query(
      `UPDATE trades SET status='claimed', claimed_by_id=$1, claimed_by_username=$2 WHERE id=$3`,
      [req.player.id, req.player.username, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/trades/:id/complete — confirm trade & queue aura for claimer (auth, must be poster)
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const trade = await db.query('SELECT * FROM trades WHERE id = $1', [req.params.id]);
    if (!trade.rows[0]) return res.status(404).json({ error: 'Trade not found' });
    const t = trade.rows[0];
    if (t.from_player_id !== req.player.id) return res.status(403).json({ error: 'Not your trade' });
    if (t.status !== 'claimed') return res.status(409).json({ error: 'Trade must be claimed first' });

    // Queue aura for claimer
    await db.query(
      `INSERT INTO pending_auras (to_player_id, aura_id, aura_name, aura_tier, from_username, trade_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [t.claimed_by_id, t.aura_id, t.aura_name, t.aura_tier, t.from_username, t.id]
    );
    await db.query(`UPDATE trades SET status='completed' WHERE id=$1`, [t.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/trades/:id — cancel your listing (auth, must be poster)
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE trades SET status='cancelled' WHERE id=$1 AND from_player_id=$2 AND status IN ('open','claimed') RETURNING id`,
      [req.params.id, req.player.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Trade not found or already done' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/trades/pending/:id — collect a pending aura (removes the delivery record)
router.delete('/pending/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM pending_auras WHERE id=$1 AND to_player_id=$2 RETURNING aura_id, aura_name, aura_tier`,
      [req.params.id, req.player.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Pending aura not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
