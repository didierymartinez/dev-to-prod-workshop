#!/usr/bin/env python3
"""Une las fotos de una sección (out/fotos/seccion-NN-*.png) en una hoja de contactos.

Uso: python3 scripts/hoja.py NN [NN ...]   →   out/hoja-seccion-NN.png
"""
import pathlib
import sys

from PIL import Image, ImageDraw

RAIZ = pathlib.Path(__file__).resolve().parent.parent
COLUMNAS, ANCHO, SEP = 3, 640, 24

for n in sys.argv[1:]:
    fotos = sorted((RAIZ / "out" / "fotos").glob(f"seccion-{int(n):02d}-*.png"))
    if not fotos:
        print(f"sin fotos para la sección {n}")
        continue
    miniaturas = []
    for f in fotos:
        im = Image.open(f).convert("RGB")
        miniaturas.append(im.resize((ANCHO, round(im.height * ANCHO / im.width))))
    alto = miniaturas[0].height
    filas = -(-len(miniaturas) // COLUMNAS)
    hoja = Image.new("RGB", (COLUMNAS * ANCHO + (COLUMNAS + 1) * SEP, filas * (alto + SEP + 30) + SEP), "#05080F")
    dibujo = ImageDraw.Draw(hoja)
    for i, (im, f) in enumerate(zip(miniaturas, fotos)):
        x = SEP + (i % COLUMNAS) * (ANCHO + SEP)
        y = SEP + (i // COLUMNAS) * (alto + SEP + 30)
        dibujo.text((x, y), f.stem.replace(f"seccion-{int(n):02d}-", ""), fill="#9AA5B1")
        hoja.paste(im, (x, y + 22))
    salida = RAIZ / "out" / f"hoja-seccion-{int(n):02d}.png"
    hoja.save(salida)
    print(salida)
