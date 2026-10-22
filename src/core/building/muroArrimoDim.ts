// Muro de arrimo em balanço (E1d): armadura do fuste e da base por metro de muro, a partir da estabilidade (`muroArrimo.ts`).
// Fuste: momento e cortante do empuxo (solo e sobrecarga) em estações ao longo da altura, flexão da seção retangular de
// largura 1 m e espessura variável, corte das barras pelo diagrama (metade das barras acima da cota em que a necessidade
// cai à metade, mais a ancoragem), armadura de distribuição e da face da frente. Base: ponta e talão em balanço a partir das
// faces do fuste, com a pressão do solo da estabilidade (trapezoidal ou triangular) e o peso do solo e da sobrecarga sobre
// o talão. γf = 1,4 nas ações características. NBR 6118 (flexão 17.2, mínimos 17.3.5.2.1, cortante de laje 19.4.1);
// NBR 11682 para o muro. Premissas em `premissas.ts` (e1d-muro-arrimo).
import { barArea, beamAsMin, beamFlexure, concrete } from '../concrete';
import { lbBasico } from './detalhamento';
import { estabilidadeMuro, type EstabilidadeMuro, type MuroArrimo } from './muroArrimo';
import { acoDe, cobrimentoFundacao, cobrimentoPilar, fckDe, gamas } from './materiais';
import type { OpcoesCalculo } from './opcoes';
import { cortanteTransversal, escolherMalha, listaMalhas, type Malha } from './paredesArmadura';
import type { BuildingModel } from './types';

export interface MatMuro {
  fck: number; fyk: number; gammaC: number; gammaS: number;
  /** γf das ações características (padrão 1,4). */
  gammaF?: number;
  /** Cobrimentos do fuste e da base (m). */
  cobFuste: number; cobBase: number;
  /** Armadura de distribuição mínima: % de b·h (as duas faces) e fração da principal. */
  taxaDistribuicao: number; fracaoDistribuicao: number;
}
/** Materiais do muro a partir da obra: fck e aço dos pilares, γ da obra, cobrimentos do pilar (fuste) e da fundação (base). */
export function matMuroDe(b: BuildingModel, op: Pick<OpcoesCalculo, 'paredeTaxaHorMin' | 'paredeHorFracVert'>): MatMuro {
  const g = gamas(b);
  return { fck: fckDe(b, 'pilar'), fyk: acoDe(b, 'pilarLong').fyk, gammaC: g.c, gammaS: g.s, cobFuste: cobrimentoPilar(b), cobBase: cobrimentoFundacao(b), taxaDistribuicao: op.paredeTaxaHorMin, fracaoDistribuicao: op.paredeHorFracVert };
}
export const MAT_MURO_PADRAO: MatMuro = { fck: 30, fyk: 500, gammaC: 1.4, gammaS: 1.15, cobFuste: 0.04, cobBase: 0.05, taxaDistribuicao: 0.1, fracaoDistribuicao: 20 };

export interface EstacaoFuste { /** Profundidade a partir do topo (m). */ y: number; t: number; Md: number; Vd: number; AsNec: number; AsMin: number }
export interface SecaoBase { Md: number; Vd: number; AsNec: number; AsMin: number; malha: Malha; VRd1: number; cortanteOk: boolean; face: 'inferior' | 'superior' }
export interface BarraMuro { descricao: string; phi: number; /** Barras por metro de muro. */ nPorM: number; /** Comprimento (m). */ comprimento: number; aco: string }

export interface ResultadoMuroDim {
  id?: string; nome?: string;
  estabilidade: EstabilidadeMuro;
  fuste: { estacoes: EstacaoFuste[]; principal: Malha; AsBase: number; frente: Malha; distribuicao: Malha; /** Altura (m, acima da base) até onde sobem as barras cortadas; null sem corte. */ alturaCorte: number | null; VRd1: number; cortanteOk: boolean; lb: number };
  base: { ponta: SecaoBase; talao: SecaoBase; distribuicao: Malha };
  barras: BarraMuro[];
  /** Aço (kg/m), concreto (m³/m) e forma (m²/m) por metro de muro. */
  peso: number; concreto: number; forma: number;
  /** Falha se a estabilidade (tombamento, deslizamento, tensão na base) ou o cortante não atende. */
  status: 'ok' | 'fail';
  mensagens: string[];
}

const cm2 = (m2: number) => m2 * 1e4;
const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');

/** Pressão do solo sob a base (kN/m²) na abscissa x a partir da ponta, da estabilidade (trapezoidal no núcleo, triangular fora). */
export function pressaoBase(m: MuroArrimo, est: EstabilidadeMuro): (x: number) => number {
  const talao = Math.max(0, m.B - m.ponta - m.tBase), N = est.V + (m.sobrecarga ?? 0) * talao;
  if (Math.abs(est.e) <= m.B / 6 + 1e-9) {
    const s0 = est.e >= 0 ? est.sigmaMax : est.sigmaMin, sB = est.e >= 0 ? est.sigmaMin : est.sigmaMax;
    return (x) => s0 + ((sB - s0) * x) / m.B;
  }
  const lc = est.sigmaMax > 0 ? (2 * N) / est.sigmaMax : m.B;
  return est.e >= 0 ? (x) => (x <= lc ? est.sigmaMax * (1 - x / lc) : 0) : (x) => (x >= m.B - lc ? est.sigmaMax * (1 - (m.B - x) / lc) : 0);
}

const integra = (f: (x: number) => number, a: number, b: number, n = 200) => { let s = 0; const h = (b - a) / n; for (let i = 0; i < n; i++) s += f(a + (i + 0.5) * h) * h; return s; };

/** Menor malha (φ × s, por metro, φ de 8 a 25 mm e s ≤ mín(20 cm; 2h)) com área ≥ `req` cm²/m. */
function malhaFlexao(req: number, h: number): Malha {
  return escolherMalha(req, listaMalhas({ t: h, bitolaMax: 25, espMin: 8, espMax: 20 }).filter((m) => m.phi >= 8)).malha;
}

/**
 * Armadura do fuste e da base do muro de arrimo por metro. `m` é o muro da estabilidade; as ações de cálculo são
 * γf × características (1,4). Mensagens para cortante acima de VRd1 (aumentar a espessura; sem estribos em muros finos).
 */
export function dimensionarMuroArrimo(m: MuroArrimo, mat: MatMuro = MAT_MURO_PADRAO): ResultadoMuroDim {
  const est = estabilidadeMuro(m), c = concrete(mat.fck, mat.gammaC), fyd = mat.fyk / mat.gammaS, gf = mat.gammaF ?? 1.4, msgs: string[] = [];
  const aco = mat.fyk === 600 ? 'CA-60' : 'CA-50', K = est.K, g = m.solo.gama, q = m.sobrecarga ?? 0, gc = m.gamaConcreto ?? 25;
  const matP = { fck: mat.fck, fcd: c.fcd, fctd: c.fctd, sigmaCd: c.sigmaCd, fyd, d1: 0 };
  const sec = (t: number) => ({ kind: 'rect' as const, bw: 1, h: t });
  // ---- fuste: estações a cada H/10 a partir do topo
  const estacoes: EstacaoFuste[] = [];
  const nEst = 10;
  for (let k = 1; k <= nEst; k++) {
    const y = (m.H * k) / nEst, t = m.tTopo + ((m.tBase - m.tTopo) * y) / m.H;
    const Md = gf * ((K * g * y ** 3) / 6 + (K * q * y ** 2) / 2), Vd = gf * ((K * g * y ** 2) / 2 + K * q * y);
    const d = t - mat.cobFuste - 0.008;
    const fl = beamFlexure(sec(t), false, Md, d, mat.cobFuste + 0.008, c, fyd);
    estacoes.push({ y, t, Md, Vd, AsNec: cm2(fl.As), AsMin: cm2(beamAsMin(sec(t), false, d, c, fyd)) });
  }
  const base = estacoes[nEst - 1];
  const reqBase = Math.max(base.AsNec, base.AsMin);
  const principal = malhaFlexao(reqBase, m.tBase);
  // corte: metade das barras sobe até onde a necessidade (com o mínimo) cai à metade da base, mais a ancoragem
  const lb = lbBasico(principal.phi, c, fyd, true, aco === 'CA-60');
  const metade = principal.As / 2;
  const req = (i: number) => Math.max(estacoes[i].AsNec, estacoes[i].AsMin);
  let lastOk = -1;
  for (let i = 0; i < nEst && req(i) <= metade + 1e-9; i++) lastOk = i;
  let alturaCorte: number | null = null;
  if (lastOk >= 0) {
    // as barras cortadas são necessárias até a profundidade da última estação que a metade cobre; sobem mais d (decalagem) + lb
    const topo = estacoes[lastOk].y - (lb + (m.tBase - mat.cobFuste - 0.008));
    if (topo > mat.cobFuste) alturaCorte = m.H - topo;
  }
  // cortante do fuste (sem estribos)
  const dB = m.tBase - mat.cobFuste - 0.008, cv = cortanteTransversal(m.tBase, mat.cobFuste + 0.008, principal.As, 0, matP);
  const cortanteOk = base.Vd <= cv.VRd1 + 1e-9;
  if (!cortanteOk) msgs.push(`Fuste: cortante de cálculo ${fmt(base.Vd, 1)} kN/m acima de VRd1 = ${fmt(cv.VRd1, 1)} kN/m na base (sem estribos em muros): aumente a espessura da base do fuste.`);
  // face da frente: vertical mínima; distribuição horizontal nas duas faces
  const minDist = (mat.taxaDistribuicao / 100) * m.tBase * 1e4 / 2;
  const asDist = Math.max((mat.fracaoDistribuicao / 100) * principal.As, minDist);
  const listaDist = listaMalhas({ t: m.tBase, bitolaMax: 16, espMin: 8, espMax: 20 }).filter((x) => x.phi >= 6.3);
  const distribuicao = escolherMalha(asDist, listaDist).malha, frente = escolherMalha(Math.max(asDist, (cm2(beamAsMin(sec(m.tBase), false, dB, c, fyd)) * 0.5)), listaDist).malha;

  // ---- base
  const sigma = pressaoBase(m, est), talao = Math.max(0, m.B - m.ponta - m.tBase), xf = m.ponta + m.tBase, hB = m.hBase, dBase = hB - mat.cobBase - 0.008;
  const wTalao = g * m.H + q + gc * hB;
  const Mponta = gf * integra((x) => (sigma(x) - gc * hB) * (m.ponta - x), 0, m.ponta);
  const Vponta = gf * integra((x) => sigma(x) - gc * hB, 0, m.ponta);
  const Mtalao = gf * integra((x) => (wTalao - sigma(x)) * (x - xf), xf, m.B);
  const Vtalao = gf * integra((x) => wTalao - sigma(x), xf, m.B);
  const secBase = (M: number, V: number, positivoInferior: boolean): SecaoBase => {
    const fl = beamFlexure(sec(hB), false, M, dBase, mat.cobBase + 0.008, c, fyd);
    const AsMin = cm2(beamAsMin(sec(hB), false, dBase, c, fyd)), AsNec = cm2(fl.As), malha = malhaFlexao(Math.max(AsNec, AsMin), hB);
    const vr = cortanteTransversal(hB, mat.cobBase + 0.008, malha.As, 0, matP);
    return { Md: Math.abs(M), Vd: Math.abs(V), AsNec, AsMin, malha, VRd1: vr.VRd1, cortanteOk: Math.abs(V) <= vr.VRd1 + 1e-9, face: (M >= 0) === positivoInferior ? 'inferior' : 'superior' };
  };
  const ponta = secBase(Mponta, Vponta, true), talaoS = secBase(Mtalao, Vtalao, false);
  if (!ponta.cortanteOk) msgs.push(`Ponta: cortante ${fmt(ponta.Vd, 1)} kN/m acima de VRd1 = ${fmt(ponta.VRd1, 1)} kN/m: aumente a espessura da base.`);
  if (!talaoS.cortanteOk) msgs.push(`Talão: cortante ${fmt(talaoS.Vd, 1)} kN/m acima de VRd1 = ${fmt(talaoS.VRd1, 1)} kN/m: aumente a espessura da base.`);
  const asDistB = Math.max((mat.fracaoDistribuicao / 100) * Math.max(ponta.malha.As, talaoS.malha.As), (mat.taxaDistribuicao / 100) * hB * 1e4 / 2);
  const distB = escolherMalha(asDistB, listaMalhas({ t: hB, bitolaMax: 16, espMin: 8, espMax: 20 }).filter((x) => x.phi >= 6.3)).malha;
  if (est.mensagens.length) msgs.push(...est.mensagens.map((x) => `Estabilidade: ${x}`));

  // ---- barras por metro
  const barras: BarraMuro[] = [];
  const embut = hB - mat.cobBase, perna = Math.max(0.1, lb - embut);
  const Lverde = m.H - mat.cobFuste;
  const nP = 1 / principal.s;
  if (alturaCorte !== null) {
    barras.push({ descricao: `Fuste, face do aterro, barras completas φ${fmt(principal.phi, 1)} c/${fmt(principal.s * 200, 1)} (alternadas)`, phi: principal.phi, nPorM: nP / 2, comprimento: Lverde + embut + perna, aco });
    barras.push({ descricao: `Fuste, face do aterro, barras cortadas a ${fmt(alturaCorte)} m da base φ${fmt(principal.phi, 1)} c/${fmt(principal.s * 200, 1)}`, phi: principal.phi, nPorM: nP / 2, comprimento: alturaCorte + embut + perna, aco });
  } else barras.push({ descricao: `Fuste, face do aterro, φ${fmt(principal.phi, 1)} c/${fmt(principal.s * 100, 1)} (altura toda)`, phi: principal.phi, nPorM: nP, comprimento: Lverde + embut + perna, aco });
  barras.push({ descricao: `Fuste, face da frente, vertical φ${fmt(frente.phi, 1)} c/${fmt(frente.s * 100, 1)}`, phi: frente.phi, nPorM: 1 / frente.s, comprimento: Lverde + embut, aco });
  barras.push({ descricao: `Fuste, distribuição horizontal nas duas faces φ${fmt(distribuicao.phi, 1)} c/${fmt(distribuicao.s * 100, 1)}`, phi: distribuicao.phi, nPorM: (2 * m.H) / distribuicao.s, comprimento: 1, aco });
  const lbP = (phi: number) => lbBasico(phi, c, fyd, true, aco === 'CA-60');
  barras.push({ descricao: `Ponta, face inferior φ${fmt(ponta.malha.phi, 1)} c/${fmt(ponta.malha.s * 100, 1)} (transversal)`, phi: ponta.malha.phi, nPorM: 1 / ponta.malha.s, comprimento: m.B - 2 * mat.cobBase, aco });
  barras.push({ descricao: `Talão, face superior φ${fmt(talaoS.malha.phi, 1)} c/${fmt(talaoS.malha.s * 100, 1)} (transversal)`, phi: talaoS.malha.phi, nPorM: 1 / talaoS.malha.s, comprimento: talao + m.tBase + lbP(talaoS.malha.phi) - mat.cobBase, aco });
  barras.push({ descricao: `Base, distribuição longitudinal nas duas faces φ${fmt(distB.phi, 1)} c/${fmt(distB.s * 100, 1)}`, phi: distB.phi, nPorM: (2 * m.B) / distB.s, comprimento: 1, aco });
  const peso = barras.reduce((s, b) => s + b.nPorM * b.comprimento * barArea(b.phi) * 7850, 0);
  const concreto = ((m.tTopo + m.tBase) / 2) * m.H + m.B * hB;
  const forma = 2 * m.H + 2 * hB;
  const ok = cortanteOk && ponta.cortanteOk && talaoS.cortanteOk && est.atende.tombamento && est.atende.deslizamento && est.atende.tensao;
  return {
    estabilidade: est, fuste: { estacoes, principal, AsBase: reqBase, frente, distribuicao, alturaCorte, VRd1: cv.VRd1, cortanteOk, lb },
    base: { ponta, talao: talaoS, distribuicao: distB }, barras, peso, concreto, forma, status: ok ? 'ok' : 'fail', mensagens: msgs,
  };
}
