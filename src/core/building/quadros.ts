// Quadros colados de planilha (R7-0): linhas separadas por Tab (Excel) ou ";" e vírgula decimal. Viram um lote
// de comandos (um passo só no desfazer): elemento com o mesmo nome é editado; os demais, criados.
import type { BuildingModel } from './types';

const num = (t: string) => parseFloat(t.trim().replace(',', '.'));

/**
 * Quadro de vigas de um grupo: nome; b (cm); h (cm); x1; y1; x2; y2 [; x3; y3 …] (m), uma viga por linha.
 * Linhas com cabeçalho ou incompletas são ignoradas (contadas em `ignoradas`).
 */
export function lerQuadroVigas(texto: string, b: BuildingModel, grupo: string): { comandos: { nome: string; params: Record<string, unknown> }[]; ignoradas: number } {
  const comandos: { nome: string; params: Record<string, unknown> }[] = [];
  let ignoradas = 0;
  for (const linha of texto.split(/\r?\n/)) {
    if (!linha.trim()) continue;
    const c = linha.split(/\t|;/).map((x) => x.trim()).filter((x, i, a) => x !== '' || i < a.length - 1);
    const v = c.slice(1).map(num);
    const coords = v.slice(2);
    if (c.length < 7 || !c[0] || v.slice(0, 2).some((x) => !(x > 0)) || coords.length < 4 || coords.length % 2 || coords.some((x) => !Number.isFinite(x))) { ignoradas++; continue; }
    const pontos: [number, number][] = [];
    for (let i = 0; i < coords.length; i += 2) pontos.push([coords[i], coords[i + 1]]);
    const secao = { b: v[0] / 100, h: v[1] / 100 };
    const exist = b.vigas.find((x) => x.grupo === grupo && x.nome === c[0]);
    comandos.push(exist ? { nome: 'viga.editar', params: { id: exist.id, secao, pontos } } : { nome: 'viga.tracar', params: { grupo, nome: c[0], secao, pontos } });
  }
  return { comandos, ignoradas };
}
