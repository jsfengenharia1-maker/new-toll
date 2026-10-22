"""Pilar-parede em L engastado na base (dois lados em casca, 3 m e 2 m, e = 0,20 m, H = 6 m) sob força linear no topo,
resolvido no OpenSees com ShellMITC4 (malha de 0,125 m). Gera pilar_parede.json para
src/core/building/pilarParede.validacao.test.ts (E1b: compara a casca de 6 nós do Statikos com a placa-membrana do
OpenSees). Fora do npm test.
Casos: (1) q = 100 kN/m em x no topo dos dois lados; (2) q = 100 kN/m em y; (3) carga vertical 200 kN/m no topo.
Uso: python3 -m pip install openseespy && python3 validation/opensees/pilar_parede.py
"""
import json, math, os
import openseespy.opensees as ops

L1, L2, t, H, nu = 3.0, 2.0, 0.20, 6.0, 0.2
fck = 30.0
Eci = 5600 * math.sqrt(fck)              # MPa (αE = 1)
Ecs = (0.8 + 0.2 * fck / 80) * Eci       # MPa
E = Ecs * 1000                           # kN/m²
h = float(os.environ.get("H_MALHA", 0.125))   # tamanho da malha de referência (m)
n1, n2, nz = round(L1 / h), round(L2 / h), round(H / h)


def montar(caso):
    ops.wipe(); ops.model("basic", "-ndm", 3, "-ndf", 6)
    ops.section("ElasticMembranePlateSection", 1, E, nu, t, 0.0)
    nos = {}
    def no(x, y, z):
        k = (round(x / 1e-4), round(y / 1e-4), round(z / 1e-4))
        if k not in nos:
            nos[k] = len(nos) + 1
            ops.node(nos[k], x, y, z)
        return nos[k]
    e = 1
    # lado 1: de (0,0) a (L1,0); lado 2: de (L1,0) a (L1,L2)
    for (n, p0, p1) in ((n1, (0.0, 0.0), (L1, 0.0)), (n2, (L1, 0.0), (L1, L2))):
        for i in range(n):
            for j in range(nz):
                def P(ii, jj):
                    s = ii / n
                    return no(p0[0] + s * (p1[0] - p0[0]), p0[1] + s * (p1[1] - p0[1]), jj * H / nz)
                ops.element("ShellMITC4", e, P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), 1); e += 1
    base = [tag for (x, y, z), tag in nos.items() if abs(z) < 1e-6 * 1e4]
    for tag in base:
        ops.fix(tag, 1, 1, 1, 1, 1, 1)
    topo = {k: tag for k, tag in nos.items() if abs(k[2] * 1e-4 - H) < 1e-6}
    ops.timeSeries("Linear", 1); ops.pattern("Plain", 1, 1)
    # força linear q ao longo dos dois lados (ao longo de cada lado, trecho h entre nós: q·h/2 em cada ponta)
    q = 100.0
    seg = []
    for (n, p0, p1) in ((n1, (0.0, 0.0), (L1, 0.0)), (n2, (L1, 0.0), (L1, L2))):
        for i in range(n):
            a = no(p0[0] + i / n * (p1[0] - p0[0]), p0[1] + i / n * (p1[1] - p0[1]), H)
            b = no(p0[0] + (i + 1) / n * (p1[0] - p0[0]), p0[1] + (i + 1) / n * (p1[1] - p0[1]), H)
            seg.append((a, b))
    for a, b in seg:
        f = [0.0] * 6
        if caso == 1: f[0] = q * h / 2
        elif caso == 2: f[1] = q * h / 2
        else: f[2] = -2 * q * h / 2
        ops.load(a, *f); ops.load(b, *f)
    return nos, base, topo, q


def resolver():
    ops.constraints("Plain"); ops.numberer("RCM"); ops.system("BandGeneral")
    ops.test("NormDispIncr", 1e-12, 10); ops.algorithm("Linear"); ops.integrator("LoadControl", 1.0); ops.analysis("Static")
    assert ops.analyze(1) == 0


res = {}
for caso in (1, 2, 3):
    nos, base, topo, q = montar(caso)
    resolver()
    canto = nos[(round(L1 / 1e-4), 0, round(H / 1e-4))]
    ponta1 = nos[(0, 0, round(H / 1e-4))]
    ponta2 = nos[(round(L1 / 1e-4), round(L2 / 1e-4), round(H / 1e-4))]
    ops.reactions()
    Rx = sum(ops.nodeReaction(b, 1) for b in base); Ry = sum(ops.nodeReaction(b, 2) for b in base); Rz = sum(ops.nodeReaction(b, 3) for b in base)
    # momentos das reações em torno do canto (L1, 0): (x - L1)·Rz e y·Rz
    Mx = sum(ops.nodeReaction(b, 4) + ops.nodeCoord(b, 2) * ops.nodeReaction(b, 3) for b in base)
    My = sum(ops.nodeReaction(b, 5) - (ops.nodeCoord(b, 1) - L1) * ops.nodeReaction(b, 3) for b in base)
    # reação vertical da parte do lado 1 com x ≤ 2 m (nó em x = 2 m dividido ao meio), compressão positiva
    def parte(x0):
        a = sum(ops.nodeReaction(b, 3) for b in base if ops.nodeCoord(b, 1) < x0 - 1e-6 and ops.nodeCoord(b, 2) < 1e-6)
        b0 = sum(ops.nodeReaction(b, 3) for b in base if abs(ops.nodeCoord(b, 1) - x0) < 1e-6 and ops.nodeCoord(b, 2) < 1e-6)
        return a + 0.5 * b0
    Rz1 = parte(2.0)
    d = lambda tag: [ops.nodeDisp(tag, g) for g in (1, 2, 3)]
    res[str(caso)] = {"canto": d(canto), "ponta1": d(ponta1), "ponta2": d(ponta2), "Rx": Rx, "Ry": Ry, "Rz": Rz, "Mx": Mx, "My": My, "Rz_x2": Rz1}

saida = {"fonte": "OpenSeesPy " + str(ops.version()) + " (ShellMITC4, ElasticMembranePlateSection)", "L1": L1, "L2": L2, "t": t, "H": H, "nu": nu, "E": E, "malha": h, "q": 100.0, "resultados": res}
if "H_MALHA" not in os.environ:
    with open(os.path.join(os.path.dirname(__file__), "pilar_parede.json"), "w") as f: json.dump(saida, f, indent=1)
print("ok", json.dumps(res, indent=1))
