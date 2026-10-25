// Forças internas do pilar-parede numa seção horizontal (V7h, C4.60): resultante das forças que os nós de corte aplicam nos
// elementos do conjunto do pilar-parede logo acima (ou logo abaixo) da cota, por equilíbrio do corpo livre, sem médias de
// painel. Cada elemento está em equilíbrio sob as forças nodais K·u (menos as cargas de pressão); a soma dessas forças nos
// nós da cota de corte é, portanto, exatamente a força que a parte inferior transmite à superior (convenção das reações da
// base: N > 0 compressão, eixos globais; momentos em torno do centroide na cota do corte). Núcleo puro.
import { esforcosCasca, rigidezCasca, type ElementoCasca } from '../casca';
import type { ParedesNoPortico } from './pilarParedeModelo';
import { elementoBarra, type Caso3, type ElementoBarra, type Modelo3 } from '../fe3d';

/** Cargas de uma seção no pilar-parede (kN e kN·m; N > 0 compressão; eixos globais; Mz anti-horário + visto de cima). */
export interface ForcasSecao { N: number; Vx: number; Vy: number; Mx: number; My: number; Mz: number }

/** Índices (em `Modelo3`) dos elementos do conjunto abaixo da seção ou entre duas seções: cascas, faixas axiais e barras. */
export interface ElementosDoLance { cascas: number[]; axiais: number[]; barras: number[] }

/** Elementos preparados (rigidez das cascas e transformação das barras), reaproveitados em todos os casos. */
export interface ElementosPreparados { el: ElementosDoLance; cas: Map<number, ElementoCasca>; bar: Map<number, ElementoBarra> }

export function prepararElementos(m: Modelo3, el: ElementosDoLance): ElementosPreparados {
  const cas = new Map<number, ElementoCasca>(), bar = new Map<number, ElementoBarra>();
  for (const k of el.cascas) cas.set(k, rigidezCasca(m.nos, m.cascas![k]));
  for (const bi of el.barras) bar.set(bi, elementoBarra(m, m.barras[bi], [], []));
  return { el, cas, bar };
}

/**
 * Forças que os nós fazem nos elementos preparados (6 por nó, eixos globais) para os deslocamentos `u` e o caso (pressões
 * das cascas). `fBarras` são os esforços de extremidade locais das barras (`Resultado3.esforcos[ic]`).
 */
export function forcasNosDosElementos(m: Modelo3, pr: ElementosPreparados, u: ArrayLike<number>, caso: Pick<Caso3, 'pressoes'> | undefined, fBarras: ArrayLike<ArrayLike<number>> | undefined): Float64Array {
  const f = new Float64Array(m.nos.length * 6);
  for (const [k, ce] of pr.cas) {
    let q = 0;
    for (const p of caso?.pressoes ?? []) if (p.casca === k) q += p.q;
    esforcosCasca(ce, u, q, f);
  }
  for (const i of pr.el.axiais) {
    const ax = m.axiaisMedios![i];
    let d = 0;
    ax.dofs.forEach((g, a) => (d += ax.c[a] * u[g]));
    const N = ax.k * d;
    ax.dofs.forEach((g, a) => (f[g] += ax.c[a] * N));
  }
  for (const [bi, e] of pr.bar) {
    const fl = fBarras?.[bi];
    if (!fl) continue;
    for (let a = 0; a < 12; a++) { let s = 0; for (let r = 0; r < 12; r++) s += e.T[r][a] * fl[r]; f[e.dofs[a]] += s; }
  }
  return f;
}

/** Resultante das forças `f` dos nós `nos` em torno de (O, cota do corte): mesma convenção das reações da base. `sinal` −1 inverte (topo). */
export function resultanteDoCorte(m: Modelo3, f: ArrayLike<number>, nos: number[], O: [number, number], sinal: 1 | -1 = 1): ForcasSecao {
  const r: ForcasSecao = { N: 0, Vx: 0, Vy: 0, Mx: 0, My: 0, Mz: 0 };
  for (const n of nos) {
    const x = m.nos[n][0] - O[0], y = m.nos[n][1] - O[1], Fx = f[n * 6], Fy = f[n * 6 + 1], Fz = f[n * 6 + 2];
    r.N += Fz; r.Vx += Fx; r.Vy += Fy;
    r.Mx += f[n * 6 + 3] + y * Fz; r.My += f[n * 6 + 4] - x * Fz; r.Mz += f[n * 6 + 5] + x * Fy - y * Fx;
  }
  for (const k of ['N', 'Vx', 'Vy', 'Mx', 'My', 'Mz'] as const) r[k] *= sinal;
  return r;
}

/** Nós dos elementos do conjunto (de cascas, barras e faixas axiais) na menor e na maior cota, com as cotas. */
export function nosDeCorte(m: Modelo3, el: ElementosDoLance, tol = 1e-3): { base: number[]; topo: number[]; zBase: number; zTopo: number } {
  const nos = new Set<number>();
  for (const k of el.cascas) for (const n of m.cascas![k].nos) nos.add(n);
  for (const bi of el.barras) { nos.add(m.barras[bi].i); nos.add(m.barras[bi].j); }
  for (const i of el.axiais) for (const g of m.axiaisMedios![i].dofs) nos.add((g - (g % 6)) / 6);
  const zs = [...nos].map((n) => m.nos[n][2]), zBase = Math.min(...zs), zTopo = Math.max(...zs);
  return { base: [...nos].filter((n) => m.nos[n][2] < zBase + tol), topo: [...nos].filter((n) => m.nos[n][2] > zTopo - tol), zBase, zTopo };
}

/** Carga externa nodal própria de um elemento do lance (peso próprio e empuxo), aplicada num nó (força global). */
export interface CargaPropria { caso: number; no: number; f: [number, number, number] }

/** Cargas externas nodais próprias das cascas `conj` (peso próprio nos nós do meio dos lados e empuxo), por caso. */
export function cargasProprias(pa: ParedesNoPortico | undefined, m: Modelo3, conj: Set<number>): CargaPropria[] {
  const out: CargaPropria[] = [];
  if (!pa) return out;
  for (const e of pa.info) if (conj.has(e.k) && e.peso) for (const n of m.cascas![e.k].nos.slice(3)) out.push({ caso: pa.iG, no: n, f: [0, 0, -e.peso / 3] });
  for (const c of pa.cargasProprias) if (conj.has(c.k)) out.push({ caso: c.caso, no: c.no, f: [c.f[0], c.f[1], 0] });
  return out;
}

/**
 * Seções de um lance (base e topo) para um caso. As cargas próprias do lance aplicadas nos nós do corte (`proprias` do caso)
 * pertencem ao lance, não à parte vizinha: na base a seção é a força que os nós fazem nos elementos menos essa carga (inclui o
 * peso do lance nos nós do corte); no topo (sinal invertido) soma-se. Na base apoiada, a base coincide com a reação.
 */
export function secoesDoLance(m: Modelo3, pr: ElementosPreparados, corte: ReturnType<typeof nosDeCorte>, proprias: CargaPropria[], O: [number, number], u: ArrayLike<number>, caso: Pick<Caso3, 'pressoes'> | undefined, fBarras: ArrayLike<ArrayLike<number>> | undefined): { base: ForcasSecao; topo: ForcasSecao } {
  const f = forcasNosDosElementos(m, pr, u, caso, fBarras), fb = Float64Array.from(f), ft = Float64Array.from(f), noBase = new Set(corte.base), noTopo = new Set(corte.topo);
  for (const c of proprias) for (let g = 0; g < 3; g++) {
    if (noBase.has(c.no)) fb[c.no * 6 + g] -= c.f[g];
    if (noTopo.has(c.no)) ft[c.no * 6 + g] -= c.f[g];
  }
  return { base: resultanteDoCorte(m, fb, corte.base, O), topo: resultanteDoCorte(m, ft, corte.topo, O, -1) };
}
