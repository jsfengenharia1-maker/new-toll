// Desaprumo global do edifício (NBR 6118, 11.3.3.4.1). A estrutura inteira é tomada fora de prumo de θa; o efeito é o de forças
// horizontais equivalentes em cada pavimento, F = θa·V (V = carga vertical do pavimento), aplicadas nos nós mestres dos diafragmas
// (mesmo critério do Pórtico 2D, `design.ts`). Como a combinação ELU pondera cada caso vertical com o seu γ, o desaprumo é
// calculado por caso vertical (G, Q e adicionais) e por direção (+x, +y, −x, −y) e entra nas combinações pelo mesmo fator do
// caso vertical; a regra dos 30 % do vento (`combinacoes.ts`, `decidirRegra30`) escolhe o que entra em cada combinação.
import { anguloDesaprumo } from '../desaprumo';
import type { AnaliseEdificio } from './analitico';
import type { ZonaVento } from './vento';

export const DIRECOES_DESAPRUMO = [0, 90, 180, 270] as const;
export type DirecaoDesaprumo = (typeof DIRECOES_DESAPRUMO)[number];

/** Força horizontal do desaprumo de um pavimento numa zona (kN, com o sinal do sentido). */
export interface ForcaDesaprumo { pavimento: string; zona: number; z: number; /** carga vertical do pavimento no caso (kN) */ V: number; /** parte da zona na carga do pavimento */ fracao: number; F: number }
/** Caso de desaprumo: um caso vertical numa direção (mesmos eixos e sentidos dos casos de vento). */
export interface CasoDesaprumo { nome: string; caso: string; direcao: DirecaoDesaprumo; forcas: ForcaDesaprumo[] }

export interface DesaprumoEdificio {
  /** Altura sobre o pavimento mais baixo (m), nº de prumadas (usado e contado) e ângulos (rad). */
  H: number; n: number; nAuto: number; informadoN: boolean; theta1Basico: number; theta1: number; thetaA: number;
  /** Casos verticais com desaprumo e o momento de tombamento unitário Md,k = θa·Σ V·z (kN·m) de cada um. */
  verticais: string[];
  md: Record<string, number>;
  /** Cota (sobre o pavimento mais baixo) e carga vertical característica de cada caso por pavimento. */
  pavimentos: { pavimento: string; z: number; V: Record<string, number> }[];
  casos: CasoDesaprumo[];
}

export const nomeCasoDesaprumo = (caso: string, direcao: number) => `D${direcao}°[${caso}]`;

export interface EntradaDesaprumo {
  pavimentos: { id: string; cota: number }[];
  zonas: (pav: string) => ZonaVento[];
  /** Carga vertical característica por pavimento e caso (kN). */
  cargas: Record<string, Record<string, number>>;
  /** Casos da obra com a natureza (só G, H e Q entram). */
  casos: { id: string; natureza: string }[];
  nAuto: number;
  /** n informado nas opções (0 = automático). */
  nInformado: number;
}

/** Peso de cada zona na repartição da força do pavimento: área da caixa envolvente da zona (iguais se a área for nula). */
export function pesosZonas(zs: ZonaVento[]): number[] {
  const a = zs.map((z) => Math.max(0, z.x1 - z.x0) * Math.max(0, z.y1 - z.y0)), s = a.reduce((t, x) => t + x, 0);
  return s > 1e-9 ? a.map((x) => x / s) : zs.map(() => 1 / Math.max(1, zs.length));
}

/**
 * Desaprumo do edifício: θ1 = 1/(100√H), θa = θ1·√((1 + 1/n)/2) e as forças θa·V por pavimento, caso vertical e direção.
 * Pavimentos de cota nula (base) não recebem força (o braço é nulo). Devolve null sem altura ou sem carga vertical.
 */
export function calcularDesaprumo(e: EntradaDesaprumo): DesaprumoEdificio | null {
  const ps = e.pavimentos;
  if (ps.length < 2) return null;
  const z0 = ps[0].cota, H = ps[ps.length - 1].cota - z0;
  if (H < 1e-6) return null;
  const informadoN = e.nInformado > 0, ang = anguloDesaprumo(H, informadoN ? e.nInformado : Math.max(1, e.nAuto));
  const thetaA = ang.thetaA;
  const verticais = e.casos.filter((c) => (c.natureza === 'G' || c.natureza === 'H' || c.natureza === 'Q') && ps.some((p, i) => i > 0 && Math.abs(e.cargas[p.id]?.[c.id] ?? 0) > 1e-12)).map((c) => c.id);
  if (!verticais.length) return null;
  const pavimentos = ps.map((p) => ({ pavimento: p.id, z: p.cota - z0, V: Object.fromEntries(verticais.map((c) => [c, e.cargas[p.id]?.[c] ?? 0])) }));
  const md: Record<string, number> = {};
  for (const c of verticais) md[c] = thetaA * pavimentos.reduce((t, p) => t + p.V[c] * p.z, 0);
  const casos: CasoDesaprumo[] = [];
  for (const c of verticais) for (const direcao of DIRECOES_DESAPRUMO) {
    const sinal = direcao === 0 || direcao === 90 ? 1 : -1, forcas: ForcaDesaprumo[] = [];
    pavimentos.forEach((p, i) => {
      if (i === 0 || p.z <= 0 || Math.abs(p.V[c]) < 1e-12) return;
      const zs = e.zonas(p.pavimento);
      if (!zs.length) return;
      const w = pesosZonas(zs);
      zs.forEach((_, k) => { if (w[k] > 0) forcas.push({ pavimento: p.pavimento, zona: k, z: p.z, V: p.V[c], fracao: w[k], F: sinal * thetaA * p.V[c] * w[k] }); });
    });
    casos.push({ nome: nomeCasoDesaprumo(c, direcao), caso: c, direcao, forcas });
  }
  return { H, n: ang.n, nAuto: Math.max(1, e.nAuto), informadoN, theta1Basico: ang.theta1Basico, theta1: ang.theta1, thetaA, verticais, md, pavimentos, casos };
}

/** Todos os casos horizontais da análise, na ordem dos resultados do pórtico: vento (NBR 6123) e depois desaprumo. */
export function casosHorizontais(an: Pick<AnaliseEdificio, 'vento' | 'desaprumo'>): { nome: string; direcao: number; desaprumo: boolean }[] {
  return [
    ...(an.vento?.casos ?? []).map((c) => ({ nome: c.nome, direcao: c.direcao as number, desaprumo: false })),
    ...(an.desaprumo?.casos ?? []).map((c) => ({ nome: c.nome, direcao: c.direcao as number, desaprumo: true })),
  ];
}

/** Momento de tombamento na base do vento (kN·m) por caso de vento: M = Σ|F|·z (excentricidades não o alteram). */
export function momentoVento(c: { forcas: { F: number; z: number }[] }): number {
  return c.forcas.reduce((t, f) => t + Math.abs(f.F) * f.z, 0);
}
