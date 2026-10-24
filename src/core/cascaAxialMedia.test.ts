// E6d (K1.4.30): parcela axial uniforme das paredes (AxialMedio3) — EA × f no modo de deformação uniforme da seção,
// flexão no plano, cisalhamento e placa brutos. Conferido com solução analítica, simetria e equilíbrio.
import { describe, expect, it } from 'vitest';
import { resolver3, type AxialMedio3, type Caso3, type Modelo3, type V3 } from './fe3d';
import type { Casca3 } from './casca';
import { paraT6 } from './geom/malhaTri';
import type { P } from './geom/faces';

const E = 3e7, nu = 0.2, t = 0.2, L = 4, H = 6, nx = 8, nz = 12;

/** Parede L × H no plano XZ (z vertical), malha estruturada T6 com diagonais alternadas, e as faixas por linha da grade. */
function parede() {
  const pontos: P[] = [], tris: [number, number, number][] = [];
  const id = (i: number, j: number) => j * (nx + 1) + i;
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) pontos.push([(i / nx) * L, (j / nz) * H]);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const p = [id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)];
    if ((i + j) % 2) tris.push([p[0], p[1], p[2]], [p[0], p[2], p[3]]); else tris.push([p[0], p[1], p[3]], [p[1], p[2], p[3]]);
  }
  const t6 = paraT6({ pontos, tris });
  return { nos: t6.pontos.map((q) => [q[0], 0, q[1]] as V3), tris: t6.tris };
}

/** Faixas axiais da parede (mesma regra de `incluirParedes`): pesos E·t·ℓ·φ das arestas das linhas inferior e superior. */
function faixas(nos: V3[], tris: number[][], f: number): AxialMedio3[] {
  const dz = H / nz, out: AxialMedio3[] = [];
  for (let j = 0; j < nz; j++) {
    const z0 = j * dz, z1 = z0 + dz, sup = new Map<number, number>(), inf = new Map<number, number>(), cascas: number[] = [];
    let EA = 0;
    tris.forEach((tr, k) => {
      const zc = (nos[tr[0]][2] + nos[tr[1]][2] + nos[tr[2]][2]) / 3;
      if (zc < z0 || zc > z1) return;
      cascas.push(k);
      for (const [a, b, m] of [[0, 1, 3], [1, 2, 4], [2, 0, 5]]) {
        const pa = nos[tr[a]], pb = nos[tr[b]];
        if (Math.abs(pa[2] - pb[2]) > 1e-9) continue;
        const mp = Math.abs(pa[2] - z1) < 1e-9 ? sup : Math.abs(pa[2] - z0) < 1e-9 ? inf : null;
        if (!mp) continue;
        const w = E * t * Math.abs(pb[0] - pa[0]);
        if (mp === inf) EA += w;
        for (const [q, fr] of [[a, 1 / 6], [m, 2 / 3], [b, 1 / 6]]) mp.set(tr[q], (mp.get(tr[q]) ?? 0) + w * fr);
      }
    });
    const dofs: number[] = [], c: number[] = [];
    for (const [n, w] of sup) { dofs.push(n * 6 + 2); c.push(w / EA); }
    for (const [n, w] of inf) { dofs.push(n * 6 + 2); c.push(-w / EA); }
    out.push({ dofs, c, k: ((f - 1) * EA) / dz, cascas: cascas.map((casca) => ({ casca, fator: (E * t) / EA })) });
  }
  return out;
}

type Modo = 'media' | 'orto';
/** Resolve a parede: `modo` media = parcela axial uniforme (E6d); orto = membrana ortótropa (E5j). Base engastada (ou livre ao Poisson). */
function resolve(f: number, modo: Modo, cargas: (topo: number[], nos: V3[]) => Caso3, basePoisson = false) {
  const { nos, tris } = parede();
  const mod: Modelo3 = {
    nos, barras: [], apoios: new Map(),
    cascas: tris.map((tr) => ({ nos: tr, E, nu, h: t, ...(modo === 'orto' && f !== 1 ? { fAxial: f } : {}) }) as Casca3),
    ...(modo === 'media' && f !== 1 ? { axiaisMedios: faixas(nos, tris, f) } : {}),
  };
  const topo: number[] = [];
  nos.forEach((p, i) => {
    // problema plano (XZ): uy, rx, rz presos em todos os nós; base engastada (ou só uz e ux de um nó, sem restrição de Poisson)
    if (Math.abs(p[2]) < 1e-9) mod.apoios.set(i, basePoisson ? (Math.abs(p[0]) < 1e-9 ? [0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5]) : [0, 1, 2, 3, 4, 5]);
    else mod.apoios.set(i, [1, 3, 4, 5]);
    if (Math.abs(p[2] - H) < 1e-9) topo.push(i);
  });
  topo.sort((a, b) => nos[a][0] - nos[b][0]);
  const r = resolver3(mod, [cargas(topo, nos)]);
  expect(r.erro).toBeUndefined();
  return { r, topo, nos, tris };
}

/** Força linear uniforme q (kN/m, z) no topo: forças consistentes das arestas quadráticas. */
const uniforme = (q: number) => (topo: number[], nos: V3[]): Caso3 => {
  const caso: Caso3 = { nodais: [], distribuidas: [] };
  for (let k = 0; k + 2 < topo.length; k += 2) {
    const [a, m, b] = [topo[k], topo[k + 1], topo[k + 2]], Ls = nos[b][0] - nos[a][0];
    caso.nodais.push({ no: a, f: [0, 0, (q * Ls) / 6, 0, 0, 0] }, { no: m, f: [0, 0, (q * Ls * 4) / 6, 0, 0, 0] }, { no: b, f: [0, 0, (q * Ls) / 6, 0, 0, 0] });
  }
  return caso;
};
/** Forças nodais no topo em x dado (fx, fz). */
const pontual = (fs: { x: number; fx?: number; fz?: number }[]) => (topo: number[], nos: V3[]): Caso3 => ({
  distribuidas: [],
  nodais: fs.map(({ x, fx = 0, fz = 0 }) => ({ no: topo.find((i) => Math.abs(nos[i][0] - x) < 1e-9)!, f: [fx, 0, fz, 0, 0, 0] })),
});

/** Força normal total (kN, tração > 0) na faixa j: Σ Ny·área/Δz (Ny linear no elemento: centroide × área é exato). */
function normalNaFaixa(r: ReturnType<typeof resolve>, j: number): number {
  const dz = H / nz;
  let N = 0;
  r.tris.forEach((tr, k) => {
    const [p0, p1, p2] = [r.nos[tr[0]], r.nos[tr[1]], r.nos[tr[2]]], zc = (p0[2] + p1[2] + p2[2]) / 3;
    if (zc < j * dz || zc > (j + 1) * dz) return;
    const area = Math.abs((p1[0] - p0[0]) * (p2[2] - p0[2]) - (p2[0] - p0[0]) * (p1[2] - p0[2])) / 2;
    N += (r.r.cascas![0][k][1] * area) / dz;
  });
  return N;
}

describe('parede: parcela axial uniforme (AxialMedio3, E6d, K1.4.30)', () => {
  it('compressão uniforme: encurtamento = q·H/(f·E·t) (analítico), Ny = q em todos os elementos e Σ reações = −q·L', () => {
    for (const f of [1, 2, 3]) {
      const q = -100, s = resolve(f, 'media', uniforme(q), true);
      const esperado = (q * H) / (f * E * t);
      for (const i of s.topo) expect(s.r.desloc[0][i * 6 + 2] / esperado).toBeCloseTo(1, 6);
      for (const e of s.r.cascas![0]) expect(e[1] / q).toBeCloseTo(1, 6);
      const Rz = [...s.r.reacoes[0].values()].reduce((a, v) => a + v[2], 0);
      expect(Rz / (-q * L)).toBeCloseTo(1, 9);
    }
  });

  it('força lateral no topo: deslocamentos e esforços iguais aos de f = 1 (a membrana ortótropa majora a flexão)', () => {
    const V = 100, carga = pontual([{ x: 0, fx: V / 2 }, { x: L, fx: V / 2 }]);
    const base = resolve(1, 'media', carga), novo = resolve(3, 'media', carga), orto = resolve(3, 'orto', carga);
    const uTopo = (s: typeof base) => s.r.desloc[0][s.topo[0] * 6];
    expect(Math.abs(uTopo(novo) / uTopo(base) - 1)).toBeLessThan(1e-9);
    expect(uTopo(orto) / uTopo(base)).toBeLessThan(0.9);
    base.r.cascas![0].forEach((e, k) => { for (const g of [0, 1, 2]) expect(Math.abs(novo.r.cascas![0][k][g] - e[g])).toBeLessThan(1e-7 * V); });
    // momento na base = V·H (isostático) e esforço normal nulo em toda faixa
    const My = [...novo.r.reacoes[0].entries()].reduce((a, [n, v]) => a + v[4] - (novo.nos[n][0] - L / 2) * v[2], 0);
    expect(Math.abs(My)).toBeCloseTo(V * H, 6);
    for (let j = 0; j < nz; j++) expect(Math.abs(normalNaFaixa(novo, j))).toBeLessThan(1e-6 * V);
  });

  it('carga vertical excêntrica: o giro do topo (flexão no plano) não muda com f; o encurtamento médio cai para 1/f; N = P em toda faixa', () => {
    const P = -300, carga = pontual([{ x: L / 4, fz: P }]);
    const base = resolve(1, 'media', carga), novo = resolve(3, 'media', carga), orto = resolve(3, 'orto', carga);
    const giro = (s: typeof base) => s.r.desloc[0][s.topo.at(-1)! * 6 + 2] - s.r.desloc[0][s.topo[0] * 6 + 2];
    const media = (s: typeof base) => (s.r.desloc[0][s.topo.at(-1)! * 6 + 2] + s.r.desloc[0][s.topo[0] * 6 + 2]) / 2;
    expect(Math.abs(giro(novo) / giro(base) - 1)).toBeLessThan(1e-9);
    expect(Math.abs(giro(orto) / giro(base) - 1)).toBeGreaterThan(0.2);
    // a parte simétrica (P/2 em L/4 e em 3L/4) tem o encurtamento médio dividido por f (à parte do pico local junto à carga)
    const sim = (f: number) => resolve(f, 'media', pontual([{ x: L / 4, fz: P / 2 }, { x: (3 * L) / 4, fz: P / 2 }]));
    expect(media(novo) - media(base)).toBeCloseTo(media(sim(3)) - media(sim(1)), 12);
    // equilíbrio: cada faixa leva N = P (casca + excedente distribuído pela tensão uniforme, sem pico)
    for (let j = 0; j < nz; j++) expect(normalNaFaixa(novo, j) / P).toBeCloseTo(1, 6);
    const Rz = [...novo.r.reacoes[0].values()].reduce((a, v) => a + v[2], 0);
    expect(Rz / -P).toBeCloseTo(1, 9);
  });
});
