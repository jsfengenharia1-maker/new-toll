// Leitura de IFC no navegador (L3): o web-ifc e o seu WASM ficam em public/vendor e só são buscados quando o usuário escolhe
// um arquivo (fora do HTML único). Sem o vendor (artifact do claude.ai), a leitura avisa e sugere o DXF.
import { lerIfc, type ApiIfc, type IfcLido } from '../../core/ifc/ler';
import { iniciarIfc, VENDOR_IFC, VENDOR_IFC_WASM, type ModuloIfc } from '../../core/ifc/web';

let api: Promise<ApiIfc> | null = null;

/** Carrega e inicializa o web-ifc de public/vendor (uma vez por sessão). */
export function carregarIfc(): Promise<ApiIfc> {
  api ??= import(/* @vite-ignore */ new URL(VENDOR_IFC, document.baseURI).href)
    .then((m: ModuloIfc) => iniciarIfc(m, new URL(VENDOR_IFC_WASM, document.baseURI).href))
    .catch((e) => { api = null; throw e; });
  return api;
}

export const IFC_INDISPONIVEL = 'IFC indisponível neste ambiente (o leitor fica em vendor/, fora do arquivo único). Salve o projeto em DXF e use o lançamento por DXF/DWG.';

/** Lê um arquivo IFC. Lança Error com a mensagem para o usuário. */
export async function lerArquivoIfc(f: File, aoCarregar?: () => void): Promise<IfcLido> {
  let a: ApiIfc;
  try { a = await carregarIfc(); } catch { throw new Error(IFC_INDISPONIVEL); }
  aoCarregar?.();
  const dados = new Uint8Array(await f.arrayBuffer());
  try { return lerIfc(a, dados); } catch (e) { throw new Error(e instanceof Error ? e.message : String(e)); }
}
