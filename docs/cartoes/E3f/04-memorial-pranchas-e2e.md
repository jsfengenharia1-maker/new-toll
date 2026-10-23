# Cartão E3f-04 — memorial, pranchas, ajuda, exemplo e e2e `E3f`

Aplicar depois dos cartões 01–03. Compila sozinho.

## Núcleo
- `planosNoMemorial(b)` → `{ nome, grupo, definicao, percentual, graus, lajes, vigas }[]`; `esforcosDosPlanos(an)` → `normais` (por laje/viga e caso: `Nmin`, `Nmax`, kN) e `empuxos` (por pilar, pavimento e caso: `Hx`, `Hy`, kN); premissa `planos` (`premissas.ts`); opções `planoDiafragma` e `planoCargaProjecao` (aparecem sozinhas na janela de opções e em `opcoesAlteradas`).
- `croquiPavimento(b, grupo, tamanho)` → `{ escala, largura, altura, pilares, vigas, setas } | null` (null sem lajes inclinadas).
- `dobraDaBarra(b, grupo, a, z)` → `{ trechos: { comprimento, inclinacao }[], dobras: { ponto, angulo }[], total }`; `marcaDeDobra(ponto, direcao, tam)`.
- `SEQUENCIA_PLANOS` (texto de ajuda, 6 linhas); exemplo `criarExemplo('telhado')` já listado em `EXEMPLOS_OBRA` ("Exemplo: cobertura em duas águas").
- Revisão: PLANO_SEPARADO e PLANO_COTAS (avisos da análise, já em `CODIGOS_REVISAO` e `SUGESTOES`).

## O que fazer
1. Memorial (`MemorialEdificio.tsx`, depois das lajes alveolares): seção `Planos inclinados` com a tabela de `planosNoMemorial` (colunas Plano, Grupo, Definição, Inclinação (%), Inclinação (°), Lajes, Vigas), a tabela de esforços normais (G e Q, kN, 1 casa) e a de empuxos no topo dos pilares (Hx, Hy por caso), e o texto da premissa `planos` com o selo "a confirmar".
2. Prancha de formas (`core/sheets` não muda: fazer na camada de desenho do app que monta as pranchas): texto de inclinação junto ao desnível e o croqui de `croquiPavimento` num quadro de 60 unidades no canto da prancha (tamanho configurável em `Configuração da prancha`: NumField `Croqui (mm)`).
3. Prancha de armação das lajes: barras superiores que cruzam panos de planos diferentes desenhadas com o dobramento ao lado (comprimentos de cada trecho, 2 casas em m) e a marca da dobra (`marcaDeDobra`, 10 cm).
4. Ajuda F1 da ferramenta `plano`: as linhas de `SEQUENCIA_PLANOS`.

## e2e `E3f` (novo fluxo em `e2e/flows.mjs`, padrão dos fluxos da E3b)
1. Abrir `Exemplo: cobertura em duas águas` → calcular: sem erro de análise.
2. Passos dos cartões 01–03 (criar plano, corrigir viga, pano a definir e volta).
3. Memorial: seção `Planos inclinados` contém `Água sul` e `30,00` (inclinação, 2 casas).
4. Opções: `Panos inclinados no diafragma do pavimento` ligada recalcula sem erro; desligar de volta.
