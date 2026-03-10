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
  Femboy:    [255,150,220],
  DIDDY:     [220,0,0],
  '???':     [255,255,255],
};

export const TIER_ORDER = [
  'Common','Uncommon','Rare','Epic','Legendary',
  'Mythic','Divine','Cosmic','Godly','Femboy','DIDDY','???'
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
function A(id, name, rarity, tier, colors, particles, rings, pulse, lightning, starBurst, trail, description, sellValue, xpReward, quote) {
  return { id, name, rarity, tier, colors, particles, rings, pulse, lightning, starBurst, trail, description, sellValue, xpReward, quote: quote || null };
}

export const ALL_AURAS = [
  // COMMON
  A('rish','Rish\'s Aura',8,'Common',[[200,180,140],[170,150,110],[220,200,160]],12,1,false,false,false,false,'Low-key and dependable. The background music of any group.',5,10),
  A('dan','Dan\'s Aura',10,'Common',[[150,170,190],[120,140,160],[170,190,210]],12,1,false,false,false,false,'Steady blue-gray energy. Reliable in a way that\'s easy to take for granted.',5,10),
  A('tom','Tom\'s Aura',12,'Common',[[170,180,120],[140,155,90],[190,200,140]],12,1,false,false,false,false,'Earthy and unassuming. Gets things done without making a scene.',5,10),
  A('andy','Andy\'s Aura',15,'Common',[[200,160,100],[170,130,70],[220,180,120]],12,1,false,false,false,false,'Warm muted orange. Consistent, calm, always there when needed.',5,10),
  A('ryan_liang','Ryan Liang\'s Aura',20,'Common',[[200,140,140],[170,110,110],[220,160,160]],12,1,false,false,false,false,'Soft rose tone. Quiet but leaves an impression.',5,10),
  A('anthony','Anthony\'s Aura',22,'Common',[[180,160,200],[150,130,175],[200,180,220]],14,1,false,false,false,false,'A quiet purple energy. More complex than it first appears.',5,10),

  // UNCOMMON
  A('james','James\'s Aura',80,'Uncommon',[[200,160,80],[255,200,100],[180,130,50]],24,1,true,false,false,false,'Warm golden energy. Carries old-school dignity wherever he goes.',25,30),
  A('saafir','Saafir\'s Aura',90,'Uncommon',[[60,100,200],[40,70,170],[80,130,230]],22,1,true,false,false,false,'Deep steady blue. The kind of person who shows up and gets it done.',25,30),
  A('elvin','Elvin\'s Aura',100,'Uncommon',[[80,160,80],[60,130,60],[100,190,100]],22,1,true,false,false,false,'Fresh forest energy. Grounded and easygoing.',25,30),
  A('william','William\'s Aura',110,'Uncommon',[[100,100,220],[70,70,190],[130,130,250]],22,1,true,false,false,false,'Royal blue composure. Doesn\'t rush. Always arrives at the right moment.',25,30),
  A('aniket','Aniket\'s Aura',120,'Uncommon',[[220,180,80],[190,150,50],[240,200,100]],22,1,true,false,false,false,'Warm amber glow. Curious energy that draws people in.',25,30),
  A('eason','Eason\'s Aura',140,'Uncommon',[[80,200,180],[60,170,150],[100,220,200]],22,1,true,false,false,false,'Refreshing teal. The kind of calm that spreads to everyone nearby.',25,30),
  A('yian','Yian\'s Aura',160,'Uncommon',[[180,120,220],[150,90,190],[200,150,240]],22,2,true,false,false,false,'Soft lavender pulse. Quiet but undeniably present.',25,30),
  A('alex_heo','Alex Heo\'s Aura',180,'Uncommon',[[80,200,220],[60,170,190],[100,220,240]],22,1,true,false,false,false,'Cool cyan breeze. Easy to underestimate — that\'s a mistake.',25,30),
  A('darrel','Darrel\'s Aura',200,'Uncommon',[[60,140,60],[40,110,40],[80,170,80]],22,1,true,false,false,false,'Dark forest green. Dependable and surprisingly deep.',25,30),
  A('allen','Allen\'s Aura',220,'Uncommon',[[120,140,170],[90,110,140],[150,170,200]],22,1,true,false,false,false,'Muted slate blue. Cool-headed under pressure.',25,30),
  A('aryan','Aryan\'s Aura',250,'Uncommon',[[220,170,80],[190,140,50],[240,190,100]],22,1,true,false,false,false,'Golden warmth. Knows exactly what he wants and moves toward it.',25,30),
  A('dylan','Dylan\'s Aura',280,'Uncommon',[[100,180,240],[70,150,210],[130,210,255]],22,1,true,false,false,false,'Sky blue daydream. Chill energy with hidden depth.',25,30),
  A('heian','Heian\'s Aura',320,'Uncommon',[[140,80,200],[110,50,170],[170,110,230]],22,2,true,false,false,false,'Deep violet stillness. Not loud, just powerful.',25,30),
  A('anhad','Anhad\'s Aura',360,'Uncommon',[[180,40,40],[150,20,20],[200,70,70]],24,2,true,false,false,false,'A quiet maroon intensity. Harbors more force than anyone expects. (Has a final form.)',25,30),
  A('ayaan','Ayaan\'s Aura',400,'Uncommon',[[120,220,180],[90,190,150],[150,240,200]],22,1,true,false,false,false,'Mint freshness. A genuinely good vibe wherever he goes.',25,30),
  A('ryan_sim','Ryan Sim\'s Aura',450,'Uncommon',[[60,140,200],[40,110,170],[80,170,230]],22,1,true,false,false,false,'Ocean breeze blue. Relaxed until it matters.',25,30),
  A('arman','Arman\'s Aura',500,'Uncommon',[[200,80,255],[140,40,200],[255,120,255]],38,3,true,false,false,true,'Electric violet ambition. Sets goals and quietly demolishes them.',25,30),
  A('jiarui','Jiarui\'s Aura',510,'Uncommon',[[80,180,140],[60,150,110],[100,210,170]],22,1,true,false,false,false,'Jade calm. Thoughtful and steady.',25,30),
  A('kai','Kai\'s Aura',560,'Uncommon',[[240,160,60],[210,130,30],[255,190,90]],24,1,true,false,false,false,'Bright warm orange. Lights up every room.',25,30),
  A('ethan_wu','Ethan Wu\'s Aura',580,'Uncommon',[[220,60,60],[190,30,30],[240,90,90]],22,1,true,false,false,false,'Crimson calm. Doesn\'t say much but the energy speaks.',25,30),
  A('logan','Logan\'s Aura',700,'Uncommon',[[160,120,80],[130,90,50],[190,150,110]],22,1,true,false,false,false,'Warm earthy tone. Laid-back but deeply reliable.',25,30),
  A('huanchen','Huanchen\'s Aura',800,'Uncommon',[[180,140,220],[150,110,190],[200,170,240]],22,2,true,false,false,false,'Soft lavender haze. Thoughtful and quietly clever.',25,30),
  A('hunter','Hunter\'s Aura',900,'Uncommon',[[80,150,70],[60,120,50],[100,180,90]],22,1,true,false,false,false,'Forest green steadiness. Built for the long game.',25,30),

  // RARE
  A('luis','Luis\'s Aura',1000,'Rare',[[255,80,30],[255,160,60],[200,40,0]],36,2,true,false,false,true,'Bold orange fire energy. Nobody\'s neutral about Luis.',80,60),
  A('edwin','Edwin\'s Aura',1200,'Rare',[[40,60,160],[20,40,130],[70,90,190]],36,2,true,false,false,false,'Deep navy gravity. Measured and precise.',80,60),
  A('vincent','Vincent\'s Aura',1400,'Rare',[[200,40,60],[170,20,40],[220,70,90]],36,2,true,false,false,false,'Dark crimson energy. Intense focus and hard to shake.',80,60),
  A('mri','Mri\'s Aura',1600,'Rare',[[240,180,200],[210,150,170],[255,200,220]],36,2,true,false,false,false,'Soft rose shimmer. Deceptively calm exterior.',80,60),
  A('jaydon','Jaydon\'s Aura',1800,'Rare',[[40,160,240],[20,130,210],[70,190,255]],36,2,true,false,false,false,'Electric cobalt. Quick-thinking and always in motion.',80,60),
  A('oscar_halvey','Oscar Halvey\'s Aura',2000,'Rare',[[150,170,80],[120,140,50],[180,200,110]],36,2,true,false,false,false,'Olive-gold field energy. Methodical and quietly effective.',80,60),
  A('ean','Ean\'s Aura',2200,'Rare',[[200,210,220],[170,180,190],[220,230,240]],36,2,true,false,false,false,'Platinum gleam. Crisp, clean energy.',80,60),
  A('jeremy','Jeremy\'s Aura',2500,'Rare',[[220,180,60],[190,150,30],[240,200,90]],36,2,true,false,false,true,'Amber-gold warmth. Makes things better just by being there.',80,60),
  A('michael','Michael\'s Aura',2800,'Rare',[[140,60,200],[110,30,170],[170,90,230]],36,2,true,false,false,false,'Royal purple presence. Principled and consistent.',80,60),
  A('brayden','Brayden\'s Aura',3000,'Rare',[[180,180,200],[140,140,170],[100,100,140]],36,2,true,false,false,false,'Quietly reliable. Doesn\'t say much but always shows up.',80,60),
  A('derrick','Derrick\'s Aura',3200,'Rare',[[100,130,180],[70,100,150],[130,160,210]],36,2,true,false,false,false,'Steel blue composure. Hardworking, no-nonsense.',80,60),
  A('nathan_liu','Nathan Liu\'s Aura',3500,'Rare',[[120,180,120],[90,150,90],[150,210,150]],36,2,true,false,false,false,'Sage green balance. Thoughtful and methodical.',80,60),
  A('eric','Eric\'s Aura',4000,'Rare',[[220,140,30],[255,180,60],[180,100,0],[255,220,100]],36,2,true,false,false,true,'Warm amber fire. The kind of energy that turns a boring day into a highlight reel.',80,60),
  A('armaan','Armaan\'s Aura',4500,'Rare',[[220,80,60],[190,50,30],[240,110,90]],36,2,true,false,false,false,'Warm red drive. Determined and always moving forward.',80,60),
  A('damon','Damon\'s Aura',5000,'Rare',[[100,100,120],[70,70,90],[130,130,150]],36,2,true,false,false,false,'Charcoal calm. Doesn\'t need the spotlight to get the job done.',80,60),
  A('xavier','Xavier\'s Aura',5500,'Rare',[[120,40,180],[90,20,150],[150,70,210]],36,2,true,false,false,false,'Dark violet edge. Inventive and unpredictable.',80,60),
  A('kevin_o','Kevin Ogrodowiak\'s Aura',6000,'Rare',[[60,140,80],[40,110,60],[90,170,110]],36,2,true,false,false,false,'Forest green grit. Solid work ethic wrapped in casual energy.',80,60),
  A('anindo','Anindo\'s Aura',6500,'Rare',[[40,200,220],[20,170,190],[70,230,240]],36,2,true,false,false,false,'Electric cyan clarity. Sharp mind, sharp aura.',80,60),
  A('callum','Callum\'s Aura',7000,'Rare',[[180,140,200],[150,110,170],[200,170,220]],36,2,true,false,false,false,'Heather purple. Balanced and carefully considered.',80,60),
  A('nethula','Nethula\'s Aura',7500,'Rare',[[160,30,50],[130,10,30],[190,60,80]],36,2,true,false,false,false,'Deep maroon intensity. Rare in the best way.',80,60),
  A('shin','Shin\'s Aura',8000,'Rare',[[140,200,240],[110,170,210],[170,220,255]],36,2,true,false,false,false,'Ice blue precision. Focused and technically sharp.',80,60),
  A('isaac','Isaac\'s Aura',8000,'Rare',[[60,200,255],[0,160,220],[120,230,255]],40,3,true,false,true,true,'Brilliant electric blue. Thinks fast and moves faster.',80,60),
  A('joshua','Joshua\'s Aura',9000,'Rare',[[210,170,80],[180,140,50],[230,190,110]],36,2,true,false,false,false,'Warm amber steadiness. Shows up prepared every time.',80,60),
  A('nabhya','Nabhya\'s Aura',9500,'Rare',[[220,160,140],[190,130,110],[240,190,170]],36,2,true,false,false,false,'Rose-gold shimmer. Gentle but never overlooked.',80,60),
  A('hemanth','Hemanth\'s Aura',10000,'Rare',[[80,220,80],[50,190,50],[110,240,110]],36,2,true,false,false,false,'Electric green energy. Driven and sharp.',80,60),
  A('benjamin','Benjamin\'s Aura',10500,'Rare',[[40,80,180],[20,50,150],[70,110,210]],36,2,true,false,false,false,'Deep ocean blue. Steady and dependable under any pressure.',80,60),
  A('khai','Khai\'s Aura',11000,'Rare',[[220,120,40],[190,90,20],[240,150,70]],36,2,true,false,false,false,'Burnt orange drive. Hard to stop once he gets going.',80,60),
  A('eric_wang','Eric Wang\'s Aura',11500,'Rare',[[100,80,220],[70,50,190],[130,110,240]],36,2,true,false,false,false,'Violet-blue calm. Precise thinking, effortless cool.',80,60),
  A('ian_wang','Ian Wang\'s Aura',12000,'Rare',[[160,190,240],[130,160,210],[190,220,255]],36,2,true,false,false,false,'Silver-blue clarity. Cool and measured. (His prime form is out there.)',80,60),
  A('leo','Leo\'s Aura',12500,'Rare',[[240,200,60],[210,170,30],[255,230,90]],36,2,true,false,false,true,'Golden warmth. Natural presence that commands attention without trying.',80,60),
  A('rex','Rex\'s Aura',13000,'Rare',[[200,40,40],[170,20,20],[220,70,70]],36,2,true,false,false,false,'Bold red force. Takes no shortcuts.',80,60),
  A('joseph','Joseph\'s Aura',13500,'Rare',[[180,140,100],[150,110,70],[200,170,130]],36,2,true,false,false,false,'Warm brown stability. The one you always want in your corner.',80,60),
  A('ryan_yan','Ryan Yan\'s Aura',14000,'Rare',[[100,220,200],[70,190,170],[130,240,220]],36,2,true,false,false,false,'Cool mint energy. Refreshing and reliably excellent.',80,60),
  A('pratyush','Pratyush\'s Aura',14500,'Rare',[[255,120,0],[255,200,60],[200,80,0],[255,240,160]],38,2,true,false,false,true,'Solar intensity. The guy who turns a normal day into something legendary.',80,60),
  A('ethan_yu','Ethan Yu\'s Aura',15000,'Rare',[[160,60,220],[130,30,190],[190,90,240]],36,2,true,false,false,false,'Electric purple flash. Unpredictable in the best way.',80,60),
  A('luke_zang','Luke Zang\'s Aura',15500,'Rare',[[40,160,160],[20,130,130],[70,190,190]],36,2,true,false,false,false,'Deep teal current. Calm and consistently underrated.',80,60),
  A('jacob','Jacob\'s Aura',16000,'Rare',[[200,170,120],[170,140,90],[220,200,150]],36,2,true,false,false,false,'Sandy warmth. Easy to be around, hard to forget.',80,60),
  A('john','John\'s Aura',16500,'Rare',[[100,140,200],[70,110,170],[130,170,230]],36,2,true,false,false,false,'Steel blue steadiness. Solid in every sense of the word.',80,60),
  A('jonathan','Jonathan\'s Aura',17000,'Rare',[[60,40,160],[40,20,130],[90,70,190]],36,2,true,false,false,false,'Deep indigo focus. Thoughtful and surprisingly relentless.',80,60),
  A('han','Han\'s Aura',17500,'Rare',[[220,190,100],[190,160,70],[240,210,130]],36,2,true,false,false,false,'Soft gold steadiness. Collected and dependable.',80,60),
  A('eric_zhuo','Eric Zhuo\'s Aura',18000,'Rare',[[220,100,40],[190,70,20],[240,130,70]],36,2,true,false,false,false,'Crimson-orange fire. Intense presence, hard to ignore.',80,60),
  A('edward','Edward\'s Aura',18500,'Rare',[[150,190,140],[120,160,110],[180,220,170]],36,2,true,false,false,false,'Sage green calm. Measured and unexpectedly wise.',80,60),
  A('ethan_lee','Ethan Lee\'s Aura',19000,'Rare',[[60,100,220],[40,70,190],[90,130,240]],36,2,true,false,false,false,'Cobalt blue precision. Focused and technically formidable.',80,60),
  A('martin','Martin\'s Aura',19500,'Rare',[[180,170,160],[150,140,130],[200,190,180]],36,2,true,false,false,false,'Warm neutral tone. Grounded and quietly consistent.',80,60),
  A('james_leong','James Leong\'s Aura',19800,'Rare',[[60,120,180],[40,90,150],[90,150,210]],36,2,true,false,false,false,'Forest blue clarity. Dependable in ways that matter.',80,60),

  // EPIC
  A('oliver','Oliver\'s Aura',20000,'Epic',[[0,220,140],[0,180,100],[100,255,180],[0,140,80]],54,3,true,false,true,true,'Deep emerald vitality. Effortlessly composed in every situation.',300,150),
  A('vardhan','Vardhan\'s Aura',22000,'Epic',[[160,40,255],[120,20,200],[200,80,255]],54,3,true,false,true,true,'Deep violet charge. Loud presence and a brain to back it up.',300,150),
  A('adhish','Adhish\'s Aura',24000,'Epic',[[255,140,0],[200,100,0],[255,200,60]],54,3,true,false,true,true,'Electric amber drive. Brings a kind of energy that changes the room.',300,150),
  A('alex_ding','Alex Ding\'s Aura',27000,'Epic',[[0,180,255],[0,140,200],[60,220,255]],54,3,true,false,true,true,'Cyber blue precision. Technical, methodical, always ahead.',300,150),
  A('nathan_ford','Nathan Ford\'s Aura',30000,'Epic',[[0,200,120],[0,160,90],[60,240,160]],54,3,true,false,true,true,'Emerald clarity. Efficient and surprisingly creative.',300,150),
  A('ethan_fung','Ethan Fung\'s Aura',33000,'Epic',[[255,160,120],[200,120,80],[255,200,160]],54,3,true,false,true,true,'Rose-gold warmth. Calm but carries unexpected depth.',300,150),
  A('jordan','Jordan\'s Aura',36000,'Epic',[[180,100,255],[140,60,220],[220,150,255]],56,3,true,false,true,true,'Sky purple presence. Charismatic and hard to one-up.',300,150),
  A('oscar_keris','Oscar Keris\'s Aura',40000,'Epic',[[220,180,40],[180,140,20],[255,220,80]],56,3,true,false,true,true,'Deep gold radiance. Understated confidence that always delivers.',300,150),
  A('lucas','Lucas\'s Aura',44000,'Epic',[[0,220,240],[0,180,200],[60,255,255]],56,3,true,false,true,true,'Electric cyan flash. Quick energy with sharp instincts.',300,150),
  A('micah','Micah\'s Aura',48000,'Epic',[[240,40,80],[200,20,50],[255,80,120]],56,3,true,false,true,true,'Crimson surge. Passionate and hard to argue with.',300,150),
  A('samarth','Samarth\'s Aura',52000,'Epic',[[0,200,160],[0,160,130],[60,240,200]],56,3,true,false,true,true,'Jade focus. Sharp intellect and calm execution.',300,150),
  A('sebastian','Sebastian\'s Aura',55000,'Epic',[[20,60,200],[10,40,170],[50,100,240]],56,3,true,false,true,true,'Deep navy glow. Reliable, precise, quietly formidable.',300,150),
  A('ko','Ko\'s Aura',58000,'Epic',[[60,220,120],[0,180,80],[180,255,180],[20,100,50]],56,3,true,false,false,true,'Forest green and quietly powerful. Rootlike. Grounded in everything.',300,150),
  A('oscar_pan','Oscar Pan\'s Aura',62000,'Epic',[[255,140,60],[200,100,40],[255,200,120]],56,3,true,false,true,true,'Sunset orange warmth. Confident and genuinely likeable.',300,150),
  A('naren','Naren\'s Aura',66000,'Epic',[[120,20,200],[90,10,170],[160,60,240]],56,3,true,true,true,true,'Deep purple pull. Gravitational presence in any room.',300,150),
  A('soumik','Soumik\'s Aura',70000,'Epic',[[0,220,200],[0,180,170],[60,255,230]],58,3,true,false,true,true,'Electric teal clarity. Incisive thinking and cool delivery.',300,150),
  A('james_soero','James Soerodjo\'s Aura',74000,'Epic',[[40,80,220],[20,50,190],[80,130,255]],58,3,true,false,true,true,'Royal blue steadiness. Built for high-pressure moments.',300,150),
  A('jamie_tjoe','Jamie Tjoe\'s Aura',78000,'Epic',[[240,180,60],[200,140,30],[255,220,100]],58,3,true,false,true,true,'Warm amber glow. Hardworking and effortlessly charming.',300,150),
  A('ethan_wang','Ethan Wang\'s Aura',82000,'Epic',[[0,180,100],[0,140,80],[60,220,140]],58,3,true,false,true,true,'Forest green ambition. Driven, bright, and completely underrated.',300,150),
  A('ivan','Ivan\'s Aura',86000,'Epic',[[180,20,60],[140,10,40],[220,60,100]],58,3,true,false,true,true,'Deep maroon intensity. A force of will wrapped in quiet confidence.',300,150),
  A('hevin','Hevin\'s Aura',90000,'Epic',[[180,80,255],[140,40,220],[220,130,255]],58,3,true,false,true,true,'Electric violet flash. Creative and unexpectedly powerful.',300,150),
  A('humphrey','Humphrey\'s Aura',95000,'Epic',[[0,160,220],[0,120,190],[60,200,255]],58,3,true,false,true,true,'Ocean blue composure. Thoughtful, measured, always prepared.',300,150),
  A('luqi','Luqi\'s Aura',100000,'Epic',[[0,240,220],[0,200,190],[60,255,240]],60,3,true,false,true,true,'Neon teal surge. Energetic and brilliantly perceptive.',300,150),
  A('abhiram','Abhiram\'s Aura',105000,'Epic',[[240,200,40],[200,160,20],[255,240,80]],60,3,true,false,true,true,'Warm gold focus. Strategic and always thinking three steps ahead.',300,150),
  A('aaron','Aaron\'s Aura',110000,'Epic',[[60,240,60],[40,200,40],[100,255,100]],60,3,true,false,true,true,'Electric green energy. Relentlessly positive and weirdly good at everything.',300,150),
  A('jaden','Jaden\'s Aura',115000,'Epic',[[100,60,240],[70,30,210],[140,100,255]],60,3,true,false,true,true,'Purple-blue flash. Fast thinking and hard to predict.',300,150),
  A('zachary','Zachary\'s Aura',120000,'Epic',[[240,120,0],[200,90,0],[255,170,60]],60,3,true,false,true,true,'Deep orange drive. Big energy, bigger results.',300,150),
  A('eric','Eric\'s Aura',125000,'Epic',[[180,60,255],[255,80,200],[120,0,200],[255,160,255]],62,4,true,false,true,true,'Iridescent violet. Unpredictable, creative, impossible to pin down.',300,150),
  A('kevin_zhu','Kevin Zhu\'s Aura',130000,'Epic',[[160,80,220],[120,50,190],[200,120,255]],62,4,true,false,true,true,'Amethyst pulse. Chill exterior hiding a very sharp interior.',300,150),
  A('max','Max\'s Aura',140000,'Epic',[[180,190,220],[150,160,190],[210,220,255]],62,4,true,false,true,true,'Silver-steel shimmer. Measured and quietly formidable. (Has a cosmic form.)',300,150),

  // LEGENDARY
  A('kim','Kim\'s Aura',200000,'Legendary',[[255,80,100],[255,180,160],[200,30,70],[255,220,200]],72,4,true,false,true,true,'Rose-gold warmth with a sharp edge underneath. Don\'t mistake kindness for softness.',1000,350,'Do you wanna fight me'),
  A('kaelan','Kaelan\'s Aura',500000,'Legendary',[[0,255,200],[0,220,255],[180,255,240],[0,180,160],[100,255,220]],72,4,true,false,true,true,'Crystalline cyan-green brilliance. Rare energy that shifts like deep water and northern lights.',1000,350),
  A('varun','Varun\'s Aura',600000,'Legendary',[[0,180,255],[0,220,200],[100,240,255]],72,4,true,false,false,true,'Fast, energetic, over-apologising F1 addict.',1000,350),

  // MYTHIC
  A('christian','Christian\'s Aura',700000,'Mythic',[[80,200,160],[100,240,180],[60,160,130]],80,5,true,true,true,true,'Minty and composed. The calmest person in any given crisis.',3000,800),
  A('jamie','Jamie Wu\'s Aura',750000,'Mythic',[[255,100,60],[255,60,30],[200,40,0],[255,200,160]],82,5,true,true,true,true,'Intense coral-fire presence. Shows up and immediately makes everything more interesting.',3000,800),
  A('ashton','Ashton\'s Aura',800000,'Mythic',[[255,180,0],[255,220,80],[200,140,0],[255,250,160]],80,5,true,true,true,true,'Golden brilliance with an edge. Effortlessly outshines and perfectly aware of it.',3000,800),
  A('brenden','Brenden\'s Aura',850000,'Mythic',[[170,180,160],[140,155,130],[195,205,185]],80,5,true,true,true,true,'Grounded. The kind of energy that makes a room feel calmer.',3000,800),
  A('swan','Swan\'s Aura',900000,'Mythic',[[255,255,255],[200,240,255],[180,220,255],[220,235,255]],80,5,true,true,true,false,'Soft luminescent white. Pure and poised like still water.',3000,800),
  A('jason','Jason\'s Aura',1000000,'Mythic',[[0,40,180],[0,100,255],[80,180,255],[0,20,100]],80,5,true,true,true,true,'Deep ocean blue. Calm, deep, and surprisingly powerful when pushed.',3000,800),
  A('kingston','Kingston\'s Aura',1200000,'Mythic',[[80,0,200],[140,20,255],[200,80,255],[40,0,150]],85,5,true,true,true,true,'Royal deep purple dominance. Rare, regal, impossible to ignore.',3000,800),
  A('avi','Avi\'s Aura',1500000,'Mythic',[[255,220,0],[255,170,0],[200,100,0],[255,255,120]],85,5,true,true,true,true,'Pure solar gold — bright, loud, and impossible to ignore.',3000,800),
  A('roy','Roy\'s Aura',2000000,'Mythic',[[220,40,40],[255,80,60],[160,20,20],[255,120,100]],88,5,true,true,true,true,'Sharp crimson intensity. Cuts right to the point and never looks back.',3000,800,'You kinda suck'),
  A('karna','Karna\'s Aura',2500000,'Mythic',[[255,200,0],[255,120,0],[255,255,100],[200,60,0],[255,240,180]],95,5,true,true,true,true,'A warrior born of the sun. Solar gold and raging fire — the brightest aura on the battlefield.',3000,800),

  // COSMIC
  A('slurring_max','Slurring Max\'s Aura',25000000,'Cosmic',[[200,200,255],[160,160,255],[100,100,200],[220,180,255],[255,220,255]],120,6,true,true,true,true,'Max\'s transcended form. Words don\'t come easy but the power is undeniable.',5000,1500),
  A('wrecking_ball','Wrecking Ball\'s Aura',35000000,'Cosmic',[[255,80,0],[255,200,0],[200,40,0],[255,255,80],[180,0,0]],120,6,true,true,true,true,'Anhad\'s final form. A force of pure destruction disguised as a quiet kid.',5000,1500),
  A('juno','Juno\'s Aura',50000000,'Cosmic',[[220,60,255],[255,100,200],[140,0,255],[255,160,255],[80,0,180]],120,6,true,true,true,true,'Vivid violet pulls everything into its orbit. Cosmic-grade gravity.',5000,1500,'High five!'),
  A('swimswamswan','SwimswamSwan\'s Aura',60000000,'Cosmic',[[255,255,255],[200,230,255],[180,210,255],[255,240,255],[120,200,255]],120,6,true,true,true,true,'Swan at her absolute peak. So luminous it barely exists in this plane.',5000,1500),
  A('yiran','Yiran\'s Aura',80000000,'Cosmic',[[80,200,255],[0,240,255],[180,255,255],[0,180,240],[255,255,255]],120,6,true,true,true,true,'Ian Wang\'s prime manifestation. Cool, precise, and impossibly rare.',5000,1500),

  // GODLY
  A('joel','Joel\'s Aura',100000000,'Godly',[[255,120,0],[255,220,60],[255,60,0],[255,255,140],[200,80,0]],160,7,true,true,true,true,'A cosmic wildfire. The original flame. Somehow warmer than a star.',20000,5000),

  // FEMBOY
  A('warren','Warren\'s Aura',200000000,'Femboy',[[0,200,180],[0,255,220],[20,80,100],[180,255,240],[200,240,255]],120,6,true,true,true,true,'Deep teal currents — calm on the surface, powerful underneath. One in twenty million.',50000,10000,'(high pitched voice)'),

  // DIDDY
  A('romit','Romit\'s Aura',5000000000,'DIDDY',[[220,0,0],[255,30,0],[180,0,30],[255,80,0],[100,0,0]],200,8,true,true,true,true,'The unspeakable tier. Odds so low they shouldn\'t exist. Nobody knows how this got here.',100000,25000,'I will touch you'),
];

export const AURA_BY_ID = {};
for (const a of ALL_AURAS) AURA_BY_ID[a.id] = a;
