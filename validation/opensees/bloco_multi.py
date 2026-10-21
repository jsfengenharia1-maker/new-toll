"""Bloco sobre 4 estacas com dois pilares (frente FU8d): modelo sólido no OpenSees (stdBrick elástico, cabeças das estacas
apoiadas na vertical, cargas dos pilares distribuídas na área de cada um) para conferir a força dos tirantes das bielas e
tirantes do Statikos (`src/core/caps.ts`, bloco com vários pilares). O tirante entre as duas estacas de um pilar (direção y)
é a resultante de tração de σyy no corte vertical y = 0 sob esse pilar (metade x < 0 ou x > 0 do bloco); a de compressão no
topo do corte equilibra a de tração (conferência). Gera bloco_multi.json. Fora do npm test.

Uso: python3 -m pip install openseespy && python3 validation/opensees/bloco_multi.py
"""
import json, math, os, time
import openseespy.opensees as ops

fck = 30.0
Eci = 5600 * math.sqrt(fck)
Ecs = (0.8 + 0.2 * fck / 80) * Eci
E = Ecs * 1000
nu = 0.2
dx = 0.05
lx = ly = 2.0
D = 0.4                                   # estaca (lado equivalente do apoio: quadrado de 0,4 m)
H = 0.65                                  # altura do bloco (a do Statikos com φ16 no pilar, d = h − 0,10)
nz = 10
ap = bp = 0.30
PILES = [(-0.6, -0.6), (-0.6, 0.6), (0.6, -0.6), (0.6, 0.6)]

CASOS = {
    "simetrico":  {"pilares": [(-0.6, 1120.0), (0.6, 1120.0)]},     # Nd = 1,4 × 800 kN
    "assimetrico": {"pilares": [(-0.6, 1400.0), (0.6, 560.0)]},     # Nd = 1,4 × 1000 e 1,4 × 400 kN
}


def resolver(pilares):
    nx, ny = round(lx / dx), round(ly / dx)
    dz = H / nz
    ops.wipe(); ops.model("basic", "-ndm", 3, "-ndf", 3)
    tag = lambda i, j, k: (i * (ny + 1) + j) * (nz + 1) + k + 1
    X = lambda i: -lx / 2 + i * dx
    Y = lambda j: -ly / 2 + j * dx
    for i in range(nx + 1):
        for j in range(ny + 1):
            for k in range(nz + 1):
                ops.node(tag(i, j, k), X(i), Y(j), k * dz)
    # apoios: cabeças das estacas (quadrado D × D em z = 0) presas na vertical; rigidez de corpo rígido em x e y
    for (px, py) in PILES:
        for i in range(nx + 1):
            for j in range(ny + 1):
                if abs(X(i) - px) <= D / 2 + 1e-9 and abs(Y(j) - py) <= D / 2 + 1e-9:
                    ops.fix(tag(i, j, 0), 0, 0, 1)
    ops.fix(tag(0, 0, 0), 1, 1, 0); ops.fix(tag(nx, 0, 0), 0, 1, 0)
    ops.nDMaterial("ElasticIsotropic", 1, E, nu)
    e = 1
    elems = {}
    for i in range(nx):
        for j in range(ny):
            for k in range(nz):
                n = [tag(i, j, k), tag(i + 1, j, k), tag(i + 1, j + 1, k), tag(i, j + 1, k),
                     tag(i, j, k + 1), tag(i + 1, j, k + 1), tag(i + 1, j + 1, k + 1), tag(i, j + 1, k + 1)]
                ops.element("stdBrick", e, *n, 1); elems[(i, j, k)] = e; e += 1
    ops.timeSeries("Linear", 1); ops.pattern("Plain", 1, 1)
    for (xc, N) in pilares:
        nos = [(i, j) for i in range(nx + 1) for j in range(ny + 1) if abs(X(i) - xc) <= ap / 2 + 1e-9 and abs(Y(j)) <= bp / 2 + 1e-9]
        w = {(i, j): (0.5 if abs(X(i) - xc) > ap / 2 - 1e-9 else 1.0) * (0.5 if abs(Y(j)) > bp / 2 - 1e-9 else 1.0) for (i, j) in nos}
        s = sum(w.values())
        for (i, j) in nos:
            ops.load(tag(i, j, nz), 0, 0, -N * w[(i, j)] / s)
    ops.constraints("Plain"); ops.numberer("RCM"); ops.system("ProfileSPD")
    ops.test("NormDispIncr", 1e-10, 10); ops.algorithm("Linear"); ops.integrator("LoadControl", 1.0); ops.analysis("Static")
    assert ops.analyze(1) == 0
    # reação por estaca = soma das forças nodais nos nós apoiados
    ops.reactions()
    reac = []
    for (px, py) in PILES:
        r = 0.0
        for i in range(nx + 1):
            for j in range(ny + 1):
                if abs(X(i) - px) <= D / 2 + 1e-9 and abs(Y(j) - py) <= D / 2 + 1e-9:
                    r += ops.nodeReaction(tag(i, j, 0), 3)
        reac.append(r)
    # corte y = 0: σyy nos pontos de Gauss do plano de elementos logo acima (j = ny/2): os 4 pontos de Gauss mais próximos de y = 0
    jc = ny // 2
    res = {"x<0": {"T": 0.0, "C": 0.0, "Tz": 0.0}, "x>0": {"T": 0.0, "C": 0.0, "Tz": 0.0}}
    resx = {"y<0": {"T": 0.0, "C": 0.0}, "y>0": {"T": 0.0, "C": 0.0}}
    for i in range(nx):
        xm = X(i) + dx / 2
        for k in range(nz):
            st = ops.eleResponse(elems[(i, jc, k)], "stresses")   # 8 pontos de Gauss × 6 componentes
            # ordem dos pontos de Gauss do stdBrick: os 4 primeiros estão na face local ξ₂ = −1 (y menor)
            area = dx * dz / 4
            zs = (k + 0.5) * dz
            for g in range(4):
                syy = st[6 * g + 1]
                lado = "x<0" if xm < 0 else "x>0"
                if syy > 0:
                    res[lado]["T"] += syy * area; res[lado]["Tz"] += syy * area * zs
                else:
                    res[lado]["C"] += syy * area
    # corte x = 0 (tirante na direção x entre as estacas de pilares diferentes): σxx no plano de elementos i = nx/2 (informativo)
    ic = nx // 2
    for j in range(ny):
        ym = Y(j) + dx / 2
        for k in range(nz):
            st = ops.eleResponse(elems[(ic, j, k)], "stresses")
            area = dx * dz / 4
            for g in range(8):
                if g in (0, 3, 4, 7):       # pontos de Gauss do lado de x menor
                    sxx = st[6 * g + 0]
                    lado = "y<0" if ym < 0 else "y>0"
                    resx[lado]["T" if sxx > 0 else "C"] += sxx * area * 2 / 2
    return reac, res, resx


saida = {"fonte": "OpenSeesPy " + str(ops.version()) + " (stdBrick elástico, malha 5 cm × 6,5 cm)", "E": E, "nu": nu, "lx": lx, "ly": ly, "h": H, "D": D, "casos": {}}
for nome, c in CASOS.items():
    t0 = time.time()
    reac, res, resx = resolver(c["pilares"])
    saida["casos"][nome] = {"pilares": [{"x": x, "N": N} for x, N in c["pilares"]], "estacas": [{"x": p[0], "y": p[1]} for p in PILES],
                            "reacoes": reac, "corte_y0": res, "corte_x0": resx}
    print(nome, round(time.time() - t0, 1), "s", [round(r, 1) for r in reac], {k: {a: round(b, 1) for a, b in v.items()} for k, v in res.items()})
with open(os.path.join(os.path.dirname(__file__), "bloco_multi.json"), "w") as f:
    json.dump(saida, f, indent=1)
