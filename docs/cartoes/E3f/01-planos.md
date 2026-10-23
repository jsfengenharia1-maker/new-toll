# Cartão E3f-01 — planos: faixa, navegador e painel de propriedades

Aplicar depois da D6. Compila sozinho. Arquivo novo: `src/app/edificio/PlanosUI.tsx` (componentes `ListaPlanos`, `PropriedadesPlano`, `CriarPlano`).

## Núcleo (importar, não reimplementar)
- `src/core/building/types.ts`: `Plano { id, nome, grupo, cor?, def }`, `DefinicaoPlano` (`tresPontos` com pontos [x, y, desnível]; `retaHorizontal` e `maximaDeclividade` com dois pontos, `desnivel` e `inclinacao` em %).
- `src/core/building/planos.ts`: `coeficientesPlano(def)`, `inclinacaoDoPlano(coef)` → `{ percentual, graus, descendente }`, `planoAtribuido(b, id)`, `planosNoMemorial(b)` (definição em texto).
- Comandos: `plano.criar { grupo, nome?, cor?, tipo, pontos, desnivel?, inclinacao?, unidade?: '%' | 'graus' }`, `plano.editar { id, ...mesmos }`, `plano.remover { ids }`, `plano.atribuir { plano?, lajes?, vigas? }` (sem `plano` = volta à horizontal).

## Destino
1. Faixa de comandos, aba da tarefa **Lajes**: grupo "Planos" com os botões `Novo plano`, `Atribuir plano`, `Retirar plano` (rótulos exatos).
2. Navegador em árvore, dentro do grupo atual: nó `Planos` com um filho por plano do grupo: texto `<nome> — <i> %` (i com 1 casa, vírgula), marcador de cor (`--plano-<cor>`) e o selo `atribuído` quando `planoAtribuido`.
3. Painel de propriedades, plano selecionado: `Nome` (TextField), `Cor` (Select 0–7), `Definição` (Select: `Três pontos`, `Reta horizontal + inclinação`, `Máxima declividade`), pontos (NumField `x1`, `y1`, `z1`… conforme o tipo, m), `Desnível (m)`, `Inclinação`, `Unidade` (Select `%`/`graus`), leitura `Inclinação: <p> % (<g>°)`; cada alteração chama `plano.editar`. Botão `Remover plano`.
4. `Novo plano` abre `Modal` com os mesmos campos, título `Novo plano`, botão `Criar`.
5. `Atribuir plano`: com lajes/vigas selecionadas na planta e um plano selecionado no navegador, chama `plano.atribuir { plano, lajes, vigas }`; `Retirar plano` chama sem `plano`.

## Testes (vitest, `src/app/edificio/PlanosUI.test.ts`)
- Rótulo da árvore: plano `maximaDeclividade` com inclinação 30 → `Plano 1 — 30,0 %`.
- Unidade graus: criar com 45 graus → `inclinacaoDoPlano(...).percentual` ≈ 100 (4 casas).

## e2e (no fluxo `E3f` do cartão 04)
`Novo plano` → Definição `Máxima declividade`, pontos (0; 0) e (0; 4,5), desnível 0, inclinação 30 → `Criar`; a árvore mostra `Plano 1 — 30,0 %` (`{ exact: true }`).
