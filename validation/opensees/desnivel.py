"""Pilar com vigas em desnível (E5m, K1.12.4-19): pórtico espacial 6 x 4 m, quatro pilares 30 x 30 engastados na cota 0
(lance de 4 m), vigas de borda 20 x 50 no nível do pavimento e a viga de x = 0 com o topo 1,5 m abaixo dele (nó intermediário
nos dois pilares dessa linha, cota 2,5), modelo separado; peso próprio e carga no topo de um pilar (N = 50, Hx = 10, Hy = 5 kN).
O modelo do pórtico do Statikos (barras com trechos rígidos horizontais e verticais por jntOffset, diafragma rígido por
rigidDiaphragm, apoios) é resolvido no OpenSees, caso G.

O modelo vem de desnivel.modelo.json, exportado pelo teste do app:
  GERAR_OPENSEES=1 npx vitest run src/core/building/desnivel.test.ts -t OpenSees
e este script grava desnivel.json (deslocamentos), comparado no mesmo teste (fora do npm test só a geração).
Uso: python3 -m pip install openseespy && python3 validation/opensees/desnivel.py
"""
import json, math, os
import openseespy.opensees as ops

aqui = os.path.dirname(os.path.abspath(__file__))
m = json.load(open(os.path.join(aqui, "desnivel.modelo.json")))


def cross(a, b): return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
def unit(a): L = math.sqrt(sum(v * v for v in a)); return [v / L for v in a]


ops.wipe(); ops.model("basic", "-ndm", 3, "-ndf", 6)
nn = len(m["nos"])
for i, p in enumerate(m["nos"]): ops.node(i, *p)
for no, gs in m["apoios"]:
    ops.fix(no, *[1 if g in gs else 0 for g in range(6)])
por_mestre = {}
for e in m["escravos"]: por_mestre.setdefault(e["mestre"], []).append(e["no"])
for mestre, escravos in por_mestre.items(): ops.rigidDiaphragm(3, mestre, *escravos)


def eixos(b):
    pi, pj = m["nos"][b["i"]], m["nos"][b["j"]]
    oi, oj = b["offI"] or [0, 0, 0], b["offJ"] or [0, 0, 0]
    a = [pi[q] + oi[q] for q in range(3)]; z = [pj[q] + oj[q] for q in range(3)]
    ex = unit([z[q] - a[q] for q in range(3)])
    ref = b["ref"] or [0, 0, 1]
    if abs(sum(ex[q] * ref[q] for q in range(3))) > 0.999 * math.sqrt(sum(r * r for r in ref)):
        ref = [1, 0, 0] if abs(ex[2]) > 0.999 else [0, 0, 1]
    ez = unit(cross(ex, ref))
    return ex, cross(ez, ex), ez, oi, oj


for k, b in enumerate(m["barras"]):
    ex, ey, ez, oi, oj = eixos(b)
    ops.geomTransf("Linear", k + 1, *ez, "-jntOffset", *oi, *oj)
    if b["Ay"]:
        ops.element("ElasticTimoshenkoBeam", k + 1, b["i"], b["j"], b["E"], b["G"], b["A"], b["J"], b["Iy"], b["Iz"], b["Ay"], 1e12, k + 1)
    else:
        ops.element("elasticBeamColumn", k + 1, b["i"], b["j"], b["A"], b["E"], b["G"], b["J"], b["Iy"], b["Iz"], k + 1)

# molas: zeroLength entre um nó fixo coincidente e o nó, um material elástico por mola, na direção do gdl
ne = len(m["barras"]) + 1
for q, mo in enumerate(m["molas"]):
    t = nn + q
    ops.node(t, *m["nos"][mo["no"]]); ops.fix(t, 1, 1, 1, 1, 1, 1)
    ops.uniaxialMaterial("Elastic", q + 1, mo["k"])
    ops.element("zeroLength", ne + q, t, mo["no"], "-mat", q + 1, "-dir", mo["gdl"] + 1)

ops.timeSeries("Linear", 1); ops.pattern("Plain", 1, 1)
for c in m["nodais"]: ops.load(c["no"], *c["f"])
for d in m["distribuidas"]:
    ex, ey, ez, _, _ = eixos(m["barras"][d["barra"]])
    q = d["q"]
    ops.eleLoad("-ele", d["barra"] + 1, "-type", "-beamUniform", sum(ey[k] * q[k] for k in range(3)), sum(ez[k] * q[k] for k in range(3)), sum(ex[k] * q[k] for k in range(3)))

ops.constraints("Transformation"); ops.numberer("RCM"); ops.system("UmfPack"); ops.test("NormDispIncr", 1e-12, 10)
ops.algorithm("Linear"); ops.integrator("LoadControl", 1.0); ops.analysis("Static")
assert ops.analyze(1) == 0
ops.reactions()
desloc = [[float(f"{ops.nodeDisp(i, k + 1):.10e}") for k in range(6)] for i in range(nn)]
json.dump({"nos": nn, "desloc": desloc}, open(os.path.join(aqui, "desnivel.json"), "w"))
print(f"ok: {nn} nós, {len(m['barras'])} barras; maior |ux| = {max(abs(d[0]) for d in desloc)*1000:.4f} mm; maior |uz| = {max(abs(d[2]) for d in desloc)*1000:.4f} mm")
