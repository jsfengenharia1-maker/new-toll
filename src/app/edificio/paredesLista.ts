// Lista de paredes (E1c): resumo puro por parede, usado pela tabela de ParedesUI.tsx e pelos testes.
import { comprimentoParede } from '../../core/building/paredesBase';
import type { BuildingModel } from '../../core/building/types';

const m2cm = (v: number) => +(v * 100).toFixed(2);

/** Linhas da lista de paredes (comprimento em m, espessura total em cm). */
export function linhasParedes(b: BuildingModel) {
  return (b.paredes ?? []).map((w) => ({
    id: w.id,
    nome: w.nome,
    trechos: w.pontos.length - 1,
    comprimento: +comprimentoParede(w).toFixed(2),
    e: m2cm(w.esq + w.dir),
    nAberturas: w.aberturas?.length ?? 0,
    empuxo: (w.empuxos?.length ?? 0) > 0,
  }));
}

