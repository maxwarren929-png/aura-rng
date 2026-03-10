"""
game_screen.py — Primary game screen: character display, roll button, equipped aura.
"""
import pygame
import math
import random
from typing import List
from state import GameState
from auras import AuraDef, TIER_COLORS, rarity_str
from effects import (ParticleSystem, RingSystem, LightningBolt,
                     draw_aura_full, ScreenShake)
from ui import (draw_text, draw_panel, draw_bar, Button,
                PANEL, BORDER, GOLD, WHITE, GREY, DARK_GREY, BG,
                GREEN, RED, CYAN, MAGENTA)


MULTI_OPTIONS = [1, 3, 5, 10]


class GameScreen:
    def __init__(self, screen_w: int, screen_h: int):
        self.W = screen_w
        self.H = screen_h
        self.cx = screen_w // 2 - 80   # character X
        self.cy = screen_h // 2 - 30   # character Y

        # Character effects
        self.particles  = ParticleSystem()
        self.rings      = RingSystem()
        self.bolts: List[LightningBolt] = []
        self.bolt_timer = 0.0
        self.shake      = ScreenShake()
        self.flash_alpha = 0
        self.flash_color = (255,255,255)

        # Auto-roll timer
        self.auto_timer = 0.0

        # Multi-roll selector index
        self._multi_idx = 0

        # Buttons
        self.roll_btn   = Button((screen_w//2-80-100, screen_h-90, 200, 56),
                                 "🎲  ROLL", color=(40, 90, 180), font_key="big")
        self.multi_btn  = Button((screen_w//2-80+114, screen_h-90, 120, 56),
                                 "×1",       color=(30, 60, 120), font_key="med_b")

        # Pending multi-roll queue (for animating sequentially)
        self.multi_queue: List[AuraDef] = []
        self.multi_results: List[dict]  = []

        # Currently selected multi count
        self._cur_multi: int = 1

        # Callback for triggering roll animation
        self.on_roll_request = None   # set by main.py

    def update(self, dt: float, events: list, gs: GameState, fonts: dict):
        aura = gs.equipped
        if aura:
            self.rings.update(dt, aura.ring_count)
            # Lightning
            if aura.lightning:
                self.bolt_timer -= dt
                if self.bolt_timer <= 0:
                    self.bolts.append(LightningBolt(self.cx, self.cy, aura.colors[-1]))
                    self.bolt_timer = random.uniform(0.12, 0.3)
            self.bolts = [b for b in self.bolts if b.update(dt)]
            # Particles
            self.particles.spawn_ambient(self.cx, self.cy, aura, 3)
        self.particles.update(dt)
        self.flash_alpha = max(0, self.flash_alpha - int(350*dt))
        ox, oy = self.shake.update(dt)

        # Tick passive effects (chaos timer etc)
        gs.tick_effects(dt)

        # ESC or right-click cancels auto-roll
        for ev in events:
            if ev.type == pygame.KEYDOWN and ev.key == pygame.K_ESCAPE:
                if gs.auto_roll:
                    gs.auto_roll = False
                    self.auto_timer = gs.roll_interval
            if ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 3:
                if gs.auto_roll:
                    gs.auto_roll = False
                    self.auto_timer = gs.roll_interval

        # Auto-roll
        if gs.auto_roll:
            self.auto_timer -= dt
            if self.auto_timer <= 0 and self.on_roll_request:
                self.auto_timer = gs.roll_interval
                self.on_roll_request(1)

        # Multi button cycles
        if self.multi_btn.update(dt, events, fonts):
            allowed = [m for m in MULTI_OPTIONS if m <= gs.multi_roll]
            if not allowed:
                allowed = [1]
            cur = getattr(self, '_cur_multi', 1)
            idx = allowed.index(cur) if cur in allowed else 0
            next_idx = (idx + 1) % len(allowed)
            self._cur_multi = allowed[next_idx]
            self.multi_btn.label = f"×{self._cur_multi}"

        # Roll button
        if self.roll_btn.update(dt, events, fonts):
            count = self._cur_multi
            if self.on_roll_request:
                self.on_roll_request(count)
                if count > 1:
                    gs.tick_combo_quest()

    def notify_rolled(self, result_dict: dict):
        """Called after a roll completes to trigger local effects."""
        aura = result_dict["aura"]
        self.flash_alpha = 180
        self.flash_color = aura.colors[0]
        strength = min(0.8, 0.1 + (len(TIER_COLORS) - list(TIER_COLORS.keys()).index(aura.tier) if aura.tier in TIER_COLORS else 0) * 0.08)
        self.shake.add(strength)
        self.particles.spawn_burst(self.cx, self.cy, aura,
                                   min(100, aura.particles // 2))

    def draw(self, surf: pygame.Surface, fonts: dict, gs: GameState, t: float):
        aura = gs.equipped

        # Background gradient suggestion
        surf.fill((6, 6, 18))

        # Subtle background glow if equipped
        if aura:
            bg_glow = pygame.Surface((self.W, self.H), pygame.SRCALPHA)
            c = aura.colors[0]
            intensity = int(15 + 6*math.sin(t*2))
            bg_glow.fill((*c, intensity))
            surf.blit(bg_glow, (0,0))

        ox, oy = self.shake.offset

        # ── Character + aura ─────────────────────────────────────────────
        if aura:
            # Gay enchantment: cycle rainbow colors
            display_aura = aura
            if gs.active_enchantment == "gay":
                import colorsys
                rainbow = []
                for ci in range(max(3, len(aura.colors))):
                    h = (t * 0.3 + ci / max(3, len(aura.colors))) % 1.0
                    rv, gv, bv = colorsys.hsv_to_rgb(h, 0.95, 1.0)
                    rainbow.append((int(rv*255), int(gv*255), int(bv*255)))
                from dataclasses import replace as dc_replace
                display_aura = dc_replace(aura, colors=rainbow)
            draw_aura_full(surf, self.cx+ox, self.cy+oy, display_aura, t,
                           self.particles, self.rings, self.bolts,
                           char_scale=gs.char_scale)
        else:
            # Plain character
            from effects import draw_character
            draw_character(surf, self.cx+ox, self.cy+oy)
            draw_text(surf, "Roll to get your first aura!",
                      self.cx, self.cy+80, fonts["sm"], GREY, "center")

        # Flash
        if self.flash_alpha > 0:
            fs = pygame.Surface((self.W, self.H), pygame.SRCALPHA)
            fs.fill((*self.flash_color, min(80, self.flash_alpha)))
            surf.blit(fs, (0,0))

        # ── Equipped info card ────────────────────────────────────────────
        if aura:
            tc = TIER_COLORS.get(aura.tier, WHITE)
            info_x = self.W - 340
            info_y = 80
            draw_panel(surf, (info_x, info_y, 310, 180), tc, (12,12,30), radius=12)

            # Animated tier label
            glow_a = int(160 + 80*math.sin(t*2))
            gl = fonts["sm"].render(f"★ {aura.tier.upper()} ★", True, tc)
            gl.set_alpha(glow_a)
            surf.blit(gl, (info_x+14, info_y+12))

            draw_text(surf, aura.name, info_x+14, info_y+36, fonts["big"], WHITE, shadow=True)
            draw_text(surf, rarity_str(aura.rarity), info_x+14, info_y+76, fonts["sm"], GREY)
            draw_text(surf, aura.description, info_x+14, info_y+100, fonts["tiny"], WHITE)
            # Swatches
            for si, sc in enumerate(aura.colors[:6]):
                pygame.draw.circle(surf, sc, (info_x+14+si*18, info_y+158), 7)

        # ── Stats bar ─────────────────────────────────────────────────────
        sx = 20
        draw_text(surf, f"Level {gs.level}", sx, 80, fonts["med_b"], GOLD)
        draw_bar(surf, sx, 108, 200, 14, gs.xp, gs.xp_to_next, (80,200,255))
        draw_text(surf, f"XP {gs.xp:,}/{gs.xp_to_next:,}", sx, 126, fonts["tiny"], GREY)

        draw_text(surf, f"🪙 {gs.coins:,}",        sx, 150, fonts["med_b"], GOLD)
        draw_text(surf, f"Rolls: {gs.rolls:,}",     sx, 178, fonts["sm"],    GREY)
        draw_text(surf, f"Luck: ×{gs.luck_mult:.2f}", sx, 198, fonts["sm"], CYAN)
        if gs.potion_active:
            draw_text(surf, f"🧪 Potion: {gs.potion_rolls_left} left",
                      sx, 218, fonts["sm"], (180,80,255))
        if gs.auto_roll:
            pct = 1.0 - (self.auto_timer / max(0.01, gs.roll_interval))
            draw_bar(surf, sx, 240, 180, 10, pct, 1.0, (0,220,255))
            draw_text(surf, "AUTO", sx+185, 237, fonts["tiny"], CYAN)
            draw_text(surf, "[ESC] or right-click to stop", sx, 254, fonts["tiny"], (80,160,200))

        # Active enchantment display
        if gs.active_enchantment:
            from enchantments import ENCHANTMENT_BY_ID
            enc = ENCHANTMENT_BY_ID.get(gs.active_enchantment)
            if enc:
                ea = int(160 + 80*math.sin(t*3))
                draw_text(surf, f"{enc.icon} {enc.name}", sx, 268,
                          fonts["sm_b"], (*enc.color, ea), shadow=True)
                draw_text(surf, "enchanted", sx, 288, fonts["tiny"], GREY)

        # Foresight hint (kept for compat)
        if gs._foresight_hint:
            draw_text(surf, gs._foresight_hint, sx, 306, fonts["tiny"], (100,255,100))

        # Pity counters
        pity_y = 308
        draw_text(surf, "PITY:", sx, pity_y, fonts["tiny"], GREY)
        pity_items = [
            (gs.pity_rare,      gs.PITY_RARE_MAX,      (80,140,255),  "R"),
            (gs.pity_epic,      gs.PITY_EPIC_MAX,      (180,80,255),  "E"),
            (gs.pity_legendary, gs.PITY_LEGENDARY_MAX, (255,165,0),   "L"),
            (gs.pity_mythic,    gs.PITY_MYTHIC_MAX,    (255,60,60),   "M"),
        ]
        for i, (cur, mx, col, lbl) in enumerate(pity_items):
            bx = sx + 36 + i * 44
            bw = 38
            pct2 = min(1.0, cur / mx)
            pygame.draw.rect(surf, (18,14,36), (bx, pity_y, bw, 7), border_radius=3)
            if pct2 > 0:
                pygame.draw.rect(surf, col, (bx, pity_y, int(bw*pct2), 7), border_radius=3)
            pygame.draw.rect(surf, (*col, 140), (bx, pity_y, bw, 7), 1, border_radius=3)
            draw_text(surf, f"{lbl}{cur}", bx+bw//2, pity_y+9, fonts["tiny"], col, "midtop")

        # ── Roll button area ──────────────────────────────────────────────
        # Glow under button
        if not gs.auto_roll:
            glow_surf = pygame.Surface((240, 80), pygame.SRCALPHA)
            ga = int(40 + 20*math.sin(t*3))
            glow_surf.fill((40, 90, 200, ga))
            surf.blit(glow_surf, (self.W//2-80-120, self.H-100))

        self.roll_btn.draw(surf, fonts, active=True)
        self.multi_btn.draw(surf, fonts, active=True)

        # Hint
        if gs.multi_roll > 1:
            draw_text(surf, f"Multi-roll available up to ×{gs.multi_roll}",
                      self.W//2 - 80, self.H - 108, fonts["tiny"], GREY, "center")