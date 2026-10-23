// Flecha das vigotas com Branson (frente E3b): rigidez efetiva Ie/Ic de cada barra de nervura (ficha do fabricante ou seção T),
// alinhamentos da grelha e flecha de cada alinhamento relativa aos apoios. As composições por etapas e os limites vêm de
// `flechas.ts`; a integração com a flecha da laje fica em `dimensionamento.ts`. Núcleo puro; kN, m.
import type { Concrete } from '../concrete';
import type { Resultado3 } from '../fe3d';
import type { P } from '../geom/faces';
import type { GrelhaPavimento } from './analitico';
import { bransonEI, inerciaEstadioII, momentoResistenteT, propriedadesFlexao, secaoT, type GeometriaNervurada } from './tiposLaje';

/** Dados de Branson de uma nervura (kN·m², kN·m por nervura): positivo (mesa comprimida) e negativo (capa tracionada). */
export interface DadosBranson {
  EI: number; EIfis: number; Mfis: number;
  negEI: number; negEIfis: number; negMfis: number;
  /** Origem do EI fissurado: ficha do fabricante, relação informada, ou estádio II da seção T com a armadura. */
  fonte: 'ficha' | 'relacao' | 'estadio2' | 'sem-dado';
}

/**
 * Armadura equivalente (m², com `fyd` em MPa) que dá o momento último `Mu` (kN·m) na seção T: a ficha informa o Mu, não a
 * armadura da vigota; serve para a rigidez fissurada (estádio II) e para somar o adicional ao Mu da ficha.
 */
export function armaduraEquivalente(c: Concrete, bf: number, hf: number, bw: number, d: number, Mu: number, fyd: number): number {
  let lo = 0, hi = 0.05;
  for (let it = 0; it < 80; it++) {
    const m = (lo + hi) / 2;
    if (momentoResistenteT(c, bf, hf, bw, d, m, fyd) < Mu) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

/**
 * Dados de Branson da nervura: EI, EI fissurado e Mfis da série (positivo e negativo); sem EI fissurado, a relação da ficha;
 * sem ela, o estádio II da seção T com a armadura `AsInf` (m²) [a confirmar com o fabricante]. `null` sem dado nenhum
 * (rigidez total). O Mfis do negativo, sem dado, é 1,2·fctm·Ic/yt com yt até a face superior.
 */
export function dadosBranson(g: GeometriaNervurada, c: Concrete, AsInf = 0, d = 0): DadosBranson | null {
  const fl = propriedadesFlexao(g, c), s = g.serie, pos = s?.positivo, neg = s?.negativo;
  const EI = pos?.EI ?? fl.EI;
  let EIfis: number | undefined, fonte: DadosBranson['fonte'] = 'sem-dado';
  if (pos?.EIfis && pos.EI) { EIfis = pos.EIfis; fonte = 'ficha'; }
  else if (g.ficha?.relacaoFis) { EIfis = EI * g.ficha.relacaoFis; fonte = 'relacao'; }
  else if (AsInf > 0 && d > 0) { EIfis = c.Ecs * 1000 * inerciaEstadioII(c, g.intereixo, g.capa, g.bwRigidez, d, AsInf); fonte = 'estadio2'; }
  if (EIfis === undefined) return null;
  const sec = secaoT(g.intereixo, g.capa, g.bwRigidez, g.h), ratio = Math.min(1, EIfis / EI);
  const negMfis = neg?.Mfis ?? (1.2 * c.fctm * sec.I * 1000) / Math.max(1e-6, g.h - sec.yc);
  const negEI = neg?.EI ?? EI;
  return { EI, EIfis, Mfis: pos?.Mfis ?? fl.Mfis, negEI, negEIfis: neg?.EIfis ?? negEI * ratio, negMfis, fonte };
}

/** Ie/Ic da nervura pelo momento da combinação quase permanente `Ma` (positivo = traciona embaixo), Branson (NBR 6118, 17.3.2.1.1). */
export function fatorBranson(d: DadosBranson, Ma: number): number {
  const pos = Ma >= 0, M = Math.abs(Ma);
  const EI = pos ? d.EI : d.negEI, EIfis = pos ? d.EIfis : d.negEIfis, Mfis = pos ? d.Mfis : d.negMfis;
  return Math.max(0.01, Math.min(1, bransonEI(EI, EIfis, Mfis, M) / EI));
}

// ---------------------------------------------------------------- alinhamentos da grelha

export interface AlinhamentoGrelha {
  /** Posição transversal do alinhamento (m, a mesma de `FaixaVigota.t`), nós da grelha em ordem, comprimento (m) e barras entre os nós. */
  t: number; nos: number[]; L: number; barras: number[];
}
/** Alinhamentos (cadeias de barras na direção das vigotas) de uma laje numa grelha. */
export function alinhamentosDaLaje(g: GrelhaPavimento, lajeId: string, u: P): AlinhamentoGrelha[] {
  const m = g.modelo, v: P = [-u[1], u[0]];
  const adj = new Map<number, { no: number; bar: number }[]>();
  m.barras.forEach((br, i) => {
    const tg = g.barras[i];
    if (tg.tipo !== 'laje' || tg.ref !== lajeId || tg.dir !== 0 || !tg.largura) return;
    adj.set(br.i, [...(adj.get(br.i) ?? []), { no: br.j, bar: i }]);
    adj.set(br.j, [...(adj.get(br.j) ?? []), { no: br.i, bar: i }]);
  });
  const visto = new Set<number>(), out: AlinhamentoGrelha[] = [];
  for (const [ini, vz] of adj) {
    if (vz.length !== 1 || visto.has(ini)) continue;
    let nos = [ini], barras: number[] = [];
    visto.add(ini);
    for (;;) { const prox = adj.get(nos.at(-1)!)!.find((x) => !visto.has(x.no)); if (!prox) break; nos.push(prox.no); barras.push(prox.bar); visto.add(prox.no); }
    if (barras.length < 1) continue;
    const a = m.nos[nos[0]], z = m.nos[nos.at(-1)!];
    if ((z[0] - a[0]) * u[0] + (z[1] - a[1]) * u[1] < 0) { nos = nos.reverse(); barras = barras.reverse(); }
    const p0 = m.nos[nos[0]], p1 = m.nos[nos.at(-1)!];
    out.push({ t: ((p0[0] + p1[0]) / 2) * v[0] + ((p0[1] + p1[1]) / 2) * v[1], nos, barras, L: Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) });
  }
  return out.sort((a, z) => a.t - z.t);
}

/**
 * Flecha (m, para baixo) do alinhamento para os fatores `fat` por caso: o maior deslocamento vertical menos a reta entre as pontas
 * (que estão sobre as vigas), como a flecha da laje (`flechaRelativa`). Sem alinhamento com 3 nós, 0.
 */
export function flechaAlinhamento(g: GrelhaPavimento, al: AlinhamentoGrelha, fat: number[], res: Resultado3): number {
  if (al.nos.length < 3) return 0;
  const m = g.modelo, w = (n: number) => fat.reduce((t, f, ic) => t + f * res.desloc[ic][n * 6 + 2], 0);
  const P0 = m.nos[al.nos[0]], w0 = w(al.nos[0]), w1 = w(al.nos.at(-1)!);
  let max = 0;
  for (const n of al.nos) {
    const sx = Math.hypot(m.nos[n][0] - P0[0], m.nos[n][1] - P0[1]) / (al.L || 1);
    max = Math.max(max, -(w(n) - (w0 + sx * (w1 - w0))));
  }
  return max;
}

/** Momento (kN·m por nervura, + traciona embaixo) em cada ponta de uma barra da grelha para os fatores `fat` por caso. */
export function momentosDaBarra(res: Resultado3, barra: number, fat: number[], largura: number, intereixo: number): [number, number] {
  const k = intereixo / largura;
  const mi = fat.reduce((t, f, ic) => t - f * res.esforcos[ic][barra][5], 0) * k, mj = fat.reduce((t, f, ic) => t + f * res.esforcos[ic][barra][11], 0) * k;
  return [mi, mj];
}
