// Cena 3D do edifício (V1): objetos por elemento, tipo e pavimento a partir do modelo, por geradores registrados.
// Núcleo puro (sem three, window ou document): a interface converte a `Cena3D` em objetos do three.js e o
// isométrico estático desenha a mesma cena em SVG.
import { pavimentosOrdenados, type BuildingModel } from '../building/types';
import './pilares3d';
import './vigas3d';
import './lajes3d';
import './fundacoes3d';
import { GERADORES_3D, PAV_FUNDACAO, type Cena3D, type ContextoCena, type Objeto3D, type OpcoesCena, type Rotulo3D } from './registro';

export * from './registro';

/** Pavimentos da cena: explícitos, ou por grupos e intervalo; as fundações entram quando nada restringe ou o intervalo parte delas. */
export function pavimentosDaCena(b: BuildingModel, o: Pick<OpcoesCena, 'grupos' | 'de' | 'ate' | 'pavimentos'> = {}): Set<string> {
  if (o.pavimentos) return new Set(o.pavimentos);
  const ps = pavimentosOrdenados(b);
  const cota = (id: string | undefined, vazio: number) => (id === undefined ? vazio : id === PAV_FUNDACAO ? -Infinity : ps.find((p) => p.id === id)?.cota ?? vazio);
  const de = cota(o.de, -Infinity), ate = cota(o.ate, Infinity);
  const [lo, hi] = de <= ate ? [de, ate] : [ate, de];
  const set = new Set(ps.filter((p) => (!o.grupos || o.grupos.includes(p.grupo)) && p.cota >= lo - 1e-9 && p.cota <= hi + 1e-9).map((p) => p.id));
  if (!o.grupos && (o.de === undefined || o.de === PAV_FUNDACAO)) set.add(PAV_FUNDACAO);
  return set;
}

export function construirCena(b: BuildingModel, o: OpcoesCena = {}): Cena3D {
  const ctx: ContextoCena = {
    b, pavimentos: pavimentosDaCena(b, o), detalhe: o.detalhe ?? 'baixo', fundacoes: o.fundacoes ?? [], vigasFundacao: o.vigasFundacao ?? [],
  };
  const objetos: Objeto3D[] = [], auxiliares: Cena3D['auxiliares'] = [], rotulos: Rotulo3D[] = [], avisos: string[] = [];
  for (const [nome, g] of Object.entries(GERADORES_3D)) {
    try {
      const s = g(ctx);
      objetos.push(...s.objetos);
      auxiliares.push(...(s.auxiliares ?? []));
      rotulos.push(...(s.rotulos ?? []));
    } catch (e) {
      avisos.push(`Gerador 3D "${nome}" falhou: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const visiveis = o.tipos ? objetos.filter((x) => o.tipos!.includes(x.tipo)) : objetos;
  const ids = new Set(visiveis.map((x) => x.id));
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const porTipo: Record<string, number> = {}, porPavimento: Record<string, number> = {};
  for (const x of visiveis) {
    porTipo[x.tipo] = (porTipo[x.tipo] ?? 0) + 1;
    porPavimento[x.pavimento] = (porPavimento[x.pavimento] ?? 0) + 1;
    for (let i = 0; i < x.pos.length; i += 3) for (let k = 0; k < 3; k++) { const v = x.pos[i + k]; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v; }
  }
  if (!visiveis.length) { min.fill(0); max.fill(0); }
  return {
    objetos: visiveis, auxiliares: auxiliares.filter((a) => ids.has(a.objeto)), rotulos: rotulos.filter((r) => ids.has(r.objeto)),
    limites: { min, max }, contagens: { total: visiveis.length, porTipo, porPavimento }, avisos,
  };
}

/** Texto curto das contagens, para o atributo `data-cena` e para a barra de estado. */
export const resumoCena = (c: Cena3D) => ({ total: c.contagens.total, ...c.contagens.porTipo, pavimentos: c.contagens.porPavimento });
