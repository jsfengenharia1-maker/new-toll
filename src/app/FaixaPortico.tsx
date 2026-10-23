// Corpo das abas da faixa do módulo Pórtico (ferramentas da antiga coluna de 48 px, edição, painel de resultados, vista).
import { RibbonButton, RibbonGroup } from './ui';
import { useStore, type Tab, type Tool } from './store';

const FERR: { t: Tool; label: string; key: string; icon: string }[] = [
  { t: 'select', label: 'Selecionar', key: 'S', icon: 'selecionar' },
  { t: 'node', label: 'Inserir nó', key: 'N', icon: 'no' },
  { t: 'member', label: 'Inserir barra', key: 'M', icon: 'barra' },
  { t: 'dim', label: 'Cota (2 pontos e a posição da linha)', key: 'D', icon: 'cota' },
  { t: 'zoom', label: 'Zoom por janela', key: 'Z', icon: 'zoom' },
  { t: 'pan', label: 'Mover vista', key: 'H', icon: 'mover' },
];

function Ferr({ t }: { t: Tool }) {
  const st = useStore();
  const f = FERR.find((x) => x.t === t)!;
  return <RibbonButton icon={f.icon} label={f.label} title={`${f.label} (${f.key})`} aria-label={f.label} pressed={st.tool === t}
    onClick={() => { st.set({ tool: t }); if ((t === 'node' || t === 'member') && (st.tab === 'resultados' || st.tab === 'influencia')) st.set({ tab: 'estrutura' }); }} />;
}

/** Abre uma aba do painel direito (as mesmas teclas 1 a 5); `setTab` do App cuida da ferramenta Seção da aba Influência. */
const irPainel = (setTab: (t: Tab) => void, t: Tab) => () => setTab(t);

export function FaixaPortico({ aba, setTab, enquadrar }: { aba: string; setTab: (t: Tab) => void; enquadrar: () => void }) {
  const st = useStore();
  if (aba === 'lancamento') return (
    <>
      <RibbonGroup label="Seleção"><Ferr t="select" /></RibbonGroup>
      <RibbonGroup label="Elementos"><Ferr t="node" /><Ferr t="member" /></RibbonGroup>
      <RibbonGroup label="Anotação"><Ferr t="dim" /></RibbonGroup>
    </>
  );
  if (aba === 'edicao') return (
    <>
      <RibbonGroup label="Histórico">
        <RibbonButton icon="desfazer" label="Desfazer" title="Desfazer (Ctrl+Z)" disabled={!st.past.length} onClick={st.undo} />
        <RibbonButton icon="refazer" label="Refazer" title="Refazer (Ctrl+Y)" disabled={!st.future.length} onClick={st.redo} />
      </RibbonGroup>
      <RibbonGroup label="Seleção"><RibbonButton icon="transformar" label="Transformar seleção…" title="Abre Estrutura › Transformar seleção" onClick={irPainel(setTab, 'estrutura')} /></RibbonGroup>
    </>
  );
  if (aba === 'cargas') return (
    <RibbonGroup label="Cargas"><RibbonButton icon="carga" label="Cargas e combinações" title="Abre o painel Cargas (2)" onClick={irPainel(setTab, 'cargas')} /></RibbonGroup>
  );
  if (aba === 'analise') return (
    <>
      <RibbonGroup label="Resultados"><RibbonButton icon="resultados" label="Resultados" title="Abre o painel Resultados (3)" onClick={irPainel(setTab, 'resultados')} /></RibbonGroup>
      <RibbonGroup label="Influência"><RibbonButton icon="influencia" label="Linhas de influência" title="Abre o painel Influência (4)" onClick={irPainel(setTab, 'influencia')} /></RibbonGroup>
      <RibbonGroup label="Opções"><RibbonButton icon="config" label="Opções de análise" title="Abre Estrutura › Opções de análise" onClick={irPainel(setTab, 'estrutura')} /></RibbonGroup>
    </>
  );
  if (aba === 'dimensionamento') return (
    <RibbonGroup label="Dimensionar"><RibbonButton icon="dimensionamento" label="Dimensionar barras" title="Abre o painel Dimensionar (5)" onClick={irPainel(setTab, 'dimensionar')} /></RibbonGroup>
  );
  if (aba === 'fundacoes') return (
    <RibbonGroup label="Fundações"><RibbonButton icon="enviar" label="Cargas para o módulo Fundações" title="Abre o painel Dimensionar, grupo Cargas na fundação" onClick={irPainel(setTab, 'dimensionar')} /></RibbonGroup>
  );
  if (aba === 'vista') return (
    <>
      <RibbonGroup label="Navegação"><Ferr t="zoom" /><Ferr t="pan" /><RibbonButton icon="enquadrar" label="Enquadrar" title="Enquadrar (F)" aria-label="Enquadrar" onClick={enquadrar} /></RibbonGroup>
      <RibbonGroup label="Desenho">
        <RibbonButton icon="eixo" label="Eixos locais" pressed={st.showAxes} onClick={() => st.set({ showAxes: !st.showAxes })} />
        <RibbonButton icon="camadas" label="Preto e branco" pressed={st.mono} onClick={() => st.set({ mono: !st.mono })} />
        <RibbonButton icon="cota" label="Cotas automáticas" pressed={st.showDims} onClick={() => st.set({ showDims: !st.showDims })} />
      </RibbonGroup>
    </>
  );
  return null;
}
