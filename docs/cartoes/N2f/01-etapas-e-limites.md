# N2f — cartão 1: grupo "Etapas de carga (flechas)" na barra lateral do edifício

Classe: Haiku (interface sobre núcleo pronto; segue o padrão de `OpcoesCalculo.tsx` e `EstadosLimite.tsx`).

## Arquivos (2)
1. **Novo** `src/app/edificio/EtapasFlecha.tsx` — componente `EtapasFlechaGrupo({ b }: { b: BuildingModel })`.
2. `src/app/edificio/Edificio.tsx` — importar `import { EtapasFlechaGrupo } from './EtapasFlecha';` e inserir `<EtapasFlechaGrupo b={b} />` na linha logo abaixo de `<OpcoesGrupo b={b} />`.

## Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus)
`Group`, `Select`, `Button`, `NumCell`, `TextCell`, `OptNumCell`, `Hint`. A colagem usa `<textarea>` cru, como em `EstadosLimite.tsx` (linha com `aria-label="Tabela colada"`), já aceito pelo `design.test.ts`. Sem CSS novo: classes existentes `data`, `num`, `tl`, `row wrap`, `muted small`, `hint bad`.

## Núcleo a chamar (já existe, `src/core/building/flechas.ts`)
- `TIPOS_ELEMENTO_FLECHA: { v: 'viga' | 'macica' | 'trelicada'; rotulo: string }[]` → opções do seletor (rótulos "Vigas", "Lajes maciças", "Lajes treliçadas").
- `TIPOS_FLECHA: { v: TipoFlecha; rotulo: string }[]` → linhas da tabela de limites.
- `etapasDe(b, tipo): EtapaCarga[]` — etapas em uso (`{ nome, dias, pp, alvenaria, revestimento, variavel }`).
- `limitesEmUso(b, op, tipo): Record<TipoFlecha, LimiteFlecha>` com `op = opcoesEmUso(b.opcoes, perfilDe(b))` (de `../../core/building/opcoes`). `LimiteFlecha = { rel: number; mais?: number; abs?: number }`.
- `textoLimite(lim): string` (ex.: "ℓ/500 e 1 cm").
- `lerEtapasColadas(texto: string): EtapaCarga[] | string` (string = mensagem de erro).
- Comandos (via `const { exec } = useBuilding();` de `./store`):
  - `exec('etapas.definir', { elemento, etapas })` — `etapas` = lista completa editada; `exec('etapas.definir', { elemento, padrao: true })` volta ao padrão.
  - `exec('flechas.limites', { elemento, tipo, limite: { rel, mais, abs } })`; `exec('flechas.limites', { elemento, tipo, padrao: true })` volta ao limite geral.

## Layout e rótulos exatos
- `<Group title="Etapas de carga (flechas)" open={false}>`; quando `b.flechas` existir, título `Etapas de carga (flechas) (alteradas)`.
- `Select label="Elemento"` com estado local (`useState<TipoElementoFlecha>('viga')`).
- Tabela `<table className="data" data-etapas>` com cabeçalho exato: `Etapa | Idade (dias) | Peso próprio | Alvenaria | Revestimento | Variável (ψ2·Q)`. Uma linha por etapa de `etapasDe(b, el)`: `TextCell label="Etapa"` (nome) e `NumCell` para cada número. Cada edição chama `exec('etapas.definir', { elemento: el, etapas: novaLista })` com a lista inteira (a validação do comando recusa soma > 1; mostre `r.erros[0].mensagem` em `<span className="hint bad">` quando `exec` devolver erro — veja como `EstadosLimite.tsx` trata o retorno).
- Botões: `Adicionar etapa` (acrescenta `{ nome: 'Etapa n', dias: 365, pp: 0, alvenaria: 0, revestimento: 0, variavel: 0 }`), `Remover última` (desabilitado com 1 etapa), `Voltar ao padrão` (`padrao: true`, desabilitado quando `!b.flechas?.etapas?.[el]`).
- Colagem: `<textarea aria-label="Etapas coladas" rows={4} placeholder={'Desforma\t28\t1\t0\t0\t0\nAlvenaria\t60\t0\t1\t0\t0'} />` e `Button` `Aplicar colagem` → `lerEtapasColadas`; string → mostrar erro; lista → `etapas.definir`.
- `Hint`: `Frações de cada carga aplicadas na idade (soma ≤ 1 por coluna). ξ(t) da NBR 6118, Tabela 17.1; a flecha ativa conta a partir da primeira etapa com alvenaria.`
- Tabela de limites `<table className="data" data-limites-flecha>` com cabeçalho exato `Flecha | ℓ / … | + cm | máx. (cm) | Em uso`. Linha por `TIPOS_FLECHA`: três `OptNumCell` (placeholder = valor geral, ex. `String(lim.rel)`), coluna "Em uso" = `textoLimite(lims[t])`. Ao editar: `exec('flechas.limites', { elemento: el, tipo: t, limite: { rel, mais, abs } })` (campos vazios = 0). Botão por linha `Geral` → `padrao: true` (desabilitado sem limite próprio).

## e2e (no fluxo `N2f`, cartão 3)
Abrir o grupo e conferir `[data-etapas] tbody tr` = 4 e texto `Desforma (peso próprio)`; colar `A\t30\t1\t1\t1\t1` em "Etapas coladas", clicar `Aplicar colagem` → 1 linha.

## Checklist
Nenhuma linha muda só com este cartão (C7.83 fecha no cartão 3).

## Verificação
`npx tsc -b && npx vitest run src/app/design/design.test.ts src/core/building/flechasEtapas.test.ts`
