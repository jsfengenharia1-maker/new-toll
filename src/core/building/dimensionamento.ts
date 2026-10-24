// Dimensionamento do edifício (NBR 6118) a partir da análise: vigas (flexão e cortante pela envoltória ELU),
// pilares (pilar-padrão com curvatura aproximada nas duas direções e flexão oblíqua por fibras), lajes maciças
// (momentos por metro da grelha) e quantitativos. Cargas para o módulo Fundações.
import type { InfoRearme } from './rearmarAlterados';
import { comEscadas } from './escadasCalculo';
import { resumoCalculoEscadas, type ResumoLanceCalculo } from './escadasResumo';
import { armarEscadas, type ArmaduraEscadas, type LinhaResumoAco } from './escadasArmadura';
import { resolverAgrupamentos, type InfoAgrupamento } from './agrupamento';
import { baseBarra, resolver3, type Caso3, type Modelo3, type Resultado3, type V3 } from '../fe3d';
import { barArea, beamAsMin, beamFlexure, chooseBars, chooseStirrup, crackLimit, crackWidth, gammaNFor, torsionRect } from '../concrete';
import { BITOLAS_TABELA, ESPACAMENTOS_PILAR, bitolasPilar, escolherBarrasViga, escolherEstribo, espacamentosPilar, estriboDaTabelaPilar, linhaLajes, pilarRestrito, modoGrampos, tabelaDe, tabelaPilarNaSecao } from './tabelasArmadura';
import { acoDe, cobrimentoLaje, cobrimentoPilar, cobrimentoViga, concretoDe, flambagemLance, gamas } from './materiais';
import { fiberAxialRange, fiberCapacity, fiberMesh, polyProps, circlePolygon, type FiberSection, type Pt, type RBar } from '../fiber';
import type { AnaliseEdificio, GrelhaPavimento } from './analitico';
import { deltaXi } from '../design';
import { excentricidadeAcidental, excentricidadeFluencia, metodoGeral, relacaoMCurvatura } from '../metodoGeral';
import { gramposPorEstribo } from './detalhamentoPilares';
import { combinacoesDoEstado, combinacoesEdificio, type CombinacaoEd } from './combinacoes';
import { alertasSituacoes, equilibrioGlobal, estadoEmUso, textosAlertas, type ResultadoEQU } from './acoes';
import { propriedadesLaje, vaos } from './lajes';
import { ehNervurada, espessuraConcreto, FICHA_TRELICADAS, geometriaNervurada, trelicasDe, type GeometriaNervurada } from './tiposLaje';
import { alinhamentosDaLaje, armaduraEquivalente, dadosBranson, fatorBranson, flechaAlinhamento, momentosDaBarra, type DadosBranson } from './vigotasFlecha';
import { vaosDaViga } from './vigas';
import { esforcosPilaresParede, type ResultadoPilarParede } from './pilarParedeEsforcos';
import { dimensionarParedes, type ResultadoParedeDim } from './paredesDim';
import { dimensionarConsolos, type ResultadoConsolo } from './consolos';
import { verificarPremoldadas, type ResultadoPremoldada } from './premoldadas';
import { classificar } from './revisao';
import { aplicarVigasEmbutidas, type ResultadoVigaEmbutida } from './vigaEmbutida';
import { aplicarDispensaVigasMuro, dimensionarAlvenaria, type ResultadoAlvenaria } from './alvenariaDim';
import { detalharParedes, resumoAcoParedes, type DetalheParede } from './detalhamentoParedes';
import { dimensionarMuroArrimo, matMuroDe, type ResultadoMuroDim } from './muroArrimoDim';
import { ladosDoPP, lancesDoPP, todosPilares } from './pilarParede';
import { detalharVigas, resumoAcoVigas, type DetalheViga } from './detalhamento';
import { detalharPilares, resumoAcoPilares, type DetalhePilar } from './detalhamentoPilares';
import { detalharLajes, escolherBarrasLaje, resumoAcoLajes, resumoTelasLajes, type DetalheLaje } from './detalhamentoLajes';
import { dimensionarVigotasFichas } from './vigotasFichas';
import { dadosBransonAlveolar, dimensionarAlveolares, flechaFase1Alveolar, resumoAcoAlveolares, type ResultadoAlveolar } from './alveolaresDim';
import { geometriaAlveolar, processoDoPano } from './alveolares';
import { dimensionarNervuradas, resumoAcoNervuradas, type ResultadoNervurada } from './nervuradasDim';
import { espessuraConcretoDaLaje } from './nervuradas';
import { quantitativoMoldadas, quantitativoVigotas } from './vigotasRelatorio';
import { dimensionarVigotas, quantitativoTrelicas, resumoAcoVigotas, type ResultadoVigotas } from './vigotas';
import { casosDaObra, centroNoLance, comprimentoPolilinha, contornoNoLance, dimsSecao, lancesDoPilar, pavimentosDoGrupo, pavimentosOrdenados, secaoNoLance, type BuildingModel } from './types';
import { apoioDoPilar } from './transicao';
import { areaPoligono } from '../geom/faces';
import { calcularFundacaoEdificio, type OpcoesFundacao, type ResultadoFundacao } from './fundacao';
import type { ResultadoVigaFundacao } from './vigasFundacao';
import { TAXAS } from './premissas';
import { puncaoAbacos } from './abacosPuncao';
import { cortanteLaje, puncaoEdificio, puncaoRadier, sitiosPuncao, type CortanteLaje, type ResultadoPuncao } from './puncao';
import { detalharRadier, dimensionarBaseElastica, resumoAcoRadiers, type ResultadoRadier, type ResultadoVigaElastica } from './baseElastica';
import { calcularCorridas, type ResultadoCorrida } from './sapataCorrida';
import { temCorridas } from './corridaParede';
import { opcoesEmUso, perfilDe } from './opcoes';
import { alturaVigaChata, secaoParaFlexao } from './secaoViga';
import { calcularBasesMuros, type ResultadoBaseMuro } from './baseMuro';
import { COMB_ELU_LAJE, COMB_FREQ, COMB_QP, origem, type Origem } from './origem';
import { bransonFlecha, composicaoEtapas, inerciaMediaVao, etapasDe, fracoesGGrupo, fracoesGLaje, instantaneasPorCategoria, limiteFlecha, limitesEmUso, mensagensFlechasNovas, resolverGrelhaFissurada, resumoFlechas, textoLimite, tipoFlechaLaje, type ComposicaoEtapas, type FlechasElemento, type FlechasInstantaneas, type FracoesG, type TipoFlecha } from './flechas';
import { dadosDosArcos, ehCurva } from './curvas';
import { armaduraSuspensao, avisoPilarCurto, avisosDoVao, cubicaNoApoio, deltaMApoio, estribosSuspensao, fatorCargaProxima, larguraSuspensao, parcelaAoApoio, reduzirNegativo } from './apoios';
import { verificarFogo, type ResultadoFogo } from './fogo';
import { memoriaAtiva } from '../memoria/registrador';
import { registrarViga, type ComposicaoEsforco } from '../memoria/vigaConcreto';
import { registrarPilar } from '../memoria/pilarConcreto';
import { detalharInclinada, dimensionarInclinadas, resumoAcoInclinadas, type DetalheInclinada, type ResultadoInclinada } from './inclinadasDim';
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
export function porCaso(an: AnaliseEdificio, bi: number, xs: number[], semVento = false): Record<string, Estacao[]> {
  const pm = an.portico, out: Record<string, Estacao[]> = {};
  if (!pm.res) return out;
  an.casos.forEach((c, ic) => (out[c] = esforcosAoLongo(pm.modelo, bi, pm.res!.esforcos[ic][bi], pm.casos?.[ic], xs)));
  if (!semVento) (an.vento?.casos ?? []).forEach((cv, ic) => { if (pm.resVento) out[cv.nome] = esforcosAoLongo(pm.modelo, bi, pm.resVento.esforcos[ic][bi], pm.casosVento?.[ic], xs); });
  // P-Δ (N2c): efeitos de 2ª ordem de cada combinação ELU como caso próprio (forças fictícias nodais)
  if (!semVento && pm.resPDelta) for (const c of an.segundaOrdem?.combinacoes ?? []) { const k = c.caso ? +c.caso.slice(3) - 1 : -1; if (k >= 0) out[c.caso!] = esforcosAoLongo(pm.modelo, bi, pm.resPDelta.esforcos[k][bi], undefined, xs); }
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
  if (an.portico.resPDelta) for (const c of an.segundaOrdem?.combinacoes ?? []) if (c.caso && !m.has(c.caso)) m.set(c.caso, m.size);
  return m;
}

// ---------------- vigas ----------------

export interface ResultadoViga {
  viga: string; nome: string; grupo: string; b: number; h: number; L: number;
  /** Maior flecha total (quase permanente, Branson por seção, com fluência) e da carga variável, e limites (m). */
  flecha: number; limite: number; flechaQ: number; limiteQ: number;
  /** Flechas por tipo (N2f): instantâneas por categoria, diferida, total, ativa e da variável, com os limites. */
  flechas?: FlechasElemento;
  Mpos: number; Mneg: number; V: number;
  /** Envoltória ELU ao longo da viga (todos os pavimentos do grupo), em faixas de 0,25 m, com as combinações determinantes. */
  envoltoria: EnvoltoriaViga;
  /** Momentos ELU (kN·m; + traciona embaixo) nas faces dos pilares de apoio, com as combinações que os dão (só exibição: o cálculo usa o trecho rígido). */
  facesPilar: { s: number; pilar: string; nomePilar: string; Mmin: number; Mmax: number; combinacaoMin: string; combinacaoMax: string }[];
  /** Vãos com apoio em parede ou pilar-parede (K1.12.21): vão entre faces `L` e vão de cálculo `Lc` dos momentos mínimos (m). */
  vaosParede?: { L: number; Lc: number }[];
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
  /** Nome do agrupamento de pórticos efetivo a que a viga pertence (R7f); a armadura é a do pórtico que governa o grupo. */
  agrupada?: string;
  /** Áreas necessárias inferior e superior (m²), antes do bloqueio e do aumento por fissuração. */
  AsNec: [number, number];
  arranjo: { inf: { n: number; phi: number } | null; sup: { n: number; phi: number } | null; estribo: { phi: number; s: number; legs?: number } | null; laterais: { n: number; phi: number } | null };
  /** Pilares que nascem sobre a viga (transição, E1a): posição, carga de cálculo na base e cortante de cálculo nas faces do pilar. */
  transicoes?: TransicaoViga[];
  /** Armadura de suspensão nos cruzamentos com vigas apoiadas nesta (N2e). */
  suspensoes?: SuspensaoViga[];
  /** Espaçamento máximo dos estribos imposto pelas opções ou pela armadura comprimida (m), quando menor que o da norma (N2e). */
  estriboSmax?: number;
}

/** Armadura de suspensão (NBR 6118, 18.3.6) na viga de apoio, no cruzamento com uma viga apoiada nela (N2e). */
export interface SuspensaoViga {
  /** Viga apoiada (id e nome), abscissa do cruzamento ao longo desta viga (m) e reação de cálculo (kN). */
  viga: string; nome: string; s: number; Rd: number;
  /** Área necessária (m²), estribos adicionais, bitola (mm) e largura da zona em que são distribuídos (m). */
  As: number; n: number; phi: number; largura: number;
}

export interface TransicaoViga {
  pilar: string; nome: string;
  /** Abscissa do centro do pilar ao longo do traçado e a extensão do pilar na viga (m). */
  s: number; sFaces: [number, number];
  /** Maior carga axial de cálculo na base do pilar (kN, compressão) e a combinação. */
  Nd: number; combinacao: string;
  /** Cortante de cálculo (kN) junto às faces do pilar (dois lados), VRd3 dos estribos adotados e VRd2 (kN). */
  Vfaces: [number, number]; VRd3: number; VRd2: number;
  status: 'ok' | 'fail';
}

export interface EnvoltoriaViga {
  /** Abscissa ao longo do traçado (m) e extremos de M (kN·m; + traciona embaixo), V (kN) e |T| (kN·m) na faixa. */
  pontos: { s: number; Mmax: number; Mmin: number; Vmax: number; Vmin: number; T: number }[];
  /** Combinação que dá cada extremo global. */
  determinantes: { Mmax: string; Mmin: string; V: string; T: string };
}

/** Distância (m) de P ao traçado da viga. */
function distPolilinha(pts: [number, number][], P: number[]): number {
  let m = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], z = pts[i + 1], dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((P[0] - a[0]) * dx + (P[1] - a[1]) * dy) / L2));
    m = Math.min(m, Math.hypot(a[0] + dx * t - P[0], a[1] + dy * t - P[1]));
  }
  return m;
}

/** Abscissa (m) da projeção de P no traçado da viga, a partir do primeiro ponto. */
function abscissa(pts: [number, number][], P: number[], livre = false): number {
  let melhor = Infinity, s = 0, acum = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], z = pts[i + 1], dx = z[0] - a[0], dy = z[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const t0 = ((P[0] - a[0]) * dx + (P[1] - a[1]) * dy) / L;
    // `livre`: as pontas do traçado prolongam-se (apoio que passa da ponta da viga)
    const t = Math.max(livre && i === 0 ? -Infinity : 0, Math.min(livre && i + 2 === pts.length ? Infinity : L, t0));
    const d = Math.hypot(a[0] + (dx * t) / L - P[0], a[1] + (dy * t) / L - P[1]);
    if (d < melhor - 1e-9) { melhor = d; s = acum + t; }
    acum += L;
  }
  return s;
}

/** Envoltória ELU de uma viga (com a redistribuição δ aplicada nos apoios internos), por faixas de 0,25 m. */
function envoltoriaViga(vaos: { L: number; xs: number[]; s: number[]; M: Float64Array[]; Mv: Float64Array[]; V: Float64Array[]; T: Float64Array[]; ini: number; fim: number }[], elu: CombinacaoEd[], delta: number, interno: (n: number) => boolean, zonas = false): EnvoltoriaViga {
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
  const pontos = [...faixas.values()].sort((a, z) => a.s - z.s).map((f) => ({ s: r(f.s), Mmax: r(f.Mmax), Mmin: r(f.Mmin), Vmax: r(f.Vmax), Vmin: r(f.Vmin), T: r(f.T) }));
  // N2e: envoltória de cortante descontínua: patamar com o maior cortante de cada zona (¼ do vão) [a confirmar]
  if (zonas) for (const vo of vaos) {
    const s0 = Math.min(...vo.s), s1 = Math.max(...vo.s), w = (s1 - s0) / 4;
    if (!(w > 0)) continue;
    const zona = (x: number) => Math.min(3, Math.max(0, Math.floor((x - s0) / w - 1e-9)));
    const pts = pontos.filter((q) => q.s >= s0 - 1e-6 && q.s <= s1 + 1e-6);
    for (let z = 0; z < 4; z++) {
      const g = pts.filter((q) => zona(q.s) === z);
      if (!g.length) continue;
      const vmax = Math.max(...g.map((q) => q.Vmax)), vmin = Math.min(...g.map((q) => q.Vmin));
      for (const q of g) { q.Vmax = vmax; q.Vmin = vmin; }
    }
  }
  return { pontos, determinantes: det };
}

/** Cadeias de barras do pórtico de uma viga, na ordem, cortadas nos pilares (os vãos). */
function cadeiasViga(an: AnaliseEdificio, membros: number[], noPilar: Set<number>): number[][] {
  const mb = an.portico.modelo.barras, cadeias: number[][] = [];
  for (const bi of membros) {
    const atual = cadeias.at(-1), ultimo = atual ? mb[atual.at(-1)!] : null;
    if (atual && ultimo && ultimo.j === mb[bi].i && !noPilar.has(mb[bi].i)) atual.push(bi); else cadeias.push([bi]);
  }
  // viga apoiada ao longo de pilar-parede ou parede (K1.3.59): o trecho entre dois nós do mesmo lado é apoio, não vão
  const lado = ladoDosNos(an);
  return lado.size ? cadeias.filter((c) => { const a = lado.get(mb[c[0]].i); return !(a !== undefined && a === lado.get(mb[c.at(-1)!].j)); }) : cadeias;
}

/** Nó do pórtico (fatia do topo de um lado em casca) → lado do pilar-parede. */
const memoLadoNos = new WeakMap<AnaliseEdificio, Map<number, string>>();
function ladoDosNos(an: AnaliseEdificio): Map<number, string> {
  let m = memoLadoNos.get(an);
  if (!m) { m = new Map((an.paredes?.nosFatia ?? []).map((f) => [f.no, f.lado])); memoLadoNos.set(an, m); }
  return m;
}

const CAA_NUM = { I: 1, II: 2, III: 3, IV: 4 } as const;

/** Barras longitudinais de uma face lateral (torção) para As (m²): φ8 a φ12,5, espaçadas até 20 cm na altura. */
function barrasLaterais(As: number, h: number) {
  const nMin = Math.max(1, Math.ceil(h / 0.2) - 1);
  for (const phi of [8, 10, 12.5]) { const n = Math.max(nMin, Math.ceil(As / barArea(phi))); if (n <= nMin + 2 || phi === 12.5) return { phi, n }; }
  return { phi: 12.5, n: nMin };
}

/**
 * Viga apoiada ao longo de pilar-parede ou parede (K1.3.59): o diagrama prossegue além da face do apoio por `fator` × h
 * (no máximo até o fim do contato), com os esforços da face; a armadura é dimensionada (e detalhada) só nesse trecho.
 */
function prolongarSobreParede(b: BuildingModel, an: AnaliseEdificio, v: BuildingModel['vigas'][number], vaos: { s: number[]; ini: number; fim: number }[], envolt: EnvoltoriaViga, fator: number) {
  const ladoNo = ladoDosNos(an), pav0 = pavimentosDoGrupo(b, v.grupo)[0];
  if (!ladoNo.size || fator <= 0 || !pav0) return;
  for (const vo of vaos) {
    const n = vo.s.length;
    if (n < 2) continue;
    const sgn = Math.sign(vo.s[n - 1] - vo.s[0]) || 1;
    for (const ex of [{ no: vo.ini, s: vo.s[0], dir: -sgn }, { no: vo.fim, s: vo.s[n - 1], dir: sgn }]) {
      const lado = ladoNo.get(ex.no), pl = lado ? todosPilares(b).find((q) => q.id === lado) : undefined;
      if (!pl) continue;
      const ss = contornoNoLance(pl, pav0.id).map((q) => abscissa(v.pontos, q)), c0 = Math.min(...ss), c1 = Math.max(...ss);
      const d = Math.min(fator * v.secao.h, Math.max(0, ex.dir > 0 ? c1 - ex.s : ex.s - c0));
      if (d < 0.125) continue;
      const base = envolt.pontos.reduce((m, p) => (Math.abs(p.s - ex.s) < Math.abs(m.s - ex.s) ? p : m), envolt.pontos[0]);
      for (let k = 1; k * 0.25 <= d + 1e-9; k++) {
        const s2 = Math.round((ex.s + ex.dir * k * 0.25) * 100) / 100;
        if (!envolt.pontos.some((p) => Math.abs(p.s - s2) < 0.125)) envolt.pontos.push({ ...base, s: s2 });
      }
    }
  }
  envolt.pontos.sort((a, z) => a.s - z.s);
}

function dimensionarVigas(b: BuildingModel, an: AnaliseEdificio, elu: CombinacaoEd[], freq: CombinacaoEd[]): ResultadoViga[] {
  // vigas pré-moldadas armadas (E2e): γc do controle pré-moldado (NBR 9062) [a confirmar o item]
  const c0 = concretoDe(b, 'viga'), cPM = concretoDe({ ...b, norma: { ...b.norma, controle: 'premoldado' } }, 'viga'), aPos = acoDe(b, 'vigaPos'), aNeg = acoDe(b, 'vigaNeg'), aEst = acoDe(b, 'vigaEstribo'), gs = gamas(b).s;
  const fywd = Math.min(aEst.fyk / gs, 435), fydL = Math.min(aPos.fyd, aNeg.fyd);
  const op = an.opcoes, af = deltaXi(op.t0Flecha), mem = memoriaAtiva();
  const caa = CAA_NUM[b.norma.caa], wkLim = op.limiteFissura || crackLimit(caa);
  const obra = casosDaObra(b), natureza = (id: string) => obra.find((x) => x.id === id)?.natureza ?? 'G';
  const psi2 = (id: string) => obra.find((x) => x.id === id)?.psi?.[2] ?? b.norma.psiQ?.[2] ?? 0.3;
  const fQP: Record<string, number> = Object.fromEntries(an.casos.map((id) => [id, natureza(id) === 'G' || natureza(id) === 'H' ? 1 : natureza(id) === 'Q' ? psi2(id) : 0]));
  const fQ: Record<string, number> = Object.fromEntries(an.casos.map((id) => [id, natureza(id) === 'Q' ? 1 : 0]));
  // N2f: permanentes e parcela quase permanente das variáveis em separado (etapas de carga)
  const fG: Record<string, number> = Object.fromEntries(an.casos.map((id) => [id, natureza(id) === 'G' || natureza(id) === 'H' ? 1 : 0]));
  const fQqp: Record<string, number> = Object.fromEntries(an.casos.map((id) => [id, natureza(id) === 'Q' ? psi2(id) : 0]));
  const memoFr = new Map<string, FracoesG>();
  const fracoesViga = (g: string) => { let f = memoFr.get(g); if (!f) { f = fracoesGGrupo(b, g); memoFr.set(g, f); } return f; };
  // parte vertical de cada combinação (a redistribuição e os mínimos valem para as cargas verticais)
  const horiz = new Set([...(an.vento?.casos ?? []).map((x) => x.nome), ...obra.filter((x) => x.natureza === 'W').map((x) => x.id)]);
  const vert = (cb: CombinacaoEd): CombinacaoEd => ({ ...cb, fatores: Object.fromEntries(Object.entries(cb.fatores).filter(([k]) => !horiz.has(k))) });
  const eluV = elu.map(vert);
  const nomesCasos = nomesDosCasos(an), eluC = elu.map((cb) => compilarComb(cb, nomesCasos)), eluVC = eluV.map((cb) => compilarComb(cb, nomesCasos)), freqC = freq.map((cb) => compilarComb(cb, nomesCasos));
  const pontuais = new Map<number, { a: number }[]>();
  for (const cs of an.portico.casos ?? []) for (const p of cs.pontuais ?? []) { const l = pontuais.get(p.barra); if (l) l.push(p); else pontuais.set(p.barra, [p]); }
  // nós de estrutura móvel quando γz > 1,1 (δ ≥ 0,90); nós fixos δ ≥ 0,75 (NBR 6118, 14.6.4.3)
  const gz = Math.max(1, ...(an.vento?.gamaZ ?? []).map((g) => g.max));
  const deltaMin = gz > 1.1 ? 0.9 : 0.75, deltaX = c0.fck > 50 ? 0.56 : 0.44;
  const noPilar = new Set<number>(), pilarNo = new Map<number, string>();
  // pilar que nasce sobre viga (transição) não é apoio da viga: o pé não entra em `noPilar` (a cadeia segue contínua)
  an.portico.barras.forEach((t, i) => { if (t.tipo === 'pilar') { for (const n of t.transicao === 'viga' || t.transicao === 'laje' ? [an.portico.modelo.barras[i].j] : [an.portico.modelo.barras[i].i, an.portico.modelo.barras[i].j]) { noPilar.add(n); if (t.ref && !pilarNo.has(n)) pilarNo.set(n, t.ref); } } });
  // fatias do topo dos pilares-parede em casca: apoios das vigas (E1b)
  for (const f of an.paredes?.nosFatia ?? []) { noPilar.add(f.no); if (!pilarNo.has(f.no)) pilarNo.set(f.no, f.lado); }
  const usoNo = new Map<number, number>();
  an.portico.barras.forEach((t, i) => { if (t.tipo === 'viga') for (const n of [an.portico.modelo.barras[i].i, an.portico.modelo.barras[i].j]) usoNo.set(n, (usoNo.get(n) ?? 0) + 1); });
  const out: ResultadoViga[] = [];
  const pm = an.portico, mb = pm.modelo.barras;
  for (const v of b.vigas) {
    const membros = pm.barras.map((t, i) => [t, i] as const).filter(([t]) => t.tipo === 'viga' && t.ref === v.id).map(([, i]) => i);
    if (!membros.length) continue;
    const c = v.premoldada?.tipo === 'armada' ? cPM : c0;
    // E2a: seção T/L na flexão (opção mesaDimensionamento); fissuração e flecha seguem a mesma seção
    const { sec, fcPos, fcNeg, mesa } = secaoParaFlexao(b, v, op);
    // d da armadura positiva pela face inferior e da negativa pela superior (cobrimentos por face: materiais.ts)
    const cob = cobrimentoViga(b, v.cobrimento), dI = v.secao.h - cob.inf - 0.005 - 0.008, dS = v.secao.h - cob.sup - 0.005 - 0.008;
    const d2I = cob.sup + 0.005 + 0.008, d2S = cob.inf + 0.005 + 0.008, d = Math.min(dI, dS);
    const tor = op.verificarTorcao || v.torcaoEquilibrio || ehCurva(v) ? torsionRect(v.secao.b, v.secao.h, cob.lat + 0.005 + 0.008, 0, c, fywd, fydL) : null;
    const VRd2 = 0.27 * c.av2 * c.fcd * v.secao.b * d * 1000, Vc0 = 0.6 * c.fctd * v.secao.b * d * 1000;
    // pontas das barras sobre pilares (parte flexível começa em face − trechoRigido·h) e apoios internos da viga
    const membrosNo = new Map<number, number>();
    for (const bi of membros) for (const n of [mb[bi].i, mb[bi].j]) membrosNo.set(n, (membrosNo.get(n) ?? 0) + 1);
    const interno = (n: number) => noPilar.has(n) && (membrosNo.get(n) ?? 0) >= 2;
    const recuo = op.trechoRigido * v.secao.h, depoisFace = op.cortanteApoio ? (op.cortanteDistancia / 100) * d : 0;
    // estações por vão: M e V por combinação (total e parte vertical), T e se a seção entra no cortante
    type Face = { x: number; s: number; pilar: string; M: Float64Array; Mv: Float64Array; V: Float64Array; Vv: Float64Array };
    type Vao = { L: number; xs: number[]; s: number[]; M: Float64Array[]; Mv: Float64Array[]; V: Float64Array[]; Vv: Float64Array[]; T: Float64Array[]; Mk: Float64Array[]; corte: boolean[]; ini: number; fim: number; balanco: boolean; faces: Face[]; Lc?: number; oIni: number; oFim: number; rIni: number | null; rFim: number | null; org?: { bi: number; x: number }[] };
    const vaos: Vao[] = [];
    for (const cad of cadeiasViga(an, membros, noPilar)) {
      const xs: number[] = [], sAbs: number[] = [], corte: boolean[] = [], faces: Face[] = [];
      const org: { bi: number; x: number }[] | undefined = mem ? [] : undefined; // memória detalhada: barra e posição de cada estação
      // estações de cada barra da cadeia (primeiro passo: total de estações para alocar os vetores)
      const estacoes = cad.map((bi) => {
        const { L } = baseBarra(pm.modelo, mb[bi]);
        // barras da divisão fina do modelo integrado (≈ malha das lajes): só as pontas e estações a cada 0,25 m
        const n = pm.barras[bi].fina ? Math.max(1, Math.ceil(L / 0.25 - 1e-9)) : Math.max(4, Math.ceil(L / 0.25));
        const xl = Array.from({ length: n + 1 }, (_, k) => (k * L) / n);
        for (const p of pontuais.get(bi) ?? []) xl.push(Math.max(0, p.a - 1e-6), Math.min(L, p.a + 1e-6));
        xl.sort((a, z) => a - z);
        return { L, xl };
      });
      const tot = estacoes.reduce((t, e) => t + e.xl.length, 0);
      // faces dos pilares nas pontas da cadeia (a parte flexível começa trechoRigido·h antes da face): o corte do cortante
      // é medido ao longo da cadeia, que no modelo integrado tem várias barras curtas até o vão seguinte
      const bI = mb[cad[0]], bJ = mb[cad.at(-1)!], Lcad = estacoes.reduce((t, e) => t + e.L, 0);
      const rIc = bI.offI && noPilar.has(bI.i) ? recuo : null, rJc = bJ.offJ && noPilar.has(bJ.j) ? recuo : null;
      const M = elu.map(() => new Float64Array(tot)), Mv = elu.map(() => new Float64Array(tot)), V = elu.map(() => new Float64Array(tot)), Vv = elu.map(() => new Float64Array(tot)), T = elu.map(() => new Float64Array(tot)), Mk = freq.map(() => new Float64Array(tot));
      let x0 = 0, o = 0;
      for (let ib = 0; ib < cad.length; ib++) {
        const bi = cad[ib], { L, xl } = estacoes[ib];
        const pc = porCaso(an, bi, xl);
        const ne = xl.length, ez = vetorCasos(pc, nomesCasos, 'Mz'), ey = vetorCasos(pc, nomesCasos, 'Vy'), et = vetorCasos(pc, nomesCasos, 'T');
        const rI = mb[bi].offI && noPilar.has(mb[bi].i) ? recuo : null, rJ = mb[bi].offJ && noPilar.has(mb[bi].j) ? recuo : null;
        const marcados = xl.map((x) => !op.cortanteApoio || ((rIc === null || x0 + x - rIc >= depoisFace - 1e-9) && (rJc === null || Lcad - x0 - x - rJc >= depoisFace - 1e-9)));
        if (!pm.barras[bi].fina && !marcados.some(Boolean)) marcados[Math.floor(xl.length / 2)] = true;
        // posição em planta de cada estação (início da parte flexível + u·x) para a abscissa ao longo da viga
        const nI = pm.modelo.nos[mb[bi].i], nJ = pm.modelo.nos[mb[bi].j], oI = mb[bi].offI ?? [0, 0, 0], oJ = mb[bi].offJ ?? [0, 0, 0];
        const ini = [nI[0] + oI[0], nI[1] + oI[1]], fim = [nJ[0] + oJ[0], nJ[1] + oJ[1]], Lf = Math.hypot(fim[0] - ini[0], fim[1] - ini[1]) || 1;
        xl.forEach((x, i) => {
          xs.push(x0 + x); corte.push(marcados[i]); org?.push({ bi, x });
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
          const pf = porCaso(an, bi, [xf]), fz = vetorCasos(pf, nomesCasos, 'Mz'), fy = vetorCasos(pf, nomesCasos, 'Vy');
          const Mf = new Float64Array(elu.length), Mfv = new Float64Array(elu.length), Vf = new Float64Array(elu.length), Vfv = new Float64Array(elu.length), um = new Float64Array(1);
          for (let k = 0; k < elu.length; k++) { combinarEm(um, 0, 1, eluC[k], fz); Mf[k] = um[0]; combinarEm(um, 0, 1, eluVC[k], fz); Mfv[k] = um[0]; combinarEm(um, 0, 1, eluC[k], fy); Vf[k] = um[0]; combinarEm(um, 0, 1, eluVC[k], fy); Vfv[k] = um[0]; }
          faces.push({ x: x0 + xf, s: abscissa(v.pontos, [ini[0] + ((fim[0] - ini[0]) * xf) / Lf, ini[1] + ((fim[1] - ini[1]) * xf) / Lf]), pilar: pilarNo.get(no) ?? '', M: Mf, Mv: Mfv, V: Vf, Vv: Vfv });
        }
        x0 += L; o += xl.length;
      }
      const ini = mb[cad[0]].i, fim = mb[cad.at(-1)!].j;
      const livre = (no: number) => !noPilar.has(no) && (usoNo.get(no) ?? 0) <= 1;
      if (pm.barras[cad[0]].fina && !corte.some(Boolean)) corte[Math.floor(corte.length / 2)] = true; // cadeia fina toda dentro da faixa
      // vão de cálculo sobre pilar-parede ou parede (K1.12.21): vão livre + fator × h/2 por apoio de parede, no lugar do trecho rígido
      const ln = ladoDosNos(an), parede = ln.has(ini) || ln.has(fim);
      const ext = (no: number, r: number | null) => (ln.has(no) ? (op.vigaApoioLongVao * v.secao.h) / 2 - (r ?? 0) : 0);
      // E5j (K1.12.21): o vão de cálculo não passa da distância entre os eixos dos apoios (centro do contato do pilar/parede com a viga;
      // apoio que não é pilar, como a viga cruzada, vale o ponto onde o eixo da viga a cruza)
      const centroApoio = (no: number, sFim: number) => {
        const pl = pilarNo.has(no) ? todosPilares(b).find((q) => q.id === pilarNo.get(no)) : undefined, pav = pavimentosDoGrupo(b, v.grupo)[0];
        if (!pl || !pav) return sFim;
        const ss = contornoNoLance(pl, pav.id).map((q) => abscissa(v.pontos, q, true));
        return ss.length ? (Math.min(...ss) + Math.max(...ss)) / 2 : sFim;
      };
      const eixos = Math.abs(centroApoio(fim, sAbs[sAbs.length - 1]) - centroApoio(ini, sAbs[0]));
      const LcPar = parede ? x0 + ext(ini, rIc) + ext(fim, rJc) : 0;
      vaos.push({ L: x0, xs, s: sAbs, M, Mv, V, Vv, T, Mk, corte, ini, fim, balanco: livre(ini) !== livre(fim), faces, ...(parede ? { Lc: op.vigaApoioLongEixos && eixos > 0 ? Math.min(LcPar, eixos) : LcPar } : {}), rIni: rIc, rFim: rJc, oIni: rIc !== null ? Math.hypot(...(bI.offI ?? [0, 0, 0])) : 0, oFim: rJc !== null ? Math.hypot(...(bJ.offJ ?? [0, 0, 0])) : 0, ...(org ? { org } : {}) });
    }
    // N2e: arredondamento do diagrama dentro dos apoios internos (cúbica entre as faces ou ΔM = R·t/8)
    let arredondou = false;
    if (op.arredondamentoApoio) for (const A of vaos) {
      const B = vaos.find((x) => x !== A && x.ini === A.fim);
      if (!B || !interno(A.fim)) continue;
      const fA = A.faces.find((f) => f.x > A.L / 2), fB = B.faces.find((f) => f.x < B.L / 2);
      if (!fA || !fB) continue;
      const tAp = A.L - fA.x + A.oFim + B.oIni + fB.x;
      if (tAp < 1e-6) continue;
      for (let k = 0; k < elu.length; k++) {
        const aplica = (vo: Vao, dentro: (x: number) => number | null) => {
          for (let i = 0; i < vo.xs.length; i++) {
            const u = dentro(vo.xs[i]);
            if (u === null) continue;
            const M0 = vo.M[k][i], Mv0 = vo.Mv[k][i];
            let Mn: number, Mvn: number;
            if (op.arredondamentoApoio === 1) {
              const c1 = cubicaNoApoio(fA.M[k], fA.V[k], fB.M[k], fB.V[k], tAp, u), c2 = cubicaNoApoio(fA.Mv[k], fA.Vv[k], fB.Mv[k], fB.Vv[k], tAp, u);
              Mn = c1.M; Mvn = c2.M; // o cortante dentro do apoio não é substituído: V e p·ℓ² seguem o das pontas do modelo
              if (op.momentoFaceMin > 0) { if (M0 < 0) Mn = Math.min(Mn, (op.momentoFaceMin / 100) * M0); if (Mv0 < 0) Mvn = Math.min(Mvn, (op.momentoFaceMin / 100) * Mv0); }
            } else {
              Mn = reduzirNegativo(M0, deltaMApoio(fB.V[k] - fA.V[k], tAp), M0, op.momentoFaceMin);
              Mvn = reduzirNegativo(Mv0, deltaMApoio(fB.Vv[k] - fA.Vv[k], tAp), Mv0, op.momentoFaceMin);
            }
            vo.M[k][i] = Mn; vo.Mv[k][i] = Mvn;
          }
        };
        aplica(A, (x) => (x > fA.x + 1e-9 ? x - fA.x : null));
        aplica(B, (x) => (x < fB.x - 1e-9 ? tAp - (fB.x - x) : null));
      }
      arredondou = true;
    }
    // N2e: cargas concentradas próximas ao apoio (17.4.1.2.1): cortante reduzido por a/2d entre a face e a carga; aviso para a ≤ d
    const proximas: { vao: Vao; x: number; a: number; lado: 'ini' | 'fim'; F: number[] }[] = [];
    if (op.cargaProximaApoio) {
      // cargas concentradas lançadas na viga (as forças nodais das lajes na malha não são concentradas no sentido da norma)
      const cargas: { P: number[]; F: number[] }[] = [];
      for (const cg of b.cargas) if (cg.tipo === 'ponto' && cg.grupo === v.grupo) cargas.push({ P: cg.pontos[0], F: elu.map((cb) => (cb.fatores[cg.caso] ?? 0) * cg.valor) });
      for (const cg of cargas) {
        if (distPolilinha(v.pontos, cg.P) > v.secao.b / 2 + 0.02 || !cg.F.some((x) => x > 0)) continue;
        const sc = abscissa(v.pontos, cg.P);
        // o mesmo vão se repete nos pavimentos do grupo: a carga vale em todos
        for (const vo of vaos.filter((q) => q.s.length && sc >= Math.min(...q.s) - 1e-6 && sc <= Math.max(...q.s) + 1e-6)) {
          let x = vo.xs[0];
          for (let i = 0; i + 1 < vo.xs.length; i++) if (sc >= Math.min(vo.s[i], vo.s[i + 1]) - 1e-9 && sc <= Math.max(vo.s[i], vo.s[i + 1]) + 1e-9 && vo.s[i + 1] !== vo.s[i]) { x = vo.xs[i] + ((sc - vo.s[i]) / (vo.s[i + 1] - vo.s[i])) * (vo.xs[i + 1] - vo.xs[i]); break; }
          if (vo.rIni !== null && x - vo.rIni > 0 && x - vo.rIni < 2 * d) proximas.push({ vao: vo, x, a: x - vo.rIni, lado: 'ini', F: cg.F });
          if (vo.rFim !== null && vo.L - x - vo.rFim > 0 && vo.L - x - vo.rFim < 2 * d) proximas.push({ vao: vo, x, a: vo.L - x - vo.rFim, lado: 'fim', F: cg.F });
        }
      }
      // a carga é aplicada no nó mais próximo da malha (até meia malha do ponto): a estação do nó, do lado do apoio, entra na redução
      const TOL_NO = 0.13;
      for (const q of proximas) for (let k = 0; k < elu.length; k++) {
        if (q.F[k] <= 0) continue;
        const red = (1 - fatorCargaProxima(q.a, d)) * parcelaAoApoio(q.F[k], q.a, q.vao.L), xs = q.vao.xs;
        for (let i = 0; i < xs.length; i++) {
          const x = xs[i], primeira = i === 0 || xs[i - 1] < x - 1e-7, ultima = i === xs.length - 1 || xs[i + 1] > x + 1e-7;
          const entre = q.lado === 'ini'
            ? x >= (q.vao.rIni ?? 0) - 1e-9 && (x <= q.x - 1e-6 || (x <= q.x + TOL_NO && primeira))
            : x <= q.vao.L - (q.vao.rFim ?? 0) + 1e-9 && (x >= q.x + 1e-6 || (x >= q.x - TOL_NO && ultima));
          if (!entre) continue;
          const w = q.vao.V[k][i];
          q.vao.V[k][i] = w - Math.sign(w) * Math.min(Math.abs(w), red);
        }
      }
    }
    // envoltória ELU: momentos mínimos (p·ℓ²/x, p = (V1 + V2)/ℓ das cargas verticais) e depois a
    // redistribuição δ nos apoios internos, que também reduz o negativo mínimo ali
    const envoltoria = (delta: number) => {
      let Mpos = 0, Mneg = 0, V = 0, T = 0, biela = 0, asw = 0, Asl = 0;
      for (const vo of vaos) for (let k = 0; k < elu.length; k++) {
        const M = vo.M[k], Mv = vo.Mv[k], n = M.length, L = vo.L;
        const dA = delta < 1 && interno(vo.ini) && Mv[0] < 0 ? (1 - delta) * -Mv[0] : 0;
        const dZ = delta < 1 && interno(vo.fim) && Mv[n - 1] < 0 ? (1 - delta) * -Mv[n - 1] : 0;
        const pl2 = vo.balanco ? 0 : (Math.abs(vo.Vv[k][0]) + Math.abs(vo.Vv[k][n - 1])) * (vo.Lc ?? L);
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
        // com arredondamento, o dimensionamento não fica abaixo do momento nas faces do apoio (já com a redistribuição)
        if (op.arredondamentoApoio) for (const f of vo.faces) { const t = f.x / L, m = f.M[k] + dA * (1 - t) + dZ * t; Mpos = Math.max(Mpos, m); Mneg = Math.min(Mneg, m); }
      }
      return { Mpos, Mneg, V, T, biela, asw, Asl };
    };
    const asMinViga = (dd: number, fyd: number, fc = false) => (op.vigaTaxaMin > 0 ? (op.vigaTaxaMin / 100) * v.secao.b * v.secao.h : beamAsMin(sec, fc, dd, c, fyd));
    const flx = (M: number, dd: number, d2: number, fyd: number, fc = false) => { const r = beamFlexure(sec, fc, M, dd, d2, c, fyd); return Math.max(r.As, M ? asMinViga(dd, fyd, fc) : 0); };
    // δ: o pedido, limitado por nós fixos/móveis e por δ ≥ 0,44 + 1,25·x/d no apoio (iterado, x cresce com o momento)
    let delta = op.redistribuicao > 0 ? Math.max(1 - op.redistribuicao / 100, deltaMin) : 1;
    let env = envoltoria(delta);
    for (let it = 0; it < 6 && delta < 1; it++) {
      const xd = beamFlexure(sec, fcNeg, -env.Mneg, dS, d2S, c, aNeg.fyd).xd, req = Math.min(1, deltaX + 1.25 * xd);
      if (delta >= req - 1e-4) break;
      delta = Math.min(1, req + 0.005); env = envoltoria(delta);
    }
    const { Mpos, Mneg, V } = env;
    const envolt = envoltoriaViga(vaos, elu, delta, interno, op.envoltoriaCortante === 1);
    prolongarSobreParede(b, an, v, vaos, envolt, op.vigaApoioLongProlong);
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
      const pil = todosPilares(b).find((q) => q.id === f.pilar);
      const r2 = (x: number) => Math.round(x * 100) / 100;
      facesPilar.push({ s: r2(f.s), pilar: f.pilar, nomePilar: pil?.nome ?? '', Mmin: r2(Mmin), Mmax: r2(Mmax), combinacaoMin: cMin, combinacaoMax: cMax });
    }
    const msgs: string[] = [];
    // E2a: seção com mesa, viga de amarração e viga chata
    if (mesa) msgs.push(`Mesa colaborante: ${mesa.texto} ${op.mesaDimensionamento ? 'Flexão dimensionada na seção T onde a mesa está comprimida (NBR 6118, 14.6.2.2).' : 'Armadura calculada só com a alma; a mesa entra na rigidez da análise.'}`);
    // E2b: viga curva (torção de equilíbrio da curvatura) e viga comum a dois grupos
    if (ehCurva(v)) {
      const ds = dadosDosArcos(v);
      msgs.push(`Viga curva: ${ds.map((x) => `R = ${x.raio.toFixed(2).replace('.', ',')} m, ${x.angulo.toFixed(0)}°`).join('; ')}; poligonal de ${ds.reduce((t, x) => t + x.cordas, 0)} cordas de até ${Math.round(Math.max(...ds.map((x) => x.cordaMax)) * 100)} cm; torção de equilíbrio da curvatura (${op.curvaTorcaoEquilibrio ? 'rigidez bruta' : 'rigidez reduzida'}) verificada.`);
    }
    if (v.comum) msgs.push(`Viga comum com o grupo ${b.grupos.find((g) => g.id === v.comum!.grupo)?.nome ?? v.comum.grupo}: barra única no pórtico, recebe as lajes dos dois grupos; armadura e envoltórias só aqui.`);
    if (v.amarracao) msgs.push('Amarração: viga sem rigidez à flexão vertical (EI × 10⁻¹⁵, plano e EA rígidos); os esforços de flexão vertical são nulos e a armadura é a mínima.');
    if (v.chata) { const hc = alturaVigaChata(b, v); if (hc !== null && Math.abs(hc - v.secao.h) > 0.005) msgs.push(`Viga chata: altura de ${Math.round(v.secao.h * 100)} cm difere da laje que contorna (${Math.round(hc * 100)} cm).`); }
    if (arredondou) msgs.push(`Arredondamento do diagrama nos apoios internos: ${op.arredondamentoApoio === 1 ? 'parábola cúbica entre as faces (M e V das faces)' : 'ΔM = R·t/8 (NBR 6118, 14.6.3)'}${op.momentoFaceMin > 0 ? `; módulo mínimo ${op.momentoFaceMin.toFixed(0)} % do momento do eixo` : ''}.`);
    // avisos de modelagem (K1.3.47, K1.3.53, K1.12.1-17, K1.12.1-18): um por código, no vão mais desfavorável
    {
      const vistos = new Set<string>();
      for (const vo of vaos) for (const a of avisosDoVao(vo.L + (vo.rIni !== null ? 0 : 0), v.secao.b, v.secao.h, d, interno(vo.ini) || interno(vo.fim), vo.balanco, op.criterioLinear)) if (!vistos.has(a.codigo)) { vistos.add(a.codigo); msgs.push(a.mensagem); }
    }
    const jaDito = new Set<string>();
    for (const q of proximas) {
      const f2 = (x: number) => x.toFixed(2).replace('.', ',');
      const chave = `${q.lado}|${q.a.toFixed(3)}`;
      if (jaDito.has(chave)) continue;
      jaDito.add(chave);
      if (q.a <= d + 1e-9) msgs.push(`Carga próxima ao apoio: carga concentrada a ${f2(q.a)} m da face (≤ d = ${f2(d)} m) forma biela e tirante direto ao apoio (consolo curto): verificação e armadura horizontal manuais (NBR 6118, 17.4.1.2.1 e 22.3).`);
      else msgs.push(`Carga próxima ao apoio: carga concentrada a ${f2(q.a)} m da face (d < a < 2d): cortante da carga multiplicado por a/2d = ${f2(q.a / (2 * d))} (NBR 6118, 17.4.1.2.1).`);
    }
    if (op.redistribuicao > 0 && vaos.some((vo) => interno(vo.ini) || interno(vo.fim))) msgs.push(`Redistribuição nos apoios internos: δ = ${delta.toFixed(2).replace('.', ',')}${delta > 1 - op.redistribuicao / 100 + 1e-6 ? ` (limitado: ${deltaMin === 0.9 ? 'nós móveis, δ ≥ 0,90' : 'δ ≥ 0,75'} e δ ≥ ${deltaX.toFixed(2).replace('.', ',')} + 1,25·x/d)` : ''}.`);
    let AsInf = Math.max(flx(Mpos, dI, d2I, aPos.fyd, fcPos), asMinViga(dI, aPos.fyd, fcPos)), AsSup = Mneg < 0 ? flx(-Mneg, dS, d2S, aNeg.fyd, fcNeg) : 0;
    const AsFlex: [number, number] = [AsInf, AsSup];
    const fi = beamFlexure(sec, fcPos, Mpos, dI, d2I, c, aPos.fyd), fs = beamFlexure(sec, fcNeg, -Mneg, dS, d2S, c, aNeg.fyd);
    if (fi.double || fs.double) msgs.push('Armadura dupla (x limitado): aumente a altura.');
    // estribos: cortante + torção, com mínimo e espaçamento máximo pelo cortante (17.4.1.1.1 e 18.3.3.2)
    const aswMin = ((0.2 * c.fctm) / aEst.fyk) * v.secao.b, aswS = Math.max(aswMin, env.asw);
    let smax = V <= 0.67 * VRd2 ? Math.min(0.6 * d, 0.3) : Math.min(0.3 * d, 0.2);
    let smaxImposto = Infinity;
    if (op.vigaEstriboSmax > 0) { smax = Math.min(smax, op.vigaEstriboSmax / 100); smaxImposto = op.vigaEstriboSmax / 100; }
    const tabBarras = tabelaDe(b, 'vigas', v.tabela), tabEst0 = tabelaDe(b, 'estribos', v.tabelaEstribo);
    const tabEst = op.vigaEstriboSmin > 0 ? { ...tabEst0, linhas: tabEst0.linhas.map((l) => ({ ...l, sMin: op.vigaEstriboSmin })) } : tabEst0;
    const estT = escolherEstribo(tabEst, v.secao.b, aswS, smax);
    let est: { phi: number; s: number; legs: number } | null = estT ? { phi: estT.phi, s: estT.s, legs: estT.legs } : null;
    if (estT?.fora) msgs.push(`Fora de tabela (estribos): nenhuma bitola e número de ramos da tabela "${tabEst.nome}" dá espaçamento ≥ ${tabEst.linhas.find((l) => v.secao.b * 100 <= l.bAte + 1e-9)?.sMin ?? 10} cm para ${(aswS * 1e4).toFixed(2).replace('.', ',')} cm²/m; adotado φ${String(estT.phi).replace('.', ',')} c/${Math.round(estT.s * 100)} com ${estT.legs} ramos.`);
    if (env.biela > 1) msgs.push(env.T > 0 ? `Biela comprimida: Vsd/VRd2 + Tsd/TRd2 = ${env.biela.toFixed(2).replace('.', ',')} > 1.` : `Biela comprimida: Vsd ${V.toFixed(1)} > VRd2 ${VRd2.toFixed(1)} kN.`);
    if (env.T > 0 && est) msgs.push(`Torção: estribo fechado com ρsw = ${((est.legs * barArea(est.phi)) / (est.s * v.secao.b) * 100).toFixed(2).replace('.', ',')} % ≥ ρsw,mín = 0,2·fct,m/fywk = ${((aswMin / v.secao.b) * 100).toFixed(2).replace('.', ',')} % e s = ${Math.round(est.s * 100)} cm ≤ ${Math.floor(smax * 100)} cm (NBR 6118, 17.5.1.2) [a confirmar o espaçamento máximo da torção].`);
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
    const fissura = (As: number, Mk: number, dd: number, fc: 'pos' | 'neg') => { const bb = larg(As, fc); return bb && Mk ? crackWidth(sec, fc === 'pos' ? fcPos : fcNeg, bb.As, bb.phi, dd, Mk, c, caa).wk : 0; };
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
      wkI = MkPos ? crackWidth(sec, fcPos, bi!.As, bi!.phi, dI, MkPos, c, caa).wk : 0;
      wkS = bs && MkNeg ? crackWidth(sec, fcNeg, bs.As, bs.phi, dS, -MkNeg, c, caa).wk : 0;
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
    // N2e (K1.12.1-15): armadura longitudinal comprimida (armadura dupla): estribos como nos pilares, s ≤ mín(20 cm; b; 12φ), φt ≥ φℓ/4
    if (op.vigaEstriboComprimida && !(arm && bloq) && (fi.double || fs.double)) {
      const phiC = Math.max(fi.double ? bs?.phi ?? op.bitolaMontagem : 0, fs.double ? bi?.phi ?? 0 : 0), sC = Math.min(smax, 0.2, v.secao.b, (12 * phiC) / 1000);
      const eC = escolherEstribo(tabEst, v.secao.b, aswS, sC, phiC / 4);
      if (eC) {
        est = { phi: eC.phi, s: eC.s, legs: eC.legs }; smaxImposto = Math.min(smaxImposto, sC);
        msgs.push(`Estribos com armadura comprimida (φ${String(phiC).replace('.', ',')}): s ≤ mín(20 cm; b; 12φ) = ${Math.floor(sC * 100)} cm e φt ≥ φℓ/4 = ${(phiC / 4).toFixed(1).replace('.', ',')} mm (NBR 6118, 18.2.4 e 18.3.3.2) [a confirmar].`);
      }
    }
    // flechas por vão (cadeias de barras entre pilares), curvatura M/(Ecs·Ie) com Branson em cada seção; N2f: seção
    // homogeneizada (opção), ρ′ das barras de montagem (porta-estribos) no vão, etapas de carga e flecha ativa
    const dMont = cob.sup + 0.005 + op.bitolaMontagem / 2000, AsMont = 2 * barArea(op.bitolaMontagem);
    const rhoL = op.flechaRhoLinha ? AsMont / (v.secao.b * dI) : 0;
    const EIv = (M: number) => {
      const r = M >= 0 ? bransonFlecha(sec, fcPos, AsInf, dI, M, c, !!op.inerciaHomogeneizada, AsMont, dMont) : bransonFlecha(sec, fcNeg, Math.max(AsSup, 1e-6), dS, M, c, !!op.inerciaHomogeneizada, AsInf, v.secao.h - dI);
      return c.Ecs * 1000 * r.Ie;
    };
    const cadF = flechasVigaSets(an, membros, noPilar, usoNo, EIv, fQP, [fG, fQ, fQqp], !!op.flechaRotacaoBalanco);
    const limsV = limitesEmUso(b, op, 'viga'), etV = etapasDe(b, 'viga'), frV = fracoesViga(v.grupo);
    const qInst = op.flechaQInstantanea ? 'total' as const : 'qp' as const;
    const afR = af / (1 + 50 * rhoL);
    type Cand = { L: number; balanco: boolean; inst: FlechasInstantaneas; comp: ComposicaoEtapas; total: number };
    const cands: Cand[] = cadF.map((x) => {
      const inst = instantaneasPorCategoria(x.d[0], frV, x.d[1], x.d[2]);
      const comp = composicaoEtapas(etV, inst, { rho: rhoL, qInstantanea: qInst });
      return { L: x.L, balanco: x.balanco, inst, comp, total: op.flechaEtapas ? comp.total : (x.d[0] + x.d[2]) * (1 + afR) };
    });
    const pior = (val: (k: Cand) => number, t: TipoFlecha) => cands.reduce<{ k: Cand | null; r: number }>((m, k) => { const lim = limiteFlecha(k.L, limsV[t], k.balanco), r = Number.isFinite(lim) ? val(k) / lim : val(k) / (k.balanco ? 2 * k.L : k.L); return r > m.r ? { k, r } : m; }, { k: null, r: 0 }).k;
    const cT = pior((k) => k.total, 'total'), cQ = pior((k) => k.inst.q, 'variavel'), cA = pior((k) => k.comp.ativa, 'ativa'), cI = pior((k) => k.comp.instantanea, 'instantanea');
    const vaoT = cT?.L ?? 1, balT = cT?.balanco ?? false, vaoQ = cQ?.L ?? 1, balQ = cQ?.balanco ?? false;
    const flecha = cT?.total ?? 0, flechaQ = cQ?.inst.q ?? 0;
    const limite = limiteFlecha(vaoT, limsV.total, balT), limiteQ = limiteFlecha(vaoQ, limsV.variavel, balQ);
    const fv = resumoFlechas({ metodo: op.flechaEtapas ? 'etapas' : 'fator', instantaneas: cT?.inst ?? instantaneasPorCategoria(0, frV, 0, 0), instantanea: cI?.comp.instantanea ?? 0, diferida: cT ? cT.total - cT.comp.instantanea : 0, total: flecha, ativa: cA?.comp.ativa ?? 0, variavel: flechaQ, vao: vaoT, balanco: balT, ...(cT && op.flechaEtapas ? { etapas: cT.comp } : {}), rho: rhoL }, limsV);
    fv.limites.ativa = cA ? limiteFlecha(cA.L, limsV.ativa, cA.balanco) : Infinity; fv.limites.instantanea = cI ? limiteFlecha(cI.L, limsV.instantanea, cI.balanco) : Infinity;
    fv.limites.variavel = limiteQ;
    if (flecha > limite) msgs.push(`Flecha total ${(flecha * 1000).toFixed(1)} mm > ${textoLimite(limsV.total, balT)} = ${(limite * 1000).toFixed(1)} mm (Branson por seção, ${op.flechaEtapas ? `por etapas: ${(cT!.comp.fatorTotal).toFixed(2).replace('.', ',')} × instantânea, ξ médio ${cT!.comp.xiMedio.toFixed(2).replace('.', ',')}` : `× (1 + αf = ${(1 + afR).toFixed(2).replace('.', ',')})`}).`);
    if (flechaQ > limiteQ) msgs.push(`Flecha das variáveis ${(flechaQ * 1000).toFixed(1)} mm > ${textoLimite(limsV.variavel, balQ).replace('2ℓ', 'ℓ')} = ${(limiteQ * 1000).toFixed(1)} mm.`);
    msgs.push(...mensagensFlechasNovas(fv));
    // E2b: a armadura longitudinal curva em planta empurra o concreto para fora da curva (força de desvio As·fyd/R por metro)
    if (ehCurva(v)) {
      const Rmin = Math.min(...dadosDosArcos(v).map((x) => x.raio)), qd = (Math.max(AsInf * aPos.fyd, AsSup * aNeg.fyd) * 1000) / Rmin;
      msgs.push(`Desvio da armadura em viga curva: força radial da armadura longitudinal ≈ ${qd.toFixed(1).replace('.', ',')} kN/m (As·fyd/R, R mín = ${Rmin.toFixed(2).replace('.', ',')} m); os estribos devem equilibrá-la além do cortante e da torção (verificação a confirmar).`);
    }
    // pilares que nascem sobre a viga (E1a): carga concentrada na base e cortante junto às faces do pilar
    const transicoes: TransicaoViga[] = [];
    for (const [pid, ap] of Object.entries(an.apoiados ?? {})) {
      if (ap.apoio !== 'viga' || !ap.ligado) continue;
      const pil = b.pilares.find((x) => x.id === pid), apo = pil ? apoioDoPilar(b, pil) : null;
      if (!pil || apo?.tipo !== 'viga' || !apo.vigas.includes(v.id)) continue;
      const l0 = lancesDoPilar(b, pil)[0], bi0 = pm.barras.findIndex((t) => t.tipo === 'pilar' && t.ref === pid && t.pavimento === l0?.id);
      if (bi0 < 0) continue;
      const pcN = porCaso(an, bi0, [0]);
      let Nd = 0, cNd = '';
      for (const cb of elu) { const n = -comb(pcN, cb, 0, 'N'); if (n > Nd) { Nd = n; cNd = cb.nome; } }
      const c0 = centroNoLance(pil, l0.id), ss = contornoNoLance(pil, l0.id).map((q) => abscissa(v.pontos, q)), sA = Math.min(...ss), sB = Math.max(...ss);
      const perto = (sx: number) => { let m = 0, dm = Infinity; for (const q of envolt.pontos) { const dd = Math.abs(q.s - sx); if (dd < dm - 1e-9) { dm = dd; m = Math.max(Math.abs(q.Vmax), Math.abs(q.Vmin)); } } return m; };
      const Vfaces: [number, number] = [perto(sA), perto(sB)];
      const Aswp = est ? (est.legs * barArea(est.phi)) / est.s : 0, VRd3 = Vc0 + Aswp * 0.9 * d * fywd * 1000;
      const ruim = Math.max(...Vfaces) > Math.min(VRd3, VRd2) + 1e-6;
      transicoes.push({ pilar: pid, nome: pil.nome, s: abscissa(v.pontos, c0), sFaces: [sA, sB], Nd, combinacao: cNd, Vfaces, VRd3, VRd2, status: ruim ? 'fail' : 'ok' });
      const f1 = (x: number) => x.toFixed(1).replace('.', ',');
      msgs.push(ruim
        ? `Transição ${pil.nome} (Nd = ${f1(Nd)} kN): cortante junto às faces ${f1(Math.max(...Vfaces))} kN acima de VRd3 = ${f1(Math.min(VRd3, VRd2))} kN dos estribos adotados.`
        : `Transição: ${pil.nome} nasce sobre a viga (Nd = ${f1(Nd)} kN, ${cNd}); cortante junto às faces ${f1(Vfaces[0])} e ${f1(Vfaces[1])} kN ≤ VRd3 = ${f1(VRd3)} kN.`);
    }
    const txt = (x: ReturnType<typeof chooseBars>) => (x ? `${x.n} φ${String(x.phi).replace('.', ',')}${x.layers > 1 ? ` (${x.layers} camadas)` : ''}` : '—');
    if (mem) {
      // memória detalhada (MD): estação e combinação que dão cada extremo, com os valores por caso refeitos na mesma ordem da soma
      const compor = (alvo: number, campo: 'M' | 'V'): ComposicaoEsforco | undefined => {
        for (const vo of vaos) for (let k = 0; k < elu.length; k++) {
          const Mv = vo.Mv[k], n = Mv.length;
          const dA = delta < 1 && interno(vo.ini) && Mv[0] < 0 ? (1 - delta) * -Mv[0] : 0, dZ = delta < 1 && interno(vo.fim) && Mv[n - 1] < 0 ? (1 - delta) * -Mv[n - 1] : 0;
          for (let i = 0; i < n; i++) {
            const t = vo.xs[i] / vo.L, val = campo === 'M' ? vo.M[k][i] + dA * (1 - t) + dZ * t : vo.corte[i] ? Math.abs(vo.V[k][i] - (dZ - dA) / vo.L) : NaN;
            if (val !== alvo || !vo.org) continue;
            const o = vo.org[i], pc = porCaso(an, o.bi, [o.x]), parcelas: [string, number, number][] = [];
            for (const nome in elu[k].fatores) { const e = pc[nome]; if (e) parcelas.push([nome, elu[k].fatores[nome], e[0][campo === 'M' ? 'Mz' : 'Vy']]); }
            return { combinacao: elu[k].nome, s: vo.s[i], parcelas, combinado: campo === 'M' ? vo.M[k][i] : vo.V[k][i], dA, dZ, t, L: vo.L, total: val };
          }
        }
        return undefined;
      };
      registrarViga(mem, {
        elemento: `Viga ${v.nome}`, b: v.secao.b, h: v.secao.h, c, fyk: aPos.fyk, fydPos: aPos.fyd, fydNeg: aNeg.fyd, fywk: aEst.fyk, fywd, gs, cob, dI, dS, d2I, d2S, d,
        sec, fcPos, fcNeg, taxaMin: op.vigaTaxaMin, Mpos, Mneg, V, delta, redistribuicao: op.redistribuicao, deltaMin, deltaX, det: envolt.determinantes,
        comp: { Mpos: compor(Mpos, 'M'), ...(Mneg < 0 ? { Mneg: compor(Mneg, 'M') } : {}), V: compor(V, 'V') },
        env: { asw: env.asw, T: env.T, biela: env.biela, Asl: env.Asl }, AsNec: AsFlex, AsInf, AsSup, bi, bs, bloq,
        VRd2, Vc0, aswMin, aswS, smax, est, al, MkPos, MkNeg, wk: [wkI, wkS], wkLim, caa,
        flecha: cT ? { metodo: op.flechaEtapas ? 'etapas' : 'fator', L: cT.L, balanco: cT.balanco, dG: cadF[cands.indexOf(cT)].d[0], dQ: cadF[cands.indexOf(cT)].d[1], dQqp: cadF[cands.indexOf(cT)].d[2], af, rho: rhoL, afR, total: flecha, limite, limiteTxt: textoLimite(limsV.total, balT), flechaQ, limiteQ, limiteQTxt: textoLimite(limsV.variavel, balQ), AsMont, homogeneizada: !!op.inerciaHomogeneizada, inst: cT.inst, comp: cT.comp, qInst } : null,
      });
    }
    if (!bi && AsInf > 0) msgs.push('Armadura inferior não cabe na largura.');
    if ((aPos.aco === 'CA-60' && (bi?.phi ?? 0) > 10) || (aNeg.aco === 'CA-60' && (bs?.phi ?? 0) > 10)) msgs.push(AVISO_CA60);
    out.push({
      viga: v.id, nome: v.nome, grupo: v.grupo, b: v.secao.b, h: v.secao.h, L: comprimentoPolilinha(v.pontos),
      flecha, limite, flechaQ, limiteQ, flechas: fv,
      Mpos, Mneg, V, envoltoria: envolt, facesPilar, ...(vaos.some((x) => x.Lc !== undefined) ? { vaosParede: vaos.filter((x) => x.Lc !== undefined).map((x) => ({ L: x.L, Lc: x.Lc! })) } : {}), origens: [
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
      ...(transicoes.length ? { transicoes } : {}),
      ...(smaxImposto < Infinity ? { estriboSmax: smaxImposto } : {}),
      status: msgs.some((x) => x.startsWith('Transição ') || x.startsWith('Biela') || x.startsWith('Armadura inferior') || x.startsWith('Armadura bloqueada insuficiente') || (x.startsWith('Flecha') && !x.startsWith('Flecha instantânea')) || x.startsWith('Abertura')) ? 'fail' : 'ok', mensagens: msgs,
      bloqueada: bloq, arranjo: { inf: bi ? { n: bi.n, phi: bi.phi } : null, sup: AsSup && bs ? { n: bs.n, phi: bs.phi } : null, estribo: est ? { phi: est.phi, s: est.s, ...(est.legs > 2 ? { legs: est.legs } : {}) } : null, laterais: lat ? { n: lat.n, phi: lat.phi } : null },
    });
  }
  return out;
}

/**
 * Armadura de suspensão (N2e, NBR 6118, 18.3.6): onde uma viga termina sobre outra (apoio indireto), a reação de cálculo
 * da apoiada (cortante na ponta da envoltória) é resistida por estribos adicionais na viga de apoio, distribuídos na
 * largura bw da apoiada + h/2 de cada lado [a confirmar]. Vigas contínuas por cima da de apoio não entram.
 */
function suspensoesVigas(b: BuildingModel, an: AnaliseEdificio, vigas: ResultadoViga[]) {
  const op = an.opcoes;
  if (!op.vigaSuspensao) return;
  const fywd = Math.min(acoDe(b, 'vigaEstribo').fyk / gamas(b).s, 435), porId = new Map(vigas.map((r) => [r.viga, r]));
  for (const v2 of b.vigas) {
    const r2 = porId.get(v2.id), pts = r2?.envoltoria.pontos;
    if (!r2 || !pts?.length) continue;
    for (const fim of [false, true]) {
      const P = fim ? v2.pontos.at(-1)! : v2.pontos[0], sEnd = fim ? r2.L : 0;
      if (r2.facesPilar.some((f) => Math.abs(f.s - sEnd) < 0.75)) continue; // apoiada em pilar
      const q = fim ? pts.at(-1)! : pts[0], Rd = Math.max(Math.abs(q.Vmax), Math.abs(q.Vmin));
      if (Rd < 1e-6) continue;
      for (const v1 of b.vigas) {
        if (v1.id === v2.id || v1.grupo !== v2.grupo || distPolilinha(v1.pontos, P) > v1.secao.b / 2 + 0.02) continue;
        const r1 = porId.get(v1.id), s1 = abscissa(v1.pontos, P), L1 = comprimentoPolilinha(v1.pontos);
        if (!r1 || s1 < 0.05 || s1 > L1 - 0.05) continue;
        const e1 = r1.arranjo.estribo;
        if (!e1) continue;
        const As = armaduraSuspensao(Rd, fywd, op.vigaSuspensaoFator), legs = e1.legs ?? 2, n = estribosSuspensao(As, legs, barArea(e1.phi)), larg = larguraSuspensao(v2.secao.b, v1.secao.h);
        (r1.suspensoes ??= []).push({ viga: v2.id, nome: v2.nome, s: s1, Rd, As, n, phi: e1.phi, largura: larg });
        r1.mensagens.push(`Suspensão: ${v2.nome} apoia-se nesta viga em s = ${s1.toFixed(2).replace('.', ',')} m (Rd = ${Rd.toFixed(1).replace('.', ',')} kN): ${n} estribos adicionais φ${String(e1.phi).replace('.', ',')} (${legs} ramos) em ${Math.round(larg * 100)} cm, As = ${(As * 1e4).toFixed(2).replace('.', ',')} cm² (NBR 6118, 18.3.6).`);
        break;
      }
    }
  }
}

/**
 * Flechas imediatas de uma viga por vão: cadeias de barras do pórtico entre pilares (ou pontas), curvatura
 * κ = M/EI(M) integrada (Mohr): vão apoiado → deslocamento relativo à reta dos apoios, d(x) = ∫κ·G(x, ξ);
 * balanço (ponta sem pilar nem outra viga) → d = −∫κ·|ξ − x_livre| com tangente fixa no apoio.
 */
export function flechasViga(an: AnaliseEdificio, membros: number[], noPilar: Set<number>, usoNo: Map<number, number>, EI: (M: number) => number, fQP: Record<string, number>, fQ: Record<string, number>) {
  const out = { qp: 0, q: 0, vao: 1, vaoQ: 1, balanco: false, balancoQ: false };
  for (const c of flechasVigaSets(an, membros, noPilar, usoNo, EI, fQP, [fQP, fQ])) {
    const [dqp, dq] = c.d, Lr = c.balanco ? 2 * c.L : c.L;
    if (dqp / Lr > out.qp / (out.balanco ? 2 * out.vao : out.vao)) { out.qp = dqp; out.vao = c.L; out.balanco = c.balanco; }
    if (dq / Lr > out.q / (out.balancoQ ? 2 * out.vaoQ : out.vaoQ)) { out.q = dq; out.vaoQ = c.L; out.balancoQ = c.balanco; }
  }
  return out;
}

/**
 * Flechas imediatas de cada vão da viga para vários conjuntos de fatores por caso (N2f): a rigidez de cada seção vem
 * de `EI(M)` com o momento da combinação `fMom` (quase permanente). Vão apoiado: maior deslocamento relativo à reta
 * dos apoios; balanço: deslocamento da ponta com tangente fixa no apoio e, com `rotacao`, mais o giro do apoio no
 * pórtico (K1.14-7: rotações por caso) [a confirmar: giro elástico do modelo].
 */
export function flechasVigaSets(an: AnaliseEdificio, membros: number[], noPilar: Set<number>, usoNo: Map<number, number>, EI: (M: number) => number, fMom: Record<string, number>, sets: Record<string, number>[], rotacao = false) {
  const pm = an.portico, mb = pm.modelo.barras;
  const cadeias = cadeiasViga(an, membros, noPilar);
  const out: { L: number; balanco: boolean; d: number[] }[] = [];
  for (const cad of cadeias) {
    const est: { x: number; k: number[]; dx: number }[] = [];
    let x0 = 0;
    for (const bi of cad) {
      const { L } = baseBarra(pm.modelo, mb[bi]);
      const n = pm.barras[bi].fina ? Math.max(2, Math.ceil(L / 0.1 - 1e-9)) : Math.max(8, Math.ceil(L / 0.1)), xs = Array.from({ length: n }, (_, k) => ((k + 0.5) * L) / n);
      const pc = porCaso(an, bi, xs, true);
      const m = (f: Record<string, number>, k: number) => Object.entries(f).reduce((t, [cs, v]) => t + v * (pc[cs]?.[k]?.Mz ?? 0), 0);
      xs.forEach((x, k) => {
        const ei = EI(m(fMom, k));
        est.push({ x: x0 + x, k: sets.map((f) => m(f, k) / ei), dx: L / n });
      });
      x0 += L;
    }
    const L = x0, a = mb[cad[0]].i, z = mb[cad.at(-1)!].j;
    const livre = (no: number) => !noPilar.has(no) && (usoNo.get(no) ?? 0) <= 1;
    const balanco = livre(a) !== livre(z) ? (livre(a) ? 0 : L) : null;
    const d = sets.map(() => 0);
    if (balanco !== null) {
      for (const e of est) for (let s = 0; s < sets.length; s++) d[s] -= e.k[s] * Math.abs(e.x - balanco) * e.dx;
      if (rotacao && pm.res) {
        // giro do apoio do balanço: deslocamento vertical da ponta = −(θ × r)z, r = ponta − apoio (horizontal)
        const ap = balanco === 0 ? z : a, pt = balanco === 0 ? a : z, P = pm.modelo.nos;
        const rx = P[pt][0] - P[ap][0], ry = P[pt][1] - P[ap][1];
        sets.forEach((f, s) => {
          let th = 0;
          an.casos.forEach((cs, ic) => { const v = f[cs]; const u = pm.res!.desloc[ic]; if (v && u) th += v * -(u[ap * 6 + 3] * ry - u[ap * 6 + 4] * rx); });
          d[s] += th;
        });
      }
      for (let s = 0; s < sets.length; s++) d[s] = Math.abs(d[s]);
    } else {
      for (let k = 0; k <= 20; k++) {
        const x = (k * L) / 20, w = sets.map(() => 0);
        for (const e of est) { const G = e.x <= x ? (e.x * (L - x)) / L : (x * (L - e.x)) / L; for (let s = 0; s < sets.length; s++) w[s] += e.k[s] * G * e.dx; }
        for (let s = 0; s < sets.length; s++) d[s] = Math.max(d[s], w[s]);
      }
    }
    out.push({ L, balanco: balanco !== null, d });
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
  determinantes?: { combinacao: string; Nd: number; Mu: [number, number]; Mv: [number, number]; MuTot: number; MvTot: number; tracao: boolean; /** Maior momento nas seções intermediárias (u, v), com carga horizontal no lance. */ Mi?: [number, number] }[];
  /** Origem de cada grandeza: combinação determinante, fórmula e item da NBR 6118. */
  origens?: Origem[];
  /** Comprimentos de flambagem (m) nas direções u (ao longo de b) e v. */
  le: [number, number];
  /**
   * Efeitos locais de 2ª ordem por direção (N2c): método (λ ≤ 90 pilar-padrão com curvatura aproximada; 90 < λ ≤ 140 o
   * mesmo com fluência; 140 < λ ≤ 200 método geral com fluência), excentricidade de fluência e_cc (m) e lances somados
   * (lances desligados).
   */
  local?: { metodo: [MetodoLocal, MetodoLocal]; ecc: [number, number]; lances: [number, number]; secoesIntermediarias: boolean };
  /** Cortante por direção (N2c): u = esforço ao longo de b (Vy local), v = ao longo de h; kN, cm²/m e cm². */
  cortante?: { u: CortanteDirecao; v?: CortanteDirecao };
  armadura: string; As: number; estribo: string; status: 'ok' | 'fail' | 'review'; mensagens: string[];
}

export type MetodoLocal = 'curvatura' | 'curvaturaFluencia' | 'geral';
export const METODO_LOCAL_TXT: Record<MetodoLocal, string> = { curvatura: 'pilar-padrão com curvatura aproximada', curvaturaFluencia: 'pilar-padrão com curvatura aproximada e fluência', geral: 'método geral (M–N–1/r) com fluência' };
/** Cortante numa direção do pilar: maior Vsd, Vc e VRd2 dessa combinação, Asw/s necessária e As longitudinal das faces. */
export interface CortanteDirecao { Vsd: number; Vc: number; VRd2: number; asw: number; AsLong: number; combinacao: string }

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

function dimensionarPilares(b: BuildingModel, an: AnaliseEdificio, elu: CombinacaoEd[], qp?: CombinacaoEd): ResultadoPilar[] {
  const FYD = acoDe(b, 'pilarLong').fyd, acoLong = acoDe(b, 'pilarLong').aco;
  const pm = an.portico, out: ResultadoPilar[] = [], op = an.opcoes, mem = memoriaAtiva();
  for (const p of b.pilares) {
  // de cima para baixo: o último e o penúltimo lances pelos seus esforços; abaixo, com a opção de continuidade,
  // nenhum lance com menos armadura nem bitola de canto menor que o de cima (critério do programa de referência)
  const ls = lancesDoPilar(b, p), res: ResultadoPilar[] = [];
  let acima: { As: number; phi: number; arr: ArranjoPilar; sec: string } | null = null;
  for (let li = ls.length - 1; li >= 0; li--) {
    const lance = ls[li], cont = op.continuidadePilares && li <= ls.length - (op.pilarContinuidadeInicio ? 3 : 2) && acima ? acima : null;
    const c = concretoDe(b, 'pilar', lance.id, p), cob = cobrimentoPilar(b, p.cobrimento);
    const bi = pm.barras.findIndex((t) => t.tipo === 'pilar' && t.ref === p.id && t.pavimento === lance.id);
    if (bi < 0) continue;
    const s = secaoNoLance(p, lance.id), [w, h] = dimsSecao(s);
    const circ = s.tipo === 'circ' ? s.d : null;
    const { L } = baseBarra(pm.modelo, pm.modelo.barras[bi]);
    // seções intermediárias (N2c, K1.12.4-18): com carga horizontal no lance, também nas cargas e em nove pontos internos
    const cargasLance = (b.cargasPilar ?? []).filter((x) => x.pilar === p.id && x.pavimento === lance.id && (x.Hx || x.Hy) && ((x.tipo ?? 'concentrada') !== 'concentrada' || (x.altura !== undefined && x.altura > 1e-9 && x.altura < L - 1e-9)));
    const xsInt = cargasLance.length ? [...new Set([...cargasLance.flatMap((x) => (x.tipo ?? 'concentrada') === 'concentrada' ? [x.altura!] : x.tipo === 'faixa' ? [x.altura ?? 0, x.ate ?? L] : []), ...Array.from({ length: 9 }, (_, k) => ((k + 1) * L) / 10)].filter((x) => x > 1e-9 && x < L - 1e-9).map((x) => Math.min(L, x)))].sort((a, z) => a - z) : [];
    const pc = porCaso(an, bi, [0, L, ...xsInt]);
    const poly: Pt[] = circ ? circlePolygon(circ) : [[0, 0], [w, 0], [w, h], [0, h]];
    const P = polyProps(poly), Ac = circ ? (Math.PI * circ * circ) / 4 : w * h;
    const iu = Math.sqrt(P.Iy / P.A), iv = Math.sqrt(P.Ix / P.A); // u ao longo de x da seção (b), v ao longo de y (h)
    // comprimento de flambagem por direção: ℓe = mín(ℓ0 + h; ℓ) × α (NBR 6118, 15.6; nós contraventados pelo diafragma)
    const fl = flambagemLance(b, p, lance.id), lamU = fl.leU / iu, lamV = fl.leV / iv, le: [number, number] = [fl.leU, fl.leV];
    const gn = gammaNFor(Math.min(w, h));
    const msgs: string[] = [];
    { const pcu = avisoPilarCurto(L, w, h, op.criterioLinear); if (pcu) msgs.push(pcu.mensagem); }
    if (Math.max(lamU, lamV) > 200) { res.push({ pilar: p.id, nome: p.nome, pavimento: lance.nome, secao: secTxt(s), Nd: 0, util: 99, lambda: [lamU, lamV], le, armadura: '—', As: 0, estribo: '—', status: 'fail', mensagens: ['λ > 200.'] }); continue; }
    // solicitações por combinação: Nd (compressão +), momentos nas duas direções nas duas pontas (u: flexão com deslocamento ao longo de b → Mz local)
    const sol = elu.map((cb) => {
      const N0 = -comb(pc, cb, 0, 'N') * gn, NL = -comb(pc, cb, 1, 'N') * gn;
      // maior momento nas seções intermediárias (com sinal), por direção
      const mi = (k: 'Mz' | 'My') => xsInt.reduce((m, _, j) => { const v = comb(pc, cb, 2 + j, k) * gn; return Math.abs(v) > Math.abs(m) ? v : m; }, 0);
      return { nome: cb.nome, Nd: Math.max(N0, NL), Nt: Math.min(N0, NL), Mu: [comb(pc, cb, 0, 'Mz') * gn, comb(pc, cb, 1, 'Mz') * gn], Mv: [comb(pc, cb, 0, 'My') * gn, comb(pc, cb, 1, 'My') * gn], Mi: [mi('Mz'), mi('My')] as [number, number] };
    });
    const NdMax = Math.max(0, ...sol.map((x) => x.Nd));
    const AsMin = Math.max((0.15 * NdMax) / 1000 / FYD, ((op.pilarTaxaMin || 0.4) / 100) * Ac), AsMax = 0.04 * Ac;
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
    // efeitos locais (N2c): método por esbeltez e fluência (15.8.4) para λ > 90, com NSg e MSg da quase permanente
    const metodo = [lamU, lamV].map((l) => (l > 140 ? 'geral' : l > 90 ? 'curvaturaFluencia' : 'curvatura')) as [MetodoLocal, MetodoLocal];
    const ecc: [number, number] = [0, 0];
    [lamU, lamV].forEach((lam, k) => {
      if (lam <= 90 || !qp) return;
      const NSg = Math.max(-comb(pc, qp, 0, 'N'), -comb(pc, qp, 1, 'N')), kM = k === 0 ? 'Mz' : 'My', MSg = Math.max(Math.abs(comb(pc, qp, 0, kM)), Math.abs(comb(pc, qp, 1, kM)));
      const leK = k === 0 ? fl.leU : fl.leV, I = k === 0 ? P.Iy : P.Ix;
      ecc[k] = excentricidadeFluencia(NSg, MSg, excentricidadeAcidental(fl.l, leK), op.pilarFluencia, c.Eci * 1000 * I, leK);
    });
    const direcao = (Nd: number, M: number[], hDir: number, lam: number, Le: number, Mi = 0, e = 0) => {
      const MA = Math.max(Math.abs(M[0]), Math.abs(M[1])), MB = Math.min(Math.abs(M[0]), Math.abs(M[1]));
      const M1min = Nd * (0.015 + 0.03 * hDir);
      // momentos internos com o mesmo sinal nas pontas = curvatura simples (MB/MA > 0); sinais opostos = curvatura dupla
      let ab = Math.max(0.4, Math.min(1, 0.6 + 0.4 * (MA > 0 ? (M[0] * M[1] > 0 ? MB / MA : -MB / MA) : 0)));
      if (MA < M1min) ab = 1;
      // carga transversal no lance: maior momento interno com αb = 1 (15.8.2)
      const MAi = Math.max(MA, Math.abs(Mi));
      if (MAi > MA) ab = 1;
      const lam1 = Math.max(35, Math.min(90, (25 + (12.5 * (MAi / Math.max(Nd, 1e-9))) / hDir) / ab));
      const nu = Nd / 1000 / (Ac * c.fcd), curv = Math.min(0.005 / (hDir * (nu + 0.5)), 0.005 / hDir);
      const M2 = lam > lam1 ? ((Nd * Le * Le) / 10) * curv : 0;
      const base = Math.max(MAi, M1min) + Nd * e;
      return { tot: Math.max(ab * base + M2, base), M1: base, M2, MA, MB, MAi, M1min, ab, lam1, nu, curv, e };
    };
    /** Método geral (λ > 140): barra birrotulada de comprimento ℓe com M1 linear entre as pontas (≥ M1d,mín), Nd·e_cc e a relação M–N–1/r da seção. */
    const geral = (S: FiberSection, Nd: number, M: number[], hDir: number, Le: number, dir: 0 | 1, e: number) => {
      const M1min = Nd * (0.015 + 0.03 * hDir), MA = Math.max(Math.abs(M[0]), Math.abs(M[1]));
      const sg = Math.abs(M[1]) > Math.abs(M[0]) ? Math.sign(M[1]) || 1 : Math.sign(M[0]) || 1;
      const M1 = MA < M1min ? () => sg * M1min + sg * Nd * e : (x: number) => M[0] + ((M[1] - M[0]) * x) / Le + sg * Nd * e;
      const rel = relacaoMCurvatura(S, Nd / 1000, dir);
      if (!rel) return Infinity;
      const r = metodoGeral(Le, Nd, M1, (m) => rel(m / 1000));
      return r.erro ? Infinity : r.Mmax;
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
        const du = direcao(x.Nd, x.Mu, w, lamU, fl.leU, x.Mi[0], ecc[0]), dv = direcao(x.Nd, x.Mv, h, lamV, fl.leV, x.Mi[1], ecc[1]);
        if (!Number.isFinite(ecc[0] + ecc[1])) { sobe(99, x.nome); continue; }
        if (metodo[0] === 'geral') { const t = geral(S, x.Nd, x.Mu, w, fl.leU, 0, ecc[0]); if (!Number.isFinite(t)) { sobe(99, x.nome); continue; } du.tot = Math.max(t, du.M1); }
        if (metodo[1] === 'geral') { const t = geral(S, x.Nd, x.Mv, h, fl.leV, 1, ecc[1]); if (!Number.isFinite(t)) { sobe(99, x.nome); continue; } dv.tot = Math.max(t, dv.M1); }
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
    const tabP = tabelaPilarNaSecao(tabelaDe(b, 'pilares', p.tabela), w, h), restrito = pilarRestrito(tabP);
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
    if (Math.max(lamU, lamV) > 90) {
      const k = lamU >= lamV ? 0 : 1, f = (x: number) => (Number.isFinite(x) ? (x * 100).toFixed(2).replace('.', ',') + ' cm' : 'instável');
      msgs.push(`λ > 90 (${Math.max(lamU, lamV).toFixed(0)}): ${METODO_LOCAL_TXT[metodo[k]]}${qp ? `, φ = ${String(op.pilarFluencia).replace('.', ',')}, e_cc = ${f(ecc[k])}` : ', sem combinação quase permanente para a fluência'} (NBR 6118, ${metodo[k] === 'geral' ? '15.8.3.2' : '15.8.3.3.2'} e 15.8.4).`);
    }
    if (fl.desligados[0] > 1 || fl.desligados[1] > 1) msgs.push(`Lances desligados: ℓe soma ${Math.max(...fl.desligados)} lances sem travamento (${fl.desligados[0] > 1 ? `u: ${fl.leU.toFixed(2).replace('.', ',')} m` : ''}${fl.desligados[0] > 1 && fl.desligados[1] > 1 ? '; ' : ''}${fl.desligados[1] > 1 ? `v: ${fl.leV.toFixed(2).replace('.', ',')} m` : ''}).`);
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
    const porDir: (CortanteDirecao | undefined)[] = [];
    for (const cb of elu) for (const i of [0, 1]) {
      const Vy = comb(pc, cb, i, 'Vy') * gn, Vz = comb(pc, cb, i, 'Vz') * gn, Nc = -comb(pc, cb, i, 'N'), comp = Nc > 0;
      const Vs = circ ? [Math.hypot(Vy, Vz)] : [Math.abs(Vy), Math.abs(Vz)];
      Vs.forEach((V, k) => {
        const { bw, d, WA } = dirs[k], Vc0 = 0.6 * c.fctd * bw * d * 1000, VRd2 = 0.27 * c.av2 * c.fcd * bw * d * 1000;
        const Msd = circ ? Math.max(Math.hypot(comb(pc, cb, 0, 'Mz'), comb(pc, cb, 0, 'My')), Math.hypot(comb(pc, cb, 1, 'Mz'), comb(pc, cb, 1, 'My'))) * gn : Math.max(Math.abs(comb(pc, cb, 0, dirs[k].M)), Math.abs(comb(pc, cb, 1, dirs[k].M))) * gn;
        const Vc = comp ? Math.min(2 * Vc0, Vc0 * (1 + (Msd > 1e-9 ? ((Nc / gg) * WA) / Msd : 1))) : 0;
        if (V > Vd) cVd = cb.nome;
        Vd = Math.max(Vd, V); biela = Math.max(biela, V / VRd2);
        const aswK = V > Vc ? Math.max(((0.2 * c.fctm) / acoDe(b, 'pilarEstribo').fyk) * bw, (V - Vc) / 1000 / (0.9 * d * Math.min(acoDe(b, 'pilarEstribo').fyk / gamas(b).s, 435))) : 0;
        if (V > Vc) asw = Math.max(asw, aswK);
        const pd = porDir[k];
        if (!pd || V > pd.Vsd) porDir[k] = { Vsd: V, Vc, VRd2, asw: Math.max(aswK, pd?.asw ?? 0), AsLong: 0, combinacao: cb.nome };
        else if (aswK > pd.asw) pd.asw = aswK;
      });
    }
    // As longitudinal das faces perpendiculares a cada direção (cm²): u → faces em x = a e b − a; v → em y
    { const ar = melhor.arr as { n?: number; nb?: number; nh?: number; nbS?: number; nhD?: number }, Ab = barArea(melhor.phi) * 1e4;
      if (porDir[0]) porDir[0].AsLong = circ ? melhor.As * 1e4 : ((ar.nh ?? 2) + (ar.nhD ?? ar.nh ?? 2)) * Ab;
      if (porDir[1]) porDir[1].AsLong = ((ar.nb ?? 2) + (ar.nbS ?? ar.nb ?? 2)) * Ab; }
    const r3 = (x: number) => Math.round(x * 1000) / 1000;
    const cortante = porDir[0] ? { u: { ...porDir[0], Vsd: r3(porDir[0].Vsd), Vc: r3(porDir[0].Vc), VRd2: r3(porDir[0].VRd2), asw: r3(porDir[0].asw * 1e4), AsLong: r3(porDir[0].AsLong) }, ...(porDir[1] ? { v: { ...porDir[1], Vsd: r3(porDir[1].Vsd), Vc: r3(porDir[1].Vc), VRd2: r3(porDir[1].VRd2), asw: r3(porDir[1].asw * 1e4), AsLong: r3(porDir[1].AsLong) } } : {}) } : undefined;
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
    // C4.42: o cortante pede mais ramos do que um estribo dá (s < 10 cm com a maior bitola da tabela): só um estribo foi colocado
    if (!bloq && estV && est === estV && est.s < 0.1 - 1e-9) msgs.push(`Estribo fora da tabela: o cortante exige mais ramos e só um estribo (2 ramos) foi colocado (φ${String(est.phi).replace('.', ',')} c/${Math.round(est.s * 100)}${!circ && gramposPorEstribo(w, h, a, (melhor.arr as { nb?: number }).nb ?? 2, (melhor.arr as { nh?: number }).nh ?? 2, est.phi) ? ', com grampos' : ''}); revise a tabela de armaduras e a disposição dos estribos.`);
    // tabela de grampos (R7g): modo 'nenhum' dispensa grampos que a 18.2.4 pede
    if (!circ && modoGrampos(tabP, melhor.phi, w, h) === 'nenhum') {
      const ar = melhor.arr as { nb?: number; nh?: number; nbS?: number; nhD?: number };
      if (gramposPorEstribo(w, h, cob + 0.005 + est.phi / 1000 + melhor.phi / 2000, ar.nb ?? 2, ar.nh ?? 2, est.phi, ar.nbS, ar.nhD) > 0) msgs.push(`Grampos fora da NBR 6118 (18.2.4): a tabela "${tabP.nome}" dispensa os grampos das barras a mais de 20φt de um canto.`);
    }
    if (msgs.some((x) => x.startsWith('Armadura bloqueada insuficiente') || x.startsWith('Armadura bloqueada acima'))) status = 'fail';
    const r2 = (x: number) => Math.round(x * 100) / 100;
    const determinantes = [
      ...solD.map((x) => {
        const du = direcao(x.Nd, x.Mu, w, lamU, fl.leU, x.Mi[0], ecc[0]), dv = direcao(x.Nd, x.Mv, h, lamV, fl.leV, x.Mi[1], ecc[1]);
        // método geral: o total vem da integração com a armadura adotada
        if (metodo.includes('geral') && Number.isFinite(ecc[0] + ecc[1])) {
          const a0 = cob + 0.005 + melhor!.phi / 2000, S: FiberSection = { mesh, bars: barrasDoArranjo(poly, circ, a0, melhor!.arr, barArea(melhor!.phi)), cx: P.cx, cy: P.cy, c, fyd: FYD, poly };
          if (metodo[0] === 'geral') du.tot = Math.max(geral(S, x.Nd, x.Mu, w, fl.leU, 0, ecc[0]), du.M1);
          if (metodo[1] === 'geral') dv.tot = Math.max(geral(S, x.Nd, x.Mv, h, fl.leV, 1, ecc[1]), dv.M1);
        }
        return { combinacao: x.nome, Nd: r2(x.Nd), Mu: x.Mu.map(r2) as [number, number], Mv: x.Mv.map(r2) as [number, number], MuTot: r2(du.tot), MvTot: r2(dv.tot), tracao: false, ...(xsInt.length ? { Mi: x.Mi.map(r2) as [number, number] } : {}) };
      }),
      ...traD.map((x) => ({ combinacao: x.nome, Nd: r2(x.Nt), Mu: x.Mu.map(r2) as [number, number], Mv: x.Mv.map(r2) as [number, number], MuTot: r2(Math.max(Math.abs(x.Mu[0]), Math.abs(x.Mu[1]))), MvTot: r2(Math.max(Math.abs(x.Mv[0]), Math.abs(x.Mv[1]))), tracao: true })),
    ];
    const elMem = `Pilar ${p.nome} · ${lance.nome}`;
    if (mem?.aceita(elMem)) {
      // memória detalhada (MD): combinação determinante refeita com a armadura adotada (mesmas funções e a mesma ordem)
      const dS = solD.find((x) => x.nome === melhor!.det), dT = dS ? undefined : traD.find((x) => x.nome === melhor!.det);
      const a0 = cob + 0.005 + melhor.phi / 2000, barsF = barrasDoArranjo(poly, circ, a0, melhor.arr, barArea(melhor.phi));
      const simF = !('nbS' in melhor.arr || 'nhD' in melhor.arr), SF: FiberSection = { mesh, bars: barsF, cx: P.cx, cy: P.cy, c, fyd: FYD, poly };
      const cheque = (rotulo: string, N: number, mu: number, mv: number) => {
        const qs = simF ? [[mu, mv]] : [[mu, mv], [-mu, mv], [mu, -mv], [-mu, -mv]];
        let u = 0, R: number | null = null;
        for (const [q1, q2] of qs) { const Rq = fiberCapacity(SF, N / 1000, q1, q2), uq = Rq === null ? 99 : Math.hypot(mu, mv) / 1000 / Rq; if (uq >= u) { u = uq; R = Rq; } }
        return { rotulo, Nd: N, mu, mv, R, util: u };
      };
      const cbD = elu.find((cb) => cb.nome === melhor!.det);
      let du: ReturnType<typeof direcao> | null = null, dv: ReturnType<typeof direcao> | null = null;
      const cheques: ReturnType<typeof cheque>[] = [];
      if (dS) {
        du = direcao(dS.Nd, dS.Mu, w, lamU, fl.leU, dS.Mi[0], ecc[0]); dv = direcao(dS.Nd, dS.Mv, h, lamV, fl.leV, dS.Mi[1], ecc[1]);
        if (metodo[0] === 'geral') du.tot = Math.max(geral(SF, dS.Nd, dS.Mu, w, fl.leU, 0, ecc[0]), du.M1);
        if (metodo[1] === 'geral') dv.tot = Math.max(geral(SF, dS.Nd, dS.Mv, h, fl.leV, 1, ecc[1]), dv.M1);
        cheques.push(cheque('S1 (2ª ordem em u)', dS.Nd, du.tot, dv.M1), cheque('S2 (2ª ordem em v)', dS.Nd, du.M1, dv.tot));
      } else if (dT) cheques.push(cheque('Tração com flexão (sem 2ª ordem)', dT.Nt, am(dT.Mu), am(dT.Mv)));
      const sx = dS ?? dT, ponta: 0 | 1 = sx && cbD ? (dS ? (-comb(pc, cbD, 0, 'N') >= -comb(pc, cbD, 1, 'N') ? 0 : 1) : (-comb(pc, cbD, 0, 'N') <= -comb(pc, cbD, 1, 'N') ? 0 : 1)) : 0;
      const parcelasN: [string, number, number][] = [];
      if (cbD) for (const nome in cbD.fatores) { const e = pc[nome]; if (e) parcelasN.push([nome, cbD.fatores[nome], e[ponta].N]); }
      registrarPilar(mem, {
        elemento: elMem, w, h, circ, Ac, Iu: P.Iy, Iv: P.Ix, iu, iv, fl, lamU, lamV, gn, c, fyd: FYD, taxaMin: op.pilarTaxaMin || 0.4, metodo, ecc, NdMax, AsMin, AsMax,
        det: sx ? { nome: sx.nome, tracao: !dS, Nd: dS ? dS.Nd : dT!.Nt, Mu: sx.Mu, Mv: sx.Mv, Mi: sx.Mi, ponta, parcelasN } : null,
        dirU: du, dirV: dv, geral: [metodo[0] === 'geral', metodo[1] === 'geral'], cheques, util: melhor.util,
        As: melhor.As, phi: melhor.phi, nBarras: barsF.length, armadura: melhor.txt, bloq,
        cortante: porDir.map((q, k) => (q ? { dir: circ ? 'radial' : k === 0 ? 'u' : 'v', Vsd: q.Vsd, Vc: q.Vc, VRd2: q.VRd2, asw: q.asw, combinacao: q.combinacao, bw: dirs[k].bw, d: dirs[k].d } : null)).filter((q) => q !== null),
        est, phiTmin: phiT, sTmax: sT,
      });
    }
    res.push({ pilar: p.id, pavimentoId: lance.id, nome: p.nome, pavimento: lance.nome, secao: secTxt(s), Nd: NdMax, Vd, determinantes, bloqueada: bloq, arranjo: { phi: melhor.phi, ...melhor.arr, estribo: { phi: est.phi, s: est.s } }, util: melhor.util,
      origens: [origem('Armadura longitudinal', melhor.det || '—', 'pilar'), origem('Armadura mínima e máxima', NdMax > 0 ? 'Nd máximo' : '—', 'pilarLimites'), origem('Estribos', cVd || '—', 'pilarEstribo')], lambda: [lamU, lamV], le,
      local: { metodo, ecc: ecc.map((x) => (Number.isFinite(x) ? Math.round(x * 1e5) / 1e5 : x)) as [number, number], lances: fl.desligados, secoesIntermediarias: xsInt.length > 0 }, ...(cortante ? { cortante } : {}), armadura: melhor.txt, As: melhor.As, estribo: `φ${String(est.phi).replace('.', ',')} c/${Math.round(est.s * 100)}`, status, mensagens: msgs });
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
  /** Flechas por tipo (N2f), com os limites. */
  flechas?: FlechasElemento;
  /** Maior abertura de fissuras na combinação frequente (mm; maciças) e limite. */
  wk: number; wkLim: number;
  status: 'ok' | 'fail'; mensagens: string[];
  /** Origem de cada grandeza: combinação, fórmula e item da NBR 6118. */
  origens?: Origem[];
  /** Cortante da laje maciça (NBR 6118, 19.4): maior cortante por metro nas duas direções, VRd1, VRd2 e armadura transversal. */
  cortante?: CortanteLaje;
  /** Flechas de cada alinhamento de vigotas (E3b, C7.102/C7.117): lajes de vigotas por ficha e moldadas, relativas aos apoios. */
  flechasVigotas?: FlechaAlinhamento[];
}
/** Flecha de um alinhamento de vigotas (posição transversal t, comprimento L): instantânea, diferida, total, ativa e da variável (m) com os limites. */
export interface FlechaAlinhamento {
  t: number; L: number; kappa: number;
  instantanea: number; diferida: number; total: number; ativa: number; variavel: number;
  limites: { total: number; ativa: number; variavel: number }; textos: { total: string; ativa: string; variavel: string };
  status: 'ok' | 'fail';
}

/** Bitola e espaçamento de laje para As (m²/m): a menor bitola com espaçamento ≥ 10 cm, até mín(2h; 20 cm). */
function barrasLaje(As: number, h: number, linha?: { bitolas: number[] }) {
  const smax = Math.min(2 * h, 0.2);
  for (const phi of [6.3, 8, 10, 12.5, 16].filter((p) => !linha || linha.bitolas.includes(p) || !linha.bitolas.some((q) => q >= 6.3))) { const s = Math.min(smax, barArea(phi) / As); if (s >= 0.1 || phi === 16) return { phi, s, As: barArea(phi) / s }; }
  return { phi: 16, s: 0.1, As: barArea(16) / 0.1 };
}

/** Geometria do Wood-Armer de uma laje numa grelha (igual nos pavimentos do grupo): contribuições e faixas por nó. */
interface GeoWoodArmer {
  /** Por nó (na ordem de chegada das barras): contribuições [barra, ponta (0 ou 6), direção] e vizinhos das faixas nas duas direções. */
  nos: { contrib: [number, 0 | 6, 0 | 1][]; nx: number; ny: number; faixa: [number[], number[]] }[];
  /** Nó da grelha de cada entrada de `nos` (V4: campos de isovalores). */
  ids: number[];
}
const cacheWoodArmer = new WeakMap<object, Map<string, GeoWoodArmer | null>>();
function geoWoodArmer(g: GrelhaPavimento, lajeId: string): GeoWoodArmer | null {
  let porLaje = cacheWoodArmer.get(g.modelo.barras);
  if (!porLaje) { porLaje = new Map(); cacheWoodArmer.set(g.modelo.barras, porLaje); }
  if (porLaje.has(lajeId)) return porLaje.get(lajeId)!;
  const m = g.modelo;
  const acc = new Map<number, [number, 0 | 6, 0 | 1][]>();
  let u: [number, number] | null = null, s = 0.25;
  m.barras.forEach((br, i) => {
    const tg = g.barras[i];
    if (tg.tipo !== 'laje' || tg.ref !== lajeId || tg.dir === undefined || !tg.largura) return;
    const a = m.nos[br.i], z = m.nos[br.j], L = Math.hypot(z[0] - a[0], z[1] - a[1]);
    if (tg.dir === 0 && !u) { u = [(z[0] - a[0]) / L, (z[1] - a[1]) / L]; s = L; }
    for (const [no, k] of [[br.i, 0], [br.j, 6]] as const) { const x = acc.get(no) ?? []; x.push([i, k, tg.dir]); acc.set(no, x); }
  });
  if (!acc.size || !u) { porLaje.set(lajeId, null); return null; }
  const nos = [...acc.keys()], uu = u as [number, number], vv: [number, number] = [-uu[1], uu[0]];
  const tem = nos.map((n) => [acc.get(n)!.some((c) => c[2] === 0), acc.get(n)!.some((c) => c[2] === 1)]);
  // grade de busca: a faixa (|d·ax| < s/2, |d·tr| ≤ 0,5) cabe no círculo de raio R; candidatos na ordem de `nos`
  const R = Math.hypot(s / 2, 0.5) + 1e-3, cel = new Map<string, number[]>();
  const chave = (x: number, y: number) => `${Math.floor(x / R)}:${Math.floor(y / R)}`;
  nos.forEach((q, iq) => { const k = chave(m.nos[q][0], m.nos[q][1]); const l = cel.get(k); if (l) l.push(iq); else cel.set(k, [iq]); });
  const out: GeoWoodArmer = { nos: [], ids: nos };
  nos.forEach((n) => {
    const p = m.nos[n], gx = Math.floor(p[0] / R), gy = Math.floor(p[1] / R), cand: number[] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const iq of cel.get(`${gx + dx}:${gy + dy}`) ?? []) cand.push(iq);
    cand.sort((a, z) => a - z);
    // faixa de 1 m transversal a cada direção (mesma posição longitudinal, ± meia malha)
    const faixa = (dir: 0 | 1) => {
      const ax = dir === 0 ? uu : vv, tr = dir === 0 ? vv : uu;
      return cand.filter((iq) => { const q = nos[iq], d = [m.nos[q][0] - p[0], m.nos[q][1] - p[1]]; return tem[iq][dir] && Math.abs(d[0] * ax[0] + d[1] * ax[1]) < s / 2 + 1e-6 && Math.abs(d[0] * tr[0] + d[1] * tr[1]) <= 0.5 + 1e-6; });
    };
    const c = acc.get(n)!;
    out.nos.push({ contrib: c, nx: c.filter((x) => x[2] === 0).length, ny: c.filter((x) => x[2] === 1).length, faixa: [faixa(0), faixa(1)] });
  });
  porLaje.set(lajeId, out);
  return out;
}

/**
 * Momentos de cálculo por metro de uma laje maciça nos nós da grelha (kN·m/m), por Wood-Armer:
 * mx, my das barras das duas direções e o volvente |mxy| (torção das barras / largura), cada um com média numa
 * faixa transversal de 1 m; armadura inferior mx* = mx + |mxy| (com as correções quando mx* < 0) e superior
 * mx*′ = mx − |mxy|. Os casos entram com γg (permanentes) e γq (variáveis); o volvente soma |γ·mxy| por caso.
 * A geometria (contribuições e faixas) fica em cache por grelha e laje (pavimentos do grupo compartilham).
 */
function momentosWoodArmer(g: GrelhaPavimento, lajeId: string, fat: number[]): { pos: [number, number]; neg: [number, number] } {
  const pos: [number, number] = [0, 0], neg: [number, number] = [0, 0];
  for (const x of woodArmerNos(g, lajeId, fat)) {
    pos[0] = Math.max(pos[0], x.inf[0]); pos[1] = Math.max(pos[1], x.inf[1]);
    neg[0] = Math.min(neg[0], x.sup[0]); neg[1] = Math.min(neg[1], x.sup[1]);
  }
  return { pos, neg };
}

/** Wood-Armer em cada nó da laje (V4): nó da grelha, momentos de cálculo inferiores (≥ 0) e superiores (≤ 0) por metro nas direções 0 e 1. */
export function woodArmerNos(g: GrelhaPavimento, lajeId: string, fat: number[]): { no: number; inf: [number, number]; sup: [number, number] }[] {
  const res = g.res!, geo = geoWoodArmer(g, lajeId);
  if (!geo) return [];
  // valores por nó: médias de mx, my e do volvente nas pontas das barras (na ordem das barras)
  const nn = geo.nos.length, MX = new Float64Array(nn), MY = new Float64Array(nn), TT = new Float64Array(nn);
  geo.nos.forEach((x, k) => {
    let sx = 0, sy = 0, st = 0;
    for (const [i, kk, dir] of x.contrib) {
      const larg = g.barras[i].largura!;
      // momento interno (+ traciona embaixo) e torção nas pontas, por metro, já combinados
      const M = fat.reduce((t, f, ic) => t + f * (kk === 0 ? -res.esforcos[ic][i][5] : res.esforcos[ic][i][11]), 0) / larg;
      const T = fat.reduce((t, f, ic) => t + Math.abs(f * res.esforcos[ic][i][kk + 3]), 0) / larg;
      if (dir === 0) sx += M; else sy += M;
      st += T;
    }
    MX[k] = x.nx ? sx / x.nx : 0; MY[k] = x.ny ? sy / x.ny : 0; TT[k] = x.contrib.length ? st / x.contrib.length : 0;
  });
  const media = (ids: number[], v: Float64Array) => { if (!ids.length) return 0; let t = 0; for (const q of ids) t += v[q]; return t / ids.length; };
  return geo.nos.map((x, k) => {
    const fx = { M: media(x.faixa[0], MX), t: media(x.faixa[0], TT) }, fy = { M: media(x.faixa[1], MY), t: media(x.faixa[1], TT) };
    const w = woodArmer(fx.M, fy.M, Math.max(fx.t, fy.t));
    return { no: geo.ids[k], inf: w.inf, sup: w.sup };
  });
}

/** Fatores ELU (γg, γh, γq) por caso da grelha, na ordem de `an.casos` (V4: os mesmos da armadura das lajes). */
export function fatoresELULaje(b: BuildingModel, an: AnaliseEdificio): number[] {
  const gm = gamas(b), obra = casosDaObra(b);
  return an.casos.map((id) => { const n = obra.find((c) => c.id === id)?.natureza ?? 'G'; return n === 'G' ? gm.g : n === 'H' ? gm.h : n === 'Q' ? gm.q : 0; });
}

/** Armadura necessária (cm²/m) de uma laje maciça para o momento de cálculo `M` (kN·m/m) na face `inf` ou `sup`, sem o aumento por fissuração (V4). */
export function armaduraNecessariaLaje(b: BuildingModel, an: AnaliseEdificio, l: { tipo: { tipo: string; h?: number }; cobrimento?: number }, M: number, face: 'inf' | 'sup'): number {
  const h = (l.tipo as { h: number }).h, c = concretoDe(b, 'laje'), cob = cobrimentoLaje(b, l.cobrimento);
  const d = h - (face === 'inf' ? cob.inf : cob.sup) - 0.005, fyd = acoDe(b, face === 'inf' ? 'lajeInf' : 'lajeSup').fyd, op = an.opcoes;
  const amin = (op.lajeTaxaMin > 0 ? op.lajeTaxaMin / 100 : 0.0015) * h;
  return Math.max(amin, M ? beamFlexure({ kind: 'rect', bw: 1, h }, false, Math.abs(M), d, 0.02, c, fyd).As : 0) * 1e4;
}

export { woodArmer } from './woodArmer';
import { woodArmer } from './woodArmer';

/**
 * Maior flecha relativa aos apoios das linhas da malha da laje: em cada linha (cadeia de barras de uma direção),
 * deslocamento menos a reta entre as pontas (que estão sobre as vigas).
 */
function flechaRelativa(g: GrelhaPavimento, lajeId: string, fat: number[], res: Resultado3 = g.res!): number {
  const m = g.modelo;
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
  // N2f: permanentes e parcela quase permanente das variáveis em separado (etapas de carga)
  const fG = nat.map((n) => (n === 'G' || n === 'H' ? 1 : 0)), fQqp = nat.map((n, ic) => (n === 'Q' ? psiQP[ic] : 0));
  const precisaMetodo = op.fatorFlechaLaje <= 0 || op.fatorFlechaAtiva <= 0 || op.fatorFlechaAtivaTrelicada <= 0 || op.fatorFlechaConforto <= 0 || op.fatorFlechaConfortoTrelicada <= 0;
  const out: ResultadoLaje[] = [];
  // pavimentos do mesmo grupo com a mesma grelha (resultado reaproveitado na análise) dão o mesmo resultado
  const memo = new Map<unknown, Map<string, ResultadoLaje>>();
  for (const g of an.grelhas) {
    if (!g.res) continue;
    const pav = b.pavimentos.find((p) => p.id === g.pavimento)!;
    const ja = memo.get(g.res) ?? new Map<string, ResultadoLaje>();
    memo.set(g.res, ja);
    // pilares sem viga do pavimento: o cortante do entorno é da punção (puncao.ts), fora do cortante das pontas das barras
    /** Lajes deste pavimento à espera das flechas (a fissuração recompõe a grelha com todas as lajes dimensionadas). */
    const pend: PendenteFlecha[] = [];
    const semViga = op.cortanteLajes ? sitiosPuncao(b, g.pavimento, { puncaoVigaChata: 0 }).map((x) => ({ p: x.centro, ext: Math.max(...dimsSecao(secaoNoLance(x.p, g.pavimento))) / 2 })) : [];
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
      // flecha relativa aos apoios (elástica, por combinação); a composição (fator, etapas, fissuração) vem depois de todas as lajes
      let flQP = flechaRelativa(g, l.id, fQP);
      const fq = flechaRelativa(g, l.id, fQ);
      const vao = Math.min(...vaos(l));
      // alveolar, processo 2 (E3e): a fase 1 (placa isostática sob o peso próprio) soma à flecha da grelha contínua (permanentes, fator 1)
      const fase1Alv = l.tipo.tipo === 'alveolar' && processoDoPano(l, op) === 2 ? (() => { const ga = geometriaAlveolar(b, l.tipo as Extract<typeof l.tipo, { tipo: 'alveolar' }>); return flechaFase1Alveolar(ga.pp, vaos(l)[0], ga.EI); })() : 0;
      flQP += fase1Alv;
      if (l.tipo.tipo === 'macica') {
        const h = l.tipo.h, cob = cobrimentoLaje(b, l.cobrimento), dI = h - cob.inf - 0.005, dS = h - cob.sup - 0.005;
        const sec = { kind: 'rect' as const, bw: 1, h };
        const amin = (op.lajeTaxaMin > 0 ? op.lajeTaxaMin / 100 : 0.0015) * h; // ρmín 0,15 % (fck ≤ 30) [a confirmar por fck]; `lajeTaxaMin` substitui
        // N2e (K1.4.81): momentos mínimos p·ℓ²/x das lajes maciças (padrão desligado)
        if (op.lajeMomentoMinPositivo > 0 || op.lajeMomentoMinNegativo > 0) {
          const gr = b.grupos.find((x) => x.id === pav.grupo), p = gm.g * (25 * h + (gr?.gRev ?? 0)) + gm.q * (gr?.q ?? 0), pl2 = p * vao * vao;
          for (const k of [0, 1]) {
            if (op.lajeMomentoMinPositivo > 0) mPos[k] = Math.max(mPos[k], pl2 / op.lajeMomentoMinPositivo);
            if (op.lajeMomentoMinNegativo > 0 && mNeg[k] < 0) mNeg[k] = Math.min(mNeg[k], -pl2 / op.lajeMomentoMinNegativo);
          }
        }
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
      // cortante (19.4): maciças apoiadas em vigas; o entorno de pilares sem viga é da punção (puncao.ts)
      let cort: CortanteLaje | undefined;
      if (l.tipo.tipo === 'macica' && op.cortanteLajes) {
        const h = l.tipo.h, dI = h - cobrimentoLaje(b, l.cobrimento).inf - 0.005, amin = 0.0015 * h * 1e4;
        const rhoC = [0, 1].map((k) => Math.min(0.02, Math.max(As.pos[k], amin) / (1e4 * dI))) as [number, number];
        const excl = semViga.map((x) => ({ p: x.p, r: x.ext + 2 * dI + op.malha }));
        cort = cortanteLaje(g, l.id, fELU, c, h, dI, rhoC, acoDe(b, 'lajeCortante').fyd, excl) ?? undefined;
        if (cort) msgs.push(...cort.mensagens);
      }
      // treliçadas: resultados por vigota em vigotas.ts (mensagens acrescentadas em dimensionarEdificio)
      const r: ResultadoLaje = { laje: l.id, nome: l.nome, pavimento: pav.nome, tipo: pr.descricao, h: pr.h, mPos, mNeg, As, flecha: 0, limite: Infinity, flechaQ: fq, limiteQ: Infinity, wk, wkLim, status: 'ok', mensagens: msgs, ...(cort ? { cortante: cort } : {}),
        origens: [origem('Armadura', COMB_ELU_LAJE, 'laje'), origem('Flecha', COMB_QP, 'flechaLaje'), ...(l.tipo.tipo === 'macica' ? [origem('Fissuração', COMB_FREQ, 'fissura')] : []), ...(cort ? [origem('Cortante', COMB_ELU_LAJE, 'cortanteLaje')] : [])] };
      ja.set(l.id, r);
      out.push(r);
      const metodoL = precisaMetodo || vigotaComBranson(b, l, op);
      if (l.tipo.tipo === 'alveolar' && !geometriaAlveolar(b, l.tipo).EIdaFicha) continue; // K1.9.75: sem EI na ficha a flecha não é verificada (aviso ALVEOLAR_SEM_DADOS)
      pend.push({ r, l, flQP, dG: metodoL ? flechaRelativa(g, l.id, fG) + fase1Alv : 0, dQ: fq, dQqp: metodoL ? flechaRelativa(g, l.id, fQqp) : 0, vao, cortOk: !cort || cort.ok });
    }
    // N2f: fissuração das lajes maciças (Branson por barra com a armadura calculada e a grelha recomposta); E3b: vigotas por ficha e moldadas
    const comBranson = (x: PendenteFlecha) => (x.l.tipo.tipo === 'macica' ? !!op.fissuracaoLajes && precisaMetodo : vigotaComBranson(b, x.l, op));
    const fis = (precisaMetodo || pend.some((x) => vigotaComBranson(b, x.l, op))) ? fissuracaoGrelha(b, g, pend.filter(comBranson), fQP, fELU, c, op) : { kappa: new Map<string, number>() };
    for (const x of pend) {
      const kp = fis.kappa.get(x.l.id) ?? 1, vb = vigotaComBranson(b, x.l, op);
      finalizarFlechaLaje(b, vb ? opMetodo(op) : op, x, kp, af);
      if (vb && g.res) x.r.flechasVigotas = flechasDosAlinhamentos(b, vb ? opMetodo(op) : op, g, x, { fG, fQ, fQP, fQqp }, fis, af);
    }
  }
  return out;
}

type PendenteFlecha = { r: ResultadoLaje; l: BuildingModel['lajes'][number]; flQP: number; dG: number; dQ: number; dQqp: number; vao: number; cortOk: boolean };

/**
 * Flechas da laje por tipo (N2f) e mensagens: total pelo fator simplificado (`fatorFlechaLaje`) ou pelo método (etapas
 * de carga, NBR 6118 17.3.2.1.2; sem etapas, 1 + αf); ativa e da variável pelos fatores da tabela-resumo do programa de
 * referência (maciça 2,0 e 1,5; treliçada 1,75 e 1,25) ou pelo método (0); fissuração por `kappa` (δ fissurada / elástica).
 */
function finalizarFlechaLaje(b: BuildingModel, op: AnaliseEdificio['opcoes'], x: PendenteFlecha, kappa: number, af: number) {
  const { r, l } = x, mac = l.tipo.tipo === 'macica';
  const { f, total, ativa, variavel, lim, limQ, metodo, fatC } = flechasDaLaje(b, op, l, x, kappa, af);
  const msgs = r.mensagens;
  // vigotas por ficha e moldadas (E3b, C7.102): a sugestão do erro de flecha é aumentar a espessura
  const sug = !mac && l.tipo.tipo !== 'trelicada' && !(l.tipo.tipo === 'vigotas' && l.tipo.ficha === FICHA_TRELICADAS) ? ' Aumente a altura da laje.' : '';
  if (total > lim) msgs.push(`Flecha total ${(total * 1000).toFixed(1)} mm > ${f.textos.total} = ${(lim * 1000).toFixed(1)} mm (relativa aos apoios, ${metodo}).${sug}`);
  if (variavel > limQ) msgs.push(`Flecha das variáveis ${(variavel * 1000).toFixed(1)} mm > ${f.textos.variavel} = ${(limQ * 1000).toFixed(1)} mm (vibrações${fatC > 0 ? `, elástica × ${String(fatC).replace('.', ',')}` : ''}).${sug}`);
  msgs.push(...mensagensFlechasNovas(f).map((m) => m + sug));
  r.flecha = total; r.limite = lim; r.flechaQ = variavel; r.limiteQ = limQ; r.flechas = f;
  r.status = total > lim || variavel > limQ || ativa > f.limites.ativa || r.wk > r.wkLim + 1e-9 || !x.cortOk ? 'fail' : 'ok';
}

/** Flechas de uma laje (ou de uma vigota) para as deformações elásticas `x`, o fator de fissuração `kappa` e αf: método, ativa e variável com os limites. */
function flechasDaLaje(b: BuildingModel, op: AnaliseEdificio['opcoes'], l: BuildingModel['lajes'][number], x: Pick<PendenteFlecha, 'flQP' | 'dG' | 'dQ' | 'dQqp' | 'vao'>, kappa: number, af: number) {
  const mac = l.tipo.tipo === 'macica' || l.tipo.tipo === 'nervurada', tipoL = tipoFlechaLaje(l), lims = limitesEmUso(b, op, tipoL);
  const inst = instantaneasPorCategoria(x.dG * kappa, fracoesGLaje(b, l), x.dQ * kappa, x.dQqp * kappa);
  const comp = composicaoEtapas(etapasDe(b, tipoL), inst, { rho: 0, qInstantanea: op.flechaQInstantanea ? 'total' : 'qp' });
  const fatA = mac ? op.fatorFlechaAtiva : op.fatorFlechaAtivaTrelicada, fatC = mac ? op.fatorFlechaConforto : op.fatorFlechaConfortoTrelicada;
  const total = op.fatorFlechaLaje > 0 ? x.flQP * op.fatorFlechaLaje : op.flechaEtapas ? comp.total : x.flQP * kappa * (1 + af);
  const ativa = fatA > 0 ? (x.dG + x.dQ) * fatA : comp.ativa;
  const variavel = fatC > 0 ? x.dQ * fatC : x.dQ * kappa;
  const f = resumoFlechas({ metodo: op.fatorFlechaLaje > 0 ? 'simplificado' : op.flechaEtapas ? 'etapas' : 'fator', instantaneas: inst, instantanea: (x.dG + x.dQ) * kappa, diferida: Math.max(0, total - comp.instantanea), total, ativa, variavel, vao: x.vao, balanco: false, ...(op.fatorFlechaLaje <= 0 && op.flechaEtapas ? { etapas: comp } : {}), rho: 0, ...(kappa !== 1 ? { fissuracao: kappa } : {}) }, lims);
  const lim = f.limites.total, limQ = f.limites.variavel, fiss = kappa > 1 ? `fissurada (Branson, × ${kappa.toFixed(2).replace('.', ',')})` : 'sem fissuração';
  const metodo = op.fatorFlechaLaje > 0 ? `elástica × ${String(op.fatorFlechaLaje).replace('.', ',')}` : op.flechaEtapas ? `por etapas: ${comp.fatorTotal.toFixed(2).replace('.', ',')} × instantânea, ξ médio ${comp.xiMedio.toFixed(2).replace('.', ',')}, ${fiss}` : `elástica × (1 + αf = ${(1 + af).toFixed(2).replace('.', ',')}), ${fiss}`;
  return { f, total, ativa, variavel, lim, limQ, metodo, fatC };
}

/**
 * Fator de fissuração por laje maciça (K1.15.4-13/15/16): em cada barra de laje da grelha, Ie/Ic de Branson com o
 * momento da combinação quase permanente, Mr da NBR 6118 17.3.1 (seção bruta ou homogeneizada) e a armadura
 * calculada da direção (positiva ou negativa); com `inerciaMediaVao`, um Ie por laje e direção pela média
 * [(Ie,apoio + Ie,apoio)/2 + Ie,centro]/2 [a confirmar: apoio = barra mais fissurada nos negativos]. A grelha é
 * resolvida de novo com Iz × Ie/Ic e o fator é δ fissurada / δ elástica da mesma grelha isolada (no modelo integrado a
 * grelha isolada só serve para a razão) [a confirmar].
 */
function fissuracaoGrelha(b: BuildingModel, g: GrelhaPavimento, lajes: PendenteFlecha[], fQP: number[], fELU: number[], c: ReturnType<typeof concretoDe>, op: AnaliseEdificio['opcoes']): ResFissuracao {
  const out = new Map<string, number>();
  if (!lajes.length || !g.res || !g.casos) return { kappa: out };
  const porLaje = new Map(lajes.map((x) => [x.l.id, x]));
  const fator = new Map<number, number>();
  const media = new Map<string, { neg: number; pos: number; mPos: number; barras: number[] }>();
  const vig = new Map<string, DadosBranson | null>();
  g.modelo.barras.forEach((_, i) => {
    const t = g.barras[i], x = t.tipo === 'laje' ? porLaje.get(t.ref) : undefined;
    if (!x || t.dir === undefined || !t.largura) return;
    if (x.l.tipo.tipo !== 'macica') {
      // vigotas por ficha e moldadas (E3b): Ie/Ic de Branson da nervura com o momento quase permanente da barra
      if (t.dir !== 0) return;
      if (x.l.tipo.tipo === 'alveolar') {
        // alveolar (E3e): Ie/Ic de Branson da faixa de 1 m com o EI, o EI fissurado e o Mfis da ficha
        if (!vig.has(x.l.id)) vig.set(x.l.id, dadosBransonAlveolar(geometriaAlveolar(b, x.l.tipo)));
        const dadosA = vig.get(x.l.id);
        if (!dadosA) return;
        const ma = momentosDaBarra(g.res!, i, fQP, t.largura, 1), Ma = Math.abs(ma[0]) >= Math.abs(ma[1]) ? ma[0] : ma[1], fa = fatorBranson(dadosA, Ma);
        if (fa < 1 - 1e-9) fator.set(i, fa);
        return;
      }
      if (!ehNervurada(x.l.tipo)) return;
      const g0 = geometriaNervurada(b, x.l.tipo);
      if (!vig.has(x.l.id)) vig.set(x.l.id, dadosBransonLaje(b, g, x.l, g0, c, fELU));
      const dados = vig.get(x.l.id);
      if (!dados) return;
      const ms = momentosDaBarra(g.res!, i, fQP, t.largura, g0.intereixo), M = Math.abs(ms[0]) >= Math.abs(ms[1]) ? ms[0] : ms[1];
      const f = fatorBranson(dados, M);
      if (f < 1 - 1e-9) fator.set(i, f);
      return;
    }
    const h = x.l.tipo.h, cob = cobrimentoLaje(b, x.l.cobrimento), dI = h - cob.inf - 0.005, dS = h - cob.sup - 0.005, amin = 0.0015 * h;
    const ms = [0, 6].map((k) => fQP.reduce((s, f, ic) => s + f * (k === 0 ? -g.res!.esforcos[ic][i][5] : g.res!.esforcos[ic][i][11]), 0) / t.largura!);
    const M = Math.abs(ms[0]) >= Math.abs(ms[1]) ? ms[0] : ms[1];
    const As = M >= 0 ? Math.max(amin, x.r.As.pos[t.dir] / 1e4) : Math.max(amin, x.r.As.neg[t.dir] / 1e4);
    const br = bransonFlecha({ kind: 'rect', bw: 1, h }, false, As, M >= 0 ? dI : dS, M, c, !!op.inerciaHomogeneizada);
    const f = Math.min(1, br.Ie / (h ** 3 / 12));
    fator.set(i, f);
    if (op.inerciaMediaVao) {
      const k = `${t.ref}|${t.dir}`, e = media.get(k) ?? { neg: 1, pos: 1, mPos: -Infinity, barras: [] };
      e.barras.push(i);
      if (M < 0) e.neg = Math.min(e.neg, f); else if (M > e.mPos) { e.mPos = M; e.pos = f; }
      media.set(k, e);
    }
  });
  for (const e of media.values()) { const f = inerciaMediaVao(e.neg, e.neg, e.pos); for (const i of e.barras) fator.set(i, f); }
  if (![...fator.values()].some((f) => f < 1 - 1e-9)) return { kappa: out, resEl: g.res, resCr: g.res };
  const resEl = g.integrado ? resolver3(g.modelo, g.casos) : g.res, resCr = resolverGrelhaFissurada(g.modelo, g.casos, fator);
  if (resEl.erro || resCr.erro) return { kappa: out };
  for (const { l } of lajes) { const e = flechaRelativa(g, l.id, fQP, resEl), k = flechaRelativa(g, l.id, fQP, resCr); if (e > 1e-12) out.set(l.id, Math.max(1, k / e)); }
  return { kappa: out, resEl, resCr };
}

/** Fatores de fissuração por laje e as grelhas elástica e fissurada de onde saíram (as mesmas barras para todas as lajes do pavimento). */
interface ResFissuracao { kappa: Map<string, number>; resEl?: Resultado3; resCr?: Resultado3 }

/** A laje de vigotas usa Branson na flecha (E3b): ficha armada, protendida, genérica ou moldada, com a opção ligada; a treliçada do catálogo interno, não. */
function vigotaComBranson(b: BuildingModel, l: BuildingModel['lajes'][number], op: AnaliseEdificio['opcoes']): boolean {
  if (l.tipo.tipo === 'alveolar') return !!op.alveolarBranson && !!dadosBransonAlveolar(geometriaAlveolar(b, l.tipo)); // E3e: Branson com a ficha da placa (EI fissurado e Mfis)
  return !!op.vigotaBranson && ehNervurada(l.tipo) && l.tipo.tipo !== 'trelicada' && !(l.tipo.tipo === 'vigotas' && l.tipo.ficha === FICHA_TRELICADAS) && geometriaNervurada(b, l.tipo).familia !== 'trelicada';
}
/** Opções com o método da NBR no lugar dos fatores simplificados da flecha (a ficha traz a rigidez fissurada). */
const opMetodo = (op: AnaliseEdificio['opcoes']): AnaliseEdificio['opcoes'] => ({ ...op, fatorFlechaLaje: 0, fatorFlechaAtivaTrelicada: 0, fatorFlechaConfortoTrelicada: 0 });

/**
 * Dados de Branson da nervura da laje: da ficha (EI, EI fissurado, Mfis) ou, sem eles, o estádio II da seção T com a armadura
 * inferior equivalente ao Mu da ficha (armadas), à treliça (sem Mu) ou à armadura da moldada (a atribuída, ou a calculada
 * para o maior momento positivo ELU da laje, no mínimo ρmín) [a confirmar].
 */
function dadosBransonLaje(b: BuildingModel, g: GrelhaPavimento, l: BuildingModel['lajes'][number], g0: GeometriaNervurada, c: ReturnType<typeof concretoDe>, fELU: number[]): DadosBranson | null {
  const cob = cobrimentoLaje(b, l.cobrimento), d = g0.h - cob.inf - 0.005, fyd = acoDe(b, 'lajeInf').fyd;
  let As = 0;
  const Mu = g0.serie?.positivo?.Mu;
  if (Mu) As = armaduraEquivalente(c, g0.intereixo, g0.capa, g0.bw, d, Mu, fyd);
  else if (g0.tipo === 'moldada') {
    const atrib = l.armaduraMoldada ? l.armaduraMoldada.inf.n * barArea(l.armaduraMoldada.inf.phi) : 0;
    let Md = 0;
    g.modelo.barras.forEach((_, i) => {
      const t = g.barras[i];
      if (t.tipo !== 'laje' || t.ref !== l.id || t.dir !== 0 || !t.largura) return;
      const [m0, m1] = momentosDaBarra(g.res!, i, fELU, t.largura, g0.intereixo);
      Md = Math.max(Md, m0, m1);
    });
    const AsMin = 0.0015 * (g0.intereixo * g0.capa + g0.bw * g0.hEnch);
    As = Math.max(atrib, AsMin, Md > 0 ? beamFlexure({ kind: 'tee', bw: g0.bw, h: g0.h, bf: g0.intereixo, hf: g0.capa }, true, Md, d, 0.03, c, fyd).As : 0);
  } else if (g0.trelica) {
    const t = trelicasDe(b)[g0.trelica];
    if (t) As = (2 * barArea(t.inf) * 600) / fyd;
  }
  return dadosBranson(g0, c, As, d);
}

/**
 * Flecha de cada alinhamento de vigotas da laje (E3b): elástica e fissurada da combinação quase permanente (mesma grelha da
 * laje), instantâneas por categoria de carga, diferida e total pelo método da laje (etapas ou 1 + αf), ativa e da variável.
 */
function flechasDosAlinhamentos(b: BuildingModel, op: AnaliseEdificio['opcoes'], g: GrelhaPavimento, x: PendenteFlecha, fat: { fG: number[]; fQ: number[]; fQP: number[]; fQqp: number[] }, fis: ResFissuracao, af: number): FlechaAlinhamento[] {
  const l = x.l, ang = ((l.direcao ?? 0) * Math.PI) / 180, resEl = fis.resEl ?? g.res!, resCr = fis.resCr ?? resEl;
  return alinhamentosDaLaje(g, l.id, [Math.cos(ang), Math.sin(ang)]).map((al) => {
    const el = flechaAlinhamento(g, al, fat.fQP, resEl), cr = flechaAlinhamento(g, al, fat.fQP, resCr), kappa = el > 1e-12 ? Math.max(1, cr / el) : 1;
    // alveolar, processo 2 (E3e): soma a fase 1 isostática (peso próprio) à flecha do alinhamento
    const ga = l.tipo.tipo === 'alveolar' && processoDoPano(l, op) === 2 ? geometriaAlveolar(b, l.tipo) : null, f1 = ga ? flechaFase1Alveolar(ga.pp, al.L, ga.EI) : 0;
    const xi = { flQP: el + f1, dG: flechaAlinhamento(g, al, fat.fG, resEl) + f1, dQ: flechaAlinhamento(g, al, fat.fQ, resEl), dQqp: flechaAlinhamento(g, al, fat.fQqp, resEl), vao: al.L };
    const { f, total, ativa, variavel } = flechasDaLaje(b, op, l, xi, kappa, af);
    const ok = total <= f.limites.total && variavel <= f.limites.variavel && ativa <= f.limites.ativa;
    return { t: al.t, L: al.L, kappa, instantanea: f.instantanea, diferida: f.diferida, total, ativa, variavel, limites: { total: f.limites.total, ativa: f.limites.ativa, variavel: f.limites.variavel }, textos: { total: f.textos.total, ativa: f.textos.ativa, variavel: f.textos.variavel }, status: ok ? 'ok' : 'fail' };
  });
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
      const t = espessuraConcretoDaLaje(b, l, (tp) => espessuraConcreto(b, tp));
      cL += A * t; if (l.tipo.tipo !== 'alveolar') fL += A; // alveolar (E3e): placas pré-moldadas e capa sobre elas, sem fôrma de laje
    }
    for (const v of vs) { const L = comprimentoPolilinha(v.pontos); cV += v.secao.b * v.secao.h * L; fV += (v.secao.b + 2 * v.secao.h) * L; }
    const hPav = ip === 0 ? b.obra.profundidadeFundacao : pav.cota - ps[ip - 1].cota;
    for (const p of b.pilares) if (lancesDoPilar(b, p).some((x) => x.id === pav.id)) {
      const s = secaoNoLance(p, pav.id), [w, h] = dimsSecao(s);
      cP += (s.tipo === 'circ' ? (Math.PI * w * w) / 4 : w * h) * hPav; fP += (s.tipo === 'circ' ? Math.PI * w : 2 * (w + h)) * hPav;
    }
    // pilares-parede (E1b): área × pé-direito dos retângulos dos lados (sem descontar as sobreposições das junções)
    for (const pp of b.pilaresParede ?? []) if (lancesDoPP(b, pp).some((x) => x.id === pav.id)) for (const g of ladosDoPP(b, pp)) { const t = g.esp(pav.id).t; cP += g.L * t * hPav; fP += 2 * (g.L + t) * hPav; }
    return { pavimento: pav.nome, concreto: { lajes: cL, vigas: cV, pilares: cP }, forma: { lajes: fL, vigas: fV, pilares: fP }, aco: cL * TAXAS.lajes + cV * TAXAS.vigas + cP * TAXAS.pilares };
  });
}

// ---------------- fundação ----------------

// Cargas por pilar para o módulo Fundações: em fundacao.ts (adaptador das fundações do edifício).
export { cargasParaFundacao } from './fundacao';

// ---------------- tudo ----------------

export interface Dimensionamento { escadas?: ResumoLanceCalculo[]; vigas: ResultadoViga[]; pilares: ResultadoPilar[]; lajes: ResultadoLaje[]; quantitativos: Quantitativo[]; combinacoes: number;
  /** Escadas (E4d): armadura e detalhamento por lance (trechos, barras, ligações, cortante, fissuras e flecha) e resumo do aço por bitola. */
  escadasArmadura?: ArmaduraEscadas['lances']; resumoAcoEscadas?: LinhaResumoAco[];
  /** Detalhamento das vigas (barras, emendas, estribos por zona) e resumo do aço das vigas por bitola. */
  detalhes?: DetalheViga[]; resumoAcoVigas?: ReturnType<typeof resumoAcoVigas>;
  /** Vigas inclinadas entre pavimentos (E2c): flexo-compressão oblíqua, cortante e torção; detalhamento (barras e estribos) e resumo do aço. */
  /** Consolos curtos (E2e) e vigas pré-moldadas (armadas: içamento; de ficha: verificação) do último cálculo. */
  consolos?: ResultadoConsolo[]; premoldadas?: ResultadoPremoldada[];
  inclinadas?: ResultadoInclinada[]; detalhesInclinadas?: DetalheInclinada[]; resumoAcoInclinadas?: ReturnType<typeof resumoAcoInclinadas>;
  /** Diagonais de contraventamento (E2d): o mesmo dimensionamento das inclinadas (tração e compressão com a esbeltez máxima), detalhe e resumo do aço. */
  diagonais?: ResultadoInclinada[]; detalhesDiagonais?: DetalheInclinada[]; resumoAcoDiagonais?: ReturnType<typeof resumoAcoInclinadas>;
  /** Detalhamento dos pilares (barras por lance, emendas, arranques, estribos e grampos) e resumo do aço dos pilares. */
  detalhesPilares?: DetalhePilar[]; resumoAcoPilares?: ReturnType<typeof resumoAcoPilares>;
  /** Detalhamento das lajes maciças (posições de barras, bordas, avisos) e resumo do aço das lajes. */
  detalhesLajes?: DetalheLaje[]; resumoAcoLajes?: ReturnType<typeof resumoAcoLajes>; resumoTelas?: ReturnType<typeof resumoTelasLajes>;
  /**
   * Lajes treliçadas (R6): um resultado por laje (envoltória dos pavimentos do grupo) com alinhamentos de vigotas,
   * grupos de igualação, armaduras e verificações; erros e avisos também vão para `lajes[].mensagens`.
   */
  vigotas?: ResultadoVigotas[];
  /** Aço das vigotas (adicionais, negativos e distribuição da capa) por bitola e treliças por tipo (m, kg). */
  resumoAcoVigotas?: ReturnType<typeof resumoAcoVigotas>; trelicas?: ReturnType<typeof quantitativoTrelicas>;
  /** Vigotas por tipo (número e comprimento com perdas) e armaduras das nervuras moldadas no local (E3b). */
  quantitativoVigotas?: ReturnType<typeof quantitativoVigotas>; quantitativoMoldadas?: ReturnType<typeof quantitativoMoldadas>;
  /** Lajes nervuradas bidirecionais (E3c): nervuras, mesa, cortante, armaduras e quantitativos por laje; aço por bitola (m, kg). */
  nervuradas?: ResultadoNervurada[]; resumoAcoNervuradas?: ReturnType<typeof resumoAcoNervuradas>;
  /** Lajes alveolares (E3e): placas, escolha, serviço, cortante, negativos na capa, apoios e quantitativos por laje; aço dos negativos por bitola. */
  alveolares?: ResultadoAlveolar[]; resumoAcoAlveolares?: ReturnType<typeof resumoAcoAlveolares>;
  /** Punção dos pilares que apoiam a laje maciça sem viga e das vigas chatas largas, por pavimento (N2d). */
  puncao?: ResultadoPuncao[];
  /** Fundações lançadas no edifício (FU1), calculadas depois da estrutura com as reações na base dos pilares. */
  fundacoes?: ResultadoFundacao[];
  /** Vigas de equilíbrio e de travamento (FU2) e avisos gerais das fundações (cargas do nível de fundação sem destino). */
  vigasFundacao?: ResultadoVigaFundacao[]; avisosFundacao?: string[];
  /** Base elástica (FU6): radiers e vigas sobre base elástica (tensões no solo, recalques e armaduras), detalhamento e aço dos radiers. */
  /** Vigas embutidas em paredes de concreto com armadura própria (FU7c). */
  vigasEmbutidas?: ResultadoVigaEmbutida[];
  radiers?: ResultadoRadier[]; vigasElasticas?: ResultadoVigaElastica[]; detalhesRadier?: DetalheLaje[]; resumoAcoRadiers?: ReturnType<typeof resumoAcoRadiers>;
  /** Sapatas corridas (FU7a): sob parede (dimensionamento rígido) ou sob pilares (viga sobre base elástica na análise global); calculadas com a fundação. */
  corridas?: ResultadoCorrida[];
  /** Bases dos muros de arrimo isolados na fundação (FU7b): σadm do terreno, cota e quantitativos; calculadas com a fundação. */
  basesMuros?: ResultadoBaseMuro[];
  /** Equilíbrio global (EQU, N2a): tombamento por direção do vento; ausente com o grupo desativado ou sem vento. */
  equilibrio?: ResultadoEQU[];
  /** Avisos das ações e combinações (alerta de responsabilidade das combinações do usuário, EQU). */
  avisosAcoes?: string[];
  /** Rearme (R7f): o dimensionamento foi refeito sobre a análise já feita (modo, esforços usados, elementos refeitos). */
  rearme?: InfoRearme;
  /** Agrupamentos de pórticos (R7f): se valem (efetivos), motivo quando não, pórtico de referência e desenhos únicos. */
  agrupamentos?: InfoAgrupamento[];
  /** Pilares-parede (E1b): esforços resultantes por lado e pavimento, cargas na base e modelo de cada lado (casca ou barra). */
  pilaresParede?: ResultadoPilarParede[];
  /** Resistência ao fogo (N2g): TRRF por grupo e TRF por elemento (estado "incendio" ativo); erros e avisos também vão para as mensagens dos elementos. */
  fogo?: ResultadoFogo;
  /** Paredes de concreto (E1c): esforços resultantes por trecho e pavimento e cargas na base (mesma forma dos pilares-parede). */
  paredes?: ResultadoPilarParede[];
  /** Armadura das paredes e pilares-parede (E1d): panos, lados, aberturas, emendas; detalhamento e aço. */
  armaduraParedes?: ResultadoParedeDim[];
  detalhesParedes?: DetalheParede[]; resumoAcoParedes?: ReturnType<typeof resumoAcoParedes>;
  /** Muros de arrimo isolados (E1d): estabilidade, armadura do fuste e da base. */
  muros?: ResultadoMuroDim[];
  /** Alvenaria estrutural e blocos de concreto (E1e): verificação por pano, verga, quantitativo de blocos, desligamento muro-pilar e vigas sobre muros. */
  alvenaria?: ResultadoAlvenaria }

/** Campos das fundações no dimensionamento (elementos, vigas de fundação e avisos). */
export function comFundacao(b: BuildingModel, an: AnaliseEdificio | null, o: OpcoesFundacao = {}): Pick<Dimensionamento, 'fundacoes' | 'vigasFundacao' | 'avisosFundacao' | 'corridas' | 'basesMuros'> {
  b = comEscadas(b, an?.escadas);
  const corridas = calcularCorridas(b, an);
  const f = calcularFundacaoEdificio(b, an, { ...o, corridas });
  const basesMuros = b.murosArrimo?.length ? calcularBasesMuros(b, opcoesEmUso(b.opcoes, perfilDe(b))) : [];
  return { fundacoes: f.elementos, ...(f.vigas.length ? { vigasFundacao: f.vigas } : {}), ...(f.avisos.length ? { avisosFundacao: f.avisos } : {}), ...(corridas.length ? { corridas } : {}), ...(basesMuros.length ? { basesMuros } : {}) };
}

/**
 * Dimensiona a estrutura e, se houver fundações lançadas e `fundacao` não for false ("calcular com fundação"), as fundações.
 * `fundacao`: opções do cálculo das fundações (modo, resultados anteriores, níveis).
 */
export function dimensionarEdificio(b: BuildingModel, an: AnaliseEdificio, o: { fundacao?: false | OpcoesFundacao } = {}): Dimensionamento {
  b = comEscadas(b, an.escadas); // reações das escadas (E4c) como cargas nos elementos de apoio
  const combs = combinacoesEdificio(b, an), elu = combinacoesDoEstado(b, an, 'concreto', combs), freq = combinacoesDoEstado(b, an, 'fissuracao', combs);
  let vigas = dimensionarVigas(b, an, elu, freq), agrupamentos: InfoAgrupamento[] | undefined;
  if (b.agrupamentos?.length) {
    // pórticos agrupados (R7f): a armadura do pórtico que governa vale para todos (segunda passada como bloqueio transitório)
    const ag = resolverAgrupamentos(b, vigas);
    agrupamentos = ag.infos;
    const grupoDe = new Map<string, string>();
    for (const g of ag.infos) if (g.efetivo) for (const id of g.vigas) grupoDe.set(id, g.nome);
    if (ag.transientes.size) {
      const b2: BuildingModel = { ...b, vigas: b.vigas.map((v) => (ag.transientes.has(v.id) ? { ...v, armadura: ag.transientes.get(v.id) } : v)) };
      vigas = dimensionarVigas(b2, an, elu, freq);
    }
    for (const r of vigas) {
      for (const m of ag.avisos.get(r.viga) ?? []) r.mensagens.push(m);
      const g = grupoDe.get(r.viga);
      if (g) { r.agrupada = g; if (ag.transientes.has(r.viga)) r.bloqueada = true; }
    }
  }
  suspensoesVigas(b, an, vigas);
  const d: Dimensionamento = { vigas, pilares: dimensionarPilares(b, an, elu, combs.find((c) => c.tipo === 'QP')), lajes: dimensionarLajes(b, an), quantitativos: quantitativos(b), combinacoes: combs.length };
  if (agrupamentos?.length) d.agrupamentos = agrupamentos;
  if (an.escadas?.lances.length) {
    d.escadas = resumoCalculoEscadas(an.escadas); // escadas (E4c): reações, momentos e deslocamentos por lance
    const ae = armarEscadas(b, an.escadas, an.opcoes); // escadas (E4d): armadura e detalhamento por lance
    d.escadasArmadura = ae.lances; d.resumoAcoEscadas = ae.resumoAco;
  }
  { // E2e: vigas de vínculo externo (topo de muro: não dimensionadas), pré-moldadas e consolos
    for (const v of b.vigas) {
      const r = v.vinculoExterno ? vigas.find((x) => x.viga === v.id) : undefined;
      if (!r) continue;
      r.mensagens = r.mensagens.filter((m) => classificar(m).nivel !== 'erro');
      r.status = 'ok';
      r.mensagens.push('Vínculo externo: a viga simula o topo de um muro (apoios em todos os nós); não é dimensionada como viga.');
    }
    const pm = verificarPremoldadas(b, an, vigas);
    if (pm.length) d.premoldadas = pm;
    const cs = dimensionarConsolos(b, an, vigas);
    if (cs.length) d.consolos = cs;
  }
  { // vigas inclinadas (E2c)
    const inc = dimensionarInclinadas(b, an, elu, (bi, xs) => porCaso(an, bi, xs));
    const dg = dimensionarInclinadas(b, an, elu, (bi, xs) => porCaso(an, bi, xs), 'diagonal');
    if (dg.length) { d.diagonais = dg; d.detalhesDiagonais = dg.map((r) => detalharInclinada(b, r, an.opcoes.perdasAco)); d.resumoAcoDiagonais = resumoAcoInclinadas(b, d.detalhesDiagonais); }
    if (inc.length) { d.inclinadas = inc; d.detalhesInclinadas = inc.map((r) => detalharInclinada(b, r, an.opcoes.perdasAco)); d.resumoAcoInclinadas = resumoAcoInclinadas(b, d.detalhesInclinadas); }
  }
  { const pp = esforcosPilaresParede(b, an, (bi, xs) => porCaso(an, bi, xs)); if (pp.length) d.pilaresParede = pp; }
  { const pw = esforcosPilaresParede(b, an, (bi, xs) => porCaso(an, bi, xs), 'paredes'); if (pw.length) d.paredes = pw; }
  if (d.paredes || d.pilaresParede) {
    const ap = dimensionarParedes(b, an, elu, { paredes: d.paredes, pilaresParede: d.pilaresParede }, an.opcoes);
    if (ap.length) {
      d.armaduraParedes = ap;
      d.detalhesParedes = detalharParedes(b, ap, an.opcoes);
      d.resumoAcoParedes = resumoAcoParedes(d.detalhesParedes, an.opcoes.perdasAco);
    }
  }
  { const al = dimensionarAlvenaria(b, an, elu, d.paredes, an.opcoes); if (al) { d.alvenaria = al; aplicarDispensaVigasMuro(d.vigas, al.vigasMuro); } }
  // vigas embutidas em paredes de concreto (FU7c, K1.4.74): armadura própria (mínimos); a parede leva a carga
  { const ve = aplicarVigasEmbutidas(b, an.opcoes, d.vigas); if (ve.length) d.vigasEmbutidas = ve; }
  if (b.murosArrimo?.length) d.muros = b.murosArrimo.map((m) => ({ id: m.id, nome: m.nome, ...dimensionarMuroArrimo(m, matMuroDe(b, an.opcoes)) }));
  if (estadoEmUso(b, 'equilibrio').ativo) { const eq = equilibrioGlobal(b, an, an.opcoes); if (eq.length) d.equilibrio = eq; }
  const avisosAcoes = [...textosAlertas(b, alertasSituacoes(b, combs)), ...(d.equilibrio ?? []).filter((e) => !e.ok).map((e) => `Equilíbrio global: tombamento com vento a ${e.direcao}° (momento estabilizante ${Math.round(e.Mest)} kN·m < instabilizante ${Math.round(e.Minst)} kN·m).`)];
  if (avisosAcoes.length) d.avisosAcoes = avisosAcoes;
  d.detalhes = detalharVigas(b, d, an.opcoes);
  d.resumoAcoVigas = resumoAcoVigas(b, d.detalhes, an.opcoes.perdasAco);
  d.detalhesPilares = detalharPilares(b, d, an.opcoes);
  d.resumoAcoPilares = resumoAcoPilares(b, d.detalhesPilares, an.opcoes.perdasAco);
  d.detalhesLajes = detalharLajes(b, d, an, an.opcoes);
  d.resumoAcoLajes = resumoAcoLajes(b, d.detalhesLajes, an.opcoes.perdasAco);
  { const t = resumoTelasLajes(d.detalhesLajes, an.opcoes.perdasAco, b); if (t.length) d.resumoTelas = t; }
  d.puncao = puncaoEdificio(b, an, d.lajes, an.opcoes);
  if (!d.puncao.length) delete d.puncao;
  // mensagens da punção entram na laje do pavimento (revisão, planta e janela da laje)
  for (const r of d.puncao ?? []) {
    const l = d.lajes.find((x) => x.laje === r.laje && x.pavimento === r.pavimento);
    if (!l) continue;
    l.mensagens.push(...r.mensagens);
    if (r.status === 'fail') l.status = 'fail';
  }
  d.vigotas = [...dimensionarVigotas(b, an, d.lajes, an.opcoes), ...dimensionarVigotasFichas(b, an, d.lajes, an.opcoes)].sort((x, z) => b.lajes.findIndex((l) => l.id === x.laje) - b.lajes.findIndex((l) => l.id === z.laje));
  d.resumoAcoVigotas = resumoAcoVigotas(d.vigotas, an.opcoes.perdasAco);
  d.trelicas = quantitativoTrelicas(d.vigotas, an.opcoes.perdasAco);
  d.quantitativoVigotas = quantitativoVigotas(d.vigotas, an.opcoes.perdasAco);
  { const q = quantitativoMoldadas(d.vigotas, an.opcoes.perdasAco); if (q.length) d.quantitativoMoldadas = q; }
  { const ns = dimensionarNervuradas(b, an, d.lajes, an.opcoes); if (ns.length) { d.nervuradas = ns; d.resumoAcoNervuradas = resumoAcoNervuradas(ns, an.opcoes.perdasAco); } }
  // punção nas nervuradas com ábaco (E3d): depois das nervuras (a taxa de armadura sobre o ábaco vem delas); as mensagens entram na laje
  {
    const pn = puncaoAbacos(b, an, d.nervuradas ?? [], an.opcoes);
    if (pn.length) {
      d.puncao = [...(d.puncao ?? []), ...pn];
      for (const r of pn) {
        const l = d.lajes.find((x) => x.laje === r.laje && x.pavimento === r.pavimento);
        if (!l) continue;
        l.mensagens.push(...r.mensagens);
        if (r.status === 'fail') l.status = 'fail';
      }
    }
  }
  { const av = dimensionarAlveolares(b, an, d.lajes, an.opcoes); if (av.length) { d.alveolares = av; d.resumoAcoAlveolares = resumoAcoAlveolares(av, an.opcoes.perdasAco); } }
  if (estadoEmUso(b, 'incendio').ativo) {
    // resistência ao fogo (N2g): método tabular/analítico sobre as dimensões e a armadura adotadas
    const gz = an.vento?.gamaZ.length ? Math.max(...an.vento.gamaZ.map((g) => g.max)) : null;
    const vento = new Set([...(an.vento?.casos ?? []).map((c) => c.nome), ...casosDaObra(b).filter((c) => c.natureza === 'W').map((c) => c.nome)]);
    const comVento = new Set(combs.filter((c) => Object.entries(c.fatores).some(([k, f]) => f !== 0 && vento.has(k))).map((c) => c.nome));
    d.fogo = verificarFogo(b, d, an.opcoes, { gamaZmax: gz, phiLaje: (As, h) => barrasLaje(As, h).phi, semVento: (n) => !comVento.has(n) }, (v) => vaosDaViga(b, v));
    for (const e of d.fogo.elementos) {
      const alvo = e.tipo === 'viga' ? d.vigas.find((x) => x.viga === e.id) : e.tipo === 'laje' ? d.lajes.find((x) => x.laje === e.id && x.pavimento === e.pavimento) : d.pilares.find((x) => x.pilar === e.id && x.pavimento === e.pavimento);
      if (!alvo) continue;
      alvo.mensagens.push(...e.mensagens);
      if (e.status === 'fail') alvo.status = 'fail'; else if (e.status === 'review' && alvo.status === 'ok' && e.tipo === 'pilar') alvo.status = 'review';
    }
  }
  if (an.baseElastica) {
    const be = dimensionarBaseElastica(b, an, { raras: combinacoesDoEstado(b, an, 'solo', combs), elu, freq }, momentosWoodArmer);
    if (be.radiers.length) {
      // punção sob os pilares do radier (N2d): mensagens e situação do radier
      const pr = puncaoRadier(b, an, be.radiers, elu, an.opcoes);
      for (const r of be.radiers) {
        const l = pr.get(r.id);
        if (!l?.length) continue;
        r.puncao = l;
        r.mensagens.push(...l.flatMap((x) => x.mensagens));
        if (l.some((x) => x.status === 'fail')) r.status = 'fail';
      }
      d.radiers = be.radiers;
      d.detalhesRadier = be.radiers.map((r) => detalharRadier(b, b.fundacao!.radiers!.find((x) => x.id === r.id)!, r, an.opcoes));
      d.resumoAcoRadiers = resumoAcoRadiers(b, d.detalhesRadier, an.opcoes.perdasAco);
    }
    if (be.vigasElasticas.length) d.vigasElasticas = be.vigasElasticas;
  }
  if (o.fundacao !== false && (b.fundacao?.elementos.length || temCorridas(b))) Object.assign(d, comFundacao(b, an, o.fundacao || {}));
  // base dos muros de arrimo isolados na fundação (FU7b): σadm do terreno, profundidade e quantitativos
  if (!d.basesMuros && b.murosArrimo?.length) d.basesMuros = calcularBasesMuros(b, an.opcoes);
  return d;
}
