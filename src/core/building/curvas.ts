// Vigas curvas (E2b, C6.12, C6.13, C6.32) e ajuste de vigas a planos inclinados (C6.58).
//
// A viga curva é uma poligonal de cordas: `Viga.pontos` guarda sempre os vértices já discretizados (a grelha, o pórtico, o
// desenho e todas as regras de lançamento enxergam uma poligonal) e `Viga.arcos` marca as faixas de vértices que formam
// um arco de círculo. O círculo de cada arco sai de três vértices (início, meio e fim da faixa), de modo que mover,
// copiar, girar ou espelhar a viga leva o arco junto. A torção de equilíbrio da curvatura aparece sozinha na análise: as
// barras são 3D e cada corda gira em torno do eixo da vizinha (nada de elemento especial).
import type { Draft } from 'immer';
import type { ArcoViga, BuildingModel, Viga } from './types';
import { comprimentoPolilinha } from './types';

type P = [number, number];
const r6 = (v: number) => +v.toFixed(6);
const TAU = 2 * Math.PI;

/** Corda máxima padrão da discretização (m) [a confirmar]. */
export const CORDA_PADRAO = 0.5;
/** Tolerância (m) para um vértice estar sobre o círculo do arco. */
const TOL_CIRCULO = 1e-4;

export interface CirculoArco {
  c: P;
  R: number;
  /** Ângulo (rad) do ponto inicial. */
  ang0: number;
  /** Varredura (rad, com sinal: positivo = anti-horário) do início ao fim, passando pelo ponto de passagem. */
  varredura: number;
}

/** Círculo pelo início `a`, passagem `p` e fim `z`; null se os três pontos são colineares ou coincidentes. */
export function arcoPor3(a: P, p: P, z: P): CirculoArco | null {
  const d = 2 * (a[0] * (p[1] - z[1]) + p[0] * (z[1] - a[1]) + z[0] * (a[1] - p[1]));
  const esc = Math.hypot(a[0] - z[0], a[1] - z[1]) + Math.hypot(a[0] - p[0], a[1] - p[1]) + Math.hypot(p[0] - z[0], p[1] - z[1]);
  if (!esc || Math.abs(d) < 1e-9 * esc * esc) return null;
  const a2 = a[0] ** 2 + a[1] ** 2, p2 = p[0] ** 2 + p[1] ** 2, z2 = z[0] ** 2 + z[1] ** 2;
  const c: P = [(a2 * (p[1] - z[1]) + p2 * (z[1] - a[1]) + z2 * (a[1] - p[1])) / d, (a2 * (z[0] - p[0]) + p2 * (a[0] - z[0]) + z2 * (p[0] - a[0])) / d];
  const R = Math.hypot(a[0] - c[0], a[1] - c[1]);
  const ang = (q: P) => Math.atan2(q[1] - c[1], q[0] - c[0]);
  const norm = (x: number) => ((x % TAU) + TAU) % TAU;
  const ang0 = ang(a), dp = norm(ang(p) - ang0), dz = norm(ang(z) - ang0);
  // o sentido é o que passa por `p` antes de chegar a `z`
  const varredura = dp <= dz ? dz : dz - TAU;
  return { c, R, ang0, varredura };
}

/**
 * Fração do ângulo das cordas das pontas em relação às do meio. A liberação da flexão (ou o apoio) na ponta da viga atua
 * na direção da primeira corda, que difere da tangente do arco de metade do ângulo da corda; com a corda da ponta menor, o
 * erro dessa diferença (de primeira ordem na corda) cai na mesma proporção. Nas cordas do meio o erro é de segunda ordem.
 */
export const FRACAO_PONTA = 0.25;

/** Número de cordas de um arco de raio R e varredura dada para cordas de no máximo `corda` no meio (mínimo 3: duas de ponta e uma). */
export function numeroDeCordas(R: number, varredura: number, corda: number): number {
  const dTheta = 2 * Math.asin(Math.min(1, corda / (2 * R)));
  return Math.max(3, Math.ceil(Math.abs(varredura) / dTheta + 2 - 2 * FRACAO_PONTA - 1e-9));
}

/** Parte do ângulo total de cada uma das `n` cordas (n ≥ 3): as duas das pontas valem `FRACAO_PONTA` das do meio. */
export function passosDoArco(n: number): number[] {
  const d = 1 / (n - 2 + 2 * FRACAO_PONTA);
  return Array.from({ length: n }, (_, k) => (k === 0 || k === n - 1 ? FRACAO_PONTA * d : d));
}

/** Pontos do arco (inclui início e fim exatos), com `n` cordas (as das pontas menores, `passosDoArco`). */
export function pontosDoArco(a: P, z: P, circ: CirculoArco, n: number): P[] {
  const out: P[] = [a], passos = passosDoArco(n);
  let acc = 0;
  for (let k = 0; k < n - 1; k++) {
    acc += passos[k];
    const t = circ.ang0 + circ.varredura * acc;
    out.push([r6(circ.c[0] + circ.R * Math.cos(t)), r6(circ.c[1] + circ.R * Math.sin(t))]);
  }
  out.push(z);
  return out;
}

/** Discretiza o arco por três pontos (início, passagem, fim) em cordas de no máximo `corda` m. Devolve null se degenerado. */
export function discretizarArco(a: P, passagem: P, z: P, corda = CORDA_PADRAO): P[] | null {
  const circ = arcoPor3(a, passagem, z);
  if (!circ) return null;
  return pontosDoArco(a, z, circ, numeroDeCordas(circ.R, circ.varredura, corda));
}

/** Círculo do arco `arco` da viga (pelos vértices início, meio e fim da faixa); null se a faixa não define círculo. */
export function circuloDoArco(v: Pick<Viga, 'pontos'>, arco: ArcoViga): CirculoArco | null {
  const { ini, fim } = arco;
  if (ini < 0 || fim >= v.pontos.length || fim - ini < 2) return null;
  return arcoPor3(v.pontos[ini], v.pontos[ini + Math.floor((fim - ini) / 2)], v.pontos[fim]);
}

/** O arco ainda é um arco? Todos os vértices da faixa sobre o círculo (tolerância em m) e com cordas iguais em ângulo. */
export function arcoValido(v: Pick<Viga, 'pontos'>, arco: ArcoViga, tol = TOL_CIRCULO): boolean {
  const circ = circuloDoArco(v, arco);
  if (!circ) return false;
  for (let i = arco.ini; i <= arco.fim; i++) if (Math.abs(Math.hypot(v.pontos[i][0] - circ.c[0], v.pontos[i][1] - circ.c[1]) - circ.R) > tol) return false;
  return true;
}

export const ehCurva = (v: Pick<Viga, 'arcos'>) => !!v.arcos?.length;
export const temCurvas = (b: Pick<BuildingModel, 'vigas'>) => b.vigas.some((v) => ehCurva(v));

/** Raio (m) e comprimento de arco (m) de cada trecho curvo da viga. */
export function dadosDosArcos(v: Pick<Viga, 'pontos' | 'arcos'>): { arco: ArcoViga; raio: number; comprimento: number; angulo: number; cordas: number; cordaMax: number }[] {
  const out = [];
  for (const arco of v.arcos ?? []) {
    const circ = circuloDoArco(v, arco);
    if (!circ) continue;
    let cordaMax = 0;
    for (let i = arco.ini; i < arco.fim; i++) cordaMax = Math.max(cordaMax, Math.hypot(v.pontos[i + 1][0] - v.pontos[i][0], v.pontos[i + 1][1] - v.pontos[i][1]));
    out.push({ arco, raio: circ.R, comprimento: circ.R * Math.abs(circ.varredura), angulo: (Math.abs(circ.varredura) * 180) / Math.PI, cordas: arco.fim - arco.ini, cordaMax });
  }
  return out;
}

/** Comprimento desenvolvido da viga (m): cada trecho curvo pelo comprimento do arco e os retos pela corda. */
export function comprimentoDesenvolvido(v: Pick<Viga, 'pontos' | 'arcos'>): number {
  let total = comprimentoPolilinha(v.pontos as P[]);
  for (const { arco, comprimento } of dadosDosArcos(v)) {
    total += comprimento - comprimentoPolilinha(v.pontos.slice(arco.ini, arco.fim + 1) as P[]);
  }
  return total;
}

/**
 * Pontos de controle da viga (os vértices fora do interior dos arcos) e, para cada trecho entre controles, o ponto de
 * passagem do arco (null = trecho reto). Inverso de `montarPoligonal`.
 */
export function controleDaViga(v: Pick<Viga, 'pontos' | 'arcos'>): { pontos: P[]; passagens: (P | null)[] } {
  const arcos = [...(v.arcos ?? [])].sort((a, z) => a.ini - z.ini);
  const pontos: P[] = [], passagens: (P | null)[] = [];
  let i = 0;
  while (i < v.pontos.length) {
    pontos.push(v.pontos[i] as P);
    const arco = arcos.find((x) => x.ini === i);
    if (arco) { passagens.push(v.pontos[arco.ini + Math.floor((arco.fim - arco.ini) / 2)] as P); i = arco.fim; }
    else { if (i + 1 < v.pontos.length) passagens.push(null); i++; }
  }
  return { pontos, passagens };
}

/**
 * Poligonal discretizada a partir dos pontos de controle e dos pontos de passagem (um por trecho; null = reto).
 * Devolve os vértices e os arcos (índices nos vértices), ou o índice do trecho degenerado (passagem colinear com as pontas).
 */
export function montarPoligonal(controle: P[], passagens: (P | null)[], corda = CORDA_PADRAO): { pontos: P[]; arcos: ArcoViga[] } | { degenerado: number } {
  const pontos: P[] = [[r6(controle[0][0]), r6(controle[0][1])]], arcos: ArcoViga[] = [];
  for (let i = 0; i + 1 < controle.length; i++) {
    const a = pontos[pontos.length - 1], z: P = [r6(controle[i + 1][0]), r6(controle[i + 1][1])], q = passagens[i] ?? null;
    if (!q) { pontos.push(z); continue; }
    const seg = discretizarArco(a, q, z, corda);
    if (!seg) return { degenerado: i };
    const ini = pontos.length - 1;
    pontos.push(...seg.slice(1));
    arcos.push({ ini, fim: pontos.length - 1 });
  }
  return { pontos, arcos };
}

/**
 * Mantém os arcos das vigas em dia, no mesmo passo de qualquer comando: refaz a discretização quando a corda máxima
 * (opção `curvaSegmento`) pede outro número de cordas e descarta o arco cujos vértices deixaram de estar sobre um
 * círculo (a viga foi editada como poligonal). Devolve uma frase por viga alterada.
 */
export function sincronizarCurvas(d: Draft<BuildingModel>, corda: number): string[] {
  const msgs: string[] = [];
  for (const v of d.vigas) {
    if (!v.arcos?.length) continue;
    let pontos = v.pontos as P[];
    const arcos = [...v.arcos].sort((a, z) => a.ini - z.ini);
    const novos: ArcoViga[] = [];
    let desloc = 0, mudou = false;
    for (const a0 of arcos) {
      const arco: ArcoViga = { ini: a0.ini + desloc, fim: a0.fim + desloc };
      if (!arcoValido({ pontos }, arco)) { msgs.push(`${v.nome}: o trecho curvo deixou de ser um arco e virou poligonal.`); mudou = true; continue; }
      const circ = circuloDoArco({ pontos }, arco)!;
      const n = numeroDeCordas(circ.R, circ.varredura, corda);
      if (n === arco.fim - arco.ini) { novos.push(arco); continue; }
      const seg = pontosDoArco(pontos[arco.ini], pontos[arco.fim], circ, n);
      pontos = [...pontos.slice(0, arco.ini), ...seg, ...pontos.slice(arco.fim + 1)];
      novos.push({ ini: arco.ini, fim: arco.ini + n });
      desloc += n - (arco.fim - arco.ini);
      mudou = true;
      msgs.push(`${v.nome}: arco rediscretizado em ${n} cordas.`);
    }
    if (!mudou && novos.length === arcos.length && arcos.every((a, i) => a.ini === v.arcos![i].ini && a.fim === v.arcos![i].fim)) continue;
    v.pontos = pontos;
    if (novos.length) v.arcos = novos; else delete v.arcos;
  }
  return msgs;
}

// ---------------------------------------------------------------- abscissa e corte

/** Ponto da viga na abscissa `s` (m, ao longo da poligonal): sobre o arco, se cair numa corda de trecho curvo. Devolve o ponto e a corda. */
export function pontoNaAbscissa(v: Pick<Viga, 'pontos' | 'arcos'>, s: number): { p: P; corda: number } {
  const pts = v.pontos as P[];
  let acc = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (s <= acc + L + 1e-9 || i + 2 === pts.length) {
      const t = L ? Math.min(1, Math.max(0, (s - acc) / L)) : 0;
      const arco = (v.arcos ?? []).find((x) => i >= x.ini && i < x.fim);
      const circ = arco ? circuloDoArco(v, arco) : null;
      if (arco && circ) {
        const passos = passosDoArco(arco.fim - arco.ini), k = i - arco.ini;
        const ant = passos.slice(0, k).reduce((u, x) => u + x, 0), ang = circ.ang0 + circ.varredura * (ant + passos[k] * t);
        return { p: [r6(circ.c[0] + circ.R * Math.cos(ang)), r6(circ.c[1] + circ.R * Math.sin(ang))], corda: i };
      }
      return { p: [r6(pts[i][0] + t * (pts[i + 1][0] - pts[i][0])), r6(pts[i][1] + t * (pts[i + 1][1] - pts[i][1]))], corda: i };
    }
    acc += L;
  }
  return { p: pts[pts.length - 1], corda: Math.max(0, pts.length - 2) };
}

/**
 * Divide a viga na abscissa `s`: devolve as poligonais e os arcos das duas partes. O ponto de corte cai sobre o arco quando
 * está num trecho curvo; arcos que ficam com menos de 2 cordas viram trecho reto.
 */
export function cortarPoligonal(v: Pick<Viga, 'pontos' | 'arcos'>, s: number): { a: { pontos: P[]; arcos: ArcoViga[] }; z: { pontos: P[]; arcos: ArcoViga[] } } {
  const { p, corda } = pontoNaAbscissa(v, s);
  const pts = v.pontos as P[];
  const dist = (q: P) => Math.hypot(q[0] - p[0], q[1] - p[1]);
  // o ponto cai num vértice existente? (evita corda nula)
  let k = -1;
  if (dist(pts[corda]) < 1e-6) k = corda; else if (dist(pts[corda + 1]) < 1e-6) k = corda + 1;
  const pa = k >= 0 ? pts.slice(0, k + 1) : [...pts.slice(0, corda + 1), p];
  const pz = k >= 0 ? pts.slice(k) : [p, ...pts.slice(corda + 1)];
  const iv = k >= 0 ? k : corda + 1; // índice do vértice de corte em pa
  const arcosA: ArcoViga[] = [], arcosZ: ArcoViga[] = [];
  const off = k >= 0 ? k : corda; // índice original do vértice anterior ao corte (vértice 0 de pz, ou o próprio vértice de corte)
  const primeiroDeZ = k >= 0 ? k : corda + 1; // primeiro vértice original que pertence só a pz
  for (const x of v.arcos ?? []) {
    if (x.fim <= off) { if (x.fim - x.ini >= 2) arcosA.push({ ...x }); }
    else if (x.ini >= primeiroDeZ) { if (x.fim - x.ini >= 2) arcosZ.push({ ini: x.ini - off, fim: x.fim - off }); }
    else {
      // o arco contém o ponto de corte: divide em dois
      if (iv - x.ini >= 2) arcosA.push({ ini: x.ini, fim: iv });
      if (x.fim - off >= 2) arcosZ.push({ ini: 0, fim: x.fim - off });
    }
  }
  return { a: { pontos: pa, arcos: arcosA }, z: { pontos: pz, arcos: arcosZ } };
}

/** Une duas poligonais já orientadas (a termina onde z começa), deslocando os índices dos arcos de z. */
export function juntarPoligonais(a: { pontos: P[]; arcos?: ArcoViga[] }, z: { pontos: P[]; arcos?: ArcoViga[] }): { pontos: P[]; arcos: ArcoViga[] } {
  const base = a.pontos.length - 1;
  return { pontos: [...a.pontos, ...z.pontos.slice(1)], arcos: [...(a.arcos ?? []), ...(z.arcos ?? []).map((x) => ({ ini: x.ini + base, fim: x.fim + base }))] };
}

/** Inverte o sentido da poligonal (e os índices dos arcos). */
export function inverterPoligonal(a: { pontos: P[]; arcos?: ArcoViga[] }): { pontos: P[]; arcos: ArcoViga[] } {
  const n = a.pontos.length - 1;
  return { pontos: [...a.pontos].reverse(), arcos: (a.arcos ?? []).map((x) => ({ ini: n - x.fim, fim: n - x.ini })).sort((p, q) => p.ini - q.ini) };
}

/** Separa a poligonal em partes: um trecho curvo por parte e os trechos retos seguidos juntos (decompor a poliviga). */
export function decomporPoligonal(v: Pick<Viga, 'pontos' | 'arcos'>): { pontos: P[]; arcos: ArcoViga[] }[] {
  const arcos = [...(v.arcos ?? [])].sort((a, z) => a.ini - z.ini);
  const partes: { pontos: P[]; arcos: ArcoViga[] }[] = [];
  let i = 0;
  for (const a of arcos) {
    if (a.ini > i) partes.push({ pontos: v.pontos.slice(i, a.ini + 1) as P[], arcos: [] });
    partes.push({ pontos: v.pontos.slice(a.ini, a.fim + 1) as P[], arcos: [{ ini: 0, fim: a.fim - a.ini }] });
    i = a.fim;
  }
  if (i < v.pontos.length - 1) partes.push({ pontos: v.pontos.slice(i) as P[], arcos: [] });
  return partes;
}

// ---------------------------------------------------------------- planos inclinados (C6.58)

/** Plano z = a·x + b·y + c (inclinações em m/m, c em m). */
export interface PlanoInclinado { a: number; b: number; c: number }

/** Plano por três pontos cotados [x, y, z]; null se os três estão alinhados em planta. */
export function planoPor3Pontos(p: [number, number, number][]): PlanoInclinado | null {
  const [p1, p2, p3] = p;
  const den = (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1]);
  if (Math.abs(den) < 1e-9) return null;
  const a = ((p2[2] - p1[2]) * (p3[1] - p1[1]) - (p3[2] - p1[2]) * (p2[1] - p1[1])) / den;
  const b = ((p3[2] - p1[2]) * (p2[0] - p1[0]) - (p2[2] - p1[2]) * (p3[0] - p1[0])) / den;
  return { a, b, c: p1[2] - a * p1[0] - b * p1[1] };
}

/**
 * Leva os pontos da viga à linha dada: `interseccao` projeta cada ponto (perpendicularmente em planta) sobre a projeção da
 * interseção dos dois planos; `maximaDeclividade` alinha os pontos à linha de maior declividade do plano que passa pelo
 * primeiro ponto (direção (a, b)). Devolve null se os planos são paralelos (sem interseção) ou o plano é horizontal.
 */
export function ajustarAoPlano(pontos: P[], modo: 'interseccao' | 'maximaDeclividade', planos: PlanoInclinado[]): P[] | null {
  if (modo === 'interseccao') {
    if (planos.length < 2) return null;
    // a·x + b·y + c = 0, com (a, b, c) = diferença dos planos
    const a = planos[0].a - planos[1].a, b = planos[0].b - planos[1].b, c = planos[0].c - planos[1].c, n2 = a * a + b * b;
    if (n2 < 1e-12) return null;
    return pontos.map((q) => { const t = (a * q[0] + b * q[1] + c) / n2; return [r6(q[0] - a * t), r6(q[1] - b * t)] as P; });
  }
  const pl = planos[0];
  if (!pl) return null;
  const n = Math.hypot(pl.a, pl.b);
  if (n < 1e-9) return null;
  const u: P = [pl.a / n, pl.b / n], o = pontos[0];
  return pontos.map((q, i) => { if (!i) return [r6(q[0]), r6(q[1])] as P; const t = (q[0] - o[0]) * u[0] + (q[1] - o[1]) * u[1]; return [r6(o[0] + t * u[0]), r6(o[1] + t * u[1])] as P; });
}

// ---------------------------------------------------------------- memorial

export interface LinhaVigaCurva { viga: string; nome: string; trechos: number; raios: number[]; angulos: number[]; comprimentoDesenvolvido: number; cordas: number; cordaMax: number }

/** Quadro das vigas curvas para o memorial: raio, ângulo, número de cordas e comprimento desenvolvido. */
export function resumoVigasCurvas(b: BuildingModel): LinhaVigaCurva[] {
  return b.vigas.filter((v) => ehCurva(v)).map((v) => {
    const ds = dadosDosArcos(v);
    return {
      viga: v.id, nome: v.nome, trechos: ds.length, raios: ds.map((x) => x.raio), angulos: ds.map((x) => x.angulo),
      comprimentoDesenvolvido: comprimentoDesenvolvido(v), cordas: ds.reduce((s, x) => s + x.cordas, 0), cordaMax: Math.max(0, ...ds.map((x) => x.cordaMax)),
    };
  });
}
