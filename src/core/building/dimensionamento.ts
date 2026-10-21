// Dimensionamento do edifício (NBR 6118) a partir da análise: vigas (flexão e cortante pela envoltória ELU),
// pilares (pilar-padrão com curvatura aproximada nas duas direções e flexão oblíqua por fibras), lajes maciças
// (momentos por metro da grelha) e quantitativos. Cargas para o módulo Fundações.
import { baseBarra, type Caso3, type Modelo3, type V3 } from '../fe3d';
import { barArea, beamAsMin, beamFlexure, bransonRatio, chooseBars, chooseStirrup, crackLimit, crackWidth, gammaNFor, torsionRect } from '../concrete';
import { BITOLAS_TABELA, ESPACAMENTOS_PILAR, bitolasPilar, escolherBarrasViga, escolherEstribo, espacamentosPilar, estriboDaTabelaPilar, linhaLajes, pilarRestrito, tabelaDe } from './tabelasArmadura';
import { acoDe, cobrimentoLaje, cobrimentoPilar, cobrimentoViga, concretoDe, flambagemLance, gamas } from './materiais';
import { fiberAxialRange, fiberCapacity, fiberMesh, polyProps, circlePolygon, type FiberSection, type Pt, type RBar } from '../fiber';
import type { AnaliseEdificio, GrelhaPavimento } from './analitico';
import { deltaXi } from '../design';
import { combinacoesDoEstado, combinacoesEdificio, type CombinacaoEd } from './combinacoes';
import { alertasSituacoes, equilibrioGlobal, estadoEmUso, textosAlertas, type ResultadoEQU } from './acoes';
import { propriedadesLaje, TRELICADAS, vaos } from './lajes';
import { vaosDaViga } from './vigas';
import { detalharVigas, resumoAcoVigas, type DetalheViga } from './detalhamento';
import { detalharPilares, resumoAcoPilares, type DetalhePilar } from './detalhamentoPilares';
import { detalharLajes, escolherBarrasLaje, resumoAcoLajes, type DetalheLaje } from './detalhamentoLajes';
import { dimensionarVigotas, quantitativoTrelicas, resumoAcoVigotas, type ResultadoVigotas } from './vigotas';
import { casosDaObra, comprimentoPolilinha, dimsSecao, lancesDoPilar, pavimentosOrdenados, secaoNoLance, type BuildingModel } from './types';
import { areaPoligono } from '../geom/faces';
import { calcularFundacaoEdificio, type OpcoesFundacao, type ResultadoFundacao } from './fundacao';
import type { ResultadoVigaFundacao } from './vigasFundacao';
import { TAXAS } from './premissas';
import { detalharRadier, dimensionarBaseElastica, resumoAcoRadiers, type ResultadoRadier, type ResultadoVigaElastica } from './baseElastica';
import { COMB_ELU_LAJE, COMB_FREQ, COMB_QP, origem, type Origem } from './origem';
export { TAXAS };

const AVISO_CA60 = 'CA-60 só existe até φ10: confira as bitolas maiores.';

// ---------------- esforços ao longo da barra ----------------

export interface Estacao { x: number; N: number; Vy: number; Vz: number; My: number; Mz: number; T: number }

/**
 * Esforços internos ao longo da parte flexível (eixos locais; N > 0 tração; Mz > 0 traciona a face y−,
 * isto é, nas vigas M > 0 traciona embaixo) a partir dos esforços de extremidade e das cargas na barra.
 */
/** Cargas de cada barra num caso (na ordem do caso), indexadas uma vez por caso. */
const cargasPorBarra = new WeakMap<Caso3, Map<number, { dist: Caso3['distribuidas']; pont: NonNullable<Caso3['pontuais']> }>>();
function cargasDaBarra(caso: Caso3, bi: number) {
  let m = cargasPorBarra.get(caso);
  if (!m) {
    m = new Map();
    const de = (b: number) => { let x = m!.get(b); if (!x) { x = { dist: [], pont: [] }; m!.set(b, x); } return x; };
    for (const d of caso.distribuidas) de(d.barra).dist.push(d);
    for (const p of caso.pontuais ?? []) de(p.barra).pont.push(p);
    cargasPorBarra.set(caso, m);
  }
  return m.get(bi);
}

export function esforcosAoLongo(m: Modelo3, bi: number, f: ArrayLike<number>, caso: Caso3 | undefined, xs: number[]): Estacao[] {
  const { R } = baseBarra(m, m.barras[bi]);
  const loc = (g: ArrayLike<number>, o = 0): V3 => [0, 1, 2].map((r) => R[r][0] * g[o] + R[r][1] * g[o + 1] + R[r][2] * g[o + 2]) as V3;
  let q: V3 = [0, 0, 0];
  const cb = caso ? cargasDaBarra(caso, bi) : undefined;
  for (const d of cb?.dist ?? []) { const l = loc(d.q); q = [q[0] + l[0], q[1] + l[1], q[2] + l[2]]; }
  const pts = (cb?.pont ?? []).map((p) => ({ a: p.a, F: loc(p.f, 0), M: loc(p.f, 3) }));
  return xs.map((x) => {
    let Fx = f[0] + q[0] * x, Fy = f[1] + q[1] * x, Fz = f[2] + q[2] * x, Mx = f[3];
    let Mz = -f[5] + x * f[1] + (q[1] * x * x) / 2, My = -f[4] - x * f[2] - (q[2] * x * x) / 2;
    for (const p of pts) if (p.a < x - 1e-9) {
      Fx += p.F[0]; Fy += p.F[1]; Fz += p.F[2]; Mx += p.M[0];
      Mz += p.F[1] * (x - p.a) - p.M[2];
      My += -p.F[2] * (x - p.a) - p.M[1];
    }
    return { x, N: -Fx, Vy: -Fy, Vz: -Fz, My, Mz, T: -Mx };
  });
}

/** Esforços por caso de uma barra do pórtico: { G: estações, Q: …, W0°: … }. */
function porCaso(an: AnaliseEdificio, bi: number, xs: number[], semVento = false): Record<string, Estacao[]> {
  const pm = an.portico, out: Record<string, Estacao[]> = {};
  if (!pm.res) return out;
  an.casos.forEach((c, ic) => (out[c] = esforcosAoLongo(pm.modelo, bi, pm.res!.esforcos[ic][bi], pm.casos?.[ic], xs)));
  if (!semVento) (an.vento?.casos ?? []).forEach((cv, ic) => { if (pm.resVento) out[cv.nome] = esforcosAoLongo(pm.modelo, bi, pm.resVento.esforcos[ic][bi], pm.casosVento?.[ic], xs); });
  return out;
}

const comb = (pc: Record<string, Estacao[]>, c: CombinacaoEd, i: number, k: keyof Estacao) => {
  let s = 0;
  for (const nome in c.fatores) { const e = pc[nome]; if (e) s += c.fatores[nome] * e[i][k]; }
  return s;
};

/** Combinação compilada: índices dos casos na ordem dos fatores (a mesma soma de `comb`) e os fatores. */
type CombC = { idx: number[]; f: number[] };
function compilarComb(c: CombinacaoEd, nomes: Map<string, number>): CombC {
  const idx: number[] = [], f: number[] = [];
  for (const nome in c.fatores) { const i = nomes.get(nome); if (i !== undefined) { idx.push(i); f.push(c.fatores[nome]); } }
  return { idx, f };
}
/** Um esforço de todas as estações por caso (na ordem de `nomes`); caso ausente fica vazio. */
function vetorCasos(pc: Record<string, Estacao[]>, nomes: Map<string, number>, k: keyof Estacao): Float64Array[] {
  const out: Float64Array[] = [];
  for (const [nome, i] of nomes) { const e = pc[nome]; const a = new Float64Array(e ? e.length : 0); if (e) for (let j = 0; j < e.length; j++) a[j] = e[j][k]; out[i] = a; }
  return out;
}
/** dst[o + i] = Σ fator·caso[i], somando na ordem dos fatores (resultado idêntico ao de `comb`). */
function combinarEm(dst: Float64Array, o: number, n: number, c: CombC, casos: Float64Array[]) {
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < c.idx.length; j++) s += c.f[j] * casos[c.idx[j]][i]; dst[o + i] = s; }
}
/** Nomes dos casos que `porCaso` devolve, com o índice usado nos vetores. */
function nomesDosCasos(an: AnaliseEdificio): Map<string, number> {
  const m = new Map<string, number>();
  if (!an.portico.res) return m;
  for (const c of an.casos) if (!m.has(c)) m.set(c, m.size);
  if (an.portico.resVento) for (const cv of an.vento?.casos ?? []) if (!m.has(cv.nome)) m.set(cv.nome, m.size);
  return m;
}

// ---------------- vigas ----------------

export interface ResultadoViga {
  viga: string; nome: string; grupo: string; b: number; h: number; L: number;
  /** Maior flecha total (quase permanente, Branson por seção, com fluência) e da carga variável, e limites (m). */
  flecha: number; limite: number; flechaQ: number; limiteQ: number;
  Mpos: number; Mneg: number; V: number;
  /** Envoltória ELU ao longo da viga (todos os pavimentos do grupo), em faixas de 0,25 m, com as combinações determinantes. */
  envoltoria: EnvoltoriaViga;
  /** Momentos ELU (kN·m; + traciona embaixo) nas faces dos pilares de apoio, com as combinações que os dão (só exibição: o cálculo usa o trecho rígido). */
  facesPilar: { s: number; pilar: string; nomePilar: string; Mmin: number; Mmax: number; combinacaoMin: string; combinacaoMax: string }[];
  /** Origem de cada grandeza: combinação determinante, fórmula e item da NBR 6118. */
  origens: Origem[];
  /** Maior torçor de cálculo (kN·m), armadura longitudinal de torção (m², no perímetro) e maior Vsd/VRd2 + Tsd/TRd2. */
  T: number; AslTorcao: number; biela: number;
  /** Armadura longitudinal de torção em cada face lateral (m²) e as barras adotadas; decalagem aℓ (m). */
  AsLateral: number; barrasLaterais: string; al: number;
  /** Coeficiente de redistribuição adotado nos apoios internos (1 = sem redistribuição). */
  delta: number;
  /** Abertura de fissuras na combinação frequente (mm): face inferior e superior, e limite. */
  wk: [number, number]; wkLim: number;
  AsInf: number; AsSup: number; barrasInf: string; barrasSup: string; estribo: string;
  status: 'ok' | 'fail'; mensagens: string[];
  /** Armadura editada e bloqueada (só verificada) e o arranjo adotado (para o editor). */
  bloqueada: boolean;
  /** Áreas necessárias inferior e superior (m²), antes do bloqueio e do aumento por fissuração. */
  AsNec: [number, number];
  arranjo: { inf: { n: number; phi: number } | null; sup: { n: number; phi: number } | null; estribo: { phi: number; s: number; legs?: number } | null; laterais: { n: number; phi: number } | null };
}

export interface EnvoltoriaViga {
  /** Abscissa ao longo do traçado (m) e extremos de M (kN·m; + traciona embaixo), V (kN) e |T| (kN·m) na faixa. */
  pontos: { s: number; Mmax: number; Mmin: number; Vmax: number; Vmin: number; T: number }[];
  /** Combinação que dá cada extremo global. */
  determinantes: { Mmax: string; Mmin: string; V: string; T: string };
}

/** Abscissa (m) da projeção de P no traçado da viga, a partir do primeiro ponto. */
function abscissa(pts: [number, number][], P: number[]): number {
  let melhor = Infinity, s = 0, acum = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], z = pts[i + 1], dx = z[0] - a[0], dy = z[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const t = Math.max(0, Math.min(L, ((P[0] - a[0]) * dx + (P[1] - a[1]) * dy) / L));
    const d = Math.hypot(a[0] + (dx * t) / L - P[0], a[1] + (dy * t) / L - P[1]);
    if (d < melhor - 1e-9) { melhor = d; s = acum + t; }
    acum += L;
  }
  return s;
}

/** Envoltória ELU de uma viga (com a redistribuição δ aplicada nos apoios internos), por faixas de 0,25 m. */
function envoltoriaViga(vaos: { L: number; xs: number[]; s: number[]; M: Float64Array[]; Mv: Float64Array[]; V: Float64Array[]; T: Float64Array[]; ini: number; fim: number }[], elu: CombinacaoEd[], delta: number, interno: (n: number) => boolean): EnvoltoriaViga {
  const faixas = new Map<number, EnvoltoriaViga['pontos'][number]>();
  const det = { Mmax: '', Mmin: '', V: '', T: '' }, ext = { Mmax: -Infinity, Mmin: Infinity, V: -Infinity, T: -Infinity };
  for (const vo of vaos) for (let k = 0; k < elu.length; k++) {
    const M = vo.M[k], Mv = vo.Mv[k], n = M.length;
    const dA = delta < 1 && interno(vo.ini) && Mv[0] < 0 ? (1 - delta) * -Mv[0] : 0, dZ = delta < 1 && interno(vo.fim) && Mv[n - 1] < 0 ? (1 - delta) * -Mv[n - 1] : 0;
    for (let i = 0; i < n; i++) {
      const t = vo.xs[i] / vo.L, m = M[i] + dA * (1 - t) + dZ * t, vv = vo.V[k][i] - (dZ - dA) / vo.L, tt = Math.abs(vo.T[k][i]);
      const key = Math.round(vo.s[i] / 0.25);
      const f = faixas.get(key) ?? { s: key * 0.25, Mmax: -Infinity, Mmin: Infinity, Vmax: -Infinity, Vmin: Infinity, T: 0 };
      f.Mmax = Math.max(f.Mmax, m); f.Mmin = Math.min(f.Mmin, m); f.Vmax = Math.max(f.Vmax, vv); f.Vmin = Math.min(f.Vmin, vv); f.T = Math.max(f.T, tt);
      faixas.set(key, f);
      if (m > ext.Mmax) { ext.Mmax = m; det.Mmax = elu[k].nome; }
      if (m < ext.Mmin) { ext.Mmin = m; det.Mmin = elu[k].nome; }
      if (Math.abs(vv) > ext.V) { ext.V = Math.abs(vv); det.V = elu[k].nome; }
      if (tt > ext.T) { ext.T = tt; det.T = elu[k].nome; }
    }
  }
  const r = (x: number) => Math.round(x * 100) / 100;
  return { pontos: [...faixas.values()].sort((a, z) => a.s - z.s).map((f) => ({ s: r(f.s), Mmax: r(f.Mmax), Mmin: r(f.Mmin), Vmax: r(f.Vmax), Vmin: r(f.Vmin), T: r(f.T) })), determinantes: det };
}

/** Cadeias de barras do pórtico de uma viga, na ordem, cortadas nos pilares (os vãos). */
function cadeiasViga(an: AnaliseEdificio, membros: number[], noPilar: Set<number>): number[][] {
  const mb = an.portico.modelo.barras, cadeias: number[][] = [];
  for (const bi of membros) {
    const atual = cadeias.at(-1), ultimo = atual ? mb[atual.at(-1)!] : null;
    if (atual && ultimo && ultimo.j === mb[bi].i && !noPilar.has(mb[bi].i)) atual.push(bi); else cadeias.push([bi]);
  }
  return cadeias;
}

const CAA_NUM = { I: 1, II: 2, III: 3, IV: 4 } as const;

/** Barras longitudinais de uma face lateral (torção) para As (m²): φ8 a φ12,5, espaçadas até 20 cm na altura. */
function barrasLaterais(As: number, h: number) {
  const nMin = Math.max(1, Math.ceil(h / 0.2) - 1);
  for (const phi of [8, 10, 12.5]) { const n = Math.max(nMin, Math.ceil(As / barArea(phi))); if (n <= nMin + 2 || phi === 12.5) return { phi, n }; }
  return { phi: 12.5, n: nMin };
}

function dimensionarVigas(b: BuildingModel, an: AnaliseEdificio, elu: CombinacaoEd[], freq: CombinacaoEd[]): ResultadoViga[] {
  const c = concretoDe(b, 'viga'), aPos = acoDe(b, 'vigaPos'), aNeg = acoDe(b, 'vigaNeg'), aEst = acoDe(b, 'vigaEstribo'), gs = gamas(b).s;
  const fywd = Math.min(aEst.fyk / gs, 435), fydL = Math.min(aPos.fyd, aNeg.fyd);
  const op = an.opcoes, af = deltaXi(op.t0Flecha);
  const caa = CAA_NUM[b.norma.caa], wkLim = op.limiteFissura || crackLimit(caa);
  const obra = casosDaObra(b), natureza = (id: string) => obra.find((x) => x.id === id)?.natureza ?? 'G';
  const psi2 = (id: string) => obra.find((x) => x.id === id)?.psi?.[2] ?? b.norma.psiQ?.[2] ?? 0.3;
  const fQP: Record<string, number> = Object.fromEntries(an.casos.map((id) => [id, natureza(id) === 'G' || natureza(id) === 'H' ? 1 : natureza(id) === 'Q' ? psi2(id) : 0]));
  const fQ: Record<string, number> = Object.fromEntries(an.casos.map((id) => [id, natureza(id) === 'Q' ? 1 : 0]));
  // parte vertical de cada combinação (a redistribuição e os mínimos valem para as cargas verticais)
  const horiz = new Set([...(an.vento?.casos ?? []).map((x) => x.nome), ...obra.filter((x) => x.natureza === 'W').map((x) => x.id)]);
  const vert = (cb: CombinacaoEd): CombinacaoEd => ({ ...cb, fatores: Object.fromEntries(Object.entries(cb.fatores).filter(([k]) => !horiz.has(k))) });
  const eluV = elu.map(vert);
  const nomesCasos = nomesDosCasos(an), eluC = elu.map((cb) => compilarComb(cb, nomesCasos)), eluVC = eluV.map((cb) => compilarComb(cb, nomesCasos)), freqC = freq.map((cb) => compilarComb(cb, nomesCasos));
  const pontuais = new Map<number, { a: number }[]>();
  for (const cs of an.portico.casos ?? []) for (const p of cs.pontuais ?? []) { const l = pontuais.get(p.barra); if (l) l.push(p); else pontuais.set(p.barra, [p]); }
  // nós de estrutura móvel quando γz > 1,1 (δ ≥ 0,90); nós fixos δ ≥ 0,75 (NBR 6118, 14.6.4.3)
  const gz = Math.max(1, ...(an.vento?.gamaZ ?? []).map((g) => g.max));
  const deltaMin = gz > 1.1 ? 0.9 : 0.75, deltaX = c.fck > 50 ? 0.56 : 0.44;
  const noPilar = new Set<number>(), pilarNo = new Map<number, string>();
  an.portico.barras.forEach((t, i) => { if (t.tipo === 'pilar') { for (const n of [an.portico.modelo.barras[i].i, an.portico.modelo.barras[i].j]) { noPilar.add(n); if (t.ref && !pilarNo.has(n)) pilarNo.set(n, t.ref); } } });
  const usoNo = new Map<number, number>();
  an.portico.barras.forEach((t, i) => { if (t.tipo === 'viga') for (const n of [an.portico.modelo.barras[i].i, an.portico.modelo.barras[i].j]) usoNo.set(n, (usoNo.get(n) ?? 0) + 1); });
  const out: ResultadoViga[] = [];
  const pm = an.portico, mb = pm.modelo.barras;
  for (const v of b.vigas) {
    const membros = pm.barras.map((t, i) => [t, i] as const).filter(([t]) => t.tipo === 'viga' && t.ref === v.id).map(([, i]) => i);
    if (!membros.length) continue;
    const sec = { kind: 'rect' as const, bw: v.secao.b, h: v.secao.h };
    // d da armadura positiva pela face inferior e da negativa pela superior (cobrimentos por face: materiais.ts)
    const cob = cobrimentoViga(b, v.cobrimento), dI = v.secao.h - cob.inf - 0.005 - 0.008, dS = v.secao.h - cob.sup - 0.005 - 0.008;
    const d2I = cob.sup + 0.005 + 0.008, d2S = cob.inf + 0.005 + 0.008, d = Math.min(dI, dS);
    const tor = op.verificarTorcao || v.torcaoEquilibrio ? torsionRect(v.secao.b, v.secao.h, cob.lat + 0.005 + 0.008, 0, c, fywd, fydL) : null;
    const VRd2 = 0.27 * c.av2 * c.fcd * v.secao.b * d * 1000, Vc0 = 0.6 * c.fctd * v.secao.b * d * 1000;
    // pontas das barras sobre pilares (parte flexível começa em face − trechoRigido·h) e apoios internos da viga
    const membrosNo = new Map<number, number>();
    for (const bi of membros) for (const n of [mb[bi].i, mb[bi].j]) membrosNo.set(n, (membrosNo.get(n) ?? 0) + 1);
    const interno = (n: number) => noPilar.has(n) && (membrosNo.get(n) ?? 0) >= 2;
    const recuo = op.trechoRigido * v.secao.h, depoisFace = op.cortanteApoio ? (op.cortanteDistancia / 100) * d : 0;
    // estações por vão: M e V por combinação (total e parte vertical), T e se a seção entra no cortante
    type Face = { x: number; s: number; pilar: string; M: Float64Array; Mv: Float64Array };
    type Vao = { L: number; xs: number[]; s: number[]; M: Float64Array[]; Mv: Float64Array[]; V: Float64Array[]; Vv: Float64Array[]; T: Float64Array[]; Mk: Float64Array[]; corte: boolean[]; ini: number; fim: number; balanco: boolean; faces: Face[] };
    const vaos: Vao[] = [];
    for (const cad of cadeiasViga(an, membros, noPilar)) {
      const xs: number[] = [], sAbs: number[] = [], corte: boolean[] = [], faces: Face[] = [];
      // estações de cada barra da cadeia (primeiro passo: total de estações para alocar os vetores)
      const estacoes = cad.map((bi) => {
        const { L } = baseBarra(pm.modelo, mb[bi]);
        const n = Math.max(4, Math.ceil(L / 0.25));
        const xl = Array.from({ length: n + 1 }, (_, k) => (k * L) / n);
        for (const p of pontuais.get(bi) ?? []) xl.push(Math.max(0, p.a - 1e-6), Math.min(L, p.a + 1e-6));
        xl.sort((a, z) => a - z);
        return { L, xl };
      });
      const tot = estacoes.reduce((t, e) => t + e.xl.length, 0);
      const M = elu.map(() => new Float64Array(tot)), Mv = elu.map(() => new Float64Array(tot)), V = elu.map(() => new Float64Array(tot)), Vv = elu.map(() => new Float64Array(tot)), T = elu.map(() => new Float64Array(tot)), Mk = freq.map(() => new Float64Array(tot));
      let x0 = 0, o = 0;
      for (let ib = 0; ib < cad.length; ib++) {
        const bi = cad[ib], { L, xl } = estacoes[ib];
        const pc = porCaso(an, bi, xl);
        const ne = xl.length, ez = vetorCasos(pc, nomesCasos, 'Mz'), ey = vetorCasos(pc, nomesCasos, 'Vy'), et = vetorCasos(pc, nomesCasos, 'T');
        const rI = mb[bi].offI && noPilar.has(mb[bi].i) ? recuo : null, rJ = mb[bi].offJ && noPilar.has(mb[bi].j) ? recuo : null;
        const marcados = xl.map((x) => !op.cortanteApoio || ((rI === null || x - rI >= depoisFace - 1e-9) && (rJ === null || L - x - rJ >= depoisFace - 1e-9)));
        if (!marcados.some(Boolean)) marcados[Math.floor(xl.length / 2)] = true;
        // posição em planta de cada estação (início da parte flexível + u·x) para a abscissa ao longo da viga
        const nI = pm.modelo.nos[mb[bi].i], nJ = pm.modelo.nos[mb[bi].j], oI = mb[bi].offI ?? [0, 0, 0], oJ = mb[bi].offJ ?? [0, 0, 0];
        const ini = [nI[0] + oI[0], nI[1] + oI[1]], fim = [nJ[0] + oJ[0], nJ[1] + oJ[1]], Lf = Math.hypot(fim[0] - ini[0], fim[1] - ini[1]) || 1;
        xl.forEach((x, i) => {
          xs.push(x0 + x); corte.push(marcados[i]);
          sAbs.push(abscissa(v.pontos, [ini[0] + ((fim[0] - ini[0]) * x) / Lf, ini[1] + ((fim[1] - ini[1]) * x) / Lf]));
        });
        for (let k = 0; k < elu.length; k++) {
          combinarEm(M[k], o, ne, eluC[k], ez); combinarEm(Mv[k], o, ne, eluVC[k], ez); combinarEm(V[k], o, ne, eluC[k], ey);
          combinarEm(Vv[k], o, ne, eluVC[k], ey); combinarEm(T[k], o, ne, eluC[k], et);
        }
        for (let k = 0; k < freq.length; k++) combinarEm(Mk[k], o, ne, freqC[k], ez);
        // momento na face dos pilares (a parte flexível começa trechoRigido·h antes da face): só para exibição
        for (const [r, no, xf] of [[rI, mb[bi].i, rI ?? 0], [rJ, mb[bi].j, L - (rJ ?? 0)]] as const) {
          if (r === null) continue;
          const pf = porCaso(an, bi, [xf]), fz = vetorCasos(pf, nomesCasos, 'Mz');
          const Mf = new Float64Array(elu.length), Mfv = new Float64Array(elu.length), um = new Float64Array(1);
          for (let k = 0; k < elu.length; k++) { combinarEm(um, 0, 1, eluC[k], fz); Mf[k] = um[0]; combinarEm(um, 0, 1, eluVC[k], fz); Mfv[k] = um[0]; }
          faces.push({ x: x0 + xf, s: abscissa(v.pontos, [ini[0] + ((fim[0] - ini[0]) * xf) / Lf, ini[1] + ((fim[1] - ini[1]) * xf) / Lf]), pilar: pilarNo.get(no) ?? '', M: Mf, Mv: Mfv });
        }
        x0 += L; o += xl.length;
      }
      const ini = mb[cad[0]].i, fim = mb[cad.at(-1)!].j;
      const livre = (no: number) => !noPilar.has(no) && (usoNo.get(no) ?? 0) <= 1;
      vaos.push({ L: x0, xs, s: sAbs, M, Mv, V, Vv, T, Mk, corte, ini, fim, balanco: livre(ini) !== livre(fim), faces });
    }
    // envoltória ELU: momentos mínimos (p·ℓ²/x, p = (V1 + V2)/ℓ das cargas verticais) e depois a
    // redistribuição δ nos apoios internos, que também reduz o negativo mínimo ali
    const envoltoria = (delta: number) => {
      let Mpos = 0, Mneg = 0, V = 0, T = 0, biela = 0, asw = 0, Asl = 0;
      for (const vo of vaos) for (let k = 0; k < elu.length; k++) {
        const M = vo.M[k], Mv = vo.Mv[k], n = M.length, L = vo.L;
        const dA = delta < 1 && interno(vo.ini) && Mv[0] < 0 ? (1 - delta) * -Mv[0] : 0;
        const dZ = delta < 1 && interno(vo.fim) && Mv[n - 1] < 0 ? (1 - delta) * -Mv[n - 1] : 0;
        const pl2 = vo.balanco ? 0 : (Math.abs(vo.Vv[k][0]) + Math.abs(vo.Vv[k][n - 1])) * L;
        if (op.momentoMinPositivo && pl2 > 0) Mpos = Math.max(Mpos, pl2 / op.momentoMinPositivo);
        if (op.momentoMinNegativo && pl2 > 0) for (const no of [vo.ini, vo.fim]) if (noPilar.has(no)) Mneg = Math.min(Mneg, (-pl2 / op.momentoMinNegativo) * (interno(no) ? delta : 1));
        for (let i = 0; i < n; i++) {
          const t = vo.xs[i] / L, m = M[i] + dA * (1 - t) + dZ * t;
          Mpos = Math.max(Mpos, m); Mneg = Math.min(Mneg, m);
          if (!vo.corte[i]) continue;
          // dM/dx = −Vy: o acréscimo linear de momento muda o cortante em −(dZ − dA)/ℓ
          const vv = Math.abs(vo.V[k][i] - (dZ - dA) / L), tt = tor ? Math.abs(vo.T[k][i]) : 0;
          V = Math.max(V, vv); T = Math.max(T, tt);
          // torsionRect por estação sem alocar: geometria fixa (tor) e as mesmas expressões de A90/s e Asl
          const T1 = tt ? Math.abs(tt) / 1000 : 0, a90S = tt ? T1 / (2 * tor!.Ae * fywd) : 0;
          biela = Math.max(biela, vv / VRd2 + (tt ? tt / tor!.TRd2 : 0));
          // Asw/s dos dois ramos: cortante (modelo I, Vc = Vc0) + 2 × A90/s da torção
          asw = Math.max(asw, Math.max(0, vv - Vc0) / 1000 / (0.9 * d * fywd) + (tt ? 2 * a90S : 0));
          if (tt) Asl = Math.max(Asl, (T1 * tor!.ue) / (2 * tor!.Ae * fydL));
        }
      }
      return { Mpos, Mneg, V, T, biela, asw, Asl };
    };
    const flx = (M: number, dd: number, d2: number, fyd: number) => { const r = beamFlexure(sec, false, M, dd, d2, c, fyd); return Math.max(r.As, M ? beamAsMin(sec, false, dd, c, fyd) : 0); };
    // δ: o pedido, limitado por nós fixos/móveis e por δ ≥ 0,44 + 1,25·x/d no apoio (iterado, x cresce com o momento)
    let delta = op.redistribuicao > 0 ? Math.max(1 - op.redistribuicao / 100, deltaMin) : 1;
    let env = envoltoria(delta);
    for (let it = 0; it < 6 && delta < 1; it++) {
      const xd = beamFlexure(sec, false, -env.Mneg, dS, d2S, c, aNeg.fyd).xd, req = Math.min(1, deltaX + 1.25 * xd);
      if (delta >= req - 1e-4) break;
      delta = Math.min(1, req + 0.005); env = envoltoria(delta);
    }
    const { Mpos, Mneg, V } = env;
    const envolt = envoltoriaViga(vaos, elu, delta, interno);
    // momento na face dos pilares: mesma redistribuição linear δ do vão (envoltória ELU)
    const facesPilar: ResultadoViga['facesPilar'] = [];
    for (const vo of vaos) for (const f of vo.faces) {
      let Mmax = -Infinity, Mmin = Infinity, cMax = '', cMin = '';
      for (let k = 0; k < elu.length; k++) {
        const Mv = vo.Mv[k], n = Mv.length;
        const dA = delta < 1 && interno(vo.ini) && Mv[0] < 0 ? (1 - delta) * -Mv[0] : 0, dZ = delta < 1 && interno(vo.fim) && Mv[n - 1] < 0 ? (1 - delta) * -Mv[n - 1] : 0;
        const t = f.x / vo.L, m = f.M[k] + dA * (1 - t) + dZ * t;
        if (m > Mmax) { Mmax = m; cMax = elu[k].nome; }
        if (m < Mmin) { Mmin = m; cMin = elu[k].nome; }
      }
      const pil = b.pilares.find((q) => q.id === f.pilar);
      const r2 = (x: number) => Math.round(x * 100) / 100;
      facesPilar.push({ s: r2(f.s), pilar: f.pilar, nomePilar: pil?.nome ?? '', Mmin: r2(Mmin), Mmax: r2(Mmax), combinacaoMin: cMin, combinacaoMax: cMax });
    }
    const msgs: string[] = [];
    if (op.redistribuicao > 0 && vaos.some((vo) => interno(vo.ini) || interno(vo.fim))) msgs.push(`Redistribuição nos apoios internos: δ = ${delta.toFixed(2).replace('.', ',')}${delta > 1 - op.redistribuicao / 100 + 1e-6 ? ` (limitado: ${deltaMin === 0.9 ? 'nós móveis, δ ≥ 0,90' : 'δ ≥ 0,75'} e δ ≥ ${deltaX.toFixed(2).replace('.', ',')} + 1,25·x/d)` : ''}.`);
    let AsInf = Math.max(flx(Mpos, dI, d2I, aPos.fyd), beamAsMin(sec, false, dI, c, aPos.fyd)), AsSup = Mneg < 0 ? flx(-Mneg, dS, d2S, aNeg.fyd) : 0;
    const fi = beamFlexure(sec, false, Mpos, dI, d2I, c, aPos.fyd), fs = beamFlexure(sec, false, -Mneg, dS, d2S, c, aNeg.fyd);
    if (fi.double || fs.double) msgs.push('Armadura dupla (x limitado): aumente a altura.');
    // estribos: cortante + torção, com mínimo e espaçamento máximo pelo cortante (17.4.1.1.1 e 18.3.3.2)
    const aswMin = ((0.2 * c.fctm) / aEst.fyk) * v.secao.b, aswS = Math.max(aswMin, env.asw);
    const smax = V <= 0.67 * VRd2 ? Math.min(0.6 * d, 0.3) : Math.min(0.3 * d, 0.2);
    const tabBarras = tabelaDe(b, 'vigas', v.tabela), tabEst = tabelaDe(b, 'estribos', v.tabelaEstribo);
    const estT = escolherEstribo(tabEst, v.secao.b, aswS, smax);
    let est: { phi: number; s: number; legs: number } | null = estT ? { phi: estT.phi, s: estT.s, legs: estT.legs } : null;
    if (estT?.fora) msgs.push(`Fora de tabela (estribos): nenhuma bitola e número de ramos da tabela "${tabEst.nome}" dá espaçamento ≥ ${tabEst.linhas.find((l) => v.secao.b * 100 <= l.bAte + 1e-9)?.sMin ?? 10} cm para ${(aswS * 1e4).toFixed(2).replace('.', ',')} cm²/m; adotado φ${String(estT.phi).replace('.', ',')} c/${Math.round(estT.s * 100)} com ${estT.legs} ramos.`);
    if (env.biela > 1) msgs.push(env.T > 0 ? `Biela comprimida: Vsd/VRd2 + Tsd/TRd2 = ${env.biela.toFixed(2).replace('.', ',')} > 1.` : `Biela comprimida: Vsd ${V.toFixed(1)} > VRd2 ${VRd2.toFixed(1)} kN.`);
    // armadura longitudinal de torção pelo perímetro da seção vazada: faces inferior e superior somadas à de
    // flexão (absorvida pelas barras se a bitola adotada tiver folga), faces laterais como barras de pele
    let AsLateral = 0;
    if (env.Asl > 0 && env.T > 0) {
      const tr = torsionRect(v.secao.b, v.secao.h, cob.lat + 0.005 + 0.008, env.T, c, fywd, fydL);
      const face = (env.Asl * (v.secao.b - tr.he)) / tr.ue;
      AsLateral = (env.Asl * (v.secao.h - tr.he)) / tr.ue;
      const soma = (As: number, fc: 'pos' | 'neg') => { const bb = escolherBarrasViga(tabBarras, fc, As, v.secao.b, v.secao.h, cob.lat, 0.005, 0.019).barras; return bb && bb.As - As >= face ? As : As + face; };
      AsInf = soma(AsInf, 'pos'); AsSup = soma(AsSup, 'neg');
      msgs.push(`Torção Td = ${env.T.toFixed(1).replace('.', ',')} kN·m: armadura longitudinal ${(env.Asl * 1e4).toFixed(2).replace('.', ',')} cm² (${(face * 1e4).toFixed(2).replace('.', ',')} cm² em cada face horizontal, ${(AsLateral * 1e4).toFixed(2).replace('.', ',')} cm² em cada face lateral).`);
    }
    let lat = AsLateral > 0 ? barrasLaterais(AsLateral, v.secao.h) : null;
    // decalagem do diagrama (NBR 6118, 17.4.2.2, modelo I, estribos verticais): aℓ = d·Vmáx/[2(Vmáx − Vc)], entre 0,5d e d
    const al = V > Vc0 ? Math.min(d, Math.max(0.5 * d, (d * V) / (2 * (V - Vc0)))) : d;
    // fissuração na combinação frequente (17.3.3.2): aumenta a armadura até wk ≤ limite
    let MkPos = 0, MkNeg = 0;
    for (const vo of vaos) for (const r of vo.Mk) for (const m of r) { MkPos = Math.max(MkPos, m); MkNeg = Math.min(MkNeg, m); }
    const larg = (As: number, fc: 'pos' | 'neg') => escolherBarrasViga(tabBarras, fc, As, v.secao.b, v.secao.h, cob.lat, 0.005, 0.019).barras;
    const fissura = (As: number, Mk: number, dd: number, fc: 'pos' | 'neg') => { const bb = larg(As, fc); return bb && Mk ? crackWidth(sec, false, bb.As, bb.phi, dd, Mk, c, caa).wk : 0; };
    // armadura bloqueada (editada): só verificada — área de aço, estribos, laterais, fissuras e flecha com as barras dadas
    const arm = v.armadura, bloq = !!arm && arm.vaos === vaosDaViga(b, v);
    if (arm && !bloq) msgs.push('Armadura bloqueada desconsiderada: o número de vãos mudou e a viga foi redimensionada.');
    let wkI = 0, wkS = 0, bi: ReturnType<typeof chooseBars>, bs: ReturnType<typeof chooseBars>;
    const AsNec: [number, number] = [AsInf, AsSup];
    if (arm && bloq) {
      const fixa = (x?: { n: number; phi: number }) => (x ? { n: x.n, phi: x.phi, As: x.n * barArea(x.phi), layers: 1 } : null);
      const cm2 = (x: number) => (x * 1e4).toFixed(2).replace('.', ',');
      bi = fixa(arm.inf); bs = fixa(arm.sup);
      if (bi!.As < AsInf - 1e-9) msgs.push(`Armadura bloqueada insuficiente: inferior ${cm2(bi!.As)} cm² < ${cm2(AsInf)} cm² necessários.`);
      if (AsSup > 0 && (bs?.As ?? 0) < AsSup - 1e-9) msgs.push(`Armadura bloqueada insuficiente: superior ${cm2(bs?.As ?? 0)} cm² < ${cm2(AsSup)} cm² necessários.`);
      const aswP = ((arm.estribo.legs ?? 2) * barArea(arm.estribo.phi)) / arm.estribo.s;
      if (aswP < aswS - 1e-9) msgs.push(`Armadura bloqueada insuficiente: estribos ${cm2(aswP)} cm²/m < ${cm2(aswS)} cm²/m necessários.`);
      if (arm.estribo.s > smax + 1e-9) msgs.push(`Armadura bloqueada insuficiente: espaçamento dos estribos ${Math.round(arm.estribo.s * 100)} cm > ${Math.floor(smax * 100)} cm.`);
      const latP = arm.laterais ? arm.laterais.n * barArea(arm.laterais.phi) : 0;
      if (AsLateral > latP + 1e-9) msgs.push(`Armadura bloqueada insuficiente: laterais de torção ${cm2(latP)} cm² < ${cm2(AsLateral)} cm² por face.`);
      AsInf = bi!.As; AsSup = bs?.As ?? 0;
      est = { phi: arm.estribo.phi, s: arm.estribo.s, legs: arm.estribo.legs ?? 2 };
      lat = arm.laterais ? { ...arm.laterais } : null;
      wkI = MkPos ? crackWidth(sec, false, bi!.As, bi!.phi, dI, MkPos, c, caa).wk : 0;
      wkS = bs && MkNeg ? crackWidth(sec, false, bs.As, bs.phi, dS, -MkNeg, c, caa).wk : 0;
      if (Math.max(wkI, wkS) > wkLim + 1e-9) msgs.push(`Abertura de fissuras ${Math.max(wkI, wkS).toFixed(2).replace('.', ',')} mm > ${wkLim.toFixed(2).replace('.', ',')} mm.`);
    } else {
      wkI = fissura(AsInf, MkPos, dI, 'pos'); wkS = AsSup ? fissura(AsSup, -MkNeg, dS, 'neg') : 0;
      let aumentou = false;
      for (let it = 0; it < 20 && wkI > wkLim && larg(AsInf * 1.1, 'pos'); it++) { AsInf *= 1.1; wkI = fissura(AsInf, MkPos, dI, 'pos'); aumentou = true; }
      for (let it = 0; it < 20 && wkS > wkLim && larg(AsSup * 1.1, 'neg'); it++) { AsSup *= 1.1; wkS = fissura(AsSup, -MkNeg, dS, 'neg'); aumentou = true; }
      if (aumentou) msgs.push(`Armadura aumentada para limitar a abertura de fissuras a ${wkLim.toFixed(2).replace('.', ',')} mm.`);
      if (Math.max(wkI, wkS) > wkLim + 1e-9) msgs.push(`Abertura de fissuras ${Math.max(wkI, wkS).toFixed(2).replace('.', ',')} mm > ${wkLim.toFixed(2).replace('.', ',')} mm.`);
      const ei = escolherBarrasViga(tabBarras, 'pos', AsInf, v.secao.b, v.secao.h, cob.lat, 0.005, 0.019), es = escolherBarrasViga(tabBarras, 'neg', AsSup, v.secao.b, v.secao.h, cob.lat, 0.005, 0.019);
      bi = ei.barras; bs = es.barras;
      const cm2f = (x: number) => (x * 1e4).toFixed(2).replace('.', ',');
      if (ei.fora) msgs.push(`Fora de tabela (barras): positivos ${cm2f(AsInf)} cm² sem solução na tabela "${tabBarras.nome}"; adotado ${bi!.n} φ25.`);
      if (es.fora) msgs.push(`Fora de tabela (barras): negativos ${cm2f(AsSup)} cm² sem solução na tabela "${tabBarras.nome}"; adotado ${bs!.n} φ25.`);
    }
    // flechas por vão (cadeias de barras entre pilares), curvatura M/(Ecs·Ie) com Branson em cada seção
    const fl = flechasViga(an, membros, noPilar, usoNo, (M) => {
      const r = M >= 0 ? bransonRatio(sec, false, AsInf, dI, M, c) : bransonRatio(sec, false, Math.max(AsSup, 1e-6), dS, M, c);
      return c.Ecs * 1000 * r.Ie;
    }, fQP, fQ);
    const flecha = fl.qp * (1 + af), limite = fl.vao / op.limiteFlechaTotal * (fl.balanco ? 2 : 1), limiteQ = fl.vaoQ / op.limiteFlechaSensorial * (fl.balancoQ ? 2 : 1);
    if (flecha > limite) msgs.push(`Flecha total ${(flecha * 1000).toFixed(1)} mm > ${fl.balanco ? '2ℓ' : 'ℓ'}/${op.limiteFlechaTotal} = ${(limite * 1000).toFixed(1)} mm (Branson por seção, × (1 + αf = ${(1 + af).toFixed(2).replace('.', ',')})).`);
    if (fl.q > limiteQ) msgs.push(`Flecha das variáveis ${(fl.q * 1000).toFixed(1)} mm > ℓ/${op.limiteFlechaSensorial} = ${(limiteQ * 1000).toFixed(1)} mm.`);
    const txt = (x: ReturnType<typeof chooseBars>) => (x ? `${x.n} φ${String(x.phi).replace('.', ',')}${x.layers > 1 ? ` (${x.layers} camadas)` : ''}` : '—');
    if (!bi && AsInf > 0) msgs.push('Armadura inferior não cabe na largura.');
    if ((aPos.aco === 'CA-60' && (bi?.phi ?? 0) > 10) || (aNeg.aco === 'CA-60' && (bs?.phi ?? 0) > 10)) msgs.push(AVISO_CA60);
    out.push({
      viga: v.id, nome: v.nome, grupo: v.grupo, b: v.secao.b, h: v.secao.h, L: comprimentoPolilinha(v.pontos),
      flecha, limite, flechaQ: fl.q, limiteQ,
      Mpos, Mneg, V, envoltoria: envolt, facesPilar, origens: [
        origem('Armadura inferior', envolt.determinantes.Mmax, 'flexao'),
        ...(AsSup ? [origem('Armadura superior', envolt.determinantes.Mmin, 'flexao')] : []),
        origem('Estribos (cortante)', envolt.determinantes.V, 'cortante'),
        ...(env.T > 0 ? [origem('Torção', envolt.determinantes.T, 'torcao')] : []),
        ...(delta < 1 ? [origem('Redistribuição nos apoios', `δ = ${delta.toFixed(2).replace('.', ',')}`, 'redistribuicao')] : []),
        origem('Flecha', COMB_QP, 'flechaViga'),
        origem('Fissuração', COMB_FREQ, 'fissura'),
      ], T: env.T, AslTorcao: env.Asl, AsLateral, barrasLaterais: lat ? `${lat.n} φ${String(lat.phi).replace('.', ',')} por face` : '—', al, biela: env.biela, delta, wk: [wkI, wkS], wkLim,
      AsInf, AsSup, AsNec, barrasInf: txt(bi), barrasSup: AsSup ? txt(bs) : '—',
      estribo: est ? `φ${String(est.phi).replace('.', ',')} c/${Math.round(est.s * 100)}${est.legs > 2 ? ` (${est.legs} ramos)` : ''}` : '—',
      status: msgs.some((x) => x.startsWith('Biela') || x.startsWith('Armadura inferior') || x.startsWith('Armadura bloqueada insuficiente') || x.startsWith('Flecha') || x.startsWith('Abertura')) ? 'fail' : 'ok', mensagens: msgs,
      bloqueada: bloq, arranjo: { inf: bi ? { n: bi.n, phi: bi.phi } : null, sup: AsSup && bs ? { n: bs.n, phi: bs.phi } : null, estribo: est ? { phi: est.phi, s: est.s, ...(est.legs > 2 ? { legs: est.legs } : {}) } : null, laterais: lat ? { n: lat.n, phi: lat.phi } : null },
    });
  }
  return out;
}

/**
 * Flechas imediatas de uma viga por vão: cadeias de barras do pórtico entre pilares (ou pontas), curvatura
 * κ = M/EI(M) integrada (Mohr): vão apoiado → deslocamento relativo à reta dos apoios, d(x) = ∫κ·G(x, ξ);
 * balanço (ponta sem pilar nem outra viga) → d = −∫κ·|ξ − x_livre| com tangente fixa no apoio.
 */
export function flechasViga(an: AnaliseEdificio, membros: number[], noPilar: Set<number>, usoNo: Map<number, number>, EI: (M: number) => number, fQP: Record<string, number>, fQ: Record<string, number>) {
  const pm = an.portico, mb = pm.modelo.barras;
  const cadeias = cadeiasViga(an, membros, noPilar);
  const out = { qp: 0, q: 0, vao: 1, vaoQ: 1, balanco: false, balancoQ: false };
  for (const cad of cadeias) {
    const est: { x: number; kqp: number; kq: number; dx: number }[] = [];
    let x0 = 0;
    for (const bi of cad) {
      const { L } = baseBarra(pm.modelo, mb[bi]);
      const n = Math.max(8, Math.ceil(L / 0.1)), xs = Array.from({ length: n }, (_, k) => ((k + 0.5) * L) / n);
      const pc = porCaso(an, bi, xs, true);
      xs.forEach((x, k) => {
        const Mqp = Object.entries(fQP).reduce((t, [cs, f]) => t + f * (pc[cs]?.[k]?.Mz ?? 0), 0), Mq = Object.entries(fQ).reduce((t, [cs, f]) => t + f * (pc[cs]?.[k]?.Mz ?? 0), 0);
        const ei = EI(Mqp);
        est.push({ x: x0 + x, kqp: Mqp / ei, kq: Mq / ei, dx: L / n });
      });
      x0 += L;
    }
    const L = x0, a = mb[cad[0]].i, z = mb[cad.at(-1)!].j;
    const livre = (no: number) => !noPilar.has(no) && (usoNo.get(no) ?? 0) <= 1;
    const balanco = livre(a) !== livre(z) ? (livre(a) ? 0 : L) : null;
    let dqp = 0, dq = 0;
    if (balanco !== null) {
      for (const e of est) { dqp -= e.kqp * Math.abs(e.x - balanco) * e.dx; dq -= e.kq * Math.abs(e.x - balanco) * e.dx; }
      dqp = Math.abs(dqp); dq = Math.abs(dq);
    } else {
      for (let k = 0; k <= 20; k++) {
        const x = (k * L) / 20;
        let wqp = 0, wq = 0;
        for (const e of est) { const G = e.x <= x ? (e.x * (L - x)) / L : (x * (L - e.x)) / L; wqp += e.kqp * G * e.dx; wq += e.kq * G * e.dx; }
        dqp = Math.max(dqp, wqp); dq = Math.max(dq, wq);
      }
    }
    if (dqp / (balanco !== null ? 2 * L : L) > out.qp / (out.balanco ? 2 * out.vao : out.vao)) { out.qp = dqp; out.vao = L; out.balanco = balanco !== null; }
    if (dq / (balanco !== null ? 2 * L : L) > out.q / (out.balancoQ ? 2 * out.vaoQ : out.vaoQ)) { out.q = dq; out.vaoQ = L; out.balancoQ = balanco !== null; }
  }
  return out;
}

// ---------------- pilares ----------------

export interface ResultadoPilar {
  pilar: string; nome: string; pavimento: string; secao: string; Nd: number; util: number; lambda: [number, number];
  /** Maior cortante de cálculo (kN). */
  Vd?: number;
  /** Id do lance (pavimento do topo). */
  pavimentoId?: string;
  /** Armadura editada e bloqueada (só verificada) e o arranjo adotado (para o editor). */
  bloqueada?: boolean;
  arranjo?: { phi: number; n?: number; nb?: number; nh?: number; /** faces superior e direita, quando diferem de nb e nh (arranjo não simétrico) */ nbS?: number; nhD?: number; estribo: { phi: number; s: number } };
  /** Combinações determinantes: Nd (kN, + compressão), momentos de 1ª ordem nas pontas (base, topo) por direção e de cálculo com 2ª ordem (kN·m). */
  determinantes?: { combinacao: string; Nd: number; Mu: [number, number]; Mv: [number, number]; MuTot: number; MvTot: number; tracao: boolean }[];
  /** Origem de cada grandeza: combinação determinante, fórmula e item da NBR 6118. */
  origens?: Origem[];
  /** Comprimentos de flambagem (m) nas direções u (ao longo de b) e v. */
  le: [number, number];
  armadura: string; As: number; estribo: string; status: 'ok' | 'fail' | 'review'; mensagens: string[];
}

/** Barras no contorno interno do retângulo b × h (u ao longo de b) ou do círculo, com espaçamento até `s`. */
type ArranjoPilar = { n: number } | { nb: number; nh: number; nbS?: number; nhD?: number };

/** Arranjo com espaçamento até `s`: n barras no círculo ou barras por face (com os cantos) no retângulo. */
function arranjoPorEspacamento(poly: Pt[], circ: number | null, a: number, s: number): ArranjoPilar {
  if (circ) return { n: Math.max(6, Math.ceil((2 * Math.PI * (circ / 2 - a)) / s)) };
  const [w, h] = [poly[1][0], poly[2][1]];
  return { nb: Math.max(1, Math.ceil((w - 2 * a) / s - 1e-9)) + 1, nh: Math.max(1, Math.ceil((h - 2 * a) / s - 1e-9)) + 1 };
}

/** Barras no contorno interno do retângulo b × h (u ao longo de b) ou do círculo para um arranjo dado. */
function barrasDoArranjo(poly: Pt[], circ: number | null, a: number, arr: ArranjoPilar, Ab: number): RBar[] {
  if (circ || 'n' in arr) { const D = circ ?? 0, rs = D / 2 - a, n = 'n' in arr ? arr.n : 6; return Array.from({ length: n }, (_, k) => ({ x: D / 2 + rs * Math.cos((2 * Math.PI * k) / n), y: D / 2 + rs * Math.sin((2 * Math.PI * k) / n), A: Ab })); }
  const [w, h] = [poly[1][0], poly[2][1]];
  if ((arr.nbS !== undefined && arr.nbS !== arr.nb) || (arr.nhD !== undefined && arr.nhD !== arr.nh)) {
    // faces opostas com números diferentes de barras (arranjo não simétrico): cantos + intermediárias de cada face
    const out: RBar[] = [{ x: a, y: a, A: Ab }, { x: w - a, y: a, A: Ab }, { x: a, y: h - a, A: Ab }, { x: w - a, y: h - a, A: Ab }];
    const face = (n: number, f: (t: number) => RBar) => { for (let i = 1; i < n - 1; i++) out.push(f(i / (n - 1))); };
    face(arr.nb, (t) => ({ x: a + (w - 2 * a) * t, y: a, A: Ab })); face(arr.nbS ?? arr.nb, (t) => ({ x: a + (w - 2 * a) * t, y: h - a, A: Ab }));
    face(arr.nh, (t) => ({ x: a, y: a + (h - 2 * a) * t, A: Ab })); face(arr.nhD ?? arr.nh, (t) => ({ x: w - a, y: a + (h - 2 * a) * t, A: Ab }));
    return out;
  }
  const nx = Math.max(1, arr.nb - 1), ny = Math.max(1, arr.nh - 1);
  const out: RBar[] = [];
  for (let i = 0; i <= nx; i++) { const x = a + ((w - 2 * a) * i) / nx; out.push({ x, y: a, A: Ab }, { x, y: h - a, A: Ab }); }
  for (let j = 1; j < ny; j++) { const y = a + ((h - 2 * a) * j) / ny; out.push({ x: a, y, A: Ab }, { x: w - a, y, A: Ab }); }
  return out;
}

/** Utilização da seção à flexão oblíqua (momentos em MN·m); armadura não simétrica: pior dos quatro quadrantes. */
function utilFlexao(S: FiberSection, N: number, mu: number, mv: number, simetrica: boolean): number {
  const qs = simetrica ? [[mu, mv]] : [[mu, mv], [-mu, mv], [mu, -mv], [-mu, -mv]];
  let u = 0;
  for (const [a, c] of qs) { const R = fiberCapacity(S, N, a, c); u = Math.max(u, R === null ? 99 : Math.hypot(mu, mv) / 1000 / R); }
  return u;
}

/** Distribuições de N barras (cantos + intermediárias) pelas quatro faces, das mais equilibradas às menos; faces opostas ordenadas (k0 ≥ k1). */
function distribuicoes(N: number, lb: number, lh: number, spMax: number, spMin: number, max = 12): { nb: number; nbS: number; nh: number; nhD: number }[] {
  const K = N - 4;
  if (K < 0) return [];
  const kmin = (L: number) => Math.max(0, Math.ceil(L / spMax - 1e-9) - 1), kmax = (L: number) => Math.max(kmin(L), Math.floor(L / spMin + 1e-9) - 1);
  const out: { nb: number; nbS: number; nh: number; nhD: number; sc: number; v: number }[] = [];
  for (let k0 = kmin(lb); k0 <= kmax(lb); k0++) for (let k1 = kmin(lb); k1 <= k0; k1++) for (let k2 = kmin(lh); k2 <= kmax(lh); k2++) {
    const k3 = K - k0 - k1 - k2;
    if (k3 < kmin(lh) || k3 > k2) continue;
    const d = [k0 / lb, k1 / lb, k2 / lh, k3 / lh], m = d.reduce((t, x) => t + x, 0) / 4;
    out.push({ nb: k0 + 2, nbS: k1 + 2, nh: k2 + 2, nhD: k3 + 2, sc: k0 - k1 + (k2 - k3), v: d.reduce((t, x) => t + (x - m) ** 2, 0) });
  }
  return out.sort((p, q) => p.sc - q.sc || p.v - q.v).slice(0, max);
}

function dimensionarPilares(b: BuildingModel, an: AnaliseEdificio, elu: CombinacaoEd[]): ResultadoPilar[] {
  const FYD = acoDe(b, 'pilarLong').fyd, acoLong = acoDe(b, 'pilarLong').aco;
  const pm = an.portico, out: ResultadoPilar[] = [], op = an.opcoes;
  for (const p of b.pilares) {
  // de cima para baixo: o último e o penúltimo lances pelos seus esforços; abaixo, com a opção de continuidade,
  // nenhum lance com menos armadura nem bitola de canto menor que o de cima (critério do programa de referência)
  const ls = lancesDoPilar(b, p), res: ResultadoPilar[] = [];
  let acima: { As: number; phi: number; arr: ArranjoPilar; sec: string } | null = null;
  for (let li = ls.length - 1; li >= 0; li--) {
    const lance = ls[li], cont = op.continuidadePilares && li <= ls.length - (op.pilarContinuidadeInicio ? 3 : 2) && acima ? acima : null;
    const c = concretoDe(b, 'pilar', lance.id), cob = cobrimentoPilar(b, p.cobrimento);
    const bi = pm.barras.findIndex((t) => t.tipo === 'pilar' && t.ref === p.id && t.pavimento === lance.id);
    if (bi < 0) continue;
    const s = secaoNoLance(p, lance.id), [w, h] = dimsSecao(s);
    const circ = s.tipo === 'circ' ? s.d : null;
    const { L } = baseBarra(pm.modelo, pm.modelo.barras[bi]);
    const pc = porCaso(an, bi, [0, L]);
    const poly: Pt[] = circ ? circlePolygon(circ) : [[0, 0], [w, 0], [w, h], [0, h]];
    const P = polyProps(poly), Ac = circ ? (Math.PI * circ * circ) / 4 : w * h;
    const iu = Math.sqrt(P.Iy / P.A), iv = Math.sqrt(P.Ix / P.A); // u ao longo de x da seção (b), v ao longo de y (h)
    // comprimento de flambagem por direção: ℓe = mín(ℓ0 + h; ℓ) × α (NBR 6118, 15.6; nós contraventados pelo diafragma)
    const fl = flambagemLance(b, p, lance.id), lamU = fl.leU / iu, lamV = fl.leV / iv, le: [number, number] = [fl.leU, fl.leV];
    const gn = gammaNFor(Math.min(w, h));
    const msgs: string[] = [];
    if (Math.max(lamU, lamV) > 200) { res.push({ pilar: p.id, nome: p.nome, pavimento: lance.nome, secao: secTxt(s), Nd: 0, util: 99, lambda: [lamU, lamV], le, armadura: '—', As: 0, estribo: '—', status: 'fail', mensagens: ['λ > 200.'] }); continue; }
    // solicitações por combinação: Nd (compressão +), momentos nas duas direções nas duas pontas (u: flexão com deslocamento ao longo de b → Mz local)
    const sol = elu.map((cb) => {
      const N0 = -comb(pc, cb, 0, 'N') * gn, NL = -comb(pc, cb, 1, 'N') * gn;
      return { nome: cb.nome, Nd: Math.max(N0, NL), Nt: Math.min(N0, NL), Mu: [comb(pc, cb, 0, 'Mz') * gn, comb(pc, cb, 1, 'Mz') * gn], Mv: [comb(pc, cb, 0, 'My') * gn, comb(pc, cb, 1, 'My') * gn] };
    });
    const NdMax = Math.max(0, ...sol.map((x) => x.Nd));
    const AsMin = Math.max((0.15 * NdMax) / 1000 / FYD, 0.004 * Ac), AsMax = 0.04 * Ac;
    // combinações determinantes (Nd máx./mín., maiores momentos em cada direção e a maior soma relativa)
    const am = (m: number[]) => Math.max(Math.abs(m[0]), Math.abs(m[1]));
    const comp = sol.filter((x) => x.Nd > 0), pick = new Set<number>();
    const arg = (f: (x: (typeof sol)[number]) => number) => comp.reduce((bi, x, i) => (f(x) > f(comp[bi]) ? i : bi), 0);
    if (comp.length) for (const f of [(x: (typeof sol)[number]) => x.Nd, (x: (typeof sol)[number]) => -x.Nd, (x: (typeof sol)[number]) => am(x.Mu), (x: (typeof sol)[number]) => am(x.Mv), (x: (typeof sol)[number]) => am(x.Mu) / w + am(x.Mv) / h]) pick.add(arg(f));
    const solD = [...pick].map((i) => comp[i]);
    // tração (N < 0 numa das pontas): mais tracionada e maiores momentos; sem efeitos de 2ª ordem nem M1d,mín
    const tra = sol.filter((x) => x.Nt < 0), pickT = new Set<number>();
    const argT = (f: (x: (typeof sol)[number]) => number) => tra.reduce((bi, x, i) => (f(x) > f(tra[bi]) ? i : bi), 0);
    if (tra.length) for (const f of [(x: (typeof sol)[number]) => -x.Nt, (x: (typeof sol)[number]) => am(x.Mu), (x: (typeof sol)[number]) => am(x.Mv)]) pickT.add(argT(f));
    const traD = [...pickT].map((i) => tra[i]);
    const mesh = fiberMesh(poly, circ ? 24 : 16);
    const direcao = (Nd: number, M: number[], hDir: number, lam: number, Le: number) => {
      const MA = Math.max(Math.abs(M[0]), Math.abs(M[1])), MB = Math.min(Math.abs(M[0]), Math.abs(M[1]));
      const M1min = Nd * (0.015 + 0.03 * hDir);
      // momentos internos com o mesmo sinal nas pontas = curvatura simples (MB/MA > 0); sinais opostos = curvatura dupla
      let ab = Math.max(0.4, Math.min(1, 0.6 + 0.4 * (MA > 0 ? (M[0] * M[1] > 0 ? MB / MA : -MB / MA) : 0)));
      if (MA < M1min) ab = 1;
      const lam1 = Math.max(35, Math.min(90, (25 + (12.5 * (MA / Math.max(Nd, 1e-9))) / hDir) / ab));
      const nu = Nd / 1000 / (Ac * c.fcd);
      const M2 = lam > lam1 ? ((Nd * Le * Le) / 10) * Math.min(0.005 / (hDir * (nu + 0.5)), 0.005 / hDir) : 0;
      const base = Math.max(MA, M1min);
      return { tot: Math.max(ab * base + M2, base), M1: base };
    };
    /** Maior utilização da armadura; com `parar`, devolve assim que passar de 1 (só interessa se atende). */
    let ultimoDet = '';
    const avaliar = (bars: RBar[], parar = false, simetrica = true) => {
      const S: FiberSection = { mesh, bars, cx: P.cx, cy: P.cy, c, fyd: FYD, poly };
      const { NRc, NRt } = fiberAxialRange(S);
      let util = 0, det = '';
      // mesma sequência de máximos do cálculo; guarda a combinação que deu o maior
      const sobe = (u: number, nome: string) => { const nu = Math.max(util, u); if (nu !== util) det = nome; util = nu; };
      for (const x of traD) {
        if (x.Nt / 1000 < NRt) { sobe(99, x.nome); continue; }
        const mu = am(x.Mu), mv = am(x.Mv);
        if (Math.hypot(mu, mv) < 1e-9) { sobe(x.Nt / 1000 / NRt, x.nome); continue; }
        sobe(utilFlexao(S, x.Nt / 1000, mu, mv, simetrica), x.nome);
        if (parar && util > 1) { ultimoDet = det; return util; }
      }
      for (const x of solD) {
        if (x.Nd / 1000 > NRc) { sobe(99, x.nome); continue; }
        const du = direcao(x.Nd, x.Mu, w, lamU, fl.leU), dv = direcao(x.Nd, x.Mv, h, lamV, fl.leV);
        // seção e armadura duplamente simétricas: um quadrante basta
        for (const [mu, mv] of [[du.tot, dv.M1], [du.M1, dv.tot]]) {
          sobe(utilFlexao(S, x.Nd / 1000, mu, mv, simetrica), x.nome);
          if (parar && util > 1) { ultimoDet = det; return util; }
        }
      }
      ultimoDet = det;
      return util;
    };
    type Escolha = { util: number; txt: string; As: number; phi: number; arr: ArranjoPilar; det: string };
    let melhor = null as Escolha | null;
    const tMin = circ ?? Math.min(w, h);
    // manter o número de barras de cada face do lance de cima (K1.12.4-21), quando a seção é a mesma
    const okFaces = (arr: ArranjoPilar) => {
      if (!op.pilarContinuidadeFaces || !cont || cont.sec !== secTxt(s)) return true;
      type Ar = { n?: number; nb?: number; nh?: number; nbS?: number; nhD?: number };
      const q = cont.arr as Ar, c = arr as Ar;
      return circ ? (c.n ?? 0) >= (q.n ?? 0) : (c.nb ?? 2) >= (q.nb ?? 2) && (c.nh ?? 2) >= (q.nh ?? 2) && (c.nbS ?? c.nb ?? 2) >= (q.nbS ?? q.nb ?? 2) && (c.nhD ?? c.nh ?? 2) >= (q.nhD ?? q.nh ?? 2);
    };
    // armadura bloqueada (editada): verificação completa com as barras dadas, sem redimensionar
    const nLances = lancesDoPilar(b, p).length, armB = p.armaduras?.find((x) => x.pavimento === lance.id);
    const bloq = !!armB && armB.lances === nLances;
    if (armB && !bloq) msgs.push('Armadura bloqueada desconsiderada: o número de lances do pilar mudou e o lance foi redimensionado.');
    if (armB && bloq) {
      const arr: ArranjoPilar = armB.n !== undefined ? { n: armB.n } : { nb: armB.nb ?? 2, nh: armB.nh ?? 2, ...(armB.nbS !== undefined ? { nbS: armB.nbS } : {}), ...(armB.nhD !== undefined ? { nhD: armB.nhD } : {}) };
      const bars = barrasDoArranjo(poly, circ, cob + 0.005 + armB.phi / 2000, arr, barArea(armB.phi)), As = bars.length * barArea(armB.phi);
      if (As < AsMin - 1e-9) msgs.push(`Armadura bloqueada insuficiente: As ${(As * 1e4).toFixed(2).replace('.', ',')} cm² < As,mín ${(AsMin * 1e4).toFixed(2).replace('.', ',')} cm².`);
      if (As > AsMax + 1e-9) msgs.push(`Armadura bloqueada acima de 4 % (${(As * 1e4).toFixed(2).replace('.', ',')} cm²).`);
      melhor = { util: avaliar(bars, false, !('nbS' in arr || 'nhD' in arr)), txt: `${bars.length} φ${String(armB.phi).replace('.', ',')}`, As, phi: armB.phi, arr, det: ultimoDet };
    }
    // tabela de armadura (R7a): bitolas e espaçamentos das disposições; simetria por tolerância (opção pilarSimetria)
    const tabP = tabelaDe(b, 'pilares', p.tabela), restrito = pilarRestrito(tabP);
    const buscar = (phis: number[], esps: number[]) => {
      busca: for (const phi of bloq ? [] : phis) {
        if (phi < 10 || phi > 25 || phi / 1000 > tMin / 8 || (cont && phi < cont.phi)) continue; // φ10 a φ25 (premissa dim-pilares); continuidade
        const a = cob + 0.005 + phi / 2000, Ab = barArea(phi), wi = w - 2 * a, hi = h - 2 * a;
        const cands = esps.map((sp) => { const arr = arranjoPorEspacamento(poly, circ, a, sp); return { arr, bars: barrasDoArranjo(poly, circ, a, arr, Ab) }; }).filter(({ bars, arr }) => { const As = bars.length * Ab; return As >= Math.max(AsMin, cont?.As ?? 0) - 1e-12 && As <= AsMax && okFaces(arr); });
        const anota = ({ bars, arr }: (typeof cands)[number], u: number) => { const As = bars.length * Ab, m = melhor as Escolha | null; if (!m || u < m.util || (u <= 1 && m.util <= 1 && As < m.As)) melhor = { util: u, txt: `${bars.length} φ${String(phi).replace('.', ',')}`, As, phi, arr, det: ultimoDet }; };
        // disposição simétrica (as duas faces opostas iguais): a mais densa primeiro; se nem ela atende, a bitola inteira não atende
        let sim: { cd: (typeof cands)[number]; u: number } | null = null;
        if (cands.length) {
          const uMax = avaliar(cands.at(-1)!.bars);
          anota(cands.at(-1)!, uMax);
          if (uMax <= 1) {
            sim = { cd: cands.at(-1)!, u: uMax };
            for (const cd of cands.slice(0, -1)) {
              const u = avaliar(cd.bars, true);
              anota(cd, u);
              if (u <= 1) { sim = { cd, u }; break; }
            }
          }
        }
        // disposição de menor armadura, possivelmente não simétrica: menor número de barras que atende (bisseção), quatro quadrantes
        if (!circ && op.pilarSimetria < 1000) {
          const spMax = Math.max(...esps), spMin = Math.min(...esps);
          const kmin = (L: number) => Math.max(0, Math.ceil(L / spMax - 1e-9) - 1), kmax = (L: number) => Math.max(kmin(L), Math.floor(L / spMin + 1e-9) - 1);
          const Nsim = sim ? sim.cd.bars.length : Infinity;
          const lo0 = Math.max(4 + 2 * kmin(wi) + 2 * kmin(hi), Math.ceil(Math.max(AsMin, cont?.As ?? 0) / Ab - 1e-9)), hiG = Math.min(4 + 2 * kmax(wi) + 2 * kmax(hi), Math.floor(AsMax / Ab + 1e-9));
          type Ach = { arr: ArranjoPilar; bars: RBar[]; u: number; simetrica: boolean };
          const memo = new Map<string, Ach | null>();
          /** Primeira disposição de N barras que atende (as simétricas primeiro); `soSim`: só as duplamente simétricas. */
          const passa = (N: number, soSim = false) => {
            const k = `${N}|${soSim}`;
            if (memo.has(k)) return memo.get(k)!;
            let ach: Ach | null = null;
            for (const d of distribuicoes(N, wi, hi, spMax, spMin)) {
              const simetrica = d.nbS === d.nb && d.nhD === d.nh;
              if (soSim && !simetrica) continue;
              const arr: ArranjoPilar = { nb: d.nb, nh: d.nh, ...(d.nbS !== d.nb ? { nbS: d.nbS } : {}), ...(d.nhD !== d.nh ? { nhD: d.nhD } : {}) };
              if (!okFaces(arr)) continue;
              const bars = barrasDoArranjo(poly, circ, a, arr, Ab), u = avaliar(bars, true, simetrica);
              if (u <= 1) { ach = { arr, bars, u, simetrica }; break; }
            }
            memo.set(k, ach);
            return ach;
          };
          const hiN = Math.min(hiG, Nsim - 1);
          let sel: Ach | null = null;
          if (lo0 <= hiN && passa(hiN)) {
            let lo = lo0, hi2 = hiN;
            while (lo < hi2) { const m = Math.floor((lo + hi2) / 2); if (passa(m)) hi2 = m; else lo = m + 1; }
            sel = passa(lo);
          } else if (lo0 <= hiN && !sim && Number.isFinite(hiN)) {
            // nada atende: guarda a disposição mais densa para mostrar a utilização (como a simétrica mais densa)
            const d = distribuicoes(hiN, wi, hi, spMax, spMin, 1)[0];
            if (d) { const arr: ArranjoPilar = { nb: d.nb, nh: d.nh, ...(d.nbS !== d.nb ? { nbS: d.nbS } : {}), ...(d.nhD !== d.nh ? { nhD: d.nhD } : {}) }; const bars = barrasDoArranjo(poly, circ, a, arr, Ab); anota({ arr, bars }, avaliar(bars, false, d.nbS === d.nb && d.nhD === d.nh)); }
          }
          // melhor simétrica: a própria escolhida, a próxima duplamente simétrica que atende ou a da busca por espaçamento
          let simAlt: Ach | null = null;
          if (sel?.simetrica) simAlt = sel;
          else if (sel) {
            for (let N = sel.bars.length + 1; N < Math.min(Nsim, hiG + 1) && !simAlt; N++) simAlt = passa(N, true);
            if (!simAlt && sim) simAlt = { arr: sim.cd.arr, bars: sim.cd.bars, u: sim.u, simetrica: true };
          }
          // a simétrica vale se a sua armadura não passa da melhor em mais que a tolerância
          const escolhida = sel && simAlt && simAlt.bars.length <= sel.bars.length * (1 + op.pilarSimetria / 100) + 1e-9 ? simAlt : sel;
          if (escolhida) {
            anota({ arr: escolhida.arr, bars: escolhida.bars }, avaliar(escolhida.bars, false, escolhida.simetrica)); // refaz a avaliação: utilização exata e combinação determinante
            break busca;
          }
        }
        if (sim) break busca;
      }
    };
    buscar(bitolasPilar(tabP), espacamentosPilar(tabP));
    let foraTabelaPilar = false;
    if (restrito && !bloq && (!melhor || (melhor as Escolha).util > 1)) {
      // reserva (R7a): armadura própria fora da tabela, em uma camada no contorno (bitolas e espaçamentos de fábrica)
      const daTabela = melhor as Escolha | null;
      melhor = null;
      buscar(BITOLAS_TABELA.pilares, ESPACAMENTOS_PILAR.map((x) => x / 100));
      if (melhor && (melhor as Escolha).util <= 1) foraTabelaPilar = true; else melhor = melhor ?? daTabela;
    }
    if (!melhor) { res.push({ pilar: p.id, nome: p.nome, pavimento: lance.nome, secao: secTxt(s), Nd: NdMax, util: 99, lambda: [lamU, lamV], le, armadura: '—', As: 0, estribo: '—', status: 'fail', mensagens: [restrito ? `Armadura manual necessária: nenhuma disposição da tabela "${tabP.nome}" entre As,mín e 4 % cabe na seção; amplie a tabela ou a seção.` : 'Nenhuma armadura entre As,mín e 4 % cabe na seção.'] }); continue; }
    let status: ResultadoPilar['status'] = melhor.util <= 1 ? 'ok' : 'fail';
    if (Math.max(lamU, lamV) > 90) { status = 'review'; msgs.push('λ > 90: exige método mais refinado.'); }
    if (gn > 1) msgs.push(`γn = ${gn.toFixed(2)} (menor dimensão < 19 cm).`);
    if (tra.length) msgs.push(`Tração em ${tra.length} combinação(ões): até ${(-Math.min(...tra.map((x) => x.Nt))).toFixed(0)} kN (verificada sem 2ª ordem).`);
    if (acoLong === 'CA-60' && melhor.phi > 10) msgs.push(AVISO_CA60);
    if (melhor.util > 1) msgs.push(bloq ? `Armadura bloqueada insuficiente: utilização ${melhor.util.toFixed(2).replace('.', ',')} > 1.` : restrito ? `Armadura manual necessária: nem a tabela "${tabP.nome}" nem armadura própria até 4 % atendem; amplie a tabela ou a seção.` : 'Não atende com até 4 % de armadura: aumente a seção.');
    if (foraTabelaPilar) msgs.push(`Fora de tabela (pilar): nenhuma disposição da tabela "${tabP.nome}" atende; armadura própria ${melhor.txt}.`);
    // cortante (17.4, modelo I com θ = 45°): na flexo-compressão Vc = Vc0·(1 + M0/Msd,máx) ≤ 2·Vc0 (17.4.2.2 c),
    // M0 = momento de descompressão com N de γf = 1,0 (Nd/γg) e W/A da seção; com tração Vc = 0; pilar comprimido
    // com Vsd ≤ Vc dispensa o mínimo de 17.4.1.1.1 e fica com o estribo construtivo (18.4.3)
    const a = cob + 0.005 + melhor.phi / 2000, gg = gamas(b).g;
    const dirs: { bw: number; d: number; WA: number; M: 'Mz' | 'My' }[] = circ ? [{ bw: circ, d: 0.8 * circ, WA: circ / 8, M: 'Mz' }] : [{ bw: h, d: w - a, WA: w / 6, M: 'Mz' }, { bw: w, d: h - a, WA: h / 6, M: 'My' }];
    let asw = 0, Vd = 0, biela = 0, cVd = '';
    for (const cb of elu) for (const i of [0, 1]) {
      const Vy = comb(pc, cb, i, 'Vy') * gn, Vz = comb(pc, cb, i, 'Vz') * gn, Nc = -comb(pc, cb, i, 'N'), comp = Nc > 0;
      const Vs = circ ? [Math.hypot(Vy, Vz)] : [Math.abs(Vy), Math.abs(Vz)];
      Vs.forEach((V, k) => {
        const { bw, d, WA } = dirs[k], Vc0 = 0.6 * c.fctd * bw * d * 1000, VRd2 = 0.27 * c.av2 * c.fcd * bw * d * 1000;
        const Msd = circ ? Math.max(Math.hypot(comb(pc, cb, 0, 'Mz'), comb(pc, cb, 0, 'My')), Math.hypot(comb(pc, cb, 1, 'Mz'), comb(pc, cb, 1, 'My'))) * gn : Math.max(Math.abs(comb(pc, cb, 0, dirs[k].M)), Math.abs(comb(pc, cb, 1, dirs[k].M))) * gn;
        const Vc = comp ? Math.min(2 * Vc0, Vc0 * (1 + (Msd > 1e-9 ? ((Nc / gg) * WA) / Msd : 1))) : 0;
        if (V > Vd) cVd = cb.nome;
        Vd = Math.max(Vd, V); biela = Math.max(biela, V / VRd2);
        if (V > Vc) asw = Math.max(asw, ((0.2 * c.fctm) / acoDe(b, 'pilarEstribo').fyk) * bw, (V - Vc) / 1000 / (0.9 * d * Math.min(acoDe(b, 'pilarEstribo').fyk / gamas(b).s, 435)));
      });
    }
    if (biela > 1) { status = 'fail'; msgs.push(`Biela comprimida no cortante: Vsd/VRd2 = ${biela.toFixed(2).replace('.', ',')}.`); }
    const phiT = Math.max(5, melhor.phi / 4), sT = Math.min(0.2, Math.min(w, h), (12 * melhor.phi) / 1000);
    // tipologia do estribo da tabela (R7a): φt mínimo e espaçamento máximo por bitola longitudinal
    const rowT = estriboDaTabelaPilar(tabP, melhor.phi), sTab = rowT?.sMax ? Math.min(sT, rowT.sMax / 100) : sT;
    const estC = { phi: Math.max(phiT === 5 ? 5 : 6.3, rowT?.phiT ?? 0), s: Math.floor(sTab * 100) / 100 };
    const estV = asw > 0 ? chooseStirrup(asw, sTab, estC.phi) : null;
    let est: { phi: number; s: number } = estV && estV.s < estC.s ? estV : estC;
    if (armB && bloq) {
      // estribo bloqueado: φt ≥ máx(5; φℓ/4), s ≤ mín(20 cm; menor lado; 12φℓ) (18.4.2 e 18.4.3) e cortante
      est = armB.estribo;
      const falta: string[] = [];
      if (est.phi < Math.max(5, armB.phi / 4) - 1e-9) falta.push(`φt ${String(est.phi).replace('.', ',')} < φℓ/4`);
      if (est.s > sT + 1e-9) falta.push(`s ${Math.round(est.s * 100)} cm > ${Math.floor(sT * 100)} cm`);
      if (asw > 0 && (2 * barArea(est.phi)) / est.s < asw - 1e-9) falta.push(`Asw/s ${((2 * barArea(est.phi)) / est.s * 1e4).toFixed(2).replace('.', ',')} < ${(asw * 1e4).toFixed(2).replace('.', ',')} cm²/m do cortante`);
      if (falta.length) msgs.push(`Armadura bloqueada insuficiente: estribo (${falta.join('; ')}).`);
    } else if (estV && est === estV) msgs.push(`Estribos pelo cortante: Vsd = ${Vd.toFixed(1)} kN.`);
    if (msgs.some((x) => x.startsWith('Armadura bloqueada insuficiente') || x.startsWith('Armadura bloqueada acima'))) status = 'fail';
    const r2 = (x: number) => Math.round(x * 100) / 100;
    const determinantes = [
      ...solD.map((x) => { const du = direcao(x.Nd, x.Mu, w, lamU, fl.leU), dv = direcao(x.Nd, x.Mv, h, lamV, fl.leV); return { combinacao: x.nome, Nd: r2(x.Nd), Mu: x.Mu.map(r2) as [number, number], Mv: x.Mv.map(r2) as [number, number], MuTot: r2(du.tot), MvTot: r2(dv.tot), tracao: false }; }),
      ...traD.map((x) => ({ combinacao: x.nome, Nd: r2(x.Nt), Mu: x.Mu.map(r2) as [number, number], Mv: x.Mv.map(r2) as [number, number], MuTot: r2(Math.max(Math.abs(x.Mu[0]), Math.abs(x.Mu[1]))), MvTot: r2(Math.max(Math.abs(x.Mv[0]), Math.abs(x.Mv[1]))), tracao: true })),
    ];
    res.push({ pilar: p.id, pavimentoId: lance.id, nome: p.nome, pavimento: lance.nome, secao: secTxt(s), Nd: NdMax, Vd, determinantes, bloqueada: bloq, arranjo: { phi: melhor.phi, ...melhor.arr, estribo: { phi: est.phi, s: est.s } }, util: melhor.util,
      origens: [origem('Armadura longitudinal', melhor.det || '—', 'pilar'), origem('Armadura mínima e máxima', NdMax > 0 ? 'Nd máximo' : '—', 'pilarLimites'), origem('Estribos', cVd || '—', 'pilarEstribo')], lambda: [lamU, lamV], le, armadura: melhor.txt, As: melhor.As, estribo: `φ${String(est.phi).replace('.', ',')} c/${Math.round(est.s * 100)}`, status, mensagens: msgs });
    const ult = res.at(-1);
    if (ult && ult.pavimentoId === lance.id && ult.As > 0 && ult.arranjo) acima = { As: ult.As, phi: ult.arranjo.phi, arr: ult.arranjo as unknown as ArranjoPilar, sec: ult.secao };
  }
  out.push(...res.reverse());
  }
  return out;
}
const secTxt = (s: { tipo: 'ret'; b: number; h: number } | { tipo: 'circ'; d: number }) => (s.tipo === 'ret' ? `${Math.round(s.b * 100)}×${Math.round(s.h * 100)}` : `ø${Math.round(s.d * 100)}`);

// ---------------- lajes ----------------

export interface ResultadoLaje {
  laje: string; nome: string; pavimento: string; tipo: string; h: number;
  /** Momentos de cálculo por metro (kN·m/m) nas direções 0 (da malha) e 1. */
  mPos: [number, number]; mNeg: [number, number];
  As: { pos: [number, number]; neg: [number, number] }; // cm²/m
  flecha: number; limite: number;
  /** Flecha imediata só das variáveis e o limite sensorial (m). */
  flechaQ: number; limiteQ: number;
  /** Maior abertura de fissuras na combinação frequente (mm; maciças) e limite. */
  wk: number; wkLim: number;
  status: 'ok' | 'fail'; mensagens: string[];
  /** Origem de cada grandeza: combinação, fórmula e item da NBR 6118. */
  origens?: Origem[];
}

/** Bitola e espaçamento de laje para As (m²/m): a menor bitola com espaçamento ≥ 10 cm, até mín(2h; 20 cm). */
function barrasLaje(As: number, h: number, linha?: { bitolas: number[] }) {
  const smax = Math.min(2 * h, 0.2);
  for (const phi of [6.3, 8, 10, 12.5, 16].filter((p) => !linha || linha.bitolas.includes(p) || !linha.bitolas.some((q) => q >= 6.3))) { const s = Math.min(smax, barArea(phi) / As); if (s >= 0.1 || phi === 16) return { phi, s, As: barArea(phi) / s }; }
  return { phi: 16, s: 0.1, As: barArea(16) / 0.1 };
}

/**
 * Momentos de cálculo por metro de uma laje maciça nos nós da grelha (kN·m/m), por Wood-Armer:
 * mx, my das barras das duas direções e o volvente |mxy| (torção das barras / largura), cada um com média numa
 * faixa transversal de 1 m; armadura inferior mx* = mx + |mxy| (com as correções quando mx* < 0) e superior
 * mx*′ = mx − |mxy|. Os casos entram com γg (permanentes) e γq (variáveis); o volvente soma |γ·mxy| por caso.
 */
function momentosWoodArmer(g: GrelhaPavimento, lajeId: string, fat: number[]): { pos: [number, number]; neg: [number, number] } {
  const m = g.modelo, res = g.res!;
  type Acc = { mx: number[]; my: number[]; t: number[] };
  const acc = new Map<number, Acc>();
  let u: [number, number] | null = null, s = 0.25;
  m.barras.forEach((br, i) => {
    const tg = g.barras[i];
    if (tg.tipo !== 'laje' || tg.ref !== lajeId || tg.dir === undefined || !tg.largura) return;
    const a = m.nos[br.i], z = m.nos[br.j], L = Math.hypot(z[0] - a[0], z[1] - a[1]);
    if (tg.dir === 0 && !u) { u = [(z[0] - a[0]) / L, (z[1] - a[1]) / L]; s = L; }
    for (const [no, k] of [[br.i, 0], [br.j, 6]] as const) {
      const x = acc.get(no) ?? { mx: [], my: [], t: [] };
      // momento interno (+ traciona embaixo) e torção nas pontas, por metro, já combinados
      const M = fat.reduce((t, f, ic) => t + f * (k === 0 ? -res.esforcos[ic][i][5] : res.esforcos[ic][i][11]), 0) / tg.largura;
      const T = fat.reduce((t, f, ic) => t + Math.abs(f * res.esforcos[ic][i][k + 3]), 0) / tg.largura;
      (tg.dir === 0 ? x.mx : x.my).push(M);
      x.t.push(T);
      acc.set(no, x);
    }
  });
  if (!acc.size || !u) return { pos: [0, 0], neg: [0, 0] };
  const media = (v: number[]) => (v.length ? v.reduce((a, c) => a + c, 0) / v.length : 0);
  const nos = [...acc.keys()], uu = u as [number, number], vv: [number, number] = [-uu[1], uu[0]];
  const val = new Map(nos.map((n) => { const x = acc.get(n)!; return [n, { mx: media(x.mx), my: media(x.my), t: media(x.t), tem: [x.mx.length > 0, x.my.length > 0] }]; }));
  const pos: [number, number] = [0, 0], neg: [number, number] = [0, 0];
  // grade de busca: a faixa (|d·ax| < s/2, |d·tr| ≤ 0,5) cabe no círculo de raio R; candidatos na ordem de `nos`
  const R = Math.hypot(s / 2, 0.5) + 1e-3, cel = new Map<string, number[]>();
  const chave = (x: number, y: number) => `${Math.floor(x / R)}:${Math.floor(y / R)}`;
  nos.forEach((q, iq) => { const k = chave(m.nos[q][0], m.nos[q][1]); const l = cel.get(k); if (l) l.push(iq); else cel.set(k, [iq]); });
  for (const n of nos) {
    const p = m.nos[n], gx = Math.floor(p[0] / R), gy = Math.floor(p[1] / R), cand: number[] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const iq of cel.get(`${gx + dx}:${gy + dy}`) ?? []) cand.push(iq);
    cand.sort((a, z) => a - z);
    const perto = cand.map((iq) => nos[iq]);
    // faixa de 1 m transversal a cada direção (mesma posição longitudinal, ± meia malha)
    const faixa = (dir: 0 | 1) => {
      const ax = dir === 0 ? uu : vv, tr = dir === 0 ? vv : uu;
      const ns = perto.filter((q) => { const d = [m.nos[q][0] - p[0], m.nos[q][1] - p[1]]; return val.get(q)!.tem[dir] && Math.abs(d[0] * ax[0] + d[1] * ax[1]) < s / 2 + 1e-6 && Math.abs(d[0] * tr[0] + d[1] * tr[1]) <= 0.5 + 1e-6; });
      return { M: media(ns.map((q) => (dir === 0 ? val.get(q)!.mx : val.get(q)!.my))), t: media(ns.map((q) => val.get(q)!.t)) };
    };
    const fx = faixa(0), fy = faixa(1), w = woodArmer(fx.M, fy.M, Math.max(fx.t, fy.t));
    pos[0] = Math.max(pos[0], w.inf[0]); pos[1] = Math.max(pos[1], w.inf[1]);
    neg[0] = Math.min(neg[0], w.sup[0]); neg[1] = Math.min(neg[1], w.sup[1]);
  }
  return { pos, neg };
}

/**
 * Wood-Armer (sinal: + traciona embaixo): armadura inferior mx* = mx + |mxy|, my* = my + |mxy|; se um sair
 * negativo, ele vira 0 e o outro = m + mxy²/|m do primeiro|. Superior análogo com sinais trocados (valores ≤ 0).
 */
export function woodArmer(mx: number, my: number, mxy: number): { inf: [number, number]; sup: [number, number] } {
  const t = Math.abs(mxy);
  let ax = mx + t, ay = my + t;
  if (ax < 0) { ax = 0; ay = Math.abs(mx) > 1e-12 ? my + (t * t) / Math.abs(mx) : my; }
  else if (ay < 0) { ay = 0; ax = Math.abs(my) > 1e-12 ? mx + (t * t) / Math.abs(my) : mx; }
  let bx = mx - t, by = my - t;
  if (bx > 0) { bx = 0; by = Math.abs(mx) > 1e-12 ? my - (t * t) / Math.abs(mx) : my; }
  else if (by > 0) { by = 0; bx = Math.abs(my) > 1e-12 ? mx - (t * t) / Math.abs(my) : mx; }
  return { inf: [Math.max(0, ax), Math.max(0, ay)], sup: [Math.min(0, bx), Math.min(0, by)] };
}

/**
 * Maior flecha relativa aos apoios das linhas da malha da laje: em cada linha (cadeia de barras de uma direção),
 * deslocamento menos a reta entre as pontas (que estão sobre as vigas).
 */
function flechaRelativa(g: GrelhaPavimento, lajeId: string, fat: number[]): number {
  const m = g.modelo, res = g.res!;
  const w = (n: number) => fat.reduce((t, f, ic) => t + f * res.desloc[ic][n * 6 + 2], 0);
  let max = 0;
  for (const dir of [0, 1]) {
    const adj = new Map<number, number[]>();
    m.barras.forEach((br, i) => { const tg = g.barras[i]; if (tg.tipo !== 'laje' || tg.ref !== lajeId || tg.dir !== dir || !tg.largura) return; adj.set(br.i, [...(adj.get(br.i) ?? []), br.j]); adj.set(br.j, [...(adj.get(br.j) ?? []), br.i]); });
    const visto = new Set<number>();
    for (const [ini, vz] of adj) {
      if (vz.length !== 1 || visto.has(ini)) continue;
      const cad = [ini];
      visto.add(ini);
      for (;;) { const prox = adj.get(cad.at(-1)!)!.find((x) => !visto.has(x)); if (prox === undefined) break; cad.push(prox); visto.add(prox); }
      if (cad.length < 3) continue;
      const P = (n: number) => m.nos[n], L = Math.hypot(P(cad.at(-1)!)[0] - P(cad[0])[0], P(cad.at(-1)!)[1] - P(cad[0])[1]);
      const w0 = w(cad[0]), w1 = w(cad.at(-1)!);
      for (const n of cad) { const sx = Math.hypot(P(n)[0] - P(cad[0])[0], P(n)[1] - P(cad[0])[1]) / (L || 1); max = Math.max(max, -(w(n) - (w0 + sx * (w1 - w0)))); }
    }
  }
  return max;
}

function dimensionarLajes(b: BuildingModel, an: AnaliseEdificio): ResultadoLaje[] {
  const c = concretoDe(b, 'laje'), fInf = acoDe(b, 'lajeInf').fyd, fSup = acoDe(b, 'lajeSup').fyd, gm = gamas(b), op = an.opcoes;
  // natureza e ψ2 de cada caso, na ordem dos resultados da grelha
  const obra = casosDaObra(b), nat = an.casos.map((id) => obra.find((c) => c.id === id)?.natureza ?? 'G');
  const psiQP = an.casos.map((id) => { const c = obra.find((x) => x.id === id); return c?.natureza === 'Q' ? (c.psi?.[2] ?? b.norma.psiQ?.[2] ?? 0.3) : 0; });
  const fELU = nat.map((n) => (n === 'G' ? gm.g : n === 'H' ? gm.h : n === 'Q' ? gm.q : 0));
  const fQP = nat.map((n, ic) => (n === 'G' || n === 'H' ? 1 : n === 'Q' ? psiQP[ic] : 0)), fQ = nat.map((n) => (n === 'Q' ? 1 : 0));
  const fFreq = an.casos.map((id, ic) => { const c = obra.find((x) => x.id === id); return nat[ic] === 'G' || nat[ic] === 'H' ? 1 : nat[ic] === 'Q' ? (c?.psi?.[1] ?? b.norma.psiQ?.[1] ?? 0.4) : 0; });
  const caa = CAA_NUM[b.norma.caa], wkLim = op.limiteFissura || crackLimit(caa);
  const af = deltaXi(op.t0Flecha); // fluência (NBR 6118, 17.3.2.1.2), ρ′ = 0
  const fatorTotal = op.fatorFlechaLaje > 0 ? op.fatorFlechaLaje : 1 + af;
  const out: ResultadoLaje[] = [];
  // pavimentos do mesmo grupo com a mesma grelha (resultado reaproveitado na análise) dão o mesmo resultado
  const memo = new Map<unknown, Map<string, ResultadoLaje>>();
  for (const g of an.grelhas) {
    if (!g.res) continue;
    const pav = b.pavimentos.find((p) => p.id === g.pavimento)!;
    const ja = memo.get(g.res) ?? new Map<string, ResultadoLaje>();
    memo.set(g.res, ja);
    for (const l of b.lajes.filter((x) => x.grupo === pav.grupo)) {
      const r0 = ja.get(l.id);
      if (r0) { out.push({ ...r0, pavimento: pav.nome, mensagens: [...r0.mensagens] }); continue; }
      /** Momentos por metro (pos/neg nas duas direções) para os fatores dados por caso. */
      const momentos = (fat: number[]) => {
        let pos: [number, number] = [0, 0], neg: [number, number] = [0, 0], tem = false;
        g.modelo.barras.forEach((_, i) => {
          const t = g.barras[i];
          if (t.tipo !== 'laje' || t.ref !== l.id || t.dir === undefined || !t.largura) return;
          tem = true;
          if (op.woodArmer && l.tipo.tipo === 'macica') return;
          for (const k of [0, 6]) {
            // momento interno nas pontas (sinal de viga: + traciona embaixo); Σ fator·caso (casos verticais da grelha)
            const md = fat.reduce((s, f, ic) => s + f * (k === 0 ? -g.res!.esforcos[ic][i][5] : g.res!.esforcos[ic][i][11]), 0) / t.largura;
            pos[t.dir] = Math.max(pos[t.dir], md); neg[t.dir] = Math.min(neg[t.dir], md);
          }
        });
        if (tem && op.woodArmer && l.tipo.tipo === 'macica') ({ pos, neg } = momentosWoodArmer(g, l.id, fat));
        return { pos, neg, tem };
      };
      const mELU = momentos(fELU);
      if (!mELU.tem) continue;
      const { pos: mPos, neg: mNeg } = mELU;
      let wk = 0;
      const pr = propriedadesLaje(l.tipo), msgs: string[] = [];
      let As = { pos: [0, 0] as [number, number], neg: [0, 0] as [number, number] };
      // flecha relativa aos apoios: quase permanente × fator (fluência); sensorial: só as variáveis, imediata
      const fl = flechaRelativa(g, l.id, fQP) * fatorTotal, fq = flechaRelativa(g, l.id, fQ);
      const vao = Math.min(...vaos(l)), lim = vao / op.limiteFlechaTotal, limQ = vao / op.limiteFlechaSensorial;
      if (l.tipo.tipo === 'macica') {
        const h = l.tipo.h, cob = cobrimentoLaje(b, l.cobrimento), dI = h - cob.inf - 0.005, dS = h - cob.sup - 0.005;
        const sec = { kind: 'rect' as const, bw: 1, h };
        const amin = 0.0015 * h; // ρmín 0,15 % (fck ≤ 30) [a confirmar por fck]
        const a = (M: number, dd: number, fyd: number) => Math.max(amin, M ? beamFlexure(sec, false, Math.abs(M), dd, 0.02, c, fyd).As : 0) * 1e4;
        As = { pos: [a(mPos[0], dI, fInf), a(mPos[1], dI, fInf)], neg: [mNeg[0] < 0 ? a(mNeg[0], dS, fSup) : 0, mNeg[1] < 0 ? a(mNeg[1], dS, fSup) : 0] };
        // fissuração na combinação frequente (17.3.3.2), faixa de 1 m; aumenta a armadura até wk ≤ limite
        const mk = momentos(fFreq);
        let aumentou = false;
        const linha = linhaLajes(tabelaDe(b, 'lajes', l.tabela), h);
        const w = (Ascm: number, M: number, dd: number) => { if (!Ascm || !M) return 0; const br = barrasLaje(Ascm / 1e4, h, linha); return crackWidth(sec, false, br.As, br.phi, dd, Math.abs(M), c, caa).wk; };
        for (const [lado, dd, ms] of [['pos', dI, mk.pos], ['neg', dS, mk.neg]] as const) for (const k of [0, 1]) {
          let wi = w(As[lado][k], ms[k], dd);
          for (let it = 0; it < 20 && wi > wkLim; it++) { As[lado][k] *= 1.1; wi = w(As[lado][k], ms[k], dd); aumentou = true; }
          wk = Math.max(wk, wi);
        }
        if (aumentou) msgs.push(`Armadura aumentada para limitar a abertura de fissuras a ${wkLim.toFixed(2).replace('.', ',')} mm.`);
        if (wk > wkLim + 1e-9) msgs.push(`Abertura de fissuras ${wk.toFixed(2).replace('.', ',')} mm > ${wkLim.toFixed(2).replace('.', ',')} mm.`);
        // tabela de armadura (R7a): a armadura necessária cabe com as bitolas e espaçamentos da tabela?
        const smin = op.lajeEspacamentoMinimo / 100, smaxP = Math.min(2 * h, 0.2);
        const foraTab: string[] = [];
        for (const [lado, ca60] of [['pos', acoDe(b, 'lajeInf').aco === 'CA-60'], ['neg', acoDe(b, 'lajeSup').aco === 'CA-60']] as const) for (const k of [0, 1]) {
          const nec = As[lado][k] / 1e4;
          if (!nec) continue;
          const com = escolherBarrasLaje(nec, h, smaxP, smin, op.lajeBitolaMinima, ca60, linha);
          if (!com.cabe && escolherBarrasLaje(nec, h, smaxP, smin, op.lajeBitolaMinima, ca60).cabe) foraTab.push(`${lado === 'pos' ? 'positiva' : 'negativa'} na direção ${k} (${As[lado][k].toFixed(2).replace('.', ',')} cm²/m)`);
        }
        if (foraTab.length) msgs.push(`Fora de tabela (laje): ${foraTab.join('; ')} não cabe com as bitolas e espaçamentos da tabela "${tabelaDe(b, 'lajes', l.tabela).nome}".`);
      }
      // treliçadas: resultados por vigota em vigotas.ts (mensagens acrescentadas em dimensionarEdificio)
      const metodo = op.fatorFlechaLaje > 0 ? `elástica × ${String(op.fatorFlechaLaje).replace('.', ',')}` : `elástica × (1 + αf = ${(1 + af).toFixed(2).replace('.', ',')}), sem fissuração`;
      if (fl > lim) msgs.push(`Flecha total ${(fl * 1000).toFixed(1)} mm > ℓ/${op.limiteFlechaTotal} = ${(lim * 1000).toFixed(1)} mm (relativa aos apoios, ${metodo}).`);
      if (fq > limQ) msgs.push(`Flecha das variáveis ${(fq * 1000).toFixed(1)} mm > ℓ/${op.limiteFlechaSensorial} = ${(limQ * 1000).toFixed(1)} mm (vibrações).`);
      const r: ResultadoLaje = { laje: l.id, nome: l.nome, pavimento: pav.nome, tipo: pr.descricao, h: pr.h, mPos, mNeg, As, flecha: fl, limite: lim, flechaQ: fq, limiteQ: limQ, wk, wkLim, status: fl > lim || fq > limQ || wk > wkLim + 1e-9 ? 'fail' : 'ok', mensagens: msgs,
        origens: [origem('Armadura', COMB_ELU_LAJE, 'laje'), origem('Flecha', COMB_QP, 'flechaLaje'), ...(l.tipo.tipo === 'macica' ? [origem('Fissuração', COMB_FREQ, 'fissura')] : [])] };
      ja.set(l.id, r);
      out.push(r);
    }
  }
  return out;
}

// ---------------- quantitativos ----------------

export interface Quantitativo { pavimento: string; concreto: { lajes: number; vigas: number; pilares: number }; forma: { lajes: number; vigas: number; pilares: number }; aco: number }


export function quantitativos(b: BuildingModel): Quantitativo[] {
  const ps = pavimentosOrdenados(b);
  return ps.map((pav, ip) => {
    const ls = b.lajes.filter((l) => l.grupo === pav.grupo), vs = b.vigas.filter((v) => v.grupo === pav.grupo);
    let cL = 0, fL = 0, cV = 0, fV = 0, cP = 0, fP = 0;
    for (const l of ls) {
      const A = Math.abs(areaPoligono(l.contorno)) - (l.furos ?? []).reduce((s, f) => s + Math.abs(areaPoligono(f)), 0);
      const t = l.tipo.tipo === 'macica' ? l.tipo.h : (() => { const k = TRELICADAS[l.tipo.modelo] ?? TRELICADAS.H12; return l.tipo.capa + (k.bw * k.hEnch) / k.intereixo; })();
      cL += A * t; fL += A;
    }
    for (const v of vs) { const L = comprimentoPolilinha(v.pontos); cV += v.secao.b * v.secao.h * L; fV += (v.secao.b + 2 * v.secao.h) * L; }
    const hPav = ip === 0 ? b.obra.profundidadeFundacao : pav.cota - ps[ip - 1].cota;
    for (const p of b.pilares) if (lancesDoPilar(b, p).some((x) => x.id === pav.id)) {
      const s = secaoNoLance(p, pav.id), [w, h] = dimsSecao(s);
      cP += (s.tipo === 'circ' ? (Math.PI * w * w) / 4 : w * h) * hPav; fP += (s.tipo === 'circ' ? Math.PI * w : 2 * (w + h)) * hPav;
    }
    return { pavimento: pav.nome, concreto: { lajes: cL, vigas: cV, pilares: cP }, forma: { lajes: fL, vigas: fV, pilares: fP }, aco: cL * TAXAS.lajes + cV * TAXAS.vigas + cP * TAXAS.pilares };
  });
}

// ---------------- fundação ----------------

// Cargas por pilar para o módulo Fundações: em fundacao.ts (adaptador das fundações do edifício).
export { cargasParaFundacao } from './fundacao';

// ---------------- tudo ----------------

export interface Dimensionamento { vigas: ResultadoViga[]; pilares: ResultadoPilar[]; lajes: ResultadoLaje[]; quantitativos: Quantitativo[]; combinacoes: number;
  /** Detalhamento das vigas (barras, emendas, estribos por zona) e resumo do aço das vigas por bitola. */
  detalhes?: DetalheViga[]; resumoAcoVigas?: ReturnType<typeof resumoAcoVigas>;
  /** Detalhamento dos pilares (barras por lance, emendas, arranques, estribos e grampos) e resumo do aço dos pilares. */
  detalhesPilares?: DetalhePilar[]; resumoAcoPilares?: ReturnType<typeof resumoAcoPilares>;
  /** Detalhamento das lajes maciças (posições de barras, bordas, avisos) e resumo do aço das lajes. */
  detalhesLajes?: DetalheLaje[]; resumoAcoLajes?: ReturnType<typeof resumoAcoLajes>;
  /**
   * Lajes treliçadas (R6): um resultado por laje (envoltória dos pavimentos do grupo) com alinhamentos de vigotas,
   * grupos de igualação, armaduras e verificações; erros e avisos também vão para `lajes[].mensagens`.
   */
  vigotas?: ResultadoVigotas[];
  /** Aço das vigotas (adicionais, negativos e distribuição da capa) por bitola e treliças por tipo (m, kg). */
  resumoAcoVigotas?: ReturnType<typeof resumoAcoVigotas>; trelicas?: ReturnType<typeof quantitativoTrelicas>;
  /** Fundações lançadas no edifício (FU1), calculadas depois da estrutura com as reações na base dos pilares. */
  fundacoes?: ResultadoFundacao[];
  /** Vigas de equilíbrio e de travamento (FU2) e avisos gerais das fundações (cargas do nível de fundação sem destino). */
  vigasFundacao?: ResultadoVigaFundacao[]; avisosFundacao?: string[];
  /** Base elástica (FU6): radiers e vigas sobre base elástica (tensões no solo, recalques e armaduras), detalhamento e aço dos radiers. */
  radiers?: ResultadoRadier[]; vigasElasticas?: ResultadoVigaElastica[]; detalhesRadier?: DetalheLaje[]; resumoAcoRadiers?: ReturnType<typeof resumoAcoRadiers>;
  /** Equilíbrio global (EQU, N2a): tombamento por direção do vento; ausente com o grupo desativado ou sem vento. */
  equilibrio?: ResultadoEQU[];
  /** Avisos das ações e combinações (alerta de responsabilidade das combinações do usuário, EQU). */
  avisosAcoes?: string[] }

/** Campos das fundações no dimensionamento (elementos, vigas de fundação e avisos). */
export function comFundacao(b: BuildingModel, an: AnaliseEdificio | null, o: OpcoesFundacao = {}): Pick<Dimensionamento, 'fundacoes' | 'vigasFundacao' | 'avisosFundacao'> {
  const f = calcularFundacaoEdificio(b, an, o);
  return { fundacoes: f.elementos, ...(f.vigas.length ? { vigasFundacao: f.vigas } : {}), ...(f.avisos.length ? { avisosFundacao: f.avisos } : {}) };
}

/**
 * Dimensiona a estrutura e, se houver fundações lançadas e `fundacao` não for false ("calcular com fundação"), as fundações.
 * `fundacao`: opções do cálculo das fundações (modo, resultados anteriores, níveis).
 */
export function dimensionarEdificio(b: BuildingModel, an: AnaliseEdificio, o: { fundacao?: false | OpcoesFundacao } = {}): Dimensionamento {
  const combs = combinacoesEdificio(b, an), elu = combinacoesDoEstado(b, an, 'concreto', combs), freq = combinacoesDoEstado(b, an, 'fissuracao', combs);
  const d: Dimensionamento = { vigas: dimensionarVigas(b, an, elu, freq), pilares: dimensionarPilares(b, an, elu), lajes: dimensionarLajes(b, an), quantitativos: quantitativos(b), combinacoes: combs.length };
  if (estadoEmUso(b, 'equilibrio').ativo) { const eq = equilibrioGlobal(b, an, an.opcoes); if (eq.length) d.equilibrio = eq; }
  const avisosAcoes = [...textosAlertas(b, alertasSituacoes(b, combs)), ...(d.equilibrio ?? []).filter((e) => !e.ok).map((e) => `Equilíbrio global: tombamento com vento a ${e.direcao}° (momento estabilizante ${Math.round(e.Mest)} kN·m < instabilizante ${Math.round(e.Minst)} kN·m).`)];
  if (avisosAcoes.length) d.avisosAcoes = avisosAcoes;
  d.detalhes = detalharVigas(b, d, an.opcoes);
  d.resumoAcoVigas = resumoAcoVigas(b, d.detalhes, an.opcoes.perdasAco);
  d.detalhesPilares = detalharPilares(b, d, an.opcoes);
  d.resumoAcoPilares = resumoAcoPilares(b, d.detalhesPilares, an.opcoes.perdasAco);
  d.detalhesLajes = detalharLajes(b, d, an, an.opcoes);
  d.resumoAcoLajes = resumoAcoLajes(b, d.detalhesLajes, an.opcoes.perdasAco);
  d.vigotas = dimensionarVigotas(b, an, d.lajes, an.opcoes);
  d.resumoAcoVigotas = resumoAcoVigotas(d.vigotas, an.opcoes.perdasAco);
  d.trelicas = quantitativoTrelicas(d.vigotas, an.opcoes.perdasAco);
  if (an.baseElastica) {
    const be = dimensionarBaseElastica(b, an, { raras: combinacoesDoEstado(b, an, 'solo', combs), elu, freq }, momentosWoodArmer);
    if (be.radiers.length) {
      d.radiers = be.radiers;
      d.detalhesRadier = be.radiers.map((r) => detalharRadier(b, b.fundacao!.radiers!.find((x) => x.id === r.id)!, r, an.opcoes));
      d.resumoAcoRadiers = resumoAcoRadiers(b, d.detalhesRadier, an.opcoes.perdasAco);
    }
    if (be.vigasElasticas.length) d.vigasElasticas = be.vigasElasticas;
  }
  if (o.fundacao !== false && b.fundacao?.elementos.length) Object.assign(d, comFundacao(b, an, o.fundacao || {}));
  return d;
}
