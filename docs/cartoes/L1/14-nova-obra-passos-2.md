# Cartão L1-14 — Passos Eixos, Cargas e Resumo da janela "Nova obra"

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende do cartão 13.

## Objetivo
Completar `NovaObraPassos.tsx` com os três últimos passos. Itens: C1.16, C3.12.

## Arquivos
1. `src/app/edificio/NovaObraPassos.tsx` (editar: acrescentar ao fim e ajustar imports)
Leia antes: o arquivo como o cartão 13 o deixou; `src/app/ui/index.tsx` (`NumCell`, `TextField`, `Check`, `KV`, `Alert`, `Pill`, `Note`, `Hint`).

## Imports a acrescentar
`NumCell`, `KV`, `Alert`, `Pill`, `Note` de `'../ui'`; `validarEspecificacao`, `gerarObra` de `'../../core/building/assistente'`; `ORIGEM_ROTULO` não é necessário.

## `PassoEixos`
- `Check` "Criar malha de eixos": marcado quando `espec.eixos` existe; marcar → `mudar({ eixos: { dx: [5, 5, 5], dy: [4.5, 4.5] } })`; desmarcar → `mudar({ eixos: undefined })`.
- Se há malha: `TextField` "Espaçamentos em X (m)" e `TextField` "Espaçamentos em Y (m)", com o valor `dx.map(fmt).join('; ')` / `dy…` (`fmt` = número com vírgula decimal, sem zeros à direita: `String(v).replace('.', ',')`). Ao confirmar, converta com `texto.split(/[;\s]+/).filter(Boolean).map((t) => parseFloat(t.replace(',', '.')))`; se algum for `NaN` ou ≤ 0, ignore a alteração (o campo volta ao valor anterior pela própria `TextField`).
- `Hint`: `Eixos verticais numerados (1, 2, 3…) com os espaçamentos em X; horizontais com letras (A, B, C…) com os de Y. “5; 5; 4,5” cria 4 eixos. A origem é o ponto (0; 0).`
Função exportada auxiliar `contarEixos(dx: number[], dy: number[]): number` = `(dx.length ? dx.length + 1 : 0) + (dy.length ? dy.length + 1 : 0)` (usada no resumo).

## `PassoCargas`
- `NumField` "Revestimento e piso" unit `kN/m²`, valor `espec.revestimento ?? 1` → `mudar({ revestimento: v })`.
- `Hint`: `Sobrecargas por categoria de uso (NBR 6120:2019, Tabela 10). Edite os valores desta obra; cada pavimento pode ter ainda um valor próprio (passo Pavimentos).`
- Tabela `<table className="data">` com cabeçalho `Categoria | Sobrecarga (kN/m²) | Usada em | Fonte` e uma linha por `c` de `categoriasDeUso()`:
  - célula 1: `c.rotulo`;
  - célula 2: `NumCell` com `label={`Sobrecarga de ${c.rotulo}`}`, `value={espec.qCategoria?.[c.id] ?? c.q}`, `onChange={(v) => mudar({ qCategoria: { ...espec.qCategoria, [c.id]: Math.max(0, v) } })}`;
  - célula 3: quantos pavimentos da especificação usam a categoria (`espec.pavimentos.filter((p) => p.categoria === c.id).reduce((s, p) => s + p.repeticoes, 0)`), ou `—` se zero;
  - célula 4: `Pill` com `tone="warn"` e texto `a confirmar` quando `c.aConfirmar`.
  (Se a classe `data` exigir `className="data loads-ed"` como em `Edificio.tsx`, use as duas.)

## `PassoResumo`
Props: `PassoProps & { erros: string[] }`. Conteúdo:
- se `erros.length`: um `Alert` com `<ul>` das mensagens (cada `<li>` uma mensagem);
- senão `KV` com as linhas (`[rótulo, valor]`): `['Obra', nome]`, `['Descrição', linhas unidas por ' · ' ou '—']`, `['Cidade', cidade ou '—']`, `['Concreto e aço', `C${fck} · ${aco} · CAA ${caa}``]`, `['Perfil de padrões', perfil === 'nbr' ? 'NBR 6118' : 'Sistema']`, `['Vento', vento ? `V0 ${v0} m/s · categoria ${categoria}` : 'não considerado']`, `['Pavimentos', `${soma das repetições} em ${espec.pavimentos.length} grupo(s)`]`, `['Eixos', `${contarEixos(...)} eixo(s)` ou '—']`, `['Revestimento', `${revestimento} kN/m²`]` (números com vírgula);
- `Note`: `Ao criar, a obra atual é substituída (guarde-a antes pelo Arquivo › Salvar no computador, se precisar) e a janela de dados gerais abre para conferir normas e materiais. Tudo vira um único passo no histórico: Ctrl+Z desfaz a obra inteira.`
- `Pill` `tone="ok"` com `${gerarObra(espec).comandos.length} comando(s) serão aplicados` quando não há erros.

## Verificação
```bash
npx tsc -b && npx vitest run src/app/design/design.test.ts
```
