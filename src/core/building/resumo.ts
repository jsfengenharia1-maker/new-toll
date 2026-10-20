// Resumo da análise do edifício (sem o código de cálculo: pode ir para a interface sem pesar no pacote).
import type { AnaliseEdificio, CasoAnalise } from './analitico';
import type { BuildingModel } from './types';
import { combinacoesEdificio, combinar } from './combinacoes';

/** Resumo legível da análise (nomes no lugar dos ids), para a interface, a linha de comando e o MCP. */
export function resumoAnalise(b: BuildingModel, an: AnaliseEdificio) {
  const nomeP = (id: string) => b.pilares.find((p) => p.id === id)?.nome ?? id;
  const nomePav = (id: string) => b.pavimentos.find((p) => p.id === id)?.nome ?? id;
  const combs = combinacoesEdificio(b, an);
  const porPilar = new Map<string, Record<string, { N: number; Mx: number; My: number; Vx: number; Vy: number }>>();
  for (const f of an.fundacao) { const r = porPilar.get(f.pilar) ?? {}; r[f.caso] = f; porPilar.set(f.pilar, r); }
  const fund = [...porPilar].map(([id, r]) => {
    const N = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.N]));
    const ws = Object.keys(r).filter((k) => k.startsWith('W'));
    const env = (t: 'ELU' | 'RARA') => { const v = combs.filter((c) => c.tipo === t).map((c) => combinar(N, c)); return v.length ? [Math.min(...v), Math.max(...v)] : [0, 0]; };
    const [eluMin, eluMax] = env('ELU'), [, raraMax] = env('RARA');
    const r2 = (v: number) => +v.toFixed(2);
    return {
      pilar: nomeP(id), NG: r2(r.G?.N ?? 0), NQ: r2(r.Q?.N ?? 0),
      NW: r2(ws.reduce((m, k) => (Math.abs(r[k].N) > Math.abs(m) ? r[k].N : m), 0)),
      MxG: r2(r.G?.Mx ?? 0), MyG: r2(r.G?.My ?? 0), HxG: r2(r.G?.Vx ?? 0), HyG: r2(r.G?.Vy ?? 0),
      NraraMax: r2(raraMax), NdMax: r2(eluMax), NdMin: r2(eluMin),
    };
  });
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
    fundacao: fund,
    vento: an.vento ? {
      classe: an.vento.classe, altura: +an.vento.altura.toFixed(2),
      gamaZ: an.vento.gamaZ.map((g) => ({ direcao: g.direcao, gamaZ: +g.max.toFixed(3), ventoPrincipal: +g.ventoPrincipal.toFixed(3), usoPrincipal: +g.usoPrincipal.toFixed(3), ampliacaoVento: +g.ampliacao.toFixed(3) })),
      forcas: an.vento.casos.filter((c) => c.exc === 0 && (c.direcao === 0 || c.direcao === 90)).map((c) => ({ caso: c.nome, pavimentos: c.forcas.map((f) => ({ pavimento: nomePav(f.pavimento), z: +f.z.toFixed(2), largura: +f.largura.toFixed(2), vk: +f.vk.toFixed(2), F: +Math.abs(f.F).toFixed(2) })) })),
    } : null,
    combinacoes: combs.length,
    flechasElasticas: flechas,
    opcoes: an.opcoes,
  };
}
