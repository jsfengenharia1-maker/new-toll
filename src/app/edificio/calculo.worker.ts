// Cálculo do edifício fora da linha principal (a planta não trava durante a análise e o dimensionamento).
// O mesmo worker monta as pranchas (formas, locação e armação) com o último cálculo, que fica guardado aqui:
// a análise não volta a atravessar a fronteira a cada prévia.
import { analisarEdificio, type AnaliseEdificio } from '../../core/building/analitico';
import { cargasParaFundacao, dimensionarEdificio } from '../../core/building/dimensionamento';
import { montarConjunto, type OpcoesConjunto } from '../../core/sheets/conjunto';
import type { BuildingModel } from '../../core/building/types';
import type { DimEdificio } from './calculo';

type PedidoConjunto = { tipo: 'conjunto'; id: number; modelo: BuildingModel; calculo: number | null; opcoes: OpcoesConjunto };
type Pedido = { tipo: 'calcular'; id: number; modelo: BuildingModel } | PedidoConjunto;

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
  try {
    const b = m.modelo, r = analisarEdificio(b);
    const t0 = performance.now();
    const dim = r.erro || !r.portico.res ? null : { ...dimensionarEdificio(b, r), fundacao: cargasParaFundacao(b, r), ms: 0 };
    if (dim) dim.ms = performance.now() - t0;
    ultimo = { id: m.id, r, dim };
    responder({ id: m.id, r, dim });
  } catch (err) {
    responder({ id: m.id, erro: (err as Error).message });
  }
};
