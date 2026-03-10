// api/routes/battle.js — NormArena online challenge routes
const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS battle_challenges (
      id           SERIAL PRIMARY KEY,
      challenger_id   INTEGER NOT NULL,
      challenger_name VARCHAR(50) NOT NULL,
      challenger_team JSONB NOT NULL,
      opponent_id     INTEGER,
      opponent_name   VARCHAR(50),
      opponent_team   JSONB,
      status          VARCHAR(20) DEFAULT 'pending',
      created_at      TIMESTAMP DEFAULT NOW()
    )
  `);
}

// GET /api/battle/challenges — pending challenges directed at this user
router.get('/challenges', auth, async (req, res) => {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT id, challenger_id, challenger_name, challenger_team, created_at
       FROM battle_challenges
       WHERE opponent_name = $1 AND status = 'pending'
       ORDER BY created_at DESC LIMIT 20`,
      [req.user.username]
    );
    // Build preview of challenger's team
    const result = rows.map(r => ({
      id:               r.id,
      challenger_id:    r.challenger_id,
      challenger_name:  r.challenger_name,
      team_preview:     (r.challenger_team || []).slice(0, 3).join(', '),
      created_at:       r.created_at,
    }));
    res.json(result);
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/battle/challenge — send a challenge
router.post('/challenge', auth, async (req, res) => {
  const { opponent_username, team } = req.body;
  if (!opponent_username || !Array.isArray(team) || team.length === 0)
    return res.status(400).json({ error: 'opponent_username and team required' });
  try {
    await ensureTable();
    // Check opponent exists
    const { rows: users } = await pool.query(
      'SELECT id, username FROM users WHERE username = $1', [opponent_username]
    );
    if (!users.length) return res.status(404).json({ error: 'Player not found' });
    if (users[0].id === req.user.id) return res.status(400).json({ error: "Can't challenge yourself" });

    const { rows } = await pool.query(
      `INSERT INTO battle_challenges (challenger_id, challenger_name, challenger_team, opponent_id, opponent_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.user.id, req.user.username, JSON.stringify(team), users[0].id, users[0].username]
    );
    res.json({ ok: true, id: rows[0].id });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/battle/challenge/:id/accept
router.post('/challenge/:id/accept', auth, async (req, res) => {
  const { team } = req.body;
  if (!Array.isArray(team) || team.length === 0)
    return res.status(400).json({ error: 'team required' });
  try {
    await ensureTable();
    const { rows } = await pool.query(
      'SELECT * FROM battle_challenges WHERE id = $1', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Challenge not found' });
    const ch = rows[0];
    if (ch.opponent_name !== req.user.username) return res.status(403).json({ error: 'Not your challenge' });
    if (ch.status !== 'pending') return res.status(400).json({ error: 'Challenge already resolved' });

    await pool.query(
      `UPDATE battle_challenges SET status='active', opponent_team=$1 WHERE id=$2`,
      [JSON.stringify(team), ch.id]
    );
    res.json({ ok: true, battle: { id: ch.id, challengerTeam: ch.challenger_team, opponentTeam: team } });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/battle/challenge/:id/decline
router.post('/challenge/:id/decline', auth, async (req, res) => {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      'SELECT * FROM battle_challenges WHERE id = $1', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Challenge not found' });
    if (rows[0].opponent_name !== req.user.username) return res.status(403).json({ error: 'Not your challenge' });
    await pool.query('UPDATE battle_challenges SET status=$1 WHERE id=$2', ['declined', req.params.id]);
    res.json({ ok: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
