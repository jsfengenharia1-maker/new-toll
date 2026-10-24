// Aço da alvenaria armada (E6a, C5.6): lista de barras de cada parede de blocos — barras verticais nas células grauteadas
// (uma por posição de `posicoesBarrasVerticais`, com transpasse), armadura horizontal de junta por pano, verga, contraverga e
// estribos das aberturas — e o peso. É a única fonte do aço: a tabela de aço da prancha (`armacaoAlvenaria.ts`) e o memorial
// leem esta lista, de modo que a prancha e o resumo do dimensionamento coincidem.
// Premissas [a confirmar]: comprimento da barra vertical = altura do lance + `alvenariaTranspasse` × φ; barra horizontal = comprimento
// do pano, uma por intervalo de armadura `s` na altura do lance (floor(H/s)); verga e contraverga = vão + 2 apoios, n barras;
// estribo da verga = perímetro da canaleta grauteada (largura da parede e fiadas × altura do bloco, cobrimento de 2 cm), de
// `s` em `s` ao longo da verga (floor(comprimento/s) + 1). Sem ganchos, dobras ou perdas (as perdas entram no resumo da folha).
import { barArea } from '../concrete';
import type { ResultadoAlvenariaParede } from './alvenariaDim';
import type { OpcoesCalculo } from './opcoes';

/** Cobrimento do graute nos estribos da verga (m) [a confirmar]. */
export const COB_ESTRIBO_VERGA = 0.02;
export const RHO_ACO = 7850;

/** Posições (m, a partir do início do pano) das barras verticais nas células grauteadas: meio módulo da extremidade e depois a cada `s`. */
export function posicoesBarrasVerticais(s0: number, s1: number, s: number, mod: number): number[] {
  if (s1 - s0 < mod - 1e-9 || s <= 0) return [];
  const n = Math.floor((s1 - s0 - mod) / s + 1e-6) + 1;
  return Array.from({ length: n }, (_, j) => +(s0 + mod / 2 + j * s).toFixed(4));
}

export type TipoBarraAlv = 'vertical' | 'horizontal' | 'verga' | 'contraverga' | 'estribo';

export interface BarraAlv {
  pavimento: string; nomePav: string; lado: number; nomeLado: string;
  /** Pano (0-based) para vertical e horizontal; abertura para as demais. */
  pano?: number; abertura?: string;
  tipo: TipoBarraAlv;
  aco: string; phi: number; quant: number;
  /** Comprimento de cada barra (m). */
  comprimento: number;
  /** Peso do conjunto (kg). */
  peso: number;
}

export interface AcoAlvParede { barras: BarraAlv[]; comprimento: number; peso: number }

/** kg/m de uma barra de bitola `phi` (mm). */
export const pesoLinearAlv = (phi: number) => barArea(phi) * RHO_ACO;

/** Comprimentos em cm inteiros, como na tabela de aço da prancha (a soma da tabela é igual ao peso do dimensionamento). */
const cmRed = (v: number) => Math.round(v * 100) / 100;

/**
 * Barras de aço da parede de blocos `r` (resultado do dimensionamento). `modulo` é o meio comprimento do bloco (m) e `alturaBloco`
 * a altura modular (m); `aco` o aço das armaduras verticais e de junta/verga.
 */
export function acoAlvenariaParede(r: ResultadoAlvenariaParede, modulo: number, alturaBloco: number, aco: string, op: OpcoesCalculo): AcoAlvParede {
  const barras: BarraAlv[] = [];
  const push = (b: Omit<BarraAlv, 'peso' | 'aco'>) => {
    if (b.quant <= 0 || b.comprimento <= 0) return;
    barras.push({ ...b, aco, comprimento: cmRed(b.comprimento), peso: b.quant * cmRed(b.comprimento) * pesoLinearAlv(b.phi) });
  };
  for (const p of r.panos) {
    const a = p.armadura;
    if (!a) continue;
    const base = { pavimento: p.pavimento, nomePav: p.nomePav, lado: p.lado, nomeLado: p.nomeLado, pano: p.pano };
    if (a.vert) push({ ...base, tipo: 'vertical', phi: a.vert.phi, quant: posicoesBarrasVerticais(p.s0, p.s1, a.vert.s, modulo).length, comprimento: p.z1 - p.z0 + (op.alvenariaTranspasse * a.vert.phi) / 1000 });
    if (a.hor) push({ ...base, tipo: 'horizontal', phi: a.hor.phi, quant: Math.floor((p.z1 - p.z0) / a.hor.s + 1e-6), comprimento: p.s1 - p.s0 });
  }
  const tLado = (lado: number, pav: string) => r.lados.find((l) => l.lado === lado && l.pavimento === pav)?.t ?? 0.2;
  for (const v of r.vergas) {
    const nomeLado = r.lados.find((l) => l.lado === v.lado)?.nome ?? String(v.lado + 1);
    const base = { pavimento: v.lance, nomePav: v.nomePav, lado: v.lado, nomeLado, abertura: v.id };
    const vao = v.largura + 2 * v.apoio, ar = v.armadura;
    push({ ...base, tipo: 'verga', phi: ar.phi, quant: ar.n, comprimento: vao });
    if (v.tipo === 'janela' && ar.contraverga) push({ ...base, tipo: 'contraverga', phi: ar.contraverga.phi, quant: ar.contraverga.n, comprimento: vao });
    if (ar.estribo) {
      const alt = Math.max(v.fiadas * alturaBloco, 0.05), c = COB_ESTRIBO_VERGA, t = tLado(v.lado, v.lance);
      const per = 2 * Math.max(t - 2 * c, 0.02) + 2 * Math.max(alt - 2 * c, 0.02);
      push({ ...base, tipo: 'estribo', phi: ar.estribo.phi, quant: (Math.floor(vao / ar.estribo.s + 1e-6) + 1) * (v.tipo === 'janela' && ar.contraverga ? 2 : 1), comprimento: per });
    }
  }
  return { barras, comprimento: barras.reduce((s, b) => s + b.quant * b.comprimento, 0), peso: barras.reduce((s, b) => s + b.peso, 0) };
}
