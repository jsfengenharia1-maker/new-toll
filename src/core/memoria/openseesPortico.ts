// Exportação do pórtico plano 2D para o OpenSees (openseespy), para verificação independente (MD fase 8). Segue o padrão de
// validation/opensees/*.py: um caso por vez, o modelo é refeito a cada caso e o script grava deslocamentos e reações num JSON.
// Elementos: elasticBeamColumn (ou ElasticTimoshenkoBeam com a deformação por cortante), com A e I efetivos (EA/E e EI/E do solver, que
// já trazem os fatores de rigidez, vínculos rígidos e a opção de deformação axial); rótulas e molas de ligação por nó duplicado
// (equalDOF nas translações e zeroLength elástico na rotação); apoios por fix e molas por zeroLength; cargas nodais, distribuídas
// uniformes (-beamUniform) e demais cargas de barra (trapezoidais, momentos de extremidade, temperatura) como forças equivalentes de
// engastamento perfeito nos nós da barra; recalques por sp. O que não tem equivalente (apoio inclinado) sai como aviso.
import { elementMatrices } from '../element';
import { matVec, transpose } from '../math';
import { caseVectors, memberLoads, type Analysis } from '../solver';
import type { Model } from '../types';

export interface ScriptOpenSeesPortico { script: string; avisos: string[]; completo: boolean; casos: string[] }

const n = (x: number) => (Number.isFinite(x) ? String(x) : '0');

export function scriptOpenSeesPortico(model: Model, a: Analysis, o: { casos?: string[]; saida?: string } = {}): ScriptOpenSeesPortico {
  const prep = a.prep, avisos: string[] = [];
  const nodes = model.nodes, idx = (id: number) => prep.nodeIndex.get(id)!;
  const sup = (v: string) => (v === 'fixed' ? 1 : 0);
  const apoios: string[] = [], molas: string[] = [], rotFixa: string[] = [];
  nodes.forEach((nd, k) => {
    const s = nd.support;
    if (!s) return;
    if (s.angle && Math.abs(s.angle) > 1e-12) avisos.push(`Nó ${nd.id}: apoio inclinado (${s.angle}°) exportado nos eixos globais; os resultados deste nó não são comparáveis.`);
    apoios.push(`(${k}, ${sup(s.ux)}, ${sup(s.uy)}, ${sup(s.rz)})`);
    if (s.ux === 'spring') molas.push(`(${k}, 0, ${n(s.kx ?? 0)})`);
    if (s.uy === 'spring') molas.push(`(${k}, 1, ${n(s.ky ?? 0)})`);
    if (s.rz === 'spring') molas.push(`(${k}, 2, ${n(s.kr ?? 0)})`);
  });
  // nó sem rigidez de rotação (todas as barras rotuladas): o solver o fixa em rz
  const comRot = new Set<number>();
  prep.members.forEach((pm) => { const m = model.members.find((x) => x.id === pm.id)!; if (!m.hingeI || m.springI) comRot.add(pm.i); if (!m.hingeJ || m.springJ) comRot.add(pm.j); });
  const ligados = new Set<number>();
  prep.members.forEach((pm) => { ligados.add(pm.i); ligados.add(pm.j); });
  nodes.forEach((nd, k) => { if (ligados.has(k) && !comRot.has(k) && nd.support?.rz !== 'fixed' && nd.support?.rz !== 'spring') rotFixa.push(String(k)); });
  const barras = prep.members.map((pm) => {
    const m = model.members.find((x) => x.id === pm.id)!, mat = model.materials.find((x) => x.id === m.material)!;
    const E = mat.E, GAs = pm.props.GAs;
    return `(${pm.i}, ${pm.j}, ${n(E)}, ${n(pm.props.EA / E)}, ${n(pm.props.EI / E)}, ${Number.isFinite(GAs) ? n(GAs) : 0}, ${m.hingeI ? 1 : 0}, ${m.hingeI ? 0 : n(m.springI ?? 0)}, ${m.hingeJ ? 1 : 0}, ${m.hingeJ ? 0 : n(m.springJ ?? 0)})`;
  });
  const casosEscolhidos = model.cases.filter((c) => !o.casos || o.casos.includes(c.name));
  const cargaCaso = (caseId: number) => {
    const { nodal, presc } = caseVectors(prep, caseId);
    const nod: string[] = [], uni: string[] = [], eq: string[] = [], pr: string[] = [];
    for (let k = 0; k < nodes.length; k++) if (nodal[k * 3] || nodal[k * 3 + 1] || nodal[k * 3 + 2]) nod.push(`(${k}, ${n(nodal[k * 3])}, ${n(nodal[k * 3 + 1])}, ${n(nodal[k * 3 + 2])})`);
    if (presc) for (let d = 0; d < presc.length; d++) if (prep.constrained[d] && presc[d]) pr.push(`(${Math.floor(d / 3)}, ${d % 3}, ${n(presc[d])})`);
    const lds = memberLoads(prep, caseId);
    prep.members.forEach((pm, b) => {
      const l = lds[b];
      const cte = (p: number[]) => p.slice(1).every((c) => c === 0);
      if (cte(l.qx) && cte(l.qy) && l.mi === 0 && l.mj === 0 && l.eps0 === 0 && l.kap0 === 0) {
        const wx = l.qx[0] ?? 0, wy = l.qy[0] ?? 0;
        if (wx || wy) uni.push(`(${b}, ${n(wy)}, ${n(wx)})`);
        return;
      }
      const f = elementMatrices({ ...pm.props, kI: undefined, kJ: undefined }, l, false, false).f;
      const fg = matVec(transpose(pm.T), f).map((v) => -v);
      eq.push(`(${b}, 0, ${n(fg[0])}, ${n(fg[1])}, ${n(fg[2])})`, `(${b}, 1, ${n(fg[3])}, ${n(fg[4])}, ${n(fg[5])})`);
    });
    return `{"nodais": [${nod.join(', ')}], "uniformes": [${uni.join(', ')}], "equivalentes": [${eq.join(', ')}], "prescritos": [${pr.join(', ')}]}`;
  };
  const saida = o.saida ?? 'resultados_opensees.json';
  void idx;
  const L: string[] = [];
  L.push('"""Pórtico plano 2D exportado pelo Statikos (memória de cálculo detalhada, frente MD) para verificação independente no OpenSees.');
  L.push('Unidades: kN, m, rad. Eixos globais X (horizontal) e Y (vertical); eixo local x de i para j. A e I das barras são efetivos');
  L.push('(EA/E e EI/E do solver, já com fatores de rigidez e vínculos rígidos). Uso: python3 -m pip install openseespy && python3 este_arquivo.py');
  L.push(`Grava ${saida} com os deslocamentos de todos os nós e as reações dos apoios, por caso.`);
  if (avisos.length) { L.push('', 'AVISOS (o que não foi exportado):'); for (const x of [...new Set(avisos)]) L.push(`- ${x}`); }
  L.push('"""', 'import json, os', 'import openseespy.opensees as ops', '');
  L.push(`IDS = [${nodes.map((x) => x.id).join(', ')}]`);
  L.push(`NOS = [${nodes.map((x) => `(${n(x.x)}, ${n(x.y)})`).join(',\n       ')}]`);
  L.push(`APOIOS = [${apoios.join(', ')}]  # (nó, ux, uy, rz) com 1 = preso`);
  L.push(`MOLAS = [${molas.join(', ')}]  # (nó, gdl, k): mola de apoio`);
  L.push(`ROT_FIXA = [${rotFixa.join(', ')}]  # nós sem rigidez de rotação (todas as barras rotuladas): rz preso`);
  L.push('# barra: (i, j, E, A_ef, I_ef, GAs, rotula_i, mola_i, rotula_j, mola_j); GAs = 0: sem deformação por cortante');
  L.push(`BARRAS = [${barras.join(',\n          ')}]`);
  L.push('# por caso: nodais (nó, Fx, Fy, Mz); uniformes (barra, wy, wx locais); equivalentes (barra, ponta 0=i 1=j, Fx, Fy, Mz globais); prescritos (nó, gdl, valor)');
  L.push(`CASOS = {${casosEscolhidos.map((c) => `${JSON.stringify(c.name)}: ${cargaCaso(c.id)}`).join(',\n         ')}}`);
  L.push('', `def montar():
    ops.wipe(); ops.model("basic", "-ndm", 2, "-ndf", 3)
    for k, (x, y) in enumerate(NOS): ops.node(k, x, y)
    for k, ux, uy, rz in APOIOS: ops.fix(k, ux, uy, rz)
    for k in ROT_FIXA: ops.fix(k, 0, 0, 1)
    prox = len(NOS)
    mat = 0
    for k, dof, kk in MOLAS:
        t = prox; prox += 1; mat += 1
        ops.node(t, *NOS[k]); ops.fix(t, 1, 1, 1)
        ops.uniaxialMaterial("Elastic", mat, kk)
        ops.element("zeroLength", 200000 + t, t, k, "-mat", mat, "-dir", dof + 1)
    fim = {}
    for b, (i, j, E, A, I, GAs, hi, ki, hj, kj) in enumerate(BARRAS):
        ni, nj = i, j
        if hi or ki:
            ni = prox; prox += 1
            ops.node(ni, *NOS[i]); ops.equalDOF(i, ni, 1, 2)
            if ki:
                mat += 1; ops.uniaxialMaterial("Elastic", mat, ki)
                ops.element("zeroLength", 200000 + ni, i, ni, "-mat", mat, "-dir", 3)
        if hj or kj:
            nj = prox; prox += 1
            ops.node(nj, *NOS[j]); ops.equalDOF(j, nj, 1, 2)
            if kj:
                mat += 1; ops.uniaxialMaterial("Elastic", mat, kj)
                ops.element("zeroLength", 200000 + nj, j, nj, "-mat", mat, "-dir", 3)
        ops.geomTransf("Linear", b + 1)
        if GAs:
            ops.element("ElasticTimoshenkoBeam", b + 1, ni, nj, E, GAs, A, I, 1.0, b + 1)
        else:
            ops.element("elasticBeamColumn", b + 1, ni, nj, A, E, I, b + 1)
        fim[(b, 0)] = ni; fim[(b, 1)] = nj
    return fim

def resolver(nome):
    fim = montar()
    c = CASOS[nome]
    ops.timeSeries("Linear", 1); ops.pattern("Plain", 1, 1)
    for k, fx, fy, mz in c["nodais"]: ops.load(k, fx, fy, mz)
    for b, wy, wx in c["uniformes"]: ops.eleLoad("-ele", b + 1, "-type", "-beamUniform", wy, wx)
    for b, p, fx, fy, mz in c["equivalentes"]: ops.load(fim[(b, p)], fx, fy, mz)
    for k, dof, v in c["prescritos"]: ops.sp(k, dof + 1, v)
    ops.constraints("Transformation"); ops.numberer("RCM"); ops.system("UmfPack"); ops.test("NormDispIncr", 1e-12, 10)
    ops.algorithm("Linear"); ops.integrator("LoadControl", 1.0); ops.analysis("Static")
    assert ops.analyze(1) == 0, "falha na análise do caso " + nome
    ops.reactions()
    desloc = {str(IDS[k]): [ops.nodeDisp(k, g + 1) for g in range(3)] for k in range(len(NOS))}
    reac = {str(IDS[k]): ops.nodeReaction(k) for k, ux, uy, rz in APOIOS}
    return {"desloc": desloc, "reacoes": reac}

if __name__ == "__main__":
    res = {nome: resolver(nome) for nome in CASOS}
    destino = os.path.join(os.path.dirname(os.path.abspath(__file__)), ${JSON.stringify(saida)})
    json.dump({"fonte": "OpenSeesPy " + str(ops.version()), "casos": res}, open(destino, "w"))
    for nome, r in res.items():
        umax = max(abs(d[1]) for d in r["desloc"].values())
        print(f"{nome}: maior |uy| = {umax*1000:.4f} mm")
`);
  const unicos = [...new Set(avisos)];
  return { script: L.join('\n'), avisos: unicos, completo: unicos.length === 0, casos: casosEscolhidos.map((c) => c.name) };
}
