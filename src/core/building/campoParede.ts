// Campos de tensões e de deslocamentos de um lado de parede ou pilar-parede em casca (E1d, K1.11.36): triângulos no plano
// (s, z) do lado com um valor por triângulo (tensões, no centroide) ou por vértice (deslocamentos, médias no triângulo),
// com mínimo e máximo, para o desenho de isovalores em SVG pela interface. Sem dependência de DOM.
import type { AnaliseEdificio } from './analitico';
import type { CombinacaoEd } from './combinacoes';
import { forcasDe, type Forcas } from './paredesArmadura';
import { ladosDoPP } from './pilarParede';
import { ppDaObra } from './paredesBase';
import type { BuildingModel } from './types';

export type ComponenteTensao = 'sigmaX' | 'sigmaY' | 'tauXY' | 'My' | 'Mx' | 'Qmax';
export type ComponenteDeslocamento = 'normal' | 'vertical' | 'alongo';

export interface TrianguloCampo {
  /** Vértices no plano (s, z) do lado (m; z absoluto). */
  v: [[number, number], [number, number], [number, number]];
  valor: number;
  lance: string;
}
export interface CampoLado { tris: TrianguloCampo[]; min: number; max: number; unidade: string; titulo: string }

/** Valor de uma componente de tensão (MPa, tração +) ou de esforço, na face z− (`face` −1) ou z+ (+1) para as tensões. */
export function valorTensao(f: Forcas, t: number, comp: ComponenteTensao, face: 1 | -1 = -1): number {
  const W = (t * t) / 6, s = face === -1 ? 1 : -1;
  switch (comp) {
    case 'sigmaX': return (f.nx / t + (s * f.mx) / W) / 1000;
    case 'sigmaY': return (f.ny / t + (s * f.my) / W) / 1000;
    case 'tauXY': return (f.nxy / t + (s * f.mxy) / W) / 1000;
    case 'My': return f.my;
    case 'Mx': return f.mx;
    case 'Qmax': return Math.hypot(f.qx, f.qy);
  }
}
const UNIDADE: Record<ComponenteTensao, string> = { sigmaX: 'MPa', sigmaY: 'MPa', tauXY: 'MPa', My: 'kN·m/m', Mx: 'kN·m/m', Qmax: 'kN/m' };

/** Triângulos do lado: vértices (s, z) a partir dos nós do modelo e os elementos da casca de cada lance. */
function triangulos(b: BuildingModel, an: AnaliseEdificio, ladoId: string) {
  const pars = an.paredes, m = an.portico.modelo;
  if (!pars || !m.cascas) return null;
  const pp = ppDaObra(b).find((p) => ladoId.startsWith(`${p.id}:`)), g = pp ? ladosDoPP(b, pp).find((l) => l.id === ladoId) : undefined;
  if (!g) return null;
  const proj = (n: number): [number, number] => { const p = m.nos[n]; return [(p[0] - g.a[0]) * g.u[0] + (p[1] - g.a[1]) * g.u[1], p[2]]; };
  return { g, itens: pars.info.filter((e) => e.ladoId === ladoId).map((e) => { const c = m.cascas![e.k]; return { e, nos: [c.nos[0], c.nos[1], c.nos[2]] as [number, number, number], v: [proj(c.nos[0]), proj(c.nos[1]), proj(c.nos[2])] as TrianguloCampo['v'] }; }) };
}

/** Campo de uma componente de tensão do lado numa combinação ELU (face z− ou z+). Nulo se o lado não é casca ou não há resultados. */
export function campoTensaoLado(b: BuildingModel, an: AnaliseEdificio, ladoId: string, comb: CombinacaoEd, comp: ComponenteTensao, face: 1 | -1 = -1): CampoLado | null {
  const tr = triangulos(b, an, ladoId), res = an.portico.res, resV = an.portico.resVento && !an.portico.resVento.erro ? an.portico.resVento : null;
  if (!tr || !res?.cascas) return null;
  const nomesV = an.vento?.casos.map((c) => c.nome) ?? [];
  const fontes: [Float64Array[], number][] = [];
  for (const [n, f] of Object.entries(comb.fatores)) {
    const ic = an.casos.indexOf(n as never), iv = nomesV.indexOf(n);
    if (f && ic >= 0 && res.cascas[ic]) fontes.push([res.cascas[ic], f]);
    else if (f && iv >= 0 && resV?.cascas?.[iv]) fontes.push([resV.cascas[iv], f]);
  }
  const tris = tr.itens.map(({ e, v }) => {
    const x = new Float64Array(8);
    for (const [arr, f] of fontes) { const a = arr[e.k]; if (a) for (let q = 0; q < 8; q++) x[q] += f * a[q]; }
    return { v, valor: valorTensao(forcasDe(x), e.t, comp, face), lance: e.lance };
  });
  const vs = tris.map((t) => t.valor);
  return { tris, min: Math.min(...vs), max: Math.max(...vs), unidade: UNIDADE[comp], titulo: `${comp} — ${comb.nome}` };
}

/** Campo de deslocamentos (mm) do lado para um caso de carga (id do caso ou nome do caso de vento): média dos três vértices do triângulo. */
export function campoDeslocamentoLado(b: BuildingModel, an: AnaliseEdificio, ladoId: string, caso: string, comp: ComponenteDeslocamento): CampoLado | null {
  const tr = triangulos(b, an, ladoId), res = an.portico.res, resV = an.portico.resVento && !an.portico.resVento.erro ? an.portico.resVento : null;
  if (!tr) return null;
  const nomesV = an.vento?.casos.map((c) => c.nome) ?? [];
  const ic = an.casos.indexOf(caso as never), iv = nomesV.indexOf(caso);
  const d = ic >= 0 ? res?.desloc[ic] : iv >= 0 ? resV?.desloc[iv] : undefined;
  if (!d) return null;
  const { g } = tr;
  const u = (n: number) => { const ux = d[n * 6], uy = d[n * 6 + 1], uz = d[n * 6 + 2]; return comp === 'vertical' ? uz : comp === 'normal' ? ux * g.n[0] + uy * g.n[1] : ux * g.u[0] + uy * g.u[1]; };
  const tris = tr.itens.map(({ e, nos, v }) => ({ v, valor: (1000 * (u(nos[0]) + u(nos[1]) + u(nos[2]))) / 3, lance: e.lance }));
  const vs = tris.map((t) => t.valor);
  return { tris, min: Math.min(...vs), max: Math.max(...vs), unidade: 'mm', titulo: `deslocamento ${comp} — ${caso}` };
}
