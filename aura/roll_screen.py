"""
roll_screen.py — Horizontal slot-reel rolling animation.

Fix: target_offset is set so the result card EXACTLY centres when decel ends.
     Decel uses a position-driven approach (lerp to target) not a speed-driven
     one, so overshoot is impossible.
"""
import pygame
import random
import math
from typing import List, Optional, Callable

from auras import AuraDef, ALL_AURAS, TIER_COLORS, rarity_str
from effects import (ParticleSystem, RingSystem, LightningBolt,
                     draw_aura_full, draw_glow, ScreenShake)
from ui import (draw_text, draw_panel, PANEL, BORDER, GOLD, WHITE, GREY,
                GREEN, RED, CYAN, DARK_GREY)

# ── Timing ────────────────────────────────────────────────────────────────────
SPIN_DURATION   = 1.6   # fast scroll phase (seconds)
DECEL_DURATION  = 2.0   # smooth deceleration to stop
REVEAL_DURATION = 1.0   # character zoom-in
HOLD_DURATION   = 3.5   # auto-dismiss after this long

CARD_W  = 260
CARD_H  = 100
GAP     = 10
STRIDE  = CARD_W + GAP   # 270 px

# How many filler cards before the result card.
# At 2400px/s for 1.6s we move ~3840px = ~14 cards.
# We put result at index 30 so decel always has ~16 cards to slow over.
RESULT_IDX = 30


class RollScreen:
    def __init__(self, screen_w: int, screen_h: int):
        self.W = screen_w
        self.H = screen_h
        self.active = False

        self.phase   = "idle"
        self.timer   = 0.0
        self.hold_t  = 0.0

        self.result_aura: Optional[AuraDef] = None
        self.on_done:     Optional[Callable] = None

        self.strip:        List[AuraDef] = []
        # reel_offset = how many px card[0]'s left edge has scrolled left of its start pos
        self.reel_offset   = 0.0
        self.spin_speed    = 0.0   # px/s during spin
        self.decel_start   = 0.0   # reel_offset when decel began
        # target_offset: the reel_offset at which result card is EXACTLY centred
        self.target_offset = 0.0

        self.reveal_t = 0.0

        self.particles = ParticleSystem()
        self.rings     = RingSystem()
        self.bolts:    List[LightningBolt] = []
        self.bolt_timer = 0.0
        self.shake      = ScreenShake()
        self.flash_alpha = 0
        self.flash_color = (255, 255, 255)

        self.is_new       = False
        self.coins_earned = 0
        self.xp_earned    = 0

        self._prev_card_idx = -1  # for boundary bump tracking

    # ── Public ───────────────────────────────────────────────────────────────
    def start(self, result: AuraDef, is_new: bool, coins: int, xp: int,
              on_done: Callable):
        self.result_aura  = result
        self.is_new       = is_new
        self.coins_earned = coins
        self.xp_earned    = xp
        self.on_done      = on_done
        self.active       = True
        self.timer        = 0.0
        self.hold_t       = 0.0
        self.phase        = "spin"
        self.reveal_t     = 0.0

        # Build strip: fillers + result at RESULT_IDX + a few more after
        candidates = [a for a in ALL_AURAS if a.rarity <= 3000]
        if not candidates:
            candidates = ALL_AURAS[:8]

        total = RESULT_IDX + 8
        self.strip = [random.choice(candidates) for _ in range(total)]
        self.strip[RESULT_IDX] = result   # guaranteed placement

        self.reel_offset  = 0.0
        self.spin_speed   = 2400.0
        self._prev_card_idx = -1

        # ── Key formula ──────────────────────────────────────────────────────
        # card[i] screen-left  =  (W//2 - CARD_W//2)  +  i*STRIDE  -  reel_offset
        # We want card[RESULT_IDX] screen-left  =  W//2 - CARD_W//2
        # i.e.  (W//2 - CARD_W//2) + RESULT_IDX*STRIDE - target  =  W//2 - CARD_W//2
        # → target  =  RESULT_IDX * STRIDE
        self.target_offset = RESULT_IDX * STRIDE   # exact, no approximation

        self.decel_start  = 0.0

        self.particles.clear()
        self.bolts.clear()
        self.flash_alpha  = 0
        self.shake.trauma = 0.0
        self.bolt_timer   = 0.0

    # ── Update ────────────────────────────────────────────────────────────────
    def update(self, dt: float, events: list):
        if not self.active:
            return

        self.timer += dt

        if self.phase == "spin":
            self._update_spin(dt)
        elif self.phase == "decel":
            self._update_decel(dt)
        elif self.phase == "reveal":
            self._update_reveal(dt)
        elif self.phase == "hold":
            self._update_hold(dt, events)

        if self.result_aura:
            self.rings.update(dt, self.result_aura.ring_count)

        if self.result_aura and self.result_aura.lightning and self.phase in ("reveal", "hold"):
            self.bolt_timer -= dt
            if self.bolt_timer <= 0:
                self.bolts.append(LightningBolt(
                    self.W // 2, self.H // 2 - 80,
                    self.result_aura.colors[-1]))
                self.bolt_timer = random.uniform(0.1, 0.25)
        self.bolts = [b for b in self.bolts if b.update(dt)]

        self.particles.update(dt)
        if self.phase in ("reveal", "hold") and self.result_aura:
            self.particles.spawn_ambient(self.W // 2, self.H // 2 - 80,
                                         self.result_aura, 3)

        self.flash_alpha = max(0, self.flash_alpha - int(500 * dt))
        self.shake.update(dt)

    # ──────────────────────────────────────────────────────────────────────────
    def _update_spin(self, dt: float):
        self.reel_offset += self.spin_speed * dt
        self._check_card_bump()

        if self.timer >= SPIN_DURATION:
            self.phase        = "decel"
            self.timer        = 0.0
            self.decel_start  = self.reel_offset

    # ──────────────────────────────────────────────────────────────────────────
    def _update_decel(self, dt: float):
        """
        Position-driven decel: lerp reel_offset toward target using
        a smoothstep curve, so we ALWAYS land exactly on target_offset.
        No speed floor, no overshoot possible.
        """
        t     = min(1.0, self.timer / DECEL_DURATION)
        # ease-out cubic: fast start, very slow finish
        ease  = 1.0 - (1.0 - t) ** 3
        new_offset = self.decel_start + ease * (self.target_offset - self.decel_start)

        prev = self.reel_offset
        self.reel_offset = new_offset
        self._check_card_bump(prev)

        if t >= 1.0:
            self.reel_offset = self.target_offset   # snap to exact pixel
            self._begin_reveal()

    def _check_card_bump(self, prev_offset: float = None):
        """Add tiny shake each time a card boundary is crossed."""
        if prev_offset is None:
            prev_offset = self.reel_offset - self.spin_speed * 0.016
        curr_idx = int(self.reel_offset / STRIDE)
        prev_idx = int(prev_offset / STRIDE)
        if curr_idx > prev_idx and curr_idx != self._prev_card_idx:
            self._prev_card_idx = curr_idx
            # bump strength scales with remaining distance (stronger early)
            remaining_frac = max(0.0, 1.0 - self.reel_offset / self.target_offset)
            self.shake.add(0.03 + remaining_frac * 0.05)

    # ──────────────────────────────────────────────────────────────────────────
    def _begin_reveal(self):
        self.phase        = "reveal"
        self.timer        = 0.0
        self.reveal_t     = 0.0
        self.flash_alpha  = 255
        self.flash_color  = self.result_aura.colors[0]
        log_r     = math.log10(max(1, self.result_aura.rarity))
        intensity = 0.25 + min(0.75, log_r / 8.0)
        self.shake.add(intensity)
        burst = min(300, max(40, self.result_aura.particles))
        self.particles.spawn_star_burst(self.W // 2, self.H // 2 - 80,
                                        self.result_aura, burst)

    # ──────────────────────────────────────────────────────────────────────────
    def _update_reveal(self, dt: float):
        self.reveal_t = min(1.0, self.timer / REVEAL_DURATION)
        if self.reveal_t >= 1.0:
            self.phase  = "hold"
            self.hold_t = 0.0
            self.timer  = 0.0
            if self.result_aura.rarity >= 10_000:
                self.shake.add(0.4)

    # ──────────────────────────────────────────────────────────────────────────
    def _update_hold(self, dt: float, events: list):
        self.hold_t += dt
        skip = self.hold_t >= HOLD_DURATION
        for ev in events:
            if ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1 and self.hold_t > 0.4:
                skip = True
            if ev.type == pygame.KEYDOWN and ev.key in (pygame.K_SPACE, pygame.K_RETURN) \
                    and self.hold_t > 0.4:
                skip = True
        if skip:
            self.active = False
            self.phase  = "idle"
            if self.on_done:
                self.on_done()

    # ── Draw ──────────────────────────────────────────────────────────────────
    def draw(self, surf: pygame.Surface, fonts: dict):
        if not self.active:
            return

        # Dark overlay
        ov = pygame.Surface((self.W, self.H), pygame.SRCALPHA)
        ov.fill((4, 4, 14, 235))
        surf.blit(ov, (0, 0))

        ox, oy = self.shake.offset

        if self.phase in ("spin", "decel"):
            self._draw_reel(surf, fonts, ox, oy)
        elif self.phase in ("reveal", "hold"):
            self._draw_reveal_scene(surf, fonts, ox, oy)

        if self.flash_alpha > 0:
            fc = self.flash_color
            fs = pygame.Surface((self.W, self.H), pygame.SRCALPHA)
            fs.fill((*fc, min(110, self.flash_alpha)))
            surf.blit(fs, (0, 0))

    # ── Reel ──────────────────────────────────────────────────────────────────
    def _draw_reel(self, surf: pygame.Surface, fonts: dict, ox: int, oy: int):
        W, H = self.W, self.H

        # centre slot position on screen (constant)
        slot_left = W // 2 - CARD_W // 2    # left edge of the "winner" slot
        reel_y    = H // 2 - CARD_H // 2

        # Track panel
        track_rect = pygame.Rect(0, reel_y - 22, W, CARD_H + 44)
        ts = pygame.Surface((track_rect.w, track_rect.h), pygame.SRCALPHA)
        ts.fill((8, 8, 25, 215))
        surf.blit(ts, track_rect.topleft)
        pygame.draw.rect(surf, (*BORDER, 90), track_rect, 1)

        # card[i] left edge on screen:
        #   slot_left  +  (i - RESULT_IDX) * STRIDE  +  (target_offset - reel_offset)
        #
        # When reel_offset == target_offset, card[RESULT_IDX] left = slot_left  ✓
        # The whole strip slides left as reel_offset increases.
        scroll_delta = int(self.target_offset - self.reel_offset)

        first_i = max(0, int((self.reel_offset - W) / STRIDE))
        last_i  = min(len(self.strip) - 1, first_i + W // STRIDE + 4)

        for i in range(first_i, last_i + 1):
            card_left = slot_left + (i - RESULT_IDX) * STRIDE + scroll_delta + ox
            if card_left + CARD_W < 0 or card_left > W:
                continue

            aura = self.strip[i]
            tc   = TIER_COLORS.get(aura.tier, WHITE)
            card_cx = card_left + CARD_W // 2
            centre_x = W // 2 + ox

            dist   = abs(card_cx - centre_x)
            norm   = min(1.0, dist / (W * 0.52))
            fade   = 1.0 - norm * 0.82
            alpha  = int(255 * fade)
            vscale = 1.0 - norm * 0.28

            ch = max(4, int(CARD_H * vscale))
            cw = max(4, int(CARD_W * vscale))
            cy_card = reel_y + (CARD_H - ch) // 2 + oy

            cs = pygame.Surface((cw, ch), pygame.SRCALPHA)

            # Gradient card background
            for row in range(ch):
                tr  = row / max(1, ch - 1)
                rv  = min(255, int((10 + tc[0] * 0.08) * (1 - tr * 0.25)))
                gv  = min(255, int((10 + tc[1] * 0.08) * (1 - tr * 0.25)))
                bv  = min(255, int((22 + tc[2] * 0.12) * (1 - tr * 0.20)))
                pygame.draw.line(cs, (rv, gv, bv, int(210 * fade)),
                                 (0, row), (cw, row))

            # Left accent bar
            pygame.draw.rect(cs, (*tc, int(210 * fade)), (0, 0, 5, ch), border_radius=3)

            # Colour swatches
            for si, sc in enumerate(aura.colors[:4]):
                pygame.draw.circle(cs, sc, (cw - 10 - si * 16, 13), 6)

            # Name
            ns = fonts["med_b"].render(aura.name, True, tc)
            ns.set_alpha(alpha)
            cs.blit(ns, (12, int(ch * 0.14)))

            # Tier + rarity
            ss = fonts["tiny"].render(f"[{aura.tier}]  {rarity_str(aura.rarity)}", True, GREY)
            ss.set_alpha(alpha)
            cs.blit(ss, (12, int(ch * 0.55)))

            is_centre = dist < STRIDE * 0.5
            b_col = (*tc, 230) if is_centre else (*BORDER, int(70 * fade))
            pygame.draw.rect(cs, b_col, (0, 0, cw, ch), 2 if is_centre else 1, border_radius=8)

            surf.blit(cs, (card_left, cy_card))

        # Edge fade masks (draw AFTER cards so they cover edges cleanly)
        fade_w = 170
        for side in range(2):
            for px in range(fade_w):
                t_frac = px / fade_w
                a = int(235 * (1 - t_frac)) if side == 0 else int(235 * t_frac)
                x = px if side == 0 else W - fade_w + px
                pygame.draw.line(surf, (4, 4, 14),
                                 (x, track_rect.top), (x, track_rect.bottom))

        # Selector bracket
        bx  = W // 2 - CARD_W // 2 - 6 + ox
        by  = reel_y - 9 + oy
        bw  = CARD_W + 12
        bh  = CARD_H + 18
        pa  = int(150 + 80 * math.sin(self.timer * 7))
        for gi in range(4, 0, -1):
            gr = pygame.Rect(bx - gi*3, by - gi*2, bw + gi*6, bh + gi*4)
            pygame.draw.rect(surf, (*GOLD, pa // (gi * 2 + 1)), gr, 1, border_radius=10 + gi)
        pygame.draw.rect(surf, (*GOLD, pa), (bx, by, bw, bh), 2, border_radius=10)

        # Arrows
        ay   = H // 2 + oy
        ax_l = W // 2 - CARD_W // 2 - 24 + ox
        ax_r = W // 2 + CARD_W // 2 + 24 + ox
        pygame.draw.polygon(surf, GOLD, [(ax_l, ay), (ax_l+14, ay-10), (ax_l+14, ay+10)])
        pygame.draw.polygon(surf, GOLD, [(ax_r, ay), (ax_r-14, ay-10), (ax_r-14, ay+10)])

        label = "ROLLING..." if self.phase == "spin" else "LANDING..."
        draw_text(surf, label, W // 2 + ox, reel_y - 48, fonts["big"], GREY, "midbottom", shadow=True)

    # ── Reveal scene ──────────────────────────────────────────────────────────
    def _draw_reveal_scene(self, surf: pygame.Surface, fonts: dict, ox: int, oy: int):
        aura = self.result_aura
        tc   = TIER_COLORS.get(aura.tier, WHITE)
        W, H = self.W, self.H

        t_ease = self.reveal_t ** 2 * (3 - 2 * self.reveal_t)
        scale  = 0.15 + t_ease * 0.85

        # Background radial glow
        glow_a = int(t_ease * 55)
        for ri in range(7, 0, -1):
            rr = 60 + ri * 35
            gs = pygame.Surface((rr * 2, rr * 2), pygame.SRCALPHA)
            pygame.draw.circle(gs, (*tc, max(0, glow_a - ri * 6)), (rr, rr), rr)
            surf.blit(gs, (W // 2 - rr + ox, H // 2 - 80 - rr + oy))

        cx = W // 2 + ox
        cy = H // 2 - 80 + oy
        draw_aura_full(surf, cx, cy, aura, self.timer,
                       self.particles, self.rings, self.bolts, scale=scale)

        # Info panel slides up
        ph = 185
        pw = 520
        px = W // 2 - pw // 2
        pe = t_ease
        py = int(H - 14 - ph * pe)

        if pe > 0.03:
            draw_panel(surf, (px, py, pw, ph), tc, (6, 6, 20), radius=14)

            if self.is_new:
                bw2, bh2 = 94, 34
                bs = pygame.Surface((bw2, bh2), pygame.SRCALPHA)
                bs.fill((*GOLD, 230))
                surf.blit(bs, (px + pw - bw2 - 6, py - bh2 // 2))
                draw_text(surf, "✨ NEW!", px + pw - bw2 // 2 - 6,
                          py - bh2 // 2 + bh2 // 2, fonts["sm_b"], (8, 8, 8), "center")

            for si, sc in enumerate(aura.colors[:6]):
                pygame.draw.circle(surf, sc, (px + 18 + si * 22, py + 22), 9)

            draw_text(surf, aura.name, px + 16, py + 40, fonts["big"], tc, shadow=True)
            tw2 = fonts["med_b"].size(f"[{aura.tier}]")[0]
            draw_text(surf, f"[{aura.tier}]", px + 16, py + 82, fonts["med_b"], tc)
            draw_text(surf, f"  {rarity_str(aura.rarity)}", px + 16 + tw2, py + 85, fonts["sm"], GREY)
            draw_text(surf, aura.description, px + 16, py + 114, fonts["sm"], WHITE)
            draw_text(surf, f"+{self.coins_earned:,} 🪙    +{self.xp_earned:,} xp",
                      px + pw - 14, py + 40, fonts["sm_b"], GOLD, "topright")

        if self.phase == "hold" and self.hold_t > 0.6:
            blink = abs(math.sin(self.hold_t * 2.8))
            hint  = fonts["sm"].render("[ CLICK  or  SPACE  to continue ]", True, GREY)
            hint.set_alpha(int(blink * 160 + 40))
            surf.blit(hint, (W // 2 - hint.get_width() // 2, H - 34))