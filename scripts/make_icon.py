from PIL import Image, ImageDraw
import math, os

W = 1024
img = Image.new('RGBA', (W, W), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# Fondo redondeado con degradado violeta -> azul
radius = 220
grad = Image.new('RGBA', (W, W), (0, 0, 0, 0))
gd = ImageDraw.Draw(grad)
top = (124, 92, 255)
bot = (58, 157, 255)
for y in range(W):
    t = y / (W - 1)
    color = tuple(int(top[i] * (1 - t) + bot[i] * t) for i in range(3)) + (255,)
    gd.line([(0, y), (W, y)], fill=color)
mask = Image.new('L', (W, W), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle([0, 0, W - 1, W - 1], radius=radius, fill=255)
img.paste(grad, (0, 0), mask)

# Destellos suaves
glow = Image.new('RGBA', (W, W), (0, 0, 0, 0))
gd2 = ImageDraw.Draw(glow)
gd2.ellipse([560, 80, 980, 500], fill=(255, 255, 255, 36))
gd2.ellipse([40, 600, 380, 940], fill=(255, 214, 102, 42))
img = Image.alpha_composite(img, glow)
d = ImageDraw.Draw(img)

# Cubo isométrico
cx, cy = 512, 540
s = 250          # media anchura
h = 150          # media altura del rombo superior
depth = 250

top_pts = [(cx, cy - h - depth // 2), (cx + s, cy - depth // 2), (cx, cy + h - depth // 2), (cx - s, cy - depth // 2)]
left_pts = [(cx - s, cy - depth // 2), (cx, cy + h - depth // 2), (cx, cy + h + depth // 2), (cx - s, cy + depth // 2)]
right_pts = [(cx + s, cy - depth // 2), (cx, cy + h - depth // 2), (cx, cy + h + depth // 2), (cx + s, cy + depth // 2)]

d.polygon(left_pts, fill=(255, 255, 255, 255))
d.polygon(right_pts, fill=(218, 231, 255, 255))
d.polygon(top_pts, fill=(255, 255, 255, 255))
# aristas
for pts in (top_pts, left_pts, right_pts):
    d.line(pts + [pts[0]], fill=(88, 108, 220, 255), width=14, joint='curve')
d.line([cx, cy - h - depth // 2, cx, cy + h + depth // 2], fill=(120, 140, 235, 255), width=12)

# Carita sonriente en la cara izquierda (para que sea cercano a los niños)
face = Image.new('RGBA', (W, W), (0, 0, 0, 0))
fd = ImageDraw.Draw(face)
fd.ellipse([cx - 165, cy + 5, cx - 135, cy + 40], fill=(92, 84, 210, 255))
fd.ellipse([cx - 70, cy + 5, cx - 40, cy + 40], fill=(92, 84, 210, 255))
fd.arc([cx - 150, cy - 5, cx - 35, cy + 100], start=20, end=160, fill=(92, 84, 210, 255), width=14)
# recortar la carita a la cara izquierda
mask2 = Image.new('L', (W, W), 0)
ImageDraw.Draw(mask2).polygon(left_pts, fill=255)
img.paste(face, (0, 0), mask2)
d = ImageDraw.Draw(img)

# Puntos de pintura
dots = [
    (200, 230, 26, (255, 94, 135)),
    (830, 250, 20, (255, 205, 68)),
    (870, 760, 26, (64, 220, 160)),
    (150, 760, 18, (255, 148, 72)),
    (760, 160, 12, (255, 255, 255)),
]
for x, y, r, c in dots:
    d.ellipse([x - r, y - r, x + r, y + r], fill=c + (255,))

os.makedirs('build', exist_ok=True)
img.save('build/icon.png')
img.resize((512, 512), Image.LANCZOS).save('build/icon-512.png')
img.resize((256, 256), Image.LANCZOS).save('build/icon-256.png')
print('Iconos generados en build/')
