// Resumo da análise do edifício (sem o código de cálculo: pode ir para a interface sem pesar no pacote).
import type { AnaliseEdificio, CasoAnalise } from './analitico';
import type { BuildingModel } from './types';

/** Resumo legível da análise (nomes no lugar dos ids), para a interface, a linha de comando e o MCP. */
export function resumoAnalise(b: BuildingModel, an: AnaliseEdificio) {
  const nomeP = (id: string) => b.pilares.find((p) => p.id === id)?.nome ?? id;
  const nomePav = (id: string) => b.pavimentos.find((p) => p.id === id)?.nome ?? id;
  type Linha = { NG: number; NQ: number; MxG: number; MxQ: number; MyG: number; MyQ: number; HxG: number; HyG: number };
  const fund = new Map<string, Linha>();
  for (const f of an.fundacao) {
    const r = fund.get(f.pilar) ?? { NG: 0, NQ: 0, MxG: 0, MxQ: 0, MyG: 0, MyQ: 0, HxG: 0, HyG: 0 };
    r[`N${f.caso}`] = +f.N.toFixed(2); r[`Mx${f.caso}`] = +f.Mx.toFixed(2); r[`My${f.caso}`] = +f.My.toFixed(2);
    if (f.caso === 'G') { r.HxG = +f.Vx.toFixed(2); r.HyG = +f.Vy.toFixed(2); }
    fund.set(f.pilar, r);
  }
  const flechas = an.grelhas.filter((g) => g.res).map((g) => {
    const lajes = new Set(g.modelo.barras.map((br, i) => (g.barras[i].tipo === 'laje' ? [br.i, br.j] : [])).flat());
    const max = (ic: number) => Math.max(0, ...[...lajes].map((n) => -g.res!.desloc[ic][n * 6 + 2]));
    return { pavimento: nomePav(g.pavimento), flechaG_mm: +(max(0) * 1000).toFixed(2), flechaQ_mm: +(max(1) * 1000).toFixed(2), cargaG: +g.carga.G.toFixed(2), cargaQ: +g.carga.Q.toFixed(2) };
  });
  const somaN = (c: CasoAnalise) => an.fundacao.filter((f) => f.caso === c).reduce((s, f) => s + f.N, 0);
  return {
    erro: an.erro, avisos: an.avisos, gdl: an.gdl, ms: Math.round(an.ms),
    totais: { G: +an.totais.G.toFixed(2), Q: +an.totais.Q.toFixed(2) },
    equilibrio: { G: +(somaN('G') - an.totais.G).toFixed(4), Q: +(somaN('Q') - an.totais.Q).toFixed(4) },
    fundacao: [...fund].map(([id, r]) => ({ pilar: nomeP(id), ...r })),
    flechasElasticas: flechas,
    opcoes: an.opcoes,
  };
}
