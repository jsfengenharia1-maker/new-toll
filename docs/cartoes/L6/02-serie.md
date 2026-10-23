# L6 — cartão 02: Cota em série na planta

Classe: Haiku (interface sobre núcleo pronto; código validado).

## Arquivos
`src/app/edificio/Planta.tsx`

## O que faz
Ferramenta Cota: cada clique acrescenta uma referência (pilar, viga ou parede sob o cursor; senão ponto livre); Tab alterna faces e eixos/centros; Backspace tira a última; Enter ou duplo clique fecha a série e pede a linha; um clique na planta (ou um número em cm digitado) posiciona a linha e cria `cota.criar` (direção 0 ou 90 pelo primeiro e último ponto; no modo faces o primeiro usa faceB, o último faceA e os intermediários as duas); Esc termina (descarta a série sem linha; um segundo Esc volta a Selecionar). As cotas permanentes do pavimento são desenhadas no canvas de interação (`desenharCotasPermanentes`).

## Aplicação
Aplique `docs/cartoes/L6/patches/02.patch` (git apply).

## Verificação
- npx tsc -b; npx vitest run src/app/design

## Rótulos e regras
Estilo só por tokens do design system (`cores.cota`, `cores.captura`, `cores.guia` do canvas; sem cor literal); componentes de `src/app/ui` (`Input`, `Check`); sem `<button>`, `<input>` ou `<select>` crus; sem CSS fora de `src/app/design`; **sem botões novos acima do canvas nem na barra da planta** (a ferramenta Cota em série entra pela tecla D com Medir ativa e pela paleta Ctrl+K). Rótulos novos e únicos: "Cota em série", "Valor da cota (cm)", "Cotas temporárias: ligar ou desligar", "Cotas do usuário (cota em série) nas formas e na locação". No e2e use `{ exact: true }` em botões, papéis e `getByLabel`, exceto NumField e Select (regex ancorada).
