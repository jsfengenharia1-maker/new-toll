"""Radier quadrado sobre base elástica (Winkler) com carga concentrada no centro, resolvido no OpenSees com placa
(ShellMITC4) e molas zeroLength k × área de influência. Gera radier.json para src/core/building/baseElastica.test.ts
(FU6: compara a grelha do Statikos com a placa). Fora do npm test.
Uso: python3 -m pip install openseespy && python3 validation/opensees/radier.py
"""
import json, math, os
import openseespy.opensees as ops

L, h, k, P, nu = 8.0, 0.4, 30000.0, 1000.0, 0.2
fck = 30.0
Eci = 5600 * math.sqrt(fck)              # MPa, αE = 1 (NBR 6118, 8.2.8)
Ecs = (0.8 + 0.2 * fck / 80) * Eci       # MPa
E = Ecs * 1000                           # kN/m²
n = 32                                   # malha 0,25 m
s = L / n

ops.wipe(); ops.model("basic", "-ndm", 3, "-ndf", 6)
tag = lambda i, j: i * (n + 1) + j + 1
for i in range(n + 1):
    for j in range(n + 1):
        ops.node(tag(i, j), i * s, j * s, 0.0)
        ops.fix(tag(i, j), 1, 1, 0, 0, 0, 1)
ops.section("ElasticMembranePlateSection", 1, E, nu, h, 0.0)
e = 1
for i in range(n):
    for j in range(n):
        ops.element("ShellMITC4", e, tag(i, j), tag(i + 1, j), tag(i + 1, j + 1), tag(i, j + 1), 1); e += 1
# molas: nó de terra próprio, zeroLength na direção 3
ops.uniaxialMaterial("Elastic", 1, 1.0)
base = 100000
for i in range(n + 1):
    for j in range(n + 1):
        a = (s if 0 < i < n else s / 2) * (s if 0 < j < n else s / 2)
        ops.node(base + tag(i, j), i * s, j * s, 0.0); ops.fix(base + tag(i, j), 1, 1, 1, 1, 1, 1)
        ops.uniaxialMaterial("Elastic", 10 + tag(i, j), k * a)
        ops.element("zeroLength", e, base + tag(i, j), tag(i, j), "-mat", 10 + tag(i, j), "-dir", 3); e += 1
ops.timeSeries("Linear", 1); ops.pattern("Plain", 1, 1)
c = tag(n // 2, n // 2)
ops.load(c, 0, 0, -P, 0, 0, 0)
ops.constraints("Plain"); ops.numberer("RCM"); ops.system("BandGeneral")
ops.test("NormDispIncr", 1e-12, 10); ops.algorithm("Linear"); ops.integrator("LoadControl", 1.0); ops.analysis("Static")
assert ops.analyze(1) == 0
w = lambda i, j: -ops.nodeDisp(tag(i, j), 3)
res = {"w_centro": w(n // 2, n // 2), "w_meio_borda": w(n // 2, 0), "w_canto": w(0, 0), "w_quarto": w(n // 4, n // 2),
       "sigma_max": k * w(n // 2, n // 2)}
saida = {"fonte": "OpenSeesPy " + str(ops.version()) + " (ShellMITC4, ElasticMembranePlateSection, zeroLength)",
         "L": L, "h": h, "k": k, "P": P, "nu": nu, "E": E, "malha": s, "resultados": res}
with open(os.path.join(os.path.dirname(__file__), "radier.json"), "w") as f: json.dump(saida, f, indent=1)
print("ok", res)
