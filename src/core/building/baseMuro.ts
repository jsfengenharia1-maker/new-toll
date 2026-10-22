// Base do muro de arrimo isolado (E1d, X6) na fundação do edifício (frente FU, fatia FU7b): a σadm do muro que não traz a
// sua vem do terreno (informada ou estimada pelo SPT das sondagens da obra), a cota de assentamento e a profundidade
// abaixo do terreno entram na verificação da tensão máxima na base (`estabilidadeMuro`) e os quantitativos da base
// (concreto, forma e aço da ponta, do talão e da distribuição) somam-se aos da fundação. A estabilidade ao tombamento e ao
// deslizamento e a armadura do fuste e da base seguem em `muroArrimoDim.ts` (por metro); aqui só o que depende do solo da obra.
import { barArea } from '../concrete';
import { sigmaProvider } from '../footings';
import type { FoundationParams } from '../piles';
import { cotaTerreno, parametrosElemento, parametrosFundacao } from './fundacao';
import { dimensionarMuroArrimo, matMuroDe } from './muroArrimoDim';
import type { OpcoesCalculo } from './opcoes';
import { cotaFundacao, type BuildingModel, type MuroArrimoObra } from './types';

export interface ResultadoBaseMuro {
  id: string; nome: string;
  /** Largura da base, espessura da base (m), cota de assentamento e profundidade abaixo do terreno (m). */
  B: number; hBase: number; cota: number; profundidade: number;
  /** σadm usada (kN/m²; null = sem valor) e de onde veio: própria do muro, informada do terreno ou estimada pelo SPT. */
  sigmaAdm: number | null; sigmaFonte: 'propria' | 'terreno' | 'spt' | 'nenhuma';
  /** Tensão máxima na base (kN/m², rara por metro, com a sobrecarga) e folga em relação à σadm. */
  sigmaMax: number; folga: number | null; atende: boolean;
  /** Comprimento do muro (m; null = só por metro) e quantitativos da base por metro e totais (totais só com o comprimento). */
  comprimento: number | null;
  porMetro: { concreto: number; forma: number; aco: number };
  total: { concreto: number; forma: number; aco: number } | null;
  status: 'ok' | 'fail';
  mensagens: string[]; notas: string[];
}

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');

/** Barras da base do muro por metro (ponta, talão e distribuição): aço (kg/m). */
const BASE_DESC = /^(Ponta|Talão|Base)/;

/** σadm da base do muro: a própria, a informada do terreno ou a menor estimada pelo SPT dos furos da obra (o muro não tem posição). */
export function sigmaDoMuro(b: BuildingModel, m: MuroArrimoObra, P: FoundationParams): { s: number | null; fonte: ResultadoBaseMuro['sigmaFonte'] } {
  if (m.sigmaAdm !== undefined) return { s: m.sigmaAdm, fonte: 'propria' };
  const fe = b.fundacao;
  if (fe?.terreno.sigmaModo === 'informada' && fe.terreno.sigmaAdm) return { s: fe.terreno.sigmaAdm, fonte: 'terreno' };
  if (fe?.sondagens.length) {
    const PS: FoundationParams = { ...P, ftSigmaMode: 'spt' };
    const v = fe.sondagens.map((bo) => sigmaProvider(bo, PS)(m.B)?.s).filter((x): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0);
    if (v.length) return { s: Math.min(...v), fonte: 'spt' };
  }
  return { s: null, fonte: 'nenhuma' };
}

/** Bases dos muros de arrimo isolados da obra, com a σadm da fundação. */
export function calcularBasesMuros(b: BuildingModel, op: OpcoesCalculo): ResultadoBaseMuro[] {
  const P0 = parametrosFundacao(b), zt = cotaTerreno(b);
  return (b.murosArrimo ?? []).map((m) => {
    const msgs: string[] = [], notas: string[] = [];
    const cota = m.cota ?? cotaFundacao(b), prof = +(zt - cota).toFixed(3);
    const P = parametrosElemento(P0, { tipo: 'sapata', cota: m.cota }, prof);
    const sg = sigmaDoMuro(b, m, P);
    if (prof <= 0) msgs.push(`Base do muro ${m.nome}: cota de assentamento ${fmt(cota)} m igual ou acima do terreno (${fmt(zt)} m).`);
    if (sg.fonte === 'nenhuma') msgs.push(`Base do muro ${m.nome}: sem σadm (nem própria, nem do terreno, nem sondagem): a tensão na base não é verificada contra o solo da obra.`);
    const r = dimensionarMuroArrimo({ ...m, ...(sg.s !== null ? { sigmaAdm: sg.s } : {}) }, matMuroDe(b, op));
    const est = r.estabilidade;
    const atende = sg.s === null || est.sigmaMax <= sg.s + 1e-9;
    if (!atende && sg.fonte !== 'propria') msgs.push(`Base do muro ${m.nome}: tensão máxima ${fmt(est.sigmaMax, 1)} kN/m² acima da σadm ${fmt(sg.s!, 1)} kN/m² ${sg.fonte === 'spt' ? '(estimada pelo SPT, menor furo)' : '(terreno)'}: aumente a largura da base.`);
    const aco = r.barras.filter((x) => BASE_DESC.test(x.descricao)).reduce((t, x) => t + x.nPorM * x.comprimento * barArea(x.phi) * 7850, 0);
    const porMetro = { concreto: m.B * m.hBase, forma: 2 * m.hBase, aco };
    if (sg.fonte === 'spt') notas.push(`σadm estimada pelo SPT (N̄/${P.ftSptDiv} MPa, a confirmar) com a largura B = ${fmt(m.B)} m: menor valor entre ${b.fundacao!.sondagens.length} furo(s); o muro não tem posição em planta.`);
    if (sg.fonte === 'terreno') notas.push('σadm informada do terreno.');
    notas.push(`Cota de assentamento ${fmt(cota)} m (${fmt(prof)} m abaixo do terreno)${m.cota === undefined ? ', a de fundação da obra' : ''}; sem empuxo passivo na frente da base.`);
    const total = m.comprimento ? { concreto: porMetro.concreto * m.comprimento, forma: porMetro.forma * m.comprimento, aco: aco * m.comprimento } : null;
    const falha = msgs.some((t) => /acima da σadm|igual ou acima do terreno/.test(t));
    return {
      id: m.id, nome: m.nome, B: m.B, hBase: m.hBase, cota, profundidade: prof, sigmaAdm: sg.s, sigmaFonte: sg.fonte, sigmaMax: est.sigmaMax,
      folga: sg.s === null ? null : sg.s - est.sigmaMax, atende, comprimento: m.comprimento ?? null, porMetro, total, status: falha ? 'fail' : 'ok', mensagens: msgs, notas,
    };
  });
}
