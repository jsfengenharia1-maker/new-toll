// Flecha entre dois pontos quaisquer de uma laje (V3): perfil dos deslocamentos verticais ao longo da reta que os une
// (interpolação sobre os nós da grelha), flecha em relação à secante (padrão) ou à tangente no ponto inicial, e a
// combinação gravitacional mais desfavorável. Núcleo puro.
import type { AnaliseEdificio } from '../building/analitico';
import { combinacoesDoEstado, type CombinacaoEd } from '../building/combinacoes';
import type { BuildingModel, EstadoId } from '../building/types';
import {
  deslocamentosHipotese, hipoteseDeCombinacao, type DeslocamentosHipotese, type Hipotese,
} from './deformada';
import { campoDisperso, type Ponto2 } from './interpolacao';

/** Campo de deslocamento vertical uz (m, positivo para cima) da grelha de um pavimento, para uma hipótese. */
export function campoLaje(an: AnaliseEdificio, d: DeslocamentosHipotese, pavimento: string): (x: number, y: number) => number {
  const g = an.grelhas.find((x) => x.pavimento === pavimento), uz = d.grelhas.get(pavimento);
  if (!g || !uz) return () => 0;
  const pts: Ponto2[] = g.modelo.nos.map((n) => [n[0], n[1]]);
  return campoDisperso(pts, Array.from({ length: pts.length }, (_, i) => uz[i * 6 + 2]));
}

export interface PerfilFlecha {
  /** Abscissa ao longo da reta (m) a partir do ponto inicial, posição em planta e deslocamento vertical para baixo (m). */
  s: number[]; x: number[]; y: number[]; w: number[];
  /** Comprimento entre os pontos (vão L, m). */
  L: number;
}

/** Perfil de `campo` (uz, positivo para cima) entre `a` e `b` em `n + 1` pontos; `w` sai positivo para baixo. */
export function perfilDeslocamentos(campo: (x: number, y: number) => number, a: Ponto2, b: Ponto2, n = 64): PerfilFlecha {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), p: PerfilFlecha = { s: [], x: [], y: [], w: [], L };
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = a[0] + t * (b[0] - a[0]), y = a[1] + t * (b[1] - a[1]);
    p.s.push(t * L); p.x.push(x); p.y.push(y); p.w.push(-campo(x, y));
  }
  return p;
}

export type ReferenciaFlecha = 'secante' | 'tangente';
export type MedidaFlecha = 'relativaMax' | 'absolutaMax' | 'entrePontos';

export interface OpcoesFlecha {
  /** Reta de referência da flecha relativa: secante pelos dois pontos (padrão) ou tangente ao perfil no ponto inicial. */
  referencia?: ReferenciaFlecha;
  /** Que flecha sai: máxima relativa (padrão), máxima absoluta ou a diferença entre os dois pontos. */
  medida?: MedidaFlecha;
  /** Fator de amplificação da flecha (ex.: 1 + αf para a flecha diferida); padrão 1. */
  amplificacao?: number;
  /** Denominador do limite (L/limite; padrão 250 para aceitabilidade sensorial, NBR 6118 Tab. 13.3 [a confirmar para o caso]). */
  limite?: number;
}

export interface ResultadoFlecha {
  referencia: ReferenciaFlecha; medida: MedidaFlecha;
  /** Vão L (m), flecha (m, positiva para baixo, já amplificada) e abscissa em que ocorre. */
  L: number; flecha: number; s: number;
  /** Flecha relativa: L/|f| na secante e 2L/|f| na tangente (Infinity sem flecha). */
  razao: number;
  /** Limite L/n (secante) ou 2L/n (tangente) em m, e se a flecha o respeita. */
  limiteM: number; ok: boolean;
  /** Valores nos extremos (m, para baixo) e inclinação inicial da tangente (rad, para baixo positivo). */
  w0: number; w1: number; inclinacaoInicial: number;
  amplificacao: number;
}

/** Inclinação do perfil no ponto inicial: diferença finita de 2ª ordem com 3 pontos. */
export function inclinacaoInicial(p: PerfilFlecha): number {
  const h = p.s[1] - p.s[0];
  if (p.w.length < 3 || h <= 0) return 0;
  return (-3 * p.w[0] + 4 * p.w[1] - p.w[2]) / (2 * h);
}

export function flechaEntrePontos(p: PerfilFlecha, o: OpcoesFlecha = {}): ResultadoFlecha {
  const referencia = o.referencia ?? 'secante', medida = o.medida ?? 'relativaMax', amp = o.amplificacao ?? 1, lim = o.limite ?? 250;
  const n = p.w.length - 1, w0 = p.w[0], w1 = p.w[n], i0 = inclinacaoInicial(p);
  const ref = (s: number) => (referencia === 'secante' ? w0 + ((w1 - w0) * s) / p.L : w0 + i0 * s);
  let f = 0, s = 0;
  if (medida === 'entrePontos') { f = w1 - w0; s = p.L; }
  else for (let k = 0; k <= n; k++) {
    const v = medida === 'relativaMax' ? p.w[k] - ref(p.s[k]) : p.w[k];
    if (Math.abs(v) > Math.abs(f) + 1e-15) { f = v; s = p.s[k]; }
  }
  f *= amp;
  const base = referencia === 'secante' ? p.L : 2 * p.L;
  return {
    referencia, medida, L: p.L, flecha: f, s, razao: Math.abs(f) > 1e-12 ? base / Math.abs(f) : Infinity,
    limiteM: base / lim, ok: Math.abs(f) <= base / lim + 1e-12, w0, w1, inclinacaoInicial: i0, amplificacao: amp,
  };
}

/** A combinação só tem casos gravitacionais (G, Q e adicionais da obra; sem vento nem 2ª ordem)? */
export const ehGravitacional = (an: Pick<AnaliseEdificio, 'casos'>, c: CombinacaoEd) => {
  const ks = Object.entries(c.fatores).filter(([, f]) => f).map(([k]) => k);
  return ks.length > 0 && ks.every((k) => an.casos.includes(k));
};

export interface FlechaPorHipotese { hipotese: Hipotese; perfil: PerfilFlecha; resultado: ResultadoFlecha }

/** Flecha entre dois pontos de uma hipótese (caso ou combinação) na laje do pavimento `pavimento`. */
export function flechaDaHipotese(an: AnaliseEdificio, h: Hipotese, pavimento: string, a: Ponto2, b: Ponto2, o: OpcoesFlecha = {}, n = 64): FlechaPorHipotese {
  const d = deslocamentosHipotese(an, h), perfil = perfilDeslocamentos(campoLaje(an, d, pavimento), a, b, n);
  return { hipotese: h, perfil, resultado: flechaEntrePontos(perfil, o) };
}

/**
 * Combinação gravitacional mais desfavorável (peso próprio + permanentes + variável) entre as combinações do estado
 * `estado` (padrão 'flecha', quase permanentes) ou as informadas: a de maior |flecha| entre os pontos. Devolve todas as
 * avaliadas, ordenadas da mais desfavorável para a menos, para a tabela.
 */
export function flechaMaisDesfavoravel(
  b: BuildingModel, an: AnaliseEdificio, pavimento: string, a: Ponto2, bb: Ponto2,
  o: OpcoesFlecha & { estado?: EstadoId; combinacoes?: CombinacaoEd[] } = {},
): FlechaPorHipotese[] {
  const cands = (o.combinacoes ?? combinacoesDoEstado(b, an, o.estado ?? 'flecha')).filter((c) => ehGravitacional(an, c));
  return cands
    .map((c) => flechaDaHipotese(an, hipoteseDeCombinacao(c), pavimento, a, bb, o))
    .sort((x, y) => Math.abs(y.resultado.flecha) - Math.abs(x.resultado.flecha));
}
