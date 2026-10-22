// Lista de paredes (E1c): resumo puro por parede, usado pela tabela de ParedesUI.tsx e pelos testes.
import { acumulados, comprimentoParede } from '../../core/building/paredesBase';
import type { BuildingModel, Parede } from '../../core/building/types';

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


/** Segmentos (no eixo, m) das aberturas da parede cuja base é o pavimento dado (s medido ao longo da polilinha). */
export function aberturasNaPlanta(_b: BuildingModel, w: Parede, pavimento: string): [number, number][][] {
  const acum = acumulados(w.pontos), out: [number, number][][] = [];
  for (const a of w.aberturas ?? []) {
    if (a.pavimento !== pavimento) continue;
    const s0 = a.s, s1 = a.s + a.largura;
    for (let i = 0; i + 1 < w.pontos.length; i++) {
      const t0 = Math.max(s0, acum[i]), t1 = Math.min(s1, acum[i + 1]);
      if (t1 - t0 <= 1e-9) continue;
      const [x0, y0] = w.pontos[i], [x1, y1] = w.pontos[i + 1], L = acum[i + 1] - acum[i];
      const at = (s: number): [number, number] => { const u = (s - acum[i]) / L; return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u]; };
      out.push([at(t0), at(t1)]);
    }
  }
  return out;
}
