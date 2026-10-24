// Árvore do Navegador da obra (D4): Obra > Pavimentos, Pilares, Vigas e Lajes por grupo, Eixos, Fundação e Vistas.
// Função pura sobre o modelo: a interface (Navegador.tsx) só desenha e liga a seleção à planta.
import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';

export type TipoNo = 'pavimento' | 'pilar' | 'viga' | 'laje' | 'eixo' | 'fundacao' | 'vista' | 'pilarParede' | 'parede' | 'muro' | 'alvenaria' | 'grupo' | 'carga' | 'corte' | 'sondagem' | 'escada';
export interface NoArvore {
  id: string;
  rotulo: string;
  nivel: number;
  contagem?: number;
  filhos?: NoArvore[];
  /** Elemento que o nó representa (folhas e pavimentos); ausente nos nós de agrupamento. */
  alvo?: { tipo: TipoNo; id: string };
}

/** Vistas do centro (ids de `AbaEdificio`), na ordem das abas. */
export const VISTAS: [string, string][] = [['planta', 'Planta'], ['vista3d', '3D'], ['elevacao', 'Elevação'], ['verificacao', 'Verificação'], ['analise', 'Análise'], ['deslocamentos', 'Deslocamentos'], ['isovalores', 'Isovalores'], ['dimensionamento', 'Dimensionamento'], ['pranchas', 'Pranchas'], ['premissas', 'Premissas']];

const folha = (prefixo: string, nivel: number, x: { id: string; nome: string }, tipo: TipoNo): NoArvore => ({ id: `${prefixo}:${x.id}`, rotulo: x.nome, nivel, alvo: { tipo, id: x.id } });

/** Nós de grupo (Tipo, Cobertura…) com as vigas ou lajes de cada um; só grupos que têm elementos. */
function porGrupo(b: BuildingModel, raiz: 'vigas' | 'lajes', tipo: 'viga' | 'laje'): NoArvore[] {
  const lista: { id: string; nome: string; grupo: string }[] = b[raiz];
  return b.grupos
    .filter((g) => lista.some((x) => x.grupo === g.id))
    .map((g) => {
      const doGrupo = lista.filter((x) => x.grupo === g.id);
      return { id: `${raiz}:${g.id}`, rotulo: g.nome, nivel: 3, contagem: doGrupo.length, filhos: doGrupo.map((x) => folha(tipo, 4, x, tipo)) };
    });
}

export function montarArvore(b: BuildingModel): NoArvore {
  const ps = [...pavimentosOrdenados(b)].reverse();
  const fund = b.fundacao?.elementos ?? [];
  return {
    id: 'obra', rotulo: b.obra.nome, nivel: 1,
    filhos: [
      { id: 'pavs', rotulo: 'Pavimentos', nivel: 2, contagem: ps.length, filhos: ps.map((p) => folha('pav', 3, p, 'pavimento')) },
      { id: 'pilares', rotulo: 'Pilares', nivel: 2, contagem: b.pilares.length, filhos: b.pilares.map((p) => folha('pilar', 3, p, 'pilar')) },
      { id: 'vigas', rotulo: 'Vigas', nivel: 2, contagem: b.vigas.length, filhos: porGrupo(b, 'vigas', 'viga') },
      { id: 'lajes', rotulo: 'Lajes', nivel: 2, contagem: b.lajes.length, filhos: porGrupo(b, 'lajes', 'laje') },
      { id: 'escadas', rotulo: 'Escadas', nivel: 2, contagem: (b.escadas ?? []).length, filhos: (b.escadas ?? []).map((e) => folha('escada', 3, e, 'escada')) },
      { id: 'pilaresParede', rotulo: 'Pilares-parede', nivel: 2, contagem: (b.pilaresParede ?? []).length, filhos: (b.pilaresParede ?? []).map((x) => folha('pilarParede', 3, x, 'pilarParede')) },
      { id: 'paredes', rotulo: 'Paredes', nivel: 2, contagem: (b.paredes ?? []).length, filhos: (b.paredes ?? []).map((x) => folha('parede', 3, x, 'parede')) },
      { id: 'muros', rotulo: 'Muros', nivel: 2, contagem: (b.murosArrimo ?? []).length, filhos: (b.murosArrimo ?? []).map((x) => folha('muro', 3, x, 'muro')) },
      { id: 'alvenaria', rotulo: 'Alvenaria', nivel: 2, contagem: (b.tiposAlvenaria ?? []).length, filhos: (b.tiposAlvenaria ?? []).map((x) => folha('alvenaria', 3, x, 'alvenaria')) },
      { id: 'grupos', rotulo: 'Grupos', nivel: 2, contagem: b.grupos.length, filhos: b.grupos.map((x) => folha('grupo', 3, x, 'grupo')) },
      { id: 'cargas', rotulo: 'Cargas', nivel: 2, contagem: b.cargas.length, filhos: b.cargas.map((c) => ({ id: `carga:${c.id}`, rotulo: `${c.caso} · ${c.tipo} · ${String(c.valor).replace('.', ',')}`, nivel: 3, alvo: { tipo: 'carga' as const, id: c.id } })) },
      { id: 'cortes', rotulo: 'Cortes', nivel: 2, contagem: (b.cortes ?? []).length, filhos: (b.cortes ?? []).map((x) => folha('corte', 3, x, 'corte')) },
      { id: 'eixos', rotulo: 'Eixos', nivel: 2, contagem: b.eixos.length, filhos: b.eixos.map((e) => folha('eixo', 3, e, 'eixo')) },
      { id: 'fundacao', rotulo: 'Fundação', nivel: 2, contagem: fund.length, filhos: fund.map((e) => folha('fund', 3, e, 'fundacao')) },
      { id: 'sondagens', rotulo: 'Sondagens', nivel: 2, contagem: (b.fundacao?.sondagens ?? []).length, filhos: (b.fundacao?.sondagens ?? []).map((x, i) => ({ id: `sondagem:${x.id ?? i}`, rotulo: x.name, nivel: 3, alvo: { tipo: 'sondagem' as const, id: String(x.id ?? i) } })) },
      { id: 'vistas', rotulo: 'Vistas', nivel: 2, contagem: VISTAS.length, filhos: VISTAS.map(([id, rotulo]) => ({ id: `vista:${id}`, rotulo, nivel: 3, alvo: { tipo: 'vista' as const, id } })) },
    ],
  };
}

/** Ids dos nós do caminho da raiz até o nó `id` (inclusive o próprio nó); vazio se não existir. */
export function caminhoAte(no: NoArvore, id: string): string[] {
  if (no.id === id) return [no.id];
  for (const f of no.filhos ?? []) {
    const c = caminhoAte(f, id);
    if (c.length) return [no.id, ...c];
  }
  return [];
}

/** Id do nó que representa um elemento da planta (`pilar`, `viga`, `laje`, `eixo`, `fundacao`), a partir do id do elemento. */
export function idDoNo(tipo: TipoNo, id: string): string {
  return tipo === 'pavimento' ? `pav:${id}` : tipo === 'fundacao' ? `fund:${id}` : `${tipo}:${id}`;
}
