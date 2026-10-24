# Cartões da E3d — ábacos das lajes nervuradas bidirecionais (interface, layout novo)

Executor: Haiku. Ordem obrigatória: 1 → 2 → 3 → 4 → 5, **depois dos cartões da E3c** (usam `camadaNervuras`, `arranjoDaLaje` já importado em `Planta.tsx`, `NervuradasGrupo` e `MemorialNervuradas`). Cada cartão compila sozinho depois dos anteriores (`npx tsc -b`). O núcleo (`abacos.ts`, `abacosPuncao.ts`, `abacosMemorial.ts`, `nervuradasDim.ts`, comandos `abaco.*`) está pronto e testado; estes cartões são só a interface. A referência de dados e funções do núcleo está em `99-referencia-nucleo.md`.

**Aplicar depois da D7** (o cartão 2 toca `Edificio.tsx`, onde fica a doca Propriedades; o 5 toca `FaixaEdificio.tsx`). As âncoras são trechos curtos de texto; se uma não casar, procure o trecho equivalente (mesmo rótulo) e não invente código.

## Onde cada coisa fica no layout novo
| Peça | Lugar |
|---|---|
| Grupo "Ábacos (n)": prévia da geração por face, "Gerar nos pilares", "Gerar nos pilares selecionados", "Remover os ábacos automáticos", tabela de ábacos, retângulo manual, altura, armadura base, tabela por nervura | doca **Propriedades**, logo abaixo do grupo "Nervuradas bidirecionais" (aparece com a laje nervurada selecionada no Navegador, na planta ou na tabela de lajes) |
| Ábacos sombreados na planta (zona efetiva) | desenho da **Planta**, camada `camadaAbacos` (caixa "Mostrar ábacos na planta" do grupo acima) |
| Botão "Gerar ábacos nos pilares" | faixa de comandos, aba **Lançamento**, grupo **Ábacos** |
| h, d e extensão do ábaco; pilar sem ábaco com a ação "Gerar ábaco neste pilar" | janela da laje, aba **Punção e cortante** (`Puncao.tsx`) |
| Seção "Ábacos das lajes nervuradas bidirecionais" | **Memorial** da obra |

## Como aplicar os blocos
- **Arquivo novo** `caminho`: crie o arquivo com o conteúdo do bloco, sem alterar.
- **Trocar em** `caminho`: o primeiro bloco aparece exatamente uma vez no arquivo; substitua-o pelo segundo bloco (depois da linha `por`).
- **Acrescentar ao fim de** `caminho`: cole o bloco no fim do arquivo.

## Regras desta frente (valem para todos os cartões)
- Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus). Rótulos únicos na tela. Sem CSS novo, sem cor literal, sem botão acima do canvas/barra da planta.
- Nos e2e, `getByRole`/`getByLabel` com `{ exact: true }`, exceto `NumField` e `Select`: regex ancorada (`/^Altura do ábaco/`). Grupos da Propriedades: `grupoEdif(page, /^Ábacos/)` (helper de `e2e/flows/helpers.mjs`).
- Não altere `src/core/`. Nada de cálculo novo: só chamadas ao núcleo.
- Os comandos `abaco.*` têm `mcp: false`: a interface os aciona pelos botões, nunca editando o modelo direto.
- **Não edite os checklists**: a frente fecha quando os cinco cartões estiverem executados e o e2e `E3d` verde; o orquestrador atualiza as linhas e o histórico.

## Limitações a manter visíveis na interface
- A rigidez do rebaixo entra na grelha; a flecha e o γz usam essa grelha (sem Branson por nervura).
- As opções `abaco*` só valem na geração: o polígono gravado não muda sozinho ("Gerar nos pilares" de novo refaz, mantendo a armadura base por pilar).
- Fora desta entrega (dependem de ferramenta nova na planta e no catálogo de ajuda): ferramenta **Ábaco** por clique/polígono, arrastar vértices na planta e o realce amarelo do pilar sem ábaco na planta. Substitutos: ábaco retangular por campos (centro e dimensões) e a ação "Gerar ábaco neste pilar" na janela de punção.
- Fonte e interpretações "a confirmar": `docs/pendencias-usuario.md` (linhas E3d).

## Verificação final (depois do cartão 5)
```bash
npx tsc -b
npx vitest run src/app/design src/core/building
npm run e2e -- --workers 1 E3
```
