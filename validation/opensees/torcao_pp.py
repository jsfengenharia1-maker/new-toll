"""Torção do pilar-parede em L (V7g, C4.60): lados de 3 m (ao longo de x) e 2 m (ao longo de y), e = 0,20 m, H = 6 m,
base engastada, ShellMITC4 (malha de 0,125 m, E bruto), sob força linear horizontal no topo aplicada só em um lado
(carga lateral excêntrica em relação ao centroide, que gera torçor). Gera torcao_pp.json para
src/core/resultados/v7g.test.ts: reações da base (Rx, Ry, soma dos momentos nodais em torno de z, torçor em torno da
origem e a decomposição por lado), de onde o teste tira o torçor em torno do centroide. Fora do npm test.
Casos: (1) 100 kN/m em x só no lado 1 (y = 0); (2) 100 kN/m em y só no lado 2 (x = 3 m); (3) 100 kN/m em x no lado 1 e
-60 kN/m em y no lado 2. Convenção: reações (força da base sobre a estrutura), torçor anti-horário + visto de cima.
V7h: também o corte horizontal a meia altura (z = H/2 acima da base, pavimento intermediário): forças que os nós do corte
fazem nos elementos de cima (resposta 'forces' do ShellMITC4: K·u, sem cargas de pressão), somadas nos nós do corte, no
total e por lado (Rx, Ry, Rz e os momentos em torno da origem na cota do corte), de onde o teste tira a seção interna.
Uso: python3 -m pip install openseespy && python3 validation/opensees/torcao_pp.py
"""
import json, math, os
import openseespy.opensees as ops

L1, L2, t, H, nu = 3.0, 2.0, 0.20, 6.0, 0.2
fck = 30.0
Eci = 5600 * math.sqrt(fck)              # MPa (αE = 1)
Ecs = (0.8 + 0.2 * fck / 80) * Eci       # MPa
E = Ecs * 1000                           # kN/m²
h = float(os.environ.get("H_MALHA", 0.125))
n1, n2, nz = round(L1 / h), round(L2 / h), round(H / h)
LADOS = ((n1, (0.0, 0.0), (L1, 0.0)), (n2, (L1, 0.0), (L1, L2)))
CASOS = {1: (100.0, 0.0), 2: (0.0, 100.0), 3: (100.0, -60.0)}   # (qx no lado 1, qy no lado 2) em kN/m


ELE = []


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

    def P(n, p0, p1, ii, jj):
        s = ii / n
        return no(p0[0] + s * (p1[0] - p0[0]), p0[1] + s * (p1[1] - p0[1]), jj * H / nz)

    e = 1
    ELE.clear()
    for li, (n, p0, p1) in enumerate(LADOS):
        for i in range(n):
            for j in range(nz):
                ns = (P(n, p0, p1, i, j), P(n, p0, p1, i + 1, j), P(n, p0, p1, i + 1, j + 1), P(n, p0, p1, i, j + 1))
                ops.element("ShellMITC4", e, *ns, 1)
                ELE.append((e, li, j, ns))
                e += 1
    base = [tag for k, tag in nos.items() if k[2] == 0]
    for tag in base:
        ops.fix(tag, 1, 1, 1, 1, 1, 1)
    ops.timeSeries("Linear", 1); ops.pattern("Plain", 1, 1)
    qx, qy = CASOS[caso]
    for li, (n, p0, p1) in enumerate(LADOS):
        q = (qx, 0.0) if li == 0 else (0.0, qy)
        if q == (0.0, 0.0):
            continue
        for i in range(n):
            a, b = P(n, p0, p1, i, nz), P(n, p0, p1, i + 1, nz)
            for tag in (a, b):
                ops.load(tag, q[0] * h / 2, q[1] * h / 2, 0.0, 0.0, 0.0, 0.0)
    return nos, base


def resolver():
    ops.constraints("Plain"); ops.numberer("RCM"); ops.system("BandGeneral")
    ops.test("NormDispIncr", 1e-12, 10); ops.algorithm("Linear"); ops.integrator("LoadControl", 1.0); ops.analysis("Static")
    assert ops.analyze(1) == 0


res = {}
for caso in CASOS:
    nos, base = montar(caso)
    resolver()
    ops.reactions()
    R = lambda b, g: ops.nodeReaction(b, g)
    X = lambda b: ops.nodeCoord(b, 1)
    Y = lambda b: ops.nodeCoord(b, 2)
    Rx = sum(R(b, 1) for b in base); Ry = sum(R(b, 2) for b in base)
    soma_mz = sum(R(b, 6) for b in base)                                   # soma dos momentos nodais em torno de z
    Mz0 = sum(R(b, 6) + X(b) * R(b, 2) - Y(b) * R(b, 1) for b in base)    # torçor da reação em torno da origem
    # decomposição: reação horizontal dos nós do lado 1 (y = 0) e do lado 2 (x = L1, sem o canto)
    l1 = [b for b in base if abs(Y(b)) < 1e-6]
    l2 = [b for b in base if abs(X(b) - L1) < 1e-6 and Y(b) > 1e-6]
    # corte a meia altura: elementos com j >= nz/2 (acima do corte); forças nos nós de z = H/2
    jc = nz // 2
    acum = {}   # nó -> (lado, [6 forças])
    for (e, li, j, ns) in ELE:
        if j < jc:
            continue
        f = ops.eleResponse(e, "forces")
        for a, nd in enumerate(ns):
            if abs(ops.nodeCoord(nd, 3) - jc * H / nz) < 1e-6:
                v = acum.setdefault(nd, (li, [0.0] * 6))[1]
                for g in range(6):
                    v[g] += f[6 * a + g]
    corte = {"Rx": 0.0, "Ry": 0.0, "Rz": 0.0, "Mx0": 0.0, "My0": 0.0, "Mz0": 0.0}
    for lado in (0, 1):
        for k in ("Rx", "Ry", "Rz"):
            corte[k + "_lado%d" % (lado + 1)] = 0.0
    for nd, (li, v) in acum.items():
        x, y = X(nd), Y(nd)
        corte["Rx"] += v[0]; corte["Ry"] += v[1]; corte["Rz"] += v[2]
        corte["Mx0"] += v[3] + y * v[2]; corte["My0"] += v[4] - x * v[2]; corte["Mz0"] += v[5] + x * v[1] - y * v[0]
        corte["Rx_lado%d" % (li + 1)] += v[0]; corte["Ry_lado%d" % (li + 1)] += v[1]; corte["Rz_lado%d" % (li + 1)] += v[2]
    # o nó do canto pertence aos dois lados: contado uma só vez nos totais por lado como acima (cada lado soma os elementos dele)
    res[str(caso)] = {
        "corte": corte,
        "q": list(CASOS[caso]), "Rx": Rx, "Ry": Ry, "soma_Mz_nodal": soma_mz, "Mz_origem": Mz0,
        "Rx_lado1": sum(R(b, 1) for b in l1), "Ry_lado1": sum(R(b, 2) for b in l1),
        "Rx_lado2": sum(R(b, 1) for b in l2), "Ry_lado2": sum(R(b, 2) for b in l2),
        "Mz_lado1": sum(X(b) * R(b, 2) for b in l1), "Mz_lado2": sum(X(b) * R(b, 2) - Y(b) * R(b, 1) for b in l2),
    }

saida = {"fonte": "OpenSeesPy " + str(ops.version()) + " (ShellMITC4, ElasticMembranePlateSection)", "L1": L1, "L2": L2, "t": t, "H": H, "nu": nu, "E": E, "malha": h, "resultados": res}
if "H_MALHA" not in os.environ:
    with open(os.path.join(os.path.dirname(__file__), "torcao_pp.json"), "w") as f: json.dump(saida, f, indent=1)
print("ok", json.dumps(res, indent=1))
