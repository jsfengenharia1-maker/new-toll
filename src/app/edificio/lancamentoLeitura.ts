// Leitura de gabaritos DXF e DWG no navegador (L2): o DXF é lido direto; o DWG pelo leitor do nasjidwg, carregado de
// public/vendor sob demanda (fora do HTML único). Sem o vendor (artifact do claude.ai), o DWG avisa e sugere o DXF.
import { lerDxf, metrosPorUnidade, type DxfLido } from '../../core/dxf/read';
import { lerDwg, VENDOR_DWG_LEITOR, type LeitorDwg } from '../../core/dxf/dwgLeitor';

export const UNIDADES = [{ v: 1, label: 'm' }, { v: 0.01, label: 'cm' }, { v: 0.001, label: 'mm' }];

/** Unidade provável do desenho quando o DXF não informa (maior dimensão do desenho) [a confirmar]. */
export function unidadeProvavel(bbox: [number, number, number, number] | null): number {
  if (!bbox) return 1;
  const D = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]);
  return D > 5000 ? 0.001 : D > 300 ? 0.01 : 1;
}

export interface GabaritoLido {
  nome: string;
  arquivo: { nome: string; tipo: 'dxf' | 'dwg' };
  lido: DxfLido;
  /** Metros por unidade do desenho. */
  escala: number;
  /** Unidade vinda de $INSUNITS (true) ou estimada pelo tamanho do desenho (false). */
  porHeader: boolean;
  avisos: string[];
}

let leitor: Promise<LeitorDwg> | null = null;
/** Carrega o leitor de DWG de public/vendor (fora do HTML único). */
export function carregarLeitorDwg(): Promise<LeitorDwg> {
  leitor ??= import(/* @vite-ignore */ new URL(VENDOR_DWG_LEITOR, document.baseURI).href)
    .then((m: LeitorDwg) => m)
    .catch((e) => { leitor = null; throw e; });
  return leitor;
}

/** Lê um arquivo DXF ou DWG. Lança Error com a mensagem para o usuário. */
export async function lerGabarito(f: File): Promise<GabaritoLido> {
  const dwg = /\.dwg$/i.test(f.name);
  let lido: DxfLido;
  const avisos: string[] = [];
  if (dwg) {
    let lib: LeitorDwg;
    try { lib = await carregarLeitorDwg(); } catch { throw new Error('DWG indisponível neste ambiente (o leitor fica em vendor/, fora do arquivo único). Salve o desenho como DXF no AutoCAD e importe o DXF.'); }
    const r = lerDwg(new Uint8Array(await f.arrayBuffer()), lib);
    avisos.push(...r.avisos);
    lido = r;
  } else lido = lerDxf(await f.text());
  const h = metrosPorUnidade(lido.insunits);
  const ign = Object.entries(lido.ignoradas).map(([k, n]) => `${n} ${k}`).join(', ');
  if (ign) avisos.push(`Entidades não lidas: ${ign}.`);
  return {
    nome: f.name.replace(/\.(dxf|dwg)$/i, ''), arquivo: { nome: f.name, tipo: dwg ? 'dwg' : 'dxf' }, lido,
    escala: h ?? unidadeProvavel(lido.bbox), porHeader: h !== null, avisos,
  };
}
