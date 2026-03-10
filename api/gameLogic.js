// api/gameLogic.js — Server-side game logic (roll, buy, sell, quests)
'use strict';

const TIER_ORDER = ['Common','Uncommon','Rare','Epic','Legendary','Mythic','Divine','Cosmic','Godly','Femboy','???'];
function tierRank(tier) { const i = TIER_ORDER.indexOf(tier); return i === -1 ? 0 : i; }
function xpForLevel(level) { return Math.floor(100 * Math.pow(level, 1.4)); }

const ALL_AURAS = [
  // Common
  { id:'brayden',  rarity:10,        tier:'Common',    sellValue:5,     xpReward:10    },
  { id:'romit',    rarity:14,        tier:'Common',    sellValue:5,     xpReward:10    },
  { id:'john',     rarity:18,        tier:'Common',    sellValue:5,     xpReward:10    },
  { id:'anthony',  rarity:22,        tier:'Common',    sellValue:5,     xpReward:10    },
  // Uncommon
  { id:'james',    rarity:80,        tier:'Uncommon',  sellValue:25,    xpReward:30    },
  { id:'jamie',    rarity:100,       tier:'Uncommon',  sellValue:25,    xpReward:30    },
  { id:'arman',    rarity:500,       tier:'Uncommon',  sellValue:80,    xpReward:60    },
  // Rare
  { id:'luis',     rarity:600,       tier:'Rare',      sellValue:80,    xpReward:60    },
  { id:'eric',     rarity:2000,      tier:'Rare',      sellValue:80,    xpReward:60    },
  { id:'roy',      rarity:2500,      tier:'Rare',      sellValue:80,    xpReward:60    },
  { id:'isaac',    rarity:4000,      tier:'Rare',      sellValue:80,    xpReward:60    },
  // Epic
  { id:'oliver',   rarity:12000,     tier:'Epic',      sellValue:300,   xpReward:150   },
  { id:'ko',       rarity:35000,     tier:'Epic',      sellValue:300,   xpReward:150   },
  { id:'pratyush', rarity:60000,     tier:'Epic',      sellValue:300,   xpReward:150   },
  { id:'eric',     rarity:80000,     tier:'Epic',      sellValue:300,   xpReward:150   },
  // Legendary
  { id:'kim',      rarity:150000,    tier:'Legendary', sellValue:1000,  xpReward:350   },
  { id:'varun',    rarity:600000,    tier:'Legendary', sellValue:25,    xpReward:30    },
  // Mythic
  { id:'christian',rarity:130000,    tier:'Mythic',    sellValue:3000,  xpReward:800   },
  { id:'brenden',  rarity:280000,    tier:'Mythic',    sellValue:5,     xpReward:10    },
  { id:'jason',    rarity:250000,    tier:'Mythic',    sellValue:3000,  xpReward:800   },
  { id:'avi',      rarity:400000,    tier:'Mythic',    sellValue:3000,  xpReward:800   },
  { id:'swan',     rarity:900000,    tier:'Mythic',    sellValue:3000,  xpReward:800   },
  { id:'kaelan',   rarity:1200000,   tier:'Mythic',    sellValue:3000,  xpReward:800   },
  { id:'karna',    rarity:2500000,   tier:'Mythic',    sellValue:3000,  xpReward:800   },
  // Cosmic / Godly / Femboy
  { id:'juno',     rarity:50000000,  tier:'Cosmic',    sellValue:5000,  xpReward:1500  },
  { id:'joel',     rarity:100000000, tier:'Godly',     sellValue:20000, xpReward:5000  },
  { id:'warren',   rarity:200000000, tier:'Femboy',    sellValue:50000, xpReward:10000 },
];

const AURA_BY_ID = {};
for (const a of ALL_AURAS) AURA_BY_ID[a.id] = a;

const PITY = { Rare: 50, Epic: 200, Legendary: 500, Mythic: 1000 };

function calcLuckMult(state) {
  const base = 1.0 + (state.luckLevel || 0) * 0.4;
  const potion = state.potionActive ? (state.potionMult || 1) : 1.0;
  const equippedAura = AURA_BY_ID[state.equippedId];
  const auraBonus = equippedAura ? 1.0 + tierRank(equippedAura.tier) * 0.05 : 1.0;
  return base * potion * auraBonus;
}

function pityTick(state) {
  state.pityRare = (state.pityRare || 0) + 1;
  state.pityEpic = (state.pityEpic || 0) + 1;
  state.pityLegendary = (state.pityLegendary || 0) + 1;
  state.pityMythic = (state.pityMythic || 0) + 1;
  if (state.pityMythic >= PITY.Mythic) { state.pityMythic = state.pityLegendary = state.pityEpic = state.pityRare = 0; return 'Mythic'; }
  if (state.pityLegendary >= PITY.Legendary) { state.pityLegendary = state.pityEpic = state.pityRare = 0; return 'Legendary'; }
  if (state.pityEpic >= PITY.Epic) { state.pityEpic = state.pityRare = 0; return 'Epic'; }
  if (state.pityRare >= PITY.Rare) { state.pityRare = 0; return 'Rare'; }
  return null;
}

function pityReset(state, aura) {
  const rank = tierRank(aura.tier);
  if (rank >= tierRank('Mythic'))    { state.pityMythic = state.pityLegendary = state.pityEpic = state.pityRare = 0; }
  else if (rank >= tierRank('Legendary')) { state.pityLegendary = state.pityEpic = state.pityRare = 0; }
  else if (rank >= tierRank('Epic'))      { state.pityEpic = state.pityRare = 0; }
  else if (rank >= tierRank('Rare'))      { state.pityRare = 0; }
}

function pickAura(state) {
  const mult = calcLuckMult(state);
  const forcedTier = pityTick(state);
  if (forcedTier) {
    const minRank = tierRank(forcedTier);
    const pool = ALL_AURAS.filter(a => tierRank(a.tier) >= minRank);
    if (pool.length) { const r = pool[Math.floor(Math.random() * pool.length)]; pityReset(state, r); return r; }
  }
  const weights = ALL_AURAS.map(a => (1.0 / a.rarity) * mult);
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < ALL_AURAS.length; i++) {
    r -= weights[i];
    if (r <= 0) { pityReset(state, ALL_AURAS[i]); return ALL_AURAS[i]; }
  }
  pityReset(state, ALL_AURAS[0]);
  return ALL_AURAS[0];
}

function completeQuest(state, q, notifications) {
  if (q.completed) return;
  q.completed = true;
  state.coins = (state.coins || 0) + q.rewardCoins;
  addXp(state, q.rewardXp, notifications);
  notifications.push({ msg: `✅ Quest done: ${q.name}  +${q.rewardCoins}🪙`, color: [80,255,120] });
}

function addXp(state, amount, notifications) {
  state.xp = (state.xp || 0) + amount;
  while (state.xp >= xpForLevel((state.level || 1) + 1)) {
    state.xp -= xpForLevel((state.level || 1) + 1);
    state.level = (state.level || 1) + 1;
    notifications.push({ msg: `🎉 Level Up! Now level ${state.level}!`, color: [255,230,80] });
  }
}

function tickQuests(state, aura, firstTime, notifications) {
  if (!state.quests) return;
  for (const q of state.quests) {
    if (q.completed) continue;
    if (q.id === 'roll10'   && state.rolls >= 10)   { completeQuest(state, q, notifications); continue; }
    if (q.id === 'roll100'  && state.rolls >= 100)  { completeQuest(state, q, notifications); continue; }
    if (q.id === 'roll1000' && state.rolls >= 1000) { completeQuest(state, q, notifications); continue; }
    if (q.id === 'uncommon' && firstTime && tierRank(aura.tier) >= 1) { q.progress++; if (q.progress >= q.goal) completeQuest(state, q, notifications); }
    if (q.id === 'rare'     && firstTime && tierRank(aura.tier) >= 2) { q.progress++; if (q.progress >= q.goal) completeQuest(state, q, notifications); }
    if (q.id === 'epic'     && firstTime && tierRank(aura.tier) >= 3) { q.progress++; if (q.progress >= q.goal) completeQuest(state, q, notifications); }
    if ((q.id === 'collect5' || q.id === 'collect10')) {
      const owned = Object.keys(state.inventory || {}).filter(k => (state.inventory[k] || 0) > 0).length;
      if (owned >= q.goal) completeQuest(state, q, notifications);
    }
    if (q.id === 'merge1'  && (state.totalMerges || 0) >= 1)  completeQuest(state, q, notifications);
    if (q.id === 'merge10' && (state.totalMerges || 0) >= 10) completeQuest(state, q, notifications);
  }
}

function applyRoll(state, aura) {
  if (!state.inventory) state.inventory = {};
  state.rolls = (state.rolls || 0) + 1;
  const firstTime = !(state.inventory[aura.id] > 0);
  state.inventory[aura.id] = (state.inventory[aura.id] || 0) + 1;

  const coinMult = 1.0 + (state.coinBoostLevel || 0) * 0.25;
  const xpMult   = 1.0 + (state.xpBoostLevel  || 0) * 0.25;
  const critChance = (state.critLevel || 0) * 0.08;
  const isCrit = Math.random() < critChance;
  const cm = isCrit ? 2 : 1;

  const earned  = Math.floor((firstTime ? aura.sellValue * 5 : aura.sellValue * 2) * coinMult) * cm;
  const xpGain  = Math.floor(aura.xpReward * (firstTime ? 2 : 1) * xpMult) * cm;

  state.coins = (state.coins || 0) + earned;
  state.totalCoinsEarned = (state.totalCoinsEarned || 0) + earned;

  const notifications = [];
  if (isCrit) notifications.push({ msg: '💥 Critical Roll! ×2 coins & xp!', color: [255,220,50] });

  addXp(state, xpGain, notifications);

  // Auto-equip best
  if (!state.equippedId) state.equippedId = aura.id;
  else { const cur = AURA_BY_ID[state.equippedId]; if (cur && aura.rarity > cur.rarity) state.equippedId = aura.id; }
  if (!state.bestAuraId) state.bestAuraId = aura.id;
  else { const best = AURA_BY_ID[state.bestAuraId]; if (best && aura.rarity > best.rarity) state.bestAuraId = aura.id; }

  // Potion tick
  if (state.potionActive) {
    state.potionRollsLeft = (state.potionRollsLeft || 0) - 1;
    if (state.potionRollsLeft <= 0) state.potionActive = false;
  }

  tickQuests(state, aura, firstTime, notifications);
  return { auraId: aura.id, auraName: aura.name, auraTier: aura.tier, coins: earned, xp: xpGain, firstTime, isCrit, notifications };
}

// ── Shop ──────────────────────────────────────────────────────────────────────
function processBuy(state, itemId) {
  const coins = state.coins || 0;
  const leveled = (key, costs, max) => {
    const lvl = state[key] || 0;
    if (lvl >= max) return { error: 'Already maxed' };
    const cost = costs[lvl];
    if (coins < cost) return { error: 'Not enough coins' };
    state.coins -= cost;
    state[key] = lvl + 1;
    return { ok: true };
  };

  switch (itemId) {
    case 'luck':      return leveled('luckLevel', [50,150,400,1000,2500,6000,15000,40000,100000,250000,600000,1500000,4000000,10000000,25000000,60000000,150000000,400000000,1000000000,2500000000], 20);
    case 'speed':     return leveled('speedLevel', [80,300,900,2500,8000,30000], 6);
    case 'coinboost': return leveled('coinBoostLevel', [500,2000,8000,30000,100000], 5);
    case 'xpboost':   return leveled('xpBoostLevel', [400,1500,6000,25000,80000], 5);
    case 'crit':      return leveled('critLevel', [1000,4000,15000,60000,200000], 5);
    case 'auto': {
      if (!state.autoUnlocked) {
        if (coins < 200) return { error: 'Not enough coins' };
        state.coins -= 200; state.autoUnlocked = true; state.autoRoll = true;
      } else { state.autoRoll = !state.autoRoll; }
      return { ok: true };
    }
    case 'multi3':  return buyMulti(state, 3,  500);
    case 'multi5':  return buyMulti(state, 5,  2000);
    case 'multi10': return buyMulti(state, 10, 8000);
    case 'multi20': return buyMulti(state, 20, 25000);
    case 'multi50': return buyMulti(state, 50, 100000);
    case 'potion_sm': return buyPotion(state, 30,   3.0, 5);
    case 'potion_lg': return buyPotion(state, 200,  5.0, 20);
    case 'potion_my': return buyPotion(state, 800,  8.0, 15);
    case 'potion_om': return buyPotion(state, 4000, 15.0, 40);
    default: return { error: 'Unknown item' };
  }
}

function buyMulti(state, level, cost) {
  if ((state.multiRoll || 1) >= level) return { error: 'Already owned' };
  if ((state.coins || 0) < cost) return { error: 'Not enough coins' };
  state.coins -= cost; state.multiRoll = level;
  return { ok: true };
}

function buyPotion(state, cost, mult, rolls) {
  if ((state.coins || 0) < cost) return { error: 'Not enough coins' };
  state.coins -= cost;
  state.potionActive = true;
  state.potionMult = Math.max(state.potionMult || 0, mult);
  state.potionRollsLeft = (state.potionRollsLeft || 0) + rolls;
  return { ok: true };
}

// ── Sell ──────────────────────────────────────────────────────────────────────
function processSell(state, auraId, count) {
  const aura = AURA_BY_ID[auraId];
  if (!aura) return { error: 'Unknown aura' };
  const owned = (state.inventory || {})[auraId] || 0;
  const n = Math.min(Math.max(1, count || 1), owned);
  if (n <= 0) return { error: 'Not enough auras' };
  state.inventory[auraId] = owned - n;
  const earned = aura.sellValue * n;
  state.coins = (state.coins || 0) + earned;
  state.totalCoinsEarned = (state.totalCoinsEarned || 0) + earned;
  state.totalSold = (state.totalSold || 0) + n;
  if (auraId === state.equippedId && state.inventory[auraId] === 0) state.equippedId = null;
  if (state.quests) {
    for (const q of state.quests) {
      if (q.id === 'sell10' && !q.completed) { q.progress += n; if (q.progress >= q.goal) { q.completed = true; state.coins += q.rewardCoins; } }
    }
  }
  return { ok: true, earned, newCoins: state.coins };
}

const DEFAULT_QUESTS = [
  { id:'roll10',    name:'Beginner Roller',  goal:10,   rewardCoins:50,   rewardXp:50,   progress:0, completed:false },
  { id:'roll100',   name:'Dedicated Roller', goal:100,  rewardCoins:300,  rewardXp:200,  progress:0, completed:false },
  { id:'roll1000',  name:'Obsessed Roller',  goal:1000, rewardCoins:2000, rewardXp:1000, progress:0, completed:false },
  { id:'uncommon',  name:'Uncommon Luck',    goal:5,    rewardCoins:100,  rewardXp:80,   progress:0, completed:false },
  { id:'rare',      name:'Rare Find',        goal:3,    rewardCoins:500,  rewardXp:250,  progress:0, completed:false },
  { id:'epic',      name:'Epic Achievement', goal:1,    rewardCoins:2000, rewardXp:1000, progress:0, completed:false },
  { id:'collect5',  name:'Collector I',      goal:5,    rewardCoins:150,  rewardXp:100,  progress:0, completed:false },
  { id:'collect10', name:'Collector II',     goal:10,   rewardCoins:800,  rewardXp:400,  progress:0, completed:false },
  { id:'sell10',    name:'Merchant',         goal:10,   rewardCoins:200,  rewardXp:150,  progress:0, completed:false },
  { id:'combo3',    name:'Combo Roller',     goal:1,    rewardCoins:300,  rewardXp:200,  progress:0, completed:false },
  { id:'merge1',    name:'First Fusion',     goal:1,    rewardCoins:500,  rewardXp:300,  progress:0, completed:false },
  { id:'merge10',   name:'Alchemist',        goal:10,   rewardCoins:2000, rewardXp:1000, progress:0, completed:false },
  { id:'enchant1',  name:'Enchanter',        goal:1,    rewardCoins:1000, rewardXp:500,  progress:0, completed:false },
];

const DEFAULT_STATE = {
  rolls:0, coins:500, xp:0, level:1,
  luckLevel:0, speedLevel:0, coinBoostLevel:0, xpBoostLevel:0, critLevel:0,
  autoRoll:false, autoUnlocked:false, multiRoll:1,
  potionActive:false, potionRollsLeft:0, potionMult:3.0,
  inventory:{}, mergedDefs:{}, mergedInventory:{},
  equippedId:null, auraEnchantments:{},
  pityRare:0, pityEpic:0, pityLegendary:0, pityMythic:0,
  bestAuraId:null, totalCoinsEarned:0, totalSold:0, totalMerges:0,
};

module.exports = { ALL_AURAS, AURA_BY_ID, pickAura, applyRoll, processBuy, processSell, DEFAULT_STATE, DEFAULT_QUESTS, xpForLevel };
