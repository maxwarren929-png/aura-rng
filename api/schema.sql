-- Run this once to set up the database

CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  best_aura_id TEXT,
  total_rolls INTEGER DEFAULT 0,
  total_coins INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  from_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  from_username TEXT NOT NULL,
  aura_id TEXT NOT NULL,
  aura_name TEXT NOT NULL,
  aura_tier TEXT DEFAULT '',
  want_description TEXT DEFAULT '',
  status TEXT DEFAULT 'open',       -- open | claimed | completed | cancelled
  claimed_by_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  claimed_by_username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trades_status_idx ON trades(status);

CREATE TABLE IF NOT EXISTS pending_auras (
  id SERIAL PRIMARY KEY,
  to_player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  aura_id TEXT NOT NULL,
  aura_name TEXT NOT NULL,
  aura_tier TEXT DEFAULT '',
  from_username TEXT NOT NULL,
  trade_id INTEGER REFERENCES trades(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
