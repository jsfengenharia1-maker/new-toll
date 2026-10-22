# N2f — cartão 2: tabela de flechas por tipo nas janelas da viga e da laje

Classe: Haiku (só apresentação; os números vêm prontos do núcleo).

## Arquivos (2)
1. **Novo** `src/app/edificio/FlechasTabela.tsx` — `export function TabelaFlechas({ f }: { f: FlechasElemento })`.
2. `src/app/edificio/Revisao.tsx` — usar `TabelaFlechas` em dois lugares:
   - função da janela da viga: logo antes de `<h4>Resumo</h4>` (bloco que começa com `<Origens o={v.origens} />`), inserir `{v.flechas && <><h4>Flechas</h4><TabelaFlechas f={v.flechas} /></>}`;
   - `ResultadoDaLaje`: logo depois do `<KV rows={[…]} />`, inserir `{x.flechas && <TabelaFlechas f={x.flechas} />}`.

## Componentes de `src/app/ui`
`Pill` (tons `ok` e `bad`, como na tabela de transições do mesmo arquivo), `KV`. Tabela HTML com classes existentes `data`, `num`, `tl`, `small`.

## Núcleo a chamar (`src/core/building/flechas.ts`)
- `ResultadoViga.flechas?: FlechasElemento` e `ResultadoLaje.flechas?: FlechasElemento` (em `dimensionamento.ts`).
- `linhasFlechas(f): { tipo, rotulo, mm, limiteMm: number | null, texto, ok }[]` — uma linha por tipo, na ordem: Total a longo prazo, Ativa (após as paredes), Instantânea da variável, Instantânea total.
- `f.metodo`: `'etapas' | 'fator' | 'simplificado'`; `f.etapas?.xiMedio`, `f.etapas?.lambda`, `f.etapas?.alfaG`, `f.etapas?.alfaQ`, `f.etapas?.tParedes`; `f.instantaneas` = `{ pp, alvenaria, revestimento, q, qqp }` (m); `f.rho`; `f.fissuracao?`.

## Conteúdo exato
- `<table className="data" data-flechas>` com cabeçalho `Flecha | Valor (mm) | Limite | Limite (mm) | Situação`; linhas de `linhasFlechas(f)`: `rotulo`, `fmt(mm, 1)`, `texto`, `limiteMm === null ? '—' : fmt(limiteMm, 1)`, `<Pill tone={ok ? 'ok' : 'bad'}>{ok ? 'atende' : 'não atende'}</Pill>`. Use `const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');`.
- Abaixo, `KV` com:
  - `['Método', f.metodo === 'etapas' ? 'etapas de carga (NBR 6118, 17.3.2.1.2)' : f.metodo === 'fator' ? 'fator único 1 + αf' : 'fatores simplificados × elástica']`
  - `['Instantâneas pp / alvenaria / revestimento / Q (mm)', `${fmt(i.pp*1000,1)} / ${fmt(i.alvenaria*1000,1)} / ${fmt(i.revestimento*1000,1)} / ${fmt(i.q*1000,1)}`]`
  - quando `f.etapas`: `['ξ médio / λ', `${fmt(e.xiMedio)} / ${fmt(e.lambda)}`]`, `['αg / αq (ativa)', `${fmt(e.alfaG)} / ${fmt(e.alfaQ)}`]`, `['Paredes aos (dias)', String(e.tParedes)]`
  - `['ρ′', fmt(f.rho * 100, 2) + ' %']`; quando `f.fissuracao`: `['Fissuração (δ fissurada / elástica)', fmt(f.fissuracao)]`.

## e2e (fluxo `N2f`, cartão 3)
Duplo clique na primeira linha do card `Vigas` do Dimensionamento abre a janela (`dialog` com nome `/Resultados do elemento — Viga/`); conferir `[data-flechas] tbody tr` = 4 e o texto `Ativa (após as paredes)`.

## Checklist
Nenhuma linha muda só com este cartão.

## Verificação
`npx tsc -b && npx vitest run src/app/design/design.test.ts`
