"""
ui.py — Reusable UI widgets, font loader, utility drawing functions.
"""
import pygame
import math
from typing import Tuple, Optional, List
from auras import AuraDef, TIER_COLORS, rarity_str

Color = Tuple[int, int, int]

# ── Palette ──────────────────────────────────────────────────────────────────
BG         = (6,  6,  18)
BG2        = (12, 12, 28)
PANEL      = (18, 18, 40)
PANEL2     = (24, 24, 50)
BORDER     = (45, 45, 90)
WHITE      = (255, 255, 255)
GREY       = (130, 130, 155)
DARK_GREY  = (60,  60,  80)
GOLD       = (255, 215,  0)
CYAN       = (0,  220, 255)
GREEN      = (80, 220,  80)
RED        = (220,  60,  60)
MAGENTA    = (255,  0,  200)


def load_fonts() -> dict:
    """Return a dict of font objects. Falls back to system fonts gracefully."""
    def try_font(names, size, bold=False):
        for name in names:
            try:
                f = pygame.font.SysFont(name, size, bold=bold)
                if f:
                    return f
            except Exception:
                pass
        return pygame.font.SysFont("arial", size, bold=bold)

    return {
        "title":  try_font(["impact","bauhaus93","arialblack"], 52, bold=True),
        "big":    try_font(["segoeui","calibri","arial"],       32, bold=True),
        "med":    try_font(["segoeui","calibri","arial"],       22),
        "med_b":  try_font(["segoeui","calibri","arial"],       22, bold=True),
        "sm":     try_font(["segoeui","calibri","arial"],       17),
        "sm_b":   try_font(["segoeui","calibri","arial"],       17, bold=True),
        "tiny":   try_font(["segoeui","calibri","arial"],       13),
        "mono":   try_font(["couriernew","consolas","courier"], 15),
    }


# ── Core draw helpers ─────────────────────────────────────────────────────────
def draw_text(surf, text, x, y, font, color=WHITE, anchor="topleft", shadow=False):
    if shadow:
        s = font.render(text, True, (0,0,0))
        r = s.get_rect(**{anchor: (x+2, y+2)})
        surf.blit(s, r)
    s  = font.render(text, True, color)
    r  = s.get_rect(**{anchor: (x, y)})
    surf.blit(s, r)
    return r


def draw_panel(surf, rect, border_color=BORDER, fill=PANEL, radius=10, alpha=None):
    if alpha is not None:
        ps = pygame.Surface((rect[2], rect[3]), pygame.SRCALPHA)
        ps.fill((*fill, alpha))
        surf.blit(ps, rect[:2])
        pygame.draw.rect(surf, border_color, rect, 2, border_radius=radius)
    else:
        pygame.draw.rect(surf, fill,         rect, border_radius=radius)
        pygame.draw.rect(surf, border_color, rect, 2, border_radius=radius)


def draw_bar(surf, x, y, w, h, value, maximum, color, bg_color=DARK_GREY, radius=4):
    pygame.draw.rect(surf, bg_color, (x, y, w, h), border_radius=radius)
    if maximum > 0:
        fill_w = int(w * min(1.0, value / maximum))
        if fill_w > 0:
            pygame.draw.rect(surf, color, (x, y, fill_w, h), border_radius=radius)
    pygame.draw.rect(surf, BORDER, (x, y, w, h), 1, border_radius=radius)


# ── Button ────────────────────────────────────────────────────────────────────
class Button:
    def __init__(self, rect, label, color=None, font_key="sm"):
        self.rect  = pygame.Rect(rect)
        self.label = label
        self.color = color or (35, 70, 150)
        self.font_key = font_key
        self.hovered  = False
        self.pressed  = False
        self._anim    = 0.0   # 0..1 hover animation

    def update(self, dt: float, events: list, fonts: dict) -> bool:
        mx, my = pygame.mouse.get_pos()
        self.hovered = self.rect.collidepoint(mx, my)
        target = 1.0 if self.hovered else 0.0
        self.pressed = False
        for ev in events:
            if ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1 and self.hovered:
                self.pressed = True
        self._anim += (target - self._anim) * min(1.0, dt * 12)
        return self.pressed

    def draw(self, surf: pygame.Surface, fonts: dict, active=True):
        font = fonts.get(self.font_key, fonts["sm"])
        if not active:
            draw_panel(surf, self.rect, DARK_GREY, (25,25,40))
            draw_text(surf, self.label, self.rect.centerx, self.rect.centery,
                      font, DARK_GREY, "center")
            return
        h = self._anim
        col = tuple(min(255, int(self.color[i] + h*40)) for i in range(3))
        border_col = tuple(min(255, int(self.color[i] + h*80)) for i in range(3))
        # Slight scale effect
        r = self.rect.inflate(int(h*4), int(h*2))
        draw_panel(surf, r, border_col, col, radius=8)
        draw_text(surf, self.label, r.centerx, r.centery, font, WHITE, "center", shadow=True)


# ── Tab bar ───────────────────────────────────────────────────────────────────
class TabBar:
    def __init__(self, tabs: List[str], x, y, w, h):
        self.tabs    = tabs
        self.active  = tabs[0]
        self.rects   = {}
        tw = w // len(tabs)
        for i, t in enumerate(tabs):
            self.rects[t] = pygame.Rect(x + i*tw, y, tw, h)

    def update(self, events: list) -> Optional[str]:
        for ev in events:
            if ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1:
                mx, my = ev.pos
                for t, r in self.rects.items():
                    if r.collidepoint(mx, my):
                        self.active = t
                        return t
        return None

    def draw(self, surf: pygame.Surface, fonts: dict):
        for t, r in self.rects.items():
            active = t == self.active
            fill   = PANEL2 if active else PANEL
            border = GOLD   if active else BORDER
            draw_panel(surf, r, border, fill, radius=0)
            col = GOLD if active else GREY
            draw_text(surf, t, r.centerx, r.centery, fonts["sm_b"], col, "center")


# ── Notification system ───────────────────────────────────────────────────────
class NotificationBanner:
    def __init__(self):
        self.items: List[dict] = []

    def push(self, msg: str, color=(255,255,255)):
        self.items.append({"msg": msg, "color": color, "timer": 3.0, "y_off": 0})

    def update(self, dt: float):
        for item in self.items:
            item["timer"] -= dt
        self.items = [i for i in self.items if i["timer"] > 0]

    def draw(self, surf: pygame.Surface, fonts: dict, screen_w: int, screen_h: int):
        for idx, item in enumerate(reversed(self.items[-5:])):
            a   = min(1.0, item["timer"] / 0.5)
            y   = screen_h - 130 - idx * 36
            txt = fonts["sm"].render(item["msg"], True, item["color"])
            txt.set_alpha(int(a * 220))
            x   = screen_w // 2 - txt.get_width() // 2
            bg  = pygame.Surface((txt.get_width()+24, 28), pygame.SRCALPHA)
            bg.fill((0, 0, 0, int(a*140)))
            surf.blit(bg,  (x-12, y-2))
            surf.blit(txt, (x, y))


# ── Aura card ─────────────────────────────────────────────────────────────────
def draw_aura_card(surf: pygame.Surface, aura: Optional[AuraDef], rect: pygame.Rect,
                   fonts: dict, owned: bool, equipped: bool = False,
                   hovered: bool = False, count: int = 0):
    """Draw a card for the collection grid."""
    tc = TIER_COLORS.get(aura.tier, WHITE) if aura else DARK_GREY
    bg = (18, 18, 38) if owned else (10, 10, 22)
    border = tc if owned else (35, 35, 55)
    if hovered and owned:
        border = WHITE
    draw_panel(surf, rect, border, bg, radius=8)

    if not owned:
        draw_text(surf, "???", rect.centerx, rect.centery, fonts["med_b"], (40,40,60), "center")
        return

    # Colour swatches
    for si, sc in enumerate(aura.colors[:5]):
        pygame.draw.circle(surf, sc, (rect.x+10+si*13, rect.y+14), 5)

    draw_text(surf, aura.name, rect.x+8, rect.y+26, fonts["sm_b"], tc)
    draw_text(surf, f"[{aura.tier}]", rect.x+8, rect.y+46, fonts["tiny"], tc)
    draw_text(surf, rarity_str(aura.rarity), rect.x+8, rect.y+63, fonts["tiny"], GREY)

    if count > 1:
        draw_text(surf, f"×{count}", rect.right-6, rect.y+6, fonts["tiny"], GREY, "topright")
    if equipped:
        draw_text(surf, "★", rect.right-6, rect.bottom-18, fonts["sm_b"], GOLD, "topleft")


# ── Scrollable panel ──────────────────────────────────────────────────────────
class ScrollPanel:
    def __init__(self, rect: pygame.Rect, content_height: int):
        self.rect   = rect
        self.scroll = 0
        self.content_height = content_height
        self.surface = pygame.Surface((rect.width, max(rect.height, content_height)), pygame.SRCALPHA)

    def handle_event(self, ev):
        if ev.type == pygame.MOUSEWHEEL:
            mx, my = pygame.mouse.get_pos()
            if self.rect.collidepoint(mx, my):
                self.scroll = max(0, min(self.scroll - ev.y * 25,
                                         max(0, self.content_height - self.rect.height)))

    @property
    def offset_y(self) -> int:
        return self.scroll

    def begin(self) -> pygame.Surface:
        self.surface.fill((0,0,0,0))
        return self.surface

    def end(self, dest: pygame.Surface):
        dest.blit(self.surface, self.rect.topleft,
                  (0, self.scroll, self.rect.width, self.rect.height))
        # Scrollbar
        if self.content_height > self.rect.height:
            bar_h = max(30, int(self.rect.height**2 / self.content_height))
            bar_y = int(self.scroll / (self.content_height - self.rect.height) *
                        (self.rect.height - bar_h))
            pygame.draw.rect(dest, DARK_GREY,
                             (self.rect.right-6, self.rect.y+bar_y, 4, bar_h), border_radius=2)