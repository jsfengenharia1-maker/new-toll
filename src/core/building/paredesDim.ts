// Dimensionamento de paredes de concreto e pilares-parede (E1d). Para cada lado em casca, lance e pano (faixa entre
// aberturas), as forças de membrana, placa e cortante de cada elemento da casca em cada combinação ELU viram a armadura
// necessária (modelo sanduíche, `paredesArmadura.ts`); a malha vertical e horizontal do pano (iguais nas duas faces) é a
// de menor aço que atende a fração exigida da área (fator de cumprimento); o que a malha não cobre vira reforço local
// (bordas e faixas). Lados curtos (barras) são dimensionados como pilares por fibras (`paredesLado.ts`) e os lados em
// casca têm a armadura adotada verificada globalmente à flexo-compressão oblíqua. Aberturas: verga, peitoril, montantes
// e cantos. Premissas em `premissas.ts` (ids e1d-*).
import { ehAlvenaria } from './alvenaria';
import { beamShear, barArea, type Concrete } from '../concrete';
import type { AnaliseEdificio } from './analitico';
import type { CombinacaoEd } from './combinacoes';
import { acoDe, cobrimentoPilar, concretoDe, gamas } from './materiais';
import type { OpcoesCalculo } from './opcoes';
import {
  atende, avaliarElementos, escolherMalhasPano, forcasDe, minimosPano, reforcosLocais, verificaConcretoSimples, asMalha, cortanteTransversal,
  type ElementoPano, type Forcas, type Malha, type MatParede, type ParamsPano, type PontoPano, type ReforcoLocal,
} from './paredesArmadura';
import { barrasDoLado, dimensionarLadoBarra, secaoDoLado, verificarLado, type EsforcoLado, type ResultadoLadoBarra } from './paredesLado';
import { furosDaParede, niveisDaParede, ppDaParede, type FuroTrecho } from './paredesBase';
import { memoriaAtiva } from '../memoria/registrador';
import { elementoParede, registrarAbertura, registrarLadoBarra, registrarLadoGlobal, registrarPano } from '../memoria/paredes';
import { geometriaParedes, ladosDoPP, lancesDoPP, type GradeLado, type LadoGeo } from './pilarParede';
import type { ResultadoPilarParede } from './pilarParedeEsforcos';
import type { AberturaParede, ArmaduraAbertura, ArmaduraPano, BuildingModel, Parede, PilarParede } from './types';
import { casosHorizontais } from './desaprumo';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const pct = (v: number) => `${fmt(v * 100, 1)} %`;

// ---------------------------------------------------------------- resultado

export interface PontoFalha { s: number; z: number; area: number; motivo: 'vertical' | 'horizontal' | 'concreto' | 'cortante'; dv: number; dh: number }

export interface ResultadoPano {
  lado: number; nomeLado: string; pavimento: string; nomePav: string; pano: number; panos: number;
  /** Extensão no sistema (s, z) do lado, m; z a partir da base do lance. */
  s0: number; s1: number; z0: number; z1: number; t: number; area: number;
  /** Maior necessidade por face (cm²/m) nos pontos do pano. */
  req: { vert: number; hor: number };
  /** Malhas adotadas (iguais nas duas faces) e áreas por face (cm²/m); nulas quando o pano não é armado. */
  vert: { phi: number; s: number } | null; hor: { phi: number; s: number } | null;
  asVert: number; asHor: number;
  bloqueada: boolean; armada: boolean;
  /** Fração da área que atende com a malha uniforme e a exigida. */
  cumprimento: number; exigido: number;
  pontos: PontoFalha[]; reforcos: ReforcoLocal[];
  /** Maior utilização do concreto na biela e do aço (necessidade/adotada). */
  tensoes: { utilConcreto: number; utilAco: number };
  cortante: { V: number; VRd1: number; VRd2: number; grampos: boolean };
  esbeltez: { lambda: number; le: number; segundaOrdem: boolean };
  /** Combinações e esforços que governam. */
  governa: { vert?: string; hor?: string; concreto?: string; cortante?: string; pior?: { combo: string; s: number; z: number; forcas: Forcas } };
  /** Há tração na armadura vertical junto ao topo do lance (emenda tracionada acima). */
  tracaoNoTopo: boolean;
  concretoSimples?: number;
  status: 'ok' | 'fail';
  mensagens: string[];
}

export interface ResultadoAbertura {
  id: string; tipo: 'porta' | 'janela'; pavimento: string; nomePav: string;
  /** Lado (trecho) da parede e lance (pavimento do topo) em que a abertura fica. */
  lado: number; lance: string;
  s: number; largura: number; peitoril: number; altura: number;
  /** Necessidade (cm²) da verga, do peitoril e dos montantes, e a armadura adotada. */
  necessaria: { verga: number; peitoril: number; montante: number };
  armadura: ArmaduraAbertura; origem: 'calculada' | 'bloqueada' | 'padrao';
  cortanteVerga: { Vsd: number; VRd2: number; ok: boolean };
  status: 'ok' | 'fail';
  mensagens: string[];
}

export interface ResultadoLadoDim {
  lado: number; nome: string; pavimento: string; nomePav: string; modelo: 'casca' | 'barra';
  L: number; t: number;
  /** Casca: verificação global da armadura dos panos; barra: dimensionamento como pilar. */
  util: number; combo: string;
  barra?: ResultadoLadoBarra;
  status: 'ok' | 'fail' | 'review';
  mensagens: string[];
}

export interface ResultadoParedeDim {
  id: string; nome: string; tipo: 'parede' | 'pilarParede';
  panos: ResultadoPano[]; lados: ResultadoLadoDim[]; aberturas: ResultadoAbertura[];
  /** Falso quando a parede é verificada como concreto simples (sem armadura). */
  armada: boolean;
  status: 'ok' | 'fail';
  mensagens: string[];
}

// ---------------------------------------------------------------- entrada de elementos

// (ElementoPano, AvaliacaoPano e avaliarElementos moram em paredesArmadura.ts, para a memória detalhada usar sem ciclo)
export { avaliarElementos, type ElementoPano, type AvaliacaoPano } from './paredesArmadura';

// ---------------------------------------------------------------- pano

export interface EntradaPano {
  nome: string; t: number; le: number; d1: number;
  mat: MatParede; matH: MatParede; conc: Concrete;
  elementos: ElementoPano[]; combos: string[];
  /** Abscissas das colunas e alturas das linhas da malha do pano (s e z do lado), para os reforços locais. */
  colunas: number[]; linhas: number[];
  op: OpcoesCalculo;
  bloqueio?: Malha2;
  /** Concreto simples (sem armadura). */
  simples: boolean;
}
export type Malha2 = { vert: { phi: number; s: number }; hor: { phi: number; s: number } };

export type SaidaPano = Omit<ResultadoPano, 'lado' | 'nomeLado' | 'pavimento' | 'nomePav' | 'pano' | 'panos' | 's0' | 's1' | 'z0' | 'z1'>;

/** Dimensiona (ou verifica, com bloqueio) um pano: malhas, cumprimento, pontos, reforços, tensões, cortante e esbeltez. */
export function dimensionarPano(e: EntradaPano): SaidaPano {
  const { op, t, d1, mat } = e, msgs: string[] = [];
  const av = avaliarElementos(e.elementos, t, e.le, mat, e.matH, e.simples);
  const pts = av.map((x) => x.pts[0]);
  const area = pts.reduce((s, p) => s + p.area, 0);
  const reqV = Math.max(0, ...pts.map((p) => p.rv)), reqH = Math.max(0, ...pts.map((p) => p.rh));
  const utilC = Math.max(0, ...pts.map((p) => p.util)), Vmax = Math.max(0, ...pts.map((p) => p.V));
  const idx = (f: (p: PontoPano) => number) => pts.reduce((m, p, i) => (f(p) > f(pts[m]) ? i : m), 0);
  const iv = idx((p) => p.rv), ih = idx((p) => p.rh), iu = idx((p) => p.util), iV = idx((p) => p.V);
  const nomeC = (i: number, f: 'vert' | 'hor' | 'util' | 'V') => e.combos[av[i].governa[f]];
  const governa: SaidaPano['governa'] = {
    ...(reqV > 0 ? { vert: nomeC(iv, 'vert') } : {}), ...(reqH > 0 ? { hor: nomeC(ih, 'hor') } : {}),
    ...(utilC > 0 ? { concreto: nomeC(iu, 'util') } : {}), ...(Vmax > 0 ? { cortante: nomeC(iV, 'V') } : {}),
  };
  const pior = (() => { const i = iv; const ic = av[i].governa.vert; return reqV > 0 ? { combo: e.combos[ic], s: pts[i].s, z: pts[i].z, forcas: e.elementos[i].forcas[ic] } : undefined; })();
  if (pior) governa.pior = pior;
  const lambda = av[0]?.req[0].lambda ?? 0;
  const esbeltez = { lambda, le: e.le, segundaOrdem: lambda > 35 };
  if (lambda > 90) msgs.push(`Esbeltez λ = ${fmt(lambda, 0)} > 90: o processo aproximado por faixas (15.9) não vale; revisar pelo método geral.`);
  const simples = e.simples ? Math.max(0, ...av.map((x) => x.simples)) : undefined;
  const tracaoNoTopo = (() => {
    const zmax = Math.max(...pts.map((p) => p.z)), zmin = Math.min(...pts.map((p) => p.z)), lim = zmax - (zmax - zmin) / 4;
    return pts.some((p) => p.z >= lim - 1e-9 && p.rv > 1e-9);
  })();
  const base = { t, req: { vert: reqV, hor: reqH }, area, governa, esbeltez, tracaoNoTopo, ...(simples !== undefined ? { concretoSimples: simples } : {}) };
  const exigido = op.paredeCumprimento / 100;

  // concreto simples: sem armadura
  if (e.simples) {
    const ok = (simples ?? 0) <= 1 + 1e-9 && utilC <= 1 + 1e-9;
    if (!ok) msgs.push(`Parede em concreto simples: tração ou compressão acima do limite (razão ${fmt(simples ?? 0)}; NBR 6118, 24, a confirmar). Ative a armadura da parede.`);
    return { ...base, vert: null, hor: null, asVert: 0, asHor: 0, bloqueada: false, armada: false, cumprimento: ok ? 1 : 0, exigido, pontos: [], reforcos: [], tensoes: { utilConcreto: utilC, utilAco: 0 }, cortante: { V: Vmax, VRd1: 0, VRd2: 0, grampos: false }, status: ok ? 'ok' : 'fail', mensagens: msgs };
  }
  // armar só quando necessário
  if (!op.paredeArmarSempre && reqV < 1e-9 && reqH < 1e-9 && utilC <= 1) {
    const sim = Math.max(0, ...e.elementos.flatMap((el) => el.forcas.map((f) => verificaConcretoSimples(f, t, mat).razao)));
    if (sim <= 1 + 1e-9 && Vmax <= cortanteTransversal(t, d1, 0, Math.max(0, ...pts.map((p) => p.ncomp)), mat).VRd1) {
      return { ...base, vert: null, hor: null, asVert: 0, asHor: 0, bloqueada: false, armada: false, cumprimento: 1, exigido, pontos: [], reforcos: [], tensoes: { utilConcreto: utilC, utilAco: 0 }, cortante: { V: Vmax, VRd1: 0, VRd2: 0, grampos: false }, status: 'ok', concretoSimples: sim, mensagens: ['Nenhum ponto exige armadura e a verificação em concreto simples atende: pano sem armadura (opção "armar sempre" desligada).'] };
    }
  }
  const limites = { t, bitolaMax: op.paredeBitolaMax, espMin: op.paredeEspMin, espMax: op.paredeEspMax };
  const asMinMec = (0.15 * Math.max(0, ...pts.map((p) => p.ncomp)) * 10) / mat.fyd;
  const par: ParamsPano = {
    t, d1, mat, cumprimento: exigido, taxaVertMin: op.paredeTaxaVertMin, taxaVertMax: op.paredeTaxaVertMax, taxaHorMin: op.paredeTaxaHorMin, horFracVert: op.paredeHorFracVert,
    limites, asMinMecanica: asMinMec, soHorizontal: !!op.paredeSoHorizontal,
  };
  let vert: Malha | null, hor: Malha, fracao: number, ok = true, bloqueada = false;
  if (e.bloqueio) {
    bloqueada = true;
    vert = e.bloqueio.vert.phi > 0 ? { ...e.bloqueio.vert, As: asMalha(e.bloqueio.vert.phi, e.bloqueio.vert.s) } : null;
    hor = { ...e.bloqueio.hor, As: asMalha(e.bloqueio.hor.phi, e.bloqueio.hor.s) };
    fracao = pts.reduce((s, p) => s + (atende(p, vert?.As ?? 0, hor.As, t, d1, mat).ok ? p.area : 0), 0) / (area || 1);
    const mn = minimosPano(par, vert?.As ?? 0);
    if (!op.paredeSoHorizontal && (vert?.As ?? 0) < mn.vert - 1e-9) { ok = false; msgs.push(`Armadura bloqueada abaixo da vertical mínima (${fmt(mn.vert)} cm²/m por face).`); }
    if (hor.As < mn.hor - 1e-9) { ok = false; msgs.push(`Armadura bloqueada abaixo da horizontal mínima (${fmt(mn.hor)} cm²/m por face).`); }
    if (fracao < exigido - 1e-9) { ok = false; msgs.push(`Armadura bloqueada insuficiente: ${pct(fracao)} da área atende, abaixo dos ${pct(exigido)} exigidos.`); }
  } else {
    const esc = escolherMalhasPano(pts, par);
    vert = esc.vert.phi > 0 ? esc.vert : null; hor = esc.hor; fracao = esc.fracao; ok = esc.ok;
    if (!esc.ok) msgs.push(`Armadura da parede não atende: ${esc.motivo ?? 'fração exigida não atingida'} (atende ${pct(fracao)}, exigido ${pct(exigido)}).`);
  }
  const pv = vert?.As ?? 0, ph = hor.As;
  // pontos que não atendem
  const pontos: PontoFalha[] = [];
  for (const p of pts) {
    const r = atende(p, pv, ph, t, d1, mat);
    if (!r.ok) pontos.push({ s: p.s, z: p.z, area: p.area, motivo: r.motivo!, dv: Math.max(0, p.rv - pv), dh: Math.max(0, p.rh - ph) });
  }
  if (op.paredeSoHorizontal && reqV > 1e-9) { ok = false; msgs.push(`Só armadura horizontal: há pontos que exigem vertical (até ${fmt(reqV)} cm²/m por face).`); }
  if (pontos.some((p) => p.motivo === 'concreto')) { ok = false; msgs.push(`Concreto da biela acima do limite em ${pontos.filter((p) => p.motivo === 'concreto').length} ponto(s) (utilização máxima ${fmt(utilC)}): aumente a espessura ou o fck.`); }
  // cortante transversal
  const c = cortanteTransversal(t, d1, pv, Math.max(0, ...pts.map((p) => p.ncomp)), mat);
  const grampos = Vmax > c.VRd1 + 1e-9 && t >= 0.35 - 1e-9 && Vmax <= c.VRd2;
  if (Vmax > c.VRd1 + 1e-9 && !grampos) { ok = false; msgs.push(`Cortante fora do plano ${fmt(Vmax, 1)} kN/m acima de VRd1 = ${fmt(c.VRd1, 1)} kN/m${t < 0.35 ? ' (sem armadura transversal em paredes com t < 35 cm; aumente a espessura)' : ' e de VRd2'}.`); }
  if (grampos) msgs.push(`Cortante fora do plano ${fmt(Vmax, 1)} kN/m acima de VRd1: grampos entre as faces (armadura transversal).`);
  // reforços locais por coluna (vertical) e por linha (horizontal)
  const colunas = e.colunas, linhas = e.linhas;
  const fv: [number, number, number][] = colunas.slice(0, -1).map((a, i) => [a, colunas[i + 1], Math.max(0, ...pts.filter((p) => p.s >= a - 1e-9 && p.s < colunas[i + 1] - 1e-9).map((p) => p.rv))]);
  const fh: [number, number, number][] = linhas.slice(0, -1).map((a, i) => [a, linhas[i + 1], Math.max(0, ...pts.filter((p) => p.z >= a - 1e-9 && p.z < linhas[i + 1] - 1e-9).map((p) => p.rh))]);
  const reforcos = [...(op.paredeSoHorizontal ? [] : reforcosLocais('vertical', fv, pv, vert?.phi ?? 10)), ...reforcosLocais('horizontal', fh, ph, hor.phi)];
  const utilAco = Math.max(pv > 0 ? reqV / pv : 0, ph > 0 ? reqH / ph : 0);
  return {
    ...base, vert: vert ? { phi: vert.phi, s: vert.s } : null, hor: { phi: hor.phi, s: hor.s }, asVert: pv, asHor: ph, bloqueada, armada: true, cumprimento: fracao, exigido,
    pontos: pontos.sort((a, z) => z.area - a.area).slice(0, 200), reforcos, tensoes: { utilConcreto: utilC, utilAco }, cortante: { V: Vmax, VRd1: c.VRd1, VRd2: c.VRd2, grampos },
    status: ok ? 'ok' : 'fail', mensagens: msgs,
  };
}

// ---------------------------------------------------------------- abertura (verga, peitoril, montantes, cantos)

export interface ForcasFaixa {
  /** Combinações: normal horizontal integrada na altura da faixa (kN/m·m → kN), momento em torno do meio da faixa (kN·m) e cortante no apoio (kN). */
  combos: { N: number; M: number; V: number }[];
}

/** Barras n × φ de menor número (≥ `nMin`, par ou ímpar) com área ≥ `As` (cm²), bitola a partir de `phiMin`. */
export function escolherBarras(As: number, phiMin: number, nMin = 2, nMax = 8): { n: number; phi: number } {
  for (const phi of [6.3, 8, 10, 12.5, 16, 20, 25].filter((p) => p >= phiMin - 1e-9)) {
    const n = Math.max(nMin, Math.ceil(As / (barArea(phi) * 1e4) - 1e-9));
    if (n <= nMax || phi === 25) return { n, phi };
  }
  return { n: nMin, phi: 25 };
}

export interface EntradaAbertura {
  a: AberturaParede; nomePav: string; lado: number; lance: string; t: number; conc: Concrete; fyd: number; fywk: number; gammaS: number; cobrimento: number;
  /** Altura da verga (do topo da abertura ao topo do lance) e do peitoril, m. */
  hVerga: number; hPeitoril: number;
  verga: ForcasFaixa; peitoril: ForcasFaixa;
  /** Armadura vertical (cm²/m por face) e horizontal adotadas nos panos vizinhos, para os montantes. */
  asVertVizinho: number;
  bloqueada?: ArmaduraAbertura; padrao?: ArmaduraAbertura;
  canto: boolean;
}

export const CANTO_PADRAO = { n: 2, phi: 10 };

/**
 * Armadura de reforço da abertura. Verga: tração da camada inferior T = N/2 + M/z (z = 0,9d da faixa de altura hVerga) em
 * cada combinação, somando a flexão da faixa acima da abertura, e cortante como viga de largura t (modelo I); peitoril
 * (janela): mesma conta na faixa abaixo; montantes: as barras verticais interrompidas pela largura da abertura,
 * metade em cada lado; cantos: barras inclinadas (opção). A malha dos panos não é descontada (a favor da segurança).
 */
export function dimensionarAbertura(e: EntradaAbertura): ResultadoAbertura {
  const { a, t } = e, msgs: string[] = [];
  const tracao = (f: ForcasFaixa, h: number) => {
    const d = Math.max(0.05, h - e.cobrimento - 0.01), z = 0.9 * d;
    return Math.max(0, ...f.combos.map((c) => Math.max(c.N / 2 + Math.abs(c.M) / z, c.N / 2 - Math.abs(c.M) / z) / (e.fyd * 1000) * 1e4));
  };
  const nVerga = tracao(e.verga, e.hVerga), nPeit = a.tipo === 'janela' ? tracao(e.peitoril, e.hPeitoril) : 0;
  const nMont = (e.asVertVizinho * a.largura); // cm²: (2 faces × As × largura)/2 lados
  const V = Math.max(0, ...e.verga.combos.map((c) => Math.abs(c.V)));
  const dV = Math.max(0.05, e.hVerga - e.cobrimento - 0.01);
  const cs = beamShear(t, dV, V, e.conc, e.fywk, e.gammaS);
  const nec = { verga: nVerga, peitoril: nPeit, montante: nMont };
  const calc: ArmaduraAbertura = {
    verga: escolherBarras(nVerga, 10), estribo: cs.stirrup ? { phi: cs.stirrup.phi, s: cs.stirrup.s } : { phi: 6.3, s: 0.1 },
    ...(a.tipo === 'janela' ? { peitoril: escolherBarras(nPeit, 10) } : {}), montante: escolherBarras(nMont, 10),
    ...(e.canto ? { canto: { ...CANTO_PADRAO } } : {}),
  };
  const dado = e.bloqueada ?? e.padrao;
  const adot = dado ?? calc;
  const origem: ResultadoAbertura['origem'] = e.bloqueada ? 'bloqueada' : e.padrao ? 'padrao' : 'calculada';
  const prov = (b?: { n: number; phi: number }) => (b ? b.n * barArea(b.phi) * 1e4 : 0);
  let ok = true;
  if (dado) {
    if (prov(adot.verga) < nVerga - 1e-9) { ok = false; msgs.push(`Verga ${a.tipo === 'porta' ? 'da porta' : 'da janela'} com ${fmt(prov(adot.verga))} cm² abaixo dos ${fmt(nVerga)} cm² necessários.`); }
    if (a.tipo === 'janela' && prov(adot.peitoril) < nPeit - 1e-9) { ok = false; msgs.push(`Peitoril da janela com ${fmt(prov(adot.peitoril))} cm² abaixo dos ${fmt(nPeit)} cm² necessários.`); }
    if (prov(adot.montante) < nMont - 1e-9) { ok = false; msgs.push(`Montantes com ${fmt(prov(adot.montante))} cm² abaixo dos ${fmt(nMont)} cm² das barras verticais interrompidas.`); }
    if (cs.stirrup && (2 * barArea(adot.estribo.phi) * 1e4) / adot.estribo.s < cs.aswS * 1e4 - 1e-9) { ok = false; msgs.push('Estribos da verga abaixo do necessário ao cortante.'); }
  }
  if (!cs.ok) { ok = false; msgs.push(`Verga: cortante ${fmt(V, 1)} kN acima de VRd2 = ${fmt(cs.VRd2, 1)} kN (biela comprimida); aumente a altura da verga ou a espessura.`); }
  return {
    id: a.id, tipo: a.tipo, pavimento: a.pavimento, nomePav: e.nomePav, lado: e.lado, lance: e.lance, s: a.s, largura: a.largura, peitoril: a.peitoril, altura: a.altura,
    necessaria: nec, armadura: adot, origem, cortanteVerga: { Vsd: V, VRd2: cs.VRd2, ok: cs.ok }, status: ok ? 'ok' : 'fail', mensagens: msgs,
  };
}

/** Panos de um lado num lance: faixas entre as aberturas (as colunas das aberturas não são panos), da esquerda para a direita. */
export function intervalosDosPanos(L: number, fs: { s0: number; s1: number }[]): [number, number][] {
  const bps = ordena([0, L, ...fs.flatMap((f) => [f.s0, f.s1])]);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < bps.length; i++) {
    const a = bps[i], z = bps[i + 1];
    if (fs.some((f) => f.s0 <= a + 1e-6 && f.s1 >= z - 1e-6)) continue;
    out.push([a, z]);
  }
  return out;
}

/** Número de panos do lado `lado` da parede ou do pilar-parede no lance de topo `pavimento` (para travar a armadura). */
export function numeroDePanos(b: BuildingModel, id: string, lado: number, pavimento: string): number {
  const parede = b.paredes?.find((w) => w.id === id), pp = parede ? ppDaParede(parede) : b.pilaresParede?.find((x) => x.id === id);
  if (!pp) return 0;
  const lances = lancesDoPP(b, pp), k = lances.findIndex((l) => l.id === pavimento), g = ladosDoPP(b, pp)[lado];
  if (k < 0 || !g) return 0;
  if (!parede) return 1;
  const zs = niveisDaParede(b, parede).zs;
  const fs = (furosDaParede(b, parede).porTrecho[lado] ?? []).filter((f) => f.z0 >= zs[k] - 1e-6 && f.z1 <= zs[k + 1] + 1e-6);
  return intervalosDosPanos(g.L, fs).length;
}

// ---------------------------------------------------------------- extrapolação às bordas do lance

/**
 * As forças da casca vêm do centroide dos elementos; junto à base e ao topo do lance (vínculo, laje) os picos ficam a
 * 1/3 da altura da célula da borda. Por coluna da malha, extrapola linearmente as duas fileiras de elementos mais
 * próximas de cada borda até a cota 0 e `H` e acrescenta esses pontos (metade da área do elemento), para que a malha e
 * o reforço cubram também o valor na borda.
 */
export function extrapolarBordas(els: ElementoPano[], S: number[], H: number): ElementoPano[] {
  const cel = (s: number) => { let i = 0; while (i + 2 < S.length && s >= S[i + 1]) i++; return i; };
  const colunas = new Map<number, ElementoPano[]>();
  for (const e of els) { const i = cel(e.s); (colunas.get(i) ?? colunas.set(i, []).get(i)!).push(e); }
  const extra: ElementoPano[] = [];
  const mistura = (a: Forcas, b: Forcas, k: number): Forcas => ({ nx: a.nx + (a.nx - b.nx) * k, ny: a.ny + (a.ny - b.ny) * k, nxy: a.nxy + (a.nxy - b.nxy) * k, mx: a.mx + (a.mx - b.mx) * k, my: a.my + (a.my - b.my) * k, mxy: a.mxy + (a.mxy - b.mxy) * k, qx: a.qx + (a.qx - b.qx) * k, qy: a.qy + (a.qy - b.qy) * k });
  for (const col of colunas.values()) {
    const o = [...col].sort((a, z) => a.z - z.z);
    if (o.length < 2) continue;
    for (const [e1, e2, alvo] of [[o[0], o[1], 0], [o.at(-1)!, o.at(-2)!, H]] as const) {
      const dz = e2.z - e1.z;
      if (Math.abs(dz) < 1e-6) continue;
      const k = (e1.z - alvo) / dz; // f(alvo) = f1 + (f1 − f2)·k
      extra.push({ s: e1.s, z: alvo, area: e1.area / 2, forcas: e1.forcas.map((f, c) => mistura(f, e2.forcas[c], k)) });
    }
  }
  return extra;
}

// ---------------------------------------------------------------- orquestração

export const ordena = (xs: number[]) => [...new Set(xs.map((x) => Math.round(x * 1e4) / 1e4))].sort((a, z) => a - z);

/** Armadura bloqueada do pano: a do pano (ou a do lado e lance sem pano) com o mesmo número de panos. */
function bloqueioDoPano(lista: ArmaduraPano[] | undefined, lado: number, pav: string, pano: number, panos: number): { bloqueio?: Malha2; ignorado?: boolean } {
  const cand = (lista ?? []).filter((x) => x.lado === lado && x.pavimento === pav && (x.pano === undefined || x.pano === pano));
  if (!cand.length) return {};
  const x = cand.find((c) => c.pano === pano) ?? cand[0];
  if (x.panos !== panos) return { ignorado: true };
  return { bloqueio: { vert: x.vert, hor: x.hor } };
}

/** Fontes de forças das cascas por nome de caso (analisados e vento). */
export function fontesCascas(an: AnaliseEdificio): Map<string, Float64Array[]> {
  const m = new Map<string, Float64Array[]>();
  const res = an.portico.res, resV = an.portico.resVento && !an.portico.resVento.erro ? an.portico.resVento : null;
  if (res?.cascas) an.casos.forEach((c, ic) => { if (res.cascas![ic]) m.set(c, res.cascas![ic]); });
  const nomesV = casosHorizontais(an).map((c) => c.nome);
  if (resV?.cascas) nomesV.forEach((n, iv) => { if (resV.cascas![iv]) m.set(n, resV.cascas![iv]); });
  return m;
}

const matDe = (conc: Concrete, fyd: number, d1: number): MatParede => ({ fck: conc.fck, fcd: conc.fcd, fctd: conc.fctd, sigmaCd: conc.sigmaCd, fyd, d1 });

/** Resultantes de um lado por combinação (N, Mp, Mo). */
export function esforcosDoLado(res: ResultadoPilarParede | undefined, lado: number, pav: string, elu: CombinacaoEd[]): EsforcoLado[] {
  const l = res?.lados.find((x) => x.lado === lado && x.pavimento === pav);
  if (!l) return [];
  return elu.map((cb) => {
    let N = 0, Mp = 0, Mo = 0;
    for (const [n, f] of Object.entries(cb.fatores)) { const r = l.casos[n]; if (r) { N += f * r.N; Mp += f * r.Mp; Mo += f * r.Mo; } }
    return { nome: cb.nome, N, Mp, Mo };
  });
}

/**
 * Dimensiona as paredes e os pilares-parede com lados em casca (vazio sem eles). `resultantes` = esforços resultantes por
 * lado (E1b/E1c) usados na verificação global e no dimensionamento dos lados curtos.
 */
export function dimensionarParedes(b: BuildingModel, an: AnaliseEdificio, elu: CombinacaoEd[], resultantes: { paredes?: ResultadoPilarParede[]; pilaresParede?: ResultadoPilarParede[] }, op: OpcoesCalculo): ResultadoParedeDim[] {
  const alvos: { pp: PilarParede; parede?: Parede; lista: ArmaduraPano[] | undefined; res?: ResultadoPilarParede }[] = [
    ...(b.pilaresParede ?? []).map((pp) => ({ pp, lista: pp.armaduras, res: resultantes.pilaresParede?.find((r) => r.id === pp.id) })),
    ...(b.paredes ?? []).filter((w) => !ehAlvenaria(w)).map((w) => ({ pp: ppDaParede(w), parede: w, lista: w.armaduras, res: resultantes.paredes?.find((r) => r.id === w.id) })),
  ];
  if (!alvos.length || !an.paredes || !an.portico.res) return [];
  const geo = geometriaParedes(b, op);
  if (!geo) return [];
  const fontes = fontesCascas(an), combos = elu.map((c) => c.nome);
  const comp = elu.map((cb) => Object.entries(cb.fatores).filter(([n, f]) => f && fontes.has(n)).map(([n, f]) => [fontes.get(n)!, f] as const));
  const cob = cobrimentoPilar(b), d1 = cob + 0.013;
  const aV = acoDe(b, 'pilarLong'), aH = acoDe(b, 'pilarEstribo');
  const out: ResultadoParedeDim[] = [], mem = memoriaAtiva();
  for (const { pp, parede, lista, res } of alvos) {
    const elDe = (nomeLance: string) => { const el = elementoParede(parede ? 'parede' : 'pilarParede', pp.nome, nomeLance); return mem?.aceita(el) ? el : null; };
    const lances = lancesDoPP(b, pp), zs = geo.niveisZ[pp.id];
    if (!lances.length || !zs) continue;
    const lados = ladosDoPP(b, pp, op.pilarParedeLimite);
    const furos = parede ? furosDaParede(b, parede).porTrecho : [];
    const r: ResultadoParedeDim = { id: pp.id, nome: pp.nome, tipo: parede ? 'parede' : 'pilarParede', panos: [], lados: [], aberturas: [], armada: parede?.armar !== false, status: 'ok', mensagens: [] };
    for (const g of lados) {
      for (const [k, lance] of lances.entries()) {
        const conc = concretoDe(b, 'pilar', lance.id), mat = matDe(conc, aV.fyd, d1), matH = matDe(conc, aH.fyd, d1);
        const t = g.esp(lance.id).t, H = zs[k + 1] - zs[k];
        const es = esforcosDoLado(res, g.i, lance.id, elu);
        if (!g.casca) {
          // lado curto: dimensionado como pilar
          const entB = { L: g.ext(lance.id)[1] - g.ext(lance.id)[0], t, a: d1, le: op.paredeFlambagem * H, conc, fyd: aV.fyd, limites: { t, bitolaMax: op.paredeBitolaMax, espMin: op.paredeEspMin, espMax: op.paredeEspMax }, taxaMin: op.paredeTaxaVertMin, taxaMax: op.paredeTaxaVertMax, esforcos: es };
          const bar = dimensionarLadoBarra(entB);
          { const elM = elDe(lance.nome); if (mem && elM) registrarLadoBarra(mem, { elemento: elM, lado: g.nome, lance: lance.nome, e: entB, r: bar, taxaMin: op.paredeTaxaVertMin, taxaMax: op.paredeTaxaVertMax }); }
          r.lados.push({ lado: g.i, nome: g.nome, pavimento: lance.id, nomePav: lance.nome, modelo: 'barra', L: g.ext(lance.id)[1] - g.ext(lance.id)[0], t, util: bar.util, combo: bar.combo, barra: bar, status: bar.ok ? (Math.max(bar.lambdaP, bar.lambdaO) > 90 ? 'review' : 'ok') : 'fail', mensagens: bar.mensagens });
          continue;
        }
        const gr = geo.grades.find((x) => x.lado.id === g.id) as GradeLado;
        const els = an.paredes.info.filter((x) => x.ladoId === g.id && x.lance === lance.id);
        const z0 = zs[k], fs = (furos[g.i] ?? []).filter((f) => f.z0 >= z0 - 1e-6 && f.z1 <= zs[k + 1] + 1e-6);
        const elementos: (ElementoPano & { k: number })[] = els.map((x) => ({
          k: x.k, s: x.s, z: x.z - z0, area: x.area,
          forcas: comp.map((cs) => { const v = new Float64Array(8); for (const [arr, f] of cs) { const a = arr[x.k]; if (a) for (let q = 0; q < 8; q++) v[q] += f * a[q]; } return forcasDe(v); }),
        }));
        // panos: colunas entre as aberturas
        const intervalos = intervalosDosPanos(g.L, fs);
        const nPanos = intervalos.length;
        const colunasGrade = gr.S, linhasGrade = gr.Z.slice(gr.nivel[k], gr.nivel[k + 1] + 1).map((z) => z - z0);
        intervalos.forEach(([a, z], ip) => {
          const dentro0 = elementos.filter((x) => x.s >= a && x.s < z);
          if (!dentro0.length) return;
          const dentro = [...dentro0, ...extrapolarBordas(dentro0, colunasGrade, H)];
          const bq = bloqueioDoPano(lista, g.i, lance.id, ip, nPanos);
          const colunas = ordena([a, ...colunasGrade.filter((s) => s > a + 1e-6 && s < z - 1e-6), z]);
          const entP = { nome: `${g.nome} ${lance.nome}`, t, le: op.paredeFlambagem * H, d1, mat, matH, conc, elementos: dentro, combos, colunas, linhas: linhasGrade, op, bloqueio: bq.bloqueio, simples: parede?.armar === false };
          const s = dimensionarPano(entP);
          { const elM = elDe(lance.nome); if (mem && elM) registrarPano(mem, { elemento: elM, lado: g.nome, lance: lance.nome, ip, panos: nPanos, s0: a, s1: z, H, e: entP, r: s, nExtra: dentro.length - dentro0.length, bloqueioIgnorado: !!bq.ignorado }); }
          const pano: ResultadoPano = { ...s, lado: g.i, nomeLado: g.nome, pavimento: lance.id, nomePav: lance.nome, pano: ip, panos: nPanos, s0: a, s1: z, z0: 0, z1: H };
          if (bq.ignorado) pano.mensagens.push('Armadura bloqueada desconsiderada: o número de panos do lado mudou.');
          r.panos.push(pano);
        });
        // aberturas deste lance e trecho
        for (const f of fs) {
          const ab = parede?.aberturas?.find((x) => x.id === f.id);
          if (!ab) continue;
          const col = (lo: number, hi: number, topo: boolean) => faixa(elementos, f, lo, hi, topo, comp.length, linhasGrade[0], gr);
          const hV = H - (f.z1 - z0), hP = f.z0 - z0;
          const viz = r.panos.filter((p) => p.lado === g.i && p.pavimento === lance.id && (Math.abs(p.s1 - f.s0) < 1e-3 || Math.abs(p.s0 - f.s1) < 1e-3));
          const asViz = viz.length ? Math.max(...viz.map((p) => p.asVert)) : 0;
          const entA: EntradaAbertura = {
            a: ab, nomePav: lance.nome, lado: g.i, lance: lance.id, t, conc, fyd: aV.fyd, fywk: aH.fyk, gammaS: gamas(b).s, cobrimento: cob, hVerga: Math.max(hV, 0.05), hPeitoril: Math.max(hP, 0.05),
            verga: col(f.z1 - z0, H, true), peitoril: col(0, f.z0 - z0, false), asVertVizinho: asViz,
            ...(ab.armadura ? { bloqueada: ab.armadura } : {}), ...(b.aberturasPadrao?.[ab.tipo] ? { padrao: b.aberturasPadrao[ab.tipo] } : {}), canto: !!op.paredeAberturaCanto,
          };
          const resA = dimensionarAbertura(entA);
          r.aberturas.push(resA);
          { const elM = elDe(lance.nome); if (mem && elM) registrarAbertura(mem, { elemento: elM, lado: g.nome, lance: lance.nome, e: entA, r: resA }); }
        }
        // verificação global do lado à flexo-compressão oblíqua com a armadura adotada
        const panosLado = r.panos.filter((p) => p.lado === g.i && p.pavimento === lance.id);
        if (panosLado.length && es.length) {
          const vert = panosLado.filter((p) => p.vert).sort((x, y) => y.asVert - x.asVert)[0]?.vert ?? null;
          const ref = panosLado.find((p) => p.vert === vert) ?? panosLado[0];
          const refores = panosLado.flatMap((p) => p.reforcos.filter((q) => q.direcao === 'vertical').map((q) => ({ ...q, de: q.de, ate: q.ate })));
          // trecho existente no lance (recorte, E6d): seção de comprimento e1 − e0, reforços referidos a e0
          const [e0, e1] = g.ext(lance.id), Lc = e1 - e0, refL = e0 ? refores.map((q) => ({ ...q, de: q.de - e0, ate: q.ate - e0 })) : refores;
          const bars = barrasDoLado(Lc, t, d1, vert ? { ...vert, As: asMalha(vert.phi, vert.s) } : null, refL);
          const S = secaoDoLado(Lc, t, bars, conc, aV.fyd), v = verificarLado(S, es);
          { const elM = elDe(lance.nome); if (mem && elM) registrarLadoGlobal(mem, { elemento: elM, lado: g.nome, lance: lance.nome, Lc, t, S, es, util: v.util, combo: v.combo, vert: vert ? { phi: vert.phi, s: vert.s } : null, nReforcos: refL.length, nBarras: bars.length, As: bars.reduce((q, b2) => q + b2.A, 0) }); }
          r.lados.push({ lado: g.i, nome: g.nome, pavimento: lance.id, nomePav: lance.nome, modelo: 'casca', L: Lc, t, util: v.util, combo: v.combo, status: v.util <= 1.05 ? 'ok' : 'fail', mensagens: v.util > 1.05 ? [`Verificação global do lado: utilização ${fmt(v.util)} em ${v.combo} (armadura vertical adotada menor que a exigida pelas resultantes; a casca concentra a tração nas bordas).`] : [] });
          void ref;
        }
      }
    }
    r.status = [...r.panos, ...r.aberturas, ...r.lados].some((x) => x.status === 'fail') ? 'fail' : 'ok';
    out.push(r);
  }
  return out;
}

/** Integra a normal horizontal, o momento (em torno do meio da faixa) e o cortante no apoio da faixa acima ou abaixo da abertura. */
export function faixa(els: ElementoPano[], f: FuroTrecho, zlo: number, zhi: number, _topo: boolean, nCombos: number, _z0: number, gr: GradeLado): ForcasFaixa {
  const S = gr.S, cel = (s: number) => { let i = 0; while (i + 2 < S.length && s >= S[i + 1]) i++; return i; };
  const dentro = els.filter((e) => e.s > f.s0 && e.s < f.s1 && e.z >= zlo - 1e-9 && e.z <= zhi + 1e-9);
  const zc = (zlo + zhi) / 2;
  const sMeio = (f.s0 + f.s1) / 2, iMeio = cel(sMeio), iApoio = cel(f.s0 + 1e-6);
  const combos: ForcasFaixa['combos'] = [];
  for (let c = 0; c < nCombos; c++) {
    let N = 0, M = 0, V = 0;
    for (const e of dentro) {
      const i = cel(e.s), w = S[i + 1] - S[i];
      if (i === iMeio) { N += (e.forcas[c].nx * e.area) / w; M += (e.forcas[c].nx * (e.z - zc) * e.area) / w; }
      if (i === iApoio) V += (e.forcas[c].nxy * e.area) / w;
    }
    combos.push({ N, M: -M, V });
  }
  return { combos };
}

export type { FuroTrecho, LadoGeo };
