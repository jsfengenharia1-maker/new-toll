# E3f — cartões de interface (lajes inclinadas, rampas e desníveis)

**Aplicar depois da D6** (faixa de comandos com abas, navegador em árvore e painel de propriedades em docas: `docs/analises/design-bimcraft.md`, seção 5). Executor: Haiku. Núcleo pronto e testado (`src/core/building/planos.test.ts`, 15 testes; validação `validation/opensees/inclinada.py`); **não altere `src/core/`**. Só `src/app/ui` e classes/tokens de `src/app/design/global.css` (tokens novos `--plano-0` … `--plano-7` lá, em neutros + accent da paleta enxuta). Sem botões novos acima do canvas ou na barra da planta. Cada cartão compila sozinho, na ordem; e2e com `{ exact: true }` (NumField/Select: regex ancorada no início).

Estes cartões são de especificação: descrevem destino, rótulos exatos, chamadas do núcleo e valores esperados; o executor escreve o TSX seguindo o padrão dos cartões já aplicados da D5 (painel de propriedades) e da L5 (ferramentas da planta). Antes de escrever, abra os componentes que a D4–D6 deixou para o painel e para a faixa (grep `docs/mapa-codigo.md` por `Faixa`, `Propriedades`, `Navegador`).

| Cartão | Conteúdo | Itens que viram Feito |
|---|---|---|
| `01-planos.md` | Aba "Planos" na faixa (tarefa Lajes), nó "Planos" no navegador, propriedades do plano, criar/editar/remover/atribuir | C7.60–C7.65, C7.67 (numérico), C7.68 |
| `02-planta.md` | Panos coloridos pelo plano, seta de declividade, texto de inclinação, vigas incoerentes em vermelho com correção por clique, definição gráfica com captura, arrastar pontos | C7.66, C7.67, C7.69, C7.70, C7.73, C7.74 (desenho), C7.195 |
| `03-pano-definir-tipo.md` | Seletor único de tipo de pano, pano a definir com espessura/desnível/plano, copiar dados com o plano | C7.1, C7.15, C7.16, C7.8 (frente L) |
| `04-memorial-pranchas-e2e.md` | Seção "Planos inclinados" do memorial, croqui e dobra nas pranchas, ajuda da sequência, exemplo, e2e `E3f` | C7.71, C7.72, C7.75, C7.76, C7.77, C7.94, C7.95, C7.129, C7.142 |

Depois do último cartão: atualizar as notas dos itens nos dois checklists (situação Feito, nota com o arquivo da interface), `npm run checklists`, `npm run mapa`, histórico de conferência e `docs/historico-fatias.md`.
