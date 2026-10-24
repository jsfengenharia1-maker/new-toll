// Estado da seção das vigas e dos pilares retangulares do dimensionamento (V5, K1.11.30): monta a seção de fibras com a
// armadura adotada e resolve o estado último para o esforço determinante. Pilar circular (V7c): mesmo arranjo e mesma
// resolução por fibras; o edifício só tem pilares retangulares e circulares (`SecaoPilar`), e `secaoArmada` atende polígono qualquer.
import type { Dimensionamento, ResultadoPilar, ResultadoViga } from '../building/dimensionamento';
import { acoDe, concretoDe, cobrimentoPilar, cobrimentoViga } from '../building/materiais';
import { lancesDoPilar, type BuildingModel } from '../building/types';
import { barrasDaViga, barrasDoArranjo, barrasDoCirculo, estadoDaSecao, secaoCircularArmada, secaoRetangularArmada, type EstadoDaSecao } from './estadoSecao';

export interface EstadoDoElemento { estado: EstadoDaSecao; /** forma da seção (retângulo ou círculo de diâmetro b = h = D) */ forma?: 'ret' | 'circ'; /** seção b × h (m) e barras, para o desenho */ b: number; h: number; barras: { x: number; y: number; A: number }[]; rotulo: string }

/** Viga: momento positivo máximo de cálculo com a armadura inferior (e a superior, quando há); M > 0 comprime a face de cima. */
export function estadoDaViga(b: BuildingModel, r: ResultadoViga): EstadoDoElemento | null {
  const v = b.vigas.find((x) => x.id === r.viga);
  if (!v || !r.arranjo.inf || r.Mpos <= 0) return null;
  const cob = cobrimentoViga(b, v.cobrimento), a = cob.inf + 0.005 + 0.008, aS = cob.sup + 0.005 + 0.008;
  const barras = barrasDaViga(v.secao.b, v.secao.h, { ...r.arranjo.inf, a }, r.arranjo.sup ? { ...r.arranjo.sup, a: aS } : undefined);
  const S = secaoRetangularArmada(v.secao.b, v.secao.h, barras, concretoDe(b, 'viga'), acoDe(b, 'vigaPos').fyd);
  return { estado: estadoDaSecao(S, 0, 0, r.Mpos), b: v.secao.b, h: v.secao.h, barras, rotulo: `${r.nome}: Md+ = ${r.Mpos.toFixed(2).replace('.', ',')} kN·m` };
}

/**
 * Pilar retangular ou circular: combinação determinante (Nd, momentos totais nas duas direções) com o arranjo adotado.
 * Circular: n barras igualmente espaçadas, centro das barras a cobrimento + 5 mm + φ/2 da borda (como no dimensionamento);
 * o momento resultante é a soma vetorial dos dois planos, e a seção gira para a direção dele.
 */
export function estadoDoPilar(b: BuildingModel, r: ResultadoPilar): EstadoDoElemento | null {
  const p = b.pilares.find((x) => x.id === r.pilar), det = r.determinantes?.[0], arr = r.arranjo;
  if (!p || !det || !arr) return null;
  const lance = lancesDoPilar(b, p).find((l) => l.id === r.pavimentoId) ?? lancesDoPilar(b, p)[0];
  const sec = lance ? (p.secoes?.find((x) => x.pavimento === lance.id)?.secao ?? p.secao) : p.secao;
  const rot = `${r.nome}: Nd = ${det.Nd.toFixed(0)} kN, Mu = ${det.MuTot.toFixed(1).replace('.', ',')} kN·m, Mv = ${det.MvTot.toFixed(1).replace('.', ',')} kN·m`;
  if (sec.tipo === 'circ') {
    if (arr.n === undefined) return null;
    const a = cobrimentoPilar(b, p.cobrimento) + 0.005 + arr.phi / 2000;
    const barras = barrasDoCirculo(sec.d, a, arr.n, arr.phi);
    const S = secaoCircularArmada(sec.d, barras, concretoDe(b, 'pilar', lance?.id, p), acoDe(b, 'pilarLong').fyd);
    return { estado: estadoDaSecao(S, det.Nd, Math.abs(det.MvTot), Math.abs(det.MuTot)), forma: 'circ', b: sec.d, h: sec.d, barras, rotulo: rot };
  }
  if (arr.n !== undefined || sec.tipo !== 'ret') return null;
  // u ao longo de b e v ao longo de h; a seção é desenhada com x = b e y = h
  const a = 0.04 + arr.estribo.phi / 1000 + arr.phi / 2000;
  const barras = barrasDoArranjo(sec.b, sec.h, a, arr);
  const S = secaoRetangularArmada(sec.b, sec.h, barras, concretoDe(b, 'pilar', lance?.id, p), acoDe(b, 'pilarLong').fyd);
  // momento fletor em torno do eixo x comprime y+ (MuTot no plano de h); em torno de y comprime x+
  const estado = estadoDaSecao(S, det.Nd, Math.abs(det.MvTot), Math.abs(det.MuTot));
  return { estado, forma: 'ret', b: sec.b, h: sec.h, barras, rotulo: rot };
}

export const estadosDasVigas = (b: BuildingModel, dim: Dimensionamento) => dim.vigas.flatMap((r) => { const e = estadoDaViga(b, r); return e ? [{ id: r.viga, ...e }] : []; });
