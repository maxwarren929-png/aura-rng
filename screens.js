// screens.js — All HTML-based screen renderers (shop, collection, merge, enchant, quests, stats)
import { TIER_COLORS, TIER_ORDER, tierRank, rarityStr, cssColor, ALL_AURAS, AURA_BY_ID } from './auras.js';
import { ALL_ENCHANTMENTS, ENCHANTMENT_BY_ID } from './enchantments.js';

function tc(tier) { return cssColor(TIER_COLORS[tier] || [200,200,200]); }

// ── SHOP ──────────────────────────────────────────────────────────────────────
const SHOP_ITEMS = [
  // ── Upgrades ──
  { id:'luck',      name:'🍀 Luck Boost',       desc:'Multiplies chance of rarer auras. Stacks with equipped aura bonus.',
    costs:[50,150,400,1000,2500,6000,15000,40000,100000,250000,600000,1500000,4000000,10000000,25000000,60000000,150000000,400000000,1000000000,2500000000],
    maxLevel:20, key:'luckLevel', cat:'Upgrades' },
  { id:'speed',     name:'⚡ Roll Speed',        desc:'Reduces the auto-roll interval.',
    costs:[80,300,900,2500,8000,30000],
    maxLevel:6, key:'speedLevel', cat:'Upgrades' },
  { id:'coinboost', name:'🪙 Coin Boost',        desc:'Earn more coins from every roll.',
    costs:[500,2000,8000,30000,100000],
    maxLevel:5, key:'coinBoostLevel', cat:'Upgrades' },
  { id:'xpboost',   name:'✨ XP Boost',          desc:'Earn more XP from every roll.',
    costs:[400,1500,6000,25000,80000],
    maxLevel:5, key:'xpBoostLevel', cat:'Upgrades' },
  { id:'crit',      name:'💥 Critical Roll',     desc:'Chance to double coins & xp on any roll.',
    costs:[1000,4000,15000,60000,200000],
    maxLevel:5, key:'critLevel', cat:'Upgrades' },
  { id:'auto',      name:'🤖 Auto-Roll',         desc:'Rolls automatically on a timer.',
    costs:[200], maxLevel:1, key:null, cat:'Upgrades' },
  { id:'multi3',    name:'🎲×3 Multi Roll',      desc:'Roll 3 auras at once.',  costs:[500],    maxLevel:1, key:null, cat:'Upgrades' },
  { id:'multi5',    name:'🎲×5 Multi Roll',      desc:'Roll 5 auras at once.',  costs:[2000],   maxLevel:1, key:null, cat:'Upgrades' },
  { id:'multi10',   name:'🎲×10 Multi Roll',     desc:'Roll 10 auras at once.', costs:[8000],   maxLevel:1, key:null, cat:'Upgrades' },
  { id:'multi20',   name:'🎲×20 Multi Roll',     desc:'Roll 20 auras at once.', costs:[25000],  maxLevel:1, key:null, cat:'Upgrades' },
  { id:'multi50',   name:'🎲×50 Multi Roll',     desc:'Roll 50 auras at once.', costs:[100000], maxLevel:1, key:null, cat:'Upgrades' },
  // ── Consumables ──
  { id:'potion_sm', name:'🧪 Luck Potion',       desc:'×3 chance for 5 rolls.',              costs:[30],   maxLevel:null, key:null, cat:'Consumables' },
  { id:'potion_lg', name:'⚗️ Grand Potion',      desc:'×5 chance for 20 rolls.',             costs:[200],  maxLevel:null, key:null, cat:'Consumables' },
  { id:'potion_my', name:'🔮 Mystic Potion',     desc:'×8 chance for 15 rolls.',             costs:[800],  maxLevel:null, key:null, cat:'Consumables' },
  { id:'potion_om', name:'💜 Omega Potion',      desc:'×15 chance for 40 rolls.',            costs:[4000], maxLevel:null, key:null, cat:'Consumables' },
];

export function renderShop(container, gs, onBuy) {
  let lastCat = null;
  let html = '';
  for (const item of SHOP_ITEMS) {
    if (item.cat !== lastCat) {
      html += `<div style="font-size:11px;font-weight:700;color:#6070a0;letter-spacing:1px;margin:14px 0 6px">${item.cat.toUpperCase()}</div>`;
      lastCat = item.cat;
    }
    const { canBuy, cost, costStr, effectStr, btnLabel, maxed } = shopItemState(item, gs);
    const affordable = gs.coins >= (cost||0) && !maxed;
    html += `
    <div class="shop-row ${affordable?'affordable':''}">
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px;color:${canBuy?'#e8eeff':'#6070a0'}">${item.name}</div>
        <div style="font-size:12px;color:#6070a0;margin-top:2px">${item.desc}</div>
        <div style="font-size:11px;color:#00e5ff;margin-top:3px">${effectStr}</div>
      </div>
      ${item.maxLevel && item.key ? levelPips(Math.min(gs[item.key]||0, item.maxLevel), item.maxLevel) : ''}
      <div style="text-align:right;min-width:90px">
        <div style="font-size:14px;font-weight:700;color:${maxed?'#6070a0':(affordable?'#44ff88':'#ff5555')}">${costStr}</div>
        <button onclick="window._shopBuy('${item.id}')"
          style="margin-top:4px;padding:5px 12px;border-radius:6px;border:1px solid ${canBuy?'#2a5a2a':'#2a2a5a'};
          background:${canBuy?'#0a3018':'#1a1a42'};color:${canBuy?'#44ff88':'#6070a0'};
          cursor:${canBuy?'pointer':'not-allowed'};font-size:12px;font-weight:700">
          ${btnLabel}
        </button>
      </div>
    </div>`;
  }
  container.innerHTML = html;
  window._shopBuy = id => { purchase(id, gs); onBuy(); };
}

function levelPips(cur, max) {
  let html = '<div style="display:flex;gap:3px;align-items:center;margin-right:10px">';
  for (let i = 0; i < max; i++) html += `<div style="width:10px;height:10px;border-radius:2px;background:${i<cur?'#ffd700':'#1a1a3a'};border:1px solid #2a2a5a"></div>`;
  return html + '</div>';
}

function shopItemState(item, gs) {
  const { id, costs, maxLevel, key } = item;
  let canBuy = true, cost = costs[0], costStr = `🪙 ${costs[0].toLocaleString()}`, effectStr = '', btnLabel = 'BUY', maxed = false;

  if (id === 'luck') {
    const lvl = gs.luckLevel;
    maxed = lvl >= maxLevel;
    cost = maxed ? null : costs[lvl];
    costStr = maxed ? 'MAX' : `🪙 ${cost.toLocaleString()}`;
    const auraBonus = gs.auraLuckBonus > 1 ? `  +Aura ×${gs.auraLuckBonus.toFixed(2)}` : '';
    effectStr = `Total: ×${gs.luckMult.toFixed(2)}  (Lv${lvl}/${maxLevel})${auraBonus}`;
    canBuy = !maxed && gs.coins >= cost;
  } else if (id === 'speed') {
    const lvl = gs.speedLevel;
    maxed = lvl >= maxLevel;
    cost = maxed ? null : costs[lvl];
    costStr = maxed ? 'MAX' : `🪙 ${cost.toLocaleString()}`;
    effectStr = `Interval: ${gs.rollInterval.toFixed(2)}s  (Lv${lvl}/${maxLevel})`;
    canBuy = !maxed && gs.coins >= cost;
  } else if (id === 'coinboost') {
    const lvl = gs.coinBoostLevel;
    maxed = lvl >= maxLevel;
    cost = maxed ? null : costs[lvl];
    costStr = maxed ? 'MAX' : `🪙 ${cost.toLocaleString()}`;
    effectStr = `Coins ×${gs.coinMult.toFixed(2)}  (Lv${lvl}/${maxLevel})`;
    canBuy = !maxed && gs.coins >= cost;
  } else if (id === 'xpboost') {
    const lvl = gs.xpBoostLevel;
    maxed = lvl >= maxLevel;
    cost = maxed ? null : costs[lvl];
    costStr = maxed ? 'MAX' : `🪙 ${cost.toLocaleString()}`;
    effectStr = `XP ×${gs.xpMult.toFixed(2)}  (Lv${lvl}/${maxLevel})`;
    canBuy = !maxed && gs.coins >= cost;
  } else if (id === 'crit') {
    const lvl = gs.critLevel;
    maxed = lvl >= maxLevel;
    cost = maxed ? null : costs[lvl];
    costStr = maxed ? 'MAX' : `🪙 ${cost.toLocaleString()}`;
    effectStr = `Crit chance: ${(gs.critChance*100).toFixed(0)}%  (Lv${lvl}/${maxLevel})`;
    canBuy = !maxed && gs.coins >= cost;
  } else if (id === 'auto') {
    if (gs.autoUnlocked) { cost=0; costStr='FREE'; btnLabel=gs.autoRoll?'Turn OFF':'Turn ON'; canBuy=true; }
    else { canBuy = gs.coins >= costs[0]; }
    effectStr = gs.autoUnlocked ? (gs.autoRoll ? '🟢 Active' : '🔴 Inactive') : 'Locked';
  } else if (id === 'multi3') {
    maxed = gs.multiRoll >= 3; costStr = maxed ? 'OWNED' : `🪙 ${costs[0].toLocaleString()}`; canBuy = !maxed && gs.coins >= costs[0];
    effectStr = maxed ? 'Unlocked' : 'Locked';
  } else if (id === 'multi5') {
    maxed = gs.multiRoll >= 5; costStr = maxed ? 'OWNED' : `🪙 ${costs[0].toLocaleString()}`; canBuy = !maxed && gs.coins >= costs[0];
    effectStr = maxed ? 'Unlocked' : 'Locked';
  } else if (id === 'multi10') {
    maxed = gs.multiRoll >= 10; costStr = maxed ? 'OWNED' : `🪙 ${costs[0].toLocaleString()}`; canBuy = !maxed && gs.coins >= costs[0];
    effectStr = maxed ? 'Unlocked' : 'Locked';
  } else if (id === 'multi20') {
    maxed = gs.multiRoll >= 20; costStr = maxed ? 'OWNED' : `🪙 ${costs[0].toLocaleString()}`; canBuy = !maxed && gs.coins >= costs[0];
    effectStr = maxed ? 'Unlocked' : 'Locked';
  } else if (id === 'multi50') {
    maxed = gs.multiRoll >= 50; costStr = maxed ? 'OWNED' : `🪙 ${costs[0].toLocaleString()}`; canBuy = !maxed && gs.coins >= costs[0];
    effectStr = maxed ? 'Unlocked' : 'Locked';
  } else if (id === 'potion_sm') {
    effectStr = `${gs.potionRollsLeft} rolls remaining`; canBuy = gs.coins >= costs[0];
  } else if (id === 'potion_lg') {
    effectStr = `${gs.potionRollsLeft} rolls remaining`; canBuy = gs.coins >= costs[0];
  } else if (id === 'potion_my') {
    effectStr = `${gs.potionRollsLeft} rolls remaining`; canBuy = gs.coins >= costs[0];
  } else if (id === 'potion_om') {
    effectStr = `${gs.potionRollsLeft} rolls remaining`; canBuy = gs.coins >= costs[0];
  }
  return { canBuy, cost, costStr, effectStr, btnLabel, maxed };
}

function purchase(id, gs) {
  const item = SHOP_ITEMS.find(i => i.id === id);
  if (!item) return;
  const costs = item.costs;
  if (id === 'luck') {
    if (gs.luckLevel >= item.maxLevel || gs.coins < costs[gs.luckLevel]) return;
    gs.coins -= costs[gs.luckLevel]; gs.luckLevel++;
    gs.pushNotification(`🍀 Luck Lv${gs.luckLevel}! Total ×${gs.luckMult.toFixed(2)}`, [80,255,80]);
  } else if (id === 'speed') {
    if (gs.speedLevel >= item.maxLevel || gs.coins < costs[gs.speedLevel]) return;
    gs.coins -= costs[gs.speedLevel]; gs.speedLevel++;
    gs.pushNotification(`⚡ Speed Lv${gs.speedLevel}! Interval ${gs.rollInterval.toFixed(2)}s`, [0,220,255]);
  } else if (id === 'coinboost') {
    if (gs.coinBoostLevel >= item.maxLevel || gs.coins < costs[gs.coinBoostLevel]) return;
    gs.coins -= costs[gs.coinBoostLevel]; gs.coinBoostLevel++;
    gs.pushNotification(`🪙 Coin Boost Lv${gs.coinBoostLevel}! ×${gs.coinMult.toFixed(2)} coins`, [255,215,0]);
  } else if (id === 'xpboost') {
    if (gs.xpBoostLevel >= item.maxLevel || gs.coins < costs[gs.xpBoostLevel]) return;
    gs.coins -= costs[gs.xpBoostLevel]; gs.xpBoostLevel++;
    gs.pushNotification(`✨ XP Boost Lv${gs.xpBoostLevel}! ×${gs.xpMult.toFixed(2)} XP`, [0,229,255]);
  } else if (id === 'crit') {
    if (gs.critLevel >= item.maxLevel || gs.coins < costs[gs.critLevel]) return;
    gs.coins -= costs[gs.critLevel]; gs.critLevel++;
    gs.pushNotification(`💥 Crit Lv${gs.critLevel}! ${(gs.critChance*100).toFixed(0)}% crit chance`, [255,220,50]);
  } else if (id === 'auto') {
    if (!gs.autoUnlocked) {
      if (gs.coins < costs[0]) return;
      gs.coins -= costs[0]; gs.autoUnlocked = true; gs.autoRoll = true;
      gs.pushNotification('Auto-roll unlocked!', [0,220,255]);
    } else { gs.autoRoll = !gs.autoRoll; gs.pushNotification(`Auto-roll ${gs.autoRoll?'ON':'OFF'}.`, [0,220,255]); }
  } else if (id === 'multi3') {
    if (gs.multiRoll >= 3 || gs.coins < costs[0]) return;
    gs.coins -= costs[0]; gs.multiRoll = 3; gs.pushNotification('×3 Multi-roll unlocked!', [255,215,0]);
  } else if (id === 'multi5') {
    if (gs.multiRoll >= 5 || gs.coins < costs[0]) return;
    gs.coins -= costs[0]; gs.multiRoll = 5; gs.pushNotification('×5 Multi-roll unlocked!', [255,215,0]);
  } else if (id === 'multi10') {
    if (gs.multiRoll >= 10 || gs.coins < costs[0]) return;
    gs.coins -= costs[0]; gs.multiRoll = 10; gs.pushNotification('×10 Multi-roll unlocked!', [255,215,0]);
  } else if (id === 'multi20') {
    if (gs.multiRoll >= 20 || gs.coins < costs[0]) return;
    gs.coins -= costs[0]; gs.multiRoll = 20; gs.pushNotification('×20 Multi-roll unlocked!', [255,215,0]);
  } else if (id === 'multi50') {
    if (gs.multiRoll >= 50 || gs.coins < costs[0]) return;
    gs.coins -= costs[0]; gs.multiRoll = 50; gs.pushNotification('×50 Multi-roll unlocked!', [255,215,0]);
  } else if (id === 'potion_sm') {
    if (gs.coins < costs[0]) return;
    gs.coins -= costs[0]; gs.potionActive = true; gs.potionMult = Math.max(gs.potionMult||0, 3.0);
    gs.potionRollsLeft = Math.max(gs.potionRollsLeft, 0) + 5;
    gs.pushNotification('🧪 Luck Potion! ×3 for 5 rolls', [180,80,255]);
  } else if (id === 'potion_lg') {
    if (gs.coins < costs[0]) return;
    gs.coins -= costs[0]; gs.potionActive = true; gs.potionMult = Math.max(gs.potionMult||0, 5.0);
    gs.potionRollsLeft = Math.max(gs.potionRollsLeft, 0) + 20;
    gs.pushNotification('⚗️ Grand Potion! ×5 for 20 rolls', [255,100,255]);
  } else if (id === 'potion_my') {
    if (gs.coins < costs[0]) return;
    gs.coins -= costs[0]; gs.potionActive = true; gs.potionMult = Math.max(gs.potionMult||0, 8.0);
    gs.potionRollsLeft = Math.max(gs.potionRollsLeft, 0) + 15;
    gs.pushNotification('🔮 Mystic Potion! ×8 for 15 rolls', [140,80,255]);
  } else if (id === 'potion_om') {
    if (gs.coins < costs[0]) return;
    gs.coins -= costs[0]; gs.potionActive = true; gs.potionMult = Math.max(gs.potionMult||0, 15.0);
    gs.potionRollsLeft = Math.max(gs.potionRollsLeft, 0) + 40;
    gs.pushNotification('💜 Omega Potion! ×15 for 40 rolls', [180,40,255]);
  }
}

// ── COLLECTION ────────────────────────────────────────────────────────────────
export function renderCollection(container, gs, onEquip, onSell) {
  const coll = gs.collection();
  const countEl = document.getElementById('coll-count');
  if (countEl) countEl.textContent = `${coll.length} owned`;
  if (!coll.length) { container.innerHTML = '<div style="color:#6070a0;padding:20px;text-align:center">No auras yet — go roll some!</div>'; return; }

  // Sort by rarity desc
  const sorted = [...coll].sort((a,b) => b.rarity - a.rarity);
  container.innerHTML = sorted.map(aura => {
    const color = tc(aura.tier);
    const count = gs.countOf(aura.id);
    const isEquipped = gs.equippedId === aura.id;
    return `
    <div class="aura-card" style="border-color:${isEquipped?'#ffd700':''}">
      ${isEquipped ? '<div class="equipped-badge">EQUIPPED</div>' : ''}
      <div style="display:flex;gap:4px;justify-content:center">
        ${aura.colors.slice(0,4).map(c=>`<div class="swatch" style="background:rgb(${c})"></div>`).join('')}
      </div>
      <div class="name" style="color:${color}">${aura.name}</div>
      <div style="font-size:10px;color:${color};opacity:.7">★ ${aura.tier}</div>
      <div class="rarity">${rarityStr(aura.rarity)}</div>
      ${count > 1 ? `<div style="font-size:10px;color:#00e5ff">×${count} copies</div>` : ''}
      <div style="display:flex;gap:4px;margin-top:6px">
        <button onclick="window._collEquip('${aura.id}')"
          style="flex:1;padding:3px 0;font-size:10px;font-weight:700;border-radius:5px;cursor:pointer;
          border:1px solid #ffd700;background:#2e2000;color:#ffd700">Equip</button>
        ${count > 1 || (count > 0 && !isEquipped) ? `<button onclick="window._collSell('${aura.id}')"
          style="flex:1;padding:3px 0;font-size:10px;font-weight:700;border-radius:5px;cursor:pointer;
          border:1px solid #ff5555;background:#280808;color:#ff5555">Sell<br/><span style="font-size:9px">🪙${aura.sellValue}</span></button>` : ''}
      </div>
      ${count > 1 ? `<button onclick="window._collSellAll('${aura.id}')"
        style="width:100%;margin-top:4px;padding:3px 0;font-size:9px;font-weight:700;border-radius:5px;cursor:pointer;
        border:1px solid #ff8844;background:#200808;color:#ff8844">Sell All But One (×${count-1}) 🪙${aura.sellValue*(count-1)}</button>` : ''}
    </div>`;
  }).join('');

  window._collEquip = id => { gs.equippedId = id; gs.pushNotification(`Equipped ${gs.getAura(id)?.name}!`, [255,215,0]); onEquip(); };
  window._collSell = id => {
    const a = gs.getAura(id);
    if (!a) return;
    if (gs.sellAura(id)) { gs.pushNotification(`Sold ${a.name} for 🪙${a.sellValue}`, [255,215,0]); onSell(); }
  };
  window._collSellAll = id => {
    const a = gs.getAura(id);
    if (!a) return;
    const n = gs.sellAllButOne(id);
    if (n > 0) { gs.pushNotification(`Sold ×${n} ${a.name} for 🪙${(a.sellValue*n).toLocaleString()}`, [255,215,0]); onSell(); }
  };
}

// ── MERGE ─────────────────────────────────────────────────────────────────────
export function renderMergeGrid(container, gs, onSelect) {
  const coll = gs.collection();
  if (!coll.length) { container.innerHTML = '<div style="color:#6070a0;padding:20px">No auras to merge yet.</div>'; return; }
  const sorted = [...coll].sort((a,b) => b.rarity - a.rarity);
  container.innerHTML = sorted.map(aura => {
    const color = tc(aura.tier);
    const count = gs.countOf(aura.id);
    return `<div class="aura-card" onclick="window._mergeSelect('${aura.id}')" style="cursor:pointer">
      <div style="display:flex;gap:3px">${aura.colors.slice(0,3).map(c=>`<div class="swatch" style="background:rgb(${c})"></div>`).join('')}</div>
      <div class="name" style="color:${color};font-size:11px">${aura.name}</div>
      <div style="font-size:10px;color:${color};opacity:.7">${aura.tier}</div>
      ${count > 1 ? `<div style="font-size:10px;color:#00e5ff">×${count}</div>` : ''}
    </div>`;
  }).join('');
  window._mergeSelect = onSelect;
}

// ── ENCHANT ───────────────────────────────────────────────────────────────────
export function renderEnchant(container, gs, onBuy) {
  const active = gs.activeEnchantment;
  const activeEl = document.getElementById('enc-active-display');
  if (activeEl) {
    if (active) {
      const e = ENCHANTMENT_BY_ID[active];
      activeEl.innerHTML = `<span style="color:${cssColor(e.color)}">${e.icon} ${e.name}</span>`;
    } else { activeEl.textContent = 'None'; }
  }
  container.innerHTML = ALL_ENCHANTMENTS.map(enc => {
    const isActive = active === enc.id;
    const canBuy = gs.coins >= enc.cost;
    const color = cssColor(enc.color);
    return `<div class="enc-card ${isActive?'active-enc':''}" style="border-color:${isActive?color:''}">
      <div style="font-size:36px">${enc.icon}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:15px;color:${color}">${enc.name}</div>
        <div style="font-size:12px;color:#9090b0;margin-top:4px">${enc.description}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;font-weight:700;color:${canBuy?'#44ff88':'#ff5555'}">🪙 ${enc.cost.toLocaleString()}</div>
        <button onclick="window._encBuy('${enc.id}')"
          style="margin-top:6px;padding:6px 14px;border-radius:7px;cursor:${canBuy?'pointer':'not-allowed'};
          border:1px solid ${isActive?'#ff5555':color};background:${isActive?'#280808':'#0f0f28'};
          color:${isActive?'#ff5555':color};font-weight:700;font-size:12px">
          ${isActive ? 'Remove' : 'Apply'}
        </button>
      </div>
    </div>`;
  }).join('');
  window._encBuy = id => {
    const enc = ENCHANTMENT_BY_ID[id];
    if (!enc) return;
    if (gs.activeEnchantment === id) { gs.activeEnchantment = null; gs.pushNotification('Enchantment removed.', [200,200,200]); }
    else {
      if (gs.coins < enc.cost) { gs.pushNotification('Not enough coins!', [255,80,80]); return; }
      gs.coins -= enc.cost; gs.activeEnchantment = id;
      gs.pushNotification(`${enc.icon} ${enc.name} enchantment applied!`, enc.color);
      gs.tickEnchantQuest();
    }
    onBuy();
  };
}

// ── QUESTS ────────────────────────────────────────────────────────────────────
export function renderQuests(container, gs) {
  const done = gs.quests.filter(q=>q.completed).length;
  const countEl = document.getElementById('quest-count');
  if (countEl) countEl.textContent = `${done}/${gs.quests.length} Complete`;
  container.innerHTML = gs.quests.map(q => {
    const pct = Math.min(100, Math.floor(q.progress/q.goal*100));
    return `<div class="quest-item ${q.completed?'done':''}">
      <div style="font-size:24px">${q.completed?'✅':'🔲'}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:13px;color:${q.completed?'#44ff88':'#e8eeff'}">${q.name}</div>
        <div style="font-size:11px;color:#6070a0;margin-top:2px">${q.description}</div>
        ${!q.completed && q.goal > 1 ? `
          <div class="bar-track" style="margin-top:6px">
            <div class="bar-fill" style="width:${pct}%;background:#44aa44"></div>
          </div>
          <div style="font-size:10px;color:#6070a0">${q.progress}/${q.goal}</div>` : ''}
        ${q.completed ? '<div style="font-size:10px;color:#44ff88;margin-top:4px">COMPLETE</div>' : ''}
      </div>
      <div style="text-align:right;font-size:11px;color:#ffd700;white-space:nowrap">
        +${q.rewardCoins}🪙<br/>+${q.rewardXp}xp
      </div>
    </div>`;
  }).join('');
}

// ── STATS ─────────────────────────────────────────────────────────────────────
export function renderStats(container, gs) {
  const done = gs.quests.filter(q=>q.completed).length;
  const bestAura = gs.bestAuraId ? gs.getAura(gs.bestAuraId) : null;
  const xpPct = Math.min(100, Math.floor(gs.xp/gs.xpToNext*100));

  // Tier breakdown
  const totalPerTier = {}, ownedPerTier = {};
  for (const a of ALL_AURAS) {
    totalPerTier[a.tier] = (totalPerTier[a.tier]||0) + 1;
    if (gs.has(a.id)) ownedPerTier[a.tier] = (ownedPerTier[a.tier]||0) + 1;
  }

  const tierRows = TIER_ORDER.map(tier => {
    const total = totalPerTier[tier] || 0;
    if (!total) return '';
    const owned = ownedPerTier[tier] || 0;
    const pct = Math.floor(owned/total*100);
    const color = cssColor(TIER_COLORS[tier]||[200,200,200]);
    return `<div class="stat-row">
      <span style="color:${color}">${tier}</span>
      <div style="flex:1;margin:0 10px"><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div></div>
      <span style="color:#6070a0;font-size:11px">${owned}/${total}</span>
    </div>`;
  }).join('');

  container.innerHTML = `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    <div>
      <div class="card">
        <div class="card-title">Player</div>
        <div style="font-size:20px;font-weight:900;color:#ffd700">Level ${gs.level}</div>
        <div class="bar-track" style="margin:6px 0"><div class="bar-fill" style="width:${xpPct}%;background:#4488ff"></div></div>
        <div style="font-size:11px;color:#6070a0">XP ${gs.xp.toLocaleString()} / ${gs.xpToNext.toLocaleString()}</div>
        ${[
          ['Total Rolls', gs.rolls.toLocaleString()],
          ['Coins Earned', `${gs.totalCoinsEarned.toLocaleString()} 🪙`],
          ['Auras Sold', gs.totalSold.toLocaleString()],
          ['Luck Level', `Lv${gs.luckLevel} (×${gs.luckMult.toFixed(2)})`],
          ['Aura Luck Bonus', `×${gs.auraLuckBonus.toFixed(2)}`],
          ['Roll Speed', `Lv${gs.speedLevel} (${gs.rollInterval.toFixed(2)}s)`],
          ['Coin Boost', `Lv${gs.coinBoostLevel} (×${gs.coinMult.toFixed(2)})`],
          ['XP Boost', `Lv${gs.xpBoostLevel} (×${gs.xpMult.toFixed(2)})`],
          ['Crit Chance', `Lv${gs.critLevel} (${(gs.critChance*100).toFixed(0)}%)`],
          ['Multi-Roll', `×${gs.multiRoll}`],
          ['Auto-Roll', gs.autoRoll ? '🟢 ON' : '🔴 OFF'],
          ['Total Merges', gs.totalMerges.toLocaleString()],
        ].map(([k,v])=>`<div class="stat-row"><span style="color:#6070a0">${k}</span><span style="font-weight:700">${v}</span></div>`).join('')}
      </div>
      ${bestAura ? `<div class="card">
        <div class="card-title">Best Roll Ever</div>
        <div style="font-weight:700;font-size:15px;color:${tc(bestAura.tier)}">${bestAura.name}</div>
        <div style="font-size:11px;color:#6070a0">${rarityStr(bestAura.rarity)}</div>
        <div style="display:flex;gap:4px;margin-top:6px">${bestAura.colors.slice(0,5).map(c=>`<div class="swatch" style="background:rgb(${c})"></div>`).join('')}</div>
      </div>` : ''}
    </div>
    <div>
      <div class="card">
        <div class="card-title">Collection by Tier</div>
        ${tierRows}
      </div>
      <div class="card" style="text-align:center">
        <div class="card-title">Quest Progress</div>
        <div style="font-size:32px;font-weight:900;color:#ffd700">${done}/${gs.quests.length}</div>
        <div style="font-size:12px;color:#6070a0">Quests completed</div>
        <div class="bar-track" style="margin:8px 0"><div class="bar-fill" style="width:${Math.floor(done/gs.quests.length*100)}%;background:#ffd700"></div></div>
      </div>
    </div>
  </div>`;
}

// ── CHAT ──────────────────────────────────────────────────────────────────────
export function renderChatMessages(messages, myUsername) {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  el.innerHTML = messages.map(m => {
    const isOwn = m.username === myUsername;
    const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `<div class="chat-msg${isOwn?' own':''}">
      <span class="chat-user">${escHtml(m.username)}</span>
      <span class="chat-text">${escHtml(m.message)}</span>
      <span class="chat-time">${time}</span>
    </div>`;
  }).join('');
  if (atBottom || messages.length === 0) el.scrollTop = el.scrollHeight;
}

// ── TRADE ─────────────────────────────────────────────────────────────────────
export function renderTrade(pending, mine, market, myUsername, onClaim, onComplete, onCancel, onCollect) {
  // Pending incoming
  const pendingSection = document.getElementById('trade-pending-section');
  const pendingList = document.getElementById('trade-pending-list');
  if (pending.length) {
    pendingSection.style.display = '';
    pendingList.innerHTML = pending.map(p => `
      <div class="trade-card pending-in">
        <div class="trade-meta">
          <div class="trade-aura" style="color:${tierColor(p.aura_tier)}">${escHtml(p.aura_name)}</div>
          <div class="trade-from">from ${escHtml(p.from_username)}</div>
        </div>
        <button onclick="window._tradeCollect(${p.id})"
          style="padding:6px 12px;border-radius:7px;border:1px solid #44ff88;background:#082010;color:#44ff88;font-weight:700;font-size:12px;cursor:pointer">
          Add to Collection
        </button>
      </div>`).join('');
  } else {
    pendingSection.style.display = 'none';
  }

  // My listings
  const mineSection = document.getElementById('trade-mine-section');
  const mineList = document.getElementById('trade-mine-list');
  if (mine.length) {
    mineSection.style.display = '';
    mineList.innerHTML = mine.map(t => {
      const isClaimed = t.status === 'claimed';
      return `<div class="trade-card${isClaimed?' claimed':''}">
        <div class="trade-meta">
          <div class="trade-aura" style="color:${tierColor(t.aura_tier)}">${escHtml(t.aura_name)}</div>
          ${t.want_description ? `<div class="trade-want">Want: ${escHtml(t.want_description)}</div>` : ''}
          ${isClaimed ? `<div style="font-size:11px;color:#44ff88;margin-top:3px">Claimed by ${escHtml(t.claimed_by_username)} — confirm delivery below</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${isClaimed ? `<button onclick="window._tradeComplete(${t.id})"
            style="padding:5px 10px;border-radius:6px;border:1px solid #44ff88;background:#082010;color:#44ff88;font-weight:700;font-size:11px;cursor:pointer;white-space:nowrap">
            Confirm Sent
          </button>` : ''}
          <button onclick="window._tradeCancel(${t.id})"
            style="padding:5px 10px;border-radius:6px;border:1px solid #ff5555;background:#280808;color:#ff5555;font-weight:700;font-size:11px;cursor:pointer">
            Cancel
          </button>
        </div>
      </div>`;
    }).join('');
  } else {
    mineSection.style.display = 'none';
  }

  // Market
  const marketList = document.getElementById('trade-market-list');
  const openTrades = market.filter(t => t.from_username !== myUsername && (t.status === 'open' || t.status === 'claimed'));
  if (!openTrades.length) {
    marketList.innerHTML = '<div style="color:#6070a0;padding:20px;text-align:center">No open trades right now.</div>';
  } else {
    marketList.innerHTML = openTrades.map(t => `
      <div class="trade-card">
        <div class="trade-meta">
          <div class="trade-aura" style="color:${tierColor(t.aura_tier)}">${escHtml(t.aura_name)} <span style="font-size:10px;color:${tierColor(t.aura_tier)};opacity:.7">[${escHtml(t.aura_tier)}]</span></div>
          <div class="trade-from">by ${escHtml(t.from_username)}</div>
          ${t.want_description ? `<div class="trade-want">Wants: ${escHtml(t.want_description)}</div>` : ''}
        </div>
        ${t.status === 'open' ? `<button onclick="window._tradeClaim(${t.id})"
          style="padding:6px 12px;border-radius:7px;border:1px solid #00e5ff;background:#001a20;color:#00e5ff;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap">
          Request
        </button>` : `<span style="font-size:11px;color:#6070a0;white-space:nowrap">Pending…</span>`}
      </div>`).join('');
  }

  window._tradeCollect = onCollect;
  window._tradeComplete = onComplete;
  window._tradeCancel = onCancel;
  window._tradeClaim = onClaim;
}

function tierColor(tier) {
  const map = { Common:'#a0a0c0', Uncommon:'#50dc50', Rare:'#508cff', Epic:'#b450ff',
    Legendary:'#ffa500', Mythic:'#ff3c3c', Divine:'#ffe650', Cosmic:'#78ffff',
    Godly:'#ff50c8', Femboy:'#ff96dc', '???':'#ffffff' };
  return map[tier] || '#a0a0c0';
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}