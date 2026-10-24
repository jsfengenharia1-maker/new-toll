// Seções T, L e plana das vigas de fundação (frente E, fatia E5k, C6.22).
// - Geometria da seção (área, centroide, inércias vertical e lateral) e a largura de contato com o solo: mesa inferior
//   (T invertido) = largura da mesa; mesa superior = largura da alma.
// - Seções de flexão por face: T onde a mesa está comprimida (linha neutra na mesa ou na alma, `beamFlexure`), retangular
//   pela alma onde a mesa está tracionada; cortante na alma.
// - Mesa em balanço tratada como laje: faixa de 1 m, momento da pressão líquida do solo na face da alma, armadura mínima
//   ρmín·hf e cortante a d da face.
// Unidades: kN, m, kN/m² (tensões); armaduras por metro em cm²/m nos resultados.
import { barArea, beamFlexure, type BeamSection, type Concrete } from '../concrete';
import type { FormaVF } from './types';
import { vrd1 } from './vigotas';

export const GAMA_CONCRETO_VF = 25;

export type TipoSecaoVF = 'retangular' | 'T' | 'L' | 'plana';

export interface GeoSecaoVF {
  tipo: TipoSecaoVF;
  /** Alma (m) e altura total (m). */
  bw: number;
  h: number;
  /** Mesa: largura total e espessura (m); sem mesa, bf = bw e hf = 0. */
  bf: number;
  hf: number;
  temMesa: boolean;
  mesa: 'inferior' | 'superior';
  /** Mesas dos dois lados (T) ou de um só (L). */
  lados: 0 | 1 | 2;
  /** Balanço da mesa além da face da alma, de cada lado com mesa (m): (bf − bw)/lados. */
  balanco: number;
  /** Área (m²), centroide a partir da face inferior (m), inércias em torno do eixo horizontal (vertical bending) e do vertical (m⁴). */
  A: number;
  yc: number;
  Iz: number;
  Iy: number;
  /** Largura de contato com o solo (m) quando a viga se apoia nele. */
  contato: number;
  /** Mensagens: erro (forma inválida) e avisos. */
  erro?: string;
  avisos: string[];
}

const f2 = (v: number) => (v * 100).toFixed(0);

/**
 * Geometria da seção de uma viga de fundação. `bw`: largura da alma (ou da seção retangular/plana). Mesa ausente na forma
 * (`bf`, `hf`) usa o padrão bw + 0,60 m (T) ou bw + 0,30 m (L) e hf = mín(0,20 m; h/2) [a confirmar]. `mesaPadrao`: onde
 * fica a mesa quando a forma não diz.
 */
export function geoSecaoVF(bw: number, h: number, forma?: FormaVF, mesaPadrao: 'inferior' | 'superior' = 'inferior'): GeoSecaoVF {
  const avisos: string[] = [];
  const tipo: TipoSecaoVF = forma?.tipo ?? 'retangular';
  const mesa = forma?.mesa ?? mesaPadrao;
  const comMesa = tipo === 'T' || tipo === 'L';
  const hf = comMesa ? forma!.hf ?? Math.min(0.2, h / 2) : 0;
  const bf = comMesa ? forma!.bf ?? bw + (tipo === 'T' ? 0.6 : 0.3) : bw;
  const lados = comMesa ? (tipo === 'T' ? 2 : 1) : 0;
  let erro: string | undefined;
  if (comMesa) {
    if (bf < bw + 0.05 - 1e-9) erro = `Seção ${tipo}: largura da mesa (${f2(bf)} cm) deve exceder a da alma (${f2(bw)} cm) em pelo menos 5 cm.`;
    else if (hf < 0.1 - 1e-9) erro = `Seção ${tipo}: espessura da mesa (${f2(hf)} cm) abaixo de 10 cm.`;
    else if (hf > h - 0.1 + 1e-9) erro = `Seção ${tipo}: a mesa (${f2(hf)} cm) deve deixar ao menos 10 cm de alma na altura de ${f2(h)} cm.`;
  }
  if (tipo === 'plana' && h > bw + 1e-9) avisos.push(`viga plana ${f2(bw)} × ${f2(h)} cm: a altura excede a largura (a viga plana é mais larga que alta).`);
  const A1 = comMesa ? bf * hf : 0, A2 = comMesa ? bw * (h - hf) : bw * h;
  const A = A1 + A2;
  // centroides a partir da face inferior
  const y1 = mesa === 'inferior' ? hf / 2 : h - hf / 2;
  const y2 = comMesa ? (mesa === 'inferior' ? hf + (h - hf) / 2 : (h - hf) / 2) : h / 2;
  const yc = (A1 * y1 + A2 * y2) / A;
  const Iz = comMesa ? (bf * hf ** 3) / 12 + A1 * (y1 - yc) ** 2 + (bw * (h - hf) ** 3) / 12 + A2 * (y2 - yc) ** 2 : (bw * h ** 3) / 12;
  // lateral: alma de [0, bw], mesa de [0, bf] (L, de um lado só) ou centrada (T)
  const x1 = bf / 2, x2 = tipo === 'L' ? bw / 2 : bf / 2;
  const xc = comMesa ? (A1 * x1 + A2 * x2) / A : bw / 2;
  const Iy = comMesa ? (hf * bf ** 3) / 12 + A1 * (x1 - xc) ** 2 + ((h - hf) * bw ** 3) / 12 + A2 * (x2 - xc) ** 2 : (h * bw ** 3) / 12;
  const contato = comMesa && mesa === 'inferior' ? bf : bw;
  return {
    tipo, bw, h, bf, hf, temMesa: comMesa, mesa, lados: lados as 0 | 1 | 2, balanco: comMesa ? (bf - bw) / lados : 0,
    A, yc, Iz, Iy, contato, ...(erro ? { erro } : {}), avisos,
  };
}

/** Descrição curta da seção para listas e memorial. */
export function textoSecaoVF(g: GeoSecaoVF): string {
  const rot = g.tipo === 'retangular' ? '' : ` ${g.tipo}`;
  if (!g.temMesa) return `${f2(g.bw)} × ${f2(g.h)} cm${rot}`;
  return `${g.tipo} ${f2(g.bw)} × ${f2(g.h)} cm, mesa ${f2(g.bf)} × ${f2(g.hf)} cm ${g.mesa === 'inferior' ? 'embaixo' : 'em cima'}`;
}

export interface FlexaoFace {
  sec: BeamSection;
  /** A mesa está na face comprimida (T de verdade) para este momento? */
  mesaComprimida: boolean;
  /** Largura onde ficam as barras tracionadas desta face (mesa na face tracionada = bf). */
  larguraBarras: number;
}

/**
 * Seções de flexão: `inf` = momento que traciona a face inferior (comprime a superior), `sup` = o contrário. Com mesa, a
 * seção é T e a mesa conta onde está comprimida; as barras da face da mesa se distribuem na largura da mesa.
 */
export function secoesFlexaoVF(g: GeoSecaoVF): { inf: FlexaoFace; sup: FlexaoFace } {
  const rect: BeamSection = { kind: 'rect', bw: g.bw, h: g.h };
  if (!g.temMesa) return { inf: { sec: rect, mesaComprimida: false, larguraBarras: g.bw }, sup: { sec: rect, mesaComprimida: false, larguraBarras: g.bw } };
  const tee: BeamSection = { kind: 'tee', bw: g.bw, h: g.h, bf: g.bf, hf: g.hf };
  return {
    inf: { sec: tee, mesaComprimida: g.mesa === 'superior', larguraBarras: g.mesa === 'inferior' ? g.bf : g.bw },
    sup: { sec: tee, mesaComprimida: g.mesa === 'inferior', larguraBarras: g.mesa === 'superior' ? g.bf : g.bw },
  };
}

/** Altura útil a partir do cobrimento (m) e do raio estimado de barras e estribos (mesmo critério das vigas de fundação). */
export const alturaUtilVF = (h: number, cob: number) => h - cob - 0.013;

// ---------------- mesa em balanço (laje) ----------------

export interface BarrasPorMetro { phi: number; s: number; As: number }

const PHIS_MESA = [8, 10, 12.5, 16, 20, 25];

/** Barras por metro: menor área efetiva com espaçamento entre smin e smax (m), arredondado para baixo ao cm. */
export function barrasPorMetro(As: number, smin: number, smax: number, phis: number[], hMax?: number): BarrasPorMetro | null {
  let melhor: BarrasPorMetro | null = null;
  for (const phi of phis) {
    if (hMax && phi > (hMax * 1000) / 8 + 1e-9) continue;
    const a = barArea(phi);
    const s = Math.floor(Math.min(smax, As > 0 ? a / As : smax) * 100 + 1e-6) / 100;
    if (s < smin - 1e-9) continue;
    const ef = a / s;
    if (!melhor || ef < melhor.As - 1e-12) melhor = { phi, s, As: ef };
  }
  return melhor;
}

export interface MesaBalanco {
  tipo: 'T' | 'L';
  mesa: 'inferior' | 'superior';
  bf: number;
  hf: number;
  /** Balanço da mesa da face da alma até a borda (m) e altura útil (m). */
  balanco: number;
  d: number;
  /** Pressão líquida característica sobre o balanço (kN/m²): σ do solo menos o peso da mesa. */
  q: number;
  /** Momento de cálculo na face da alma (kN·m/m). */
  Md: number;
  /** Armadura transversal (perpendicular ao eixo) calculada, mínima e adotada (cm²/m) e as barras. */
  As: number;
  AsMin: number;
  AsAdot: number;
  barras: BarrasPorMetro | null;
  /** Armadura de distribuição (paralela ao eixo): cm²/m e barras. */
  distribuicao: { As: number; barras: BarrasPorMetro | null };
  /** Cortante a d da face da alma (kN/m) contra VRd1 (laje sem armadura transversal). */
  cortante: { Vd: number; VRd1: number; ok: boolean };
}

export interface EntradaMesaBalanco {
  g: GeoSecaoVF;
  /** Tensão máxima do solo nas combinações raras (kN/m²); 0 quando a mesa não é carregada pelo solo (mesa superior ou viga sem solo). */
  sigma: number;
  gammaF: number;
  cob: number;
  c: Concrete;
  fyd: number;
  /** ρmín da armadura de flexão da mesa (padrão 0,15 %). */
  rhoMin: number;
}

/**
 * Armadura da mesa em balanço como laje em balanço de 1 m: M_d = γf·q·ℓ²/2 na face da alma, q = σ do solo − peso da mesa (a
 * mesa em cima do solo; mesa superior, sem solo: só a armadura mínima), As por `beamFlexure` numa faixa de 1 m, mínimo
 * ρmín·hf, armadura de distribuição de 20 % da principal (mín. 0,5·ρmín·hf) e cortante a d da face contra VRd1 [a confirmar].
 * Devolve também os avisos (`msgs`).
 */
export function mesaEmBalanco(e: EntradaMesaBalanco, msgs: string[]): MesaBalanco | null {
  const g = e.g;
  if (!g.temMesa) return null;
  const d = g.hf - e.cob - 0.01;
  const q = Math.max(0, e.sigma - GAMA_CONCRETO_VF * g.hf);
  const l = g.balanco, Md = (e.gammaF * q * l * l) / 2;
  const base: Omit<MesaBalanco, 'As' | 'AsMin' | 'AsAdot' | 'barras' | 'distribuicao' | 'cortante'> = {
    tipo: g.tipo as 'T' | 'L', mesa: g.mesa, bf: g.bf, hf: g.hf, balanco: l, d, q, Md,
  };
  if (d <= 0.03) {
    msgs.push(`Viga de fundação: mesa de ${f2(g.hf)} cm — fina demais para o cobrimento (d = ${f2(d)} cm); aumente a espessura da mesa.`);
    return { ...base, As: 0, AsMin: 0, AsAdot: 0, barras: null, distribuicao: { As: 0, barras: null }, cortante: { Vd: 0, VRd1: 0, ok: false } };
  }
  const fl = Md > 0 ? beamFlexure({ kind: 'rect', bw: 1, h: g.hf }, false, Md, d, 0.05, e.c, e.fyd) : null;
  const As = fl ? fl.As : 0;
  if (fl?.double) msgs.push(`Viga de fundação: mesa — armadura dupla (x limitado); aumente a espessura da mesa.`);
  const AsMin = e.rhoMin * g.hf;
  const AsAdot = Math.max(As, AsMin);
  const barras = barrasPorMetro(AsAdot, 0.1, 0.2, PHIS_MESA, g.hf);
  if (!barras) msgs.push(`Viga de fundação: mesa — armadura transversal não coube com espaçamento entre 10 e 20 cm (${(AsAdot * 1e4).toFixed(1).replace('.', ',')} cm²/m).`);
  const AsDist = Math.max(0.2 * (barras?.As ?? AsAdot), 0.5 * e.rhoMin * g.hf);
  const dist = barrasPorMetro(AsDist, 0.08, 0.33, [6.3, 8, 10, 12.5], g.hf);
  const Vd = e.gammaF * q * Math.max(0, l - d), R = vrd1(e.c, 1, d, barras?.As ?? AsAdot);
  const cortante = { Vd, VRd1: R, ok: Vd <= R + 1e-9 };
  if (!cortante.ok) msgs.push(`Viga de fundação: mesa — cisalhamento a d da face da alma, Vd = ${Vd.toFixed(1).replace('.', ',')} > VRd1 = ${R.toFixed(1).replace('.', ',')} kN/m; aumente a espessura da mesa.`);
  return { ...base, As: As * 1e4, AsMin: AsMin * 1e4, AsAdot: AsAdot * 1e4, barras, distribuicao: { As: AsDist * 1e4, barras: dist }, cortante };
}

/** Mensagem de erro da forma (para comandos e avisos), ou null. */
export function erroFormaVF(bw: number, h: number, forma?: FormaVF, mesaPadrao: 'inferior' | 'superior' = 'inferior'): string | null {
  return geoSecaoVF(bw, h, forma, mesaPadrao).erro ?? null;
}
