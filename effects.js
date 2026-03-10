// effects.js — Particle system, lightning, aura renderer on Canvas 2D

import { tierRank, TIER_ORDER } from './auras.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
export function rgb(c, a = 1) {
  return a < 1 ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : `rgb(${c[0]},${c[1]},${c[2]})`;
}

// ── Screen shake ─────────────────────────────────────────────────────────────
export class ScreenShake {
  constructor() { this.trauma = 0; this._seed = Math.random() * 1000; this.offset = [0,0]; }
  add(amount) { this.trauma = Math.min(1, this.trauma + amount); }
  update(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    this._seed += dt * 8;
    const mag = this.trauma * this.trauma * 20;
    this.offset = [Math.sin(this._seed * 2.1) * mag, Math.sin(this._seed * 3.7) * mag];
    return this.offset;
  }
}

// ── Particle ──────────────────────────────────────────────────────────────────
class Particle {
  constructor(x, y, vx, vy, life, color, size, gravity=0.04, fadeMode='out', shape='circle') {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = this.maxLife = life;
    this.color = color; this.size = size; this.gravity = gravity;
    this.fadeMode = fadeMode; this.shape = shape;
    this.spin = Math.random() * Math.PI * 2;
    this.spinSpeed = (Math.random() - 0.5) * 8;
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vy += this.gravity * dt * 60;
    this.vx *= (1 - dt * 0.3);
    this.life -= dt;
    this.spin += this.spinSpeed * dt;
    return this.life > 0;
  }

  get alpha() {
    const t = this.life / this.maxLife;
    if (this.fadeMode === 'in_out') return Math.sin(t * Math.PI);
    if (this.fadeMode === 'late') return t * t;
    return t;
  }

  draw(ctx) {
    const a = this.alpha;
    if (a <= 0.01 || this.size < 0.5) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = rgb(this.color);
    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
      ctx.fill();
    } else if (this.shape === 'star') {
      drawStar(ctx, this.x, this.y, this.size, this.spin);
    } else if (this.shape === 'diamond') {
      drawDiamond(ctx, this.x, this.y, this.size);
    }
    ctx.restore();
  }
}

function drawStar(ctx, cx, cy, r, angle) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = angle + i * Math.PI / 4;
    const ri = i % 2 === 0 ? r : r * 0.4;
    if (i === 0) ctx.moveTo(cx + Math.cos(a)*ri, cy + Math.sin(a)*ri);
    else ctx.lineTo(cx + Math.cos(a)*ri, cy + Math.sin(a)*ri);
  }
  ctx.closePath(); ctx.fill();
}

function drawDiamond(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx+r, cy);
  ctx.lineTo(cx, cy+r); ctx.lineTo(cx-r, cy);
  ctx.closePath(); ctx.fill();
}

function tierShape(tier) {
  if (['Godly','???','Cosmic','Divine'].includes(tier)) return 'star';
  if (['Legendary','Mythic'].includes(tier)) return 'diamond';
  return 'circle';
}

// ── Particle System ───────────────────────────────────────────────────────────
export class ParticleSystem {
  constructor() { this.particles = []; }
  clear() { this.particles = []; }

  spawnBurst(cx, cy, aura, count, speedRange=[0.4,3.0], sizeRange=[2,7], radiusRange=[20,80], gravity=0.04, lifeRange=[0.6,2.0]) {
    const shape = tierShape(aura.tier);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = radiusRange[0] + Math.random() * (radiusRange[1] - radiusRange[0]);
      const speed = speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]);
      const color = aura.colors[Math.floor(Math.random() * aura.colors.length)];
      const life = lifeRange[0] + Math.random() * (lifeRange[1] - lifeRange[0]);
      const size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
      this.particles.push(new Particle(
        cx + Math.cos(angle)*dist, cy + Math.sin(angle)*dist,
        Math.cos(angle)*speed*0.5 + (Math.random()-.3)*.6,
        Math.sin(angle)*speed*0.5 - 0.5 + (Math.random()-.4)*.8,
        life, color, size, gravity, 'in_out', shape
      ));
    }
  }

  spawnAmbient(cx, cy, aura, count=2) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 55;
      const color = aura.colors[Math.floor(Math.random() * aura.colors.length)];
      this.particles.push(new Particle(
        cx + Math.cos(angle)*dist, cy + Math.sin(angle)*dist,
        (Math.random()-.5)*.3, -(0.15 + Math.random()*.55),
        0.8 + Math.random()*1.2, color, 2 + Math.random()*3, 0, 'out', 'circle'
      ));
    }
  }

  spawnStarBurst(cx, cy, aura, count=80) {
    const shape = tierShape(aura.tier);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      const color = aura.colors[Math.floor(Math.random() * aura.colors.length)];
      this.particles.push(new Particle(
        cx, cy, Math.cos(angle)*speed, Math.sin(angle)*speed,
        0.7 + Math.random()*1.1, color, 3 + Math.random()*7, -0.02, 'in_out', shape
      ));
    }
  }

  update(dt) { this.particles = this.particles.filter(p => p.update(dt)); }
  draw(ctx) { for (const p of this.particles) p.draw(ctx); }
  get length() { return this.particles.length; }
}

// ── Lightning ─────────────────────────────────────────────────────────────────
export class LightningBolt {
  constructor(cx, cy, color) {
    this.life = 0.12 + Math.random() * 0.1;
    this.maxLife = this.life;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 60;
    this.x1 = cx; this.y1 = cy;
    this.x2 = cx + Math.cos(angle)*dist;
    this.y2 = cy + Math.sin(angle)*dist*0.4;
    this.segs = this._genSegs();
  }

  _genSegs() {
    const segs = []; let x = this.x1, y = this.y1;
    const steps = 4 + Math.floor(Math.random()*4);
    for (let i = 0; i <= steps; i++) {
      const t = i/steps;
      const tx = this.x1 + (this.x2-this.x1)*t;
      const ty = this.y1 + (this.y2-this.y1)*t;
      const ox = i===0||i===steps ? 0 : (Math.random()-.5)*20;
      const oy = i===0||i===steps ? 0 : (Math.random()-.5)*10;
      segs.push([tx+ox, ty+oy]);
    }
    return segs;
  }

  update(dt) { this.life -= dt; return this.life > 0; }

  draw(ctx) {
    const a = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = a * 0.8;
    ctx.strokeStyle = rgb(this.color);
    ctx.lineWidth = 1.5;
    ctx.shadowColor = rgb(this.color);
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(this.segs[0][0], this.segs[0][1]);
    for (let i = 1; i < this.segs.length; i++) ctx.lineTo(this.segs[i][0], this.segs[i][1]);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Glow helper ───────────────────────────────────────────────────────────────
function drawGlow(ctx, cx, cy, color, radius, alphaPeak=0.3, steps=8) {
  for (let i = steps; i > 0; i--) {
    const r = radius + i * 12;
    const a = alphaPeak * Math.pow(i/steps, 1.5);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, rgb(color, a));
    grad.addColorStop(1, rgb(color, 0));
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

// ── Tier extras ───────────────────────────────────────────────────────────────
function drawTierExtras(ctx, cx, cy, aura, t, scale) {
  const tier = aura.tier;
  if (tier === 'Common') {
    const a = 0.15 + 0.08*Math.sin(t*2);
    ctx.beginPath(); ctx.arc(cx, cy, 50*scale, 0, Math.PI*2);
    ctx.strokeStyle = rgb(aura.colors[0], a); ctx.lineWidth = 2; ctx.stroke();

  } else if (tier === 'Uncommon') {
    for (let i = 0; i < 6; i++) {
      const ang = t*1.2 + i*Math.PI*2/6;
      const r = 68*scale;
      const px = cx + Math.cos(ang)*r, py = cy + Math.sin(ang)*r*0.4;
      const c = aura.colors[i % aura.colors.length];
      ctx.beginPath(); ctx.arc(px, py, 4*scale, 0, Math.PI*2);
      ctx.fillStyle = rgb(c); ctx.fill();
    }

  } else if (tier === 'Rare') {
    for (let i = 0; i < 8; i++) {
      const ang = t*0.6 + i*Math.PI*2/8;
      const r1=55*scale, r2=75*scale;
      const c = aura.colors[i%aura.colors.length];
      ctx.beginPath();
      ctx.moveTo(cx+Math.cos(ang)*r1, cy+Math.sin(ang)*r1*0.5);
      ctx.lineTo(cx+Math.cos(ang)*r2, cy+Math.sin(ang)*r2*0.5);
      ctx.strokeStyle = rgb(c, 0.6); ctx.lineWidth=2; ctx.stroke();
    }

  } else if (tier === 'Epic') {
    [[1.5,75,8],[-1.0,90,6]].forEach(([speed, radius, n], ri) => {
      for (let i = 0; i < n; i++) {
        const ang = t*speed + i*Math.PI*2/n;
        const px = cx+Math.cos(ang)*radius*scale, py = cy+Math.sin(ang)*radius*scale*0.35;
        const c = aura.colors[(i+ri)%aura.colors.length];
        ctx.beginPath(); ctx.arc(px, py, 5*scale, 0, Math.PI*2);
        ctx.fillStyle = rgb(c); ctx.fill();
      }
    });

  } else if (tier === 'Legendary') {
    for (let wi = 0; wi < 3; wi++) {
      const wt = (t*1.5 + wi*0.5) % 2.0;
      const wr = (60 + wt*60)*scale;
      const wa = 0.5*(1.0-wt/2.0);
      const c = aura.colors[wi%aura.colors.length];
      ctx.beginPath(); ctx.arc(cx, cy, wr, 0, Math.PI*2);
      ctx.strokeStyle = rgb(c, wa); ctx.lineWidth=3; ctx.stroke();
    }

  } else if (['Divine','Mythic'].includes(tier)) {
    const beamA = 0.4 + 0.25*Math.sin(t*2);
    const beamLen = 120*scale;
    [0, Math.PI/2, Math.PI/4, 3*Math.PI/4].forEach(ao => {
      ctx.beginPath();
      ctx.moveTo(cx+Math.cos(ao)*beamLen, cy+Math.sin(ao)*beamLen*0.5);
      ctx.lineTo(cx-Math.cos(ao)*beamLen, cy-Math.sin(ao)*beamLen*0.5);
      ctx.strokeStyle = rgb(aura.colors[0], beamA); ctx.lineWidth=2; ctx.stroke();
    });

  } else if (['Cosmic','Godly','???'].includes(tier)) {
    const armLen = 110*scale;
    for (let arm = 0; arm < 4; arm++) {
      const baseAng = t*0.5 + arm*Math.PI*2/4;
      for (let step = 0; step < 20; step++) {
        const frac = step/20;
        const ang = baseAng + frac*Math.PI*0.6;
        const r = frac*armLen;
        const px = cx+Math.cos(ang)*r, py = cy+Math.sin(ang)*r*0.35;
        const a = 0.7*(1-frac);
        const c = aura.colors[step%aura.colors.length];
        const sz = Math.max(1, (4-frac*3)*scale);
        ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI*2);
        ctx.fillStyle = rgb(c, a); ctx.fill();
      }
    }
  }
}

// ── Character drawing ─────────────────────────────────────────────────────────
export function drawCharacter(ctx, cx, cy, scale=1.0) {
  const s = v => v * scale;
  const skin=[230,185,130], hair=[60,40,20], body=[70,90,160], dark=[40,55,120], shade=[55,70,140], whites=[255,255,255], pupil=[20,20,20];

  // Legs
  [[-s(10),-1],[s(0),1]].forEach(([lx]) => {
    ctx.fillStyle=`rgb(${dark})`; ctx.beginPath(); ctx.roundRect(cx+lx+1, cy+s(10)+1, s(11), s(30), s(4)); ctx.fill();
    ctx.fillStyle=`rgb(${body})`; ctx.beginPath(); ctx.roundRect(cx+lx, cy+s(10), s(11), s(29), s(4)); ctx.fill();
  });
  // Torso
  ctx.fillStyle=`rgb(${dark})`; ctx.beginPath(); ctx.roundRect(cx-s(17)+1, cy-s(21)+1, s(35), s(35), s(6)); ctx.fill();
  ctx.fillStyle=`rgb(${body})`; ctx.beginPath(); ctx.roundRect(cx-s(17), cy-s(22), s(35), s(35), s(6)); ctx.fill();
  // Arms
  [[-s(30)],[ s(18)]].forEach(([ax]) => {
    ctx.fillStyle=`rgb(${dark})`; ctx.beginPath(); ctx.roundRect(cx+ax+1, cy-s(21)+1, s(12), s(30), s(4)); ctx.fill();
    ctx.fillStyle=`rgb(${body})`; ctx.beginPath(); ctx.roundRect(cx+ax, cy-s(22), s(12), s(30), s(4)); ctx.fill();
  });
  // Neck
  ctx.fillStyle=`rgb(${skin})`; ctx.fillRect(cx-s(6), cy-s(29), s(13), s(10));
  // Head
  ctx.fillStyle=`rgb(${skin})`; ctx.beginPath(); ctx.ellipse(cx, cy-s(43), s(20), s(18), 0, 0, Math.PI*2); ctx.fill();
  // Hair
  ctx.fillStyle=`rgb(${hair})`; ctx.beginPath(); ctx.ellipse(cx, cy-s(54), s(22), s(12), 0, 0, Math.PI*2); ctx.fill();
  // Eyes
  [[-s(7)],[s(6)]].forEach(([ex]) => {
    ctx.fillStyle=`rgb(${whites})`; ctx.beginPath(); ctx.ellipse(cx+ex, cy-s(45), s(4), s(3), 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle=`rgb(${pupil})`; ctx.beginPath(); ctx.arc(cx+ex, cy-s(44), s(2), 0, Math.PI*2); ctx.fill();
  });
}

// ── Full aura renderer ────────────────────────────────────────────────────────
export function drawAuraFull(ctx, cx, cy, aura, t, particles, bolts, scale=1.0, charScale=1.0, enchantment=null) {
  const extra = enchantment === 'glowup' ? 2.0 : 1.0;
  const pulseR = aura.pulse ? (55 + 12*Math.sin(t*2.8)) * scale * extra : 55*scale*extra;

  ctx.save();

  // Gay enchantment: override colors with rainbow
  let displayColors = aura.colors;
  if (enchantment === 'gay') {
    displayColors = aura.colors.map((_, ci) => {
      const h = (t*0.3 + ci/Math.max(3,aura.colors.length)) % 1.0;
      return hsvToRgb(h, 0.95, 1.0);
    });
  }
  const displayAura = { ...aura, colors: displayColors };

  // Outer glow
  drawGlow(ctx, cx, cy, displayAura.colors[0], pulseR*1.4, 0.25*extra);
  if (displayAura.colors.length > 1) drawGlow(ctx, cx, cy, displayAura.colors[1], pulseR*0.9, 0.14*extra);

  // Tier extras
  drawTierExtras(ctx, cx, cy, displayAura, t, scale);

  // Lightning bolts
  for (const bolt of bolts) bolt.draw(ctx);

  // Particles
  particles.draw(ctx);

  // Star burst sparkles
  if (aura.starBurst) {
    const n = 3 + Math.floor(scale*3);
    for (let i = 0; i < n; i++) {
      const sx = cx + (Math.random()-.5)*160*scale;
      const sy = cy + (Math.random()-.5)*180*scale;
      const sc = displayAura.colors[Math.floor(Math.random()*displayAura.colors.length)];
      const sr = 2 + Math.floor(Math.random()*5*scale);
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2);
      ctx.fillStyle = rgb(sc); ctx.fill();
      if (aura.rarity >= 10000) {
        ctx.strokeStyle = rgb(sc); ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(sx-sr-3, sy); ctx.lineTo(sx+sr+3, sy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, sy-sr-3); ctx.lineTo(sx, sy+sr+3); ctx.stroke();
      }
    }
  }

  // Halo crown for glowup
  if (enchantment === 'glowup') {
    const hr = 50*scale;
    ctx.beginPath(); ctx.arc(cx, cy - 65*scale, hr, 0, Math.PI*2);
    const grad = ctx.createRadialGradient(cx, cy-65*scale, 0, cx, cy-65*scale, hr);
    grad.addColorStop(0, `rgba(255,230,80,0.5)`);
    grad.addColorStop(1, `rgba(255,230,80,0)`);
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,80,0.8)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(cx, cy-65*scale, hr*0.8, hr*0.2, 0, 0, Math.PI*2); ctx.stroke();
  }

  // Character
  drawCharacter(ctx, cx, cy, charScale * scale);

  // Inner body glow
  const innerR = 38*scale;
  const innerA = aura.pulse ? (0.12 + 0.08*Math.sin(t*3)) : 0.1;
  const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR);
  innerGrad.addColorStop(0, rgb(displayAura.colors[0], innerA*2));
  innerGrad.addColorStop(1, rgb(displayAura.colors[0], 0));
  ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI*2);
  ctx.fillStyle = innerGrad; ctx.fill();

  ctx.restore();
}

function hsvToRgb(h, s, v) {
  const i = Math.floor(h*6), f = h*6-i, p=v*(1-s), q=v*(1-f*s), t2=v*(1-(1-f)*s);
  let r,g,b;
  switch(i%6){case 0:r=v;g=t2;b=p;break;case 1:r=q;g=v;b=p;break;case 2:r=p;g=v;b=t2;break;
    case 3:r=p;g=q;b=v;break;case 4:r=t2;g=p;b=v;break;case 5:r=v;g=p;b=q;break;}
  return [Math.round(r*255),Math.round(g*255),Math.round(b*255)];
}