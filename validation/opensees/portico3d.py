"""Pórtico espacial de 2 pavimentos (2 x 1 vãos) com diafragma rígido, resolvido no OpenSees.
Gera portico3d.json (modelo + resultados de referência) para o teste src/core/fe3d.validacao.test.ts.
Uso: python3 -m pip install openseespy && python3 validation/opensees/portico3d.py
"""
import json, math, os
import openseespy.opensees as ops

E, G = 25e6, 25e6 / 2.4
def ret(b, h):  # y local na direção de h
    a, c = max(b, h), min(b, h)
    J = a * c**3 * (1 / 3 - 0.21 * (c / a) * (1 - c**4 / (12 * a**4)))
    return {"A": b * h, "Iz": b * h**3 / 12, "Iy": h * b**3 / 12, "J": J}

xs, ys, zs = [0, 6, 12], [0, 5], [0, 3, 6]
nos, barras = [], []
idx = {}
for z in zs:
    for y in ys:
        for x in xs:
            idx[(x, y, z)] = len(nos); nos.append([x, y, z])
mestres = {}
for z in zs[1:]:
    mestres[z] = len(nos); nos.append([6, 2.5, z])
col = ret(0.3, 0.5)
vig = ret(0.2, 0.6)
for k in range(1, len(zs)):
    for y in ys:
        for x in xs:
            barras.append({"i": idx[(x, y, zs[k - 1])], "j": idx[(x, y, zs[k])], **col, "ref": [1, 0, 0]})
    z = zs[k]
    for y in ys:
        for a, b in zip(xs, xs[1:]):
            barras.append({"i": idx[(a, y, z)], "j": idx[(b, y, z)], **vig, "ref": [0, 0, 1]})
    for x in xs:
        barras.append({"i": idx[(x, 0, z)], "j": idx[(x, 5, z)], **vig, "ref": [0, 0, 1]})

cargas = [{"no": mestres[3], "f": [50, 0, 0, 0, 0, 0]}, {"no": mestres[6], "f": [100, 30, 0, 0, 0, 40]}]
for (x, y, z), i in idx.items():
    if z > 0:
        cargas.append({"no": i, "f": [0, 0, -100, 0, 0, 0]})

def cross(a, b): return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
def unit(a): L = math.sqrt(sum(v * v for v in a)); return [v / L for v in a]

ops.wipe(); ops.model("basic", "-ndm", 3, "-ndf", 6)
for i, p in enumerate(nos): ops.node(i, *p)
for (x, y, z), i in idx.items():
    if z == 0: ops.fix(i, 1, 1, 1, 1, 1, 1)
for z, m in mestres.items():
    ops.fix(m, 0, 0, 1, 1, 1, 0)
    ops.rigidDiaphragm(3, m, *[i for (x, y, zz), i in idx.items() if zz == z])
for e, b in enumerate(barras):
    pi, pj = nos[b["i"]], nos[b["j"]]
    ex = unit([pj[k] - pi[k] for k in range(3)])
    ez = unit(cross(ex, b["ref"]))
    ops.geomTransf("Linear", e + 1, *ez)
    ops.element("elasticBeamColumn", e + 1, b["i"], b["j"], b["A"], E, G, b["J"], b["Iy"], b["Iz"], e + 1)
ops.timeSeries("Linear", 1); ops.pattern("Plain", 1, 1)
for c in cargas: ops.load(c["no"], *c["f"])
ops.constraints("Transformation"); ops.numberer("RCM"); ops.system("BandGeneral")
ops.test("NormDispIncr", 1e-12, 10); ops.algorithm("Linear"); ops.integrator("LoadControl", 1.0); ops.analysis("Static")
assert ops.analyze(1) == 0
ops.reactions()
res = {
    "mestres": {str(z): [ops.nodeDisp(m, 1), ops.nodeDisp(m, 2), ops.nodeDisp(m, 6)] for z, m in mestres.items()},
    "reacoes": {str(i): ops.nodeReaction(i) for (x, y, z), i in idx.items() if z == 0},
}
saida = {"fonte": "OpenSeesPy " + str(ops.version()) + " (elasticBeamColumn, rigidDiaphragm, Linear)", "E": E, "G": G,
         "nos": nos, "barras": barras, "apoios": [i for (x, y, z), i in idx.items() if z == 0],
         "mestres": {str(z): m for z, m in mestres.items()}, "cargas": cargas, "resultados": res}
with open(os.path.join(os.path.dirname(__file__), "portico3d.json"), "w") as f: json.dump(saida, f, indent=1)
print("ok", res["mestres"])
