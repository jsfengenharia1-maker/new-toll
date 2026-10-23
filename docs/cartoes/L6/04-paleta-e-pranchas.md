# L6 — cartão 04: Paleta Ctrl+K e opção nas pranchas

Classe: Haiku (interface sobre núcleo pronto; código validado).

## Arquivos
`src/app/edificio/PaletaComandos.tsx`, `src/app/edificio/Pranchas.tsx`

## O que faz
Item "Cotas temporárias: ligar ou desligar" na paleta e a caixa "Cotas do usuário (cota em série) nas formas e na locação" no grupo de pranchas de armação e locação (`cotasUsuario`). A ferramenta Cota em série já aparece na paleta pelo rótulo.

## Aplicação
Aplique `docs/cartoes/L6/patches/04.patch` (git apply).

## Verificação
- npx tsc -b; npx vitest run src/app

## Rótulos e regras
Estilo só por tokens do design system (`cores.cota`, `cores.captura`, `cores.guia` do canvas; sem cor literal); componentes de `src/app/ui` (`Input`, `Check`); sem `<button>`, `<input>` ou `<select>` crus; sem CSS fora de `src/app/design`; **sem botões novos acima do canvas nem na barra da planta** (a ferramenta Cota em série entra pela tecla D com Medir ativa e pela paleta Ctrl+K). Rótulos novos e únicos: "Cota em série", "Valor da cota (cm)", "Cotas temporárias: ligar ou desligar", "Cotas do usuário (cota em série) nas formas e na locação". No e2e use `{ exact: true }` em botões, papéis e `getByLabel`, exceto NumField e Select (regex ancorada).
