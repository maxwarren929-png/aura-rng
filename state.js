// state.js — Game state, save/load, progression, quests
import { ALL_AURAS, AURA_BY_ID, tierRank } from './auras.js';

export const ALL_QUESTS = [
  { id:'roll10',   name:'Beginner Roller',  description:'Roll 10 times',          goal:10,   rewardCoins:50,   rewardXp:50   },
  { id:'roll100',  name:'Dedicated Roller', description:'Roll 100 times',         goal:100,  rewardCoins:300,  rewardXp:200  },
  { id:'roll1000', name:'Obsessed Roller',  description:'Roll 1,000 times',       goal:1000, rewardCoins:2000, rewardXp:1000 },
  { id:'uncommon', name:'Uncommon Luck',    description:'Get 5 Uncommon+ auras',  goal:5,    rewardCoins:100,  rewardXp:80   },
  { id:'rare',     name:'Rare Find',        description:'Get 3 Rare+ auras',      goal:3,    rewardCoins:500,  rewardXp:250  },
  { id:'epic',     name:'Epic Achievement', description:'Get 1 Epic+ aura',       goal:1,    rewardCoins:2000, rewardXp:1000 },
  { id:'collect5', name:'Collector I',      description:'Own 5 unique auras',     goal:5,    rewardCoins:150,  rewardXp:100  },
  { id:'collect10',name:'Collector II',     description:'Own 10 unique auras',    goal:10,   rewardCoins:800,  rewardXp:400  },
  { id:'sell10',   name:'Merchant',         description:'Sell 10 duplicate auras',goal:10,   rewardCoins:200,  rewardXp:150  },
  { id:'combo3',   name:'Combo Roller',     description:'Use x3 combo roll once', goal:1,    rewardCoins:300,  rewardXp:200  },
  { id:'battle1',  name:'First Blood',      description:'Win your first NormArena battle', goal:1, rewardCoins:500, rewardXp:300 },
  { id:'battle10', name:'Arena Champion',   description:'Win 10 NormArena battles',         goal:10,rewardCoins:3000,rewardXp:1500},
  { id:'enchant1', name:'Enchanter',        description:'Apply any enchantment',  goal:1,    rewardCoins:1000, rewardXp:500  },
];

export function xpForLevel(level) { return Math.floor(100 * Math.pow(level, 1.4)); }

export class GameState {
  constructor() {
    this.rolls          = 0;
    this.coins          = 500;
    this.xp             = 0;
    this.level          = 1;
    this.luckLevel      = 0;
    this.speedLevel     = 0;
    this.autoRoll       = false;
    this.autoUnlocked   = false;
    this.multiRoll      = 1;
    this.potionActive   = false;
    this.potionRollsLeft= 0;
    this.potionMult     = 3.0;
    this.inventory      = {};  // id -> count
    this.equippedId     = null;
    this.auraEnchantments = {};
    this.coinBoostLevel = 0;
    this.xpBoostLevel   = 0;
    this.critLevel      = 0;
    this.quests         = ALL_QUESTS.map(q => ({ ...q, progress: 0, completed: false }));
    this.totalCoinsEarned = 0;
    this.totalSold      = 0;
    this.totalBattleWins= 0;
    this.bestAuraId     = null;
    this.notifications  = [];
    this.pityRare       = 0;
    this.pityEpic       = 0;
    this.pityLegendary  = 0;
    this.pityMythic     = 0;
    this.PITY_RARE_MAX      = 50;
    this.PITY_EPIC_MAX      = 200;
    this.PITY_LEGENDARY_MAX = 500;
    this.PITY_MYTHIC_MAX    = 1000;
    this.battleTeam     = [];  // up to 3 aura IDs for NormArena
  }

  get auraLuckBonus() {
    const aura = this.equipped;
    if (!aura) return 1.0;
    const rank = tierRank(aura.tier);
    return 1.0 + rank * 0.05;
  }

  get luckMult()  { return (1.0 + this.luckLevel * 0.4) * (this.potionActive ? this.potionMult : 1.0) * this.auraLuckBonus; }
  get coinMult()  { return 1.0 + this.coinBoostLevel * 0.25; }
  get xpMult()    { return 1.0 + this.xpBoostLevel  * 0.25; }
  get critChance(){ return this.critLevel * 0.08; }
  get rollInterval(){ return [2.5,1.8,1.2,0.7,0.4,0.25,0.12][this.speedLevel]; }
  get xpToNext()  { return xpForLevel(this.level + 1); }
  get charScale() { return this.activeEnchantment === 'fatass' ? 2.0 : 1.0; }

  get activeEnchantment() {
    if (!this.equippedId) return null;
    return this.auraEnchantments[this.equippedId] || null;
  }
  set activeEnchantment(v) {
    if (!this.equippedId) return;
    if (v === null || v === undefined) delete this.auraEnchantments[this.equippedId];
    else this.auraEnchantments[this.equippedId] = v;
  }

  get equipped() {
    if (!this.equippedId) return null;
    return AURA_BY_ID[this.equippedId] || null;
  }

  getAura(id) { return AURA_BY_ID[id] || null; }
  has(id)     { return (this.inventory[id] || 0) > 0; }
  countOf(id) { return this.inventory[id] || 0; }

  collection() {
    const result = [];
    for (const [k, cnt] of Object.entries(this.inventory)) {
      if (cnt > 0) { const a = AURA_BY_ID[k]; if (a) result.push(a); }
    }
    return result.sort((a, b) => a.rarity - b.rarity);
  }

  // ── Pity ──────────────────────────────────────────────────────────────────
  _pityTick() {
    this.pityRare++; this.pityEpic++; this.pityLegendary++; this.pityMythic++;
    if (this.pityMythic >= this.PITY_MYTHIC_MAX) {
      this.pityMythic = this.pityLegendary = this.pityEpic = this.pityRare = 0;
      this.pushNotification('⚡ PITY: Mythic guaranteed!', [255,60,60]); return 'Mythic';
    }
    if (this.pityLegendary >= this.PITY_LEGENDARY_MAX) {
      this.pityLegendary = this.pityEpic = this.pityRare = 0;
      this.pushNotification('🌟 PITY: Legendary guaranteed!', [255,165,0]); return 'Legendary';
    }
    if (this.pityEpic >= this.PITY_EPIC_MAX) {
      this.pityEpic = this.pityRare = 0;
      this.pushNotification('💫 PITY: Epic guaranteed!', [180,80,255]); return 'Epic';
    }
    if (this.pityRare >= this.PITY_RARE_MAX) {
      this.pityRare = 0;
      this.pushNotification('✨ PITY: Rare guaranteed!', [80,140,255]); return 'Rare';
    }
    return null;
  }

  _pityResetOnRoll(aura) {
    const rank = tierRank(aura.tier);
    if (rank >= tierRank('Mythic'))    this.pityMythic = this.pityLegendary = this.pityEpic = this.pityRare = 0;
    else if (rank >= tierRank('Legendary')) this.pityLegendary = this.pityEpic = this.pityRare = 0;
    else if (rank >= tierRank('Epic'))      this.pityEpic = this.pityRare = 0;
    else if (rank >= tierRank('Rare'))      this.pityRare = 0;
  }

  // ── Rolling ───────────────────────────────────────────────────────────────
  pickAura() {
    const mult = this.luckMult;
    const forcedTier = this._pityTick();
    if (forcedTier) {
      const minRank = tierRank(forcedTier);
      const pool = ALL_AURAS.filter(a => tierRank(a.tier) >= minRank);
      if (pool.length) {
        const result = pool[Math.floor(Math.random() * pool.length)];
        this._pityResetOnRoll(result);
        return result;
      }
    }
    const weights = ALL_AURAS.map(a => (1.0 / a.rarity) * mult);
    const total   = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < ALL_AURAS.length; i++) {
      r -= weights[i];
      if (r <= 0) { this._pityResetOnRoll(ALL_AURAS[i]); return ALL_AURAS[i]; }
    }
    this._pityResetOnRoll(ALL_AURAS[0]);
    return ALL_AURAS[0];
  }

  applyRollResult(aura) {
    this.rolls++;
    const firstTime = !this.has(aura.id);
    this.inventory[aura.id] = (this.inventory[aura.id] || 0) + 1;
    const baseCoins = aura.sellValue;
    const isCrit    = Math.random() < this.critChance;
    const critMult  = isCrit ? 2 : 1;
    const earned    = Math.floor((firstTime ? baseCoins * 5 : baseCoins * 2) * this.coinMult) * critMult;
    this.coins += earned;
    this.totalCoinsEarned += earned;
    const xpGain = Math.floor(aura.xpReward * (firstTime ? 2 : 1) * this.xpMult) * critMult;
    this._addXp(xpGain);
    if (isCrit) this.pushNotification('💥 Critical Roll! ×2 coins & xp!', [255,220,50]);
    if (!this.equippedId) this.equippedId = aura.id;
    else { const cur = this.getAura(this.equippedId); if (cur && aura.rarity > cur.rarity) this.equippedId = aura.id; }
    if (!this.bestAuraId) this.bestAuraId = aura.id;
    else { const best = this.getAura(this.bestAuraId); if (best && aura.rarity > best.rarity) this.bestAuraId = aura.id; }
    if (this.potionActive) { this.potionRollsLeft--; if (this.potionRollsLeft <= 0) this.potionActive = false; }
    this._tickQuests(aura, firstTime);
    return { aura, firstTime, coins: earned, xp: xpGain, isCrit };
  }

  _addXp(amount) {
    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.pushNotification(`🎉 Level Up! Now level ${this.level}!`, [255,230,80]);
    }
  }

  _addCoins(amount) { this.coins += amount; this.totalCoinsEarned += amount; }

  // ── Quests ────────────────────────────────────────────────────────────────
  _tickQuests(aura, firstTime) {
    for (const q of this.quests) {
      if (q.completed) continue;
      if (['roll10','roll100','roll1000'].includes(q.id) && this.rolls >= q.goal) { this._completeQuest(q); continue; }
      if (q.id === 'uncommon' && firstTime && tierRank(aura.tier) >= 1) { q.progress++; if (q.progress >= q.goal) this._completeQuest(q); }
      if (q.id === 'rare'     && firstTime && tierRank(aura.tier) >= 2) { q.progress++; if (q.progress >= q.goal) this._completeQuest(q); }
      if (q.id === 'epic'     && firstTime && tierRank(aura.tier) >= 3) { q.progress++; if (q.progress >= q.goal) this._completeQuest(q); }
      if (['collect5','collect10'].includes(q.id) && this.collection().length >= q.goal) this._completeQuest(q);
    }
  }

  _completeQuest(q) {
    if (q.completed) return;
    q.completed = true;
    this.coins += q.rewardCoins;
    this._addXp(q.rewardXp);
    this.pushNotification(`✅ Quest done: ${q.name}  +${q.rewardCoins}🪙`, [80,255,120]);
  }

  tickEnchantQuest() {
    for (const q of this.quests) {
      if (q.id === 'enchant1' && !q.completed) { q.progress = 1; this._completeQuest(q); }
    }
  }

  tickComboQuest() {
    for (const q of this.quests) {
      if (q.id === 'combo3' && !q.completed) { q.progress = 1; this._completeQuest(q); }
    }
  }

  tickBattleWin() {
    this.totalBattleWins++;
    for (const q of this.quests) {
      if (q.completed) continue;
      if (q.id === 'battle1'  && this.totalBattleWins >= 1)  this._completeQuest(q);
      if (q.id === 'battle10' && this.totalBattleWins >= 10) this._completeQuest(q);
    }
  }

  sellAura(id) {
    const aura = this.getAura(id);
    if (!aura || (this.inventory[id] || 0) <= 0) return false;
    this.inventory[id]--;
    this.coins += aura.sellValue;
    this.totalCoinsEarned += aura.sellValue;
    this.totalSold++;
    if (id === this.equippedId && this.countOf(id) === 0) this.equippedId = null;
    for (const q of this.quests) {
      if (q.id === 'sell10' && !q.completed) { q.progress++; if (q.progress >= q.goal) this._completeQuest(q); }
    }
    return true;
  }

  sellAllButOne(id) {
    const aura = this.getAura(id);
    if (!aura) return 0;
    const total = this.countOf(id);
    if (total <= 1) return 0;
    const sellCount = total - 1;
    this.inventory[id] -= sellCount;
    const coinsEarned = aura.sellValue * sellCount;
    this.coins += coinsEarned;
    this.totalCoinsEarned += coinsEarned;
    this.totalSold += sellCount;
    for (const q of this.quests) {
      if (q.id === 'sell10' && !q.completed) {
        q.progress += sellCount;
        if (q.progress >= q.goal) this._completeQuest(q);
      }
    }
    return sellCount;
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  pushNotification(msg, color=[255,255,255]) {
    this.notifications.push({ msg, color, timer: 3.5 });
  }

  // ── Save / Load ───────────────────────────────────────────────────────────
  toDict() {
    return {
      rolls:this.rolls, coins:this.coins, xp:this.xp, level:this.level,
      luckLevel:this.luckLevel, speedLevel:this.speedLevel,
      autoRoll:this.autoRoll, autoUnlocked:this.autoUnlocked, multiRoll:this.multiRoll,
      potionActive:this.potionActive, potionRollsLeft:this.potionRollsLeft, potionMult:this.potionMult,
      inventory:this.inventory,
      equippedId:this.equippedId, auraEnchantments:this.auraEnchantments,
      coinBoostLevel:this.coinBoostLevel, xpBoostLevel:this.xpBoostLevel, critLevel:this.critLevel,
      totalCoinsEarned:this.totalCoinsEarned, totalSold:this.totalSold, totalBattleWins:this.totalBattleWins,
      bestAuraId:this.bestAuraId,
      pityRare:this.pityRare, pityEpic:this.pityEpic, pityLegendary:this.pityLegendary, pityMythic:this.pityMythic,
      battleTeam:this.battleTeam,
      quests: this.quests.map(q => ({ id:q.id, progress:q.progress, completed:q.completed })),
    };
  }

  fromDict(d) {
    const keys = ['rolls','coins','xp','level','luckLevel','speedLevel','autoRoll','autoUnlocked',
      'multiRoll','potionActive','potionRollsLeft','potionMult','inventory',
      'equippedId','coinBoostLevel','xpBoostLevel','critLevel',
      'totalCoinsEarned','totalSold','totalBattleWins','bestAuraId',
      'pityRare','pityEpic','pityLegendary','pityMythic','battleTeam'];
    for (const k of keys) if (d[k] !== undefined) this[k] = d[k];
    if (d.auraEnchantments) {
      this.auraEnchantments = d.auraEnchantments;
    } else if (d.activeEnchantment && this.equippedId) {
      this.auraEnchantments[this.equippedId] = d.activeEnchantment;
    }
    const qmap = {};
    for (const q of this.quests) qmap[q.id] = q;
    for (const qd of (d.quests || [])) {
      if (qmap[qd.id]) { qmap[qd.id].progress = qd.progress || 0; qmap[qd.id].completed = qd.completed || false; }
    }
  }

  save() {
    try { localStorage.setItem('auraroller_save', JSON.stringify(this.toDict())); } catch(e) {}
  }

  load() {
    try {
      const raw = localStorage.getItem('auraroller_save');
      if (raw) this.fromDict(JSON.parse(raw));
    } catch(e) {}
  }
}
