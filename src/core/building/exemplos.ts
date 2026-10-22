// Obras de exemplo (fictícias) da tela de obras recentes (L1, C1.44). Cada uma devolve uma Sessao pronta.
import { Sessao } from '../commands';
import { edificioExemplo } from '../sheets/exemplo';
import { ESPEC_PADRAO, type EspecificacaoObra } from './assistente';
import { edificioVazio } from './types';

export type IdExemplo = 'predio' | 'subsolo' | 'vigotas';
export interface ExemploObra { id: IdExemplo; nome: string; descricao: string[]; resumo: string }

export const EXEMPLOS_OBRA: ExemploObra[] = [
  { id: 'predio', nome: 'Exemplo: residencial de 5 pavimentos', descricao: ['Obra fictícia: térreo, 3 tipos e cobertura', 'Pórtico 3 × 2 vãos, lajes maciças de 12 cm'], resumo: '5 pavimentos, 12 pilares, lajes maciças' },
  { id: 'subsolo', nome: 'Exemplo: com subsolo de garagem', descricao: ['Obra fictícia: subsolo, térreo, 2 tipos e cobertura', 'Mesmo pórtico 3 × 2 vãos em todos os pavimentos'], resumo: '5 pavimentos, 12 pilares, subsolo como garagem' },
  { id: 'vigotas', nome: 'Exemplo: lajes treliçadas', descricao: ['Obra fictícia: térreo, 2 tipos e cobertura', 'Lajes dos tipos em vigotas treliçadas H16, demais maciças'], resumo: '4 pavimentos, 12 pilares, treliçadas H16 nos tipos' },
];

const XS = [0, 5, 10, 15], YS = [0, 4.5, 9];

/** Lança a malha de pilares e as vigas/lajes em cada grupo. `tipoLaje(nomeGrupo)` devolve o `tipo` de `laje.detectarPanos`. */
function lancar(s: Sessao, tipoLaje: (grupo: string) => Record<string, unknown>) {
  const ok = (nome: string, params: Record<string, unknown>) => {
    const r = s.executar(nome, params);
    if (!r.ok) throw new Error(`${nome}: ${r.erros.map((e) => e.mensagem).join(' ')}`);
  };
  ok('lote', { comandos: XS.flatMap((x) => YS.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.5 } } }))) });
  for (const g of [...s.modelo.grupos]) {
    ok('lote', { comandos: [
      ...YS.map((y) => ({ nome: 'viga.tracar', params: { grupo: g.id, pontos: [[0, y], [15, y]], secao: { b: 0.15, h: 0.5 } } })),
      ...XS.map((x) => ({ nome: 'viga.tracar', params: { grupo: g.id, pontos: [[x, 0], [x, 9]], secao: { b: 0.15, h: 0.5 } } })),
    ] });
    ok('laje.detectarPanos', { grupo: g.id, tipo: tipoLaje(g.nome) });
  }
  ok('eixo.malha', { dx: [5, 5, 5], dy: [4.5, 4.5] });
}

export function criarExemplo(id: IdExemplo): Sessao {
  const ex = EXEMPLOS_OBRA.find((e) => e.id === id)!;
  const meta = { nome: ex.nome, descricao: ex.descricao, origem: 'exemplo' as const };
  if (id === 'predio') {
    const s = edificioExemplo();
    const r = s.executar('obra.definir', meta);
    if (!r.ok) throw new Error(`obra.definir: ${r.erros.map((e) => e.mensagem).join(' ')}`);
    return s;
  }
  const s = new Sessao(edificioVazio());
  const pavimentos: EspecificacaoObra['pavimentos'] = id === 'subsolo'
    ? [
      { nome: 'Subsolo', peDireito: 3, categoria: 'garagem', repeticoes: 1 },
      { nome: 'Térreo', peDireito: 3, categoria: 'comum', repeticoes: 1 },
      { nome: 'Tipo', peDireito: 3, categoria: 'residencial', repeticoes: 2 },
      { nome: 'Cobertura', peDireito: 3, categoria: 'cobertura', repeticoes: 1 },
    ]
    : [
      { nome: 'Térreo', peDireito: 3, categoria: 'comum', repeticoes: 1 },
      { nome: 'Tipo', peDireito: 3, categoria: 'residencial', repeticoes: 2 },
      { nome: 'Cobertura', peDireito: 3, categoria: 'cobertura', repeticoes: 1 },
    ];
  const espec: EspecificacaoObra = { ...ESPEC_PADRAO, ...meta, pavimentos };
  const r = s.executar('obra.assistente', { espec });
  if (!r.ok) throw new Error(`obra.assistente: ${r.erros.map((e) => e.mensagem).join(' ')}`);
  lancar(s, id === 'vigotas' ? (g) => (g === 'Tipo' ? { tipo: 'trelicada', modelo: 'H16', capa: 0.04 } : { tipo: 'macica', h: 0.12 }) : () => ({ tipo: 'macica', h: 0.12 }));
  return s;
}
