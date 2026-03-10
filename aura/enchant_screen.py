"""
enchant_screen.py — Enchantment UI.

Shows your currently equipped aura + 4 enchantments to choose from.
Only one enchantment active at a time. Can be removed for free.
"""
import pygame
import math
import random
from typing import Optional, List
from auras import AuraDef, TIER_COLORS, rarity_str
from enchantments import ALL_ENCHANTMENTS, Enchantment, ENCHANTMENT_BY_ID
from state import GameState
from effects import (ParticleSystem, RingSystem, LightningBolt,
                     draw_aura_full, ScreenShake)
from ui import (draw_text, draw_panel, Button,
                BORDER, GOLD, WHITE, GREY, DARK_GREY, GREEN, RED, CYAN, PANEL)


class EnchantScreen:
    def __init__(self, screen_w: int, screen_h: int):
        self.W = screen_w
        self.H = screen_h

        self.particles = ParticleSystem()
        self.rings     = RingSystem()
        self.bolts: List[LightningBolt] = []
        self.bolt_timer = 0.0
        self.shake      = ScreenShake()

        self.flash_alpha = 0
        self.flash_color = (255, 220, 80)

        # One button per enchantment
        self.enchant_btns = {
            e.id: Button((0, 0, 140, 44), f"{e.icon} Apply", color=(60, 30, 120))
            for e in ALL_ENCHANTMENTS
        }
        self.remove_btn = Button((0, 0, 160, 40), "❌ Remove", color=(100, 30, 30))

        self._anim_timer = 0.0
        self._confirm_enchant: Optional[str] = None   # id awaiting confirm
        self._confirm_timer  = 0.0

    # ── Helpers ──────────────────────────────────────────────────────────────
    def _preview_cx(self): return self.W // 2 + 120
    def _preview_cy(self): return self.H // 2 - 30

    # ── Update ────────────────────────────────────────────────────────────────
    def update(self, dt: float, events: list, gs: GameState, fonts: dict):
        self._anim_timer += dt
        self.flash_alpha = max(0, self.flash_alpha - int(400 * dt))

        aura = gs.equipped
        if aura:
            self.rings.update(dt, aura.ring_count)
            if aura.lightning:
                self.bolt_timer -= dt
                if self.bolt_timer <= 0:
                    self.bolt_timer = random.uniform(0.12, 0.3)
                    self.bolts.append(LightningBolt(self._preview_cx(), self._preview_cy(),
                                                    aura.colors[-1]))
            self.bolts = [b for b in self.bolts if b.update(dt)]
            self.particles.spawn_ambient(self._preview_cx(), self._preview_cy(), aura, 2)
        self.particles.update(dt)
        self.shake.update(dt)

        # Confirm timer clears itself
        if self._confirm_timer > 0:
            self._confirm_timer -= dt
            if self._confirm_timer <= 0:
                self._confirm_enchant = None

        # Enchantment buttons
        n = len(ALL_ENCHANTMENTS)
        card_h = 110
        card_w = min(340, (self.W // 2 - 40) - 20)
        start_y = 90
        for i, enc in enumerate(ALL_ENCHANTMENTS):
            col_i = i % 2
            row_i = i // 2
            ex = 20 + col_i * (card_w + 14)
            ey = start_y + row_i * (card_h + 12)
            btn = self.enchant_btns[enc.id]
            btn.rect.topleft = (ex + card_w - 148, ey + card_h - 52)

            if btn.update(dt, events, fonts):
                if gs.equipped is None:
                    gs.push_notification("Equip an aura first!", RED)
                elif gs.coins < enc.cost:
                    gs.push_notification(f"Need {enc.cost:,} coins!", RED)
                else:
                    # Apply!
                    gs.coins -= enc.cost
                    gs.active_enchantment = enc.id
                    self.flash_alpha = 255
                    self.flash_color = enc.color
                    self.shake.add(0.35)
                    self.particles.clear()
                    if aura:
                        self.particles.spawn_star_burst(
                            self._preview_cx(), self._preview_cy(), aura, 120)
                    gs.push_notification(f"{enc.icon} {enc.name} enchantment applied!", enc.color)

        # Remove button
        self.remove_btn.rect.topleft = (self.W // 2 - 80, self.H - 62)
        if self.remove_btn.update(dt, events, fonts):
            if gs.active_enchantment:
                enc = ENCHANTMENT_BY_ID.get(gs.active_enchantment)
                name = enc.name if enc else "Enchantment"
                gs.active_enchantment = None
                gs.push_notification(f"✂ {name} enchantment removed.", GREY)
            else:
                gs.push_notification("No enchantment to remove.", GREY)

    # ── Draw ──────────────────────────────────────────────────────────────────
    def draw(self, surf: pygame.Surface, fonts: dict, gs: GameState, t: float):
        surf.fill((5, 5, 16))

        # Animated shimmer lines
        for yi in range(56, self.H, 70):
            a = int(3 + 2 * math.sin(t * 0.4 + yi * 0.02))
            s = pygame.Surface((self.W, 1), pygame.SRCALPHA)
            s.fill((60, 30, 80, a))
            surf.blit(s, (0, yi))

        # Header
        draw_panel(surf, (0, 0, self.W, 56), BORDER, (10, 8, 28))
        draw_text(surf, "✨  ENCHANTMENT", 20, 10, fonts["big"], (255, 200, 80), shadow=True)
        draw_text(surf, f"🪙 {gs.coins:,}", self.W - 20, 10, fonts["big"], GOLD, "topright")
        draw_text(surf, "Apply one enchantment to your equipped aura. Only one active at a time.",
                  20, 38, fonts["tiny"], GREY)

        # Left half: enchantment cards
        self._draw_enchant_cards(surf, fonts, gs, t)

        # Right half: equipped aura preview
        self._draw_preview(surf, fonts, gs, t)

        # Remove button
        ae = gs.active_enchantment
        self.remove_btn.color = (120, 30, 30) if ae else (40, 40, 55)
        self.remove_btn.draw(surf, fonts, active=bool(ae))

        # Flash
        if self.flash_alpha > 0:
            fs = pygame.Surface((self.W, self.H), pygame.SRCALPHA)
            fs.fill((*self.flash_color, min(55, self.flash_alpha // 5)))
            surf.blit(fs, (0, 0))

    def _draw_enchant_cards(self, surf, fonts, gs: GameState, t: float):
        card_h = 110
        card_w = min(340, (self.W // 2 - 40) - 20)
        start_y = 64

        active_enc = gs.active_enchantment

        for i, enc in enumerate(ALL_ENCHANTMENTS):
            col_i = i % 2
            row_i = i // 2
            ex = 20 + col_i * (card_w + 14)
            ey = start_y + row_i * (card_h + 12)

            is_active = (enc.id == active_enc)
            can_afford = gs.coins >= enc.cost

            if is_active:
                bg  = (25, 14, 50)
                bdr = (*enc.color, 240)
            elif can_afford:
                bg  = (14, 10, 30)
                bdr = (*BORDER, 160)
            else:
                bg  = (10, 8, 22)
                bdr = (*BORDER, 70)

            # Pulse border when active
            if is_active:
                pulse = int(180 + 60 * math.sin(t * 3))
                bdr = (*enc.color, pulse)

            draw_panel(surf, (ex, ey, card_w, card_h), bdr, bg, radius=12)

            # Icon + name
            draw_text(surf, enc.icon, ex + 14, ey + 12, fonts["big"], WHITE)
            draw_text(surf, enc.name, ex + 52, ey + 14, fonts["med_b"],
                      enc.color if can_afford else DARK_GREY, shadow=is_active)

            # Active badge
            if is_active:
                ba = int(160 + 80 * math.sin(t * 4))
                draw_text(surf, "● ACTIVE", ex + card_w - 12, ey + 14,
                          fonts["tiny"], (*enc.color, ba), "topright")

            # Description
            desc_words = enc.description.split()
            line, lines_out = [], []
            for w in desc_words:
                line.append(w)
                if len(" ".join(line)) > 38:
                    lines_out.append(" ".join(line[:-1])); line = [w]
            if line: lines_out.append(" ".join(line))
            for li, ln in enumerate(lines_out[:2]):
                draw_text(surf, ln, ex + 14, ey + 42 + li * 16, fonts["tiny"],
                          GREY if can_afford else (60, 60, 70))

            # Cost
            cost_col = GREEN if can_afford else RED
            draw_text(surf, f"🪙 {enc.cost:,}", ex + 14, ey + card_h - 24,
                      fonts["sm_b"], cost_col)

            # Button
            btn = self.enchant_btns[enc.id]
            if is_active:
                btn.label = f"{enc.icon} Active"
                btn.color = enc.color
            else:
                btn.label = f"{enc.icon} Apply"
                btn.color = (60, 30, 120) if can_afford else (30, 25, 45)
            btn.draw(surf, fonts, active=(can_afford and not is_active and gs.equipped is not None))

    def _draw_preview(self, surf, fonts, gs: GameState, t: float):
        px = self.W // 2 + 10
        pw = self.W // 2 - 20
        py = 64
        ph = self.H - 130

        draw_panel(surf, (px, py, pw, ph), BORDER, (8, 6, 22), radius=14)
        draw_text(surf, "EQUIPPED AURA", px + 16, py + 12, fonts["sm_b"], GREY)

        aura = gs.equipped
        ox, oy = self.shake.offset

        if aura is None:
            draw_text(surf, "No aura equipped.", px + pw//2, py + ph//2 - 20,
                      fonts["sm"], DARK_GREY, "center")
            draw_text(surf, "Roll and equip one first!", px + pw//2, py + ph//2 + 4,
                      fonts["tiny"], (50,50,70), "center")
            return

        tc = TIER_COLORS.get(aura.tier, WHITE)

        # Enchantment visual modifiers
        enc_id = gs.active_enchantment
        char_scale = 1.0
        if enc_id == "fatass":
            char_scale = 2.0
        aura_scale = 1.0
        if enc_id == "glowup":
            aura_scale = 1.5

        cx2 = self._preview_cx() + ox
        cy2 = self._preview_cy() + oy

        # Gay enchantment: rainbow color cycle
        display_aura = aura
        if enc_id == "gay":
            import colorsys
            rainbow_colors = []
            for ci in range(max(3, len(aura.colors))):
                h = (t * 0.3 + ci / max(3, len(aura.colors))) % 1.0
                r, g, b = colorsys.hsv_to_rgb(h, 0.95, 1.0)
                rainbow_colors.append((int(r*255), int(g*255), int(b*255)))
            from dataclasses import replace
            display_aura = replace(aura, colors=rainbow_colors)

        draw_aura_full(surf, cx2, cy2, display_aura, t,
                       self.particles, self.rings, self.bolts,
                       scale=aura_scale, char_scale=char_scale)

        # Glowup extra halo crown
        if enc_id == "glowup":
            crown_r = int(80 + 10 * math.sin(t * 3))
            for ci in range(8):
                ang = t * 1.2 + ci * math.tau / 8
                hx = int(cx2 + math.cos(ang) * crown_r)
                hy = int(cy2 - 60 + math.sin(ang) * 20)
                cs = pygame.Surface((18, 18), pygame.SRCALPHA)
                ca = int(180 + 60 * math.sin(t * 4 + ci))
                col = aura.colors[ci % len(aura.colors)]
                pygame.draw.circle(cs, (*col, ca), (9, 9), 7)
                surf.blit(cs, (hx - 9, hy - 9))

        # Info
        for si, sc in enumerate(aura.colors[:6]):
            pygame.draw.circle(surf, sc, (px+16+si*20, py+44), 9)

        draw_text(surf, aura.name,          px+16, py+62,  fonts["big"], tc, shadow=True)
        draw_text(surf, f"[{aura.tier}]",   px+16, py+98,  fonts["med_b"], tc)
        draw_text(surf, rarity_str(aura.rarity), px+16, py+120, fonts["sm"], GREY)
        draw_text(surf, aura.description,   px+16, py+144, fonts["tiny"], WHITE)

        # Active enchantment display
        if enc_id:
            enc = ENCHANTMENT_BY_ID.get(enc_id)
            if enc:
                enc_y = py + ph - 76
                ea = int(160 + 80 * math.sin(t * 3))
                draw_panel(surf, (px+10, enc_y, pw-20, 62), (*enc.color, ea), (16,8,32), radius=10)
                draw_text(surf, f"{enc.icon} {enc.name} ENCHANTED",
                          px + 20, enc_y + 10, fonts["sm_b"], enc.color, shadow=True)
                draw_text(surf, enc.description[:50] + ("…" if len(enc.description)>50 else ""),
                          px + 20, enc_y + 34, fonts["tiny"], WHITE)
        else:
            draw_text(surf, "No enchantment active",
                      px + 16, py + ph - 32, fonts["tiny"], DARK_GREY)