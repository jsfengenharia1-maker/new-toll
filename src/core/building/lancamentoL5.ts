// Ferramentas de lançamento de vigas, panos, aberturas e cargas (L5): geometria pura, sem modelo nem comandos.
// Os comandos (`src/core/commands/lancamentoL5.ts`) e a interface usam estas funções, inclusive para a prévia.
import { areaPoligono, dentroPoligono, type P } from '../geom/faces';
import type { BuildingModel } from './types';

const r6 = (v: number) => +v.toFixed(6);
const rp = (q: P): P => [r6(q[0]), r6(q[1])];
/** Lado mínimo (m) de um retângulo de contorno ou abertura. */
export const LADO_MIN = 0.05;
/** Largura padrão (m) e altura da borda "alta" (m) das vigas de borda de abertura [a confirmar]. */
export const BORDA_B = 0.15;
export const BORDA_ALTA_H = 0.4;

const ccw = (c: P[]): P[] => (areaPoligono(c) < 0 ? [...c].reverse() : c);

/**
 * Retângulo (anti-horário, 4 cantos) de um contorno externo ou abertura (C6.51, C7.82).
 * Sem `c3`: lados paralelos aos eixos, com `c1` e `c2` cantos opostos (ângulo zero).
 * Com `c3`: `c1`–`c2` é um lado, em qualquer ângulo, e `c3` está sobre o lado oposto.
 */
export function retanguloPorLado(c1: P, c2: P, c3?: P): P[] | null {
  if (!c3) {
    const x0 = Math.min(c1[0], c2[0]), x1 = Math.max(c1[0], c2[0]), y0 = Math.min(c1[1], c2[1]), y1 = Math.max(c1[1], c2[1]);
    return x1 - x0 < LADO_MIN || y1 - y0 < LADO_MIN ? null : ([[x0, y0], [x1, y0], [x1, y1], [x0, y1]] as P[]).map(rp);
  }
  const L = Math.hypot(c2[0] - c1[0], c2[1] - c1[1]);
  if (L < LADO_MIN) return null;
  const ux = (c2[0] - c1[0]) / L, uy = (c2[1] - c1[1]) / L, nx = -uy, ny = ux;
  const w = (c3[0] - c1[0]) * nx + (c3[1] - c1[1]) * ny;
  if (Math.abs(w) < LADO_MIN) return null;
  return ccw([c1, c2, [c2[0] + nx * w, c2[1] + ny * w], [c1[0] + nx * w, c1[1] + ny * w]]).map(rp);
}

/** Retângulo (anti-horário) com lados a `graus` do eixo x e `c1`, `c2` cantos opostos (aberturas paralelas a uma viga ou às nervuras: C7.79, C7.81). */
export function retanguloNoAngulo(c1: P, c2: P, graus: number): P[] | null {
  const a = (graus * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  const u = (q: P) => q[0] * ux + q[1] * uy, v = (q: P) => q[0] * vx + q[1] * vy;
  const u0 = Math.min(u(c1), u(c2)), u1 = Math.max(u(c1), u(c2)), v0 = Math.min(v(c1), v(c2)), v1 = Math.max(v(c1), v(c2));
  if (u1 - u0 < LADO_MIN || v1 - v0 < LADO_MIN) return null;
  return ([[u0, v0], [u1, v0], [u1, v1], [u0, v1]] as P[]).map(([s, t]) => rp([s * ux + t * vx, s * uy + t * vy]));
}

/** Direção (graus, de 0 a 180) da reta por dois pontos. */
export function direcaoPorPontos(a: P, b: P): number {
  return r6((((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI) % 180 + 180) % 180);
}

/** Trecho da polilinha mais próximo de `ref` (índice do ponto inicial do trecho). */
export function trechoMaisProximo(pontos: P[], ref: P): number {
  let m = 0, dm = Infinity;
  for (let i = 0; i + 1 < pontos.length; i++) {
    const a = pontos[i], z = pontos[i + 1], dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((ref[0] - a[0]) * dx + (ref[1] - a[1]) * dy) / L2));
    const d = Math.hypot(ref[0] - (a[0] + t * dx), ref[1] - (a[1] + t * dy));
    if (d < dm - 1e-12) { dm = d; m = i; }
  }
  return m;
}

/** Direção (graus) das vigotas ou nervuras paralela ou perpendicular ao trecho da viga mais próximo de `ref` (C7.6, K1.9.54). */
export function direcaoPorViga(pontos: P[], relacao: 'paralela' | 'perpendicular', ref: P): number {
  const i = trechoMaisProximo(pontos, ref), d = direcaoPorPontos(pontos[i], pontos[i + 1]);
  return relacao === 'paralela' ? d : r6((d + 90) % 180);
}

/** Índice do vértice do contorno mais próximo de `p` (ponto de inserção do pano, C7.5). */
export function verticeMaisProximo(contorno: P[], p: P): number {
  let m = 0, dm = Infinity;
  contorno.forEach((q, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < dm - 1e-12) { dm = d; m = i; } });
  return m;
}

/**
 * Nova ponta de uma viga prolongada (ou aparada, `comprimento` < 0) de `comprimento` metros na direção do último
 * trecho `a` → `z` (C6.53). Devolve null se a viga ficaria com menos de 5 cm.
 */
export function pontaProlongada(a: P, z: P, comprimento: number): P | null {
  const L = Math.hypot(z[0] - a[0], z[1] - a[1]);
  if (!L || L + comprimento < LADO_MIN) return null;
  return rp([z[0] + ((z[0] - a[0]) / L) * comprimento, z[1] + ((z[1] - a[1]) / L) * comprimento]);
}

/** A polilinha está inteiramente dentro da janela de captura (dois cantos opostos)? Para as cargas ao longo da viga (C10.25). */
export function dentroDaJanela(pontos: P[], janela: [P, P]): boolean {
  const x0 = Math.min(janela[0][0], janela[1][0]), x1 = Math.max(janela[0][0], janela[1][0]), y0 = Math.min(janela[0][1], janela[1][1]), y1 = Math.max(janela[0][1], janela[1][1]);
  return pontos.every((q) => q[0] >= x0 - 1e-9 && q[0] <= x1 + 1e-9 && q[1] >= y0 - 1e-9 && q[1] <= y1 + 1e-9);
}

/** O retângulo cabe no contorno da laje, sem tocar as outras aberturas? */
export function retanguloNaLaje(ret: P[], contorno: P[], furos: P[][] = []): boolean {
  return ret.every((q) => dentroPoligono(q, contorno)) && !furos.some((f) => ret.some((q) => dentroPoligono(q, f)) || f.some((q) => dentroPoligono(q, ret)));
}

/** Deslocamento (m) a aplicar a uma polilinha para levar a linha clicada à linha de ajuste: `cm` à esquerda do traçado (negativo: à direita) (C6.9, C6.11). */
export const deslocamentoDeClique = (cm: number) => r6(cm / 100);

export interface LinhaAbertura { laje: string; grupo: string; abertura: number; area: number; borda: 'nenhuma' | 'chata' | 'alta' }
/** Aberturas das lajes com a viga de borda, para o memorial (L5). */
export function aberturasDoModelo(b: BuildingModel): LinhaAbertura[] {
  return b.lajes.flatMap((l) => (l.furos ?? []).map((f, i) => ({ laje: l.nome, grupo: b.grupos.find((g) => g.id === l.grupo)?.nome ?? l.grupo, abertura: i + 1, area: Math.abs(areaPoligono(f as P[])), borda: l.furosBorda?.[i] ?? 'nenhuma' })));
}
/** Panos a definir (marcados com "?"): nomes, para o memorial e o aviso de bloqueio. */
export const panosADefinir = (b: BuildingModel) => b.lajes.filter((l) => l.definir).map((l) => l.nome);

export type ModoAbertura = 'viga' | 'zero' | 'nervuras' | 'qualquer';
/**
 * Retângulo da abertura nos quatro modos (C7.79 a C7.82): `zero` (dois cantos, eixos), `qualquer` (lado `c1`–`c2` e ponto `c3`),
 * `viga` (paralela ao trecho da viga de referência mais próximo, dois cantos opostos) e `nervuras` (no ângulo das nervuras do pano;
 * pano maciço, vazio ou a definir: paralela aos eixos gerais).
 */
export function retanguloDaAbertura(modo: ModoAbertura, c1: P, c2: P, c3: P | undefined, vigaPontos: P[] | undefined, nervuras: number | null): P[] | null {
  if (modo === 'zero') return retanguloPorLado(c1, c2);
  if (modo === 'qualquer') return c3 ? retanguloPorLado(c1, c2, c3) : null;
  if (modo === 'viga') return vigaPontos ? retanguloNoAngulo(c1, c2, direcaoPorViga(vigaPontos, 'paralela', [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2])) : null;
  return retanguloNoAngulo(c1, c2, nervuras ?? 0);
}
