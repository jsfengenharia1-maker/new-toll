// E5j (K1.4.30): casca com rigidez axial própria (fAxial): E_y da membrana × f; placa, cisalhamento e E_x brutos.
import { describe, expect, it } from 'vitest';
import { resolver3, type Caso3, type Modelo3, type V3 } from './fe3d';
import { rigidezCasca, type Casca3 } from './casca';
import { paraT6 } from './geom/malhaTri';
import type { P } from './geom/faces';

const E = 3e7, nu = 0.2, t = 0.2, L = 2, H = 3, nx = 4, ny = 6;

/** Retângulo L × H no plano XY (y vertical), diagonais alternadas. */
function malha() {
  const pontos: P[] = [], tris: [number, number, number][] = [];
  const id = (i: number, j: number) => j * (nx + 1) + i;
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) pontos.push([(i / nx) * L, (j / ny) * H]);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const p = [id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)];
    if ((i + j) % 2) tris.push([p[0], p[1], p[2]], [p[0], p[2], p[3]]); else tris.push([p[0], p[1], p[3]], [p[1], p[2], p[3]]);
  }
  return { pontos, tris };
}

function resolve(fAxial: number | undefined) {
  const t6 = paraT6(malha());
  const mod: Modelo3 = { nos: t6.pontos.map((p) => [p[0], p[1], 0] as V3), barras: [], apoios: new Map(), molas: [], cascas: t6.tris.map((tr) => ({ nos: tr, E, nu, h: t, ...(fAxial ? { fAxial } : {}) }) as Casca3) };
  const topo: number[] = [];
  mod.nos.forEach((p, i) => {
    if (Math.abs(p[1]) < 1e-9) mod.apoios.set(i, Math.abs(p[0]) < 1e-9 ? [0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5]);
    else mod.apoios.set(i, [2, 3, 4, 5]);
    if (Math.abs(p[1] - H) < 1e-9) topo.push(i);
  });
  // compressão uniforme q (kN/m) no topo, sem restrição de Poisson na base
  const q = 100, caso: Caso3 = { nodais: [], distribuidas: [] };
  const ord = topo.slice().sort((a, b) => mod.nos[a][0] - mod.nos[b][0]);
  for (let k = 0; k + 2 < ord.length; k += 2) {
    const [a, m, b] = [ord[k], ord[k + 1], ord[k + 2]], Ls = mod.nos[b][0] - mod.nos[a][0];
    caso.nodais.push({ no: a, f: [0, (-q * Ls) / 6, 0, 0, 0, 0] }, { no: m, f: [0, (-q * Ls * 4) / 6, 0, 0, 0, 0] }, { no: b, f: [0, (-q * Ls) / 6, 0, 0, 0, 0] });
  }
  const r = resolver3(mod, [caso]);
  expect(r.erro).toBeUndefined();
  return { r, topo, q };
}

describe('casca: rigidez axial própria da membrana (fAxial, E5j, K1.4.30)', () => {
  it('encurtamento uniforme = q·H/(f·E·t) (analítico) com f = 1, 2 e 3', () => {
    for (const f of [undefined, 2, 3]) {
      const { r, topo, q } = resolve(f);
      const esperado = (-q * H) / ((f ?? 1) * E * t);
      for (const i of topo) expect(r.desloc[0][i * 6 + 1] / esperado).toBeCloseTo(1, 6);
    }
  });

  it('f = 1 é idêntico ao isótropo; a placa não muda com f e a membrana sim', () => {
    const P3 = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0.5, 0, 0], [0.5, 0.5, 0], [0, 0.5, 0]] as V3[];
    const base: Casca3 = { nos: [0, 1, 2, 3, 4, 5], E, nu, h: t };
    const k1 = rigidezCasca(P3, base).K, k3 = rigidezCasca(P3, { ...base, fAxial: 3 }).K, k1b = rigidezCasca(P3, { ...base, fAxial: 1 }).K;
    expect(Array.from(k1b)).toEqual(Array.from(k1));
    const n = 36, placa = (g: number) => g >= 2 && g <= 4;
    let difMembrana = 0;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      const d = Math.abs(k3[a * n + b] - k1[a * n + b]);
      if (placa(a % 6) && placa(b % 6)) expect(d).toBeLessThan(1e-9 * (1 + Math.abs(k1[a * n + b])));
      else difMembrana = Math.max(difMembrana, d);
    }
    expect(difMembrana).toBeGreaterThan(1);
  });
});
