// Importação do DXF da máscara (gabarito): lê o arquivo, estima a unidade e cria a máscara no grupo do pavimento atual.
import { lerDxf, metrosPorUnidade } from '../../core/dxf/read';
import { UNIDADES, unidadeProvavel } from './lancamentoLeitura';
import { useStore } from '../store';
import { usePlanta } from './plantaStore';

type Exec = (nome: string, params: Record<string, unknown>) => { ok: boolean };

export async function importarMascara(f: File, grupo: string, exec: Exec) {
  const txt = await f.text();
  const r = lerDxf(txt);
  const escala = metrosPorUnidade(r.insunits) ?? unidadeProvavel(r.bbox);
  const res = exec('mascara.importar', { grupo, nome: f.name.replace(/\.dxf$/i, ''), geo: r.camadas, escala });
  if (res.ok) {
    const ign = Object.entries(r.ignoradas).map(([k, n]) => `${n} ${k}`).join(', ');
    useStore.getState().set({ message: `${f.name}: ${r.segmentos} segmento(s) em ${Object.keys(r.camadas).length} camada(s), unidade ${UNIDADES.find((u) => u.v === escala)?.label ?? escala} ${metrosPorUnidade(r.insunits) ? '($INSUNITS)' : '(estimada pelo tamanho; confira)'}${ign ? ` · ignoradas: ${ign}` : ''}.` });
    usePlanta.getState().set({ vista: null });
  }
}
