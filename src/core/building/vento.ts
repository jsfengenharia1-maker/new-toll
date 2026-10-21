// Vento pela NBR 6123:1988 (premissa 18): Vk = V0·S1·S2·S3, q = 0,613·Vk², F = Ca·q·Ae por pavimento,
// em 4 direções e com excentricidade ± e·largura (item 6.6). Valores das tabelas a confirmar na norma.
import { caDoAbaco, vizinhancaDoAbaco, abacoCaPreenchido, abacoVizPreenchido } from './abacosVento';
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

/**
 * Força de vento de um pavimento numa zona. `altura` = faixa de exposição (meia altura de cada lado + platibanda no último);
 * `larguraCorrigida` = b′ = b·(2a + h)/h do último pavimento com platibanda de altura a (h = pé-direito), que aplicada à
 * meia faixa h/2 dá a mesma área de exposição b·(h/2 + a); nos demais, igual à largura.
 */
export interface ForcaPavimento { pavimento: string; zona: number; z: number; altura: number; largura: number; larguraCorrigida: number; s2: number; vk: number; q: number; F: number; Mz: number }
/** Ca e fator de vizinhança em uso por eixo: `auto` = vieram dos ábacos digitados. */
export interface CoefVento { x: number; y: number; auto: boolean }
export interface CasoVento { nome: string; direcao: 0 | 90 | 180 | 270; exc: -1 | 0 | 1; forcas: ForcaPavimento[] }

/** Zona independente de um pavimento (diafragma próprio): extensão dos nós e ponto de aplicação. */
export interface ZonaVento { x0: number; x1: number; y0: number; y1: number; cx: number; cy: number }

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
 * Casos de vento: forças por pavimento (kN) e momentos de torção (kN·m) por zona independente, em relação ao
 * ponto de aplicação da zona. A força do pavimento (largura de banda = fachada inteira) é repartida entre as zonas
 * na proporção da largura de cada uma, perpendicular ao vento (Bi = bi/Σb·B; sem largura, partes iguais).
 * z é a altura sobre o pavimento mais baixo; a platibanda soma-se à faixa do último pavimento.
 */
export function casosVento(b: BuildingModel, zonas: (pav: string) => ZonaVento[]): { casos: CasoVento[]; classe: Classe; altura: number; ca: CoefVento; viz: CoefVento; avisos: string[] } {
  const v: Vento = b.vento ?? VENTO_PADRAO;
  const ps = pavimentosOrdenados(b);
  const z0 = ps[0]?.cota ?? 0, H = (ps.at(-1)?.cota ?? 0) - z0;
  const ext = ps.map((p) => extensoes(b, p.id));
  const dims = ext.filter((e): e is NonNullable<typeof e> => !!e).flatMap((e) => [e.x1 - e.x0, e.y1 - e.y0]);
  const classe = classeVento(Math.max(H, ...dims, 0));
  const casos: CasoVento[] = [];
  const avisos: string[] = [];
  // dimensões da planta (envoltória de todos os pavimentos): l1 perpendicular ao vento, l2 paralela [a confirmar na figura da norma]
  const envs = ext.filter((e): e is NonNullable<typeof e> => !!e);
  const lx = envs.length ? Math.max(...envs.map((e) => e.x1)) - Math.min(...envs.map((e) => e.x0)) : 0, ly = envs.length ? Math.max(...envs.map((e) => e.y1)) - Math.min(...envs.map((e) => e.y0)) : 0;
  // Ca por eixo: informado ou do ábaco digitado (só com a tabela preenchida)
  const caEixo = (emX: boolean) => {
    const manual = emX ? v.caX : v.caY;
    if (!v.caAuto) return manual;
    const t = v.caAuto === 1 ? 1 : 2, l1 = emX ? ly : lx, l2 = emX ? lx : ly;
    const r = l1 > 0 && l2 > 0 ? caDoAbaco(v.abacos, t, H / l1, l1 / l2) : null;
    if (!r) { avisos.push(`Ca automático (${t === 1 ? 'baixa' : 'alta'} turbulência) sem tabela de pontos preenchida: usado o Ca informado (${String(manual).replace('.', ',')}).`); return manual; }
    if (r.fora) avisos.push(`Ca do ábaco ${emX ? 'em X' : 'em Y'} fora da faixa de pontos digitada (h/l1 = ${(H / l1).toFixed(2)}; l1/l2 = ${(l1 / l2).toFixed(2)}): usado o valor da ponta da tabela.`);
    return r.y;
  };
  const vizEixo = (emX: boolean) => {
    if (!v.vizAuto) return v.vizinhanca ?? 1;
    const l1 = emX ? ly : lx;
    const r = v.vizDist !== undefined && l1 > 0 ? vizinhancaDoAbaco(v.abacos, v.vizDist / l1) : null;
    if (!r) { avisos.push('Fator de vizinhança automático sem tabela preenchida ou sem distância ao vizinho: usado o fator informado.'); return v.vizinhanca ?? 1; }
    if (r.fora) avisos.push('Fator de vizinhança do ábaco fora da faixa de pontos digitada: usado o valor da ponta.');
    return r.y;
  };
  const ca = { x: caEixo(true), y: caEixo(false) }, fvz = { x: vizEixo(true), y: vizEixo(false) };
  const caInfo: CoefVento = { ...ca, auto: !!v.caAuto && abacoCaPreenchido(v.abacos, v.caAuto === 1 ? 1 : 2) };
  const vizInfo: CoefVento = { ...fvz, auto: !!v.vizAuto && abacoVizPreenchido(v.abacos) && v.vizDist !== undefined };
  if (!v.ativo || !ps.length) return { casos, classe, altura: H, ca: caInfo, viz: vizInfo, avisos: [] };
  const sent = { xp: 1, xn: 1, yp: 1, yn: 1, ...v.sentido };
  for (const direcao of [0, 90, 180, 270] as const) for (const exc of [0, 1, -1] as const) {
    const emX = direcao === 0 || direcao === 180, sinal = direcao === 0 || direcao === 90 ? 1 : -1;
    const coefSentido = direcao === 0 ? sent.xp : direcao === 180 ? sent.xn : direcao === 90 ? sent.yp : sent.yn;
    const forcas: ForcaPavimento[] = [];
    ps.forEach((p, i) => {
      const e = ext[i], zs = zonas(p.id);
      const z = p.cota - z0;
      if (!e || z <= 0 || !zs.length) return;
      const zAbaixo = ps[i - 1].cota - z0, zAcima = i + 1 < ps.length ? ps[i + 1].cota - z0 : z;
      const ultimo = i === ps.length - 1, plat = ultimo ? v.platibanda ?? 0 : 0, hPav = zAcima - zAbaixo;
      const altura = hPav / 2 + plat;
      const largura = emX ? e.y1 - e.y0 : e.x1 - e.x0;
      // largura corrigida b′ = b·(2a + h)/h sobre a meia faixa h/2 (platibanda a): área b·(h/2 + a)
      const larguraCorrigida = plat > 0 && hPav > 1e-9 ? (largura * (2 * plat + hPav)) / hPav : largura;
      const S2 = s2(v.categoria, classe, z), vk = v.v0 * v.s1 * S2 * v.s3, q = (0.613 * vk * vk) / 1000; // kN/m²
      const F = (emX ? ca.x : ca.y) * (emX ? fvz.x : fvz.y) * coefSentido * q * larguraCorrigida * (hPav / 2);
      // repartição entre zonas pela largura perpendicular ao vento
      const bz = zs.map((zn) => (emX ? zn.y1 - zn.y0 : zn.x1 - zn.x0)), sb = bz.reduce((t, x) => t + x, 0);
      zs.forEach((zn, k) => {
        const Fi = sb > 1e-9 ? (F * bz[k]) / sb : F / zs.length;
        if (Fi <= 0) return;
        // força no meio da zona (+ excentricidade da largura da zona), momento em relação ao ponto de aplicação
        const meio = emX ? (zn.y0 + zn.y1) / 2 : (zn.x0 + zn.x1) / 2, lz = Math.max(bz[k], 0);
        const linha = meio + exc * v.excentricidade * (zs.length > 1 ? lz : largura);
        const Fx = emX ? sinal * Fi : 0, Fy = emX ? 0 : sinal * Fi;
        const Mz = emX ? -(linha - zn.cy) * Fx : (linha - zn.cx) * Fy;
        forcas.push({ pavimento: p.id, zona: k, z, altura, largura: zs.length > 1 ? lz : largura, larguraCorrigida: zs.length > 1 ? lz * (largura > 1e-9 ? larguraCorrigida / largura : 1) : larguraCorrigida, s2: S2, vk, q, F: sinal * Fi, Mz });
      });
    });
    casos.push({ nome: `W${direcao}°${exc ? (exc > 0 ? '+e' : '−e') : ''}`, direcao, exc, forcas });
  }
  return { casos, classe, altura: H, ca: caInfo, viz: vizInfo, avisos };
}
