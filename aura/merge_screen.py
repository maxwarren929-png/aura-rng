"""
merge_screen.py — Overhauled Aura Merge UI.
"""
import pygame
import math
import random
from typing import Optional, List
from auras import AuraDef, AURA_BY_ID, TIER_COLORS, rarity_str, tier_rank
from state import GameState
from effects import (ParticleSystem, RingSystem, LightningBolt,
                     draw_aura_full, draw_glow, ScreenShake)
from ui import (draw_text, draw_panel, Button,
                BORDER, GOLD, WHITE, GREY, DARK_GREY, GREEN, RED, CYAN,
                PANEL, BG)

CARD_W = 162
CARD_H = 74
PAD    = 6
LIST_W = CARD_W + PAD * 3


class MergeScreen:
    def __init__(self, screen_w: int, screen_h: int):
        self.W = screen_w
        self.H = screen_h

        self.scroll_y   = 0
        self.slot_a: Optional[str] = None
        self.slot_b: Optional[str] = None

        self.last_result: Optional[AuraDef] = None
        self.result_timer: float = 0.0
        self.merging: bool = False

        self.history: List[AuraDef] = []

        self.particles = ParticleSystem()
        self.rings     = RingSystem()
        self.bolts: List[LightningBolt] = []
        self.bolt_timer = 0.0
        self.shake      = ScreenShake()

        self.flash_alpha = 0
        self.flash_color = (200, 80, 255)

        self.merge_btn   = Button((0, 0, 200, 58), "⚗️  MERGE", color=(100, 40, 180), font_key="big")
        self.clear_a_btn = Button((0, 0, 48, 26), "✕", color=(120, 30, 30), font_key="sm")
        self.clear_b_btn = Button((0, 0, 48, 26), "✕", color=(120, 30, 30), font_key="sm")

        self.sort_mode = "rarity"
        self.sort_btn  = Button((0, 0, 118, 28), "Sort: Rarity", color=(40,40,80), font_key="tiny")

        self._hover_aura: Optional[str] = None
        self._preview_id: Optional[str] = None
        self._preview_aura: Optional[AuraDef] = None

    def _owned_auras(self, gs: GameState) -> List[AuraDef]:
        result = []
        seen = set()
        for aid, cnt in gs.inventory.items():
            if cnt > 0 and aid not in seen:
                a = AURA_BY_ID.get(aid)
                if a:
                    result.append(a); seen.add(aid)
        for aid, cnt in gs.merged_inventory.items():
            if cnt > 0 and aid not in seen:
                a = gs.merged_runtime.get(aid)
                if a:
                    result.append(a); seen.add(aid)
        if self.sort_mode == "rarity":
            result.sort(key=lambda a: -a.rarity)
        elif self.sort_mode == "name":
            result.sort(key=lambda a: a.name)
        elif self.sort_mode == "count":
            result.sort(key=lambda a: -gs.count_of(a.id))
        return result

    def _can_merge(self, gs: GameState) -> bool:
        if self.slot_a is None or self.slot_b is None:
            return False
        return gs.can_merge(self.slot_a, self.slot_b)

    def _get_preview(self, gs: GameState) -> Optional[AuraDef]:
        if not self.slot_a or not self.slot_b:
            return None
        key = f"{min(self.slot_a, self.slot_b)}__{max(self.slot_a, self.slot_b)}"
        if key == self._preview_id:
            return self._preview_aura
        from merge import merge_auras
        a = gs.get_aura(self.slot_a)
        b = gs.get_aura(self.slot_b)
        if not a or not b:
            return None
        scratch = dict(gs.merged_runtime)
        preview = merge_auras(a, b, scratch)
        self._preview_id   = key
        self._preview_aura = preview
        return preview

    def _result_cx(self): return self.W - 160
    def _result_cy(self): return self.H // 2 - 50

    # ── Update ────────────────────────────────────────────────────────────────
    def update(self, dt: float, events: list, gs: GameState, fonts: dict, t: float):
        mx_g, my_g = pygame.mouse.get_pos()

        for ev in events:
            if ev.type == pygame.MOUSEWHEEL:
                if mx_g < LIST_W + 4:
                    self.scroll_y = max(0, self.scroll_y - ev.y * 36)

        # Update effects always
        if self.last_result:
            self.rings.update(dt, self.last_result.ring_count)
            if self.last_result.lightning:
                self.bolt_timer -= dt
                if self.bolt_timer <= 0:
                    self.bolt_timer = random.uniform(0.1, 0.25)
                    self.bolts.append(LightningBolt(self._result_cx(), self._result_cy(),
                                                    self.last_result.colors[-1]))
            self.bolts = [b for b in self.bolts if b.update(dt)]
            self.particles.spawn_ambient(self._result_cx(), self._result_cy(), self.last_result, 2)
        self.particles.update(dt)
        self.shake.update(dt)
        self.flash_alpha = max(0, self.flash_alpha - int(400 * dt))

        if self.merging:
            self.result_timer += dt
            if self.result_timer > 0.7:
                self.merging = False
            return

        # Sort button
        self.sort_btn.rect.topleft = (PAD, 112)
        if self.sort_btn.update(dt, events, fonts):
            modes = ["rarity", "name", "count"]
            idx = modes.index(self.sort_mode)
            self.sort_mode = modes[(idx + 1) % len(modes)]
            self.sort_btn.label = f"Sort: {self.sort_mode.capitalize()}"

        # List clicks
        owned = self._owned_auras(gs)
        self._hover_aura = None
        for ev in events:
            if ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1:
                if mx_g < LIST_W:
                    for i, aura in enumerate(owned):
                        cy = 144 + i * (CARD_H + PAD) - self.scroll_y
                        r  = pygame.Rect(PAD, cy, CARD_W, CARD_H)
                        if r.collidepoint(mx_g, my_g):
                            if self.slot_a == aura.id and gs.count_of(aura.id) >= 2:
                                self.slot_b = aura.id
                            elif self.slot_a is None:
                                self.slot_a = aura.id
                            elif self.slot_b is None:
                                self.slot_b = aura.id
                            else:
                                self.slot_a = aura.id
                            self._preview_id = None
                            break
            if ev.type == pygame.MOUSEMOTION and mx_g < LIST_W:
                for i, aura in enumerate(owned):
                    cy = 144 + i * (CARD_H + PAD) - self.scroll_y
                    if pygame.Rect(PAD, cy, CARD_W, CARD_H).collidepoint(mx_g, my_g):
                        self._hover_aura = aura.id
                        break

        cx_c   = self.W // 2
        slot_ax = cx_c - 240
        slot_bx = cx_c + 44
        slot_y  = self.H // 2 - 88

        self.clear_a_btn.rect.topleft = (slot_ax + 150, slot_y - 30)
        self.clear_b_btn.rect.topleft = (slot_bx + 150, slot_y - 30)

        if self.slot_a and self.clear_a_btn.update(dt, events, fonts):
            self.slot_a = None; self._preview_id = None
        if self.slot_b and self.clear_b_btn.update(dt, events, fonts):
            self.slot_b = None; self._preview_id = None

        bx = cx_c - 100
        by = self.H // 2 + 108
        self.merge_btn.rect.topleft = (bx, by)
        if self.merge_btn.update(dt, events, fonts) and self._can_merge(gs):
            result = gs.do_merge(self.slot_a, self.slot_b)
            if result:
                self.last_result  = result
                self.result_timer = 0.0
                self.merging      = True
                self.flash_alpha  = 255
                self.flash_color  = TIER_COLORS.get(result.tier, (200, 80, 255))
                self.particles.clear()
                self.bolts.clear()
                self.particles.spawn_star_burst(self._result_cx(), self._result_cy(),
                                                result, min(220, result.particles))
                self.shake.add(0.5 + min(0.6, result.rarity / 10_000_000))
                if result not in self.history:
                    self.history.insert(0, result)
                if len(self.history) > 6:
                    self.history = self.history[:6]
                self.slot_a = None
                self.slot_b = None
                self._preview_id = None

    # ── Draw ──────────────────────────────────────────────────────────────────
    def draw(self, surf: pygame.Surface, fonts: dict, gs: GameState, t: float):
        surf.fill((5, 5, 16))

        # Animated grid lines
        for yi in range(56, self.H, 80):
            a = int(3 + 2 * math.sin(t * 0.3 + yi * 0.015))
            s = pygame.Surface((self.W, 1), pygame.SRCALPHA)
            s.fill((40, 15, 60, a))
            surf.blit(s, (0, yi))

        # Header
        draw_panel(surf, (0, 0, self.W, 56), BORDER, (10, 8, 28))
        draw_text(surf, "⚗️  FUSION LAB", 20, 10, fonts["big"], (200, 80, 255), shadow=True)
        draw_text(surf, f"🪙 {gs.coins:,}", self.W - 20, 10, fonts["big"], GOLD, "topright")
        draw_text(surf, f"Merges: {gs.total_merges}", 20, 38, fonts["tiny"], GREY)

        # Pity display
        self._draw_pity(surf, fonts, gs, self.W // 2 - 180, 36)

        self._draw_list(surf, fonts, gs, t)
        self._draw_centre(surf, fonts, gs, t)

        if self.last_result:
            self._draw_result(surf, fonts, t)
        else:
            self._draw_hints(surf, fonts, t)

        if self.history:
            self._draw_history(surf, fonts, t)

        if self.flash_alpha > 0:
            fs = pygame.Surface((self.W, self.H), pygame.SRCALPHA)
            fs.fill((*self.flash_color, min(50, self.flash_alpha // 5)))
            surf.blit(fs, (0, 0))

    def _draw_pity(self, surf, fonts, gs, x, y):
        items = [
            ("Rare", gs.pity_rare,      gs.PITY_RARE_MAX,      (80,140,255)),
            ("Epic", gs.pity_epic,      gs.PITY_EPIC_MAX,      (180,80,255)),
            ("Leg",  gs.pity_legendary, gs.PITY_LEGENDARY_MAX, (255,165,0)),
            ("Myth", gs.pity_mythic,    gs.PITY_MYTHIC_MAX,    (255,60,60)),
        ]
        bw = 88
        for i, (lbl, cur, mx, col) in enumerate(items):
            bx = x + i * (bw + 4)
            pct = min(1.0, cur / mx)
            pygame.draw.rect(surf, (18, 14, 36), (bx, y, bw, 8), border_radius=4)
            if pct > 0:
                pygame.draw.rect(surf, col, (bx, y, int(bw*pct), 8), border_radius=4)
            pygame.draw.rect(surf, (*col, 140), (bx, y, bw, 8), 1, border_radius=4)
            draw_text(surf, f"{lbl} {cur}/{mx}", bx + bw//2, y + 10, fonts["tiny"], col, "midtop")

    def _draw_list(self, surf, fonts, gs, t):
        mx_g, my_g = pygame.mouse.get_pos()
        draw_panel(surf, (0, 56, LIST_W, self.H - 56), BORDER, (8, 7, 22), radius=0)
        draw_text(surf, "YOUR AURAS", PAD + 4, 62, fonts["sm_b"], GREY)
        self.sort_btn.draw(surf, fonts)

        owned    = self._owned_auras(gs)
        vis_h    = self.H - 144
        total_h  = len(owned) * (CARD_H + PAD)
        max_scr  = max(0, total_h - vis_h + 20)
        self.scroll_y = min(self.scroll_y, max_scr)

        surf.set_clip(pygame.Rect(0, 144, LIST_W, self.H - 144))

        for i, aura in enumerate(owned):
            cy = 144 + i * (CARD_H + PAD) - self.scroll_y
            if cy + CARD_H < 144 or cy > self.H:
                continue
            r   = pygame.Rect(PAD, cy, CARD_W, CARD_H)
            tc  = TIER_COLORS.get(aura.tier, WHITE)
            hov = r.collidepoint(mx_g, my_g)
            sel = aura.id in (self.slot_a, self.slot_b)
            bg  = (35,14,58) if sel else ((18,14,42) if hov else (11,9,26))
            bdr = (*tc,240) if sel else ((*GOLD,180) if hov else (*BORDER,90))
            draw_panel(surf, r, bdr, bg, radius=7)

            # Colour strip
            strip = CARD_H // max(1, len(aura.colors[:4]))
            for si, sc in enumerate(aura.colors[:4]):
                pygame.draw.rect(surf, sc, (PAD, cy + si*strip, 4, strip))

            draw_text(surf, aura.name, PAD+10, cy+7,  fonts["sm_b"], tc)
            draw_text(surf, aura.tier, PAD+10, cy+27, fonts["tiny"], tc)
            draw_text(surf, rarity_str(aura.rarity), PAD+10, cy+43, fonts["tiny"], GREY)

            cnt = gs.count_of(aura.id)
            draw_text(surf, f"×{cnt}", r.right-6, cy+7, fonts["sm_b"],
                      GOLD if cnt>=2 else GREY, "topright")
            if sel:
                lbl = "A" if aura.id==self.slot_a else ""
                if aura.id==self.slot_b: lbl += ("+" if lbl else "") + "B"
                draw_text(surf, lbl, r.right-6, r.bottom-18, fonts["tiny"], GOLD, "topright")

        surf.set_clip(None)

        if total_h > vis_h:
            sb_h = max(28, int(vis_h * vis_h / total_h))
            sb_y = 144 + int(self.scroll_y / max(1, total_h-vis_h) * (vis_h - sb_h))
            pygame.draw.rect(surf, (50,40,80), (LIST_W-6, sb_y, 4, sb_h), border_radius=2)

    def _draw_centre(self, surf, fonts, gs, t):
        cx_c   = self.W // 2
        slot_ax = cx_c - 240
        slot_bx = cx_c + 44
        slot_y  = self.H // 2 - 88
        sw, sh  = 182, 162

        if self.slot_a and self.slot_b:
            ga = int(16 + 8*math.sin(t*3))
            gs2 = pygame.Surface((480, 300), pygame.SRCALPHA)
            pygame.draw.ellipse(gs2, (160, 50, 255, ga), gs2.get_rect())
            surf.blit(gs2, (cx_c - 240, slot_y - 60))

        self._draw_slot(surf, fonts, gs, slot_ax, slot_y, sw, sh, self.slot_a, "SLOT A", t)
        self._draw_slot(surf, fonts, gs, slot_bx, slot_y, sw, sh, self.slot_b, "SLOT B", t)

        if self.slot_a: self.clear_a_btn.draw(surf, fonts)
        if self.slot_b: self.clear_b_btn.draw(surf, fonts)

        # Plus / chain
        pa = int(160 + 80*math.sin(t*4))
        draw_text(surf, "+", cx_c, slot_y + sh//2 - 8, fonts["title"], (*GREY, pa), "center")

        # Preview of merge result
        preview = self._get_preview(gs) if (self.slot_a and self.slot_b) else None
        if preview:
            tc  = TIER_COLORS.get(preview.tier, WHITE)
            pw, ph = 290, 54
            px  = cx_c - pw//2
            py  = slot_y + sh + 12
            pls = int(120 + 60*math.sin(t*3))
            draw_panel(surf, (px, py, pw, ph), (*tc, pls), (12,6,28), radius=8)
            draw_text(surf, "RESULT PREVIEW", px+8, py+6, fonts["tiny"], GREY)
            draw_text(surf, preview.name, px+8, py+22, fonts["sm_b"], tc, shadow=True)
            draw_text(surf, f"[{preview.tier}]  {rarity_str(preview.rarity)}",
                      px+8, py+38, fonts["tiny"], tc)
            for si, sc in enumerate(preview.colors[:5]):
                pygame.draw.circle(surf, sc, (px+pw-14-si*16, py+22), 7)

        can = self._can_merge(gs)
        pulse = int(140+80*math.sin(t*4)) if can else 55
        self.merge_btn.color = (pulse//2, 18, pulse) if can else (38, 18, 58)
        self.merge_btn.draw(surf, fonts, active=can)

        msg_y = self.H//2 + 172
        if can:
            pa2 = int(160+60*math.sin(t*5))
            draw_text(surf, "⬆ Ready to FUSE!", cx_c, msg_y, fonts["sm"], (*((200,80,255)), pa2), "midtop")
        elif self.slot_a and self.slot_b:
            draw_text(surf, "Need ≥1 of each", cx_c, msg_y, fonts["tiny"], RED, "midtop")
        else:
            draw_text(surf, "Select two auras from the left", cx_c, msg_y, fonts["tiny"], GREY, "midtop")

    def _draw_slot(self, surf, fonts, gs, sx, sy, sw, sh, aura_id, label, t):
        aura = gs.get_aura(aura_id) if aura_id else None
        r    = pygame.Rect(sx, sy, sw, sh)
        if aura:
            tc  = TIER_COLORS.get(aura.tier, WHITE)
            pa  = int(130+80*math.sin(t*2.5))
            draw_panel(surf, r, (*tc, pa), (18, 9, 38), radius=12)
            nc  = len(aura.colors[:5])
            for si, sc in enumerate(aura.colors[:5]):
                ang = t*1.6 + si*(math.pi*2/max(1,nc))
                ox2, oy2 = int(22*math.cos(ang)), int(11*math.sin(ang))
                pygame.draw.circle(surf, sc, (sx+sw//2+ox2, sy+30+oy2), 7)
            draw_text(surf, aura.name, sx+sw//2, sy+56, fonts["med_b"], tc, "center", shadow=True)
            draw_text(surf, f"[{aura.tier}]", sx+sw//2, sy+82, fonts["sm"], tc, "center")
            draw_text(surf, rarity_str(aura.rarity), sx+sw//2, sy+103, fonts["tiny"], GREY, "center")
            draw_text(surf, f"Own: {gs.count_of(aura_id)}×", sx+sw//2, sy+122, fonts["tiny"], GOLD, "center")
        else:
            draw_panel(surf, r, (*BORDER, 55), (9, 9, 22), radius=12)
            dash_off = int(t*22) % 18
            perimeter = r.w*2 + r.h*2
            for d in range(0, perimeter, 18):
                pos = (d + dash_off) % perimeter
                if   pos < r.w:              px2, py2 = sx+pos,         sy
                elif pos < r.w+r.h:          px2, py2 = sx+r.w,         sy+(pos-r.w)
                elif pos < r.w*2+r.h:        px2, py2 = sx+r.w-(pos-r.w-r.h), sy+r.h
                else:                        px2, py2 = sx,             sy+r.h-(pos-r.w*2-r.h)
                pygame.draw.circle(surf, (*BORDER, 90), (px2, py2), 2)
            draw_text(surf, label, sx+sw//2, sy+sh//2-14, fonts["sm_b"], DARK_GREY, "center")
            draw_text(surf, "← click aura", sx+sw//2, sy+sh//2+8, fonts["tiny"], (45,45,72), "center")

    def _draw_result(self, surf, fonts, t):
        aura = self.last_result
        tc   = TIER_COLORS.get(aura.tier, WHITE)
        ox, oy = self.shake.offset
        px = self.W - 308
        py = 60
        ph = self.H - 145
        draw_panel(surf, (px, py, 288, ph), tc, (7, 4, 20), radius=14)

        ha = int(180+60*math.sin(t*2.5))
        hs = pygame.Surface((288, 38), pygame.SRCALPHA)
        hs.fill((*tc, ha//5))
        surf.blit(hs, (px, py))
        draw_text(surf, "✨ FUSION RESULT", px+10, py+10, fonts["sm_b"], tc)

        cx2, cy2 = self._result_cx(), self._result_cy()
        draw_aura_full(surf, cx2+ox, cy2+oy, aura, t,
                       self.particles, self.rings, self.bolts, scale=0.86)

        for si, sc in enumerate(aura.colors[:6]):
            pygame.draw.circle(surf, sc, (px+14+si*20, py+46), 9)

        draw_text(surf, aura.name, px+10, py+66, fonts["big"], tc, shadow=True)
        draw_text(surf, f"[{aura.tier}]", px+10, py+102, fonts["med_b"], tc)
        draw_text(surf, rarity_str(aura.rarity), px+10, py+124, fonts["sm"], GREY)

        # Description word-wrap
        words, line, lines = aura.description.split(), [], []
        for w in words:
            line.append(w)
            if len(" ".join(line)) > 29:
                lines.append(" ".join(line[:-1])); line = [w]
        if line: lines.append(" ".join(line))
        for li, ln in enumerate(lines[:3]):
            draw_text(surf, ln, px+10, py+248+li*18, fonts["tiny"], WHITE)

        draw_text(surf, f"Sell: {aura.sell_value:,} 🪙",   px+10, py+306, fonts["tiny"], GOLD)
        draw_text(surf, f"XP reward: {aura.xp_reward:,}",  px+10, py+324, fonts["tiny"], CYAN)

        # Animated "NEW" badge
        na = int(120+80*math.sin(t*5))
        draw_text(surf, "★ NEW FUSION ★", px+144, py+66, fonts["tiny"], (*GOLD, na), "midtop")

    def _draw_hints(self, surf, fonts, t):
        px = self.W - 308
        py = 60
        ph = self.H - 145
        draw_panel(surf, (px, py, 288, ph), BORDER, (7, 6, 20), radius=14)
        draw_text(surf, "RECIPE HINTS", px+10, py+14, fonts["sm_b"], GREY)

        hints = [
            ("Ember + Aqua",         "Steam",        "Uncommon"),
            ("Frost + Wind",          "Blizzard",     "Rare"),
            ("Lava + Aqua",           "Obsidian",     "Epic"),
            ("Void + Solar",          "Eclipse",      "Legendary"),
            ("Shadow + Solar",        "Twilight",     "Epic"),
            ("Galaxy + Blackhole",    "Quasar",       "Cosmic"),
            ("Joel + Chaos Aura",     "Chaos Joel",   "Cosmic"),
            ("Luck Aura + Jackpot",   "Fortune",      "Divine"),
            ("Juno + Omega",          "Omega Juno",   "Godly"),
        ]
        for i, (combo, result, tier) in enumerate(hints[:8]):
            y = py + 44 + i * 38
            a = int(80 + 40*math.sin(t*1.5+i*0.9))
            tc = TIER_COLORS.get(tier, WHITE)
            draw_panel(surf, (px+6, y, 276, 32), (*BORDER, a), (11,9,26), radius=6)
            draw_text(surf, combo, px+12, y+6,  fonts["tiny"], GREY)
            draw_text(surf, f"→ {result}", px+12, y+20, fonts["tiny"], tc)

    def _draw_history(self, surf, fonts, t):
        bar_y = self.H - 62
        draw_panel(surf, (LIST_W+4, bar_y, self.W-LIST_W-4, 62), BORDER, (7,6,20), radius=0)
        draw_text(surf, "Recent fusions:", LIST_W+10, bar_y+8, fonts["tiny"], GREY)
        for i, aura in enumerate(self.history[:5]):
            tc = TIER_COLORS.get(aura.tier, WHITE)
            ax = LIST_W + 100 + i * 118
            pa = int(140+60*math.sin(t*2+i*0.7))
            pygame.draw.rect(surf, (*tc, pa//5), (ax, bar_y+4, 108, 54), border_radius=8)
            pygame.draw.rect(surf, (*tc, pa//2), (ax, bar_y+4, 108, 54), 1, border_radius=8)
            for si, sc in enumerate(aura.colors[:4]):
                pygame.draw.circle(surf, sc, (ax+8+si*14, bar_y+20), 5)
            draw_text(surf, aura.name[:14], ax+6, bar_y+30, fonts["tiny"], tc)
            draw_text(surf, aura.tier,      ax+6, bar_y+46, fonts["tiny"], GREY)