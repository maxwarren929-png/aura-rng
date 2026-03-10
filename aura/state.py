"""
state.py — Game state, save/load, progression, quests, merging, enchantments.
"""
import json, os, random, math
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from auras import AuraDef, ALL_AURAS, AURA_BY_ID, tier_rank

SAVE_FILE = "save.json"


@dataclass
class Quest:
    id: str
    name: str
    description: str
    goal: int
    progress: int = 0
    completed: bool = False
    reward_coins: int = 0
    reward_xp: int = 0
    reward_luck: float = 0.0


ALL_QUESTS = [
    Quest("roll10",   "Beginner Roller",  "Roll 10 times",          10,  reward_coins=50,   reward_xp=50),
    Quest("roll100",  "Dedicated Roller", "Roll 100 times",         100, reward_coins=300,  reward_xp=200),
    Quest("roll1000", "Obsessed Roller",  "Roll 1,000 times",      1000, reward_coins=2000, reward_xp=1000),
    Quest("uncommon", "Uncommon Luck",    "Get 5 Uncommon+ auras",    5, reward_coins=100,  reward_xp=80),
    Quest("rare",     "Rare Find",        "Get 3 Rare+ auras",        3, reward_coins=500,  reward_xp=250),
    Quest("epic",     "Epic Achievement", "Get 1 Epic+ aura",         1, reward_coins=2000, reward_xp=1000),
    Quest("collect5", "Collector I",      "Own 5 unique auras",       5, reward_coins=150,  reward_xp=100),
    Quest("collect10","Collector II",     "Own 10 unique auras",     10, reward_coins=800,  reward_xp=400),
    Quest("sell10",   "Merchant",         "Sell 10 duplicate auras", 10, reward_coins=200,  reward_xp=150),
    Quest("combo3",   "Combo Roller",     "Use x3 combo roll once",   1, reward_coins=300,  reward_xp=200),
    Quest("merge1",   "First Fusion",     "Merge 2 auras together",   1, reward_coins=500,  reward_xp=300),
    Quest("merge10",  "Alchemist",        "Merge 10 times total",    10, reward_coins=2000, reward_xp=1000),
    Quest("enchant1", "Enchanter",        "Apply any enchantment",    1, reward_coins=1000, reward_xp=500),
]


def xp_for_level(level: int) -> int:
    return int(100 * (level ** 1.4))


class GameState:
    def __init__(self):
        self.rolls: int = 0
        self.coins: int = 500
        self.xp: int = 0
        self.level: int = 1

        self.luck_level: int = 0
        self.speed_level: int = 0
        self.auto_roll: bool = False
        self.auto_unlocked: bool = False
        self.multi_roll: int = 1
        self.potion_active: bool = False
        self.potion_rolls_left: int = 0
        self.potion_mult: float = 3.0

        # Normal aura inventory: id -> count
        self.inventory: Dict[str, int] = {}
        # Merged auras: id -> serialised AuraDef dict
        self.merged_defs: Dict[str, dict] = {}
        self.merged_inventory: Dict[str, int] = {}

        self.equipped_id: Optional[str] = None

        # ── Enchantment ──────────────────────────────────────────────────────
        self.active_enchantment: Optional[str] = None   # enchantment id or None

        self.quests: List[Quest] = [Quest(**{k: getattr(q,k) for k in
                                   ['id','name','description','goal','progress',
                                    'completed','reward_coins','reward_xp','reward_luck']})
                                   for q in ALL_QUESTS]

        self.total_coins_earned: int = 0
        self.total_sold: int = 0
        self.total_merges: int = 0
        self.best_aura_id: Optional[str] = None

        self.notifications: List[dict] = []

        # ── Pity system ──────────────────────────────────────────────────────
        self.pity_rare: int      = 0
        self.pity_epic: int      = 0
        self.pity_legendary: int = 0
        self.pity_mythic: int    = 0
        self.PITY_RARE_MAX       = 50
        self.PITY_EPIC_MAX       = 200
        self.PITY_LEGENDARY_MAX  = 500
        self.PITY_MYTHIC_MAX     = 1000

        # ── Misc runtime ─────────────────────────────────────────────────────
        self._last_rarity_tier: Optional[str] = None
        self._foresight_hint: Optional[str] = None

    # ── Equipped aura helpers ─────────────────────────────────────────────────
    @property
    def equipped(self) -> Optional[AuraDef]:
        if self.equipped_id is None:
            return None
        if self.equipped_id in self.merged_runtime:
            return self.merged_runtime[self.equipped_id]
        return AURA_BY_ID.get(self.equipped_id)

    @property
    def merged_runtime(self) -> Dict[str, AuraDef]:
        if not hasattr(self, '_merged_runtime_cache'):
            self._rebuild_merged_runtime()
        return self._merged_runtime_cache

    def _rebuild_merged_runtime(self):
        from merge import aura_from_dict
        self._merged_runtime_cache = {}
        for aid, d in self.merged_defs.items():
            try:
                a = aura_from_dict(d)
                self._merged_runtime_cache[aid] = a
                AURA_BY_ID[aid] = a
            except Exception:
                pass

    def get_aura(self, aura_id: str) -> Optional[AuraDef]:
        if aura_id in self.merged_runtime:
            return self.merged_runtime[aura_id]
        return AURA_BY_ID.get(aura_id)

    def has(self, aura_id: str) -> bool:
        return (self.inventory.get(aura_id, 0) > 0 or
                self.merged_inventory.get(aura_id, 0) > 0)

    def collection(self) -> List[AuraDef]:
        result = []
        for k, cnt in self.inventory.items():
            if cnt > 0:
                a = AURA_BY_ID.get(k)
                if a: result.append(a)
        for k, cnt in self.merged_inventory.items():
            if cnt > 0:
                a = self.merged_runtime.get(k)
                if a: result.append(a)
        return sorted(result, key=lambda a: a.rarity)

    def count_of(self, aura_id: str) -> int:
        return (self.inventory.get(aura_id, 0) +
                self.merged_inventory.get(aura_id, 0))

    # ── Computed properties ───────────────────────────────────────────────────
    @property
    def luck_mult(self) -> float:
        base   = 1.0 + self.luck_level * 0.4
        potion = self.potion_mult if self.potion_active else 1.0
        return base * potion

    @property
    def roll_interval(self) -> float:
        return [2.5, 1.8, 1.2, 0.7, 0.4][self.speed_level]

    @property
    def xp_to_next(self) -> int:
        return xp_for_level(self.level + 1)

    @property
    def char_scale(self) -> float:
        """Visual character scale — 2× when fatass enchantment active."""
        return 2.0 if self.active_enchantment == "fatass" else 1.0

    # ── Tick (per-frame, called from game_screen) ─────────────────────────────
    def tick_effects(self, dt: float):
        pass  # no time-based effects needed now

    # ── Pity ─────────────────────────────────────────────────────────────────
    def _pity_tick(self) -> Optional[str]:
        self.pity_rare      += 1
        self.pity_epic      += 1
        self.pity_legendary += 1
        self.pity_mythic    += 1
        if self.pity_mythic >= self.PITY_MYTHIC_MAX:
            self.pity_mythic = self.pity_legendary = self.pity_epic = self.pity_rare = 0
            self.push_notification("⚡ PITY: Mythic guaranteed!", (255, 60, 60))
            return "Mythic"
        if self.pity_legendary >= self.PITY_LEGENDARY_MAX:
            self.pity_legendary = self.pity_epic = self.pity_rare = 0
            self.push_notification("🌟 PITY: Legendary guaranteed!", (255, 165, 0))
            return "Legendary"
        if self.pity_epic >= self.PITY_EPIC_MAX:
            self.pity_epic = self.pity_rare = 0
            self.push_notification("💫 PITY: Epic guaranteed!", (180, 80, 255))
            return "Epic"
        if self.pity_rare >= self.PITY_RARE_MAX:
            self.pity_rare = 0
            self.push_notification("✨ PITY: Rare guaranteed!", (80, 140, 255))
            return "Rare"
        return None

    def _pity_reset_on_roll(self, aura: AuraDef):
        rank = tier_rank(aura.tier)
        if rank >= tier_rank("Mythic"):
            self.pity_mythic = self.pity_legendary = self.pity_epic = self.pity_rare = 0
        elif rank >= tier_rank("Legendary"):
            self.pity_legendary = self.pity_epic = self.pity_rare = 0
        elif rank >= tier_rank("Epic"):
            self.pity_epic = self.pity_rare = 0
        elif rank >= tier_rank("Rare"):
            self.pity_rare = 0

    # ── Rolling ──────────────────────────────────────────────────────────────
    def pick_aura(self) -> AuraDef:
        mult = self.luck_mult

        # Pity override
        forced_tier = self._pity_tick()
        if forced_tier:
            min_rank = tier_rank(forced_tier)
            pity_pool = [a for a in ALL_AURAS if tier_rank(a.tier) >= min_rank]
            if pity_pool:
                result = random.choice(pity_pool)
                self._pity_reset_on_roll(result)
                return result

        weights = [(1.0 / a.rarity) * mult for a in ALL_AURAS]
        total = sum(weights)
        r = random.random() * total
        cum = 0.0
        for a, w in zip(ALL_AURAS, weights):
            cum += w
            if r <= cum:
                self._pity_reset_on_roll(a)
                return a
        self._pity_reset_on_roll(ALL_AURAS[0])
        return ALL_AURAS[0]

    def apply_roll_result(self, aura: AuraDef) -> dict:
        self.rolls += 1
        self._last_rarity_tier = aura.tier

        first_time = not self.has(aura.id)
        self.inventory[aura.id] = self.inventory.get(aura.id, 0) + 1

        # Coins
        base_coins = aura.sell_value
        earned     = base_coins * 5 if first_time else base_coins * 2

        self.coins             += earned
        self.total_coins_earned += earned

        # XP
        xp_gain = aura.xp_reward * (2 if first_time else 1)
        self._add_xp(xp_gain)

        # Auto-equip if better
        if self.equipped_id is None:
            self.equipped_id = aura.id
        else:
            current = self.get_aura(self.equipped_id)
            if current and aura.rarity > current.rarity:
                self.equipped_id = aura.id

        # Best aura
        if self.best_aura_id is None:
            self.best_aura_id = aura.id
        else:
            best = self.get_aura(self.best_aura_id)
            if best and aura.rarity > best.rarity:
                self.best_aura_id = aura.id

        # Potion
        if self.potion_active:
            self.potion_rolls_left -= 1
            if self.potion_rolls_left <= 0:
                self.potion_active = False

        self._tick_quests(aura, first_time)

        return {
            "aura":       aura,
            "real_aura":  aura,
            "first_time": first_time,
            "coins":      earned,
            "xp":         xp_gain,
        }

    # ── XP / Level ────────────────────────────────────────────────────────────
    def _add_xp(self, amount: int):
        self.xp += amount
        while self.xp >= self.xp_to_next:
            self.xp -= self.xp_to_next
            self.level += 1
            self.push_notification(f"🎉 Level Up! Now level {self.level}!", (255, 230, 80))

    def _add_coins(self, amount: int, msg: str = ""):
        self.coins += amount
        self.total_coins_earned += amount
        if msg:
            self.push_notification(msg, (255, 215, 0))

    # ── Quests ────────────────────────────────────────────────────────────────
    def _tick_quests(self, aura: AuraDef, first_time: bool):
        for q in self.quests:
            if q.completed: continue
            if q.id in ("roll10","roll100","roll1000") and self.rolls >= q.goal:
                self._complete_quest(q)
            elif q.id == "uncommon" and first_time and tier_rank(aura.tier) >= 1:
                q.progress += 1
                if q.progress >= q.goal: self._complete_quest(q)
            elif q.id == "rare" and first_time and tier_rank(aura.tier) >= 2:
                q.progress += 1
                if q.progress >= q.goal: self._complete_quest(q)
            elif q.id == "epic" and first_time and tier_rank(aura.tier) >= 3:
                q.progress += 1
                if q.progress >= q.goal: self._complete_quest(q)
            elif q.id in ("collect5","collect10") and len(self.collection()) >= q.goal:
                self._complete_quest(q)
            elif q.id == "merge1" and self.total_merges >= 1:
                self._complete_quest(q)
            elif q.id == "merge10" and self.total_merges >= 10:
                self._complete_quest(q)

    def _complete_quest(self, q: Quest):
        if q.completed: return
        q.completed = True
        self.coins += q.reward_coins
        self._add_xp(q.reward_xp)
        self.push_notification(f"✅ Quest done: {q.name}  +{q.reward_coins}🪙", (80, 255, 120))

    def tick_enchant_quest(self):
        for q in self.quests:
            if q.id == "enchant1" and not q.completed:
                q.progress = 1
                self._complete_quest(q)

    def tick_combo_quest(self):
        for q in self.quests:
            if q.id == "combo3" and not q.completed:
                q.progress = 1
                self._complete_quest(q)

    # ── Merging ───────────────────────────────────────────────────────────────
    def can_merge(self, id_a: str, id_b: str) -> bool:
        if id_a == id_b:
            return self.count_of(id_a) >= 2
        return self.count_of(id_a) >= 1 and self.count_of(id_b) >= 1

    def do_merge(self, id_a: str, id_b: str) -> Optional[AuraDef]:
        if not self.can_merge(id_a, id_b):
            return None

        from merge import merge_auras
        a = self.get_aura(id_a)
        b = self.get_aura(id_b)
        if a is None or b is None:
            return None

        self._consume_one(id_a)
        if id_a != id_b:
            self._consume_one(id_b)
        else:
            self._consume_one(id_a)

        # Freaky enchantment: one tier higher result
        freaky = self.active_enchantment == "freaky"
        result = merge_auras(a, b, self.merged_runtime, freaky_boost=freaky)

        is_first_time = not self.has(result.id)

        from merge import aura_to_dict
        self.merged_defs[result.id]      = aura_to_dict(result)
        self.merged_inventory[result.id] = self.merged_inventory.get(result.id, 0) + 1
        if hasattr(self, '_merged_runtime_cache'):
            self._merged_runtime_cache[result.id] = result
        AURA_BY_ID[result.id] = result

        self.total_merges += 1
        self._tick_quests(result, is_first_time)
        self._add_xp(result.xp_reward // 2)
        self.push_notification(f"⚗️ Merged into {result.name}!", (180, 80, 255))
        if freaky:
            self.push_notification("👅 Freaky: result boosted a tier!", (255, 80, 180))
        return result

    def _consume_one(self, aura_id: str):
        if self.inventory.get(aura_id, 0) > 0:
            self.inventory[aura_id] -= 1
        elif self.merged_inventory.get(aura_id, 0) > 0:
            self.merged_inventory[aura_id] -= 1

    def sell_aura(self, aura_id: str) -> bool:
        aura = self.get_aura(aura_id)
        if not aura: return False
        if self.inventory.get(aura_id, 0) > 0:
            self.inventory[aura_id] -= 1
        elif self.merged_inventory.get(aura_id, 0) > 0:
            self.merged_inventory[aura_id] -= 1
        else:
            return False

        sell_price = aura.sell_value
        self.coins += sell_price
        self.total_coins_earned += sell_price
        self.total_sold += 1

        if aura_id == self.equipped_id and self.count_of(aura_id) == 0:
            self.equipped_id = None
        for q in self.quests:
            if q.id == "sell10" and not q.completed:
                q.progress += 1
                if q.progress >= q.goal: self._complete_quest(q)
        return True

    # ── Notifications ─────────────────────────────────────────────────────────
    def push_notification(self, msg: str, color=(255, 255, 255)):
        self.notifications.append({"msg": msg, "color": color, "timer": 3.5})

    # ── Save / Load ───────────────────────────────────────────────────────────
    def to_dict(self) -> dict:
        return {
            "rolls": self.rolls, "coins": self.coins, "xp": self.xp, "level": self.level,
            "luck_level": self.luck_level, "speed_level": self.speed_level,
            "auto_roll": self.auto_roll, "auto_unlocked": self.auto_unlocked,
            "multi_roll": self.multi_roll,
            "potion_active": self.potion_active, "potion_rolls_left": self.potion_rolls_left,
            "potion_mult": self.potion_mult,
            "inventory": self.inventory,
            "merged_defs": self.merged_defs,
            "merged_inventory": self.merged_inventory,
            "equipped_id": self.equipped_id,
            "active_enchantment": self.active_enchantment,
            "total_coins_earned": self.total_coins_earned,
            "total_sold": self.total_sold,
            "total_merges": self.total_merges,
            "best_aura_id": self.best_aura_id,
            "pity_rare": self.pity_rare,
            "pity_epic": self.pity_epic,
            "pity_legendary": self.pity_legendary,
            "pity_mythic": self.pity_mythic,
            "quests": [{"id":q.id,"progress":q.progress,"completed":q.completed}
                       for q in self.quests],
        }

    def from_dict(self, d: dict):
        for k in ["rolls","coins","xp","level","luck_level","speed_level",
                  "auto_roll","auto_unlocked","multi_roll","potion_active","potion_rolls_left",
                  "potion_mult","inventory","equipped_id","active_enchantment",
                  "total_coins_earned","total_sold","best_aura_id","total_merges",
                  "merged_defs","merged_inventory",
                  "pity_rare","pity_epic","pity_legendary","pity_mythic"]:
            if k in d:
                setattr(self, k, d[k])
        if hasattr(self, '_merged_runtime_cache'):
            del self._merged_runtime_cache
        qmap = {q.id: q for q in self.quests}
        for qd in d.get("quests", []):
            if qd["id"] in qmap:
                qmap[qd["id"]].progress  = qd.get("progress", 0)
                qmap[qd["id"]].completed = qd.get("completed", False)

    def save(self):
        try:
            with open(SAVE_FILE, "w") as f:
                json.dump(self.to_dict(), f, indent=2)
        except Exception:
            pass

    def load(self):
        if os.path.exists(SAVE_FILE):
            try:
                with open(SAVE_FILE) as f:
                    self.from_dict(json.load(f))
            except Exception:
                pass


def _rarity_label(r: float) -> str:
    if r >= 1_000_000: return "Mythic+"
    if r >= 100_000:   return "Legendary+"
    if r >= 10_000:    return "Epic"
    if r >= 1_000:     return "Rare"
    if r >= 100:       return "Uncommon"
    return "Common"