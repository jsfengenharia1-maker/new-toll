// Parte do edifício no arquivo de trabalho (.statikos v2): modelo atual + log de comandos.
// Puro (sem navegador): usado pelo app, pela linha de comando e pelo MCP.
import { BUILDING_VERSION, normalizarEdificio, type BuildingModel } from './types';
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
  const building = normalizarEdificio(o.building);
  return { building, buildingLog: expandirLog(building, Array.isArray(o.buildingLog) ? o.buildingLog : []) };
}

/**
 * Para o arquivo: a geometria de uma máscara importada vai uma vez só (no modelo); no log, `params.geo`
 * vira uma referência {$mascara: id} enquanto a máscara existir com a mesma geometria.
 */
export function compactarLog(b: BuildingModel, log: Entrada[]): Entrada[] {
  return log.map((e) => {
    if (e.nome !== 'mascara.importar' || !e.params.geo) return e;
    const m = b.mascaras.find((x) => x.geo === e.params.geo || JSON.stringify(x.geo) === JSON.stringify(e.params.geo));
    return m ? { ...e, params: { ...e.params, geo: { $mascara: m.id } } } : e;
  });
}

export function expandirLog(b: BuildingModel, log: Entrada[]): Entrada[] {
  return log.map((e) => {
    const ref = (e.params?.geo as { $mascara?: string } | undefined)?.$mascara;
    if (!ref) return e;
    const m = b.mascaras.find((x) => x.id === ref);
    return m ? { ...e, params: { ...e.params, geo: m.geo } } : e;
  });
}
