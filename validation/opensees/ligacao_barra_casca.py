"""Ligação rígida barra–casca no plano (25/10/2026): viga 20 × 50 no plano de paredes de concreto (t = 0,20 m, H = 3 m,
base engastada), no OpenSees com ShellMITC4 (malha de 0,125 m) e elasticBeamColumn ligada ao nó do canto da parede por
rigidLink 'beam' aos nós da aresta vertical dentro da altura da viga (h = 0,50 m abaixo do topo). Gera
ligacao_barra_casca.json para src/core/ligacaoCasca.validacao.test.ts. Fora do npm test.
Casos: (biengastada) viga de 6 m entre duas paredes de 2 m, q = 20 kN/m; (balanco) viga de 3 m em balanço numa parede
de 2 m, q = 10 kN/m. Modos: 'rigido' (rigidLink na aresta) e 'direto' (viga só no nó do canto: giro de perfuração da
ShellMITC4, para referência).
Uso: python3 -m pip install openseespy && python3 validation/opensees/ligacao_barra_casca.py
"""
import json, os
import openseespy.opensees as ops

E, nu, t, H = 3.0e7, 0.2, 0.20, 3.0
b, hv = 0.20, 0.50
A, Iz, Iy = b * hv, b * hv ** 3 / 12, hv * b ** 3 / 12
G, J = E / 2.4, 1e-3
hm = float(os.environ.get("H_MALHA", 0.125))
NV = 24  # elementos da viga


def montar(caso, modo):
    ops.wipe(); ops.model("basic", "-ndm", 3, "-ndf", 6)
    ops.section("ElasticMembranePlateSection", 1, E, nu, t, 0.0)
    nos = {}

    def no(x, z):
        k = (round(x / 1e-4), round(z / 1e-4))
        if k not in nos:
            nos[k] = len(nos) + 1
            ops.node(nos[k], x, 0.0, z)
        return nos[k]

    L = 6.0 if caso == "biengastada" else 3.0
    paredes = [(-2.0, 0.0)] + ([(L, L + 2.0)] if caso == "biengastada" else [])
    e = 1
    for (x0, x1) in paredes:
        nx, nz = round((x1 - x0) / hm), round(H / hm)
        for i in range(nx):
            for j in range(nz):
                xa, xb, za, zb = x0 + i * hm, x0 + (i + 1) * hm, j * hm, (j + 1) * hm
                ops.element("ShellMITC4", e, no(xa, za), no(xb, za), no(xb, zb), no(xa, zb), 1); e += 1
    for (x, z), tag in list(nos.items()):
        if z == 0:
            ops.fix(tag, 1, 1, 1, 1, 1, 1)
    # viga: nós próprios entre as faces; as pontas são os nós do canto das paredes
    ops.geomTransf("Linear", 1, 0.0, 1.0, 0.0)  # eixo local y = −Z: flexão vertical com Iz
    xs = [L * k / NV for k in range(NV + 1)]
    tags = []
    for k, x in enumerate(xs):
        if (k == 0) or (k == NV and caso == "biengastada"):
            tags.append(no(x, H))
        else:
            tg = 100000 + k
            ops.node(tg, x, 0.0, H)
            tags.append(tg)
    for k in range(NV):
        ops.element("elasticBeamColumn", 50000 + k, tags[k], tags[k + 1], A, E, G, J, Iy, Iz, 1)
    if modo == "rigido":
        cantos = [0.0] + ([L] if caso == "biengastada" else [])
        for xc in cantos:
            m = nos[(round(xc / 1e-4), round(H / 1e-4))]
            for (x, z), tag in nos.items():
                if x == round(xc / 1e-4) and H - hv - 1e-9 <= z * 1e-4 < H - 1e-9:
                    ops.rigidLink("beam", m, tag)
    q = 20.0 if caso == "biengastada" else 10.0
    ops.timeSeries("Linear", 1); ops.pattern("Plain", 1, 1)
    for k in range(NV):
        ops.eleLoad("-ele", 50000 + k, "-type", "-beamUniform", q, 0.0)  # Wy (local y = −Z) = +q: para baixo
    ops.constraints("Transformation"); ops.numberer("RCM"); ops.system("BandGeneral")
    ops.test("NormDispIncr", 1e-12, 10); ops.algorithm("Linear"); ops.integrator("LoadControl", 1.0); ops.analysis("Static")
    assert ops.analyze(1) == 0
    fi = ops.eleResponse(50000, "localForce"); fj = ops.eleResponse(50000 + NV - 1, "localForce")
    meio = tags[NV // 2] if caso == "biengastada" else tags[NV]
    return {"Mi": abs(fi[5]), "Mj": abs(fj[11]), "uz": -ops.nodeDisp(meio, 3), "uzCanto": -ops.nodeDisp(tags[0], 3), "giroCanto": ops.nodeDisp(tags[0], 5)}


res = {}
for caso in ("biengastada", "balanco"):
    for modo in ("rigido", "direto"):
        res[f"{caso}_{modo}"] = montar(caso, modo)

saida = {"fonte": "OpenSeesPy " + str(ops.version()) + " (ShellMITC4, ElasticMembranePlateSection; elasticBeamColumn + rigidLink beam)",
         "E": E, "nu": nu, "t": t, "H": H, "b": b, "h": hv, "malha": hm, "resultados": res}
if "H_MALHA" not in os.environ:
    with open(os.path.join(os.path.dirname(__file__), "ligacao_barra_casca.json"), "w") as f:
        json.dump(saida, f, indent=1)
print("ok", json.dumps(res, indent=1))
