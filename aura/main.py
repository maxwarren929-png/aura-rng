"""
main.py — Entry point. Run: python main.py
Requires: pip install pygame
"""
import pygame
import sys
import math
import random
from state import GameState
from auras import ALL_AURAS, AURA_BY_ID
from effects import ParticleSystem
from ui import (load_fonts, draw_text, draw_panel, NotificationBanner, TabBar,
                PANEL, BORDER, GOLD, WHITE, GREY, BG, BG2, CYAN, DARK_GREY)
from game_screen  import GameScreen
from roll_screen  import RollScreen
from shop         import ShopScreen
from collection   import CollectionScreen
from quests       import QuestsScreen
from stats        import StatsScreen
from merge_screen import MergeScreen
from enchant_screen import EnchantScreen

WIDTH, HEIGHT = 1180, 720
FPS           = 60
TABS = ["🎲 Roll", "🛒 Shop", "💎 Collection", "⚗️ Merge", "✨ Enchant", "📋 Quests", "📊 Stats"]


def main():
    pygame.init()
    pygame.display.set_caption("✨ Aura Roller — Ultimate Edition")

    try:
        icon = pygame.Surface((32, 32))
        icon.fill((20, 20, 60))
        pygame.draw.circle(icon, (255, 215, 0), (16, 16), 14, 3)
        pygame.display.set_icon(icon)
    except Exception:
        pass

    screen = pygame.display.set_mode((WIDTH, HEIGHT), pygame.RESIZABLE)
    clock  = pygame.time.Clock()
    fonts  = load_fonts()

    gs = GameState()
    gs.load()

    game_scr   = GameScreen(WIDTH, HEIGHT)
    roll_scr   = RollScreen(WIDTH, HEIGHT)
    shop_scr   = ShopScreen(WIDTH, HEIGHT)
    coll_scr   = CollectionScreen(WIDTH, HEIGHT)
    merge_scr  = MergeScreen(WIDTH, HEIGHT)
    quest_scr  = QuestsScreen(WIDTH, HEIGHT)
    stats_scr  = StatsScreen(WIDTH, HEIGHT)
    enchant_scr = EnchantScreen(WIDTH, HEIGHT)

    notif_banner = NotificationBanner()
    tab_bar      = TabBar(TABS, 0, 0, WIDTH, 56)
    tab_bar.active = TABS[0]

    t          = 0.0
    save_timer = 0.0

    # Roll queue: list of result dicts {aura, first_time, coins, xp}
    roll_queue: list = []
    # Multi-result overlay (for x2+ simultaneous display)
    multi_results_overlay: list = []
    multi_overlay_timer: float  = 0.0
    MULTI_OVERLAY_DURATION      = 4.5

    def request_rolls(count: int):
        nonlocal multi_results_overlay, multi_overlay_timer
        if roll_scr.active:
            return
        results = []
        for _ in range(count):
            aura   = gs.pick_aura()
            result = gs.apply_roll_result(aura)
            results.append(result)
        _flush_notifications()

        if count == 1:
            roll_queue.append(results[0])
            _animate_next()
        else:
            # Show best result as main animation, all as overlay
            best = max(results, key=lambda r: r["aura"].rarity)
            roll_queue.append(best)
            multi_results_overlay = results
            multi_overlay_timer   = 0.0
            _animate_next()

    def _animate_next():
        if not roll_queue:
            return
        result = roll_queue[0]
        roll_scr.start(
            result=result["aura"],
            is_new=result["first_time"],
            coins=result["coins"],
            xp=result["xp"],
            on_done=_on_roll_done,
        )
        tab_bar.active = TABS[0]

    def _on_roll_done():
        finished_result = roll_queue.pop(0)
        game_scr.notify_rolled(finished_result)
        _flush_notifications()
        if roll_queue:
            _animate_next()

    def _flush_notifications():
        for n in gs.notifications:
            notif_banner.push(n["msg"], n["color"])
        gs.notifications.clear()

    game_scr.on_roll_request = request_rolls

    running = True
    while running:
        dt         = clock.tick(FPS) / 1000.0
        dt         = min(dt, 0.05)   # clamp to avoid spiral of death
        t         += dt
        save_timer += dt
        if save_timer >= 15.0:
            gs.save()
            save_timer = 0.0

        W, H = screen.get_size()

        events = pygame.event.get()
        for ev in events:
            if ev.type == pygame.QUIT:
                running = False
            if ev.type == pygame.KEYDOWN:
                if ev.key == pygame.K_ESCAPE:
                    running = False
                if ev.key == pygame.K_F5:
                    gs.save()
                    notif_banner.push("Game saved!", (80, 255, 80))
                if ev.key == pygame.K_1: tab_bar.active = TABS[0]
                if ev.key == pygame.K_2: tab_bar.active = TABS[1]
                if ev.key == pygame.K_3: tab_bar.active = TABS[2]
                if ev.key == pygame.K_4: tab_bar.active = TABS[3]
                if ev.key == pygame.K_5: tab_bar.active = TABS[4]
                if ev.key == pygame.K_6: tab_bar.active = TABS[5]
                if ev.key == pygame.K_7: tab_bar.active = TABS[6]

        if not roll_scr.active:
            tab_bar.update(events)

        active_tab = tab_bar.active

        # Update
        if active_tab == TABS[0]:
            game_scr.update(dt, events, gs, fonts)
        elif active_tab == TABS[1]:
            shop_scr.update(dt, events, gs, fonts)
        elif active_tab == TABS[2]:
            coll_scr.update(dt, events, gs, fonts, t)
        elif active_tab == TABS[3]:
            merge_scr.update(dt, events, gs, fonts, t)
        elif active_tab == TABS[4]:
            enchant_scr.update(dt, events, gs, fonts)
        elif active_tab == TABS[5]:
            quest_scr.update(dt, events, gs, fonts)
        elif active_tab == TABS[6]:
            stats_scr.update(dt, events, gs, fonts)

        if roll_scr.active:
            roll_scr.update(dt, events)
        # Update multi overlay timer
        if multi_results_overlay and not roll_scr.active:
            multi_overlay_timer += dt
            # Dismiss on click/space
            for ev in events:
                if ev.type == pygame.MOUSEBUTTONDOWN or (
                        ev.type == pygame.KEYDOWN and ev.key == pygame.K_SPACE):
                    if multi_overlay_timer > 0.4:
                        multi_results_overlay = []

        _flush_notifications()
        notif_banner.update(dt)

        # Draw
        if active_tab == TABS[0]:
            game_scr.draw(screen, fonts, gs, t)
        elif active_tab == TABS[1]:
            shop_scr.draw(screen, fonts, gs, t)
        elif active_tab == TABS[2]:
            coll_scr.draw(screen, fonts, gs, t)
        elif active_tab == TABS[3]:
            merge_scr.draw(screen, fonts, gs, t)
        elif active_tab == TABS[4]:
            enchant_scr.draw(screen, fonts, gs, t)
        elif active_tab == TABS[5]:
            quest_scr.draw(screen, fonts, gs, t)
        elif active_tab == TABS[6]:
            stats_scr.draw(screen, fonts, gs, t)

        _draw_tab_bar(screen, fonts, tab_bar, gs, t, W)

        if roll_scr.active:
            roll_scr.draw(screen, fonts)

        # Draw multi-roll simultaneous results overlay
        if multi_results_overlay and not roll_scr.active:
            _draw_multi_overlay(screen, fonts, multi_results_overlay, multi_overlay_timer, W, H, t)

        notif_banner.draw(screen, fonts, W, H)

        fps_txt = fonts["tiny"].render(f"{clock.get_fps():.0f} fps  |  F5 = save", True, (40, 40, 60))
        screen.blit(fps_txt, (4, H - 18))

        pygame.display.flip()

    gs.save()
    pygame.quit()
    sys.exit()


def _draw_tab_bar(surf: pygame.Surface, fonts: dict, tab_bar: TabBar,
                  gs: GameState, t: float, W: int):
    bar_h = 56
    # Background
    pygame.draw.rect(surf, (8, 8, 22), (0, 0, W, bar_h))
    pygame.draw.line(surf, BORDER, (0, bar_h - 1), (W, bar_h - 1), 1)

    # Animated shimmer
    sx = int((t * 100) % (W + 120)) - 120
    shim = pygame.Surface((100, bar_h), pygame.SRCALPHA)
    for px in range(100):
        a = int(max(0, 14 - abs(px - 50) * 0.5))
        pygame.draw.line(shim, (255, 255, 255, a), (px, 0), (px, bar_h))
    surf.blit(shim, (sx, 0))

    n  = len(tab_bar.tabs)
    tw = min(155, (W - 220) // n)
    tx0 = 10

    for i, tab in enumerate(tab_bar.tabs):
        active = tab == tab_bar.active
        rx = tx0 + i * (tw + 4)
        r  = pygame.Rect(rx, 5, tw, bar_h - 10)

        if active:
            # Filled gold-tinted bg
            pygame.draw.rect(surf, (28, 26, 55), r, border_radius=8)
            pygame.draw.rect(surf, GOLD, r, 2, border_radius=8)
            draw_text(surf, tab, r.centerx, r.centery, fonts["sm_b"], GOLD, "center")
            # Bottom underline glow
            ul_a = int(180 + 60 * math.sin(t * 3))
            pygame.draw.rect(surf, (*GOLD, ul_a), (r.x + 4, r.bottom - 3, r.w - 8, 3), border_radius=2)
        else:
            mx2, my2 = pygame.mouse.get_pos()
            hov = r.collidepoint(mx2, my2)
            bg  = (18, 18, 38) if hov else (12, 12, 28)
            pygame.draw.rect(surf, bg, r, border_radius=8)
            pygame.draw.rect(surf, (35, 35, 65), r, 1, border_radius=8)
            col = (200, 200, 220) if hov else GREY
            draw_text(surf, tab, r.centerx, r.centery, fonts["sm"], col, "center")

        tab_bar.rects[tab] = r

    # Right: coins + level
    draw_text(surf, f"🪙 {gs.coins:,}", W - 12, 9,  fonts["med_b"], GOLD,  "topright")
    draw_text(surf, f"Lv{gs.level}  ·  {gs.rolls:,} rolls", W - 12, 34, fonts["tiny"], GREY, "topright")


def _draw_multi_overlay(surf: pygame.Surface, fonts: dict, results: list,
                        timer: float, W: int, H: int, t: float):
    """Draw simultaneous multi-roll results as a card grid overlay."""
    from auras import TIER_COLORS, rarity_str
    import math

    # Fade in
    fade = min(1.0, timer / 0.35)
    # Background dim
    ov = pygame.Surface((W, H), pygame.SRCALPHA)
    ov.fill((4, 4, 14, int(200 * fade)))
    surf.blit(ov, (0, 0))

    n    = len(results)
    cw   = min(220, (W - 80) // n)
    ch   = 240
    gap  = 12
    total_w = n * cw + (n - 1) * gap
    start_x = W // 2 - total_w // 2
    cy_base = H // 2 - ch // 2

    draw_text(surf, f"×{n} ROLL RESULTS", W//2, cy_base - 40,
              fonts["big"], GOLD, "center", shadow=True)

    for i, result in enumerate(results):
        aura = result["aura"]
        tc   = TIER_COLORS.get(aura.tier, (255,255,255))
        cx_card = start_x + i * (cw + gap)

        # Slide in from below
        slide = max(0.0, (fade - i * 0.08))
        slide = min(1.0, slide)
        ease  = 1.0 - (1.0 - slide) ** 3
        cy_card = cy_base + int((1.0 - ease) * 80)

        r = pygame.Rect(cx_card, cy_card, cw, ch)
        pulse_a = int(140 + 80 * math.sin(t * 3 + i * 0.9))

        # Card bg
        bg_s = pygame.Surface((cw, ch), pygame.SRCALPHA)
        bg_s.fill((*((14, 8, 32)), int(220 * ease)))
        surf.blit(bg_s, (cx_card, cy_card))

        # Gradient left bar
        for row in range(ch):
            frac = row / ch
            a_bar = int(200 * ease * (1 - frac * 0.4))
            pygame.draw.line(surf, (*tc, a_bar), (cx_card, cy_card+row), (cx_card+4, cy_card+row))

        # Border
        pygame.draw.rect(surf, (*tc, pulse_a), r, 2, border_radius=10)

        # Color orbs
        nc = len(aura.colors[:4])
        for si, sc in enumerate(aura.colors[:4]):
            ang = t * 2 + si * (math.pi * 2 / max(1, nc))
            ox2 = int(14 * math.cos(ang))
            oy2 = int(7 * math.sin(ang))
            pygame.draw.circle(surf, sc, (cx_card + cw//2 + ox2, cy_card + 38 + oy2), 8)

        # Tier badge
        draw_text(surf, f"★ {aura.tier.upper()} ★",
                  cx_card + cw//2, cy_card + 64, fonts["tiny"], tc, "center")

        # Name
        draw_text(surf, aura.name,
                  cx_card + cw//2, cy_card + 84, fonts["med_b"], tc, "center", shadow=True)

        # Rarity
        draw_text(surf, rarity_str(aura.rarity),
                  cx_card + cw//2, cy_card + 110, fonts["tiny"], GREY, "center")

        # NEW badge
        if result.get("first_time"):
            bs = pygame.Surface((54, 22), pygame.SRCALPHA)
            bs.fill((*GOLD, 220))
            surf.blit(bs, (cx_card + cw - 58, cy_card + 4))
            draw_text(surf, "✨ NEW", cx_card + cw - 31, cy_card + 6, fonts["tiny"], (8,8,8), "center")

        # Coins earned
        draw_text(surf, f"+{result['coins']:,} 🪙",
                  cx_card + cw//2, cy_card + 136, fonts["tiny"], GOLD, "center")
        draw_text(surf, f"+{result['xp']:,} xp",
                  cx_card + cw//2, cy_card + 154, fonts["tiny"], CYAN, "center")

    # Dismiss hint
    if timer > 0.7:
        blink = abs(math.sin(timer * 2.5))
        hint  = fonts["sm"].render("[ CLICK  or  SPACE  to continue ]", True, GREY)
        hint.set_alpha(int(blink * 160 + 40))
        surf.blit(hint, (W//2 - hint.get_width()//2, H - 34))


if __name__ == "__main__":
    main()