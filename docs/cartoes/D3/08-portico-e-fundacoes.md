# D3 — cartão 08: faixa do Pórtico e do módulo Fundações; cabeçalho como barra de acesso rápido

Classe: Sonnet baixo.

## Arquivos
- `src/app/FaixaPortico.tsx` (novo)
- `src/app/FaixaFundacoes.tsx` (novo)
- `src/App.tsx` (remover a coluna `.toolbar` de 48 px; BarraAtalhos na QA; `corpoFaixa` por módulo)
- `src/app/design/global.css` (grade do Pórtico sem a coluna de ferramentas)

## 1. `src/app/FaixaPortico.tsx`
O `TOOLS` (hoje em `App.tsx`) fica como está em `App.tsx` para o `onKey`; a faixa só precisa de rótulo, tecla e ação.
```tsx
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
```
Os controles Eixos, P&B e Cotas (checkboxes da barra de status) **ficam** na barra de status do Pórtico (cartão 06) com o mesmo `id` (`axchk`, `monochk`, `dimchk`) e rótulo; os botões `Eixos locais`, `Preto e branco` e `Cotas automáticas` da faixa são só atalhos de rótulo distinto (a ação é a mesma chave de `useStore`).

## 2. `src/app/FaixaFundacoes.tsx`
```tsx
// Corpo das abas da faixa do módulo Fundações (as ações estão no painel esquerdo e no memorial; a faixa só leva até elas).
import { RibbonButton, RibbonGroup, RibbonHint } from './ui';
import { useStore } from './store';

export function FaixaFundacoes({ aba, importarDoPortico, importarDoEdificio, podeEdificio }: { aba: string; importarDoPortico: () => void; importarDoEdificio: () => void; podeEdificio: boolean }) {
  if (aba === 'lancamento') return (
    <RibbonGroup label="Cargas por apoio">
      <RibbonButton icon="carga" label="Importar do pórtico atual" onClick={importarDoPortico} />
      <RibbonButton icon="obra" label="Importar do edifício" disabled={!podeEdificio} onClick={importarDoEdificio} />
    </RibbonGroup>
  );
  if (aba === 'dimensionamento' || aba === 'fundacoes') return <RibbonGroup label="Fundações"><RibbonHint>As premissas (estacas, blocos, sapatas, tubulões) e o cálculo estão no painel lateral e nos cartões de apoio.</RibbonHint></RibbonGroup>;
  if (aba === 'vista') return <RibbonGroup label="Memorial"><RibbonButton icon="memorial" label="Memorial de fundações" onClick={() => useStore.getState().set({ memorialOpen: true })} /></RibbonGroup>;
  return null;
}
```
Para os botões de importação, `Fundacoes.tsx` hoje tem `importModel` e `importFromEdificio` dentro do componente. Exportá-los por um pequeno store: `src/app/fundacoesAcoes.ts` com `export const acoesFundacoes = { importarDoPortico: () => {}, importarDoEdificio: () => {}, podeEdificio: false }` preenchido por um `useEffect` de `Fundacoes()` (mesmo padrão de `latest` em `App.tsx`). **Rótulos preservados:** `Importar do pórtico atual`, `Importar do edifício`; **esses dois botões saem do grupo "Cargas por apoio"** no painel; os rótulos dos fluxos (`getByRole('button', { name: 'Importar do pórtico atual' })`) continuam achando o botão da faixa com a aba Lançamento ativa (para o módulo Fundações a aba padrão é `lancamento`: já é a regra do cartão 02).

## 3. `App.tsx`
- Remover o `<nav className="toolbar" aria-label="Ferramentas">` e as constantes `TOOLS` só se não sobrar uso; o `onKey` não usa `TOOLS`, então apagar `TOOLS`. `.main` perde a coluna de 48 px: no CSS `.main { grid-template-columns: minmax(0, 1fr) auto; }` e `.main.nopanel { grid-template-columns: minmax(0, 1fr); }` (e o `@media (max-width: 860px)` que mexe em `44px` fica `minmax(0, 1fr)`).
- `corpoFaixa` completo:
```tsx
  const corpoFaixa = (aba: string) => aba === 'arquivo' ? <FaixaArquivo a={acoes} edificio={st.module === 'edificio'} />
    : st.module === 'edificio' ? <FaixaEdificio aba={aba} />
    : st.module === 'portico' ? <FaixaPortico aba={aba} setTab={setTab} enquadrar={fit} />
    : <FaixaFundacoes aba={aba} importarDoPortico={acoesFundacoes.importarDoPortico} importarDoEdificio={acoesFundacoes.importarDoEdificio} podeEdificio={acoesFundacoes.podeEdificio} />;
```
- Cabeçalho = barra de acesso rápido: manter, na ordem: marca, `Salvar`, `Biblioteca`, desfazer e refazer (`.tgroup`), `BarraAtalhos` (só no Edifício; `executarAtalho` vem de `Edificio.tsx`: exportá-lo como função `executarAtalhoEdificio(a: Atalho)` que usa `useEdifUI`, `usePlanta` e `useBuilding`), nome (`mname`), `Memorial`, `BotaoAjuda`, `ThemeSelect`, botão `Painel`. `Arquivo ▾` já saiu (cartão 02).

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run build`; `npm run mapa`; `npm run e2e -- --workers 4` completo. Fluxos do Pórtico (`desenho por coordenadas…`, `exportar desenho DXF`, `PWA`…): as ferramentas por tecla continuam; seletores por rótulo (`getByLabel('Inserir barra')`, `getByRole('button', { name: 'Selecionar' })`) agora procuram o botão da faixa com a aba Lançamento ativa (aba padrão do Pórtico).

## Rótulos
`Selecionar`, `Inserir nó`, `Inserir barra`, `Cota (2 pontos e a posição da linha)`, `Zoom por janela`, `Mover vista`, `Enquadrar` (os `aria-label` da coluna de 48 px, iguais); `Importar do pórtico atual`; `Importar do edifício`.
