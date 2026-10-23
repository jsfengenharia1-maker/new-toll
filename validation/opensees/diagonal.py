"""Diagonais de contraventamento (E2d): dois pilares, sem vigas, com duas diagonais em X que se cruzam (nó gerado no cruzamento,
cada diagonal dividida em duas barras) e cargas horizontal e vertical nos topos, resolvido no OpenSees com a mesma discretização
do Statikos: trechos rígidos por jntOffset, caso G (peso próprio e cargas nodais e distribuídas).

O modelo vem de diagonal.modelo.json, exportado pelo teste do app:
  GERAR_OPENSEES=1 npx vitest run src/core/building/diagonais.test.ts -t OpenSees
e este script grava diagonal.json (deslocamentos de referência), comparado no mesmo teste (fora do npm test só a geração).
Uso: python3 -m pip install openseespy && python3 validation/opensees/diagonal.py
"""
import json, math, os
import openseespy.opensees as ops

aqui = os.path.dirname(os.path.abspath(__file__))
m = json.load(open(os.path.join(aqui, "diagonal.modelo.json")))

def cross(a, b): return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
def unit(a): L = math.sqrt(sum(v * v for v in a)); return [v / L for v in a]

ops.wipe(); ops.model("basic", "-ndm", 3, "-ndf", 6)
for i, p in enumerate(m["nos"]): ops.node(i, *p)
for no, gs in m["apoios"]:
    ops.fix(no, *[1 if g in gs else 0 for g in range(6)])
por_mestre = {}
for e in m["escravos"]: por_mestre.setdefault(e["mestre"], []).append(e["no"])
for mestre, escravos in por_mestre.items(): ops.rigidDiaphragm(3, mestre, *escravos)

def base(b):
    pi, pj = m["nos"][b["i"]], m["nos"][b["j"]]
    oi, oj = b["offI"] or [0, 0, 0], b["offJ"] or [0, 0, 0]
    a = [pi[q] + oi[q] for q in range(3)]; z = [pj[q] + oj[q] for q in range(3)]
    ex = unit([z[q] - a[q] for q in range(3)])
    ref = b["ref"] or [0, 0, 1]
    if abs(sum(ex[q] * ref[q] for q in range(3))) > 0.999 * math.sqrt(sum(r * r for r in ref)):
        ref = [1, 0, 0] if abs(ex[2]) > 0.999 else [0, 0, 1]
    ez = unit(cross(ex, ref)); ey = cross(ez, ex)
    return ex, ey, ez, oi, oj, math.dist(a, z)

for k, b in enumerate(m["barras"]):
    assert not b["eng"], "liberações e engastes parciais não exportados"
    ex, ey, ez, oi, oj, L = base(b)
    ops.geomTransf("Linear", k + 1, *ez, "-jntOffset", *oi, *oj)
    ops.element("elasticBeamColumn", k + 1, b["i"], b["j"], b["A"], b["E"], b["G"], b["J"], b["Iy"], b["Iz"], k + 1)

ops.timeSeries("Linear", 1); ops.pattern("Plain", 1, 1)
for c in m["nodais"]:
    ops.load(c["no"], *c["f"])
for d in m["distribuidas"]:
    ex, ey, ez, *_ = base(m["barras"][d["barra"]])
    q = d["q"]
    ops.eleLoad("-ele", d["barra"] + 1, "-type", "-beamUniform", sum(ey[k] * q[k] for k in range(3)), sum(ez[k] * q[k] for k in range(3)), sum(ex[k] * q[k] for k in range(3)))
for p in m["pontuais"]:
    ex, ey, ez, oi, oj, L = base(m["barras"][p["barra"]])
    f = p["f"][:3]
    ops.eleLoad("-ele", p["barra"] + 1, "-type", "-beamPoint", sum(ey[k] * f[k] for k in range(3)), sum(ez[k] * f[k] for k in range(3)), p["a"] / L, sum(ex[k] * f[k] for k in range(3)))

ops.constraints("Transformation"); ops.numberer("RCM"); ops.system("UmfPack"); ops.test("NormDispIncr", 1e-12, 10)
ops.algorithm("Linear"); ops.integrator("LoadControl", 1.0); ops.analysis("Static")
assert ops.analyze(1) == 0
desloc = [[float(f"{ops.nodeDisp(i, k + 1):.10e}") for k in range(6)] for i in range(len(m["nos"]))]
json.dump({"nos": len(m["nos"]), "desloc": desloc}, open(os.path.join(aqui, "diagonal.json"), "w"))
umax = max(abs(d[2]) for d in desloc)
print(f"ok: {len(m['nos'])} nós, {len(m['barras'])} barras; maior |uz| = {umax*1000:.3f} mm")
