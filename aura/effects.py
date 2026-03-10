"""
effects.py — Particle system, screen shake, lightning, and rich aura rendering.
Each tier gets increasingly elaborate visual treatment.
"""
import pygame
import random
import math
from typing import List, Tuple, Optional
from auras import AuraDef

Color = Tuple[int, int, int]


# ── Screen shake ──────────────────────────────────────────────────────────────
class ScreenShake:
    def __init__(self):
        self.trauma: float   = 0.0
        self.offset: Tuple[int, int] = (0, 0)
        self._seed = random.random() * 1000

    def add(self, amount: float):
        self.trauma = min(1.0, self.trauma + amount)

    def update(self, dt: float) -> Tuple[int, int]:
        self.trauma = max(0.0, self.trauma - dt * 1.8)
        self._seed  += dt * 8
        mag = self.trauma ** 2 * 20
        # Smooth shake using sin instead of pure random
        ox = int(math.sin(self._seed * 2.1) * mag)
        oy = int(math.sin(self._seed * 3.7) * mag)
        self.offset = (ox, oy)
        return self.offset


# ── Particle ──────────────────────────────────────────────────────────────────
class Particle:
    __slots__ = ('x','y','vx','vy','life','max_life','color','size','gravity',
                 'fade_mode','spin','spin_speed','shape')

    def __init__(self, x, y, vx, vy, life, color, size,
                 gravity=0.04, fade_mode="out", shape="circle"):
        self.x, self.y     = float(x), float(y)
        self.vx, self.vy   = float(vx), float(vy)
        self.life = self.max_life = float(life)
        self.color    = color
        self.size     = float(size)
        self.gravity  = gravity
        self.fade_mode = fade_mode
        self.spin      = random.uniform(0, math.tau)
        self.spin_speed = random.uniform(-4, 4)
        self.shape     = shape   # "circle" | "star" | "diamond"

    def update(self, dt: float) -> bool:
        self.x  += self.vx * dt * 60
        self.y  += self.vy * dt * 60
        self.vy += self.gravity * dt * 60
        self.vx *= (1.0 - dt * 0.3)  # slight air resistance
        self.life -= dt
        self.spin += self.spin_speed * dt
        return self.life > 0

    @property
    def alpha(self) -> int:
        t = self.life / self.max_life
        if self.fade_mode == "in_out":
            a = math.sin(t * math.pi)
        elif self.fade_mode == "late":
            a = t * t
        else:
            a = t
        return max(0, min(255, int(a * 255)))

    def draw(self, surf: pygame.Surface):
        a = self.alpha
        if a <= 2 or self.size < 0.5:
            return
        s = max(1, int(self.size))
        ix, iy = int(self.x), int(self.y)

        if self.shape == "circle":
            ps = pygame.Surface((s*2+2, s*2+2), pygame.SRCALPHA)
            pygame.draw.circle(ps, (*self.color, a), (s+1, s+1), s)
            surf.blit(ps, (ix - s, iy - s))
        elif self.shape == "star":
            _draw_star(surf, ix, iy, s, self.color, a, self.spin)
        elif self.shape == "diamond":
            _draw_diamond(surf, ix, iy, s, self.color, a)


def _draw_star(surf, cx, cy, r, color, alpha, angle):
    pts = []
    for i in range(8):
        a  = angle + i * math.pi / 4
        ri = r if i % 2 == 0 else r * 0.4
        pts.append((cx + math.cos(a) * ri, cy + math.sin(a) * ri))
    if len(pts) >= 3:
        ps = pygame.Surface((r*4, r*4), pygame.SRCALPHA)
        shifted = [(p[0]-cx+r*2, p[1]-cy+r*2) for p in pts]
        pygame.draw.polygon(ps, (*color, alpha), shifted)
        surf.blit(ps, (cx-r*2, cy-r*2))


def _draw_diamond(surf, cx, cy, r, color, alpha):
    pts = [(cx, cy-r), (cx+r, cy), (cx, cy+r), (cx-r, cy)]
    ps  = pygame.Surface((r*2+2, r*2+2), pygame.SRCALPHA)
    shifted = [(p[0]-cx+r+1, p[1]-cy+r+1) for p in pts]
    pygame.draw.polygon(ps, (*color, alpha), shifted)
    surf.blit(ps, (cx-r-1, cy-r-1))


# ── Particle system ───────────────────────────────────────────────────────────
class ParticleSystem:
    def __init__(self):
        self.particles: List[Particle] = []

    def clear(self):
        self.particles.clear()

    def spawn_burst(self, cx, cy, aura: AuraDef, count: int,
                    speed_range=(0.4, 3.0), size_range=(2, 7),
                    radius_range=(20, 80), gravity=0.04, life_range=(0.6, 2.0)):
        tier_shape = _tier_shape(aura.tier)
        for _ in range(count):
            angle = random.uniform(0, math.tau)
            dist  = random.uniform(*radius_range)
            speed = random.uniform(*speed_range)
            color = random.choice(aura.colors)
            life  = random.uniform(*life_range)
            self.particles.append(Particle(
                cx + math.cos(angle) * dist,
                cy + math.sin(angle) * dist,
                math.cos(angle) * speed * 0.5 + random.uniform(-0.3, 0.3),
                math.sin(angle) * speed * 0.5 + random.uniform(-0.4, 0.1) - 0.5,
                life, color, random.uniform(*size_range),
                gravity, "in_out", tier_shape
            ))

    def spawn_ambient(self, cx, cy, aura: AuraDef, count: int = 2):
        for _ in range(count):
            angle = random.uniform(0, math.tau)
            dist  = random.uniform(20, 75)
            color = random.choice(aura.colors)
            self.particles.append(Particle(
                cx + math.cos(angle) * dist,
                cy + math.sin(angle) * dist,
                random.uniform(-0.15, 0.15),
                random.uniform(-0.7, -0.15),
                random.uniform(0.8, 2.0),
                color, random.uniform(2, 5),
                0.0, "out", "circle"
            ))

    def spawn_star_burst(self, cx, cy, aura: AuraDef, count: int = 80):
        tier_shape = _tier_shape(aura.tier)
        for _ in range(count):
            angle = random.uniform(0, math.tau)
            speed = random.uniform(1.5, 6.0)
            color = random.choice(aura.colors)
            self.particles.append(Particle(
                cx, cy,
                math.cos(angle) * speed,
                math.sin(angle) * speed,
                random.uniform(0.7, 1.8),
                color, random.uniform(3, 10),
                -0.02, "in_out", tier_shape
            ))

    def spawn_confetti(self, cx, cy, aura: AuraDef, count: int = 60):
        """Confetti rain for very rare pulls."""
        for _ in range(count):
            color = random.choice(aura.colors)
            self.particles.append(Particle(
                cx + random.uniform(-200, 200),
                cy - random.uniform(0, 80),
                random.uniform(-0.8, 0.8),
                random.uniform(-0.5, 1.5),
                random.uniform(1.5, 3.0),
                color, random.uniform(3, 7),
                0.06, "late", "diamond"
            ))

    def update(self, dt: float):
        self.particles = [p for p in self.particles if p.update(dt)]

    def draw(self, surf: pygame.Surface):
        for p in self.particles:
            p.draw(surf)

    def __len__(self):
        return len(self.particles)


def _tier_shape(tier: str) -> str:
    if tier in ("Godly", "???", "Cosmic", "Divine"):
        return "star"
    if tier in ("Legendary", "Mythic"):
        return "diamond"
    return "circle"


# ── Lightning bolt ────────────────────────────────────────────────────────────
class LightningBolt:
    def __init__(self, cx, cy, color, life=0.10):
        self.color    = color
        self.life     = self.max_life = life
        self.points   = self._generate(cx, cy)
        self.width    = random.randint(1, 3)

    def _generate(self, cx, cy):
        bx = cx + random.randint(-60, 60)
        by = cy - 100
        pts = [(bx, by)]
        segs = random.randint(5, 10)
        for i in range(segs):
            bx += random.randint(-25, 25)
            by += random.randint(14, 30)
            pts.append((bx, by))
        return pts

    def update(self, dt) -> bool:
        self.life -= dt
        return self.life > 0

    def draw(self, surf):
        if len(self.points) < 2:
            return
        a = int(255 * (self.life / self.max_life))
        for i in range(len(self.points) - 1):
            p1, p2 = self.points[i], self.points[i + 1]
            pygame.draw.line(surf, (*self.color, min(255, a // 3)), p1, p2, self.width + 3)
            pygame.draw.line(surf, (*self.color, a),                p1, p2, self.width)
            # bright white core
            pygame.draw.line(surf, (255, 255, 255, min(255, a // 2)), p1, p2, 1)


# ── Ring system ───────────────────────────────────────────────────────────────
class RingSystem:
    def __init__(self):
        self.angles  = [random.uniform(0, math.tau) for _ in range(10)]
        self.wobble  = [random.uniform(0, math.tau) for _ in range(10)]

    def update(self, dt: float, count: int):
        for i in range(count):
            speed = 0.9 + i * 0.4
            self.angles[i] = (self.angles[i] + speed * dt) % math.tau
            self.wobble[i] = (self.wobble[i] + dt * 1.5) % math.tau

    def draw(self, surf: pygame.Surface, cx: int, cy: int, aura: AuraDef,
             scale: float = 1.0, t: float = 0.0):
        for ri in range(aura.ring_count):
            ang  = self.angles[ri]
            wob  = math.sin(self.wobble[ri]) * 0.08   # slight wobble in radius
            rad  = (55 + ri * 18) * scale * (1.0 + wob)
            ry_ratio = 0.35 + (ri % 2) * 0.08        # slight variety per ring

            rx = int(cx + math.cos(ang) * rad)
            ry = int(cy + math.sin(ang) * rad * ry_ratio)
            rc = aura.colors[ri % len(aura.colors)]
            sz = int((5 + ri) * scale)

            # Glow halo
            gsurf = pygame.Surface((sz * 6, sz * 6), pygame.SRCALPHA)
            pygame.draw.circle(gsurf, (*rc, 35), (sz*3, sz*3), sz*3)
            pygame.draw.circle(gsurf, (*rc, 100), (sz*3, sz*3), sz*2)
            pygame.draw.circle(gsurf, (*rc, 220), (sz*3, sz*3), sz)
            surf.blit(gsurf, (rx - sz*3, ry - sz*3))

            # If trail enabled: draw a faded trail behind the orb
            if aura.trail:
                trail_steps = 6
                for ti in range(1, trail_steps + 1):
                    t_ang = ang - ti * 0.18
                    trx   = int(cx + math.cos(t_ang) * rad)
                    try_  = int(cy + math.sin(t_ang) * rad * ry_ratio)
                    ta    = max(0, 80 - ti * 13)
                    ts    = max(1, sz - ti)
                    tsurf = pygame.Surface((ts*2+2, ts*2+2), pygame.SRCALPHA)
                    pygame.draw.circle(tsurf, (*rc, ta), (ts+1, ts+1), ts)
                    surf.blit(tsurf, (trx - ts, try_ - ts))


# ── Character renderer ────────────────────────────────────────────────────────
def draw_character(surf: pygame.Surface, cx: int, cy: int, scale: float = 1.0):
    """Draws a cleaner, more detailed character silhouette."""
    def s(v):
        return int(v * scale)

    body   = (52, 52, 72)
    dark   = (35, 35, 55)
    skin   = (198, 158, 118)
    hair   = (38, 28, 18)
    whites = (240, 240, 240)
    pupil  = (25, 15, 8)
    shade  = (30, 30, 50)

    # Shadow under feet
    sh = pygame.Surface((s(60), s(10)), pygame.SRCALPHA)
    pygame.draw.ellipse(sh, (0, 0, 0, 60), (0, 0, s(60), s(10)))
    surf.blit(sh, (cx - s(30), cy + s(38)))

    # Legs (with subtle shading)
    for lx, dx in [(-s(13), -1), (s(4), 1)]:
        pygame.draw.rect(surf, dark, (cx + lx - 1, cy + s(10) + 1, s(11), s(30)), border_radius=s(4))
        pygame.draw.rect(surf, body, (cx + lx,     cy + s(10),     s(11), s(29)), border_radius=s(4))

    # Torso
    pygame.draw.rect(surf, dark, (cx - s(17)+1, cy - s(21)+1, s(35), s(35)), border_radius=s(6))
    pygame.draw.rect(surf, body, (cx - s(17),   cy - s(22),   s(35), s(35)), border_radius=s(6))

    # Belt line
    pygame.draw.rect(surf, shade, (cx - s(17), cy + s(8), s(35), s(4)), border_radius=s(2))

    # Arms
    for ax, da in [(-s(30), -1), (s(18), 1)]:
        pygame.draw.rect(surf, dark, (cx + ax+1, cy - s(21)+1, s(12), s(30)), border_radius=s(4))
        pygame.draw.rect(surf, body, (cx + ax,   cy - s(22),   s(12), s(30)), border_radius=s(4))

    # Neck
    pygame.draw.rect(surf, skin, (cx - s(6), cy - s(29), s(13), s(10)))

    # Head
    pygame.draw.ellipse(surf, (165, 125, 90), (cx - s(20)+1, cy - s(60)+1, s(41), s(35)))
    pygame.draw.ellipse(surf, skin, (cx - s(20), cy - s(61), s(41), s(35)))

    # Hair
    pygame.draw.ellipse(surf, hair, (cx - s(22), cy - s(65), s(45), s(24)))
    # Hair side bits
    pygame.draw.ellipse(surf, hair, (cx - s(22), cy - s(56), s(10), s(16)))
    pygame.draw.ellipse(surf, hair, (cx + s(12),  cy - s(56), s(10), s(16)))

    # Eyes
    for ex, eo in [(-s(7), -1), (s(6), 1)]:
        # Eye white
        pygame.draw.ellipse(surf, whites, (cx + ex - s(4), cy - s(51), s(8), s(6)))
        # Pupil
        pygame.draw.circle(surf, pupil, (cx + ex, cy - s(49)), s(2))
        # Shine
        pygame.draw.circle(surf, whites, (cx + ex + 1, cy - s(50)), 1)

    # Slight smile
    pygame.draw.arc(surf, skin, (cx - s(6), cy - s(44), s(12), s(6)), math.pi, math.tau, 1)


# ── Glow helper ───────────────────────────────────────────────────────────────
def draw_glow(surf: pygame.Surface, cx: int, cy: int, color: Color,
              radius: int, alpha_peak: int = 80, steps: int = 8):
    for i in range(steps, 0, -1):
        r = radius + i * 12
        a = int(alpha_peak * (i / steps) ** 1.5)
        gs = pygame.Surface((r * 2, r * 2), pygame.SRCALPHA)
        pygame.draw.circle(gs, (*color, a), (r, r), r)
        surf.blit(gs, (cx - r, cy - r))


# ── Per-tier special effects ──────────────────────────────────────────────────
def _draw_tier_extras(surf: pygame.Surface, cx: int, cy: int,
                      aura: AuraDef, t: float, scale: float):
    tier = aura.tier

    if tier == "Common":
        # Subtle shimmer ring
        for i in range(1):
            a = int(40 + 20 * math.sin(t * 2 + i))
            r = int(50 * scale)
            gs = pygame.Surface((r*2, r*2), pygame.SRCALPHA)
            pygame.draw.circle(gs, (*aura.colors[0], a), (r, r), r, 2)
            surf.blit(gs, (cx - r, cy - r))

    elif tier == "Uncommon":
        # Slow spinning outer ring
        for i in range(6):
            ang = t * 1.2 + i * math.tau / 6
            r   = int(68 * scale)
            px  = int(cx + math.cos(ang) * r)
            py  = int(cy + math.sin(ang) * r * 0.4)
            c   = aura.colors[i % len(aura.colors)]
            pygame.draw.circle(surf, c, (px, py), int(4 * scale))

    elif tier == "Rare":
        # Crystal shard lines
        for i in range(8):
            ang   = t * 0.6 + i * math.tau / 8
            r1    = int(55 * scale)
            r2    = int(75 * scale)
            c     = aura.colors[i % len(aura.colors)]
            p1    = (int(cx + math.cos(ang) * r1), int(cy + math.sin(ang) * r1 * 0.5))
            p2    = (int(cx + math.cos(ang) * r2), int(cy + math.sin(ang) * r2 * 0.5))
            ls    = pygame.Surface((abs(p2[0]-p1[0])+4, abs(p2[1]-p1[1])+4), pygame.SRCALPHA)
            pygame.draw.line(surf, (*c, 150), p1, p2, 2)

    elif tier == "Epic":
        # Two counter-rotating rings of orbs
        for ring_i, (speed, radius, n_orbs) in enumerate([(1.5, 75, 8), (-1.0, 90, 6)]):
            for i in range(n_orbs):
                ang = t * speed + i * math.tau / n_orbs
                rx  = int(cx + math.cos(ang) * radius * scale)
                ry  = int(cy + math.sin(ang) * radius * scale * 0.35)
                c   = aura.colors[(i + ring_i) % len(aura.colors)]
                pygame.draw.circle(surf, c, (rx, ry), int(5 * scale))

    elif tier == "Legendary":
        # Pulsing energy waves
        for wi in range(3):
            wave_t  = (t * 1.5 + wi * 0.5) % 2.0
            wave_r  = int((60 + wave_t * 60) * scale)
            wave_a  = int(120 * (1.0 - wave_t / 2.0))
            c       = aura.colors[wi % len(aura.colors)]
            ws      = pygame.Surface((wave_r*2, wave_r*2), pygame.SRCALPHA)
            pygame.draw.circle(ws, (*c, wave_a), (wave_r, wave_r), wave_r, 3)
            surf.blit(ws, (cx - wave_r, cy - wave_r))

    elif tier in ("Divine", "Mythic"):
        # Cross beams
        beam_a = int(100 + 60 * math.sin(t * 2))
        beam_len = int(120 * scale)
        for ang_off in [0, math.pi/2, math.pi/4, 3*math.pi/4]:
            p1 = (int(cx + math.cos(ang_off) * beam_len), int(cy + math.sin(ang_off) * beam_len * 0.5))
            p2 = (int(cx - math.cos(ang_off) * beam_len), int(cy - math.sin(ang_off) * beam_len * 0.5))
            c  = aura.colors[0]
            bs = pygame.Surface(surf.get_size(), pygame.SRCALPHA)
            pygame.draw.line(bs, (*c, beam_a), p1, p2, 2)
            surf.blit(bs, (0, 0))

    elif tier in ("Cosmic", "Godly", "???"):
        # Full rotating galaxy arms
        num_arms  = 4
        arm_len   = int(110 * scale)
        for arm in range(num_arms):
            base_ang = t * 0.5 + arm * math.tau / num_arms
            for step in range(20):
                frac  = step / 20
                ang   = base_ang + frac * math.pi * 0.6
                r     = int(frac * arm_len)
                px    = int(cx + math.cos(ang) * r)
                py    = int(cy + math.sin(ang) * r * 0.35)
                a     = int(180 * (1 - frac))
                c     = aura.colors[step % len(aura.colors)]
                sz    = max(1, int((4 - frac * 3) * scale))
                gs    = pygame.Surface((sz*2+2, sz*2+2), pygame.SRCALPHA)
                pygame.draw.circle(gs, (*c, a), (sz+1, sz+1), sz)
                surf.blit(gs, (px - sz, py - sz))


# ── Main aura renderer ────────────────────────────────────────────────────────
def draw_aura_full(surf: pygame.Surface, cx: int, cy: int,
                   aura: AuraDef, t: float,
                   particles: ParticleSystem,
                   rings: RingSystem,
                   lightning_bolts: List[LightningBolt],
                   scale: float = 1.0,
                   char_scale: float = 1.0):

    pulse_r = int((55 + 12 * math.sin(t * 2.8)) * scale) if aura.pulse else int(55 * scale)

    # Layer 1: big soft outer glow
    draw_glow(surf, cx, cy, aura.colors[0], int(pulse_r * 1.4), 60, steps=8)

    # Layer 2: secondary colour glow
    if len(aura.colors) > 1:
        draw_glow(surf, cx, cy, aura.colors[1], int(pulse_r * 0.9), 35, steps=5)

    # Layer 3: per-tier extras (behind character)
    _draw_tier_extras(surf, cx, cy, aura, t, scale)

    # Layer 4: lightning bolts
    for bolt in lightning_bolts:
        bolt.draw(surf)

    # Layer 5: ring orbs
    rings.draw(surf, cx, cy, aura, scale, t)

    # Layer 6: particles
    particles.draw(surf)

    # Layer 7: star-burst sparkles
    if aura.star_burst:
        n_sparks = 4 + int(scale * 3)
        for _ in range(n_sparks):
            sx = cx + random.randint(-int(80*scale), int(80*scale))
            sy = cy + random.randint(-int(90*scale), int(30*scale))
            sc = random.choice(aura.colors)
            sr = random.randint(2, max(2, int(6*scale)))
            pygame.draw.circle(surf, sc, (sx, sy), sr)
            if aura.rarity >= 10000:
                cross_len = sr + 3
                pygame.draw.line(surf, sc, (sx-cross_len, sy), (sx+cross_len, sy), 1)
                pygame.draw.line(surf, sc, (sx, sy-cross_len), (sx, sy+cross_len), 1)

    # Layer 8: character (always on top of effects)
    draw_character(surf, cx, cy, scale)

    # Layer 9: inner body glow (wraps the character)
    inner_r = int(38 * scale)
    inner_s = pygame.Surface((inner_r*2, inner_r*2), pygame.SRCALPHA)
    a_pulse = int(30 + 20 * math.sin(t * 3)) if aura.pulse else 25
    pygame.draw.circle(inner_s, (*aura.colors[0], a_pulse), (inner_r, inner_r), inner_r)
    surf.blit(inner_s, (cx - inner_r, cy - inner_r))