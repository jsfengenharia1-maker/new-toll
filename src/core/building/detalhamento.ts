// Detalhamento das vigas (frente R3a, NBR 6118 cap. 9 e 18.3): a partir da envoltória ELU, da decalagem aℓ e do
// arranjo adotado, dispõe as barras longitudinais (passantes inferiores com ganchos nas pontas, reforços inferiores
// e negativos cortados pelo diagrama decalado mais o comprimento de ancoragem, montagem superior colaborante),
// emendas por traspasse quando a barra passa do comprimento máximo, armadura de pele / laterais de torção e
// estribos em zonas. Comprimentos arredondados para cima; peso do aço por bitola com perdas.
import { barArea, beamFlexure, type Concrete } from '../concrete';
import type { Dimensionamento, ResultadoViga } from './dimensionamento';
import { acoDe, cobrimentoViga, concretoDe } from './materiais';
import type { OpcoesCalculo } from './opcoes';
import { contornoPilar, lancesDoPilar, pavimentosDoGrupo, secaoNoLance, type BuildingModel, type Viga } from './types';
import { fracaoPassante } from './tabelasArmadura';
import { vigaTocaPilar } from './vigas';

export type FaceBarra = 'inf' | 'sup' | 'pele';
export interface BarraViga {
  /** Posição dentro da viga (N1, N2, …). */
  pos: string;
  face: FaceBarra;
  tipo: 'passante' | 'reforço' | 'negativo' | 'montagem' | 'pele';
  /** Quantidade por viga (um pavimento). */
  n: number;
  phi: number;
  /** Trecho ao longo do traçado (m) e ganchos de 90° nas pontas. */
  s0: number; s1: number; ganchos: [boolean, boolean];
  /** Comprimento de cada barra (m), arredondado, com os ganchos. */
  comprimento: number;
}
/** Zona de estribos: `n` peças a cada `s`; `ramos` > 2 (estribo duplo ou triplo): `n` já conta todas as peças. */
export interface ZonaEstribo { s0: number; s1: number; phi: number; s: number; n: number; comprimento: number; ramos?: number }
export interface DetalheViga {
  viga: string; nome: string;
  /** Pavimentos em que a viga se repete (grupo). */
  repeticoes: number;
  extensao: [number, number];
  apoios: { s0: number; s1: number; pilar: string }[];
  barras: BarraViga[];
  estribos: ZonaEstribo[];
  /** Comprimentos de ancoragem básicos (m): inferior (boa aderência) e superior (boa ou má, 9.3.1). */
  lb: { inf: number; sup: number; supBoaAderencia: boolean };
  /** Emenda por traspasse das passantes (m), quando há. */
  emendas: { face: FaceBarra; s: number; l0: number }[];
  /** Peso de aço de uma viga (kg, sem perdas). */
  peso: number;
  avisos: string[];
}

const ACO_KG_M3 = 7850;
const pesoLinear = (phi: number) => barArea(phi) * ACO_KG_M3;

/** Gancho de 90° (NBR 6118, 9.4.2.3): ponta reta 8φ, pino D = 5φ (φ < 20) ou 8φ; comprimento desenvolvido somado (m). */
export function ganchoNoventa(phiMm: number): number {
  const f = phiMm / 1000, D = (phiMm < 20 ? 5 : 8) * f;
  return 8 * f + (Math.PI * (D + f)) / 4 - (D / 2 + f);
}

/**
 * Comprimento de ancoragem básico (NBR 6118, 9.4.2.4): lb = (φ/4)·fyd/fbd ≥ 25φ, fbd = η1·η2·η3·fctd
 * (η1 = 2,25 nervurada CA-50, 1,4 entalhada CA-60; η2 = 1,0 boa aderência, 0,7 má; η3 = 1,0 para φ < 32 mm).
 */
export function lbBasico(phiMm: number, c: Concrete, fyd: number, boa: boolean, ca60 = false): number {
  const fbd = (ca60 ? 1.4 : 2.25) * (boa ? 1 : 0.7) * (phiMm < 32 ? 1 : (132 - phiMm) / 100) * c.fctd;
  return Math.max(((phiMm / 1000) / 4) * (fyd / fbd), 25 * (phiMm / 1000));
}

/** α0t da emenda por traspasse (NBR 6118, Tabela 9.4) pela proporção de barras emendadas na mesma seção. */
export function alfa0t(prop: number): number {
  return prop <= 0.2 ? 1.2 : prop <= 0.25 ? 1.4 : prop <= 0.33 ? 1.6 : prop <= 0.5 ? 1.8 : 2.0;
}

/** Abscissa (m) da projeção de P no traçado. */
function abscissa(pts: [number, number][], P: [number, number]): { s: number; d: number } {
  let melhor = Infinity, s = 0, acum = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], z = pts[i + 1], dx = z[0] - a[0], dy = z[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const t = ((P[0] - a[0]) * dx + (P[1] - a[1]) * dy) / L, tc = Math.max(i === 0 ? -Infinity : 0, Math.min(i + 2 === pts.length ? Infinity : L, t));
    const d = Math.hypot(a[0] + (dx * tc) / L - P[0], a[1] + (dy * tc) / L - P[1]);
    if (d < melhor - 1e-9) { melhor = d; s = acum + tc; }
    acum += L;
  }
  return { s, d: melhor };
}

/** Apoios em pilares ao longo da viga (faces em abscissa), no primeiro pavimento do grupo. */
export function apoiosDaViga(b: BuildingModel, v: Viga): { s0: number; s1: number; pilar: string }[] {
  const pav = pavimentosDoGrupo(b, v.grupo)[0];
  if (!pav) return [];
  const out: { s0: number; s1: number; pilar: string }[] = [];
  for (const p of b.pilares) {
    if (!lancesDoPilar(b, p).some((x) => x.id === pav.id) || !vigaTocaPilar(v, p, pav.id)) continue;
    const ss = contornoPilar(p, secaoNoLance(p, pav.id)).map((q) => abscissa(v.pontos, q).s);
    out.push({ s0: Math.min(...ss), s1: Math.max(...ss), pilar: p.id });
  }
  return out.sort((a, z) => a.s0 - z.s0);
}

const arred = (x: number, passo: number) => Math.ceil(x / passo - 1e-9) * passo;

/** Intervalos contíguos de uma grade onde `f(i)` é verdadeiro. */
function intervalos(n: number, f: (i: number) => boolean): [number, number][] {
  const out: [number, number][] = [];
  let i0 = -1;
  for (let i = 0; i <= n; i++) {
    const ok = i < n && f(i);
    if (ok && i0 < 0) i0 = i;
    if (!ok && i0 >= 0) { out.push([i0, i - 1]); i0 = -1; }
  }
  return out;
}

export function detalharViga(b: BuildingModel, v: Viga, r: ResultadoViga, op: OpcoesCalculo): DetalheViga {
  const c = concretoDe(b, 'viga'), aPos = acoDe(b, 'vigaPos'), aNeg = acoDe(b, 'vigaNeg'), aEst = acoDe(b, 'vigaEstribo');
  const cob = cobrimentoViga(b, v.cobrimento), h = v.secao.h, bw = v.secao.b;
  const sec = { kind: 'rect' as const, bw, h };
  const passo = op.arredondamento / 100, Lmax = op.barraMaxima;
  const phiT = r.arranjo.estribo?.phi ?? 5;
  const dI = h - cob.inf - phiT / 1000 - 0.008, dS = h - cob.sup - phiT / 1000 - 0.008, d = Math.min(dI, dS);
  const avisos: string[] = [];
  const apoios = apoiosDaViga(b, v);
  const L = v.pontos.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - v.pontos[i][0], p[1] - v.pontos[i][1]), 0);
  const ext: [number, number] = [Math.min(0, ...apoios.map((a) => a.s0)), Math.max(L, ...apoios.map((a) => a.s1))];
  const c0 = ext[0] + cob.lat, c1 = ext[1] - cob.lat; // pontas das barras (cobrimento na ponta)
  // grade de 5 cm com As necessária (decalada de aℓ) a partir da envoltória
  const dx = 0.05, nG = Math.max(2, Math.round((ext[1] - ext[0]) / dx) + 1), sG = (i: number) => ext[0] + i * dx;
  const env = r.envoltoria.pontos;
  const perto = (s: number) => env.reduce((m, p) => (Math.abs(p.s - s) < Math.abs(m.s - s) ? p : m), env[0]);
  const AsPos = new Float64Array(nG), AsNeg = new Float64Array(nG), Vd = new Float64Array(nG), Td = new Float64Array(nG);
  for (let i = 0; i < nG; i++) {
    const p = env.length ? perto(sG(i)) : { Mmax: 0, Mmin: 0, Vmax: 0, Vmin: 0, T: 0 };
    AsPos[i] = p.Mmax > 0 ? beamFlexure(sec, false, p.Mmax, dI, 0.04, c, aPos.fyd).As : 0;
    AsNeg[i] = p.Mmin < 0 ? beamFlexure(sec, false, -p.Mmin, dS, 0.04, c, aNeg.fyd).As : 0;
    Vd[i] = Math.max(Math.abs(p.Vmax), Math.abs(p.Vmin)); Td[i] = p.T;
  }
  const k = Math.max(0, Math.round(r.al / dx));
  const decala = (a: Float64Array) => Float64Array.from(a, (_, i) => { let m = 0; for (let j = Math.max(0, i - k); j <= Math.min(nG - 1, i + k); j++) m = Math.max(m, a[j]); return m; });
  const AsPosD = decala(AsPos), AsNegD = decala(AsNeg);
  // aderência (9.3.1): inferior boa; superior má quando fica a mais de 30 cm da face inferior (h < 60) ou h ≥ 60 cm
  const supBoa = h < 0.6 && h - cob.sup <= 0.3;
  const phiI = r.arranjo.inf?.phi ?? 10, phiS = r.arranjo.sup?.phi ?? 10, phiM = Math.min(phiS, op.bitolaMontagem);
  const lbI = lbBasico(phiI, c, aPos.fyd, true, aPos.aco === 'CA-60'), lbS = lbBasico(phiS, c, aNeg.fyd, supBoa, aNeg.aco === 'CA-60');
  const prolong = (lb: number, phi: number) => Math.max(lb, (10 * phi) / 1000);
  const barras: BarraViga[] = [], emendas: DetalheViga['emendas'] = [];
  let np = 0;
  const comp = (s0: number, s1: number, g: [boolean, boolean], phi: number) => arred(s1 - s0 + (g[0] ? ganchoNoventa(phi) : 0) + (g[1] ? ganchoNoventa(phi) : 0), passo);
  const nasPontas = (s0: number, s1: number): [boolean, boolean] => [s0 <= c0 + 1e-6, s1 >= c1 - 1e-6];
  /** Barra corrida de c0 a c1, dividida em peças ≤ Lmax com traspasse nos pontos candidatos (centros de apoio ou meio dos vãos). */
  const corrida = (face: FaceBarra, tipo: BarraViga['tipo'], n: number, phi: number, lb: number, candidatos: number[]) => {
    const l0 = Math.max(alfa0t(1) * lb, 0.3 * alfa0t(1) * lb, (15 * phi) / 1000, 0.2);
    const pecas: [number, number][] = [];
    let ini = c0;
    while (true) {
      const ganchoExtra = ganchoNoventa(phi) * ((ini <= c0 + 1e-6 ? 1 : 0) + 1);
      if (c1 - ini + ganchoExtra <= Lmax + 1e-9) { pecas.push([ini, c1]); break; }
      const limite = ini + Lmax - ganchoExtra - l0 / 2;
      const cands = candidatos.filter((x) => x > ini + l0 && x <= limite);
      const corte = cands.length ? Math.max(...cands) : limite;
      if (corte <= ini + l0) { avisos.push(`Comprimento máximo de barra ${Lmax} m insuficiente para a emenda (φ${phi}).`); pecas.push([ini, c1]); break; }
      pecas.push([ini, corte + l0 / 2]);
      emendas.push({ face, s: corte, l0 });
      ini = corte - l0 / 2;
    }
    for (const [s0, s1] of pecas) { const g: [boolean, boolean] = tipo === 'pele' ? [false, false] : nasPontas(s0, s1); barras.push({ pos: `N${++np}`, face, tipo, n, phi, s0, s1, ganchos: g, comprimento: comp(s0, s1, g, phi) }); }
  };
  const centrosApoio = apoios.map((a) => (a.s0 + a.s1) / 2);
  const meiosVao = apoios.slice(1).map((a, i) => (apoios[i].s1 + a.s0) / 2);
  // inferior: passantes (máx(2; n/3) barras, 18.3.2.4) corridas, emendas sobre os apoios internos
  const nInf = r.arranjo.inf?.n ?? 2, nPass = Math.max(2, Math.ceil(nInf * fracaoPassante(b, v) - 1e-9));
  corrida('inf', 'passante', nPass, phiI, lbI, centrosApoio.slice(1, -1));
  // reforços inferiores onde a As decalada passa da capacidade das passantes, prolongados por lb (≥ 10φ)
  const capPass = nPass * barArea(phiI), Ai = barArea(phiI), prolI = prolong(lbI, phiI);
  for (const [i0, i1] of intervalos(nG, (i) => AsPosD[i] > capPass + 1e-9)) {
    let mx = 0; for (let i = i0; i <= i1; i++) mx = Math.max(mx, AsPosD[i]);
    const n = r.bloqueada ? Math.max(0, nInf - nPass) : Math.ceil((mx - capPass) / Ai - 1e-9);
    if (n <= 0) continue;
    const s0 = Math.max(c0, sG(i0) - prolI), s1 = Math.min(c1, sG(i1) + prolI), g = nasPontas(s0, s1);
    barras.push({ pos: `N${++np}`, face: 'inf', tipo: 'reforço', n, phi: phiI, s0, s1, ganchos: g, comprimento: comp(s0, s1, g, phiI) });
  }
  // superior: montagem colaborante corrida (2 barras), emendas no meio dos vãos; negativos sobre os apoios
  const lbM = lbBasico(phiM, c, aNeg.fyd, supBoa, aNeg.aco === 'CA-60');
  corrida('sup', 'montagem', 2, phiM, lbM, meiosVao);
  const capMont = 2 * barArea(phiM), As_ = barArea(phiS), prolS = prolong(lbS, phiS), nSup = r.arranjo.sup?.n ?? 0;
  for (const [i0, i1] of intervalos(nG, (i) => AsNegD[i] > capMont + 1e-9)) {
    let mx = 0; for (let i = i0; i <= i1; i++) mx = Math.max(mx, AsNegD[i]);
    const n = r.bloqueada ? Math.max(0, nSup) : Math.ceil((mx - capMont) / As_ - 1e-9);
    if (n <= 0) continue;
    const s0 = Math.max(c0, sG(i0) - prolS), s1 = Math.min(c1, sG(i1) + prolS), g = nasPontas(s0, s1);
    barras.push({ pos: `N${++np}`, face: 'sup', tipo: 'negativo', n, phi: phiS, s0, s1, ganchos: g, comprimento: comp(s0, s1, g, phiS) });
  }
  // ancoragem nos apoios extremos (18.3.2.4.1): Rst = (aℓ/d)·Vd; disponível = largura do apoio − cobrimento
  for (const [a, i] of [[apoios[0], 0], [apoios.at(-1), nG - 1]] as const) {
    if (!a || apoios.length < 2) continue;
    const disp = a.s1 - a.s0 - cob.lat, Rst = ((r.al / d) * Vd[i]) / 1000, AsCalc = Rst / aPos.fyd;
    const nec = Math.max(0.7 * lbI * Math.min(1, AsCalc / capPass), (5.5 * phiI) / 1000 + ((phiI < 20 ? 2.5 : 4) * phiI) / 1000, 0.06);
    if (nec > disp + 1e-9) avisos.push(`Ancoragem da armadura inferior no apoio extremo (${b.pilares.find((p) => p.id === a.pilar)?.nome ?? a.pilar}): ${(nec * 100).toFixed(0)} cm necessários > ${(disp * 100).toFixed(0)} cm disponíveis.`);
  }
  // pele (17.3.5.2.3: h > 60 cm, 0,10 % Ac,alma por face, s ≤ mín(20 cm; d/3)) e laterais de torção, por face
  const AsPele = h > 0.6 ? 0.001 * bw * h : 0, AsLat = Math.max(AsPele, r.AsLateral);
  if (AsLat > 0) {
    const alt = h - cob.inf - cob.sup - 0.04, sMax = Math.min(0.2, d / 3);
    const phiP = r.arranjo.laterais?.phi ?? 8;
    const nFace = Math.max(Math.ceil(AsLat / barArea(phiP) - 1e-9), Math.ceil(alt / sMax - 1e-9) - 1, 1);
    corrida('pele', 'pele', 2 * nFace, phiP, lbBasico(phiP, c, aPos.fyd, supBoa), meiosVao);
  }
  // estribos por zonas fora dos pilares: espaçamento exigido pelo cortante e pela torção em cada ponto
  const fywd = Math.min(aEst.fyk / 1.15, 435), A1 = barArea(phiT), ramos = r.arranjo.estribo?.legs ?? 2, nPecas = (len: number, s: number) => (Math.floor(len / s + 1e-9) + 1) * (ramos / 2);
  const he = (bw * h) / (2 * (bw + h)), Ae = (bw - he) * (h - he);
  const Vc0 = 0.6 * c.fctd * bw * d * 1000, aswMin = ((0.2 * c.fctm) / aEst.fyk) * bw;
  const smax = (Vmx: number) => (Vmx <= 0.67 * 0.27 * c.av2 * c.fcd * bw * d * 1000 ? Math.min(0.6 * d, 0.3) : Math.min(0.3 * d, 0.2));
  const sReq = Float64Array.from({ length: nG }, (_, i) => {
    const asw = Math.max(aswMin, Math.max(0, Vd[i] - Vc0) / 1000 / (0.9 * d * fywd) + (Td[i] / 1000) / (Ae * fywd));
    return Math.floor(Math.min(smax(Vd[i]), (ramos * A1) / asw) * 100) / 100;
  });
  const sCentral = Math.floor(Math.min(smax(0), (ramos * A1) / aswMin) * 100) / 100;
  const dentroPilar = (s: number) => apoios.some((a) => s > a.s0 + 1e-9 && s < a.s1 - 1e-9);
  const compEstribo = arred(2 * (bw - 2 * cob.lat) + 2 * (h - cob.inf - cob.sup) + 2 * Math.max((5 * phiT) / 1000, 0.05) + 2 * ((3 * Math.PI) / 8) * ((4 * phiT) / 1000), passo);
  const estribos: ZonaEstribo[] = [];
  for (const [i0, i1] of intervalos(nG, (i) => !dentroPilar(sG(i)) && sG(i) > ext[0] + cob.lat && sG(i) < ext[1] - cob.lat)) {
    // dentro do trecho livre, zonas com o espaçamento da faixa (mais denso perto dos apoios)
    let j = i0;
    while (j <= i1) {
      const sj = Math.min(sReq[j], sCentral);
      let k2 = j;
      while (k2 + 1 <= i1 && Math.min(sReq[k2 + 1], sCentral) === sj) k2++;
      const s0 = sG(j), s1 = sG(k2), len = s1 - s0;
      const ant = estribos.at(-1);
      if (ant && Math.abs(ant.s1 - s0) < dx + 1e-9 && ant.s === sj) { ant.s1 = s1; ant.n = nPecas(ant.s1 - ant.s0, sj); }
      else estribos.push({ s0, s1, phi: phiT, s: sj, n: nPecas(len, sj), comprimento: compEstribo, ...(ramos > 2 ? { ramos } : {}) });
      j = k2 + 1;
    }
  }
  // zonas muito curtas (< 2 espaçamentos) absorvidas pela vizinha mais densa
  for (let i = estribos.length - 1; i > 0; i--) {
    const z = estribos[i], a = estribos[i - 1];
    if (Math.abs(a.s1 - z.s0) <= dx + 1e-9 && (z.s1 - z.s0 < 2 * z.s || a.s1 - a.s0 < 2 * a.s)) {
      const s = Math.min(a.s, z.s);
      estribos.splice(i - 1, 2, { ...a, s1: z.s1, s, n: nPecas(z.s1 - a.s0, s) });
    }
  }
  const peso = barras.reduce((t, x) => t + x.n * x.comprimento * pesoLinear(x.phi), 0) + estribos.reduce((t, z) => t + z.n * z.comprimento * pesoLinear(z.phi), 0);
  return {
    viga: v.id, nome: v.nome, repeticoes: Math.max(1, pavimentosDoGrupo(b, v.grupo).length), extensao: ext, apoios, barras, estribos,
    lb: { inf: lbI, sup: lbS, supBoaAderencia: supBoa }, emendas, peso, avisos,
  };
}

/** Detalhamento de todas as vigas dimensionadas. */
export function detalharVigas(b: BuildingModel, dim: Dimensionamento, op: OpcoesCalculo): DetalheViga[] {
  const out: DetalheViga[] = [];
  for (const r of dim.vigas) { const v = b.vigas.find((x) => x.id === r.viga); if (v) out.push(detalharViga(b, v, r, op)); }
  return out;
}

/** Resumo do aço das vigas por aço e bitola (kg), com as repetições dos grupos e as perdas (%). */
export function resumoAcoVigas(b: BuildingModel, dets: DetalheViga[], perdas: number): { aco: string; phi: number; comprimento: number; peso: number; pesoComPerdas: number }[] {
  const acoL = acoDe(b, 'vigaPos').aco, acoE = acoDe(b, 'vigaEstribo').aco;
  const m = new Map<string, { aco: string; phi: number; comprimento: number }>();
  const soma = (aco: string, phi: number, len: number) => { const k = `${aco}|${phi}`; const e = m.get(k) ?? { aco, phi, comprimento: 0 }; e.comprimento += len; m.set(k, e); };
  for (const d of dets) {
    for (const x of d.barras) soma(acoL, x.phi, x.n * x.comprimento * d.repeticoes);
    for (const z of d.estribos) soma(acoE, z.phi, z.n * z.comprimento * d.repeticoes);
  }
  return [...m.values()].sort((a, z) => a.aco.localeCompare(z.aco) || a.phi - z.phi).map((e) => {
    const peso = e.comprimento * pesoLinear(e.phi);
    return { ...e, peso, pesoComPerdas: peso * (1 + perdas / 100) };
  });
}
