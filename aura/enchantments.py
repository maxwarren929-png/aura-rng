"""
enchantments.py — Enchantment definitions and logic.

Enchantments are applied to your currently equipped aura and change
how it looks or behaves. Only one enchantment active at a time.
"""
from dataclasses import dataclass, field
from typing import Optional, List, Tuple

Color = Tuple[int, int, int]


@dataclass
class Enchantment:
    id: str
    name: str
    icon: str
    description: str
    cost: int           # coins to apply
    color: Color        # UI accent color


# ── All enchantments ──────────────────────────────────────────────────────────
ALL_ENCHANTMENTS: List[Enchantment] = [

    Enchantment(
        id="fatass",
        name="Fatass",
        icon="🍔",
        description="Your character becomes 2× bigger. Big energy. Enormous presence.",
        cost=500,
        color=(220, 160, 80),
    ),

    Enchantment(
        id="gay",
        name="Gay",
        icon="🌈",
        description="Your aura cycles through the full rainbow spectrum continuously. Iconic.",
        cost=800,
        color=(255, 80, 180),
    ),

    Enchantment(
        id="freaky",
        name="Freaky",
        icon="👅",
        description="When merging, results come out one tier higher than normal. Freak the algorithm.",
        cost=1500,
        color=(180, 0, 255),
    ),

    Enchantment(
        id="glowup",
        name="Glow Up",
        icon="✨",
        description="Your aura glows at double intensity with extra particles and a halo crown.",
        cost=1200,
        color=(255, 220, 80),
    ),
]

ENCHANTMENT_BY_ID = {e.id: e for e in ALL_ENCHANTMENTS}