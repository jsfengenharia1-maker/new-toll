# D3 — cartão 06: barra de opções reduzida e barra de status por módulo

Classe: Sonnet baixo.

## Arquivos
- `src/app/edificio/Edificio.tsx` (`PlantaBarra`)
- `src/App.tsx` (barra de status; selo de estado; Memorial)
- `src/app/design/global.css` (`.optbar`)

## 1. Barra de opções (OB)
A `PlantaBarra` (classe `planta-barra`, que os fluxos usam) fica como barra de opções da ferramenta ativa; depois dos cartões 02, 03 e 05 ela já perdeu as ferramentas, os controles de camada e os botões de elemento. Resta nela, na ordem: Pavimento da planta; opções da ferramenta ativa (Cópias, Ângulo, Manter os originais, Vários pilares, h do radier, bw/aba/Cintas, b/h da viga elástica, Limite fechado, parâmetros da armadura de punção, Apagar punção da seleção, Calcular fundações no nível de fundação); Seg `Linha = face/eixo` e o botão `Viga pelo gabarito` não voltam (a ferramenta está na faixa; o `Seg` `modoVigaGab` fica na barra enquanto `pl.ferramenta === 'vigaGabarito'`):
```tsx
      {pl.ferramenta === 'vigaGabarito' && <Seg small value={pl.modoVigaGab} onChange={(v) => pl.set({ modoVigaGab: v })} options={[{ v: 'face', label: 'Linha = face' }, { v: 'eixo', label: 'Linha = eixo' }]} />}
```
Sem nenhum `Button` de ferramenta. Troque `<div className="planta-barra">` por `<div className="planta-barra optbar">` e acrescente ao CSS:
```css
.optbar { min-height: var(--h-ctl-lg); }
```
`Orto (F8)`, `Polar 15° (F10)` saem da barra (o botão `Capturas…` já está na faixa) e vão para a barra de status (item 2). O `Check`/label de `Orto`, `Polar` mantém **o mesmo texto** (`Orto (F8)`, `Polar 15° (F10)`: um fluxo usa `getByLabel('Polar 15° (F10)')`).

## 2. Barra de status por módulo (`App.tsx`)
```tsx
      <StatusBar mensagem={st.message}>
        <span className={`status ${status.cls}`}>{status.text}</span>
        {st.module === 'portico' && (<> …controles atuais: entrada por coordenadas, Eixos, P&B, Símbolos, Snap, Cotas, Grade, Unidades… </>)}
        {st.module === 'edificio' && <ControlesPlanta />}
        {st.module === 'fundacoes' && null}
      </StatusBar>
```
- O selo `<span className={`status …`}>` sai do cabeçalho (cartão 02 da D2 o deixou lá). Os fluxos usam `.topbar .status.ok|bad` (4 usos) → `.statusbar .status.ok|bad`.
- Os controles do Pórtico (coordenadas, Eixos, P&B, Símbolos, Snap, Cotas, Grade, Unidades) hoje aparecem nos três módulos mas só atuam no desenho do Pórtico; passam a aparecer só quando `st.module === 'portico'`. Fluxos que os usam no Edifício ou nas Fundações: nenhum conhecido (`grep -n "gridsel\|coordinput\|snapchk" e2e/flows.mjs` mostra os usos; todos no fluxo do Pórtico).
- `ControlesPlanta` (novo, em `src/app/edificio/ControlesPlanta.tsx`): `Orto (F8)` e `Polar 15° (F10)` (copiar os dois `<label className="check small">` da barra, com `usePlanta()`) e, em `.muted`, o texto `Capturas: <n>` com `pl.capturas.size` (só indicador, sem botão: o botão `Capturas…` é o da faixa, aba Lançamento, grupo Gabarito; assim não há dois botões com o mesmo nome). F3 continua ligando e desligando.
- Botão Memorial e Biblioteca: ficam no cabeçalho (QA).

## 3. Edifício: linha de comando
O grupo "Linha de comando" (input `aria-label="Linha de comando do edifício"`) vai para a barra de status do Edifício, à esquerda do selo, com `LinhaComando` exportada de `Edificio.tsx` (`export function LinhaComando`); o `Group` e o `datalist` saem do grupo. O `id="edcmd"` e o `aria-label` ficam.

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run build`; `npm run mapa`; `npm run e2e -- --workers 4` completo. Seletores a ajustar: `.topbar .status` → `.statusbar .status`; `masc.getByRole('button', { name: 'Capturas…' })` → botão da faixa (aba Lançamento, grupo Gabarito); `.edif-in` + grupo "Linha de comando" (se algum fluxo abrir esse grupo) → campo `getByLabel('Linha de comando do edifício')`, que agora está sempre visível.

## Rótulos
Preservados: `Orto (F8)`, `Polar 15° (F10)`, `Linha de comando do edifício`, `Pavimento da planta`, `.planta-barra`.
