// Faixa de comandos de cada módulo (D2: só a casca; os comandos entram na D3 conforme docs/analises/layout-bimcraft-mapa.md).
import type { ReactNode } from 'react';
import { Ribbon, RibbonGroup, RibbonHint, type RibbonTabDef } from './ui';
import { useLayout, type Modulo } from './layout';

export const ABAS_FAIXA: Record<Modulo, RibbonTabDef[]> = {
  portico: [{ id: 'arquivo', label: 'Arquivo' }, { id: 'lancamento', label: 'Lançamento' }, { id: 'edicao', label: 'Edição' }, { id: 'cargas', label: 'Cargas e ações' }, { id: 'analise', label: 'Análise' }, { id: 'dimensionamento', label: 'Dimensionamento' }, { id: 'fundacoes', label: 'Fundações' }, { id: 'vista', label: 'Vista' }],
  // Edifício: uma aba por etapa da obra (mesmos ids da barra de etapas, ver etapas.ts), depois as utilitárias Edição e Vista.
  edificio: [{ id: 'obra', label: 'Obra' }, { id: 'pilares', label: 'Pilares' }, { id: 'vigasLajes', label: 'Vigas e lajes' }, { id: 'cargas', label: 'Cargas' }, { id: 'fundacao', label: 'Fundação' }, { id: 'calcular', label: 'Calcular' }, { id: 'resultados', label: 'Resultados' }, { id: 'pranchas', label: 'Pranchas e memorial' }, { id: 'edicao', label: 'Edição' }, { id: 'vista', label: 'Vista' }],
  fundacoes: [{ id: 'arquivo', label: 'Arquivo' }, { id: 'lancamento', label: 'Lançamento' }, { id: 'dimensionamento', label: 'Dimensionamento' }, { id: 'fundacoes', label: 'Fundações' }, { id: 'vista', label: 'Vista' }],
};
const NOME: Record<Modulo, string> = { portico: 'Pórtico', edificio: 'Edifício', fundacoes: 'Fundações' };

/** `corpo(aba)` devolve os grupos da aba ativa; sem ele (D2), mostra uma dica. */
export function FaixaModulo({ modulo, corpo, contextual }: { modulo: Modulo; corpo?: (aba: string) => ReactNode; contextual?: RibbonTabDef }) {
  const abas = [...ABAS_FAIXA[modulo], ...(contextual ? [{ ...contextual, contextual: true }] : [])];
  const salva = useLayout((s) => s.aba[modulo]);
  const aberta = useLayout((s) => s.faixaAberta);
  const setAba = useLayout((s) => s.setAba);
  const setAberta = useLayout((s) => s.setFaixaAberta);
  const ativa = abas.some((a) => a.id === salva) ? salva : (abas.find((a) => a.id === 'lancamento') ?? abas[0]).id;
  return (
    <Ribbon label="Faixa de comandos" tabs={abas} active={ativa} onActive={(id) => setAba(modulo, id)} open={aberta} onOpen={setAberta}>
      {corpo ? corpo(ativa) : <RibbonGroup label={abas.find((a) => a.id === ativa)?.label ?? ''}><RibbonHint>{`Comandos de ${NOME[modulo]} nesta aba: em migração (painel lateral e barra da planta).`}</RibbonHint></RibbonGroup>}
    </Ribbon>
  );
}
