// Detalhamento das lajes maciças (frente R4, NBR 6118 9.4, 19.3, 19.4 e 20.1): a partir das armaduras por metro
// do dimensionamento (Wood-Armer, mínimos e fissuração) e do diagrama de momentos da grelha, dispõe por laje:
// positivas em malha nas duas direções cobrindo o pano (barras recortadas pelo contorno e pelos furos, ancoradas
// além da face dos apoios), negativas sobre as bordas contínuas (comprimento pelo diagrama decalado + ancoragem, com
// um mínimo em % do vão) e negativas de borda sem continuidade (19.3.3.2), armadura de distribuição sob os
// negativos, armadura de borda livre (U), malha superior de canto e reforço junto aos furos. Comprimentos
// arredondados para cima; emenda por traspasse acima da barra máxima; resumo do aço por bitola com perdas.
import { barArea, beamFlexure, type Concrete } from '../concrete';
import type { P } from '../geom/faces';
import { direcaoPrincipal, type AnaliseEdificio, type GrelhaPavimento } from './analitico';
import { alfa0t, ganchoNoventa, lbBasico } from './detalhamento';
import { linhaLajes, tabelaDe, type LinhaLajes } from './tabelasArmadura';
import type { Dimensionamento, ResultadoLaje } from './dimensionamento';
import { acoDe, cobrimentoLaje, cobrimentoViga, concretoDe, gamas } from './materiais';
import { aplicarEdicoes, uniformizarLajes, type Exigencias } from './lajesEdicao';
import type { OpcoesCalculo } from './opcoes';
import { areaBarraBase, areaTela, PAINEL_TELA, resumoTelas, telaPor, type PainelTela } from './telasSoldadas';
import type { FonteNormas } from '../normas';
import { casosDaObra, geometriaViga, pavimentosDoGrupo, type BaseFaceLaje, type BuildingModel, type Laje, type Viga } from './types';

/** Taxa mínima das lajes (mesma do dimensionamento, 0,15 % para qualquer fck, a confirmar). */
export const RHO_MIN_LAJE = 0.0015;

export type TipoBarraLaje = 'positiva' | 'base' | 'reforco' | 'predefinida' | 'negativa' | 'negativa-borda' | 'distribuicao' | 'borda-livre' | 'borda-livre-long' | 'canto' | 'furo';
export interface PosicaoLaje {
  /** Posição dentro da laje (N1, N2, …). */
  pos: string;
  face: 'inf' | 'sup';
  tipo: TipoBarraLaje;
  /** Ângulo da barra (graus, anti-horário a partir de +x) e direção da malha (0 = principal, 1 = perpendicular) quando houver. */
  angulo: number; dir?: 0 | 1;
  phi: number;
  /** Espaçamento (m); 0 quando a posição não é distribuída (barras longitudinais de borda). */
  s: number;
  /** Quantidade por laje (um pavimento). */
  n: number;
  /** Comprimento de cada barra (m), arredondado, com ganchos e pernas. */
  comprimento: number;
  /** Gancho (90°) ou perna em cada ponta (m de barra desenvolvida; 0 = ponta reta). */
  ganchos: [number, number];
  /** Barra representativa (coordenadas da planta, m, sem ganchos) e linha de distribuição. */
  a: P; z: P; faixa: [P, P];
  /** Negativos: comprimento de cada lado do eixo do apoio (m), lado da laje e lado de fora / da vizinha. */
  lados?: [number, number];
  /** Bordas contínuas: laje do outro lado. */
  vizinha?: string;
  /** Posição editada pelo usuário (R7e), uniformizada por uma zona (id) e grupo de posições (índice), quando houver. */
  editada?: true; uniforme?: string; grupo?: number;
}
export interface BordaLaje {
  /** Aresta do contorno (k → k+1) e trecho dela (m a partir do vértice k). */
  aresta: number; s0: number; s1: number;
  tipo: 'continua' | 'apoiada' | 'livre';
  vizinha?: string; viga?: string;
}
/** Base de uma face: tela (designação, giro) ou barras por direção; área (cm²/m) por direção e a indicação para o desenho. */
export interface BaseDetalhe { tela?: string; giro?: boolean; dir: ({ phi: number; s: number } | null)[]; As: [number, number]; nota: string }
export interface DetalheLaje {
  laje: string; nome: string;
  /** Pavimentos em que a laje se repete (grupo). */
  repeticoes: number;
  h: number;
  /** Ângulo da direção 0 da malha (graus). */
  angulo: number;
  /** Armadura positiva adotada por direção (bitola mm, espaçamento m, As cm²/m efetiva e necessária). */
  positivas: { phi: number; s: number; As: number; AsNec: number; secundaria: boolean; /** Armadura base da direção (cm²/m) e se há reforço sobre ela (R7d). */ base?: number; reforco?: boolean }[];
  /** Armadura base (R7d): `detalhada` = desenhada e medida; sem ela só a indicação (φ c/ s ou a designação da tela). */
  base?: { detalhada: boolean; inf?: BaseDetalhe; sup?: BaseDetalhe };
  /** Painéis de tela soldada da base detalhada (R7d). */
  paineis?: PainelTela[];
  bordas: BordaLaje[];
  posicoes: PosicaoLaje[];
  /** Edição e uniformização (R7e): contagens, só quando algo foi aplicado nesta laje. */
  edicao?: { editadas: number; uniformizadas: number; semCalculo: boolean; emendasDobra: number; media: boolean };
  /** Comprimentos de ancoragem básicos (m) das positivas (boa aderência) e das negativas. */
  lb: { inf: number; sup: number; supBoaAderencia: boolean };
  /** Emendas por traspasse das positivas: direção, l0 (m) e número de linhas de barras emendadas. */
  emendas: { dir: 0 | 1; l0: number; linhas: number }[];
  /** Peso de aço de uma laje (kg, sem perdas). */
  peso: number;
  avisos: string[];
}

const pesoLinear = (phi: number) => barArea(phi) * 7850;
const arred = (x: number, passo: number) => Math.ceil(x / passo - 1e-9) * passo;
const fmt = (x: number, c = 0) => x.toFixed(c).replace('.', ',');
const BITOLAS_LAJE = [5, 6.3, 8, 10, 12.5, 16];

/**
 * Bitola e espaçamento para As (m²/m): a menor bitola da lista (≥ mínima, ≤ h/8, 20.1) com espaçamento ≥ smin,
 * espaçamento arredondado para baixo ao centímetro e ≤ smax. Sem solução, a maior bitola em smin (`cabe` falso).
 */
export function escolherBarrasLaje(As: number, h: number, smax: number, smin: number, phiMin: number, ca60: boolean, linha?: LinhaLajes): { phi: number; s: number; As: number; cabe: boolean } {
  // tabela de armadura (R7a): bitolas da linha e espaçamentos mínimo/máximo próprios (0 = pela opção e pela NBR)
  if (linha?.sMin) smin = linha.sMin / 100;
  if (linha?.sMax) smax = Math.min(smax, linha.sMax / 100);
  const lista = BITOLAS_LAJE.filter((p) => p >= phiMin - 1e-9 && (p >= 6.3 || ca60) && p <= (h * 1000) / 8 + 1e-9 && (!linha || linha.bitolas.includes(p)));
  const ls = lista.length ? lista : [(linha ? [...linha.bitolas].sort((x, y) => x - y).find((p) => p >= 6.3 || ca60) : undefined) ?? BITOLAS_LAJE.find((p) => p >= 6.3 || ca60)!];
  for (const phi of ls) {
    const s = Math.floor(Math.min(smax, As > 0 ? barArea(phi) / As : smax) * 100 + 1e-6) / 100;
    if (s >= smin - 1e-9) return { phi, s, As: barArea(phi) / s, cabe: true };
  }
  const phi = ls.at(-1)!;
  return { phi, s: smin, As: barArea(phi) / smin, cabe: barArea(phi) / smin >= As - 1e-12 };
}

/** Comprimento de ancoragem necessário (9.4.2.5): lb·As,calc/As,ef ≥ lb,mín = máx(0,3·lb; 10φ; 10 cm). */
export function lbNecessario(lb: number, phiMm: number, AsCalc: number, AsEf: number): number {
  return Math.max(lb * (AsEf > 0 ? Math.min(1, AsCalc / AsEf) : 1), 0.3 * lb, (10 * phiMm) / 1000, 0.1);
}

const sub = (a: P, z: P): P => [a[0] - z[0], a[1] - z[1]];
const dot = (a: P, z: P) => a[0] * z[0] + a[1] * z[1];
const add = (a: P, v: P, k = 1): P => [a[0] + v[0] * k, a[1] + v[1] * k];
const r4 = (p: P): P => [+p[0].toFixed(4), +p[1].toFixed(4)];
/** Distância de um ponto ao contorno de um polígono (m). */
function distPoligono(r: P[], p: P): number { let m = Infinity; for (let i = 0; i < r.length; i++) m = Math.min(m, distSeg(p, r[i], r[(i + 1) % r.length])); return m; }
function distSeg(p: P, a: P, z: P) {
  const d = sub(z, a), L2 = dot(d, d), u = L2 ? Math.max(0, Math.min(1, dot(sub(p, a), d) / L2)) : 0;
  return Math.hypot(a[0] + u * d[0] - p[0], a[1] + u * d[1] - p[1]);
}

/** Vigas do grupo com o eixo como segmentos, para achar a viga sob uma borda. */
function segmentosVigas(b: BuildingModel, grupo: string): { v: Viga; a: P; z: P }[] {
  const out: { v: Viga; a: P; z: P }[] = [];
  for (const v of b.vigas.filter((x) => x.grupo === grupo)) {
    const e = geometriaViga(v).eixo;
    for (let i = 0; i + 1 < e.length; i++) out.push({ v, a: [e[i][0], e[i][1]], z: [e[i + 1][0], e[i + 1][1]] });
  }
  return out;
}

/** Viga cujo eixo passa por p paralelo à direção u (tolerância: meia largura da viga + 1 cm). */
function vigaSob(segs: { v: Viga; a: P; z: P }[], p: P, u: P): Viga | undefined {
  let melhor: Viga | undefined, dm = Infinity;
  for (const s of segs) {
    const d = sub(s.z, s.a), L = Math.hypot(d[0], d[1]) || 1;
    if (Math.abs(u[0] * d[1] - u[1] * d[0]) / L > 0.05) continue;
    const dist = distSeg(p, s.a, s.z);
    if (dist <= s.v.secao.b / 2 + 0.01 && dist < dm) { dm = dist; melhor = s.v; }
  }
  return melhor;
}

/** Bordas da laje: trechos contínuos com outra laje do grupo, apoiados em viga ou livres. */
export function bordasDaLaje(b: BuildingModel, l: Laje): BordaLaje[] {
  const segs = segmentosVigas(b, l.grupo), outras = b.lajes.filter((x) => x.grupo === l.grupo && x.id !== l.id);
  const c = l.contorno, out: BordaLaje[] = [];
  for (let k = 0; k < c.length; k++) {
    const P0 = c[k], Q = c[(k + 1) % c.length], L = Math.hypot(Q[0] - P0[0], Q[1] - P0[1]);
    if (L < 1e-6) continue;
    const e: P = [(Q[0] - P0[0]) / L, (Q[1] - P0[1]) / L], nrm: P = [-e[1], e[0]];
    const cont: { s0: number; s1: number; viz: string }[] = [];
    for (const o of outras) for (let j = 0; j < o.contorno.length; j++) {
      const R = o.contorno[j], S = o.contorno[(j + 1) % o.contorno.length];
      if (Math.abs(dot(sub(R, P0), nrm)) > 0.01 || Math.abs(dot(sub(S, P0), nrm)) > 0.01) continue;
      const tR = dot(sub(R, P0), e), tS = dot(sub(S, P0), e), s0 = Math.max(0, Math.min(tR, tS)), s1 = Math.min(L, Math.max(tR, tS));
      if (s1 - s0 > 0.05) cont.push({ s0, s1, viz: o.id });
    }
    cont.sort((x, z) => x.s0 - z.s0);
    // trechos restantes: apoiados em viga ou livres (pelo meio do trecho)
    const resto: [number, number][] = [];
    let ini = 0;
    for (const t of cont) { if (t.s0 > ini + 0.05) resto.push([ini, t.s0]); ini = Math.max(ini, t.s1); }
    if (L > ini + 0.05) resto.push([ini, L]);
    const itens: BordaLaje[] = cont.map((t) => ({ aresta: k, s0: t.s0, s1: t.s1, tipo: 'continua', vizinha: t.viz, viga: vigaSob(segs, add(P0, e, (t.s0 + t.s1) / 2), e)?.id }));
    for (const [s0, s1] of resto) {
      const v = vigaSob(segs, add(P0, e, (s0 + s1) / 2), e);
      itens.push(v ? { aresta: k, s0, s1, tipo: 'apoiada', viga: v.id } : { aresta: k, s0, s1, tipo: 'livre' });
    }
    out.push(...itens.sort((x, z) => x.s0 - z.s0));
  }
  return out;
}

/** Fatores mínimo e máximo de cada caso nas ELU (G: 1,0 a γg; Q: 0 a γq; os demais não entram na grelha). */
function faixasELU(b: BuildingModel, an: AnaliseEdificio): [number, number][] {
  const obra = casosDaObra(b), gm = gamas(b);
  return an.casos.map((id) => { const n = obra.find((c) => c.id === id)?.natureza ?? 'G'; return n === 'G' ? [1, gm.g] : n === 'H' ? [1, gm.h] : n === 'Q' ? [0, gm.q] : [0, 0]; });
}

/**
 * Diagrama de momentos da grelha junto a uma borda (envoltória mínima das ELU, kN·m/m; + traciona embaixo), nas
 * barras da laje na direção k: extensão x0 (m, a partir do eixo da borda, até `lim`) com momento negativo e menor
 * momento a até `perto` m da borda.
 */
export function negativoJuntoBorda(grs: GrelhaPavimento[], lajeId: string, k: 0 | 1, P0: P, e: P, nrm: P, s0: number, s1: number, lim: number, perto: number, fx: [number, number][]): { x0: number; Mmin: number } {
  let x0 = 0, Mmin = 0;
  const vistos = new Set<unknown>();
  for (const g of grs) {
    const m = g.modelo, res = g.res;
    // grelhas iguais do grupo compartilham a solução (cache da análise): contribuem igual ao máximo e ao mínimo
    if (!res || vistos.has(res)) continue;
    vistos.add(res);
    m.barras.forEach((br, i) => {
      const tg = g.barras[i];
      if (tg.tipo !== 'laje' || tg.ref !== lajeId || tg.dir !== k || !tg.largura) return;
      const pts: P[] = [[m.nos[br.i][0], m.nos[br.i][1]], [m.nos[br.j][0], m.nos[br.j][1]]];
      const sp = pts.map((p) => dot(sub(p, P0), e)), t = pts.map((p) => dot(sub(p, P0), nrm));
      if (sp.some((x) => x < s0 - 0.01 || x > s1 + 0.01) || Math.min(...t) > lim || Math.max(...t) < -0.01) return;
      const M = [0, 6].map((o) => fx.reduce((acc, [f0, f1], ic) => { const v = (o === 0 ? -res.esforcos[ic][i][5] : res.esforcos[ic][i][11]) / tg.largura!; return acc + Math.min(f0 * v, f1 * v); }, 0));
      for (const j of [0, 1]) if (t[j] <= perto && M[j] < Mmin) Mmin = M[j];
      const [ta, tb] = t, [Ma, Mb] = M;
      if (Ma < -1e-6 && Mb < -1e-6) x0 = Math.max(x0, Math.min(lim, Math.max(ta, tb)));
      else if (Ma < -1e-6 || Mb < -1e-6) {
        const [tn, tp, Mn, Mp] = Ma < 0 ? [ta, tb, Ma, Mb] : [tb, ta, Mb, Ma];
        x0 = Math.max(x0, Math.min(lim, tn + ((tp - tn) * Mn) / (Mn - Mp)));
      }
    });
  }
  return { x0: Math.max(0, x0), Mmin };
}

/** Trechos internos (coordenada a) da reta c = cte dentro dos anéis (regra par-ímpar), com o anel e a aresta de cada ponta. */
function cortes(aneis: P[][], c: number): { a0: number; a1: number; ponta: [[number, number], [number, number]] }[] {
  const t: { a: number; anel: number; k: number }[] = [];
  aneis.forEach((anel, ia) => {
    for (let i = 0; i < anel.length; i++) {
      const p = anel[i], q = anel[(i + 1) % anel.length];
      if ((p[1] > c) !== (q[1] > c)) t.push({ a: p[0] + ((c - p[1]) * (q[0] - p[0])) / (q[1] - p[1]), anel: ia, k: i });
    }
  });
  t.sort((u, w) => u.a - w.a);
  const out: { a0: number; a1: number; ponta: [[number, number], [number, number]] }[] = [];
  for (let k = 0; k + 1 < t.length; k += 2) if (t[k + 1].a - t[k].a > 1e-6) out.push({ a0: t[k].a, a1: t[k + 1].a, ponta: [[t[k].anel, t[k].k], [t[k + 1].anel, t[k + 1].k]] });
  return out;
}

/**
 * Momentos positivos máximos (kN·m/m, envoltória ELU) de cada linha da grelha da laje na direção k, com a largura que cada
 * uma representa: base da armadura média uniforme por direção (R7e). As linhas são agrupadas pela coordenada transversal (5 cm).
 */
export function momentosPositivosPorLinha(grs: GrelhaPavimento[], lajeId: string, k: 0 | 1, fx: [number, number][]): { M: number; w: number }[] {
  const vistos = new Set<unknown>(), linhas = new Map<number, { M: number; w: number }>();
  for (const g of grs) {
    const m = g.modelo, res = g.res;
    if (!res || vistos.has(res)) continue;
    vistos.add(res);
    m.barras.forEach((br, i) => {
      const tg = g.barras[i];
      if (tg.tipo !== 'laje' || tg.ref !== lajeId || tg.dir !== k || !tg.largura) return;
      const a = m.nos[br.i], z = m.nos[br.j], dx = z[0] - a[0], dy = z[1] - a[1], L = Math.hypot(dx, dy) || 1;
      const chave = Math.round(((-a[0] * dy + a[1] * dx) / L) * 20);
      let Mp = 0;
      for (const o of [0, 6]) Mp = Math.max(Mp, fx.reduce((acc, [f0, f1], ic) => { const v = (o === 0 ? -res.esforcos[ic][i][5] : res.esforcos[ic][i][11]) / tg.largura!; return acc + Math.max(f0 * v, f1 * v); }, 0));
      const e = linhas.get(chave) ?? { M: 0, w: tg.largura! };
      e.M = Math.max(e.M, Mp);
      linhas.set(chave, e);
    });
  }
  return [...linhas.values()];
}

export function detalharLaje(b: BuildingModel, l: Laje, porLaje: Map<string, ResultadoLaje[]>, an: AnaliseEdificio, op: OpcoesCalculo, saida?: { exig: Exigencias }): DetalheLaje | null {
  const rs0 = porLaje.get(l.id) ?? [];
  if (l.tipo.tipo !== 'macica' || !rs0.length) return null;
  // armadura gerada só com a geometria (R7e): mínimos e base, sem os esforços da grelha
  const sem = !!l.semCalculo, rs: ResultadoLaje[] = sem ? [{ ...rs0[0], As: { pos: [RHO_MIN_LAJE * l.tipo.h * 1e4, RHO_MIN_LAJE * l.tipo.h * 1e4], neg: [0, 0] } }] : rs0;
  const linhasDobra = (b.linhasDobra ?? []).filter((x) => x.grupo === l.grupo);
  const h = l.tipo.h, cob = cobrimentoLaje(b, l.cobrimento), c: Concrete = concretoDe(b, 'laje');
  const aI = acoDe(b, 'lajeInf'), aS = acoDe(b, 'lajeSup'), ca60I = aI.aco === 'CA-60', ca60S = aS.aco === 'CA-60';
  const passo = op.arredondamento / 100, Lmax = op.barraMaxima, smin = op.lajeEspacamentoMinimo / 100, smaxP = Math.min(2 * h, 0.2);
  const linha = linhaLajes(tabelaDe(b, 'lajes', l.tabela), h);
  const avisos: string[] = [], posicoes: PosicaoLaje[] = [], emendas: DetalheLaje['emendas'] = [];
  let np = 0, mediaUsada = false, emendasDobra = 0;
  /** `As` (cm²/m): área exigida pelo cálculo, para verificar a edição; a cobertura da faixa e o comprimento calculado vêm da posição. */
  const nova = (p: Omit<PosicaoLaje, 'pos'>, As?: number) => {
    const x = { pos: `N${++np}`, ...p, a: r4(p.a), z: r4(p.z), faixa: [r4(p.faixa[0]), r4(p.faixa[1])] as [P, P] };
    posicoes.push(x);
    if (saida && As !== undefined) saida.exig.set(x.pos, { As, cobertura: Math.hypot(x.faixa[1][0] - x.faixa[0][0], x.faixa[1][1] - x.faixa[0][1]), comprimento: x.comprimento });
    return x;
  };
  const th0 = (direcaoPrincipal(l.contorno) * Math.PI) / 180;
  const U: [P, P] = [[Math.cos(th0), Math.sin(th0)], [-Math.sin(th0), Math.cos(th0)]];
  const ang = (u: P) => +(((Math.atan2(u[1], u[0]) * 180) / Math.PI + 360) % 360).toFixed(3);
  const extensao = (u: P) => { const pr = l.contorno.map((q) => dot(q, u)); return Math.max(...pr) - Math.min(...pr); };
  const ext: [number, number] = [extensao(U[0]), extensao(U[1])];
  const bordas = bordasDaLaje(b, l);
  const grs = sem ? [] : an.grelhas.filter((g) => g.res && pavimentosDoGrupo(b, l.grupo).some((p) => p.id === g.pavimento));
  const fx = faixasELU(b, an);
  const vigaDe = (id?: string) => (id ? b.vigas.find((v) => v.id === id) : undefined);
  const supBoa = h - cob.sup <= 0.3; // 9.3.1: a menos de 30 cm da face inferior (h < 60 cm)
  const lbI = (phi: number) => lbBasico(phi, c, aI.fyd, true, ca60I), lbS = (phi: number) => lbBasico(phi, c, aS.fyd, supBoa, ca60S);
  const dI = h - cob.inf - 0.005, dS = h - cob.sup - 0.005, aL = op.lajeDecalagem * Math.min(dI, dS);
  const perna = op.lajePernasNegativos ? Math.max(0, h - cob.sup - cob.inf) : 0;

  // ---- armadura base (R7d): área por direção, indicação e reforço = necessária − base
  const baseLaje = l.base, baseDet = baseLaje?.detalhada ?? op.lajeBaseDetalhada === 1;
  const barraBase = (f: BaseFaceLaje | undefined, k: 0 | 1): { phi: number; s: number } | null => {
    if (f?.tela) { const t = telaPor(f.tela, b); return t ? (((f.giro ? 1 - k : k) === 0) ? { phi: t.phiL, s: t.sL / 100 } : { phi: t.phiT, s: t.sT / 100 }) : null; }
    const x = f?.barras?.[k]; return x ? { phi: x.phi, s: x.s / 100 } : null;
  };
  const areaBase = (f: BaseFaceLaje | undefined): [number, number] => {
    if (f?.tela) { const t = telaPor(f.tela, b); return t ? areaTela(t, f.giro) : [0, 0]; }
    return [0, 1].map((k) => { const x = f?.barras?.[k]; return x ? areaBarraBase(x.phi, x.s) : 0; }) as [number, number];
  };
  const baseInf = areaBase(baseLaje?.inf), baseSup = areaBase(baseLaje?.sup);
  if (baseLaje?.inf?.tela && !telaPor(baseLaje.inf.tela, b)) avisos.push(`Tela ${baseLaje.inf.tela} da base inferior não está no catálogo.`);
  if (baseLaje?.sup?.tela && !telaPor(baseLaje.sup.tela, b)) avisos.push(`Tela ${baseLaje.sup.tela} da base superior não está no catálogo.`);
  /** Reforço sobre a base: com a redução de densidade, a bitola da base em espaçamento múltiplo (uma barra a cada k da base). */
  const escolherReforco = (ref: number, smax: number, bb: { phi: number; s: number } | null, ca60: boolean, hh = h) => {
    if (op.lajeReforcoReducao && bb) {
      const A = barArea(bb.phi), m = Math.min(Math.floor(A / (ref * bb.s) + 1e-9), Math.floor(smax / bb.s + 1e-9));
      if (m >= 1 && bb.s * m >= smin - 1e-9) { const sr = +(bb.s * m).toFixed(4); return { phi: bb.phi, s: sr, As: A / sr, cabe: true }; }
    }
    return escolherBarrasLaje(ref, hh, smax, smin, op.lajeBitolaMinima, ca60, linha);
  };
  const pre = l.predefinidas ?? [];
  const dirPre = (a: number) => [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)] as P;

  // ---- positivas: malha nas duas direções (a maior As de todos os pavimentos do grupo), recortada pelo contorno e furos
  const AsNec = [0, 1].map((k) => Math.max(...rs.map((r) => r.As.pos[k])) / 1e4);
  // armadura média uniforme por direção (R7e): lajes de quatro lados apoiados em vigas, sem furos nem borda livre
  if (op.lajeArmaduraMedia && !sem && l.contorno.length === 4 && !(l.furos ?? []).length && bordas.length && bordas.every((x) => x.tipo !== 'livre')) {
    let usou = false;
    for (const k of [0, 1] as const) {
      const linhas = momentosPositivosPorLinha(grs, l.id, k, fx), Mmax = Math.max(0, ...linhas.map((x) => x.M)), W = linhas.reduce((t, x) => t + x.w, 0);
      if (Mmax <= 1e-9 || W <= 0) continue;
      const Mmed = linhas.reduce((t, x) => t + x.w * x.M, 0) / W, amin = RHO_MIN_LAJE * h;
      const novo = Math.max(amin, AsNec[k] * (Mmed / Mmax));
      if (novo < AsNec[k] - 1e-12) { AsNec[k] = novo; usou = true; }
    }
    if (usou) { mediaUsada = true; avisos.push(`Armadura positiva média uniforme por direção (opção): média dos momentos positivos máximos das linhas da grelha em vez do máximo.`); }
  }
  const umaDirecao = Math.max(...ext) / Math.max(1e-9, Math.min(...ext)) > 2;
  const reforcoK: ({ phi: number; s: number; As: number } | null)[] = [null, null];
  const positivas = ([0, 1] as const).map((k) => {
    const sec = umaDirecao && ext[k] > ext[1 - k];
    const smaxK = sec ? 0.33 : smaxP, bK = baseInf[k] / 1e4, bb = barraBase(baseLaje?.inf, k);
    if (bK > 0 && bb) {
      // base inferior: reforço = necessária − base (a base é sempre colaborante)
      const ref = Math.max(0, AsNec[k] - bK);
      if (ref > 1e-9) {
        const r = escolherReforco(ref, smaxK, bb, ca60I);
        if (!r.cabe) avisos.push(`Reforço da positiva na direção ${k}: ${fmt(ref * 1e4, 2)} cm²/m não cabe com espaçamento ≥ ${fmt(smin * 100)} cm e φ ≤ h/8.`);
        reforcoK[k] = r;
      }
      const r = reforcoK[k];
      return { phi: r?.phi ?? bb.phi, s: r?.s ?? bb.s, As: +((bK + (r?.As ?? 0)) * 1e4).toFixed(3), AsNec: +(AsNec[k] * 1e4).toFixed(3), secundaria: sec, base: +baseInf[k].toFixed(3), reforco: !!r };
    }
    const br = escolherBarrasLaje(AsNec[k], h, smaxK, smin, op.lajeBitolaMinima, ca60I, linha);
    if (!br.cabe) avisos.push(`Positiva na direção ${k}: ${fmt(AsNec[k] * 1e4, 2)} cm²/m não cabe com espaçamento ≥ ${fmt(smin * 100)} cm e φ ≤ h/8.`);
    return { phi: br.phi, s: br.s, As: +(br.As * 1e4).toFixed(3), AsNec: +(AsNec[k] * 1e4).toFixed(3), secundaria: sec };
  });
  const aneisGlob = [l.contorno, ...(l.furos ?? [])];
  /** Malha de barras na direção k (face inf/sup), recortada pelo contorno e pelos furos. `exig`: As exigida e As da camada (m²/m), para descontar predefinidas. */
  const gerarMalha = (k: 0 | 1, face: 'inf' | 'sup', phi: number, s: number, tipo: TipoBarraLaje, exig?: { Ar: number; Al: number }) => {
    const ua = U[k], uc = U[1 - k], cobF = face === 'inf' ? cob.inf : cob.sup;
    const loc = (p: P): P => [dot(p, ua), dot(p, uc)], glob = (a: number, cc: number): P => add(add([0, 0], ua, a), uc, cc);
    const aneis = aneisGlob.map((r) => r.map(loc));
    const cs = aneis[0].map((p) => p[1]), cmin = Math.min(...cs), W = Math.max(...cs) - cmin;
    const nL = Math.max(1, Math.ceil(W / s - 1e-9)), passoC = W / nL;
    const lb = (face === 'inf' ? lbI : lbS)(phi), l0 = alfa0t(1) * lb;
    // linhas de dobra (R7e) em coordenadas locais: locais preferenciais de emenda da armadura inferior
    const dobras = face === 'inf' ? linhasDobra.map((ln) => [loc(ln.a), loc(ln.z)] as [P, P]) : [];
    /** Abscissas (ao longo da barra) em que as linhas de dobra cruzam a reta c = cc. */
    const dobrasEm = (cc: number) => dobras.flatMap(([pa, pz]) => (Math.abs(pz[1] - pa[1]) > 1e-9 && (pa[1] - cc) * (pz[1] - cc) <= 0 ? [pa[0] + ((cc - pa[1]) * (pz[0] - pa[0])) / (pz[1] - pa[1])] : []));
    /** Extensão da ponta além da borda (m, ao longo da barra; negativa = recua) e gancho. */
    const ponta = (anel: number, ar: number, pt: P): { ext: number; g: number; cont?: boolean } => {
      if (anel > 0) return { ext: -cobF, g: 0 }; // furo: barra interrompida antes da borda (reforço ao lado)
      const Pa = l.contorno[ar], Pz = l.contorno[(ar + 1) % l.contorno.length], Le = Math.hypot(Pz[0] - Pa[0], Pz[1] - Pa[1]) || 1;
      const e: P = [(Pz[0] - Pa[0]) / Le, (Pz[1] - Pa[1]) / Le], cosf = Math.max(0.3, Math.abs(ua[0] * -e[1] + ua[1] * e[0]));
      const sp = dot(sub(pt, Pa), e), bd = bordas.find((x) => x.aresta === ar && sp >= x.s0 - 1e-6 && sp <= x.s1 + 1e-6) ?? bordas.find((x) => x.aresta === ar)!;
      const v = vigaDe(bd.viga), bw = v?.secao.b ?? 0, cv = v ? cobrimentoViga(b, v.cobrimento).lat : 0;
      if (bd.tipo === 'livre') return { ext: -cobF / cosf, g: 0 };
      if (bd.tipo === 'continua') return { ext: Math.max(0, (10 * phi) / 1000 - bw / 2) / cosf, g: 0, cont: true };
      // apoio sem continuidade: atravessa a viga até a face oposta menos o cobrimento; gancho se não couber máx(10φ; 6 cm)
      const disp = bw - cv, req = Math.max((10 * phi) / 1000, 0.06);
      if (disp >= req - 1e-9) return { ext: (bw / 2 - cv) / cosf, g: 0 };
      if (disp < Math.max((8 * phi) / 1000, 0.06) - 1e-9) avisos.push(`Ancoragem da positiva φ${fmt(phi, 1)} na viga ${v?.nome ?? '?'}: ${fmt(disp * 100)} cm disponíveis < ${fmt(Math.max(8 * phi / 10, 6))} cm (r + 5,5φ; 6 cm).`);
      return { ext: Math.max(0, bw / 2 - cv) / cosf, g: ganchoNoventa(phi) };
    };
    type Peca = { a0: number; a1: number; g: [number, number]; L: number };
    // predefinidas paralelas às barras desta camada: faixa de influência (n × s) em coordenadas locais
    const faixasPre = exig && face === 'inf' ? preInf.filter((x) => Math.abs(dirPre(x.angulo)[0] * ua[1] - dirPre(x.angulo)[1] * ua[0]) < 0.0872).map((x) => {
      const d = dirPre(x.angulo), nl: P = [-d[1], d[0]], sg = dot(d, ua) >= 0 ? 1 : -1, c0 = dot(x.a, uc), dc = dot(nl, uc), ca = c0 - (x.s / 2) * dc, cb2 = c0 + ((x.n - 1) * x.s + x.s / 2) * dc, a0 = dot(x.a, ua), a1 = a0 + sg * x.comprimento;
      return { c0: Math.min(ca, cb2), c1: Math.max(ca, cb2), a0: Math.min(a0, a1), a1: Math.max(a0, a1), Ap: barArea(x.phi) / x.s };
    }) : [];
    const linhas: { c: number; pecas: Peca[] }[] = [];
    for (let i = 0; i < nL; i++) {
      const cc = cmin + (i + 0.5) * passoC, pecas: Peca[] = [];
      for (const ch of cortes(aneis, cc)) {
        const p0 = ponta(ch.ponta[0][0], ch.ponta[0][1], glob(ch.a0, cc)), p1 = ponta(ch.ponta[1][0], ch.ponta[1][1], glob(ch.a1, cc));
        const a0 = ch.a0 - p0.ext, a1 = ch.a1 + p1.ext;
        if (a1 - a0 < 0.05) continue;
        const tot = a1 - a0 + p0.g + p1.g;
        if (tot <= Lmax + 1e-9) { pecas.push({ a0, a1, g: [p0.g, p1.g], L: arred(tot, passo) }); continue; }
        // linha de dobra (R7e): emenda com o centro na linha, a mais próxima do meio com as duas peças dentro da barra máxima
        if (dobras.length) {
          const meioBarra = (a0 + a1) / 2;
          const cand = dobrasEm(cc).filter((m) => m - l0 / 2 > a0 && m + l0 / 2 < a1).sort((u, w) => Math.abs(u - meioBarra) - Math.abs(w - meioBarra));
          let feito = false;
          for (const m of cand) {
            const q0: Peca = { a0, a1: m + l0 / 2, g: [p0.g, 0], L: 0 }, q1: Peca = { a0: m - l0 / 2, a1, g: [0, p1.g], L: 0 };
            q0.L = arred(q0.a1 - q0.a0 + q0.g[0], passo); q1.L = arred(q1.a1 - q1.a0 + q1.g[1], passo);
            if (q0.L > Lmax + 1e-9 || q1.L > Lmax + 1e-9) continue;
            pecas.push(q0, q1);
            const em3 = emendas.find((x) => x.dir === k);
            if (em3) em3.linhas++; else emendas.push({ dir: k, l0, linhas: 1 });
            emendasDobra++;
            feito = true;
            break;
          }
          if (feito) continue;
        }
        // base inferior: emenda com o centro junto à borda contínua (zona de máximo negativo), em duas peças
        if (tipo === 'base' && op.lajeBaseEmendaApoio && (p0.cont || p1.cont)) {
          // o centro da emenda a 10 % do comprimento da borda contínua; se a peça mais longa passar da barra máxima, o mais perto possível
          const dEnd = Math.max(0.1 * tot, l0), cont0 = !!p0.cont;
          let m = cont0 ? a0 + dEnd : a1 - dEnd;
          const limite = a0 + (Lmax - passo) - p0.g - l0 / 2;
          m = cont0 ? Math.max(m, a1 - (Lmax - passo) + p1.g + l0 / 2) : Math.min(m, limite);
          const q0: Peca = { a0, a1: m + l0 / 2, g: [p0.g, 0], L: 0 }, q1: Peca = { a0: m - l0 / 2, a1, g: [0, p1.g], L: 0 };
          q0.L = arred(q0.a1 - q0.a0 + q0.g[0], passo); q1.L = arred(q1.a1 - q1.a0 + q1.g[1], passo);
          if (q0.L <= Lmax + 1e-9 && q1.L <= Lmax + 1e-9 && q0.a1 - q0.a0 > l0 && q1.a1 - q1.a0 > l0 && Math.min(m - a0, a1 - m) <= 0.25 * tot) {
            pecas.push(q0, q1);
            const em2 = emendas.find((x) => x.dir === k);
            if (em2) em2.linhas++; else emendas.push({ dir: k, l0, linhas: 1 });
            continue;
          }
        }
        // emenda por traspasse l0t = α0t·lb (α0t = 2,0: todas as barras emendadas na mesma seção, a favor da segurança)
        let nP = Math.ceil((tot - l0) / (Lmax - l0) - 1e-9);
        for (; nP < 50; nP++) { const Lp = (tot + (nP - 1) * l0) / nP; if (arred(Lp, passo) <= Lmax + 1e-9) break; }
        const Lp = (tot + (nP - 1) * l0) / nP;
        for (let j = 0; j < nP; j++) {
          const s0 = a0 + j * (Lp - l0) - (j > 0 ? p0.g : 0), s1 = j === nP - 1 ? a1 : s0 + Lp - (j === 0 ? p0.g : 0);
          const g: [number, number] = [j === 0 ? p0.g : 0, j === nP - 1 ? p1.g : 0];
          pecas.push({ a0: Math.max(a0, s0), a1: Math.min(a1, s1), g, L: arred(Math.min(a1, s1) - Math.max(a0, s0) + g[0] + g[1], passo) });
        }
        const em = emendas.find((x) => x.dir === k);
        if (em) em.linhas++; else emendas.push({ dir: k, l0, linhas: 1 });
      }
      if (faixasPre.length && pecas.length) {
        // predefinida sobre a faixa: remove o reforço quando ela basta, senão mantém uma barra a cada m
        const am = (pecas[0].a0 + pecas[pecas.length - 1].a1) / 2, fp = faixasPre.find((f) => cc > f.c0 && cc < f.c1 && am >= f.a0 && am <= f.a1);
        if (fp && exig) {
          const need = exig.Ar - fp.Ap;
          if (need <= 1e-9) pecas.length = 0;
          else if (Math.floor((cc - fp.c0) / passoC + 1e-9) % Math.max(1, Math.floor(exig.Al / need + 1e-9)) !== 0) pecas.length = 0;
        }
      }
      linhas.push({ c: cc, pecas });
    }
    if (faixasPre.length) { const v = linhas.filter((x) => x.pecas.length); linhas.length = 0; linhas.push(...v); }
    // agrupa linhas consecutivas com as mesmas peças (comprimento arredondado e ganchos)
    const chave = (x: { pecas: Peca[] }) => x.pecas.map((p) => `${p.L.toFixed(3)}|${p.g[0] > 0}|${p.g[1] > 0}`).join(';');
    let i0 = 0;
    for (let i = 1; i <= linhas.length; i++) {
      if (i < linhas.length && chave(linhas[i]) === chave(linhas[i0])) continue;
      const grupo = linhas.slice(i0, i), rep = grupo[Math.floor(grupo.length / 2)];
      rep.pecas.forEach((pc) => {
        const am = (pc.a0 + pc.a1) / 2;
        nova({ face, tipo, angulo: ang(ua), dir: k, phi, s, n: grupo.length, comprimento: pc.L, ganchos: [pc.g[0], pc.g[1]], a: glob(pc.a0, rep.c), z: glob(pc.a1, rep.c), faixa: [glob(am, grupo[0].c), glob(am, grupo.at(-1)!.c)] }, exig && !faixasPre.length ? exig.Ar * 1e4 : undefined);
      });
      i0 = i;
    }
    // reforço junto aos furos: a área das barras interrompidas, metade de cada lado, prolongada lb além do furo
    for (const furo of aneis.slice(1)) {
      const fc = furo.map((p) => p[1]), fa = furo.map((p) => p[0]);
      const c0 = Math.min(...fc), c1 = Math.max(...fc), a0 = Math.min(...fa), a1 = Math.max(...fa);
      const nInt = linhas.filter((x) => x.c > c0 && x.c < c1).length;
      if (!nInt) continue;
      const nLado = Math.max(1, Math.ceil(nInt / 2)), L = arred(a1 - a0 + 2 * lb, passo);
      for (const cc of [c0 - Math.min(s, 0.05) , c1 + Math.min(s, 0.05)]) {
        nova({ face, tipo: 'furo', angulo: ang(ua), dir: k, phi, s: 0.05, n: nLado, comprimento: L, ganchos: [0, 0], a: glob(a0 - lb, cc), z: glob(a1 + lb, cc), faixa: [glob((a0 + a1) / 2, cc), glob((a0 + a1) / 2, cc + (cc < c0 ? -1 : 1) * 0.05 * (nLado - 1))] });
      }
      if (a0 - lb < Math.min(...aneis[0].map((p) => p[0])) || a1 + lb > Math.max(...aneis[0].map((p) => p[0]))) avisos.push(`Reforço do furo na direção ${k}: prolongamento lb passa da borda da laje; conferir a ancoragem.`);
    }
  };
  const preInf = pre.filter((x) => x.face === 'inf');
  for (const k of [0, 1] as const) {
    const bb = barraBase(baseLaje?.inf, k), bK = baseInf[k] / 1e4;
    if (bK > 0 && bb) {
      if (baseDet && !baseLaje!.inf!.tela) gerarMalha(k, 'inf', bb.phi, bb.s, 'base');
      const r = reforcoK[k];
      if (r) gerarMalha(k, 'inf', r.phi, r.s, 'reforco', { Ar: AsNec[k] - bK, Al: r.As });
    } else gerarMalha(k, 'inf', positivas[k].phi, positivas[k].s, 'positiva', { Ar: AsNec[k], Al: positivas[k].As / 1e4 });
  }
  if (baseDet) for (const k of [0, 1] as const) { const bb = barraBase(baseLaje?.sup, k); if (bb && !baseLaje?.sup?.tela) gerarMalha(k, 'sup', bb.phi, bb.s, 'base'); }

  // ---- painéis de tela soldada da base detalhada (padrão 2,45 × 6,00 m, traspasse entre painéis)
  const paineis: PainelTela[] = [];
  const painelDeTela = (face: 'inf' | 'sup', f: BaseFaceLaje | undefined) => {
    const t = telaPor(f?.tela, b);
    if (!t) return;
    const g = f!.giro ? 1 : 0, ua = U[g], uc = U[1 - g], cobF = face === 'inf' ? cob.inf : cob.sup, lap = op.lajeTelaTraspasse / 100;
    const loc = (p: P): P => [dot(p, ua), dot(p, uc)], glob = (a: number, cc: number): P => add(add([0, 0], ua, a), uc, cc);
    const aneis = aneisGlob.map((r) => r.map(loc)), cs = aneis[0].map((p) => p[1]);
    const cmin = Math.min(...cs) + cobF, cmax = Math.max(...cs) - cobF, Wt = cmax - cmin;
    if (Wt < 0.1) return;
    const Wp = PAINEL_TELA.largura, Lp = PAINEL_TELA.comprimento, nS = Wt <= Wp ? 1 : Math.ceil((Wt - Wp) / (Wp - lap) - 1e-9) + 1;
    for (let j = 0; j < nS; j++) {
      const c0 = cmin + j * (Wp - lap), c1 = Math.min(cmax, c0 + Wp), cm = (c0 + c1) / 2;
      for (const ch of cortes(aneis, cm)) {
        const A0 = ch.a0 + cobF, A1 = ch.a1 - cobF;
        if (A1 - A0 < 0.1) continue;
        const nP = A1 - A0 <= Lp ? 1 : Math.ceil((A1 - A0 - lap) / (Lp - lap) - 1e-9);
        for (let i = 0; i < nP; i++) {
          const p0 = A0 + i * (Lp - lap), p1 = Math.min(A1, p0 + Lp), comp = Math.ceil((p1 - p0) * 100 - 1e-6) / 100, larg = Math.ceil((c1 - c0) * 100 - 1e-6) / 100;
          paineis.push({ n: `T${paineis.length + 1}`, face, designacao: t.id, poligono: [glob(p0, c0), glob(p1, c0), glob(p1, c1), glob(p0, c1)].map(r4), comprimento: comp, largura: larg, angulo: ang(ua), peso: +(comp * larg * t.kgm2).toFixed(3) });
        }
      }
    }
  };
  if (baseDet) { painelDeTela('inf', baseLaje?.inf); painelDeTela('sup', baseLaje?.sup); }

  // ---- negativas e bordas
  const kPerp = (x: Laje, nrm: P): 0 | 1 => { const t = (direcaoPrincipal(x.contorno) * Math.PI) / 180; return Math.abs(Math.cos(t) * nrm[0] + Math.sin(t) * nrm[1]) >= Math.abs(-Math.sin(t) * nrm[0] + Math.cos(t) * nrm[1]) ? 0 : 1; };
  const extN = (x: Laje, nrm: P) => { const pr = x.contorno.map((q) => dot(q, nrm)); return Math.max(...pr) - Math.min(...pr); };
  const menorVao = Math.min(...ext);
  /** Vão (m) entre a borda (origem P0, direção e, normal nrm) e a linha de dobra paralela mais próxima do lado `sinal` da normal; null sem linha (R7e). */
  const vaoDeDobra = (P0: P, e: P, nrm: P, sinal: 1 | -1, s0: number, s1: number): number | null => {
    let melhor: number | null = null;
    for (const ln of linhasDobra) {
      const dd = sub(ln.z, ln.a), Ld = Math.hypot(dd[0], dd[1]);
      if (Ld < 1e-6 || Math.abs(dd[0] * e[1] - dd[1] * e[0]) / Ld > 0.05) continue;
      const t = sinal * dot(sub(ln.a, P0), nrm), t0 = dot(sub(ln.a, P0), e), t1 = dot(sub(ln.z, P0), e);
      if (t <= 0.05 || Math.max(t0, t1) < s0 || Math.min(t0, t1) > s1) continue;
      if (melhor === null || t < melhor) melhor = t;
    }
    return melhor;
  };
  /** Barras de um negativo sobre a borda: s0..s1 menos as faixas das predefinidas superiores que a cruzam (nelas, o que falta). */
  const nNeg = (Lint: number, br: { phi: number; s: number }, AsRef: number, P0: P, e: P, nrm: P, s0: number, s1: number) => {
    const cheio = Math.max(2, Math.ceil(Lint / br.s - 1e-9));
    let wTot = 0, nIn = 0;
    for (const x of pre.filter((y) => y.face === 'sup' && Math.abs(dirPre(y.angulo)[0] * nrm[1] - dirPre(y.angulo)[1] * nrm[0]) < 0.0872)) {
      const d = dirPre(x.angulo), nl: P = [-d[1], d[0]], sg = dot(d, nrm) >= 0 ? 1 : -1, an = dot(sub(x.a, P0), nrm), az = an + sg * x.comprimento;
      if (Math.min(an, az) > 1e-9 || Math.max(an, az) < -1e-9) continue; // não cruza a borda
      const t0 = dot(sub(x.a, P0), e), dt = dot(nl, e), tA = t0 - (x.s / 2) * dt, tB = t0 + ((x.n - 1) * x.s + x.s / 2) * dt;
      const w = Math.min(s1, Math.max(tA, tB)) - Math.max(s0, Math.min(tA, tB));
      if (w <= 0) continue;
      wTot += w;
      const need = AsRef - barArea(x.phi) / x.s;
      if (need > 1e-9) nIn += Math.ceil(w / Math.min(0.2, barArea(br.phi) / need) - 1e-9);
    }
    if (!wTot) return cheio;
    return Math.max(0, Math.ceil((Lint - Math.min(wTot, Lint)) / br.s - 1e-9)) + nIn;
  };
  const distribuicao = (AsNeg: number, lados: [number, number], P0: P, e: P, nrm: P, s0: number, s1: number, kPar?: 0 | 1) => {
    // armadura de distribuição sob os negativos (Tabela 19.1: ≥ 20 % da principal e 0,9 cm²/m; s ≤ 33 cm)
    const Ad = Math.max(0.2 * AsNeg, 0.9e-4);
    if (kPar !== undefined && baseSup[kPar] / 1e4 >= Ad) return; // a base superior paralela à borda já distribui
    const br = escolherBarrasLaje(Ad, h, 0.33, smin, op.lajeBitolaMinima, ca60S, linha);
    const larg = lados[0] + lados[1], n = Math.max(2, Math.ceil(larg / br.s - 1e-9));
    const Lb = arred(s1 - s0, passo), meio = (s0 + s1) / 2;
    nova({ face: 'sup', tipo: 'distribuicao', angulo: ang(e), phi: br.phi, s: br.s, n, comprimento: Lb, ganchos: [0, 0], a: add(add(P0, e, s0), nrm, (lados[0] - lados[1]) / 2), z: add(add(P0, e, s1), nrm, (lados[0] - lados[1]) / 2), faixa: [add(add(P0, e, meio), nrm, -lados[1]), add(add(P0, e, meio), nrm, lados[0])] }, Ad * 1e4);
  };
  const idx = (x: Laje) => b.lajes.indexOf(x);
  for (const bd of bordas) {
    const P0 = l.contorno[bd.aresta], Q = l.contorno[(bd.aresta + 1) % l.contorno.length], Le = Math.hypot(Q[0] - P0[0], Q[1] - P0[1]);
    const e: P = [(Q[0] - P0[0]) / Le, (Q[1] - P0[1]) / Le], nrm: P = [-e[1], e[0]];
    const v = vigaDe(bd.viga), bw = v?.secao.b ?? 0, cv = v ? cobrimentoViga(b, v.cobrimento).lat : 0;
    const Lint = bd.s1 - bd.s0, meio = (bd.s0 + bd.s1) / 2, kA = kPerp(l, nrm), extA = extN(l, nrm);
    if (bd.tipo === 'continua') {
      const B = b.lajes.find((x) => x.id === bd.vizinha);
      if (!B || (B.tipo.tipo === 'macica' && idx(B) < idx(l))) continue; // detalhada pela vizinha de menor índice
      const nB: P = [-nrm[0], -nrm[1]], kB = kPerp(B, nB), extB = extN(B, nB);
      const rsB = B.tipo.tipo === 'macica' ? porLaje.get(B.id) ?? [] : [];
      const hB = B.tipo.tipo === 'macica' ? B.tipo.h : h, hMin = Math.min(h, hB), hMax = Math.max(h, hB);
      const AsCalc = Math.max(RHO_MIN_LAJE * hMax, ...rs.map((r) => r.As.neg[kA] / 1e4), ...rsB.map((r) => r.As.neg[kB] / 1e4));
      const bsB = areaBase(B.base?.sup)[kB] / 1e4, bsA = baseSup[kA] / 1e4, baseMin = Math.min(bsA, bsB);
      const AsRef = Math.max(0, AsCalc - baseMin);
      if (baseMin > 0 && AsRef <= 1e-9) continue; // a base superior atende o negativo
      const br = baseMin > 0 ? escolherReforco(AsRef, smaxP, barraBase(baseLaje?.sup, kA), ca60S, hMin) : escolherBarrasLaje(AsCalc, hMin, smaxP, smin, op.lajeBitolaMinima, ca60S, linha);
      if (!br.cabe) avisos.push(`Negativo sobre a borda com ${B.nome}: ${fmt(AsCalc * 1e4, 2)} cm²/m não cabe com espaçamento ≥ ${fmt(smin * 100)} cm.`);
      const lbn = lbNecessario(lbS(br.phi), br.phi, AsRef, br.As);
      const dA = negativoJuntoBorda(grs, l.id, kA, P0, e, nrm, bd.s0, bd.s1, extA / 2, 0.6 * op.malha, fx);
      const dB = negativoJuntoBorda(grs, B.id, kB, P0, e, nB, bd.s0, bd.s1, extB / 2, 0.6 * op.malha, fx);
      // mínimo em % do vão: com linhas de dobra, o vão é o da borda até a linha seguinte de cada lado (R7e)
      const vDA = vaoDeDobra(P0, e, nrm, 1, bd.s0, bd.s1), vDB = vaoDeDobra(P0, e, nrm, -1, bd.s0, bd.s1), pctV = op.lajeNegativoVao / 100;
      const minViga = bw / 2 + (10 * br.phi) / 1000;
      const lado = (x0: number, extX: number, minPct: number) => {
        const diag = x0 > 0 ? x0 + aL + lbn : 0, cap = extX - cob.sup;
        // o mínimo em % do vão só é limitado ao pano; o diagrama além do pano (balanço curto) gera aviso
        if (diag > cap + 1e-9) avisos.push(`Negativo sobre a borda com ${B.nome}: diagrama + decalagem + ancoragem (${fmt(diag, 2)} m) passa do pano (${fmt(cap, 2)} m); barra limitada ao pano, conferir a ancoragem.`);
        return Math.min(cap, Math.max(minPct, minViga, diag));
      };
      const lados: [number, number] = [lado(dA.x0, extA, pctV * (vDA ?? Math.max(extA, extB))), lado(dB.x0, extB, pctV * (vDB ?? Math.max(extA, extB)))];
      const n = nNeg(Lint, br, AsRef, P0, e, nrm, bd.s0, bd.s1), comp = arred(lados[0] + lados[1] + 2 * perna, passo);
      if (comp > Lmax + 1e-9) avisos.push(`Negativo sobre a borda com ${B.nome} com ${fmt(comp, 2)} m > barra máxima ${fmt(Lmax, 1)} m.`);
      if (n > 0) nova({ face: 'sup', tipo: 'negativa', angulo: ang(nrm), phi: br.phi, s: br.s, n, comprimento: comp, ganchos: [perna, perna], a: add(add(P0, e, meio), nrm, -lados[1]), z: add(add(P0, e, meio), nrm, lados[0]), faixa: [add(P0, e, bd.s0), add(P0, e, bd.s1)], lados: [+lados[0].toFixed(4), +lados[1].toFixed(4)], vizinha: B.id }, AsRef * 1e4);
      if (n > 0) distribuicao(br.As, lados, P0, e, nrm, bd.s0, bd.s1, (1 - kA) as 0 | 1);
    } else if (bd.tipo === 'apoiada' && op.lajeNegativoBorda > 0) {
      // negativa de borda sem continuidade (19.3.3.2): ρs ≥ 0,67·ρmín (Tabela 19.1) ou o momento da grelha junto à borda,
      // até ≥ % do menor vão a partir da face; do lado de fora, até a face oposta da viga menos o cobrimento, com gancho
      const dA = negativoJuntoBorda(grs, l.id, kA, P0, e, nrm, bd.s0, bd.s1, extA / 2, 0.6 * op.malha, fx);
      const AsM = dA.Mmin < 0 ? beamFlexure({ kind: 'rect', bw: 1, h }, false, -dA.Mmin, dS, 0.02, c, aS.fyd).As : 0;
      const AsCalc = Math.max(0.67 * RHO_MIN_LAJE * h, AsM), bsA = baseSup[kA] / 1e4, AsRef = Math.max(0, AsCalc - bsA);
      if (bsA > 0 && AsRef <= 1e-9) continue; // a base superior atende a negativa de borda
      const br = bsA > 0 ? escolherReforco(AsRef, smaxP, barraBase(baseLaje?.sup, kA), ca60S) : escolherBarrasLaje(AsCalc, h, smaxP, smin, op.lajeBitolaMinima, ca60S, linha);
      const lbn = lbNecessario(lbS(br.phi), br.phi, AsRef, br.As);
      let dentro = Math.max(bw / 2 + (op.lajeNegativoBorda / 100) * (vaoDeDobra(P0, e, nrm, 1, bd.s0, bd.s1) ?? menorVao), dA.x0 > 0 ? dA.x0 + aL + lbn : 0);
      if (dentro > extA - cob.sup) dentro = extA - cob.sup;
      const fora = Math.max(0, bw / 2 - cv), g = ganchoNoventa(br.phi);
      const n = nNeg(Lint, br, AsRef, P0, e, nrm, bd.s0, bd.s1), comp = arred(dentro + fora + perna + g, passo);
      if (n > 0) nova({ face: 'sup', tipo: 'negativa-borda', angulo: ang(nrm), phi: br.phi, s: br.s, n, comprimento: comp, ganchos: [g, perna], a: add(add(P0, e, meio), nrm, -fora), z: add(add(P0, e, meio), nrm, dentro), faixa: [add(P0, e, bd.s0), add(P0, e, bd.s1)], lados: [+dentro.toFixed(4), +fora.toFixed(4)] }, AsRef * 1e4);
      if (n > 0) distribuicao(br.As, [dentro, fora], P0, e, nrm, bd.s0, bd.s1, (1 - kA) as 0 | 1);
    } else if (bd.tipo === 'livre') {
      // borda livre (20.1, Figura 20.1): grampos em U (pernas horizontais 2h) com a bitola e o espaçamento da positiva
      // perpendicular à borda e 2 barras longitudinais nos cantos do U
      const pk = positivas[kA], vert = Math.max(0, h - cob.inf - cob.sup), ramo = 2 * h;
      const n = Math.max(2, Math.ceil(Lint / pk.s - 1e-9)), base = add(add(P0, e, meio), nrm, cob.inf);
      nova({ face: 'inf', tipo: 'borda-livre', angulo: ang(nrm), phi: pk.phi, s: pk.s, n, comprimento: arred(2 * ramo + vert, passo), ganchos: [0, 0], a: base, z: add(base, nrm, ramo), faixa: [add(add(P0, e, bd.s0), nrm, cob.inf), add(add(P0, e, bd.s1), nrm, cob.inf)] });
      const Lc = Math.max(0.05, Lint - 2 * cob.inf), aa = add(add(P0, e, bd.s0 + cob.inf), nrm, cob.inf + (pk.phi / 1000));
      const Lb = arred(Lc, passo), pecas = Math.max(1, Math.ceil(Lb / Lmax - 1e-9));
      nova({ face: 'inf', tipo: 'borda-livre-long', angulo: ang(e), phi: pk.phi, s: 0, n: 2 * pecas, comprimento: pecas > 1 ? arred(Lc / pecas + alfa0t(1) * lbI(pk.phi), passo) : Lb, ganchos: [0, 0], a: aa, z: add(aa, e, Lc), faixa: [aa, aa] });
    }
  }

  // ---- malha superior de canto entre duas bordas apoiadas sem continuidade (lado ℓ/5 do menor vão; As = maior positiva)
  const AsCanto = Math.max(0, Math.max(...AsNec) - Math.min(...baseSup) / 1e4);
  if (op.lajeArmaduraCanto && AsCanto > 1e-9) {
    const nV = l.contorno.length, AsC = AsCanto, brC = escolherBarrasLaje(AsC, h, smaxP, smin, op.lajeBitolaMinima, ca60S, linha), lc = menorVao / 5;
    for (let i = 0; i < nV; i++) {
      const V = l.contorno[i], ant = l.contorno[(i - 1 + nV) % nV], prox = l.contorno[(i + 1) % nV];
      const La = Math.hypot(V[0] - ant[0], V[1] - ant[1]), Lp = Math.hypot(prox[0] - V[0], prox[1] - V[1]);
      if (La < 1e-6 || Lp < 1e-6) continue;
      const e0: P = [(V[0] - ant[0]) / La, (V[1] - ant[1]) / La], e1: P = [(prox[0] - V[0]) / Lp, (prox[1] - V[1]) / Lp];
      if (e0[0] * e1[1] - e0[1] * e1[0] <= 1e-6) continue; // canto reentrante
      const kA = (i - 1 + nV) % nV;
      const bA = bordas.filter((x) => x.aresta === kA).at(-1), bP = bordas.filter((x) => x.aresta === i)[0];
      if (bA?.tipo !== 'apoiada' || bP?.tipo !== 'apoiada' || Math.abs(bA.s1 - La) > 0.05 || bP.s0 > 0.05) continue;
      const vA = vigaDe(bA.viga), vP = vigaDe(bP.viga);
      const fora = (v?: Viga) => (v ? Math.max(0, v.secao.b / 2 - cobrimentoViga(b, v.cobrimento).lat) : 0);
      const n = Math.max(2, Math.ceil(lc / brC.s - 1e-9));
      // barras paralelas a cada borda, distribuídas ao longo da outra
      for (const [u, w, vOut] of [[e1, [-e0[0], -e0[1]] as P, vA], [[-e0[0], -e0[1]] as P, e1, vP]] as [P, P, Viga | undefined][]) {
        const f = fora(vOut), a0 = add(add(V, u, -f), w, lc / 2);
        nova({ face: 'sup', tipo: 'canto', angulo: ang(u), phi: brC.phi, s: brC.s, n, comprimento: arred(lc + f, passo), ganchos: [0, 0], a: a0, z: add(a0, u, lc + f), faixa: [add(V, u, lc / 2), add(add(V, u, lc / 2), w, lc)] });
      }
    }
  }

  // ---- armaduras predefinidas (R7d): desenhadas e medidas como lançadas; avisos quando saem do pano ou passam da barra máxima
  const dentro = (p: P) => {
    const ring = (r: P[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < ((r[j][0] - r[i][0]) * (p[1] - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
    return ring(l.contorno) && !(l.furos ?? []).some(ring);
  };
  for (const x of pre) {
    const d = dirPre(x.angulo), nl: P = [-d[1], d[0]], z = add(x.a, d, x.comprimento), fim = add(x.a, nl, (x.n - 1) * x.s);
    const nome = `Predefinida ${fmt(x.phi, 1)} (${x.face === 'inf' ? 'inf.' : 'sup.'})`;
    if (![x.a, z, fim, add(z, nl, (x.n - 1) * x.s)].every((q) => dentro(q) || distPoligono(l.contorno, q) < 0.3)) avisos.push(`${nome} sai do pano da laje ${l.nome}.`);
    if (x.comprimento > Lmax + 1e-9) avisos.push(`${nome} com ${fmt(x.comprimento, 2)} m > barra máxima ${fmt(Lmax, 1)} m.`);
    nova({ face: x.face, tipo: 'predefinida', angulo: +(((x.angulo % 360) + 360) % 360).toFixed(3), phi: x.phi, s: x.s, n: x.n, comprimento: arred(x.comprimento, passo), ganchos: [0, 0], a: x.a, z, faixa: [add(x.a, d, x.comprimento / 2), add(add(x.a, d, x.comprimento / 2), nl, (x.n - 1) * x.s)] });
  }

  const notaBase = (f: BaseFaceLaje | undefined, a: [number, number]): BaseDetalhe | undefined => {
    if (!f || (a[0] <= 0 && a[1] <= 0)) return undefined;
    const dir = ([0, 1] as const).map((k) => barraBase(f, k)), fm = (x: { phi: number; s: number } | null) => (x ? `φ${fmt(x.phi, 1)} c/ ${fmt(x.s * 100, x.s * 100 % 1 ? 1 : 0)}` : '—');
    return { ...(f.tela ? { tela: f.tela, ...(f.giro ? { giro: true } : {}) } : {}), dir, As: [+a[0].toFixed(3), +a[1].toFixed(3)], nota: f.tela ? `Tela ${f.tela}${f.giro ? ' (girada)' : ''}` : `${fm(dir[0])} / ${fm(dir[1])}` };
  };
  const baseInfo = notaBase(baseLaje?.inf, baseInf), baseSupInfo = notaBase(baseLaje?.sup, baseSup);

  // numeração por face e tipo (R7e): inferiores primeiro, depois superiores, por tipo e direção
  if (op.lajeNumeracao === 1) {
    const ORDEM: TipoBarraLaje[] = ['positiva', 'base', 'reforco', 'predefinida', 'borda-livre', 'borda-livre-long', 'furo', 'negativa', 'negativa-borda', 'distribuicao', 'canto'];
    const rank = (x: PosicaoLaje) => (x.face === 'inf' ? 0 : 100) + ORDEM.indexOf(x.tipo);
    const nova = new Map<string, string>();
    posicoes.map((x, i) => ({ x, i })).sort((a, z) => rank(a.x) - rank(z.x) || (a.x.dir ?? 0) - (z.x.dir ?? 0) || a.i - z.i).forEach(({ x }, k) => nova.set(x.pos, `N${k + 1}`));
    if (saida) { const ex = [...saida.exig]; saida.exig.clear(); for (const [k, v] of ex) saida.exig.set(nova.get(k) ?? k, v); }
    for (const x of posicoes) x.pos = nova.get(x.pos)!;
    posicoes.sort((a, z) => +a.pos.slice(1) - +z.pos.slice(1));
  }
  const peso = posicoes.reduce((t, x) => t + x.n * x.comprimento * pesoLinear(x.phi), 0);
  const phiNeg = posicoes.find((x) => x.face === 'sup')?.phi ?? positivas[0].phi;
  if (sem) avisos.push(`Armadura gerada sem cálculo (laje ${l.nome}): só mínimos e base, sem os esforços da análise; a verificação da edição vale contra os mínimos. Refaça a armadura para voltar ao cálculo.`);
  const edicao = emendasDobra || mediaUsada || sem ? { editadas: 0, uniformizadas: 0, semCalculo: sem, emendasDobra, media: mediaUsada } : undefined;
  return {
    laje: l.id, nome: l.nome, repeticoes: Math.max(1, pavimentosDoGrupo(b, l.grupo).length), h, angulo: ang(U[0]), positivas,
    ...(baseInfo || baseSupInfo ? { base: { detalhada: baseDet, ...(baseInfo ? { inf: baseInfo } : {}), ...(baseSupInfo ? { sup: baseSupInfo } : {}) } } : {}),
    ...(paineis.length ? { paineis } : {}), bordas: bordas.map((x) => ({ ...x, s0: +x.s0.toFixed(4), s1: +x.s1.toFixed(4) })), posicoes,
    lb: { inf: lbI(positivas[0].phi), sup: lbS(phiNeg), supBoaAderencia: supBoa }, emendas, peso, avisos: [...new Set(avisos)],
    ...(edicao ? { edicao } : {}),
  };
}

/** Detalhamento de todas as lajes maciças dimensionadas. */
export function detalharLajes(b: BuildingModel, dim: Dimensionamento, an: AnaliseEdificio, op: OpcoesCalculo): DetalheLaje[] {
  // resultados de todos os pavimentos do grupo por laje (a envoltória vale para o grupo)
  const porLaje = new Map<string, ResultadoLaje[]>();
  for (const r of dim.lajes) porLaje.set(r.laje, [...(porLaje.get(r.laje) ?? []), r]);
  const out: DetalheLaje[] = [], exigs = new Map<string, Exigencias>();
  for (const l of b.lajes) { const saida = { exig: new Map() as Exigencias }, d = detalharLaje(b, l, porLaje, an, op, saida); if (d) { out.push(d); exigs.set(l.id, saida.exig); } }
  // R7e: uniformização por zonas (entre lajes do grupo) e edição bloqueada, verificada contra o cálculo
  const zonas = (b.zonasLaje?.length ?? 0) > 0 || op.lajeUniformizarPilares === 1;
  if (zonas) {
    for (const z of uniformizarLajes(b, out, op)) {
      if (z.auto || z.posicoes.length >= 2) continue;
      const alvo = out.find((d) => b.lajes.find((l) => l.id === d.laje)?.grupo === b.zonasLaje?.find((x) => x.id === z.zona)?.grupo);
      alvo?.avisos.push(`Zona de uniformização ${b.zonasLaje?.find((x) => x.id === z.zona) ? `Z${(b.zonasLaje.findIndex((x) => x.id === z.zona)) + 1}` : z.zona} atinge ${z.posicoes.length === 0 ? 'nenhuma barra' : 'uma só barra'} da face e da direção escolhidas.`);
    }
  }
  for (const l of b.lajes) {
    const d = out.find((x) => x.laje === l.id);
    if (d && l.edicao?.barras.length) aplicarEdicoes(l, d, exigs.get(l.id) ?? new Map(), op);
  }
  return out;
}

/** Resumo do aço das lajes por aço e bitola (kg), com as repetições dos grupos e as perdas (%). */
export function resumoAcoLajes(b: BuildingModel, dets: DetalheLaje[], perdas: number): { aco: string; phi: number; comprimento: number; peso: number; pesoComPerdas: number }[] {
  const acoI = acoDe(b, 'lajeInf').aco, acoS = acoDe(b, 'lajeSup').aco;
  const m = new Map<string, { aco: string; phi: number; comprimento: number }>();
  for (const d of dets) for (const x of d.posicoes) {
    const aco = x.face === 'inf' ? acoI : acoS, k = `${aco}|${x.phi}`, e = m.get(k) ?? { aco, phi: x.phi, comprimento: 0 };
    e.comprimento += x.n * x.comprimento * d.repeticoes;
    m.set(k, e);
  }
  return [...m.values()].sort((a, z) => a.aco.localeCompare(z.aco) || a.phi - z.phi).map((e) => { const peso = e.comprimento * pesoLinear(e.phi); return { ...e, peso, pesoComPerdas: peso * (1 + perdas / 100) }; });
}

/** Resumo das telas soldadas da base detalhada por designação: painéis (com as repetições dos grupos), área (m²) e peso (kg). */
export function resumoTelasLajes(dets: DetalheLaje[], perdas: number, b?: FonteNormas) {
  return resumoTelas(dets.flatMap((d) => (d.paineis ?? []).map((p) => ({ designacao: p.designacao, comprimento: p.comprimento, largura: p.largura, repeticoes: d.repeticoes }))), perdas, b);
}

/** Trechos de uma reta c = cte dentro dos anéis (radier, FU6). */
export const cortesLaje = cortes;
