"""Escadas da E4c: lances de escada (laje inclinada, patamares, apoios rígidos e elásticos) resolvidos no OpenSees com
ShellMITC4 (ElasticMembranePlateSection) numa malha de quadriláteros 4 vezes mais fina que a do Statikos (casca de 6 nós),
com as mesmas cargas nodais (q por m² de projeção horizontal sobre a área em planta de cada célula), os mesmos apoios
(linhas de nós com gdl vertical preso; embaixo também o horizontal no sentido da subida, com um nó central preso na
transversal; molas por zeroLength com a rigidez por metro × comprimento tributário) e a mesma geometria (retângulos 3D do
modelo local).

O cenário vem de escada.modelo.json, exportado pelo teste do app:
  GERAR_OPENSEES=1 npx vitest run src/core/building/escadasCalculo.validacao.test.ts
e este script grava escada.json (reações por linha de apoio e deslocamento vertical nos pontos de prova do caso G),
comparado pelo mesmo teste (fora do npm test só a geração). Variáveis: OS_CASO (filtra os cenários por trecho do nome e funde no
JSON existente), F_MALHA (refino, padrão 4), OS_ELE (elemento, padrão ShellMITC4).
Uso: python3 -m pip install openseespy && python3 validation/opensees/escada.py
"""
import json, math, os
import openseespy.opensees as ops

aqui = os.path.dirname(os.path.abspath(__file__))
casos = json.load(open(os.path.join(aqui, "escada.modelo.json")))["casos"]
F = int(os.environ.get("F_MALHA", 4))  # fator de refino em relação à malha de 6 nós


def refinar(v, f):
    out = []
    for i in range(len(v) - 1):
        for k in range(f):
            out.append(v[i] + (v[i + 1] - v[i]) * k / f)
    out.append(v[-1])
    return out


def dentro(p, poly):
    c = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]; xj, yj = poly[j]
        if (yi > p[1]) != (yj > p[1]) and p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def resolver(cs):
    E, nu, h = cs["E"], cs["nu"], cs["h"]
    FX, FY = refinar(cs["FX"], F), refinar(cs["FY"], F)
    ops.wipe(); ops.model("basic", "-ndm", 3, "-ndf", 6)
    ops.section("ElasticMembranePlateSection", 1, E, nu, h, 0.0)
    nos, coords = {}, {}

    def zde(r, x, y):
        c, z = r["c"], r["z"]
        e1 = (c[1][0] - c[0][0], c[1][1] - c[0][1]); e2 = (c[3][0] - c[0][0], c[3][1] - c[0][1])
        u = ((x - c[0][0]) * e1[0] + (y - c[0][1]) * e1[1]) / (e1[0] ** 2 + e1[1] ** 2)
        v = ((x - c[0][0]) * e2[0] + (y - c[0][1]) * e2[1]) / (e2[0] ** 2 + e2[1] ** 2)
        return (1 - u) * (1 - v) * z[0] + u * (1 - v) * z[1] + u * v * z[2] + (1 - u) * v * z[3]

    def no(i, j, r):
        if (i, j) not in nos:
            nos[(i, j)] = len(nos) + 1
            x, y = FX[i], FY[j]
            coords[nos[(i, j)]] = (x, y, zde(r, x, y))
            ops.node(nos[(i, j)], x, y, coords[nos[(i, j)]][2])
        return nos[(i, j)]

    def indice(v, x):
        return min(range(len(v)), key=lambda k: abs(v[k] - x))

    forca, e = {}, 1
    for r in cs["rets"]:
        xs = [q[0] for q in r["c"]]; ys = [q[1] for q in r["c"]]
        i0, i1, j0, j1 = indice(FX, min(xs)), indice(FX, max(xs)), indice(FY, min(ys)), indice(FY, max(ys))
        for i in range(i0, i1):
            for j in range(j0, j1):
                ns = [no(i, j, r), no(i + 1, j, r), no(i + 1, j + 1, r), no(i, j + 1, r)]
                ops.element(os.environ.get("OS_ELE", "ShellMITC4"), e, *ns, 1); e += 1
                area = (FX[i + 1] - FX[i]) * (FY[j + 1] - FY[j])
                xc, yc = (FX[i] + FX[i + 1]) / 2, (FY[j] + FY[j + 1]) / 2
                q = r["permanente"]
                for f in r["faixas"]:
                    if dentro((xc, yc), f["poligono"]):
                        q += f["permanente"]
                for n in ns:
                    forca[n] = forca.get(n, 0.0) + q * area / 4
    assert cs["corrimao"] == 0, "corrimão não exportado"
    apoios = {}  # nó -> gdl presos
    molas = []
    por_linha = {}
    for ln in cs["linhas"]:
        a, b = ln["a"], ln["b"]
        ia, ja, ib, jb = indice(FX, a[0]), indice(FY, a[1]), indice(FX, b[0]), indice(FY, b[1])
        if ia != ib and ja != jb:
            raise SystemExit("linha de apoio fora dos eixos")
        seq = [(i, ja) for i in range(min(ia, ib), max(ia, ib) + 1)] if ia != ib else [(ia, j) for j in range(min(ja, jb), max(ja, jb) + 1)]
        tags = [nos[k] for k in seq]
        por_linha[ln["id"]] = {"nos": tags, "rigido": ln["rigido"]}
        trib = {}
        for k, t in enumerate(tags):
            lado = []
            if k > 0: lado.append(math.dist(coords[t][:2], coords[tags[k - 1]][:2]))
            if k + 1 < len(tags): lado.append(math.dist(coords[t][:2], coords[tags[k + 1]][:2]))
            trib[t] = sum(lado) / 2
        if ln["rigido"]:
            for t in tags:
                apoios.setdefault(t, set()).add(3)
                if ln["fixaX"]: apoios[t].add(1)
                if ln["fixaY"]: apoios[t].add(2)
            if ln["id"] == "inf":
                meio = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
                t = min(tags, key=lambda t: (coords[t][0] - meio[0]) ** 2 + (coords[t][1] - meio[1]) ** 2)
                apoios.setdefault(t, set()).add(2)
        else:
            for t in tags:
                molas.append((t, ln["kLinha"] * trib[t], ln["id"]))
    for t, gs in apoios.items():
        ops.fix(t, *[1 if (g + 1) in gs else 0 for g in range(6)])
    base = len(nos) + 1000
    for k, (t, kk, lid) in enumerate(molas):
        gnd = base + k
        ops.node(gnd, *coords[t]); ops.fix(gnd, 1, 1, 1, 1, 1, 1)
        ops.uniaxialMaterial("Elastic", 100000 + k, kk)
        ops.element("zeroLength", 100000 + k, t, gnd, "-mat", 100000 + k, "-dir", 3)
    ops.timeSeries("Linear", 1); ops.pattern("Plain", 1, 1)
    for n, f in forca.items():
        ops.load(n, 0.0, 0.0, -f, 0.0, 0.0, 0.0)
    ops.constraints("Plain"); ops.numberer("RCM"); ops.system("BandGeneral")
    ops.test("NormDispIncr", 1e-12, 10); ops.algorithm("Linear"); ops.integrator("LoadControl", 1.0); ops.analysis("Static")
    assert ops.analyze(1) == 0
    ops.reactions()
    reac = {}
    for lid, d in por_linha.items():
        if d["rigido"]:
            reac[lid] = sum(ops.nodeReaction(t, 3) for t in d["nos"] if t in apoios and 3 in apoios[t])
    for t, kk, lid in molas:
        reac[lid] = reac.get(lid, 0.0) - kk * ops.nodeDisp(t, 3)
    sondas = []
    for p in cs["sondas"]:
        t = min(coords, key=lambda t: (coords[t][0] - p[0]) ** 2 + (coords[t][1] - p[1]) ** 2)
        sondas.append({"p": [coords[t][0], coords[t][1]], "uz": ops.nodeDisp(t, 3)})
    umax = max(-ops.nodeDisp(t, 3) for t in coords)
    return {"nome": cs["nome"], "carga": sum(forca.values()), "reacoes": reac, "sondas": sondas, "elementos": e - 1, "umax": umax}


caminho = os.path.join(aqui, "escada.json")
antigos = {c["nome"]: c for c in json.load(open(caminho))["casos"]} if os.path.exists(caminho) else {}
for c in casos:
    if os.environ.get("OS_CASO", "") in c["nome"]:
        antigos[c["nome"]] = resolver(c)
saida = {"fonte": "OpenSeesPy " + str(ops.version()) + " (ShellMITC4, ElasticMembranePlateSection, malha " + str(F) + "× o Statikos)", "casos": [antigos[c["nome"]] for c in casos if c["nome"] in antigos]}
with open(caminho, "w") as f:
    json.dump(saida, f, indent=1)
print("ok", json.dumps([{"nome": c["nome"], "carga": c["carga"], "reacoes": c["reacoes"], "elementos": c["elementos"]} for c in saida["casos"]], indent=1))
