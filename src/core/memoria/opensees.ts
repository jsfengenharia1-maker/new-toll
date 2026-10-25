// Exportação do pórtico espacial do edifício para o OpenSees (openseespy), para verificação independente (MD fase 1).
// Segue o padrão de validation/opensees/*.py: elasticBeamColumn (ElasticTimoshenkoBeam com áreas de cisalhamento),
// trechos rígidos por -jntOffset, liberações de My/Mz por -releasey/-releasez, diafragma por rigidDiaphragm, molas por
// zeroLength com material elástico num nó fixo próprio, cargas nodais, distribuídas (-beamUniform) e concentradas na
// barra (-beamPoint), um caso por vez (o modelo é refeito a cada caso). O script grava os deslocamentos e as reações
// num JSON ao lado do script. O que não tem equivalente direto entra como aviso (no script e no resultado).
import { baseBarra, type Caso3, type Modelo3 } from '../fe3d';
import { analisarEdificio, type AnaliseEdificio } from '../building/analitico';
import type { BuildingModel } from '../building/types';
import { casosHorizontais } from '../building/desaprumo';
import { casosResolvidos } from './dadosAnalise';

/** Modelo a exportar: barras e casos. */
export interface ModeloExportavel {
  modelo: Modelo3; casos: { nome: string; caso?: Caso3; /** Fator na área das barras de `axial` neste caso (vento: 1/EA dos pilares das opções; gravidade: 1). */ escA?: number }[]; avisos: string[]; cheio: boolean;
  /** Barras (do modelo exportado) com a área multiplicada pelo EA dos pilares das opções nas cargas verticais (premissa 25); o vento usa a área real. */
  axial?: number[];
}

/** Modelo do caso: o exportado, com a área das barras `axial` escalada pelo `escA` do caso (o que o script faz no OpenSees). */
export function modeloDoCaso(me: ModeloExportavel, nome: string): Modelo3 {
  const c = me.casos.find((x) => x.nome === nome), f = c?.escA ?? 1;
  if (f === 1 || !me.axial?.length) return me.modelo;
  const ax = new Set(me.axial);
  return { ...me.modelo, barras: me.modelo.barras.map((b, k) => (ax.has(k) ? { ...b, A: b.A * f } : b)) };
}

/** Barras de pilar do pórtico (índices no modelo exportado) e o fator do vento: na análise, as cargas verticais usam A × axialPilares e o vento a área real. */
function barrasAxiais(an: AnaliseEdificio, cheio: boolean): { axial: number[]; fVento: number } {
  const pm = an.portico, fVento = 1 / (an.opcoes.axialPilares || 1), axial: number[] = [];
  if (fVento === 1) return { axial, fVento };
  let k = 0;
  pm.modelo.barras.forEach((b, i) => {
    const idx = cheio ? (b.soPlano ? -1 : k++) : i;
    if (pm.barras[i]?.tipo === 'pilar' && idx >= 0) axial.push(idx);
  });
  return { axial, fVento };
}

/**
 * Modelo de barras do pórtico para o OpenSees. Com o modelo integrado (grelhas das lajes condensadas em superelementos),
 * usa o modelo "cheio" equivalente (a mesma discretização sem condensação, só com os casos da obra), refazendo a análise
 * com `cheio`; nos nós dos pilares os resultados coincidem com os do pórtico condensado (integrado.test.ts).
 */
export function modeloExportavel(b: BuildingModel, an: AnaliseEdificio): ModeloExportavel {
  const pm = an.portico;
  if (pm.modelo.superelementos?.length) {
    const ch = an.cheio ?? analisarEdificio(b, an.opcoes, { cheio: true }).cheio;
    if (ch) {
      // vento (MD9): cargas nodais nos nós mestres dos diafragmas (índices do pórtico, preservados no modelo cheio); o diafragma rígido e as
      // vigas/lajes vão como barras; a área dos pilares é a real (o modelo cheio vem do modelo das cargas verticais, com EA × axialPilares).
      const { axial, fVento } = barrasAxiais(an, true);
      const vento = casosHorizontais(an).map((c, ic) => ({ nome: c.nome, caso: pm.casosVento?.[ic], escA: fVento })).filter((c) => !!c.caso);
      return { modelo: ch.modelo, casos: [...an.casos.map((nome, ic) => ({ nome, caso: ch.casos[ic] })), ...vento], avisos: ['Modelo integrado: exportado o modelo cheio equivalente (lajes como barras), com os casos da obra, os de vento e os de desaprumo (forças nos diafragmas, área real dos pilares).'], cheio: true, axial };
    }
  }
  const { axial, fVento } = barrasAxiais(an, false);
  return { modelo: pm.modelo, casos: casosResolvidos(an).filter((c) => c.origem !== 'pDelta').map((c) => ({ nome: c.nome, caso: c.caso, ...(c.origem === 'vento' ? { escA: fVento } : {}) })), avisos: [], cheio: false, axial };
}

export interface ScriptOpenSees { script: string; avisos: string[]; completo: boolean; casos: string[] }

const n = (x: number) => (Number.isFinite(x) ? String(x) : '0');
const lista = (xs: number[]) => `[${xs.map(n).join(', ')}]`;

/** Gera o script Python. `casos`: nomes dos casos a resolver (padrão: os casos da obra e os de vento). */
export function scriptOpenSees(me: ModeloExportavel, o: { casos?: string[]; saida?: string } = {}): ScriptOpenSees {
  const m = me.modelo, avisos: string[] = [...me.avisos];
  if (m.superelementos?.length) avisos.push(`${m.superelementos.length} superelemento(s) (grelha condensada do modelo integrado) não exportados: os resultados não são comparáveis.`);
  if (m.cascas?.length) avisos.push(`${m.cascas.length} casca(s) (pilares-parede/paredes) não exportadas: os resultados não são comparáveis.`);
  if (m.condensados?.size) avisos.push('Há gdl condensados (superelementos) no modelo.');
  const barras = m.barras.map((b, k) => {
    const { L, R } = baseBarra(m, b);
    const lib = (l?: number[]) => ({ y: !!l?.includes(4), z: !!l?.includes(5), t: !!l?.includes(3) });
    const li = lib(b.libI), lj = lib(b.libJ);
    if (li.t || lj.t) avisos.push(`Barra ${k}: liberação de torção não exportada (o OpenSees não a tem no elasticBeamColumn).`);
    if (b.engI?.length || b.engJ?.length) avisos.push(`Barra ${k}: engaste parcial não exportado.`);
    if (b.soPlano) avisos.push(`Barra ${k}: barra só no plano (parte fora do plano num superelemento) exportada completa.`);
    if ((b.Ay || b.Az) && (li.y || li.z || lj.y || lj.z)) avisos.push(`Barra ${k}: Timoshenko com liberação: exportada como elasticBeamColumn (sem cisalhamento).`);
    const rel = (a: boolean, z: boolean) => (a && z ? 3 : a ? 1 : z ? 2 : 0);
    return { i: b.i, j: b.j, E: b.E, G: b.G, A: b.A, Iy: b.Iy, Iz: b.Iz, J: b.J, Ay: b.Ay ?? 0, Az: b.Az ?? 0, ez: R[2], ex: R[0], ey: R[1], L, oi: b.offI ?? [0, 0, 0], oj: b.offJ ?? [0, 0, 0], ry: rel(li.y, lj.y), rz: rel(li.z, lj.z) };
  });
  const escolhidos = o.casos ? me.casos.filter((c) => o.casos!.includes(c.nome)) : me.casos;
  const cargaCaso = (c: Caso3 | undefined) => {
    const nod = (c?.nodais ?? []).map((x) => `(${x.no}, ${lista(x.f)})`);
    const dist = (c?.distribuidas ?? []).map((x) => { const b = barras[x.barra], loc = [0, 1, 2].map((r) => [b.ex, b.ey, b.ez][r][0] * x.q[0] + [b.ex, b.ey, b.ez][r][1] * x.q[1] + [b.ex, b.ey, b.ez][r][2] * x.q[2]); return `(${x.barra}, ${n(loc[1])}, ${n(loc[2])}, ${n(loc[0])})`; });
    const pont = (c?.pontuais ?? []).map((x) => {
      const b = barras[x.barra], R = [b.ex, b.ey, b.ez], F = [0, 1, 2].map((r) => R[r][0] * x.f[0] + R[r][1] * x.f[1] + R[r][2] * x.f[2]);
      if (Math.hypot(x.f[3] ?? 0, x.f[4] ?? 0, x.f[5] ?? 0) > 1e-12) avisos.push(`Momento concentrado na barra ${x.barra} não exportado (o -beamPoint só tem forças).`);
      return `(${x.barra}, ${n(F[1])}, ${n(F[2])}, ${n(x.a / b.L)}, ${n(F[0])})`;
    });
    if (c?.superelementos?.length || c?.pressoes?.length) avisos.push('Cargas de superelementos ou pressões em cascas não exportadas.');
    return `{"nodais": [${nod.join(', ')}], "uniformes": [${dist.join(', ')}], "pontuais": [${pont.join(', ')}]`;
  };
  const saida = o.saida ?? 'resultados_opensees.json';
  const L: string[] = [];
  L.push('"""Pórtico espacial do edifício exportado pelo Statikos (memória de cálculo detalhada, frente MD) para verificação');
  L.push('independente no OpenSees. Unidades: kN, m, rad. Eixos globais com Z vertical; eixos locais das barras como no Statikos');
  L.push('(x de i para j na parte flexível; z = x × ref). Uso: python3 -m pip install openseespy && python3 este_arquivo.py');
  L.push(`Grava ${saida} com os deslocamentos de todos os nós e as reações dos apoios, por caso.`);
  if (avisos.length) { L.push('', 'AVISOS (o que não foi exportado):'); for (const a of [...new Set(avisos)]) L.push(`- ${a}`); }
  L.push('"""', 'import json, os', 'import openseespy.opensees as ops', '');
  L.push(`NOS = [${m.nos.map((p) => lista(p)).join(',\n       ')}]`);
  L.push(`APOIOS = [${[...m.apoios].map(([no, gs]) => `(${no}, ${lista([0, 1, 2, 3, 4, 5].map((g) => (gs.includes(g) ? 1 : 0)))})`).join(', ')}]`);
  L.push(`MOLAS = [${(m.molas ?? []).map((x) => `(${x.no}, ${x.gdl}, ${n(x.k)})`).join(', ')}]`);
  L.push(`DIAFRAGMA = [${(m.escravos ?? []).map((x) => `(${x.no}, ${x.mestre})`).join(', ')}]`);
  L.push('# barra: (i, j, E, G, A, Iy, Iz, J, Ay, Az, vecxz, offI, offJ, releasey, releasez)');
  L.push(`BARRAS = [${barras.map((b) => `(${b.i}, ${b.j}, ${n(b.E)}, ${n(b.G)}, ${n(b.A)}, ${n(b.Iy)}, ${n(b.Iz)}, ${n(b.J)}, ${n(b.Ay)}, ${n(b.Az)}, ${lista(b.ez)}, ${lista(b.oi)}, ${lista(b.oj)}, ${b.ry}, ${b.rz})`).join(',\n          ')}]`);
  L.push('# por caso: nodais (nó, [Fx, Fy, Fz, Mx, My, Mz]); uniformes (barra, wy, wz, wx locais); pontuais (barra, Py, Pz, x/L, Px locais)');
  L.push('# AXIAL: barras de pilar cuja área nas cargas verticais é multiplicada pelo EA dos pilares das opções; "escA" é o fator da área no caso (vento: 1/EA)');
  L.push(`AXIAL = ${lista(me.axial ?? [])}`);
  L.push(`CASOS = {${escolhidos.map((c) => `${JSON.stringify(c.nome)}: ${cargaCaso(c.caso)}, "escA": ${n(c.escA ?? 1)}}`).join(',\n         ')}}`);
  L.push('', `def montar(escA=1.0):
    ops.wipe(); ops.model("basic", "-ndm", 3, "-ndf", 6)
    for i, p in enumerate(NOS): ops.node(i, *p)
    for no, f in APOIOS: ops.fix(no, *f)
    por_mestre = {}
    for no, mestre in DIAFRAGMA: por_mestre.setdefault(mestre, []).append(no)
    for mestre, esc in por_mestre.items(): ops.rigidDiaphragm(3, mestre, *esc)
    base = len(NOS)
    for k, (no, gdl, kk) in enumerate(MOLAS):
        t = base + k; ops.node(t, *NOS[no]); ops.fix(t, 1, 1, 1, 1, 1, 1)
        ops.uniaxialMaterial("Elastic", k + 1, kk)
        ops.element("zeroLength", 100000 + k, t, no, "-mat", k + 1, "-dir", gdl + 1)
    ax = set(AXIAL)
    for k, (i, j, E, G, A, Iy, Iz, J, Ay, Az, vz, oi, oj, ry, rz) in enumerate(BARRAS):
        if k in ax: A = A * escA
        ops.geomTransf("Linear", k + 1, *vz, "-jntOffset", *oi, *oj)
        if (Ay or Az) and not ry and not rz:
            ops.element("ElasticTimoshenkoBeam", k + 1, i, j, E, G, A, J, Iy, Iz, Ay if Ay else 1e12, Az if Az else 1e12, k + 1)
        else:
            extra = (["-releasey", ry] if ry else []) + (["-releasez", rz] if rz else [])
            ops.element("elasticBeamColumn", k + 1, i, j, A, E, G, J, Iy, Iz, k + 1, *extra)

def resolver(nome):
    c = CASOS[nome]
    montar(c["escA"])
    ops.timeSeries("Linear", 1); ops.pattern("Plain", 1, 1)
    for no, f in c["nodais"]: ops.load(no, *f)
    for b, wy, wz, wx in c["uniformes"]: ops.eleLoad("-ele", b + 1, "-type", "-beamUniform", wy, wz, wx)
    for b, py, pz, xl, px in c["pontuais"]: ops.eleLoad("-ele", b + 1, "-type", "-beamPoint", py, pz, xl, px)
    ops.constraints("Transformation"); ops.numberer("RCM"); ops.system("UmfPack"); ops.test("NormDispIncr", 1e-12, 10)
    ops.algorithm("Linear"); ops.integrator("LoadControl", 1.0); ops.analysis("Static")
    assert ops.analyze(1) == 0, "falha na análise do caso " + nome
    ops.reactions()
    desloc = [[ops.nodeDisp(i, g + 1) for g in range(6)] for i in range(len(NOS))]
    reac = {str(no): ops.nodeReaction(no) for no, f in APOIOS}
    return {"desloc": desloc, "reacoes": reac}

if __name__ == "__main__":
    res = {nome: resolver(nome) for nome in CASOS}
    destino = os.path.join(os.path.dirname(os.path.abspath(__file__)), ${JSON.stringify(saida)})
    json.dump({"fonte": "OpenSeesPy " + str(ops.version()), "casos": res}, open(destino, "w"))
    for nome, r in res.items():
        umax = max(abs(d[2]) for d in r["desloc"])
        print(f"{nome}: maior |uz| = {umax*1000:.4f} mm")
`);
  const unicos = [...new Set(avisos)];
  return { script: L.join('\n'), avisos: unicos, completo: !m.superelementos?.length && !m.cascas?.length && !unicos.some((a) => /não exportad/.test(a) && !a.startsWith('Modelo integrado')), casos: escolhidos.map((c) => c.nome) };
}
