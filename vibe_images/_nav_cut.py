# -*- coding: utf-8 -*-
import os, statistics
from PIL import Image, ImageDraw, ImageFont

SRC = r"C:\Users\benq2\OneDrive\桌面\彈珠勇者_部署包\vibe_images\nav-src.png"
OUT = r"C:\Users\benq2\OneDrive\桌面\彈珠勇者_部署包\vibe_images\nav-buttons"
os.makedirs(OUT, exist_ok=True)

im = Image.open(SRC).convert("RGB")
W, H = im.size
px = im.load()

def lum(p):
    return 0.299*p[0] + 0.587*p[1] + 0.114*p[2]

def reddish(p):
    return p[0] - max(p[1], p[2]) > 22

def bluish(p):
    return p[2] - max(p[0], p[1]) > 30

TOP, BOT, R = 10, 64, 19
BW, BH = 52, BOT - TOP + 1
names = ["01-home", "02-adventure", "03-character", "04-shop", "05-gacha", "06-team"]

# --- measure the reference label (商城) so the new glyph matches it
def label_bbox(i, y0=48, y1=62):
    x0 = 7 + 56*i
    pts = [(x, y) for y in range(y0, y1+1) for x in range(x0+9, x0+44) if lum(px[x, y]) > 170]
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return min(xs), max(xs), min(ys), max(ys)

REF = label_bbox(3)
ref_w, ref_h = REF[1]-REF[0]+1, REF[3]-REF[2]+1
ref_top_local = REF[2] - TOP
print("shop label bbox orig", REF, "size", ref_w, ref_h, "local top", ref_top_local)

FPATH = r"C:\Windows\Fonts\msjhbd.ttc"
_d = ImageDraw.Draw(Image.new("RGB", (10, 10)))
best = None
for s in range(9, 20):
    f = ImageFont.truetype(FPATH, s)
    bb = _d.textbbox((0, 0), "隊伍", font=f)
    score = abs((bb[3]-bb[1]) - ref_h) * 2 + abs((bb[2]-bb[0]) - ref_w)
    if best is None or score < best[0]:
        best = (score, s, f, bb)
FSIZE = min(best[1], 12)
FONT0 = ImageFont.truetype(FPATH, FSIZE)
FBB = _d.textbbox((0, 0), "隊伍", font=FONT0)
FONT = ImageFont.truetype(FPATH, FSIZE)
FW, FH = FBB[2]-FBB[0], FBB[3]-FBB[1]
print("font size", FSIZE, "rendered", FW, FH)

def rounded_mask(w, h, r, ss=4):
    m = Image.new("L", (w*ss, h*ss), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w*ss-1, h*ss-1], radius=r*ss, fill=255)
    return m.resize((w, h), Image.LANCZOS)

MASK = rounded_mask(BW, BH, R)

def mirror_patch(p, w, h, x_lo, y_lo, y_hi, axis=25.5):
    for y in range(max(0, y_lo), min(h, y_hi+1)):
        for x in range(max(0, x_lo), min(w, int(axis*2)+1)):
            sx = int(round(axis*2 - x))
            if 0 <= sx < w:
                p[x, y] = p[sx, y]

def flatten(p, w, h, keep_label=False):
    bright = {(x, y) for y in range(h) for x in range(w) if lum(p[x, y]) > 205}
    halo = set()
    for (bx, by) in bright:
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                halo.add((bx+dx, by+dy))
    def cand(x, y):
        if keep_label and y >= 36:
            return reddish(p[x, y]) or bluish(p[x, y])
        return (x, y) not in halo and (58 < lum(p[x, y]) < 196 or reddish(p[x, y]))
    for y in range(h):
        vals = [p[x, y][:3] for x in range(w) if cand(x, y)]
        if len(vals) < 8:
            continue
        med = tuple(int(statistics.median([v[i] for v in vals])) for i in range(3))
        for x in range(w):
            if cand(x, y):
                p[x, y] = med

def erase_label(p, w):
    for y in range(37, 53):
        vals = [p[x, y][:3] for x in range(4, w-4) if 58 < lum(p[x, y]) < 196]
        if len(vals) < 6:
            continue
        med = tuple(int(statistics.median([v[i] for v in vals])) for i in range(3))
        for x in range(4, w-4):
            if lum(p[x, y]) < 196:
                p[x, y] = med

def draw_label(img, text):
    d = ImageDraw.Draw(img)
    bb = d.textbbox((0, 0), text, font=FONT)
    fw = bb[2]-bb[0]
    tx = (BW - fw)//2 - bb[0]
    ty = ref_top_local - bb[1] - 1
    for ox in (-1, 0, 1):
        for oy in (-1, 0, 1):
            if ox or oy:
                d.text((tx+ox, ty+oy), text, font=FONT, fill=(16, 22, 32))
    d.text((tx, ty), text, font=FONT, fill=(246, 248, 251))

LABEL_TEXT = {4: "轉蛋", 5: "隊伍"}

def build(i, flat=True, badge=False, retag=False):
    x0 = 7 + 56*i
    crop = im.crop((x0, TOP, x0+BW, BOT+1)).convert("RGB")
    p = crop.load()
    if badge:
        mirror_patch(p, BW, BH, 34, 0, 18)
        mirror_patch(p, BW, BH, 41, 19, 21)
    if flat:
        flatten(p, BW, BH)
    if retag:
        erase_label(p, BW)
        draw_label(crop, LABEL_TEXT[i])
    out = Image.new("RGBA", (BW, BH), (0, 0, 0, 0))
    out.paste(crop, (0, 0), MASK)
    return out

for tag, flat in (("flat", True), ("raw", False)):
    d = os.path.join(OUT, tag)
    os.makedirs(d, exist_ok=True)
    for i in range(6):
        build(i, flat=flat, badge=(i == 4), retag=(i in (4, 5))).save(os.path.join(d, names[i] + ".png"))

def preview(target, path):
    pad, scale, n = 6, 3, 6
    cw = n*(BW+pad) + pad
    strip = BH + pad
    canvas = Image.new("RGB", (cw, strip*2 + pad*3), (24, 30, 42))
    dr = ImageDraw.Draw(canvas)
    for row, bg in enumerate([(24, 30, 42), (232, 236, 242)]):
        y = pad + row*(strip + pad)
        dr.rectangle([0, y, cw-1, y+strip-1], fill=bg)
        for i in range(n):
            b = Image.open(os.path.join(target, names[i] + ".png"))
            canvas.paste(b, (pad + i*(BW+pad), y+pad), b)
    canvas.resize((canvas.width*scale, canvas.height*scale), Image.NEAREST).save(path)

preview(os.path.join(OUT, "flat"), os.path.join(OUT, "preview-flat.png"))
preview(os.path.join(OUT, "raw"), os.path.join(OUT, "preview-raw.png"))
print("done")
