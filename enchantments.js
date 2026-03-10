// enchantments.js

export const ALL_ENCHANTMENTS = [
  { id:'fatass',  name:'Fatass',   icon:'🍔', description:'Your character becomes 2× bigger. Big energy. Enormous presence.',             cost:500,  color:[220,160,80]  },
  { id:'gay',     name:'Gay',      icon:'🌈', description:'Your aura cycles through the full rainbow spectrum continuously. Iconic.',      cost:800,  color:[255,80,180]  },
  { id:'freaky',  name:'Freaky',   icon:'👅', description:'When merging, results come out one tier higher than normal. Freak the algorithm.', cost:1500, color:[180,0,255]   },
  { id:'glowup',  name:'Glow Up',  icon:'✨', description:'Your aura glows at double intensity with extra particles and a halo crown.',    cost:1200, color:[255,220,80]  },
];

export const ENCHANTMENT_BY_ID = {};
for (const e of ALL_ENCHANTMENTS) ENCHANTMENT_BY_ID[e.id] = e;