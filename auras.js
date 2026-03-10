// auras.js — All aura definitions

export const TIER_COLORS = {
  Common:    [160,160,160],
  Uncommon:  [80,220,80],
  Rare:      [80,140,255],
  Epic:      [180,80,255],
  Legendary: [255,165,0],
  Mythic:    [255,60,60],
  Divine:    [255,230,80],
  Cosmic:    [120,255,255],
  Godly:     [255,80,200],
  '???':     [255,255,255],
};

export const TIER_ORDER = [
  'Common','Uncommon','Rare','Epic','Legendary',
  'Mythic','Divine','Cosmic','Godly','???'
];

export function tierRank(tier) {
  const i = TIER_ORDER.indexOf(tier);
  return i === -1 ? 0 : i;
}

export function rarityStr(r) {
  return `1 in ${r.toLocaleString()}`;
}

export function cssColor(rgb) {
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

// AuraDef factory
function A(id, name, rarity, tier, colors, particles, rings, pulse, lightning, starBurst, trail, description, sellValue, xpReward) {
  return { id, name, rarity, tier, colors, particles, rings, pulse, lightning, starBurst, trail, description, sellValue, xpReward };
}

export const ALL_AURAS = [
  // COMMON
  A('brayden','Brayden\'s Aura',10,'Common',[[180,180,200],[140,140,170],[100,100,140]],12,1,false,false,false,false,'Quietly reliable. Doesn\'t say much but always shows up.',5,10),
  A('romit','Romit\'s Aura',14,'Common',[[200,190,160],[170,160,130],[220,210,180]],12,1,false,false,false,false,'Warm and steady. The kind of aura that never causes drama.',5,10),
  A('john','John\'s Aura',18,'Common',[[160,170,180],[130,140,155],[190,200,210]],12,1,false,false,false,false,'Solid. Dependable. The most average aura in the best way possible.',5,10),
  A('anthony','Anthony\'s Aura',22,'Common',[[180,160,200],[150,130,175],[200,180,220]],14,1,false,false,false,false,'A quiet purple energy. More complex than it first appears.',5,10),
  A('brenden','Brenden\'s Aura',28,'Common',[[170,180,160],[140,155,130],[195,205,185]],12,1,false,false,false,false,'Grounded. The kind of energy that makes a room feel calmer.',5,10),
  // UNCOMMON
  A('varun','Varun\'s Aura',60,'Uncommon',[[0,180,255],[0,220,200],[100,240,255]],22,1,true,false,false,false,'Cool teal clarity. Sharp and collected under pressure.',25,30),
  A('james','James\'s Aura',80,'Uncommon',[[200,160,80],[255,200,100],[180,130,50]],24,1,true,false,false,false,'Warm golden energy. Carries old-school dignity wherever he goes.',25,30),
  A('jamie','Jamie\'s Aura',100,'Uncommon',[[255,140,100],[255,100,80],[200,80,60]],24,2,true,false,false,false,'Energetic coral fire. Shows up and immediately makes things interesting.',25,30),
  A('christian','Christian\'s Aura',130,'Uncommon',[[80,200,160],[100,240,180],[60,160,130]],22,1,true,false,false,false,'Minty and composed. The calmest person in any given crisis.',25,30),
  A('ashton','Ashton\'s Aura',180,'Uncommon',[[255,80,120],[255,130,150],[200,50,90]],26,2,true,false,false,true,'Vivid pink energy. Confident, loud, and unapologetically himself.',25,30),
  A('max','Max\'s Aura',220,'Uncommon',[[255,200,0],[255,230,80],[200,155,0]],24,2,true,false,false,false,'Bright yellow buzz. Restless, curious, and always two steps ahead.',25,30),
  // RARE
  A('luis','Luis\'s Aura',600,'Rare',[[255,80,30],[255,160,60],[200,40,0]],36,2,true,false,false,true,'Bold orange fire energy. Nobody\'s neutral about Luis.',80,60),
  A('swan','Swan\'s Aura',900,'Rare',[[255,255,255],[200,240,255],[180,220,255],[220,235,255]],34,2,true,false,false,false,'Soft luminescent white. Pure and poised like still water.',80,60),
  A('arman','Arman\'s Aura',1500,'Rare',[[200,80,255],[140,40,200],[255,120,255]],38,3,true,false,false,true,'Electric violet ambition. Sets goals and quietly demolishes them.',80,60),
  A('roy','Roy\'s Aura',2500,'Rare',[[220,40,40],[255,80,60],[160,20,20]],36,2,true,false,false,true,'Sharp crimson intensity. Cuts right to the point. Hates small talk.',80,60),
  A('isaac','Isaac\'s Aura',4000,'Rare',[[60,200,255],[0,160,220],[120,230,255]],40,3,true,false,true,true,'Brilliant electric blue. Thinks fast and moves faster.',80,60),
  // EPIC
  A('oliver','Oliver\'s Aura',12000,'Epic',[[0,220,140],[0,180,100],[100,255,180],[0,140,80]],54,3,true,false,true,true,'Deep emerald vitality. Effortlessly composed in every situation.',300,150),
  A('warren','Warren\'s Aura',20000,'Epic',[[0,200,180],[0,255,220],[20,80,100],[180,255,240]],58,4,true,false,false,true,'Deep teal currents — calm on the surface, powerful underneath.',300,150),
  A('ko','Ko\'s Aura',35000,'Epic',[[60,220,120],[0,180,80],[180,255,180],[20,100,50]],56,3,true,false,false,true,'Forest green and quietly powerful. Rootlike. Grounded in everything.',300,150),
  A('pratyush','Pratyush\'s Aura',60000,'Epic',[[255,120,0],[255,200,60],[200,80,0],[255,240,160]],60,4,true,true,true,true,'Solar intensity. The guy who turns a normal day into something legendary.',300,150),
  A('mri','Mri\'s Aura',80000,'Epic',[[180,60,255],[255,80,200],[120,0,200],[255,160,255]],62,4,true,false,true,true,'Iridescent violet. Unpredictable, creative, impossible to pin down.',300,150),
  // LEGENDARY
  A('kim','Kim\'s Aura',150000,'Legendary',[[255,80,100],[255,180,160],[200,30,70],[255,220,200]],72,4,true,false,true,true,'Rose-gold warmth with a sharp edge underneath. Don\'t mistake kindness for softness.',1000,350),
  A('jason','Jason\'s Aura',250000,'Legendary',[[0,40,180],[0,100,255],[80,180,255],[0,20,100]],76,4,true,false,true,true,'Deep ocean blue. Calm, deep, and surprisingly powerful when pushed.',1000,350),
  A('avi','Avi\'s Aura',400000,'Legendary',[[255,220,0],[255,170,0],[200,100,0],[255,255,120]],80,5,true,true,true,true,'Pure solar gold — bright, loud, and impossible to ignore.',1000,350),
  // MYTHIC
  A('kaelan','Kaelan\'s Aura',1200000,'Mythic',[[0,255,200],[0,220,255],[180,255,240],[0,180,160],[100,255,220]],90,5,true,true,true,true,'Crystalline cyan-green brilliance. Rare energy that shifts like deep water and northern lights.',3000,800),
  A('karna','Karna\'s Aura',2500000,'Mythic',[[255,200,0],[255,120,0],[255,255,100],[200,60,0],[255,240,180]],95,5,true,true,true,true,'A warrior born of the sun. Solar gold and raging fire — the brightest aura on the battlefield.',3000,800),
  // COSMIC/GODLY
  A('juno','Juno\'s Aura',5000000,'Cosmic',[[220,60,255],[255,100,200],[140,0,255],[255,160,255],[80,0,180]],120,6,true,true,true,true,'Vivid violet pulls everything into its orbit. Cosmic-grade gravity.',5000,1500),
  A('joel','Joel\'s Aura',10000000,'Godly',[[255,120,0],[255,220,60],[255,60,0],[255,255,140],[200,80,0]],160,7,true,true,true,true,'A cosmic wildfire. The original flame. Somehow warmer than a star.',20000,5000),
];

export const AURA_BY_ID = {};
for (const a of ALL_AURAS) AURA_BY_ID[a.id] = a;