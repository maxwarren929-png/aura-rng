// merge.js — Aura merging system
import { ALL_AURAS, AURA_BY_ID, TIER_ORDER, tierRank } from './auras.js';

// ── Named recipes ─────────────────────────────────────────────────────────────
function R(a, b, result) { return [JSON.stringify([a,b].sort()), result]; }

function A(id, name, rarity, tier, colors, particles, rings, pulse, lightning, starBurst, trail, description, sellValue, xpReward) {
  return { id, name, rarity, tier, colors, particles, rings, pulse, lightning, starBurst, trail, description, sellValue, xpReward };
}

const RECIPE_LIST = [
  R('joel','juno',        A('joeljuno',   'Joel × Juno',       50000000,'???',  [[255,120,0],[220,60,255],[255,220,60],[140,0,255],[255,255,140]],200,8,true,true,true,true,'The unstoppable force meets the immovable object. Reality bends.',99999,99999)),
  R('joel','karna',       A('solflame',   'Solar Flame',        20000000,'Godly',[[255,80,0],[255,220,0],[200,40,0],[255,255,120],[255,160,0]],180,8,true,true,true,true,'Joel\'s cosmic fire fused with Karna\'s warrior sun. Blinding.',30000,15000)),
  R('juno','kaelan',      A('cyberviolet','Cyber Violet',        15000000,'Godly',[[200,0,255],[0,240,200],[140,0,255],[100,255,220],[255,100,255]],170,7,true,true,true,true,'Juno\'s gravity pulls Kaelan\'s aurora light into a perfect vortex.',25000,10000)),
  R('karna','avi',        A('solarkings', 'Solar Kings',          8000000,'Cosmic',[[255,200,0],[255,100,0],[200,80,0],[255,255,100],[180,60,0]],160,7,true,true,true,true,'Two golden titans collide. The sky burns gold.',12000,6000)),
  R('joel','avi',         A('goldfire',   'Gold Fire',            12000000,'Godly',[[255,140,0],[255,220,0],[255,60,0],[255,255,160],[200,100,0]],165,7,true,true,true,true,'Joel\'s wildfire meets Avi\'s solar gold. You can\'t look away.',18000,8000)),
  R('kim','juno',         A('roseviolet', 'Rose Violet',           6000000,'Cosmic',[[255,80,160],[200,0,255],[255,160,220],[140,0,200],[255,200,240]],150,6,true,true,true,true,'Kim\'s warmth wraps around Juno\'s gravity. Dangerously beautiful.',8000,4000)),
  R('jason','warren',     A('deepocean',  'Deep Ocean',            2000000,'Divine',[[0,40,180],[0,160,180],[0,80,255],[0,200,220],[0,20,100]],120,6,true,true,false,true,'Two ocean energies united. Calm but utterly overwhelming.',5000,2000)),
  R('ko','oliver',        A('grove',      'Grove Spirit',          3000000,'Cosmic',[[40,180,80],[0,220,140],[120,255,160],[20,120,50],[100,255,180]],140,6,true,false,true,true,'Forest meets forest. A living canopy aura.',6000,3000)),
  R('pratyush','isaac',   A('solarbolt',  'Solar Bolt',            4000000,'Cosmic',[[255,120,0],[60,200,255],[255,200,60],[0,160,220],[255,240,160]],145,6,true,true,true,true,'Pratyush\'s solar fire arced through Isaac\'s lightning. Devastating.',7000,3500)),
  R('mri','ashton',       A('pinkpurple', 'Pink Storm',            1500000,'Mythic',[[255,80,180],[180,60,255],[255,140,220],[120,0,200],[255,200,240]],110,5,true,true,true,true,'Mri\'s purple chaos meets Ashton\'s bold pink energy. Extremely loud.',4000,2000)),
  R('swan','kim',         A('pearlrose',  'Pearl Rose',            2500000,'Divine',[[255,255,255],[255,180,200],[220,240,255],[255,140,180],[200,220,255]],125,6,true,false,true,true,'Swan\'s white purity tinged with Kim\'s rose warmth. Ethereal.',5000,2500)),
  R('arman','mri',        A('violetdream','Violet Dream',           3500000,'Cosmic',[[180,60,255],[200,80,255],[140,40,200],[255,120,255],[100,0,180]],140,6,true,true,true,true,'Double violet energy. The most electric combination possible.',7000,3000)),
  R('luis','jamie',       A('inferno2',   'Double Inferno',         1000000,'Mythic',[[255,80,20],[255,140,0],[255,60,0],[200,40,0],[255,200,80]],100,5,true,true,true,true,'Luis\'s bold fire plus Jamie\'s coral heat. The room is on fire.',3500,1800)),
  R('varun','christian',  A('mintblue',   'Mint & Blue',             600000,'Mythic',[[0,200,180],[80,200,160],[0,180,255],[100,240,180],[0,140,200]],92,5,true,false,true,true,'Varun\'s teal clarity and Christian\'s mint calm. A perfect harmony.',3000,1500)),
  R('max','james',        A('goldflash',  'Gold Flash',              800000,'Mythic',[[255,220,0],[255,180,60],[200,140,0],[255,240,120],[220,160,0]],96,5,true,true,true,true,'Max\'s electric yellow and James\'s warm gold. Constantly moving.',3200,1600)),
  R('roy','jason',        A('bloodocean', 'Blood & Ocean',           2000000,'Divine',[[200,20,20],[0,80,200],[255,60,40],[0,140,255],[160,0,0]],125,6,true,true,false,true,'Roy\'s sharp crimson cuts through Jason\'s ocean blue. Dramatic.',5000,2200)),
  R('brenden','john',     A('calmstone',  'Calm Stone',               200000,'Legendary',[[170,175,165],[150,160,150],[190,195,185],[140,150,140]],70,4,true,false,false,true,'Two quiet auras. Calmer than a library. More powerful than it looks.',1200,500)),
  R('anthony','romit',    A('softlight',  'Soft Light',               350000,'Legendary',[[190,170,210],[180,160,200],[210,190,225],[160,140,180]],76,4,true,false,true,true,'Two underrated energies combining into something unexpectedly beautiful.',1200,550)),
  R('kaelan','joel',      A('aurorfire',  'Aurora Fire',            30000000,'???',[[0,255,200],[255,120,0],[0,220,255],[255,200,60],[100,255,220]],195,8,true,true,true,true,'Kaelan\'s northern lights meet Joel\'s eternal flame. The sky itself ignites.',99999,50000)),
  R('brayden','anthony',  A('quietforce', 'Quiet Force',              150000,'Legendary',[[175,175,195],[185,165,205],[155,155,175],[165,145,185]],68,4,true,false,false,true,'Two understated auras forming a quiet, undeniable power.',1000,400)),
  R('varun','isaac',      A('electricsea','Electric Sea',            1200000,'Mythic',[[0,200,255],[60,180,255],[0,240,200],[100,220,255],[0,160,255]],102,5,true,true,true,true,'Varun\'s teal depth charged with Isaac\'s electric blue. Lightning underwater.',4000,2000)),
  R('oliver','ko',        A('deepgrove',  'Deep Grove',              4000000,'Cosmic',[[0,200,120],[40,180,80],[0,240,160],[80,220,100],[0,160,90]],145,6,true,false,true,true,'Oliver\'s emerald and Ko\'s forest green. A living, breathing aura.',7500,3500)),
];

export const MERGE_RECIPES = {};
for (const [key, val] of RECIPE_LIST) {
  MERGE_RECIPES[key] = val;
  if (!AURA_BY_ID[val.id]) { ALL_AURAS.push(val); AURA_BY_ID[val.id] = val; }
}

// ── Procedural helpers ────────────────────────────────────────────────────────
function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const PREFIXES = ['Arch','Hyper','Neo','Proto','Meta','Ultra','Infra','Omni','Para','Quasi'];
const CONNECTORS = ['flare','shade','surge','pulse','drift','bloom','rift','storm','void','light'];

function blendNames(nameA, nameB) {
  const a = nameA.replace("'s Aura","").replace(' Aura','').replace(/\s/g,'');
  const b = nameB.replace("'s Aura","").replace(' Aura','').replace(/\s/g,'');
  const seed = simpleHash(a + b);
  const rng = seededRandom(seed);
  const style = Math.floor(rng() * 4);
  if (style === 0) return a.slice(0, Math.max(2, Math.floor(a.length/2))) + b.slice(Math.max(2, Math.floor(b.length/2))).toLowerCase();
  if (style === 1) return PREFIXES[Math.floor(rng() * PREFIXES.length)] + a.slice(0,4);
  if (style === 2) return a.slice(0,4) + CONNECTORS[Math.floor(rng() * CONNECTORS.length)];
  return (a.length > 5 ? a.slice(0,5) : a) + (b.length > 5 ? b.slice(0,5) : b).toLowerCase();
}

function blendColors(ca, cb) {
  const out = [];
  for (let i = 0; i < Math.max(ca.length, cb.length); i++) {
    if (i < ca.length) out.push(ca[i]);
    if (i < cb.length) out.push(cb[i]);
  }
  return out.slice(0, 6);
}

function rarityToTier(r) {
  if (r >= 20000000) return '???';
  if (r >= 8000000)  return 'Godly';
  if (r >= 2000000)  return 'Cosmic';
  if (r >= 500000)   return 'Divine';
  if (r >= 100000)   return 'Mythic';
  if (r >= 30000)    return 'Legendary';
  if (r >= 8000)     return 'Epic';
  if (r >= 1000)     return 'Rare';
  if (r >= 100)      return 'Uncommon';
  return 'Common';
}

function bumpTier(tier) {
  const idx = TIER_ORDER.indexOf(tier);
  return TIER_ORDER[Math.min(idx + 1, TIER_ORDER.length - 1)];
}

function mergeSellValue(r) {
  if (r >= 20000000) return 50000;
  if (r >= 5000000)  return 10000;
  if (r >= 1000000)  return 4000;
  if (r >= 100000)   return 1000;
  if (r >= 10000)    return 300;
  if (r >= 1000)     return 80;
  if (r >= 100)      return 25;
  return 5;
}

// ── Core merge ────────────────────────────────────────────────────────────────
export function mergeAuras(auraA, auraB, existingMerged, freakyBoost = false) {
  const key = JSON.stringify([auraA.id, auraB.id].sort());

  // Named recipe?
  if (MERGE_RECIPES[key]) {
    let result = { ...MERGE_RECIPES[key] };
    if (freakyBoost) {
      result = { ...result, tier: bumpTier(result.tier), rarity: Math.floor(result.rarity * 3), sellValue: Math.floor(result.sellValue * 1.5) };
    }
    if (!AURA_BY_ID[result.id]) AURA_BY_ID[result.id] = result;
    existingMerged[result.id] = result;
    return result;
  }

  // Procedural ID
  const sorted = [auraA.id, auraB.id].sort();
  let mergeId = `m__${sorted[0]}__${sorted[1]}`;
  if (freakyBoost) mergeId += '__freaky';

  if (existingMerged[mergeId]) return existingMerged[mergeId];
  if (AURA_BY_ID[mergeId]) return AURA_BY_ID[mergeId];

  const seed = simpleHash(mergeId);
  const rng = seededRandom(seed);

  const name = blendNames(auraA.name, auraB.name);
  const colors = blendColors(auraA.colors, auraB.colors);
  let rarity = Math.max(50, Math.min(Math.round(Math.pow(auraA.rarity * auraB.rarity, 0.55)), 50000000));
  let tier = rarityToTier(rarity);
  if (freakyBoost) { tier = bumpTier(tier); rarity = Math.floor(rarity * 2.5); }

  const tierVal = tierRank(tier);
  const particles = Math.min(200, auraA.particles + auraB.particles);
  const rings = Math.min(8, Math.max(auraA.rings, auraB.rings) + (rng() > 0.5 ? 1 : 0));
  const lightning = auraA.lightning || auraB.lightning || tierVal >= 5;
  const starBurst = auraA.starBurst || auraB.starBurst || tierVal >= 4;
  const trail = auraA.trail || auraB.trail || tierVal >= 3;
  const sellValue = mergeSellValue(rarity);
  const xpReward = Math.max(auraA.xpReward, auraB.xpReward) + 20;

  const descs = [
    `A blend of ${auraA.name} and ${auraB.name}.`,
    `${auraA.name}'s essence fused with ${auraB.name}.`,
    `Neither ${auraA.name} nor ${auraB.name}, yet both.`,
  ];
  let description = descs[Math.floor(rng() * descs.length)];
  if (freakyBoost) description += ' (Freaky boosted!)';

  const result = { id: mergeId, name, rarity, tier, colors, particles, rings, pulse: true, lightning, starBurst, trail, description, sellValue, xpReward };
  existingMerged[mergeId] = result;
  AURA_BY_ID[mergeId] = result;
  return result;
}

export function auraToDict(a) {
  return { id:a.id, name:a.name, rarity:a.rarity, tier:a.tier, colors:a.colors.map(c=>[...c]),
    particles:a.particles, rings:a.rings, pulse:a.pulse, lightning:a.lightning,
    starBurst:a.starBurst, trail:a.trail, description:a.description,
    sellValue:a.sellValue, xpReward:a.xpReward };
}

export function auraFromDict(d) {
  return { id:d.id, name:d.name, rarity:d.rarity, tier:d.tier, colors:d.colors,
    particles:d.particles||40, rings:d.rings||2, pulse:d.pulse??true, lightning:d.lightning??false,
    starBurst:d.starBurst??false, trail:d.trail??false, description:d.description||'',
    sellValue:d.sellValue||10, xpReward:d.xpReward||20 };
}
