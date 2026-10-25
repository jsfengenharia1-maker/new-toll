// Exportação dos dados da análise do pórtico plano 2D (MD fase 8): nós e apoios, barras (propriedades), materiais, seções, casos,
// cargas, combinações com os coeficientes, deslocamentos, reações e esforços por caso e por combinação (nas estações da barra).
// Tudo em kN, m e rad; N > 0 tração; M > 0 traciona a face y− (local); esforços nos eixos locais da barra. Mesmo formato das tabelas do
// edifício (`TabelaDados`: CSV com ";" e ponto decimal, JSON e ZIP).
import { designCombos, comboResult, type DesignReport, type NamedCombo } from '../design';
import { P } from '../math';
import { sectionProps } from '../section';
import type { Analysis, CaseResult } from '../solver';
import type { Model } from '../types';
import type { TabelaDados } from './dadosAnalise';

const ESTACOES = 20;

export interface ComboExport { nome: string; tipo: string; fatores: Record<number, number>; r: CaseResult | null }

/** Combinações usadas no dimensionamento (ELU efetivas com desaprumo/0,95γz/P-Δ, quase permanente, frequente e rara) com o resultado de cada uma. */
export function combinacoesPortico(model: Model, a: Analysis, rep: DesignReport): ComboExport[] {
  const out: ComboExport[] = rep.elu.map((cb: NamedCombo, i) => ({ nome: cb.name, tipo: 'ELU', fatores: cb.factors, r: rep.eluResults[i] ?? null }));
  const dc = designCombos(model);
  for (const [lista, tipo] of [[rep.qp, 'QP'], [dc.freq, 'FREQ'], [rep.rare, 'RARA']] as const) for (const cb of lista) out.push({ nome: cb.name, tipo, fatores: cb.factors, r: comboResult(a, cb.factors) });
  return out;
}

export function tabelasPortico(model: Model, a: Analysis, rep: DesignReport): TabelaDados[] {
  const T: TabelaDados[] = [], prep = a.prep;
  const sup = (v: string) => (v === 'fixed' ? 1 : v === 'spring' ? 2 : 0);
  T.push({ nome: 'nos', descricao: 'Nós (m) e apoios: 0 livre, 1 preso, 2 mola (kx, ky em kN/m; kr em kN·m/rad); angulo do apoio inclinado em graus', cabecalho: ['no', 'x', 'y', 'ux', 'uy', 'rz', 'kx', 'ky', 'kr', 'angulo'], linhas: model.nodes.map((n) => [n.id, n.x, n.y, ...(n.support ? [sup(n.support.ux), sup(n.support.uy), sup(n.support.rz), n.support.kx ?? 0, n.support.ky ?? 0, n.support.kr ?? 0, n.support.angle ?? 0] : ['', '', '', '', '', '', ''])]) });
  T.push({ nome: 'materiais', descricao: 'Materiais: E (kN/m²), ν, α (1/°C), γ (kN/m³), fck e fy (MPa)', cabecalho: ['id', 'nome', 'tipo', 'E', 'nu', 'alpha', 'gamma', 'fck', 'fy', 'fu'], linhas: model.materials.map((m) => [m.id, m.name, m.kind ?? '', m.E, m.nu, m.alpha, m.gamma, m.fck ?? '', m.fy ?? '', m.fu ?? '']) });
  T.push({ nome: 'secoes', descricao: 'Seções: forma e propriedades (A em m², I em m⁴, h em m, yc em m, As = área de cisalhamento)', cabecalho: ['id', 'nome', 'forma', 'A', 'I', 'h', 'yc', 'As'], linhas: model.sections.map((s) => { const p = sectionProps(s.shape); return [s.id, s.name, s.shape.kind, p.A, p.I, p.h, p.yc, p.As]; }) });
  T.push({ nome: 'barras', descricao: 'Barras: nós, comprimento, material, seção, rótulas, molas de ligação, vínculo rígido, comprimentos de flambagem e rigidezes de cálculo EA e EI (kN, kN·m²)', cabecalho: ['barra', 'ni', 'nj', 'L', 'material', 'secao', 'rotula_i', 'rotula_j', 'mola_i', 'mola_j', 'rigido', 'papel', 'leIn', 'leOut', 'EA', 'EI', 'GAs'], linhas: prep.members.map((pm) => { const m = model.members.find((x) => x.id === pm.id)!; return [m.id, m.ni, m.nj, pm.L, m.material, m.section, m.hingeI ? 1 : 0, m.hingeJ ? 1 : 0, m.springI ?? '', m.springJ ?? '', m.rigid ?? '', m.role ?? 'auto', m.leIn ?? pm.L, m.leOut ?? pm.L, pm.props.EA, pm.props.EI, Number.isFinite(pm.props.GAs) ? pm.props.GAs : '']; }) });
  T.push({ nome: 'casos', descricao: 'Casos de carga: natureza, ψ0, ψ1, ψ2 e grupo excludente', cabecalho: ['id', 'nome', 'natureza', 'psi0', 'psi1', 'psi2', 'grupo'], linhas: model.cases.map((c) => [c.id, c.name, c.nature ?? 'G', c.psi0 ?? '', c.psi1 ?? '', c.psi2 ?? '', c.group ?? '']) });
  T.push({ nome: 'cargas', descricao: 'Cargas: nodal (fx, fy, mz), distribuída (qxi, qyi, qxj, qyj; sistema), momentos de extremidade (mi, mj), temperatura (tTop, tBot), deslocamento prescrito (dx, dy, rz), peso próprio (fator)', cabecalho: ['id', 'caso', 'tipo', 'no_ou_barra', 'c1', 'c2', 'c3', 'c4', 'sistema'], linhas: model.loads.map((l) => { const b = [l.id, l.caseId, l.kind] as (string | number)[]; switch (l.kind) { case 'nodal': return [...b, l.node, l.fx, l.fy, l.mz, '', '']; case 'dist': return [...b, l.member, l.qxi, l.qyi, l.qxj, l.qyj, l.system]; case 'endMoment': return [...b, l.member, l.mi, l.mj, '', '', '']; case 'thermal': return [...b, l.member, l.tTop, l.tBot, '', '', '']; case 'presc': return [...b, l.node, l.dx ?? 0, l.dy ?? 0, l.rz ?? 0, '', '']; case 'selfWeight': return [...b, '', l.factor, '', '', '', '']; } }) });
  const combs = combinacoesPortico(model, a, rep);
  const cb: (string | number)[][] = [];
  for (const c of combs) for (const [id, f] of Object.entries(c.fatores)) cb.push([c.nome, c.tipo, +id, model.cases.find((x) => x.id === +id)?.name ?? '', f]);
  T.push({ nome: 'combinacoes', descricao: 'Combinações usadas no dimensionamento: coeficiente de cada caso (ELU já com 0,95·γz no vento, quando aplicável; o sentido do desaprumo está no nome da combinação)', cabecalho: ['combinacao', 'tipo', 'caso_id', 'caso', 'fator'], linhas: cb });
  if (rep.imperfection) T.push({ nome: 'desaprumo', descricao: 'Desaprumo global (NBR 6118, 11.3.3.4.1) e sentido (+1/−1) por combinação ELU', cabecalho: ['H', 'n', 'theta1', 'thetaA'], linhas: [[rep.imperfection.H, rep.imperfection.n, rep.imperfection.theta1, rep.imperfection.thetaA]] });
  T.push({ nome: 'gamaz', descricao: 'γz por combinação ELU: M1 e ΔM (kN·m)', cabecalho: ['combinacao', 'M1', 'dM', 'gamaz'], linhas: rep.gammaZ.rows.map((r) => [r.combo, r.M1, r.dM, r.gz]) });

  const des: (string | number)[][] = [], rea: (string | number)[][] = [], esf: (string | number)[][] = [];
  const emitir = (nome: string, r: CaseResult) => {
    model.nodes.forEach((n, k) => des.push([nome, n.id, r.u[k * 3], r.u[k * 3 + 1], r.u[k * 3 + 2]]));
    for (const [k, v] of [...r.reactions].sort((p, q) => p[0] - q[0])) rea.push([nome, model.nodes[k].id, v[0], v[1], v[2]]);
    prep.members.forEach((pm, k) => {
      const m = r.members[k];
      for (let q = 0; q <= ESTACOES; q++) { const x = (pm.L * q) / ESTACOES; esf.push([nome, pm.id, x, P.evaluate(m.N, x), P.evaluate(m.V, x), P.evaluate(m.M, x)]); }
    });
  };
  for (const c of model.cases) { const r = a.cases.get(c.id); if (r) emitir(c.name, r); }
  const caso = (arr: (string | number)[][], n0: number) => arr.slice(n0);
  const n1 = [des.length, rea.length, esf.length];
  for (const c of combs) if (c.r) emitir(c.nome, c.r);
  T.push({ nome: 'deslocamentos', descricao: 'Deslocamentos nodais por caso (m, rad), nos eixos globais', cabecalho: ['caso', 'no', 'ux', 'uy', 'rz'], linhas: des.slice(0, n1[0]) });
  T.push({ nome: 'reacoes', descricao: 'Reações nos apoios por caso (kN, kN·m; eixos globais)', cabecalho: ['caso', 'no', 'Rx', 'Ry', 'Mz'], linhas: rea.slice(0, n1[1]) });
  T.push({ nome: 'esforcos_casos', descricao: `Esforços ao longo da barra por caso, em ${ESTACOES + 1} estações (x em m a partir do nó i; N > 0 tração; M > 0 traciona y−)`, cabecalho: ['caso', 'barra', 'x', 'N', 'V', 'M'], linhas: esf.slice(0, n1[2]) });
  T.push({ nome: 'deslocamentos_combinacoes', descricao: 'Deslocamentos nodais por combinação (resultado da combinação; P-Δ quando aplicável)', cabecalho: ['combinacao', 'no', 'ux', 'uy', 'rz'], linhas: caso(des, n1[0]) });
  T.push({ nome: 'reacoes_combinacoes', descricao: 'Reações por combinação', cabecalho: ['combinacao', 'no', 'Rx', 'Ry', 'Mz'], linhas: caso(rea, n1[1]) });
  T.push({ nome: 'esforcos_combinacoes', descricao: `Esforços ao longo da barra por combinação, em ${ESTACOES + 1} estações`, cabecalho: ['combinacao', 'barra', 'x', 'N', 'V', 'M'], linhas: caso(esf, n1[2]) });
  return T;
}
