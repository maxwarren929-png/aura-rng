"""
stats.py — Player stats / profile screen.
"""
import pygame
import math
from state import GameState, xp_for_level
from auras import AURA_BY_ID, TIER_COLORS, ALL_AURAS, rarity_str, tier_rank
from ui import (draw_text, draw_panel, draw_bar,
                PANEL, BORDER, GOLD, WHITE, GREY, DARK_GREY,
                BG, GREEN, RED, CYAN, MAGENTA)


class StatsScreen:
    def __init__(self, screen_w: int, screen_h: int):
        self.W = screen_w
        self.H = screen_h

    def update(self, dt, events, gs, fonts):
        pass

    def draw(self, surf: pygame.Surface, fonts: dict, gs: GameState, t: float):
        surf.fill((8, 8, 20))

        draw_panel(surf, (0, 56, self.W, 58), BORDER, (14, 14, 32))
        draw_text(surf, "📊  STATS", 30, 70, fonts["big"], GOLD)
        draw_text(surf, f"🪙 {gs.coins:,}", self.W-20, 70, fonts["big"], GOLD, "topright")

        # ── Left column: player card ──────────────────────────────────────
        lx = 40
        draw_panel(surf, (lx, 120, 340, 280), BORDER, (14,14,32), radius=12)

        draw_text(surf, f"Level {gs.level}", lx+20, 135, fonts["big"], GOLD)
        xp_now  = gs.xp
        xp_need = gs.xp_to_next
        draw_bar(surf, lx+20, 178, 300, 20, xp_now, xp_need, (80,200,255))
        draw_text(surf, f"XP: {xp_now:,} / {xp_need:,}", lx+20, 202, fonts["tiny"], GREY)

        stats = [
            ("Total Rolls",       f"{gs.rolls:,}"),
            ("Coins Earned",      f"{gs.total_coins_earned:,}🪙"),
            ("Auras Sold",        f"{gs.total_sold:,}"),
            ("Luck Level",        f"{gs.luck_level} (×{gs.luck_mult:.2f})"),
            ("Roll Speed",        f"Lv{gs.speed_level}  ({gs.roll_interval:.1f}s)"),
            ("Multi-Roll",        f"×{gs.multi_roll}"),
            ("Auto-Roll",         "ON" if gs.auto_roll else "OFF"),
            ("Potions Active",    f"{gs.potion_rolls_left} rolls remaining" if gs.potion_active else "None"),
        ]
        for i, (k, v) in enumerate(stats):
            y = 230 + i * 26
            draw_text(surf, k+":", lx+20, y, fonts["sm"], GREY)
            draw_text(surf, v,     lx+190, y, fonts["sm_b"], WHITE)

        # ── Best aura ──────────────────────────────────────────────────────
        if gs.best_aura_id:
            ba = AURA_BY_ID.get(gs.best_aura_id)
            if ba:
                tc = TIER_COLORS.get(ba.tier, WHITE)
                draw_panel(surf, (lx, 415, 340, 80), tc, (14,14,32), radius=10)
                draw_text(surf, "Best Roll Ever:", lx+14, 425, fonts["sm"], GREY)
                draw_text(surf, ba.name, lx+14, 447, fonts["med_b"], tc)
                draw_text(surf, rarity_str(ba.rarity), lx+14, 470, fonts["tiny"], GREY)
                for si, sc in enumerate(ba.colors[:5]):
                    pygame.draw.circle(surf, sc, (lx+240+si*16, 455), 6)

        # ── Right column: tier breakdown ───────────────────────────────────
        rx = 440
        draw_panel(surf, (rx, 120, self.W-rx-40, 360), BORDER, (14,14,32), radius=12)
        draw_text(surf, "Collection by Tier", rx+20, 132, fonts["med_b"], WHITE)

        tiers_list = ["Common","Uncommon","Rare","Epic","Legendary","Mythic","Divine","Cosmic","Godly","???"]
        total_per_tier = {}
        owned_per_tier = {}
        for a in ALL_AURAS:
            total_per_tier[a.tier] = total_per_tier.get(a.tier, 0) + 1
            if gs.has(a.id):
                owned_per_tier[a.tier] = owned_per_tier.get(a.tier, 0) + 1

        for i, tier in enumerate(tiers_list):
            total = total_per_tier.get(tier, 0)
            if total == 0:
                continue
            owned = owned_per_tier.get(tier, 0)
            tc    = TIER_COLORS.get(tier, GREY)
            y     = 162 + i * 30

            draw_text(surf, tier, rx+20, y, fonts["sm"], tc)
            draw_bar(surf, rx+140, y+3, 220, 14, owned, total, tc)
            draw_text(surf, f"{owned}/{total}", rx+370, y, fonts["tiny"], GREY)

        # ── Quest completion circle ────────────────────────────────────────
        done  = sum(1 for q in gs.quests if q.completed)
        total_q = len(gs.quests)
        qx, qy = rx + 120, 560
        r = 70
        # background arc
        pygame.draw.circle(surf, (30,30,50), (qx,qy), r, 8)
        if done > 0:
            angle = -math.pi/2
            end_a = angle + (done/total_q)*math.tau
            step  = math.tau / 60
            a     = angle
            while a < end_a:
                nx = int(qx + math.cos(a)*r)
                ny = int(qy + math.sin(a)*r)
                pygame.draw.circle(surf, GOLD, (nx,ny), 5)
                a += step
        draw_text(surf, f"{done}/{total_q}", qx, qy-10, fonts["med_b"], WHITE, "center")
        draw_text(surf, "Quests", qx, qy+14, fonts["tiny"], GREY, "center")