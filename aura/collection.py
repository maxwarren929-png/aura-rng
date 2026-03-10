"""
collection.py — Collection grid, detail view, and aura equip/sell.
"""
import pygame
import math
from typing import Optional, List
from auras import AuraDef, ALL_AURAS, AURA_BY_ID, TIER_COLORS, rarity_str, tier_rank
from state import GameState
from effects import (ParticleSystem, RingSystem, LightningBolt,
                     draw_aura_full, ScreenShake)
from ui import (draw_text, draw_panel, draw_bar, draw_aura_card, Button,
                PANEL, PANEL2, BORDER, GOLD, WHITE, GREY, DARK_GREY,
                BG, BG2, GREEN, RED, CYAN, MAGENTA)


COLS      = 5
CARD_W    = 190
CARD_H    = 100
PAD       = 10
GRID_X    = 20
GRID_Y    = 120


class CollectionScreen:
    def __init__(self, screen_w: int, screen_h: int):
        self.W = screen_w
        self.H = screen_h
        self.scroll_y     = 0
        self.selected_id: Optional[str] = None

        # Detail panel effects
        self.detail_particles = ParticleSystem()
        self.detail_rings     = RingSystem()
        self.detail_bolts: List[LightningBolt] = []
        self.bolt_timer = 0.0

        # Filter / sort
        self.filter_tier   = "All"
        self.filter_owned  = False
        self.sort_by       = "rarity"  # "rarity" | "tier" | "name"

        # Buttons
        self.equip_btn = Button((0,0,120,38), "★ Equip", color=(60,120,30), font_key="sm_b")
        self.sell_btn  = Button((0,0,120,38), "Sell ×1",  color=(120,40,30),  font_key="sm_b")
        self.sell_all_btn = Button((0,0,140,38), "Sell All Dupes", color=(100,30,20), font_key="sm_b")

        # Filter buttons
        self.filter_buttons = {}
        tiers = ["All"] + ["Common","Uncommon","Rare","Epic","Legendary","Mythic","Divine","Cosmic","Godly","???"]
        for i, t in enumerate(tiers):
            self.filter_buttons[t] = Button((GRID_X + i*82, 80, 78, 28), t, font_key="tiny")

    def update(self, dt: float, events: list, gs: GameState, fonts: dict, t: float):
        # Scroll
        for ev in events:
            if ev.type == pygame.MOUSEWHEEL:
                mx, my = pygame.mouse.get_pos()
                if mx < self.W - 280:  # not in detail panel
                    self.scroll_y = max(0, self.scroll_y - ev.y * 25)

        # Filter buttons
        for tier, btn in self.filter_buttons.items():
            if btn.update(dt, events, fonts):
                self.filter_tier = tier
                self.scroll_y    = 0

        # Grid click detection
        for ev in events:
            if ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1:
                mx, my = ev.pos
                if mx < self.W - 280:
                    visible = self._visible_auras(gs)
                    for idx, aura in enumerate(visible):
                        col = idx % COLS
                        row = idx // COLS
                        cx  = GRID_X + col*(CARD_W+PAD)
                        cy  = GRID_Y + row*(CARD_H+PAD) - self.scroll_y
                        r   = pygame.Rect(cx, cy, CARD_W, CARD_H)
                        if r.collidepoint(mx, my):
                            self.selected_id = aura.id
                            self.detail_particles.clear()
                            self.detail_bolts.clear()
                            break

        # Detail panel
        if self.selected_id:
            aura = AURA_BY_ID.get(self.selected_id)
            if aura:
                # Effects
                self.detail_rings.update(dt, aura.ring_count)
                if aura.lightning:
                    self.bolt_timer -= dt
                    if self.bolt_timer <= 0:
                        cx = self.W - 140
                        cy = self.H//2 - 90
                        self.detail_bolts.append(LightningBolt(cx, cy, aura.colors[-1]))
                        self.bolt_timer = 0.2
                self.detail_bolts = [b for b in self.detail_bolts if b.update(dt)]
                self.detail_particles.spawn_ambient(self.W-140, self.H//2-90, aura, 2)
                self.detail_particles.update(dt)

            # Equip / sell buttons
            detail_x = self.W - 268
            self.equip_btn.rect.topleft = (detail_x + 10, self.H - 110)
            self.sell_btn.rect.topleft  = (detail_x + 140, self.H - 110)
            self.sell_all_btn.rect.topleft = (detail_x + 10, self.H - 62)

            if self.equip_btn.update(dt, events, fonts):
                if gs.has(self.selected_id):
                    gs.equipped_id = self.selected_id
                    gs.push_notification(f"Equipped {aura.name}!", GOLD)

            if self.sell_btn.update(dt, events, fonts):
                if gs.has(self.selected_id) and self.selected_id != gs.equipped_id:
                    gs.sell_aura(self.selected_id)
                    a = AURA_BY_ID[self.selected_id]
                    gs.push_notification(f"Sold {a.name} for {a.sell_value}🪙", GREY)
                    if not gs.has(self.selected_id):
                        self.selected_id = None

            if self.sell_all_btn.update(dt, events, fonts):
                if self.selected_id and self.selected_id != gs.equipped_id:
                    a   = AURA_BY_ID.get(self.selected_id)
                    cnt = gs.inventory.get(self.selected_id, 0) - 1  # keep 1
                    if a and cnt > 0:
                        total = cnt * a.sell_value
                        for _ in range(cnt):
                            gs.sell_aura(self.selected_id)
                        gs.push_notification(f"Sold {cnt}× {a.name} for {total}🪙", GREY)

    def _visible_auras(self, gs: GameState) -> List[AuraDef]:
        result = []
        # Normal auras
        for a in ALL_AURAS:
            if self.filter_tier != "All" and a.tier != self.filter_tier:
                continue
            if self.filter_owned and not gs.has(a.id):
                continue
            result.append(a)
        # Merged auras (always show if owned)
        for a in gs.merged_runtime.values():
            if gs.merged_inventory.get(a.id, 0) > 0:
                if self.filter_tier != "All" and a.tier != self.filter_tier:
                    continue
                if a not in result:
                    result.append(a)
        if self.sort_by == "name":
            result.sort(key=lambda a: a.name)
        elif self.sort_by == "tier":
            result.sort(key=lambda a: tier_rank(a.tier))
        return result

    def draw(self, surf: pygame.Surface, fonts: dict, gs: GameState, t: float):
        surf.fill((8, 8, 20))

        # Header
        draw_panel(surf, (0, 56, self.W, 58), BORDER, (14, 14, 32))
        owned_count = len(gs.collection())
        draw_text(surf, f"💎  COLLECTION   {owned_count}/{len(ALL_AURAS)}",
                  30, 70, fonts["big"], GOLD)
        draw_text(surf, f"🪙 {gs.coins:,}", self.W-20, 70, fonts["big"], GOLD, "topright")

        # Filter bar
        for tier, btn in self.filter_buttons.items():
            active = tier == self.filter_tier
            btn.color = (40, 80, 160) if active else (25, 25, 50)
            btn.draw(surf, fonts)

        # ── Grid ────────────────────────────────────────────────────────────
        visible = self._visible_auras(gs)
        total_rows = math.ceil(len(visible) / COLS)
        content_h  = GRID_Y + total_rows*(CARD_H+PAD) + 20
        max_scroll  = max(0, content_h - self.H + 20)
        self.scroll_y = min(self.scroll_y, max_scroll)

        grid_w = self.W - 280 if self.selected_id else self.W
        clip_r = pygame.Rect(0, GRID_Y, grid_w, self.H - GRID_Y)
        surf.set_clip(clip_r)

        mx, my = pygame.mouse.get_pos()
        for idx, aura in enumerate(visible):
            col = idx % COLS
            row = idx // COLS
            cx  = GRID_X + col*(CARD_W+PAD)
            cy  = GRID_Y + row*(CARD_H+PAD) - self.scroll_y
            if cy + CARD_H < GRID_Y or cy > self.H:
                continue
            r = pygame.Rect(cx, cy, CARD_W, CARD_H)
            owned    = gs.has(aura.id)
            equipped = gs.equipped_id == aura.id
            hovered  = r.collidepoint(mx, my)
            count    = gs.count_of(aura.id)
            draw_aura_card(surf, aura, r, fonts, owned, equipped, hovered, count)

        surf.set_clip(None)

        # Scrollbar
        if max_scroll > 0:
            bar_h = max(40, int((self.H-GRID_Y)**2 / content_h))
            bar_y = GRID_Y + int(self.scroll_y/max_scroll*(self.H-GRID_Y-bar_h))
            pygame.draw.rect(surf, DARK_GREY, (grid_w-8, bar_y, 4, bar_h), border_radius=2)

        # ── Detail panel ────────────────────────────────────────────────────
        if self.selected_id:
            self._draw_detail(surf, fonts, gs, t)

    def _draw_detail(self, surf: pygame.Surface, fonts: dict, gs: GameState, t: float):
        aura = gs.get_aura(self.selected_id)
        if not aura:
            return

        dp_x = self.W - 270
        draw_panel(surf, (dp_x, 56, 270, self.H-56), BORDER, (14,14,32), radius=0)

        owned   = gs.has(aura.id)
        tc      = TIER_COLORS.get(aura.tier, WHITE)
        equipped= gs.equipped_id == aura.id
        count   = gs.count_of(aura.id)

        # Aura preview
        cx2, cy2 = self.W - 140, self.H//2 - 90
        if owned:
            draw_aura_full(surf, cx2, cy2, aura, t,
                           self.detail_particles, self.detail_rings,
                           self.detail_bolts, scale=0.8)
        else:
            pygame.draw.circle(surf, (30,30,50), (cx2, cy2), 50)
            draw_text(surf, "?", cx2, cy2, fonts["title"], (60,60,80), "center")

        # Info
        draw_text(surf, aura.name,  dp_x+10, 70,  fonts["med_b"], tc)
        draw_text(surf, f"[{aura.tier}]", dp_x+10, 96, fonts["sm"], tc)
        draw_text(surf, rarity_str(aura.rarity), dp_x+10, 116, fonts["sm"], GREY)

        # Colour swatches
        for si, sc in enumerate(aura.colors[:6]):
            pygame.draw.circle(surf, sc, (dp_x+14+si*18, 142), 7)

        if owned:
            draw_text(surf, aura.description, dp_x+10, 162, fonts["tiny"], WHITE)

            # Stats
            draw_text(surf, f"Owned: {count}×", dp_x+10, 185, fonts["tiny"], GREY)
            draw_text(surf, f"Sell value: {aura.sell_value}🪙 each", dp_x+10, 202, fonts["tiny"], GREY)
            draw_text(surf, f"XP: {aura.xp_reward}", dp_x+10, 219, fonts["tiny"], GREY)

            if equipped:
                draw_text(surf, "★ EQUIPPED", dp_x+10, 240, fonts["sm_b"], GOLD)

            # Properties badges
            badges = []
            if aura.lightning:  badges.append(("⚡ Lightning", (200,200,255)))
            if aura.pulse:      badges.append(("💫 Pulsing", (180,100,255)))
            if aura.star_burst: badges.append(("✨ Starburst", (255,230,80)))
            if aura.trail:      badges.append(("🔄 Trail", (80,220,180)))
            for bi, (bt, bc) in enumerate(badges):
                bx = dp_x+10 + (bi%2)*130
                by = 262 + (bi//2)*22
                draw_text(surf, bt, bx, by, fonts["tiny"], bc)

            # Buttons
            can_sell = count > 0 and not (count == 1 and equipped)
            self.equip_btn.draw(surf, fonts, not equipped and owned)
            self.sell_btn.draw(surf, fonts, can_sell)
            self.sell_all_btn.draw(surf, fonts, count > 1)
        else:
            draw_text(surf, "Not yet discovered...", dp_x+10, 165, fonts["tiny"], (50,50,70))