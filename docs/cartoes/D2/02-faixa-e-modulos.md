# D2 — cartão 02: faixa de comandos (casca), abas de módulo e `App.tsx`

Classe: Sonnet baixo (integra layout; código validado, patch de referência em `docs/cartoes/D2/validado-D1-D2.patch`).

## Arquivos
- `src/app/FaixaModulo.tsx` (novo)
- `src/App.tsx`
- `src/app/design/global.css` (3 linhas de grade)

## `src/app/FaixaModulo.tsx`
```tsx
// Faixa de comandos de cada módulo (D2: só a casca; os comandos entram na D3 conforme docs/analises/layout-bimcraft-mapa.md).
import type { ReactNode } from 'react';
import { Ribbon, RibbonGroup, RibbonHint, type RibbonTabDef } from './ui';
import { useLayout, type Modulo } from './layout';

export const ABAS_FAIXA: Record<Modulo, RibbonTabDef[]> = {
  portico: [{ id: 'arquivo', label: 'Arquivo' }, { id: 'lancamento', label: 'Lançamento' }, { id: 'edicao', label: 'Edição' }, { id: 'cargas', label: 'Cargas e ações' }, { id: 'analise', label: 'Análise' }, { id: 'dimensionamento', label: 'Dimensionamento' }, { id: 'fundacoes', label: 'Fundações' }, { id: 'vista', label: 'Vista' }],
  edificio: [{ id: 'arquivo', label: 'Arquivo' }, { id: 'lancamento', label: 'Lançamento' }, { id: 'edicao', label: 'Edição' }, { id: 'cargas', label: 'Cargas e ações' }, { id: 'analise', label: 'Análise' }, { id: 'dimensionamento', label: 'Dimensionamento' }, { id: 'fundacoes', label: 'Fundações' }, { id: 'pranchas', label: 'Pranchas' }, { id: 'vista', label: 'Vista' }],
  fundacoes: [{ id: 'arquivo', label: 'Arquivo' }, { id: 'lancamento', label: 'Lançamento' }, { id: 'dimensionamento', label: 'Dimensionamento' }, { id: 'fundacoes', label: 'Fundações' }, { id: 'vista', label: 'Vista' }],
};
const NOME: Record<Modulo, string> = { portico: 'Pórtico', edificio: 'Edifício', fundacoes: 'Fundações' };

/** `corpo(aba)` devolve os grupos da aba ativa; sem ele (D2), mostra uma dica. */
export function FaixaModulo({ modulo, corpo }: { modulo: Modulo; corpo?: (aba: string) => ReactNode }) {
  const abas = ABAS_FAIXA[modulo];
  const salva = useLayout((s) => s.aba[modulo]);
  const aberta = useLayout((s) => s.faixaAberta);
  const setAba = useLayout((s) => s.setAba);
  const setAberta = useLayout((s) => s.setFaixaAberta);
  const ativa = abas.some((a) => a.id === salva) ? salva : abas[0].id;
  return (
    <Ribbon label="Faixa de comandos" tabs={abas} active={ativa} onActive={(id) => setAba(modulo, id)} open={aberta} onOpen={setAberta}>
      {corpo ? corpo(ativa) : <RibbonGroup label={abas.find((a) => a.id === ativa)?.label ?? ''}><RibbonHint>{`Comandos de ${NOME[modulo]} nesta aba: em migração (painel lateral e barra da planta).`}</RibbonHint></RibbonGroup>}
    </Ribbon>
  );
}
```
A D3 troca `corpo` por funções de cada módulo (a faixa é única para os três módulos, renderizada pelo `App`, porque o estado do módulo de fora fica em stores zustand; o Edifício ganha o store de UI no cartão D3-01).

## `src/App.tsx`
1. Import: `import { AjudaProvider, BotaoAjuda, copyText, download, Dock, StatusBar, ThemeSelect } from './app/ui';` e `import { FaixaModulo } from './app/FaixaModulo';`.
2. `<header className="topbar">` vira `<header className="topbar qbar">` (as duas classes: `.topbar` é gancho dos fluxos).
3. Retirar do cabeçalho o bloco `<div className="modsw" role="tablist" aria-label="Módulo">…</div>` e inserir logo depois do `</header>`:
```tsx
      <nav className="modtabs" role="tablist" aria-label="Módulo">
        <button type="button" role="tab" aria-selected={st.module === 'portico'} onClick={() => st.set({ module: 'portico' })}>Pórtico</button>
        <button type="button" role="tab" aria-selected={st.module === 'edificio'} onClick={() => st.set({ module: 'edificio' })}>Edifício</button>
        <button type="button" role="tab" aria-selected={st.module === 'fundacoes'} onClick={() => st.set({ module: 'fundacoes' })}>Fundações</button>
      </nav>
```
(`src/App.tsx` fica fora da varredura de controles crus do `design.test` — ela cobre só `src/app/**` — e já usava `<button>` cru; os três botões são os mesmos que existiam em `.modsw`.)
4. Envolver o conteúdo do módulo: depois do `</nav>` acima e antes de `{st.module === 'fundacoes' ? …`, abrir `<div className="work"><FaixaModulo modulo={st.module} />`; fechar `</div>` logo depois de `)}` que fecha a expressão do módulo e antes de `{st.memorialOpen …`.

## `src/app/design/global.css`
- `.app { … grid-template-rows: auto 1fr auto; … }` → `grid-template-rows: auto auto minmax(0, 1fr) auto;` (topbar, abas de módulo, trabalho, status).
- `.main { grid-template-columns: 48px 1fr 380px; … }` → `grid-template-columns: 48px minmax(0, 1fr) auto;` e `.main.nopanel` → `48px minmax(0, 1fr)`.
- `.edif { grid-template-columns: 400px 1fr; … }` → `auto minmax(0, 1fr)`; `.fund { grid-template-columns: 440px 1fr; … }` → `auto minmax(0, 1fr)`.
(As larguras passam a vir das docas, cartão 03.)

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run build`; os fluxos só depois do cartão 03 (sem as docas, as colunas `auto` ficam sem largura).

## Rótulos
`role=tab` das abas de módulo com `aria-label="Módulo"` e os mesmos nomes (Pórtico, Edifício, Fundações). Abas da faixa em `aria-label="Faixa de comandos"`. O selo `.status` e o botão Memorial ficam no cabeçalho nesta fatia (movem na D3).
