// Parte do edifício no arquivo de trabalho (.statikos v2): modelo atual + log de comandos.
// Puro (sem navegador): usado pelo app, pela linha de comando e pelo MCP.
import { BUILDING_VERSION, edificioVazio, normalizarEdificio, type BuildingModel } from './types';
import { aplicarComando, type Entrada } from '../commands/registry';

export const WORKSPACE_FORMAT = 'statikos-workspace';

/** Ponto de recuperação: o modelo logo antes de um comando do log. */
export interface VersaoObra { indice: number; t: string; rotulo: string; building: BuildingModel }
/** Resultados do último cálculo guardados no arquivo (o `Dimensionamento` serializado). */
export interface ResultadosGuardados { revisao: number; salvoEm: string; dim: unknown }
export const LIMITE_VERSOES_BYTES = 3_000_000;
export const LIMITE_RESULTADOS_BYTES = 5_000_000;
export const MAX_VERSOES = 20;

export interface BuildingFile { building: BuildingModel; buildingLog: Entrada[]; versoes?: VersaoObra[]; resultados?: ResultadosGuardados }

export function isBuilding(x: unknown): x is BuildingModel {
  const b = x as BuildingModel;
  return !!b && b.version === BUILDING_VERSION && Array.isArray(b.pavimentos) && Array.isArray(b.grupos) && Array.isArray(b.eixos) && typeof b.seq === 'number';
}

/** Extrai o edifício de um arquivo de trabalho já lido como JSON (null se não houver). */
export function lerEdificio(x: unknown): BuildingFile | null {
  const o = x as Partial<BuildingFile> | null;
  if (!o || !isBuilding(o.building)) return null;
  const building = normalizarEdificio(o.building);
  const out: BuildingFile = { building, buildingLog: expandirLog(building, Array.isArray(o.buildingLog) ? o.buildingLog : []) };
  const vs = Array.isArray(o.versoes) ? o.versoes.filter((v) => v && typeof v.indice === 'number' && isBuilding(v.building)) : null;
  if (vs) out.versoes = vs.map((v) => ({ ...v, building: normalizarEdificio(v.building) }));
  const rs = o.resultados as ResultadosGuardados | undefined;
  if (rs && rs.dim !== undefined) out.resultados = rs;
  return out;
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

/** Estados anteriores: o modelo logo antes de cada um dos últimos `n` comandos do log (reaplica o log desde `base`), do mais antigo ao mais recente. Para antes de estourar `limiteBytes` (JSON) e avisa. */
export function versoesDoLog(base: BuildingModel, log: Entrada[], n: number, limiteBytes = LIMITE_VERSOES_BYTES): { versoes: VersaoObra[]; aviso?: string } {
  const k = Math.min(n, MAX_VERSOES, log.length);
  if (k <= 0) return { versoes: [] };
  const inicio = log.length - k;
  let modelo = base;
  for (const e of log.slice(0, inicio)) {
    const r = aplicarComando(modelo, e.nome, e.params);
    if (!r.ok) return { versoes: [], aviso: 'O histórico não pôde ser reaplicado; versões anteriores não incluídas.' };
    modelo = r.modelo;
  }
  const todas: VersaoObra[] = [];
  for (let i = inicio; i < log.length; i++) {
    todas.push({ indice: i, t: log[i].t, rotulo: log[i].nome, building: modelo });
    const r = aplicarComando(modelo, log[i].nome, log[i].params);
    if (!r.ok) break;
    modelo = r.modelo;
  }
  // mantém as mais recentes que cabem no limite
  let soma = 0;
  let corte = 0;
  for (let j = todas.length - 1; j >= 0; j--) {
    soma += JSON.stringify(todas[j]).length;
    if (soma > limiteBytes) { corte = j + 1; break; }
  }
  const versoes = todas.slice(corte);
  if (corte > 0) return { versoes, aviso: `Versões limitadas a ${versoes.length} de ${k} pelo tamanho do arquivo.` };
  return { versoes };
}

/** Recupera uma versão: devolve o modelo e o log até aquele ponto. */
export function recuperarVersao(arquivo: BuildingFile, indice: number): BuildingFile | null {
  const v = arquivo.versoes?.find((x) => x.indice === indice);
  if (!v) return null;
  return { building: v.building, buildingLog: arquivo.buildingLog.slice(0, indice) };
}

/** Monta o conteúdo do arquivo: modelo + log (compactado) e, conforme as opções, versões e resultados (`dim` null = sem cálculo em vigor → resultados omitidos, sem aviso). */
export function arquivoComExtras(modelo: BuildingModel, log: Entrada[], opc: { versoes: number; resultados: boolean }, dim: unknown | null, revisao: number): { arquivo: BuildingFile; avisos: string[] } {
  const arquivo: BuildingFile = { building: modelo, buildingLog: compactarLog(modelo, log) };
  const avisos: string[] = [];
  if (opc.versoes > 0) {
    const v = versoesDoLog(edificioVazio(), log, opc.versoes);
    if (v.versoes.length) arquivo.versoes = v.versoes;
    if (v.aviso) avisos.push(v.aviso);
  }
  if (opc.resultados && dim) {
    const r = resultadosParaArquivo(dim, revisao);
    if (r.resultados) arquivo.resultados = r.resultados;
    if (r.aviso) avisos.push(r.aviso);
  }
  return { arquivo, avisos };
}

/** Serializa os resultados com o limite de tamanho; acima dele devolve `undefined` e o aviso. */
export function resultadosParaArquivo(dim: unknown, revisao: number, limiteBytes = LIMITE_RESULTADOS_BYTES): { resultados?: ResultadosGuardados; aviso?: string } {
  const txt = JSON.stringify(dim);
  if (txt === undefined || txt.length > limiteBytes) return { aviso: 'Os resultados do último cálculo passam do limite de tamanho e não foram incluídos.' };
  return { resultados: { revisao, salvoEm: new Date().toISOString(), dim } };
}
