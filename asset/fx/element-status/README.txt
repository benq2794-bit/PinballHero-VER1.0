Elemental Spellcraft - 69 pixel spell effects (10 elements x 5 variants + 2 portal sets + 13 specials)
by NogitsuneGurl - made in The Pixel Loom

Elements: Fire, Ice, Lightning, Water, Earth, Wind, Holy, Dark, Poison, Arcane. Each element moves its own way: fire licks and flickers, ice cracks and shards,
lightning forks and flashes, water splashes and ripples, earth throws heavy rocks and dust, wind spirals, holy rays and halos,
dark seeps tendrils around a glowing void, poison bubbles and drips, arcane draws runes with orbiting glyphs.
Variants per element:
  cast          48x48, 16 frames         gather -> squash -> release -> dissolve      hitFrame = release frame (see JSON)
  projectile    48x24, 16 frames @50ms  seamless loop, flies to the right (flip for left)
  impact_small  32x32, 14 frames         anticipation (90ms holds) -> hit-stop squash flash (hitFrame 2, 110ms) -> burst -> follow-through -> dissolve
  impact_large  64x64, 18 frames         same timing, more debris; also split into behind + front layers
  aura_loop     48x48, 16 frames @70-90ms seamless ground loop under a character's feet; also behind + front layers
Portals (64x64, Portals/ folder): Arcane Vortex and Void Rift, each as open (14f @60ms), loop (16f @70ms) and close (12f @60ms),
  sharing one frame size and pivot so they chain cleanly; behind + front layers included.
Specials (Specials/ folder): Healing Sparkle, Shield Up / Loop / Break, Level Up Pillar (48x96), Teleport Out / In, Meteor Strike,
  Summoning Circle, Buff Aura, Debuff Aura, Crit Hit Flash and Soul Wisp (32x64). Sizes and timing in each JSON.

Each effect folder:
  frames/<name>_00.png ...   transparent PNG frames at native size
  <name>_sheet.png           horizontal spritesheet (one row, no padding)
  <name>_preview.gif         4x browsing preview (use the PNGs in your game)
  <name>.json                frame size, count, per-frame durationsMs, loop, pivot, hit frame, layer + light file names
  <name>.tres                Godot 4 SpriteFrames (put it next to <name>_sheet.png, fix the res:// path if you move it)
  <name>.aseprite.json       Aseprite-style sheet JSON (frames/meta/frameTags) - reads in Unity importers, Phaser, Defold, LibGDX etc.
  layers/<name>_behind_sheet.png + _front_sheet.png   draw behind your character / in front of it (large impacts, auras, portals)
  light/<name>_light_inner/middle/outer_sheet.png      light-glow masks (grey 202/128/77), one per frame, for engine lighting
                             (earth effects don't emit light, so they have none)
  *.pixel-loom-decor.json    the editable Loom projects

Every effect is built from The Pixel Loom's own effect tools (explosion, flame, embers, sparks, lightning, burst, growth,
vortex, swirl, bubbles, steam, fall, neon, wipe) plus raster shapes and Loom per-frame timing.
Pixel style: no outlines on effects, flat clusters, no dithering, small warm-shifted 5-step ramps, light from the top-left.
Native sizes; scale by whole numbers (2x, 3x, 4x) with nearest-neighbour. You don't need The Pixel Loom to use the PNGs.
