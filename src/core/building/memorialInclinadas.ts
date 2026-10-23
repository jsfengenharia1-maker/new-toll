// Memorial das vigas inclinadas (E2c): lista, envoltórias, armaduras e verificações, e o aviso dos nós de extremidade.
// Só texto e números (o componente do memorial apenas desenha as tabelas).
import type { Dimensionamento } from './dimensionamento';
import { resumoInclinadas } from './inclinadas';
import type { BuildingModel } from './types';

export interface TabelaMemorialInclinadas { id: 'lista' | 'esforcos' | 'armaduras'; titulo: string; colunas: string[]; linhas: string[][] }

const f = (v: number, c = 2) => (Number.isFinite(v) ? v.toFixed(c).replace('.', ',') : '—');
const ST = { ok: 'atende', review: 'revisar', fail: 'não atende' } as const;

export function memorialInclinadas(b: BuildingModel, dim: Dimensionamento | null): { tabelas: TabelaMemorialInclinadas[]; notas: string[] } {
  const lista = resumoInclinadas(b);
  if (!lista.length) return { tabelas: [], notas: [] };
  const rs = dim?.inclinadas ?? [];
  const tabelas: TabelaMemorialInclinadas[] = [{
    id: 'lista', titulo: 'Vigas inclinadas lançadas',
    colunas: ['Viga', 'Pavimentos', 'Seção (cm)', 'Comprimento entre as pontas (m)', 'Ângulo (°)', 'Ligações (ini / fim)', 'Barras', 'Cargas próprias'],
    linhas: lista.map((x) => [x.nome, `${x.pavimentoIni} → ${x.pavimentoFim}`, x.secao, f(x.comprimento), f(x.angulo, 1), x.ligacao, x.multipla ? `${x.barras} (múltipla)` : '1', String(x.cargas)]),
  }];
  if (rs.length) {
    tabelas.push({
      id: 'esforcos', titulo: 'Envoltória dos esforços de cálculo (combinações ELU)',
      colunas: ['Barra', 'Nd compressão (kN)', 'Nd tração (kN)', 'Mz vertical (kN·m)', 'My transversal (kN·m)', 'Vy (kN)', 'Vz (kN)', 'T (kN·m)', 'ℓe v / t (m)', 'λ v / t'],
      linhas: rs.map((r) => [r.nome, f(r.Nd.compressao, 1), f(r.Nd.tracao, 1), f(r.Mz, 1), f(r.My, 1), f(r.Vd[0], 1), f(r.Vd[1], 1), f(r.Td, 1), `${f(r.le[0])} / ${f(r.le[1])}`, `${f(r.lambda[0], 0)} / ${f(r.lambda[1], 0)}`]),
    }, {
      id: 'armaduras', titulo: 'Armaduras e verificações',
      colunas: ['Barra', 'Armadura longitudinal', 'Estribos', 'As (cm²)', 'Taxa (%)', 'Utilização flexo-compressão', 'Utilização cortante e torção', 'Situação'],
      linhas: rs.map((r) => [r.nome, `${r.armadura}${r.bloqueada ? ' (bloqueada)' : ''}`, r.estribo, f(r.As.total, 1), f(r.taxa * 100, 2), f(r.util, 2), f(r.utilCortante, 2), ST[r.status]]),
    });
  }
  return {
    tabelas,
    notas: [
      'Flexo-compressão ou flexo-tração oblíqua pela seção retangular por fibras (NBR 6118, cap. 17), nos planos vertical e transversal, em 21 estações por barra, com o pilar-padrão de curvatura aproximada (15.8.3.3) nos efeitos locais de 2ª ordem; armadura superior e inferior adotadas atendem a pior seção da envoltória.',
      'O detalhe dos nós de extremidade (ancoragem das barras, cruzamento com pilar ou viga) fica a cargo do projetista. Premissa e2c-inclinadas a confirmar; ver a seção de premissas.',
      ...rs.flatMap((r) => r.mensagens.filter((m) => !m.startsWith('Viga inclinada: o detalhe dos nós')).map((m) => `${r.nome}: ${m.replace(/^Viga inclinada: /, '')}`)),
    ],
  };
}
