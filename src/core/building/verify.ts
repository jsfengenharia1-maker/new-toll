// Verificação de lançamento: diagnósticos estruturados (código, elementos, mensagem, correção sugerida),
// os mesmos para a interface, a linha de comando e o MCP. Roda após cada comando.
import { peDireito, pavimentosOrdenados, type BuildingModel } from './types';
import { diagnosticosPilares } from './pilares';
import { diagnosticosVigas } from './vigas';

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

  d.push(...diagnosticosPilares(b), ...diagnosticosVigas(b));
  return d;
}

const fmt = (v: number) => v.toFixed(2).replace('.', ',');
