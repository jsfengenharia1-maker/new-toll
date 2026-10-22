# Cartão L1-17 — Janela "Obras recentes" (recentes, biblioteca, exemplos e busca)

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões 08, 09, 11 e 12.

## Objetivo
Uma janela com busca por nome ou descrição sobre: obra atual (guardar na biblioteca), obras da biblioteca, 6 últimas obras abertas, exemplos e histórico completo. Itens: C1.40, C1.44, C1.45.

## Arquivos
1. `src/app/edificio/ObrasRecentes.tsx` (criar)
Leia antes: `src/app/edificio/recentes.ts`, `src/app/storage.ts` (`listLibrary`, `loadFromLibrary`, `deleteFromLibrary`, `salvarEdificioNaBiblioteca`), `src/core/building/exemplos.ts`, `src/core/building/file.ts` (`lerEdificio`), `src/app/edificio/store.ts` (`edificioParaArquivo`, `novaObraExemplo`, `carregar`), `Modal`, `Group`, `TextField` em `ui`, `src/app/Library.tsx` (uso assíncrono de `listLibrary`).

## Contrato
```tsx
export function ObrasRecentes({ onClose, onAberta }: { onClose(): void; onAberta(): void })
```
`onAberta` é chamado depois de abrir uma obra (o pai fecha a janela).

## Estado e dados
- `const [termo, setTermo] = useState('')`.
- `const [lista, setLista] = useState(() => lerRecentes())` (histórico completo, recarregado após cada ação que registra).
- `const [itens, setItens] = useState<LibraryItem[] | null>(null)`; `useEffect` que chama `listLibrary()` e guarda `items.filter((i) => i.kind === 'edificio')` (erro → `[]`); função `recarregar()` repete.
- `norm`: use `buscarRecentes` para os recentes. Para a biblioteca e os exemplos, filtre com a mesma regra de palavras: monte um `ObraRecente` falso `{ nome, descricao, origem: 'biblioteca', pavimentos: 0, abertaEm: '' }` por item e chame `buscarRecentes([x], termo).length > 0`.
- Da loja: `const { carregar, novaObraExemplo } = useBuilding();`, `const nome = useBuilding((s) => s.sessao.modelo.obra.nome)`.

## Estrutura (JSX) — `<Modal titulo="Obras recentes" onClose={onClose} larga>`
1. `TextField` "Buscar obra" (valor `termo`, `onChange={setTermo}`) e `Hint` `Procura palavras no nome ou na descrição da obra.`
2. `<h4>Obra atual</h4>`: texto `nome`; `Button` `Guardar na biblioteca` →
   `const f = edificioParaArquivo(); if (!f) { aviso…; return; }` (sem obra: `useStore.getState().set({ message: 'Não há obra para guardar.' })`);
   `const o = f.building.obra; const r = await salvarEdificioNaBiblioteca(o.nome, (o.descricao ?? []).join(' · '), f);`
   se `r.ok`: `registrarRecente({ nome: o.nome, descricao: (o.descricao ?? []).join(' · '), origem: 'biblioteca', pavimentos: f.building.pavimentos.length })`, `setLista(lerRecentes())`, recarregar a biblioteca e mensagem `Obra guardada na biblioteca.`; senão `useStore.getState().set({ message: r.aviso })` e mostre também `<Note tone="bad">{r.aviso}</Note>` (estado `aviso`). (`useStore` vem de `../store`.)
3. `<h4>Obras da biblioteca</h4>`: lista `.recentes` com um `.recente` por item filtrado: `recente-nome` = `i.name`, `recente-meta` = `${new Date(i.savedAt).toLocaleDateString('pt-BR')} · ${i.summary || 'sem descrição'}`; botões `Abrir` (`aria-label={`Abrir ${i.name}`}`) → `const e = await loadFromLibrary(i.id); const f = e ? lerEdificio(e.payload) : null; if (f) { carregar(f); setLista(lerRecentes()); onAberta(); }` e `Excluir` (`variant="danger"`, `aria-label={`Excluir ${i.name}`}`) → `await deleteFromLibrary(i.id)` e recarregar. Sem itens: `Hint` `Nenhuma obra na biblioteca ainda.` (ou `Nenhuma obra encontrada.` quando há termo).
4. `<h4>Últimas obras abertas</h4>`: `ultimasObras(buscarRecentes(lista, termo))` em `.recente`: nome, meta `${ORIGEM_ROTULO[o.origem] ?? (o.origem === 'arquivo' ? 'Arquivo do computador' : 'Biblioteca')} · ${new Date(o.abertaEm).toLocaleString('pt-BR')} · ${o.pavimentos} pavimento(s)` e, quando houver, a descrição. `Hint` abaixo: `Só os dados da abertura ficam registrados. Reabra uma obra pelo Arquivo › Abrir trabalho do computador ou pela biblioteca acima.` (`ORIGEM_ROTULO` de `types`; origem `arquivo`/`biblioteca` não está nele: use o texto indicado.)
5. `<h4>Obras de exemplo</h4>`: `EXEMPLOS_OBRA` filtrados pelo termo (nome + `descricao.join(' ')`), cada um com `Button` `Abrir exemplo` (`aria-label={`Abrir exemplo ${e.nome}`}`) → `novaObraExemplo(e.id); setLista(lerRecentes()); onAberta();`.
6. `<Group title="Histórico completo" open={false}>`: tabela `<table className="data">` com colunas `Data | Obra | Descrição | Origem | Pavimentos`, uma linha por item de `buscarRecentes(lista, termo)` (todos, em ordem cronológica decrescente); sem itens, `Hint` `Nenhuma abertura registrada.` Abaixo, `Button variant="ghost"` `Limpar histórico` → `limparRecentes(); setLista([])`.

## Verificação
```bash
npx tsc -b && npx vitest run src/app/design/design.test.ts src/app/edificio/recentes.test.ts
```
