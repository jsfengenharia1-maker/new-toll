// Memorial das diagonais de contraventamento (E2d): lista (grupos, comprimento real, seção, ligações e flambagem), envoltórias,
// armaduras e verificações, nós gerados nos cruzamentos e o aviso dos nós de extremidade. Só texto e números.
import type { Dimensionamento } from './dimensionamento';
import { resumoDiagonais } from './diagonais';
import type { BuildingModel } from './types';

export interface TabelaMemorialDiagonais { id: 'lista' | 'esforcos' | 'armaduras'; titulo: string; colunas: string[]; linhas: string[][] }

const f = (v: number, c = 2) => (Number.isFinite(v) ? v.toFixed(c).replace('.', ',') : '—');
const ST = { ok: 'atende', review: 'revisar', fail: 'não atende' } as const;

export function memorialDiagonais(b: BuildingModel, dim: Dimensionamento | null, kV = 1, kT = 1): { tabelas: TabelaMemorialDiagonais[]; notas: string[] } {
  const lista = resumoDiagonais(b, kV, kT);
  if (!lista.length) return { tabelas: [], notas: [] };
  const rs = dim?.diagonais ?? [];
  const tabelas: TabelaMemorialDiagonais[] = [{
    id: 'lista', titulo: 'Diagonais de contraventamento lançadas',
    colunas: ['Diagonal', 'Pavimentos', 'Seção (cm)', 'Comprimento real (m)', 'Ângulo (°)', 'Ligações (ini / fim)', 'Flambagem k (vertical / transversal)', 'Barras', 'Nós de cruzamento'],
    linhas: lista.map((x) => [x.nome, `${x.pavimentoIni} → ${x.pavimentoFim}`, x.secao, f(x.comprimento), f(x.angulo, 1), x.ligacao, x.flambagem, x.multipla ? `${x.barras} (múltipla)` : '1', String(x.cruzamentos)]),
  }];
  if (rs.length) {
    tabelas.push({
      id: 'esforcos', titulo: 'Envoltória dos esforços de cálculo das diagonais (combinações ELU)',
      colunas: ['Barra', 'Nd compressão (kN)', 'Nd tração (kN)', 'Mz vertical (kN·m)', 'My transversal (kN·m)', 'Vy (kN)', 'Vz (kN)', 'T (kN·m)', 'ℓe v / t (m)', 'λ v / t'],
      linhas: rs.map((r) => [r.nome, f(r.Nd.compressao, 1), f(r.Nd.tracao, 1), f(r.Mz, 1), f(r.My, 1), f(r.Vd[0], 1), f(r.Vd[1], 1), f(r.Td, 1), `${f(r.le[0])} / ${f(r.le[1])}`, `${f(r.lambda[0], 0)} / ${f(r.lambda[1], 0)}`]),
    }, {
      id: 'armaduras', titulo: 'Armaduras e verificações das diagonais',
      colunas: ['Barra', 'Armadura longitudinal', 'Estribos', 'As (cm²)', 'Taxa (%)', 'Utilização tração ou compressão com flexão', 'Utilização cortante e torção', 'Situação'],
      linhas: rs.map((r) => [r.nome, `${r.armadura}${r.bloqueada ? ' (bloqueada)' : ''}`, r.estribo, f(r.As.total, 1), f(r.taxa * 100, 2), f(r.util, 2), f(r.utilCortante, 2), ST[r.status]]),
    });
  }
  return {
    tabelas,
    notas: [
      'Diagonal = barra de 2 nós e 6 gdl entre pontos de pavimentos quaisquer, ligada ao pilar ou à viga que a ponta toca, fora do diafragma; EI e EA da seção bruta, GJ reduzido como nas vigas. Nos cruzamentos de duas diagonais o pórtico ganha um nó; o comprimento de flambagem continua o total entre as pontas, sem redução pelo cruzamento.',
      'Tração ou compressão com flexão oblíqua pela seção retangular por fibras (NBR 6118, cap. 17), nos planos vertical e transversal, em 21 estações por barra; na compressão, pilar-padrão de curvatura aproximada (15.8.3.3) com ℓe = k·ℓ por plano, λ > 90 revisar e λ acima da esbeltez máxima das diagonais comprimidas erro; a diagonal só tracionada não tem limite de esbeltez.',
      'O detalhe dos nós de extremidade (ancoragem das barras, cruzamento com pilar ou viga) fica a cargo do projetista. Premissa e2d-diagonais a confirmar; ver a seção de premissas.',
      ...rs.flatMap((r) => r.mensagens.filter((m) => !m.startsWith('Diagonal: o detalhe dos nós')).map((m) => `${r.nome}: ${m.replace(/^Diagonal: /, '')}`)),
    ],
  };
}
