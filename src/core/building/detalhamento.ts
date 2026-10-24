// Detalhamento das vigas (frente R3a, NBR 6118 cap. 9 e 18.3): a partir da envoltória ELU, da decalagem aℓ e do
// arranjo adotado, dispõe as barras longitudinais (passantes inferiores com ganchos nas pontas, reforços inferiores
// e negativos cortados pelo diagrama decalado mais o comprimento de ancoragem, montagem superior colaborante),
// emendas por traspasse quando a barra passa do comprimento máximo, armadura de pele / laterais de torção e
// estribos em zonas. Comprimentos arredondados para cima; peso do aço por bitola com perdas.
import { barArea, beamAsMin, beamFlexure, type Concrete } from '../concrete';
import type { Dimensionamento, ResultadoViga } from './dimensionamento';
import { acoDe, cobrimentoViga, concretoDe } from './materiais';
import type { OpcoesCalculo } from './opcoes';
import { lancesDoPilar, pavimentosDoGrupo, type BuildingModel, type Viga, contornoNoLance } from './types';
import { fracaoPassante } from './tabelasArmadura';
import { vaosDaViga, vigaTocaPilar } from './vigas';
import { secaoParaFlexao } from './secaoViga';
import { ehVirtual, todosPilares } from './pilarParede';
import { opcoesEmUso, perfilDe } from './opcoes';
import { fm, memoriaAtiva } from '../memoria/registrador';

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
  /** Perna reta dos ganchos (× φ) quando difere de 8φ (opção ou edição). */
  perna?: number;
  /** Posição editada pelo usuário (R7b). */
  editada?: boolean;
  /** Tramo predefinido: a barra continua na viga indicada (sem emenda nem gancho nesse extremo). */
  continuaCom?: string;
}
/** Zona de estribos: `n` peças a cada `s`; `ramos` > 2 (estribo duplo ou triplo): `n` já conta todas as peças. */
export interface ZonaEstribo { s0: number; s1: number; phi: number; s: number; n: number; comprimento: number; ramos?: number; /** Estribo em U (aberto no topo; R7g). */ u?: boolean; /** Estribos adicionais de suspensão (N2e, NBR 6118 18.3.6). */ suspensao?: boolean }
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
  /** Pilares que nascem sobre a viga (E1a): abscissa do centro e das faces e carga de cálculo (kN). */
  transicoes?: { pilar: string; nome: string; s: number; sFaces: [number, number]; Nd: number }[];
  /** Barras de canto da mesa (E2a, K1.12.16): n por viga, bitola de montagem, trecho e comprimento (m); mesa bf × hf (m). */
  cantosMesa?: { n: number; phi: number; s0: number; s1: number; comprimento: number; bf: number; hf: number };
}

/**
 * Ponta reta (m) e comprimento desenvolvido do gancho do estribo (NBR 6118, 9.4.6.1): 45° (aqui 135° de dobra) e 180° com ponta
 * ≥ máx(5φ; 5 cm), 90° com ponta ≥ máx(10φ; 7 cm); pino de 4φ nos três [a confirmar para 90° e 180°].
 */
export function ganchoEstribo(phiMm: number, graus: number): number {
  const f = phiMm / 1000, perna = graus <= 90 ? Math.max(10 * f, 0.07) : Math.max(5 * f, 0.05);
  return perna + (graus / 360) * Math.PI * 4 * f;
}
/** Comprimento (m) do estribo de largura e altura internas dadas: fechado (retângulo) ou em U (fundo e duas pernas), com dois ganchos. */
export function estriboComprimento(larg: number, alt: number, phiMm: number, graus: number, u = false): number {
  return (u ? larg + 2 * alt : 2 * larg + 2 * alt) + 2 * ganchoEstribo(phiMm, graus);
}

const ACO_KG_M3 = 7850;
const pesoLinear = (phi: number) => barArea(phi) * ACO_KG_M3;

/** Gancho de 90° (NBR 6118, 9.4.2.3): ponta reta `perna`·φ (mínimo 8φ), pino D = 5φ (φ < 20) ou 8φ; comprimento desenvolvido somado (m). */
export function ganchoNoventa(phiMm: number, perna = 8): number {
  const f = phiMm / 1000, D = (phiMm < 20 ? 5 : 8) * f;
  return perna * f + (Math.PI * (D + f)) / 4 - (D / 2 + f);
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

/** Apoio da viga: faces em abscissa; `corta` = apoio de pilar-parede ou parede de contato longo, cortado a `(prolongamento + barras) × h` da face do vão. */
export interface ApoioViga { s0: number; s1: number; pilar: string; corta?: 'ini' | 'fim' }

/**
 * Apoios em pilares ao longo da viga (faces em abscissa), no primeiro pavimento do grupo. Os lados dos pilares-parede
 * (E1b) apoiam como pilares; o apoio longitudinal nas pontas da viga (K1.3.59, K1.12.21) é cortado no comprimento em que
 * o diagrama e a armadura prosseguem sobre a parede (prolongamento + extensão das barras, em múltiplos de h).
 */
export function apoiosDaViga(b: BuildingModel, v: Viga): ApoioViga[] {
  const pav = pavimentosDoGrupo(b, v.grupo)[0];
  if (!pav) return [];
  const out: ApoioViga[] = [];
  for (const p of todosPilares(b)) {
    if (!lancesDoPilar(b, p).some((x) => x.id === pav.id) || !vigaTocaPilar(v, p, pav.id)) continue;
    const ss = contornoNoLance(p, pav.id).map((q) => abscissa(v.pontos, q).s);
    out.push({ s0: Math.min(...ss), s1: Math.max(...ss), pilar: p.id });
  }
  out.sort((a, z) => a.s0 - z.s0);
  if (out.length > 1 && todosPilares(b) !== b.pilares) {
    const op = opcoesEmUso(b.opcoes, perfilDe(b)), lim = (op.vigaApoioLongProlong + op.vigaApoioLongBarras) * v.secao.h;
    const virt = new Set(todosPilares(b).filter(ehVirtual).map((p) => p.id));
    const a0 = out[0], a1 = out[out.length - 1];
    if (virt.has(a0.pilar) && a0.s1 - a0.s0 > lim + 1e-9) { a0.s0 = a0.s1 - lim; a0.corta = 'ini'; }
    if (virt.has(a1.pilar) && a1.s1 - a1.s0 > lim + 1e-9) { a1.s1 = a1.s0 + lim; a1.corta = 'fim'; }
  }
  return out;
}

/** Extensão ao longo do traçado em que a armadura corre: do traçado e dos apoios (parede cortada: até o corte). */
export function extensaoDaViga(v: Viga, apoios: ApoioViga[]): [number, number] {
  const L = comprimentoTraco(v.pontos);
  const ini = apoios.find((a) => a.corta === 'ini'), fim = apoios.find((a) => a.corta === 'fim');
  return [ini ? ini.s0 : Math.min(0, ...apoios.map((x) => x.s0)), fim ? fim.s1 : Math.max(L, ...apoios.map((x) => x.s1))];
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

/** Tramo predefinido resolvido para uma viga: abscissa (m) do eixo do apoio comum em cada extremo ligado e a viga vizinha. */
export interface TramoViga { ini?: { s: number; com: string }; fim?: { s: number; com: string } }

export type GapAvisos = Map<string, string[]>;

const dist2 = (a: [number, number], z: [number, number]) => Math.hypot(a[0] - z[0], a[1] - z[1]);
const comprimentoTraco = (pts: [number, number][]) => pts.slice(1).reduce((t, p, i) => t + dist2(p, pts[i]), 0);
/** Direção (rad) do primeiro (`fim` = false) ou do último segmento do traçado. */
function direcaoPonta(pts: [number, number][], fim: boolean): number {
  const [a, z] = fim ? [pts.at(-2)!, pts.at(-1)!] : [pts[0], pts[1]];
  return Math.atan2(z[1] - a[1], z[0] - a[0]);
}
const LIGACAO_MAX = 0.5, ANGULO_MAX = (15 * Math.PI) / 180;

/** Extremos de duas vigas que se encontram em linha (colineares), se houver: qual extremo de cada uma e o ponto médio. */
export function ligacaoEmLinha(a: Viga, z: Viga): { extA: 'ini' | 'fim'; extZ: 'ini' | 'fim'; ponto: [number, number] } | null {
  let melhor: { extA: 'ini' | 'fim'; extZ: 'ini' | 'fim'; ponto: [number, number]; d: number } | null = null;
  for (const ea of ['ini', 'fim'] as const) for (const ez of ['ini', 'fim'] as const) {
    const pa = ea === 'ini' ? a.pontos[0] : a.pontos.at(-1)!, pz = ez === 'ini' ? z.pontos[0] : z.pontos.at(-1)!, d = dist2(pa, pz);
    if (d > LIGACAO_MAX || (melhor && d >= melhor.d)) continue;
    // as direções saindo do ponto de ligação para dentro de cada viga devem ser opostas
    const da = direcaoPonta(a.pontos, ea === 'fim') + (ea === 'fim' ? Math.PI : 0), dz = direcaoPonta(z.pontos, ez === 'fim') + (ez === 'fim' ? Math.PI : 0);
    let dif = Math.abs(((da - dz + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI); // 0 = mesma direção
    dif = Math.PI - dif; // desvio da oposição
    if (dif > ANGULO_MAX) continue;
    melhor = { extA: ea, extZ: ez, ponto: [(pa[0] + pz[0]) / 2, (pa[1] + pz[1]) / 2], d };
  }
  return melhor ? { extA: melhor.extA, extZ: melhor.extZ, ponto: melhor.ponto } : null;
}

/** Verifica um tramo (lista de vigas na ordem): mesmo grupo e cada par consecutivo em linha. Devolve o motivo da recusa, se houver. */
export function motivoTramo(b: BuildingModel, ids: string[]): string | null {
  if (ids.length < 2) return 'Um tramo precisa de ao menos duas vigas.';
  if (new Set(ids).size !== ids.length) return 'Viga repetida no tramo.';
  const vs = ids.map((id) => b.vigas.find((x) => x.id === id));
  if (vs.some((x) => !x)) return 'Viga inexistente.';
  const vv = vs as Viga[];
  if (new Set(vv.map((x) => x.grupo)).size > 1) return 'As vigas de um tramo precisam ser do mesmo grupo de pavimentos.';
  for (let i = 0; i + 1 < vv.length; i++) if (!ligacaoEmLinha(vv[i], vv[i + 1])) return `${vv[i].nome} e ${vv[i + 1].nome} não são consecutivas e alinhadas (extremos a até ${LIGACAO_MAX * 100} cm e desvio até 15°).`;
  return null;
}

/** Desníveis longitudinais: vigas consecutivas alinhadas cujas faces superior ou inferior não coincidem (limite da opção). */
export function desniveisLongitudinais(b: BuildingModel, op: OpcoesCalculo): GapAvisos {
  const out: GapAvisos = new Map();
  const lim = op.vigaDesnivelLimite / 100;
  for (let i = 0; i < b.vigas.length; i++) for (let j = i + 1; j < b.vigas.length; j++) {
    const a = b.vigas[i], z = b.vigas[j];
    if (a.grupo !== z.grupo || !ligacaoEmLinha(a, z)) continue;
    const topA = a.nivel ?? 0, topZ = z.nivel ?? 0, dSup = Math.abs(topA - topZ), dInf = Math.abs(topA - a.secao.h - (topZ - z.secao.h));
    if (dSup <= lim + 1e-9 && dInf <= lim + 1e-9) continue;
    const f = (x: number) => (x * 100).toFixed(1).replace('.', ',');
    const m = `Desnível longitudinal entre ${a.nome} e ${z.nome} (face superior ${f(dSup)} cm, inferior ${f(dInf)} cm): a armadura não é contínua entre as vigas; prever detalhe especial (estribos adicionais e continuidade da armadura).`;
    for (const v of [a, z]) out.set(v.id, [...(out.get(v.id) ?? []), m]);
  }
  return out;
}

/**
 * Resolve os tramos predefinidos do modelo: a barra inferior passante corre sem emenda de uma viga à seguinte (do eixo do apoio
 * comum) enquanto o comprimento total não passa da barra máxima e as vigas têm a mesma bitola e o mesmo número de passantes.
 */
export function resolverTramos(b: BuildingModel, dim: Dimensionamento, op: OpcoesCalculo): { tramos: Map<string, TramoViga>; avisos: GapAvisos } {
  const tramos = new Map<string, TramoViga>(), avisos: GapAvisos = new Map();
  const aviso = (ids: string[], msg: string) => { for (const id of ids) avisos.set(id, [...(avisos.get(id) ?? []), msg]); };
  for (const ids of b.tramos ?? []) {
    const vs = ids.map((id) => b.vigas.find((x) => x.id === id));
    const nomes = vs.map((x) => x?.nome ?? '?').join(' + ');
    const motivo = motivoTramo(b, ids);
    if (motivo) { aviso(ids, `Tramo predefinido desconsiderado (${nomes}): ${motivo}`); continue; }
    const rs = ids.map((id) => dim.vigas.find((x) => x.viga === id));
    if (rs.some((r) => !r)) continue;
    const vv = vs as Viga[], rr = rs as ResultadoViga[];
    const phi = (r: ResultadoViga) => r.arranjo.inf?.phi ?? 10, nP = (v: Viga, r: ResultadoViga) => Math.max(2, Math.ceil((r.arranjo.inf?.n ?? 2) * fracaoPassante(b, v) - 1e-9));
    if (rr.some((r, i) => phi(r) !== phi(rr[0]) || nP(vv[i], r) !== nP(vv[0], rr[0]))) { aviso(ids, `Tramo predefinido desconsiderado (${nomes}): bitola ou número de passantes inferiores diferentes.`); continue; }
    // abscissa do ponto de ligação em cada viga e comprimento total da barra
    const lig = vv.slice(0, -1).map((v, i) => ligacaoEmLinha(v, vv[i + 1])!);
    const sDe = (v: Viga, pt: [number, number]) => abscissa(v.pontos, pt).s;
    const juntas = lig.map((l, i) => ({ a: sDe(vv[i], l.ponto), z: sDe(vv[i + 1], l.ponto), extA: l.extA, extZ: l.extZ }));
    let total = 0;
    vv.forEach((v, i) => {
      const ap = apoiosDaViga(b, v), [e0, e1] = extensaoDaViga(v, ap);
      const ini = i === 0 ? (juntas[0].extA === 'ini' ? e1 : e0) : juntas[i - 1].z;
      const fim = i === vv.length - 1 ? (juntas[i - 1].extZ === 'ini' ? e1 : e0) : juntas[i].a;
      total += Math.abs(fim - ini);
    });
    if (total > op.barraMaxima - 0.2) { aviso(ids, `Tramo predefinido desconsiderado (${nomes}): barra de ${total.toFixed(2).replace('.', ',')} m passa do comprimento máximo (${op.barraMaxima} m).`); continue; }
    vv.forEach((v, i) => {
      const t = tramos.get(v.id) ?? {};
      if (i > 0) { const j = juntas[i - 1]; t[j.extZ] = { s: j.z, com: vv[i - 1].id }; }
      if (i < juntas.length) { const j = juntas[i]; t[j.extA] = { s: j.a, com: vv[i + 1].id }; }
      tramos.set(v.id, t);
    });
  }
  return { tramos, avisos };
}

export function detalharViga(b: BuildingModel, v: Viga, r: ResultadoViga, op: OpcoesCalculo, tramo: TramoViga = {}): DetalheViga {
  const c = concretoDe(b, 'viga'), aPos = acoDe(b, 'vigaPos'), aNeg = acoDe(b, 'vigaNeg'), aEst = acoDe(b, 'vigaEstribo');
  const cob = cobrimentoViga(b, v.cobrimento), h = v.secao.h, bw = v.secao.b;
  const { sec, fcPos, fcNeg, mesa } = secaoParaFlexao(b, v, op);
  const passo = op.arredondamento / 100, Lmax = op.barraMaxima;
  const phiT = r.arranjo.estribo?.phi ?? 5;
  const dI = h - cob.inf - phiT / 1000 - 0.008, dS = h - cob.sup - phiT / 1000 - 0.008, d = Math.min(dI, dS);
  const avisos: string[] = [];
  const apoios = apoiosDaViga(b, v);
  // parede ou pilar-parede no meio da viga (K1.3.59): o diagrama e a armadura valem só até (prolongamento + extensão) × h de cada face;
  // o trecho central de um contato mais longo não é dimensionado, mas a armadura corre contínua (a viga não é partida em duas)
  const limParede = (op.vigaApoioLongProlong + op.vigaApoioLongBarras) * h, virtuais = new Set(todosPilares(b).filter(ehVirtual).map((p) => p.id));
  for (const a of apoios.slice(1, -1)) if (virtuais.has(a.pilar) && a.s1 - a.s0 > 2 * limParede + 1e-9) avisos.push(`Parede ou pilar-parede no meio da viga com contato de ${(a.s1 - a.s0).toFixed(2).replace('.', ',')} m (mais de 2 × ${limParede.toFixed(2).replace('.', ',')} m): fora desse alcance o cálculo não dimensiona a viga e a armadura segue contínua sobre a parede; interrompa a viga e a armadura manualmente depois de ${limParede.toFixed(2).replace('.', ',')} m da face.`);
  const ext = extensaoDaViga(v, apoios);
  const c0 = ext[0] + cob.lat, c1 = ext[1] - cob.lat; // pontas das barras (cobrimento na ponta)
  // detalhe editado: vale enquanto o número de vãos não mudou
  const edit = v.detalhe && v.detalhe.vaos === vaosDaViga(b, v) ? v.detalhe : undefined;
  if (v.detalhe && !edit) avisos.push('Detalhe editado desconsiderado: o número de vãos da viga mudou desde a edição.');
  const fatorEmenda = edit?.fatorEmenda ?? op.vigaFatorEmenda, pernaG = op.vigaPernaGancho;
  const gancho = (phi: number, perna = pernaG) => ganchoNoventa(phi, perna);
  // grade de 5 cm com As necessária (decalada de aℓ) a partir da envoltória
  const dx = 0.05, nG = Math.max(2, Math.round((ext[1] - ext[0]) / dx) + 1), sG = (i: number) => ext[0] + i * dx;
  const env = r.envoltoria.pontos;
  const perto = (s: number) => env.reduce((m, p) => (Math.abs(p.s - s) < Math.abs(m.s - s) ? p : m), env[0]);
  // As,mín ponto a ponto (R7g, K1.12.4): piso da armadura necessária onde a face é tracionada
  const AsMinI = beamAsMin(sec, fcPos, dI, c, aPos.fyd), AsMinS = beamAsMin(sec, fcNeg, dS, c, aNeg.fyd);
  const AsPos = new Float64Array(nG), AsNeg = new Float64Array(nG), Vd = new Float64Array(nG), Td = new Float64Array(nG);
  let compSup = false; // armadura de compressão superior exigida pelo cálculo (a montagem passa a colaborante)
  for (let i = 0; i < nG; i++) {
    const p = env.length ? perto(sG(i)) : { Mmax: 0, Mmin: 0, Vmax: 0, Vmin: 0, T: 0 };
    if (p.Mmax > 0) { const f = beamFlexure(sec, fcPos, p.Mmax, dI, 0.04, c, aPos.fyd); AsPos[i] = op.vigaAsMinPonto ? Math.max(f.As, AsMinI) : f.As; if (f.As2 > 1e-12) compSup = true; }
    AsNeg[i] = p.Mmin < 0 ? (op.vigaAsMinPonto ? Math.max(AsMinS, beamFlexure(sec, fcNeg, -p.Mmin, dS, 0.04, c, aNeg.fyd).As) : beamFlexure(sec, fcNeg, -p.Mmin, dS, 0.04, c, aNeg.fyd).As) : 0;
    Vd[i] = Math.max(Math.abs(p.Vmax), Math.abs(p.Vmin)); Td[i] = p.T;
  }
  const k = Math.max(0, Math.round(r.al / dx));
  const decala = (a: Float64Array) => Float64Array.from(a, (_, i) => { let m = 0; for (let j = Math.max(0, i - k); j <= Math.min(nG - 1, i + k); j++) m = Math.max(m, a[j]); return m; });
  const AsPosD = decala(AsPos), AsNegD = decala(AsNeg);
  // aderência (9.3.1): inferior boa; superior má quando fica a mais de 30 cm da face inferior (h < 60) ou h ≥ 60 cm
  const supBoa = h < 0.6 && h - cob.sup <= 0.3;
  const phiI = r.arranjo.inf?.phi ?? 10, phiS = r.arranjo.sup?.phi ?? 10, phiM = Math.min(phiS, op.bitolaMontagem);
  const lbI = lbBasico(phiI, c, aPos.fyd, true, aPos.aco === 'CA-60'), lbS = lbBasico(phiS, c, aNeg.fyd, supBoa, aNeg.aco === 'CA-60');
  const lbMin = (lb: number, phi: number) => Math.max(0.3 * lb, (10 * phi) / 1000, 0.1);
  const mem = memoriaAtiva(), elMem = `Viga ${v.nome}`, comMem = !!mem?.aceita(elMem);
  if (comMem) for (const [rot, phi, fyd, boa, ca60, lb] of [['inferior', phiI, aPos.fyd, true, aPos.aco === 'CA-60', lbI], ['superior', phiS, aNeg.fyd, supBoa, aNeg.aco === 'CA-60', lbS]] as const) {
    const e1 = ca60 ? 1.4 : 2.25, e2 = boa ? 1 : 0.7, e3 = phi < 32 ? 1 : (132 - phi) / 100, fbd = e1 * e2 * e3 * c.fctd;
    mem!.passo({ etapa: 'detalhamento', elemento: elMem, topico: `Ancoragem – armadura ${rot}`, descricao: `Resistência de aderência (${boa ? 'boa' : 'má'} aderência)`, formula: 'fbd = η1·η2·η3·fctd', expressao: `fbd = ${fm(e1)}·${fm(e2)}·${fm(e3)}·${fm(c.fctd)} = ${fm(fbd)}`, resultado: fbd, unidade: 'MPa', norma: 'NBR 6118:2023, 9.3.2.1', entradas: { eta1: e1, eta2: e2, eta3: e3, fctd: c.fctd } });
    mem!.passo({ etapa: 'detalhamento', elemento: elMem, topico: `Ancoragem – armadura ${rot}`, descricao: `Comprimento de ancoragem básico (φ${fm(phi)})`, formula: 'lb = (φ/4)·(fyd/fbd) ≥ 25·φ', expressao: `lb = (${fm(phi / 1000)}/4)·(${fm(fyd)}/${fm(fbd)}) ≥ 25·${fm(phi / 1000)} → ${fm(lb)}`, resultado: lb, unidade: 'm', norma: 'NBR 6118:2023, 9.4.2.4', entradas: { phi, fyd, fbd } });
  }
  /** Prolongamento além do ponto de corte: lb pleno (≥ 10φ) ou lb·As,calc/As,ef (≥ lb,mín) com a opção ligada (9.4.2.5). */
  const prolong = (lb: number, phi: number, AsCalc = 1, AsEf = 1) => (op.vigaReducaoLb ? Math.max(lb * Math.min(1, AsCalc / Math.max(AsEf, 1e-12)), lbMin(lb, phi)) : Math.max(lb, (10 * phi) / 1000));
  const barras: BarraViga[] = [], emendas: DetalheViga['emendas'] = [];
  let np = 0;
  const comp = (s0: number, s1: number, g: [boolean, boolean], phi: number, perna = pernaG) => arred(s1 - s0 + (g[0] ? gancho(phi, perna) : 0) + (g[1] ? gancho(phi, perna) : 0), passo);
  const nasPontas = (s0: number, s1: number): [boolean, boolean] => [s0 <= c0 + 1e-6, s1 >= c1 - 1e-6];
  type OptsCorrida = { a?: number; z?: number; ganchos?: boolean; semGanchoIni?: boolean; semGanchoFim?: boolean; continuaIni?: string; continuaFim?: string };
  /** Barra corrida de a a z (padrão c0 a c1), dividida em peças ≤ Lmax com traspasse nos pontos candidatos (centros de apoio ou meio dos vãos). */
  const corrida = (face: FaceBarra, tipo: BarraViga['tipo'], n: number, phi: number, lb: number, candidatos: number[], o: OptsCorrida = {}) => {
    const a = o.a ?? c0, z = o.z ?? c1, gOn = o.ganchos !== false;
    const gIni = gOn && !o.semGanchoIni, gFim = gOn && !o.semGanchoFim;
    const l0 = Math.max(alfa0t(1) * lb, 0.3 * alfa0t(1) * lb, (15 * phi) / 1000, 0.2) * fatorEmenda;
    const pecas: [number, number][] = [];
    let ini = a;
    while (true) {
      const ganchoExtra = gancho(phi) * ((ini <= a + 1e-6 && gIni ? 1 : 0) + (gFim ? 1 : 0));
      if (z - ini + ganchoExtra <= Lmax + 1e-9) { pecas.push([ini, z]); break; }
      const limite = ini + Lmax - ganchoExtra - l0 / 2;
      const cands = candidatos.filter((x) => x > ini + l0 && x <= limite);
      const corte = cands.length ? Math.max(...cands) : limite;
      if (corte <= ini + l0) { avisos.push(`Comprimento máximo de barra ${Lmax} m insuficiente para a emenda (φ${phi}).`); pecas.push([ini, z]); break; }
      pecas.push([ini, corte + l0 / 2]);
      emendas.push({ face, s: corte, l0 });
      ini = corte - l0 / 2;
    }
    for (const [s0, s1] of pecas) {
      const g: [boolean, boolean] = tipo === 'pele' ? [false, false] : [gIni && s0 <= a + 1e-6, gFim && s1 >= z - 1e-6];
      const cont = s0 <= a + 1e-6 && o.continuaIni ? o.continuaIni : s1 >= z - 1e-6 && o.continuaFim ? o.continuaFim : undefined;
      barras.push({ pos: `N${++np}`, face, tipo, n, phi, s0, s1, ganchos: g, comprimento: comp(s0, s1, g, phi), ...(cont ? { continuaCom: cont } : {}) });
    }
  };
  const centrosApoio = apoios.map((a) => (a.s0 + a.s1) / 2);
  const meiosVao = apoios.slice(1).map((a, i) => (apoios[i].s1 + a.s0) / 2);
  // inferior: passantes (máx(2; n/3) barras, 18.3.2.4) corridas, emendas sobre os apoios internos; tramo predefinido: sem emenda nem gancho no apoio comum
  const nInf = r.arranjo.inf?.n ?? 2, nPass = Math.max(2, Math.ceil(nInf * fracaoPassante(b, v) - 1e-9));
  corrida('inf', 'passante', nPass, phiI, lbI, centrosApoio.slice(1, -1), {
    ...(tramo.ini ? { a: tramo.ini.s, semGanchoIni: true, continuaIni: tramo.ini.com } : {}),
    ...(tramo.fim ? { z: tramo.fim.s, semGanchoFim: true, continuaFim: tramo.fim.com } : {}),
  });
  // reforços inferiores onde a As decalada passa da capacidade das passantes, prolongados por lb (≥ 10φ) ou lb·As,calc/As,ef
  const capPass = nPass * barArea(phiI), Ai = barArea(phiI);
  const vaoDe = (s: number) => { const k2 = apoios.findIndex((a, q) => q + 1 < apoios.length && s >= (a.s0 + a.s1) / 2 && s <= (apoios[q + 1].s0 + apoios[q + 1].s1) / 2); return k2 < 0 ? null : { s0: apoios[k2].s1, s1: apoios[k2 + 1].s0 }; };
  for (const [i0, i1] of intervalos(nG, (i) => AsPosD[i] > capPass + 1e-9)) {
    let mx = 0; for (let i = i0; i <= i1; i++) mx = Math.max(mx, AsPosD[i]);
    const n = r.bloqueada ? Math.max(0, nInf - nPass) : Math.ceil((mx - capPass) / Ai - 1e-9);
    if (n <= 0) continue;
    const prolI = prolong(lbI, phiI, mx, capPass + n * Ai);
    let s0 = Math.max(c0, sG(i0) - prolI), s1 = Math.min(c1, sG(i1) + prolI);
    const vao = op.vigaReforcoVao > 0 ? vaoDe((sG(i0) + sG(i1)) / 2) : null;
    if (vao && s1 - s0 < (op.vigaReforcoVao / 100) * (vao.s1 - vao.s0)) { // comprimento mínimo em % do vão, centrado no trecho exigido
      const falta = (op.vigaReforcoVao / 100) * (vao.s1 - vao.s0) - (s1 - s0);
      s0 = Math.max(c0, s0 - falta / 2); s1 = Math.min(c1, s1 + falta / 2);
    }
    const g = nasPontas(s0, s1);
    barras.push({ pos: `N${++np}`, face: 'inf', tipo: 'reforço', n, phi: phiI, s0, s1, ganchos: g, comprimento: comp(s0, s1, g, phiI) });
  }
  // superior: montagem (2 barras) e negativos sobre os apoios. Montagem colaborante conta na área dos negativos; interrompida
  // (porta-estribos entre as pontas dos negativos) nunca é colaborante. Compressão superior exigida pelo cálculo => colaborante.
  const montCont = !!op.vigaMontagemContinua, colab = montCont && (!!op.vigaMontagemColaborante || compSup);
  if (montCont && !op.vigaMontagemColaborante && compSup) avisos.push('Montagem colaborante: o cálculo exige armadura de compressão superior, que a montagem fornece.');
  const aMont = acoDe(b, 'vigaMontagem'), lbM = lbBasico(phiM, c, aMont.fyd, supBoa, aMont.aco === 'CA-60');
  const capMont = colab ? 2 * barArea(phiM) : 0, As_ = barArea(phiS), nSup = r.arranjo.sup?.n ?? 0;
  interface Reg { s0: number; s1: number; n: number; mx: number; ef: number }
  let regs: Reg[] = [];
  for (const [i0, i1] of intervalos(nG, (i) => AsNegD[i] > capMont + 1e-9)) {
    let mx = 0; for (let i = i0; i <= i1; i++) mx = Math.max(mx, AsNegD[i]);
    const n = r.bloqueada ? Math.max(0, nSup) : Math.ceil((mx - capMont) / As_ - 1e-9);
    if (n <= 0) continue;
    const prolS = prolong(lbS, phiS, mx, capMont + n * As_);
    let s0 = Math.max(c0, sG(i0) - prolS), s1 = Math.min(c1, sG(i1) + prolS);
    if (op.vigaNegativoVao > 0) { // comprimento mínimo em % do vão adjacente, a partir da face do apoio
      const dentro = apoios.map((a, q) => ({ a, q })).filter(({ a }) => (a.s0 + a.s1) / 2 >= sG(i0) - 1e-6 && (a.s0 + a.s1) / 2 <= sG(i1) + 1e-6);
      if (dentro.length) {
        const qe = dentro[0].q, qd = dentro.at(-1)!.q;
        if (qe > 0) s0 = Math.max(c0, Math.min(s0, apoios[qe].s0 - (op.vigaNegativoVao / 100) * (apoios[qe].s0 - apoios[qe - 1].s1)));
        if (qd + 1 < apoios.length) s1 = Math.min(c1, Math.max(s1, apoios[qd].s1 + (op.vigaNegativoVao / 100) * (apoios[qd + 1].s0 - apoios[qd].s1)));
      }
    }
    regs.push({ s0, s1, n, mx, ef: capMont + n * As_ });
  }
  if (op.vigaNegativosUnir) { // negativos separados por menos de um comprimento de ancoragem viram uma barra só
    const un: Reg[] = [];
    for (const g of regs) {
      const ant = un.at(-1);
      if (ant && g.s0 - ant.s1 < lbS) { ant.s1 = g.s1; ant.n = Math.max(ant.n, g.n); ant.mx = Math.max(ant.mx, g.mx); } else un.push({ ...g });
    }
    regs = un;
  }
  if (op.vigaSimetriaNegativos > 0 && !r.bloqueada && apoios.length === 2 && regs.length === 2) { // viga de um vão: negativos simétricos
    const nMax = Math.max(regs[0].n, regs[1].n), nMin = Math.min(regs[0].n, regs[1].n);
    if ((nMax - nMin) / nMax <= op.vigaSimetriaNegativos / 100 + 1e-9) for (const g of regs) g.n = nMax;
  }
  // montagem: corrida (de ponta a ponta) ou porta-estribos nas lacunas entre as pontas dos negativos
  const retaEixo = !op.vigaMontagemGancho && !!op.vigaMontagemEixo && apoios.length >= 2;
  const opM = (a: number, z: number, ini: boolean, fim: boolean): OptsCorrida => ({ a, z, ganchos: !!op.vigaMontagemGancho, semGanchoIni: ini, semGanchoFim: fim });
  if (montCont) {
    corrida('sup', 'montagem', 2, phiM, lbM, meiosVao, opM(retaEixo ? centrosApoio[0] : c0, retaEixo ? centrosApoio.at(-1)! : c1, false, false));
  } else {
    const ovl = Math.max(0.2, (15 * phiM) / 1000), lacunas: [number, number][] = [];
    let cur = c0;
    for (const g of [...regs].sort((p, q) => p.s0 - q.s0)) { if (g.s0 - cur > 0.05) lacunas.push([cur, g.s0]); cur = Math.max(cur, g.s1); }
    if (c1 - cur > 0.05) lacunas.push([cur, c1]);
    for (const [a, z] of lacunas) corrida('sup', 'montagem', 2, phiM, lbM, meiosVao, opM(a <= c0 + 1e-6 ? c0 : a - ovl, z >= c1 - 1e-6 ? c1 : z + ovl, a > c0 + 1e-6, z < c1 - 1e-6));
  }
  for (const g of regs) {
    const gn = nasPontas(g.s0, g.s1);
    barras.push({ pos: `N${++np}`, face: 'sup', tipo: 'negativo', n: g.n, phi: phiS, s0: g.s0, s1: g.s1, ganchos: gn, comprimento: comp(g.s0, g.s1, gn, phiS) });
  }
  // ancoragem nos apoios extremos (18.3.2.4.1): Rst = (aℓ/d)·Vd; disponível = largura do apoio − cobrimento
  for (const [a, i] of [[apoios[0], 0], [apoios.at(-1), nG - 1]] as const) {
    if (!a || apoios.length < 2) continue;
    const disp = a.s1 - a.s0 - cob.lat, Rst = ((r.al / d) * Vd[i]) / 1000, AsCalc = Rst / aPos.fyd;
    const nec = Math.max(0.7 * lbI * Math.min(1, AsCalc / capPass), (5.5 * phiI) / 1000 + ((phiI < 20 ? 2.5 : 4) * phiI) / 1000, 0.06);
    if (comMem) mem!.passo({ etapa: 'detalhamento', elemento: elMem, topico: 'Ancoragem – apoio extremo', descricao: `Ancoragem da armadura inferior no apoio ${b.pilares.find((p) => p.id === a.pilar)?.nome ?? a.pilar}: Rst = (aℓ/d)·Vd e lb,nec = máx(0,7·lb·As,calc/As,ef; r + 5,5φ; 6 cm)`, formula: 'lb,nec ≤ largura do apoio − cobrimento', expressao: `Rst = (${fm(r.al)}/${fm(d)})·${fm(Vd[i])} = ${fm(Rst * 1000)} kN; lb,nec = ${fm(nec)} ${nec <= disp + 1e-9 ? '≤' : '>'} ${fm(disp)}`, resultado: nec, unidade: 'm', norma: 'NBR 6118:2023, 18.3.2.4.1', entradas: { al: r.al, d, Vd: Vd[i], lb: lbI, AsCalc, capPass, disp } });
    if (nec > disp + 1e-9) avisos.push(`Ancoragem da armadura inferior no apoio extremo (${b.pilares.find((p) => p.id === a.pilar)?.nome ?? a.pilar}): ${(nec * 100).toFixed(0)} cm necessários > ${(disp * 100).toFixed(0)} cm disponíveis.`);
  }
  // pele (17.3.5.2.3: h > 60 cm, 0,10 % Ac,alma por face, s ≤ mín(20 cm; d/3)) e laterais de torção, por face
  const AsPele = h > 0.6 ? 0.001 * bw * h : 0, AsLat = Math.max(AsPele, r.AsLateral);
  if (AsLat > 0) {
    const alt = h - cob.inf - cob.sup - 0.04, sMax = Math.min(0.2, d / 3);
    const phiP = r.arranjo.laterais?.phi ?? 8;
    const nFace = Math.max(Math.ceil(AsLat / barArea(phiP) - 1e-9), Math.ceil(alt / sMax - 1e-9) - 1, 1);
    corrida('pele', 'pele', 2 * nFace, phiP, lbBasico(phiP, c, acoDe(b, 'vigaPele').fyd, supBoa), meiosVao);
  }
  // estribos por zonas fora dos pilares: espaçamento exigido pelo cortante e pela torção em cada ponto
  const fywd = Math.min(aEst.fyk / 1.15, 435), A1 = barArea(phiT), ramos = r.arranjo.estribo?.legs ?? 2;
  const nPecasR = (len: number, s: number, rm: number) => (Math.floor(len / s + 1e-9) + 1) * (rm / 2), nPecas = (len: number, s: number) => nPecasR(len, s, ramos);
  const he = (bw * h) / (2 * (bw + h)), Ae = (bw - he) * (h - he);
  const Vc0 = 0.6 * c.fctd * bw * d * 1000, aswMin = ((0.2 * c.fctm) / aEst.fyk) * bw;
  const smax = (Vmx: number) => Math.min(Vmx <= 0.67 * 0.27 * c.av2 * c.fcd * bw * d * 1000 ? Math.min(0.6 * d, 0.3) : Math.min(0.3 * d, 0.2), r.estriboSmax ?? Infinity);
  const aswI = Float64Array.from({ length: nG }, (_, i) => Math.max(aswMin, Math.max(0, Vd[i] - Vc0) / 1000 / (0.9 * d * fywd) + (Td[i] / 1000) / (Ae * fywd)));
  const smaxI = Float64Array.from({ length: nG }, (_, i) => smax(Vd[i]));
  /** Espaçamento exigido em cada ponto com `rm` ramos de bitola `phi`. */
  const sNec = (i: number, rm: number, phi: number) => Math.floor(Math.min(smaxI[i], (rm * barArea(phi)) / aswI[i]) * 100) / 100;
  let sReq = Float64Array.from({ length: nG }, (_, i) => sNec(i, ramos, phiT));
  if (op.vigaEstriboExtensao) { // zona mais densa estendida de d/2 para o lado menos exigido (K1.12.1-9)
    const ke = Math.round(d / 2 / dx), base = sReq;
    sReq = Float64Array.from(base, (_, i) => { let m = Infinity; for (let j = Math.max(0, i - ke); j <= Math.min(nG - 1, i + ke); j++) m = Math.min(m, base[j]); return m; });
  }
  if (op.vigaEstriboSimetria) { const base = sReq; sReq = Float64Array.from(base, (x, i) => Math.min(x, base[nG - 1 - i])); }
  const sCentral = Math.floor(Math.min(smax(0), (ramos * A1) / aswMin) * 100) / 100;
  const dentroPilar = (s: number) => apoios.some((a) => s > a.s0 + 1e-9 && s < a.s1 - 1e-9);
  const compEst = (phi: number, u = !!op.vigaEstriboU) => arred(estriboComprimento(bw - 2 * cob.lat, h - cob.inf - cob.sup, phi, op.vigaEstriboGancho, u), passo);
  const uGlobal = !!op.vigaEstriboU, compEstribo = compEst(phiT);
  const zonaMin = op.vigaEstriboZonaMin / 100;
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
      else estribos.push({ s0, s1, phi: phiT, s: sj, n: nPecas(len, sj), comprimento: compEstribo, ...(ramos > 2 ? { ramos } : {}), ...(uGlobal ? { u: true } : {}) });
      j = k2 + 1;
    }
  }
  // zonas muito curtas (< 2 espaçamentos ou menores que o mínimo das opções) absorvidas pela vizinha mais densa
  for (let i = estribos.length - 1; i > 0; i--) {
    const z = estribos[i], a = estribos[i - 1];
    if (Math.abs(a.s1 - z.s0) <= dx + 1e-9 && (z.s1 - z.s0 < 2 * z.s || a.s1 - a.s0 < 2 * a.s || (zonaMin > 0 && (z.s1 - z.s0 < zonaMin - 1e-9 || a.s1 - a.s0 < zonaMin - 1e-9)))) {
      const s = Math.min(a.s, z.s);
      estribos.splice(i - 1, 2, { ...a, s1: z.s1, s, n: nPecas(z.s1 - a.s0, s) });
    }
  }
  if (phiT > (bw * 1000) / 10 + 1e-9) avisos.push(`Estribo φ${String(phiT).replace('.', ',')} acima de bw/10 (${((bw * 1000) / 10).toFixed(0)} mm), NBR 6118 18.3.3.2.`);
  // ---- edição fina (R7b): zonas de estribos, depois posições das barras; tudo verificado
  if (edit?.zonas) for (const e of edit.zonas) {
    const z = estribos[e.zona];
    if (!z) { avisos.push(`Detalhe editado desconsiderado: a zona de estribos ${e.zona + 1} não existe mais.`); continue; }
    const phi = e.phi ?? z.phi, rm = e.ramos ?? z.ramos ?? 2, s = e.s ?? z.s;
    if (phi > (bw * 1000) / 10 + 1e-9) avisos.push(`Estribo φ${String(phi).replace('.', ',')} acima de bw/10 (${((bw * 1000) / 10).toFixed(0)} mm), NBR 6118 18.3.3.2 (zona E${e.zona + 1}).`);
    let pior = Infinity;
    for (let i = 0; i < nG; i++) if (sG(i) >= z.s0 - 1e-9 && sG(i) <= z.s1 + 1e-9) pior = Math.min(pior, sNec(i, rm, phi));
    if (s > pior + 1e-9) avisos.push(`Detalhe editado insuficiente: estribo da zona E${e.zona + 1} com s = ${(s * 100).toFixed(0)} cm, exigido ${(pior * 100).toFixed(0)} cm ou menos.`);
    if (e.u !== undefined) { if (e.u) z.u = true; else delete z.u; }
    z.phi = phi; z.s = s; z.comprimento = compEst(phi, !!z.u); z.n = nPecasR(z.s1 - z.s0, s, rm);
    if (rm > 2) z.ramos = rm; else delete z.ramos;
  }
  if (edit?.barras?.length) {
    for (const e of edit.barras) {
      const x = barras.find((q) => q.pos === e.pos);
      if (!x) { avisos.push(`Detalhe editado desconsiderado: a posição ${e.pos} não existe mais.`); continue; }
      const s0 = Math.max(ext[0], e.s0 ?? x.s0), s1 = Math.min(ext[1], e.s1 ?? x.s1);
      if (s1 - s0 < 0.05) { avisos.push(`Detalhe editado desconsiderado: ${e.pos} com comprimento nulo.`); continue; }
      const g = e.ganchos ?? x.ganchos;
      x.s0 = s0; x.s1 = s1; x.ganchos = [g[0], g[1]]; x.comprimento = comp(s0, s1, x.ganchos, x.phi, e.perna ?? pernaG); x.editada = true;
      if (e.perna !== undefined) x.perna = e.perna;
      if (x.comprimento > Lmax + 1e-9) avisos.push(`Detalhe editado: ${e.pos} com C = ${x.comprimento.toFixed(2).replace('.', ',')} m passa da barra máxima (${Lmax} m).`);
    }
    // cobertura: a área efetiva (barras ancoradas ≥ lb,mín além do ponto de corte) não pode ficar abaixo da necessária decalada
    const verificar = (face: 'inf' | 'sup', nec: Float64Array, lb: number, phiRef: number) => {
      const cap = new Float64Array(nG);
      for (const x of barras) {
        if (x.face !== face || (face === 'sup' && x.tipo === 'montagem' && !colab)) continue;
        const sh = lbMin(lb, phiRef), a = x.ganchos[0] || x.s0 <= c0 + 1e-6 ? x.s0 : x.s0 + sh, z = x.ganchos[1] || x.s1 >= c1 - 1e-6 ? x.s1 : x.s1 - sh;
        for (let i = 0; i < nG; i++) if (sG(i) >= a - 1e-9 && sG(i) <= z + 1e-9) cap[i] += x.n * barArea(x.phi);
      }
      const falta = intervalos(nG, (i) => sG(i) >= c0 && sG(i) <= c1 && nec[i] > cap[i] + 1e-9)[0];
      if (falta) avisos.push(`Detalhe editado insuficiente: armadura ${face === 'inf' ? 'inferior' : 'superior'} abaixo da necessária entre s = ${sG(falta[0]).toFixed(2).replace('.', ',')} e ${sG(falta[1]).toFixed(2).replace('.', ',')} m (considerada a ancoragem lb,mín além do corte).`);
    };
    verificar('inf', AsPosD, lbI, phiI); verificar('sup', AsNegD, lbS, phiS);
  }
  // suspensão (N2e): estribos adicionais no cruzamento com a viga apoiada, na largura bw + h/2 de cada lado, depois das edições
  for (const sp of r.suspensoes ?? []) {
    const s0 = Math.max(ext[0], sp.s - sp.largura / 2), s1 = Math.min(ext[1], sp.s + sp.largura / 2);
    if (sp.n > 0 && s1 > s0) estribos.push({ s0, s1, phi: sp.phi, s: Math.max(0.03, (s1 - s0) / sp.n), n: sp.n * (ramos / 2), comprimento: compEst(sp.phi), suspensao: true, ...(ramos > 2 ? { ramos } : {}) });
  }
  for (const x of barras) if (x.perna === undefined && pernaG !== 8 && x.ganchos.some(Boolean)) x.perna = pernaG;
  // E2a (K1.12.16): seção T/L com estribos, barras de canto no nível da mesa para apoiar as pontas dos estribos
  let cantosMesa: DetalheViga['cantosMesa'];
  if (mesa && op.mesaBarrasCanto && estribos.length) {
    const comprimento = Math.ceil((c1 - c0) / passo - 1e-9) * passo;
    cantosMesa = { n: mesa.tipo === 'T' ? 2 : 1, phi: op.bitolaMontagem, s0: c0, s1: c1, comprimento, bf: mesa.bf, hf: mesa.hf };
  }
  const peso = barras.reduce((t, x) => t + x.n * x.comprimento * pesoLinear(x.phi), 0) + estribos.reduce((t, z) => t + z.n * z.comprimento * pesoLinear(z.phi), 0)
    + (cantosMesa ? cantosMesa.n * cantosMesa.comprimento * pesoLinear(cantosMesa.phi) : 0);
  return {
    viga: v.id, nome: v.nome, repeticoes: Math.max(1, pavimentosDoGrupo(b, v.grupo).length), extensao: ext, apoios, barras, estribos,
    lb: { inf: lbI, sup: lbS, supBoaAderencia: supBoa }, emendas, peso, avisos,
    ...(cantosMesa ? { cantosMesa } : {}),
    ...(r.transicoes?.length ? { transicoes: r.transicoes.map((t) => ({ pilar: t.pilar, nome: t.nome, s: t.s, sFaces: t.sFaces, Nd: t.Nd })) } : {}),
  };
}

/** Detalhamento de todas as vigas dimensionadas (com os tramos predefinidos e os desníveis longitudinais). */
export function detalharVigas(b: BuildingModel, dim: Dimensionamento, op: OpcoesCalculo): DetalheViga[] {
  const out: DetalheViga[] = [];
  const { tramos, avisos: avTramo } = resolverTramos(b, dim, op), desn = desniveisLongitudinais(b, op);
  for (const r of dim.vigas) {
    const v = b.vigas.find((x) => x.id === r.viga);
    if (!v) continue;
    const d = detalharViga(b, v, r, op, tramos.get(v.id));
    d.avisos.push(...(avTramo.get(v.id) ?? []), ...(desn.get(v.id) ?? []));
    out.push(d);
  }
  return out;
}

/** Aço da barra pela posição (N2e, K1.6.6): negativo, montagem e pele têm aço próprio; o resto, o da positiva. */
export function acoDaBarraViga(b: BuildingModel, tipo: BarraViga['tipo']): string {
  return acoDe(b, tipo === 'negativo' ? 'vigaNeg' : tipo === 'montagem' ? 'vigaMontagem' : tipo === 'pele' ? 'vigaPele' : 'vigaPos').aco;
}

/** Resumo do aço das vigas por aço e bitola (kg), com as repetições dos grupos e as perdas (%). */
export function resumoAcoVigas(b: BuildingModel, dets: DetalheViga[], perdas: number): { aco: string; phi: number; comprimento: number; peso: number; pesoComPerdas: number }[] {
  const acoE = acoDe(b, 'vigaEstribo').aco;
  const m = new Map<string, { aco: string; phi: number; comprimento: number }>();
  const soma = (aco: string, phi: number, len: number) => { const k = `${aco}|${phi}`; const e = m.get(k) ?? { aco, phi, comprimento: 0 }; e.comprimento += len; m.set(k, e); };
  for (const d of dets) {
    for (const x of d.barras) soma(acoDaBarraViga(b, x.tipo), x.phi, x.n * x.comprimento * d.repeticoes);
    for (const z of d.estribos) soma(acoE, z.phi, z.n * z.comprimento * d.repeticoes);
    if (d.cantosMesa) soma(acoDaBarraViga(b, 'montagem'), d.cantosMesa.phi, d.cantosMesa.n * d.cantosMesa.comprimento * d.repeticoes);
  }
  return [...m.values()].sort((a, z) => a.aco.localeCompare(z.aco) || a.phi - z.phi).map((e) => {
    const peso = e.comprimento * pesoLinear(e.phi);
    return { ...e, peso, pesoComPerdas: peso * (1 + perdas / 100) };
  });
}
