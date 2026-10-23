// Resistência ao fogo (frente N2g): verificação em situação de incêndio pela NBR 15200, método tabular (lajes, vigas e
// pilares) e método analítico dos pilares. Opcional (estado-limite "incendio", desligado por padrão). Núcleo puro.
// Tabelas e fontes: `fogoTabelas.ts`. Valores sem fonte verificada ficam fora e "a confirmar" em `premissas.ts`.
import type { Dimensionamento } from './dimensionamento';
import type { OpcoesCalculo } from './opcoes';
import { vaos } from './lajes';
import { cobrimentoLaje, cobrimentoPilar, cobrimentoViga } from './materiais';
import {
  TRRF_TABELADOS, tabelasFogo, trrfSugerido, type ParBC, type SugestaoTrrf, type TabelaNervurada, type TabelaViga,
} from './fogoTabelas';
import { dimsSecao, pavimentosOrdenados, secaoNoLance, type BuildingModel, type Laje, type Viga, type Vinculo } from './types';
import { barArea } from '../concrete';
import type { FonteNormas } from '../normas';

// ---------------- dados do modelo ----------------

export type MaterialRevestimento = 'cal' | 'cimento' | 'protetor';
export const MATERIAIS_REVESTIMENTO: { v: MaterialRevestimento; rotulo: string }[] = [
  { v: 'cal', rotulo: 'Argamassa de cal e areia (67 %)' },
  { v: 'cimento', rotulo: 'Argamassa de cimento e areia (100 %)' },
  { v: 'protetor', rotulo: 'Protetor (gesso, vermiculita, fibras)' },
];
/** Revestimento de proteção: material e espessura (mm) de cada face exposta. `eficiencia` só no protetor (ensaio). */
export interface RevestimentoFogo { material: MaterialRevestimento; espessura: number; eficiencia?: number }
/** Dados por elemento (vigas, pilares e lajes por id): só o que difere do padrão. */
export interface FogoElementoConfig {
  trrf?: number; revestimento?: RevestimentoFogo;
  /** Pilares: faces expostas (1 a 4) e μfi. */
  faces?: number; muFi?: number;
  /** Lajes: função compartimentadora e laje lisa (sem vigas). */
  compartimentadora?: boolean; lisa?: boolean;
}
export interface FogoConfig {
  /** TRRF (min) por grupo de pavimentos. */
  trrf?: Record<string, number>;
  /** Divisão de ocupação (NBR 14432 / IT, ex. "A-2") e altura da edificação (m; ausente = cota mais alta − mais baixa). */
  ocupacao?: string; altura?: number;
  /** Revestimento por grupo; o do elemento prevalece. */
  revestimentos?: Record<string, RevestimentoFogo>;
  elementos?: Record<string, FogoElementoConfig>;
}

/** Espessura equivalente de concreto (mm) de um revestimento: espessura × eficiência relativa ao concreto. */
export function espessuraEquivalente(r?: RevestimentoFogo | null, normas?: FonteNormas): number {
  if (!r || !(r.espessura > 0)) return 0;
  const T = tabelasFogo(normas);
  const ef = r.material === 'protetor' ? r.eficiencia ?? T.EFICIENCIA_PROTETOR_2004 : T.EFICIENCIA_REVESTIMENTO[r.material];
  return r.espessura * ef;
}

// ---------------- avaliações (funções puras por elemento) ----------------

export interface AvaliacaoFogo {
  trrf: number;
  /** Maior TRRF tabelado atendido (0 = nem 30 min; no analítico, o TRF calculado, arredondado para baixo). */
  trf: number;
  /** Atende todas as tabelas até o limite de 120 min (o TRF real pode ser maior). */
  limiteTabela: boolean;
  ok: boolean;
  /** TRRF além das tabelas implementadas (120 min). */
  foraTabela: boolean;
  metodo: string; tabela: string; exigido: string; adotado: string;
  erros: string[]; avisos: string[];
}

const f0 = (x: number) => String(Math.round(x));
const f1 = (x: number) => (Math.round(x * 10) / 10).toString().replace('.', ',');
const TAB_2004 = 'NBR 15200:2004, 7.2';

/** Menor TRRF tabelado ≥ trrf (a norma não permite interpolar), ou null além de 120 min. */
const tabeladoPara = (trrf: number) => TRRF_TABELADOS.find((t) => t >= trrf) ?? null;
/** Maior TRRF tabelado atendido (pelo predicado) e se atende o último. */
function maiorAtendido(pass: (i: number) => boolean) {
  let trf = 0;
  TRRF_TABELADOS.forEach((t, i) => { if (pass(i)) trf = t; });
  return { trf, limiteTabela: pass(TRRF_TABELADOS.length - 1) };
}
const combos = (cs: readonly ParBC[]) => cs.map(([b, c]) => `${b}/${c}`).join(' ou ');

function fechar(a: Omit<AvaliacaoFogo, 'ok' | 'foraTabela' | 'erros' | 'avisos'> & { pass: (i: number) => boolean }): AvaliacaoFogo {
  const { pass, ...r } = a;
  const it = tabeladoPara(r.trrf), foraTabela = it === null;
  const ok = foraTabela ? false : pass(TRRF_TABELADOS.indexOf(it));
  const erros: string[] = [], avisos: string[] = [];
  if (foraTabela) avisos.push(`Fogo: TRRF de ${f0(r.trrf)} min fora das tabelas implementadas (${TAB_2004}, até 120 min); verifique pelo método simplificado ou geral [a confirmar a edição de 2012].`);
  else if (!ok) erros.push(`Fogo: TRRF de ${f0(r.trrf)} min não atendido (TRF ${r.trf} min; ${r.tabela}): exigido ${r.exigido}; adotado ${r.adotado}.`);
  return { ...r, ok, foraTabela, erros, avisos };
}

export interface EntradaViga {
  /** Largura (mm), c1 sem revestimento (mm; já a média quando há camadas), revestimento equivalente (mm) e TRRF (min). */
  b: number; c1: number; revestimento: number; trrf: number;
  /** Vigas contínuas ou de pórtico (Tabela 9) ou biapoiadas (Tabela 8). */
  continua: boolean;
}
/** Vigas: bmín/c1 e largura da alma (fogo em três faces: o revestimento soma nas duas laterais e embaixo). */
export function fogoViga(e: EntradaViga, normas?: FonteNormas): AvaliacaoFogo {
  const { VIGA_BIAPOIADA, VIGA_CONTINUA } = tabelasFogo(normas);
  const T: TabelaViga = e.continua ? VIGA_CONTINUA : VIGA_BIAPOIADA, d = e.revestimento;
  const b = e.b + 2 * d, c1 = e.c1 + d;
  const pass = (i: number) => b >= T.bw[i] && T.combinacoes[i].some(([bm, cm]) => b >= bm && c1 >= cm);
  const { trf, limiteTabela } = maiorAtendido(pass);
  const i = TRRF_TABELADOS.indexOf(tabeladoPara(e.trrf) ?? 120);
  return fechar({
    trrf: e.trrf, trf, limiteTabela, pass, metodo: 'tabular', tabela: `${TAB_2004}, Tabela ${e.continua ? 9 : 8} (vigas ${e.continua ? 'contínuas ou de pórtico' : 'biapoiadas'})`,
    exigido: `bmín/c1 ${combos(T.combinacoes[i])} mm e bw ≥ ${T.bw[i]} mm`, adotado: `b ${f0(b)} mm, c1 ${f1(c1)} mm${d ? ` (revestimento +${f1(d)} mm)` : ''}`,
  });
}

export interface EntradaLaje {
  tipo: 'macica' | 'lisa' | 'nervurada';
  /** Espessura (mm; capa nas nervuradas), c1 sem revestimento (mm), revestimento equivalente (mm), TRRF e função compartimentadora. */
  h: number; c1: number; revestimento: number; trrf: number; compartimentadora: boolean;
  /** Maciças: ly/lx do painel (> 2 = armada numa direção). */
  razao?: number;
  /** Nervuradas: largura da nervura (mm) e apoio (biapoiada = Tabela 6; contínua ou em 3/4 lados = Tabela 7). */
  bw?: number; biapoiada?: boolean;
}
/** Lajes (fogo por baixo: o revestimento soma na espessura e em c1). */
export function fogoLaje(e: EntradaLaje, normas?: FonteNormas): AvaliacaoFogo {
  const { LAJE_APOIADA, LAJE_LISA, NERVURADA_BIAPOIADA, NERVURADA_CONTINUA } = tabelasFogo(normas);
  const d = e.revestimento, c1 = e.c1 + d, h = e.h + d;
  const i = TRRF_TABELADOS.indexOf(tabeladoPara(e.trrf) ?? 120);
  const adot = `h ${f0(h)} mm, c1 ${f1(c1)} mm${d ? ` (revestimento +${f1(d)} mm)` : ''}`;
  const comp = e.compartimentadora ? 'com espessura mínima (compartimentação)' : 'só c1';
  if (e.tipo === 'lisa') {
    const pass = (k: number) => c1 >= LAJE_LISA.c1[k] && (!e.compartimentadora || h >= LAJE_LISA.h[k]);
    const { trf, limiteTabela } = maiorAtendido(pass);
    return fechar({ trrf: e.trrf, trf, limiteTabela, pass, metodo: `tabular, ${comp}`, tabela: `${TAB_2004}, Tabela 5 (lajes lisas ou cogumelo)`, exigido: `${e.compartimentadora ? `h ≥ ${LAJE_LISA.h[i]} mm e ` : ''}c1 ≥ ${LAJE_LISA.c1[i]} mm`, adotado: adot });
  }
  if (e.tipo === 'macica') {
    const r = e.razao ?? 1, col = r > 2 ? 'uma' : r > 1.5 ? 'duas20' : 'duas15';
    const pass = (k: number) => c1 >= LAJE_APOIADA.c1[col][k] && (!e.compartimentadora || h >= LAJE_APOIADA.h[k]);
    const { trf, limiteTabela } = maiorAtendido(pass);
    const arm = col === 'uma' ? 'armada numa direção' : `armada em duas direções, ly/lx ${col === 'duas15' ? '≤ 1,5' : '≤ 2'}`;
    return fechar({ trrf: e.trrf, trf, limiteTabela, pass, metodo: `tabular, ${comp}`, tabela: `${TAB_2004}, Tabela 4 (lajes apoiadas em vigas, ${arm})`, exigido: `${e.compartimentadora ? `h ≥ ${LAJE_APOIADA.h[i]} mm e ` : ''}c1 ≥ ${LAJE_APOIADA.c1[col][i]} mm`, adotado: adot });
  }
  // nervuradas: nervura (bmín/c1) e capa (espessura mínima da função corta-fogo; c1 da capa não verificado)
  const T: TabelaNervurada = e.biapoiada ? NERVURADA_BIAPOIADA : NERVURADA_CONTINUA, bw = e.bw ?? 0;
  const pass = (k: number) => T.nervuras[k].some(([bm, cm]) => bw >= bm && c1 >= cm) && (!e.compartimentadora || h >= T.capa[k][0]);
  const { trf, limiteTabela } = maiorAtendido(pass);
  return fechar({
    trrf: e.trrf, trf, limiteTabela, pass, metodo: `tabular, ${comp}`, tabela: `${TAB_2004}, Tabela ${e.biapoiada ? 6 : 7} (lajes nervuradas ${e.biapoiada ? 'biapoiadas' : 'em 3 ou 4 lados ou contínuas'})`,
    exigido: `nervura bmín/c1 ${combos(T.nervuras[i])} mm${e.compartimentadora ? `; capa h ≥ ${T.capa[i][0]} mm` : ''}`, adotado: `nervura ${f0(bw)} mm, c1 ${f1(c1)} mm; capa ${f0(h)} mm${d ? ` (revestimento +${f1(d)} mm)` : ''}`,
  });
}

export interface EntradaPilar {
  /** Lados (mm; circular: b = h = D), círculo?, c1 sem revestimento (mm), revestimento equivalente (mm), barras e As (mm²). */
  b: number; h: number; circular?: boolean; c1: number; revestimento: number; n: number; As: number;
  /** Comprimento efetivo em incêndio (m), excentricidade de 1ª ordem sem vento (mm; null = não avaliada), faces expostas, μfi, TRRF e método (0 analítico, 1 tabular). */
  lef: number; e: number | null; faces: number; muFi: number; trrf: number; metodo: 0 | 1;
}
/** TRF (min) do método analítico da NBR 15200:2012: 120·[(Rμ + Ra + Rl + Rb + Rn)/120]^1,8. */
export function trfAnalitico(p: { muFi: number; c1: number; lef: number; bLinha: number; n: number }): { trf: number; Rmu: number; Ra: number; Rl: number; Rb: number; Rn: number } {
  const Rmu = 83 * (1 - p.muFi), Ra = 1.6 * (p.c1 - 30), Rl = 9.6 * (5 - p.lef), Rb = p.bLinha > 450 ? 40.5 : 0.09 * p.bLinha, Rn = p.n > 4 ? 12 : 0;
  const soma = Rmu + Ra + Rl + Rb + Rn;
  return { trf: soma > 0 ? 120 * (soma / 120) ** 1.8 : 0, Rmu, Ra, Rl, Rb, Rn };
}
/** Largura efetiva b′ (mm): 2Ac/(b + h) para h ≤ 1,5b, 1,2b para h > 1,5b (b menor lado). */
export function larguraEfetiva(b: number, h: number, Ac?: number): number {
  const [m, M] = b <= h ? [b, h] : [h, b];
  return M > 1.5 * m ? 1.2 * m : (2 * (Ac ?? m * M)) / (m + M);
}

/** Pilares: uma face exposta (tabela da 2012), analítico (mais de uma face) ou tabular da edição de 2004 por μfi. */
export function fogoPilar(e: EntradaPilar, normas?: FonteNormas): AvaliacaoFogo {
  const { PILAR_UMA_FACE, PILAR_TABELA_2004 } = tabelasFogo(normas);
  const c1 = e.c1 + e.revestimento, bMin = Math.min(e.b, e.h);
  const adot = `${e.circular ? `D ${f0(e.b)}` : `${f0(e.b)} × ${f0(e.h)}`} mm, c1 ${f1(c1)} mm${e.revestimento ? ` (revestimento +${f1(e.revestimento)} mm, só em c1)` : ''}, ${e.faces} face${e.faces > 1 ? 's' : ''} exposta${e.faces > 1 ? 's' : ''}`;
  const it = tabeladoPara(e.trrf);
  if (e.faces === 1) {
    const T = PILAR_UMA_FACE, linha = T.find((x) => x.trrf >= e.trrf), pass = (k: number) => bMin >= T[k].par[0] && c1 >= T[k].par[1];
    let trf = 0; T.forEach((x, k) => { if (pass(k)) trf = x.trrf; });
    const ok = !!linha && pass(T.indexOf(linha));
    const erros: string[] = [], avisos: string[] = [];
    if (!linha) avisos.push(`Fogo: TRRF de ${f0(e.trrf)} min fora das tabelas implementadas (NBR 15200:2012 uma face, até 180 min); verifique por método específico.`);
    else if (!ok) erros.push(`Fogo: TRRF de ${f0(e.trrf)} min não atendido (TRF ${trf} min; NBR 15200:2012, pilar com uma face exposta): exigido bmín/c1 ${linha.par[0]}/${linha.par[1]} mm; adotado ${adot}.`);
    return { trrf: e.trrf, trf, limiteTabela: pass(T.length - 1), ok, foraTabela: !linha, metodo: 'tabular, uma face', tabela: 'NBR 15200:2012, pilares com uma face exposta', exigido: linha ? `bmín/c1 ${linha.par[0]}/${linha.par[1]} mm` : '—', adotado: adot, erros, avisos };
  }
  if (e.metodo === 1) {
    const T = PILAR_TABELA_2004, col = T.muFi.findIndex((m) => e.muFi <= m + 1e-9);
    if (col < 0) return { trrf: e.trrf, trf: 0, limiteTabela: false, ok: false, foraTabela: false, metodo: 'tabular (2004)', tabela: `${TAB_2004}, Tabela 10`, exigido: 'μfi ≤ 0,7', adotado: adot, erros: [`Fogo: TRRF de ${f0(e.trrf)} min não atendido (${TAB_2004}, Tabela 10 vale só para μfi ≤ 0,7; adotado ${f1(e.muFi)}): use o método analítico ou reduza μfi.`], avisos: [] };
    const pass = (k: number) => bMin >= T.porTrrf[k][col][0] && c1 >= T.porTrrf[k][col][1];
    const { trf, limiteTabela } = maiorAtendido(pass), i = TRRF_TABELADOS.indexOf(it ?? 120);
    return fechar({ trrf: e.trrf, trf, limiteTabela, pass, metodo: 'tabular (edição de 2004)', tabela: `${TAB_2004}, Tabela 10 (pilares, μfi ${T.muFi[col]})`, exigido: `bmín/c1 ${T.porTrrf[i][col][0]}/${T.porTrrf[i][col][1]} mm`, adotado: `${adot}, μfi ${f1(e.muFi)}` });
  }
  // analítico (NBR 15200:2012)
  const Ac = e.circular ? (Math.PI * e.b * e.b) / 4 : e.b * e.h, bL = larguraEfetiva(e.b, e.h, Ac);
  const r = trfAnalitico({ muFi: e.muFi, c1, lef: e.lef, bLinha: bL, n: e.n }), trf = Math.floor(r.trf + 1e-9);
  const fora: string[] = [];
  if (e.As / Ac > 0.04 + 1e-9) fora.push(`As/Ac ${f1((100 * e.As) / Ac)} % > 4 %`);
  if (c1 < 25 - 1e-9 || c1 > 80 + 1e-9) fora.push(`c1 ${f1(c1)} mm fora de 25 a 80 mm`);
  if (bL < 190 - 1e-9) fora.push(`b′ ${f0(bL)} mm < 190 mm`);
  if (e.e !== null && e.e > 0.15 * bMin + 1e-9) fora.push(`e ${f1(e.e)} mm > 0,15·b = ${f1(0.15 * bMin)} mm`);
  if (e.e === null) fora.push('e ≤ 0,15·b não verificada: todas as combinações determinantes levam vento, que a NBR 15200 manda desprezar na excentricidade (avalie a combinação sem vento)');
  if (e.lef > 6 + 1e-9) fora.push(`ℓef,fi ${f1(e.lef)} m > 6 m`);
  const ok = trf >= e.trrf, erros: string[] = [], avisos: string[] = [];
  const exigido = `TRF ≥ ${f0(e.trrf)} min`, adotado = `${adot}; ${e.n} barras, ℓef,fi ${f1(e.lef)} m, μfi ${f1(e.muFi)}, b′ ${f0(bL)} mm, ${e.e === null ? 'e não avaliada (combinações determinantes com vento)' : `e ${f1(e.e)} mm`}`;
  if (!ok) erros.push(`Fogo: TRRF de ${f0(e.trrf)} min não atendido (TRF ${trf} min; NBR 15200:2012, método analítico): ${adotado}.`);
  if (fora.length) avisos.push(`Fogo: método analítico fora dos limites da norma (${fora.join('; ')}); o TRF de ${trf} min não tem validade garantida.`);
  return { trrf: e.trrf, trf, limiteTabela: false, ok, foraTabela: false, metodo: 'analítico', tabela: 'NBR 15200:2012, método analítico dos pilares', exigido, adotado, erros, avisos };
}

// ---------------- c1 pela armadura adotada ----------------

/**
 * c1 (mm) das barras inferiores de uma viga: cobrimento + φt + φ/2, com a média (ponderada pela área) das camadas e
 * das distâncias às faces laterais quando há mais de uma camada (NBR 15200:2004, 7.2 e); o menor dos dois.
 * Barras divididas igualmente entre as camadas, afastadas de máx(20 mm; φ) na vertical [a confirmar].
 */
export function c1Viga(o: { cobInf: number; cobLat: number; phiT: number; phi: number; n: number; camadas: number; b: number }): number {
  const c0 = o.cobInf + o.phiT + o.phi / 2, xa = o.cobLat + o.phiT + o.phi / 2, av = Math.max(20, o.phi);
  const camadas = Math.max(1, Math.min(o.camadas, o.n)), base = Math.floor(o.n / camadas), extra = o.n - base * camadas;
  let sv = 0, sh = 0;
  for (let k = 0; k < camadas; k++) {
    const m = base + (k < extra ? 1 : 0);
    sv += m * (c0 + k * (o.phi + av));
    for (let i = 0; i < m; i++) { const x = m === 1 ? o.b / 2 : xa + (i * (o.b - 2 * xa)) / (m - 1); sh += Math.min(x, o.b - x); }
  }
  return Math.min(sv / o.n, sh / o.n);
}

// ---------------- orquestração ----------------

export interface FogoElemento {
  tipo: 'viga' | 'pilar' | 'laje'; id: string; nome: string; pavimento?: string; grupo: string;
  trrf: number; origemTrrf: 'elemento' | 'grupo' | 'ocupacao' | 'padrao';
  trf: number; limiteTabela: boolean; folga: number;
  metodo: string; tabela: string; exigido: string; adotado: string;
  /** Espessura equivalente do revestimento (mm). */
  revestimento: number;
  status: 'ok' | 'review' | 'fail'; mensagens: string[];
}
export interface ResultadoFogo {
  /** TRRF e origem por grupo de pavimentos. */
  grupos: { grupo: string; nome: string; trrf: number; origem: FogoElemento['origemTrrf'] }[];
  /** Sugestão pela ocupação e altura (NBR 14432/IT), quando a ocupação foi informada. */
  sugestao?: SugestaoTrrf & { divisao: string; altura: number };
  elementos: FogoElemento[];
  resumo: { total: number; ok: number; revisar: number; naoAtende: number };
}

/** Altura da edificação (m): a informada ou a diferença entre o pavimento mais alto e o mais baixo. */
export function alturaDaEdificacao(b: BuildingModel): number {
  if (b.fogo?.altura !== undefined) return b.fogo.altura;
  const ps = pavimentosOrdenados(b);
  return ps.length ? Math.max(0, ps[ps.length - 1].cota - ps[0].cota) : 0;
}
/** Sugestão de TRRF pela ocupação informada (null sem ocupação ou divisão desconhecida). */
export function sugestaoTrrf(b: BuildingModel): (SugestaoTrrf & { divisao: string; altura: number }) | null {
  const dv = b.fogo?.ocupacao;
  if (!dv) return null;
  const altura = alturaDaEdificacao(b), s = trrfSugerido(dv, altura, b);
  return s ? { ...s, divisao: dv, altura } : null;
}
/** TRRF de um grupo (min) e de onde veio: do grupo, da ocupação (NBR 14432/IT) ou o padrão das opções. */
export function trrfDoGrupo(b: BuildingModel, op: Pick<OpcoesCalculo, 'fogoTRRF'>, grupo: string): { trrf: number; origem: FogoElemento['origemTrrf'] } {
  const g = b.fogo?.trrf?.[grupo];
  if (g !== undefined) return { trrf: g, origem: 'grupo' };
  const s = sugestaoTrrf(b);
  if (s?.trrf != null) return { trrf: s.trrf, origem: 'ocupacao' };
  return { trrf: op.fogoTRRF, origem: 'padrao' };
}

/**
 * Nota das pranchas (notas gerais): TRRF por grupo, métodos e revestimentos. Vazia com a verificação desligada
 * (estado "incendio" é lido por quem chama).
 */
export function notaFogo(b: BuildingModel, op: Pick<OpcoesCalculo, 'fogoTRRF' | 'fogoPilarMetodo'>): string {
  const grupos = [...new Set(b.pavimentos.map((p) => p.grupo))].map((g) => `${b.grupos.find((x) => x.id === g)?.nome ?? g} ${trrfDoGrupo(b, op, g).trrf} min`);
  const rev = Object.entries(b.fogo?.revestimentos ?? {}).map(([g, r]) => `${b.grupos.find((x) => x.id === g)?.nome ?? g}: ${f0(r.espessura)} mm de ${MATERIAIS_REVESTIMENTO.find((m) => m.v === r.material)!.rotulo.split(' (')[0].toLowerCase()}`);
  const pr = Object.keys(b.fogo?.elementos ?? {}).filter((id) => b.fogo!.elementos![id].revestimento).length;
  return `Resistência ao fogo (NBR 15200): TRRF ${grupos.join(', ')}; método tabular em lajes e vigas e ${op.fogoPilarMetodo ? 'tabular' : 'analítico'} em pilares${rev.length || pr ? `; revestimentos de proteção: ${[...rev, ...(pr ? [`${pr} elemento(s) com revestimento próprio`] : [])].join('; ')}` : ''}.`;
}

export interface ContextoFogo {
  /** Maior γz do vento (null sem vento): ℓef,fi reduzido só com γz ≤ 1,1. */
  gamaZmax: number | null;
  /** Bitola (mm) da armadura de laje maciça para As (m²/m) e espessura h (m). */
  phiLaje: (As: number, h: number) => number;
  /** A combinação (pelo nome) não leva vento? A NBR 15200 manda desprezar o vento na excentricidade e do pilar. */
  semVento?: (combinacao: string) => boolean;
}

/** Viga contínua ou de pórtico (Tabela 9): mais de um vão ou alguma ponta engastada; biapoiada só com as duas pontas articuladas. */
function vigaContinua(v: Viga, vaosN: number): boolean {
  const art = (e: number | undefined, vn: Vinculo | undefined) => (e ?? (vn === 'articulado' ? 0 : 1)) === 0;
  return vaosN > 1 || !(art(v.engasteIni, v.vinculoIni) && art(v.engasteFim, v.vinculoFim));
}

/** Laje maciça sem viga a menos de 15 cm de nenhuma aresta: lisa (Tabela 5) [a confirmar o critério]. */
function ehLisa(b: BuildingModel, l: Laje): boolean {
  return !b.vigas.some((v) => v.grupo === l.grupo && v.pontos.some((q) => l.contorno.some((a, k) => {
    const z = l.contorno[(k + 1) % l.contorno.length], dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2));
    return Math.hypot(a[0] + dx * t - q[0], a[1] + dy * t - q[1]) <= 0.15;
  })));
}

/** Há combinação determinante sem vento (então e pode ser avaliada)? */
const semV0 = (r: { determinantes?: { combinacao: string }[] }, ctx: ContextoFogo) => !!(r.determinantes ?? []).some((x) => (ctx.semVento ? ctx.semVento(x.combinacao) : true));

/** Verificação de incêndio de todos os elementos do dimensionamento. Chamar só com o estado "incendio" ativo. */
export function verificarFogo(b: BuildingModel, d: Dimensionamento, op: OpcoesCalculo, ctx: ContextoFogo, vaosDaViga: (v: Viga) => number): ResultadoFogo {
  const cfg = b.fogo, elementos: FogoElemento[] = [];
  const grupoNome = (g: string) => b.grupos.find((x) => x.id === g)?.nome ?? g;
  const revDe = (id: string, grupo: string) => espessuraEquivalente(cfg?.elementos?.[id]?.revestimento ?? cfg?.revestimentos?.[grupo], b);
  const trrfDe = (id: string, grupo: string) => { const t = cfg?.elementos?.[id]?.trrf; return t !== undefined ? { trrf: t, origem: 'elemento' as const } : trrfDoGrupo(b, op, grupo); };
  const add = (x: Omit<FogoElemento, 'trf' | 'limiteTabela' | 'folga' | 'metodo' | 'tabela' | 'exigido' | 'adotado' | 'status' | 'mensagens'>, a: AvaliacaoFogo) => {
    const status: FogoElemento['status'] = a.erros.length ? 'fail' : a.avisos.length ? 'review' : 'ok';
    elementos.push({ ...x, trf: a.trf, limiteTabela: a.limiteTabela, folga: a.trf - x.trrf, metodo: a.metodo, tabela: a.tabela, exigido: a.exigido, adotado: a.adotado, status, mensagens: [...a.erros, ...a.avisos] });
  };

  for (const r of d.vigas) {
    const v = b.vigas.find((x) => x.id === r.viga);
    if (!v) continue;
    const cob = cobrimentoViga(b, v.cobrimento), phi = r.arranjo.inf?.phi ?? 10, n = r.arranjo.inf?.n ?? 2;
    const camadas = Number(/\((\d+) camadas\)/.exec(r.barrasInf)?.[1] ?? 1), t = trrfDe(v.id, v.grupo), rev = revDe(v.id, v.grupo);
    const c1 = c1Viga({ cobInf: cob.inf * 1000, cobLat: cob.lat * 1000, phiT: r.arranjo.estribo?.phi ?? 5, phi, n, camadas, b: r.b * 1000 });
    add({ tipo: 'viga', id: v.id, nome: r.nome, grupo: v.grupo, trrf: t.trrf, origemTrrf: t.origem, revestimento: rev },
      fogoViga({ b: r.b * 1000, c1, revestimento: rev, trrf: t.trrf, continua: vigaContinua(v, vaosDaViga(v)) }, b));
  }

  for (const r of d.lajes) {
    const l = b.lajes.find((x) => x.id === r.laje);
    if (!l) continue;
    const t = trrfDe(l.id, l.grupo), rev = revDe(l.id, l.grupo), comp = cfg?.elementos?.[l.id]?.compartimentadora ?? !!op.fogoLajeCompartimentadora;
    const cov = cobrimentoLaje(b, l.cobrimento).inf * 1000;
    const x = { tipo: 'laje' as const, id: l.id, nome: r.nome, pavimento: r.pavimento, grupo: l.grupo, trrf: t.trrf, origemTrrf: t.origem, revestimento: rev };
    if (l.tipo.tipo === 'alveolar') continue; // E3e: a NBR 15200 não tem tabela para alveolares; a resistência ao fogo da placa é do fabricante (premissa 'alveolares')
    if (l.tipo.tipo === 'trelicada') {
      const vg = d.vigotas?.find((y) => y.laje === l.id);
      if (!vg) continue;
      add(x, fogoLaje({ tipo: 'nervurada', h: l.tipo.capa * 1000, c1: (vg.h - vg.d.inf) * 1000, revestimento: rev, trrf: t.trrf, compartimentadora: comp, bw: vg.bw * 1000, biapoiada: !!l.vigotasBiapoiadas }, b));
      continue;
    }
    const Asmax = Math.max(...r.As.pos) * 1e-4, phi = Asmax > 0 ? ctx.phiLaje(Asmax, r.h) : 8;
    const lisa = cfg?.elementos?.[l.id]?.lisa ?? ehLisa(b, l), [v1, v2] = vaos(l), razao = Math.max(v1, v2) / Math.max(1e-6, Math.min(v1, v2));
    // c1 = cobrimento + φ/2; em duas direções, a média das duas camadas (+ φ/2) [a confirmar]
    add(x, fogoLaje({ tipo: lisa ? 'lisa' : 'macica', h: r.h * 1000, c1: cov + phi / 2 + (lisa || razao <= 2 ? phi / 2 : 0), revestimento: rev, trrf: t.trrf, compartimentadora: comp, razao }, b));
  }

  const ps = pavimentosOrdenados(b), ultimo = ps[ps.length - 1]?.id;
  for (const r of d.pilares) {
    const p = b.pilares.find((x) => x.id === r.pilar), pav = b.pavimentos.find((x) => x.id === r.pavimentoId);
    if (!p || !pav || !r.arranjo) continue;
    const sec = secaoNoLance(p, pav.id), [w, h] = dimsSecao(sec), a = r.arranjo;
    const n = a.n ?? (a.nb !== undefined && a.nh !== undefined ? (a.nbS !== undefined || a.nhD !== undefined ? 4 + (a.nb - 2) + ((a.nbS ?? a.nb) - 2) + (a.nh - 2) + ((a.nhD ?? a.nh) - 2) : 2 * a.nb + 2 * (a.nh - 2)) : 4);
    const ce = cfg?.elementos?.[p.id], t = trrfDe(p.id, pav.grupo), rev = revDe(p.id, pav.grupo);
    const c1 = cobrimentoPilar(b, p.cobrimento) * 1000 + a.estribo.phi + a.phi / 2;
    const le = Math.max(r.le[0], r.le[1]), reduz = !!op.fogoLefReducao && (ctx.gamaZmax === null || ctx.gamaZmax <= 1.1 + 1e-9);
    const lef = reduz ? le * (pav.id === ultimo ? 0.7 : 0.5) : le;
    let e: number | null = semV0(r, ctx) ? 0 : null;
    // sem as combinações de vento (a NBR 15200 o despreza); se todas as determinantes o levam, e não é avaliada
    const dets = r.determinantes ?? [], semV = ctx.semVento ? dets.filter((x) => ctx.semVento!(x.combinacao)) : dets;
    for (const dt of semV) if (dt.Nd > 1e-6) e = Math.max(e ?? 0, (Math.hypot(Math.max(...dt.Mu.map(Math.abs)), Math.max(...dt.Mv.map(Math.abs))) / dt.Nd) * 1000);
    add({ tipo: 'pilar', id: p.id, nome: r.nome, pavimento: r.pavimento, grupo: pav.grupo, trrf: t.trrf, origemTrrf: t.origem, revestimento: rev },
      fogoPilar({ b: w * 1000, h: h * 1000, circular: sec.tipo === 'circ', c1, revestimento: rev, n, As: n * barArea(a.phi) * 1e6, lef, e, faces: ce?.faces ?? op.fogoFacesPilar, muFi: ce?.muFi ?? op.fogoMuFi, trrf: t.trrf, metodo: op.fogoPilarMetodo ? 1 : 0 }, b));
  }

  const grupos = [...new Set(b.pavimentos.map((p) => p.grupo))].map((g) => ({ grupo: g, nome: grupoNome(g), ...trrfDoGrupo(b, op, g) }));
  const sug = sugestaoTrrf(b);
  return {
    grupos, ...(sug ? { sugestao: sug } : {}), elementos,
    resumo: { total: elementos.length, ok: elementos.filter((x) => x.status === 'ok').length, revisar: elementos.filter((x) => x.status === 'review').length, naoAtende: elementos.filter((x) => x.status === 'fail').length },
  };
}
