// Sapata corrida (frente FU, fatia FU7a): base contínua lançada por polilinha sob uma parede (carga linear) ou sob um
// alinhamento de pilares / viga de fundação.
// - Sob parede (sem pilares sobre o eixo): dimensionamento rígido por metro. Largura B pela σadm (busca em passos de 5 cm,
//   como as sapatas do módulo Fundações, com o peso próprio e a pressão sem tração quando a aba é de um lado só), altura
//   pela rigidez (balanço ≤ 1,5·h, NBR 6118 22.6.1), flexão transversal da aba pelo CEB-70 numa faixa de 1 m (seção de
//   referência a 15 % de bw dentro da face; 25 % na alvenaria) ou pelas bielas, e armadura de distribuição longitudinal.
// - Sob pilares: a sapata entra na análise global como viga sobre base elástica (FU6, `baseElastica.ts`: molas de Winkler
//   k × B × comprimento, seção em T invertido, pilares sem vínculo externo); a flexão longitudinal e o cortante saem da
//   viga e a flexão transversal da aba da pressão máxima do solo. Aba de um lado só exige viga de equilíbrio (cintas).
// Reaproveita `footings.ts` (pressão sem tração, σadm pelo SPT), `concrete.ts`, `baseElastica.ts` e `vigasFundacao.ts`.
// Unidades: kN, m, kN/m² (tensões), kN/m³ (k), por metro de comprimento da sapata quando indicado.
import { barArea, beamFlexure, concrete } from '../concrete';
import { registrarCorridaParede, registrarCorridaPilares } from '../memoria/sapataCorrida';
import { memoriaAtiva } from '../memoria/registrador';
import { basePressure, sigmaProvider } from '../footings';
import { rawBoringFor, type Boring, type FLoad, type FoundationParams } from '../piles';
import { ceil05 } from '../rebar';
import { dentroPoligono, type P } from '../geom/faces';
import type { AnaliseEdificio } from './analitico';
import { estadoEmUso } from './acoes';
import { combinacoesDoEstado, combinacoesEdificio, type CombinacaoEd } from './combinacoes';
import {
  corridaEfetiva, dimensionarVigaElastica, pilaresDaCorrida, pontoNaCorrida, projecaoNaViga, vigasElasticasEf, type ResultadoVigaElastica,
} from './baseElastica';
import { cotaElemento, cotaTerreno, parametrosElemento, parametrosFundacao } from './fundacao';
import { opcoesEmUso, perfilDe, type OpcoesCalculo } from './opcoes';
import { vrd1 } from './vigotas';
import { classificar } from './revisao';
import { calcularCintas, fatorCinta, geometriasCintas, resumoCinta, type ResultadoCinta } from './cintasCorrida';
import { parcelasDaCarga } from './vigasFundacao';
import { barrasPorMetro, type BarrasPorMetro } from './secaoVF';
import { casosDaObra, deslocarPolilinha, type AbaCorrida, type BuildingModel, type SapataCorrida } from './types';
import { cargasDosPilaresSobEixo, cargasLinearesDaParede, corridasEfetivas, pilaresSobEixo, reacoesDoPilar, type CorridaEfetiva } from './corridaParede';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const cm = (v: number) => Math.round(v * 100);
const GAMA_CONC = 25;

// ---------------- geometria ----------------

/** Distâncias (m) da base para a esquerda e para a direita do eixo, pelo lado da aba (esquerda = lado + do sentido do traçado). */
export function ladosDaBase(aba: AbaCorrida, B: number, bw: number): { esq: number; dir: number } {
  return aba === 'ambas' ? { esq: B / 2, dir: B / 2 } : aba === 'esq' ? { esq: B - bw / 2, dir: bw / 2 } : { esq: bw / 2, dir: B - bw / 2 };
}

/** Contorno da base (polilinha deslocada de cada lado do eixo), m. */
export function contornoCorrida(c: Pick<SapataCorrida, 'pontos' | 'aba' | 'bw'>, B: number): P[] {
  const l = ladosDaBase(c.aba, B, c.bw), e = deslocarPolilinha(c.pontos, l.esq), d = deslocarPolilinha(c.pontos, -l.dir);
  return [...e, ...[...d].reverse()];
}

/** Contorno do elemento apoiado (parede, viga ou nervura) sobre a base, m. */
export function contornoApoio(c: Pick<SapataCorrida, 'pontos' | 'bw'>): P[] {
  const e = deslocarPolilinha(c.pontos, c.bw / 2), d = deslocarPolilinha(c.pontos, -c.bw / 2);
  return [...e, ...[...d].reverse()];
}

export const comprimentoCorrida = (pts: P[]) => pts.slice(1).reduce((t, q, i) => t + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
/** Próximo nome livre (SC1, SC2…). */
export function nomeCorrida(b: BuildingModel) { return `SC${Math.max(0, ...(b.fundacao?.corridas ?? []).map((x) => { const m = /^SC(\d+)$/.exec(x.nome); return m ? +m[1] : 0; })) + 1}`; }

/** Sapata corrida sob pilares (modo "pilares", na análise global) ou sob parede (modo "parede")? */
export const modoCorrida = (b: BuildingModel, c: SapataCorrida): 'parede' | 'pilares' => (pilaresDaCorrida(b, c).length ? 'pilares' : 'parede');

// ---------------- resultado ----------------

export type { BarrasPorMetro };
export { barrasPorMetro };

export interface FlexaoTransversal {
  /** Método: CEB-70 (momento da pressão do solo) ou bielas. */
  metodo: 'ceb70' | 'bielas';
  /** Balanço da aba além da face (m), distância da borda à seção de referência (m), d e d efetivo (m). */
  balanco: number; l: number; d: number; dEff: number;
  /** Momento de cálculo por metro (kN·m/m); tração das bielas (kN/m). */
  Md: number; T?: number;
  /** Armadura transversal calculada, mínima e adotada (cm²/m) e as barras (φ mm, s m). */
  As: number; AsMin: number; AsAdot: number; barras: BarrasPorMetro | null;
  /** Armadura de distribuição (paralela ao eixo; cm²/m) e as barras. */
  distribuicao: { As: number; barras: BarrasPorMetro | null };
  /** Cortante a d da face (só quando a sapata é flexível; kN/m). */
  cortante?: { Vd: number; VRd1: number; ok: boolean };
}

/** Dados da sapata corrida sob uma parede (FU7b): o que vem das reações da base da parede na análise. */
export interface DadosParedeCorrida {
  id: string; nome: string;
  /** Derivada de `Parede.base` (sem sapata lançada para a parede). */
  virtual: boolean;
  /** Carga lida da análise (reações da base e dos pilares sobre o eixo) ou só as cargas lançadas no nível de fundação. */
  origem: 'reacoes' | 'lancadas';
  /** Maiores momento fora do plano (kN·m/m) e cortante normal à parede (kN/m) nas combinações raras, e a excentricidade M/N (m). */
  M: number; H: number; eM: number;
  /** Deslizamento: μ, N (kN/m), H (kN/m) e FS = μ·N/H na combinação mais desfavorável; ausente sem cortante. */
  deslizamento?: { mu: number; N: number; H: number; FS: number; FSmin: number; ok: boolean; comb: string };
  /** Topo da parede travado por laje (ou diafragma): o deslizamento é verificado no conjunto das sapatas de paredes travadas, com a força horizontal líquida (soma vetorial das reações da base). */
  travada?: boolean;
  /** Conjunto travado (só com `travada`): nº de sapatas, força horizontal líquida (kN), carga vertical total (kN) e FS do conjunto; `isolado` = FS da sapata sozinha (sem a ajuda das outras paredes). */
  conjunto?: { n: number; Hliq: number; N: number; FS: number; isolado: number };
  /** Forças da base por combinação rara (kN, globais): horizontal (Hx, Hy), vertical com o peso da sapata e a resistência μ·N. Entrada do conjunto travado. */
  forcas?: { comb: string; Hx: number; Hy: number; N: number; muN: number }[];
  /** Pilares que nascem na fundação sobre o eixo (suas reações entram espalhadas pela sapata isolada equivalente). */
  pilares: string[];
  /** Sapata isolada equivalente de cada pilar (pilar + trecho da parede, C5.28): carga rara máxima do pilar (kN), lado a × a (m) e se a largura B da sapata corrida já cobre o lado. */
  pilaresEq?: { pilar: string; Nk: number; a: number; rege: boolean }[];
}

export interface ResultadoCorrida {
  id: string; nome: string; modo: 'parede' | 'pilares';
  pontos: [number, number][]; L: number;
  cota: number; profundidade: number;
  aba: AbaCorrida; equilibrio: boolean; alvenaria: boolean;
  /** Largura da base, do apoio, altura no eixo, espessura da aba (m). */
  B: number; bw: number; h: number; h0: number;
  balanco: number; hRigido: number; rigida: boolean;
  /** Dimensões impostas (só verificadas). */
  fixa: boolean;
  /** Base e elemento apoiado em planta (m). */
  contorno: P[]; apoio: P[];
  /** Carga por metro (kN/m): rara máxima e mínima, de cálculo (γf·Nk) e peso próprio; combinação determinante. */
  carga: { Nk: number; NkMin: number; Nd: number; W: number; comb: string } | null;
  sigmaAdm?: number; sigmaFonte?: string;
  /** Pressão sob a base na combinação rara mais desfavorável (kN/m²) e fração comprimida; excentricidade da carga (m). */
  pressao: { sigmaMax: number; sigmaMin: number; compressed: number; e: number } | null;
  transversal: FlexaoTransversal | null;
  /** Momento por metro que as cintas (vigas de equilíbrio) absorvem na aba de um lado só (kN·m/m). */
  cinta?: number;
  /** Cintas lançadas (FU8a): vigas de equilíbrio dimensionadas, com a alavanca e o alívio nas sapatas internas. */
  cintas?: ResultadoCinta[];
  /** Sapata de parede ou muro (FU7b): parede vinculada, momento e cortante da base, deslizamento e pilares sobre o eixo. */
  parede?: DadosParedeCorrida;
  /** Modo pilares: a viga sobre base elástica (esforços longitudinais, armadura e tensões por nó). */
  longitudinal?: ResultadoVigaElastica;
  /** Concreto (m³), forma (m²) e aço estimado (kg). */
  volume: number; forma: number; aco: number;
  status: 'ok' | 'fail'; mensagens: string[]; notas: string[]; resumo: string;
}

// ---------------- flexão transversal ----------------

const PHIS_PRINCIPAL = [8, 10, 12.5, 16, 20, 25];
const PHIS_DIST = [6.3, 8, 10, 12.5, 16];

/** Pressão sob a base (faixa de 1 m) para a carga N (kN/m) com excentricidade e (m); `equilibrio`: reação uniforme (cintas absorvem o momento). */
export function pressaoCorrida(B: number, N: number, e: number, equilibrio: boolean) {
  if (N <= 0) return null;
  if (equilibrio || e < 1e-9) return { s0: N / B, sx: 0, sigmaMax: N / B, sigmaMin: N / B, compressed: 1 };
  const pr = basePressure(B, 1, N, e, 0);
  return pr ? { s0: pr.s0, sx: pr.sx, sigmaMax: pr.sigmaMax, sigmaMin: pr.sigmaMin, compressed: pr.compressed } : null;
}

/** Momento (kN·m/m) das tensões entre a borda da aba e a seção a l dela; σ(t) = s0 + sx·(t − B/2), t da borda da aba (sem tração). */
export function momentoAba(pr: { s0: number; sx: number }, B: number, l: number): number {
  const n = 200, h = l / n;
  const f = (t: number) => Math.max(0, pr.s0 + pr.sx * (t - B / 2)) * (l - t);
  let s = f(0) + f(l);
  for (let i = 1; i < n; i++) s += f(i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

export interface EntradaFlexao {
  B: number; bw: number; aba: AbaCorrida; equilibrio: boolean; alvenaria: boolean; h: number; h0: number; hRigido: number;
  /** Carga de cálculo por metro, líquida do peso próprio da sapata (kN/m). */
  Nd: number;
  /** Excentricidade adicional da carga (m): momento do pé da parede ÷ normal, a favor da segurança no sentido desfavorável (FU7b). */
  eExtra?: number;
}

/**
 * Flexão transversal da aba por metro (CEB-70 ou bielas), armadura de distribuição e, na sapata flexível, o cortante a d da
 * face. A seção de referência fica a `corridaRefConcreto` (ou `corridaRefAlvenaria`) % de bw dentro da face do apoio.
 */
export function flexaoTransversal(s: EntradaFlexao, P: FoundationParams, op: OpcoesCalculo, msgs: string[], nome: string): FlexaoTransversal {
  const c = concrete(P.fckFound, P.gammaC), fyd = P.fyk / P.gammaS;
  const balanco = Math.max(0, s.aba === 'ambas' ? (s.B - s.bw) / 2 : s.B - s.bw);
  const ref = ((s.alvenaria ? op.corridaRefAlvenaria : op.corridaRefConcreto) / 100) * s.bw;
  const l = balanco + ref;
  const e = s.aba === 'ambas' ? 0 : (s.B - s.bw) / 2, eX = s.eExtra ?? 0;
  const d = s.h - P.cover - 0.01, dEff = Math.min(d, 1.5 * Math.max(balanco, 1e-6));
  // com cintas a geometria é equilibrada (só o momento da parede, eX, deixa a pressão trapezoidal); abas dos dois lados: o lado mais carregado
  const pr0 = pressaoCorrida(s.B, s.Nd, (s.equilibrio ? 0 : e) + eX, false) ?? { s0: s.Nd / s.B, sx: 0 };
  const pr = s.aba === 'ambas' ? { s0: pr0.s0, sx: -Math.abs(pr0.sx) } : pr0;
  const bielas = P.ftMethod === 'bielas' && s.aba === 'ambas' && s.h >= s.hRigido - 1e-9;
  let Md = 0, T: number | undefined, As: number;
  if (bielas) {
    T = (s.Nd * (s.B - s.bw)) / (8 * d);
    As = T / 1000 / fyd;
  } else {
    Md = momentoAba(pr, s.B, l);
    As = Md > 0 ? beamFlexure({ kind: 'rect', bw: 1, h: dEff + P.cover + 0.01 }, false, Md, dEff, 0.05, c, fyd).As : 0;
  }
  const AsMin = P.ftRhoMin * 1 * s.h;
  const AsAdot = Math.max(As, P.ftRhoMinReduz ? Math.min(AsMin, (4 / 3) * As) : AsMin);
  const barras = barrasPorMetro(AsAdot, 0.1, 0.2, PHIS_PRINCIPAL, s.h);
  if (!barras) msgs.push(`Sapata corrida ${nome}: armadura transversal não coube com espaçamento entre 10 e 20 cm (${fmt(AsAdot * 1e4)} cm²/m).`);
  const AsDist = Math.max((op.corridaDistribuicao / 100) * (barras?.As ?? AsAdot), 0.9e-4, 0.5 * P.ftRhoMin * s.h);
  const dist = barrasPorMetro(AsDist, 0.08, 0.33, PHIS_DIST, s.h);
  const out: FlexaoTransversal = { metodo: bielas ? 'bielas' : 'ceb70', balanco, l, d, dEff, Md, ...(T !== undefined ? { T } : {}), As: As * 1e4, AsMin: AsMin * 1e4, AsAdot: AsAdot * 1e4, barras, distribuicao: { As: AsDist * 1e4, barras: dist } };
  if (s.h < s.hRigido - 1e-9) {
    const Vd = (s.Nd / s.B) * Math.max(0, balanco - d), R = vrd1(c, 1, dEff, barras?.As ?? AsAdot);
    out.cortante = { Vd, VRd1: R, ok: Vd <= R + 1e-9 };
    msgs.push(`Sapata corrida ${nome}: altura ${fmt(s.h * 100, 0)} cm menor que a rígida (${fmt(s.hRigido * 100, 0)} cm): sapata flexível, cisalhamento verificado a d da face (a confirmar).`);
    if (!out.cortante.ok) msgs.push(`Sapata corrida ${nome}: cisalhamento a d da face, Vd = ${fmt(Vd, 1)} > VRd1 = ${fmt(R, 1)} kN/m.`);
  }
  return out;
}

// ---------------- geometria da seção por metro ----------------

/** Área da seção transversal (m²) da sapata sob parede: apoio bw × h mais as abas com a face superior inclinada (h na face, h0 na borda). */
const areaSecaoParede = (B: number, bw: number, h: number, h0: number) => bw * h + (B - bw) * ((h + h0) / 2);
/** Forma lateral por metro (m²/m) sob parede: borda (h0) e face inclinada de cada aba; o lado rente à divisa (aba de um lado) vai até h. */
function formaPorMetroParede(aba: AbaCorrida, B: number, bw: number, h: number, h0: number): number {
  const abas = aba === 'ambas' ? [(B - bw) / 2, (B - bw) / 2] : [B - bw];
  return abas.reduce((t, bal) => t + h0 + Math.hypot(bal, h - h0), 0) + (aba === 'ambas' ? 0 : h);
}

// ---------------- cargas e combinações ----------------

interface Contexto {
  b: BuildingModel; an: AnaliseEdificio | null; op: OpcoesCalculo; P0: FoundationParams; zt: number;
  raras: CombinacaoEd[]; ventos: Set<string>; fv: number;
  /** Combinações normativas do edifício (calculadas uma vez, sob pilares). */
  combs?: CombinacaoEd[];
}

const comVento = (cx: Contexto, cb: CombinacaoEd) => Object.entries(cb.fatores).some(([k, f]) => f !== 0 && cx.ventos.has(k));

/** Furo de sondagem mais próximo do ponto médio do eixo (ou o primeiro). */
function furoMaisProximo(b: BuildingModel, c: SapataCorrida): Boring | undefined {
  const lista = b.fundacao?.sondagens ?? [];
  if (!lista.length) return undefined;
  const mid = (() => { let s = 0; const L = comprimentoCorrida(c.pontos); for (let i = 0; i + 1 < c.pontos.length; i++) { const l = Math.hypot(c.pontos[i + 1][0] - c.pontos[i][0], c.pontos[i + 1][1] - c.pontos[i][1]); if (s + l >= L / 2) { const t = (L / 2 - s) / (l || 1); return [c.pontos[i][0] + t * (c.pontos[i + 1][0] - c.pontos[i][0]), c.pontos[i][1] + t * (c.pontos[i + 1][1] - c.pontos[i][1])]; } s += l; } return c.pontos[0]; })();
  return rawBoringFor({ x: mid[0], y: mid[1] } as FLoad, { boring: lista[0], borings: lista });
}

/** Cargas do nível de fundação sobre o eixo, por caso e por janela ao longo do comprimento (kN/m). */
function cargasPorJanela(b: BuildingModel, c: Pick<SapataCorrida, 'pontos' | 'bw' | 'B'>, op: OpcoesCalculo, L: number): { casos: Map<string, number[]>; total: number; nJan: number; wj: number } {
  const nJan = Math.max(1, Math.floor(L / op.corridaJanela + 1e-9)), wj = L / nJan;
  const casos = new Map<string, number[]>();
  let total = 0;
  for (const cg of b.cargas) {
    if (cg.grupo !== 'fundacao') continue;
    for (const pc of parcelasDaCarga(cg)) {
      if (!pontoNaCorrida(c, pc.pt, cg.tipo)) continue;
      const pr = projecaoNaViga(c, pc.pt), j = Math.min(nJan - 1, Math.max(0, Math.floor(pr.s / wj)));
      const v = casos.get(cg.caso) ?? new Array<number>(nJan).fill(0);
      v[j] += pc.P / wj; casos.set(cg.caso, v); total += pc.P;
    }
  }
  return { casos, total, nJan, wj };
}

/** Carga (kN) de uma lista de janelas de `wj` metros que cai no trecho [lo, hi] do eixo. */
const somaNoTrecho = (arr: number[], wj: number, lo: number, hi: number) => arr.reduce((t, v, j) => t + v * Math.max(0, Math.min(hi, (j + 1) * wj) - Math.max(lo, j * wj)), 0);

// ---------------- sapata corrida sob parede ----------------

/** Distância (m) de um ponto ao segmento ab. */
function distSeg(p: P, a: P, b2: P): number {
  const dx = b2[0] - a[0], dy = b2[1] - a[1], l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

/**
 * O topo da parede é travado por laje? Pelo menos metade dos pontos amostrados do eixo (a cada ~0,5 m) está dentro do contorno
 * de uma laje do pavimento em que a parede morre, ou a até bw/2 + 5 cm da borda dela. Parede cujo topo fica livre (sem laje)
 * é um balanço: a reação da base é o empuxo inteiro.
 */
export function topoTravado(b: BuildingModel, w: { pontos: P[]; morre: string }, bw: number): boolean {
  const pav = b.pavimentos.find((p) => p.id === w.morre);
  if (!pav) return false;
  const lajes = b.lajes.filter((l) => l.grupo === pav.grupo);
  if (!lajes.length) return false;
  const amostras: P[] = [];
  for (let i = 0; i + 1 < w.pontos.length; i++) {
    const a = w.pontos[i], z = w.pontos[i + 1], n = Math.max(1, Math.ceil(Math.hypot(z[0] - a[0], z[1] - a[1]) / 0.5));
    for (let k = 0; k <= n; k++) amostras.push([a[0] + ((z[0] - a[0]) * k) / n, a[1] + ((z[1] - a[1]) * k) / n]);
  }
  const tol = bw / 2 + 0.05;
  const na = amostras.filter((q) => lajes.some((l) => dentroPoligono(q, l.contorno) || l.contorno.some((v, i) => distSeg(q, v, l.contorno[(i + 1) % l.contorno.length]) <= tol)));
  return na.length >= amostras.length / 2;
}

/** Normal à polilinha (à esquerda do sentido do traçado) na abscissa s (m) ao longo do eixo. */
function normalNaAbscissa(pts: P[], s: number): P {
  let acc = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (s <= acc + l + 1e-9 || i + 2 === pts.length) return l > 0 ? [-(pts[i + 1][1] - pts[i][1]) / l, (pts[i + 1][0] - pts[i][0]) / l] : [0, 1];
    acc += l;
  }
  return [0, 1];
}

/** Carga por janela (kN/m) de uma combinação, somando os casos pelos fatores. */
const soma0 = (mp: Map<string, number[]>, cb: CombinacaoEd, nJan: number) => Array.from({ length: nJan }, (_, j) => [...mp].reduce((t, [k, arr]) => t + (cb.fatores[k] ?? 0) * arr[j], 0));

function calcularParede(cx: Contexto, c: CorridaEfetiva): ResultadoCorrida {
  const { b, op } = cx, fe = b.fundacao!;
  const msgs: string[] = [], notas: string[] = [];
  const L = comprimentoCorrida(c.pontos), cota = cotaElemento(b, c), prof = +(cx.zt - cota).toFixed(3);
  const fixa = c.B !== undefined;
  const base = (B: number, extra: Partial<ResultadoCorrida> = {}): ResultadoCorrida => ({
    id: c.id, nome: c.nome, modo: 'parede', pontos: c.pontos, L, cota, profundidade: prof, aba: c.aba, equilibrio: !!c.equilibrio, alvenaria: !!c.alvenaria,
    B, bw: c.bw, h: c.h ?? 0, h0: c.h0 ?? 0, balanco: 0, hRigido: 0, rigida: true, fixa, contorno: contornoCorrida(c, B), apoio: contornoApoio(c), carga: null, pressao: null, transversal: null,
    volume: 0, forma: 0, aco: 0, status: 'fail', mensagens: msgs, notas, resumo: `${c.nome}: não calculada`, ...extra,
  });
  const pCad = cx.P0;
  if (prof <= 0) { msgs.push(`Fundação acima do terreno: sapata corrida ${c.nome} com cota de assentamento ${fmt(cota)} m ≥ cota do terreno ${fmt(cx.zt)} m.`); return base(c.B ?? op.corridaBMin); }
  // σadm: própria, informada do terreno ou pelo SPT do furo mais próximo
  const P: FoundationParams = parametrosElemento(pCad, { tipo: 'sapata', cota: c.cota }, prof);
  let sigmaFonte = '';
  if (c.sigmaAdm !== undefined || fe.terreno.sigmaModo === 'informada') {
    const s = c.sigmaAdm ?? fe.terreno.sigmaAdm;
    if (!s) { msgs.push(`Fundação sem σadm: sapata corrida ${c.nome} (informe a tensão admissível do terreno ou da sapata).`); return base(c.B ?? op.corridaBMin); }
    P.ftSigmaMode = 'informada'; P.ftSigmaAdm = s; sigmaFonte = c.sigmaAdm !== undefined ? 'informada na sapata' : 'informada (terreno)';
  } else {
    if (!fe.sondagens.length) { msgs.push(`Fundação sem sondagem: σadm da sapata corrida ${c.nome} estimada pelo SPT exige furos de sondagem.`); return base(c.B ?? op.corridaBMin); }
    P.ftSigmaMode = 'spt';
  }
  const sigmaFor = sigmaProvider(furoMaisProximo(b, c), P);
  // cargas por metro nas combinações raras (a maior soma em janelas ao longo do eixo)
  const cj = cargasPorJanela(b, c, op, L);
  // sapata de parede (FU7b): reações da base da parede na análise (N, momento fora do plano, cortante normal) e pilares sobre o eixo
  const mom = new Map<string, number[]>(), hor = new Map<string, number[]>();
  let dadosParede: DadosParedeCorrida | undefined, pilaresEixo: string[] = [];
  const w = c.parede ? b.paredes?.find((x) => x.id === c.parede) : undefined;
  if (c.orfa) msgs.push(`Sapata corrida ${c.nome}: a parede vinculada não existe mais; a sapata voltou a ser independente (só as cargas lançadas no nível de fundação entram).`);
  const pilaresEq: NonNullable<DadosParedeCorrida['pilaresEq']> = [];
  if (w) {
    const an = cx.an;
    if (an && !an.erro && an.portico.res) {
      const soma = (dest: Map<string, number[]>, src: Map<string, number[]>) => { for (const [k, v] of src) dest.set(k, (dest.get(k) ?? new Array<number>(cj.nJan).fill(0)).map((x, j) => x + v[j])); };
      const junta = (lp: { N: Map<string, number[]>; M: Map<string, number[]>; H: Map<string, number[]>; total: number }) => { soma(cj.casos, lp.N); soma(mom, lp.M); soma(hor, lp.H); cj.total += lp.total; };
      const lp = cargasLinearesDaParede(b, an, w, c.pontos, L, cj.nJan, cj.wj);
      junta(lp);
      msgs.push(...lp.avisos.map((t) => `Sapata corrida ${c.nome}: ${t}.`));
      // pilares que nascem na fundação sobre o eixo: sapata isolada equivalente (pilar + trecho da parede) espalha a carga
      const pil = pilaresSobEixo(b, c.pontos, c.bw);
      for (const p of pil) { const e = fe.elementos.find((x) => x.pilares.includes(p.id)); if (e) msgs.push(`Sapata corrida ${c.nome}: o pilar ${p.nome} nasce sobre o eixo e já tem o elemento ${e.nome}; a carga dele seria contada nos dois (remova um deles).`); }
      if (pil.length) {
        const qParede = Math.max(0, ...cx.raras.map((cb) => Math.max(...soma0(cj.casos, cb, cj.nJan))));
        const lado = new Map<string, number>();
        for (const p of pil) {
          const rc = reacoesDoPilar(an, p.id);
          const Pk = Math.max(0, ...cx.raras.map((cb) => Object.entries(cb.fatores).reduce((t, [k, f]) => t + f * (rc.get(k)?.N ?? 0), 0)));
          // a×a: (Pk + q·a)(1 + pp%) ≤ fator·σadm(a)·a²  (a pressão de borda do pilar centrado, sem momento)
          let a = 0;
          for (let t = Math.max(op.corridaBMin, ceil05(c.bw + 0.1)); t <= 8 + 1e-9; t += 0.05) {
            const sg = sigmaFor(Math.round(t * 100) / 100);
            if (sg && (Pk + qParede * t) * (1 + P.ftPP / 100) <= P.ftEdgeFactor * sg.s * t * t + 1e-9) { a = Math.round(t * 100) / 100; break; }
          }
          if (a === 0) a = 8;
          lado.set(p.id, a);
          pilaresEq.push({ pilar: p.nome, Nk: Pk, a, rege: false });
        }
        junta(cargasDosPilaresSobEixo(b, an, pil, c.pontos, L, cj.nJan, cj.wj, (p) => lado.get(p.id) ?? cj.wj));
      }
      pilaresEixo = pil.map((p) => p.nome);
    } else msgs.push(`Sapata corrida ${c.nome}: a parede ${w.nome} transmite a carga pelas reações da análise; calcule a estrutura antes (por ora só as cargas lançadas no nível de fundação entram).`);
  }
  if (cj.total <= 0) { msgs.push(`Sapata corrida ${c.nome}: sem carga — lance cargas lineares (alvenaria), pontuais ou de área no nível de fundação sobre o eixo, ou apoie pilares nela.`); return base(c.B ?? op.corridaBMin); }
  // cintas (FU8a): trechos tributários (aba de um lado só); a carga de cada cinta é a do seu trecho
  const cin = c.aba !== 'ambas' && c.cintas?.length ? geometriasCintas(b, c) : null;
  if (c.aba === 'ambas' && c.cintas?.length) msgs.push(`Sapata corrida ${c.nome}: cintas ignoradas — aba nos dois lados não tem excentricidade; remova as cintas ou use aba de um lado.`);
  if (cin?.msgs.length) { msgs.push(...cin.msgs); return base(c.B ?? op.corridaBMin); }
  const soma = (mp: Map<string, number[]>, cb: CombinacaoEd) => Array.from({ length: cj.nJan }, (_, j) => [...mp].reduce((t, [k, arr]) => t + (cb.fatores[k] ?? 0) * arr[j], 0));
  const cargas = cx.raras.flatMap((cb) => {
    const qs = soma(cj.casos, cb), ms = soma(mom, cb), hs = soma(hor, cb);
    const q = Math.max(...qs), qMin = Math.min(...qs);
    if (!(q > 1e-9)) return [];
    const N = cin?.itens.map((g) => [...cj.casos].reduce((t, [k, arr]) => t + (cb.fatores[k] ?? 0) * somaNoTrecho(arr, cj.wj, g.lo, g.hi), 0));
    // janela da maior carga; com momento ou cortante da parede, também as de maior excentricidade e de maior cortante
    const js = new Set<number>([qs.indexOf(q)]);
    if (!cin) {
      let jm = -1, em = 0, jh = -1, hm = 0;
      qs.forEach((qj, j) => {
        if (qj <= 1e-9) return;
        if (Math.abs(ms[j]) / qj > em + 1e-9) { em = Math.abs(ms[j]) / qj; jm = j; }
        if (Math.abs(hs[j]) > hm + 1e-9) { hm = Math.abs(hs[j]); jh = j; }
      });
      if (jm >= 0) js.add(jm);
      if (jh >= 0) js.add(jh);
    }
    return [...js].map((j) => ({ cb, q: qs[j], qMin: Number.isFinite(qMin) ? qMin : 0, m: ms[j], h: hs[j], vento: comVento(cx, cb), N, j }));
  });
  if (!cargas.length) { msgs.push(`Sapata corrida ${c.nome}: sem carga nas combinações raras (os casos lançados não entram em nenhuma).`); return base(c.B ?? op.corridaBMin); }
  const Nk = Math.max(...cargas.map((x) => x.q)), NkMin = Math.min(...cargas.map((x) => x.qMin)), cMax = cargas.find((x) => x.q === Nk)!.cb.nome;
  const W0 = (P.ftPP / 100) * Nk;
  const ecc = (B: number) => (c.aba === 'ambas' ? 0 : (B - c.bw) / 2);
  const hFor = (B: number) => {
    const bal = Math.max(0, c.aba === 'ambas' ? (B - c.bw) / 2 : B - c.bw), hRig = ((2 * bal) / 3) * (1.5 / P.ftBalancoAltura);
    const h = c.h ?? ceil05(Math.max(hRig, P.ftH0Min)), h0 = Math.min(h, c.h0 ?? ceil05(Math.max(h / 3, P.ftH0Min)));
    return { h, h0, hRig, bal };
  };
  // com cintas, a reação sob o trecho tributário é a carga linear × R/N da alavanca (depende de B pela excentricidade)
  const qEf = (x: (typeof cargas)[number], B: number): number | null => {
    if (!cin) return x.q;
    let q = 0;
    for (let k = 0; k < cin.itens.length; k++) {
      const f = fatorCinta(B, c.bw, cin.itens[k]);
      if (f === null) return null;
      q = Math.max(q, (x.N![k] / Math.max(cin.itens[k].hi - cin.itens[k].lo, 1e-9)) * f);
    }
    return q;
  };
  const eqEf = !!c.equilibrio || !!cin;
  const verifica = (B: number) => {
    const g = hFor(B), sg = sigmaFor(B);
    if (!sg) return null;
    const W = Math.max(W0, GAMA_CONC * areaSecaoParede(B, c.bw, g.h, g.h0));
    let pior: { sigmaMax: number; sigmaMin: number; compressed: number; e: number } | null = null;
    let piorX: { x: (typeof cargas)[number]; qe: number; eGeom: number; eM: number } | null = null;
    for (const x of cargas) {
      const qe = qEf(x, B);
      if (qe === null) return null;
      // excentricidade: a geométrica (aba de um lado sem cintas) mais a do momento do pé da parede (M/N, sentido desfavorável)
      const eTot = (eqEf ? 0 : ecc(B)) + Math.abs(x.m) / (qe + W);
      const pr = pressaoCorrida(B, qe + W, eTot, false);
      if (!pr || pr.sigmaMax > P.ftEdgeFactor * sg.s * (x.vento ? cx.fv : 1) + 1e-6 || pr.compressed < (P.ftLevantamento ? 0 : P.ftMinCompressed) - 1e-6) return null;
      if (!pior || pr.sigmaMax > pior.sigmaMax) { pior = { sigmaMax: pr.sigmaMax, sigmaMin: pr.sigmaMin, compressed: pr.compressed, e: eTot }; piorX = { x, qe, eGeom: eqEf ? 0 : ecc(B), eM: Math.abs(x.m) / (qe + W) }; }
    }
    return { g, sg, W, pior: pior!, piorX: piorX! };
  };
  let B = 0, ok: NonNullable<ReturnType<typeof verifica>> | null = null;
  if (fixa) { B = c.B!; ok = verifica(B); }
  else for (let t = Math.max(op.corridaBMin, ceil05(c.bw + 0.1)); t <= 8 + 1e-9; t += 0.05) { const r = verifica(Math.round(t * 100) / 100); if (r) { B = Math.round(t * 100) / 100; ok = r; break; } }
  if (!ok) {
    const B0 = fixa ? c.B! : op.corridaBMin;
    msgs.push(c.aba !== 'ambas' && !eqEf
      ? `Sapata corrida ${c.nome}: aba de um lado exige viga de equilíbrio (cintas até sapatas internas): sem elas, a pressão excêntrica sem tração não atende a σadm até B = 8 m. Marque "equilibrada por cintas" ou use abas dos dois lados.`
      : fixa ? `Sapata corrida ${c.nome}: nenhuma largura atende — a largura imposta B = ${fmt(B0)} m não atende a σadm, a área comprimida e a excentricidade.`
        : `Sapata corrida ${c.nome}: nenhuma largura até 8 m atende a σadm, a área comprimida e a excentricidade.`);
    return base(B0, { carga: { Nk, NkMin, Nd: P.gammaF * Nk, W: W0, comb: cMax }, sigmaAdm: sigmaFor(B0)?.s, sigmaFonte });
  }
  const { g, sg, W, pior, piorX } = ok;
  if (c.aba !== 'ambas' && !c.equilibrio && pior.e > 0) notas.push(`Aba de um lado sem cintas: pressão excêntrica (e = ${fmt(pior.e)} m) com σmáx = ${fmt(pior.sigmaMax, 1)} kN/m² e ${fmt(pior.compressed * 100, 0)} % comprimida.`);
  const eq = c.aba !== 'ambas' && eqEf;
  const cinta = eq ? Nk * ecc(B) : undefined;
  let cintasRes: ResultadoCinta[] | undefined;
  let qEfFinal = Nk;
  if (cin) {
    // cintas (FU8a): alavanca por cinta no trecho tributário; a reação sob a base é a da alavanca (R/N)
    const Nmax = cin.itens.map((_, k) => Math.max(...cargas.map((x) => x.N![k]))), Nmin = cin.itens.map((_, k) => Math.min(...cargas.map((x) => x.N![k])));
    cintasRes = calcularCintas(b, c, cin.itens, B, Nmax, Nmin, op, msgs);
    qEfFinal = Math.max(...cargas.map((x) => qEf(x, B) ?? 0));
    notas.push(`Aba de um lado com ${cin.itens.length} cinta(s): alavanca em cada trecho tributário (R = N·ℓ/(ℓ − e)); reação uniforme sob a base com carga linear majorada até ${fmt(qEfFinal, 1)} kN/m (Nk = ${fmt(Nk, 1)} kN/m); momento N·e = ${fmt(Nk)} × ${fmt(ecc(B))} = ${fmt(cinta!, 1)} kN·m por metro, absorvido pelas cintas.`);
    const maxEsp = Math.max(...cin.itens.slice(1).map((g, i) => g.cinta.s - cin.itens[i].cinta.s), 0);
    if (maxEsp > op.corridaCintaEspac + 1e-9) msgs.push(`Sapata corrida ${c.nome}: cintas espaçadas de ${fmt(maxEsp)} m (acima de ${fmt(op.corridaCintaEspac)} m): a flexão longitudinal da sapata entre cintas não é verificada (a confirmar).`);
    const livre = Math.max(cin.itens[0].cinta.s, L - cin.itens[cin.itens.length - 1].cinta.s);
    if (livre > op.corridaCintaEspac / 2 + 1e-9) msgs.push(`Sapata corrida ${c.nome}: balanço de ${fmt(livre)} m além da última cinta (acima de ${fmt(op.corridaCintaEspac / 2)} m): a carga do trecho vai toda para a cinta (a confirmar).`);
  } else if (eq) {
    notas.push(`Aba de um lado: reação uniforme (equilíbrio por vigas de equilíbrio/cintas até sapatas internas, NBR 6122 — item a confirmar); momento a equilibrar N·e = ${fmt(Nk)} × ${fmt(ecc(B))} = ${fmt(cinta!, 1)} kN·m por metro. Sem cintas lançadas.`);
    msgs.push(`Sapata corrida ${c.nome}: marcada como equilibrada por cintas, mas sem cintas lançadas — lance as cintas até as sapatas internas para dimensioná-las e aliviar os elementos (a reação uniforme é suposta; N·e = ${fmt(cinta!, 1)} kN·m/m sem viga).`);
  }
  const Nd = P.gammaF * qEfFinal;
  // parede (FU7b): momento fora do plano e cortante da base; excentricidade líquida M/N para a flexão da aba e deslizamento
  let eMnet = 0;
  if (w) {
    const mu = c.atrito ?? op.fundCorridaAtrito, fsMin = op.fundCorridaFSDesliz;
    const travada = !!op.fundCorridaDeslizGrupo && topoTravado(b, { pontos: c.pontos, morre: w.morre }, c.bw);
    let desliz: DadosParedeCorrida['deslizamento'];
    let Mmax = 0, Hmax = 0;
    for (const x of cargas) {
      const qe = qEf(x, B) ?? x.q;
      eMnet = Math.max(eMnet, Math.abs(x.m) / Math.max(qe, 1e-9));
      Mmax = Math.max(Mmax, Math.abs(x.m)); Hmax = Math.max(Hmax, Math.abs(x.h));
      if (Math.abs(x.h) > 1e-6) {
        const N = qe + W, FS = (mu * N) / Math.abs(x.h);
        if (!desliz || FS < desliz.FS) desliz = { mu, N, H: Math.abs(x.h), FS, FSmin: fsMin, ok: FS >= fsMin - 1e-9, comb: x.cb.nome };
      }
    }
    // topo travado: a força horizontal que vai ao solo é a soma vetorial das reações horizontais da base (kN, eixos globais) de todas as
    // sapatas de paredes travadas, contra μ·N do conjunto (feito em calcularCorridas); aqui só as forças por combinação rara
    let forcas: DadosParedeCorrida['forcas'];
    if (travada) {
      forcas = cx.raras.map((cb) => {
        const hs = soma(hor, cb), qs = soma(cj.casos, cb);
        let Hx = 0, Hy = 0, N = W * L;
        hs.forEach((h, j) => { const nv = normalNaAbscissa(c.pontos, (j + 0.5) * cj.wj); Hx += h * cj.wj * nv[0]; Hy += h * cj.wj * nv[1]; N += qs[j] * cj.wj; });
        return { comb: cb.nome, Hx, Hy, N, muN: mu * N };
      });
    } else if (desliz && !desliz.ok && op.fundCorridaDeslizamento) msgs.push(`Sapata corrida ${c.nome}: deslizamento na base, FS = ${fmt(desliz.FS)} < ${fmt(fsMin)} (μ = ${fmt(mu)}, H = ${fmt(desliz.H, 1)} kN/m, N = ${fmt(desliz.N, 1)} kN/m em ${desliz.comb}); topo livre (balanço) ou conjunto travado desligado: o empuxo da própria parede vai ao solo; aumente a largura ou o atrito.`);
    dadosParede = { id: w.id, nome: w.nome, virtual: !!c.virtual, origem: cx.an && !cx.an.erro && cx.an.portico.res ? 'reacoes' : 'lancadas', M: Mmax, H: Hmax, eM: eMnet, ...(desliz ? { deslizamento: desliz } : {}), ...(travada ? { travada: true, forcas } : {}), pilares: pilaresEixo, ...(pilaresEq.length ? { pilaresEq: pilaresEq.map((x) => ({ ...x, rege: B >= x.a - 1e-9 })) } : {}) };
    notas.push(`Base da parede ${w.nome}${c.virtual ? ' (sapata derivada de Parede.base; edite com parede.sapata)' : ''}: ${dadosParede.origem === 'reacoes' ? 'cargas das reações da análise' : 'só as cargas lançadas'}; momento fora do plano até ${fmt(Mmax, 1)} kN·m/m (e = ${fmt(eMnet)} m) e cortante normal até ${fmt(Hmax, 1)} kN/m nas combinações raras${pilaresEixo.length ? `; pilar(es) sobre o eixo: ${pilaresEixo.join(', ')}` : ''}.`);
  }
  const ef: EntradaFlexao = { B, bw: c.bw, aba: c.aba, equilibrio: eqEf, alvenaria: !!c.alvenaria, h: g.h, h0: g.h0, hRigido: g.hRig, Nd, ...(eMnet > 1e-9 ? { eExtra: eMnet } : {}) };
  const tr = flexaoTransversal(ef, P, op, msgs, c.nome);
  if (tr.cortante && !tr.cortante.ok) { /* mensagem já incluída */ }
  const sec = areaSecaoParede(B, c.bw, g.h, g.h0), volume = sec * L, forma = L * formaPorMetroParede(c.aba, B, c.bw, g.h, g.h0) + 2 * sec;
  if (c.h !== undefined && c.h < g.hRig - 1e-9) notas.push('Altura imposta menor que a rígida: sapata flexível.');
  if (W > W0 + 1e-6) notas.push(`Peso do concreto (${fmt(W)} kN/m) maior que ${P.ftPP}% da carga (${fmt(W0)} kN/m): usado o peso calculado.`);
  notas.push(`Carga por metro: maior soma em janelas de ${fmt(op.corridaJanela)} m ao longo de ${fmt(L)} m (${cj.nJan} janela(s)); a largura é única ao longo do eixo.`);
  notas.push(`σadm ${fmt(sg.s, 0)} kN/m² (${sigmaFonte || 'estimada pelo SPT: N̄/' + P.ftSptDiv + ' MPa (a confirmar)'}); método ${tr.metodo === 'bielas' ? 'das bielas' : 'CEB-70'}, seção de referência a ${fmt(tr.l - tr.balanco, 2)} m dentro da face.`);
  const Nlinear = tr.barras ? (barArea(tr.barras.phi) / tr.barras.s) : 0;
  const aco = (Nlinear * (B - 2 * P.cover) * L + (tr.distribuicao.barras ? (barArea(tr.distribuicao.barras.phi) / tr.distribuicao.barras.s) * (L - 2 * P.cover) * (B - 2 * P.cover) : 0)) * 7850;
  const r: ResultadoCorrida = {
    ...base(B), h: g.h, h0: g.h0, balanco: g.bal, hRigido: g.hRig, rigida: g.h >= g.hRig - 1e-9,
    carga: { Nk, NkMin, Nd, W, comb: cMax }, sigmaAdm: sg.s, sigmaFonte, pressao: pior, transversal: tr, ...(cinta !== undefined ? { cinta } : {}),
    ...(cintasRes?.length ? { cintas: cintasRes } : {}), equilibrio: eq, ...(dadosParede ? { parede: dadosParede } : {}),
    volume, forma, aco, notas, mensagens: msgs, resumo: '',
  };
  r.status = msgs.some((m) => classificar(m).nivel === 'erro') ? 'fail' : 'ok';
  r.resumo = resumoTexto(r);
  const mem = memoriaAtiva();
  if (mem) registrarCorridaParede(mem, { c, P, op, L, cj, mom, hor, cargas, Nk, NkMin, cMax, W0, furo: furoMaisProximo(b, c), sg, g, W, piorX, fv: cx.fv, B, qEfFinal, Nd, eMnet, ef, tr, sec, volume, cintas: !!cin, r });
  return r;
}

// ---------------- sapata corrida sob pilares ----------------

function calcularSobPilares(cx: Contexto, c: SapataCorrida): ResultadoCorrida {
  const { b, an, op } = cx;
  const msgs: string[] = [], notas: string[] = [];
  const g = corridaEfetiva(b, c, op), L = comprimentoCorrida(c.pontos), cota = cotaElemento(b, c), prof = +(cx.zt - cota).toFixed(3);
  const P: FoundationParams = parametrosElemento(cx.P0, { tipo: 'sapata', cota: c.cota }, prof);
  const vazio = (): ResultadoCorrida => ({
    id: c.id, nome: c.nome, modo: 'pilares', pontos: c.pontos, L, cota, profundidade: prof, aba: c.aba, equilibrio: !!c.equilibrio, alvenaria: !!c.alvenaria,
    B: g.B, bw: g.bw, h: g.h, h0: g.h0, balanco: g.balanco, hRigido: g.hRig, rigida: g.h0 >= g.hRig - 1e-9, fixa: c.B !== undefined, contorno: contornoCorrida(c, g.B), apoio: contornoApoio(c),
    carga: null, pressao: null, transversal: null, volume: 0, forma: 0, aco: 0, status: 'fail', mensagens: msgs, notas, resumo: `${c.nome}: não calculada`,
  });
  const v = vigasElasticasEf(b).find((x) => x.id === c.id && x.corrida);
  if (!an || an.erro || !an.baseElastica || !v) {
    msgs.push(`Fundação sem cargas: calcule a estrutura antes (sapata corrida ${c.nome} sob pilares entra na análise global).`);
    return vazio();
  }
  const combs = (cx.combs ??= combinacoesEdificio(b, an));
  const elu = combinacoesDoEstado(b, an, 'concreto', combs), freq = combinacoesDoEstado(b, an, 'fissuracao', combs), raras = combinacoesDoEstado(b, an, 'solo', combs);
  const lg = dimensionarVigaElastica(b, an, v, { raras, elu, freq });
  if (!lg) { msgs.push(`Fundação sem cargas: sapata corrida ${c.nome} sem nós na análise (recalcule o edifício).`); return vazio(); }
  msgs.push(...lg.mensagens);
  notas.push(...lg.notas);
  if (c.B === undefined) notas.push(`Largura B não informada: adotada ${fmt(g.B)} m na análise (opção "largura padrão"); a verificação da σadm dá a largura necessária.`);
  if (c.h === undefined) notas.push(`Altura não informada: adotada ${fmt(g.h * 100, 0)} cm no eixo (opção "altura padrão"); aba de ${fmt(g.h0 * 100, 0)} cm pela rigidez.`);
  const secArea = v.secao!.A, pesoPressao = (GAMA_CONC * secArea) / g.B;
  const pMax = lg.sigmaMax, qMax = pMax * g.B;
  const eq = c.aba !== 'ambas' && !!c.equilibrio, ecc = c.aba === 'ambas' ? 0 : (g.B - g.bw) / 2;
  let cinta: number | undefined;
  if (c.aba !== 'ambas') {
    if (eq) { cinta = qMax * ecc; notas.push(`Aba de um lado: reação uniforme (equilíbrio por vigas de equilíbrio/cintas até sapatas internas, NBR 6122 — item a confirmar); momento a equilibrar N·e = ${fmt(qMax)} × ${fmt(ecc)} = ${fmt(cinta, 1)} kN·m por metro, no máximo. As cintas não são dimensionadas aqui.`); }
    else {
      const pr = pressaoCorrida(g.B, qMax, ecc, false);
      if (!pr || (lg.sigmaAdm !== null && pr.sigmaMax > lg.sigmaAdm + 1e-6) || pr.compressed < P.ftMinCompressed - 1e-6)
        msgs.push(`Sapata corrida ${c.nome}: aba de um lado exige viga de equilíbrio (cintas até sapatas internas): a pressão excêntrica sem tração (e = ${fmt(ecc)} m) não atende a σadm. Marque "equilibrada por cintas" ou use abas dos dois lados.`);
    }
  }
  const netoK = Math.max(0, pMax - pesoPressao);
  const efP: EntradaFlexao = { B: g.B, bw: g.bw, aba: c.aba, equilibrio: eq, alvenaria: !!c.alvenaria, h: g.h0, h0: g.h0, hRigido: g.hRig, Nd: P.gammaF * netoK * g.B };
  const tr = flexaoTransversal(efP, P, op, msgs, c.nome);
  if (lg.sigmaAdm !== null && lg.sigmaMax > lg.sigmaAdm + 1e-6) msgs.push(`Sapata corrida ${c.nome}: largura necessária ≈ ${fmt((lg.sigmaMax * g.B) / lg.sigmaAdm)} m (σmáx·B/σadm) para a σadm.`);
  const volume = lg.volume, forma = L * (2 * g.h) + 2 * secArea;
  const aco = lg.aco + ((tr.barras ? barArea(tr.barras.phi) / tr.barras.s : 0) * (g.B - 2 * P.cover) * L + (tr.distribuicao.barras ? (barArea(tr.distribuicao.barras.phi) / tr.distribuicao.barras.s) * (L - 2 * P.cover) * (g.B - 2 * P.cover) : 0)) * 7850;
  const r: ResultadoCorrida = {
    id: c.id, nome: c.nome, modo: 'pilares', pontos: c.pontos, L, cota, profundidade: prof, aba: c.aba, equilibrio: eq, alvenaria: !!c.alvenaria,
    B: g.B, bw: g.bw, h: g.h, h0: g.h0, balanco: g.balanco, hRigido: g.hRig, rigida: g.h0 >= g.hRig - 1e-9, fixa: c.B !== undefined,
    contorno: contornoCorrida(c, g.B), apoio: contornoApoio(c),
    carga: { Nk: qMax, NkMin: lg.sigmaMin * g.B, Nd: P.gammaF * netoK * g.B, W: GAMA_CONC * secArea, comb: lg.combMax },
    sigmaAdm: lg.sigmaAdm ?? undefined, sigmaFonte: c.sigmaAdm !== undefined ? 'informada na sapata' : 'informada (terreno)',
    pressao: { sigmaMax: lg.sigmaMax, sigmaMin: lg.sigmaMin, compressed: lg.sigmaMin >= 0 ? 1 : 0, e: ecc },
    transversal: tr, ...(cinta !== undefined ? { cinta } : {}), longitudinal: lg, volume, forma, aco, status: 'ok', mensagens: msgs, notas, resumo: '',
  };
  r.status = msgs.some((m) => classificar(m).nivel === 'erro') ? 'fail' : 'ok';
  r.resumo = resumoTexto(r);
  const mem = memoriaAtiva();
  if (mem) registrarCorridaPilares(mem, { c, P, op, g, lg, pesoPressao, netoK, ecc, ef: efP, tr, r });
  return r;
}

// ---------------- conjunto ----------------

function resumoTexto(r: ResultadoCorrida): string {
  const t = r.transversal;
  return `${r.nome}: B = ${fmt(r.B)} m · h = ${cm(r.h)}/${cm(r.h0)} cm${t?.barras ? ` · φ${fmt(t.barras.phi, 1)} c/${cm(t.barras.s)}` : ''}${r.sigmaAdm ? ` · σadm ${fmt(r.sigmaAdm, 0)} kN/m²` : ''}`;
}

/**
 * Calcula as sapatas corridas do edifício: sob parede (carga linear, dimensionamento rígido) ou sob pilares (viga sobre
 * base elástica na análise global; `an` com os resultados). Os grupos de estados "Fundações" e "Tensões no solo"
 * desativados deixam a lista vazia.
 */
export function calcularCorridas(b: BuildingModel, an: AnaliseEdificio | null): ResultadoCorrida[] {
  const cs = corridasEfetivas(b);
  if (!cs.length) return [];
  if (!estadoEmUso(b, 'fundacoes').ativo && !estadoEmUso(b, 'solo').ativo) return [];
  const op = opcoesEmUso(b.opcoes, perfilDe(b));
  const vento = an?.vento ?? null;
  const base = { vento } as AnaliseEdificio;
  const raras = combinacoesDoEstado(b, base, 'solo').filter((x) => x.tipo === 'RARA');
  const ventos = new Set([...(vento?.casos ?? []).map((c) => c.nome), ...casosDaObra(b).filter((c) => c.natureza === 'W').map((c) => c.id)]);
  const cx: Contexto = { b, an, op, P0: parametrosFundacao(b), zt: cotaTerreno(b), raras, ventos, fv: b.fundacao?.terreno.fatorVento ?? 1 };
  const res = cs.map((c) => (!c.orfa && pilaresDaCorrida(b, c).length ? calcularSobPilares(cx, c) : calcularParede(cx, c)));
  deslizamentoDoConjunto(res, op);
  return res;
}

/**
 * Deslizamento das sapatas de paredes de topo travado (FU7b): a laje (diafragma) leva o empuxo de um lado ao outro, então o que o
 * solo recebe é a soma vetorial das reações horizontais da base de todas as paredes travadas (empuxos opostos se anulam), contra
 * a soma de μ·(N + peso da sapata): FS = Σ μ·N / |ΣH| na pior combinação rara. Pilares e outras fundações não entram (a confirmar).
 */
function deslizamentoDoConjunto(res: ResultadoCorrida[], op: OpcoesCalculo) {
  const grupo = res.filter((r) => r.parede?.travada && r.parede.forcas?.length);
  if (!grupo.length) return;
  const fsMin = op.fundCorridaFSDesliz, Ltot = grupo.reduce((t, r) => t + r.L, 0);
  const porComb = new Map<string, { Hx: number; Hy: number; N: number; muN: number }>();
  for (const r of grupo) for (const f of r.parede!.forcas!) {
    const a = porComb.get(f.comb) ?? { Hx: 0, Hy: 0, N: 0, muN: 0 };
    a.Hx += f.Hx; a.Hy += f.Hy; a.N += f.N; a.muN += f.muN; porComb.set(f.comb, a);
  }
  let pior: { comb: string; Hliq: number; N: number; FS: number } | null = null;
  for (const [comb, a] of porComb) {
    const Hliq = Math.hypot(a.Hx, a.Hy);
    if (Hliq < 1e-6) continue;
    const FS = Math.min(99, a.muN / Hliq);
    if (!pior || FS < pior.FS) pior = { comb, Hliq, N: a.N, FS };
  }
  if (!pior) return;
  for (const r of grupo) {
    const d = r.parede!;
    const iso = d.deslizamento?.FS ?? 99, ok = pior.FS >= fsMin - 1e-9;
    d.deslizamento = { mu: d.deslizamento?.mu ?? op.fundCorridaAtrito, N: pior.N / Ltot, H: pior.Hliq / Ltot, FS: pior.FS, FSmin: fsMin, ok, comb: pior.comb };
    d.conjunto = { n: grupo.length, Hliq: pior.Hliq, N: pior.N, FS: pior.FS, isolado: iso };
    if (!ok && op.fundCorridaDeslizamento) {
      r.mensagens.push(`Sapata corrida ${r.nome}: deslizamento do conjunto de ${grupo.length} sapata(s) de paredes travadas, FS = ${fmt(pior.FS)} < ${fmt(fsMin)} (H líquida = ${fmt(pior.Hliq, 1)} kN, N = ${fmt(pior.N, 1)} kN em ${pior.comb}; isolada, FS = ${fmt(iso)}); aumente a largura ou o atrito, ou trave a base com vigas de fundação.`);
      r.status = 'fail';
    }
  }
}

/** Resumo para o MCP e a linha de comando (sem o contorno nem os nós). */
export function resumoCorrida(r: ResultadoCorrida) {
  const t = r.transversal;
  return {
    id: r.id, nome: r.nome, modo: r.modo, aba: r.aba, B: +r.B.toFixed(3), bw: r.bw, h: r.h, h0: r.h0, L: +r.L.toFixed(3), sigmaAdm: r.sigmaAdm ?? null,
    sigmaMax: r.pressao ? +r.pressao.sigmaMax.toFixed(1) : null, carga_kN_m: r.carga ? { Nk: +r.carga.Nk.toFixed(1), Nd: +r.carga.Nd.toFixed(1) } : null,
    transversal: t ? { metodo: t.metodo, Md_kNm_m: +t.Md.toFixed(2), As_cm2_m: +t.AsAdot.toFixed(2), barras: t.barras ? `φ${t.barras.phi} c/${cm(t.barras.s)}` : null, distribuicao: t.distribuicao.barras ? `φ${t.distribuicao.barras.phi} c/${cm(t.distribuicao.barras.s)}` : null } : null,
    ...(r.longitudinal ? { longitudinal: { Md: { inf: +r.longitudinal.Md.inf.toFixed(1), sup: +r.longitudinal.Md.sup.toFixed(1) }, Vd: +r.longitudinal.Vd.toFixed(1), recalque_mm: +(r.longitudinal.recalque * 1000).toFixed(2) } } : {}),
    ...(r.cinta !== undefined ? { cinta_kNm_m: +r.cinta.toFixed(1) } : {}),
    ...(r.parede ? { parede: { id: r.parede.id, nome: r.parede.nome, derivada: r.parede.virtual, origem: r.parede.origem, M_kNm_m: +r.parede.M.toFixed(2), H_kN_m: +r.parede.H.toFixed(2), e_m: +r.parede.eM.toFixed(3), ...(r.parede.deslizamento ? { deslizamento: { mu: r.parede.deslizamento.mu, FS: +r.parede.deslizamento.FS.toFixed(2), FSmin: r.parede.deslizamento.FSmin } } : {}), pilares: r.parede.pilares } } : {}),
    ...(r.cintas?.length ? { cintas: r.cintas.map(resumoCinta) } : {}),
    volume: +r.volume.toFixed(3), forma: +r.forma.toFixed(2), aco: +r.aco.toFixed(1), status: r.status, mensagens: r.mensagens,
  };
}

/** A sapata corrida abrange o ponto (em planta)? Para seleção e posicionamento. */
export function pontoNaBaseCorrida(c: SapataCorrida, B: number, pt: P): boolean { return dentroPoligono(pt, contornoCorrida(c, B)); }
