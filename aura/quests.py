"""
quests.py — Quests / achievements screen.
"""
import pygame
from state import GameState
from ui import (draw_text, draw_panel, draw_bar, Button,
                PANEL, BORDER, GOLD, WHITE, GREY, DARK_GREY,
                BG, GREEN, RED, CYAN)


class QuestsScreen:
    def __init__(self, screen_w: int, screen_h: int):
        self.W = screen_w
        self.H = screen_h
        self.scroll_y = 0

    def update(self, dt: float, events: list, gs: GameState, fonts: dict):
        for ev in events:
            if ev.type == pygame.MOUSEWHEEL:
                self.scroll_y = max(0, self.scroll_y - ev.y * 25)

    def draw(self, surf: pygame.Surface, fonts: dict, gs: GameState, t: float):
        surf.fill((8, 8, 20))

        draw_panel(surf, (0, 56, self.W, 58), BORDER, (14, 14, 32))
        done = sum(1 for q in gs.quests if q.completed)
        draw_text(surf, f"📋  QUESTS   {done}/{len(gs.quests)}", 30, 70, fonts["big"], GOLD)
        draw_text(surf, f"🪙 {gs.coins:,}", self.W-20, 70, fonts["big"], GOLD, "topright")

        q_h = 90
        content_h = 130 + len(gs.quests)*(q_h+10)
        max_scroll = max(0, content_h - self.H + 20)
        self.scroll_y = min(self.scroll_y, max_scroll)

        clip = pygame.Rect(0, 114, self.W, self.H-114)
        surf.set_clip(clip)

        for i, q in enumerate(gs.quests):
            y = 130 + i*(q_h+10) - self.scroll_y
            if y + q_h < 114 or y > self.H:
                continue

            bg    = (16, 28, 18) if q.completed else (16, 16, 30)
            bord  = GREEN if q.completed else BORDER
            draw_panel(surf, (20, y, self.W-40, q_h), bord, bg, radius=10)

            # Status icon
            icon = "✅" if q.completed else "🔲"
            draw_text(surf, icon, 40, y+30, fonts["big"])

            # Name + desc
            draw_text(surf, q.name, 90, y+12, fonts["med_b"], WHITE if q.completed else GREY)
            draw_text(surf, q.description, 90, y+38, fonts["sm"], GREY)

            # Rewards
            rstr = f"+{q.reward_coins}🪙  +{q.reward_xp}xp"
            draw_text(surf, rstr, self.W-160, y+12, fonts["sm"], GOLD, "topleft")

            # Progress bar
            if not q.completed and q.goal > 1:
                prog = min(q.progress, q.goal)
                draw_bar(surf, 90, y+62, self.W-250, 14, prog, q.goal,
                         (80,180,80), bg_color=(30,30,50))
                draw_text(surf, f"{prog}/{q.goal}", self.W-155, y+63, fonts["tiny"], GREY)
            elif q.completed:
                draw_text(surf, "COMPLETE", 90, y+63, fonts["tiny"], GREEN)

        surf.set_clip(None)

        # Scrollbar
        if max_scroll > 0:
            bar_h = max(40, int((self.H-114)**2 / content_h))
            bar_y = 114 + int(self.scroll_y/max_scroll*(self.H-114-bar_h))
            pygame.draw.rect(surf, DARK_GREY, (self.W-8, bar_y, 4, bar_h), border_radius=2)