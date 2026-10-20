// Estado da vista 3D (não vai para o arquivo .statikos): escopo da cena, tipos visíveis, transparência, projeção e caminhar.
import { create } from 'zustand';
import type { BuildingModel } from '../../core/building/types';
import { pavimentosOrdenados } from '../../core/building/types';
import { PAV_FUNDACAO, type OpcoesCena, type TipoElemento3D } from '../../core/vista3d/registro';
import { VELOCIDADE_INICIAL, type Projecao } from '../../core/vista3d/camera';

/** O que entra na cena: o edifício todo, um grupo, um intervalo de pavimentos ou um pavimento só. */
export type Escopo = 'edificio' | 'grupo' | 'intervalo' | 'pavimento';

export interface V3State {
  escopo: Escopo;
  grupo: string;
  de: string;
  ate: string;
  pavimento: string;
  tipos: Record<TipoElemento3D, boolean>;
  /** Transparência de lajes e paredes, 0 (opaco) a 100 (invisível). */
  transpLajes: number;
  transpParedes: number;
  projecao: Projecao;
  textura: boolean;
  detalhe: 'baixo' | 'alto';
  caminhar: boolean;
  velocidade: number;
  set(p: Partial<Omit<V3State, 'set'>>): void;
}

export const useVista3d = create<V3State>((set) => ({
  escopo: 'edificio', grupo: '', de: '', ate: '', pavimento: '',
  tipos: { pilar: true, viga: true, laje: true, parede: true, escada: true, fundacao: true },
  transpLajes: 40, transpParedes: 40,
  projecao: 'perspectiva', textura: false, detalhe: 'baixo',
  caminhar: false, velocidade: VELOCIDADE_INICIAL,
  set: (p) => set(p),
}));

/** Opções da cena a partir do escopo e dos tipos visíveis; ids que não existem mais voltam ao primeiro/último pavimento. */
export function opcoesDaVista(b: BuildingModel, s: Pick<V3State, 'escopo' | 'grupo' | 'de' | 'ate' | 'pavimento' | 'tipos' | 'detalhe'>): OpcoesCena {
  const ps = pavimentosOrdenados(b), ids = new Set([...ps.map((p) => p.id), PAV_FUNDACAO]);
  const tipos = (Object.keys(s.tipos) as TipoElemento3D[]).filter((t) => s.tipos[t]);
  const o: OpcoesCena = { tipos, detalhe: s.detalhe };
  if (s.escopo === 'grupo') o.grupos = [b.grupos.find((g) => g.id === s.grupo)?.id ?? b.grupos[0]?.id ?? ''];
  else if (s.escopo === 'intervalo') { o.de = ids.has(s.de) ? s.de : ps[0]?.id; o.ate = ids.has(s.ate) ? s.ate : ps.at(-1)?.id; }
  else if (s.escopo === 'pavimento') o.pavimentos = [ids.has(s.pavimento) ? s.pavimento : ps[0]?.id ?? PAV_FUNDACAO];
  return o;
}
