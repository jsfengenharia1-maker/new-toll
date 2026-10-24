// Escadas (frente E4d): armadura e detalhamento dos lances e patamares calculados na E4c (`escadasCalculo.ts`).
//
// Esforços: as cascas de cada lance dão (Mx, My, Mxy, Qx, Qy) por elemento, com x no sentido do trecho (subida) e y transversal.
// Em cada elemento aplicam-se as combinações ELU γg·G + γq·Q e γg·G (a sobrecarga pode aliviar) e o Wood-Armer (`woodArmer`, o mesmo
// das lajes) dá os momentos das armaduras inferior e superior nas duas direções. Cada trecho (inclinado ou patamar) é dividido em
// faixas ao longo do vão (≈ 0,6 m, no máximo 8); a necessidade de cada faixa é o máximo dos elementos dela.
//
// Dimensionamento como laje maciça (NBR 6118, 17.2 e 19): flexão de faixa de 1 m (`beamFlexure`), ρmín das lajes (opção `lajeTaxaMin`),
// armadura de distribuição ≥ fração da principal, ≥ 0,9 cm²/m e ≥ 0,5·As,mín (20.1; opção `escadaDistribuicao`), bitolas e espaçamentos
// pelas opções e pela tabela de armadura das lajes (`escolherBarrasLaje`), cortante sem armadura transversal (19.4.1: VRd1, VRd2 e, com
// h ≥ 15 cm, armadura transversal pela 19.4.2), abertura de fissuras na combinação frequente (17.3.3.2) e flecha pelo fator das lajes.
//
// Hipóteses (todas "a confirmar", ver `docs/pendencias-usuario.md`):
// - Esforço normal desprezado (apoio móvel em cima, E4c): flexão simples. Com `escadaApoioFixoDois` o normal existe e é desprezado aqui.
// - A armadura principal inferior é contínua no trecho, pelo maior valor das faixas; a distribuição e as barras superiores seguem
//   a necessidade de cada faixa (opção `escadaIgualarSecoes` iguala tudo ao maior valor).
// - Encontro trecho-patamar (quina): as barras tracionadas não passam em linha reta pela face côncava (a resultante destacaria o
//   cobrimento, NBR 6118, 18.3.2.4 [a confirmar o item]); toda barra que chega à quina cruza a linha e se ancora o comprimento
//   necessário (lb,nec) do outro lado, nas duas faces (a favor da segurança na face convexa).
// - Ancoragem: reta se couber (lb,nec); com gancho de 90° (0,7·lb,nec, ≥ 8φ e 6 cm) ou com dobra (perna prolongada) se faltar espaço.
// - Esperas: traspasse de todas as barras na mesma seção (α0t = 2,0, Tabela 9.4), l0 = α0t·lb,nec (≥ l0,mín: 0,3·α0t·lb, 15φ, 20 cm).
// - Barras ancoradas na fundação (apoio no nível de fundação): descem a profundidade informada menos o cobrimento.
// Núcleo puro; kN, m (cm²/m nas áreas por metro).
import { barArea, beamFlexure, crackLimit, crackWidth } from '../concrete';
import type { P } from '../geom/faces';
import { alfa0t, ganchoNoventa, lbBasico } from './detalhamento';
import { lbNecessario, escolherBarrasLaje } from './detalhamentoLajes';
import { woodArmer } from './woodArmer';
import type { ApoioCalculado, ElementoEscada, ResultadoEscadas, ResultadoLance } from './escadasCalculo';
import { geometriaEscadas, type BloqueioEscada, type Escada, type FamiliaEscada } from './escadas';
import { acoDe, cobrimentoLaje, concretoDe, gamas } from './materiais';
import { OPCOES_PADRAO_CALCULO, type OpcoesCalculo } from './opcoes';
import { linhaLajes, tabelaDe, type TabelaLajes } from './tabelasArmadura';
import { casosDaObra, geometriaViga, type BuildingModel, type Viga } from './types';
import { vcLaje } from './puncao';
import { vrd1 } from './vigotas';

const EPS = 1e-9;
const CAA_NUM = { I: 1, II: 2, III: 3, IV: 4 } as const;
const FOLGA_ARMADURA = 0.005; // d = h − cobrimento − 5 mm (como nas lajes)
const AS_DIST_MIN = 0.9; // cm²/m (NBR 6118, 20.1)
const S_DIST_MAX = 0.33; // m (20.1)
const PESO_ACO = 7850;
const pesoLinear = (phi: number) => barArea(phi) * PESO_ACO;
const arred = (x: number, passo = 0.05) => Math.ceil(x / passo - 1e-9) * passo;
const r2 = (x: number, d = 2) => +x.toFixed(d);
const dot = (a: P, b: P) => a[0] * b[0] + a[1] * b[1];

// ---------------------------------------------------------------- tipos

export type TipoBarraEscada = 'principal' | 'distribuicao' | 'negativo' | 'passador' | 'espera';
export interface BarraEscada {
  /** Posição dentro do lance (N1, N2, …). */
  pos: string;
  trecho: string;
  tipo: TipoBarraEscada;
  familia: FamiliaEscada | 'espera';
  face: 'inf' | 'sup';
  /** L = barras no sentido do trecho; T = transversais. */
  direcao: 'L' | 'T';
  phi: number;
  /** Espaçamento (m). */
  s: number;
  n: number;
  /** Comprimento de cada barra (m), arredondado a 5 cm, com ancoragens, gancho e dobra. */
  comprimento: number;
  /** Extensão horizontal da barra no trecho (m, a partir do início do trecho) e área necessária e efetiva (cm²/m). */
  u: [number, number];
  AsNec: number;
  AsEf: number;
  /** Ponta com gancho ou dobra (m de barra desenvolvida por ponta; 0 = reta). */
  ganchos: [number, number];
  bloqueada?: true;
  nota?: string;
}

export interface FaixaEscada {
  u0: number; u1: number;
  /** Momentos de cálculo (kN·m/m, valor absoluto) das armaduras inferior (x, y) e superior (x, y) e cortante (kN/m). */
  mInf: [number, number]; mSup: [number, number]; V: number;
  /** Armaduras necessárias (cm²/m): inferior x e y, superior x e y. */
  AsInf: [number, number]; AsSup: [number, number];
}

export interface AncoragemEscada { tipo: 'reta' | 'gancho' | 'dobra'; lbNec: number; disponivel: number; /** comprimento reto embutido (m) */ embutido: number; /** gancho e prolongamento (m) */ perna: number; /** comprimento somado à barra (m) */ adicional: number }

export interface LigacaoEscada {
  tipo: 'apoio-inicial' | 'apoio-final' | 'quina';
  rotulo: string;
  /** Texto do tipo de apoio (viga, fundação, quina) e a face côncava (quina). */
  descricao: string;
  ancoragem?: AncoragemEscada;
  /** Esperas (apoio inicial): traspasse l0 (m). */
  traspasse?: number;
}

export interface CortanteEscada { VSd: number; VRd1: number; VRd2: number; /** cm²/m² */ Asw: number; ok: boolean; mensagem?: string }

export interface TrechoArmadura {
  chave: string;
  tipo: 'lance' | 'patamar';
  /** Comprimento horizontal e inclinado (m), largura (m), espessura (m) e alturas úteis (m). */
  comprimento: number; comprimentoInclinado: number; largura: number; h: number; dInf: number; dSup: number;
  faixas: FaixaEscada[];
  /** Armadura principal inferior (cm²/m): necessária e mínima. */
  AsMin: number;
  cortante: CortanteEscada;
  /** Abertura de fissuras (mm) e limite. */
  wk: number; wkLim: number;
  barras: BarraEscada[];
}

export interface ResultadoArmaduraLance {
  escada: string; nome: string; lance: number; pavimento?: string; pavimentoTopo?: string;
  espessura: number;
  trechos: TrechoArmadura[];
  ligacoes: LigacaoEscada[];
  /** Flecha total (mm) com o fator das lajes e limite (mm). */
  flecha: { total: number; limite: number; vao: number; fator: number; ok: boolean };
  /** Peso de aço do lance (kg, sem perdas). */
  peso: number;
  bloqueado: boolean;
  status: 'ok' | 'fail';
  mensagens: string[];
  erro?: string;
}

export interface LinhaResumoAco { aco: string; phi: number; comprimento: number; peso: number; pesoComPerdas: number }
export interface ArmaduraEscadas { lances: ResultadoArmaduraLance[]; resumoAco: LinhaResumoAco[] }

// ---------------------------------------------------------------- utilidades de cálculo

/** Fator da flecha diferida na NBR 6118 (17.3.2.1.2): Δξ = ξ(70 meses) − ξ(t0), com ξ(t) = 0,68·0,996^t·t^0,32 (t ≤ 70). */
export function deltaXi(t0Meses: number): number {
  const xi = (t: number) => (t > 70 ? 2 : 0.68 * 0.996 ** t * t ** 0.32);
  return xi(70) - xi(Math.min(70, t0Meses));
}

/**
 * Ancoragem de uma barra tracionada no apoio (NBR 6118, 9.4.2.5): reta se o comprimento reto disponível (disponível − cobrimento)
 * cobre lb,nec; com gancho de 90° se cobrir 0,7·lb,nec (≥ r + 5,5φ = 8φ e 6 cm); senão com dobra, prolongando a perna.
 */
export function ancorarBarra(lbNec: number, disponivel: number, phiMm: number, cob: number): AncoragemEscada {
  const reto = Math.max(0, disponivel - cob), g = ganchoNoventa(phiMm), lbG = Math.max(0.7 * lbNec, (8 * phiMm) / 1000, 0.06);
  if (reto >= lbNec - EPS) return { tipo: 'reta', lbNec, disponivel, embutido: lbNec, perna: 0, adicional: lbNec };
  if (reto >= lbG - EPS) return { tipo: 'gancho', lbNec, disponivel, embutido: reto, perna: g, adicional: reto + g };
  const extra = lbG - reto;
  return { tipo: 'dobra', lbNec, disponivel, embutido: reto, perna: g + extra, adicional: reto + g + extra };
}

/** Armadura de flexão (cm²/m) de uma faixa de 1 m para o momento de cálculo `M` (kN·m/m): 0 sem momento. `ok` falso: seção insuficiente. */
export function asFlexaoEscada(M: number, h: number, d: number, c: ReturnType<typeof concretoDe>, fyd: number): { As: number; ok: boolean } {
  if (!(M > EPS)) return { As: 0, ok: true };
  const r = beamFlexure({ kind: 'rect', bw: 1, h }, false, M, d, 0.02, c, fyd);
  return { As: (r.As + (r.double ? r.As2 : 0)) * 1e4, ok: r.ok };
}

/** Momentos de cálculo do elemento: envoltória das combinações γg·G + γq·Q e γg·G (Wood-Armer): inferior [x, y] e superior [x, y] em valor absoluto. */
export function momentosDoElemento(el: Pick<ElementoEscada, 'G' | 'Q'>, fg: number, fq: number): { inf: [number, number]; sup: [number, number] } {
  const inf: [number, number] = [0, 0], sup: [number, number] = [0, 0];
  for (const f of [fq, 0]) {
    const wa = woodArmer(fg * el.G[3] + f * el.Q[3], fg * el.G[4] + f * el.Q[4], fg * el.G[5] + f * el.Q[5]);
    for (const k of [0, 1]) { inf[k] = Math.max(inf[k], wa.inf[k]); sup[k] = Math.max(sup[k], -wa.sup[k]); }
  }
  return { inf, sup };
}

const cortanteDoElemento = (el: Pick<ElementoEscada, 'G' | 'Q'>, fg: number, fq: number) => Math.max(...[fq, 0].map((f) => Math.hypot(fg * el.G[6] + f * el.Q[6], fg * el.G[7] + f * el.Q[7])));

// ---------------------------------------------------------------- geometria dos trechos

interface RetGeo { tipo: 'lance' | 'patamar'; trecho: number; chave: string; dir: P; nrm: P; u0: number; u1: number; v0: number; v1: number; L: number; B: number; declive: number; fInc: number }

function geometriaRets(l: ResultadoLance): RetGeo[] {
  const rets = l.descricao?.rets ?? [];
  let dirAnt: P = [1, 0];
  return rets.map((r) => {
    let dir = dirAnt, declive = 0;
    if (r.tipo === 'lance') {
      const dx = r.c[1][0] - r.c[0][0], dy = r.c[1][1] - r.c[0][1], n = Math.hypot(dx, dy);
      dir = [dx / n, dy / n]; dirAnt = dir; declive = (r.z[1] - r.z[0]) / n;
    }
    const nrm: P = [-dir[1], dir[0]], us = r.c.map((q) => dot(q, dir)), vs = r.c.map((q) => dot(q, nrm));
    const u0 = Math.min(...us), u1 = Math.max(...us), v0 = Math.min(...vs), v1 = Math.max(...vs);
    return { tipo: r.tipo, trecho: r.trecho, chave: `${r.tipo === 'lance' ? 'L' : 'P'}${r.trecho + 1}`, dir, nrm, u0, u1, v0, v1, L: u1 - u0, B: v1 - v0, declive, fInc: Math.sqrt(1 + declive * declive) };
  });
}

/** Viga do grupo cujo eixo passa pelo meio da linha de apoio (paralela a ela). */
function vigaDeApoio(b: BuildingModel, ap: ApoioCalculado): Viga | undefined {
  if (!ap.grupo || ap.grupo === 'fundacao') return undefined;
  const m: P = [(ap.a[0] + ap.b[0]) / 2, (ap.a[1] + ap.b[1]) / 2], n = Math.hypot(ap.b[0] - ap.a[0], ap.b[1] - ap.a[1]) || 1, u: P = [(ap.b[0] - ap.a[0]) / n, (ap.b[1] - ap.a[1]) / n];
  for (const v of b.vigas.filter((x) => x.grupo === ap.grupo)) {
    const e = geometriaViga(v).eixo;
    for (let i = 0; i + 1 < e.length; i++) {
      const dx = e[i + 1][0] - e[i][0], dy = e[i + 1][1] - e[i][1], L = Math.hypot(dx, dy);
      if (L < EPS) continue;
      const t: P = [dx / L, dy / L], rel: P = [m[0] - e[i][0], m[1] - e[i][1]], s = dot(rel, t), dist = Math.abs(rel[0] * t[1] - rel[1] * t[0]);
      if (Math.abs(t[0] * u[1] - t[1] * u[0]) < 0.2 && s >= -0.05 && s <= L + 0.05 && dist <= v.secao.b / 2 + 0.05) return v;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------- armadura de um lance

interface Ctx {
  b: BuildingModel; op: OpcoesCalculo; e: Escada | undefined;
  c: ReturnType<typeof concretoDe>; fydI: number; fydS: number; ca60I: boolean; ca60S: boolean;
  fg: number; fq: number; psi1: number; psi2: number; cobI: number; cobS: number; caa: 1 | 2 | 3 | 4; wkLim: number;
  tabela: TabelaLajes;
  bloq: BloqueioEscada[];
  /** Maior vão entre apoios por lance (`escada|índice`), da geometria (E4a). */
  vaos: Map<string, number>;
}

function contexto(b: BuildingModel, op: OpcoesCalculo, e: Escada | undefined, vaos: Map<string, number>): Ctx {
  const gm = gamas(b), cob = cobrimentoLaje(b), q = casosDaObra(b).find((x) => x.id === 'Q'), psi = q?.psi ?? b.norma.psiQ ?? [0.5, 0.4, 0.3];
  const cobE = op.escadaCobrimento > 0 ? op.escadaCobrimento / 100 : undefined;
  return {
    b, op, e, c: concretoDe(b, 'laje'), fydI: acoDe(b, 'escadaInf').fyd, fydS: acoDe(b, 'escadaSup').fyd, ca60I: acoDe(b, 'escadaInf').aco === 'CA-60', ca60S: acoDe(b, 'escadaSup').aco === 'CA-60',
    fg: gm.g, fq: gm.q, psi1: psi[1], psi2: psi[2], cobI: cobE ?? cob.inf, cobS: cobE ?? cob.sup, caa: CAA_NUM[b.norma.caa], wkLim: op.limiteFissura || crackLimit(CAA_NUM[b.norma.caa]),
    tabela: tabelaDe(b, 'lajes', e?.armadura?.tabela), bloq: e?.armadura?.bloqueadas ?? [], vaos,
  };
}

interface Escolha { phi: number; s: number; As: number; cabe: boolean; bloqueada?: true; aviso?: string }

/** Bitola e espaçamento para a área necessária (cm²/m); um bloqueio da escada fixa o par e só verifica. */
function escolher(ctx: Ctx, AsNec: number, h: number, face: 'inf' | 'sup', secundaria: boolean, bl?: BloqueioEscada): Escolha {
  if (bl) {
    const As = (barArea(bl.phi) / bl.s) * 1e4;
    return { phi: bl.phi, s: bl.s, As, cabe: As >= AsNec - 1e-6, bloqueada: true, ...(As < AsNec - 1e-6 ? { aviso: `armadura bloqueada insuficiente (${r2(As)} < ${r2(AsNec)} cm²/m)` } : {}) };
  }
  const op = ctx.op, linha = linhaLajes(ctx.tabela, h), ca60 = face === 'inf' ? ctx.ca60I : ctx.ca60S;
  const smax = secundaria ? S_DIST_MAX : Math.min(2 * h, 0.2);
  const r = escolherBarrasLaje(AsNec / 1e4, h, smax, op.lajeEspacamentoMinimo / 100, op.lajeBitolaMinima, ca60, linha);
  return { phi: r.phi, s: r.s, As: r.As * 1e4, cabe: r.cabe };
}

/** Espaçamentos múltiplos (C8.59): o maior vira múltiplo do menor, arredondado para baixo (a armadura só aumenta). */
function multiplo(a: Escolha, z: Escolha): void {
  if (a.bloqueada || z.bloqueada) return;
  const [pequeno, grande] = a.s <= z.s ? [a, z] : [z, a];
  const k = Math.floor(grande.s / pequeno.s + 1e-6);
  if (k >= 1 && Math.abs(k * pequeno.s - grande.s) > 1e-6) { grande.s = r2(k * pequeno.s, 4); grande.As = (barArea(grande.phi) / grande.s) * 1e4; }
}

function pesoDe(bs: BarraEscada[]) { return bs.reduce((t, x) => t + x.n * x.comprimento * pesoLinear(x.phi), 0); }

function armarLance(ctx: Ctx, l: ResultadoLance): ResultadoArmaduraLance {
  const { b, op, c } = ctx, msgs: string[] = [];
  const base = { escada: l.escada, nome: l.nome, lance: l.lance, pavimento: l.pavimento, pavimentoTopo: l.pavimentoTopo, espessura: l.espessura };
  const vazio = (erro: string): ResultadoArmaduraLance => ({ ...base, trechos: [], ligacoes: [], flecha: { total: 0, limite: 0, vao: 0, fator: 0, ok: true }, peso: 0, bloqueado: false, status: 'fail', mensagens: [erro], erro });
  if (l.erro) return vazio(`sem armadura: ${l.erro}`);
  const rets = geometriaRets(l);
  if (!rets.length || !l.elems.length) return vazio('sem armadura: o cálculo do lance não tem elementos');
  const h = l.espessura, amin = (op.lajeTaxaMin > 0 ? op.lajeTaxaMin / 100 : 0.0015) * h * 1e4; // cm²/m
  const dI = h - ctx.cobI - FOLGA_ARMADURA, dS = h - ctx.cobS - FOLGA_ARMADURA, cobLat = Math.min(ctx.cobI, ctx.cobS);
  const lbI = (phi: number) => lbBasico(phi, c, ctx.fydI, true, ctx.ca60I), lbS = (phi: number) => lbBasico(phi, c, ctx.fydS, true, ctx.ca60S);
  const lajeBorda = op.lajeNegativoBorda / 100, dec = op.lajeDecalagem;
  const dado = ctx.e?.armadura ?? {};
  const dispViga = (dado.ancoragemViga ?? op.escadaAncoragemViga) / 100, profFund = (dado.profundidadeFundacao ?? op.escadaProfundidadeFundacao) / 100;
  const apI = l.apoios.find((a) => a.id === 'inf'), apS = l.apoios.find((a) => a.id === 'sup');
  const vigaI = apI ? vigaDeApoio(b, apI) : undefined, vigaS = apS ? vigaDeApoio(b, apS) : undefined;
  const naFund = apI?.grupo === 'fundacao';
  const dispIni = naFund ? Math.max(0, profFund) : Math.max(dispViga, vigaI?.secao.b ?? 0), dispFim = Math.max(dispViga, vigaS?.secao.b ?? 0);
  const ligacoes: LigacaoEscada[] = [];
  const trechos: TrechoArmadura[] = [];
  let seq = 0;
  const nova = (t: TrechoArmadura, x: Omit<BarraEscada, 'pos' | 'trecho' | 'ganchos'> & { ganchos?: [number, number] }) => { t.barras.push({ ...x, pos: `N${++seq}`, trecho: t.chave, ganchos: x.ganchos ?? [0, 0] }); };
  const nAcross = (B: number, s: number) => Math.max(1, Math.floor((B - 2 * cobLat) / s + 1e-6) + 1);
  const nAlong = (len: number, s: number) => Math.max(1, Math.floor(len / s + 1e-6) + 1);
  const bloqueioDe = (chave: string, familia: FamiliaEscada) => ctx.bloq.find((x) => x.lance === l.lance && x.trecho === chave && x.familia === familia);
  const vaoMax = ctx.vaos.get(`${l.escada}|${l.lance - 1}`) ?? Math.max(...rets.filter((r) => r.tipo === 'lance').map((r) => r.L), 0);

  rets.forEach((g, j) => {
    const els = l.elems.filter((el) => el.tipo === g.tipo && el.trecho === g.trecho);
    const nb = Math.max(1, Math.min(8, Math.round(g.L / 0.6))), w = g.L / nb;
    const faixas: FaixaEscada[] = Array.from({ length: nb }, (_, k) => ({ u0: k * w, u1: (k + 1) * w, mInf: [0, 0], mSup: [0, 0], V: 0, AsInf: [0, 0], AsSup: [0, 0] }));
    const mkI: [number, number][] = faixas.map(() => [0, 0]), mkS: [number, number][] = faixas.map(() => [0, 0]);
    let ok = true;
    for (const el of els) {
      const u = dot([el.centro[0], el.centro[1]], g.dir) - g.u0, k = Math.max(0, Math.min(nb - 1, Math.floor((u / g.L) * nb))), f = faixas[k];
      const m = momentosDoElemento(el, ctx.fg, ctx.fq), s = momentosDoElemento(el, 1, ctx.psi1);
      for (const i of [0, 1] as const) { f.mInf[i] = Math.max(f.mInf[i], m.inf[i]); f.mSup[i] = Math.max(f.mSup[i], m.sup[i]); mkI[k][i] = Math.max(mkI[k][i], s.inf[i]); mkS[k][i] = Math.max(mkS[k][i], s.sup[i]); }
      f.V = Math.max(f.V, cortanteDoElemento(el, ctx.fg, ctx.fq));
    }
    const trecho: TrechoArmadura = { chave: g.chave, tipo: g.tipo, comprimento: g.L, comprimentoInclinado: g.L * g.fInc, largura: g.B, h, dInf: dI, dSup: dS, faixas, AsMin: amin, cortante: { VSd: 0, VRd1: 0, VRd2: 0, Asw: 0, ok: true }, wk: 0, wkLim: ctx.wkLim, barras: [] };
    trechos.push(trecho);
    // ---- áreas necessárias por faixa (cm²/m)
    for (const f of faixas) {
      for (const i of [0, 1] as const) {
        const a = asFlexaoEscada(f.mInf[i], h, dI, c, ctx.fydI), s = asFlexaoEscada(f.mSup[i], h, dS, c, ctx.fydS);
        ok = ok && a.ok && s.ok;
        f.AsInf[i] = i === 0 ? Math.max(amin, a.As) : a.As;
        f.AsSup[i] = s.As > amin + 1e-9 ? s.As : 0; // abaixo do mínimo a face superior não leva armadura de flexão
      }
    }
    if (!ok) msgs.push(`${g.chave}: seção insuficiente à flexão (h = ${r2(h * 100, 1)} cm); aumente a espessura ou o fck.`);
    const igualarSec = !!op.escadaIgualarSecoes, igualarFace = !!op.escadaIgualarSupInf;
    // inferior longitudinal: contínua, pela maior faixa
    let asInfL = Math.max(...faixas.map((f) => f.AsInf[0]));
    // superior longitudinal: faixas que precisam, mais a regra da negativa de borda nos apoios do lance
    const asSupL = faixas.map((f) => f.AsSup[0]);
    const primeiro = j === 0, ultimo = j === rets.length - 1;
    const bordaMin = 0.67 * (op.lajeTaxaMin > 0 ? op.lajeTaxaMin / 100 : 0.0015) * h * 1e4;
    const nBordaIni = lajeBorda > 0 && primeiro ? Math.min(nb, Math.max(1, Math.ceil((lajeBorda * Math.max(vaoMax, g.L)) / w - 1e-9))) : 0;
    const nBordaFim = lajeBorda > 0 && ultimo && op.escadaPassadores ? Math.min(nb, Math.max(1, Math.ceil((lajeBorda * Math.max(vaoMax, g.L)) / w - 1e-9))) : 0;
    for (let k = 0; k < nBordaIni; k++) asSupL[k] = Math.max(asSupL[k], bordaMin);
    for (let k = 0; k < nBordaFim; k++) asSupL[nb - 1 - k] = Math.max(asSupL[nb - 1 - k], bordaMin);
    let asInfT = faixas.map((f) => f.AsInf[1]);
    let asSupT = faixas.map((f) => f.AsSup[1]);
    const mi = Math.max(...mkI.map((m) => m[0])), mT = Math.max(...mkI.map((m) => m[1])), ms = Math.max(...mkS.map((m) => m[0]));
    // igualações (C8.58 a C8.60)
    if (igualarSec) {
      const maxS = Math.max(...asSupL);
      for (let k = 0; k < nb; k++) asSupL[k] = maxS > 0 ? maxS : 0;
      asInfT = asInfT.map(() => Math.max(...asInfT));
      asSupT = asSupT.map(() => Math.max(...asSupT));
    }
    if (igualarFace) {
      const mx = Math.max(asInfL, ...asSupL);
      if (Math.max(...asSupL) > 0) { asInfL = mx; for (let k = 0; k < nb; k++) if (asSupL[k] > 0 || igualarSec) asSupL[k] = mx; }
      const mt = Math.max(...asInfT, ...asSupT);
      if (Math.max(...asSupT) > 0) { asInfT = asInfT.map(() => mt); asSupT = asSupT.map((v) => (v > 0 || igualarSec ? mt : v)); }
    }
    // fissuração (17.3.3.2): aumenta a área até a abertura caber no limite
    const sec = { kind: 'rect' as const, bw: 1, h };
    const wkDe = (As: number, Mk: number, d: number, face: 'inf' | 'sup', soVerifica: boolean): { wk: number; As: number; aumentou: boolean } => {
      let a = As, aumentou = false;
      const w = (x: number) => { if (!x || !Mk) return 0; const r = escolher(ctx, x, h, face, false); return crackWidth(sec, false, barArea(r.phi) / r.s, r.phi, d, Mk, c, ctx.caa).wk; };
      let wk = w(a);
      for (let it = 0; it < 20 && wk > ctx.wkLim + EPS && !soVerifica; it++) { a *= 1.1; wk = w(a); aumentou = true; }
      return { wk, As: a, aumentou };
    };
    const fI = wkDe(asInfL, mi, dI, 'inf', !!bloqueioDe(g.chave, 'infL'));
    asInfL = fI.As;
    trecho.wk = fI.wk;
    if (fI.aumentou) msgs.push(`${g.chave}: armadura inferior aumentada para limitar a abertura de fissuras a ${r2(ctx.wkLim)} mm.`);
    const fT = wkDe(Math.max(...asInfT), mT, dI, 'inf', true); // transversal: só verifica
    trecho.wk = Math.max(trecho.wk, fT.wk);
    const fS = Math.max(...asSupL) > 0 ? wkDe(Math.max(...asSupL), ms, dS, 'sup', true) : { wk: 0, As: 0, aumentou: false };
    trecho.wk = Math.max(trecho.wk, fS.wk);
    if (trecho.wk > ctx.wkLim + EPS) msgs.push(`${g.chave}: abertura de fissuras ${r2(trecho.wk)} mm > ${r2(ctx.wkLim)} mm.`);
    // distribuição mínima (20.1)
    const distMin = (principal: number) => Math.max(AS_DIST_MIN, (op.escadaDistribuicao / 100) * principal, 0.5 * amin);
    // ---- escolha de bitolas
    const blI = bloqueioDe(g.chave, 'infL');
    const eInfL = escolher(ctx, asInfL, h, 'inf', false, blI);
    if (eInfL.aviso) msgs.push(`${g.chave}: ${eInfL.aviso}`);
    if (!eInfL.cabe && !eInfL.bloqueada) msgs.push(`${g.chave}: armadura inferior (${r2(asInfL)} cm²/m) não cabe com espaçamento ≥ ${r2(op.lajeEspacamentoMinimo)} cm.`);
    // zonas superiores contínuas (faixas com armadura superior longitudinal)
    const zonas: { k0: number; k1: number; As: number }[] = [];
    for (let k = 0; k < nb; k++) {
      if (asSupL[k] <= 0) continue;
      const ult = zonas.at(-1);
      if (ult && ult.k1 === k - 1) { ult.k1 = k; ult.As = Math.max(ult.As, asSupL[k]); } else zonas.push({ k0: k, k1: k, As: asSupL[k] });
    }
    // escolha prévia das barras superiores e transversais, para alinhar os espaçamentos (C8.59) antes de medir os comprimentos
    const famDe = (z: { k0: number; k1: number }): FamiliaEscada => (z.k1 === nb - 1 && z.k0 !== 0 ? 'supFim' : 'supIni');
    const escZonas = zonas.map((z) => escolher(ctx, z.As, h, 'sup', false, bloqueioDe(g.chave, famDe(z))));
    const reqTs = zonas.map((z, i) => Math.max(distMin(escZonas[i].As), ...asSupT.slice(z.k0, z.k1 + 1)));
    const escTs = zonas.map((_z, i) => escolher(ctx, reqTs[i], h, 'sup', true, bloqueioDe(g.chave, 'supT')));
    const necT = asInfT.map((v) => Math.max(distMin(eInfL.As), v));
    const escT = necT.map((v) => escolher(ctx, v, h, 'inf', true, bloqueioDe(g.chave, 'infT')));
    if (op.escadaEspacamentoMultiplo) {
      for (let passada = 0; passada < 2; passada++) {
        escZonas.forEach((e1) => multiplo(e1, eInfL));
        zonas.forEach((z, i) => { for (let k = z.k0; k <= z.k1; k++) multiplo(escTs[i], escT[k]); });
      }
    }
    // cortante (19.4.1 e 19.4.2), com a armadura inferior efetiva
    {
      const VSd = Math.max(...faixas.map((f) => f.V)), rho = Math.min(0.02, (eInfL.As / 1e4) / dI), VRd1 = vrd1(c, 1, dI, rho * dI), VRd2 = 0.27 * c.av2 * c.fcd * 1000 * dI;
      const ct: CortanteEscada = { VSd, VRd1, VRd2, Asw: 0, ok: true };
      if (op.cortanteLajes && VSd > VRd1 + EPS) {
        if (VSd > VRd2) { ct.ok = false; ct.mensagem = `cortante ${r2(VSd, 1)} kN/m > VRd2 = ${r2(VRd2, 1)} kN/m (compressão diagonal): aumente a espessura ou o fck`; }
        else if (h < 0.15 - EPS) { ct.ok = false; ct.mensagem = `cortante ${r2(VSd, 1)} kN/m > VRd1 = ${r2(VRd1, 1)} kN/m; laje com h < 15 cm não leva armadura transversal: aumente a espessura ou o fck`; }
        else { const vc = vcLaje(c, h, dI, rho); ct.Asw = (Math.max(0, VSd - vc) * 1e4) / (0.9 * dI * acoDe(b, 'lajeCortante').fyd * 1000); ct.mensagem = `cortante ${r2(VSd, 1)} kN/m > VRd1 = ${r2(VRd1, 1)} kN/m: armadura transversal de ${r2(ct.Asw)} cm²/m² (19.4.2)`; }
      }
      trecho.cortante = ct;
      if (ct.mensagem) msgs.push(`${g.chave}: ${ct.mensagem}.`);
    }
    // ---- barras. Extremidades do trecho: apoio (início do primeiro, fim do último) ou quina com o vizinho
    const lbnInf = lbNecessario(lbI(eInfL.phi), eInfL.phi, asInfL, eInfL.As);
    const quinaIni = !primeiro, quinaFim = !ultimo;
    let extIni = 0, extFim = 0, gIni = 0, gFim = 0;
    if (quinaIni) extIni = lbnInf;
    if (quinaFim) extFim = lbnInf;
    let nota = '';
    if (primeiro) {
      if (op.escadaEsperas) { nota = 'início com esperas'; }
      else { const a = ancorarBarra(lbnInf, dispIni, eInfL.phi, ctx.cobI); extIni = a.embutido; gIni = a.perna; ligacoes.push({ tipo: 'apoio-inicial', rotulo: 'Início: armadura inferior ancorada no apoio', descricao: naFund ? `fundação (profundidade ${r2(profFund * 100, 0)} cm)` : vigaI ? `viga ${vigaI.nome} (largura ${r2(vigaI.secao.b * 100, 0)} cm)` : 'apoio inicial', ancoragem: a }); }
    }
    if (ultimo) {
      const a = ancorarBarra(lbnInf, dispFim, eInfL.phi, ctx.cobI); extFim = a.embutido; gFim = a.perna;
      ligacoes.push({ tipo: 'apoio-final', rotulo: 'Fim: armadura inferior ancorada no apoio', descricao: vigaS ? `viga ${vigaS.nome} (largura ${r2(vigaS.secao.b * 100, 0)} cm)` : 'apoio final', ancoragem: a });
    }
    const comp = g.L * g.fInc + extIni + extFim + gIni + gFim;
    nova(trecho, { tipo: 'principal', familia: 'infL', face: 'inf', direcao: 'L', phi: eInfL.phi, s: eInfL.s, n: nAcross(g.B, eInfL.s), comprimento: arred(comp), u: [0, g.L], AsNec: asInfL, AsEf: eInfL.As, ganchos: [gIni, gFim], ...(eInfL.bloqueada ? { bloqueada: true as const } : {}), ...(nota ? { nota } : {}) });
    if (primeiro && op.escadaEsperas) {
      // esperas: ancoradas no apoio inicial e emendadas por traspasse à armadura inferior
      const a = ancorarBarra(lbnInf, dispIni, eInfL.phi, ctx.cobI), l0min = Math.max(0.3 * alfa0t(1) * lbI(eInfL.phi), (15 * eInfL.phi) / 1000, 0.2), l0 = Math.max(alfa0t(1) * lbnInf, l0min);
      ligacoes.push({ tipo: 'apoio-inicial', rotulo: 'Início: esperas (arranques) emendadas à armadura inferior', descricao: naFund ? `fundação sem elemento sob o lance (profundidade ${r2(profFund * 100, 0)} cm)` : vigaI ? `viga ${vigaI.nome} (largura ${r2(vigaI.secao.b * 100, 0)} cm)` : 'apoio inicial', ancoragem: a, traspasse: l0 });
      nova(trecho, { tipo: 'espera', familia: 'espera', face: 'inf', direcao: 'L', phi: eInfL.phi, s: eInfL.s, n: nAcross(g.B, eInfL.s), comprimento: arred(a.adicional + l0), u: [0, l0 / g.fInc], AsNec: asInfL, AsEf: eInfL.As, ganchos: [a.perna, 0], nota: a.tipo === 'reta' ? 'espera reta' : a.tipo === 'gancho' ? 'espera com gancho' : 'espera dobrada' });
    }
    // distribuição inferior: por faixa, juntando as vizinhas iguais
    juntarFaixas(escT, (k0, k1, e1, necess) => nova(trecho, { tipo: 'distribuicao', familia: 'infT', face: 'inf', direcao: 'T', phi: e1.phi, s: e1.s, n: nAlong((k1 - k0 + 1) * w * g.fInc, e1.s), comprimento: arred(g.B - 2 * cobLat), u: [k0 * w, (k1 + 1) * w], AsNec: necess, AsEf: e1.As, ...(e1.bloqueada ? { bloqueada: true as const } : {}) }), necT);
    // superior longitudinal por zona (negativos nos apoios e nas quinas) e distribuição sob ela
    zonas.forEach((z, iz) => {
      const tocaIni = z.k0 === 0, tocaFim = z.k1 === nb - 1, fam = famDe(z), eS = escZonas[iz];
      if (eS.aviso) msgs.push(`${g.chave}: ${eS.aviso}`);
      const lbn = lbNecessario(lbS(eS.phi), eS.phi, z.As, eS.As), reforco = dec * dS;
      let g0 = 0, g1 = 0, tipo: TipoBarraEscada = 'negativo';
      // ponta interna: prolonga pelo decalado e pela ancoragem (dentro do trecho); ponta no apoio: ancora no apoio; ponta na quina: cruza a linha
      const a0 = Math.max(0, z.k0 * w - (tocaIni ? 0 : reforco + lbn)), a1 = Math.min(g.L, (z.k1 + 1) * w + (tocaFim ? 0 : reforco + lbn));
      let compBarra = (a1 - a0) * g.fInc;
      if (a0 <= EPS) { // começa no início do trecho
        if (primeiro) { const an = ancorarBarra(lbn, dispIni, eS.phi, ctx.cobS); compBarra += an.embutido; g0 = op.lajePernasNegativos ? an.perna : 0; compBarra += g0; ligacoes.push({ tipo: 'apoio-inicial', rotulo: 'Início: negativa de borda ancorada no apoio', descricao: naFund ? 'fundação' : vigaI ? `viga ${vigaI.nome}` : 'apoio inicial', ancoragem: an }); }
        else compBarra += lbn;
      }
      if (a1 >= g.L - EPS) {
        if (ultimo) { const an = ancorarBarra(lbn, dispFim, eS.phi, ctx.cobS); compBarra += an.embutido; g1 = op.lajePernasNegativos ? an.perna : 0; compBarra += g1; if (op.escadaPassadores) tipo = 'passador'; ligacoes.push({ tipo: 'apoio-final', rotulo: op.escadaPassadores ? 'Fim: passadores ancorados na laje ou viga de chegada' : 'Fim: negativa de borda ancorada no apoio', descricao: vigaS ? `viga ${vigaS.nome}` : 'apoio final', ancoragem: an }); }
        else compBarra += lbn;
      }
      nova(trecho, { tipo, familia: fam, face: 'sup', direcao: 'L', phi: eS.phi, s: eS.s, n: nAcross(g.B, eS.s), comprimento: arred(compBarra), u: [a0, a1], AsNec: z.As, AsEf: eS.As, ganchos: [g0, g1], ...(eS.bloqueada ? { bloqueada: true as const } : {}) });
      // distribuição sob a negativa
      const eT = escTs[iz], reqT = reqTs[iz];
      nova(trecho, { tipo: 'distribuicao', familia: 'supT', face: 'sup', direcao: 'T', phi: eT.phi, s: eT.s, n: nAlong((a1 - a0) * g.fInc, eT.s), comprimento: arred(g.B - 2 * cobLat), u: [a0, a1], AsNec: reqT, AsEf: eT.As, ...(eT.bloqueada ? { bloqueada: true as const } : {}) });
    });
    if (!eInfL.cabe && !eInfL.bloqueada) ok = false;
    // quinas (registradas uma vez, na saída do trecho)
    if (quinaFim) {
      const prox = rets[j + 1], sobe = prox.declive - g.declive;
      ligacoes.push({ tipo: 'quina', rotulo: `Quina ${g.chave}/${prox.chave}`, descricao: Math.abs(sobe) < 1e-3 ? 'sem mudança de declividade' : sobe < 0 ? 'face inferior côncava (quina do patamar): barras cruzadas e ancoradas' : 'face superior côncava (início do lance seguinte): barras cruzadas e ancoradas', ancoragem: { tipo: 'reta', lbNec: lbnInf, disponivel: lbnInf, embutido: lbnInf, perna: 0, adicional: lbnInf } });
    }
  });
  // ---- flecha (17.3.2.1.2 e 13.3): fator das lajes sobre a flecha elástica da combinação quase permanente
  const fator = op.fatorFlechaLaje > 0 ? op.fatorFlechaLaje : 1 + deltaXi(op.t0Flecha);
  const total = fator * (l.deslocamento.G + ctx.psi2 * l.deslocamento.Q) * 1000, limite = (vaoMax / op.limiteFlechaTotal) * 1000;
  const flecha = { total, limite, vao: vaoMax, fator, ok: total <= limite + EPS };
  if (!flecha.ok) msgs.push(`Flecha total ${r2(total, 1)} mm > ${r2(limite, 1)} mm (vão/${op.limiteFlechaTotal}): aumente a espessura.`);
  const barras = trechos.flatMap((t) => t.barras);
  const bloqueado = barras.some((x) => x.bloqueada);
  const falha = trechos.some((t) => !t.cortante.ok || t.wk > ctx.wkLim + EPS) || !flecha.ok || msgs.some((m) => m.includes('insuficiente') || m.includes('não cabe'));
  return { ...base, trechos, ligacoes, flecha, peso: pesoDe(barras), bloqueado, status: falha ? 'fail' : 'ok', mensagens: msgs };
}

/** Agrupa faixas vizinhas com a mesma bitola e o mesmo espaçamento e chama `f` por grupo. */
function juntarFaixas(esc: Escolha[], f: (k0: number, k1: number, e: Escolha, necessaria: number) => void, nec: number[]): void {
  let k0 = 0;
  for (let k = 1; k <= esc.length; k++) {
    if (k < esc.length && esc[k].phi === esc[k0].phi && Math.abs(esc[k].s - esc[k0].s) < 1e-9) continue;
    f(k0, k - 1, esc[k0], Math.max(...nec.slice(k0, k)));
    k0 = k;
  }
}

/** Armaduras de todas as escadas da obra, a partir do cálculo da E4c. Obra sem escada: vazio. */
export function armarEscadas(b: BuildingModel, res: ResultadoEscadas | undefined, opcoes: OpcoesCalculo): ArmaduraEscadas {
  if (!res?.lances.length) return { lances: [], resumoAco: [] };
  const op: OpcoesCalculo = { ...OPCOES_PADRAO_CALCULO, ...opcoes };
  const vaos = new Map<string, number>();
  for (const g of geometriaEscadas(b)) for (const lg of g.lances) vaos.set(`${g.escada.id}|${lg.indice}`, lg.espessura.vaoMax);
  const lances = res.lances.map((l) => armarLance(contexto(b, op, b.escadas?.find((e) => e.id === l.escada), vaos), l));
  return { lances, resumoAco: resumoAcoEscadas(b, lances, op.perdasAco) };
}

/** Resumo do aço das escadas por aço e bitola (kg), com as perdas (%). Mesma forma do resumo das lajes. */
export function resumoAcoEscadas(b: BuildingModel, lances: ResultadoArmaduraLance[], perdas: number): LinhaResumoAco[] {
  const acoI = acoDe(b, 'escadaInf').aco, acoS = acoDe(b, 'escadaSup').aco, m = new Map<string, { aco: string; phi: number; comprimento: number }>();
  for (const l of lances) for (const t of l.trechos) for (const x of t.barras) {
    const aco = x.face === 'inf' ? acoI : acoS, k = `${aco}|${x.phi}`, e = m.get(k) ?? { aco, phi: x.phi, comprimento: 0 };
    e.comprimento += x.n * x.comprimento;
    m.set(k, e);
  }
  return [...m.values()].sort((a, z) => a.aco.localeCompare(z.aco) || a.phi - z.phi).map((e) => { const peso = e.comprimento * pesoLinear(e.phi); return { ...e, peso, pesoComPerdas: peso * (1 + perdas / 100) }; });
}
