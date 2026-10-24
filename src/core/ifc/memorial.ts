// Memorial da importação de IFC (L3): origem (arquivo e esquema), mapeamento de materiais e relatório de importação.
// Dados prontos para a tabela do memorial; `null` quando a obra não veio de IFC.
import type { BuildingModel } from '../building/types';

export interface MemorialIfc {
  cabecalho: [string, string][];
  materiais: { tipo: string; material: string; fck: string; aco: string }[];
  relatorio: [string, string][];
  classes: [string, string][];
  ignorados: { classe: string; motivo: string; quantidade: number }[];
  ambiguos: string[];
  avisos: string[];
}

const ROTULO = { pilar: 'Pilares', viga: 'Vigas', laje: 'Lajes', fundacao: 'Fundações' } as const;
const un = (u: number) => (u === 1 ? 'm' : u === 0.001 ? 'mm' : u === 0.01 ? 'cm' : `${u} m`);

export function memorialIfc(b: Pick<BuildingModel, 'obra'>): MemorialIfc | null {
  const i = b.obra.ifc;
  if (!i) return null;
  const n = (v: number) => String(v);
  return {
    cabecalho: [
      ['Arquivo', i.arquivo], ['Esquema', i.esquema], ['Unidade de comprimento do arquivo', un(i.unidade)],
      ...(i.deslocamento[0] || i.deslocamento[1] ? [['Deslocamento das coordenadas', `${i.deslocamento[0]}; ${i.deslocamento[1]} m`] as [string, string]] : []),
    ],
    materiais: i.materiais.map((m) => ({
      tipo: ROTULO[m.tipo], material: m.material ?? 'sem material no arquivo (vale o da obra)',
      fck: m.fck !== undefined ? `${m.fck} MPa` : 'o da obra', aco: m.aco ?? 'o da obra',
    })),
    relatorio: [
      ['Pavimentos criados', n(i.lancados.pavimentos)], ['Pilares lançados', n(i.lancados.pilares)], ['Vigas lançadas', n(i.lancados.vigas)],
      ['Lajes lançadas', n(i.lancados.lajes)], ['Aberturas de laje', n(i.lancados.furos)], ['Paredes de concreto lançadas', n(i.lancados.paredes)],
      ['Extremos de viga levados ao centro do pilar', n(i.lancados.extremosAjustados)], ['Itens pulados (já lançados, excluídos ou sobrepostos)', n(i.lancados.pulados)],
    ],
    classes: Object.entries(i.classes).map(([k, v]) => [k, n(v)] as [string, string]),
    ignorados: i.ignorados.map((x) => ({ ...x })),
    ambiguos: [...i.ambiguos],
    avisos: [...i.avisos],
  };
}
