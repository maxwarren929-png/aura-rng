"""
shop.py — The upgrade shop screen.
"""
import pygame
import math
from typing import List, Optional
from state import GameState
from ui import (draw_text, draw_panel, draw_bar, Button, ScrollPanel,
                PANEL, PANEL2, BORDER, GOLD, WHITE, GREY, DARK_GREY, BG, BG2,
                GREEN, RED, CYAN)
from auras import TIER_COLORS


# ── Shop item definitions ─────────────────────────────────────────────────────
SHOP_ITEMS = [
    # id, name, desc, category, costs(list per level), effect_desc
    {
        "id": "luck",
        "name": "🍀 Luck Boost",
        "desc": "Multiplies your chance of getting rarer auras.",
        "category": "Upgrades",
        "costs": [50, 150, 400, 1000, 2500, 6000, 15000, 40000, 100000, 250000],
        "max_level": 10,
        "effect": lambda gs: f"Current mult: ×{gs.luck_mult:.2f}",
        "key": "luck_level",
    },
    {
        "id": "speed",
        "name": "⚡ Roll Speed",
        "desc": "Reduces the auto-roll interval.",
        "category": "Upgrades",
        "costs": [80, 300, 900, 2500],
        "max_level": 4,
        "effect": lambda gs: f"Interval: {gs.roll_interval:.1f}s",
        "key": "speed_level",
    },
    {
        "id": "auto",
        "name": "🤖 Auto-Roll",
        "desc": "Rolls automatically. Click to toggle on/off once unlocked.",
        "category": "Upgrades",
        "costs": [200],
        "max_level": 1,
        "effect": lambda gs: "🟢 ON  (click to turn off)" if gs.auto_roll else ("🔴 OFF  (click to turn on)" if gs.auto_unlocked else "Locked"),
        "key": "auto_roll",
    },
    {
        "id": "multi3",
        "name": "🎲×3 Multi Roll",
        "desc": "Roll 3 auras at once.",
        "category": "Upgrades",
        "costs": [500],
        "max_level": 1,
        "effect": lambda gs: "Unlocked" if gs.multi_roll >= 3 else "Locked",
        "key": None,
    },
    {
        "id": "multi5",
        "name": "🎲×5 Multi Roll",
        "desc": "Roll 5 auras at once.",
        "category": "Upgrades",
        "costs": [2000],
        "max_level": 1,
        "effect": lambda gs: "Unlocked" if gs.multi_roll >= 5 else "Locked",
        "key": None,
    },
    {
        "id": "multi10",
        "name": "🎲×10 Multi Roll",
        "desc": "Roll 10 auras at once.",
        "category": "Upgrades",
        "costs": [8000],
        "max_level": 1,
        "effect": lambda gs: "Unlocked" if gs.multi_roll >= 10 else "Locked",
        "key": None,
    },
    # Consumables
    {
        "id": "potion_sm",
        "name": "🧪 Luck Potion",
        "desc": "×3 chance for 5 rolls.",
        "category": "Consumables",
        "costs": [30],
        "max_level": None,
        "effect": lambda gs: f"{gs.potion_rolls_left} rolls left",
        "key": None,
    },
    {
        "id": "potion_lg",
        "name": "⚗️ Grand Potion",
        "desc": "×5 chance for 20 rolls.",
        "category": "Consumables",
        "costs": [200],
        "max_level": None,
        "effect": lambda gs: f"{gs.potion_rolls_left} rolls left",
        "key": None,
    },
]


class ShopScreen:
    def __init__(self, screen_w: int, screen_h: int):
        self.W = screen_w
        self.H = screen_h
        self.scroll_y = 0

        # Build buttons
        self.buy_buttons: dict = {}
        item_h = 90
        for i, item in enumerate(SHOP_ITEMS):
            y = 130 + i * (item_h + 10)
            self.buy_buttons[item["id"]] = Button(
                (self.W - 340, y, 130, 44),
                "BUY", color=(30, 100, 50)
            )

        self.content_h = 130 + len(SHOP_ITEMS) * 100 + 50

    def update(self, dt: float, events: list, gs: GameState, fonts: dict):
        # Scroll
        for ev in events:
            if ev.type == pygame.MOUSEWHEEL:
                self.scroll_y = max(0, min(self.scroll_y - ev.y * 25,
                                           max(0, self.content_h - (self.H - 80))))

        for item in SHOP_ITEMS:
            btn = self.buy_buttons[item["id"]]
            can = self._can_afford(item, gs)
            if btn.update(dt, events, fonts) and can:
                self._purchase(item, gs)

    def _can_afford(self, item: dict, gs: GameState) -> bool:
        iid = item["id"]
        if iid == "luck" and gs.luck_level >= 10:
            return False
        if iid == "speed" and gs.speed_level >= 4:
            return False
        if iid == "auto" and not getattr(gs, 'auto_unlocked', False):
            # Not yet unlocked — check cost
            pass
        elif iid == "auto":
            # Already unlocked — always allow toggling (free)
            return True
        if iid == "multi3" and gs.multi_roll >= 3:
            return False
        if iid == "multi5" and gs.multi_roll >= 5:
            return False
        if iid == "multi10" and gs.multi_roll >= 10:
            return False

        # Cost
        costs = item["costs"]
        if iid == "luck":
            cost = costs[gs.luck_level] if gs.luck_level < len(costs) else 999999999
        elif iid == "speed":
            cost = costs[gs.speed_level] if gs.speed_level < len(costs) else 999999999
        else:
            cost = costs[0]
        return gs.coins >= cost

    def _purchase(self, item: dict, gs: GameState):
        iid   = item["id"]
        costs = item["costs"]

        if iid == "luck":
            if gs.luck_level >= 10: return
            cost = costs[gs.luck_level]
            if gs.coins < cost: return
            gs.coins -= cost
            gs.luck_level += 1
            gs.push_notification(f"Luck boosted to level {gs.luck_level}!", (80,255,80))

        elif iid == "speed":
            if gs.speed_level >= 4: return
            cost = costs[gs.speed_level]
            if gs.coins < cost: return
            gs.coins -= cost
            gs.speed_level += 1
            gs.push_notification(f"Roll speed upgraded to level {gs.speed_level}!", (0,220,255))

        elif iid == "auto":
            if not getattr(gs, 'auto_unlocked', False):
                # First purchase — unlock it
                if gs.coins < costs[0]: return
                gs.coins -= costs[0]
                gs.auto_unlocked = True
                gs.auto_roll = True
                gs.push_notification("Auto-roll unlocked and activated!", (0,220,255))
            else:
                # Toggle on/off (free)
                gs.auto_roll = not gs.auto_roll
                state = "ON" if gs.auto_roll else "OFF"
                gs.push_notification(f"Auto-roll turned {state}.", (0,220,255))

        elif iid == "multi3":
            if gs.multi_roll >= 3 or gs.coins < costs[0]: return
            gs.coins -= costs[0]
            gs.multi_roll = 3
            gs.push_notification("×3 Multi-roll unlocked!", GOLD)

        elif iid == "multi5":
            if gs.multi_roll >= 5 or gs.coins < costs[0]: return
            gs.coins -= costs[0]
            gs.multi_roll = 5
            gs.push_notification("×5 Multi-roll unlocked!", GOLD)

        elif iid == "multi10":
            if gs.multi_roll >= 10 or gs.coins < costs[0]: return
            gs.coins -= costs[0]
            gs.multi_roll = 10
            gs.push_notification("×10 Multi-roll unlocked!", GOLD)

        elif iid == "potion_sm":
            if gs.coins < costs[0]: return
            gs.coins -= costs[0]
            gs.potion_active = True
            gs.potion_mult = 3.0
            gs.potion_rolls_left = max(gs.potion_rolls_left, 0) + 5
            gs.push_notification("Luck Potion activated! (×3 for 5 rolls)", (180,80,255))

        elif iid == "potion_lg":
            if gs.coins < costs[0]: return
            gs.coins -= costs[0]
            gs.potion_active = True
            gs.potion_mult = 5.0
            gs.potion_rolls_left = max(gs.potion_rolls_left, 0) + 20
            gs.push_notification("Grand Potion activated! (×5 for 20 rolls)", (255,100,255))

    def draw(self, surf: pygame.Surface, fonts: dict, gs: GameState, t: float):
        # Background
        surf.fill((8, 8, 20))

        # Header
        draw_panel(surf, (0, 56, self.W, 58), BORDER, (14, 14, 32))
        draw_text(surf, "🛒  UPGRADE SHOP", 30, 70, fonts["big"], GOLD)
        draw_text(surf, f"🪙 {gs.coins:,}", self.W-20, 70, fonts["big"], GOLD, "topright")

        # Clip scroll region
        clip_rect = pygame.Rect(0, 114, self.W, self.H - 114)
        surf.set_clip(clip_rect)

        item_h = 90
        for i, item in enumerate(SHOP_ITEMS):
            y  = 130 + i * (item_h + 10) - self.scroll_y
            if y + item_h < 114 or y > self.H:
                continue

            # Category label
            if i == 0 or SHOP_ITEMS[i-1]["category"] != item["category"]:
                surf.set_clip(None)
                draw_text(surf, item["category"].upper(), 30, y-22, fonts["sm_b"], GREY)
                surf.set_clip(clip_rect)

            can  = self._can_afford(item, gs)
            bg   = (18, 22, 42) if can else (14, 14, 26)
            bord = (60, 100, 180) if can else BORDER
            draw_panel(surf, (20, y, self.W-40, item_h), bord, bg, radius=10)

            # Name + desc
            draw_text(surf, item["name"], 40, y+12, fonts["med_b"], WHITE if can else GREY)
            draw_text(surf, item["desc"], 40, y+40, fonts["sm"],    GREY)

            # Effect / level
            effect_str = item["effect"](gs)
            draw_text(surf, effect_str, 40, y+62, fonts["tiny"], CYAN)

            # Level pip display
            mk = item.get("key")
            ml = item.get("max_level")
            if ml and mk:
                cur_lvl = getattr(gs, mk, 0)
                if isinstance(cur_lvl, bool):
                    cur_lvl = int(cur_lvl)
                for pi in range(ml):
                    col = GOLD if pi < cur_lvl else DARK_GREY
                    pygame.draw.rect(surf, col, (self.W//2 + pi*16, y+30, 12, 12), border_radius=3)
                    pygame.draw.rect(surf, BORDER, (self.W//2 + pi*16, y+30, 12, 12), 1, border_radius=3)

            # Cost display
            costs = item["costs"]
            iid   = item["id"]
            auto_owned = iid == "auto" and getattr(gs, 'auto_unlocked', False)

            if iid == "luck":
                cost = costs[gs.luck_level] if gs.luck_level < len(costs) else None
            elif iid == "speed":
                cost = costs[gs.speed_level] if gs.speed_level < len(costs) else None
            elif auto_owned:
                cost = None
            else:
                cost = costs[0]

            if auto_owned:
                cost_str = "FREE"
                cost_col = GREY
            elif cost is None:
                cost_str = "MAX"
                cost_col = GREY
            else:
                cost_str = f"🪙 {cost:,}"
                cost_col = GREEN if gs.coins >= cost else RED

            draw_text(surf, cost_str, self.W-200, y+item_h//2, fonts["med_b"], cost_col, "midleft")

            # Button — auto-roll shows ON/OFF toggle once unlocked
            btn = self.buy_buttons[iid]
            btn.rect.y = y + (item_h - 44) // 2
            if auto_owned:
                btn.label = "Turn OFF" if gs.auto_roll else "Turn ON"
                btn.color = (120, 40, 40) if gs.auto_roll else (30, 100, 50)
            else:
                btn.label = "BUY"
                btn.color = (30, 100, 50)
            btn.draw(surf, fonts, can)

        surf.set_clip(None)

        # Scrollbar
        if self.content_h > self.H - 114:
            bar_h   = max(40, int((self.H-114)**2 / self.content_h))
            bar_max = self.content_h - (self.H-114)
            bar_y   = 114 + int(self.scroll_y / bar_max * (self.H - 114 - bar_h)) if bar_max else 114
            pygame.draw.rect(surf, DARK_GREY, (self.W-8, bar_y, 5, bar_h), border_radius=3)