# Cartão E1d-3 — memorial, resumo de aço, escala das pranchas de paredes, fluxo e2e `E1d` e linhas do checklist

Executor: Haiku. Só interface, e2e e documentação; **não altere nada em `src/core/`**. Depende dos cartões E1d-1 e E1d-2 (janela com `ArmaduraDaParede`, `AberturasArmadura`, `IsovaloresParede` e o grupo `MurosGrupo`).

## Arquivos
- Criar `src/app/edificio/MemorialParedes.tsx` (componente `MemorialParedes`).
- Editar `src/app/edificio/MemorialEdificio.tsx` (inserir o componente; resumo geral de aço com as paredes).
- Editar `src/app/edificio/MemorialPilarParede.tsx` (texto da E1d).
- Editar `src/app/edificio/Detalhamento.tsx` (`csvAco` e `ResumoAco` com `resumoAcoParedes`).
- Editar `src/app/edificio/Pranchas.tsx` (escala das elevações de paredes).
- Editar `e2e/flows.mjs` (fluxo novo).
- Editar `docs/checklist-manual-cypecad.md`, `docs/checklist-manual-calculo-cypecad.md`, `docs/historico-fatias.md`, `docs/plano-execucao.md`.

## 1. Memorial — `MemorialParedes.tsx`
Núcleo: `memorialParedes(b: BuildingModel, dim: Dimensionamento): TabelaMemorial[]` de `../../core/building/memorialParedes` (`TabelaMemorial { id: string; titulo: string; colunas: string[]; linhas: string[][] }`; vazio sem paredes, pilares-parede ou muros; ids das tabelas: `opcoes`, `panos`, `locais`, `esforcos`, `esbeltez`, `aberturas`, `emendas`, `quantitativo`, `resumo-aco`, `mensagens`, `muros`, `muros-armadura`, `muros-aco`; cada linha tem o mesmo número de células que `colunas`; o texto já vem com vírgula decimal).
```tsx
export function MemorialParedes({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode })
```
Imports: `type ReactNode` de `react`; `memorialParedes` de `../../core/building/memorialParedes`; `type Dimensionamento` de `../../core/building/dimensionamento`; `type BuildingModel` de `../../core/building/types`. Modelo a imitar: `MemorialPilarParede.tsx` (mesma assinatura).
Corpo: `const ts = dim ? memorialParedes(b, dim) : []; if (!ts.length) return null;` e
`<>{h2('Armadura das paredes, pilares-parede e muros de arrimo')}` seguido, para cada tabela, de
`<div className="avoid" key={t.id} data-memorial-paredes={t.id}><h3>{t.titulo}</h3><table><thead><tr>{t.colunas.map((c, i) => <th key={i} className="l">{c}</th>)}</tr></thead><tbody>{t.linhas.map((l, i) => <tr key={i}>{l.map((c, k) => <td key={k} className="l">{c}</td>)}</tr>)}</tbody></table></div>` e, no fim, `<p>Premissas e1d-* (modelo sanduíche, fator de cumprimento, mínimos, cortante, aberturas, emendas, muro de arrimo) a confirmar; ver a seção de premissas.</p></>`.
Em `MemorialEdificio.tsx`: importar `MemorialParedes` de `./MemorialParedes` e inserir `<MemorialParedes b={b} dim={dim} h2={h2} />` imediatamente depois de `<MemorialPilaresParede b={b} dim={dim} h2={h2} />`.
Em `MemorialPilarParede.tsx`: trocar o trecho "Tensões e armaduras serão tratadas na frente E1d." por "A armadura, as tensões e as verificações estão na seção de armadura das paredes e pilares-parede."

## 2. Resumo de aço com as paredes
Núcleo: `Dimensionamento.resumoAcoParedes?: { aco: string; phi: number; comprimento: number; peso: number; pesoComPerdas: number }[]` (mesma forma de `resumoAcoPilares`).
- `Detalhamento.tsx`, função `csvAco`: na linha `const res = dim.resumoAcoVigas ?? [], resP = …` acrescentar `resPar = dim.resumoAcoParedes ?? []`; no array `lin`, depois de `...tabela('Resumo de aço dos pilares', resP)` inserir `...tabela('Resumo de aço das paredes e pilares-parede', resPar)`; o último item vira `...tabela('Resumo geral de aço (vigas, pilares, paredes, lajes e vigotas)', somarResumosAco(res, resP, resPar, resL, resV))`.
- `Detalhamento.tsx`, componente `ResumoAco`: acrescentar `resPar = dim.resumoAcoParedes ?? []` na declaração; na condição de retorno antecipado `if (!res.length && !resP.length && …)` incluir `&& !resPar.length`; `perdas = perdasDoResumo(somarResumosAco(res, resP, resPar, resL, resV))`; depois de `<TabelaAco titulo="Pilares" res={resP} marca="pilares" />` inserir `{resPar.length > 0 && <TabelaAco titulo="Paredes e pilares-parede" res={resPar} marca="paredes" />}`; o total vira `<TabelaAco titulo="Total geral (vigas, pilares, paredes, lajes e vigotas)" res={somarResumosAco(res, resP, resPar, resL, resV)} marca="geral" />`.
- `MemorialEdificio.tsx`, seção "Resumo geral de aço": acrescentar `|| (dim.resumoAcoParedes?.length ?? 0) > 0` à condição `{((dim.resumoAcoVigas?.length ?? 0) > 0 || …) && (<>`; no array de pares `[['Vigas', …], ['Pilares', …], …]` inserir `['Paredes e pilares-parede', dim.resumoAcoParedes ?? []]` depois de `['Pilares', …]` e trocar o último par por `['Total geral (vigas, pilares, paredes, lajes e vigotas)', somarResumosAco(dim.resumoAcoVigas ?? [], dim.resumoAcoPilares ?? [], dim.resumoAcoParedes ?? [], dim.resumoAcoLajes ?? [], dim.resumoAcoVigotas ?? [])]`; na frase "Perdas de {…}" usar o mesmo `somarResumosAco(…)` com `dim.resumoAcoParedes ?? []` na terceira posição.

## 3. Pranchas — escala das elevações de paredes
`Pranchas.tsx`, no `<Group title="Opções de armação e locação">`, logo depois do `Select` "Escala dos detalhes de fundação", acrescentar:
`<Select label="Escala das elevações de paredes" value={arm.escalaParedes} options={escalas([20, 25, 40, 50, 75, 100], arm.escalaParedes)} onChange={(e) => pa({ escalaParedes: e })} />`
(`arm.escalaParedes` já existe em `ConfigArmacao`, padrão 50; `pa` e `escalas` já existem no arquivo; o comando `prancha.definir { armacao: { escalaParedes } }` aceita 20, 25, 40, 50, 75 e 100). O tipo "Armação de paredes e pilares-parede" já está na lista de tipos (`ROTULO_TIPO` e `TIPOS_PRANCHA`). No `Hint` das opções acrescentar "paredes 1:{ARMACAO_PADRAO.escalaParedes}" depois de "pilares 1:… (sobem … quando não cabem na altura)".

## 4. Fluxo e2e `E1d` (em `e2e/flows.mjs`, logo depois do fluxo `E1c`, copiando a estrutura dele)
Nome exato: `E1d: armadura de paredes (janela com panos, bloqueio e desbloqueio, emendas, abertura, isovalores, muro de arrimo, memorial, resumo de aço e prancha de paredes)`.
Funções locais como no E1c: `cmd`, `livre`, `modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building)`.
1. Aba **Edifício**. Comandos pela linha (`#edcmd`), esperando o efeito no `localStorage` quando o comando seguinte depende de ids:
   - `obra.definir {"profundidadeFundacao": 1}`; com `b0 = await modelo()`, para cada nome em `['Cobertura', 'Tipo 3', 'Tipo 2']` `pavimento.remover {"id": "<id do pavimento>"}` (só Térreo e Tipo 1 ficam; espere `building.pavimentos.length === 2`);
   - `empuxo.tipo {"nome": "Aterro", "metodo": "repouso", "estratos": [{"espessura": 20, "gama": 18, "phi": 30}], "cotaAterro": 3}`; espere `empuxos.length > 0`; `caso.criar {"nome": "Empuxo", "natureza": "H", "empuxo": "<id do tipo>"}`; espere o caso;
   - `laje.criar {"grupo": "<grupo do Tipo 1>", "contorno": [[0, 0], [12, 0], [12, 6], [0, 6]], "tipo": {"tipo": "macica", "h": 0.12}}`;
   - duas `parede.criar {"pontos": [[0, 0], [12, 0]], "espessura": 0.2, "morre": "<id do Tipo 1>"}` e `[[0, 6], [12, 6]]`; espere `paredes.length === 2`;
   - `parede.empuxo {"parede": "<id M1>", "empuxos": [{"caso": "<id do caso>", "lado": "dir"}]}` e, para M2, `"lado": "esq"`;
   - `parede.abertura {"parede": "<id M1>", "s": 5, "largura": 1, "altura": 2.1, "pavimento": "<id do Térreo>"}`; espere `paredes[0].aberturas.length === 1`;
   - `muro.arrimo {"nome": "MA1", "H": 3, "tTopo": 0.2, "tBase": 0.3, "B": 2.6, "ponta": 0.5, "hBase": 0.4, "solo": {"gama": 18, "phi": 30, "metodo": "rankine"}, "sobrecarga": 10, "atrito": 0.6}`; espere `murosArrimo.length === 1`.
2. Aba **Dimensionamento** → **Calcular e dimensionar** (espera **Recalcular**, depois `livre()`). Grupo **Muros de arrimo (1)** da barra lateral: `table[data-mu-lista]` contém `MA1` e `atende`.
3. `[data-pw-cartao]` contém `M1` e `M2` e as colunas **Armadura**, **Cumprimento mín.** e **Situação**. Clique **Resultados de M1**; diálogo `/M1/` (`jp`).
4. Panos: `jp.locator('table[data-pw-panos] tbody tr')` tem 3 linhas (Térreo com 1 pano; Tipo 1 com 2 panos, pela porta); a primeira contém `calculada`. Clique na primeira linha; em `[data-pw-editor-malha]`: `Select` **φ vertical** = `6,3`, **s vertical** = `40`, **φ horizontal** = `6,3`, **s horizontal** = `40`; clique **Bloquear malha**; `page.waitForFunction(() => document.querySelector('table[data-pw-panos] tbody tr')?.textContent?.includes('bloqueada'), null, { timeout: 90000 })`. Asserções: a primeira linha contém `bloqueada` e `não atende`; `ul[data-pw-mensagens]` contém `Armadura bloqueada`. Clique **Desbloquear**; espere a primeira linha voltar a conter `calculada`.
5. Emendas: `table[data-pw-emendas] tbody tr` com ao menos 1 linha. Em `[data-pw-editor-emendas]`: **Tração** = `20`, **Compressão** = `20`, **Aplicar emendas**; espere a tabela conter `editada`; `ul[data-pw-mensagens]` contém `abaixo do mínimo`. Clique **Voltar às calculadas**; espere `calculada`.
6. Abertura: `table[data-pw-aberturas-arm-lista] tbody tr` com 1 linha contendo `porta`. Em `[data-pw-editor-abertura]`: **Verga n** = `4`, **Verga φ** = `16`, **Montante n** = `6`, **Montante φ** = `16`; **Bloquear armadura da abertura**; espere a linha conter `bloqueada`. Abra o `details[data-pw-relatorio-abertura]` (clique no `summary`): contém `Necessária` e `Cortante da verga`. Clique **Limpar armadura**; espere `calculada`.
7. Isovalores: `jp.locator('[data-pw-iso-svg] polygon')` com mais de 10 elementos; `[data-pw-iso-leg]` contém `mín.`; no `Seg`, clique `deslocamentos`: o SVG continua com polígonos e a legenda contém `mm`. Clique **Fechar**.
8. **Memorial do edifício** (botão): o texto contém `Armadura das paredes, pilares-parede e muros de arrimo` e `Armadura por pano`; `[data-memorial-paredes="panos"]` existe; contém também `Paredes e pilares-parede` (resumo de aço) e `Muros de arrimo: estabilidade`. Feche.
9. Aba **Dimensionamento**: `[data-resumo-aco]` contém `Paredes e pilares-parede`.
10. Aba **Pranchas**: `getByLabel('Tipo de prancha')` = `Armação de paredes e pilares-parede`; espere `.prancha-prev[data-tipo="paredes"]` com `svg`; o texto contém `SCM` e `M1`. Abra o grupo "Opções de armação e locação" (clique no `summary`), `getByLabel('Escala das elevações de paredes')` = `1:75` e espere `.prancha-prev[data-escala="75"]`.

## 5. Checklists (depois do e2e verde)
Em cada linha abaixo, trocar a situação `Parcial` por **Feito**, a frente `E` por `—` e a nota pelo texto dado; rodar `npm run checklists`.
- `docs/checklist-manual-cypecad.md`:
  - **C5.13**: "`abertura.armadura` (editar e bloquear) e editor `AberturasArmadura` na janela da parede; verificada contra a necessária no recálculo [E1d]"
  - **C5.14**: "armadura padrão de portas por `abertura.armadura { acao: 'padrao' }`, copiar para as de mesmo tipo e aplicar na janela da parede [E1d]"
  - **C5.15**: "armadura padrão de janelas, copiar e aplicar, como nas portas [E1d]"
  - **C5.17**: "relatório da abertura na janela (necessária, adotada, cortante da verga, mensagens) e tabela de aberturas no memorial [E1d]"
  - **C4.62** continua Parcial (consolos [E2]).
- `docs/checklist-manual-calculo-cypecad.md`:
  - **K1.1.7**: "desenhos de formas, locação e armação de vigas, pilares, lajes, fundações e paredes/pilares-parede (SCM; PDF/DXF/DWG), tabelas de aço, listagens e memorial HTML; opção de escala das paredes em Pranchas [E1d]"
  - **K1.11.36**: "isovalores de tensões (σx, σy, τxy, My, Mx, Q) por combinação ELU e face e de deslocamentos por caso, com mínimo e máximo (`IsovaloresParede.tsx`, SVG por triângulo) [E1d]"
  - **K1.11.37**: "janela da parede e do pilar-parede: armadura por pano editável e bloqueável, espessura, situação em vermelho, rearmar ao editar (`ArmaduraParedeUI.tsx`) [E1d]"
  - **K1.11.38**: "mensagens codificadas, cumprimento por pano, zonas a reforçar, esforços do ponto crítico e resultantes por caso na janela e no memorial [E1d]"
  - **K1.12.4.2-6**: "consulta em tela de armaduras e erros; editar malha, espessura ou emendas dispara a reverificação [E1d]"
  - **K1.12.4.2-8**: "tabela de pontos que não atendem e reforços locais por pano na janela, com a armadura adicional necessária [E1d]"
  - **K1.12.4.2-11**: "emendas por pavimento, tração e compressão, editáveis na janela (`parede.armadura { emendas }`) [E1d]"
- No fim do "Histórico de conferência" de cada arquivo, uma entrada `- **<data> — fatia E1d, interface.** …` listando os itens que passaram a Feito (manual do usuário: C5.13, C5.14, C5.15 e C5.17; manual de cálculo: K1.1.7, K1.11.36, K1.11.37, K1.11.38, K1.12.4.2-6, -8 e -11) com as sublinhas "Situação: ver o resumo (recontado por `npm run checklists`)." e "Pendências por frente: E reduz em 4 itens (manual do usuário)." / "… em 7 itens (manual de cálculo)."
- `docs/historico-fatias.md`: acrescentar no fim "- <data>: E1d, interface: `ArmaduraParedeUI.tsx` (panos, bloqueio, espessura, emendas, lados curtos, mensagens), `AberturasArmaduraUI.tsx`, `IsovaloresParede.tsx` (tokens `--iso-*`), `MurosUI.tsx`, `MemorialParedes.tsx`, resumo de aço e escala das paredes nas pranchas; e2e `E1d`. Frente E1d concluída."
- `docs/plano-execucao.md`: no Andamento, depois da linha "E1d, núcleo concluído", "- <data>: E1d, interface concluída (cartões `docs/cartoes/E1d/`); e2e `E1d` verde. Próximo: E1e."

## Verificação
```bash
npx tsc -b
npx vitest run src/core/checklists.test.ts src/app/design/design.test.ts src/core/building/paredesComandos.test.ts
npm run e2e -- E1d
npm run e2e -- --no-build E1c
npm run e2e -- --no-build FU   # os fluxos de fundação não podem quebrar
```
