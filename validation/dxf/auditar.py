"""Auditoria externa dos DXF gerados pelo Statikos com o ezdxf (MIT), fora do app e do npm test.

Uso: python3 -m venv .venv && .venv/bin/pip install ezdxf
     node dist-cli/statikos.mjs prancha <trabalho.statikos> --dxf prancha.dxf
     .venv/bin/python validation/dxf/auditar.py prancha.dxf
Sai com código 1 se a leitura estrita ou a auditoria acusarem erro.
"""
import sys

import ezdxf
from ezdxf import recover

erros = 0
for caminho in sys.argv[1:]:
    ezdxf.readfile(caminho)  # leitura estrita: falha em estrutura inválida
    doc, rec = recover.readfile(caminho)
    aud = doc.audit()
    n = len(aud.errors) + len(rec.errors)
    erros += n
    print(f"{caminho}: {doc.dxfversion}, layouts {doc.layouts.names()}, {len(doc.modelspace())} entidades no modelo, "
          f"{n} erro(s), {len(aud.fixes) + len(rec.fixes)} correção(ões)")
    for e in [*rec.errors, *aud.errors]:
        print("  erro:", e.message)
    for f in [*rec.fixes, *aud.fixes]:
        print("  correção:", f.message)
sys.exit(1 if erros else 0)
