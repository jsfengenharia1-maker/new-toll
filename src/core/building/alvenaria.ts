// Alvenaria estrutural e blocos de concreto (E1e): tipos de alvenaria e de bloco, resistências (NBR 16868-1), esbeltez,
// tensões-limite por elemento da casca, armadura de paredes de blocos, modulação das aberturas, quantitativo de blocos,
// desligamento muro-pilar e diagnósticos de lançamento. O dimensionamento sobre a análise está em `alvenariaDim.ts`.
// Premissas em `premissas.ts` (ids e1e-*); fórmulas e tabelas da NBR 16868-1 sem o texto da norma estão "a confirmar" e
// listadas em `docs/pendencias-usuario.md`.
//
// Unidades: MPa para resistências, kN e m nos esforços (kN/m, kN·m/m), cm²/m nas áreas de aço. Convenção da casca:
// tração > 0 (ny vertical, nx horizontal, nxy cisalhamento no plano, my momento da faixa vertical, mx da horizontal).
import { ehNervurada } from './tiposLaje';
import { barArea } from '../concrete';
import type { P } from '../geom/faces';
import type { Forcas } from './paredesArmadura';
import { acumulados, furosDaParede, niveisDaParede, ppDaParede } from './paredesBase';
import { opcoesEmUso, perfilDe, type OpcoesCalculo } from './opcoes';
import { contornoDoLado, cruzaPoligonos, ladosDoPP, lancesDoPP } from './pilarParede';
import { contornoNoLance, lancesDoPilar, type AberturaParede, type BuildingModel, type Parede, type TipoAlvenaria, type TipoBloco } from './types';
import type { Diagnostico } from './verify';

const r4 = (v: number) => +v.toFixed(4);
const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');

/** Tolerância de 1,1 cm: medidas modulares nominais (com junta) e espessura da parede × largura do bloco. */
export const TOL_MODULO = 0.011;
/** Tolerância da altura do lance em relação à altura modular das fiadas (ajuste de junta e cinta). */
export const TOL_ALTURA = 0.03;
/** Distância máxima (m) entre o pilar e o muro para o pilar contar como "em contato" (a mesma tolerância de toque da E1c). */
export const TOL_TOQUE = 0.05;

export const ehAlvenaria = (w: Pick<Parede, 'tipo'>): boolean => w.tipo !== 'concreto';
/** Modelo de alvenaria que cada tipo de parede pede. */
export const MODELO_DO_TIPO: Record<'alvenaria' | 'blocos', TipoAlvenaria['modelo']> = { alvenaria: 'generica', blocos: 'blocos' };

export const tipoAlvenariaDe = (b: Pick<BuildingModel, 'tiposAlvenaria'>, w: Pick<Parede, 'material'>): TipoAlvenaria | undefined =>
  w.material ? b.tiposAlvenaria?.find((t) => t.id === w.material) : undefined;
export const blocoDe = (b: Pick<BuildingModel, 'blocos'>, t?: Pick<TipoAlvenaria, 'bloco'>): TipoBloco | undefined =>
  t?.bloco ? b.blocos?.find((x) => x.id === t.bloco) : undefined;

/** Módulo horizontal (meio bloco) e vertical (altura da fiada) do bloco, m. */
export const moduloDoBloco = (bl: Pick<TipoBloco, 'comprimento' | 'altura'>) => ({ mod: bl.comprimento / 2, alt: bl.altura });
/** A parede precisa de peça de canto? (largura ≠ metade do comprimento, ou pedido no bloco.) */
export const precisaCanto = (bl: TipoBloco): boolean => bl.canto ?? Math.abs(bl.largura - bl.comprimento / 2) > TOL_MODULO;

// ---------------------------------------------------------------- resistências

export interface ResistenciaAlv {
  modelo: TipoAlvenaria['modelo'];
  /** Blocos: resistências do bloco, do prisma e da parede (MPa). */
  fbk?: number; fpk?: number; fk?: number;
  /** Resistências de cálculo à compressão e à tração (MPa). */
  fd: number; ftd: number;
  /** Cisalhamento: blocos fvk = fv0 + 0,5σ ≤ fvMax com γm; genérica fvd fixo. */
  cis: { modo: 'blocos'; fv0: number; fvMax: number; gamaM: number } | { modo: 'generica'; fvd: number };
  /** Módulo de elasticidade e de cisalhamento (MPa), ν e peso específico (kN/m³) para a casca. */
  E: number; G: number; nu: number; gama: number;
  armada: boolean;
}

/** Resistências e rigidez da alvenaria; os parâmetros normativos vêm das opções (perfil do sistema ou NBR). */
/** ν da análise (0,2) quando o tipo não considera a rigidez ao cisalhamento informada. */
export const NU_PADRAO = 0.2;
export function resistenciaAlvenaria(t: TipoAlvenaria, bl: TipoBloco | undefined, op: OpcoesCalculo, nuPadrao = NU_PADRAO): ResistenciaAlv {
  let fd: number, fbk: number | undefined, fpk: number | undefined, fk: number | undefined;
  if (t.modelo === 'blocos') {
    fbk = bl?.fbk ?? 0;
    fpk = t.fpk ?? op.alvenariaPrisma * fbk;
    fk = op.alvenariaFkPrisma * fpk;
    fd = fk / op.alvenariaGamaM;
  } else fd = t.fd ?? 0;
  const ftd = t.ftd ?? (op.alvenariaTracao / 100) * fd;
  const E = t.E ?? Math.min(800 * (fpk ?? (fd * op.alvenariaGamaM) / op.alvenariaFkPrisma), 16000);
  // rigidez ao cisalhamento: com `considerarG` o ν da casca reproduz o G informado (G = E/2(1+ν)); senão, o ν da análise
  const G0 = t.considerarG ? t.G ?? 0.4 * E : undefined;
  const nu = G0 !== undefined ? Math.min(0.45, Math.max(0, E / (2 * G0) - 1)) : nuPadrao;
  return {
    modelo: t.modelo, ...(fbk !== undefined ? { fbk, fpk, fk } : {}), fd, ftd,
    cis: t.modelo === 'blocos' ? { modo: 'blocos', fv0: op.alvenariaCisalhInicial, fvMax: op.alvenariaCisalhMax, gamaM: op.alvenariaGamaM } : { modo: 'generica', fvd: t.fvd ?? ftd },
    E, G: E / (2 * (1 + nu)), nu, gama: t.gama, armada: !!t.armada && t.modelo === 'blocos',
  };
}

/** Resistência de cálculo ao cisalhamento (MPa) sob a compressão σ (MPa, ≥ 0). */
export function fvdDe(r: ResistenciaAlv, sigma: number): number {
  return r.cis.modo === 'generica' ? r.cis.fvd : Math.min(r.cis.fv0 + 0.5 * Math.max(0, sigma), r.cis.fvMax) / r.cis.gamaM;
}

// ---------------------------------------------------------------- esbeltez

export interface Esbeltez { hef: number; lambda: number; R: number; max: number; ok: boolean }
/** hef = coeficiente × altura do lance; λ = hef/t; R = 1 − (λ/40)³ (redutor da resistência à compressão). */
export function esbeltezAlvenaria(H: number, t: number, op: OpcoesCalculo, armada: boolean): Esbeltez {
  const hef = op.alvenariaFlambagem * H, lambda = hef / t, max = armada ? op.alvenariaLambdaMaxArmada : op.alvenariaLambdaMax;
  return { hef, lambda, R: Math.max(0, 1 - (lambda / 40) ** 3), max, ok: lambda <= max + 1e-9 };
}

// ---------------------------------------------------------------- tensões por elemento da casca

export interface UtilAlv {
  /** Utilizações (esforço/limite); > 1 não atende. `trac` é 0 nas paredes armadas (a armadura resiste à tração). */
  comp: number; trac: number; cis: number;
  /** Maior utilização e o modo. */
  max: number; modo: 'compressao' | 'tracao' | 'cisalhamento';
}

/**
 * Utilização de um elemento da casca (forças por metro) contra as tensões-limite da alvenaria:
 *  - compressão: σN/(fd·R) + σM/fd, com σN = −ny/t, σM = 6·M/t² e M = máx(|my|, N·hef/exc) (excentricidade mínima), e a
 *    compressão horizontal σh/fd + 6|mx|/(t²·fd);
 *  - tração: máx(σM − σN; σh,tração + 6|mx|/t²) / ftd (não armada);
 *  - cisalhamento: |nxy|/t / fvd(σN).
 * Parede armada: a tração fica com a armadura (`trac` = 0), a flexão fora do plano usa `flexaoArmadaFaixa` e o cisalhamento
 * é limitado a 0,25·fd (biela; a armadura horizontal absorve o excedente de fvd).
 */
export function utilizacaoElemento(f: Forcas, t: number, esb: Esbeltez, res: ResistenciaAlv, op: OpcoesCalculo): UtilAlv {
  const k = 1 / (t * 1000), Nc = Math.max(0, -f.ny);
  const sN = -f.ny * k; // compressão positiva (MPa)
  const Mmin = op.alvenariaExcMin > 0 ? (Nc * esb.hef) / op.alvenariaExcMin : 0, Md = Math.max(Math.abs(f.my), Mmin);
  const sM = (6 * Md) / (t * t * 1000), sMt = (6 * Math.abs(f.my)) / (t * t * 1000);
  const sH = -f.nx * k, sMh = (6 * Math.abs(f.mx)) / (t * t * 1000);
  const tau = Math.abs(f.nxy) * k;
  let comp: number, trac: number, cis: number;
  if (res.armada) {
    // parede armada: flexão fora do plano por bloco retangular com as barras no centro (a armadura resiste à tração);
    // cisalhamento com a armadura horizontal até o limite da biela 0,25·fd
    const fl = flexaoArmadaFaixa(-f.ny, Md, t, res.fd * esb.R, 1);
    comp = Math.max(fl.ok ? Math.max(0, sN) / (res.fd * esb.R || 1e-12) : 99, Math.max(0, sH) / res.fd + sMh / res.fd);
    trac = 0;
    cis = tau / (0.25 * res.fd);
  } else {
    comp = Math.max(Math.max(0, sN) / (res.fd * esb.R || 1e-12) + sM / res.fd, Math.max(0, sH) / res.fd + sMh / res.fd);
    const tens = Math.max(sMt - sN, -sH + sMh, 0);
    trac = res.ftd > 0 ? tens / res.ftd : tens > 1e-9 ? 99 : 0;
    const fvd = fvdDe(res, Math.max(0, sN));
    cis = fvd > 0 ? tau / fvd : tau > 1e-9 ? 99 : 0;
  }
  const max = Math.max(comp, trac, cis);
  return { comp, trac, cis, max, modo: max === comp ? 'compressao' : max === trac ? 'tracao' : 'cisalhamento' };
}

// ---------------------------------------------------------------- armadura de paredes de blocos

/**
 * Faixa de 1 m de parede armada com barras no centro da espessura (d = t/2), compressão N (kN/m, > 0 comprime, < 0 tração)
 * e momento M (kN·m/m) fora do plano. Bloco retangular de tensão fc e profundidade a: M = fc·a·(t − a)/2 e T = fc·a − N
 * (equilíbrio em torno do centro). Sem armadura (T ≤ 0) a seção resiste com a = N/fc: M ≤ fc·a·(t − a)/2. `fc` em MPa
 * (resistência de cálculo, já com o redutor de esbeltez). Devolve a armadura vertical As (cm²/m) ou `ok: false`.
 */
export function flexaoArmadaFaixa(N: number, M: number, t: number, fc: number, fyd: number): { ok: boolean; a: number; As: number } {
  const f = fc * 1000, m = Math.abs(M), rad = t * t - (8 * m) / f;
  if (rad >= 0) {
    const a = (t - Math.sqrt(rad)) / 2, T = f * a - N;
    if (T >= 0) return { ok: true, a, As: (T / (fyd * 1000)) * 1e4 };
  }
  const a = N / f;
  return a <= t + 1e-12 && (f * a * (t - a)) / 2 >= m - 1e-9 ? { ok: true, a, As: 0 } : { ok: false, a: Math.min(a, t), As: 0 };
}

/** Barras (bitola e espaçamento) de menor área ≥ `As` (cm²/m), com espaçamento múltiplo de `passo` até `max` (m). */
export function escolherMalhaBlocos(As: number, bitolas: number[], passo: number, max: number): { phi: number; s: number; As: number } | null {
  let melhor: { phi: number; s: number; As: number } | null = null;
  for (const phi of bitolas) for (let k = Math.floor(max / passo + 1e-9); k >= 1; k--) {
    const s = r4(k * passo), prov = (barArea(phi) * 1e4) / s;
    if (prov + 1e-9 < As) continue;
    if (!melhor || prov < melhor.As - 1e-9) melhor = { phi, s, As: prov };
    break;
  }
  return melhor;
}

export const BITOLAS_VERTICAL = [8, 10, 12.5, 16, 20];
export const BITOLAS_HORIZONTAL = [5, 6.3, 8, 10];
/** Espaçamento máximo das barras verticais dos blocos (m) [a confirmar]. */
export const ESP_VERTICAL_MAX = 1.2;
/** Espaçamento máximo das barras horizontais (m) [a confirmar]. */
export const ESP_HORIZONTAL_MAX = 0.6;

// ---------------------------------------------------------------- modulação das aberturas

/** Trecho da polilinha em que a abertura fica e o s do início desse trecho. */
export function trechoDaAbertura(w: Pick<Parede, 'pontos'>, a: Pick<AberturaParede, 's' | 'largura'>): { i: number; s0: number } | null {
  const c = acumulados(w.pontos as [number, number][]);
  const i = c.findIndex((ci, j) => j + 1 < c.length && a.s >= ci - 1e-6 && a.s + a.largura <= c[j + 1] + 1e-6);
  return i < 0 ? null : { i, s0: c[i] };
}

/**
 * Abertura ajustada à modulação: início ao meio bloco mais próximo (a partir do início do trecho), largura para cima ao
 * múltiplo do meio bloco, peitoril ao múltiplo da altura mais próximo e topo para cima ao múltiplo da altura (sem peças cortadas).
 */
export function ajustarAberturaModular(a: Pick<AberturaParede, 's' | 'largura' | 'peitoril' | 'altura'>, s0Trecho: number, bl: TipoBloco): { s: number; largura: number; peitoril: number; altura: number } {
  const { mod, alt } = moduloDoBloco(bl), near = (v: number, u: number) => Math.round(v / u + 1e-9) * u, up = (v: number, u: number) => Math.ceil(v / u - 1e-6) * u;
  const peitoril = near(a.peitoril, alt), topo = up(a.peitoril + a.altura, alt);
  return { s: r4(s0Trecho + near(a.s - s0Trecho, mod)), largura: r4(Math.max(mod, up(a.largura, mod))), peitoril: r4(peitoril), altura: r4(Math.max(alt, topo - peitoril)) };
}
/** A abertura já está nas medidas modulares do bloco? */
export function aberturaModular(a: Pick<AberturaParede, 's' | 'largura' | 'peitoril' | 'altura'>, s0Trecho: number, bl: TipoBloco): boolean {
  const m = ajustarAberturaModular(a, s0Trecho, bl);
  return Math.abs(m.s - a.s) <= TOL_MODULO && Math.abs(m.largura - a.largura) <= TOL_MODULO && Math.abs(m.peitoril - a.peitoril) <= TOL_MODULO && Math.abs(m.altura - a.altura) <= TOL_MODULO;
}

// ---------------------------------------------------------------- quantitativo de blocos

export interface QuantLance {
  pavimento: string; nomePav: string;
  /** Altura do lance (m), fiadas inteiras, resto da altura sem fiada (m) e área líquida de parede (m²). */
  altura: number; fiadas: number; resto: number; area: number;
  inteiros: number; meios: number; cantos: number; canaletas: number; total: number;
}
export interface QuantParede {
  id: string; nome: string; bloco: string; nomeBloco: string;
  lances: QuantLance[];
  totais: { inteiros: number; meios: number; cantos: number; canaletas: number; total: number; area: number };
}

/** Peças de uma sequência de `len` módulos (meios blocos) numa fiada de paridade 0 (começa com inteiro) ou 1 (começa e termina com meio). */
export function contarSequencia(len: number, paridade: number): { inteiros: number; meios: number } {
  if (len <= 0) return { inteiros: 0, meios: 0 };
  if (len === 1) return { inteiros: 0, meios: 1 };
  if (paridade === 0) return { inteiros: Math.floor(len / 2), meios: len % 2 };
  return len % 2 === 0 ? { inteiros: len / 2 - 1, meios: 2 } : { inteiros: (len - 1) / 2, meios: 1 };
}

/**
 * Quantitativo de blocos de uma parede de blocos por lance: fiadas = altura do lance ÷ altura modular; cada trecho em
 * módulos de meio bloco, com fiadas alternadas (inteiros + meios nas pontas), aberturas retiradas pelas fiadas e módulos que
 * ocupam, canaletas na verga (e na contraverga das janelas) com o apoio de cada lado, e uma peça de canto por fiada em
 * cada canto quando a largura não é metade do comprimento (cada trecho perde um módulo nessa ponta). Premissa e1e-modulacao.
 */
export function quantitativoParede(b: BuildingModel, w: Parede, bl: TipoBloco, op: OpcoesCalculo): QuantParede {
  const { zs, topos } = niveisDaParede(b, w), c = acumulados(w.pontos as [number, number][]), furos = furosDaParede(b, w).porTrecho;
  const { mod, alt } = moduloDoBloco(bl), canto = precisaCanto(bl), nTrechos = w.pontos.length - 1;
  const apoio = Math.ceil((op.alvenariaVergaApoio / 100) / mod - 1e-6), fiadasVerga = Math.round(op.alvenariaVergaFiadas);
  const lances: QuantLance[] = [];
  for (let k = 0; k + 1 < zs.length; k++) {
    const H = zs[k + 1] - zs[k], resto0 = H / alt - Math.round(H / alt);
    const fiadas = Math.abs(resto0 * alt) <= TOL_ALTURA ? Math.round(H / alt) : Math.floor(H / alt + 1e-6);
    const q: QuantLance = { pavimento: topos[k], nomePav: b.pavimentos.find((p) => p.id === topos[k])?.nome ?? topos[k], altura: r4(H), fiadas, resto: r4(Math.max(0, H - fiadas * alt)), area: 0, inteiros: 0, meios: 0, cantos: 0, canaletas: 0, total: 0 };
    for (let i = 0; i < nTrechos; i++) {
      const Li = c[i + 1] - c[i], cantosI = canto ? (i > 0 ? 1 : 0) + (i < nTrechos - 1 ? 1 : 0) : 0, M = Math.max(0, Math.round(Li / mod) - cantosI);
      const fs = furos[i].filter((f) => f.z0 >= zs[k] - 1e-6 && f.z1 <= zs[k + 1] + 1e-6);
      q.area += Li * H - fs.reduce((s, f) => s + (f.s1 - f.s0) * (f.z1 - f.z0), 0);
      if (canto && i < nTrechos - 1) q.cantos += fiadas;
      for (let r = 0; r < fiadas; r++) {
        const base = zs[k] + r * alt, topo = base + alt, estado = new Array<number>(M).fill(0); // 0 bloco, 1 vão, 2 canaleta
        const cobre = (m0: number, m1: number, v: number) => { for (let m = Math.max(0, m0); m < Math.min(M, m1); m++) if (estado[m] !== 1) estado[m] = v; };
        for (const f of fs) {
          const m0 = Math.floor((f.s0 + 1e-6) / mod), m1 = Math.ceil((f.s1 - 1e-6) / mod), r0 = Math.ceil((f.z1 - zs[k] - TOL_MODULO) / alt), ehJanela = f.z0 - zs[k] > TOL_MODULO;
          if (topo > f.z0 + TOL_MODULO && base < f.z1 - TOL_MODULO) cobre(m0, m1, 1);
          else if (r >= r0 && r < r0 + fiadasVerga) cobre(m0 - apoio, m1 + apoio, 2);
          else if (ehJanela && r === Math.floor((f.z0 - zs[k] + TOL_MODULO) / alt) - 1) cobre(m0 - apoio, m1 + apoio, 2);
        }
        // sequências de módulos iguais: blocos (alternando a paridade da fiada), vão (nada) e canaletas (uma a cada 2 módulos)
        for (let m = 0; m < M;) {
          let n = m;
          while (n < M && estado[n] === estado[m]) n++;
          if (estado[m] === 0) { const p = contarSequencia(n - m, r % 2); q.inteiros += p.inteiros; q.meios += p.meios; }
          else if (estado[m] === 2) q.canaletas += Math.ceil((n - m) / 2);
          m = n;
        }
      }
    }
    q.area = r4(q.area);
    q.total = q.inteiros + q.meios + q.cantos + q.canaletas;
    lances.push(q);
  }
  const soma = (f: (l: QuantLance) => number) => lances.reduce((s, l) => s + f(l), 0);
  return {
    id: w.id, nome: w.nome, bloco: bl.id, nomeBloco: bl.nome, lances,
    totais: { inteiros: soma((l) => l.inteiros), meios: soma((l) => l.meios), cantos: soma((l) => l.cantos), canaletas: soma((l) => l.canaletas), total: soma((l) => l.total), area: r4(soma((l) => l.area)) },
  };
}

/** Quantitativo de blocos das paredes de blocos da obra (vazio sem elas). */
export function quantitativoAlvenaria(b: BuildingModel, op: OpcoesCalculo = opcoesEmUso(b.opcoes, perfilDe(b))): QuantParede[] {
  const out: QuantParede[] = [];
  for (const w of b.paredes ?? []) {
    if (w.tipo !== 'blocos') continue;
    const bl = blocoDe(b, tipoAlvenariaDe(b, w));
    if (bl && niveisDaParede(b, w).zs.length) out.push(quantitativoParede(b, w, bl, op));
  }
  return out;
}

// ---------------------------------------------------------------- desligamento muro-pilar

export interface Desligamento {
  parede: string; nomeParede: string; pilar: string; nomePilar: string; pavimento: string; nomePav: string;
  /** Tipo das lajes do pavimento junto ao pilar: só vigotas (treliçadas), com maciça ou sem laje. */
  laje: 'vigotas' | 'macica' | 'sem';
  /** O pilar é desligado do muro no nível do pavimento (só com lajes de vigotas). */
  desligado: boolean;
}

const distPontoSeg = (p: P, a: P, z: P) => { const dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
/** Distância mínima (m) entre dois polígonos convexos (0 se se sobrepõem). */
export function distanciaPoligonos(A: P[], B: P[]): number {
  if (cruzaPoligonos(A, B, 0)) return 0;
  let d = Infinity;
  for (const [X, Y] of [[A, B], [B, A]] as const) for (const p of X) for (let j = 0; j < Y.length; j++) d = Math.min(d, distPontoSeg(p, Y[j], Y[(j + 1) % Y.length]));
  return d;
}

/**
 * Pilares em contato (a até 5 cm) com cada parede de alvenaria ou de blocos, por pavimento: com lajes de vigotas no
 * pavimento o pilar é desligado do muro; com laje maciça o desligamento não vale (C5.27, C6.19).
 */
export function desligamentosMuroPilar(b: BuildingModel): Desligamento[] {
  const out: Desligamento[] = [];
  for (const w of b.paredes ?? []) {
    if (!ehAlvenaria(w)) continue;
    const pp = ppDaParede(w), lados = ladosDoPP(b, pp);
    for (const lance of lancesDoPP(b, pp)) {
      const contornos = lados.map((g) => contornoDoLado(g, lance.id));
      for (const q of b.pilares) {
        if (!lancesDoPilar(b, q).some((l) => l.id === lance.id)) continue;
        const cq = contornoNoLance(q, lance.id) as P[];
        if (!contornos.some((cw) => distanciaPoligonos(cw, cq) <= TOL_TOQUE)) continue;
        const proximas = b.lajes.filter((l) => l.grupo === lance.grupo && distanciaPontoContorno(cq, l.contorno as P[]) <= 0.5);
        const laje: Desligamento['laje'] = !proximas.length ? 'sem' : proximas.every((l) => ehNervurada(l.tipo)) ? 'vigotas' : 'macica';
        out.push({ parede: w.id, nomeParede: w.nome, pilar: q.id, nomePilar: q.nome, pavimento: lance.id, nomePav: lance.nome, laje, desligado: laje === 'vigotas' });
      }
    }
  }
  return out;
}

/** Distância do contorno do pilar ao contorno da laje (0 se o pilar toca ou está dentro dela). */
function distanciaPontoContorno(pilar: P[], laje: P[]): number {
  const cx = pilar.reduce((s, p) => s + p[0], 0) / pilar.length, cy = pilar.reduce((s, p) => s + p[1], 0) / pilar.length;
  let dentro = false;
  for (let i = 0, j = laje.length - 1; i < laje.length; j = i++) if ((laje[i][1] > cy) !== (laje[j][1] > cy) && cx < ((laje[j][0] - laje[i][0]) * (cy - laje[i][1])) / (laje[j][1] - laje[i][1]) + laje[i][0]) dentro = !dentro;
  if (dentro) return 0;
  let d = Infinity;
  for (const p of pilar) for (let j = 0; j < laje.length; j++) d = Math.min(d, distPontoSeg(p, laje[j], laje[(j + 1) % laje.length]));
  return d;
}

// ---------------------------------------------------------------- diagnósticos de lançamento

/** Espessuras totais da parede (média e por pavimento). */
const espessuras = (w: Parede) => [w.esq + w.dir, ...(w.porPavimento ?? []).map((e) => e.esq + e.dir)];

/**
 * Diagnósticos de lançamento das paredes de alvenaria e de blocos (vazio sem elas):
 *  - ALV_MATERIAL (erro): sem tipo de alvenaria, tipo inexistente ou de outro modelo, dados faltando;
 *  - ALV_ESPESSURA (aviso): espessura diferente da largura do bloco;
 *  - ALV_ABERTURA_MODULACAO (aviso): abertura fora das medidas modulares do bloco;
 *  - ALV_MODULACAO (aviso): altura do lance sem fiadas inteiras;
 *  - MURO_PILAR_DESLIGADO (info) e MURO_PILAR_MACICA (aviso): pilar em contato com o muro.
 */
export function diagnosticosAlvenaria(b: BuildingModel): Diagnostico[] {
  const d: Diagnostico[] = [];
  for (const w of b.paredes ?? []) {
    if (!ehAlvenaria(w)) continue;
    const ev = (codigo: string, severidade: Diagnostico['severidade'], mensagem: string, extra: string[] = []): Diagnostico => ({ codigo, severidade, elementos: [w.id, ...extra], mensagem: `${w.nome}: ${mensagem}` });
    const t = tipoAlvenariaDe(b, w), modelo = MODELO_DO_TIPO[w.tipo as 'alvenaria' | 'blocos'];
    if (!w.material) { d.push(ev('ALV_MATERIAL', 'erro', 'defina o tipo de alvenaria da parede.')); continue; }
    if (!t) { d.push(ev('ALV_MATERIAL', 'erro', `o tipo de alvenaria ${w.material} não existe.`)); continue; }
    if (t.modelo !== modelo) { d.push(ev('ALV_MATERIAL', 'erro', `${t.nome} é de ${t.modelo === 'blocos' ? 'blocos' : 'alvenaria genérica'}, incompatível com parede do tipo ${w.tipo === 'blocos' ? 'blocos' : 'alvenaria genérica'}.`)); continue; }
    const bl = blocoDe(b, t);
    if (t.modelo === 'blocos') {
      if (!bl) { d.push(ev('ALV_MATERIAL', 'erro', `${t.nome} não tem bloco da biblioteca.`)); continue; }
      if (!(bl.fbk > 0)) { d.push(ev('ALV_MATERIAL', 'erro', `o bloco ${bl.nome} não tem resistência fbk.`)); continue; }
    } else if (!(t.E && t.E > 0) || !(t.fd && t.fd > 0)) { d.push(ev('ALV_MATERIAL', 'erro', `${t.nome} precisa de módulo de elasticidade e de resistência de cálculo à compressão.`)); continue; }
    if (bl && espessuras(w).some((e) => Math.abs(e - bl.largura) > TOL_MODULO)) d.push(ev('ALV_ESPESSURA', 'aviso', `espessura de ${espessuras(w).map((e) => fmt(e * 100, 1)).filter((x, i, a) => a.indexOf(x) === i).join(' / ')} cm difere da largura de ${fmt(bl.largura * 100, 1)} cm do bloco ${bl.nome}.`));
    if (bl) {
      for (const a of w.aberturas ?? []) {
        const tr = trechoDaAbertura(w, a);
        if (tr && !aberturaModular(a, tr.s0, bl)) d.push(ev('ALV_ABERTURA_MODULACAO', 'aviso', `a abertura fora das medidas modulares do bloco (meio bloco ${fmt(bl.comprimento * 50, 0)} cm na horizontal, ${fmt(bl.altura * 100, 0)} cm na vertical): gera peças cortadas; ajuste à modulação.`, [a.id]));
      }
      const { zs, topos } = niveisDaParede(b, w);
      for (let k = 0; k + 1 < zs.length; k++) {
        const H = zs[k + 1] - zs[k], resto = H - Math.round(H / bl.altura) * bl.altura;
        if (Math.abs(resto) > TOL_ALTURA) d.push(ev('ALV_MODULACAO', 'aviso', `o lance de ${b.pavimentos.find((p) => p.id === topos[k])?.nome ?? topos[k]} tem ${fmt(H * 100, 0)} cm, sem fiadas inteiras de ${fmt(bl.altura * 100, 0)} cm (resto ${fmt(Math.abs(resto) * 100, 0)} cm): ajuste a junta, a cinta ou o pé-direito.`));
      }
    }
  }
  for (const x of desligamentosMuroPilar(b)) {
    d.push(x.desligado
      ? { codigo: 'MURO_PILAR_DESLIGADO', severidade: 'info', elementos: [x.parede, x.pilar], mensagem: `${x.nomePilar} em contato com ${x.nomeParede} em ${x.nomePav}: pilar desligado do muro no nível do pavimento (lajes de vigotas).` }
      : { codigo: 'MURO_PILAR_MACICA', severidade: 'aviso', elementos: [x.parede, x.pilar], mensagem: `${x.nomePilar} em contato com ${x.nomeParede} em ${x.nomePav}: ${x.laje === 'macica' ? 'laje maciça' : 'sem laje junto ao pilar'}; o desligamento só vale com lajes de vigotas. Lance o muro como elemento (parede) ligado ao pilar ou confira a transmissão de esforços.` });
  }
  return d;
}
