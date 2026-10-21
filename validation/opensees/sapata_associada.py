"""Sapata associada (dois pilares) como placa sobre molas de Winkler no OpenSees: ShellMITC4 (placa de concreto, E = Ecs)
sobre molas zeroLength k × área de influência, cargas dos pilares distribuídas na área de cada pilar. Referência da
frente FU8d para `src/core/footingsGroup.test.ts` (compara a sapata associada do Statikos: pressão plana sem tração e
momentos por faixa pelo diagrama de momentos). Gera sapata_associada.json. Fora do npm test.

Uso: python3 -m pip install openseespy && python3 validation/opensees/sapata_associada.py

Em cada caso a base A × B e a altura h são impostas (mesma geometria no Statikos, com `fixed`); as cargas são de cálculo.
Resultados por caso: pressão máxima e mínima do solo (σ = k·w, kN/m²) e o diagrama de momentos da faixa (integrado na
largura B) a partir das reações do solo em cada corte x: M(x) = Σ R_i·(x − x_i) − Σ N_j·(x − x_j) (tração embaixo > 0 ao
contrário: aqui M > 0 traciona a face inferior, como a pressão do solo à esquerda do corte) — momentos nas seções a
0,15·a dentro da face do pilar extremo (positivo, balanço) e o menor valor entre os pilares (negativo).
"""
import json, math, os
import openseespy.opensees as ops

fck = 30.0
Eci = 5600 * math.sqrt(fck)              # MPa (NBR 6118, 8.2.8, αE = 1)
Ecs = (0.8 + 0.2 * fck / 80) * Eci
E = Ecs * 1000                           # kN/m²
nu = 0.2
k = 30000.0                              # kN/m³ (solo médio)
ap = bp = 0.30
dx = 0.15                                # malha: o pilar de 0,30 m cobre 3 nós por direção

CASOS = {
    # N de cálculo (kN) e posição x (m) de cada pilar; y = 0
    "iguais":    {"A": 4.5, "B": 2.1, "h": 1.5, "pilares": [(-1.5, 840.0), (1.5, 840.0)]},
    "diferentes": {"A": 5.1, "B": 2.1, "h": 1.5, "pilares": [(-1.05, 1120.0), (2.1, 560.0)]},   # resultante na origem
    "excentrico": {"A": 4.5, "B": 2.1, "h": 1.5, "pilares": [(-1.5, 1120.0), (1.5, 560.0)]},
    # solo 5× mais mole: a placa já é quase rígida com k = 30 000; o resultado quase não muda (controle)
    "diferentes_mole": {"A": 5.1, "B": 2.1, "h": 1.5, "pilares": [(-1.05, 1120.0), (2.1, 560.0)], "k": 6000.0},
}


def resolver(A, B, h, pilares, k=k):
    nx, ny = round(A / dx), round(B / dx)
    ops.wipe(); ops.model("basic", "-ndm", 3, "-ndf", 6)
    tag = lambda i, j: i * (ny + 1) + j + 1
    X = lambda i: -A / 2 + i * dx
    Y = lambda j: -B / 2 + j * dx
    for i in range(nx + 1):
        for j in range(ny + 1):
            ops.node(tag(i, j), X(i), Y(j), 0.0)
            ops.fix(tag(i, j), 1, 1, 0, 0, 0, 1)
    ops.section("ElasticMembranePlateSection", 1, E, nu, h, 0.0)
    e = 1
    for i in range(nx):
        for j in range(ny):
            ops.element("ShellMITC4", e, tag(i, j), tag(i + 1, j), tag(i + 1, j + 1), tag(i, j + 1), 1); e += 1
    base = 1000000
    area = {}
    for i in range(nx + 1):
        for j in range(ny + 1):
            a = (dx if 0 < i < nx else dx / 2) * (dx if 0 < j < ny else dx / 2)
            area[(i, j)] = a
            ops.node(base + tag(i, j), X(i), Y(j), 0.0); ops.fix(base + tag(i, j), 1, 1, 1, 1, 1, 1)
            ops.uniaxialMaterial("Elastic", 10 + tag(i, j), k * a)
            ops.element("zeroLength", e, base + tag(i, j), tag(i, j), "-mat", 10 + tag(i, j), "-dir", 3); e += 1
    ops.timeSeries("Linear", 1); ops.pattern("Plain", 1, 1)
    # carga de cada pilar distribuída na área ap × bp (pesos de área dos nós cobertos)
    cargas = []
    for (xc, N) in pilares:
        ic = round((xc + A / 2) / dx); jc = round((0 + B / 2) / dx)
        nos = [(i, j) for i in range(ic - 1, ic + 2) for j in range(jc - 1, jc + 2)]
        w = {(i, j): (0.5 if abs(i - ic) == 1 else 1.0) * (0.5 if abs(j - jc) == 1 else 1.0) for (i, j) in nos}
        s = sum(w.values())
        for (i, j) in nos:
            ops.load(tag(i, j), 0, 0, -N * w[(i, j)] / s, 0, 0, 0)
        cargas.append((xc, N))
    ops.constraints("Plain"); ops.numberer("RCM"); ops.system("BandGeneral")
    ops.test("NormDispIncr", 1e-12, 10); ops.algorithm("Linear"); ops.integrator("LoadControl", 1.0); ops.analysis("Static")
    assert ops.analyze(1) == 0
    # reações do solo por nó: R = k·a·w (kN, para cima)
    R = {(i, j): -ops.nodeDisp(tag(i, j), 3) * k * area[(i, j)] for i in range(nx + 1) for j in range(ny + 1)}
    sigma = [-ops.nodeDisp(tag(i, j), 3) * k for i in range(nx + 1) for j in range(ny + 1)]
    return R, sigma, X, nx, ny, cargas


def momento(R, X, nx, ny, cargas, xs):
    """M(x) da faixa (kN·m): reações do solo à esquerda do corte menos as cargas dos pilares à esquerda (pilares puntuais)."""
    m = 0.0
    for i in range(nx + 1):
        if X(i) < xs - 1e-9:
            m += sum(R[(i, j)] for j in range(ny + 1)) * (xs - X(i))
    for (xc, N) in cargas:
        if xc < xs - 1e-9:
            m -= N * (xs - xc)
    return m


saida = {"fonte": "OpenSeesPy " + str(ops.version()) + " (ShellMITC4, ElasticMembranePlateSection, zeroLength)", "E": E, "nu": nu, "k": k, "malha": dx, "casos": {}}
for nome, c in CASOS.items():
    A, B, h, pil = c["A"], c["B"], c["h"], c["pilares"]
    R, sigma, X, nx, ny, cargas = resolver(A, B, h, pil, c.get("k", k))
    xs_pos_e = min(x for x, _ in pil) - 0.35 * ap          # seção a 0,15·a dentro da face do pilar extremo (esquerda)
    xs_pos_d = max(x for x, _ in pil) + 0.35 * ap
    # momento positivo: balanços (esquerda: reações à esquerda do corte; direita: pelo lado direito, por simetria de sinais)
    Me = momento(R, X, nx, ny, cargas, xs_pos_e)
    Rd = lambda xs: sum(R[(i, j)] * (X(i) - xs) for i in range(nx + 1) for j in range(ny + 1) if X(i) > xs + 1e-9)
    Md = Rd(xs_pos_d)
    xs_vao = [pil[0][0] + ap / 2 + t * (pil[1][0] - pil[0][0] - ap) / 200 for t in range(201)]
    Mvao = [momento(R, X, nx, ny, cargas, x) for x in xs_vao]
    Mneg = min(Mvao)
    xneg = xs_vao[Mvao.index(Mneg)]
    saida["casos"][nome] = {
        "A": A, "B": B, "h": h, "k": c.get("k", k), "pilares": [{"x": x, "N": N} for x, N in pil],
        "sigma_max": max(sigma), "sigma_min": min(sigma), "sigma_media": sum(N for _, N in pil) / (A * B),
        "M_pos_esq": Me, "M_pos_dir": Md, "M_neg": Mneg, "x_neg": xneg,
    }
    print(nome, {k_: round(v, 3) if isinstance(v, float) else v for k_, v in saida["casos"][nome].items() if k_ not in ("pilares",)})
with open(os.path.join(os.path.dirname(__file__), "sapata_associada.json"), "w") as f:
    json.dump(saida, f, indent=1)
