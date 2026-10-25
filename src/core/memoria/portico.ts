// Memória de cálculo detalhada do módulo de pórticos planos 2D (frente MD, fase 8): refaz o dimensionamento do pórtico com o
// registrador ligado (combinações NBR 8681 com coeficientes, esforços por caso e combinação, γz/P-Δ, vigas e pilares de concreto
// NBR 6118, barras de aço NBR 8800) e as fundações do pórtico (as mesmas cadeias da MD5: sapata, bloco, estacas e tubulão).
// A análise é reaproveitada; o resultado do dimensionamento é idêntico ao da execução sem memória.
import { analyze, type Analysis } from '../solver';
import { runDesign, type DesignReport } from '../design';
import { designSupport } from '../foundation';
import { normalizeFoundation, type FoundationKind } from '../piles';
import type { Model } from '../types';
import { Registrador, comMemoria, fm } from './registrador';
import type { MemoriaDetalhada } from './saida';
import { GLOBAL } from './porticoGlobal';
import { registrarBloco } from './bloco';
import { registrarEstaca } from './estaca';
import { registrarSapata } from './sapata';
import { registrarTubulao } from './tubulao';

export const ESCOPO_MD8 = 'Pórtico plano 2D: casos de carga e cargas aplicadas, modelo (nós, barras, apoios), combinações NBR 8681 com os coeficientes (ELU, quase permanente, frequente e rara), desaprumo global θa e a regra dos 30 % do vento, estabilidade global γz (M1 e ΔM por nó, rigidez reduzida) ou análise P-Δ, equilíbrio e deslocamentos por caso. Vigas de concreto (NBR 6118): esforços determinantes (Σ γ·Sk por caso na estação), flexão por face, armadura mínima e máxima, barras, cortante (modelo I), fissuração, flecha com Branson e fluência. Pilares de concreto retangulares, circulares e poligonais: esbeltez, pilar-padrão com curvatura aproximada, flexão composta oblíqua por fibras, armadura, estribos e cortante. Barras de aço (NBR 8800): flambagem local (Anexo F), compressão, flexão com FLT, FLM e FLA (Anexo G), cisalhamento, interação, flecha. Fundações do pórtico: cargas por apoio (reações por caso, raras e ELU) e a cadeia de cada elemento (sapata isolada, bloco sobre estacas, estacas, tubulão) como no módulo Edifícios.';

const NOME_TIPO: Record<FoundationKind, string> = { estacas: 'Bloco sobre estacas', sapata: 'Sapata', tubulao: 'Tubulão' };

export interface OpcoesMemoriaPortico {
  /** Só estes elementos (ex.: "Viga B3"); os passos globais entram sempre. */
  elementos?: string[];
}

export function memoriaPortico(model: Model, an?: Analysis, o: OpcoesMemoriaPortico = {}): { memoria: MemoriaDetalhada; rep: DesignReport; a: Analysis } {
  const a = an ?? analyze(model);
  const sel = o.elementos ? new Set(o.elementos) : null;
  const reg = new Registrador({ filtro: sel ? (e) => e === GLOBAL || sel.has(e) : undefined });
  const t0 = performance.now();
  const rep = comMemoria(reg, () => {
    const r = runDesign(model, a);
    registrarFundacoesPortico(reg, model);
    return r;
  });
  const ms = performance.now() - t0;
  const elementos = [...new Set(reg.passos.map((p) => p.elemento))];
  return { memoria: { versao: 1, obra: model.project?.obra || model.name, escopo: ESCOPO_MD8, passos: reg.passos, elementos, truncado: reg.truncado, ms }, rep, a };
}

/** Fundações do pórtico (módulo Fundações): carga adotada de cada apoio e a cadeia do tipo escolhido. Roda com a memória ligada. */
function registrarFundacoesPortico(reg: Registrador, model: Model) {
  const f0 = model.foundation;
  if (!f0?.loads.length) return;
  const f = normalizeFoundation(f0);
  for (const ld of f.loads) {
    const d = designSupport(ld, f);
    const el = `${NOME_TIPO[d.kind]} ${ld.label}`;
    if (!reg.aceita(el)) continue;
    reg.passo({ etapa: 'esforcos', elemento: el, topico: 'Carga adotada no elemento', descricao: `Carga característica do apoio ${ld.label} usada no cálculo (${ld.source ?? 'informada no módulo Fundações'})`, formula: 'Nk; Nk,mín; Nk,perm; Hx; Hy; Mx; My', expressao: `Nk = ${fm(ld.Nk)} kN; Nk,mín = ${fm(ld.NkMin)} kN; Nk,perm = ${fm(ld.NkPerm ?? ld.Nk)} kN; Hx = ${fm(ld.Hx)}; Hy = ${fm(ld.Hy)} kN; Mx = ${fm(ld.Mx)}; My = ${fm(ld.My)} kN·m`, resultado: ld.Nk, unidade: 'kN', norma: 'NBR 6122:2019', entradas: { Nk: ld.Nk, NkMin: ld.NkMin, NkPerm: ld.NkPerm ?? ld.Nk, Hx: ld.Hx, Hy: ld.Hy, Mx: ld.Mx, My: ld.My } });
    if (d.kind === 'sapata') registrarSapata(reg, el, d);
    else if (d.kind === 'estacas') { registrarEstaca(reg, el, d); registrarBloco(reg, el, d); }
    else registrarTubulao(reg, el, d);
  }
}
