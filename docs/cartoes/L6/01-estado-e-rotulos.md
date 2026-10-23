# L6 — cartão 01: Estado da ferramenta e rótulos

Classe: Haiku (interface sobre núcleo pronto; código validado).

## Arquivos
`src/app/edificio/plantaStore.ts`, `src/app/edificio/Planta.tsx`

## O que faz
Tipo `Ferramenta` ganha `cota`; estado `cotasTemp` (ligadas por padrão) e `refTemp` (trocas de face/eixo da sessão, não vão ao arquivo); rótulo "Cota em série" e passos; a tecla D com Medir (ou Cota) ativa alterna Medir e Cota em série (Planta.tsx, antes do mapa `ferr`) e zera a série.

## Aplicação
Aplique `docs/cartoes/L6/patches/01.patch` (git apply).

## Verificação
- npx tsc -b

## Rótulos e regras
Estilo só por tokens do design system (`cores.cota`, `cores.captura`, `cores.guia` do canvas; sem cor literal); componentes de `src/app/ui` (`Input`, `Check`); sem `<button>`, `<input>` ou `<select>` crus; sem CSS fora de `src/app/design`; **sem botões novos acima do canvas nem na barra da planta** (a ferramenta Cota em série entra pela tecla D com Medir ativa e pela paleta Ctrl+K). Rótulos novos e únicos: "Cota em série", "Valor da cota (cm)", "Cotas temporárias: ligar ou desligar", "Cotas do usuário (cota em série) nas formas e na locação". No e2e use `{ exact: true }` em botões, papéis e `getByLabel`, exceto NumField e Select (regex ancorada).
