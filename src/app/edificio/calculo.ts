// Cliente do worker de cálculo. O código da análise e da montagem das pranchas só existe dentro do worker
// (não pesa duas vezes no pacote e a interface não trava).
import CalculoWorker from './calculo.worker?worker&inline';
import type { AnaliseEdificio } from '../../core/building/analitico';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import type { BuildingModel } from '../../core/building/types';
import type { OpcoesConjunto } from '../../core/sheets/conjunto';
import type { Prancha } from '../../core/sheets/prancha';
import type { FLoad } from '../../core/piles';

/** Dimensionamento + cargas para o módulo Fundações (null se a análise falhou). */
export type DimEdificio = Dimensionamento & { fundacao: FLoad[]; ms: number };
export interface Conjunto { pranchas: Prancha[]; avisos: string[] }
type Msg = { id: number; r?: AnaliseEdificio; dim?: DimEdificio | null; conjunto?: Conjunto; obsoleto?: boolean; erro?: string };

/** Pedido substituído por um mais novo antes de ser montado (quem pediu deve ignorá-lo). */
export class Obsoleto extends Error { constructor() { super('Pedido substituído por um mais novo.'); } }

let w: Worker | null = null;
let seq = 0;
const pendentes = new Map<number, (r: Msg) => void>();

function pedir<T>(m: object, ler: (r: Msg) => T): Promise<T> {
  if (typeof Worker === 'undefined') return Promise.reject(new Error('Este navegador não executa Web Workers.'));
  if (!w) {
    try {
      w = new CalculoWorker();
      w.onmessage = (e: MessageEvent<Msg>) => { pendentes.get(e.data.id)?.(e.data); pendentes.delete(e.data.id); };
    } catch { return Promise.reject(new Error('Não foi possível iniciar o cálculo em segundo plano neste ambiente.')); }
  }
  const id = ++seq;
  return new Promise((ok, falha) => {
    pendentes.set(id, (r) => { try { ok(ler(r)); } catch (e) { falha(e); } });
    w!.postMessage({ ...m, id });
  });
}

/** Analisa e dimensiona; `id` identifica o cálculo no worker (as pranchas de armação são montadas com ele). */
export function calcular(modelo: BuildingModel): Promise<{ analise: AnaliseEdificio; dim: DimEdificio | null; id: number }> {
  return pedir({ tipo: 'calcular', modelo }, (m) => {
    if (!m.r) throw new Error(m.erro ?? 'Falha no cálculo.');
    return { analise: m.r, dim: m.dim ?? null, id: m.id };
  });
}

/**
 * Monta o conjunto de pranchas no worker. `calculo`: id do cálculo em vigor (null = sem cálculo: as pranchas de armação
 * ficam de fora e a locação sai sem cargas). Rejeita com `Obsoleto` quando um pedido mais novo o substitui.
 */
export function montarConjuntoNoWorker(modelo: BuildingModel, calculo: number | null, opcoes: OpcoesConjunto): Promise<Conjunto> {
  return pedir({ tipo: 'conjunto', modelo, calculo, opcoes }, (m) => {
    if (m.obsoleto) throw new Obsoleto();
    if (!m.conjunto) throw new Error(m.erro ?? 'Falha ao montar as pranchas.');
    return m.conjunto;
  });
}
