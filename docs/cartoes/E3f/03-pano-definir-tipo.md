# Cartão E3f-03 — seletor único de tipo de pano, pano a definir e cópia do plano

Aplicar depois da D6. Compila sozinho. Edita o painel de propriedades da laje (o que a D5 criou a partir de `EdicaoLajes.tsx`) e a janela de cópia de dados da L4 (`DadosL4.tsx`).

## Núcleo
- `TIPOS_PANO` (`planos.ts`): `{ id, rotulo, disponivel, nota? }[]` — vigotas, alveolar, nervurada, maciça, pano a definir; radier e mista indisponíveis com a nota.
- Comandos: `laje.atribuir { ids, tipo }` (tipos existentes), `laje.aDefinir { ids, espessura?, nivel?, plano? }` (pano a definir; espessura passa às vigas chatas do contorno), `laje.criar { definir: true }` (abertura → pano a definir), `laje.remover` (pano → abertura).
- `CAMPOS_COPIA_LAJE.plano` (`pilarDados.ts`): rótulo `Plano de inclinação`, com `alerta(de, para)` quando os planos diferem.

## O que fazer
1. Painel da laje: Select `Tipo de pano` com os `rotulo` de `TIPOS_PANO`; os indisponíveis desabilitados com a `nota` como dica. Escolher `Pano a definir` mostra `Espessura (m)`, `Desnível (m)` e `Plano` (Select com os planos do grupo e `Horizontal`) e o botão `Aplicar`, que chama `laje.aDefinir`.
2. Abertura selecionada (pano sem laje, L5): botão `Pano a definir` → `laje.criar { grupo, contorno, definir: true }`.
3. Cópia de dados (L4): a caixa `Plano de inclinação` aparece com os demais campos; antes de copiar, mostrar em `Hint` amarelo os textos de `alerta` de cada destino (o usuário desmarca para manter o plano do destino).

## Testes
- `TIPOS_PANO.filter((t) => t.disponivel).length` = 5.
- Depois de `laje.aDefinir { ids: [L1], espessura: 0.12 }`, `analisarEdificio` devolve erro que começa com `DEFINIR_PANO`.

## e2e (fluxo `E3f`)
Selecionar L1 da cobertura, `Tipo de pano` → `Pano a definir`, espessura 0,12, `Aplicar`: a planta mostra `?` no pano e o cálculo recusa com `DEFINIR_PANO`; voltar `Tipo de pano` → `Maciça`.
