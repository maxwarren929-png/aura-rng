"""
merge.py — Aura merging system.

Every combination of two auras produces a unique result:
  1. Named recipes  — hand-crafted thematic results
  2. Procedural     — everything else gets a generated AuraDef

Freaky enchantment: boosts result one tier higher when active.
"""
import random
import math
import hashlib
from typing import Dict, Optional, Tuple
from dataclasses import dataclass

from auras import AuraDef, ALL_AURAS, AURA_BY_ID, TIER_ORDER, TIER_COLORS, tier_rank

Color = Tuple[int, int, int]


# ── Named recipes ─────────────────────────────────────────────────────────────
def _r(id_a, id_b, result: AuraDef):
    return (frozenset([id_a, id_b]), result)


_RECIPE_LIST = [
    # ── Person combos ─────────────────────────────────────────────────────────
    _r("joel", "juno",
        AuraDef("joeljuno",   "Joel × Juno",      50_000_000, "???",
                [(255,120,0),(220,60,255),(255,220,60),(140,0,255),(255,255,140)],
                200,8,True,True,True,True,
                "The unstoppable force meets the immovable object. Reality bends.", 99999, 99999)),

    _r("joel", "karna",
        AuraDef("solflame",   "Solar Flame",       20_000_000, "Godly",
                [(255,80,0),(255,220,0),(200,40,0),(255,255,120),(255,160,0)],
                180,8,True,True,True,True,
                "Joel's cosmic fire fused with Karna's warrior sun. Blinding.", 30000, 15000)),

    _r("juno", "kaelan",
        AuraDef("cyberviolet","Cyber Violet",      15_000_000, "Godly",
                [(200,0,255),(0,240,200),(140,0,255),(100,255,220),(255,100,255)],
                170,7,True,True,True,True,
                "Juno's gravity pulls Kaelan's aurora light into a perfect vortex.", 25000, 10000)),

    _r("karna", "avi",
        AuraDef("solarkings", "Solar Kings",        8_000_000, "Cosmic",
                [(255,200,0),(255,100,0),(200,80,0),(255,255,100),(180,60,0)],
                160,7,True,True,True,True,
                "Two golden titans collide. The sky burns gold.", 12000, 6000)),

    _r("joel", "avi",
        AuraDef("goldfire",   "Gold Fire",          12_000_000, "Godly",
                [(255,140,0),(255,220,0),(255,60,0),(255,255,160),(200,100,0)],
                165,7,True,True,True,True,
                "Joel's wildfire meets Avi's solar gold. You can't look away.", 18000, 8000)),

    _r("kim", "juno",
        AuraDef("roseviolet", "Rose Violet",        6_000_000, "Cosmic",
                [(255,80,160),(200,0,255),(255,160,220),(140,0,200),(255,200,240)],
                150,6,True,True,True,True,
                "Kim's warmth wraps around Juno's gravity. Dangerously beautiful.", 8000, 4000)),

    _r("jason", "warren",
        AuraDef("deepocean",  "Deep Ocean",         2_000_000, "Divine",
                [(0,40,180),(0,160,180),(0,80,255),(0,200,220),(0,20,100)],
                120,6,True,True,False,True,
                "Two ocean energies united. Calm but utterly overwhelming.", 5000, 2000)),

    _r("ko", "oliver",
        AuraDef("grove",      "Grove Spirit",       3_000_000, "Cosmic",
                [(40,180,80),(0,220,140),(120,255,160),(20,120,50),(100,255,180)],
                140,6,True,False,True,True,
                "Forest meets forest. A living canopy aura.", 6000, 3000)),

    _r("pratyush", "isaac",
        AuraDef("solarbolt",  "Solar Bolt",         4_000_000, "Cosmic",
                [(255,120,0),(60,200,255),(255,200,60),(0,160,220),(255,240,160)],
                145,6,True,True,True,True,
                "Pratyush's solar fire arced through Isaac's lightning. Devastating.", 7000, 3500)),

    _r("mri", "ashton",
        AuraDef("pinkpurple", "Pink Storm",         1_500_000, "Mythic",
                [(255,80,180),(180,60,255),(255,140,220),(120,0,200),(255,200,240)],
                110,5,True,True,True,True,
                "Mri's purple chaos meets Ashton's bold pink energy. Extremely loud.", 4000, 2000)),

    _r("swan", "kim",
        AuraDef("pearlrose",  "Pearl Rose",         2_500_000, "Divine",
                [(255,255,255),(255,180,200),(220,240,255),(255,140,180),(200,220,255)],
                125,6,True,False,True,True,
                "Swan's white purity tinged with Kim's rose warmth. Ethereal.", 5000, 2500)),

    _r("arman", "mri",
        AuraDef("violetdream","Violet Dream",        3_500_000, "Cosmic",
                [(180,60,255),(200,80,255),(140,40,200),(255,120,255),(100,0,180)],
                140,6,True,True,True,True,
                "Double violet energy. The most electric combination possible.", 7000, 3000)),

    _r("luis", "jamie",
        AuraDef("inferno2",   "Double Inferno",     1_000_000, "Mythic",
                [(255,80,20),(255,140,0),(255,60,0),(200,40,0),(255,200,80)],
                100,5,True,True,True,True,
                "Luis's bold fire plus Jamie's coral heat. The room is on fire.", 3500, 1800)),

    _r("varun", "christian",
        AuraDef("mintblue",   "Mint & Blue",          600_000, "Mythic",
                [(0,200,180),(80,200,160),(0,180,255),(100,240,180),(0,140,200)],
                92,5,True,False,True,True,
                "Varun's teal clarity and Christian's mint calm. A perfect harmony.", 3000, 1500)),

    _r("max", "james",
        AuraDef("goldflash",  "Gold Flash",           800_000, "Mythic",
                [(255,220,0),(255,180,60),(200,140,0),(255,240,120),(220,160,0)],
                96,5,True,True,True,True,
                "Max's electric yellow and James's warm gold. Constantly moving.", 3200, 1600)),

    _r("roy", "jason",
        AuraDef("bloodocean", "Blood & Ocean",       2_000_000, "Divine",
                [(200,20,20),(0,80,200),(255,60,40),(0,140,255),(160,0,0)],
                125,6,True,True,False,True,
                "Roy's sharp crimson cuts through Jason's ocean blue. Dramatic.", 5000, 2200)),

    _r("brenden", "john",
        AuraDef("calmstone",  "Calm Stone",           200_000, "Legendary",
                [(170,175,165),(150,160,150),(190,195,185),(140,150,140)],
                70,4,True,False,False,True,
                "Two quiet auras. Calmer than a library. More powerful than it looks.", 1200, 500)),

    _r("anthony", "romit",
        AuraDef("softlight",  "Soft Light",            350_000, "Legendary",
                [(190,170,210),(180,160,200),(210,190,225),(160,140,180)],
                76,4,True,False,True,True,
                "Two underrated energies combining into something unexpectedly beautiful.", 1200, 550)),

    _r("kaelan", "joel",
        AuraDef("aurorfire",  "Aurora Fire",          30_000_000, "???",
                [(0,255,200),(255,120,0),(0,220,255),(255,200,60),(100,255,220)],
                195,8,True,True,True,True,
                "Kaelan's northern lights meet Joel's eternal flame. The sky itself ignites.", 99999, 50000)),

    _r("brayden", "anthony",
        AuraDef("quietforce", "Quiet Force",           150_000, "Legendary",
                [(175,175,195),(185,165,205),(155,155,175),(165,145,185)],
                68,4,True,False,False,True,
                "Two understated auras forming a quiet, undeniable power.", 1000, 400)),

    _r("varun", "isaac",
        AuraDef("electricsea","Electric Sea",         1_200_000, "Mythic",
                [(0,200,255),(60,180,255),(0,240,200),(100,220,255),(0,160,255)],
                102,5,True,True,True,True,
                "Varun's teal depth charged with Isaac's electric blue. Lightning underwater.", 4000, 2000)),

    _r("oliver", "ko",
        AuraDef("deepgrove",  "Deep Grove",          4_000_000, "Cosmic",
                [(0,200,120),(40,180,80),(0,240,160),(80,220,100),(0,160,90)],
                145,6,True,False,True,True,
                "Oliver's emerald and Ko's forest green. A living, breathing aura.", 7500, 3500)),
]

MERGE_RECIPES: Dict[frozenset, AuraDef] = {key: val for key, val in _RECIPE_LIST}

# Register recipe results into the global lookup
for _recipe_aura in MERGE_RECIPES.values():
    if _recipe_aura.id not in AURA_BY_ID:
        ALL_AURAS.append(_recipe_aura)
        AURA_BY_ID[_recipe_aura.id] = _recipe_aura


# ── Procedural name blending ───────────────────────────────────────────────────
_PREFIXES = ["Arch","Hyper","Neo","Proto","Meta","Ultra","Infra","Omni","Para","Quasi"]
_CONNECTORS = ["flare","shade","surge","pulse","drift","bloom","rift","storm","void","light"]


def _blend_names(name_a: str, name_b: str) -> str:
    a = name_a.replace("'s Aura","").replace(" Aura","").replace(" ","")
    b = name_b.replace("'s Aura","").replace(" Aura","").replace(" ","")
    seed = int(hashlib.md5((a+b).encode()).hexdigest()[:8], 16)
    rng  = random.Random(seed)
    style = rng.randint(0, 3)
    if style == 0:
        split_a = max(2, len(a)//2)
        split_b = max(2, len(b)//2)
        return a[:split_a] + b[split_b:].lower()
    elif style == 1:
        return rng.choice(_PREFIXES) + a[:4]
    elif style == 2:
        return a[:4] + rng.choice(_CONNECTORS)
    else:
        short_a = a[:5] if len(a) > 5 else a
        short_b = b[:5] if len(b) > 5 else b
        return short_a + short_b.lower()


def _blend_colors(colors_a, colors_b):
    merged = []
    for i in range(max(len(colors_a), len(colors_b))):
        if i < len(colors_a): merged.append(colors_a[i])
        if i < len(colors_b): merged.append(colors_b[i])
    return merged[:6] if merged else [(255,255,255)]


def _rarity_to_tier(rarity: int) -> str:
    if rarity >= 20_000_000: return "???"
    if rarity >= 8_000_000:  return "Godly"
    if rarity >= 2_000_000:  return "Cosmic"
    if rarity >= 500_000:    return "Divine"
    if rarity >= 100_000:    return "Mythic"
    if rarity >= 30_000:     return "Legendary"
    if rarity >= 8_000:      return "Epic"
    if rarity >= 1_000:      return "Rare"
    if rarity >= 100:        return "Uncommon"
    return "Common"


def _bump_tier(tier: str) -> str:
    """Move up one tier (for freaky enchantment)."""
    idx = TIER_ORDER.index(tier) if tier in TIER_ORDER else 0
    return TIER_ORDER[min(idx + 1, len(TIER_ORDER) - 1)]


def _merge_sell_value(rarity: int) -> int:
    if rarity >= 20_000_000: return 50000
    if rarity >= 5_000_000:  return 10000
    if rarity >= 1_000_000:  return 4000
    if rarity >= 100_000:    return 1000
    if rarity >= 10_000:     return 300
    if rarity >= 1_000:      return 80
    if rarity >= 100:        return 25
    return 5


# ── Core merge function ────────────────────────────────────────────────────────
def merge_auras(aura_a: AuraDef, aura_b: AuraDef,
                existing_merged: Dict[str, AuraDef],
                freaky_boost: bool = False) -> AuraDef:
    key = frozenset([aura_a.id, aura_b.id])

    # 1. Named recipe?
    if key in MERGE_RECIPES:
        result = MERGE_RECIPES[key]
        # Apply freaky boost on top of named recipe
        if freaky_boost:
            new_tier = _bump_tier(result.tier)
            from dataclasses import replace
            result = replace(result, tier=new_tier,
                             rarity=int(result.rarity * 3),
                             sell_value=int(result.sell_value * 1.5))
        if result.id not in AURA_BY_ID:
            AURA_BY_ID[result.id] = result
        existing_merged[result.id] = result
        return result

    # 2. Already computed procedurally?
    sorted_ids = sorted([aura_a.id, aura_b.id])
    merge_id   = f"m__{sorted_ids[0]}__{sorted_ids[1]}"
    if freaky_boost:
        merge_id += "__freaky"

    if merge_id in existing_merged:
        return existing_merged[merge_id]
    if merge_id in AURA_BY_ID:
        return AURA_BY_ID[merge_id]

    # 3. Generate procedurally (deterministic from ids)
    seed  = int(hashlib.md5(merge_id.encode()).hexdigest()[:8], 16)
    rng   = random.Random(seed)

    name   = _blend_names(aura_a.name, aura_b.name)
    colors = _blend_colors(aura_a.colors, aura_b.colors)

    rarity = int((aura_a.rarity * aura_b.rarity) ** 0.55)
    rarity = max(50, min(rarity, 50_000_000))

    tier     = _rarity_to_tier(rarity)
    if freaky_boost:
        tier = _bump_tier(tier)
        rarity = int(rarity * 2.5)

    tier_val = tier_rank(tier)

    particles  = min(200, aura_a.particles + aura_b.particles)
    ring_count = min(8, max(aura_a.ring_count, aura_b.ring_count) + rng.randint(0, 1))
    pulse      = True
    lightning  = aura_a.lightning or aura_b.lightning or tier_val >= 5
    star_burst = aura_a.star_burst or aura_b.star_burst or tier_val >= 4
    trail      = aura_a.trail or aura_b.trail or tier_val >= 3

    sell_val = _merge_sell_value(rarity)
    xp_val   = max(aura_a.xp_reward, aura_b.xp_reward) + 20

    desc_templates = [
        f"A blend of {aura_a.name} and {aura_b.name}.",
        f"{aura_a.name}'s essence fused with {aura_b.name}.",
        f"Neither {aura_a.name} nor {aura_b.name}, yet both.",
        f"What happens when {aura_a.name} meets {aura_b.name}.",
    ]
    desc = rng.choice(desc_templates)
    if freaky_boost:
        desc += " (Freaky boosted!)"

    result = AuraDef(
        id=merge_id, name=name, rarity=rarity, tier=tier,
        colors=colors, particles=particles, ring_count=ring_count,
        pulse=pulse, lightning=lightning, star_burst=star_burst, trail=trail,
        description=desc, sell_value=sell_val, xp_reward=xp_val,
    )

    existing_merged[merge_id] = result
    AURA_BY_ID[merge_id] = result
    return result


def get_aura(aura_id: str, merged_dict: Dict[str, AuraDef]) -> Optional[AuraDef]:
    if aura_id in AURA_BY_ID:
        return AURA_BY_ID[aura_id]
    return merged_dict.get(aura_id)


def aura_to_dict(aura: AuraDef) -> dict:
    return {
        "id": aura.id, "name": aura.name, "rarity": aura.rarity,
        "tier": aura.tier, "colors": [list(c) for c in aura.colors],
        "particles": aura.particles, "ring_count": aura.ring_count,
        "pulse": aura.pulse, "lightning": aura.lightning,
        "star_burst": aura.star_burst, "trail": aura.trail,
        "description": aura.description, "sell_value": aura.sell_value,
        "xp_reward": aura.xp_reward,
    }


def aura_from_dict(d: dict) -> AuraDef:
    return AuraDef(
        id=d["id"], name=d["name"], rarity=d["rarity"], tier=d["tier"],
        colors=[tuple(c) for c in d["colors"]],
        particles=d.get("particles", 40), ring_count=d.get("ring_count", 2),
        pulse=d.get("pulse", True), lightning=d.get("lightning", False),
        star_burst=d.get("star_burst", False), trail=d.get("trail", False),
        description=d.get("description", ""), sell_value=d.get("sell_value", 10),
        xp_reward=d.get("xp_reward", 20),
    )