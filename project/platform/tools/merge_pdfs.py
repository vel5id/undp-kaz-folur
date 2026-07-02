# -*- coding: utf-8 -*-
"""Склейка PDF-частей модулей по manifest.json от make_module_pdfs.mjs."""
import json
import pathlib
import sys

from pypdf import PdfWriter

outdir = pathlib.Path(sys.argv[1])
manifest = json.loads((outdir / "manifest.json").read_text(encoding="utf-8"))
for m in manifest:
    w = PdfWriter()
    for part in m["parts"]:
        w.append(part)
    with open(m["out"], "wb") as f:
        w.write(f)
    for part in m["parts"]:
        pathlib.Path(part).unlink()
    size = pathlib.Path(m["out"]).stat().st_size
    print(f"{m['code']}: {size/1e6:.1f} МБ")
(outdir / "manifest.json").unlink()
