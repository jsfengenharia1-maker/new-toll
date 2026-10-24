"""Rigidez axial das paredes separada da flexão (E6d, K1.4.30): pilar-parede em L (lados de 3 m e 2 m, e = 0,20 m,
H = 6 m, base engastada) no OpenSees com ShellMITC4 (malha de 0,125 m, E bruto) e, com f > 1, a parcela axial
uniforme: em cada linha horizontal da malha, uma cadeia de alavancas rígidas (balancins) cujo pivô final desce a média
de uz ponderada por E·t·ℓ (área de influência) dos nós da linha; entre os pivôs de linhas vizinhas, uma treliça com
EA = (f − 1)·E·A_seção. É o equivalente mecânico de `AxialMedio3` (fe3d.ts): energia ½·k·(ū_sup − ū_inf)², sem pico
local e sem mexer na flexão (modo de média nula). Gera parede_axial.json para
src/core/building/paredeAxial.validacao.test.ts. Fora do npm test.
Casos: (3) 200 kN/m vertical no topo dos dois lados; (4) 200 kN/m vertical só no topo do lado 1 (excêntrica: flexão
oblíqua + compressão); (1) 100 kN/m em x no topo dos dois lados. f = 1 e f = 3.
Uso: python3 -m pip install openseespy && python3 validation/opensees/parede_axial.py
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


def montar(caso, f):
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
    for (n, p0, p1) in LADOS:
        for i in range(n):
            for j in range(nz):
                ops.element("ShellMITC4", e, P(n, p0, p1, i, j), P(n, p0, p1, i + 1, j), P(n, p0, p1, i + 1, j + 1), P(n, p0, p1, i, j + 1), 1)
                e += 1
    base = [tag for k, tag in nos.items() if k[2] == 0]
    for tag in base:
        ops.fix(tag, 1, 1, 1, 1, 1, 1)

    # linha do nível jj: nós em ordem de abscissa s ao longo da polilinha, com o peso E·t·ℓ de influência
    def linha(jj):
        pts = []
        for li, (n, p0, p1) in enumerate(LADOS):
            Ll = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
            for i in range(n + 1):
                if li == 1 and i == 0:
                    continue  # canto já entrou pelo lado 1
                pts.append([(i / n) * Ll + (L1 if li == 1 else 0.0), P(n, p0, p1, i, jj), 0.0])
        for k in range(len(pts)):
            esq = pts[k][0] - pts[k - 1][0] if k > 0 else 0.0
            dir_ = pts[k + 1][0] - pts[k][0] if k + 1 < len(pts) else 0.0
            pts[k][2] = E * t * (esq + dir_) / 2
        return pts

    raiz0 = None
    if f != 1:
        tagN, eT = [10 ** 6], [10 ** 6]

        def aux(x, z):
            # nó dos balancins: só uz e o giro em torno de y livres
            tagN[0] += 1
            ops.node(tagN[0], x, 5.0, z)
            ops.fix(tagN[0], 1, 1, 0, 1, 0, 1)
            return tagN[0]

        ops.geomTransf("Linear", 1, 0.0, 1.0, 0.0)
        Er = E * 1e3

        def rigida(a, b):
            eT[0] += 1
            ops.element("elasticBeamColumn", eT[0], a, b, 1.0, Er, Er / 2.4, 1.0, 1.0, 1.0, 1)

        raizes, A_sec = [], t * (L1 + L2)
        for jj in range(nz + 1):
            z = jj * H / nz
            pts = linha(jj)
            if jj == 0:
                # a média dos nós engastados é nula: raiz presa em uz
                sbar = sum(p[0] * p[2] for p in pts) / sum(p[2] for p in pts)
                tagN[0] += 1
                ops.node(tagN[0], sbar, 5.0, z)
                ops.fix(tagN[0], 1, 1, 1, 1, 1, 1)
                raizes.append(tagN[0])
                raiz0 = tagN[0]
                continue
            # o Transformation não aceita restrição encadeada: a ponta esquerda do 1.º balancim liga-se ao nó da parede
            acc, pos, W = pts[0][1], pts[0][0], pts[0][2]
            for s, tag, w in pts[1:]:
                q = aux(pos, z)
                ops.equalDOF(acc, q, 3)
                pv = (W * pos + w * s) / (W + w)
                p = aux(pv, z)
                r = aux(s, z)
                ops.equalDOF(tag, r, 3)
                rigida(q, p)
                rigida(p, r)
                acc, pos, W = p, pv, W + w
            raizes.append(acc)
        ops.uniaxialMaterial("Elastic", 1, (f - 1) * E)
        for jj in range(1, nz + 1):
            eT[0] += 1
            ops.element("Truss", eT[0], raizes[jj - 1], raizes[jj], A_sec, 1)
    ops.timeSeries("Linear", 1)
    ops.pattern("Plain", 1, 1)
    q = 100.0
    for li, (n, p0, p1) in enumerate(LADOS):
        if caso == 4 and li == 1:
            continue
        for i in range(n):
            a, b = P(n, p0, p1, i, nz), P(n, p0, p1, i + 1, nz)
            fv = [0.0] * 6
            if caso == 1:
                fv[0] = q * h / 2
            else:
                fv[2] = -2 * q * h / 2
            ops.load(a, *fv)
            ops.load(b, *fv)
    return nos, base, linha, raiz0


def resolver():
    ops.constraints("Transformation"); ops.numberer("RCM"); ops.system("UmfPack")
    ops.test("NormDispIncr", 1e-12, 10); ops.algorithm("Linear"); ops.integrator("LoadControl", 1.0); ops.analysis("Static")
    assert ops.analyze(1) == 0


res = {}
for f in (1, 3):
    for caso in (1, 3, 4):
        nos, base, linha, raiz0 = montar(caso, f)
        resolver()
        canto = nos[(round(L1 / 1e-4), 0, round(H / 1e-4))]
        ponta1 = nos[(0, 0, round(H / 1e-4))]
        ponta2 = nos[(round(L1 / 1e-4), round(L2 / 1e-4), round(H / 1e-4))]
        ops.reactions()
        # reação da treliça do 1.º trecho (raiz do nível 0) devolvida aos nós da base pelos mesmos pesos da média
        pts0 = linha(0)
        R0 = ops.nodeReaction(raiz0, 3) if raiz0 else 0.0
        W0 = sum(w for s, tag, w in pts0)
        extra = {tag: R0 * w / W0 for s, tag, w in pts0}
        rz = lambda b: ops.nodeReaction(b, 3) + extra.get(b, 0.0)
        Rz = sum(rz(b) for b in base)
        Mx = sum(ops.nodeReaction(b, 4) + ops.nodeCoord(b, 2) * rz(b) for b in base)
        My = sum(ops.nodeReaction(b, 5) - (ops.nodeCoord(b, 1) - L1) * rz(b) for b in base)

        def parte(x0):
            a = sum(rz(b) for b in base if ops.nodeCoord(b, 1) < x0 - 1e-6 and ops.nodeCoord(b, 2) < 1e-6)
            b0 = sum(rz(b) for b in base if abs(ops.nodeCoord(b, 1) - x0) < 1e-6 and ops.nodeCoord(b, 2) < 1e-6)
            return a + 0.5 * b0
        pts = linha(nz)
        media = sum(ops.nodeDisp(tag, 3) * w for s, tag, w in pts) / sum(w for s, tag, w in pts)
        d = lambda tag: [ops.nodeDisp(tag, g) for g in (1, 2, 3)]
        res[f"f{f}_c{caso}"] = {"canto": d(canto), "ponta1": d(ponta1), "ponta2": d(ponta2), "uzMedio": media, "Rz": Rz, "Mx": Mx, "My": My, "Rz_x2": parte(2.0)}

saida = {"fonte": "OpenSeesPy " + str(ops.version()) + " (ShellMITC4, ElasticMembranePlateSection; balancins rígidos + Truss)", "L1": L1, "L2": L2, "t": t, "H": H, "nu": nu, "E": E, "malha": h, "q": 100.0, "resultados": res}
if "H_MALHA" not in os.environ:
    with open(os.path.join(os.path.dirname(__file__), "parede_axial.json"), "w") as fo:
        json.dump(saida, fo, indent=1)
print("ok", json.dumps({k: {kk: vv for kk, vv in v.items() if kk in ("uzMedio", "canto", "Rz_x2", "Mx", "My")} for k, v in res.items()}, indent=0))
