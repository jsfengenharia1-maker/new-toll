# D2 — cartão 04: abas de vista (Edifício) e `StatusBar`

Classe: Sonnet baixo (integra layout; código validado).

## Arquivos
- `src/app/edificio/Edificio.tsx`
- `src/App.tsx`
- `src/app/design/global.css`

## `src/app/edificio/Edificio.tsx`
Acrescentar `ViewTabs` ao import de `'../ui'` e trocar o bloco `<div className="edif-tabs" role="tablist"> … </div>` por:
```tsx
        <ViewTabs className="edif-tabs" label="Vistas" active={aba} onChange={(k) => setAba(k as typeof aba)}
          tabs={([['planta', 'Planta'], ['vista3d', '3D'], ['elevacao', 'Elevação'], ['verificacao', `Verificação${diags.length ? ` (${diags.length})` : ''}`], ['analise', 'Análise'], ['deslocamentos', 'Deslocamentos'], ['isovalores', 'Isovalores'], ['dimensionamento', 'Dimensionamento'], ['pranchas', 'Pranchas'], ['premissas', 'Premissas']] as const).map(([k, l]) => ({ id: k, label: l, ajuda: `aba:${k}`, bad: k === 'verificacao' && nErr > 0 }))} />
```
Os nomes das abas, `role=tab`, `aria-selected`, `data-ajuda="aba:<id>"` e a classe `edif-tabs` ficam (149 usos nos fluxos). A aba Verificação com erros mantém a classe `bad`.

## `src/app/design/global.css`
Remover as regras antigas `.edif-tabs`, `.edif-tabs button` e `.edif-tabs button.on` (as da seção "edifício"; a de `.edif-tabs button.bad` fica):
```css
.edif-tabs button.bad { color: var(--bad); }
```
O estilo passa a ser o de `.vtabs` (cartão D1-01). Na lista de transições, `.edif-tabs button` pode sair (já há `.vtabs button`).

## `src/App.tsx`
O `<footer className="statusbar"> … </footer>` vira `<StatusBar mensagem={st.message}> … </StatusBar>` com os mesmos filhos (a `<span className="msg">` passa a ser interna ao componente). Conteúdo e ordem dos controles ficam (coordenadas, Eixos, P&B, Símbolos, Snap, Cotas, Grade, Unidades): a divisão por módulo é do cartão D3-06.

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run build`; `npm run e2e -- --workers 4` completo (81 verdes). `npm run mapa`.
