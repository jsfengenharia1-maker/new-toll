// Vento pela NBR 6123:1988 (premissa 18): Vk = V0·S1·S2·S3, q = 0,613·Vk², F = Ca·q·Ae por pavimento,
// em 4 direções e com excentricidade ± e·largura (item 6.6). Valores das tabelas a confirmar na norma.
import { centroPilar, contornoPilar, pavimentosOrdenados, secaoNoLance, lancesDoPilar, VENTO_PADRAO, type BuildingModel, type CategoriaVento, type Vento } from './types';

/** Parâmetros de S2 (NBR 6123, Tabela 1) [a confirmar]: b e p por classe A, B, C; Fr da categoria II. */
export const S2_PARAM: Record<CategoriaVento, { b: number; p: [number, number, number] }> = {
  I: { b: 1.1, p: [0.06, 0.065, 0.07] },
  II: { b: 1.0, p: [0.085, 0.09, 0.1] },
  III: { b: 0.94, p: [0.1, 0.105, 0.115] },
  IV: { b: 0.86, p: [0.12, 0.125, 0.135] },
  V: { b: 0.74, p: [0.15, 0.16, 0.175] },
};
export const FR = [1.0, 0.98, 0.95];

export type Classe = 'A' | 'B' | 'C';
/** Classe pela maior dimensão horizontal ou vertical (m): A até 20, B até 50, C acima. */
export const classeVento = (maiorDimensao: number): Classe => (maiorDimensao <= 20 ? 'A' : maiorDimensao <= 50 ? 'B' : 'C');

export function s2(cat: CategoriaVento, classe: Classe, z: number): number {
  const k = ['A', 'B', 'C'].indexOf(classe), par = S2_PARAM[cat];
  return par.b * FR[k] * Math.pow(Math.max(z, 0) / 10, par.p[k]);
}

export interface ForcaPavimento { pavimento: string; z: number; altura: number; largura: number; s2: number; vk: number; q: number; F: number; Mz: number }
export interface CasoVento { nome: string; direcao: 0 | 90 | 180 | 270; exc: -1 | 0 | 1; forcas: ForcaPavimento[] }

/** Contorno em planta de cada pavimento (lajes, vigas e pilares), para larguras de fachada e centros. */
function extensoes(b: BuildingModel, pav: string) {
  const p = b.pavimentos.find((x) => x.id === pav)!;
  const pts: [number, number][] = [];
  for (const l of b.lajes) if (l.grupo === p.grupo) pts.push(...l.contorno);
  for (const v of b.vigas) if (v.grupo === p.grupo) pts.push(...v.pontos);
  for (const q of b.pilares) if (lancesDoPilar(b, q).some((x) => x.id === pav)) pts.push(...contornoPilar(q, secaoNoLance(q, pav)), centroPilar(q, q.secao));
  if (!pts.length) return null;
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/**
 * Casos de vento: forças por pavimento (kN) e momento de torção (kN·m) em relação a `centro(pav)`
 * (o ponto onde as forças serão aplicadas: o mestre do diafragma). z é a altura sobre o pavimento mais baixo.
 */
export function casosVento(b: BuildingModel, centro: (pav: string) => [number, number]): { casos: CasoVento[]; classe: Classe; altura: number } {
  const v: Vento = b.vento ?? VENTO_PADRAO;
  const ps = pavimentosOrdenados(b);
  const z0 = ps[0]?.cota ?? 0, H = (ps.at(-1)?.cota ?? 0) - z0;
  const ext = ps.map((p) => extensoes(b, p.id));
  const dims = ext.filter((e): e is NonNullable<typeof e> => !!e).flatMap((e) => [e.x1 - e.x0, e.y1 - e.y0]);
  const classe = classeVento(Math.max(H, ...dims, 0));
  const casos: CasoVento[] = [];
  if (!v.ativo || !ps.length) return { casos, classe, altura: H };
  for (const direcao of [0, 90, 180, 270] as const) for (const exc of [0, 1, -1] as const) {
    const emX = direcao === 0 || direcao === 180, sinal = direcao === 0 || direcao === 90 ? 1 : -1;
    const forcas: ForcaPavimento[] = [];
    ps.forEach((p, i) => {
      const e = ext[i];
      const z = p.cota - z0;
      if (!e || z <= 0) return;
      const zAbaixo = ps[i - 1].cota - z0, zAcima = i + 1 < ps.length ? ps[i + 1].cota - z0 : z;
      const altura = (zAcima - zAbaixo) / 2;
      const largura = emX ? e.y1 - e.y0 : e.x1 - e.x0;
      const S2 = s2(v.categoria, classe, z), vk = v.v0 * v.s1 * S2 * v.s3, q = (0.613 * vk * vk) / 1000; // kN/m²
      const F = (emX ? v.caX : v.caY) * q * largura * altura;
      // força aplicada no meio da fachada (+ excentricidade), momento em relação ao centro do diafragma
      const [cx, cy] = centro(p.id);
      const meio = emX ? (e.y0 + e.y1) / 2 : (e.x0 + e.x1) / 2;
      const linha = meio + exc * v.excentricidade * largura;
      const Fx = emX ? sinal * F : 0, Fy = emX ? 0 : sinal * F;
      const Mz = emX ? -(linha - cy) * Fx : (linha - cx) * Fy;
      forcas.push({ pavimento: p.id, z, altura, largura, s2: S2, vk, q, F: sinal * F, Mz });
    });
    casos.push({ nome: `W${direcao}°${exc ? (exc > 0 ? '+e' : '−e') : ''}`, direcao, exc, forcas });
  }
  return { casos, classe, altura: H };
}
