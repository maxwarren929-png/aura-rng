// main.js — Game loop, canvas rendering, tab management
import { GameState } from './state.js';
import { TIER_COLORS, tierRank, rarityStr, cssColor, AURA_BY_ID, ALL_AURAS } from './auras.js';
import { ParticleSystem, LightningBolt, ScreenShake, drawCharacter, drawAuraFull, rgb } from './effects.js';
import { renderShop, renderCollection, renderEnchant, renderQuests, renderStats, renderChatMessages, renderTrade, renderNormArena } from './screens.js';
import { ENCHANTMENT_BY_ID } from './enchantments.js';
import { BattleEngine, getAITeam } from './battle.js';
import { API } from './api.js';

// ── Canvas setup ──────────────────────────────────────────────────────────────
const canvas = document.getElementById('gc');
const ctx    = canvas.getContext('2d');
let W, H;

function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  W = rect.width; H = rect.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = W * dpr; canvas.height = H * dpr;
  canvas.style.width  = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', () => resize());
resize();

// ── State ─────────────────────────────────────────────────────────────────────
const gs = new GameState();

const particles = new ParticleSystem();
const shake     = new ScreenShake();
let bolts = []; let boltTimer = 0;
let flashAlpha = 0; let flashColor = [255,255,255];
let autoTimer = 0; let curMulti = 1; let t = 0;

// ── Roll queue ────────────────────────────────────────────────────────────────
let rollQueue = []; let rollAnimating = false; let rollPending = false;
let rollAnim  = null;
let multiOverlay = []; let multiOverlayTimer = 0;

// ── Arena state ───────────────────────────────────────────────────────────────
const arenaState = {
  phase:            'teamSelect', // 'teamSelect'|'battle'|'needsSwitch'|'ended'|'onlineLobby'
  team:             [null, null, null],
  battle:           null,
  pendingChallenges:[],
  onlineBattleId:   null,
  pollTimer:        0,
  rewardAuras:      [],
  rewardCoins:      0,
  rewardClaimed:    false,
};

// ── Tab management ────────────────────────────────────────────────────────────
let activeTab = 'game';
const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    activeTab = tab.dataset.tab;
    tabs.forEach(t2 => t2.classList.toggle('active', t2.dataset.tab === activeTab));
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${activeTab}`));
    refreshScreen(activeTab);
  });
});

function refreshScreen(tab) {
  if (tab === 'shop') {
    renderShop(document.getElementById('shop-list'), gs, () => {});
    window._shopBuy = async (id) => {
      try { const data = await API.buy(id); gs.fromDict(data.state); flushNotifications(); updateHUD(); refreshScreen('shop'); }
      catch(e) { pushNotif(e.message, [255,80,80]); }
    };
  }
  if (tab === 'collection') {
    renderCollection(document.getElementById('coll-grid'), gs,
      () => refreshScreen('collection'),
      () => { updateHUD(); refreshScreen('collection'); }
    );
    window._collEquip = async (id) => {
      try { const data = await API.equip(id); gs.fromDict(data.state); pushNotif(`Equipped ${gs.getAura(id)?.name || id}!`, [255,215,0]); refreshScreen('collection'); }
      catch(e) { pushNotif(e.message, [255,80,80]); }
    };
    window._collSell = async (id) => {
      try { const data = await API.sell(id, 1); gs.fromDict(data.state); pushNotif(`Sold for 🪙${data.earned}`, [255,215,0]); updateHUD(); refreshScreen('collection'); }
      catch(e) { pushNotif(e.message, [255,80,80]); }
    };
    window._collSellAll = async (id) => {
      const aura = gs.getAura(id); const cnt = (gs.countOf(id) || 1) - 1;
      if (!aura || cnt <= 0) return;
      try { const data = await API.sell(id, cnt); gs.fromDict(data.state); pushNotif(`Sold ×${cnt} for 🪙${data.earned.toLocaleString()}`, [255,215,0]); updateHUD(); refreshScreen('collection'); }
      catch(e) { pushNotif(e.message, [255,80,80]); }
    };
  }
  if (tab === 'arena')   refreshArena();
  if (tab === 'enchant') renderEnchant(document.getElementById('enc-list'), gs, () => { updateHUD(); refreshScreen('enchant'); });
  if (tab === 'quests')  renderQuests(document.getElementById('quests-list'), gs);
  if (tab === 'stats')   renderStats(document.getElementById('stats-content'), gs);
  if (tab === 'chat')    loadChat();
  if (tab === 'trade')   loadTrade();
}

// ── NormArena ─────────────────────────────────────────────────────────────────
function refreshArena() {
  const root = document.getElementById('arena-root');
  renderNormArena(root, gs, arenaState, {
    pickAura(id) {
      if (arenaState.team.includes(id)) return; // already selected
      const slot = arenaState.team.indexOf(null);
      if (slot < 0) return; // team full
      arenaState.team[slot] = id;
      refreshArena();
    },
    removeSlot(i) {
      arenaState.team[i] = null;
      refreshArena();
    },
    startAI() {
      const team = arenaState.team.filter(Boolean).map(id => gs.getAura(id)).filter(Boolean);
      if (!team.length) return;
      const aiTeam = getAITeam();
      arenaState.battle = new BattleEngine(team, aiTeam, API.username || 'You', 'NormBot');
      arenaState.phase  = 'battle';
      refreshArena();
    },
    openOnline() {
      if (!API.loggedIn) { pushNotif('Log in to challenge players!', [255,80,80]); return; }
      arenaState.phase = 'onlineLobby';
      loadPendingChallenges();
      refreshArena();
    },
    useMove(moveId) {
      const b = arenaState.battle;
      if (!b) return;
      if (b.needsPlayerSwitch) return;
      b.playerUseMove(moveId);
      if (b.phase === 'ended') {
        if (b.winner === 'player') {
          gs.tickBattleWin();
          arenaState.rewardCoins   = 300;
          arenaState.rewardAuras   = b.opponent.units.map(u => ({ id: u.id, name: u.name, tier: u.tier }));
          arenaState.rewardClaimed = false;
          flushNotifications();
          updateHUD();
          pushNotif('🏆 You won the battle!', [80,255,120]);
        }
        arenaState.phase = 'ended';
      } else if (b.needsPlayerSwitch) {
        arenaState.phase = 'needsSwitch';
      }
      refreshArena();
    },
    switchAura(idx) {
      const b = arenaState.battle;
      if (!b) return;
      const ok = b.playerSwitch(idx);
      if (!ok) return;
      if (b.phase === 'ended') {
        arenaState.phase = 'ended';
        if (b.winner === 'player') {
          gs.tickBattleWin();
          arenaState.rewardCoins   = 300;
          arenaState.rewardAuras   = b.opponent.units.map(u => ({ id: u.id, name: u.name, tier: u.tier }));
          arenaState.rewardClaimed = false;
          flushNotifications(); updateHUD();
          pushNotif('🏆 You won!', [80,255,120]);
        }
      } else {
        arenaState.phase = b.needsPlayerSwitch ? 'needsSwitch' : 'battle';
      }
      refreshArena();
    },
    forfeit() {
      arenaState.battle = null;
      arenaState.phase  = 'teamSelect';
      pushNotif('Battle forfeited.', [200,200,200]);
      refreshArena();
    },
    reset() {
      arenaState.battle        = null;
      arenaState.phase         = 'teamSelect';
      arenaState.team          = [null, null, null];
      arenaState.rewardAuras   = [];
      arenaState.rewardCoins   = 0;
      arenaState.rewardClaimed = false;
      refreshArena();
    },
    async claimReward(auraId) {
      if (arenaState.rewardClaimed) return;
      arenaState.rewardClaimed = true;
      try {
        const data = await API.battleWin(auraId || null);
        gs.fromDict(data.state);
        flushNotifications();
        updateHUD();
        if (auraId) {
          const aura = gs.getAura(auraId);
          pushNotif(`Stole ${aura?.name || auraId} + 🪙${data.coinsEarned} from victory!`, [255,215,0]);
        } else {
          pushNotif(`🪙 +${data.coinsEarned} coins from victory!`, [255,215,0]);
        }
      } catch(e) {
        arenaState.rewardClaimed = false;
        pushNotif(`Reward error: ${e.message}`, [255,80,80]);
      }
      refreshArena();
    },
    async sendChallenge(opponentUsername) {
      try {
        const team = arenaState.team.filter(Boolean);
        await API.sendBattleChallenge(opponentUsername, team);
        pushNotif(`Challenge sent to ${opponentUsername}!`, [0,229,255]);
        arenaState.phase = 'onlineLobby';
        loadPendingChallenges();
        refreshArena();
      } catch(e) {
        const errEl = document.getElementById('arena-challenge-err');
        if (errEl) errEl.textContent = e.message;
      }
    },
    async acceptChallenge(id) {
      try {
        const data = await API.acceptBattleChallenge(id, arenaState.team.filter(Boolean));
        startOnlineBattle(data.battle);
      } catch(e) { pushNotif(e.message, [255,80,80]); }
    },
    async declineChallenge(id) {
      try { await API.declineBattleChallenge(id); loadPendingChallenges(); refreshArena(); }
      catch(e) { pushNotif(e.message, [255,80,80]); }
    },
    refreshLobby() { loadPendingChallenges(); refreshArena(); },
    backToTeam()   { arenaState.phase = 'teamSelect'; refreshArena(); },
  });
}

async function loadPendingChallenges() {
  try {
    arenaState.pendingChallenges = await API.getBattleChallenges();
    refreshArena();
  } catch(e) {}
}

function startOnlineBattle(battleData) {
  arenaState.onlineBattleId = battleData.id;
  // Reconstruct BattleEngine from server state if needed — for now, local mirror
  arenaState.battle = battleData.engineState;
  arenaState.phase  = 'battle';
  refreshArena();
}

// ── Boot screen ───────────────────────────────────────────────────────────────
let _bootPhase = 'connecting'; let _bootRetryTimer = null; let _bootAuthMode = 'login'; let _bootAttempts = 0;

function showBoot(phase) {
  _bootPhase = phase;
  document.getElementById('boot-overlay').classList.remove('hidden');
  ['connecting','error','auth','loading'].forEach(p => {
    const el = document.getElementById('boot-' + p);
    if (el) el.style.display = p === phase ? 'flex' : 'none';
  });
}

function hideBoot() { document.getElementById('boot-overlay').classList.add('hidden'); }

async function boot() {
  if (_bootRetryTimer) { clearTimeout(_bootRetryTimer); _bootRetryTimer = null; }
  if (_bootAttempts === 0) showBoot('connecting');
  _bootAttempts++;
  const subEl = document.querySelector('#boot-connecting .boot-sub');
  if (subEl) subEl.textContent = _bootAttempts === 1 ? 'Connecting to server…' : `Server starting up… (${_bootAttempts * 5}s)`;
  try { await API._req('GET', '/health'); } catch {
    if (_bootAttempts >= 8) showBoot('error');
    _bootRetryTimer = setTimeout(() => boot(), 5000);
    return;
  }
  _bootAttempts = 0;
  API.init();
  if (!API.loggedIn) { showBoot('auth'); return; }
  showBoot('loading');
  try {
    const data = await API.gameState();
    gs.fromDict(data.state);
    hideBoot(); updateHUD();
    pushNotif(`Welcome back, ${API.username}!`, [80,255,80]);
  } catch { API.logout(); showBoot('auth'); }
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('hud-coins').textContent = `🪙 ${gs.coins.toLocaleString()}`;
  document.getElementById('hud-sub').textContent   = `Lv${gs.level} · ${gs.rolls.toLocaleString()} rolls`;
  const authBtn = document.getElementById('hud-auth-btn');
  if (API.loggedIn) {
    authBtn.textContent = API.username; authBtn.className = 'logged-in';
    authBtn.onclick = () => { if (confirm(`Log out as ${API.username}?`)) { API.logout(); location.reload(); } };
  } else {
    authBtn.textContent = 'Login'; authBtn.className = '';
    authBtn.onclick = () => boot();
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────
function flushNotifications() { for (const n of gs.notifications) pushNotif(n.msg, n.color); gs.notifications = []; }

const notifsEl = document.getElementById('notifs');
function pushNotif(msg, color=[255,255,255]) {
  const el = document.createElement('div');
  el.className = 'notif'; el.style.borderLeftColor = `rgb(${color})`; el.textContent = msg;
  notifsEl.appendChild(el);
  setTimeout(() => el.style.opacity = '0', 2800);
  setTimeout(() => el.remove(), 3300);
}

// ── Rolling ───────────────────────────────────────────────────────────────────
async function requestRolls(count) {
  if (rollAnimating || rollPending) return;
  rollPending = true;
  try {
    const data = await API.roll(count);
    gs.fromDict(data.state);
    for (const r of data.results) for (const n of (r.notifications || [])) pushNotif(n.msg, n.color);
    flushNotifications(); updateHUD();
    const results = data.results.map(r => ({
      aura: AURA_BY_ID[r.auraId] || ALL_AURAS[0], firstTime: r.firstTime, coins: r.coins, xp: r.xp, isCrit: r.isCrit,
    }));
    if (count === 1) { rollQueue.push(results[0]); animateNext(); }
    else {
      const best = results.reduce((a, b) => b.aura.rarity > a.aura.rarity ? b : a, results[0]);
      rollQueue.push(best); multiOverlay = results; multiOverlayTimer = 0; animateNext();
    }
    activeTab = 'game';
    tabs.forEach(t2 => t2.classList.toggle('active', t2.dataset.tab === 'game'));
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-game'));
  } catch(err) { pushNotif(`Roll failed: ${err.message}`, [255,80,80]); }
  finally { rollPending = false; }
}

function animateNext() {
  if (!rollQueue.length) return;
  rollAnimating = true;
  const result = rollQueue[0];
  rollAnim = { aura:result.aura, isNew:result.firstTime, coins:result.coins, xp:result.xp, phase:'spin', timer:0, done:false, spinIdx:0, spinTick:0 };
  particles.clear(); bolts = [];
}

function onRollDone() {
  const finished = rollQueue.shift();
  flashAlpha = 0.7; flashColor = finished.aura.colors[0];
  shake.add(0.1 + tierRank(finished.aura.tier) * 0.08);
  particles.spawnBurst(W/2-80, H/2-30, finished.aura, Math.min(100, finished.aura.particles/2));
  rollAnimating = false; rollAnim = null;
  flushNotifications(); updateHUD();
  if (rollQueue.length) setTimeout(animateNext, 300);
  else if (activeTab === 'collection') refreshScreen('collection');
}

// ── Chat ──────────────────────────────────────────────────────────────────────
let _chatMessages = [];
async function loadChat() {
  const statusEl = document.getElementById('chat-status');
  if (statusEl) statusEl.textContent = 'Loading…';
  try {
    _chatMessages = await API.getChat();
    renderChatMessages(_chatMessages, API.username);
    if (statusEl) statusEl.textContent = `${_chatMessages.length} messages`;
  } catch(err) { if (statusEl) statusEl.textContent = err.message; }
}
async function pollChat() {
  if (activeTab !== 'chat') return;
  try {
    const fresh = await API.getChat();
    if (fresh.length !== _chatMessages.length || (fresh.length && fresh[fresh.length-1].id !== _chatMessages[_chatMessages.length-1]?.id)) {
      _chatMessages = fresh; renderChatMessages(_chatMessages, API.username);
    }
  } catch {}
}
setInterval(pollChat, 5000);
document.getElementById('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') UI.sendChat(); });
document.getElementById('boot-password').addEventListener('keydown', e => { if (e.key === 'Enter') UI.bootSubmitAuth(); });

// ── Trade ─────────────────────────────────────────────────────────────────────
async function loadTrade() {
  document.getElementById('trade-market-list').innerHTML = '<div style="color:#6070a0;padding:20px;text-align:center">Loading…</div>';
  try {
    const [market, mine, pending] = await Promise.all([
      API.getTrades(),
      API.loggedIn ? API.getMyTrades()      : Promise.resolve([]),
      API.loggedIn ? API.getPendingAuras()  : Promise.resolve([]),
    ]);
    renderTrade(pending, mine, market, API.username,
      async (id) => { if (!API.loggedIn) return; try { await API.claimTrade(id); pushNotif('Trade request sent!', [0,229,255]); loadTrade(); } catch(e) { pushNotif(e.message, [255,80,80]); } },
      async (id) => { try { await API.completeTrade(id); pushNotif('Trade confirmed! Aura sent.', [80,255,80]); loadTrade(); } catch(e) { pushNotif(e.message, [255,80,80]); } },
      async (id) => { try { await API.cancelTrade(id); pushNotif('Listing cancelled.', [200,200,200]); loadTrade(); } catch(e) { pushNotif(e.message, [255,80,80]); } },
      async (id) => {
        try {
          const result = await API.claimPendingAura(id);
          gs.inventory[result.aura_id] = (gs.inventory[result.aura_id] || 0) + 1;
          await API.syncState({ equippedId: gs.equippedId, auraEnchantments: gs.auraEnchantments });
          pushNotif(`Received ${result.aura_name}! Added to collection.`, [80,255,80]);
          loadTrade();
        } catch(e) { pushNotif(e.message, [255,80,80]); }
      }
    );
  } catch(err) { document.getElementById('trade-market-list').innerHTML = `<div style="color:#ff5555;padding:20px;text-align:center">${err.message}</div>`; }
}

// ── UI namespace ──────────────────────────────────────────────────────────────
window.UI = {
  removeEnchant() {
    gs.activeEnchantment = null;
    gs.pushNotification('Enchantment removed.', [200,200,200]);
    flushNotifications(); refreshScreen('enchant');
  },

  // Boot auth
  retryBoot() { boot(); },
  bootAuthTab(mode) {
    _bootAuthMode = mode;
    document.getElementById('boot-tab-login').classList.toggle('active', mode === 'login');
    document.getElementById('boot-tab-register').classList.toggle('active', mode === 'register');
    document.getElementById('boot-submit-btn').textContent = mode === 'login' ? 'Login' : 'Register';
    document.getElementById('boot-auth-error').textContent = '';
  },
  async bootSubmitAuth() {
    const username = document.getElementById('boot-username').value.trim();
    const password = document.getElementById('boot-password').value;
    const errEl    = document.getElementById('boot-auth-error');
    const btn      = document.getElementById('boot-submit-btn');
    if (!username || !password) { errEl.textContent = 'Fill in both fields.'; return; }
    btn.disabled = true; btn.textContent = '…';
    try {
      if (_bootAuthMode === 'login') await API.login(username, password);
      else await API.register(username, password);
      showBoot('loading');
      const data = await API.gameState();
      gs.fromDict(data.state); hideBoot(); updateHUD();
      pushNotif(`Welcome, ${API.username}!`, [80,255,80]);
      document.getElementById('boot-username').value = '';
      document.getElementById('boot-password').value = '';
    } catch(err) {
      errEl.textContent = err.message; btn.disabled = false;
      btn.textContent = _bootAuthMode === 'login' ? 'Login' : 'Register';
    }
  },

  // Chat
  async sendChat() {
    if (!API.loggedIn) return;
    const input = document.getElementById('chat-input');
    const msg   = input.value.trim();
    if (!msg) return;
    input.value = '';
    try { const m = await API.sendChat(msg); _chatMessages.push(m); renderChatMessages(_chatMessages, API.username); }
    catch(err) { pushNotif(err.message, [255,80,80]); }
  },

  // Trade
  openTradeCreate() {
    if (!API.loggedIn) return;
    const coll = gs.collection();
    const sel  = document.getElementById('trade-aura-select');
    sel.innerHTML = coll.map(a => `<option value="${a.id}">[${a.tier}] ${a.name}</option>`).join('');
    document.getElementById('trade-want-input').value = '';
    document.getElementById('trade-create-error').textContent = '';
    document.getElementById('trade-create-overlay').classList.add('open');
  },
  closeTradeCreate() { document.getElementById('trade-create-overlay').classList.remove('open'); },
  async submitTradeCreate() {
    const auraId = document.getElementById('trade-aura-select').value;
    const want   = document.getElementById('trade-want-input').value.trim();
    const errEl  = document.getElementById('trade-create-error');
    if (!auraId) { errEl.textContent = 'Pick an aura.'; return; }
    const aura = gs.getAura(auraId);
    if (!aura) { errEl.textContent = 'Aura not found.'; return; }
    try { await API.createTrade(auraId, aura.name, aura.tier, want); UI.closeTradeCreate(); pushNotif(`${aura.name} listed for trade!`, [0,229,255]); loadTrade(); }
    catch(err) { errEl.textContent = err.message; }
  },
};

// ── Canvas drawing ────────────────────────────────────────────────────────────
function drawGameScreen(dt) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, W, H);
  const aura = gs.equipped;
  const [ox, oy] = shake.offset;
  const cx = W/2-80+ox, cy = H/2-30+oy;
  if (aura) { ctx.fillStyle = rgb(aura.colors[0], 0.06+0.025*Math.sin(t*2)); ctx.fillRect(0,0,W,H); }
  if (rollAnim) drawRollAnim(dt, cx, cy);
  else if (aura) drawAuraFull(ctx, cx, cy, aura, t, particles, bolts, 1.0, gs.charScale, gs.activeEnchantment);
  else { drawCharacter(ctx, cx, cy, 1.0); ctx.fillStyle='#6070a0'; ctx.font='14px "Exo 2"'; ctx.textAlign='center'; ctx.fillText('Roll to get your first aura!', cx, cy+90); }
  if (flashAlpha > 0) { ctx.fillStyle = rgb(flashColor, Math.min(0.35, flashAlpha)); ctx.fillRect(0,0,W,H); flashAlpha -= dt*1.5; }
  if (aura && !rollAnim) drawEquippedCard(aura, dt);
  drawStatsSidebar(dt);
  if (!rollAnim) drawRollButtons();
  if (multiOverlay.length && !rollAnimating) { multiOverlayTimer += dt; drawMultiOverlay(); }
}

function drawRollAnim(dt, cx, cy) {
  const a = rollAnim;
  a.timer += dt;
  if (a.phase === 'spin') {
    const SPIN_DUR = 1.5; const prog = Math.min(1, a.timer/SPIN_DUR);
    const tickRate = 0.04+prog*prog*0.28; a.spinTick += dt;
    if (a.spinTick >= tickRate) { a.spinTick=0; a.spinIdx=(a.spinIdx+1)%ALL_AURAS.length; }
    const lockOn  = prog > 0.88;
    const showAura = lockOn ? a.aura : ALL_AURAS[a.spinIdx];
    const tc2 = TIER_COLORS[showAura.tier]||[200,200,200];
    ctx.fillStyle=`rgba(${showAura.colors[0][0]},${showAura.colors[0][1]},${showAura.colors[0][2]},0.07)`;
    ctx.fillRect(0,0,W,H);
    const boxW=360,boxH=200,boxX=W/2-boxW/2,boxY=H/2-boxH/2-30;
    ctx.fillStyle='rgba(8,8,24,0.95)'; roundRect(ctx,boxX,boxY,boxW,boxH,16); ctx.fill();
    const borderA=lockOn?0.9:(0.4+0.4*Math.sin(a.timer*(18-prog*14)));
    ctx.strokeStyle=`rgba(${tc2[0]},${tc2[1]},${tc2[2]},${borderA})`; ctx.lineWidth=3;
    roundRect(ctx,boxX,boxY,boxW,boxH,16); ctx.stroke();
    const colors=showAura.colors.slice(0,5),swatchR=12,totalSW=colors.length*(swatchR*2+8)-8;
    colors.forEach((c,i)=>{ ctx.beginPath(); ctx.arc(W/2-totalSW/2+swatchR+i*(swatchR*2+8),boxY+52,swatchR,0,Math.PI*2); ctx.fillStyle=`rgb(${c[0]},${c[1]},${c[2]})`; ctx.fill(); });
    ctx.fillStyle=`rgba(${tc2[0]},${tc2[1]},${tc2[2]},${0.7+0.3*Math.sin(a.timer*8)})`; ctx.font='bold 13px "Exo 2"'; ctx.textAlign='center';
    ctx.fillText(`★ ${showAura.tier.toUpperCase()} ★`,W/2,boxY+100);
    ctx.fillStyle=lockOn?'#e8eeff':`rgba(232,238,255,0.75)`; ctx.font='bold 20px "Cinzel Decorative"'; ctx.fillText(showAura.name,W/2,boxY+135);
    if (!lockOn) { const dots='.'.repeat(Math.floor(a.timer*6)%4); ctx.fillStyle='rgba(180,200,255,0.8)'; ctx.font='bold 14px "Exo 2"'; ctx.fillText(`ROLLING${dots}`,W/2,boxY+170); }
    else { ctx.fillStyle=`rgba(${tc2[0]},${tc2[1]},${tc2[2]},0.9)`; ctx.font='bold 14px "Exo 2"'; ctx.fillText('...',W/2,boxY+170); }
    ctx.save(); ctx.globalAlpha=0.25; drawCharacter(ctx,cx,cy,1.0); ctx.restore();
    if (a.timer>=SPIN_DUR) { a.phase='reveal'; a.timer=0; particles.clear(); }
  } else if (a.phase==='reveal') {
    if (a.timer<0.5) {
      const prog=a.timer/0.5;
      ctx.fillStyle=rgb(a.aura.colors[0],prog*0.5); ctx.fillRect(0,0,W,H);
      drawAuraFull(ctx,cx,cy,a.aura,t,particles,bolts,0.3+prog*0.7,1.0,gs.activeEnchantment);
      if (Math.random()<0.6) particles.spawnBurst(cx,cy,a.aura,3,[1,4],[3,8],[10,60],0.03,[0.4,1.2]);
    } else {
      a.phase='show'; a.timer=0;
      particles.spawnBurst(cx,cy,a.aura,Math.min(80,a.aura.particles),[0.5,4],[2,9],[20,90]);
      if (a.aura.starBurst) particles.spawnStarBurst(cx,cy,a.aura,60);
      shake.add(0.1+tierRank(a.aura.tier)*0.1); flashAlpha=0.6; flashColor=a.aura.colors[0];
    }
  } else if (a.phase==='show') {
    drawAuraFull(ctx,cx,cy,a.aura,t,particles,bolts,1.0,1.0,gs.activeEnchantment);
    const cardW=340,cardH=220,cardX=W/2+80,cardY=H/2-cardH/2;
    const tc2=TIER_COLORS[a.aura.tier]||[200,200,200]; const fadeIn=Math.min(1,a.timer/0.3);
    ctx.save(); ctx.globalAlpha=fadeIn;
    ctx.fillStyle='rgba(10,8,30,0.95)'; roundRect(ctx,cardX,cardY,cardW,cardH,14); ctx.fill();
    ctx.strokeStyle=rgb(tc2,0.9); ctx.lineWidth=2; roundRect(ctx,cardX,cardY,cardW,cardH,14); ctx.stroke();
    ctx.fillStyle=rgb(tc2); ctx.font='bold 13px "Exo 2"'; ctx.textAlign='center';
    ctx.globalAlpha=fadeIn*(0.6+0.3*Math.sin(t*3)); ctx.fillText(`★ ${a.aura.tier.toUpperCase()} ★`,cardX+cardW/2,cardY+30);
    ctx.globalAlpha=fadeIn; ctx.fillStyle='#e8eeff'; ctx.font='bold 20px "Cinzel Decorative"'; ctx.fillText(a.aura.name,cardX+cardW/2,cardY+65);
    ctx.fillStyle='#6070a0'; ctx.font='13px "Exo 2"'; ctx.fillText(rarityStr(a.aura.rarity),cardX+cardW/2,cardY+92);
    a.aura.colors.slice(0,5).forEach((c,i)=>{ ctx.beginPath(); ctx.arc(cardX+cardW/2-a.aura.colors.length*11+i*22,cardY+120,8,0,Math.PI*2); ctx.fillStyle=rgb(c); ctx.fill(); });
    ctx.fillStyle='#9090b0'; ctx.font='11px "Exo 2"'; wrapText(ctx,a.aura.description,cardX+cardW/2,cardY+150,cardW-30,15);
    ctx.fillStyle='#ffd700'; ctx.font='bold 14px "Exo 2"'; ctx.fillText(`+${a.coins.toLocaleString()} 🪙`,cardX+cardW/2-50,cardY+cardH-30);
    ctx.fillStyle='#00e5ff'; ctx.fillText(`+${a.xp.toLocaleString()} xp`,cardX+cardW/2+60,cardY+cardH-30);
    if (a.isNew) { ctx.fillStyle='#ffd700'; roundRect(ctx,cardX+cardW-70,cardY+8,58,22,5); ctx.fill(); ctx.fillStyle='#000'; ctx.font='bold 11px "Exo 2"'; ctx.fillText('✨ NEW!',cardX+cardW-41,cardY+22); }
    ctx.restore();
    if (a.timer>0.8) { const blink=Math.abs(Math.sin(a.timer*2.5)); ctx.fillStyle=`rgba(96,112,160,${blink*0.8+0.1})`; ctx.font='13px "Exo 2"'; ctx.textAlign='center'; ctx.fillText('[ CLICK or SPACE to continue ]',W/2,H-24); }
    if (a.timer>2.5) onRollDone();
  }
}

function drawEquippedCard(aura, dt) {
  const tc2=TIER_COLORS[aura.tier]||[200,200,200]; const cardX=W-340,cardY=10;
  ctx.fillStyle='rgba(10,10,30,0.92)'; roundRect(ctx,cardX,cardY,320,180,12); ctx.fill();
  ctx.strokeStyle=rgb(tc2,0.8); ctx.lineWidth=1.5; roundRect(ctx,cardX,cardY,320,180,12); ctx.stroke();
  ctx.fillStyle=rgb(tc2,0.6+0.35*Math.sin(t*2)); ctx.font='bold 12px "Exo 2"'; ctx.textAlign='left'; ctx.fillText(`★ ${aura.tier.toUpperCase()} ★`,cardX+14,cardY+24);
  ctx.fillStyle='#e8eeff'; ctx.font='bold 18px "Cinzel Decorative"'; ctx.fillText(aura.name,cardX+14,cardY+52);
  ctx.fillStyle='#6070a0'; ctx.font='12px "Exo 2"'; ctx.fillText(rarityStr(aura.rarity),cardX+14,cardY+74);
  ctx.fillStyle='#9090b0'; ctx.font='11px "Exo 2"'; wrapText(ctx,aura.description,cardX+14,cardY+96,295,14,'left');
  aura.colors.slice(0,6).forEach((c,i)=>{ ctx.beginPath(); ctx.arc(cardX+14+i*18,cardY+162,7,0,Math.PI*2); ctx.fillStyle=rgb(c); ctx.fill(); });
}

function drawStatsSidebar(dt) {
  const sx=20; ctx.textAlign='left';
  ctx.fillStyle='#ffd700'; ctx.font='bold 16px "Exo 2"'; ctx.fillText(`Level ${gs.level}`,sx,80);
  const xpW=200,xpH=12;
  ctx.fillStyle='#080820'; ctx.fillRect(sx,88,xpW,xpH);
  ctx.fillStyle='#4488ff'; ctx.fillRect(sx,88,xpW*(gs.xp/gs.xpToNext),xpH);
  ctx.fillStyle='#6070a0'; ctx.font='10px "Exo 2"'; ctx.fillText(`XP ${gs.xp.toLocaleString()}/${gs.xpToNext.toLocaleString()}`,sx,114);
  ctx.fillStyle='#ffd700'; ctx.font='bold 15px "Exo 2"'; ctx.fillText(`🪙 ${gs.coins.toLocaleString()}`,sx,138);
  ctx.fillStyle='#6070a0'; ctx.font='13px "Exo 2"'; ctx.fillText(`Rolls: ${gs.rolls.toLocaleString()}`,sx,162);
  ctx.fillStyle='#00e5ff'; ctx.fillText(`Luck: ×${gs.luckMult.toFixed(2)}`,sx,182);
  if (gs.auraLuckBonus>1.0) { ctx.fillStyle='#80ffb0'; ctx.font='11px "Exo 2"'; ctx.fillText(`Aura bonus: ×${gs.auraLuckBonus.toFixed(2)}`,sx,196); }
  const critY=gs.auraLuckBonus>1.0?210:196;
  if (gs.critLevel>0) { ctx.fillStyle='#ffd700'; ctx.font='11px "Exo 2"'; ctx.fillText(`💥 Crit: ${(gs.critChance*100).toFixed(0)}%`,sx,critY); }
  const potionY=critY+(gs.critLevel>0?14:0);
  if (gs.potionActive) { ctx.fillStyle='#b450ff'; ctx.font='13px "Exo 2"'; ctx.fillText(`🧪 Potion: ${gs.potionRollsLeft} left`,sx,potionY+6); }
  if (gs.activeEnchantment) { const enc=ENCHANTMENT_BY_ID[gs.activeEnchantment]; if (enc) { ctx.fillStyle=rgb(enc.color); ctx.font='bold 12px "Exo 2"'; ctx.fillText(`${enc.icon} ${enc.name}`,sx,gs.potionActive?222:202); } }
  if (gs.autoRoll) {
    const pct=1.0-(autoTimer/Math.max(0.01,gs.rollInterval));
    ctx.fillStyle='#080820'; ctx.fillRect(sx,240,180,9); ctx.fillStyle='#00e5ff'; ctx.fillRect(sx,240,180*pct,9);
    ctx.fillStyle='#00e5ff'; ctx.font='11px "Exo 2"'; ctx.fillText('AUTO',sx+185,249);
    ctx.fillStyle='#4080a0'; ctx.font='10px "Exo 2"'; ctx.fillText('[ESC] or right-click to stop',sx,262);
  }
  const pityY=280; ctx.fillStyle='#6070a0'; ctx.font='10px "Exo 2"'; ctx.fillText('PITY:',sx,pityY);
  const pityItems=[[gs.pityRare,gs.PITY_RARE_MAX,[80,140,255],'R'],[gs.pityEpic,gs.PITY_EPIC_MAX,[180,80,255],'E'],[gs.pityLegendary,gs.PITY_LEGENDARY_MAX,[255,165,0],'L'],[gs.pityMythic,gs.PITY_MYTHIC_MAX,[255,60,60],'M']];
  pityItems.forEach(([cur,mx,col,lbl],i)=>{
    const bx=sx+36+i*44,bw=38,pct=Math.min(1,cur/mx);
    ctx.fillStyle='#12122a'; ctx.fillRect(bx,pityY-8,bw,7);
    if(pct>0){ctx.fillStyle=rgb(col);ctx.fillRect(bx,pityY-8,bw*pct,7);}
    ctx.fillStyle=rgb(col);ctx.font='9px "Exo 2"';ctx.textAlign='center';ctx.fillText(`${lbl}${cur}`,bx+bw/2,pityY+4);ctx.textAlign='left';
  });
}

function drawRollButtons() {
  const btnX=W/2-80-100,btnY=H-96,btnW=200,btnH=56,multX=btnX+btnW+8,multW=110;
  if (!gs.autoRoll) {
    const grad=ctx.createRadialGradient(btnX+btnW/2,btnY+btnH/2,0,btnX+btnW/2,btnY+btnH/2,120);
    const gloA=0.15+0.07*Math.sin(t*3);
    grad.addColorStop(0,`rgba(40,90,200,${gloA})`); grad.addColorStop(1,'rgba(40,90,200,0)');
    ctx.fillStyle=grad; ctx.fillRect(btnX-20,btnY-20,btnW+40,btnH+40);
  }
  ctx.fillStyle=rollAnimating?'#0d1a3a':'#1a3a8a'; roundRect(ctx,btnX,btnY,btnW,btnH,10); ctx.fill();
  ctx.strokeStyle=rollAnimating?'#1a2a5a':'#2a5aff'; ctx.lineWidth=1.5; roundRect(ctx,btnX,btnY,btnW,btnH,10); ctx.stroke();
  ctx.fillStyle=rollAnimating?'#6070a0':'#aaccff'; ctx.font='bold 18px "Exo 2"'; ctx.textAlign='center'; ctx.fillText('🎲  ROLL',btnX+btnW/2,btnY+btnH/2+6);
  ctx.fillStyle='#101030'; roundRect(ctx,multX,btnY,multW,btnH,10); ctx.fill();
  ctx.strokeStyle='#2a2a5a'; ctx.lineWidth=1; roundRect(ctx,multX,btnY,multW,btnH,10); ctx.stroke();
  ctx.fillStyle='#8090c0'; ctx.font='bold 16px "Exo 2"'; ctx.fillText(`×${curMulti}`,multX+multW/2,btnY+btnH/2+6);
  ctx.textAlign='left';
  if (gs.multiRoll>1) { ctx.fillStyle='#6070a0'; ctx.font='11px "Exo 2"'; ctx.textAlign='center'; ctx.fillText(`Multi-roll up to ×${gs.multiRoll}`,btnX+btnW/2,btnY-14); }
}

function drawMultiOverlay() {
  const fade=Math.min(1,multiOverlayTimer/0.35);
  ctx.fillStyle=`rgba(4,4,14,${0.8*fade})`; ctx.fillRect(0,0,W,H);
  const n=multiOverlay.length,cw=Math.min(200,(W-60)/n),ch=220,gap=10;
  const totalW=n*cw+(n-1)*gap,startX=W/2-totalW/2,cyBase=H/2-ch/2;
  ctx.fillStyle=`rgba(255,215,0,${fade*0.9})`; ctx.font='bold 22px "Cinzel Decorative"'; ctx.textAlign='center'; ctx.fillText(`×${n} ROLL RESULTS`,W/2,cyBase-30);
  multiOverlay.forEach((result,i)=>{
    const aura=result.aura,tc2=TIER_COLORS[aura.tier]||[200,200,200];
    const slide=Math.min(1,Math.max(0,fade-i*0.08)),ease=1-Math.pow(1-slide,3);
    const cardX=startX+i*(cw+gap),cardY=cyBase+(1-ease)*60;
    ctx.fillStyle=`rgba(14,8,32,${0.9*ease})`; roundRect(ctx,cardX,cardY,cw,ch,10); ctx.fill();
    ctx.strokeStyle=rgb(tc2,0.5+0.4*Math.sin(t*3+i*0.9)); ctx.lineWidth=2; roundRect(ctx,cardX,cardY,cw,ch,10); ctx.stroke();
    aura.colors.slice(0,4).forEach((c,si)=>{const ang=t*2+si*Math.PI*2/Math.max(1,aura.colors.length),ox2=12*Math.cos(ang),oy2=6*Math.sin(ang);ctx.beginPath();ctx.arc(cardX+cw/2+ox2,cardY+34+oy2,7,0,Math.PI*2);ctx.fillStyle=rgb(c,ease);ctx.fill();});
    ctx.fillStyle=rgb(tc2,ease); ctx.font='bold 11px "Exo 2"'; ctx.textAlign='center'; ctx.fillText(`★ ${aura.tier.toUpperCase()} ★`,cardX+cw/2,cardY+58);
    ctx.fillStyle=`rgba(232,238,255,${ease})`; ctx.font='bold 13px "Exo 2"'; ctx.fillText(aura.name,cardX+cw/2,cardY+78);
    ctx.fillStyle=`rgba(96,112,160,${ease})`; ctx.font='10px "Exo 2"'; ctx.fillText(rarityStr(aura.rarity),cardX+cw/2,cardY+94);
    if (result.firstTime){ctx.fillStyle=`rgba(255,215,0,${ease*0.9})`;roundRect(ctx,cardX+cw-54,cardY+6,48,18,4);ctx.fill();ctx.fillStyle='#000';ctx.font='bold 9px "Exo 2"';ctx.fillText('✨ NEW',cardX+cw-30,cardY+18);}
    ctx.fillStyle=`rgba(255,215,0,${ease})`; ctx.font='bold 11px "Exo 2"'; ctx.fillText(`+${result.coins.toLocaleString()} 🪙`,cardX+cw/2,cardY+116);
    ctx.fillStyle=`rgba(0,229,255,${ease})`; ctx.fillText(`+${result.xp.toLocaleString()} xp`,cardX+cw/2,cardY+132);
  });
  if (multiOverlayTimer>0.7){const blink=Math.abs(Math.sin(multiOverlayTimer*2.5));ctx.fillStyle=`rgba(96,112,160,${blink*0.7+0.1})`;ctx.font='13px "Exo 2"';ctx.textAlign='center';ctx.fillText('[ CLICK or SPACE to dismiss ]',W/2,H-24);}
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
function wrapText(ctx,text,x,y,maxW,lineH,align='center'){ctx.textAlign=align;const words=text.split(' ');let line='',lines=[];for(const word of words){const test=line+word+' ';if(ctx.measureText(test).width>maxW&&line){lines.push(line);line=word+' ';}else line=test;}if(line)lines.push(line);lines.forEach((l,i)=>ctx.fillText(l.trim(),x,y+i*lineH));}

// ── Input ─────────────────────────────────────────────────────────────────────
canvas.addEventListener('click', e => {
  if (rollAnim && rollAnim.phase==='spin' && rollAnim.timer>0.3){rollAnim.phase='reveal';rollAnim.timer=0;particles.clear();return;}
  if (rollAnim && rollAnim.phase==='show' && rollAnim.timer>0.5){onRollDone();return;}
  if (multiOverlay.length && !rollAnimating && multiOverlayTimer>0.4){multiOverlay=[];return;}
  if (activeTab!=='game') return;
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left,my=e.clientY-rect.top;
  const btnX=W/2-80-100,btnY=H-96,btnW=200,btnH=56,multX=btnX+btnW+8,multW=110;
  if(mx>=btnX&&mx<=btnX+btnW&&my>=btnY&&my<=btnY+btnH&&!rollAnimating){requestRolls(curMulti);if(curMulti>1)gs.tickComboQuest();}
  else if(mx>=multX&&mx<=multX+multW&&my>=btnY&&my<=btnY+btnH){const options=[1,3,5,10,20,50].filter(m=>m<=gs.multiRoll);if(!options.length)return;const idx=options.indexOf(curMulti);curMulti=options[(idx+1)%options.length];}
});
canvas.addEventListener('contextmenu', e=>{e.preventDefault();if(gs.autoRoll){gs.autoRoll=false;autoTimer=gs.rollInterval;gs.pushNotification('Auto-roll stopped.',[200,200,200]);flushNotifications();}});

window.addEventListener('keydown', e=>{
  if(e.code==='Space'){
    if(rollAnim&&rollAnim.phase==='spin'&&rollAnim.timer>0.3){rollAnim.phase='reveal';rollAnim.timer=0;particles.clear();return;}
    if(rollAnim&&rollAnim.phase==='show'&&rollAnim.timer>0.5){onRollDone();return;}
    if(multiOverlay.length&&!rollAnimating&&multiOverlayTimer>0.4){multiOverlay=[];return;}
    if(activeTab==='game'&&!rollAnimating)requestRolls(curMulti);
  }
  if(e.code==='Escape'){if(gs.autoRoll){gs.autoRoll=false;gs.pushNotification('Auto-roll stopped.',[200,200,200]);flushNotifications();}}
  const tabKeys={'Digit1':'game','Digit2':'shop','Digit3':'collection','Digit4':'arena','Digit5':'enchant','Digit6':'quests','Digit7':'stats'};
  if(tabKeys[e.code]){
    const newTab=tabKeys[e.code];
    tabs.forEach(t2=>t2.classList.toggle('active',t2.dataset.tab===newTab));
    document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===`screen-${newTab}`));
    activeTab=newTab; refreshScreen(newTab);
  }
  if(e.code==='F5'){
    e.preventDefault();
    if(API.loggedIn){API.syncState({equippedId:gs.equippedId,auraEnchantments:gs.auraEnchantments}).then(()=>pushNotif('Synced to server! 💾',[80,255,80])).catch(err=>pushNotif(`Sync failed: ${err.message}`,[255,80,80]));}
  }
});

// ── Game loop ─────────────────────────────────────────────────────────────────
let lastTime=0,saveTimer=0;
function loop(ts){
  const dt=Math.min((ts-lastTime)/1000,0.05);
  lastTime=ts; t+=dt; saveTimer+=dt;
  if(saveTimer>=15){saveTimer=0;if(API.loggedIn){API.syncState({equippedId:gs.equippedId,auraEnchantments:gs.auraEnchantments}).catch(()=>{});}}
  if(activeTab==='game'){
    const aura=gs.equipped;
    shake.update(dt); particles.update(dt); bolts=bolts.filter(b=>b.update(dt));
    if(aura){if(aura.lightning){boltTimer-=dt;if(boltTimer<=0){bolts.push(new LightningBolt(W/2-80,H/2-30,aura.colors[aura.colors.length-1]));boltTimer=0.12+Math.random()*0.18;}}if(!rollAnim)particles.spawnAmbient(W/2-80,H/2-30,aura,2);}
    if(gs.autoRoll&&!rollAnimating){autoTimer-=dt;if(autoTimer<=0){autoTimer=gs.rollInterval;requestRolls(1);}}
  }
  if(activeTab==='game')drawGameScreen(dt);
  if(activeTab==='game'){ctx.fillStyle='rgba(40,40,60,0.7)';ctx.font='10px monospace';ctx.textAlign='left';ctx.fillText(`${(1/Math.max(dt,0.001)).toFixed(0)} fps  |  F5=sync  |  Space=roll`,4,H-6);}
  requestAnimationFrame(loop);
}

window._ENCHANTMENT_BY_ID=ENCHANTMENT_BY_ID;
requestAnimationFrame(ts=>{lastTime=ts;loop(ts);});
boot();

window.addEventListener('beforeunload',()=>{
  if(API.loggedIn){API.syncState({equippedId:gs.equippedId,auraEnchantments:gs.auraEnchantments}).catch(()=>{});}
});
