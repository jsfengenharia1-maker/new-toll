// Cálculo do edifício fora da linha principal (a planta não trava durante a análise e o dimensionamento).
// O mesmo worker monta as pranchas (formas, locação e armação) com o último cálculo, que fica guardado aqui:
// a análise não volta a atravessar a fronteira a cada prévia.
import { analisarEdificio, type AnaliseEdificio } from '../../core/building/analitico';
import { cargasParaFundacao, dimensionarEdificio, type Dimensionamento } from '../../core/building/dimensionamento';
import { ehArranque } from '../../core/building/types';
import type { FLoad } from '../../core/piles';
import { montarConjunto, type OpcoesConjunto } from '../../core/sheets/conjunto';
import type { BuildingModel } from '../../core/building/types';
import { calcularFundacoes, type ResultadoFundacao } from '../../core/building/fundacao';
import type { DimEdificio } from './calculo';

type PedidoConjunto = { tipo: 'conjunto'; id: number; modelo: BuildingModel; calculo: number | null; opcoes: OpcoesConjunto };
type Pedido = { tipo: 'calcular'; id: number; modelo: BuildingModel; anteriores?: ResultadoFundacao[]; semFundacao?: boolean } | PedidoConjunto | { tipo: 'fundacao'; id: number; modelo: BuildingModel; calculo: number; anteriores?: ResultadoFundacao[] };

const responder = (m: object) => (self as unknown as Worker).postMessage(m);

/** Último cálculo concluído (as pranchas de armação usam este, pelo id). */
let ultimo: { id: number; r: AnaliseEdificio; dim: DimEdificio | null } | null = null;
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
  if (m.tipo === 'fundacao') {
    // só as fundações, com a análise do último cálculo (a estrutura não é refeita)
    try {
      if (!ultimo || ultimo.id !== m.calculo) { responder({ id: m.id, erro: 'Resultados do cálculo indisponíveis em segundo plano; recalcule na aba Dimensionamento.' }); return; }
      const fundacoes = calcularFundacoes(m.modelo, ultimo.r, { anteriores: m.anteriores });
      if (ultimo.dim) ultimo.dim.fundacoes = fundacoes;
      responder({ id: m.id, fundacoes });
    } catch (err) {
      responder({ id: m.id, erro: (err as Error).message });
    }
    return;
  }
  try {
    const b = m.modelo, r = analisarEdificio(b);
    const t0 = performance.now();
    // obra só com arranques (sem estrutura para analisar): calcula só as fundações, com as cargas lançadas nos arranques
    const soArranques = b.pilares.length > 0 && b.pilares.every(ehArranque) && !!b.fundacao?.elementos.length;
    const dim = r.erro || !r.portico.res ? (soArranques ? {
      ...({ vigas: [], pilares: [], lajes: [], quantitativos: [], combinacoes: 0, fundacoes: m.semFundacao ? undefined : calcularFundacoes(b, r, { anteriores: m.anteriores }) } as Dimensionamento),
      fundacao: cargasParaFundacao(b, r) as FLoad[], ms: 0,
    } as DimEdificio : null) : { ...dimensionarEdificio(b, r, { fundacao: m.semFundacao ? false : { anteriores: m.anteriores } }), fundacao: cargasParaFundacao(b, r), ms: 0 };
    if (dim) dim.ms = performance.now() - t0;
    ultimo = { id: m.id, r, dim };
    responder({ id: m.id, r, dim });
  } catch (err) {
    responder({ id: m.id, erro: (err as Error).message });
  }
};
