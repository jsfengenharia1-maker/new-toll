// Escadas (frente E4c): cálculo à parte de cada lance por elementos finitos de casca espessa e reações como cargas.
//
// Cada lance (um trecho entre dois pisos, com os seus patamares) é um modelo independente de 6 gdl por nó, malha triangular de
// casca de 6 nós (`casca.ts`, N2b) sobre os polígonos 3D da E4a (`geometriaEscada`). Só entram os casos gravitacionais G
// (peso próprio, degraus, revestimento, corrimão) e Q (sobrecarga); a escada não participa do vento nem da análise espacial
// (a influência das ações horizontais sobre ela é grande e fora da prática usual). As reações dos apoios viram cargas
// lineares uniformes (kN/m, G e Q) e cargas de superfície (degraus iniciais) aplicadas ao resto da estrutura em `comEscadas`.
//
// Hipóteses (todas "a confirmar", ver `docs/pendencias-usuario.md`):
// - Apoios inferior e superior: laje apoiada em viga de rigidez muito elevada, isto é, o limite da penalização × 10⁶ dos
//   apoios rígidos do programa de referência: gdl vertical preso (restrição exata, sem penalização numérica). Embaixo a
//   translação horizontal na direção do primeiro trecho também fica presa (um único apoio fixo basta para o equilíbrio); em cima só a
//   vertical (apoio simples); com a opção `escadaApoioFixoDois` as duas bordas prendem a horizontal. Giros livres.
// - Apoio do patamar: parede de alvenaria ou de concreto sob a borda e tirante até o piso de cima = apoio elástico vertical
//   contínuo k' = E·largura/altura (kN/m por m; E da alvenaria na opção `escadaEAlvenaria`, o do concreto = Ecs das lajes);
//   conector de cisalhamento = apoio vertical rígido na borda. Patamar livre = sem apoio.
// - Continuidade geométrica: os degraus do patamar e o degrau de chegada não elevam a laje; a laje do trecho seguinte
//   começa na cota em que o trecho anterior (ou o patamar) termina. Só a inclinação e os comprimentos valem; os apoios são só verticais.
// - Rigidez: casca de espessura da laje (h) em concreto de Ecs das lajes (C8.56), ν = 0,2; os degraus concretados não somam rigidez.
// - Cargas: por m² de projeção horizontal (como na E4a), aplicadas como forças nodais verticais consistentes. Corrimão: kN/m
//   ao longo da borda lateral dos trechos inclinados, metade em cada borda.
// - Degraus iniciais (sobre o piso, antes da laje inclinada) não fazem parte do modelo: viram carga de superfície (G) no
//   elemento sob eles.
// - Reação como carga: reação total da borda ÷ comprimento (uniforme) mais o peso próprio da parede/tirante da E4a. Cargas
//   de grupo valem para todos os pavimentos do grupo (maior valor entre as instâncias iguais).
// Núcleo puro; kN, m.
import { resolver3, type Caso3, type Modelo3, type V3 } from '../fe3d';
import type { Casca3 } from '../casca';
import type { P } from '../geom/faces';
import { concretoDe, gamas } from './materiais';
import { OPCOES_ARMADURA_ESCADA, opcoesEmUso, perfilDe } from './opcoes';
import { geometriaEscadas, tiposLanceDisponiveis, type GeometriaEscada, type LanceGeo, type TipoApoioPatamar } from './escadas';
import type { BuildingModel, Carga } from './types';
import type { Diagnostico } from './verify';

export type CasoEscada = 'G' | 'Q';
const CASOS: CasoEscada[] = ['G', 'Q'];
const EPS = 1e-6;
export const NU = 0.2;
/**
 * Fração de Hughes-Brezzi do giro no plano acoplado à rotação da membrana (`Casca3.acoplarGiro`). Com o giro pouco acoplado (`kGiro` pequeno, relativo)
 * as dobras entre trechos e patamares ficam moles demais (reação do apoio do patamar 3,5 % abaixo do OpenSees, na escada em L);
 * com 1 as reações e flechas ficam a 0,5 % do OpenSees (escada.py). 10 dá praticamente o mesmo.
 */
const ACOPLAR_GIRO = 1;

export interface ApoioCalculado {
  /** 'inf' | 'sup' | 'p<patamar>-<borda>-<k>'. */
  id: string;
  tipo: 'inferior' | 'superior' | 'patamar';
  rotulo: string;
  tipoApoio?: TipoApoioPatamar;
  patamar?: number;
  /** Extremos da borda (planta, eixos da obra) e comprimento (m). */
  a: P; b: P; comprimento: number;
  rigido: boolean;
  /** Rigidez do apoio elástico por metro de borda (kN/m por m); só no elástico. */
  kLinha?: number;
  /** Só no elástico (memória detalhada): módulo do material (kN/m²), largura da parede/tirante (m) e altura adotada (m), com kLinha = módulo·largura/altura. */
  modulo?: number; largura?: number; altura?: number;
  /** Grupo que recebe a carga ('fundacao' = nível de fundação). */
  grupo?: string;
  /** Peso próprio da parede ou do tirante (kN/m, caso G), somado à reação ao gerar a carga. */
  pesoProprio: number;
  /** Reação vertical total (kN, positiva = a escada empurra o apoio para baixo) e resultante horizontal (kN). */
  reacao: Record<CasoEscada, number>;
  horizontal: Record<CasoEscada, number>;
  /** Carga linear transmitida (kN/m): reação ÷ comprimento (+ peso próprio no G). */
  porMetro: Record<CasoEscada, number>;
}

/** Esforços por metro no centroide, eixos locais (Nx, Ny, Nxy, Mx, My, Mxy, Qx, Qy; M > 0 traciona a face inferior). */
export interface ElementoEscada {
  tipo: 'lance' | 'patamar';
  trecho: number;
  /** Centroide em coordenadas do modelo local (x no sentido de subida do primeiro trecho) e a área em planta (m²). */
  centro: V3;
  area: number;
  G: number[];
  Q: number[];
}

export interface CargaGerada {
  grupo: string;
  caso: CasoEscada;
  tipo: 'linha' | 'area';
  valor: number;
  pontos: P[];
  apoio: string;
  rotulo: string;
}

/** Descrição do modelo local de um lance (coordenadas do modelo: x no sentido de subida do primeiro trecho), para a validação externa. */
export interface DescricaoLance {
  rets: { tipo: 'lance' | 'patamar'; trecho: number; c: P[]; z: number[]; permanente: number; sobrecarga: number; faixas: { poligono: P[]; permanente: number }[] }[];
  /** Linhas de apoio no modelo: rígida (gdl vertical, e horizontal conforme `fixaX`) ou elástica (k por metro). */
  linhas: { id: string; a: P; b: P; rigido: boolean; kLinha?: number; fixaX: boolean; fixaY: boolean }[];
  FX: number[]; FY: number[];
  corrimao: number;
}

export interface ResultadoLance {
  escada: string;
  nome: string;
  /** Número do lance na escada (1...), contando as repetições. */
  lance: number;
  pavimento?: string;
  pavimentoTopo?: string;
  espessura: number;
  E: number;
  malha: number;
  nos: number;
  elementos: number;
  gdl: number;
  /** Carga vertical total aplicada ao modelo (kN). */
  carga: Record<CasoEscada, number>;
  apoios: ApoioCalculado[];
  /** Erro relativo de equilíbrio vertical (Σ reações ÷ Σ cargas − 1). */
  equilibrio: Record<CasoEscada, number>;
  /** Maior deslocamento vertical para baixo (m) por caso. */
  deslocamento: Record<CasoEscada, number>;
  /** Envoltória dos momentos (kN·m/m) de cálculo (γg·G + γq·Q), eixos locais: x no sentido da subida, y transversal. */
  momentos: { MxPos: number; MxNeg: number; MyPos: number; MyNeg: number; Mxy: number; Qmax: number };
  elems: ElementoEscada[];
  cargas: CargaGerada[];
  descricao?: DescricaoLance;
  /** Só com `calcularEscadas(b, { detalhe: true })` (validação externa e isovalores): coordenadas do modelo local e deslocamento vertical (m) de cada nó, nos casos G e Q. */
  nosDetalhe?: { x: number; y: number; z: number; uz: [number, number] }[];
  /** Só com `detalhe`: os 6 nós (3 vértices e 3 meios de lado) de cada elemento de casca, na ordem de `elems`, como índices de `nosDetalhe` (isovalores do lance, E4e). */
  triangulosDetalhe?: number[][];
  avisos: string[];
  erro?: string;
  ms: number;
}

export interface ResultadoEscadas {
  /** Assinatura dos dados que mudam as reações (para o aviso ESCADA_RECALCULAR). */
  assinatura: string;
  lances: ResultadoLance[];
  /** Avisos de geometria e de cálculo (mensagens "Escada ...", como em `analisarEdificio`). */
  avisos: string[];
}

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Valores únicos ordenados (tolerância absoluta). */
function unicos(v: number[], tol = EPS): number[] {
  const s = [...v].sort((a, b) => a - b), out: number[] = [];
  for (const x of s) if (!out.length || x - out[out.length - 1] > tol) out.push(x);
  return out;
}
/** Subdivide cada intervalo entre pontos de quebra em partes iguais de no máximo `h`. */
function refinar(br: number[], h: number): number[] {
  const out: number[] = [br[0]];
  for (let i = 0; i + 1 < br.length; i++) {
    const n = Math.max(1, Math.ceil((br[i + 1] - br[i]) / h - 1e-9));
    for (let k = 1; k <= n; k++) out.push(k === n ? br[i + 1] : br[i] + ((br[i + 1] - br[i]) * k) / n);
  }
  return out;
}
const dentro = (p: P, poly: P[]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

interface Ret { tipo: 'lance' | 'patamar'; trecho: number; c: [P, P, P, P]; z: [number, number, number, number]; dir: P; x0: number; x1: number; y0: number; y1: number; faixas: P[][]; faixaPerm: number[] }

/** Assinatura (hash) do que define as reações: escadas, tipos, cotas, concreto e opções das escadas. */
export function assinaturaEscadas(b: BuildingModel): string {
  const o = opcoesEmUso(b.opcoes, perfilDe(b));
  const chaves = Object.keys(o).filter((k) => k.startsWith('escada') && !OPCOES_ARMADURA_ESCADA.includes(k)).sort();
  const usados = new Set((b.escadas ?? []).flatMap((e) => e.lances.map((l) => l.tipo)));
  const dados = JSON.stringify([(b.escadas ?? []).map(({ armadura: _a, ...e }) => e), tiposLanceDisponiveis(b).filter((t) => usados.has(t.id)), b.pavimentos.map((p) => [p.id, p.grupo, p.cota]), chaves.map((k) => [k, (o as unknown as Record<string, number>)[k]]), b.norma.fck, b.norma.fckElem?.laje ?? null]);
  let h = 5381;
  for (let i = 0; i < dados.length; i++) h = (Math.imul(h, 33) ^ dados.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

/** Aviso ESCADA_RECALCULAR: a obra tem escadas e as reações aplicadas na análise vieram de outros dados. */
export function diagnosticoRecalcular(b: BuildingModel, assinaturaAplicada: string | undefined): Diagnostico | null {
  if (!b.escadas?.length) return null;
  if (assinaturaAplicada === assinaturaEscadas(b)) return null;
  return { codigo: 'ESCADA_RECALCULAR', severidade: 'aviso', elementos: b.escadas.map((e) => e.id), mensagem: `Escada ${b.escadas.map((e) => e.nome).join(', ')}: a escada mudou depois do último cálculo e as reações aplicadas na estrutura podem estar desatualizadas; recalcule a obra.` };
}

/** Calcula um lance: monta a malha, resolve G e Q e devolve reações, esforços e as cargas geradas. */
function calcularLance(b: BuildingModel, g: GeometriaEscada, l: LanceGeo, ordem: number, detalhe = false): ResultadoLance {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const e = g.escada, o = opcoesEmUso(b.opcoes, perfilDe(b)), gm = gamas(b);
  const pre = `Escada ${e.nome}, lance ${ordem}`;
  const concreto = concretoDe(b, 'laje');
  const E = concreto.Ecs * 1000, h = l.espessura.valor, s = Math.max(0.05, o.escadaMalha);
  const base: ResultadoLance = {
    escada: e.id, nome: e.nome, lance: ordem, pavimento: l.pavimento, pavimentoTopo: l.pavimentoTopo, espessura: h, E, malha: s, nos: 0, elementos: 0, gdl: 0,
    carga: { G: 0, Q: 0 }, apoios: [], equilibrio: { G: 0, Q: 0 }, deslocamento: { G: 0, Q: 0 }, momentos: { MxPos: 0, MxNeg: 0, MyPos: 0, MyNeg: 0, Mxy: 0, Qmax: 0 }, elems: [], cargas: [], avisos: [], ms: 0,
  };
  const falha = (msg: string): ResultadoLance => ({ ...base, erro: msg, avisos: [`${pre}: ${msg}`], ms: (typeof performance !== 'undefined' ? performance.now() : 0) - t0 });
  const avisos: string[] = [];
  const pavIni = b.pavimentos.find((p) => p.id === l.pavimento), pavTopo = b.pavimentos.find((p) => p.id === l.pavimentoTopo);
  if (!pavIni || !pavTopo) return falha('cálculo: pavimento de partida ou de chegada inexistente');
  const trL = l.trechos.filter((t) => t.tipo === 'lance');
  if (!trL.length) return falha('cálculo: o lance não tem trecho inclinado');

  // ---- coordenadas do modelo: x no sentido de subida do primeiro trecho
  const th = (e.angulo * Math.PI) / 180, cs = Math.cos(th), sn = Math.sin(th);
  const T = (p: P): P => { const dx = p[0] - e.origem[0], dy = p[1] - e.origem[1]; return [cs * dx + sn * dy, -sn * dx + cs * dy]; };
  const rets: Ret[] = [];
  let zAtual: number | null = null, dirAnt: P = [1, 0];
  for (const t of l.trechos) {
    const pl = t.poligono.map((q) => T([q[0], q[1]])) as [P, P, P, P];
    const desloc: number = zAtual === null ? 0 : zAtual - t.cotaIni;
    const z = t.poligono.map((q) => q[2] + desloc) as [number, number, number, number];
    zAtual = (t.tipo === 'lance' ? t.cotaFim : t.cotaIni) + desloc;
    let dir: P = dirAnt;
    if (t.tipo === 'lance') { const d: P = [pl[1][0] - pl[0][0], pl[1][1] - pl[0][1]], n = Math.hypot(d[0], d[1]); dir = [d[0] / n, d[1] / n]; dirAnt = dir; }
    const xs = pl.map((q) => q[0]), ys = pl.map((q) => q[1]);
    const faixas = t.tipo === 'patamar' ? l.cargas.superficies.filter((sf) => sf.origem === 'degraus do patamar' && sf.patamar === t.indice) : [];
    rets.push({ tipo: t.tipo, trecho: t.indice, c: pl, z, dir, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), faixas: faixas.map((f) => f.planta.map(T)), faixaPerm: faixas.map((f) => f.permanente) });
  }
  // ---- malha estruturada global (as pontas de todos os retângulos e das faixas dos degraus são linhas da malha)
  const bx: number[] = [], by: number[] = [];
  for (const r of rets) { for (const q of r.c) { bx.push(q[0]); by.push(q[1]); } for (const f of r.faixas) for (const q of f) { bx.push(q[0]); by.push(q[1]); } }
  const FX = refinar(unicos(bx), s), FY = refinar(unicos(by), s);
  const ixOf = (x: number) => { let k = 0, best = Infinity; for (let i = 0; i < FX.length; i++) { const d = Math.abs(FX[i] - x); if (d < best) { best = d; k = i; } } return k; };
  const iyOf = (y: number) => { let k = 0, best = Infinity; for (let i = 0; i < FY.length; i++) { const d = Math.abs(FY[i] - y); if (d < best) { best = d; k = i; } } return k; };
  const nosMap = new Map<string, number>();
  const nos: V3[] = [];
  const nodePlan: P[] = [];
  const retDoNo: number[] = [];
  const zDe = (r: Ret, x: number, y: number) => {
    const e1: P = [r.c[1][0] - r.c[0][0], r.c[1][1] - r.c[0][1]], e2: P = [r.c[3][0] - r.c[0][0], r.c[3][1] - r.c[0][1]];
    const u = ((x - r.c[0][0]) * e1[0] + (y - r.c[0][1]) * e1[1]) / (e1[0] ** 2 + e1[1] ** 2), v = ((x - r.c[0][0]) * e2[0] + (y - r.c[0][1]) * e2[1]) / (e2[0] ** 2 + e2[1] ** 2);
    return (1 - u) * (1 - v) * r.z[0] + u * (1 - v) * r.z[1] + u * v * r.z[2] + (1 - u) * v * r.z[3];
  };
  const xDob = (d: number) => (FX[Math.floor(d / 2)] + FX[Math.ceil(d / 2)]) / 2, yDob = (d: number) => (FY[Math.floor(d / 2)] + FY[Math.ceil(d / 2)]) / 2;
  const no = (di: number, dj: number, ri: number): number => {
    const k = `${di},${dj}`;
    let n = nosMap.get(k);
    if (n === undefined) { n = nos.length; const x = xDob(di), y = yDob(dj); nos.push([x, y, zDe(rets[ri], x, y)]); nodePlan.push([x, y]); retDoNo.push(ri); nosMap.set(k, n); }
    return n;
  };
  const cascas: Casca3[] = [];
  const meta: { ret: number; area: number; centro: V3; permanente: number; sobrecarga: number; midNos: number[]; tipo: 'lance' | 'patamar'; trecho: number }[] = [];
  for (let ri = 0; ri < rets.length; ri++) {
    const r = rets[ri];
    const i0 = ixOf(r.x0), i1 = ixOf(r.x1), j0 = iyOf(r.y0), j1 = iyOf(r.y1);
    const refDir: V3 = [r.dir[0], r.dir[1], 0];
    for (let i = i0; i < i1; i++) for (let j = j0; j < j1; j++) {
      const cell: [number, number][] = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
      const tris: [number, number, number][] = (i + j) % 2 === 0 ? [[0, 1, 2], [0, 2, 3]] : [[0, 1, 3], [1, 2, 3]];
      for (const tr of tris) {
        const [a, bb, c] = tr.map((k) => cell[k]);
        const ids = [no(2 * a[0], 2 * a[1], ri), no(2 * bb[0], 2 * bb[1], ri), no(2 * c[0], 2 * c[1], ri), no(a[0] + bb[0], a[1] + bb[1], ri), no(bb[0] + c[0], bb[1] + c[1], ri), no(c[0] + a[0], c[1] + a[1], ri)];
        const pa = nodePlan[ids[0]], pb = nodePlan[ids[1]], pc = nodePlan[ids[2]];
        const area = Math.abs((pb[0] - pa[0]) * (pc[1] - pa[1]) - (pc[0] - pa[0]) * (pb[1] - pa[1])) / 2;
        const cx = (pa[0] + pb[0] + pc[0]) / 3, cy = (pa[1] + pb[1] + pc[1]) / 3;
        let permanente = r.tipo === 'lance' ? l.cargas.permanenteProjecao : l.cargas.permanentePatamar;
        r.faixas.forEach((f, k) => { if (dentro([cx, cy], f)) permanente += r.faixaPerm[k]; });
        cascas.push({ nos: ids as Casca3['nos'], E, nu: NU, h, ref: refDir, acoplarGiro: ACOPLAR_GIRO });
        meta.push({ ret: ri, area, centro: [cx, cy, (nos[ids[0]][2] + nos[ids[1]][2] + nos[ids[2]][2]) / 3], permanente, sobrecarga: l.cargas.sobrecarga, midNos: ids.slice(3), tipo: r.tipo, trecho: r.trecho });
      }
    }
  }
  if (!cascas.length) return falha('cálculo: a malha não tem elementos');

  // ---- linhas de apoio: nós da borda e pesos de contribuição (comprimento tributário de cada nó, 1/6 · 4/6 · 1/6)
  type NoPeso = { no: number; peso: number };
  const nosDaLinha = (a: P, bpt: P): NoPeso[] | null => {
    const pa = T(a), pb = T(bpt);
    const ia = 2 * ixOf(pa[0]), ja = 2 * iyOf(pa[1]), ib = 2 * ixOf(pb[0]), jb = 2 * iyOf(pb[1]);
    if (ia !== ib && ja !== jb) return null;
    const seq: [number, number][] = [];
    if (ia !== ib) { const st = ib > ia ? 1 : -1; for (let d = ia; d !== ib + st; d += st) seq.push([d, ja]); } else { const st = jb > ja ? 1 : -1; for (let d = ja; d !== jb + st; d += st) seq.push([ia, d]); }
    const ids = seq.map(([di, dj]) => nosMap.get(`${di},${dj}`));
    if (ids.some((x) => x === undefined)) return null;
    const acc = new Map<number, number>();
    for (let k = 0; k + 2 < ids.length; k += 2) {
      const p0 = nos[ids[k]!], p2 = nos[ids[k + 2]!], len = Math.hypot(p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]);
      [[ids[k]!, 1 / 6], [ids[k + 1]!, 4 / 6], [ids[k + 2]!, 1 / 6]].forEach(([n, w]) => acc.set(n, (acc.get(n) ?? 0) + w * len));
    }
    return [...acc].map(([n, p]) => ({ no: n, peso: p }));
  };

  const apoiosModelo = new Map<number, Set<number>>();
  const prender = (n: number, gd: number) => { let st = apoiosModelo.get(n); if (!st) { st = new Set(); apoiosModelo.set(n, st); } st.add(gd); };
  const molas: NonNullable<Modelo3['molas']> = [];
  const apoios: (ApoioCalculado & { nosLinha: NoPeso[]; molaDe: Map<number, number> })[] = [];
  const grupoDe = (id: string | undefined) => b.pavimentos.find((p) => p.id === id)?.grupo;
  const pavs = b.pavimentos, mais_baixo = pavs.length ? [...pavs].sort((x, y) => x.cota - y.cota)[0].id : undefined;
  const naFundacao = l.pavimento === mais_baixo && l.cotaBase < l.cotaPiso - 1e-9;
  const grupoIni = naFundacao ? 'fundacao' : grupoDe(l.pavimento), grupoTopo = grupoDe(l.pavimentoTopo);
  const mkApoio = (a: Partial<ApoioCalculado> & Pick<ApoioCalculado, 'id' | 'tipo' | 'rotulo' | 'a' | 'b' | 'rigido'>, nl: NoPeso[]) => {
    const ap = { comprimento: dist(a.a, a.b), pesoProprio: 0, reacao: { G: 0, Q: 0 }, horizontal: { G: 0, Q: 0 }, porMetro: { G: 0, Q: 0 }, ...a, nosLinha: nl, molaDe: new Map<number, number>() } as ApoioCalculado & { nosLinha: NoPeso[]; molaDe: Map<number, number> };
    apoios.push(ap); return ap;
  };
  const tPri = l.trechos.find((t) => t.tipo === 'lance')!, tUlt = [...l.trechos].reverse().find((t) => t.tipo === 'lance')!;
  // inferior: borda de partida do primeiro trecho (c0 → c3); superior: borda de chegada do último (c1 → c2)
  const lin: [P, P][] = [[[tPri.planta[0][0], tPri.planta[0][1]], [tPri.planta[3][0], tPri.planta[3][1]]], [[tUlt.planta[1][0], tUlt.planta[1][1]], [tUlt.planta[2][0], tUlt.planta[2][1]]]];
  const nInf = nosDaLinha(...lin[0]), nSup = nosDaLinha(...lin[1]);
  if (!nInf || !nSup) return falha('cálculo: a borda de apoio inferior ou superior não está na malha');
  mkApoio({ id: 'inf', tipo: 'inferior', rotulo: 'Apoio inferior (borda de partida)', a: lin[0][0], b: lin[0][1], rigido: true, grupo: grupoIni }, nInf);
  mkApoio({ id: 'sup', tipo: 'superior', rotulo: 'Apoio superior (borda de chegada)', a: lin[1][0], b: lin[1][1], rigido: true, grupo: grupoTopo }, nSup);
  for (const x of nInf) { prender(x.no, 2); prender(x.no, 0); }
  // um nó central prende a translação transversal (estabilidade no plano)
  const cInf = T(lin[0][0]), cInf2 = T(lin[0][1]), meio: P = [(cInf[0] + cInf2[0]) / 2, (cInf[1] + cInf2[1]) / 2];
  const noMeio = nInf.reduce((m, x) => (Math.hypot(nodePlan[x.no][0] - meio[0], nodePlan[x.no][1] - meio[1]) < Math.hypot(nodePlan[m.no][0] - meio[0], nodePlan[m.no][1] - meio[1]) ? x : m), nInf[0]);
  prender(noMeio.no, 1);
  const dirSup = rets.filter((r) => r.tipo === 'lance').slice(-1)[0].dir;
  // Equilíbrio de momentos: com o apoio superior móvel só as reações verticais equilibram o momento em torno do eixo transversal,
  // o que exige bordas de apoio em abscissas diferentes (x do modelo). Com as duas bordas na mesma abscissa (meia-volta, L) o
  // equilíbrio pede o binário horizontal entre as duas bordas: a horizontal do apoio superior também é presa.
  const meioX = (a: P, c: P) => (T(a)[0] + T(c)[0]) / 2;
  const mesmaAbscissa = Math.abs(meioX(...lin[0]) - meioX(...lin[1])) < 0.05;
  const fixoDois = !!o.escadaApoioFixoDois || mesmaAbscissa;
  if (!o.escadaApoioFixoDois && mesmaAbscissa) avisos.push(`${pre}: as bordas de apoio estão na mesma abscissa (lance em volta); a translação horizontal do apoio superior foi presa para equilibrar o momento`);
  const topoEmX = Math.abs(dirSup[0]) >= Math.abs(dirSup[1]);
  for (const x of nSup) {
    prender(x.no, 2);
    if (fixoDois) prender(x.no, topoEmX ? 0 : 1);
  }

  // apoios do patamar
  const EAlv = o.escadaEAlvenaria * 1000;
  const contaLinha = new Map<string, number>();
  for (const li of l.cargas.linhas) {
    const k = `${li.patamar}-${li.borda}`, n = contaLinha.get(k) ?? 0; contaLinha.set(k, n + 1);
    const ap = l.lance.patamares?.[li.patamar]?.apoios?.find((x) => x.borda === li.borda && x.tipo === li.tipo);
    const nl = nosDaLinha(li.a, li.b);
    if (!nl || !ap) { avisos.push(`${pre}: o apoio ${li.borda} do patamar ${li.patamar + 1} não está na malha (ignorado)`); continue; }
    const id = `p${li.patamar + 1}-${li.borda}-${n + 1}`;
    const rotulo = `Patamar ${li.patamar + 1}, borda ${li.borda}: ${li.tipo === 'tirante' ? 'tirante' : li.tipo === 'conector' ? 'conectores' : `parede de ${li.tipo === 'concreto' ? 'concreto' : 'alvenaria'}`}`;
    if (li.tipo === 'conector') {
      mkApoio({ id, tipo: 'patamar', rotulo, tipoApoio: li.tipo, patamar: li.patamar, a: li.a, b: li.b, rigido: true, grupo: grupoIni, pesoProprio: li.valor }, nl);
      for (const x of nl) prender(x.no, 2);
      continue;
    }
    const tp = l.trechos.filter((t) => t.tipo === 'patamar')[li.patamar];
    const alt = li.tipo === 'tirante' ? l.cotaTopo - tp.cotaIni : tp.cotaIni - h - l.cotaPiso;
    if (!(alt > 0.05)) avisos.push(`${pre}: altura do apoio ${li.borda} do patamar ${li.patamar + 1} (${fmt(alt)} m) muito pequena; adotado 0,05 m`);
    const Eap = li.tipo === 'concreto' ? E : EAlv;
    const kLinha = (Eap * ap.largura) / Math.max(0.05, alt);
    const a2 = mkApoio({ id, tipo: 'patamar', rotulo, tipoApoio: li.tipo, patamar: li.patamar, a: li.a, b: li.b, rigido: false, kLinha, modulo: Eap, largura: ap.largura, altura: Math.max(0.05, alt), grupo: li.sobre === 'acima' ? grupoTopo : grupoIni, pesoProprio: li.valor }, nl);
    for (const x of nl) { const k = kLinha * x.peso; molas.push({ no: x.no, gdl: 2, k }); a2.molaDe.set(x.no, (a2.molaDe.get(x.no) ?? 0) + k); }
  }

  // ---- cargas (forças nodais verticais, kN; para baixo = −z)
  const casos: Caso3[] = CASOS.map(() => ({ nodais: [], distribuidas: [] }));
  const acum = CASOS.map(() => new Map<number, number>());
  const soma = (ic: number, n: number, f: number) => acum[ic].set(n, (acum[ic].get(n) ?? 0) + f);
  const total: Record<CasoEscada, number> = { G: 0, Q: 0 };
  for (const m of meta) {
    for (let ic = 0; ic < 2; ic++) {
      const q = ic === 0 ? m.permanente : m.sobrecarga, F = (q * m.area) / 3;
      total[CASOS[ic]] += q * m.area;
      if (F) for (const n of m.midNos) soma(ic, n, F);
    }
  }
  // corrimão: metade em cada borda lateral dos trechos inclinados (kN/m ao longo da inclinação)
  if (l.cargas.corrimao > 0) {
    rets.forEach((r) => {
      if (r.tipo !== 'lance') return;
      for (const [pa, pb] of [[r.c[0], r.c[1]], [r.c[3], r.c[2]]] as [P, P][]) {
        const ia = 2 * ixOf(pa[0]), ja = 2 * iyOf(pa[1]), ib = 2 * ixOf(pb[0]), jb = 2 * iyOf(pb[1]);
        const seq: [number, number][] = [];
        if (ia !== ib) { const st = ib > ia ? 1 : -1; for (let d = ia; d !== ib + st; d += st) seq.push([d, ja]); } else { const st = jb > ja ? 1 : -1; for (let d = ja; d !== jb + st; d += st) seq.push([ia, d]); }
        const ids = seq.map(([di, dj]) => nosMap.get(`${di},${dj}`)!);
        const w = l.cargas.corrimao / 2;
        for (let k = 0; k + 2 < ids.length; k += 2) {
          const p0 = nos[ids[k]], p2 = nos[ids[k + 2]], len = Math.hypot(p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]);
          [[ids[k], 1 / 6], [ids[k + 1], 4 / 6], [ids[k + 2], 1 / 6]].forEach(([n, f]) => soma(0, n, w * len * f));
          total.G += w * len;
        }
      }
    });
  }
  casos.forEach((c, ic) => { for (const [n, f] of acum[ic]) c.nodais.push({ no: n, f: [0, 0, -f, 0, 0, 0] }); });

  const modelo: Modelo3 = { nos, barras: [], apoios: new Map([...apoiosModelo].map(([n, st]) => [n, [...st].sort()])), molas, cascas };
  const res = resolver3(modelo, casos);
  if (res.erro) return falha(`cálculo por casca falhou: ${res.erro}`);

  // ---- reações, equilíbrio, deslocamentos e esforços
  const noApoio = new Map<number, typeof apoios[number]>();
  for (const ap of apoios) if (ap.rigido) for (const x of ap.nosLinha) if (!noApoio.has(x.no)) noApoio.set(x.no, ap);
  const equilibrio: Record<CasoEscada, number> = { G: 0, Q: 0 }, deslocamento: Record<CasoEscada, number> = { G: 0, Q: 0 };
  CASOS.forEach((cn, ic) => {
    let soma = 0;
    for (const [n, ap] of noApoio) {
      const r = res.reacoes[ic].get(n);
      if (!r) continue;
      ap.reacao[cn] += r[2]; soma += r[2];
    }
    // resultante horizontal por apoio (soma vetorial dos nós)
    for (const ap of apoios) if (ap.rigido) {
      let hx = 0, hy = 0;
      for (const x of ap.nosLinha) { if (noApoio.get(x.no) !== ap) continue; const r = res.reacoes[ic].get(x.no); if (r) { hx += r[0]; hy += r[1]; } }
      ap.horizontal[cn] = Math.hypot(hx, hy);
    }
    for (const ap of apoios) if (!ap.rigido) {
      let R = 0;
      for (const [n, k] of ap.molaDe) R += -k * res.desloc[ic][n * 6 + 2];
      ap.reacao[cn] = R; soma += R;
    }
    equilibrio[cn] = total[cn] > 1e-12 ? soma / total[cn] - 1 : 0;
    let m = 0;
    for (let n = 0; n < nos.length; n++) m = Math.min(m, res.desloc[ic][n * 6 + 2]);
    deslocamento[cn] = -m;
  });
  // esforços por elemento e envoltória de cálculo
  const elems: ElementoEscada[] = meta.map((m, k) => ({ tipo: m.tipo, trecho: m.trecho, centro: m.centro, area: m.area, G: [...res.cascas![0][k]], Q: [...res.cascas![1][k]] }));
  const mom = { MxPos: -Infinity, MxNeg: Infinity, MyPos: -Infinity, MyNeg: Infinity, Mxy: 0, Qmax: 0 };
  for (const el of elems) {
    for (const [ix, pos, neg] of [[3, 'MxPos', 'MxNeg'], [4, 'MyPos', 'MyNeg']] as const) {
      const mx = gm.g * el.G[ix] + gm.q * Math.max(0, el.Q[ix]), mn = gm.g * el.G[ix] + gm.q * Math.min(0, el.Q[ix]);
      if (mx > mom[pos]) mom[pos] = mx;
      if (mn < mom[neg]) mom[neg] = mn;
    }
    mom.Mxy = Math.max(mom.Mxy, Math.abs(gm.g * el.G[5]) + gm.q * Math.abs(el.Q[5]));
    mom.Qmax = Math.max(mom.Qmax, Math.hypot(gm.g * el.G[6] + gm.q * el.Q[6], gm.g * el.G[7] + gm.q * el.Q[7]));
  }
  const momentos = { MxPos: Math.max(0, mom.MxPos), MxNeg: Math.min(0, mom.MxNeg), MyPos: Math.max(0, mom.MyPos), MyNeg: Math.min(0, mom.MyNeg), Mxy: mom.Mxy, Qmax: mom.Qmax };

  // ---- cargas geradas: reação ÷ comprimento por apoio (+ peso próprio da parede/tirante) e degraus iniciais sobre o piso
  const cargas: CargaGerada[] = [];
  for (const ap of apoios) {
    ap.porMetro = { G: ap.reacao.G / ap.comprimento + ap.pesoProprio, Q: ap.reacao.Q / ap.comprimento };
    if (ap.tipoApoio === 'tirante' && (ap.reacao.G + ap.reacao.Q < -1e-9)) avisos.push(`${pre}: o tirante do patamar ${ap.patamar! + 1} (${ap.id}) fica comprimido (reação ${fmt(ap.reacao.G + ap.reacao.Q)} kN)`);
    if (!ap.grupo) { avisos.push(`${pre}: o apoio "${ap.rotulo}" não tem grupo para receber a carga`); continue; }
    for (const cn of CASOS) {
      const v = ap.porMetro[cn];
      if (Math.abs(v) > 1e-9) cargas.push({ grupo: ap.grupo, caso: cn, tipo: 'linha', valor: v, pontos: [ap.a, ap.b], apoio: ap.id, rotulo: ap.rotulo });
    }
    const Hmax = Math.max(ap.horizontal.G, ap.horizontal.Q), Vtot = Math.abs(ap.reacao.G) + Math.abs(ap.reacao.Q);
    if (Hmax > 0.02 * Vtot && Hmax > 0.05) avisos.push(`${pre}: reação horizontal de ${fmt(Hmax)} kN no ${ap.rotulo.toLowerCase()} não é transmitida à estrutura (só as cargas verticais são aplicadas)`);
  }
  for (const sf of l.cargas.superficies.filter((x) => x.origem === 'degraus iniciais')) {
    if (grupoIni && sf.permanente) cargas.push({ grupo: grupoIni, caso: 'G', tipo: 'area', valor: sf.permanente, pontos: sf.planta, apoio: 'degraus-iniciais', rotulo: 'Degraus iniciais sobre o piso' });
  }
  if (Math.max(Math.abs(equilibrio.G), Math.abs(equilibrio.Q)) > 1e-6) avisos.push(`${pre}: equilíbrio vertical com erro de ${(Math.max(Math.abs(equilibrio.G), Math.abs(equilibrio.Q)) * 100).toExponential(1)} %`);
  const descricao: DescricaoLance = {
    rets: rets.map((r) => ({ tipo: r.tipo, trecho: r.trecho, c: r.c, z: r.z, permanente: r.tipo === 'lance' ? l.cargas.permanenteProjecao : l.cargas.permanentePatamar, sobrecarga: l.cargas.sobrecarga, faixas: r.faixas.map((f, k) => ({ poligono: f, permanente: r.faixaPerm[k] })) })),
    linhas: apoios.map((ap) => ({ id: ap.id, a: T(ap.a), b: T(ap.b), rigido: ap.rigido, ...(ap.kLinha !== undefined ? { kLinha: ap.kLinha } : {}), fixaX: ap.id === 'inf' || (ap.id === 'sup' && fixoDois && topoEmX), fixaY: ap.id === 'sup' && fixoDois && !topoEmX })),
    FX, FY, corrimao: l.cargas.corrimao,
  };
  return {
    ...base, descricao, ...(detalhe ? { nosDetalhe: nos.map((n, i) => ({ x: n[0], y: n[1], z: n[2], uz: [res.desloc[0][i * 6 + 2], res.desloc[1][i * 6 + 2]] as [number, number] })), triangulosDetalhe: cascas.map((c) => [...c.nos]) } : {}), nos: nos.length, elementos: cascas.length, gdl: res.neq, carga: total, apoios: apoios.map(({ nosLinha: _n, molaDe: _m, ...a }) => a), equilibrio, deslocamento, momentos, elems, cargas,
    avisos: avisos, ms: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
  };
}

/** Calcula todas as escadas da obra (um modelo de casca por lance). Obra sem escada: resultado vazio. */
export function calcularEscadas(b: BuildingModel, o: { detalhe?: boolean } = {}): ResultadoEscadas {
  const lances: ResultadoLance[] = [], avisos: string[] = [];
  for (const g of geometriaEscadas(b)) {
    for (const d of g.diagnosticos) if (d.severidade !== 'info') avisos.push(d.mensagem);
    for (const l of g.lances) {
      const r = calcularLance(b, g, l, l.indice + 1, !!o.detalhe);
      lances.push(r); avisos.push(...r.avisos);
    }
  }
  return { assinatura: assinaturaEscadas(b), lances, avisos };
}

const chavePontos = (p: P[]) => p.map((q) => `${q[0].toFixed(4)},${q[1].toFixed(4)}`).join(';');

/**
 * Cargas das reações das escadas (C8.2, K1.3.40, K1.10.10): linhas uniformes nos casos G e Q e superfície dos degraus
 * iniciais, no grupo do elemento de apoio. Instâncias iguais (mesmo grupo, caso e geometria) valem o maior valor, pois a carga
 * de grupo vale para cada pavimento do grupo.
 */
export function cargasDasEscadas(res: ResultadoEscadas): Carga[] {
  const mapa = new Map<string, { c: CargaGerada; escada: string; lance: number }>();
  for (const r of res.lances) for (const c of r.cargas) {
    const k = `${r.escada}|${c.grupo}|${c.caso}|${c.tipo}|${chavePontos(c.pontos)}`, ex = mapa.get(k);
    if (!ex || Math.abs(c.valor) > Math.abs(ex.c.valor)) mapa.set(k, { c, escada: r.escada, lance: r.lance });
  }
  const cont = new Map<string, number>();
  const out: Carga[] = [];
  for (const { c, escada, lance } of mapa.values()) {
    const base = `esc:${escada}:${c.apoio}:${c.caso}`, n = (cont.get(base) ?? 0) + 1;
    cont.set(base, n);
    out.push({ id: n === 1 ? base : `${base}:${n}`, grupo: c.grupo, caso: c.caso, tipo: c.tipo, valor: +c.valor.toFixed(6), pontos: c.pontos.map((q) => [q[0], q[1]] as [number, number]), escada: { escada, lance, apoio: c.apoio } });
  }
  return out;
}

/**
 * Modelo para a análise da obra: as cargas das reações das escadas (derivadas, não gravadas) somadas às lançadas. Sem
 * escadas devolve o próprio modelo (nada muda). Idempotente: cargas de origem "escada" já presentes são trocadas.
 */
export function comEscadas(b: BuildingModel, res?: ResultadoEscadas): BuildingModel {
  if (!b.escadas?.length) return b;
  const r = res ?? calcularEscadas(b);
  const outras = b.cargas.filter((c) => !c.escada);
  return { ...b, cargas: [...outras, ...cargasDasEscadas(r)] };
}
