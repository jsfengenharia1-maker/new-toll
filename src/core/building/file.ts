// Parte do edifício no arquivo de trabalho (.statikos v2): modelo atual + log de comandos.
// Puro (sem navegador): usado pelo app, pela linha de comando e pelo MCP.
import { BUILDING_VERSION, type BuildingModel } from './types';
import type { Entrada } from '../commands/registry';

export const WORKSPACE_FORMAT = 'statikos-workspace';

export interface BuildingFile { building: BuildingModel; buildingLog: Entrada[] }

export function isBuilding(x: unknown): x is BuildingModel {
  const b = x as BuildingModel;
  return !!b && b.version === BUILDING_VERSION && Array.isArray(b.pavimentos) && Array.isArray(b.grupos) && Array.isArray(b.eixos) && typeof b.seq === 'number';
}

/** Extrai o edifício de um arquivo de trabalho já lido como JSON (null se não houver). */
export function lerEdificio(x: unknown): BuildingFile | null {
  const o = x as Partial<BuildingFile> | null;
  if (!o || !isBuilding(o.building)) return null;
  return { building: o.building, buildingLog: Array.isArray(o.buildingLog) ? o.buildingLog : [] };
}
