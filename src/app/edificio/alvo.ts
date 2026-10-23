// Elemento (viga, pilar, laje, fundação) que está selecionado na planta, para "Resultados do elemento" e para a aba contextual da faixa.
import { useBuilding } from './store';
import { usePlanta } from './plantaStore';
import { pavimentosOrdenados } from '../../core/building/types';
import type { Alvo } from './Revisao';

export function useAlvoSelecionado(): Alvo | null {
  const b = useBuilding((s) => s.sessao.modelo);
  const sel = usePlanta((s) => s.selecao);
  const pav = usePlanta((s) => s.pavimento);
  const ps = pavimentosOrdenados(b);
  const atual = ps.find((p) => p.id === pav) ?? ps[Math.min(1, ps.length - 1)];
  for (const id of sel) {
    if (b.fundacao?.elementos.some((x) => x.id === id) || b.fundacao?.vigas?.some((x) => x.id === id) || b.fundacao?.radiers?.some((x) => x.id === id) || b.fundacao?.vigasElasticas?.some((x) => x.id === id) || b.fundacao?.corridas?.some((x) => x.id === id)) return { tipo: 'fundacao', id };
    if (b.vigas.some((x) => x.id === id)) return { tipo: 'viga', id };
    if (b.pilares.some((x) => x.id === id)) return { tipo: 'pilar', id, pavimento: atual?.nome };
    if (b.lajes.some((x) => x.id === id)) return { tipo: 'laje', id, pavimento: atual?.nome };
  }
  return null;
}
