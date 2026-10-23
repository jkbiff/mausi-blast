#!/usr/bin/env python3
"""Erzeugt src/skins.css aus den Themen-Definitionen unten.

Jedes Thema setzt alle Variablen (Palette, Blockaussehen, Hintergrund), damit
verschachtelte Vorschauen im Menü nicht vom aktiven Thema erben.
Die Blockfarbe steckt im Block als currentColor; Paletten: --p1 … --p8.
Aufruf: python3 scripts/gen-skins.py
"""
from pathlib import Path

BEVEL = "rgba(255, 255, 255, 0.5) rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.38) rgba(255, 255, 255, 0.28)"
SOFT_BEVEL = "rgba(255, 255, 255, 0.4) rgba(0, 0, 0, 0.12) rgba(0, 0, 0, 0.25) rgba(255, 255, 255, 0.2)"
NONE = "linear-gradient(transparent, transparent)"
DROP = "0 1px 2px rgba(0, 0, 0, 0.3)"


def svg(body, size="62%"):
    return ("url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E"
            + body + "%3C/svg%3E\") center / " + size + " no-repeat")


def texture(*layers):
    return ",\n    ".join(layers)


DEFAULTS = dict(
    bg="currentColor", gloss=NONE, shadow=DROP, radius="4%", bevel="0", border=BEVEL,
    deco="none", deco_inset="0", deco_clip="none", deco_border="0 solid transparent", deco_shadow="none",
    page="#3f53b8", board="#1d2756", empty="rgba(255, 255, 255, 0.05)", line="rgba(0, 0, 0, 0.35)",
    accent="#ffd23f", motif='"★"',
)
CLASSIC = ["#e8413c", "#f08a24", "#f6c623", "#5cc23a", "#33c4e8", "#3a6fe0", "#9b4fe0", "#ec4fa6"]

T = {}


def theme(name, comment, palette, **kw):
    d = dict(DEFAULTS)
    d.update(kw)
    assert len(palette) == 8, name
    d["palette"] = palette
    d["comment"] = comment
    T[name] = d


theme("klassik", "Klassisch: abgeschrägte Kanten, kräftige Farben, blauer Hintergrund", CLASSIC,
      gloss="linear-gradient(rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.06))", bevel="0.13",
      page="radial-gradient(120% 70% at 50% 0%, #6f86e6, #4258c4 55%, #34459f)", board="#1d2756", accent="#ffe066", motif='"★"')

theme("jade", "Jade: weiß-grüner Stein auf grünem Marmor", ["#eef3ee", "#cfe9d5", "#e2efe5", "#bfe2c7", "#f4f6f2", "#d6ecd9", "#c6e6cd", "#e8f1ea"],
      gloss=texture("linear-gradient(125deg, transparent 35%, rgba(90, 160, 110, 0.3) 37% 39%, transparent 41%)",
                    "linear-gradient(40deg, transparent 55%, rgba(90, 160, 110, 0.22) 56% 57%, transparent 58%)",
                    "radial-gradient(60% 50% at 30% 30%, rgba(255, 255, 255, 0.6), transparent 70%)",
                    "linear-gradient(160deg, rgba(255, 255, 255, 0.3), rgba(60, 120, 80, 0.15))"),
      bevel="0.09", border=SOFT_BEVEL,
      page=texture("linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.07) 32% 34%, transparent 36% 70%, rgba(0, 0, 0, 0.08) 72% 73%, transparent 75%)",
                   "radial-gradient(100% 70% at 50% 10%, #5f8c48, #3e6a33 60%, #2f5427)"),
      board="#1c2a1e", empty="rgba(255, 255, 255, 0.04)", accent="#6dff7a", motif='"♣"')

theme("strick", "Strick: Wollmaschen auf dunkelrotem Strickgrund", ["#e8b23a", "#d8483c", "#9b59d6", "#3fb6b0", "#4a72d8", "#e6c43a", "#e07a2e", "#5cb84a"],
      gloss=texture("repeating-linear-gradient(65deg, rgba(255, 255, 255, 0.22) 0 2px, transparent 2px 5px)",
                    "repeating-linear-gradient(-65deg, rgba(0, 0, 0, 0.16) 0 2px, transparent 2px 5px)",
                    "linear-gradient(rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0.15))"),
      radius="10%", shadow="inset 0 0 0 1px rgba(0, 0, 0, 0.25), " + DROP,
      page=texture("repeating-linear-gradient(65deg, rgba(255, 255, 255, 0.05) 0 3px, transparent 3px 8px)",
                   "repeating-linear-gradient(-65deg, rgba(0, 0, 0, 0.06) 0 3px, transparent 3px 8px)",
                   "linear-gradient(#a8434f, #7d2a37)"),
      board="#4a1820", accent="#ffb3c7", motif='"✿"')

theme("keramik", "Keramik: glasierte Fliesen mit Haarrissen, lila-blauer Hintergrund", ["#ff6b8b", "#ffa64d", "#ffd84d", "#6ad66a", "#4dd2ff", "#5b7cff", "#b46bff", "#ff7ad9"],
      gloss=texture("linear-gradient(160deg, rgba(255, 255, 255, 0.55) 0 18%, transparent 30%)",
                    "linear-gradient(115deg, transparent 48%, rgba(255, 255, 255, 0.35) 49%, transparent 50%)",
                    "linear-gradient(35deg, transparent 62%, rgba(0, 0, 0, 0.15) 63%, transparent 64%)",
                    "radial-gradient(90% 90% at 50% 40%, transparent 60%, rgba(0, 0, 0, 0.18))"),
      radius="18%", shadow="inset 0 0 0 1.5px rgba(255, 255, 255, 0.4), " + DROP,
      page="linear-gradient(180deg, #b45cf0, #6d6cf2 45%, #3f5fe0)", board="#242a5e", accent="#7ff3ff", motif='"◆"')

HEART = "%3Cpath fill='none' stroke='rgba(90,40,20,.35)' stroke-width='1.6' d='M12 20s-7-4.4-9-8.6A4.9 4.9 0 0 1 12 6.3a4.9 4.9 0 0 1 9 5.1C19 15.6 12 20 12 20z'/%3E%3Cpath fill='none' stroke='rgba(255,255,255,.45)' stroke-width='1' d='M12 18.6s-6-3.9-7.7-7.4'/%3E"
theme("herzkekse", "Herzkekse: Mürbeteig und Rosa mit eingeprägtem Herz auf Schokolade", ["#e4bd8c", "#e98fa4", "#ddb27e", "#ef9cb0", "#e8c393", "#e48298", "#dcb07a", "#f0a6b8"],
      gloss="radial-gradient(70% 60% at 35% 30%, rgba(255, 255, 255, 0.35), transparent 70%)",
      bevel="0.1", border="rgba(255, 245, 225, 0.5) rgba(110, 60, 30, 0.25) rgba(110, 60, 30, 0.4) rgba(255, 245, 225, 0.3)",
      deco=svg(HEART, "70%"), radius="8%",
      page=texture("radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.04) 0 2px, transparent 3px) 0 0 / 22px 22px",
                   "linear-gradient(#6b3a24, #4a2617)"),
      board="#2b170d", empty="rgba(255, 220, 190, 0.05)", accent="#ff9cc0", motif='"✿"')

theme("juwelen", "Juwelen: geschliffene Achteck-Steine in Silberfassung", ["#ffcc1a", "#2f7cff", "#c34dff", "#2fd65a", "#ff3a3a", "#ff9a1f", "#22e0ff", "#ff4fb2"],
      bg="#3a2c4c", gloss="linear-gradient(160deg, rgba(255, 255, 255, 0.25), rgba(0, 0, 0, 0.2))", bevel="0.07",
      border="rgba(230, 230, 245, 0.8) rgba(120, 120, 140, 0.8) rgba(80, 80, 100, 0.9) rgba(200, 200, 220, 0.8)",
      deco=texture("radial-gradient(20% 14% at 34% 28%, rgba(255, 255, 255, 0.9) 50%, transparent 100%)",
                   "conic-gradient(from 22.5deg, rgba(255, 255, 255, 0.35) 0 12.5%, rgba(0, 0, 0, 0.05) 0 25%, rgba(0, 0, 0, 0.25) 0 37.5%, rgba(0, 0, 0, 0.35) 0 50%, rgba(0, 0, 0, 0.2) 0 62.5%, rgba(255, 255, 255, 0.1) 0 75%, rgba(255, 255, 255, 0.3) 0 87.5%, rgba(255, 255, 255, 0.45) 0) currentColor"),
      deco_inset="9%", deco_clip="polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)",
      page="radial-gradient(120% 80% at 50% 0%, #6a46a8, #44297a 60%, #2c1a52)", board="#1a1030", accent="#e0b3ff", motif='"◆"')

theme("gold", "Gold: Barren auf Holz", ["#f2c14e", "#e8b23e", "#f5cc5c", "#dca636", "#f0bd48", "#e5b040", "#f7d06a", "#d9a132"],
      gloss=texture("linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 32%, rgba(255, 255, 255, 0.25) 50%, rgba(255, 255, 255, 0) 62%, rgba(110, 60, 0, 0.3) 100%)"),
      bevel="0.13", border="rgba(255, 245, 190, 0.75) rgba(140, 80, 0, 0.35) rgba(120, 65, 0, 0.55) rgba(255, 235, 160, 0.55)",
      page=texture("repeating-linear-gradient(92deg, rgba(0, 0, 0, 0.06) 0 2px, transparent 2px 9px, rgba(255, 255, 255, 0.04) 9px 11px, transparent 11px 17px)",
                   "linear-gradient(#b8742e, #8a5320)"),
      board="#2c1a0c", accent="#ffe9a0", motif='"✦"')

theme("bunt", "Bunt: flache, leuchtende Farben", ["#ff9b1a", "#2ab6ff", "#3a6dff", "#2fd164", "#ffcf1a", "#ff3b3b", "#c840ff", "#ff5fb0"],
      gloss="linear-gradient(rgba(255, 255, 255, 0.08), rgba(0, 0, 0, 0.06))", radius="3%",
      page="linear-gradient(#5d58c9, #3d3a9e)", board="#211f5c", accent="#ffffff", motif='"●"')

SEED = "radial-gradient(5% 8% at {x}% {y}%, #2a1a14 70%, transparent 100%)"
theme("melone", "Wassermelone: Fruchtfleisch mit Kernen und Schale", ["#f0525a", "#ea4652", "#f45d63", "#e84a55", "#f2575e", "#ec4e58", "#f66068", "#e6424e"],
      gloss=texture(*[SEED.format(x=x, y=y) for x, y in [(24, 30), (50, 24), (76, 30), (36, 52), (64, 52)]],
                    "linear-gradient(to top, #3a8c33 0 9%, #8ccf5a 9% 13%, #f3f8dc 13% 22%, transparent 22%)",
                    "radial-gradient(70% 50% at 40% 20%, rgba(255, 255, 255, 0.25), transparent 70%)"),
      radius="6%", shadow="inset 0 0 0 1px rgba(0, 0, 0, 0.15), " + DROP,
      page="radial-gradient(120% 80% at 50% 0%, #5fa84a, #3f7d35 60%, #2e5f27)", board="#1d3319", accent="#ff7a85", motif='"●"')

theme("ziegel", "Ziegel: Mauersteine mit Fugen, hellblauer Himmel", ["#e0553a", "#d94c33", "#e8603f", "#cf4630", "#e35a3c", "#d65036", "#ea6644", "#cc432d"],
      gloss=texture("linear-gradient(transparent 46%, rgba(255, 220, 200, 0.65) 46% 54%, transparent 54%)",
                    "linear-gradient(90deg, transparent 47%, rgba(255, 220, 200, 0.65) 47% 53%, transparent 53%) 0 0 / 100% 50% no-repeat",
                    "linear-gradient(90deg, rgba(255, 220, 200, 0.65) 0 3%, transparent 3% 97%, rgba(255, 220, 200, 0.65) 97%) 0 100% / 100% 50% no-repeat",
                    "linear-gradient(160deg, rgba(255, 255, 255, 0.15), rgba(0, 0, 0, 0.18))"),
      radius="3%", shadow="inset 0 0 0 1.5px rgba(255, 220, 200, 0.6), " + DROP,
      page="linear-gradient(#a9d6f5, #79b4e4)", board="#26344f", accent="#ffb08a", motif='"■"')

theme("pluesch", "Plüsch: flauschiges Fell", ["#ff5a4a", "#ff9a3a", "#3fc95a", "#2fc8d8", "#4a7cff", "#ffd23a", "#b45cff", "#ff6fb5"],
      gloss=texture("radial-gradient(rgba(255, 255, 255, 0.28) 20%, transparent 26%) 0 0 / 5px 5px",
                    "radial-gradient(rgba(0, 0, 0, 0.18) 20%, transparent 28%) 2px 3px / 6px 6px",
                    "radial-gradient(80% 70% at 35% 30%, rgba(255, 255, 255, 0.35), transparent 70%)",
                    "linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.2))"),
      radius="14%",
      page=texture("radial-gradient(rgba(255, 255, 255, 0.05) 25%, transparent 30%) 0 0 / 6px 6px", "linear-gradient(#a8744e, #7c5236)"),
      board="#3a2216", accent="#ffd9b0", motif='"●"')

theme("leder", "Leder: genäht, mit Ziernaht", ["#e8b13a", "#d9443a", "#9c4fd6", "#d23d3a", "#e9772e", "#e2c13c", "#3e9e4a", "#3a8fd0"],
      gloss=texture("radial-gradient(rgba(0, 0, 0, 0.1) 25%, transparent 30%) 0 0 / 4px 4px",
                    "linear-gradient(160deg, rgba(255, 255, 255, 0.3), rgba(0, 0, 0, 0.2))"),
      radius="10%", shadow="inset 0 0 0 1px rgba(0, 0, 0, 0.3), " + DROP,
      deco_inset="11%", deco_border="1.5px dashed rgba(255, 245, 220, 0.75)",
      page=texture("radial-gradient(rgba(0, 0, 0, 0.05) 25%, transparent 30%) 0 0 / 5px 5px", "linear-gradient(#cdb79c, #a8916f)"),
      board="#3d2e22", accent="#fff1c9", motif='"✚"')

theme("kacheln", "Kacheln: rosa und cremefarbene Fliesen mit vertiefter Mitte", ["#f2918c", "#f5e1b8", "#f39a8e", "#f7e6c0", "#ef8a86", "#f3dcae", "#f4a294", "#f8e9c8"],
      bevel="0.08", border=SOFT_BEVEL, radius="6%",
      gloss="linear-gradient(160deg, rgba(255, 255, 255, 0.35), rgba(0, 0, 0, 0.06))",
      deco="linear-gradient(160deg, rgba(255, 255, 255, 0.25), rgba(0, 0, 0, 0.05)) currentColor", deco_inset="20%",
      deco_shadow="inset 1px 1px 3px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.6)",
      page="linear-gradient(#7d8ff0, #5568d4)", board="#2a326e", accent="#ffe2d6", motif='"✿"')

SPRINKLES = [("#ff5a8a", 30, 20), ("#4ac8ff", 62, 16), ("#ffe14a", 46, 34), ("#7be36a", 74, 38), ("#ffffff", 22, 42)]
theme("eiscreme", "Eiscreme: Kugel mit Streuseln über Waffel", ["#ffb3c8", "#bdf0d4", "#d9c2ff", "#fff0a8", "#ffd0a8", "#b8e2ff", "#ffc4e6", "#c8f5b8"],
      gloss=texture(*[f"radial-gradient(4% 6% at {x}% {y}%, {c} 80%, transparent 100%)" for c, x, y in SPRINKLES],
                    "radial-gradient(circle at 20% 66%, currentColor 0 13%, transparent 14%)",
                    "radial-gradient(circle at 52% 70%, currentColor 0 11%, transparent 12%)",
                    "radial-gradient(circle at 82% 66%, currentColor 0 12%, transparent 13%)",
                    "repeating-linear-gradient(45deg, rgba(150, 90, 30, 0.35) 0 1px, transparent 1px 5px) 0 100% / 100% 34% no-repeat",
                    "repeating-linear-gradient(-45deg, rgba(150, 90, 30, 0.35) 0 1px, transparent 1px 5px) 0 100% / 100% 34% no-repeat",
                    "linear-gradient(to top, #e9b46a 0 34%, transparent 34%)",
                    "radial-gradient(60% 40% at 35% 18%, rgba(255, 255, 255, 0.55), transparent 70%)"),
      radius="12%",
      page="linear-gradient(#a7725a, #7a4e3c)", board="#3e271e", accent="#ffd1e0", motif='"●"')

theme("gelee", "Gelee: glänzend und durchscheinend", ["#ffcf1a", "#b84dff", "#ff8a1a", "#3ad66a", "#2ab8ff", "#ff4a6a", "#4a6cff", "#ff5fc8"],
      gloss=texture("radial-gradient(40% 22% at 35% 20%, rgba(255, 255, 255, 0.85), transparent 100%)",
                    "linear-gradient(170deg, rgba(255, 255, 255, 0.3), transparent 45%, rgba(0, 0, 0, 0.25))"),
      radius="22%", shadow="inset 0 -4px 6px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.35), " + DROP,
      page="radial-gradient(120% 70% at 50% 0%, #7d93f0, #566ad8 60%, #3f4fb8)", board="#222a66", accent="#ffffff", motif='"●"')

theme("roboter", "Roboter: Blechpaneele mit Schrauben und Lüftungsschlitzen", ["#eceff2", "#f08a3a", "#5cb83a", "#3a8fe0", "#e9ecef", "#f0a03a", "#4fae3a", "#3a7fd8"],
      gloss=texture("repeating-linear-gradient(transparent 0 2px, rgba(0, 0, 0, 0.22) 2px 3px) 82% 62% / 14% 26% no-repeat",
                    "radial-gradient(7% 7% at 18% 18%, #9aa3ad 50%, rgba(0, 0, 0, 0.4) 80%, transparent 100%)",
                    "radial-gradient(7% 7% at 18% 82%, #9aa3ad 50%, rgba(0, 0, 0, 0.4) 80%, transparent 100%)",
                    "radial-gradient(circle at 46% 46%, transparent 13%, rgba(0, 0, 0, 0.25) 14% 17%, transparent 18%)",
                    "linear-gradient(160deg, rgba(255, 255, 255, 0.35), rgba(0, 0, 0, 0.15))"),
      bevel="0.07", border=SOFT_BEVEL, radius="8%",
      page="linear-gradient(#9aa6b5, #6f7b8b)", board="#262d36", accent="#a8f0ff", motif='"⚙"')

HOLES = [(30, 32, 13), (68, 58, 9), (36, 76, 6), (76, 22, 5)]
theme("kaese", "Käse: mit Löchern", ["#ffd94a", "#ffd23a", "#ffe066", "#ffcf33", "#ffdb55", "#ffd440", "#ffe170", "#ffcc2e"],
      gloss=texture(*[f"radial-gradient({r}% {r}% at {x}% {y}%, rgba(170, 110, 0, 0.45) 75%, transparent 100%)" for x, y, r in HOLES],
                    "linear-gradient(160deg, rgba(255, 255, 255, 0.35), rgba(160, 100, 0, 0.15))"),
      bevel="0.08", border="rgba(255, 250, 200, 0.7) rgba(180, 120, 0, 0.25) rgba(160, 100, 0, 0.4) rgba(255, 245, 180, 0.5)",
      page="linear-gradient(#b78545, #8a5f2c)", board="#3a2612", accent="#fff2a0", motif='"●"')

theme("marmor", "Marmor: weißer Stein mit grauen Adern", ["#f4f2ee", "#ebe8e2", "#f7f5f1", "#e6e2db", "#f1eee8", "#e9e5df", "#faf8f4", "#e3dfd8"],
      gloss=texture("linear-gradient(125deg, transparent 30%, rgba(120, 110, 100, 0.3) 31% 32%, transparent 33% 62%, rgba(150, 140, 130, 0.22) 63% 64%, transparent 65%)",
                    "linear-gradient(35deg, transparent 46%, rgba(130, 120, 110, 0.22) 47% 48%, transparent 49%)",
                    "linear-gradient(160deg, rgba(255, 255, 255, 0.6), rgba(0, 0, 0, 0.06))"),
      bevel="0.07", border=SOFT_BEVEL,
      page=texture("linear-gradient(125deg, transparent 40%, rgba(255, 255, 255, 0.08) 41% 42%, transparent 43%)", "linear-gradient(#9aa0aa, #737985)"),
      board="#262a31", accent="#ffffff", motif='"✦"')

theme("opal", "Opal: schillernd in Pastell", ["#f7b8d8", "#d4c0ff", "#bfd8ff", "#f9c8e8", "#cdb6ff", "#b8e0ff", "#ffc2dc", "#e0c8ff"],
      gloss=texture("linear-gradient(135deg, rgba(255, 255, 255, 0.6), rgba(255, 190, 235, 0.3) 35%, rgba(170, 215, 255, 0.4) 65%, rgba(255, 255, 255, 0.55))",
                    "radial-gradient(5% 5% at 70% 28%, #fff 60%, transparent 100%)"),
      radius="6%", shadow="inset 0 0 0 1px rgba(255, 255, 255, 0.55), " + DROP,
      page="linear-gradient(#f0a8c6, #d47aa4)", board="#5c2a46", accent="#ffffff", motif='"✦"')

theme("matt", "Matt: einfache, satte Farben", ["#7e3fd6", "#2f6be0", "#22b5c9", "#e2611f", "#e0b21a", "#2fae3f", "#c0262c", "#d83f8e"],
      radius="2%", shadow="inset 0 0 0 1px rgba(0, 0, 0, 0.15)",
      page="linear-gradient(#4a72d6, #3554b0)", board="#1c2c66", accent="#ffffff", motif='"■"')

theme("holz", "Holz: bemalte Latten mit Maserung", ["#3fc4c0", "#9b5bd6", "#4fb84a", "#3a7ed8", "#d8443a", "#e8c43a", "#e8822e", "#c94fa0"],
      gloss=texture("repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.12) 0 1px, transparent 1px 5px, rgba(255, 255, 255, 0.1) 5px 6px, transparent 6px 9px)",
                    "linear-gradient(rgba(255, 255, 255, 0.18), rgba(0, 0, 0, 0.15))"),
      bevel="0.08", border=SOFT_BEVEL,
      page=texture("repeating-linear-gradient(92deg, rgba(0, 0, 0, 0.05) 0 2px, transparent 2px 10px)", "linear-gradient(#d0a466, #a97c44)"),
      board="#4a3220", accent="#ffe7b0", motif='"●"')

theme("papier", "Papier: zerknittertes Pergament", ["#e8d3a8", "#e2c99a", "#ecd8b0", "#dcc290", "#e5cfa2", "#dfc596", "#efdcb6", "#d8bd8a"],
      gloss=texture("linear-gradient(115deg, transparent 38%, rgba(255, 255, 255, 0.35) 40%, rgba(120, 80, 30, 0.18) 41%, transparent 44%)",
                    "linear-gradient(20deg, transparent 58%, rgba(120, 80, 30, 0.18) 60%, rgba(255, 255, 255, 0.3) 61%, transparent 64%)",
                    "linear-gradient(70deg, transparent 20%, rgba(120, 80, 30, 0.12) 22%, transparent 25%)",
                    "radial-gradient(90% 90% at 50% 50%, transparent 55%, rgba(120, 80, 30, 0.25))"),
      radius="4%", shadow="inset 0 0 0 1px rgba(120, 80, 30, 0.3), " + DROP,
      page="linear-gradient(#7a6650, #574634)", board="#2a2118", accent="#fff1cf", motif='"✦"')

theme("kekse", "Kekse: Cracker mit Löchern", ["#47c8e0", "#ef5a50", "#7cc84a", "#f2a648", "#f5d24a", "#47c8e0", "#ef5a50", "#7cc84a"],
      gloss=texture("radial-gradient(circle, rgba(90, 50, 10, 0.4) 0 9%, transparent 12%) 0 0 / 33.3% 33.3%",
                    "radial-gradient(80% 70% at 35% 30%, rgba(255, 255, 255, 0.3), transparent 70%)"),
      radius="12%", shadow="inset 0 0 0 2px rgba(255, 240, 200, 0.35), inset 0 -3px 0 rgba(0, 0, 0, 0.15), " + DROP,
      page="linear-gradient(#cf9c56, #a8763a)", board="#45300f", accent="#fff0c0", motif='"●"')

theme("ton", "Ton: erdige, matte Farben", ["#c9a24a", "#b5503c", "#7c9a6a", "#6a7f99", "#c47a6a", "#d1a050", "#8a6a9a", "#a9b06a"],
      gloss=texture("radial-gradient(rgba(0, 0, 0, 0.08) 25%, transparent 30%) 0 0 / 4px 4px",
                    "radial-gradient(rgba(255, 255, 255, 0.08) 25%, transparent 30%) 2px 2px / 5px 5px",
                    "linear-gradient(160deg, rgba(255, 255, 255, 0.15), rgba(0, 0, 0, 0.12))"),
      radius="6%", shadow="inset 0 0 0 1px rgba(0, 0, 0, 0.2), " + DROP,
      page="linear-gradient(#97674a, #6e4630)", board="#33201a", accent="#ffd9a8", motif='"●"')

theme("spiegelei", "Spiegelei: Eigelb auf weißer Fliese", ["#ffc21a", "#ff9a1a", "#ffb01a", "#ff8a1a", "#ffd02a", "#ffa51a", "#ffbb22", "#ff921a"],
      bg="#f6f1e8", gloss="linear-gradient(160deg, rgba(255, 255, 255, 0.5), rgba(0, 0, 0, 0.08))",
      bevel="0.06", border=SOFT_BEVEL, radius="6%",
      deco=texture("radial-gradient(24% 18% at 36% 32%, rgba(255, 255, 255, 0.8) 40%, transparent 100%)",
                   "radial-gradient(circle, transparent 52%, rgba(170, 80, 0, 0.45) 60%, transparent 68%)",
                   "radial-gradient(circle, currentColor 62%, transparent 68%)"),
      deco_inset="16%",
      page="linear-gradient(#5a6069, #3c4148)", board="#22252a", accent="#ffd040", motif='"●"')

theme("karo", "Karo: Stoff mit Vichy-Muster", ["#7fd6c8", "#8fb0f2", "#f2a0c0", "#7fd6c8", "#8fb0f2", "#f2a0c0", "#a8e0a0", "#f5c890"],
      gloss=texture("linear-gradient(90deg, rgba(255, 255, 255, 0.45) 50%, transparent 50%) 0 0 / 33.34% 100%",
                    "linear-gradient(rgba(255, 255, 255, 0.45) 50%, transparent 50%) 0 0 / 100% 33.34%",
                    "linear-gradient(160deg, rgba(255, 255, 255, 0.2), rgba(0, 0, 0, 0.1))"),
      radius="5%", shadow="inset 0 0 0 1px rgba(0, 0, 0, 0.12), " + DROP,
      page="linear-gradient(#f2b0c8, #d886a8)", board="#5c2a44", accent="#ffffff", motif='"♥"')

theme("foto", "Eigenes Foto: auf dem Spielfeld zeigt jeder Block seinen Bildausschnitt", CLASSIC,
      gloss="linear-gradient(rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.06))", bevel="0.1",
      page="radial-gradient(120% 70% at 50% 0%, #e07bb0, #a04a8a 55%, #6b2c6a)", board="#2a1030", accent="#ffc2e0", motif='"♥"')

KEYS = [("bg", "blk-bg"), ("gloss", "blk-gloss"), ("shadow", "blk-shadow"), ("radius", "blk-radius"),
        ("bevel", "blk-bevel"), ("border", "blk-border"), ("deco", "blk-deco"), ("deco_inset", "blk-deco-inset"),
        ("deco_clip", "blk-deco-clip"), ("deco_border", "blk-deco-border"), ("deco_shadow", "blk-deco-shadow"),
        ("page", "page-bg"), ("board", "board-bg"), ("empty", "cell-empty"), ("line", "cell-line"),
        ("accent", "fx-accent"), ("motif", "motif")]

# ---------- Alles in Rosa ----------
# Jede Farbe wird in einen Rosaton umgerechnet; Helligkeit/Sättigung bleiben, damit die Texturen
# erkennbar bleiben. Neutrale Töne (Weiß, Grau, Schwarz für Glanz und Schatten) bleiben unverändert.
import colorsys
import re

# Acht gut unterscheidbare Rosatöne für die Blöcke: (Farbton°, Sättigung, Helligkeit)
PINKS = [
    (330, 0.92, 0.60),  # Pink
    (346, 0.88, 0.70),  # Rosé
    (314, 0.72, 0.52),  # Fuchsia
    (352, 0.85, 0.82),  # Blush
    (338, 0.70, 0.42),  # Himbeere
    (8, 0.90, 0.74),    # Pfirsichrosa
    (298, 0.50, 0.66),  # Orchidee
    (322, 0.95, 0.78),  # Bubblegum
]
# Grund-Rosaton je Thema für Hintergrund, Spielfeld und Texturen (reihum, damit jedes Thema anders wirkt)
BASE_HUES = [336, 345, 326, 352, 330, 340, 356, 328, 346, 348, 334, 322, 350, 326, 342, 318]


def hex_to_rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def to_hex(rgb):
    return "#" + "".join(f"{max(0, min(255, round(v))):02x}" for v in rgb)


def hls(rgb):
    return colorsys.rgb_to_hls(*(v / 255 for v in rgb))


def from_hls(h, l, s):
    return tuple(v * 255 for v in colorsys.hls_to_rgb(h % 1, l, s))


def pink_rgb(rgb, base_hue, tint=0.0):
    """Farbe in Rosa umrechnen: Farbton um den Grundton des Themas, Rest bleibt.
    tint > 0 färbt auch neutrale Töne (Grau, Weiß) zart ein – für Flächen und Steine."""
    h, l, s = hls(rgb)
    if l < 0.04 or l > 0.985:
        return rgb
    if s < 0.1:
        if not tint:
            return rgb
        return from_hls(base_hue / 360, l, max(s, tint))
    # leichte Variation je nach ursprünglichem Farbton, damit Verläufe lebendig bleiben
    offset = ((h * 360 + 30) % 60 - 30) / 4
    return from_hls((base_hue + offset) / 360, l, min(1.0, s * 1.05))


def pinkify(text, base_hue, tint=0.0):
    def hex_repl(m):
        return to_hex(pink_rgb(hex_to_rgb(m.group(1)), base_hue, tint))

    def enc_repl(m):
        return "%23" + to_hex(pink_rgb(hex_to_rgb(m.group(1)), base_hue))[1:]

    def rgba_repl(m):
        r, g, b = (int(m.group(i)) for i in (2, 3, 4))
        nr, ng, nb = (round(v) for v in pink_rgb((r, g, b), base_hue, tint))
        return f"{m.group(1)}({nr}, {ng}, {nb}{m.group(5) or ''})"

    text = re.sub(r"%23([0-9a-fA-F]{6})", enc_repl, text)
    text = re.sub(r"#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b", hex_repl, text)
    return re.sub(r"(rgba?)\((\d+),\s*(\d+),\s*(\d+)(,\s*[\d.]+)?\)", rgba_repl, text)


def pink_palette(palette, base_hue):
    """Bunte Paletten → acht Rosatöne (Stil des Themas bleibt); einfarbige → Grund-Rosaton."""
    cols = [hls(hex_to_rgb(c)) for c in palette]
    hues = {round(h * 12) % 12 for h, l, s in cols if s > 0.25}
    if len(hues) >= 3:
        avg_l = sum(l for h, l, s in cols) / len(cols)
        avg_s = sum(s for h, l, s in cols) / len(cols)
        out = []
        for i, (ph, ps, pl) in enumerate(PINKS):
            l = pl + (avg_l - 0.55) * 0.6
            s = ps * 0.6 + avg_s * 0.4
            out.append(to_hex(from_hls(ph / 360, min(0.9, max(0.3, l)), min(1.0, s))))
        return out
    out = []
    for c in palette:
        h, l, s = hls(pink_rgb(hex_to_rgb(c), base_hue, 0.55))
        # sehr helle Steine (Jade, Marmor …) etwas abdunkeln, damit das Rosa sichtbar wird
        out.append(to_hex(from_hls(h, min(l, 0.86), max(s, 0.55))))
    return out


for i, (name, d) in enumerate(T.items()):
    base = BASE_HUES[i % len(BASE_HUES)]
    d["palette"] = pink_palette(d["palette"], base)
    d["bg"] = pinkify(d["bg"], base, 0.5)
    for key in ("gloss", "shadow", "border", "deco", "deco_border", "deco_shadow", "empty", "line", "accent"):
        d[key] = pinkify(d[key], base)
    for key in ("page", "board"):
        d[key] = pinkify(d[key], base, 0.3)

out = ["/* Automatisch erzeugt von scripts/gen-skins.py – dort ändern, nicht hier. */", ""]
for name, d in T.items():
    out.append(f"/* {d['comment']} */")
    sel = ':root,\n[data-skin="klassik"]' if name == "klassik" else f'[data-skin="{name}"]'
    lines = [f"  --p{i + 1}: {c};" for i, c in enumerate(d["palette"])]
    lines += [f"  --{var}: {d[key]};" for key, var in KEYS]
    out.append(sel + " {\n" + "\n".join(lines) + "\n}\n")

Path(__file__).resolve().parent.parent.joinpath("src/skins.css").write_text("\n".join(out))
print(f"{len(T)} Themen geschrieben")
