// Corpo das abas da faixa do módulo Fundações (as premissas e o cálculo estão no painel esquerdo e no memorial; a faixa leva até elas).
import { RibbonButton, RibbonGroup, RibbonHint } from './ui';
import { useStore } from './store';
import { useBuilding } from './edificio/store';
import { importarCargasDoEdificio } from './Fundacoes';
import { useAcoesFundacoes } from './fundacoesAcoes';

export function FaixaFundacoes({ aba }: { aba: string }) {
  const importarDoPortico = useAcoesFundacoes((s) => s.importarDoPortico);
  const edDim = useBuilding((s) => s.dim);
  const edVelha = useBuilding((s) => s.revAnalise !== s.sessao.revCalculo);
  if (aba === 'lancamento') return (
    <RibbonGroup label="Cargas por apoio">
      <RibbonButton icon="carga" label="Importar do pórtico atual" onClick={importarDoPortico} />
      <RibbonButton icon="obra" label="Importar do edifício" disabled={!edDim?.fundacao.length}
        title={edDim ? (edVelha ? 'O edifício mudou depois do cálculo: as cargas são do último cálculo.' : 'Cargas do último cálculo do edifício.') : 'Calcule o edifício (aba Edifício › Análise) para importar.'}
        onClick={() => edDim && importarCargasDoEdificio(edDim.fundacao)} />
    </RibbonGroup>
  );
  if (aba === 'dimensionamento' || aba === 'fundacoes') return <RibbonGroup label="Fundações"><RibbonHint>As premissas (estacas, blocos, sapatas, tubulões) e o cálculo estão no painel lateral.</RibbonHint></RibbonGroup>;
  if (aba === 'vista') return <RibbonGroup label="Memorial"><RibbonButton icon="memorial" label="Memorial de fundações" onClick={() => useStore.getState().set({ memorialOpen: true })} /></RibbonGroup>;
  return null;
}
