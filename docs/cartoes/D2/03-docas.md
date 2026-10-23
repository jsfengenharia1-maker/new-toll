# D2 — cartão 03: docas laterais nos três módulos

Classe: Sonnet baixo (integra layout; código validado).

## Arquivos
- `src/App.tsx` (Pórtico: painel direito)
- `src/app/edificio/Edificio.tsx` (coluna esquerda)
- `src/app/Fundacoes.tsx` (coluna esquerda)

## Regras
Nesta fatia nenhum conteúdo muda de lugar: a doca só embrulha o `aside` existente (as classes `.panel`, `.edif-in`, `.fund-in` ficam, os fluxos as usam). A largura inicial é a de hoje (380, 400 e 440 px) para não mexer nos fluxos; a D3/D4 passa a 240/304 px quando o conteúdo sair das colunas.

## `src/App.tsx`
```tsx
        {panelOpen && (
          <Dock id="portico-dir" lado="dir" rotulo="painel lateral direito" padrao={380}>
          <aside className="panel">
            …(inalterado)…
          </aside>
          </Dock>
        )}
```

## `src/app/edificio/Edificio.tsx`
- Import: acrescentar `Dock` ao import de `'../ui'`.
- Embrulhar a coluna: `<Dock id="edificio-esq" lado="esq" rotulo="painel lateral esquerdo" padrao={400}>` antes de `<aside className="fund-in edif-in">` e `</Dock>` depois do `</aside>` correspondente (o que vem antes de `<section className="edif-main">`).

## `src/app/Fundacoes.tsx`
- Import: acrescentar `Dock` ao import de `'./ui'`.
- `<Dock id="fundacoes-esq" lado="esq" rotulo="painel lateral esquerdo" padrao={440}>` antes de `<aside className="fund-in">` e `</Dock>` depois do `</aside>` (dentro do `<fieldset className="fund">`). Observação: em modo leitura (`fieldset disabled`) o botão de recolher fica desabilitado; aceito.

## Verificação
- `npx tsc -b`; `npx vitest run src/app/design`; `npm run build`.
- `npm run e2e -- --workers 4` completo (81 verdes, com o cartão 01 já aplicado).
- Manual: arrastar a borda entre doca e desenho muda a largura (140 a 640 px) e a escolha volta ao recarregar (`localStorage` `statikos:layout`); o botão `‹`/`›` recolhe a doca para 20 px; ← e → na borda (foco com Tab) mudam 16 px; abaixo de 900 px a doca vira bloco comum (`display: contents`).

## Rótulos
Botões `Recolher painel lateral esquerdo` / `Mostrar …` e `Recolher painel lateral direito` / `Mostrar …`; separador `Largura de painel lateral esquerdo`. Conferir `grep -n "painel lateral" e2e/flows.mjs` (esperado: nenhuma ocorrência).
