// Consolos curtos que apoiam vigas nos pilares (E2e; C6.54 a C6.57, C6.100, C6.101, K1.3.17, K1.4.62): dimensionamento pelo modelo de
// bielas e tirantes (NBR 6118, 22.5, e NBR 9062), com o consolo muito curto (a < 0,5·d) por atrito-cisalhamento e o longo (a > d) como
// viga em balanço. Funções puras em kN e m (tensões em MPa); o texto das normas não estava disponível: os coeficientes são opções
// editáveis marcadas "a confirmar" e vão para docs/pendencias-usuario.md. A modelagem na análise (apoio no centro do aparelho,
// só a vertical, viga desligada da face) está em analitico.ts; aqui estão a geometria, o dimensionamento e a verificação.
import { barArea, beamFlexure, type Concrete } from '../concrete';
import type { AnaliseEdificio } from './analitico';
import type { ResultadoViga } from './dimensionamento';
import { lbBasico } from './detalhamento';
import { acoDe, cobrimentoPilar, concretoDe, gamas } from './materiais';
import type { OpcoesCalculo } from './opcoes';
import { centroPilar, contornoPilar, dimsSecao, pavimentosDoGrupo, type ArmaduraConsolo, type BuildingModel, type Consolo, type Pilar } from './types';
import type { Diagnostico } from './verify';

/** Relação a/d abaixo da qual o consolo é muito curto (atrito-cisalhamento) e acima da qual é longo (viga em balanço). */
export const AD_MUITO_CURTO = 0.5;
export const AD_LONGO = 1;
/** Bitolas do tirante (mm), dos estribos horizontais (costura) e diâmetro estimado do estribo na altura útil. */
export const PHI_TIRANTE = [12.5, 16, 20, 25];
export const PHI_COSTURA = [6.3, 8, 10];
const PHI_EST = 0.0063;
const DMAX = 0.019;
/** Afastamento mínimo (m) entre o aparelho de apoio e a ponta do consolo. */
const FOLGA_PONTA = 0.03;

export type TipoConsolo = 'muito curto' | 'curto' | 'longo';
export type OpcoesConsolo = Pick<OpcoesCalculo, 'consoloHMinimo' | 'consoloBraco' | 'consoloMu' | 'consoloCostura' | 'consoloTensaoApoio'>;

export interface EntradaConsolo {
  b: number; h: number; hp: number; a: number; c: number;
  aparelho: { l: number; b: number };
  /** Vertical de cálculo (kN) e horizontal informada (kN; a mínima das opções é somada por máximo). */
  Vd: number; Hd?: number;
  concreto: Concrete;
  /** fyd (MPa) do tirante e fywk (MPa) e γs dos estribos. */
  fyd: number; fywk: number; gamaS: number;
  /** Cobrimento (m). */
  cob: number;
  /** Armadura informada (consolo bloqueado): só se verifica. */
  armadura?: ArmaduraConsolo;
  op: OpcoesConsolo;
}

export interface ResultadoConsolo {
  /** Dados do consolo e da viga. */
  consolo: string; nome: string; pilar: string; nomePilar: string; viga: string; nomeViga: string; ponta: 'ini' | 'fim';
  tipo: TipoConsolo;
  /** Geometria e esforços de cálculo (kN, m). */
  b: number; h: number; hp: number; a: number; c: number; d: number; z: number; ad: number;
  Vd: number; Hd: number; HdMin: number;
  /** Tirante: força (kN), área necessária, mínima e adotada (m²). */
  Rst: number; As: { calc: number; min: number; ef: number };
  /** Biela (nó sob o aparelho): inclinação (°), força (kN), largura (m) e tensão (MPa) com o limite e a utilização. */
  biela: { theta: number; C: number; largura: number; tensao: number; limite: number; util: number } | null;
  /** Contato sob o aparelho (MPa), limite e utilização. */
  apoio: { tensao: number; limite: number; util: number };
  /** Cortante: Vd contra VRd2 (kN) e utilização. */
  cortante: { Vd: number; VRd2: number; util: number };
  /** Atrito-cisalhamento (consolo muito curto): μ e área de aço do atrito (m²). */
  atrito: { mu: number; As: number } | null;
  /** Armadura adotada: tirante (n × φ), estribos horizontais fechados de costura (n × φ) e verticais (φ c/ s). */
  arranjo: ArmaduraConsolo;
  /** Costura necessária (m²) e adotada (m²); verticais: Asw/s mínimo e adotado (m²/m). */
  costura: { nec: number; ef: number };
  verticais: { necS: number; efS: number };
  /** Ancoragem do tirante: comprimento necessário sob o aparelho (laço), disponível (m) e se atende. */
  ancoragem: { lb: number; lbNec: number; disponivel: number; ok: boolean };
  bloqueada: boolean;
  /** Maior utilização entre tirante, biela, apoio e cortante. */
  util: number;
  status: 'ok' | 'fail';
  mensagens: string[];
  /** Combinação determinante da vertical (se vier das combinações). */
  combinacao?: string;
}

const MPa = (v: number) => v * 1000; // MPa → kN/m²

/** Altura útil (m) para o tirante de diâmetro φ (mm): h − cobrimento − estribo − φ/2. */
export const alturaUtil = (h: number, cob: number, phi: number) => h - cob - PHI_EST - phi / 2000;

/** Barras do tirante em uma camada: quantas cabem na largura b com o espaçamento mínimo. */
export function barrasPorCamada(b: number, cob: number, phi: number): number {
  const f = phi / 1000, ah = Math.max(0.02, f, 1.2 * DMAX), livre = b - 2 * (cob + PHI_EST);
  return Math.max(0, Math.floor((livre + ah) / (f + ah)));
}

/** Resultado parcial do tirante para uma altura útil: tipo, braço, força e área necessária. */
function tirante(e: EntradaConsolo, d: number, Hd: number) {
  const { b, h, a, concreto: c, fyd, op } = e, ad = a / d;
  const fydk = MPa(fyd);
  const tipo: TipoConsolo = ad < AD_MUITO_CURTO ? 'muito curto' : ad <= AD_LONGO ? 'curto' : 'longo';
  let Rst = 0, z = op.consoloBraco * d, As = 0, atrito: { mu: number; As: number } | null = null;
  if (tipo === 'muito curto') {
    // atrito-cisalhamento (NBR 9062): As = Vd/(μ·fyd) + Hd/fyd
    const Asf = e.Vd / (op.consoloMu * fydk);
    atrito = { mu: op.consoloMu, As: Asf };
    As = Asf + Hd / fydk;
    Rst = As * fydk;
  } else if (tipo === 'curto') {
    // bielas e tirantes: momentos em torno do nó inferior na face do pilar, braço z (Hd no topo do consolo, (h − d) acima do tirante)
    Rst = (e.Vd * a) / z + Hd * (1 + (h - d) / z);
    As = Rst / fydk;
  } else {
    // viga em balanço: flexão em seção retangular com Md = Vd·a + Hd·(h − d) e a tração Hd somada
    const Md = e.Vd * a + Hd * (h - d), f = beamFlexure({ kind: 'rect', bw: b, h }, false, Md, d, cobPlus(e), c, fyd);
    As = f.As + Hd / fydk;
    z = d - f.x * c.lambda / 2;
    Rst = As * fydk;
  }
  const Amin = Math.max((0.04 * c.fcd * b * d) / fyd, 0.0015 * b * h);
  return { ad, tipo, Rst, z, As, Amin, atrito };
}
const cobPlus = (e: EntradaConsolo) => e.cob + PHI_EST + 0.008;

/**
 * Dimensiona (ou verifica, com `armadura`) um consolo. Sem armadura informada, escolhe a menor bitola do tirante cujas barras caibam em
 * uma camada na largura do consolo.
 */
export function dimensionarConsolo(e: EntradaConsolo): Omit<ResultadoConsolo, 'consolo' | 'nome' | 'pilar' | 'nomePilar' | 'viga' | 'nomeViga' | 'ponta' | 'combinacao'> {
  const { b, h, hp, a, c: cn, aparelho: ap, concreto: c, fyd, op } = e;
  const mensagens: string[] = [];
  const HdMin = op.consoloHMinimo * e.Vd, Hd = Math.max(e.Hd ?? 0, HdMin);
  const bloqueada = !!e.armadura;
  // bitola do tirante: a informada ou a menor que cabe em uma camada
  let phi = e.armadura?.tirante.phi ?? PHI_TIRANTE[PHI_TIRANTE.length - 1], n = e.armadura?.tirante.n ?? 0, cabe = true;
  let d = alturaUtil(h, e.cob, phi), t = tirante(e, d, Hd);
  if (!bloqueada) {
    cabe = false;
    for (const p of PHI_TIRANTE) {
      const dp = alturaUtil(h, e.cob, p), tp = tirante(e, dp, Hd), Anec = Math.max(tp.As, tp.Amin), np = Math.max(2, Math.ceil(Anec / barArea(p) - 1e-9));
      if (np <= barrasPorCamada(b, e.cob, p)) { phi = p; n = np; d = dp; t = tp; cabe = true; break; }
      if (p === PHI_TIRANTE[PHI_TIRANTE.length - 1]) { phi = p; n = np; d = dp; t = tp; }
    }
  }
  const Anec = Math.max(t.As, t.Amin), Aef = n * barArea(phi);
  if (d <= 0) mensagens.push(`Consolo: geometria: altura útil ${(d * 100).toFixed(1).replace('.', ',')} cm não positiva (aumente a altura h).`);
  if (hp < h / 2 - 1e-9) mensagens.push(`Consolo: geometria: a altura na ponta (${(hp * 100).toFixed(0)} cm) é menor que h/2 (${(h * 50).toFixed(0)} cm).`);
  if (a + ap.l / 2 + FOLGA_PONTA > cn + 1e-9) mensagens.push(`Consolo: geometria: o aparelho (centro a ${(a * 100).toFixed(0)} cm, ${(ap.l * 100).toFixed(0)} cm de comprimento) não cabe no balanço de ${(cn * 100).toFixed(0)} cm (folga mínima ${(FOLGA_PONTA * 100).toFixed(0)} cm).`);
  if (ap.b > b + 1e-9) mensagens.push(`Consolo: geometria: o aparelho (${(ap.b * 100).toFixed(0)} cm) é mais largo que o consolo (${(b * 100).toFixed(0)} cm).`);
  if (t.tipo === 'longo') mensagens.push(`Consolo: a/d = ${t.ad.toFixed(2).replace('.', ',')} acima de 1: fora do modelo de bielas e tirantes, calculado como viga em balanço (flexão e cortante).`);
  if (!cabe) mensagens.push(`Consolo: o tirante (${n}φ${phi}) não cabe em uma camada na largura de ${(b * 100).toFixed(0)} cm; aumente a largura ou a altura do consolo.`);
  // armadura do tirante
  if (bloqueada) {
    if (Aef + 1e-12 < Anec) mensagens.push(`Consolo: a armadura informada do tirante (${(Aef * 1e4).toFixed(2).replace('.', ',')} cm²) é menor que a necessária (${(Anec * 1e4).toFixed(2).replace('.', ',')} cm²).`);
    if (n > barrasPorCamada(b, e.cob, phi)) mensagens.push(`Consolo: o tirante informado (${n}φ${phi}) não cabe em uma camada na largura do consolo.`);
  }
  // biela (nó sob o aparelho, tirante ancorado: CCT) e contato
  const alfa = c.av2;
  let biela: ResultadoConsolo['biela'] = null;
  if (t.tipo === 'curto') {
    const Ch = Math.max(t.Rst - Hd, 1e-9), theta = Math.atan2(e.Vd, Ch), C = Math.hypot(e.Vd, Ch);
    const w = ap.l * Math.sin(theta) + 2 * (h - d) * Math.cos(theta), sig = C / (b * w) / 1000, lim = 0.72 * alfa * c.fcd;
    biela = { theta: (theta * 180) / Math.PI, C, largura: w, tensao: sig, limite: lim, util: sig / lim };
    if (biela.util > 1 + 1e-9) mensagens.push(`Consolo: biela comprimida junto ao aparelho: ${sig.toFixed(1).replace('.', ',')} MPa acima de ${lim.toFixed(1).replace('.', ',')} MPa (0,72·αv2·fcd); aumente a altura, a largura do consolo ou do aparelho, ou o fck.`);
  }
  const sigAp = e.Vd / (ap.l * ap.b) / 1000, limAp = op.consoloTensaoApoio * c.fcd, apoio = { tensao: sigAp, limite: limAp, util: sigAp / limAp };
  if (apoio.util > 1 + 1e-9) mensagens.push(`Consolo: tensão de contato sob o aparelho ${sigAp.toFixed(1).replace('.', ',')} MPa acima de ${limAp.toFixed(1).replace('.', ',')} MPa (${op.consoloTensaoApoio.toFixed(2).replace('.', ',')}·fcd); aumente a área do aparelho.`);
  const VRd2 = 0.27 * alfa * c.fcd * b * d * 1000, cortante = { Vd: e.Vd, VRd2, util: d > 0 ? e.Vd / VRd2 : Infinity };
  if (cortante.util > 1 + 1e-9) mensagens.push(`Consolo: cortante de cálculo ${e.Vd.toFixed(0)} kN acima de VRd2 = ${VRd2.toFixed(0)} kN (0,27·αv2·fcd·b·d); aumente a largura ou a altura do consolo, ou o fck.`);
  // costura (estribos horizontais fechados em 2/3 de d) e estribos verticais
  const costNec = op.consoloCostura * Anec;
  let costura = { n: 0, phi: PHI_COSTURA[0] };
  if (bloqueada && e.armadura) {
    costura = { n: e.armadura.horizontais.n, phi: e.armadura.horizontais.phi };
    if (2 * costura.n * barArea(costura.phi) + 1e-12 < costNec) mensagens.push(`Consolo: estribos horizontais de costura informados (${(2 * costura.n * barArea(costura.phi) * 1e4).toFixed(2).replace('.', ',')} cm²) menores que o necessário (${(costNec * 1e4).toFixed(2).replace('.', ',')} cm²).`);
  } else {
    for (const p of PHI_COSTURA) {
      const nn = Math.max(2, Math.ceil(costNec / (2 * barArea(p)) - 1e-9));
      costura = { n: nn, phi: p };
      if (((2 / 3) * d) / nn >= 0.05) break;
    }
  }
  const aswMin = ((0.2 * c.fctm) / e.fywk) * b; // Asw/s mínimo (m²/m), NBR 6118, 17.4.1.1.1
  const aswNec = t.tipo === 'longo' ? Math.max(aswMin, Math.max(0, e.Vd / 1000 - 0.6 * c.fctd * b * d) / (0.9 * d * Math.min(e.fywk / e.gamaS, 435))) : aswMin;
  let verticais = e.armadura?.verticais ?? { phi: 6.3, s: 0.2 };
  if (!bloqueada) {
    verticais = { phi: PHI_COSTURA[0], s: 0.2 };
    for (const p of PHI_COSTURA) {
      const s = Math.min(0.2, Math.floor(((2 * barArea(p)) / aswNec) * 100) / 100);
      verticais = { phi: p, s };
      if (s >= 0.1) break;
    }
  } else if ((2 * barArea(verticais.phi)) / verticais.s + 1e-12 < aswNec) mensagens.push(`Consolo: estribos verticais informados (φ${verticais.phi} c/${(verticais.s * 100).toFixed(0)}) menores que o necessário (${(aswNec * 1e4).toFixed(2).replace('.', ',')} cm²/m).`);
  // ancoragem do tirante sob o aparelho (laço horizontal): α = 0,7, a partir da face interna do aparelho
  const boa = h < 0.6, lb = lbBasico(phi, c, fyd, boa), lbMin = Math.max(0.3 * lb, (10 * phi) / 1000, 0.1);
  const lbNec = Math.max(0.7 * lb * Math.min(1, Anec / Math.max(Aef, 1e-12)), lbMin);
  const disp = Math.max(0, cn - Math.max(a - ap.l / 2, 0) - e.cob);
  const ancoragem = { lb, lbNec, disponivel: disp, ok: disp + 1e-9 >= lbNec };
  if (!ancoragem.ok) mensagens.push(`Consolo: ancoragem do tirante: ${(lbNec * 100).toFixed(0)} cm necessários a partir do aparelho (laço), ${(disp * 100).toFixed(0)} cm disponíveis; use laço horizontal fechado ou barras transversais soldadas, ou aumente o balanço.`);
  const utilT = Anec > 0 ? Anec / Math.max(Aef, 1e-12) : 0;
  const erro = mensagens.some((m) => !/^Consolo: (a\/d|ancoragem)/.test(m));
  const util = Math.max(utilT, biela?.util ?? 0, apoio.util, cortante.util);
  return {
    tipo: t.tipo, b, h, hp, a, c: cn, d, z: t.z, ad: t.ad, Vd: e.Vd, Hd, HdMin, Rst: t.Rst,
    As: { calc: t.As, min: t.Amin, ef: Aef }, biela, apoio, cortante, atrito: t.atrito,
    arranjo: { tirante: { n, phi }, horizontais: { n: costura.n, phi: costura.phi }, verticais },
    costura: { nec: costNec, ef: 2 * costura.n * barArea(costura.phi) }, verticais: { necS: aswNec, efS: (2 * barArea(verticais.phi)) / verticais.s },
    ancoragem, bloqueada, util, status: erro ? 'fail' : 'ok', mensagens,
  };
}

// ---------------- o consolo no modelo ----------------

/** Consolo cuja viga `vigaId` apoia no pilar `pilarId`. */
export const consoloDaViga = (b: Pick<BuildingModel, 'consolos'>, vigaId: string, pilarId: string): Consolo | undefined => b.consolos?.find((c) => c.viga === vigaId && c.pilar === pilarId);

const dist = (p: [number, number], q: [number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1]);

/** Distância (m) de um ponto ao contorno do pilar (0 se dentro). */
function distAoPilar(p: [number, number], pil: Pilar): number {
  const cont = contornoPilar(pil, pil.secao), c = centroPilar(pil, pil.secao);
  // dentro do polígono (par-ímpar)
  let dentro = false;
  for (let i = 0, j = cont.length - 1; i < cont.length; j = i++) {
    const [xi, yi] = cont[i], [xj, yj] = cont[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  if (dentro || dist(p, c) < 1e-9) return 0;
  let d = Infinity;
  for (let i = 0; i < cont.length; i++) {
    const a = cont[i], z = cont[(i + 1) % cont.length], dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
    d = Math.min(d, Math.hypot(a[0] + u * dx - p[0], a[1] + u * dy - p[1]));
  }
  return d;
}

/** Tolerância (m) entre a ponta da viga e a face do pilar. */
export const TOL_PONTA_CONSOLO = 0.05;

/** A ponta da viga está na face do pilar (ou dentro dele)? */
export const pontaToca = (p: [number, number], pil: Pilar) => distAoPilar(p, pil) <= TOL_PONTA_CONSOLO;

/** Aresta do contorno do pilar mais próxima de um ponto (0 a 3 no retângulo; -1 na seção circular). */
export function faceDoPilar(pil: Pilar, p: [number, number]): number {
  if (pil.secao.tipo === 'circ') return -1;
  const cont = contornoPilar(pil, pil.secao);
  let melhor = 0, dm = Infinity;
  for (let i = 0; i < 4; i++) {
    const a = cont[i], z = cont[(i + 1) % 4], dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
    const d = Math.hypot(a[0] + u * dx - p[0], a[1] + u * dy - p[1]);
    if (d < dm - 1e-9) { dm = d; melhor = i; }
  }
  return melhor;
}

/** Largura (m) da face do pilar onde o consolo sai. */
export function larguraDaFace(pil: Pilar, face: number): number {
  const [w, h] = dimsSecao(pil.secao);
  return face < 0 ? w : face % 2 === 0 ? w : h;
}

/** Ponta (m) da viga que o consolo apoia, em planta. */
export const pontaDaViga = (v: { pontos: [number, number][] }, ponta: 'ini' | 'fim'): [number, number] => (ponta === 'ini' ? v.pontos[0] : v.pontos[v.pontos.length - 1]);

/** Valores de partida de um consolo novo a partir da viga e do pilar: balanço, alturas e aparelho usuais [a confirmar]. */
export function consoloPadrao(vigaB: number, vigaH: number, pil: Pilar, face: number): Pick<Consolo, 'b' | 'h' | 'hp' | 'a' | 'c' | 'aparelho'> {
  const largura = Math.min(larguraDaFace(pil, face), Math.max(vigaB, 0.2));
  const h = Math.max(0.4, Math.min(0.6, vigaH)), l = 0.15, a = 0.2;
  return { b: +largura.toFixed(3), h: +h.toFixed(3), hp: +(h / 2).toFixed(3), a, c: +(a + l / 2 + 0.1).toFixed(3), aparelho: { l, b: +Math.min(largura, 0.2).toFixed(3) } };
}

/** Diagnósticos de lançamento dos consolos: pilar e viga existentes, ponta na face, geometria e viga apoiada em dois consolos. */
export function diagnosticosConsolos(b: BuildingModel): Diagnostico[] {
  const out: Diagnostico[] = [];
  for (const c of b.consolos ?? []) {
    const pil = b.pilares.find((p) => p.id === c.pilar), v = b.vigas.find((x) => x.id === c.viga);
    if (!pil) { out.push({ codigo: 'CONSOLO_PILAR', severidade: 'erro', elementos: [c.id], mensagem: `Consolo ${c.nome}: o pilar ${c.pilar} não existe.` }); continue; }
    if (!v) { out.push({ codigo: 'CONSOLO_VIGA', severidade: 'erro', elementos: [c.id], mensagem: `Consolo ${c.nome}: a viga ${c.viga} não existe.` }); continue; }
    if (!pontaToca(pontaDaViga(v, c.ponta), pil)) out.push({ codigo: 'CONSOLO_PONTA', severidade: 'erro', elementos: [c.id, v.id, pil.id], mensagem: `Consolo ${c.nome}: a ponta ${c.ponta === 'ini' ? 'inicial' : 'final'} da viga ${v.nome} não toca o pilar ${pil.nome}.` });
    if (c.b > larguraDaFace(pil, c.face) + 1e-9) out.push({ codigo: 'CONSOLO_LARGURA', severidade: 'aviso', elementos: [c.id, pil.id], mensagem: `Consolo ${c.nome}: a largura (${(c.b * 100).toFixed(0)} cm) passa da face do pilar ${pil.nome} (${(larguraDaFace(pil, c.face) * 100).toFixed(0)} cm).` });
  }
  const vistas = new Map<string, string>();
  for (const c of b.consolos ?? []) {
    const k = `${c.viga}|${c.ponta}`;
    if (vistas.has(k)) out.push({ codigo: 'CONSOLO_DUPLICADO', severidade: 'erro', elementos: [c.id, vistas.get(k)!], mensagem: `Consolo ${c.nome}: a mesma ponta da viga já tem outro consolo.` });
    else vistas.set(k, c.id);
  }
  return out;
}

// ---------------- dimensionamento no edifício ----------------

/** Cortante de cálculo (kN) e combinação na ponta da viga (primeira ou última faixa da envoltória ELU). */
export function cortanteNaPonta(rv: ResultadoViga, ponta: 'ini' | 'fim'): { Vd: number; combinacao: string } {
  const pts = rv.envoltoria.pontos, p = ponta === 'ini' ? pts[0] : pts[pts.length - 1];
  if (!p) return { Vd: 0, combinacao: '' };
  return { Vd: Math.max(Math.abs(p.Vmax), Math.abs(p.Vmin)), combinacao: rv.envoltoria.determinantes.V };
}

/**
 * Dimensiona os consolos com a vertical de cálculo na ponta da viga que apoiam (envoltória ELU do último cálculo). Consolo cuja
 * viga não foi dimensionada (fora da análise) fica sem resultado.
 */
export function dimensionarConsolos(b: BuildingModel, an: AnaliseEdificio, vigas: ResultadoViga[]): ResultadoConsolo[] {
  const out: ResultadoConsolo[] = [];
  const op = an.opcoes;
  for (const c of b.consolos ?? []) {
    const pil = b.pilares.find((p) => p.id === c.pilar), v = b.vigas.find((x) => x.id === c.viga), rv = vigas.find((x) => x.viga === c.viga);
    if (!pil || !v || !rv) continue;
    const pav = pavimentosDoGrupo(b, v.grupo)[0]?.id, conc = concretoDe(b, 'pilar', pav, pil), aco = acoDe(b, 'pilarLong'), ae = acoDe(b, 'pilarEstribo');
    const { Vd, combinacao } = cortanteNaPonta(rv, c.ponta);
    const r = dimensionarConsolo({
      b: c.b, h: c.h, hp: c.hp, a: c.a, c: c.c, aparelho: c.aparelho, Vd, Hd: c.hd, concreto: conc, fyd: aco.fyd, fywk: ae.fyk, gamaS: gamas(b).s,
      cob: c.cobrimento !== undefined ? c.cobrimento / 100 : cobrimentoPilar(b), armadura: c.armadura, op,
    });
    out.push({ ...r, consolo: c.id, nome: c.nome, pilar: pil.id, nomePilar: pil.nome, viga: v.id, nomeViga: v.nome, ponta: c.ponta, combinacao });
  }
  return out;
}

const f1 = (v: number, d = 1) => v.toFixed(d).replace('.', ',');

/** Texto de relatório de um consolo (C6.100): geometria, esforços, tirante, biela, contato, cortante e armadura. */
export function relatorioConsolo(r: ResultadoConsolo): string[] {
  const l: string[] = [
    `Consolo ${r.nome} (${r.tipo}): pilar ${r.nomePilar}, viga ${r.nomeViga}; b = ${f1(r.b * 100, 0)} cm, h = ${f1(r.h * 100, 0)} cm, ponta ${f1(r.hp * 100, 0)} cm, a = ${f1(r.a * 100, 0)} cm, balanço ${f1(r.c * 100, 0)} cm; d = ${f1(r.d * 100)} cm, a/d = ${f1(r.ad, 2)}.`,
    `Vd = ${f1(r.Vd)} kN${r.combinacao ? ` (${r.combinacao})` : ''}, Hd = ${f1(r.Hd)} kN (mínima ${f1(r.HdMin)} kN).`,
  ];
  if (r.atrito) l.push(`Atrito-cisalhamento: μ = ${f1(r.atrito.mu, 2)}; As = Vd/(μ·fyd) + Hd/fyd = ${f1(r.As.calc * 1e4, 2)} cm².`);
  else l.push(`Tirante: z = ${f1(r.z * 100)} cm; Rst = ${f1(r.Rst)} kN; As = ${f1(r.As.calc * 1e4, 2)} cm² (mínima ${f1(r.As.min * 1e4, 2)} cm²).`);
  if (r.biela) l.push(`Biela: θ = ${f1(r.biela.theta)}°, C = ${f1(r.biela.C)} kN, largura ${f1(r.biela.largura * 100)} cm, σ = ${f1(r.biela.tensao)} MPa de ${f1(r.biela.limite)} MPa (${f1(r.biela.util, 2)}).`);
  l.push(`Contato no aparelho: ${f1(r.apoio.tensao)} MPa de ${f1(r.apoio.limite)} MPa (${f1(r.apoio.util, 2)}). Cortante: Vd = ${f1(r.cortante.Vd)} kN de VRd2 = ${f1(r.cortante.VRd2)} kN (${f1(r.cortante.util, 2)}).`);
  l.push(`Armadura: tirante ${r.arranjo.tirante.n}φ${r.arranjo.tirante.phi} (${f1(r.As.ef * 1e4, 2)} cm²), ${r.arranjo.horizontais.n} estribos horizontais fechados φ${r.arranjo.horizontais.phi} (costura ${f1(r.costura.ef * 1e4, 2)} cm² de ${f1(r.costura.nec * 1e4, 2)} cm²), estribos verticais φ${r.arranjo.verticais.phi} c/${f1(r.arranjo.verticais.s * 100, 0)}; ancoragem ${f1(r.ancoragem.lbNec * 100, 0)} cm de ${f1(r.ancoragem.disponivel * 100, 0)} cm.`);
  return l;
}
