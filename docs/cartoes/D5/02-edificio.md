# D5 — cartão 02: doca direita do Edifício (Propriedades) com os grupos de elemento

Classe: Sonnet baixo.

Princípio (protege os fluxos): os grupos de elemento **não mudam de componente nem de título**; passam da coluna esquerda para a doca direita, dentro de um contêiner que também tem a classe `edif-in`. Assim `page.locator('.edif-in details', { has: summary })` (21 usos nos fluxos) continua achando cada grupo, onde quer que ele esteja.

## Arquivos
- `src/app/edificio/Edificio.tsx`
- `src/app/design/global.css` (grade e larguras)

## Mudanças em `Edificio.tsx`
1. Import: `import { Propriedades } from './Propriedades';`.
2. Da paleta "Dados da obra" (cartão D4-02) **retirar** os grupos de elemento: `<PilaresGrupo b={b} />`, `<PilaresParedeGrupo …/>`, `<ParedesGrupo …/>`, `<MurosGrupo …/>`, `<AlvenariaGrupo …/>`, `<VigasGrupo b={b} />`, `<LancamentoL5Grupo …/>`, `<LajesGrupo b={b} />`, `<DadosL4Grupo …/>`, `<CargasGrupo b={b} />`, `<CortesGrupo …/>`, `<VinculosGrupo b={b} />`. Ficam na esquerda: `EtapasGrupo`, Pavimentos, Grupos, Eixos, `GruposCopiaGrupo`, `MascaraGrupo`.
3. Depois da doca esquerda e da vista central, acrescentar a doca direita (mesmo nível de `<section className="edif-main">`):
```tsx
      <Dock id="edificio-dir" lado="dir" rotulo="painel lateral direito" padrao={360}>
        <Propriedades>
          <PilaresGrupo b={b} />
          <PilaresParedeGrupo b={b} onPlanta={() => setAba('planta')} />
          <ParedesGrupo b={b} onPlanta={() => setAba('planta')} />
          <MurosGrupo b={b} />
          <AlvenariaGrupo b={b} />
          <VigasGrupo b={b} />
          <LancamentoL5Grupo b={b} onPlanta={() => setAba('planta')} />
          <LajesGrupo b={b} />
          <DadosL4Grupo b={b} onPlanta={() => setAba('planta')} />
          <CargasGrupo b={b} />
          <CortesGrupo b={b} onPlanta={() => setAba('planta')} />
          <VinculosGrupo b={b} />
        </Propriedades>
      </Dock>
```
(`Propriedades` já põe a classe `edif-in` no contêiner dos filhos e abre o grupo do tipo selecionado.) A aba de vista e a planta ficam em `edif-main`, que passa a ser a coluna do meio.

## `global.css`
```css
.edif { grid-template-columns: auto minmax(0, 1fr) auto; }
@media (max-width: 900px) { .edif { grid-template-columns: 1fr; } }
```
(troca a regra `.edif { … auto minmax(0, 1fr); }` do cartão D2-02; a regra de `@media (max-width: 900px)` que já existia continua valendo.) Larguras iniciais: esquerda 400 → **320**, direita 360; as tabelas largas (Pilares, Vigas) rolam dentro do grupo: acrescentar `.edif .gbody { overflow-x: auto; }` se alguma tabela passar da largura (verificar a tabela de Pilares com 6 colunas a 360 px).

## Efeitos nos fluxos
- Quem usa `.edif-in details` e `summary` com "Pilares", "Vigas", "Lajes", "Cargas", "Vínculos…", "Ferramentas de lançamento": continua achando (o contêiner da direita tem `.edif-in`). O contêiner da esquerda também; como os títulos são únicos, não há ambiguidade.
- Quem usa `.edif-in` sozinho (`page.locator('.edif-in')` para rolar ou contar): agora são dois elementos; trocar por `.edif-in >> nth=…` ou escopar pelo grupo. Conferir com `grep -n "locator('\.edif-in')" e2e/flows.mjs`.
- A largura do centro cai de ~1000 px para ~720 px (1400 px de viewport): os fluxos por coordenada usam `telaDe` e `reenquadrarAte` (reenquadram até o ponto cair no canvas), mas conferir os que clicam em posições fixas da tela (`page.mouse.click(` com número literal): `grep -n "mouse.click([0-9]" e2e/flows.mjs`; trocar por `telaDe`.

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run build`; `npm run mapa`; `npm run e2e -- --workers 4` completo (81 verdes). Manual: selecionar um pilar na planta abre o grupo "Pilares" na direita e rola até ele; cartão do tipo mostra `P1`, a seção e os lances; recolher/arrastar a doca direita devolve área ao desenho.

## Rótulos
Doca `painel lateral direito` vira `Propriedades` no rótulo acessível da paleta (`aria-label="Propriedades"` da `Palette`); o `aria-label` da doca continua `painel lateral direito`.
