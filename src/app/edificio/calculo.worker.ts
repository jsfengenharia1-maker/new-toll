// Cálculo do edifício fora da linha principal (a planta não trava durante a análise e o dimensionamento).
// O mesmo worker monta as pranchas (formas, locação e armação) com o último cálculo, que fica guardado aqui:
// a análise não volta a atravessar a fronteira a cada prévia.
import { type AnaliseEdificio } from '../../core/building/analitico';
import { analisarEdificioIterado } from '../../core/building/analiseIterada';
import { cargasParaFundacao, comFundacao, dimensionarEdificio, type Dimensionamento } from '../../core/building/dimensionamento';
import { ehArranque } from '../../core/building/types';
import type { FLoad } from '../../core/piles';
import { rearmar } from '../../core/building/rearmar';
import { montarConjunto, type OpcoesConjunto } from '../../core/sheets/conjunto';
import type { BuildingModel } from '../../core/building/types';
import type { ResultadoFundacao } from '../../core/building/fundacao';
import type { DimEdificio } from './calculo';

type PedidoConjunto = { tipo: 'conjunto'; id: number; modelo: BuildingModel; calculo: number | null; opcoes: OpcoesConjunto };
type Pedido = { tipo: 'calcular'; id: number; modelo: BuildingModel; anteriores?: ResultadoFundacao[]; semFundacao?: boolean; esforcosRev?: number } | PedidoConjunto | { tipo: 'rearmar'; id: number; modelo: BuildingModel; calculo: number; modo: 'todos' | 'alterados' } | { tipo: 'fundacao'; id: number; modelo: BuildingModel; calculo: number; anteriores?: ResultadoFundacao[] };

const responder = (m: object) => (self as unknown as Worker).postMessage(m);

/** Último cálculo concluído (as pranchas de armação usam este, pelo id). */
let ultimo: { id: number; r: AnaliseEdificio; dim: DimEdificio | null; /** modelo analisado, modelo do último dimensionamento e revisão de cálculo da análise (rearmar, R7f) */ modeloAnalise: BuildingModel; modeloDim: BuildingModel; esforcosRev: number } | null = null;
/** Pedido de pranchas ainda não atendido: um mais novo substitui o anterior (que responde "obsoleto"). */
let pendente: PedidoConjunto | null = null;

function montar() {
  const m = pendente;
  if (!m) return;
  pendente = null;
  try {
    const calc = m.calculo === null ? null : ultimo?.id === m.calculo ? ultimo : undefined;
    if (calc === undefined) { responder({ id: m.id, erro: 'Resultados do cálculo indisponíveis em segundo plano; recalcule na aba Dimensionamento.' }); return; }
    responder({ id: m.id, conjunto: montarConjunto(m.modelo, calc?.r ?? null, calc?.dim ?? null, m.opcoes) });
  } catch (err) {
    responder({ id: m.id, erro: (err as Error).message });
  }
}

self.onmessage = (e: MessageEvent<Pedido>) => {
  const m = e.data;
  if (m.tipo === 'conjunto') {
    if (pendente) responder({ id: pendente.id, obsoleto: true });
    pendente = m;
    // deixa chegar o que já está na fila antes de montar: só o pedido mais novo é atendido
    setTimeout(montar, 0);
    return;
  }
  if (m.tipo === 'rearmar') {
    // só o dimensionamento e o detalhamento, com a análise do último cálculo (a análise não é refeita)
    try {
      if (!ultimo || ultimo.id !== m.calculo || !ultimo.dim) { responder({ id: m.id, erro: 'Resultados do cálculo indisponíveis em segundo plano; recalcule na aba Dimensionamento.' }); return; }
      const t0 = performance.now();
      const r = rearmar(m.modelo, ultimo.r, { modo: m.modo, anterior: ultimo.dim, modeloAnterior: ultimo.modeloDim, modeloAnalise: ultimo.modeloAnalise, esforcosRev: ultimo.esforcosRev });
      if ('erro' in r) { responder({ id: m.id, erro: r.erro }); return; }
      const dim = { ...r.dim, fundacao: ultimo.dim.fundacao, ms: performance.now() - t0 } as DimEdificio;
      ultimo = { ...ultimo, id: m.id, dim, modeloDim: m.modelo };
      responder({ id: m.id, dim });
    } catch (err) {
      responder({ id: m.id, erro: (err as Error).message });
    }
    return;
  }
  if (m.tipo === 'fundacao') {
    // só as fundações, com a análise do último cálculo (a estrutura não é refeita)
    try {
      if (!ultimo || ultimo.id !== m.calculo) { responder({ id: m.id, erro: 'Resultados do cálculo indisponíveis em segundo plano; recalcule na aba Dimensionamento.' }); return; }
      const f = comFundacao(m.modelo, ultimo.r, { anteriores: m.anteriores });
      if (ultimo.dim) { delete ultimo.dim.vigasFundacao; delete ultimo.dim.avisosFundacao; delete ultimo.dim.corridas; delete ultimo.dim.basesMuros; Object.assign(ultimo.dim, f); }
      responder({ id: m.id, fundacoes: f });
    } catch (err) {
      responder({ id: m.id, erro: (err as Error).message });
    }
    return;
  }
  try {
    const b = m.modelo, r = analisarEdificioIterado(b);
    const t0 = performance.now();
    // obra só com arranques (sem estrutura para analisar): calcula só as fundações, com as cargas lançadas nos arranques
    const soArranques = b.pilares.every(ehArranque) && !!(b.fundacao?.elementos.length || b.fundacao?.corridas?.length);
    const dim = r.erro || !r.portico.res ? (soArranques ? {
      ...({ vigas: [], pilares: [], lajes: [], quantitativos: [], combinacoes: 0, ...(m.semFundacao ? {} : comFundacao(b, r, { anteriores: m.anteriores })) } as Dimensionamento),
      fundacao: cargasParaFundacao(b, r) as FLoad[], ms: 0,
    } as DimEdificio : null) : { ...dimensionarEdificio(b, r, { fundacao: m.semFundacao ? false : { anteriores: m.anteriores } }), fundacao: cargasParaFundacao(b, r), ms: 0 };
    if (dim) dim.ms = performance.now() - t0;
    ultimo = { id: m.id, r, dim, modeloAnalise: b, modeloDim: b, esforcosRev: m.esforcosRev ?? 0 };
    responder({ id: m.id, r, dim });
  } catch (err) {
    responder({ id: m.id, erro: (err as Error).message });
  }
};
