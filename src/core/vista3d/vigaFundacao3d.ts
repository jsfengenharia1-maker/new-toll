// Vista 3D isolada da viga de fundação (V6c, C11.49): a mesma cena da vista do edifício (V1), reduzida à viga e aos dois
// elementos de fundação das pontas (sapata, bloco com estacas ou tubulão), para a janela própria da viga. Precisa do
// cálculo das fundações: sem ele o gerador da cena não produz sólidos de fundação.
import type { Dimensionamento } from '../building/dimensionamento';
import { pontaVF } from '../building/vigasFundacao';
import type { BuildingModel } from '../building/types';
import { construirCena } from './cena';
import { PAV_FUNDACAO, type Cena3D, type Objeto3D } from './registro';

export interface CenaVigaFundacao {
  cena: Cena3D;
  /** Sólido da viga (ausente quando as fundações não foram calculadas ou a viga não tem geometria). */
  viga: Objeto3D | null;
  /** Elementos de fundação das pontas (ids do elemento), na ordem ini, fim; vazio onde a ponta é um pilar sem elemento. */
  apoios: { ponta: 'ini' | 'fim'; id: string; nome: string }[];
  /** Cota de topo e de base do sólido da viga (m). */
  topo: number; base: number;
}

export function cenaDaVigaFundacao(b: BuildingModel, dim: Dimensionamento | null, id: string): CenaVigaFundacao {
  const v = b.fundacao?.vigas?.find((x) => x.id === id);
  const tudo = construirCena(b, { pavimentos: [PAV_FUNDACAO], fundacoes: dim?.fundacoes ?? [], vigasFundacao: dim?.vigasFundacao ?? [] });
  const apoios: CenaVigaFundacao['apoios'] = [];
  if (v) for (const ponta of ['ini', 'fim'] as const) {
    const el = pontaVF(b, v[ponta])?.elemento;
    if (el && !apoios.some((a) => a.id === el.id)) apoios.push({ ponta, id: el.id, nome: el.nome });
  }
  const ids = new Set([id, ...apoios.map((a) => a.id)]);
  const objetos = tudo.objetos.filter((o) => ids.has(o.elemento));
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const o of objetos) for (let i = 0; i < o.pos.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], o.pos[i + k]); max[k] = Math.max(max[k], o.pos[i + k]); }
  if (!objetos.length) { min.fill(0); max.fill(0); }
  const porTipo: Record<string, number> = {}, porPavimento: Record<string, number> = {};
  for (const o of objetos) { porTipo[o.tipo] = (porTipo[o.tipo] ?? 0) + 1; porPavimento[o.pavimento] = (porPavimento[o.pavimento] ?? 0) + 1; }
  const cena: Cena3D = { objetos, auxiliares: [], rotulos: [], limites: { min, max }, contagens: { total: objetos.length, porTipo, porPavimento }, avisos: tudo.avisos };
  const viga = objetos.find((o) => o.elemento === id && o.subtipo === 'vigaFundacao') ?? null;
  let topo = 0, base = 0;
  if (viga) { const zs = viga.pos.filter((_, i) => i % 3 === 2); topo = Math.max(...zs); base = Math.min(...zs); }
  return { cena, viga, apoios, topo, base };
}
