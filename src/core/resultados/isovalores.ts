// Campos de isovalores da V4 sobre as lajes (grelha) e o radier: deslocamentos, esforços por hipótese, esforços de
// cálculo (Wood-Armer das combinações ELU) e áreas de aço. Cada campo é um `Campo` (bandas.ts) por pavimento, com os
// nós da grelha de cada laje triangulados dentro do contorno e dos furos. Núcleo puro.
import type { AnaliseEdificio } from '../building/analitico';
import { armaduraNecessariaLaje, fatoresELULaje, woodArmerNos, type Dimensionamento } from '../building/dimensionamento';
import { armaduraNecessariaNervurada } from '../building/nervuradasDim';
import { arranjoNervuras, geometriaBidirecional, lajeComAbacos } from '../building/nervuradas';
import { errosTipoLaje } from '../building/tiposLaje';
import { pavimentosOrdenados, type BuildingModel, type Laje } from '../building/types';
import { areaDasBandas, areaDoCampo, bandas, triangularNos, type Campo, type P } from './bandas';
import { deslocamentosHipotese, hipotesesDisponiveis, type Hipotese } from './deformada';

export type GrandezaIso =
  | 'uz' | 'rx' | 'ry'
  | 'Q' | 'Qx' | 'Qy' | 'Mx' | 'My' | 'Mxy'
  | 'QCalc' | 'QxCalc' | 'QyCalc' | 'MxInf' | 'MyInf' | 'MxSup' | 'MySup'
  | 'AsInfX' | 'AsInfY' | 'AsSupX' | 'AsSupY' | 'AsInf' | 'AsSup'
  | 'rSigmaMax' | 'rSigmaMin' | 'rW' | 'rSigma' | 'rWh';

export type GrupoGrandeza = 'deslocamento' | 'esforco' | 'calculo' | 'armadura' | 'radier';

export interface InfoGrandeza { id: GrandezaIso; rotulo: string; unidade: string; grupo: GrupoGrandeza; /** Pede hipótese (caso ou combinação). */ porHipotese: boolean; /** Só lajes maciças e nervuradas bidirecionais (as demais ficam sem mapa de taxa). */ soMacica?: boolean }

export const GRANDEZAS_ISO: InfoGrandeza[] = [
  { id: 'uz', rotulo: 'Deslocamento vertical', unidade: 'mm', grupo: 'deslocamento', porHipotese: true },
  { id: 'rx', rotulo: 'Giro em torno de x', unidade: 'mrad', grupo: 'deslocamento', porHipotese: true },
  { id: 'ry', rotulo: 'Giro em torno de y', unidade: 'mrad', grupo: 'deslocamento', porHipotese: true },
  { id: 'Q', rotulo: 'Cortante total', unidade: 'kN/m', grupo: 'esforco', porHipotese: true },
  { id: 'Qx', rotulo: 'Cortante Qx', unidade: 'kN/m', grupo: 'esforco', porHipotese: true },
  { id: 'Qy', rotulo: 'Cortante Qy', unidade: 'kN/m', grupo: 'esforco', porHipotese: true },
  { id: 'Mx', rotulo: 'Momento Mx', unidade: 'kN·m/m', grupo: 'esforco', porHipotese: true },
  { id: 'My', rotulo: 'Momento My', unidade: 'kN·m/m', grupo: 'esforco', porHipotese: true },
  { id: 'Mxy', rotulo: 'Torção |Mxy|', unidade: 'kN·m/m', grupo: 'esforco', porHipotese: true },
  { id: 'QCalc', rotulo: 'Cortante total de cálculo', unidade: 'kN/m', grupo: 'calculo', porHipotese: false },
  { id: 'QxCalc', rotulo: 'Cortante de cálculo em X', unidade: 'kN/m', grupo: 'calculo', porHipotese: false },
  { id: 'QyCalc', rotulo: 'Cortante de cálculo em Y', unidade: 'kN/m', grupo: 'calculo', porHipotese: false },
  { id: 'MxInf', rotulo: 'Momento de cálculo inferior em X', unidade: 'kN·m/m', grupo: 'calculo', porHipotese: false },
  { id: 'MyInf', rotulo: 'Momento de cálculo inferior em Y', unidade: 'kN·m/m', grupo: 'calculo', porHipotese: false },
  { id: 'MxSup', rotulo: 'Momento de cálculo superior em X', unidade: 'kN·m/m', grupo: 'calculo', porHipotese: false },
  { id: 'MySup', rotulo: 'Momento de cálculo superior em Y', unidade: 'kN·m/m', grupo: 'calculo', porHipotese: false },
  { id: 'AsInfX', rotulo: 'Armadura inferior em X', unidade: 'cm²/m', grupo: 'armadura', porHipotese: false, soMacica: true },
  { id: 'AsInfY', rotulo: 'Armadura inferior em Y', unidade: 'cm²/m', grupo: 'armadura', porHipotese: false, soMacica: true },
  { id: 'AsSupX', rotulo: 'Armadura superior em X', unidade: 'cm²/m', grupo: 'armadura', porHipotese: false, soMacica: true },
  { id: 'AsSupY', rotulo: 'Armadura superior em Y', unidade: 'cm²/m', grupo: 'armadura', porHipotese: false, soMacica: true },
  { id: 'AsInf', rotulo: 'Envoltória da armadura inferior', unidade: 'cm²/m', grupo: 'armadura', porHipotese: false, soMacica: true },
  { id: 'AsSup', rotulo: 'Envoltória da armadura superior', unidade: 'cm²/m', grupo: 'armadura', porHipotese: false, soMacica: true },
  { id: 'rSigmaMax', rotulo: 'Tensão máxima no terreno', unidade: 'kPa', grupo: 'radier', porHipotese: false },
  { id: 'rSigmaMin', rotulo: 'Tensão mínima no terreno (negativa = levantamento)', unidade: 'kPa', grupo: 'radier', porHipotese: false },
  { id: 'rW', rotulo: 'Recalque do radier (negativo para baixo)', unidade: 'mm', grupo: 'radier', porHipotese: false },
  { id: 'rSigma', rotulo: 'Tensão no terreno na hipótese (negativa = levantamento)', unidade: 'kPa', grupo: 'radier', porHipotese: true },
  { id: 'rWh', rotulo: 'Deslocamento do radier na hipótese (negativo para baixo, positivo = levantamento)', unidade: 'mm', grupo: 'radier', porHipotese: true },
];

export const infoGrandeza = (id: GrandezaIso) => GRANDEZAS_ISO.find((g) => g.id === id)!;

export interface PedidoIso {
  pavimento: string;
  grandeza: GrandezaIso;
  /** Caso ou combinação (grandezas por hipótese); sem ela, o primeiro caso. */
  hipotese?: Hipotese;
}

export interface ResultadoCampo { campo: Campo | null; avisos: string[] }

/** Pavimentos que têm grelha resolvida (e, portanto, mapa de lajes). */
export function pavimentosComMapa(b: BuildingModel, an: AnaliseEdificio): { id: string; nome: string }[] {
  const ok = new Set(an.grelhas.filter((g) => g.res && !g.res.erro).map((g) => g.pavimento));
  return pavimentosOrdenados(b).filter((p) => ok.has(p.id)).map((p) => ({ id: p.id, nome: p.nome }));
}

/** Hipóteses que atuam nas lajes: casos e combinações com ao menos um caso vertical da grelha. */
export function hipotesesDeLaje(b: BuildingModel, an: AnaliseEdificio): Hipotese[] {
  return hipotesesDisponiveis(b, an).filter((h) => Object.entries(h.fatores).some(([c, f]) => f && an.casos.includes(c)));
}

const fatoresDe = (an: AnaliseEdificio, h: Hipotese) => an.casos.map((c) => h.fatores[c] ?? 0);

type Grelha = AnaliseEdificio['grelhas'][number];
interface Acum { sx: number; nx: number; sy: number; ny: number; st: number; nt: number; vx: number; vy: number }

/** Valores nodais por barra da laje (soma das pontas das barras de cada direção, por metro, e contagens). */
function nodaisDeBarras(g: Grelha, lajeId: string, fat: number[]): Map<number, Acum> {
  const res = g.res!, out = new Map<number, Acum>();
  g.modelo.barras.forEach((br, i) => {
    const tg = g.barras[i];
    if (tg.tipo !== 'laje' || tg.ref !== lajeId || tg.dir === undefined || !tg.largura) return;
    for (const [no, k] of [[br.i, 0], [br.j, 6]] as const) {
      const a = out.get(no) ?? { sx: 0, nx: 0, sy: 0, ny: 0, st: 0, nt: 0, vx: 0, vy: 0 };
      const M = fat.reduce((t, f, ic) => t + f * (k === 0 ? -res.esforcos[ic][i][5] : res.esforcos[ic][i][11]), 0) / tg.largura;
      const T = fat.reduce((t, f, ic) => t + Math.abs(f * res.esforcos[ic][i][k + 3]), 0) / tg.largura;
      const V = Math.abs(fat.reduce((t, f, ic) => t + f * res.esforcos[ic][i][k + 1], 0)) / tg.largura;
      if (tg.dir === 0) { a.sx += M; a.nx++; a.vx += V; } else { a.sy += M; a.ny++; a.vy += V; }
      a.st += T; a.nt++;
      out.set(no, a);
    }
  });
  return out;
}

const media = (s: number, n: number) => (n ? s / n : 0);

/** Campo de uma grandeza no pavimento (todas as lajes do pavimento num só campo). */
export function campoDoPavimento(b: BuildingModel, an: AnaliseEdificio, _dim: Dimensionamento | null | undefined, p: PedidoIso): ResultadoCampo {
  const avisos: string[] = [], info = infoGrandeza(p.grandeza);
  const pav = b.pavimentos.find((x) => x.id === p.pavimento), g = an.grelhas.find((x) => x.pavimento === p.pavimento && x.res && !x.res.erro);
  if (!pav || !g || !g.res) return { campo: null, avisos: ['Pavimento sem grelha resolvida.'] };
  if (info.grupo === 'radier') return { campo: null, avisos: ['Grandeza do radier: use campoDoRadier.'] };
  const h = info.porHipotese ? (p.hipotese ?? hipotesesDeLaje(b, an)[0]) : undefined;
  if (info.porHipotese && !h) return { campo: null, avisos: ['Sem hipótese de carga.'] };
  if (h && h.tipo === 'combinacao') {
    const fora = Object.keys(h.fatores).filter((c) => h.fatores[c] && !an.casos.includes(c));
    if (fora.length) avisos.push(`Casos sem efeito nas lajes (vento e P-Δ): ${fora.join(', ')}.`);
  }
  const fat = h ? fatoresDe(an, h) : fatoresELULaje(b, an);
  const dh = h && info.grupo === 'deslocamento' ? deslocamentosHipotese(an, h) : null;
  const uGrelha = dh?.grelhas.get(p.pavimento);
  const nos: P[] = [], valores: number[] = [], triangulos: number[] = [], elementos: string[] = [], contornos: P[][] = [];
  for (const l of b.lajes.filter((x) => x.grupo === pav.grupo)) {
    const nodais = nodaisDeBarras(g, l.id, fat);
    if (!nodais.size) continue;
    const ids = [...nodais.keys()].sort((a, c) => a - c);
    const valorDe = valorNodal(b, an, g, l, info, ids, nodais, fat, uGrelha, avisos);
    if (!valorDe) continue;
    const local: P[] = ids.map((n) => [g.modelo.nos[n][0], g.modelo.nos[n][1]]);
    const vals = ids.map((n) => valorDe(n));
    // vértices do contorno e dos furos sem barra de laje (cantos sobre pilares): valor do nó mais próximo
    for (const v of [...(l.contorno as P[]), ...((l.furos ?? []) as P[][]).flat()]) {
      let mi = -1, md = Infinity;
      local.forEach((q, k) => { const d = Math.hypot(q[0] - v[0], q[1] - v[1]); if (d < md) { md = d; mi = k; } });
      if (md > 1e-6 && mi >= 0) { local.push([v[0], v[1]]); vals.push(vals[mi]); }
    }
    const tri = triangularNos(local, l.contorno as P[], (l.furos ?? []) as P[][]);
    const base = nos.length;
    local.forEach((q, k) => { nos.push(q); valores.push(vals[k]); });
    for (let t = 0; t < tri.length; t += 3) elementos.push(l.id);
    for (const t of tri) triangulos.push(base + t);
    contornos.push(l.contorno as P[], ...((l.furos ?? []) as P[][]));
  }
  if (!triangulos.length) return { campo: null, avisos: [...avisos, 'Nenhuma laje com resultado neste pavimento.'] };
  const rotulo = `${info.rotulo}${h ? ` — ${h.nome}` : info.grupo === 'calculo' || info.grupo === 'armadura' ? ' — combinações ELU' : ''} — ${pav.nome}`;
  return { campo: { nos, valores, triangulos, grandeza: info.id, unidade: info.unidade, rotulo, elementoDoTriangulo: elementos, contornos }, avisos };
}

/** Função nó → valor da grandeza para uma laje, ou null se a grandeza não se aplica a ela. */
function valorNodal(
  b: BuildingModel, an: AnaliseEdificio, g: Grelha, l: Laje, info: InfoGrandeza, ids: number[], nodais: Map<number, Acum>,
  fat: number[], uGrelha: Float64Array | undefined, avisos: string[],
): ((no: number) => number) | null {
  const aviso = (t: string) => { if (!avisos.includes(t)) avisos.push(t); };
  switch (info.id) {
    case 'uz': return uGrelha ? (n) => uGrelha[n * 6 + 2] * 1000 : null;
    case 'rx': return uGrelha ? (n) => uGrelha[n * 6 + 3] * 1000 : null;
    case 'ry': return uGrelha ? (n) => uGrelha[n * 6 + 4] * 1000 : null;
    case 'Mx': return (n) => { const a = nodais.get(n)!; return media(a.sx, a.nx); };
    case 'My': return (n) => { const a = nodais.get(n)!; return media(a.sy, a.ny); };
    case 'Mxy': return (n) => { const a = nodais.get(n)!; return media(a.st, a.nt); };
    case 'Qx': case 'QxCalc': return (n) => { const a = nodais.get(n)!; return media(a.vx, a.nx); };
    case 'Qy': case 'QyCalc': return (n) => { const a = nodais.get(n)!; return media(a.vy, a.ny); };
    case 'Q': case 'QCalc': return (n) => { const a = nodais.get(n)!; return Math.hypot(media(a.vx, a.nx), media(a.vy, a.ny)); };
    default: break;
  }
  // esforços de cálculo e armadura: momentos de cálculo inferior (≥ 0) e superior (≤ 0) por nó
  const wood = l.tipo.tipo === 'macica' && an.opcoes.woodArmer;
  const inf = new Map<number, [number, number]>(), sup = new Map<number, [number, number]>();
  if (wood) {
    for (const w of woodArmerNos(g, l.id, fat)) { inf.set(w.no, w.inf); sup.set(w.no, w.sup); }
  } else {
    for (const n of ids) {
      const a = nodais.get(n)!, mx = media(a.sx, a.nx), my = media(a.sy, a.ny);
      inf.set(n, [Math.max(0, mx), Math.max(0, my)]); sup.set(n, [Math.min(0, mx), Math.min(0, my)]);
    }
    if (info.grupo === 'calculo') aviso('Lajes sem Wood-Armer (nervuradas, treliçadas ou opção desligada): momentos de cálculo = momentos das barras, sem a torção.');
  }
  const get = (m: Map<number, [number, number]>, n: number, k: 0 | 1) => m.get(n)?.[k] ?? 0;
  switch (info.id) {
    case 'MxInf': return (n) => get(inf, n, 0);
    case 'MyInf': return (n) => get(inf, n, 1);
    case 'MxSup': return (n) => get(sup, n, 0);
    case 'MySup': return (n) => get(sup, n, 1);
    default: break;
  }
  const nerv = l.tipo.tipo === 'nervurada' && !l.definir && !errosTipoLaje(b, l.tipo).length;
  if (l.tipo.tipo !== 'macica' && !nerv) { aviso('Áreas de aço: só lajes maciças e nervuradas bidirecionais (as demais ficam sem mapa).'); return null; }
  if (nerv) aviso('Nervuradas: taxa em cm²/m = armadura da nervura (seção T embaixo, retângulo em cima, mínimo de 0,15 %) ÷ intereixo na zona aliviada e armadura de laje maciça de mesma altura nas zonas maciças, com os momentos das barras sem Wood-Armer e sem fissuração [a confirmar].');
  // nervuradas: a zona maciça (margem junto às vigas, ábacos e zonas manuais) usa a laje maciça equivalente
  const gN = nerv ? geometriaBidirecional(b, l.tipo as never) : null, arr = gN ? arranjoNervuras(lajeComAbacos(b, l, gN), gN, an.opcoes.nervuradaMacicoViga) : null;
  const maciça = (n: number) => !!arr && !arr.aliviada([g.modelo.nos[n][0], g.modelo.nos[n][1]]);
  const equivalente = gN ? { tipo: { tipo: 'macica', h: gN.h }, cobrimento: l.cobrimento } : l;
  const asPor = (n: number, M: number, face: 'inf' | 'sup', k: 0 | 1) =>
    !nerv ? armaduraNecessariaLaje(b, an, l, M, face) : maciça(n) ? armaduraNecessariaLaje(b, an, equivalente, M, face) : armaduraNecessariaNervurada(b, l, M, face, k);
  const asInf = (n: number, k: 0 | 1) => asPor(n, get(inf, n, k), 'inf', k);
  const asSup = (n: number, k: 0 | 1) => (get(sup, n, k) < 0 ? asPor(n, get(sup, n, k), 'sup', k) : 0);
  switch (info.id) {
    case 'AsInfX': return (n) => asInf(n, 0);
    case 'AsInfY': return (n) => asInf(n, 1);
    case 'AsSupX': return (n) => asSup(n, 0);
    case 'AsSupY': return (n) => asSup(n, 1);
    case 'AsInf': return (n) => Math.max(asInf(n, 0), asInf(n, 1));
    case 'AsSup': return (n) => Math.max(asSup(n, 0), asSup(n, 1));
    default: return null;
  }
}

/** Grandezas do radier por hipótese (caso ou combinação); as demais usam a envoltória das raras do dimensionamento. */
export const GRANDEZAS_RADIER_HIPOTESE: GrandezaIso[] = ['rSigma', 'rWh'];

/** Nós do radier (ou viga elástica) na base elástica e o deslocamento vertical (m, negativo para baixo) de cada um numa hipótese. */
function deslocamentosDoRadier(an: AnaliseEdificio, radier: string, h: Hipotese) {
  const nos = (an.baseElastica?.nos ?? []).filter((n) => n.ref === radier);
  const d = deslocamentosHipotese(an, h);
  return { nos, uz: nos.map((n) => d.portico[n.no * 6 + 2]), ignorados: d.ignorados };
}

/**
 * Campo do radier (C12.11): tensão máxima e mínima no terreno (kPa, envoltória das raras) e recalque (mm, negativo para baixo);
 * por hipótese (`rSigma`, `rWh`, V7e), a tensão k·(−uz) e o deslocamento uz da hipótese escolhida (caso ou combinação, com a análise em `opc`).
 */
export function campoDoRadier(
  b: BuildingModel, dim: Dimensionamento | null | undefined, radier: string, grandeza: 'rSigmaMax' | 'rSigmaMin' | 'rW' | 'rSigma' | 'rWh',
  opc?: { an?: AnaliseEdificio | null; hipotese?: Hipotese },
): ResultadoCampo {
  const geo = b.fundacao?.radiers?.find((x) => x.id === radier), info = infoGrandeza(grandeza), avisos: string[] = [];
  let nos: P[], valores: number[], nome: string;
  if (info.porHipotese) {
    const an = opc?.an;
    if (!an?.baseElastica || !geo) return { campo: null, avisos: ['Radier sem análise de base elástica.'] };
    const h = opc?.hipotese ?? hipotesesDisponiveis(b, an)[0];
    if (!h) return { campo: null, avisos: ['Sem hipótese de carga.'] };
    const d = deslocamentosDoRadier(an, radier, h);
    if (!d.nos.length) return { campo: null, avisos: ['Radier sem nós na base elástica.'] };
    if (d.ignorados.length) avisos.push(`Casos sem deslocamento no radier (não entram): ${d.ignorados.join(', ')}.`);
    nos = d.nos.map((n) => [n.x, n.y]);
    valores = d.nos.map((n, i) => (grandeza === 'rSigma' ? -n.k * d.uz[i] : d.uz[i] * 1000));
    nome = `${geo.nome ?? radier} — ${h.nome}`;
  } else {
    const r = dim?.radiers?.find((x) => x.id === radier);
    if (!r || !geo || !r.nos.length) return { campo: null, avisos: ['Radier sem resultado de base elástica.'] };
    nos = r.nos.map((n) => [n.x, n.y]);
    valores = r.nos.map((n) => (grandeza === 'rSigmaMax' ? n.sigma : grandeza === 'rSigmaMin' ? n.sigmaMin : -n.w * 1000));
    nome = r.nome;
  }
  const contorno = geo.contorno as P[], furos = (geo.furos ?? []) as P[][];
  const triangulos = triangularNos(nos, contorno, furos);
  if (!triangulos.length) return { campo: null, avisos: [...avisos, 'Radier sem malha.'] };
  const e = triangulos.length / 3;
  return { campo: { nos, valores, triangulos, grandeza, unidade: info.unidade, rotulo: `${info.rotulo} — ${nome}`, elementoDoTriangulo: Array.from({ length: e }, () => radier), contornos: [contorno, ...furos] }, avisos };
}

/** Linha da tabela do radier por hipótese: tensões extremas (kPa), maior recalque e maior levantamento (mm) e se a hipótese é inválida. */
export interface LinhaRadierHipotese {
  id: string; hipotese: string; tipo: 'caso' | 'combinacao';
  sigmaMax: number; sigmaMin: number;
  /** Maior deslocamento para baixo (mm, ≥ 0). */
  recalque: number;
  /** Maior deslocamento para cima (mm, ≥ 0): tensão de tração no solo, que a mola linear não limita. */
  levantamento: number;
  /** Combinação com levantamento: o solo não traciona, a hipótese precisa de nova análise (aumentar carga, área ou rigidez). */
  invalida: boolean;
}

/** Tensão no terreno e deslocamento do radier (ou viga elástica) em cada caso e combinação (C12.11, K1.11.20). */
export function tabelaRadierPorHipotese(b: BuildingModel, an: AnaliseEdificio, radier: string): LinhaRadierHipotese[] {
  if (!an.baseElastica) return [];
  const out: LinhaRadierHipotese[] = [];
  for (const h of hipotesesDisponiveis(b, an)) {
    const d = deslocamentosDoRadier(an, radier, h);
    if (!d.nos.length || d.ignorados.length === Object.values(h.fatores).filter(Boolean).length) continue;
    const sig = d.nos.map((n, i) => -n.k * d.uz[i]);
    const lev = Math.max(0, ...d.uz.map((u) => u * 1000)), rec = Math.max(0, ...d.uz.map((u) => -u * 1000));
    out.push({ id: h.id, hipotese: h.nome, tipo: h.tipo, sigmaMax: Math.max(...sig), sigmaMin: Math.min(...sig), recalque: rec, levantamento: lev < 1e-6 ? 0 : lev, invalida: h.tipo === 'combinacao' && lev >= 1e-6 });
  }
  return out;
}

/** CSV da tabela por hipótese (separador ponto e vírgula, vírgula decimal). */
export function csvRadierHipoteses(linhas: LinhaRadierHipotese[]): string {
  const n = (v: number) => v.toFixed(3).replace('.', ',');
  return ['Hipótese;Tipo;σ máx (kPa);σ mín (kPa);Recalque (mm);Levantamento (mm);Situação', ...linhas.map((l) => [l.hipotese, l.tipo === 'caso' ? 'caso' : 'combinação', n(l.sigmaMax), n(l.sigmaMin), n(l.recalque), n(l.levantamento), l.invalida ? 'inválida (levantamento)' : 'ok'].join(';'))].join('\n');
}

/** Bitolas (mm) oferecidas no limite por diâmetro. */
export const BITOLAS_LIMITE_MM = [5, 6.3, 8, 10, 12.5, 16, 20, 25];
/** Área de aço por metro (cm²/m) de barras de diâmetro φ (mm) a cada s (cm): π·φ²/4 · 100/s. */
export const areaPorMetro = (phiMm: number, sCm: number) => (Math.PI * (phiMm / 10) ** 2 / 4) * (100 / sCm);
/** Maior espaçamento (cm, múltiplos de 2,5 entre 5 e 30) com que barras φ atendem a taxa As (cm²/m), ou null quando φ c/5 não basta. */
export function espacamentoParaArea(phiMm: number, As: number): number | null {
  for (let s = 30; s >= 5; s -= 2.5) if (areaPorMetro(phiMm, s) >= As - 1e-9) return s;
  return null;
}

/** Parte do campo com valor ≥ limite: área (m²), total (m²) e fração; o que ultrapassa a armadura adotada, a σadm ou a bitola escolhida. */
export function areaAcimaDoLimite(c: Campo, limite: number): { area: number; total: number; fracao: number } {
  const total = areaDoCampo(c), area = areaDasBandas(bandas(c, [], { min: limite }));
  return { area, total, fracao: total > 0 ? Math.min(1, area / total) : 0 };
}

/** Elemento (laje) sob o ponto (x, y) do mapa, para o clique (C12.15). */
export function elementoNoPonto(c: Campo, x: number, y: number): string | null {
  for (let t = 0; t < c.triangulos.length; t += 3) {
    const A = c.nos[c.triangulos[t]], B = c.nos[c.triangulos[t + 1]], C = c.nos[c.triangulos[t + 2]];
    const d = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
    if (Math.abs(d) < 1e-14) continue;
    const u = ((B[1] - C[1]) * (x - C[0]) + (C[0] - B[0]) * (y - C[1])) / d, v = ((C[1] - A[1]) * (x - C[0]) + (A[0] - C[0]) * (y - C[1])) / d;
    if (u >= -1e-9 && v >= -1e-9 && u + v <= 1 + 1e-9) return c.elementoDoTriangulo?.[t / 3] ?? null;
  }
  return null;
}
