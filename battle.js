// battle.js — NormArena Battle System
import { TIER_ORDER, AURA_BY_ID } from './auras.js';

// ── Base stats by tier ────────────────────────────────────────────────────────
export const TIER_BASE_STATS = {
  Common:    { hp: 60,  atk: 40,  def: 30,  spd: 40  },
  Uncommon:  { hp: 75,  atk: 50,  def: 40,  spd: 50  },
  Rare:      { hp: 90,  atk: 60,  def: 50,  spd: 60  },
  Epic:      { hp: 110, atk: 75,  def: 65,  spd: 70  },
  Legendary: { hp: 130, atk: 90,  def: 75,  spd: 80  },
  Mythic:    { hp: 150, atk: 105, def: 85,  spd: 90  },
  Divine:    { hp: 170, atk: 120, def: 95,  spd: 100 },
  Cosmic:    { hp: 190, atk: 135, def: 105, spd: 110 },
  Godly:     { hp: 210, atk: 150, def: 115, spd: 120 },
  Femboy:    { hp: 230, atk: 165, def: 125, spd: 130 },
  DIDDY:     { hp: 250, atk: 180, def: 135, spd: 140 },
  '???':     { hp: 270, atk: 195, def: 145, spd: 150 },
};

const NAMED_STATS = {
  roy:      { hp: 150, atk: 120, def: 90,  spd: 100 },
  joel:     { hp: 180, atk: 140, def: 100, spd: 110 },
  kim:      { hp: 120, atk: 100, def: 80,  spd: 90  },
  romit:    { hp: 200, atk: 160, def: 130, spd: 120 },
  jason:    { hp: 160, atk: 110, def: 90,  spd: 95  },
  warren:   { hp: 190, atk: 130, def: 110, spd: 140 },
  juno:     { hp: 170, atk: 120, def: 105, spd: 115 },
  pratyush: { hp: 85,  atk: 65,  def: 55,  spd: 70  },
};

export function getAuraStats(aura) {
  return NAMED_STATS[aura.id] || TIER_BASE_STATS[aura.tier] || TIER_BASE_STATS.Common;
}

// ── Move definitions ──────────────────────────────────────────────────────────
export const MOVE_DEFS = {
  // ── Roy
  you_kinda_suck:  { id:'you_kinda_suck',  name:'You Kinda Suck',       desc:'80 damage. Super effective against Ko.',                      type:'damage', damage:80, superEffective:['ko'] },
  src:             { id:'src',             name:'SRC',                   desc:'Increase own Defence by 50%.',                               type:'stat',   selfDefBoost:0.5 },
  punch_r:         { id:'punch_r',         name:'Punch',                 desc:'80 damage.',                                                 type:'damage', damage:80 },
  brawl_lock:      { id:'brawl_lock',      name:'Brawl Stars Lock-In',   desc:'Increase own Attack by 50%.',                                type:'stat',   selfAtkBoost:0.5 },

  // ── Joel
  body_is_tea:     { id:'body_is_tea',     name:'Your Body is Tea',      desc:'100 damage. Super effective against Warren.',                type:'damage', damage:100, superEffective:['warren'] },
  youre_fat:       { id:'youre_fat',       name:"You're Fat",            desc:'80 damage. Super effective against Juno, Jason, Pratyush.', type:'damage', damage:80,  superEffective:['juno','jason','pratyush'] },
  sprint:          { id:'sprint',          name:'Sprint',                desc:'Increase own Speed by 100%.',                                type:'stat',   selfSpdBoost:1.0 },
  beautiful_eyes:  { id:'beautiful_eyes',  name:'Beautiful Eyes',        desc:'60 damage. Reduces enemy Speed by 30%.',                     type:'damage', damage:60,  enemySpdDebuff:-0.3 },

  // ── Kim
  do_wanna_fight:  { id:'do_wanna_fight',  name:'Do You Wanna Fight?',   desc:'Reduce enemy Attack by 100% for one turn.',                  type:'stat',   enemyAtkNullify:true },
  punch_k:         { id:'punch_k',         name:'Punch',                 desc:'110 damage.',                                                type:'damage', damage:110 },
  taunt:           { id:'taunt',           name:'Taunt',                 desc:'Forces the enemy to attack Kim next turn.',                  type:'special', tauntSelf:true },
  street_combo:    { id:'street_combo',    name:'Street Combo',          desc:'90 damage. 30% chance to attack again.',                     type:'damage', damage:90, comboChance:0.3 },

  // ── Romit
  backshot:        { id:'backshot',        name:'Backshot',              desc:'Invincible for one turn. Next turn auto-deals 110 damage.', type:'special', goInvisible:true, pendingDmg:110 },
  touch:           { id:'touch',           name:'Touch',                 desc:'95 damage. Super effective against Warren.',                 type:'damage', damage:95, superEffective:['warren'] },
  prepare:         { id:'prepare',         name:'Prepare',               desc:'Boost own Defence and Attack by 25%.',                       type:'stat',   selfAtkBoost:0.25, selfDefBoost:0.25 },
  suck:            { id:'suck',            name:'Suck',                  desc:'Restore 40 HP.',                                            type:'heal',   heal:40 },

  // ── Jason
  flex:            { id:'flex',            name:'Flex',                  desc:'Boost all own stats by 20%.',                                type:'stat',   selfAtkBoost:0.2, selfDefBoost:0.2, selfSpdBoost:0.2 },
  swim:            { id:'swim',            name:'Swim',                  desc:'100 damage.',                                                type:'damage', damage:100 },
  protein_shake:   { id:'protein_shake',   name:'Protein Shake',         desc:'Heal 50 HP.',                                               type:'heal',   heal:50 },
  ragebaited:      { id:'ragebaited',      name:'Ragebaited',            desc:'Boost own Attack 70%, lower own Defence 20%.',               type:'stat',   selfAtkBoost:0.7, selfDefBoost:-0.2 },

  // ── Warren
  high_pitched:    { id:'high_pitched',    name:'High Pitched Voice',    desc:'90 damage.',                                                 type:'damage', damage:90 },
  all_nighter:     { id:'all_nighter',     name:'All-Nighter',           desc:'Boost own Speed by 50%.',                                    type:'stat',   selfSpdBoost:0.5 },
  sleep_dep:       { id:'sleep_dep',       name:'Sleep Deprivation',     desc:'70 damage. Enemy loses 50% Speed.',                          type:'damage', damage:70, enemySpdDebuff:-0.5 },
  too_cute:        { id:'too_cute',        name:'Too Cute to Touch',     desc:'Decrease enemy Attack by 100%.',                             type:'stat',   enemyAtkDebuff:-1.0 },

  // ── Juno
  aura_overload:   { id:'aura_overload',   name:'Aura Overload',         desc:'100 damage.',                                                type:'damage', damage:100 },
  high_five:       { id:'high_five',       name:'High Five?',            desc:"Reduce all enemy Auras' Attack by 100% for one turn.",       type:'special', enemyTeamAtkNullify:true },
  confidence:      { id:'confidence',      name:'Confidence',            desc:'Boost own Defence by 40%.',                                  type:'stat',   selfDefBoost:0.4 },
  pressure:        { id:'pressure',        name:'Pressure',              desc:"Reduce enemy's Attack by 30%.",                              type:'stat',   enemyAtkDebuff:-0.3 },

  // ── Pratyush
  eat_too_much:    { id:'eat_too_much',    name:'Eat Too Much',          desc:'95 damage.',                                                 type:'damage', damage:95 },
  eat:             { id:'eat',             name:'Eat',                   desc:'Heal 35 HP.',                                               type:'heal',   heal:35 },
  eat_way:         { id:'eat_way',         name:'Eat Way Too Much',      desc:'50% chance the enemy loses their next turn.',                type:'special', skipChance:0.5 },
  sit:             { id:'sit',             name:'Sit',                   desc:'85 damage. 20% chance to stun.',                             type:'damage', damage:85, stunChance:0.2 },

  // ── Generic
  aura_strike:     { id:'aura_strike',     name:'Aura Strike',           desc:'50 damage.',                                                 type:'damage', damage:50 },
  power_blast:     { id:'power_blast',     name:'Power Blast',           desc:'70 damage.',                                                 type:'damage', damage:70 },
  energy_burst:    { id:'energy_burst',    name:'Energy Burst',          desc:'60 damage.',                                                 type:'damage', damage:60 },
  guard:           { id:'guard',           name:'Guard',                 desc:'Increase own Defence by 25%.',                               type:'stat',   selfDefBoost:0.25 },
  focus:           { id:'focus',           name:'Focus',                 desc:'Increase own Attack by 20%.',                                type:'stat',   selfAtkBoost:0.2 },
  quick_hit:       { id:'quick_hit',       name:'Quick Hit',             desc:'45 damage.',                                                 type:'damage', damage:45 },
  heavy_strike:    { id:'heavy_strike',    name:'Heavy Strike',          desc:'80 damage.',                                                 type:'damage', damage:80 },
  rest:            { id:'rest',            name:'Rest',                  desc:'Restore 30 HP.',                                            type:'heal',   heal:30 },
};

// ── Aura-specific move sets ───────────────────────────────────────────────────
const SPECIFIC_MOVES = {
  roy:      ['you_kinda_suck', 'src',         'punch_r',      'brawl_lock'   ],
  joel:     ['body_is_tea',    'youre_fat',   'sprint',        'beautiful_eyes'],
  kim:      ['do_wanna_fight', 'punch_k',     'taunt',         'street_combo' ],
  romit:    ['backshot',       'touch',       'prepare',       'suck'         ],
  jason:    ['flex',           'swim',        'protein_shake', 'ragebaited'   ],
  warren:   ['high_pitched',   'all_nighter', 'sleep_dep',     'too_cute'     ],
  juno:     ['aura_overload',  'high_five',   'confidence',    'pressure'     ],
  pratyush: ['eat_too_much',   'eat',         'eat_way',       'sit'          ],
};

const GENERIC_POOLS = [
  ['aura_strike', 'power_blast', 'guard',  'focus'       ],
  ['aura_strike', 'energy_burst','guard',  'rest'        ],
  ['quick_hit',   'power_blast', 'focus',  'rest'        ],
  ['aura_strike', 'heavy_strike','guard',  'focus'       ],
  ['energy_burst','power_blast', 'guard',  'rest'        ],
];

export function getAuraMoves(aura) {
  if (SPECIFIC_MOVES[aura.id]) return SPECIFIC_MOVES[aura.id];
  const hash = aura.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return GENERIC_POOLS[hash % GENERIC_POOLS.length];
}

// ── Battle unit ───────────────────────────────────────────────────────────────
export function createBattleUnit(aura) {
  const s = getAuraStats(aura);
  return {
    id:          aura.id,
    name:        aura.name,
    tier:        aura.tier,
    colors:      aura.colors,
    maxHp:       s.hp,
    currentHp:   s.hp,
    baseAtk:     s.atk,
    baseDef:     s.def,
    baseSpd:     s.spd,
    atkMod:      1.0,
    defMod:      1.0,
    spdMod:      1.0,
    fainted:     false,
    status:      null,       // null | 'invincible'
    pendingDmg:  0,          // Romit's Backshot
    atkNullified:false,      // 1-turn attack nullify
    skipTurn:    false,
    taunted:     false,
    moves:       getAuraMoves(aura),
  };
}

// ── Battle engine ─────────────────────────────────────────────────────────────
export class BattleEngine {
  constructor(playerTeam, opponentTeam, playerName = 'You', opponentName = 'Opponent') {
    this.playerName   = playerName;
    this.opponentName = opponentName;
    this.player   = { units: playerTeam.map(createBattleUnit),   activeIdx: 0 };
    this.opponent = { units: opponentTeam.map(createBattleUnit), activeIdx: 0 };
    this.log      = [];
    this.phase    = 'battle';  // 'battle' | 'ended'
    this.winner   = null;
    this.needsPlayerSwitch = false;
    this.isPlayerTurn = this._playerGoesFirst();

    this._addLog(`⚔️ Battle start! ${playerName} vs ${opponentName}`);
    const first = this.isPlayerTurn ? this.playerActive : this.opponentActive;
    this._addLog(`${first.name} (SPD ${first.baseSpd}) goes first!`);

    if (!this.isPlayerTurn) {
      this._aiTurn();
      if (!this._checkBattleEnd()) this.isPlayerTurn = true;
    }
  }

  get playerActive()   { return this.player.units[this.player.activeIdx]; }
  get opponentActive() { return this.opponent.units[this.opponent.activeIdx]; }

  _playerGoesFirst() {
    const ps = this.playerActive.baseSpd   * this.playerActive.spdMod;
    const os = this.opponentActive.baseSpd * this.opponentActive.spdMod;
    return ps >= os;
  }

  _addLog(msg) { this.log.push(msg); }

  // ── Player actions ─────────────────────────────────────────────────────────
  playerUseMove(moveId) {
    if (this.phase !== 'battle') return false;
    if (this.needsPlayerSwitch)  return false;
    if (!this.isPlayerTurn)      return false;

    const unit = this.playerActive;

    // Pending backshot auto-strike
    if (unit.pendingDmg > 0) {
      this._executePendingDmg(unit, this.opponent);
      if (this._checkBattleEnd()) return true;
      this._finishPlayerTurn();
      return true;
    }

    if (unit.skipTurn) {
      unit.skipTurn = false;
      this._addLog(`${unit.name} is stunned and can't move!`);
      this._finishPlayerTurn();
      return true;
    }

    const move = MOVE_DEFS[moveId];
    if (!move) return false;

    if (unit.taunted && move.type !== 'damage') {
      this._addLog(`${unit.name} is taunted — must use a damaging move!`);
      return false;
    }

    this._applyMove(move, this.player, this.opponent);
    if (this._checkBattleEnd()) return true;
    this._finishPlayerTurn();
    return true;
  }

  playerSwitch(idx) {
    if (this.phase !== 'battle') return false;
    const unit = this.player.units[idx];
    if (!unit || unit.fainted) return false;

    if (this.needsPlayerSwitch) {
      // Forced switch after faint — no counter-attack
      this.player.activeIdx = idx;
      this.needsPlayerSwitch = false;
      this._addLog(`${this.playerName} sends out ${this.playerActive.name}!`);
      this.isPlayerTurn = this._playerGoesFirst();
      return true;
    }

    if (!this.isPlayerTurn || idx === this.player.activeIdx) return false;

    const old = this.playerActive;
    this.player.activeIdx = idx;
    old.taunted = false;
    this._addLog(`${this.playerName} switched from ${old.name} to ${this.playerActive.name}!`);
    this._finishPlayerTurn();
    return true;
  }

  _finishPlayerTurn() {
    this._clearTempEffects(this.player);
    this.isPlayerTurn = false;

    // Opponent acts
    this._aiTurn();
    if (this._checkBattleEnd()) return;
    this._clearTempEffects(this.opponent);

    // Recalculate speed for next round
    this.isPlayerTurn = this._playerGoesFirst();

    // If opponent is faster next round, they act first
    if (!this.isPlayerTurn) {
      this._aiTurn();
      if (this._checkBattleEnd()) return;
      this._clearTempEffects(this.opponent);
      this.isPlayerTurn = true;
    }
  }

  _clearTempEffects(side) {
    const u = side.units[side.activeIdx];
    u.atkNullified = false;
  }

  // ── AI ─────────────────────────────────────────────────────────────────────
  _aiTurn() {
    const unit = this.opponentActive;

    if (unit.pendingDmg > 0) {
      this._executePendingDmg(unit, this.player);
      return;
    }
    if (unit.skipTurn) {
      unit.skipTurn = false;
      this._addLog(`${unit.name} is stunned and can't move!`);
      return;
    }

    const move = this._aiPickMove(unit);
    if (move) this._applyMove(move, this.opponent, this.player);
  }

  _aiPickMove(unit) {
    const moves = unit.moves.map(id => MOVE_DEFS[id]).filter(Boolean);
    if (unit.taunted) {
      const dm = moves.filter(m => m.type === 'damage');
      return dm.length ? dm[Math.floor(Math.random() * dm.length)] : moves[0];
    }
    if (unit.currentHp < unit.maxHp * 0.3) {
      const hm = moves.filter(m => m.type === 'heal');
      if (hm.length && Math.random() < 0.7) return hm[0];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  _aiTurnInit() {
    // Called at battle start if AI goes first
    this._aiTurn();
    if (!this._checkBattleEnd()) this.isPlayerTurn = true;
  }

  // ── Move application ───────────────────────────────────────────────────────
  _applyMove(move, atkSide, defSide) {
    const attacker = atkSide.units[atkSide.activeIdx];
    const defender = defSide.units[defSide.activeIdx];

    this._addLog(`${attacker.name} used ${move.name}!`);

    // Backshot — go invisible
    if (move.goInvisible) {
      attacker.status     = 'invincible';
      attacker.pendingDmg = move.pendingDmg;
      this._addLog(`${attacker.name} vanished! (invincible this turn — strikes next turn for ${move.pendingDmg} dmg)`);
      return;
    }

    // Taunt
    if (move.tauntSelf) {
      defender.taunted = true;
      this._addLog(`${attacker.name} taunted ${defender.name}! It must attack next turn!`);
      return;
    }

    // High Five? — whole-team atk nullify
    if (move.enemyTeamAtkNullify) {
      for (const u of defSide.units) if (!u.fainted) u.atkNullified = true;
      this._addLog(`${attacker.name}'s High Five? nullified all enemy attacks for one turn!`);
      return;
    }

    // 1-turn atk nullify
    if (move.enemyAtkNullify) {
      defender.atkNullified = true;
      this._addLog(`${defender.name}'s Attack was nullified for one turn!`);
      return;
    }

    // Skip chance (Eat Way Too Much)
    if (move.skipChance !== undefined) {
      const hit = Math.random() < move.skipChance;
      if (hit) {
        defender.skipTurn = true;
        this._addLog(`${defender.name} will lose their next turn!`);
      } else {
        this._addLog(`But it failed!`);
      }
      return;
    }

    // ── Damage ──
    if (move.damage) {
      let dmg = move.damage;
      if (move.superEffective && move.superEffective.includes(defender.id)) {
        dmg = Math.floor(dmg * 1.5);
        this._addLog('Super effective!');
      }
      const effAtk = attacker.atkNullified ? 0 : attacker.atkMod;
      const effDef = Math.max(0.1, defender.defMod);
      const actual = Math.max(0, Math.floor(dmg * effAtk / effDef));

      if (defender.status === 'invincible') {
        this._addLog(`${defender.name} is invincible — attack missed!`);
      } else {
        defender.currentHp = Math.max(0, defender.currentHp - actual);
        this._addLog(`Hit for ${actual} damage! (${defender.name}: ${defender.currentHp}/${defender.maxHp} HP)`);
        if (defender.currentHp <= 0) {
          defender.fainted = true;
          this._addLog(`${defender.name} fainted!`);
          this._handleFaint(defSide);
        }
      }

      // Secondary effects on damage moves
      if (move.enemySpdDebuff && !defender.fainted) {
        defender.spdMod = Math.max(0.1, defender.spdMod + move.enemySpdDebuff);
        this._addLog(`${defender.name}'s Speed fell!`);
      }
      if (move.stunChance && !defender.fainted && Math.random() < move.stunChance) {
        defender.skipTurn = true;
        this._addLog(`${defender.name} was stunned!`);
      }

      // Combo
      if (move.comboChance && Math.random() < move.comboChance) {
        this._addLog(`${attacker.name} attacks again!`);
        this._applyMove({ ...move, comboChance: 0 }, atkSide, defSide);
      }
    }

    // ── Stat changes ──
    if (move.selfAtkBoost) {
      attacker.atkMod = Math.min(4, attacker.atkMod + move.selfAtkBoost);
      this._addLog(`${attacker.name}'s Attack ${move.selfAtkBoost > 0 ? 'rose' : 'fell'}!`);
    }
    if (move.selfDefBoost) {
      attacker.defMod = Math.min(4, Math.max(0.1, attacker.defMod + move.selfDefBoost));
      this._addLog(`${attacker.name}'s Defence ${move.selfDefBoost > 0 ? 'rose' : 'fell'}!`);
    }
    if (move.selfSpdBoost) {
      attacker.spdMod = Math.min(4, attacker.spdMod + move.selfSpdBoost);
      this._addLog(`${attacker.name}'s Speed ${move.selfSpdBoost > 0 ? 'rose' : 'fell'}!`);
    }
    if (move.enemyAtkDebuff) {
      defender.atkMod = Math.max(0, defender.atkMod + move.enemyAtkDebuff);
      this._addLog(`${defender.name}'s Attack fell!`);
    }

    // ── Heal ──
    if (move.heal) {
      const healed = Math.min(move.heal, attacker.maxHp - attacker.currentHp);
      attacker.currentHp += healed;
      this._addLog(`${attacker.name} restored ${healed} HP! (${attacker.currentHp}/${attacker.maxHp})`);
    }
  }

  _executePendingDmg(unit, defSide) {
    const dmg = unit.pendingDmg;
    unit.pendingDmg = 0;
    unit.status     = null;
    const defender  = defSide.units[defSide.activeIdx];
    this._addLog(`${unit.name} emerged from the shadows!`);
    if (defender.status === 'invincible') {
      this._addLog(`${defender.name} is invincible — attack missed!`);
    } else {
      defender.currentHp = Math.max(0, defender.currentHp - dmg);
      this._addLog(`Struck for ${dmg} damage! (${defender.name}: ${defender.currentHp}/${defender.maxHp} HP)`);
      if (defender.currentHp <= 0) {
        defender.fainted = true;
        this._addLog(`${defender.name} fainted!`);
        this._handleFaint(defSide);
      }
    }
  }

  _handleFaint(defSide) {
    const nextIdx = defSide.units.findIndex(u => !u.fainted);
    if (nextIdx < 0) return; // all fainted — battle end handled by _checkBattleEnd

    if (defSide === this.opponent) {
      defSide.activeIdx = nextIdx;
      this._addLog(`${this.opponentName} sends out ${defSide.units[nextIdx].name}!`);
    } else {
      // Player must manually choose
      this.needsPlayerSwitch = true;
    }
  }

  _checkBattleEnd() {
    const pDead = this.player.units.every(u => u.fainted);
    const oDead = this.opponent.units.every(u => u.fainted);
    if (pDead || oDead) {
      this.phase  = 'ended';
      this.winner = oDead ? 'player' : 'opponent';
      this._addLog(this.winner === 'player'
        ? `🏆 ${this.playerName} wins the battle!`
        : `💀 ${this.opponentName} wins the battle!`);
      return true;
    }
    return false;
  }

  serialize() {
    return {
      player: this.player, opponent: this.opponent,
      log: this.log, phase: this.phase, winner: this.winner,
      isPlayerTurn: this.isPlayerTurn, needsPlayerSwitch: this.needsPlayerSwitch,
      playerName: this.playerName, opponentName: this.opponentName,
    };
  }
}

// ── AI opponent team ──────────────────────────────────────────────────────────
const AI_TEAMS = [
  ['jaden',    'lucas',    'micah'    ],
  ['oliver',   'vardhan',  'adhish'   ],
  ['oscar_keris','jordan', 'ethan_fung'],
];

export function getAITeam() {
  const pool = AI_TEAMS[Math.floor(Math.random() * AI_TEAMS.length)];
  return pool.map(id => AURA_BY_ID[id]).filter(Boolean);
}
