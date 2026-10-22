// Leitor de DWG (L2, C2.6): o leitor do nasjidwg (MIT) lê o DWG para o modelo de documento, que o escritor de DXF
// do mesmo pacote converte em texto; o leitor próprio de DXF (`lerDxf`) faz o resto. Assim o DWG vira o mesmo `DxfLido`
// (camadas, arcos, textos, blocos explodidos) e todo o lançamento por camada vale para os dois formatos.
// A biblioteca não entra no pacote: o app a carrega de public/vendor/nasjidwg-leitor-<versão>.mjs sob demanda
// (gerado por scripts/vendor-nasjidwg.mjs) e os testes a importam da devDependency.
import { lerDxf, type DxfLido } from './read';

/** Caminho do leitor carregado sob demanda (relativo à raiz do site; gerado por scripts/vendor-nasjidwg.mjs). */
export const VENDOR_DWG_LEITOR = 'vendor/nasjidwg-leitor-0.18.0.mjs';

/** O que o módulo do leitor precisa exportar. */
export interface LeitorDwg {
  readDwg: (dados: Uint8Array) => unknown;
  writeDxf: (desenho: never) => string;
}

export interface DwgLido extends DxfLido {
  /** Avisos do leitor (objetos que o DWG não trouxe por inteiro). */
  avisos: string[];
}

/** Entidades do espaço-modelo do DWG como `DxfLido` (o espaço-papel e os layouts ficam de fora). */
export function dwgParaDxfLido(desenho: unknown, escritor: Pick<LeitorDwg, 'writeDxf'>): DwgLido {
  const d = desenho as { paperSpace?: unknown[]; layouts?: unknown[]; warnings?: unknown[] };
  const modelo = { ...d, paperSpace: [], layouts: [] };
  const lido = lerDxf(escritor.writeDxf(modelo as never));
  return { ...lido, avisos: (d.warnings ?? []).map((w) => (typeof w === 'string' ? w : JSON.stringify(w))) };
}

/** Lê um DWG (R13 a R2018) com o leitor carregado. Lança erro com mensagem em português se a estrutura for inutilizável. */
export function lerDwg(dados: Uint8Array, leitor: LeitorDwg): DwgLido {
  let desenho: unknown;
  try { desenho = leitor.readDwg(dados); } catch (e) { throw new Error(`Não foi possível ler o DWG: ${e instanceof Error ? e.message : String(e)}`); }
  return dwgParaDxfLido(desenho, leitor);
}
