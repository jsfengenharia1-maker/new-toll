// Exportação dos dados da análise do pórtico espacial do edifício (MD fase 1): nós, barras, seções, materiais, apoios,
// molas, diafragma, cargas por caso, combinações com os coeficientes, deslocamentos, reações e esforços por caso e por
// combinação. Tudo em kN, m e rad, eixos globais (Z vertical) e esforços nos eixos locais das barras (N > 0 tração).
// CSV com ponto decimal e separador ";" (número exato, 17 algarismos significativos quando preciso) e JSON.
import { baseBarra, type Caso3, type Resultado3 } from '../fe3d';
import type { AnaliseEdificio } from '../building/analitico';
import type { CombinacaoEd } from '../building/combinacoes';
import { concretoDe, acoDe, gamas } from '../building/materiais';
import { dimsSecao, lancesDoPilar, secaoNoLance, type BuildingModel } from '../building/types';
import { zip } from '../zip';

export interface TabelaDados { nome: string; descricao: string; cabecalho: string[]; linhas: (string | number)[][] }

export interface CasoResolvido { nome: string; origem: 'obra' | 'vento' | 'pDelta'; res: Resultado3; ic: number; caso?: Caso3 }

const GDL = ['ux', 'uy', 'uz', 'rx', 'ry', 'rz'];

/** Casos com resultado no pórtico, na ordem: casos da obra, vento e P-Δ. */
export function casosResolvidos(an: AnaliseEdificio): CasoResolvido[] {
  const pm = an.portico, out: CasoResolvido[] = [];
  if (!pm.res) return out;
  an.casos.forEach((c, ic) => out.push({ nome: c, origem: 'obra', res: pm.res!, ic, caso: pm.casos?.[ic] }));
  if (pm.resVento) (an.vento?.casos ?? []).forEach((c, ic) => out.push({ nome: c.nome, origem: 'vento', res: pm.resVento!, ic, caso: pm.casosVento?.[ic] }));
  if (pm.resPDelta) for (const c of an.segundaOrdem?.combinacoes ?? []) { const k = c.caso ? +c.caso.slice(3) - 1 : -1; if (k >= 0) out.push({ nome: c.caso!, origem: 'pDelta', res: pm.resPDelta, ic: k, caso: pm.casosPDelta?.[k] }); }
  return out;
}

/** Todas as tabelas da análise (as combinações passadas são as usadas no dimensionamento). */
export function tabelasAnalise(b: BuildingModel, an: AnaliseEdificio, combs: CombinacaoEd[]): TabelaDados[] {
  const pm = an.portico, m = pm.modelo, T: TabelaDados[] = [];
  T.push({ nome: 'nos', descricao: 'Nós do pórtico espacial (m)', cabecalho: ['no', 'x', 'y', 'z'], linhas: m.nos.map((p, i) => [i, p[0], p[1], p[2]]) });
  T.push({ nome: 'barras', descricao: 'Barras: nós, propriedades (kN, m), vetor de referência do plano local x-y, trechos rígidos (globais) e liberações (gdl locais 3 torção, 4 My, 5 Mz)', cabecalho: ['barra', 'tipo', 'elemento', 'pavimento', 'i', 'j', 'L_flexivel', 'E', 'G', 'A', 'Iy', 'Iz', 'J', 'Ay', 'Az', 'ref_x', 'ref_y', 'ref_z', 'offI_x', 'offI_y', 'offI_z', 'offJ_x', 'offJ_y', 'offJ_z', 'libI', 'libJ', 'engI', 'engJ', 'so_plano'],
    linhas: m.barras.map((br, k) => { const t = pm.barras[k], { L } = baseBarra(m, br), o = (v?: number[]) => v ?? [0, 0, 0]; return [k, t?.tipo ?? '', t?.ref ?? '', t?.pavimento ?? '', br.i, br.j, L, br.E, br.G, br.A, br.Iy, br.Iz, br.J, br.Ay ?? '', br.Az ?? '', ...(br.ref ?? ['', '', '']), ...o(br.offI), ...o(br.offJ), (br.libI ?? []).join(' '), (br.libJ ?? []).join(' '), (br.engI ?? []).map((e) => e.join(':')).join(' '), (br.engJ ?? []).map((e) => e.join(':')).join(' '), br.soPlano ? 1 : 0]; }) });
  // seções dos elementos lançados
  const sec: (string | number)[][] = [];
  for (const v of b.vigas) sec.push(['viga', v.nome, v.grupo, 'ret', v.secao.b, v.secao.h, '']);
  for (const p of b.pilares) for (const l of lancesDoPilar(b, p)) { const s = secaoNoLance(p, l.id), [w, h] = dimsSecao(s); sec.push(['pilar', p.nome, l.nome, s.tipo, w, h, s.tipo === 'circ' ? s.d : '']); }
  T.push({ nome: 'secoes', descricao: 'Seções das vigas e dos lances de pilar (m)', cabecalho: ['tipo', 'elemento', 'grupo_ou_lance', 'forma', 'b', 'h', 'D'], linhas: sec });
  const g = gamas(b), mat: (string | number)[][] = [];
  for (const tipo of ['viga', 'pilar', 'laje'] as const) { const c = concretoDe(b, tipo); mat.push([`concreto (${tipo})`, c.fck, g.c, c.fcd, c.fctm, c.Eci, c.Ecs, '', '']); }
  for (const pos of ['vigaPos', 'vigaNeg', 'vigaEstribo', 'pilarLong', 'pilarEstribo'] as const) { const a = acoDe(b, pos); mat.push([`aço ${a.aco} (${pos})`, '', '', '', '', '', '', a.fyk, a.fyd]); }
  T.push({ nome: 'materiais', descricao: `Materiais (MPa); γc = ${g.c}, γs = ${g.s}, γg = ${g.g}, γq = ${g.q}`, cabecalho: ['material', 'fck', 'gama_c', 'fcd', 'fctm', 'Eci', 'Ecs', 'fyk', 'fyd'], linhas: mat });
  T.push({ nome: 'apoios', descricao: 'Apoios: gdl presos por nó (1 = preso)', cabecalho: ['no', ...GDL], linhas: [...m.apoios].sort((a, z) => a[0] - z[0]).map(([no, gs]) => [no, ...GDL.map((_, k) => (gs.includes(k) ? 1 : 0))]) });
  T.push({ nome: 'molas', descricao: 'Molas nodais (kN/m ou kN·m/rad)', cabecalho: ['no', 'gdl', 'k'], linhas: (m.molas ?? []).map((x) => [x.no, GDL[x.gdl], x.k]) });
  T.push({ nome: 'diafragma', descricao: 'Diafragma rígido: ux, uy e rz do escravo seguem o mestre', cabecalho: ['no', 'mestre'], linhas: (m.escravos ?? []).map((x) => [x.no, x.mestre]) });
  const casos = casosResolvidos(an), cg: (string | number)[][] = [];
  for (const c of casos) {
    if (!c.caso) continue;
    for (const x of c.caso.nodais) cg.push([c.nome, 'nodal', x.no, '', ...x.f]);
    for (const x of c.caso.distribuidas) cg.push([c.nome, 'distribuida', x.barra, '', ...x.q, 0, 0, 0]);
    for (const x of c.caso.pontuais ?? []) cg.push([c.nome, 'pontual', x.barra, x.a, ...x.f]);
    for (const x of c.caso.pressoes ?? []) cg.push([c.nome, 'pressao_casca', x.casca, '', x.q, 0, 0, 0, 0, 0]);
  }
  T.push({ nome: 'cargas', descricao: 'Cargas por caso (globais): nodal (Fx, Fy, Fz, Mx, My, Mz no nó), distribuída (qx, qy, qz por metro da parte flexível da barra), pontual (a metros da extremidade flexível i)', cabecalho: ['caso', 'tipo', 'no_ou_barra', 'a', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'], linhas: cg });
  const cb: (string | number)[][] = [];
  for (const c of combs) for (const [k, f] of Object.entries(c.fatores)) cb.push([c.nome, c.tipo, k, f]);
  T.push({ nome: 'combinacoes', descricao: 'Combinações: coeficiente de cada caso', cabecalho: ['combinacao', 'tipo', 'caso', 'fator'], linhas: cb });
  const des: (string | number)[][] = [], rea: (string | number)[][] = [], esf: (string | number)[][] = [];
  for (const c of casos) {
    const u = c.res.desloc[c.ic];
    for (let i = 0; i < m.nos.length; i++) des.push([c.nome, i, ...Array.from(u.subarray(i * 6, i * 6 + 6))]);
    for (const [no, r] of [...c.res.reacoes[c.ic]].sort((a, z) => a[0] - z[0])) rea.push([c.nome, no, ...r]);
    c.res.esforcos[c.ic].forEach((e, k) => { esf.push([c.nome, k, 'i', ...Array.from(e.subarray(0, 6))], [c.nome, k, 'j', ...Array.from(e.subarray(6, 12))]); });
  }
  T.push({ nome: 'deslocamentos', descricao: 'Deslocamentos nodais por caso (m, rad)', cabecalho: ['caso', 'no', ...GDL], linhas: des });
  T.push({ nome: 'reacoes', descricao: 'Reações nos nós com apoio, por caso (kN, kN·m; eixos globais)', cabecalho: ['caso', 'no', 'Fx', 'Fy', 'Fz', 'Mx', 'My', 'Mz'], linhas: rea });
  T.push({ nome: 'esforcos_casos', descricao: 'Esforços nas extremidades flexíveis por caso (eixos locais; convenção do solver: forças da barra sobre o nó)', cabecalho: ['caso', 'barra', 'ponta', 'N', 'Vy', 'Vz', 'T', 'My', 'Mz'], linhas: esf });
  // por combinação: soma dos casos com os coeficientes (mesma ordem dos fatores)
  const porNome = new Map(casos.map((c) => [c.nome, c]));
  const ec: (string | number)[][] = [], dc: (string | number)[][] = [], rc: (string | number)[][] = [];
  for (const cmb of combs) {
    const parc = Object.entries(cmb.fatores).map(([k, f]) => [porNome.get(k), f] as const).filter((x): x is [CasoResolvido, number] => !!x[0]);
    if (!parc.length) continue;
    for (let k = 0; k < m.barras.length; k++) {
      const s = new Float64Array(12);
      for (const [c, f] of parc) { const e = c.res.esforcos[c.ic][k]; for (let q = 0; q < 12; q++) s[q] += f * e[q]; }
      ec.push([cmb.nome, k, 'i', ...Array.from(s.subarray(0, 6))], [cmb.nome, k, 'j', ...Array.from(s.subarray(6, 12))]);
    }
    for (let i = 0; i < m.nos.length; i++) { const s = [0, 0, 0, 0, 0, 0]; for (const [c, f] of parc) { const u = c.res.desloc[c.ic]; for (let q = 0; q < 6; q++) s[q] += f * u[i * 6 + q]; } dc.push([cmb.nome, i, ...s]); }
    for (const no of [...m.apoios.keys()].sort((a, z) => a - z)) { const s = [0, 0, 0, 0, 0, 0]; for (const [c, f] of parc) { const r = c.res.reacoes[c.ic].get(no); if (r) for (let q = 0; q < 6; q++) s[q] += f * r[q]; } rc.push([cmb.nome, no, ...s]); }
  }
  T.push({ nome: 'esforcos_combinacoes', descricao: 'Esforços nas extremidades flexíveis por combinação (Σ fator·caso)', cabecalho: ['combinacao', 'barra', 'ponta', 'N', 'Vy', 'Vz', 'T', 'My', 'Mz'], linhas: ec });
  T.push({ nome: 'deslocamentos_combinacoes', descricao: 'Deslocamentos nodais por combinação (Σ fator·caso)', cabecalho: ['combinacao', 'no', ...GDL], linhas: dc });
  T.push({ nome: 'reacoes_combinacoes', descricao: 'Reações por combinação (Σ fator·caso)', cabecalho: ['combinacao', 'no', 'Fx', 'Fy', 'Fz', 'Mx', 'My', 'Mz'], linhas: rc });
  if (m.cascas?.length) T.push({ nome: 'cascas', descricao: 'Cascas de 6 nós (esforços das cascas ficam para a fase 2; o script OpenSees não as inclui)', cabecalho: ['casca', 'nos'], linhas: m.cascas.map((cs, k) => [k, cs.nos.join(' ')]) });
  return T;
}

const numCsv = (v: string | number) => (typeof v === 'number' ? (Number.isFinite(v) ? String(v) : '') : /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function csvTabela(t: TabelaDados): string {
  return [t.cabecalho.join(';'), ...t.linhas.map((l) => l.map(numCsv).join(';'))].join('\n') + '\n';
}

/** JSON com todas as tabelas (objeto por linha). */
export function jsonTabelas(ts: TabelaDados[], extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ unidades: 'kN, m, rad, MPa (materiais)', ...extra, tabelas: Object.fromEntries(ts.map((t) => [t.nome, { descricao: t.descricao, linhas: t.linhas.map((l) => Object.fromEntries(t.cabecalho.map((h, k) => [h, l[k]]))) }])) });
}

/** ZIP com um CSV por tabela, o JSON e os arquivos extras (ex.: memória e script OpenSees). */
export function zipDados(ts: TabelaDados[], extras: { nome: string; texto: string }[] = []): Uint8Array {
  const enc = new TextEncoder();
  return zip([...ts.map((t) => ({ nome: `analise/${t.nome}.csv`, dados: enc.encode(csvTabela(t)) })), ...extras.map((e) => ({ nome: e.nome, dados: enc.encode(e.texto) }))]);
}
