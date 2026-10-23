// Vigas inclinadas entre pavimentos (E2c; C6.35, K1.3.16, K1.4.25, K1.9.114): geometria das barras (simples e múltipla),
// ligação das pontas a pilares e vigas, cargas próprias e diagnósticos. A análise (analitico.ts) monta a barra 3D de 2 nós e
// 6 gdl; o dimensionamento está em inclinadasDim.ts. Reaproveitável pelas diagonais de contraventamento (E2d): uma barra
// entre dois pontos de pavimentos quaisquer, ligada a nós existentes, fora do diafragma.
import { dentroPoligono, type P } from '../geom/faces';
import type { Diagnostico } from './verify';
import { contornoNoLance, geometriaViga, lancesDoPilar, pavimentosDoGrupo, type BuildingModel, type Diagonal, type VigaInclinada } from './types';

/** Tolerância de contato da ponta com o pilar ou a viga (m), além da meia largura da viga. */
export const TOL_LIGACAO = 0.05;
/** Inclinação mínima (m de desnível entre as cotas das pontas) para ser barra inclinada e não viga. */
export const DESNIVEL_MIN = 0.05;

/** Uma barra concreta: a viga inclinada lançada ou uma das repetições da múltipla. */
export interface BarraInclinada {
  /** Chave única: `${inc.id}|${pavIni}`. */
  id: string;
  /** Id da viga inclinada lançada. */
  ref: string;
  nome: string;
  /** Nome com os pavimentos, para listas (a múltipla gera uma barra por par de pavimentos). */
  rotulo: string;
  inc: VigaInclinada;
  pavIni: string; pavFim: string;
  pIni: P; pFim: P;
  /** Cotas das pontas (m): cota do pavimento + desnível. */
  zIni: number; zFim: number;
  /** Comprimento entre as pontas (m) e ângulo com a horizontal (graus). */
  L: number;
  angulo: number;
  /** É a barra lançada (não uma repetição da múltipla). */
  lancada: boolean;
  /** Diagonal de contraventamento (E2d), e não viga inclinada. */
  diagonal?: boolean;
}

export type Ligacao = { tipo: 'pilar'; pilar: string } | { tipo: 'viga'; viga: string; ponto: P };

const pav = (b: BuildingModel, id: string) => b.pavimentos.find((p) => p.id === id);

/**
 * Barras de uma viga inclinada: uma só; ou, se múltipla, uma por par de pavimentos de mesma posição nos grupos inicial e final
 * (a barra lançada fixa a posição: pavimento k do grupo inicial liga-se ao pavimento k + s do grupo final, para todo s em que
 * ambos existem).
 */
export function barrasDaInclinada(b: BuildingModel, inc: VigaInclinada): BarraInclinada[] {
  const pi = pav(b, inc.pavIni), pf = pav(b, inc.pavFim);
  if (!pi || !pf) return [];
  const diagonal = !!b.diagonais?.some((x) => x.id === inc.id), excluidas = (inc as Diagonal).excluidas ?? [];
  const par = (a: typeof pi, f: typeof pf, lancada: boolean): BarraInclinada => {
    const zIni = a.cota + (inc.nivelIni ?? 0), zFim = f.cota + (inc.nivelFim ?? 0);
    const dh = Math.hypot(inc.pFim[0] - inc.pIni[0], inc.pFim[1] - inc.pIni[1]), dz = zFim - zIni;
    return {
      id: `${inc.id}|${a.id}`, ref: inc.id, nome: inc.nome, rotulo: `${inc.nome} (${a.nome} → ${f.nome})`, inc,
      pavIni: a.id, pavFim: f.id, pIni: inc.pIni, pFim: inc.pFim, zIni, zFim, L: Math.hypot(dh, dz), angulo: (Math.atan2(Math.abs(dz), dh) * 180) / Math.PI, lancada, ...(diagonal ? { diagonal } : {}),
    };
  };
  if (!inc.multipla) return [par(pi, pf, true)];
  const gi = pavimentosDoGrupo(b, pi.grupo), gf = pavimentosDoGrupo(b, pf.grupo);
  const ki = gi.findIndex((x) => x.id === pi.id), kf = gf.findIndex((x) => x.id === pf.id);
  const out: BarraInclinada[] = [];
  for (let s = -gi.length; s <= gf.length; s++) {
    const a = gi[ki + s], f = gf[kf + s];
    if (a && f && !excluidas.includes(a.id)) out.push(par(a, f, s === 0));
  }
  return out.sort((x, y) => x.zIni - y.zIni);
}

/** Vigas inclinadas e diagonais de contraventamento (E2d): as duas são barras entre pavimentos de mesma forma. */
export const entreGrupos = (b: Pick<BuildingModel, 'vigasInclinadas' | 'diagonais'>): VigaInclinada[] => [...(b.vigasInclinadas ?? []), ...(b.diagonais ?? [])];
export const acharEntreGrupos = (b: Pick<BuildingModel, 'vigasInclinadas' | 'diagonais'>, id: string): VigaInclinada | undefined => entreGrupos(b).find((x) => x.id === id);

/** Todas as barras entre pavimentos da obra (vigas inclinadas, depois diagonais), na ordem de lançamento. */
export const expandirInclinadas = (b: BuildingModel): BarraInclinada[] => entreGrupos(b).flatMap((i) => barrasDaInclinada(b, i));

export const temInclinadas = (b: Pick<BuildingModel, 'vigasInclinadas' | 'diagonais'>) => !!(b.vigasInclinadas?.length || b.diagonais?.length);

function distSegmento(p: P, a: P, z: P): { d: number; q: P } {
  const dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy;
  const u = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  const q: P = [a[0] + u * dx, a[1] + u * dy];
  return { d: Math.hypot(q[0] - p[0], q[1] - p[1]), q };
}

function distContorno(p: P, c: P[]): number {
  let d = Infinity;
  for (let i = 0; i < c.length; i++) d = Math.min(d, distSegmento(p, c[i], c[(i + 1) % c.length]).d);
  return d;
}

/**
 * O que a ponta da barra toca no pavimento: um pilar que chega a ele (a ponta dentro da seção ou a até TOL_LIGACAO) ou o eixo de uma
 * viga do grupo do pavimento (a ponta a até meia largura + TOL_LIGACAO do eixo; devolve o ponto do eixo). Pilar tem prioridade.
 */
export function ligacaoDaPonta(b: BuildingModel, pavimento: string, p: P): Ligacao | null {
  const pv = pav(b, pavimento);
  if (!pv) return null;
  let melhorP: { id: string; d: number } | null = null;
  for (const pil of b.pilares) {
    if (!lancesDoPilar(b, pil).some((l) => l.id === pavimento)) continue;
    const c = contornoNoLance(pil, pavimento);
    const d = dentroPoligono(p, c) ? 0 : distContorno(p, c);
    if (d <= TOL_LIGACAO && (!melhorP || d < melhorP.d)) melhorP = { id: pil.id, d };
  }
  if (melhorP) return { tipo: 'pilar', pilar: melhorP.id };
  let melhorV: { viga: string; d: number; q: P } | null = null;
  for (const v of b.vigas) {
    if (v.grupo !== pv.grupo || v.estrutural === false || v.comumDe) continue;
    const eixo = geometriaViga(v).eixo as P[];
    for (let i = 0; i + 1 < eixo.length; i++) {
      const { d, q } = distSegmento(p, eixo[i], eixo[i + 1]);
      if (d <= v.secao.b / 2 + TOL_LIGACAO && (!melhorV || d < melhorV.d)) melhorV = { viga: v.id, d, q };
    }
  }
  return melhorV ? { tipo: 'viga', viga: melhorV.viga, ponto: melhorV.q } : null;
}

/** Pontos dos eixos das vigas do grupo em que barras inclinadas se ligam (viram nós das vigas no pórtico). */
export function pontosDeLigacaoNaViga(b: BuildingModel, grupo: string): P[] {
  const out: P[] = [];
  for (const bar of expandirInclinadas(b)) {
    for (const [pavId, p] of [[bar.pavIni, bar.pIni], [bar.pavFim, bar.pFim]] as const) {
      if (pav(b, pavId)?.grupo !== grupo) continue;
      const l = ligacaoDaPonta(b, pavId, p);
      if (l?.tipo === 'viga') out.push(l.ponto);
    }
  }
  return out;
}

/**
 * Saída da seção do pilar (m ao longo da barra, em planta): distância da ponta (dentro do contorno) até o contorno, na direção do
 * outro extremo. 0 se a ponta está fora ou a direção é vertical.
 */
export function saidaDoContorno(p: P, dir: P, contorno: P[]): number {
  const n = Math.hypot(dir[0], dir[1]);
  if (n < 1e-9) return 0;
  const u: P = [dir[0] / n, dir[1] / n];
  let t = Infinity;
  for (let i = 0; i < contorno.length; i++) {
    const a = contorno[i], z = contorno[(i + 1) % contorno.length], ex = z[0] - a[0], ey = z[1] - a[1], den = u[0] * ey - u[1] * ex;
    if (Math.abs(den) < 1e-12) continue;
    const s = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den, r = ((a[0] - p[0]) * u[1] - (a[1] - p[1]) * u[0]) / den;
    if (s > 1e-9 && r >= -1e-9 && r <= 1 + 1e-9 && s < t) t = s;
  }
  return Number.isFinite(t) ? t : 0;
}

const fmt = (v: number, c = 2) => String(+v.toFixed(c)).replace('.', ',');
const diag = (codigo: string, severidade: Diagnostico['severidade'], elementos: string[], mensagem: string): Diagnostico => ({ codigo, severidade, elementos, mensagem });

export function diagnosticosDe(b: BuildingModel, lista: VigaInclinada[], pre: 'INCLINADA' | 'DIAGONAL'): Diagnostico[] {
  const out: Diagnostico[] = [];
  for (const inc of lista) {
    const pi = pav(b, inc.pavIni), pf = pav(b, inc.pavFim);
    if (!pi || !pf) { out.push(diag(`${pre}_PAVIMENTO`, 'erro', [inc.id], `${inc.nome}: pavimento inicial ou final inexistente.`)); continue; }
    if (inc.secao.b <= 0 || inc.secao.h <= 0) out.push(diag(`${pre}_SECAO`, 'erro', [inc.id], `${inc.nome}: seção inválida.`));
    for (const bar of barrasDaInclinada(b, inc)) {
      const dz = Math.abs(bar.zFim - bar.zIni), dh = Math.hypot(bar.pFim[0] - bar.pIni[0], bar.pFim[1] - bar.pIni[1]);
      if (dz < DESNIVEL_MIN) out.push(diag(`${pre}_NIVEL`, 'erro', [inc.id], `${bar.rotulo}: as pontas estão na mesma cota (desnível ${fmt(dz * 100, 0)} cm); lance como viga comum.`));
      else if (dh < 0.05) out.push(diag(`${pre}_VERTICAL`, 'erro', [inc.id], `${bar.rotulo}: barra vertical; lance como pilar.`));
      for (const [pavId, p, nome] of [[bar.pavIni, bar.pIni, 'inicial'], [bar.pavFim, bar.pFim, 'final']] as const) {
        if (!ligacaoDaPonta(b, pavId, p)) out.push(diag(`${pre}_SEM_APOIO`, 'erro', [inc.id], `${bar.rotulo}: a ponta ${nome} não toca pilar nem viga do pavimento ${pav(b, pavId)?.nome}.`));
      }
    }
  }
  return out;
}

/** Diagnósticos do lançamento das vigas inclinadas (referências, desnível, seção e ligações das pontas). */
export const diagnosticosInclinadas = (b: BuildingModel): Diagnostico[] => diagnosticosDe(b, b.vigasInclinadas ?? [], 'INCLINADA');

export interface LinhaInclinada {
  id: string; nome: string; barras: number; pavimentoIni: string; pavimentoFim: string; secao: string; comprimento: number; angulo: number; multipla: boolean;
  ligacao: string; armadura: boolean; cargas: number;
}

/** Resumo para listagens e memorial. */
export function resumoInclinadas(b: BuildingModel): LinhaInclinada[] {
  return (b.vigasInclinadas ?? []).map((inc) => {
    const bs = barrasDaInclinada(b, inc), l = bs.find((x) => x.lancada) ?? bs[0];
    const lig = (x?: string) => (x === 'articulada' ? 'articulada' : 'engastada');
    return {
      id: inc.id, nome: inc.nome, barras: bs.length, pavimentoIni: pav(b, inc.pavIni)?.nome ?? inc.pavIni, pavimentoFim: pav(b, inc.pavFim)?.nome ?? inc.pavFim,
      secao: `${fmt(inc.secao.b * 100, 0)}×${fmt(inc.secao.h * 100, 0)} cm`, comprimento: l?.L ?? 0, angulo: l?.angulo ?? 0, multipla: !!inc.multipla,
      ligacao: `${lig(inc.ligIni)} / ${lig(inc.ligFim)}`, armadura: !!inc.armadura, cargas: inc.cargas?.length ?? 0,
    };
  });
}
