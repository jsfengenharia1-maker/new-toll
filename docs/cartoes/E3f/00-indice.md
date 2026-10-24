# E3f — cartões de interface (lajes inclinadas, rampas e desníveis)

**Aplicar depois da D6/D7** (faixa de comandos com abas, navegador em árvore e painel de propriedades em docas: `docs/analises/design-bimcraft.md`, seção 5). Executor: Haiku. Ordem obrigatória: 1 → 2 → 3 → 4. Núcleo pronto e testado (`src/core/building/planos.test.ts`, 15 testes; validação `validation/opensees/inclinada.py`); **não altere `src/core/`**. Só `src/app/ui` e classes/tokens de `src/app/design/global.css` (tokens novos `--plano-0` … `--plano-7` no cartão 2, em neutros + accent da paleta enxuta). Sem botões novos acima do canvas ou na barra da planta. Cada cartão compila sozinho, na ordem; e2e com `{ exact: true }` (NumField/Select: regex ancorada no início).

Os cartões trazem o TSX completo no formato "Arquivo novo" / "Trocar em" / "Acrescentar ao fim de" (âncoras curtas e únicas, só em texto que independe das frentes E3c, E3d e E3e) e foram validados aplicando só a partir dos `.md` (`validado.patch` = o resultado, medido sobre a E3e aplicada). Se uma âncora não casar, procure o trecho equivalente (mesmo rótulo) e não invente código. Não edite os checklists: a frente fecha com os quatro cartões e o e2e `E3f` verde; o orquestrador atualiza as linhas e o histórico.

| Cartão | Conteúdo | Itens que viram Feito |
|---|---|---|
| `01-planos.md` | Grupo "Planos" na faixa (aba Edição), nó "Planos" no Navegador, grupo "Planos" e janela "Novo plano" na doca Propriedades: criar, editar (três pontos, reta horizontal, máxima declividade; % ou graus), remover, atribuir e retirar | C7.60–C7.65, C7.67 (numérico), C7.68 |
| `02-planta.md` | Panos coloridos pelo plano, seta de declividade, texto de inclinação, vigas incoerentes com correção por clique, face superior das vigas planas, definição na planta com captura (ferramenta `plano`), tokens `--plano-N`, mapa do layout | C7.66, C7.67, C7.69, C7.70, C7.73, C7.195; C7.74 (desenho da face superior) |
| `03-pano-definir-tipo.md` | Seletor único de tipo de pano, pano a definir com espessura/desnível/plano, aviso do plano na cópia de dados | C7.1, C7.15, C7.16, C7.8 (plano na cópia) |
| `04-memorial-pranchas-e2e.md` | Seção "Planos inclinados" do memorial (planos, normais, empuxos, premissa) e e2e `E3f` | C7.77 (exemplo de cobertura aberto pela interface, calculado e no memorial) |

## Fora desta entrega (precisam de núcleo ou de interação nova)
- **Pranchas e ajuda** (C7.71, C7.72, C7.76, C7.94, C7.95, C7.129, C7.142 seguem Parcial; C7.75 só tem o aviso `PLANO_MURO` da revisão): o texto de inclinação junto ao desnível, o croqui de `croquiPavimento` (com o campo `Croqui (mm)`) e as barras dobradas com `dobraDaBarra`/`marcaDeDobra` entram nas pranchas, que são montadas em `src/core/sheets`; o núcleo dos planos já entrega os dados. Fatia de núcleo das pranchas.
- **Ajuda F1 da ferramenta `plano`** (linhas de `SEQUENCIA_PLANOS`): exige a entrada em `src/core/ajuda/catalogo.ts` (`IDS_FERRAMENTAS`) e a atualização do teste de contagem (40) em `src/core/ajuda/ajuda.test.ts`.
- **Alças com arrasto** nos pontos de controle (`plano.editar { pontos }`), **duplo clique** no texto de cota para reescrever o desnível e a classe `cursor-captura` sobre eixo e face: os pontos e o desnível se editam por número; a captura vale no clique.
- **Abertura → pano a definir** (`laje.criar { definir: true }`): as aberturas não são selecionáveis na planta; sem botão (use a linha de comandos até a ferramenta de aberturas da L5 ganhar seleção).

- **Pendência de núcleo (achada na validação):** no exemplo `criarExemplo('telhado')`, com a opção `planoDiafragma` ligada ("Panos inclinados no diafragma do pavimento"), o recálculo (`analisarEdificio`) não termina em 5 a 9 minutos (o teste `planos.test.ts` só cobre o pano isolado). O e2e só liga e desliga a opção. Investigar o desempenho do diafragma com as lajes planas do exemplo antes de liberar o recálculo com a opção ligada.

Depois do último cartão: atualizar as notas dos itens nos dois checklists (situação Feito só nos itens cobertos; os demais seguem Parcial, com a nota acima), `npm run checklists`, `npm run mapa`, histórico de conferência e `docs/historico-fatias.md`.
