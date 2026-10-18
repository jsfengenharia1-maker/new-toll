// Biblioteca de perfis metálicos usuais no Brasil (dados próprios).
//
// O que está registrado aqui são SÓ as dimensões nominais de cada perfil, que são dados
// dimensionais padronizados (perfis I de abas paralelas da ASTM A6 na série métrica usada
// no Brasil; tubos circulares nos diâmetros e espessuras nominais da ASME B36.10; tubos
// quadrados e retangulares em medidas comerciais usuais). Nenhuma propriedade de catálogo
// (área, inércia, módulos, raios de giração) foi copiada: todas são CALCULADAS pela geometria
// nominal em `section.ts` / `steel.ts`.
//
// Simplificações (a confirmar com o catálogo do fabricante):
// - perfis I: o raio de concordância entre alma e mesa é desprezado (seção de três retângulos).
//   A área e as inércias calculadas ficam um pouco abaixo das de catálogo (em geral 1 % a 6 %
//   na área), a favor da segurança na resistência e contra ela na rigidez;
// - tubos retangulares: cantos vivos, espessura uniforme (o raio externo dos cantos é desprezado);
// - tubos circulares: anel perfeito de diâmetro externo e espessura nominais.
//
// Unidades das tabelas: mm. Unidades das seções geradas: m (como o resto do núcleo).
import type { SectionShape } from './types';

export const PROFILE_NOTE = 'Propriedades calculadas pela geometria nominal, sem raio de concordância (a confirmar com o catálogo do fabricante).';

export type ProfileFamily = 'W' | 'HP' | 'TC' | 'TR';

export interface CatalogProfile {
  /** Designação, ex.: "W310×38,7", "Tubo Ø114,3×6,02", "TR 200×100×6,3". */
  name: string;
  family: ProfileFamily;
  shape: SectionShape;
  /** Massa nominal da designação (kg/m), quando a designação a traz (W e HP). */
  massNominal?: number;
}

export const FAMILY_LABEL: Record<ProfileFamily, string> = {
  W: 'I laminado W (abas paralelas)',
  HP: 'H laminado HP',
  TC: 'Tubo circular',
  TR: 'Tubo quadrado/retangular',
};

// [massa nominal kg/m, d, bf, tw, tf] em mm — perfis I/H de abas paralelas, série métrica.
type IRow = [number, number, number, number, number];

const W: IRow[] = [
  [13.0, 148, 100, 4.3, 4.9], [18.0, 153, 102, 5.8, 7.1], [22.5, 152, 152, 5.8, 6.6], [24.0, 160, 102, 6.6, 10.3],
  [29.8, 157, 153, 6.6, 9.3], [37.1, 162, 154, 8.1, 11.6],
  [15.0, 200, 100, 4.3, 5.2], [19.3, 203, 102, 5.8, 6.5], [22.5, 206, 102, 6.2, 8.0], [26.6, 207, 133, 5.8, 8.4],
  [31.3, 210, 134, 6.4, 10.2], [35.9, 201, 165, 6.2, 10.2], [41.7, 205, 166, 7.2, 11.8], [46.1, 203, 203, 7.2, 11.0],
  [52.0, 206, 204, 7.9, 12.6], [59.0, 210, 205, 9.1, 14.2], [71.0, 216, 206, 10.2, 17.4], [86.0, 222, 209, 13.0, 20.6],
  [17.9, 251, 101, 4.8, 5.3], [22.3, 254, 102, 5.8, 6.9], [25.3, 257, 102, 6.1, 8.4], [28.4, 260, 102, 6.4, 10.0],
  [32.7, 258, 146, 6.1, 9.1], [38.5, 262, 147, 6.6, 11.2], [44.8, 266, 148, 7.6, 13.0], [73.0, 253, 254, 8.6, 14.2],
  [80.0, 256, 255, 9.4, 15.6], [89.0, 260, 256, 10.7, 17.3], [101.0, 264, 257, 11.9, 19.6], [115.0, 269, 259, 13.5, 22.1],
  [21.0, 303, 101, 5.1, 5.7], [23.8, 305, 101, 5.6, 6.7], [28.3, 309, 102, 6.0, 8.9], [32.7, 313, 102, 6.6, 10.8],
  [38.7, 310, 165, 5.8, 9.7], [44.5, 313, 166, 6.6, 11.2], [52.0, 317, 167, 7.6, 13.2], [97.0, 308, 305, 9.9, 15.4],
  [107.0, 311, 306, 10.9, 17.0], [117.0, 314, 307, 11.9, 18.7],
  [32.9, 349, 127, 5.8, 8.5], [39.0, 353, 128, 6.5, 10.7], [44.0, 352, 171, 6.9, 9.8], [51.0, 355, 171, 7.2, 11.6],
  [57.8, 358, 172, 7.9, 13.1], [64.0, 347, 203, 7.7, 13.5], [72.0, 350, 204, 8.6, 15.1], [79.0, 354, 205, 9.4, 16.8],
  [91.0, 353, 254, 9.5, 16.4], [101.0, 357, 255, 10.5, 18.3], [110.0, 360, 256, 11.4, 19.9], [122.0, 363, 257, 13.0, 21.7],
  [38.8, 399, 140, 6.4, 8.8], [46.1, 403, 140, 7.0, 11.2], [53.0, 403, 177, 7.5, 10.9], [60.0, 407, 178, 7.7, 12.8],
  [67.0, 410, 179, 8.8, 14.4], [75.0, 413, 180, 9.7, 16.0], [85.0, 417, 181, 10.9, 18.2],
  [52.0, 450, 152, 7.6, 10.8], [60.0, 455, 153, 8.0, 13.3], [68.0, 459, 154, 9.1, 15.4], [74.0, 457, 190, 9.0, 14.5],
  [82.0, 460, 191, 9.9, 16.0], [89.0, 463, 192, 10.5, 17.7], [97.0, 466, 193, 11.4, 19.0], [106.0, 469, 194, 12.6, 20.6],
  [66.0, 525, 165, 8.9, 11.4], [72.0, 524, 207, 9.0, 10.9], [74.0, 529, 166, 9.7, 13.6], [82.0, 528, 209, 9.5, 13.3],
  [85.0, 535, 166, 10.3, 16.5], [92.0, 533, 209, 10.2, 15.6], [101.0, 537, 210, 10.9, 17.4], [109.0, 539, 211, 11.6, 18.8],
  [101.0, 603, 228, 10.5, 14.9], [113.0, 608, 228, 11.2, 17.3], [125.0, 612, 229, 11.9, 19.6], [140.0, 617, 230, 13.1, 22.2],
  [155.0, 611, 324, 12.7, 19.0], [174.0, 616, 325, 14.0, 21.6],
];

const HP: IRow[] = [
  [53.0, 204, 207, 11.3, 11.3], [62.0, 246, 256, 10.5, 10.7], [85.0, 254, 260, 14.4, 14.4],
  [79.0, 299, 306, 11.0, 11.0], [93.0, 303, 308, 13.1, 13.1], [110.0, 308, 310, 15.4, 15.5], [125.0, 312, 312, 17.4, 17.4],
];

/** Série nominal (150, 200, …) a partir da altura d. */
function series(d: number) {
  const s = [150, 200, 250, 310, 360, 410, 460, 530, 610];
  return s.reduce((a, b) => (Math.abs(b - d) < Math.abs(a - d) ? b : a));
}

const dec = (v: number, n = 1) => v.toFixed(n).replace('.', ',');

function iProfile(family: 'W' | 'HP', [m, d, bf, tw, tf]: IRow): CatalogProfile {
  return {
    name: `${family}${series(d)}×${dec(m)}`, family, massNominal: m,
    shape: { kind: 'ishape', h: d / 1000, bf: bf / 1000, tw: tw / 1000, tf: tf / 1000 },
  };
}

// Tubos circulares: diâmetro externo × espessura (mm), dimensões nominais ASME B36.10 (Sch 40 / Sch 80).
const TC: [number, number][] = [
  [33.4, 3.38], [42.2, 3.56], [48.3, 3.68], [48.3, 5.08], [60.3, 3.91], [60.3, 5.54], [73.0, 5.16], [88.9, 5.49], [88.9, 7.62],
  [101.6, 5.74], [114.3, 6.02], [114.3, 8.56], [141.3, 6.55], [168.3, 7.11], [168.3, 10.97], [219.1, 8.18], [273.0, 9.27], [323.8, 9.53],
];

// Tubos quadrados e retangulares: altura no plano × largura × espessura (mm), medidas comerciais usuais.
const TR: [number, number, number][] = [
  [50, 50, 2.0], [50, 50, 3.0], [60, 60, 3.0], [60, 60, 4.75], [80, 80, 3.0], [80, 80, 4.75], [80, 80, 6.3],
  [100, 100, 3.75], [100, 100, 4.75], [100, 100, 6.3], [120, 120, 4.75], [120, 120, 6.3],
  [150, 150, 4.75], [150, 150, 6.3], [150, 150, 8.0], [200, 200, 6.3], [200, 200, 8.0], [200, 200, 10.0],
  [100, 50, 3.0], [100, 50, 4.75], [120, 60, 3.0], [120, 60, 4.75], [150, 100, 4.75], [150, 100, 6.3],
  [200, 100, 4.75], [200, 100, 6.3], [250, 150, 6.3], [250, 150, 8.0], [300, 200, 6.3], [300, 200, 8.0], [300, 200, 10.0],
];

const trimDec = (v: number) => String(v).replace('.', ',');

export const PROFILES: CatalogProfile[] = [
  ...W.map((r) => iProfile('W', r)),
  ...HP.map((r) => iProfile('HP', r)),
  ...TC.map(([d, t]): CatalogProfile => ({ name: `Tubo Ø${dec(d)}×${trimDec(t)}`, family: 'TC', shape: { kind: 'tube', d: d / 1000, t: t / 1000 } })),
  ...TR.map(([h, b, t]): CatalogProfile => ({ name: `TR ${h}×${b}×${trimDec(t)}`, family: 'TR', shape: { kind: 'box', h: h / 1000, b: b / 1000, t: t / 1000 } })),
];

export function findProfile(name: string): CatalogProfile | undefined {
  return PROFILES.find((p) => p.name === name);
}

/** Seção (em m) do perfil de catálogo; cópia nova a cada chamada. */
export function profileShape(name: string): SectionShape | null {
  const p = findProfile(name);
  return p ? { ...p.shape } : null;
}

/** Massa linear (kg/m) pela geometria nominal, com ρ = 7850 kg/m³. */
export function profileMass(shape: SectionShape): number {
  let A = 0;
  if (shape.kind === 'ishape') A = 2 * shape.bf * shape.tf + (shape.h - 2 * shape.tf) * shape.tw;
  else if (shape.kind === 'tube') A = (Math.PI * (shape.d ** 2 - (shape.d - 2 * shape.t) ** 2)) / 4;
  else if (shape.kind === 'box') A = shape.b * shape.h - (shape.b - 2 * shape.t) * (shape.h - 2 * shape.t);
  return A * 7850;
}
