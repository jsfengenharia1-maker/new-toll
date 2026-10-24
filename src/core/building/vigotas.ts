// Lajes treliçadas (frente R6): resultados por vigota a partir da grelha (barras de laje na direção das vigotas),
// momentos mínimos, igualação de vigotas vizinhas, armadura positiva adicional ao banzo inferior da treliça,
// negativos na capa sobre os apoios, cortante na nervura sem armadura transversal (NBR 6118, 19.4.1, com os
// critérios de laje permitidos pela 13.2.4.2 para intereixo ≤ 65 cm), faixa maciçada necessária, armadura de
// distribuição da capa, verificação da capa (13.2.4.2) e resumo do aço e das treliças. A flecha continua por laje
// (dimensionamento.ts). Unidades: kN, m; áreas de aço em cm² nas saídas.
import { barArea, beamFlexure, type BeamSection, type Concrete } from '../concrete';
import type { P } from '../geom/faces';
import { areaPoligono } from '../geom/faces';
import type { AnaliseEdificio, GrelhaPavimento } from './analitico';
import { lbBasico } from './detalhamento';
import { lbNecessario, RHO_MIN_LAJE } from './detalhamentoLajes';
import type { ResultadoLaje } from './dimensionamento';
import { vaos } from './lajes';
import { esforcosDoGrupo, minimosDaFaixa, pontasContinuas, posicionarVigotas, redistribuirNegativos, tipoDeVao, type DiagramaVigota, type MinimosFaixa, type VigotaPosicionada } from './vigotasEsforcos';
import type { FlechaAlinhamento } from './dimensionamento';
import { ehNervurada, geometriaNervurada, modelosTrelicadas, trelicasDe, type FamiliaVigota, type FonteLajes } from './tiposLaje';
import { conversaoDaLaje, gruposEmCadeia, igualarPorArea, type ConversaoArea } from './vigotasArea';
import { mensagemMontagem, montagemDaLaje } from './vigotasMontagem';
import { memoriaAtiva } from '../memoria/registrador';
import { registrarAcoNervurada } from '../memoria/nervurada';
import { registrarGrupoVigotas, registrarVigotasBase, registrarVigotasLaje, type CtxVigCortante, type CtxVigNegativo } from '../memoria/vigotas';
import { acoDe, cobrimentoLaje, concretoDe, gamas } from './materiais';
import type { OpcoesCalculo } from './opcoes';
import { casosDaObra, pavimentosDoGrupo, type BuildingModel, type Laje, type TipoVao } from './types';

/**
 * Treliças eletrossoldadas (designação TR h·φsup·φdiag·φinf, NBR 14862): altura (m) e bitolas (mm) dos banzos
 * superior e inferior (2 barras) e das diagonais, em CA-60 [a confirmar com o fabricante].
 */
export const TRELICAS: Record<string, { h: number; sup: number; diag: number; inf: number }> = trelicasDe();
/** Treliça usada em cada modelo do catálogo das lajes [a confirmar]. */
export const TRELICA_DO_MODELO: Record<string, string> = Object.fromEntries(Object.entries(modelosTrelicadas()).map(([k, m]) => [k, m.trelica]));

const ACO_KG_M3 = 7850;
/**
 * Peso por metro da treliça (kg/m) pela geometria: banzo superior, 2 inferiores e 2 sinusoides de diagonais com passo
 * de 20 cm e meia base de 4 cm (comprimento da diagonal √(0,1² + h² + 0,04²) a cada 10 cm) [a confirmar no catálogo].
 */
export function pesoTrelica(nome: string, f?: FonteLajes): number {
  const t = trelicasDe(f)[nome];
  if (!t) return 0;
  const diag = 10 * Math.hypot(0.1, t.h, 0.04);
  return ACO_KG_M3 * (barArea(t.sup) + 2 * barArea(t.inf) + 2 * diag * barArea(t.diag));
}

/** Combinações de barras adicionais por nervura (1 ou 2 barras φ6,3 a φ12,5), em ordem crescente de área. */
export const ADICIONAIS: { n: number; phi: number; As: number }[] = [6.3, 8, 10, 12.5]
  .flatMap((phi) => [1, 2].map((n) => ({ n, phi, As: n * barArea(phi) * 1e4 })))
  .sort((a, z) => a.As - z.As || a.n - z.n);

/** Menor combinação de barras (cm²) que cobre As (cm²); null se nenhuma cobre; { n: 0 } se não precisa. */
export function escolherAdicional(AsCm2: number): { n: number; phi: number; As: number } | null {
  if (AsCm2 <= 1e-9) return { n: 0, phi: 0, As: 0 };
  return ADICIONAIS.find((x) => x.As >= AsCm2 - 1e-9) ?? null;
}

/**
 * Cortante resistente sem armadura transversal (NBR 6118, 19.4.1), kN: VRd1 = τRd·k·(1,2 + 40ρ1)·bw·d, com
 * τRd = 0,25·fctd, k = |1,6 − d| ≥ 1 (banzo da treliça chega ao apoio) e ρ1 = As1/(bw·d) ≤ 0,02; sem protensão.
 */
export function vrd1(c: Concrete, bw: number, d: number, As1: number): number {
  const rho = Math.min(0.02, As1 / (bw * d)), k = Math.max(1, 1.6 - d);
  return 0.25 * c.fctd * k * (1.2 + 40 * rho) * bw * d * 1000;
}
/** Compressão diagonal em elementos sem armadura transversal (NBR 6118, 19.4.1): VRd2 = 0,5·αv1·fcd·bw·0,9d (kN). */
export function vrd2(c: Concrete, bw: number, d: number): number {
  const av1 = Math.min(0.5, 0.7 - c.fck / 200);
  return 0.5 * av1 * c.fcd * bw * 0.9 * d * 1000;
}
/** Momento limite (kN·m) da seção retangular sem armadura de compressão (x = xlim). */
export function momentoLimite(c: Concrete, bw: number, d: number): number {
  const y = c.lambda * c.xLimRatio * d;
  return c.sigmaCd * bw * y * (d - y / 2) * 1000;
}

/**
 * Grupos de igualação entre vigotas vizinhas (na ordem dada): o grupo cresce enquanto (Mmáx − Mmín) < dif·Mmáx;
 * critério 0 = sem igualação (cada vigota sozinha).
 */
export function gruposIgualacao(mPos: number[], difPct: number, criterio: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < mPos.length; i++) {
    const g = out.at(-1);
    if (g && criterio > 0) {
      const vs = [...g, i].map((k) => mPos[k]), mx = Math.max(...vs), mn = Math.min(...vs);
      if (mx <= 1e-9 || mx - mn < (difPct / 100) * mx - 1e-12) { g.push(i); continue; }
    }
    out.push([i]);
  }
  return out;
}
/** Valor igualado do grupo: pelo máximo (critério 1; nos negativos, o mais negativo) ou pela média (2). */
export function igualar(vs: number[], criterio: number, negativo = false): number {
  if (!vs.length) return 0;
  if (criterio === 2) return vs.reduce((a, c) => a + c, 0) / vs.length;
  return negativo ? Math.min(...vs) : Math.max(...vs);
}

/** Esforços de cálculo por nervura (kN·m, kN): positivo, negativo nas pontas (≤ 0) e cortante nas pontas. */
export interface EsforcosVigota { mPos: number; mNeg: [number, number]; v: [number, number] }

/** Alinhamento de vigotas: uma linha da malha da grelha na direção das vigotas, que representa `nervuras` vigotas. */
export interface FaixaVigota {
  /** Posição transversal (m, ao longo da perpendicular às vigotas) e largura representada (m). */
  t: number; largura: number; nervuras: number;
  /** Pontas (início no lado −direção das vigotas) e comprimento (m). */
  a: P; z: P; L: number;
  /** Envoltória ELU por nervura nos nós: abscissa (m), momento máx. e mín. (kN·m) e |cortante| (kN). */
  s: number[]; Mmax: number[]; Mmin: number[]; V: number[];
  /** Esforços da análise (antes dos mínimos e da igualação). */
  calc: EsforcosVigota;
  /** Índice do grupo de igualação. */
  grupo: number;
}

/** Parcela de armadura (n barras de φ mm, área em cm²) com comprimento (m) e percentual do comprimento da vigota. */
export interface ParcelaVigota { n: number; phi: number; As: number; comprimento: number; percentual: number; tipo: 'total' | 'curta' | 'longa' | 'parcial' }

export interface NegativoVigota {
  /** Duas parcelas de comprimentos calculados (E3b, C7.32), momento de fissuração e rigidezes da ficha, Mu da seção maciça e a origem do limite. */
  parcelas?: ParcelaVigota[]; MuMacico?: number; Mfis?: number; EI?: number; EIfis?: number; fonteLimite?: 'ficha' | 'calculado';
  /** As necessária por nervura (cm²), barras por nervura e comprimento a partir do eixo do apoio para dentro da laje (m). */
  AsNec: number; barras: { n: number; phi: number; As: number } | null; comprimento: number;
  /** Ponto de momento nulo a partir da ponta (m), decalagem e ancoragem (m). */
  x0: number; al: number; lb: number;
  /** Momento resistente sem maciçamento (kN·m por nervura) e faixa maciçada necessária pela flexão (m). */
  MRdNervura: number; macico: number;
}
export interface CortanteVigota { Vsd: number; VRd1: number; VRd2: number; macico: number; fonte?: 'ficha' | 'calculado'; estribo?: { phi: number; s: number; zona: number; barras: number } }

export interface GrupoVigotas {
  /** Índices das faixas, número de vigotas e comprimento médio (m). */
  faixas: number[]; vigotas: number; L: number;
  /** Esforços de cálculo por nervura (após mínimos e igualação) e por metro de largura. */
  esforcos: EsforcosVigota; porMetro: EsforcosVigota;
  /** Diagrama igualado do grupo, ponto a ponto na discretização de 0,25 m (E3b). */
  diagrama?: DiagramaVigota;
  /** Vigotas do grupo (índices da numeração do pano) e, nas unidades à parte, o motivo: editada, dupla, tripla ou esforços manuais (E3b). */
  indices?: number[]; especial?: 'editada' | 'dupla' | 'tripla' | 'manual';
  /** Tipo da série escolhido (nome do tipo) e série (E3b: armadas, protendidas e genéricas). */
  tipo?: string; serie?: string; tipoAtribuido?: boolean;
  /** Dados da verificação pela ficha (E3b). */
  ficha?: DadosFichaGrupo;
  /** Tipo de vão da vigota (pano) e redistribuição aplicada. */
  tipoVao?: TipoVao; redistribuicao?: { delta: number; aplicada: boolean };
  positiva: {
    /** As necessária total, a do banzo inferior da treliça (equivalente no aço da adicional) e a adicional (cm² por nervura). */
    AsNec: number; AsTrelica: number; AsAdicional: number;
    barras: { n: number; phi: number; As: number } | null; comprimento: number; duplaNecessaria: boolean;
  };
  /** Negativos nas pontas (início, fim); null sem momento negativo. */
  negativos: [NegativoVigota | null, NegativoVigota | null];
  cortante: [CortanteVigota, CortanteVigota];
  /** Faixa maciçada necessária em cada ponta (m; flexão negativa ou cortante). */
  macico: [number, number];
}

/** Verificação do grupo contra a ficha: momento positivo e aproveitamento, parcelas da armadura, serviço das protendidas. */
export interface DadosFichaGrupo {
  familia: FamiliaVigota; origem: string;
  positivo: { Md: number; Mu: number; MuTotal: number; Mfis?: number; EI?: number; EIfis?: number; aprov: number; fonte: 'ficha' | 'calculado' };
  parcelas: ParcelaVigota[];
  servico?: { nivel: 'parcial' | 'limitada' | 'completa'; combinacao: 'frequente' | 'rara'; Mserv: number; Madm: number | null; Mdesc: number; ok: boolean };
  moldada?: { bars: { n: number; phi: number; As: number }; AsNec: number; estribo: { phi: number; s: number } | null; larguraMin: number; bw: number };
}

export interface PosicaoVigota {
  tipo: 'adicional' | 'negativa' | 'distribuicao' | 'inferior' | 'superior' | 'transversal'; aco: string; phi: number; n: number; comprimento: number;
  /** Parcial: percentual do comprimento da vigota (E3b; mostrado sempre em percentual nas telas e desenhos). */
  percentual?: number;
}

export interface ResultadoVigotas {
  laje: string; nome: string; grupo: string; pavimentos: string[]; repeticoes: number;
  modelo: string; trelica: string; banzoInf: { n: number; phi: number; As: number };
  intereixo: number; bw: number; capa: number; h: number; d: { inf: number; sup: number };
  /** Vigotas na laje e comprimento total delas (m, por pavimento). */
  vigotas: number; comprimentoVigotas: number;
  faixas: FaixaVigota[]; grupos: GrupoVigotas[];
  distribuicao: { AsNec: number; aco: string; phi: number; s: number };
  verificacaoCapa: { minima: number; ok: boolean };
  bloqueada: boolean;
  posicoes: PosicaoVigota[];
  /** Aço das barras (kg, por pavimento, sem perdas) e da treliça (kg). */
  peso: number; pesoTrelica: number;
  status: 'ok' | 'fail'; mensagens: string[];
  /** Vigota a vigota (E3b): cada vigota real do pano com o alinhamento, o grupo, os esforços e a situação. */
  lista?: VigotaIndividual[];
  /** Família e ficha (E3b); ausentes nas treliçadas do catálogo interno. */
  familia?: FamiliaVigota; ficha?: string; fichaNome?: string; serie?: string;
  /** Protensão (E3b): classe de agressividade do pano, nível pela Tabela 13.4 e combinação de serviço. */
  /** Flecha de montagem da vigota sobre escoras (E5e, C7.102), quando a verificação está ligada. */
  montagem?: import('./vigotasMontagem').VerificacaoMontagem;
  protensao?: { caa: 'I' | 'II' | 'III' | 'IV'; nivel: 'parcial' | 'limitada' | 'completa'; combinacao: 'frequente' | 'rara' };
}

/** Uma vigota real da laje (numeração a partir da borda do ponto de inserção). */
export interface VigotaIndividual {
  indice: number; t: number; faixa: number; grupo: number; L: number; a: P; z: P;
  /** 1 = simples, 2 = dupla, 3 = tripla (as vigotas ao lado foram apagadas). */
  multipla: 1 | 2 | 3;
  tipoVao: TipoVao;
  /** Esforços de cálculo da vigota (por nervura, após mínimos e igualação) e cortantes das pontas por metro de largura (K1.12.5-11). */
  esforcos: EsforcosVigota; cortantePorMetro: [number, number];
  /** Tipo da série e armadura resumida (E3b). */
  tipo?: string; armadura?: string; editada: boolean;
  /** Carga linear do peso próprio da vigota (kN/m): peso por m² × intereixo; no conjunto, o peso das vigotas duplas ou triplas (K1.5.5). */
  pesoLinear: number;
  status: 'ok' | 'fail'; mensagens: string[];
  flecha?: FlechaAlinhamento;
}

export const fmt = (x: number, n = 2) => x.toFixed(n).replace('.', ',');
export const fphi = (phi: number) => String(phi).replace('.', ',');
export const r3 = (x: number) => +x.toFixed(3);
const sub = (a: P, z: P): P => [a[0] - z[0], a[1] - z[1]];
export const dot = (a: P, z: P) => a[0] * z[0] + a[1] * z[1];

export type Bruta = Omit<FaixaVigota, 'calc' | 'grupo' | 'nervuras'>;

/** Alinhamentos da laje numa grelha, com a envoltória por nervura da combinação de fatores `fat` (por caso). */
export function faixasDaGrelha(g: GrelhaPavimento, l: Laje, fat: number[], u: P, intereixo: number): Bruta[] {
  const m = g.modelo, res = g.res!;
  const adj = new Map<number, { no: number; bar: number }[]>();
  m.barras.forEach((br, i) => {
    const tg = g.barras[i];
    if (tg.tipo !== 'laje' || tg.ref !== l.id || tg.dir !== 0 || !tg.largura) return;
    adj.set(br.i, [...(adj.get(br.i) ?? []), { no: br.j, bar: i }]);
    adj.set(br.j, [...(adj.get(br.j) ?? []), { no: br.i, bar: i }]);
  });
  const v: P = [-u[1], u[0]], pt = (n: number): P => [m.nos[n][0], m.nos[n][1]];
  const visto = new Set<number>(), out: Bruta[] = [];
  const soma = (bi: number, k: number, sinal: number) => fat.reduce((t, f, ic) => t + f * sinal * res.esforcos[ic][bi][k], 0);
  for (const [ini, vz] of adj) {
    if (vz.length !== 1 || visto.has(ini)) continue;
    let nos = [ini], bars: number[] = [];
    visto.add(ini);
    for (;;) { const prox = adj.get(nos.at(-1)!)!.find((x) => !visto.has(x.no)); if (!prox) break; nos.push(prox.no); bars.push(prox.bar); visto.add(prox.no); }
    if (bars.length < 1) continue;
    if (dot(sub(pt(nos.at(-1)!), pt(nos[0])), u) < 0) { nos = nos.reverse(); bars = bars.reverse(); }
    const largura = g.barras[bars[0]].largura!, k = intereixo / largura;
    const s = [0], Mmax: number[] = [], Mmin: number[] = [], V: number[] = [];
    // valores em cada ponta de barra, no sentido do alinhamento
    const ini0: { M: number; V: number }[] = [], fim0: { M: number; V: number }[] = [];
    bars.forEach((bi, j) => {
      const br = m.barras[bi], frente = br.i === nos[j];
      const Mi = soma(bi, 5, -1), Mj = soma(bi, 11, 1), Vi = Math.abs(soma(bi, 1, -1)), Vj = Math.abs(soma(bi, 7, 1));
      ini0.push(frente ? { M: Mi, V: Vi } : { M: Mj, V: Vj });
      fim0.push(frente ? { M: Mj, V: Vj } : { M: Mi, V: Vi });
      s.push(s[j] + Math.hypot(...sub(pt(nos[j + 1]), pt(nos[j]))));
    });
    for (let n = 0; n < nos.length; n++) {
      const cand = [n > 0 ? fim0[n - 1] : null, n < bars.length ? ini0[n] : null].filter((x): x is { M: number; V: number } => !!x);
      Mmax.push(Math.max(...cand.map((x) => x.M)) * k); Mmin.push(Math.min(...cand.map((x) => x.M)) * k); V.push(Math.max(...cand.map((x) => x.V)) * k);
    }
    const a = pt(nos[0]), z = pt(nos.at(-1)!);
    out.push({ t: dot([(a[0] + z[0]) / 2, (a[1] + z[1]) / 2], v), largura, a, z, L: s.at(-1)!, s, Mmax, Mmin, V });
  }
  return out;
}

/** Distância a partir da ponta (0 = início, 1 = fim) até onde f(i) deixa de ser verdadeiro (interpolação linear em `val`). */
export function alcance(s: number[], val: number[], lim: number, ponta: 0 | 1): number {
  const n = s.length, idx = ponta === 0 ? [...Array(n).keys()] : [...Array(n).keys()].reverse();
  const dist = (i: number) => (ponta === 0 ? s[i] : s[n - 1] - s[i]);
  if (val[idx[0]] <= lim) return 0;
  for (let q = 1; q < n; q++) {
    const i = idx[q], p = idx[q - 1];
    if (val[i] <= lim) return dist(p) + ((val[p] - lim) / (val[p] - val[i])) * (dist(i) - dist(p));
  }
  return s[n - 1];
}

export const arred = (x: number, cm: number) => Math.ceil(x / (cm / 100) - 1e-9) * (cm / 100);

/** Alinhamentos da laje (envoltória dos pavimentos do grupo), mínimos por tipo de vão e grupos de igualação, comuns a todas as famílias. */
/** δ mínimo da redistribuição (NBR 6118, 14.6.4.3): 0,75 em nós fixos e 0,90 em nós móveis (γz > 1,1). */
export const deltaMinVigotas = (an: AnaliseEdificio): number => ((an.vento?.gamaZ.length ? Math.max(...an.vento.gamaZ.map((g) => g.max)) : 0) > 1.1 ? 0.9 : 0.75);

export interface PreparoVigotas {
  u: P; nomesPav: string[]; faixas: FaixaVigota[]; mins: MinimosFaixa[]; idxGr: number[][]; avisos: string[];
}
export function prepararVigotas(b: BuildingModel, an: AnaliseEdificio, l: Laje, intereixo: number, op: OpcoesCalculo, conv?: ConversaoArea): PreparoVigotas | null {
  const gm = gamas(b), obra = casosDaObra(b), nat = an.casos.map((id) => obra.find((x) => x.id === id)?.natureza ?? 'G');
  const fELU = nat.map((n) => (n === 'G' ? gm.g : n === 'H' ? gm.h : n === 'Q' ? gm.q : 0));
  const ang = ((l.direcao ?? 0) * Math.PI) / 180, u: P = [Math.cos(ang), Math.sin(ang)];
  // envoltória dos pavimentos do grupo (alinhamentos casados pela posição)
  const pavs = pavimentosDoGrupo(b, l.grupo), nomesPav: string[] = [];
  const brutas = new Map<string, Bruta>();
  for (const g of an.grelhas) {
    if (!g.res || !pavs.some((p) => p.id === g.pavimento)) continue;
    nomesPav.push(b.pavimentos.find((p) => p.id === g.pavimento)?.nome ?? g.pavimento);
    for (const f of faixasDaGrelha(g, l, fELU, u, intereixo)) {
      const key = `${Math.round(f.t * 1000)}|${Math.round(dot(f.a, u) * 100)}`, e = brutas.get(key);
      if (!e) { brutas.set(key, f); continue; }
      if (e.s.length === f.s.length) for (let i = 0; i < f.s.length; i++) { e.Mmax[i] = Math.max(e.Mmax[i], f.Mmax[i]); e.Mmin[i] = Math.min(e.Mmin[i], f.Mmin[i]); e.V[i] = Math.max(e.V[i], f.V[i]); }
      else if (Math.max(...f.Mmax) > Math.max(...e.Mmax)) brutas.set(key, f);
    }
  }
  if (!brutas.size) return null;
  const ordem = [...brutas.values()].sort((x, z) => x.t - z.t), avisos: string[] = [];
  // esforços da análise e mínimos (p = (V1 + V2)/ℓ, por nervura; divisor por tipo de vão, E3b)
  const faixas: FaixaVigota[] = ordem.map((f) => {
    const n = f.s.length - 1, calc: EsforcosVigota = { mPos: Math.max(0, ...f.Mmax), mNeg: [Math.min(0, f.Mmin[0]), Math.min(0, f.Mmin[n])], v: [f.V[0], f.V[n]] };
    return { ...f, nervuras: f.largura / intereixo, calc, grupo: 0, s: f.s.map(r3), Mmax: f.Mmax.map(r3), Mmin: f.Mmin.map(r3), V: f.V.map(r3), a: [r3(f.a[0]), r3(f.a[1])], z: [r3(f.z[0]), r3(f.z[1])] };
  });
  const mins = faixas.map((f) => minimosDaFaixa(f, op, l));
  // tração inferior nas pontas (momento positivo no apoio)
  if (faixas.some((f) => [f.Mmax[0], f.Mmax.at(-1)!].some((M) => M > Math.max(0.1, 0.05 * f.calc.mPos))))
    avisos.push('Vigotas: tração inferior junto ao apoio (momento positivo na ponta da vigota); reveja o engaste das bordas ou a continuidade da armadura inferior.');
  // E5e (C7.100): com a igualação pela área, a diferença é medida entre as áreas de aço das vizinhas, em cadeia
  const idxGr = conv ? gruposEmCadeia(mins.map((m) => conv.pos.areaDe(m.esforcos.mPos)), op.vigotaIgualacaoDif, op.vigotaIgualacao) : gruposIgualacao(mins.map((m) => m.esforcos.mPos), op.vigotaIgualacaoDif, op.vigotaIgualacao);
  return { u, nomesPav, faixas, mins, idxGr, avisos };
}

/** Vigotas reais da laje com o alinhamento, o grupo e os esforços de cada uma (a unidade à parte, se houver, vale para as suas vigotas). */
export function listaDeVigotas(pos: VigotaPosicionada[], faixas: FaixaVigota[], grupos: GrupoVigotas[], l: Pick<Laje, 'vigotasBiapoiadas'> | undefined, pesoLinear: (multipla: 1 | 2 | 3) => number): VigotaIndividual[] {
  return pos.map((p) => {
    const f = faixas[p.faixa], gi = Math.max(0, grupos.findIndex((g) => g.indices?.includes(p.indice))), gi2 = gi >= 0 && grupos[gi]?.indices?.includes(p.indice) ? gi : grupos.findIndex((g) => g.faixas.includes(p.faixa) && !g.especial);
    const g = grupos[gi2 >= 0 ? gi2 : 0];
    return {
      indice: p.indice, t: r3(p.t), faixa: p.faixa, grupo: gi2 >= 0 ? gi2 : 0, L: g?.L ?? r3(f.L), a: f.a, z: f.z, multipla: p.multipla, tipoVao: tipoDeVao(f, l),
      esforcos: g?.esforcos ?? f.calc, cortantePorMetro: [(g?.porMetro.v[0] ?? 0), (g?.porMetro.v[1] ?? 0)], ...(g?.tipo ? { tipo: g.tipo } : {}), editada: g?.especial === 'editada' || g?.especial === 'manual',
      status: 'ok' as const, mensagens: [], pesoLinear: +pesoLinear(p.multipla).toFixed(4),
    };
  });
}

/**
 * Resultados das vigotas das lajes treliçadas. Acrescenta as mensagens (erros, avisos e o resumo "Treliçada: …")
 * aos resultados da laje em `lajes` e marca 'fail' quando há erro.
 */
export function dimensionarVigotas(b: BuildingModel, an: AnaliseEdificio, lajes: ResultadoLaje[], op: OpcoesCalculo): ResultadoVigotas[] {
  const c = concretoDe(b, 'laje'), gm = gamas(b), aI = acoDe(b, 'lajeInf'), aS = acoDe(b, 'lajeSup'), fyd60 = 600 / gm.s;
  const out: ResultadoVigotas[] = [];
  const msgsLaje = (id: string, msgs: string[], erro: boolean) => {
    for (const r of lajes.filter((x) => x.laje === id)) { r.mensagens.push(...msgs); if (erro) r.status = 'fail'; }
  };
  for (const l of b.lajes) {
    const g0 = ehNervurada(l.tipo) ? geometriaNervurada(b, l.tipo) : null;
    if (!g0 || (l.tipo.tipo !== 'trelicada' && g0.familia !== 'trelicada')) {
      if (l.armaduraVigotas && !g0) msgsLaje(l.id, ['Armadura bloqueada desconsiderada: a laje não é treliçada.'], false);
      // fichas armadas, protendidas e moldadas: vigotasFichas.ts (E3b)
      continue;
    }
    const trTab = trelicasDe(b), nomeTr = g0.trelica && trTab[g0.trelica] ? g0.trelica : 'TR 12645', tr = trTab[nomeTr] ?? TRELICAS[nomeTr];
    const modeloNome = l.tipo.tipo === 'trelicada' ? l.tipo.modelo : l.tipo.tipo === 'vigotas' ? l.tipo.serie : '';
    const { intereixo, bw, hEnch } = g0, capa = g0.capa, h = hEnch + capa;
    const conv = conversaoDaLaje(b, l, g0, op);
    const prep = prepararVigotas(b, an, l, intereixo, op, conv);
    if (!prep) continue;
    const { nomesPav, faixas, mins, idxGr, u } = prep, pavs = pavimentosDoGrupo(b, l.grupo);
    const erros: string[] = [], avisos: string[] = [...prep.avisos];
    if (l.edicaoVigotas?.length || l.vigotasMultiplas?.length) avisos.push('Vigotas: a edição por vigota (tipo, parciais, esforços atribuídos e vigotas duplas) vale para vigotas por ficha e moldadas; nas treliçadas use a armadura bloqueada (laje.armaduraVigotas).');
    // capa (NBR 6118, 13.2.4.2): hf ≥ máx(4 cm; ℓ0/15)
    const capaMin = Math.max(0.04, (intereixo - bw) / 15), capaOk = capa >= capaMin - 1e-9;
    if (!capaOk) erros.push(`Vigotas: capa de ${fmt(capa * 100, 1)} cm abaixo do mínimo de ${fmt(capaMin * 100, 1)} cm (NBR 6118, 13.2.4.2: 4 cm e 1/15 da distância entre nervuras).`);
    const cob = cobrimentoLaje(b, l.cobrimento), dI = h - cob.inf - 0.005, dS = h - cob.sup - 0.005;
    const AcT = intereixo * capa + bw * hEnch, AsMin = RHO_MIN_LAJE * AcT * 1e4; // cm² por nervura
    const AsBanzo = 2 * barArea(tr.inf) * 1e4, AsTrel = AsBanzo * (fyd60 / aI.fyd);
    const tee: BeamSection = { kind: 'tee', bw, h, bf: intereixo, hf: capa };
    const trava = l.armaduraVigotas;
    const lbS = (phi: number) => lbBasico(phi, c, aS.fyd, h - cob.sup <= 0.3 + 1e-9, aS.aco === 'CA-60');
    const B = vaos(l)[1], nTotal = Math.max(1, Math.round(B / intereixo)), larguraTotal = faixas.reduce((t, f) => t + f.largura, 0);
    let restante = nTotal;
    // memória detalhada (MD3): um elemento por laje treliçada
    const memV = memoriaAtiva(), elV = `Laje ${l.nome}`, regV = memV?.aceita(elV) ? memV : null;
    if (regV) {
      const obra = casosDaObra(b);
      const elu = an.casos.map((caso) => { const n = obra.find((x) => x.id === caso)?.natureza ?? 'G'; return { caso, f: n === 'G' ? gm.g : n === 'H' ? gm.h : n === 'Q' ? gm.q : 0 }; }).filter((q) => q.f !== 0);
      registrarVigotasBase(regV, elV, { nome: l.nome, pavimentos: nomesPav.join(', '), modelo: modeloNome, trelica: nomeTr, phiBanzo: tr.inf, AsBanzo, fyd60, AsTrel, intereixo, bw, capa, hEnch, h, pp: g0.pp, nVigotas: nTotal, nGrupos: idxGr.length, capaMin, rhoMin: RHO_MIN_LAJE, AsMin, c, fydInf: aI.fyd, fydSup: aS.fyd, acoInf: aI.aco, acoSup: aS.aco, gs: gm.s, cobInf: cob.inf, cobSup: cob.sup, dI, dS, elu, bloqueada: !!trava });
    }
    const grupos: GrupoVigotas[] = idxGr.map((ids, gi) => {
      for (const i of ids) faixas[i].grupo = gi;
      const lg = ids.reduce((t, i) => t + faixas[i].largura, 0), L = ids.reduce((t, i) => t + faixas[i].L * faixas[i].largura, 0) / lg;
      const nv = gi === idxGr.length - 1 ? restante : Math.min(restante, Math.round((nTotal * lg) / larguraTotal));
      restante -= nv;
      const crit = op.vigotaIgualacao;
      const eg = esforcosDoGrupo(ids, faixas, mins, crit, !!op.vigotaIgualacaoPonto && !conv, conv ? igualarPorArea(conv) : igualar);
      const continuas = ids.map((i) => pontasContinuas(faixas[i]));
      const red = op.vigotaRedistribuir ? redistribuirNegativos(eg.esforcos, [continuas.some((c) => c[0]), continuas.some((c) => c[1])], op.redistribuicao, deltaMinVigotas(an)) : null;
      const esf: EsforcosVigota = red?.esforcos ?? eg.esforcos;
      if (red?.aplicada) avisos.push(`Vigotas: redistribuição dos negativos (grupo ${gi + 1}): δ = ${fmt(red.delta)} (NBR 6118, 14.6.4.3; positivo aumentado de ${fmt(esf.mPos - eg.esforcos.mPos)} kN·m por nervura).`);
      // positiva: seção T (mesa comprimida), As total ≥ ρmín·Ac; banzo inferior da treliça (CA-60) descontado
      const fl = beamFlexure(tee, true, esf.mPos, dI, 0.03, c, aI.fyd);
      const AsNec = Math.max(fl.As * 1e4, esf.mPos > 0 ? AsMin : 0), AsAd = Math.max(0, AsNec - AsTrel);
      let barras = escolherAdicional(AsAd);
      if (trava) {
        const As = trava.inf.n * barArea(trava.inf.phi) * 1e4;
        if (As + AsTrel < AsNec - 1e-6) erros.push(`Armadura bloqueada insuficiente: positiva das vigotas ${trava.inf.n ? `${trava.inf.n}φ${fphi(trava.inf.phi)}` : 'sem adicional'} + treliça < ${fmt(AsNec)} cm² por nervura (grupo ${gi + 1}).`);
        barras = trava.inf.n ? { n: trava.inf.n, phi: trava.inf.phi, As } : { n: 0, phi: 0, As: 0 };
      }
      if (fl.double) erros.push(`Vigotas: altura insuficiente para a flexão positiva (Md = ${fmt(esf.mPos)} kN·m por nervura exige armadura de compressão); aumente a altura da laje.`);
      else if (!barras) erros.push(`Vigotas: momento positivo ${fmt(esf.mPos)} kN·m por nervura acima do resistente com a treliça ${nomeTr} + 2φ12,5 adicionais (As necessária ${fmt(AsNec)} cm²); aumente a altura da laje.`);
      // negativos e cortante por ponta
      const detNeg: (CtxVigNegativo | null)[] = [null, null], detCort: CtxVigCortante[] = [];
      const negativos = [0, 1].map((k): NegativoVigota | null => {
        const M = -esf.mNeg[k];
        if (M < 0.01) return null;
        const MRdN = momentoLimite(c, bw, dS), MRdM = momentoLimite(c, intereixo, dS);
        let macico = 0;
        if (M > MRdN) {
          macico = Math.max(...ids.map((i) => alcance(faixas[i].s, faixas[i].Mmin.map((x) => -x), MRdN, k as 0 | 1)));
          if (M > MRdM) erros.push(`Vigotas: momento negativo ${fmt(M)} kN·m por nervura acima do resistente mesmo com a faixa maciçada (${fmt(MRdM)} kN·m); exige laje mais alta.`);
          else erros.push(`Vigotas: momento negativo ${fmt(M)} kN·m por nervura acima do resistente da nervura (${fmt(MRdN)} kN·m): maciçar ${fmt(Math.max(macico, 0.01) * 100, 0)} cm junto ao apoio (${k ? 'fim' : 'início'}).`);
        }
        const fn = beamFlexure({ kind: 'rect', bw: M > MRdN ? intereixo : bw, h }, false, M, dS, 0.03, c, aS.fyd);
        const AsN = Math.max(fn.As * 1e4, AsMin);
        let br = escolherAdicional(AsN);
        if (trava?.sup) {
          const As = trava.sup.n * barArea(trava.sup.phi) * 1e4;
          if (As < AsN - 1e-6) erros.push(`Armadura bloqueada insuficiente: negativa das vigotas ${trava.sup.n}φ${fphi(trava.sup.phi)} < ${fmt(AsN)} cm² por nervura (grupo ${gi + 1}, ${k ? 'fim' : 'início'}).`);
          br = { n: trava.sup.n, phi: trava.sup.phi, As };
        }
        if (!br) erros.push(`Vigotas: armadura negativa excessiva no apoio (${fmt(AsN)} cm² por nervura > 2φ12,5); aumente a altura da laje.`);
        const x0 = Math.max(...ids.map((i) => { const f = faixas[i]; return alcance(f.s, f.Mmin.map((x) => -x), 0, k as 0 | 1); }));
        const phi = br?.phi || 12.5, al = op.lajeDecalagem * dS, lb = lbNecessario(lbS(phi), phi, AsN, br?.As || AsN);
        const comprimento = Math.min(L, arred(Math.max((op.vigotaNegativoVao / 100) * L, x0 + al + lb), op.arredondamento));
        if (regV) detNeg[k] = { M, MRdN, MRdM, macico, bwEf: M > MRdN ? intereixo : bw, fn: { As: fn.As, double: fn.double }, AsN, br, trava: trava?.sup ? { n: trava.sup.n, phi: trava.sup.phi } : null, x0, al, lb, lbBase: lbS(phi), comprimento, L, vao: L, arred: op.arredondamento, decalagem: op.lajeDecalagem, pctVao: op.vigotaNegativoVao / 100 };
        return { AsNec: AsN, barras: br, comprimento, x0: r3(x0), al: r3(al), lb: r3(lb), MRdNervura: MRdN, macico: r3(macico) };
      }) as [NegativoVigota | null, NegativoVigota | null];
      const cortante = [0, 1].map((k): CortanteVigota => {
        const neg = negativos[k], dd = neg ? dS : dI;
        const As1 = (neg ? neg.barras?.As || neg.AsNec : AsBanzo) / 1e4;
        const V1 = vrd1(c, bw, dd, As1), V2 = vrd2(c, bw, dd), Vsd = esf.v[k];
        let macico = 0;
        if (Vsd > Math.min(V1, V2)) {
          macico = Math.max(...ids.map((i) => alcance(faixas[i].s, faixas[i].V, Math.min(V1, V2), k as 0 | 1)));
          const V1m = vrd1(c, intereixo, dd, As1), V2m = vrd2(c, intereixo, dd);
          if (Vsd > Math.min(V1m, V2m)) erros.push(`Vigotas: cortante ${fmt(Vsd)} kN por nervura acima do resistente mesmo com a faixa maciçada (${fmt(Math.min(V1m, V2m))} kN); exige armadura transversal ou laje mais alta.`);
          else erros.push(`Vigotas: cortante ${fmt(Vsd)} kN por nervura acima de VRd1 = ${fmt(V1)} kN (NBR 6118, 19.4.1): maciçar ${fmt(Math.max(macico, 0.01) * 100, 0)} cm junto ao apoio (${k ? 'fim' : 'início'}).`);
        }
        if (regV) detCort[k] = { Vsd, V1, V2, macico, As1, d: dd, V1m: vrd1(c, intereixo, dd, As1), V2m: vrd2(c, intereixo, dd) };
        return { Vsd, VRd1: V1, VRd2: V2, macico: r3(macico) };
      }) as [CortanteVigota, CortanteVigota];
      const macico = [0, 1].map((k) => Math.max(negativos[k]?.macico ?? 0, cortante[k].macico)) as [number, number];
      for (const [k, mc] of macico.entries()) {
        if (mc > 2 * h) avisos.push(`Vigotas: maciçamento de ${fmt(mc * 100, 0)} cm (${k ? 'fim' : 'início'}) maior que duas vezes a altura da laje.`);
        if (mc > 0.2 * L) avisos.push(`Vigotas: maciçamento de ${fmt(mc * 100, 0)} cm (${k ? 'fim' : 'início'}) maior que 20 % do vão.`);
      }
      const pm = (e: EsforcosVigota): EsforcosVigota => ({ mPos: e.mPos / intereixo, mNeg: [e.mNeg[0] / intereixo, e.mNeg[1] / intereixo], v: [e.v[0] / intereixo, e.v[1] / intereixo] });
      if (regV) registrarGrupoVigotas(regV, elV, { gi, nFaixas: ids.length, vigotas: nv, L, criterio: crit, difPct: op.vigotaIgualacaoDif, porArea: !!conv, eg: eg.esforcos, red: red ? { delta: red.delta, aplicada: red.aplicada, pct: op.redistribuicao, deltaMin: deltaMinVigotas(an), continuas: [continuas.some((q) => q[0]), continuas.some((q) => q[1])] } : null, esf, sec: tee, c, fydInf: aI.fyd, fydSup: aS.fyd, dI, dS, bw, intereixo, h, capa, hEnch, fl: { As: fl.As, double: fl.double }, AsMin, AsTrel, AsNec, AsAd, barras, trava: trava?.inf ? { n: trava.inf.n, phi: trava.inf.phi } : null, comprimento: arred(L, op.arredondamento), negativos: detNeg, cortante: detCort, macico });
      return {
        faixas: ids, vigotas: nv, L: r3(L), esforcos: esf, porMetro: pm(esf), diagrama: eg.diagrama,
        positiva: { AsNec, AsTrelica: AsTrel, AsAdicional: AsAd, barras, comprimento: arred(L, op.arredondamento), duplaNecessaria: fl.double },
        negativos, cortante, macico,
      };
    });
    // E5e (C7.102): flecha de montagem da vigota sobre escoras
    const montagem = op.vigotaMontagem ? montagemDaLaje(c, g0, tr, Math.max(...grupos.map((g) => g.L)), op) : undefined;
    if (montagem && !montagem.ok) erros.push(mensagemMontagem(montagem));
    // distribuição na capa (NBR 6118, Tabela 19.1, armadura secundária de lajes em uma direção) [a confirmar]
    const AsPrinc = Math.max(...grupos.map((g) => AsTrel + (g.positiva.barras?.As ?? g.positiva.AsAdicional))) / intereixo; // cm²/m
    const AsDist = Math.max(0.2 * AsPrinc, 0.9, 0.5 * RHO_MIN_LAJE * capa * 1e4);
    const phiD = aS.aco === 'CA-60' && op.lajeBitolaMinima <= 5 ? 5 : 6.3;
    const sD = Math.max(0.05, Math.min(0.33, Math.floor((barArea(phiD) * 1e4 / AsDist) * 100 + 1e-9) / 100));
    // posições para o resumo (por pavimento)
    const posicoes: PosicaoVigota[] = [];
    for (const g of grupos) {
      if (g.positiva.barras?.n) posicoes.push({ tipo: 'adicional', aco: aI.aco, phi: g.positiva.barras.phi, n: g.positiva.barras.n * g.vigotas, comprimento: g.positiva.comprimento });
      for (const ng of g.negativos) if (ng?.barras?.n) posicoes.push({ tipo: 'negativa', aco: aS.aco, phi: ng.barras.phi, n: ng.barras.n * g.vigotas, comprimento: ng.comprimento });
    }
    const A = Math.abs(areaPoligono(l.contorno)) - (l.furos ?? []).reduce((t, f) => t + Math.abs(areaPoligono(f)), 0), Lv = vaos(l)[0];
    posicoes.push({ tipo: 'distribuicao', aco: aS.aco, phi: phiD, n: Math.max(2, Math.ceil(Lv / sD) + 1), comprimento: arred(A / (Lv || 1), op.arredondamento) });
    const peso = posicoes.reduce((t, x) => t + x.n * x.comprimento * barArea(x.phi) * ACO_KG_M3, 0);
    if (regV) {
      registrarVigotasLaje(regV, elV, { montagem: montagem ? { ...montagem, dist: op.vigotaEscoraDist, pp: g0.pp, construcao: op.vigotaCargaConstrucao, intereixo, divisor: op.vigotaMontagemLimite } : undefined, AsPrinc, AsDist, phiD, sD, capa, bitolaMinima: op.lajeBitolaMinima, ca60: aS.aco === 'CA-60', posicoes, peso, repeticoes: Math.max(1, pavs.length) });
      registrarAcoNervurada(regV, elV, { posicoes, peso, repeticoes: Math.max(1, pavs.length) });
    }
    const comprimentoVigotas = grupos.reduce((t, g) => t + g.vigotas * g.L, 0);
    const adic = grupos.map((g) => (g.positiva.barras?.n ? `${g.positiva.barras.n}φ${fphi(g.positiva.barras.phi)}` : '—'));
    const resumo = `Treliçada ${modeloNome}+${Math.round(capa * 100)}: ${nomeTr} (banzo inferior 2φ${fphi(tr.inf)} CA-60), ${nTotal} vigotas em ${grupos.length} grupo(s); Md+ máx. ${fmt(Math.max(...grupos.map((g) => g.esforcos.mPos)))} kN·m por nervura; adicional por nervura ${[...new Set(adic)].join(' / ')}.`;
    const msgs = [...erros, ...avisos, resumo];
    msgsLaje(l.id, msgs, erros.length > 0);
    out.push({
      laje: l.id, nome: l.nome, grupo: l.grupo, pavimentos: nomesPav, repeticoes: Math.max(1, pavs.length), modelo: modeloNome, trelica: nomeTr,
      banzoInf: { n: 2, phi: tr.inf, As: AsBanzo }, intereixo, bw, capa, h, d: { inf: r3(dI), sup: r3(dS) },
      vigotas: nTotal, comprimentoVigotas: r3(comprimentoVigotas), faixas, grupos,
      distribuicao: { AsNec: AsDist, aco: aS.aco, phi: phiD, s: sD }, verificacaoCapa: { minima: capaMin, ok: capaOk }, bloqueada: !!trava,
      posicoes, peso, pesoTrelica: comprimentoVigotas * pesoTrelica(nomeTr, b), ...(montagem ? { montagem } : {}),
      status: erros.length ? 'fail' : 'ok', mensagens: msgs,
      lista: listaDeVigotas(posicionarVigotas(l, faixas, nTotal, B, u), faixas, grupos, l, () => g0.pp * intereixo),
    });
  }
  return out;
}

/** Resumo do aço das vigotas (adicionais, negativos e distribuição) por aço e bitola (kg), com repetições e perdas (%). */
export function resumoAcoVigotas(vs: ResultadoVigotas[], perdas: number): { aco: string; phi: number; comprimento: number; peso: number; pesoComPerdas: number }[] {
  const m = new Map<string, { aco: string; phi: number; comprimento: number }>();
  for (const v of vs) for (const x of v.posicoes) {
    const k = `${x.aco}|${x.phi}`, e = m.get(k) ?? { aco: x.aco, phi: x.phi, comprimento: 0 };
    e.comprimento += x.n * x.comprimento * v.repeticoes;
    m.set(k, e);
  }
  return [...m.values()].sort((a, z) => a.aco.localeCompare(z.aco) || a.phi - z.phi).map((e) => { const peso = e.comprimento * barArea(e.phi) * ACO_KG_M3; return { ...e, peso, pesoComPerdas: peso * (1 + perdas / 100) }; });
}

/** Quantitativo das treliças por tipo: comprimento total (m) e peso estimado (kg), com repetições e perdas (%). */
export function quantitativoTrelicas(vs: ResultadoVigotas[], perdas: number): { trelica: string; comprimento: number; peso: number; pesoComPerdas: number }[] {
  const m = new Map<string, number>();
  for (const v of vs) if (v.trelica) m.set(v.trelica, (m.get(v.trelica) ?? 0) + v.comprimentoVigotas * v.repeticoes);
  return [...m.entries()].sort((a, z) => a[0].localeCompare(z[0])).map(([trelica, comprimento]) => { const peso = comprimento * pesoTrelica(trelica); return { trelica, comprimento, peso, pesoComPerdas: peso * (1 + perdas / 100) }; });
}

/** Resumo por laje para o MCP (sem os alinhamentos). */
export function resumoVigotas(v: ResultadoVigotas) {
  return {
    laje: v.laje, nome: v.nome, trelica: v.trelica, vigotas: v.vigotas, status: v.status, ...(v.familia ? { familia: v.familia, ficha: v.fichaNome, serie: v.serie } : {}),
    grupos: v.grupos.map((g) => ({
      vigotas: g.vigotas, L: g.L, mPos: +g.esforcos.mPos.toFixed(2), mNeg: g.esforcos.mNeg.map((x) => +x.toFixed(2)), v: g.esforcos.v.map((x) => +x.toFixed(2)),
      ...(g.tipo ? { tipo: g.tipo } : {}), ...(g.especial ? { especial: g.especial } : {}), adicional: g.positiva.barras, negativos: g.negativos.map((n) => (n ? { barras: n.barras, comprimento: n.comprimento } : null)), macico: g.macico,
    })),
    distribuicao: v.distribuicao, bloqueada: v.bloqueada, peso: +v.peso.toFixed(1), pesoTrelica: +v.pesoTrelica.toFixed(1),
  };
}
