// Carregamento do web-ifc (L3): o módulo e o WASM ficam em public/vendor (gerados por scripts/vendor-web-ifc.mjs) e só são
// buscados quando o usuário escolhe um IFC; nada disso entra no dist/index.html. O núcleo recebe o módulo já importado.
import type { ApiIfc } from './ler';

/** Caminhos relativos à raiz do site (gerados por scripts/vendor-web-ifc.mjs). */
export const VENDOR_IFC = 'vendor/web-ifc-0.0.78.mjs';
export const VENDOR_IFC_WASM = 'vendor/web-ifc-0.0.78.wasm';

/** O que o módulo do web-ifc precisa exportar. */
export interface ModuloIfc {
  IfcAPI: new () => ApiIfc & { Init(localizar?: (caminho: string, prefixo: string) => string, umFio?: boolean): Promise<void> };
}

/** Instancia e inicializa o IfcAPI (um só fio). `urlWasm` = endereço do web-ifc-<versão>.wasm; sem ele, o padrão do módulo. */
export async function iniciarIfc(modulo: ModuloIfc, urlWasm?: string): Promise<ApiIfc> {
  const api = new modulo.IfcAPI();
  await api.Init(urlWasm ? (caminho) => (caminho.endsWith('.wasm') ? urlWasm : caminho) : undefined, true);
  return api;
}
