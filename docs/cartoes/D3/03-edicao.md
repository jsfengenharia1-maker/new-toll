# D3 — cartão 03: faixa, aba Edição

Classe: Sonnet baixo (cada botão aponta para handler existente).

## Arquivos
- `src/app/edificio/FaixaEdificio.tsx` (acrescenta a aba)
- `src/app/edificio/Edificio.tsx` (retira o `radiogroup` Edição e `mover`/`medir` da barra da planta)
- `e2e/flows.mjs` (se algum fluxo clicar os rádios da barra: ver Verificação)

## Política dos botões de ferramenta (vale para os cartões 03 a 05)
A ferramenta passa a ter **um** botão `role=radio` na faixa (nome = `ROTULO_FERRAMENTA`). Os botões dos grupos que lançam a ferramenta **com parâmetros** (por exemplo "Zona de uniformização" do painel de edição das lajes, "Planta de fundação (U)" do grupo Fundação) continuam onde estão, porque carregam opções; têm `role=button`, não colidem com os rádios.

## `FaixaEdificio.tsx`: acrescentar
Imports: `import { RibbonButton, RibbonGroup } from '../ui';` (já há), e nada novo além de `useBuilding`, `usePlanta`.
```tsx
function Edicao() {
  const dim = useBuilding((s) => s.dim);
  const pl = usePlanta();
  return (
    <>
      <RibbonGroup label="Modificar" radios="Ferramenta">
        <Ferr f="mover" icon="mover" /><Ferr f="copiar" icon="copiar" /><Ferr f="girar" icon="girar" /><Ferr f="espelhar" icon="espelhar" />
        <Ferr f="dividir" icon="dividir" /><Ferr f="unir" icon="unir" /><Ferr f="prolongar" icon="prolongar" />
      </RibbonGroup>
      <RibbonGroup label="Grupos">
        <RibbonButton icon="copiarGrupo" label="Copiar de outro grupo…" onClick={() => ui({ l4: 'copiarGrupo' })} />
        <RibbonButton icon="unirPavimentos" label="Unir pavimentos…" onClick={() => ui({ l4: 'unirPavimentos' })} />
      </RibbonGroup>
      <RibbonGroup label="Referências" radios="Ferramenta"><Ferr f="moverRef" icon="referencia" /><Ferr f="contaGotas" icon="contaGotas" /></RibbonGroup>
      <RibbonGroup label="Lajes" radios="Ferramenta">
        <Ferr f="puncao" icon="puncao" disabled={!dim?.puncao?.length} />
        <Ferr f="zonaLaje" icon="zona" /><Ferr f="linhaDobra" icon="dobra" /><Ferr f="direcaoPano" icon="laje" /><Ferr f="insercaoPano" icon="laje" />
        <RibbonButton icon="zona" label="Editar armaduras das lajes" title="Abre o painel de edição das armaduras sob a planta" onClick={() => { ui({ aba: 'planta' }); pl.set({ camadaPuncao: false, painelLajes: true, armaduraLajes: pl.armaduraLajes === 'nenhuma' ? 'ambas' : pl.armaduraLajes }); }} />
      </RibbonGroup>
    </>
  );
}
```
e em `FaixaEdificio`: `if (aba === 'edicao') return <Edicao />;`.

(O botão "Armadura de punção" da barra da planta, que só aparecia com punção calculada, vira o rádio `puncao` desabilitado sem punção: mesmo nome, mesma tecla Z. As opções dele — modo adicionar/apagar, linhas, barras, φ, espaçamento, "Apagar punção da seleção" — ficam na barra de opções, cartão 06.)

## `Edificio.tsx` (`PlantaBarra`)
- Remover o `<div className="seg small" role="radiogroup" aria-label="Edição">…</div>` e as constantes `EDICAO`; em `FERRAMENTAS` tirar `'mover'` e `'medir'` (Medir volta na aba Vista, cartão 05; até lá a tecla D continua). **Aplicar este cartão e o 05 na mesma fatia**, ou manter `medir` na barra até o 05.
- O botão `Armadura de punção` (`!!dim?.puncao?.length && <Button …>Armadura de punção</Button>`) sai da barra.

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run build`; `npm run mapa`; `npm run e2e -- --workers 4` completo. Fluxos que podem quebrar: os que clicam `getByRole('radio', { name: 'Armadura de punção' })` ou `getByRole('button', { name: 'Armadura de punção' })`: trocar por `page.getByRole('tablist', { name: 'Faixa de comandos' }).getByRole('tab', { name: 'Edição', exact: true }).click()` seguido de `page.getByRole('radio', { name: 'Armadura de punção' }).click()` (helper `ferramenta(page, aba, nome)` do D6-01; se ainda não existir, criar aqui).

## Rótulos
`role=radio` com os nomes de `ROTULO_FERRAMENTA`; "Copiar de outro grupo…" e "Unir pavimentos…" vêm de `GruposCopiaGrupo` (os botões antigos do grupo saem e o grupo fica com as áreas).
