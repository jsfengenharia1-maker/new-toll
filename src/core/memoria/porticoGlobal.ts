// Memória detalhada do pórtico 2D (MD8): passos globais (cargas por caso, modelo, combinações NBR 8681, desaprumo, γz, P-Δ,
// equilíbrio, deslocamentos e cargas na fundação). Chamada por `runDesign` ao fim, só com a memória ligada.
import type { DesignReport, FoundationRow, GammaZRow, NamedCombo } from '../design';
import { sectionProps } from '../section';
import type { Load, Model } from '../types';
import { fm, fp, type Registrador, type ValorMemoria } from './registrador';
import type { CtxPortico } from './porticoBase';

export const GLOBAL = 'Pórtico';

/** Contribuição de cada nó ao γz de uma combinação (guardada só com a memória ligada). */
export interface GzNo { no: number; y: number; H: number; V: number; u: number }
export interface GzDetalhe { combo: string; ybase: number; nos: GzNo[]; desap: number; thetaA: number }
export const detalheGamaZ = new WeakMap<object, GzDetalhe[]>();

type Ch = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;

const psiDe = (c: Model['cases'][number], k: 0 | 1 | 2) => c[`psi${k}`] ?? (c.nature === 'W' ? [0.6, 0.3, 0][k] : [0.5, 0.4, 0.3][k]);
const sistema = (s: string) => (s === 'local' ? 'local' : s === 'global' ? 'global' : 'global projetado');

function descreverCarga(l: Load): { texto: string; ent: Record<string, ValorMemoria> } {
  switch (l.kind) {
    case 'nodal': return { texto: `Carga nodal no nó ${l.node}: Fx = ${fm(l.fx)} kN; Fy = ${fm(l.fy)} kN; Mz = ${fm(l.mz)} kN·m`, ent: { no: l.node, fx: l.fx, fy: l.fy, mz: l.mz } };
    case 'dist': return { texto: `Carga distribuída na barra ${l.member} (${sistema(l.system)}): qx ${fm(l.qxi)}→${fm(l.qxj)}; qy ${fm(l.qyi)}→${fm(l.qyj)} kN/m`, ent: { barra: l.member, qxi: l.qxi, qyi: l.qyi, qxj: l.qxj, qyj: l.qyj, sistema: l.system } };
    case 'endMoment': return { texto: `Momentos de extremidade na barra ${l.member}: mi = ${fm(l.mi)}; mj = ${fm(l.mj)} kN·m`, ent: { barra: l.member, mi: l.mi, mj: l.mj } };
    case 'thermal': return { texto: `Variação de temperatura na barra ${l.member}: topo ${fm(l.tTop)} °C; fundo ${fm(l.tBot)} °C`, ent: { barra: l.member, tTop: l.tTop, tBot: l.tBot } };
    case 'presc': return { texto: `Deslocamento prescrito no nó ${l.node}: dx = ${fm(l.dx ?? 0)}; dy = ${fm(l.dy ?? 0)} m; rz = ${fm(l.rz ?? 0)} rad`, ent: { no: l.node, dx: l.dx ?? 0, dy: l.dy ?? 0, rz: l.rz ?? 0 } };
    case 'selfWeight': return { texto: `Peso próprio das barras (γ·A), fator ${fm(l.factor)}`, ent: { fator: l.factor } };
  }
}

export interface DadosGlobal {
  eq: Map<number, Float64Array>;
  elu0: NamedCombo[]; elu: NamedCombo[]; qp: NamedCombo[]; rare: NamedCombo[]; freq: NamedCombo[]; autoElu: boolean;
  rep: Pick<DesignReport, 'settings' | 'imperfection' | 'gammaZ' | 'secondOrder' | 'foundation'>;
  modulus: 'Eci' | 'Ecs';
  gammaZObj: object;
  eluDesap: object;
}

export function registrarGlobalPortico(mem: Registrador, c: CtxPortico, d: DadosGlobal) {
  const { model, a } = c, el = GLOBAL;
  const P_ = (etapa: 'cargas' | 'combinacoes' | 'analise' | 'esforcos', topico: string, q: Ch) => mem.passo({ etapa, elemento: el, topico, ...q });

  // ---- modelo
  const nn = model.nodes.length;
  P_('analise', 'Modelo', { descricao: 'Pórtico plano: método da rigidez direta (3 gdl por nó), elementos de barra por flexibilidade com rótulas condensadas e molas de ligação', formula: 'K·u = F; gdl = 3·nós', expressao: `${nn} nós; ${model.members.length} barras; ${a.prep.ndof} gdl; deformação axial ${model.options.axialDeformation ? 'considerada' : 'desprezada (EA × 10⁴)'}; cortante ${model.options.shearDeformation ? 'considerado (Timoshenko)' : 'desprezado (Euler-Bernoulli)'}`, resultado: a.prep.ndof, unidade: 'gdl', entradas: { nos: nn, barras: model.members.length, gdl: a.prep.ndof, axial: model.options.axialDeformation ? 1 : 0, cortante: model.options.shearDeformation ? 1 : 0 } });
  for (const n of model.nodes) {
    const s = n.support;
    P_('analise', 'Nós e apoios', { descricao: `Nó ${n.id}: coordenadas${s ? ` e apoio (ux ${s.ux}, uy ${s.uy}, rz ${s.rz}${s.angle ? `, inclinado ${fm(s.angle)}°` : ''})` : ''}`, formula: '(x; y)', expressao: `x = ${fm(n.x)} m; y = ${fm(n.y)} m${s ? `; kx = ${fm(s.kx ?? 0)}; ky = ${fm(s.ky ?? 0)} kN/m; kr = ${fm(s.kr ?? 0)} kN·m/rad` : ''}`, resultado: n.y, unidade: 'm', entradas: { x: n.x, y: n.y, ...(s ? { ux: s.ux, uy: s.uy, rz: s.rz, kx: s.kx ?? 0, ky: s.ky ?? 0, kr: s.kr ?? 0, angulo: s.angle ?? 0 } : {}) } });
  }
  for (const m of model.members) {
    const i = model.nodes.find((x) => x.id === m.ni), j = model.nodes.find((x) => x.id === m.nj);
    const mat = model.materials.find((x) => x.id === m.material), sec = model.sections.find((x) => x.id === m.section);
    if (!i || !j || !mat || !sec) continue;
    const sp = sectionProps(sec.shape), L = Math.hypot(j.x - i.x, j.y - i.y);
    P_('analise', 'Barras', { descricao: `Barra ${m.id}: nós ${m.ni}→${m.nj}, material ${mat.name}, seção ${sec.name}${m.hingeI ? ', rótula em i' : ''}${m.hingeJ ? ', rótula em j' : ''}${m.rigid ? `, vínculo ${m.rigid === 'full' ? 'rígido' : 'inextensível'}` : ''}`, formula: 'L = √(Δx² + Δy²); EA; EI', expressao: `L = ${fm(L)} m; E = ${fm(mat.E)} kN/m²; A = ${fm(sp.A)} m²; I = ${fm(sp.I)} m⁴; EA = ${fm(mat.E * sp.A)} kN; EI = ${fm(mat.E * sp.I)} kN·m²`, resultado: L, unidade: 'm', entradas: { ni: m.ni, nj: m.nj, xi: i.x, yi: i.y, xj: j.x, yj: j.y, L, E: mat.E, nu: mat.nu, alpha: mat.alpha, gamma: mat.gamma, A: sp.A, I: sp.I, h: sp.h, yc: sp.yc, hingeI: m.hingeI ? 1 : 0, hingeJ: m.hingeJ ? 1 : 0, springI: m.springI ?? 0, springJ: m.springJ ?? 0, rigid: m.rigid ?? '' } });
  }

  // ---- cargas
  for (const cs of model.cases) {
    const F = d.eq.get(cs.id);
    let Fx = 0, Fy = 0;
    if (F) for (let k = 0; k * 3 < F.length; k++) { Fx += F[k * 3]; Fy += F[k * 3 + 1]; }
    P_('cargas', 'Casos de carga', { descricao: `Caso ${cs.id} "${cs.name}", natureza ${cs.nature ?? 'G'}${cs.nature && cs.nature !== 'G' ? `, ψ0 = ${fm(psiDe(cs, 0))}, ψ1 = ${fm(psiDe(cs, 1))}, ψ2 = ${fm(psiDe(cs, 2))}` : ''}${cs.group ? `, grupo excludente "${cs.group}"` : ''}: resultante das cargas equivalentes nos nós (cargas nodais + engastamento perfeito das barras + peso próprio)`, formula: 'ΣFx; ΣFy', expressao: `ΣFx = ${fm(Fx)} kN; ΣFy = ${fm(Fy)} kN`, resultado: Fy, unidade: 'kN', norma: 'NBR 6120:2019; NBR 8681:2003', entradas: { Fx, Fy, psi0: psiDe(cs, 0), psi1: psiDe(cs, 1), psi2: psiDe(cs, 2) } });
  }
  for (const l of model.loads) {
    const cs = model.cases.find((x) => x.id === l.caseId), ds = descreverCarga(l);
    P_('cargas', 'Cargas aplicadas', { descricao: `[${cs?.name ?? l.caseId}] ${ds.texto}`, formula: 'dado de entrada', expressao: ds.texto, resultado: l.kind, unidade: '', entradas: { caso: l.caseId, ...ds.ent } });
  }

  // ---- combinações NBR 8681
  if (d.autoElu) P_('combinacoes', 'Coeficientes', { descricao: 'Nenhuma combinação ELU no modelo: geradas pela natureza dos casos (NBR 8681:2003, 5.1.3): γg = 1,4 (permanente desfavorável), 1,0 (favorável), γq = 1,4, ψ0 por caso', formula: 'Fd = Σ γg·Gk + γq·(Q1k + Σ ψ0j·Qjk)', expressao: 'γg = 1,4; γg,fav = 1,0; γq = 1,4', resultado: 1.4, unidade: '', norma: 'NBR 8681:2003, 5.1.3', entradas: { gamaG: 1.4, gamaGfav: 1, gamaQ: 1.4 } });
  P_('combinacoes', 'Coeficientes', { descricao: 'Coeficientes de segurança dos materiais', formula: 'γc, γs, γa1', expressao: `γc = ${fm(d.rep.settings.gammaC)}; γs = ${fm(d.rep.settings.gammaS)}; γa1 = ${fm(d.rep.settings.gammaA1)}`, resultado: d.rep.settings.gammaC, unidade: '', norma: 'NBR 6118:2023, 12.4; NBR 8800:2008, 4.8', entradas: { gc: d.rep.settings.gammaC, gs: d.rep.settings.gammaS, ga1: d.rep.settings.gammaA1 } });
  const regCombo = (cb: NamedCombo, topico: string, formula: string, norma: string) => {
    const ent: Record<string, ValorMemoria> = { tipo: cb.kind };
    const partes: string[] = [];
    for (const [id, f] of Object.entries(cb.factors)) {
      ent[`f_c${id}`] = f;
      const cs = model.cases.find((x) => x.id === +id);
      if (f) partes.push(`${fm(f)}·${cs?.name ?? id}`);
    }
    if (cb.windAmp) ent.windAmp = cb.windAmp;
    if (cb.desap) ent.desap = cb.desap;
    P_('combinacoes', topico, { descricao: cb.name, formula, expressao: `Fd = ${partes.join(' + ') || '0'}${cb.windAmp ? ` (vento já multiplicado por 0,95·γz = ${fm(cb.windAmp)})` : ''}${cb.desap ? ` + desaprumo ${cb.desap > 0 ? '+x' : '−x'} (θa·V nos nós)` : ''}`, resultado: cb.name, unidade: '', norma, entradas: ent });
  };
  for (const cb of d.elu) regCombo(cb, 'ELU (usadas no dimensionamento)', 'Fd = Σ γg·Gk + γq·(Q1k + Σ ψ0j·Qjk)', 'NBR 8681:2003, 5.1.3; NBR 6118:2023, 11.8.2');
  for (const cb of d.qp) regCombo(cb, 'ELS quase permanente (flecha)', 'Fd,ser = Σ Gk + Σ ψ2j·Qjk', 'NBR 8681:2003, 5.1.5; NBR 6118:2023, 11.8.3.2');
  for (const cb of d.freq) regCombo(cb, 'ELS frequente (fissuração)', 'Fd,ser = Σ Gk + ψ1·Q1k + Σ ψ2j·Qjk', 'NBR 8681:2003, 5.1.5; NBR 6118:2023, 11.8.3.2');
  for (const cb of d.rare) regCombo(cb, 'Rara (fundação e flecha de aço)', 'Fd,ser = Σ Gk + Q1k + Σ ψ1j·Qjk', 'NBR 8681:2003, 5.1.5; NBR 6118:2023, 11.8.3.2');

  // ---- estabilidade global
  const imp = d.rep.imperfection;
  if (imp) {
    const t = 'Desaprumo global (θa)';
    P_('analise', t, { descricao: 'Altura da estrutura e número de prumadas de pilares', formula: 'H = ymáx − ymín; n = pilares que chegam aos apoios (ou informado)', expressao: `H = ${fm(imp.H)} m; n = ${imp.n} (automático: ${imp.nAuto})`, resultado: imp.H, unidade: 'm', norma: 'NBR 6118:2023, 11.3.3.4.1', entradas: { H: imp.H, n: imp.n, nAuto: imp.nAuto } });
    P_('analise', t, { descricao: 'Desaprumo de uma prumada e da estrutura', formula: 'θ1 = 1/(100·√H), 1/300 ≤ θ1 ≤ 1/200; θa = θ1·√((1 + 1/n)/2)', expressao: `θ1 = ${fm(imp.theta1)} (1/${fm(1 / imp.theta1)}); θa = ${fm(imp.theta1)}·√((1 + 1/${imp.n})/2) = ${fm(imp.thetaA)} (1/${fm(1 / imp.thetaA)})`, resultado: imp.thetaA, unidade: 'rad', norma: 'NBR 6118:2023, 11.3.3.4.1', entradas: { H: imp.H, n: imp.n, theta1: imp.theta1, thetaA: imp.thetaA } });
    // a regra dos 30 % do vento por combinação é registrada por `design.ts` (registrarRegra30), no elemento GLOBAL
  }
  const det = detalheGamaZ.get(d.gammaZObj) ?? [];
  const red = d.modulus;
  P_('analise', 'Estabilidade global (γz)', { descricao: 'Análise com rigidez reduzida para o γz (e para o P-Δ): vigas 0,4·E·I, pilares 0,8·E·I (concreto, E = Eci ou Ecs conforme a opção), aço 0,8·E·I', formula: 'EI,sec = 0,4·Eci·Ic (vigas); 0,8·Eci·Ic (pilares)', expressao: `módulo base: ${red}; ${model.members.length} barras com rigidez reduzida`, resultado: red, unidade: '', norma: 'NBR 6118:2023, 15.7.3', entradas: { vigas: 0.4, pilares: 0.8, aco: 0.8 } });
  for (const r of d.rep.gammaZ.rows as GammaZRow[]) {
    const dt = det.find((x) => x.combo === r.combo);
    P_('analise', 'Estabilidade global (γz)', { descricao: `Combinação ${r.combo}: momento de tombamento de 1ª ordem e acréscimo pelos deslocamentos horizontais`, formula: 'M1,tot,d = Σ H·(y − ybase); ΔMtot,d = Σ P·u; γz = 1/(1 − ΔMtot,d/M1,tot,d)', expressao: `M1 = ${fm(r.M1)} kN·m; ΔM = ${fm(r.dM)} kN·m; γz = 1/(1 − ${fm(r.dM)}/${fm(r.M1)}) = ${fm(r.gz)}`, resultado: r.gz, unidade: '', norma: 'NBR 6118:2023, 15.5.3', entradas: { M1: r.M1, dM: r.dM, gz: r.gz, ...(dt ? { ybase: dt.ybase, desap: dt.desap, thetaA: dt.thetaA, nos: JSON.stringify(dt.nos.map((n) => [n.no, n.y, n.H, n.V, n.u])) } : {}) } });
  }
  const gz = d.rep.gammaZ;
  if (gz.cls !== 'none') P_('analise', 'Estabilidade global (γz)', { descricao: `Classificação da estrutura: ${gz.cls === 'fixed' ? 'nós fixos (γz ≤ 1,1)' : gz.cls === 'mobile' ? 'nós móveis (1,1 < γz ≤ 1,3): vento majorado por 0,95·γz nas combinações ELU' : 'deslocabilidade excessiva (γz > 1,3): use a análise P-Δ'}`, formula: 'γz,máx = máx γz das combinações ELU; amplificação 0,95·γz', expressao: `γz,máx = ${fm(gz.max)}`, resultado: gz.max, unidade: '', norma: 'NBR 6118:2023, 15.5.2 e 15.7.2', entradas: { gzMax: gz.max, modo: d.rep.secondOrder.mode } });
  for (const r of d.rep.secondOrder.rows) P_('analise', 'Análise P-Δ', { descricao: `Combinação ${r.combo}: iteração com matriz geométrica (rigidez reduzida) até a convergência`, formula: 'u(k+1) = (K + Kg(N(k)))⁻¹·F', expressao: `${r.iterations} iterações; amplificação dos deslocamentos horizontais = ${fm(r.amplification)}${r.converged ? '' : ' (sem convergência)'}`, resultado: r.amplification, unidade: '', norma: 'NBR 6118:2023, 15.7.3', entradas: { iteracoes: r.iterations, amplificacao: r.amplification, convergiu: r.converged ? 1 : 0 } });

  // ---- equilíbrio e deslocamentos por caso
  for (const cs of model.cases) {
    const r = a.cases.get(cs.id), F = d.eq.get(cs.id);
    if (!r || !F) continue;
    let Rx = 0, Ry = 0, Fx = 0, Fy = 0;
    r.reactions.forEach((v) => { Rx += v[0]; Ry += v[1]; });
    for (let k = 0; k * 3 < F.length; k++) { Fx += F[k * 3]; Fy += F[k * 3 + 1]; }
    P_('analise', 'Equilíbrio por caso', { descricao: `Caso ${cs.name}: soma das reações e das cargas equivalentes (devem se anular, eixos globais)`, formula: 'ΣR + ΣF = 0', expressao: `ΣRx = ${fm(Rx)}; ΣFx = ${fm(Fx)}; ΣRy = ${fm(Ry)}; ΣFy = ${fm(Fy)} kN → resíduo (${fm(Rx + Fx)}; ${fm(Ry + Fy)}) kN`, resultado: Ry, unidade: 'kN', entradas: { Rx, Ry, Fx, Fy } });
    let umax = 0, no = -1, gdl = 0;
    for (let i = 0; i < r.u.length; i++) if (Math.abs(r.u[i]) > Math.abs(umax) && i % 3 < 2) { umax = r.u[i]; no = a.prep.model.nodes[Math.floor(i / 3)].id; gdl = i % 3; }
    P_('analise', 'Deslocamentos', { descricao: `Caso ${cs.name}: maior deslocamento de translação (nó ${no}, ${gdl === 0 ? 'ux' : 'uy'})`, formula: 'máx |u|', expressao: `u = ${fm(umax * 1000)} mm`, resultado: umax, unidade: 'm', entradas: { no, gdl } });
  }

  // ---- cargas na fundação
  d.rep.foundation.forEach((f: FoundationRow) => registrarCargasApoio(mem, f));
  void fp;
}

/** Reações por caso, envoltória característica (combinações raras) e de cálculo (ELU) de um apoio. */
function registrarCargasApoio(mem: Registrador, f: FoundationRow) {
  const el = GLOBAL, t = `Cargas na fundação – apoio (nó ${f.nodeId})`;
  for (const pc of f.perCase) mem.passo({ etapa: 'cargas', elemento: el, topico: t, descricao: `Reação do caso ${pc.name} no nó ${f.nodeId} (eixos globais)`, formula: 'Rx; Ry; Mz', expressao: `Rx = ${fm(pc.R[0])} kN; Ry = ${fm(pc.R[1])} kN; Mz = ${fm(pc.R[2])} kN·m`, resultado: pc.R[1], unidade: 'kN', entradas: { caso: pc.caseId, Rx: pc.R[0], Ry: pc.R[1], Mz: pc.R[2] } });
  const reg = (descricao: string, v: [number, number, number], norma: string, extra: Record<string, ValorMemoria> = {}) => mem.passo({ etapa: 'esforcos', elemento: el, topico: t, descricao, formula: 'envoltória das combinações', expressao: `Rx = ${fm(v[0])}; Ry = ${fm(v[1])} kN; Mz = ${fm(v[2])} kN·m`, resultado: v[1], unidade: 'kN', norma, entradas: { Rx: v[0], Ry: v[1], Mz: v[2], ...extra } });
  reg(`Valores característicos máximos (combinações raras; Ry máximo na combinação ${f.charComboMaxN})`, f.charMax, 'NBR 6122:2019, 5.5', { combinacao: f.charComboMaxN });
  reg('Valores característicos mínimos (combinações raras)', f.charMin, 'NBR 6122:2019, 5.5');
  reg('Parcela permanente (casos G)', f.perm, 'NBR 6122:2019');
  reg(`Valores de cálculo máximos (ELU; Ry máximo na combinação ${f.designComboMaxN}) para o dimensionamento estrutural do elemento`, f.designMax, 'NBR 6118:2023, 11.8', { combinacao: f.designComboMaxN });
  reg('Valores de cálculo mínimos (ELU)', f.designMin, 'NBR 6118:2023, 11.8');
}
