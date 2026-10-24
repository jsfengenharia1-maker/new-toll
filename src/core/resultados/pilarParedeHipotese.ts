// Esforços do pilar-parede por hipótese (V7c, C4.60): as resultantes por lado e pavimento (N, cortante e momento no plano
// e fora do plano, de `pilarParedeEsforcos.ts`) combinadas com os fatores de um caso, uma combinação ou a envoltória de
// uma família. A combinação é a soma ponderada dos casos (superposição exata); a envoltória toma o máximo e o mínimo
// entre as combinações, com a combinação determinante. N > 0 é tração (como em `Resultante`). Núcleo puro.
import type { Resultante, ResultadoPilarParede } from '../building/pilarParedeEsforcos';
import type { HipoteseEsforco } from './esforcosCaso';

export const GRANDEZAS_PP: { v: keyof Resultante; rotulo: string; unidade: string }[] = [
  { v: 'N', rotulo: 'Normal N (tração +)', unidade: 'kN' },
  { v: 'Vp', rotulo: 'Cortante no plano Vp', unidade: 'kN' },
  { v: 'Mp', rotulo: 'Momento no plano Mp', unidade: 'kN·m' },
  { v: 'Vo', rotulo: 'Cortante fora do plano Vo', unidade: 'kN' },
  { v: 'Mo', rotulo: 'Momento fora do plano Mo', unidade: 'kN·m' },
];
const CHAVES = GRANDEZAS_PP.map((g) => g.v);

export interface LinhaPilarParede {
  lado: number; nome: string; modelo: 'casca' | 'barra'; pavimento: string; nomePav: string; L: number; t: number;
  /** Valor da hipótese (caso e combinação: max = min) ou extremos da envoltória, e a combinação de cada extremo. */
  max: Resultante; min: Resultante;
  porMax: Record<keyof Resultante, string>; porMin: Record<keyof Resultante, string>;
}

export interface BasePilarParede { N: number; Vx: number; Vy: number; Mx: number; My: number }

const partes = (h: HipoteseEsforco): { nome: string; fatores: Record<string, number> }[] => (h.tipo === 'envoltoria' ? h.combinacoes.map((c) => ({ nome: c.nome, fatores: c.fatores })) : [{ nome: h.nome, fatores: h.fatores }]);
const soma = (fatores: Record<string, number>, casos: Record<string, Resultante>): Resultante => {
  const r: Resultante = { N: 0, Vp: 0, Mp: 0, Vo: 0, Mo: 0 };
  for (const [n, f] of Object.entries(fatores)) { const c = casos[n]; if (c) for (const k of CHAVES) r[k] += f * c[k]; }
  return r;
};

/** Resultantes de cada lado e pavimento do pilar-parede para a hipótese (envoltória: máximo e mínimo entre as combinações). */
export function esforcosPilarParedePorHipotese(pp: ResultadoPilarParede, h: HipoteseEsforco): LinhaPilarParede[] {
  const ps = partes(h);
  return pp.lados.map((g) => {
    const max = { N: -Infinity, Vp: -Infinity, Mp: -Infinity, Vo: -Infinity, Mo: -Infinity } as Resultante, min = { N: Infinity, Vp: Infinity, Mp: Infinity, Vo: Infinity, Mo: Infinity } as Resultante;
    const porMax = { N: '', Vp: '', Mp: '', Vo: '', Mo: '' } as Record<keyof Resultante, string>, porMin = { ...porMax };
    for (const p of ps) {
      const v = soma(p.fatores, g.casos);
      for (const k of CHAVES) {
        if (v[k] > max[k]) { max[k] = v[k]; porMax[k] = p.nome; }
        if (v[k] < min[k]) { min[k] = v[k]; porMin[k] = p.nome; }
      }
    }
    for (const k of CHAVES) { if (!Number.isFinite(max[k])) max[k] = 0; if (!Number.isFinite(min[k])) min[k] = 0; }
    return { lado: g.lado, nome: g.nome, modelo: g.modelo, pavimento: g.pavimento, nomePav: g.nomePav, L: g.L, t: g.t, max, min, porMax, porMin };
  });
}

/** Cargas na base do pilar-parede para a hipótese (N > 0 compressão; kN e kN·m): valor ou extremos da envoltória. */
export function baseDoPilarParede(pp: ResultadoPilarParede, h: HipoteseEsforco): { max: BasePilarParede; min: BasePilarParede } {
  const ks: (keyof BasePilarParede)[] = ['N', 'Vx', 'Vy', 'Mx', 'My'];
  const max = { N: -Infinity, Vx: -Infinity, Vy: -Infinity, Mx: -Infinity, My: -Infinity }, min = { N: Infinity, Vx: Infinity, Vy: Infinity, Mx: Infinity, My: Infinity };
  for (const p of partes(h)) {
    for (const k of ks) {
      let v = 0;
      for (const [n, f] of Object.entries(p.fatores)) v += f * (pp.base[n]?.[k] ?? 0);
      if (v > max[k]) max[k] = v;
      if (v < min[k]) min[k] = v;
    }
  }
  for (const k of ks) { if (!Number.isFinite(max[k])) max[k] = 0; if (!Number.isFinite(min[k])) min[k] = 0; }
  return { max, min };
}
