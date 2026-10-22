// Verificação de lançamento: diagnósticos estruturados (código, elementos, mensagem, correção sugerida),
// os mesmos para a interface, a linha de comando e o MCP. Roda após cada comando.
import { mascaraParaMundo, peDireito, pavimentosOrdenados, type BuildingModel, type Mascara } from './types';
import { diagnosticosPilares } from './pilares';
import { diagnosticosTransicao } from './transicao';
import { diagnosticosVigas } from './vigas';
import { diagnosticosLajes } from './lajes';
import { aberturasDiafragma } from './diafragma';
import { diagnosticosPilaresParede } from './pilarParede';

export type Severidade = 'erro' | 'aviso' | 'info';

export interface Diagnostico {
  codigo: string;
  severidade: Severidade;
  /** Ids físicos envolvidos. */
  elementos: string[];
  mensagem: string;
  /** Correção executável pelo registro de comandos. */
  sugestao?: { comando: string; params: Record<string, unknown>; texto: string };
}

/** Deslocamento entre máscaras de grupos diferentes acima do qual o app avisa (m) [a confirmar]. */
export const TOL_MASCARA = 0.05;

/** Retângulo envolvente (mundo) das linhas visíveis da máscara; em cache enquanto geometria e transformação não mudam. */
const cacheCaixa = new WeakMap<object, { chave: string; caixa: [number, number, number, number] | null }>();
export function caixaMascara(m: Mascara): [number, number, number, number] | null {
  const vis = m.camadas.filter((c) => c.visivel).map((c) => c.nome).sort();
  const chave = `${m.escala}|${m.rotacao}|${m.dx}|${m.dy}|${vis.join('\u0001')}`;
  const c0 = cacheCaixa.get(m.geo);
  if (c0 && c0.chave === chave) return c0.caixa;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const nome of vis) {
    const l = m.geo[nome]?.linhas ?? [];
    for (let i = 0; i + 1 < l.length; i += 2) { const [x, y] = mascaraParaMundo(m, l[i], l[i + 1]); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const caixa: [number, number, number, number] | null = x0 <= x1 ? [x0, y0, x1, y1] : null;
  cacheCaixa.set(m.geo, { chave, caixa });
  return caixa;
}

/**
 * Máscaras de grupos diferentes com o mesmo tamanho (diferença ≤ 10 % e ≤ 0,5 m em cada direção) mas deslocadas
 * entre si mais que TOL_MASCARA (e menos que metade do desenho): desenhos de pavimentos importados com origens
 * diferentes. Referência: a máscara do grupo do pavimento mais baixo.
 */
export function mascarasDesalinhadas(b: BuildingModel): Diagnostico[] {
  const ordem = new Map<string, number>();
  pavimentosOrdenados(b).forEach((p, i) => { if (!ordem.has(p.grupo)) ordem.set(p.grupo, i); });
  const ms = b.mascaras.filter((m) => ordem.has(m.grupo)).map((m) => ({ m, c: caixaMascara(m) })).filter((x) => x.c) as { m: Mascara; c: [number, number, number, number] }[];
  ms.sort((a, z) => ordem.get(a.m.grupo)! - ordem.get(z.m.grupo)!);
  const out: Diagnostico[] = [];
  const nomeGrupo = (id: string) => b.grupos.find((g) => g.id === id)?.nome ?? id;
  for (let i = 1; i < ms.length; i++) {
    const { m, c } = ms[i];
    const ref = ms.find((r) => r.m.grupo !== m.grupo);
    if (!ref || ms.indexOf(ref) > i) continue;
    const r = ref.c, w = c[2] - c[0], h = c[3] - c[1], wr = r[2] - r[0], hr = r[3] - r[1];
    const parecido = (a: number, z: number) => Math.abs(a - z) <= Math.min(0.5, 0.1 * Math.max(a, z));
    if (!parecido(w, wr) || !parecido(h, hr)) continue;
    const dx = (r[0] + r[2] - c[0] - c[2]) / 2, dy = (r[1] + r[3] - c[1] - c[3]) / 2, dist = Math.hypot(dx, dy);
    if (dist <= TOL_MASCARA || dist > Math.max(wr, hr) / 2) continue;
    const f = (v: number) => String(+v.toFixed(2)).replace('.', ',');
    out.push({
      codigo: 'MASCARA_DESALINHADA', severidade: 'aviso', elementos: [m.id, ref.m.id],
      mensagem: `A máscara “${m.nome}” (${nomeGrupo(m.grupo)}) está deslocada ${f(dist)} m (${f(dx)}; ${f(dy)}) em relação a “${ref.m.nome}” (${nomeGrupo(ref.m.grupo)}).`,
      sugestao: { comando: 'mascara.editar', params: { id: m.id, dx: +(m.dx + dx).toFixed(6), dy: +(m.dy + dy).toFixed(6) }, texto: `Deslocar “${m.nome}” para coincidir com “${ref.m.nome}”` },
    });
  }
  return out;
}

/** Pé-direito abaixo do qual o app avisa (m) [a confirmar]. */
export const PE_DIREITO_MIN = 2.2;
const TOL = 1e-3;

export function verificar(b: BuildingModel): Diagnostico[] {
  const d: Diagnostico[] = [];
  const ps = pavimentosOrdenados(b);
  if (!ps.length) d.push({ codigo: 'OBRA_SEM_PAVIMENTO', severidade: 'aviso', elementos: [], mensagem: 'A obra ainda não tem pavimentos.' });

  for (let i = 1; i < ps.length; i++) {
    if (Math.abs(ps[i].cota - ps[i - 1].cota) < TOL)
      d.push({ codigo: 'COTA_DUPLICADA', severidade: 'erro', elementos: [ps[i - 1].id, ps[i].id], mensagem: `${ps[i - 1].nome} e ${ps[i].nome} estão na mesma cota (${fmt(ps[i].cota)} m).` });
    else if (ps[i].cota - ps[i - 1].cota < PE_DIREITO_MIN)
      d.push({ codigo: 'PE_DIREITO_BAIXO', severidade: 'aviso', elementos: [ps[i].id], mensagem: `Pé-direito de ${ps[i].nome} = ${fmt(ps[i].cota - ps[i - 1].cota)} m (< ${fmt(PE_DIREITO_MIN)} m).` });
  }

  // Premissa: só pavimentos com o mesmo pé-direito formam grupo (o mais baixo usa a profundidade da fundação e fica de fora).
  for (const g of b.grupos) {
    const membros = ps.filter((p, i) => p.grupo === g.id && i > 0);
    if (membros.length < 2) continue;
    const ref = peDireito(b, membros[0].id);
    const fora = membros.filter((p) => Math.abs(peDireito(b, p.id) - ref) > TOL);
    for (const p of fora)
      d.push({
        codigo: 'GRUPO_PE_DIREITO', severidade: 'erro', elementos: [p.id, g.id],
        mensagem: `${p.nome} tem pé-direito ${fmt(peDireito(b, p.id))} m, diferente do grupo “${g.nome}” (${fmt(ref)} m).`,
        sugestao: { comando: 'grupo.desvincular', params: { pavimento: p.id }, texto: `Criar um grupo próprio para ${p.nome}` },
      });
  }

  for (const g of b.grupos)
    if (!b.pavimentos.some((p) => p.grupo === g.id))
      d.push({ codigo: 'GRUPO_VAZIO', severidade: 'info', elementos: [g.id], mensagem: `O grupo “${g.nome}” não tem pavimentos.`, sugestao: { comando: 'grupo.remover', params: { id: g.id }, texto: 'Remover o grupo' } });

  const nomes = new Map<string, string[]>();
  for (const e of b.eixos) nomes.set(e.nome, [...(nomes.get(e.nome) ?? []), e.id]);
  for (const [n, ids] of nomes) if (ids.length > 1) d.push({ codigo: 'EIXO_NOME_DUPLICADO', severidade: 'aviso', elementos: ids, mensagem: `Há ${ids.length} eixos com o nome “${n}”.` });

  d.push(...mascarasDesalinhadas(b));
  d.push(...diagnosticosPilares(b), ...diagnosticosTransicao(b), ...diagnosticosVigas(b), ...diagnosticosLajes(b), ...aberturasDiafragma(b), ...diagnosticosPilaresParede(b));
  return d;
}

const fmt = (v: number) => v.toFixed(2).replace('.', ',');
