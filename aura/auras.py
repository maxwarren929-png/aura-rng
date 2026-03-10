"""
auras.py — All aura definitions. Only named personal auras exist.
"""
from dataclasses import dataclass
from typing import Dict, List, Tuple

Color = Tuple[int, int, int]


@dataclass
class AuraDef:
    id: str
    name: str
    rarity: int
    tier: str
    colors: List[Color]
    particles: int
    ring_count: int
    pulse: bool
    lightning: bool
    star_burst: bool
    trail: bool
    description: str
    sell_value: int
    xp_reward: int


# ── Tier palette ──────────────────────────────────────────────────────────────
TIER_COLORS = {
    "Common":    (160, 160, 160),
    "Uncommon":  (80,  220,  80),
    "Rare":      (80,  140, 255),
    "Epic":      (180,  80, 255),
    "Legendary": (255, 165,   0),
    "Mythic":    (255,  60,  60),
    "Divine":    (255, 230,  80),
    "Cosmic":    (120, 255, 255),
    "Godly":     (255,  80, 200),
    "???":       (255, 255, 255),
}

TIER_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Legendary",
              "Mythic", "Divine", "Cosmic", "Godly", "???"]

# ── All auras: named personal auras only ─────────────────────────────────────
ALL_AURAS: List[AuraDef] = [

    # ─── COMMON ──────────────────────────────────────────────────────────────
    AuraDef("brayden", "Brayden's Aura", 10, "Common",
            [(180, 180, 200), (140, 140, 170), (100, 100, 140)],
            12, 1, False, False, False, False,
            "Quietly reliable. Doesn't say much but always shows up.", 5, 10),

    AuraDef("romit", "Romit's Aura", 14, "Common",
            [(200, 190, 160), (170, 160, 130), (220, 210, 180)],
            12, 1, False, False, False, False,
            "Warm and steady. The kind of aura that never causes drama.", 5, 10),

    AuraDef("john", "John's Aura", 18, "Common",
            [(160, 170, 180), (130, 140, 155), (190, 200, 210)],
            12, 1, False, False, False, False,
            "Solid. Dependable. The most average aura in the best way possible.", 5, 10),

    AuraDef("anthony", "Anthony's Aura", 22, "Common",
            [(180, 160, 200), (150, 130, 175), (200, 180, 220)],
            14, 1, False, False, False, False,
            "A quiet purple energy. More complex than it first appears.", 5, 10),

    AuraDef("brenden", "Brenden's Aura", 28, "Common",
            [(170, 180, 160), (140, 155, 130), (195, 205, 185)],
            12, 1, False, False, False, False,
            "Grounded. The kind of energy that makes a room feel calmer.", 5, 10),

    # ─── UNCOMMON ─────────────────────────────────────────────────────────────
    AuraDef("varun", "Varun's Aura", 60, "Uncommon",
            [(0, 180, 255), (0, 220, 200), (100, 240, 255)],
            22, 1, True, False, False, False,
            "Cool teal clarity. Sharp and collected under pressure.", 25, 30),

    AuraDef("james", "James's Aura", 80, "Uncommon",
            [(200, 160, 80), (255, 200, 100), (180, 130, 50)],
            24, 1, True, False, False, False,
            "Warm golden energy. Carries old-school dignity wherever he goes.", 25, 30),

    AuraDef("jamie", "Jamie's Aura", 100, "Uncommon",
            [(255, 140, 100), (255, 100, 80), (200, 80, 60)],
            24, 2, True, False, False, False,
            "Energetic coral fire. Shows up and immediately makes things interesting.", 25, 30),

    AuraDef("christian", "Christian's Aura", 130, "Uncommon",
            [(80, 200, 160), (100, 240, 180), (60, 160, 130)],
            22, 1, True, False, False, False,
            "Minty and composed. The calmest person in any given crisis.", 25, 30),

    AuraDef("ashton", "Ashton's Aura", 180, "Uncommon",
            [(255, 80, 120), (255, 130, 150), (200, 50, 90)],
            26, 2, True, False, False, True,
            "Vivid pink energy. Confident, loud, and unapologetically himself.", 25, 30),

    AuraDef("max", "Max's Aura", 220, "Uncommon",
            [(255, 200, 0), (255, 230, 80), (200, 155, 0)],
            24, 2, True, False, False, False,
            "Bright yellow buzz. Restless, curious, and always two steps ahead.", 25, 30),

    # ─── RARE ─────────────────────────────────────────────────────────────────
    AuraDef("luis", "Luis's Aura", 600, "Rare",
            [(255, 80, 30), (255, 160, 60), (200, 40, 0)],
            36, 2, True, False, False, True,
            "Bold orange fire energy. Nobody's neutral about Luis.", 80, 60),

    AuraDef("swan", "Swan's Aura", 900, "Rare",
            [(255, 255, 255), (200, 240, 255), (180, 220, 255), (220, 235, 255)],
            34, 2, True, False, False, False,
            "Soft luminescent white. Pure and poised like still water.", 80, 60),

    AuraDef("arman", "Arman's Aura", 1_500, "Rare",
            [(200, 80, 255), (140, 40, 200), (255, 120, 255)],
            38, 3, True, False, False, True,
            "Electric violet ambition. Sets goals and quietly demolishes them.", 80, 60),

    AuraDef("roy", "Roy's Aura", 2_500, "Rare",
            [(220, 40, 40), (255, 80, 60), (160, 20, 20)],
            36, 2, True, False, False, True,
            "Sharp crimson intensity. Cuts right to the point. Hates small talk.", 80, 60),

    AuraDef("isaac", "Isaac's Aura", 4_000, "Rare",
            [(60, 200, 255), (0, 160, 220), (120, 230, 255)],
            40, 3, True, False, True, True,
            "Brilliant electric blue. Thinks fast and moves faster.", 80, 60),

    # ─── EPIC ─────────────────────────────────────────────────────────────────
    AuraDef("oliver", "Oliver's Aura", 12_000, "Epic",
            [(0, 220, 140), (0, 180, 100), (100, 255, 180), (0, 140, 80)],
            54, 3, True, False, True, True,
            "Deep emerald vitality. Effortlessly composed in every situation.", 300, 150),

    AuraDef("warren", "Warren's Aura", 20_000, "Epic",
            [(0, 200, 180), (0, 255, 220), (20, 80, 100), (180, 255, 240)],
            58, 4, True, False, False, True,
            "Deep teal currents — calm on the surface, powerful underneath.", 300, 150),

    AuraDef("ko", "Ko's Aura", 35_000, "Epic",
            [(60, 220, 120), (0, 180, 80), (180, 255, 180), (20, 100, 50)],
            56, 3, True, False, False, True,
            "Forest green and quietly powerful. Rootlike. Grounded in everything.", 300, 150),

    AuraDef("pratyush", "Pratyush's Aura", 60_000, "Epic",
            [(255, 120, 0), (255, 200, 60), (200, 80, 0), (255, 240, 160)],
            60, 4, True, True, True, True,
            "Solar intensity. The guy who turns a normal day into something legendary.", 300, 150),

    AuraDef("mri", "Mri's Aura", 80_000, "Epic",
            [(180, 60, 255), (255, 80, 200), (120, 0, 200), (255, 160, 255)],
            62, 4, True, False, True, True,
            "Iridescent violet. Unpredictable, creative, impossible to pin down.", 300, 150),

    # ─── LEGENDARY ────────────────────────────────────────────────────────────
    AuraDef("kim", "Kim's Aura", 150_000, "Legendary",
            [(255, 80, 100), (255, 180, 160), (200, 30, 70), (255, 220, 200)],
            72, 4, True, False, True, True,
            "Rose-gold warmth with a sharp edge underneath. Don't mistake kindness for softness.", 1000, 350),

    AuraDef("jason", "Jason's Aura", 250_000, "Legendary",
            [(0, 40, 180), (0, 100, 255), (80, 180, 255), (0, 20, 100)],
            76, 4, True, False, True, True,
            "Deep ocean blue. Calm, deep, and surprisingly powerful when pushed.", 1000, 350),

    AuraDef("avi", "Avi's Aura", 400_000, "Legendary",
            [(255, 220, 0), (255, 170, 0), (200, 100, 0), (255, 255, 120)],
            80, 5, True, True, True, True,
            "Pure solar gold — bright, loud, and impossible to ignore.", 1000, 350),

    # ─── MYTHIC ───────────────────────────────────────────────────────────────
    AuraDef("kaelan", "Kaelan's Aura", 1_200_000, "Mythic",
            [(0, 255, 200), (0, 220, 255), (180, 255, 240), (0, 180, 160), (100, 255, 220)],
            90, 5, True, True, True, True,
            "Crystalline cyan-green brilliance. Rare energy that shifts like deep water and northern lights.", 3000, 800),

    AuraDef("karna", "Karna's Aura", 2_500_000, "Mythic",
            [(255, 200, 0), (255, 120, 0), (255, 255, 100), (200, 60, 0), (255, 240, 180)],
            95, 5, True, True, True, True,
            "A warrior born of the sun. Solar gold and raging fire — the brightest aura on the battlefield.", 3000, 800),

    AuraDef("juno", "Juno's Aura", 5_000_000, "Cosmic",
            [(220, 60, 255), (255, 100, 200), (140, 0, 255), (255, 160, 255), (80, 0, 180)],
            120, 6, True, True, True, True,
            "Vivid violet pulls everything into its orbit. Cosmic-grade gravity. You feel it across the room.", 5000, 1500),

    AuraDef("joel", "Joel's Aura", 10_000_000, "Godly",
            [(255, 120, 0), (255, 220, 60), (255, 60, 0), (255, 255, 140), (200, 80, 0)],
            160, 7, True, True, True, True,
            "A cosmic wildfire. The original flame. Somehow warmer than a star and just as impossible to look at directly.", 20000, 5000),
]

# Quick lookup
AURA_BY_ID = {a.id: a for a in ALL_AURAS}
AURA_INDEX  = {a.id: i for i, a in enumerate(ALL_AURAS)}


def rarity_str(r: int) -> str:
    return f"1 in {r:,}"


def tier_rank(tier: str) -> int:
    return TIER_ORDER.index(tier) if tier in TIER_ORDER else 0


# ── Effect tags (empty — personal auras have no passive shop effects) ─────────
AURA_EFFECTS: Dict[str, List[str]] = {}

# Needed for merge compatibility — no effect auras anymore
EFFECT_AURAS: List[AuraDef] = []