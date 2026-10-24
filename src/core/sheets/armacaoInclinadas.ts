// Pranchas das lajes inclinadas (E5a; C7.76, C7.94, C7.95, C7.129, C7.142, C7.195): dobramento da barra ao lado dela, marca do
// ponto de dobra, comprimentos parciais de cada lado da dobra e croqui do pavimento nas formas. A geometria vem de
// `building/planos.ts` (`dobraDaBarra`, `marcaDeDobra`, `croquiPavimento`); aqui só se monta o desenho (primitivas) e o comprimento real.
import type { BuildingModel } from '../building/types';
import type { Dimensionamento } from '../building/dimensionamento';
import { dobraDaBarra, marcaDeDobra } from '../building/planos';
import { cmInt, nf } from './armacao';
import type { Camada, P, Prim } from './prancha';

/** Ângulo de texto legível (−90°, 90°] e normal à esquerda do texto. */
function angLegivel(a: P, z: P) {
  let ang = (Math.atan2(z[1] - a[1], z[0] - a[0]) * 180) / Math.PI;
  if (ang > 90.01) ang -= 180; else if (ang <= -89.99) ang += 180;
  const r = (ang * Math.PI) / 180;
  return { ang, n: [-Math.sin(r), Math.cos(r)] as P };
}

export interface DobraDesenhada {
  /** Primitivas (m do modelo): marca em cada dobra, perfil desdobrado ao lado da barra, comprimentos parciais e ângulo. Vazio sem dobra. */
  prims: Prim[];
  /** Comprimento real (inclinado) da barra entre as pontas (m) e a distância em planta (m). */
  real: number; horizontal: number;
  /** Número de dobras e perfil desdobrado (x ao longo da barra, z do plano; m), para conferência. */
  dobras: number; perfil: P[];
}

/**
 * Desenho da barra `a`→`z` (planta, m) sobre panos de planos diferentes. O perfil é a barra desdobrada ao lado dela (lado oposto ao
 * rótulo): abscissa em planta, desnível do plano na direção afastada da barra, sem exagero vertical, de modo que o comprimento do
 * perfil é o comprimento real somado dos trechos. Cada trecho recebe o comprimento parcial (cm) e cada dobra, o ângulo e a marca
 * (traço perpendicular ao eixo, 4 mm no papel). `k` = m do modelo por mm do papel.
 */
export function desenharDobra(b: BuildingModel, grupo: string, a: P, z: P, k: number, camada: Camada): DobraDesenhada {
  const L = Math.hypot(z[0] - a[0], z[1] - a[1]);
  if (L < 1e-9) return { prims: [], real: 0, horizontal: 0, dobras: 0, perfil: [] };
  const d = dobraDaBarra(b, grupo, a, z), real = d.trechos.length ? d.total : L;
  if (!d.dobras.length) return { prims: [], real, horizontal: L, dobras: 0, perfil: [] };
  const u: P = [(z[0] - a[0]) / L, (z[1] - a[1]) / L], { ang, n } = angLegivel(a, z), off = 5 * k;
  const em = (s: number, h: number): P => [a[0] + u[0] * s - n[0] * (off + h), a[1] + u[1] * s - n[1] * (off + h)];
  const prims: Prim[] = [];
  const perfil: P[] = [[0, 0]];
  const pts: P[] = [em(0, 0)];
  let s = 0, h = 0;
  for (const t of d.trechos) {
    const Lh = Math.hypot(t.z[0] - t.a[0], t.z[1] - t.a[1]), s1 = s + Lh, h1 = h + t.inclinacao * Lh;
    pts.push(em(s1, h1)); perfil.push([s1, h1]);
    const m = em((s + s1) / 2, (h + h1) / 2);
    prims.push({ t: 'txt', c: 'TEXTO', p: [m[0] - n[0] * 0.8 * k, m[1] - n[1] * 0.8 * k], h: 1.6 * k, s: String(cmInt(t.comprimento)), ang, ah: 'c', av: 'topo' });
    s = s1; h = h1;
  }
  prims.push({ t: 'pl', c: camada, pts });
  for (const db of d.dobras) {
    prims.push({ t: 'pl', c: camada, pts: marcaDeDobra(db.ponto, u, 4 * k) });
    const sd = Math.hypot(db.ponto[0] - a[0], db.ponto[1] - a[1]), hd = perfil.find((q) => Math.abs(q[0] - sd) < 1e-6)?.[1] ?? 0, q = em(sd, hd);
    prims.push({ t: 'pl', c: 'COTA', pts: [db.ponto, q] });
    prims.push({ t: 'txt', c: 'TEXTO', p: [q[0] - n[0] * 3 * k, q[1] - n[1] * 3 * k], h: 1.4 * k, s: `${nf(db.angulo, 1)}°`, ang, ah: 'c', av: 'topo' });
  }
  return { prims, real, horizontal: L, dobras: d.dobras.length, perfil };
}

/** Comprimento a mais, em metros, que o traçado real tem sobre o traçado em planta (0 sem inclinação). */
export const acrescimoReal = (b: BuildingModel, grupo: string, a: P, z: P): number => {
  const L = Math.hypot(z[0] - a[0], z[1] - a[1]);
  if (L < 1e-9) return 0;
  const d = dobraDaBarra(b, grupo, a, z);
  return d.trechos.length ? Math.max(0, d.total - L) : 0;
};

export interface BarraAlveolarInclinada { laje: string; nome: string; ponta: 0 | 1; a: P; z: P; phi: number; s: number; barras: number; repeticoes: number }
/**
 * Negativos na capa das alveolares inclinadas (C7.142) que cruzam a linha de um plano a outro: a barra representativa (placa do meio
 * do pano) do apoio para dentro do vão, com o comprimento do negativo; só as que têm dobra entram (as demais seguem no quantitativo
 * das alveolares). `a` = apoio. [a confirmar: negativos[0] no início e [1] no fim do eixo da placa.]
 */
export function barrasAlveolaresDobradas(b: BuildingModel, grupo: string, dim: Pick<Dimensionamento, 'alveolares'>): BarraAlveolarInclinada[] {
  const out: BarraAlveolarInclinada[] = [];
  for (const r of dim.alveolares ?? []) {
    const l = b.lajes.find((x) => x.id === r.laje);
    if (!l || l.grupo !== grupo || !r.placas.length) continue;
    const pl = r.placas[Math.floor(r.placas.length / 2)], L = Math.hypot(pl.z[0] - pl.a[0], pl.z[1] - pl.a[1]);
    if (L < 1e-9) continue;
    const u: P = [(pl.z[0] - pl.a[0]) / L, (pl.z[1] - pl.a[1]) / L];
    ([0, 1] as const).forEach((ponta) => {
      const ng = r.negativos[ponta];
      if (!ng) return;
      const o = ponta === 0 ? pl.a : pl.z, sg = ponta === 0 ? 1 : -1, f: P = [o[0] + sg * u[0] * ng.comprimento, o[1] + sg * u[1] * ng.comprimento];
      if (dobraDaBarra(b, grupo, o, f).dobras.length) out.push({ laje: r.laje, nome: r.nome, ponta, a: o, z: f, phi: ng.phi, s: ng.s, barras: ng.barras, repeticoes: r.repeticoes });
    });
  }
  return out;
}
