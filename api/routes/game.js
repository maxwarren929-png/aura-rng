'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { pickAura, applyRoll, processBuy, processSell, DEFAULT_STATE, DEFAULT_QUESTS } = require('../gameLogic');

async function loadState(playerId) {
  const r = await db.query('SELECT state FROM game_saves WHERE player_id=$1', [playerId]);
  if (!r.rows.length) {
    const state = { ...DEFAULT_STATE, quests: DEFAULT_QUESTS.map(q => ({ ...q })) };
    await db.query('INSERT INTO game_saves(player_id,state) VALUES($1,$2)', [playerId, JSON.stringify(state)]);
    return state;
  }
  return r.rows[0].state;
}

async function saveState(playerId, state) {
  await db.query(
    `INSERT INTO game_saves(player_id,state,updated_at) VALUES($1,$2,NOW())
     ON CONFLICT(player_id) DO UPDATE SET state=$2, updated_at=NOW()`,
    [playerId, JSON.stringify(state)]
  );
  // Update public leaderboard profile
  await db.query(
    `INSERT INTO profiles(player_id,best_aura_id,total_rolls,total_coins,updated_at) VALUES($1,$2,$3,$4,NOW())
     ON CONFLICT(player_id) DO UPDATE SET best_aura_id=$2, total_rolls=$3, total_coins=$4, updated_at=NOW()`,
    [playerId, state.bestAuraId || null, state.rolls || 0, state.totalCoinsEarned || 0]
  );
}

// GET /api/game/state
router.get('/state', auth, async (req, res) => {
  try {
    const state = await loadState(req.player.id);
    res.json({ state });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/game/roll  { count: 1-50 }
router.post('/roll', auth, async (req, res) => {
  try {
    const count = Math.min(Math.max(1, parseInt(req.body.count) || 1), 50);
    const state = await loadState(req.player.id);
    const results = [];
    for (let i = 0; i < count; i++) {
      const aura = pickAura(state);
      const result = applyRoll(state, aura);
      results.push(result);
    }
    await saveState(req.player.id, state);
    res.json({ results, state });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/game/buy  { itemId }
router.post('/buy', auth, async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'Missing itemId' });
    const state = await loadState(req.player.id);
    const result = processBuy(state, itemId);
    if (result.error) return res.status(400).json({ error: result.error });
    await saveState(req.player.id, state);
    res.json({ ok: true, state });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/game/sell  { auraId, count }
router.post('/sell', auth, async (req, res) => {
  try {
    const { auraId, count } = req.body;
    if (!auraId) return res.status(400).json({ error: 'Missing auraId' });
    const state = await loadState(req.player.id);
    const result = processSell(state, auraId, count || 1);
    if (result.error) return res.status(400).json({ error: result.error });
    await saveState(req.player.id, state);
    res.json({ ok: true, earned: result.earned, state });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/game/equip  { auraId }
router.post('/equip', auth, async (req, res) => {
  try {
    const { auraId } = req.body;
    const state = await loadState(req.player.id);
    if (auraId) {
      const owned = (state.inventory || {})[auraId] || (state.mergedInventory || {})[auraId] || 0;
      if (!owned) return res.status(400).json({ error: 'Aura not in inventory' });
    }
    state.equippedId = auraId || null;
    await saveState(req.player.id, state);
    res.json({ ok: true, state });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/game/battle-win  { stolenAuraId? } — claim battle rewards
router.post('/battle-win', auth, async (req, res) => {
  try {
    const { stolenAuraId } = req.body;
    const state = await loadState(req.player.id);
    const COINS = 300;
    state.coins = (state.coins || 0) + COINS;
    state.totalCoinsEarned = (state.totalCoinsEarned || 0) + COINS;
    if (stolenAuraId && typeof stolenAuraId === 'string') {
      state.inventory = state.inventory || {};
      state.inventory[stolenAuraId] = (state.inventory[stolenAuraId] || 0) + 1;
    }
    await saveState(req.player.id, state);
    res.json({ ok: true, state, coinsEarned: COINS, stolenAuraId: stolenAuraId || null });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/game/save  — sync client-only fields (merges, enchants)
router.post('/save', auth, async (req, res) => {
  try {
    const { state: clientState } = req.body;
    if (!clientState) return res.status(400).json({ error: 'Missing state' });
    const state = await loadState(req.player.id);
    // Only allow safe client-only fields to overwrite
    for (const k of ['mergedDefs', 'mergedInventory', 'equippedId', 'auraEnchantments']) {
      if (clientState[k] !== undefined) state[k] = clientState[k];
    }
    await saveState(req.player.id, state);
    res.json({ ok: true, state });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
