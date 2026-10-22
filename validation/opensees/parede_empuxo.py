"""Parede de concreto com abertura sob empuxo de terra (E1c): L = 6 m, e = 0,20 m, base engastada em z = −1 m, topo
livre em z = +3 m (H = 4 m), janela de x = 2 a 4 m e z = 0,5 a 2,5 m. Pressão de repouso K0·γ·(3 − z) com K0 = 0,5 e
γ = 18 kN/m³ (aterro na cota +3), normal ao plano, para −y. Resolvida no OpenSees com ShellMITC4 (malha de 0,125 m).
Gera parede_empuxo.json para src/core/building/paredes.validacao.test.ts (compara a casca de 6 nós do Statikos).
Fora do npm test. Uso: python3 -m pip install openseespy && python3 validation/opensees/parede_empuxo.py
"""
import json, math, os
import openseespy.opensees as ops

L, t, z0, z1, nu = 6.0, 0.20, -1.0, 3.0, 0.2
furo = (2.0, 4.0, 0.5, 2.5)              # x0, x1, z0, z1
k0g, cota = 0.5 * 18.0, 3.0              # K0·γ (kN/m³) e cota do aterro
fck = 30.0
Eci = 5600 * math.sqrt(fck)              # MPa (αE = 1)
Ecs = (0.8 + 0.2 * fck / 80) * Eci       # MPa
E = Ecs * 1000                           # kN/m²
h = float(os.environ.get("H_MALHA", 0.125))
nx, nz = round(L / h), round((z1 - z0) / h)
p = lambda z: k0g * max(0.0, cota - z)

ops.wipe(); ops.model("basic", "-ndm", 3, "-ndf", 6)
ops.section("ElasticMembranePlateSection", 1, E, nu, t, 0.0)
nos = {}
def no(i, j):
    if (i, j) not in nos:
        nos[(i, j)] = len(nos) + 1
        ops.node(nos[(i, j)], i * h, 0.0, z0 + j * h)
    return nos[(i, j)]
e, forca = 1, {}
for i in range(nx):
    for j in range(nz):
        xc, zc = (i + 0.5) * h, z0 + (j + 0.5) * h
        if furo[0] < xc < furo[1] and furo[2] < zc < furo[3]:
            continue
        ns = [no(i, j), no(i + 1, j), no(i + 1, j + 1), no(i, j + 1)]
        ops.element("ShellMITC4", e, *ns, 1); e += 1
        # cargas consistentes do quadrilátero bilinear com p linear em z
        pb, pt = p(z0 + j * h), p(z0 + (j + 1) * h)
        fb, ft = (h / 2) * h * (pb / 3 + pt / 6), (h / 2) * h * (pb / 6 + pt / 3)
        for n, f in zip(ns, (fb, fb, ft, ft)):
            forca[n] = forca.get(n, 0.0) + f
base = [tag for (i, j), tag in nos.items() if j == 0]
for tag in base:
    ops.fix(tag, 1, 1, 1, 1, 1, 1)
ops.timeSeries("Linear", 1); ops.pattern("Plain", 1, 1)
for n, f in forca.items():
    ops.load(n, 0.0, -f, 0.0, 0.0, 0.0, 0.0)
ops.constraints("Plain"); ops.numberer("RCM"); ops.system("BandGeneral")
ops.test("NormDispIncr", 1e-12, 10); ops.algorithm("Linear"); ops.integrator("LoadControl", 1.0); ops.analysis("Static")
assert ops.analyze(1) == 0
ops.reactions()
uy = lambda x, z: ops.nodeDisp(nos[(round(x / h), round((z - z0) / h))], 2)
Ry = sum(ops.nodeReaction(b, 2) for b in base)
Mx = sum(ops.nodeReaction(b, 4) for b in base)
res = {"topo_meio": uy(3.0, 3.0), "topo_canto": uy(0.0, 3.0), "lintel_meio": uy(3.0, 2.5), "peitoril_meio": uy(3.0, 0.5), "Ry": Ry, "Mx": Mx, "F": sum(forca.values())}
saida = {"fonte": "OpenSeesPy " + str(ops.version()) + " (ShellMITC4, ElasticMembranePlateSection)", "L": L, "t": t, "z0": z0, "z1": z1, "furo": furo, "nu": nu, "E": E, "malha": h, "resultados": res}
if "H_MALHA" not in os.environ:
    with open(os.path.join(os.path.dirname(__file__), "parede_empuxo.json"), "w") as f: json.dump(saida, f, indent=1)
print("ok", json.dumps(res, indent=1))
