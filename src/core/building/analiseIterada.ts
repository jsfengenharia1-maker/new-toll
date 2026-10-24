// Análise do edifício com a iteração de B das molas dos pilares-parede (frente FU, fatia FU7d). Pilar-parede de base sobre
// molas de Winkler (FU7c) com sapata lançada sob ele: a largura B das molas depende da sapata, e a sapata das reações da
// base. A análise é repetida com A × B da sapata calculada na iteração anterior até a variação de A e B ficar abaixo da
// tolerância (opção `fundBaseIterTol`, padrão 5 cm) ou esgotar `fundBaseIterMax` análises. Sem pilar-parede nessa condição,
// ou com a opção `fundBaseIterada` desligada, é exatamente `analisarEdificio`. Unidades: m.
import { analisarEdificio, type AnaliseEdificio, type OpcoesAnalise } from './analitico';
import type { DimsSapataPP, IteracaoBaseMolas, PassoIteracaoB } from './baseMolasPP';
import { calcularFundacaoEdificio } from './fundacao';
import { opcoesEmUso, perfilDe } from './opcoes';
import type { BuildingModel } from './types';

/** Pilares-parede de base sobre molas que têm sapata isolada lançada: id do pilar-parede → id do elemento. */
export function paresMolasSapata(b: BuildingModel): Map<string, string> {
  const m = new Map<string, string>();
  for (const pp of b.pilaresParede ?? []) {
    if (pp.nasce !== 'fundacao' || pp.vinculoBase !== 'molas') continue;
    const e = b.fundacao?.elementos.find((x) => x.tipo === 'sapata' && x.pilares.length === 1 && x.pilares[0] === pp.id);
    if (e) m.set(pp.id, e.id);
  }
  return m;
}

export function analisarEdificioIterado(b: BuildingModel, o: Partial<OpcoesAnalise> = {}, extra: { cheio?: boolean } = {}): AnaliseEdificio {
  const op = { ...opcoesEmUso(b.opcoes, perfilDe(b)), ...o }, pares = paresMolasSapata(b);
  if (!op.fundBaseIterada || !pares.size || o.baseMolasPP) return analisarEdificio(b, o, extra);
  const tol = op.fundBaseIterTol / 100, maximo = Math.max(1, Math.round(op.fundBaseIterMax));
  const passos: PassoIteracaoB[] = [];
  let dims: Record<string, DimsSapataPP> = {}, an!: AnaliseEdificio, convergiu = false, it = 0;
  while (it < maximo) {
    it++;
    an = analisarEdificio(b, { ...o, ...(Object.keys(dims).length ? { baseMolasPP: dims } : {}) }, extra);
    if (an.erro) return an;
    const calc = calcularFundacaoEdificio(b, an, { ids: [...pares.values()], modo: 0 });
    const novo: Record<string, DimsSapataPP> = {};
    let delta = 0;
    for (const [pp, el] of pares) {
      const r = calc.elementos.find((x) => x.id === el);
      if (!r || !r.dims.A || !r.dims.B) continue;
      const c: DimsSapataPP = { A: r.dims.A, B: r.dims.B, angulo: r.angulo }, u = dims[pp] ?? null;
      const v = u ? Math.max(Math.abs(c.A - u.A), Math.abs(c.B - u.B)) : Infinity;
      delta = Math.max(delta, v);
      passos.push({ iteracao: it, pilarParede: pp, usadas: u, calculadas: c, variacao: v });
      novo[pp] = c;
    }
    if (!Object.keys(novo).length) { an.avisos.push('Iteração de B das molas: a sapata do pilar-parede não pôde ser calculada (reações ou sondagem ausentes); usado B = espessura + 2 × balanço.'); return an; }
    if (delta <= tol + 1e-9) { convergiu = true; break; }
    dims = { ...dims, ...novo };
  }
  const resultado: IteracaoBaseMolas = { convergiu, iteracoes: it, tolerancia: tol, maximo, dims, passos };
  if (!convergiu) an.avisos.push(`Iteração de B das molas do pilar-parede: sem convergência em ${it} análises (variação de A e B acima de ${op.fundBaseIterTol} cm); resultado da última análise.`);
  return { ...an, baseIterada: resultado };
}
