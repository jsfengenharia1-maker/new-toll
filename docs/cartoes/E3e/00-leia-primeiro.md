# Cartões da E3e — lajes alveolares protendidas (interface, layout novo)

Executor: Haiku. Ordem obrigatória: 1 → 2 → 3 → 4 → 5, **depois dos cartões da E3c e da E3d** (usam `FormasLajeUI` e a seção "Tipos de laje" com formas, `LajesGrupo`/`TipoLajeCampos` com a nervurada, `<NervuradasGrupo>`/`<AbacosGrupo>` e as linhas `resumoAcoNervuradas`). Cada cartão compila sozinho depois dos anteriores (`npx tsc -b`). O núcleo (`alveolares.ts`, `alveolaresDim.ts`, comandos `ficha.alveolar`, `laje.alveolar`, `laje.exposicao`, `armadura.desbloquear`) está pronto e testado; estes cartões são só a interface. A referência de dados e funções do núcleo está em `99-referencia-nucleo.md`.

**Aplicar depois da D7.** As âncoras são trechos curtos de texto; se uma não casar, procure o trecho equivalente (mesmo rótulo) e não invente código. O cartão 5 tem um aviso próprio sobre as âncoras do resumo de aço.

## Onde cada coisa fica no layout novo
| Peça | Lugar |
|---|---|
| Editor de fichas alveolares (abas Geometria, Positivo, Serviço, Cortante, Negativos, Resumo), arquivo `.json` e biblioteca do usuário | Configuração da obra > seção **Tipos de laje**, abaixo das formas da E3c |
| Tipo "Alveolar" (ficha e placa por altura, resumo da placa) | doca **Propriedades**, grupo "Lajes": o seletor único "Tipo" |
| Grupo "Lajes alveolares (n)": processo, direção das placas, ambiente (CAA), negativo por ponta, placa fixada, desbloqueio e a janela "Laje alveolar" | doca **Propriedades**, logo abaixo do grupo "Lajes" (aparece com panos alveolares na obra) |
| Placas numeradas, bordas cortadas e "insuficiente" em vermelho | desenho da **Planta**, camada `camadaPlacas` (caixa "Mostrar placas alveolares na planta" do grupo acima) |
| Seção "Lajes alveolares" e linha do resumo de aço | **Memorial** da obra e vista Dimensionamento |
| Erros e avisos `ALVEOLAR_*` | lista de erros e avisos já existente; o clique na mensagem seleciona o pano e o grupo acima mostra os dados |

## Como aplicar os blocos
- **Arquivo novo** `caminho`: crie o arquivo com o conteúdo do bloco, sem alterar.
- **Trocar em** `caminho`: o primeiro bloco aparece exatamente uma vez no arquivo; substitua-o pelo segundo bloco (depois da linha `por`).
- **Acrescentar ao fim de** `caminho`: cole o bloco no fim do arquivo.

## Regras desta frente (valem para todos os cartões)
- Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus). Rótulos únicos na tela (os da ficha e os do tipo do pano têm sufixos diferentes de propósito). Sem CSS novo, sem cor literal, sem botão acima do canvas/barra da planta.
- Nos e2e, `getByRole`/`getByLabel` com `{ exact: true }`, exceto `NumField` e `Select`: regex ancorada (`/^Ficha alveolar do tipo/`). Grupos: `grupoEdif(page, 'Tipos de laje')`, `grupoEdif(page, /^Lajes —/)` e `grupoEdif(page, /^Lajes alveolares/)` (helpers de `e2e/flows/helpers.mjs`; o grupo "Lajes alveolares" não pode ser confundido com "Lajes —").
- Não altere `src/core/`. Nada de cálculo novo: só chamadas ao núcleo.
- Sem dado de fabricante: toda tela mostra a marca da ficha ("dado do fabricante, não verificado pelo programa" ou "ficha fictícia (demonstração)"); sem Mu, serviço, VRd ou EI na ficha a verificação correspondente não é feita e aparece como "sem dado", nunca "ok".
- Os comandos `ficha.alveolar`, `laje.alveolar`, `laje.exposicao` e `armadura.desbloquear` têm `mcp: false`: a interface os aciona pelos botões, nunca editando o modelo direto. Os que mudam o cálculo passam por `executarERecalcular` (`Armadura.tsx`).
- **Não edite os checklists**: a frente fecha quando os cinco cartões estiverem executados e o e2e `E3e` verde; o orquestrador atualiza as linhas (C7.51, C7.143; K1.9.62, K1.9.71, K1.9.76, K1.11.15, K1.13.1-1) e o histórico.

## Limitações a manter visíveis na interface
- A análise usa a placa adotada; a sugerida só vale depois de "Adotar a placa sugerida" (que a fixa e refaz o cálculo). "Voltar à escolha automática da placa" desfaz a fixação.
- Negativos editados e placa fixada ficam bloqueados até "Desbloquear a armadura da laje alveolar".
- Fora desta entrega (dependem de ferramenta nova na planta ou de material do fabricante): campo próprio para o engaste das bordas por aresta e para os momentos mínimos por tipo de vão (seguem pelos comandos `laje.alveolar { engasteBordas }` e `laje.momentosMin` e pelas opções `alveolar*`); desenho do recorte do canto das placas oblíquas (a planta mostra a extremidade perpendicular ao eixo; o aviso `ALVEOLAR_CHANFRO` diz quando chanfrar); representação das pranchas de formas e armação das alveolares (sem folha de referência: seguir a R5 depois); armadura dobrada em alveolares inclinadas (E3f); resistência ao fogo (pendente do fabricante).
- Fonte e interpretações "a confirmar": `docs/pendencias-usuario.md` (seção "Lajes alveolares (E3e)").

## Verificação final (depois do cartão 5)
```bash
npx tsc -b
npx vitest run src/app/design src/core/building
npm run e2e -- --workers 1 E3e
```
