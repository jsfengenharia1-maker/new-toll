# D3 — cartão 05: faixa, abas Fundações, Pranchas, Vista e aba contextual

Classe: Sonnet baixo.

## Arquivos
- `src/app/edificio/FaixaEdificio.tsx` (acrescenta abas e a aba contextual)
- `src/app/FaixaModulo.tsx` (aba contextual opcional)
- `src/App.tsx` (passa a aba contextual)
- `src/app/edificio/Edificio.tsx` (retira da barra da planta os controles que sobem)
- `src/app/edificio/PaletaComandos.tsx` (paleta passa a ser aberta pelo store)
- `src/app/edificio/uiStore.ts` (campo `paleta`)
- `src/app/design/global.css` (`.rstack`)

## `uiStore.ts`
Acrescentar ao estado `paleta: boolean;` (inicial `false`). Em `PaletaComandos.tsx` trocar `const [aberta, setAberta] = useState(false);` por `const aberta = useEdifUI((s) => s.paleta); const setAberta = (f: boolean | ((a: boolean) => boolean)) => useEdifUI.getState().set({ paleta: typeof f === 'function' ? f(useEdifUI.getState().paleta) : f });` e `onClose={() => setAberta(false)}` fica igual. O atalho Ctrl+K continua.

## `FaixaEdificio.tsx`: aba Fundações
Imports novos: `import { Check, Dropdown } from '../ui'; import { CoresPlanta } from './CoresPlanta'; import { fmt? }` (só o que usar).
```tsx
function Fundacoes() {
  const { calcularFundacao, calculandoFund, dim, sessao, exec } = useBuilding();
  const pl = usePlanta();
  const b = sessao.modelo;
  const elementosSel = (b.fundacao?.elementos ?? []).filter((e) => pl.selecao.has(e.id));
  return (
    <>
      <RibbonGroup label="Elementos" radios="Ferramenta">
        <Ferr f="fundacao" icon="fundacao" /><Ferr f="vigaFund" icon="vigaFund" /><Ferr f="radier" icon="radier" /><Ferr f="vigaElastica" icon="vigaElastica" /><Ferr f="corrida" icon="corrida" />
      </RibbonGroup>
      <RibbonGroup label="Modificar" radios="Ferramenta">
        <Ferr f="girarFund" icon="girarFund" /><Ferr f="insFund" icon="pontoIns" />
      </RibbonGroup>
      <RibbonGroup label="Limites" radios="Ferramenta"><Ferr f="limite" icon="limite" /><Ferr f="limiteMascara" icon="limite" /></RibbonGroup>
      <RibbonGroup label="Cálculo">
        <RibbonButton icon="fundacao" label="Nível de fundação" title="Planta de fundação (U)" onClick={() => { ui({ aba: 'planta' }); pl.set({ pavimento: 'fundacao', ferramenta: 'fundacao', selecao: new Set() }); }} />
        <RibbonButton icon="calcular" label="Calcular as fundações" title="Calcula só as fundações, com a análise em vigor" disabled={!dim || calculandoFund} onClick={() => { void calcularFundacao(); }} />
        <RibbonButton icon="config" label="Configuração das fundações…" onClick={() => ui({ cfg: 'fundacao' })} />
      </RibbonGroup>
    </>
  );
}
```
Os botões `Planta de fundação (U)` e `Calcular fundações` do grupo Fundação e da barra (nível de fundação) ficam (rótulos distintos do atalho acima).

## Aba Pranchas e Vista
```tsx
function Pranchas() {
  return (
    <RibbonGroup label="Folhas">
      <RibbonButton icon="pranchas" label="Abrir Pranchas" title="Abre a vista Pranchas (tipo, grupo, formato, escala, PDF, DXF e DWG)" onClick={() => ui({ aba: 'pranchas' })} />
      <RibbonButton icon="config" label="Opções de armação e locação…" onClick={() => ui({ aba: 'pranchas' })} />
    </RibbonGroup>
  );
}

function Vista() {
  const pl = usePlanta();
  const dim = useBuilding((s) => s.dim);
  const b = useBuilding((s) => s.sessao.modelo);
  const nivelFund = pl.pavimento === 'fundacao';
  return (
    <>
      <RibbonGroup label="Navegação" radios="Ferramenta">
        <RibbonButton icon="enquadrar" label="Enquadrar" title="Enquadrar (F)" onClick={() => { ui({ aba: 'planta' }); pl.set({ vista: null }); }} />
        <Ferr f="medir" icon="medir" />
        <RibbonButton icon="paleta" label="Paleta de comandos" title="Paleta de comandos (Ctrl+K)" onClick={() => ui({ paleta: true })} />
        <RibbonButton icon="guia" label="Guia rápido" onClick={() => ui({ l4: 'guia' })} />
      </RibbonGroup>
      <RibbonGroup label="Camadas">
        <div className="rstack">
          {/* recortar de PlantaBarra e colar aqui, sem mudar nenhum aria-label: */}
          {/* <Dropdown aria-label="Tema da planta" …/> + <CoresPlanta /> */}
          {/* <Dropdown aria-label="Armadura das lajes na planta" …/> */}
          {/* <Check label="Mostrar erros" …/> (era <label className="check small">…Mostrar erros) */}
          {/* Inferior; "Mostrar todas as faixas de vigotas" (só com dim?.vigotas?.length) */}
          {/* <Dropdown aria-label="Mapa da base elástica" …/> (só nivelFund com radier/viga elástica) */}
        </div>
      </RibbonGroup>
    </>
  );
}
```
Os comentários do corpo de `Camadas` são instruções: mover o JSX dos controles com esses `aria-label` da `PlantaBarra` (`Tema da planta`, `CoresPlanta`, `Armadura das lajes na planta` com o `onChange` inteiro, `Mostrar erros`, `Inferior`, `Mostrar todas as faixas de vigotas`, `Mapa da base elástica`), trocando `pl.set`, `dim`, `b` e `nivelFund` pelas variáveis do componente `Vista` acima. Os `<label className="check small">` podem virar `<Check label="…" checked={…} onChange={…} />` da ui só se o texto do rótulo ficar idêntico; senão mantenha o `<label>` com `Input`.

Em `FaixaEdificio`: `if (aba === 'fundacoes') return <Fundacoes />; if (aba === 'pranchas') return <Pranchas />; if (aba === 'vista') return <Vista />;`.

CSS: `.rstack { display: flex; flex-direction: column; gap: var(--sp-2); justify-content: center; min-width: 180px; }`

## Aba contextual
`FaixaModulo.tsx`: nova prop `contextual?: RibbonTabDef`; as abas passam a `[...abas, ...(contextual ? [{ ...contextual, contextual: true }] : [])]`; se a aba salva for `ctx` e `contextual` sumir, vale a padrão.

`FaixaEdificio.tsx`:
```tsx
export const ROTULO_CTX: Record<string, string> = { pilar: 'Pilar', viga: 'Viga', laje: 'Laje', fundacao: 'Fundação' };

function Contexto() {
  const alvo = useAlvoSelecionado();
  const { exec, dim, sessao } = useBuilding();
  const pl = usePlanta();
  const b = sessao.modelo;
  if (!alvo) return null;
  const fundSel = (b.fundacao?.elementos ?? []).filter((e) => pl.selecao.has(e.id));
  const vigasFundSel = (b.fundacao?.vigas ?? []).filter((v) => pl.selecao.has(v.id));
  return (
    <>
      <RibbonGroup label="Elemento">
        <RibbonButton icon="relatorio" label="Resultados do elemento" disabled={!dim} onClick={() => abrirJanela(alvo)} />
        <RibbonButton icon="enquadrar" label="Centralizar na planta" onClick={() => pl.set({ foco: { id: alvo.id, n: (pl.foco?.n ?? 0) + 1 } })} />
      </RibbonGroup>
      {alvo.tipo === 'fundacao' && (
        <RibbonGroup label="Fundação">
          <RibbonButton icon="girar" label="Girar 90°" title="Gira os elementos selecionados em 90° (R)" disabled={!fundSel.length} onClick={() => exec('lote', { comandos: fundSel.map((e) => ({ nome: 'fundacao.girar', params: { ids: [e.id], angulo: e.angulo + 90 } })) })} />
          <RibbonButton icon="pilar" label="Ao pilar" title="Gira os elementos selecionados para o ângulo do pilar" disabled={!fundSel.length} onClick={() => exec('fundacao.girar', { ids: fundSel.map((e) => e.id), doPilar: true })} />
          <RibbonButton icon="remover" label="Remover" title="Remove os elementos e as vigas de fundação selecionados (Del)" disabled={!fundSel.length && !vigasFundSel.length} onClick={() => {
            const cmds = [...(vigasFundSel.length ? [{ nome: 'vigaFundacao.remover', params: { ids: vigasFundSel.map((v) => v.id) } }] : []), ...(fundSel.length ? [{ nome: 'fundacao.remover', params: { ids: fundSel.map((e) => e.id) } }] : [])];
            exec('lote', { comandos: cmds }); pl.set({ selecao: new Set() });
          }} />
        </RibbonGroup>
      )}
    </>
  );
}
```
(`Resultados do elemento` e `Girar 90°`/`Ao pilar`/`Remover` são os do `PlantaBarra`, mesmos comandos; retirar os três botões e o de "Resultados do elemento" da barra: ficam só na faixa contextual; fluxos que clicam `.planta-barra` + `Resultados do elemento` (linhas 1396–1397 de `e2e/flows.mjs`) passam a clicar `page.getByRole('toolbar', { name: /^Comandos:/ }).getByRole('button', { name: 'Resultados do elemento' })` com a aba contextual ativa.) Em `FaixaEdificio`: `if (aba === 'ctx') return <Contexto />;`.

`App.tsx`: `const alvo = useAlvoSelecionado();` (só quando `st.module === 'edificio'`; o hook pode ser chamado sempre: com modelo vazio devolve `null`) e `<FaixaModulo modulo={st.module} corpo={corpoFaixa} contextual={st.module === 'edificio' && alvo ? { id: 'ctx', label: ROTULO_CTX[alvo.tipo] ?? 'Elemento' } : undefined} />`.

## `PlantaBarra`: retirar
`Calcular fundações` fica (rótulo exato, nível de fundação). Saem os controles movidos acima (Tema, Cores, Armadura das lajes, Mostrar erros, Inferior, vigotas, Mapa da base elástica) e os botões `Girar 90°`, `Ao pilar`, `Remover`, `Resultados do elemento`. Ficam na barra: Pavimento, Orto, Polar, Capturas e as opções da ferramenta ativa (cartão 06 as reorganiza).

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run build`; `npm run mapa`; `npm run e2e -- --workers 4` completo. Fluxos afetados (usar o helper `ferramenta(page, aba, nome)` e o escopo `toolbar` de `Comandos: <aba>`): os que clicam `getByRole('radio', { name: 'Fundação' })` (8), `Viga de fundação` (1), `getByLabel('Armadura das lajes na planta')` (5, passam a existir só com a aba Vista aberta), `Tema da planta`, `Mostrar erros`, `Cores` (`.planta-barra` + `Cores`, linhas 1585–1590).

## Rótulos
Todos os `aria-label` e textos dos controles movidos ficam idênticos; atalhos novos têm rótulo próprio ("Calcular as fundações", "Nível de fundação", "Abrir Pranchas").
