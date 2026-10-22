# Cartão FU7b-2 — base do muro de arrimo na fundação (formulário, tabela, janela, cartão e revisão)

Executor: Haiku. Depende só do núcleo da FU7b (`Dimensionamento.basesMuros`, `MuroArrimoObra.cota/comprimento`; comando `muro.arrimo` com `cota` e `comprimento`). Pode ser feito antes ou depois do cartão FU7b-1.

## Regras (valem para todo o cartão)
- Só interface. **Não altere nada em `src/core/`** (o núcleo da FU7b está pronto e testado em `src/core/building/sapataParede.test.ts`). Componentes só de `src/app/ui` (nunca controles crus); sem cor literal, sem CSS novo, sem estilo inline (as classes usadas já existem em `global.css`); nenhum botão novo na barra da planta.
- Os rótulos abaixo são **exatos e únicos** no escopo em que o e2e os procura: não os renomeie, não acrescente `unit` aos campos (a unidade já está no texto do rótulo) e mantenha o `aria-label` igual ao rótulo nos `Select` (é por ele que `getByLabel(…, { exact: true })` encontra a lista).
- Aplique as edições na ordem. Se um texto a localizar não existir (outro agente mexeu no arquivo), pare e descreva o que encontrou: não improvise.

## O que o núcleo já entrega (não reimplemente)
- `dim.basesMuros?: ResultadoBaseMuro[]` (de `src/core/building/baseMuro.ts`): `{ id, nome, B, hBase, cota, profundidade, sigmaAdm: number | null, sigmaFonte: 'propria' | 'terreno' | 'spt' | 'nenhuma', sigmaMax, folga: number | null, atende, comprimento: number | null, porMetro: { concreto, forma, aco }, total: { concreto, forma, aco } | null, status: 'ok' | 'fail', mensagens, notas }`. O campo `total` só existe com o comprimento do muro. A σadm do muro que não traz a sua vem do terreno da obra (informada ou, com sondagens, a menor estimada pelo SPT).
- Comando `muro.arrimo` aceita `cota` (m, cota de assentamento da base; padrão a de fundação da obra) e `comprimento` (m).
- Mensagens da revisão: `FUND_MURO_SIGMA` (aviso), `FUND_MURO_TENSAO` e `FUND_MURO_COTA` (erro) já aparecem na lista de erros (id do muro, tipo `fundacao`).

## 0. Pré-requisito
`Mensagens` precisa estar exportada em `src/app/edificio/CorridaUI.tsx` (`export function Mensagens`). Se o cartão FU7b-1 ainda não foi feito, troque `function Mensagens({ msgs }: { msgs: string[] }) {` por `export function Mensagens({ msgs }: { msgs: string[] }) {` nessa única linha.

## 1. Edições
`MurosUI.tsx`: dois campos novos no formulário (cota e comprimento), tabela `data-mu-base` com a base de cada muro, mensagens da base na lista do muro selecionado e o componente `JanelaBaseMuro` (exportado, usado pela janela de resultados).

### `src/app/edificio/MurosUI.tsx`

**Edição 1.** Localize este texto (exato; aparece uma única vez):

```tsx
import { Button, Group, Hint, NumField, OptNumField, Pill, Select, TextField } from '../ui';
```

Substitua por:

```tsx
import { Button, Group, Hint, KV, NumField, OptNumField, Pill, Select, TextField } from '../ui';
```

**Edição 2.** Localize este texto (exato; aparece uma única vez):

```tsx
import { useBuilding } from './store';
import { executarERecalcular } from './Armadura';
```

Substitua por:

```tsx
import { useBuilding } from './store';
import { usePlanta } from './plantaStore';
import { executarERecalcular } from './Armadura';
import { Mensagens } from './CorridaUI';
```

**Edição 3.** Localize este texto (exato; aparece uma única vez):

```tsx
const METODOS:
```

Substitua por:

```tsx
const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const FONTE_SIGMA = { propria: 'própria do muro', terreno: 'terreno (informada)', spt: 'SPT (menor furo)', nenhuma: '—' } as const;
const METODOS:
```

**Edição 4.** Localize este texto (exato; aparece uma única vez):

```tsx
  const [sigmaAdm, setSigmaAdm] = useState<number | undefined>(undefined);

```

Substitua por:

```tsx
  const [sigmaAdm, setSigmaAdm] = useState<number | undefined>(undefined);
  const [cota, setCota] = useState<number | undefined>(undefined);
  const [comprimento, setComprimento] = useState<number | undefined>(undefined);

```

**Edição 5.** Localize este texto (exato; aparece uma única vez):

```tsx
  const mensagens = dim?.muros?.find((m) => m.id === selEf)?.mensagens ?? [];
```

Substitua por:

```tsx
  const mensagens = [...(dim?.muros?.find((m) => m.id === selEf)?.mensagens ?? []), ...(dim?.basesMuros?.find((m) => m.id === selEf)?.mensagens ?? [])];
```

**Edição 6.** Localize este texto (exato; aparece uma única vez):

```tsx
        <OptNumField label="σadm do solo" unit="kN/m²" width={96} value={sigmaAdm} onChange={setSigmaAdm} />

```

Substitua por:

```tsx
        <OptNumField label="σadm do solo" unit="kN/m²" width={96} value={sigmaAdm} onChange={setSigmaAdm} />
        <OptNumField label="Cota de assentamento da base (m; vazio = a da obra)" width={190} value={cota} onChange={setCota} />
        <OptNumField label="Comprimento do muro (m; para os quantitativos da base)" width={190} value={comprimento} onChange={setComprimento} />

```

**Edição 7.** Localize este texto (exato; aparece uma única vez):

```tsx
          ...(sigmaAdm !== undefined ? { sigmaAdm } : {}),
        })}>Lançar muro</Button>
```

Substitua por:

```tsx
          ...(sigmaAdm !== undefined ? { sigmaAdm } : {}),
          ...(cota !== undefined ? { cota } : {}),
          ...(comprimento !== undefined ? { comprimento } : {}),
        })}>Lançar muro</Button>
```

**Edição 8.** Localize este texto (exato; aparece uma única vez):

```tsx
      <Hint>Muro de arrimo em balanço isolado, por metro:
```

Substitua por:

```tsx
      {(dim?.basesMuros?.length ?? 0) > 0 && (
        <table className="data quadro" data-mu-base>
          <thead><tr><th>Muro</th><th>Base B (m)</th><th>Cota (m) / df (m)</th><th>σmáx / σadm (kN/m²)</th><th>Fonte da σadm</th><th>Folga (kN/m²)</th><th>Concreto da base (m³/m)</th><th>Aço da base (kg/m)</th><th>Total (m³ · kg)</th><th>Situação</th><th /></tr></thead>
          <tbody>
            {dim!.basesMuros!.map((m) => (
              <tr key={m.id} data-id={m.id} className={m.status === 'fail' ? 'bad' : undefined}>
                <td className="tl"><b>{m.nome}</b></td><td className="num">{fmt(m.B)}</td><td className="num">{fmt(m.cota)} / {fmt(m.profundidade)}</td>
                <td className="num">{fmt(m.sigmaMax, 1)} / {m.sigmaAdm !== null ? fmt(m.sigmaAdm, 0) : '—'}</td><td className="tl">{FONTE_SIGMA[m.sigmaFonte]}</td><td className="num">{m.folga !== null ? fmt(m.folga, 1) : '—'}</td>
                <td className="num">{fmt(m.porMetro.concreto)}</td><td className="num">{fmt(m.porMetro.aco, 1)}</td><td className="num">{m.total ? `${fmt(m.total.concreto, 1)} · ${fmt(m.total.aco, 0)}` : '—'}</td>
                <td><Pill tone={m.status === 'ok' ? 'ok' : 'bad'}>{m.status === 'ok' ? 'atende' : 'não atende'}</Pill></td>
                <td><Button variant="ghost" aria-label={`Resultados da base de ${m.nome}`} onClick={() => usePlanta.getState().set({ janela: { tipo: 'fundacao', id: m.id } })}>base</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Hint>Muro de arrimo em balanço isolado, por metro:
```

**Edição 9.** Localize este texto (exato; aparece uma única vez):

```tsx
/** Grupo "Muros de arrimo":
```

Substitua por:

```tsx
/** Janela da base do muro de arrimo na fundação (FU7b): σadm do terreno, cota, tensão e quantitativos da base. */
export function JanelaBaseMuro({ id }: { id: string }) {
  const dim = useBuilding((s) => s.dim), b = useBuilding((s) => s.sessao.modelo);
  const m = b.murosArrimo?.find((x) => x.id === id), r = dim?.basesMuros?.find((x) => x.id === id);
  if (!m) return <p className="muted">O muro não existe mais.</p>;
  if (!r) return <p className="muted">Calcule o edifício (aba Dimensionamento) para ver a base do muro.</p>;
  return (
    <div data-janela-base-muro={id}>
      <div className="row wrap u-items-center"><Pill tone={r.status === 'ok' ? 'ok' : 'bad'}>{r.status === 'ok' ? 'atende' : 'não atende'}</Pill></div>
      <KV rows={[
        ['Base', `B ${fmt(r.B)} m · espessura ${fmt(r.hBase * 100, 0)} cm`],
        ['Assentamento', `cota ${fmt(r.cota)} m · ${fmt(r.profundidade)} m abaixo do terreno`],
        ['σ máx. / σadm', `${fmt(r.sigmaMax, 1)} / ${r.sigmaAdm !== null ? fmt(r.sigmaAdm, 0) : '—'} kN/m² (${FONTE_SIGMA[r.sigmaFonte]})`],
        ['Quantitativos por metro', `concreto ${fmt(r.porMetro.concreto)} m³ · forma ${fmt(r.porMetro.forma)} m² · aço ${fmt(r.porMetro.aco, 1)} kg`],
        ...(r.total ? [['Quantitativos totais', `${fmt(r.comprimento ?? 0)} m: concreto ${fmt(r.total.concreto, 1)} m³ · forma ${fmt(r.total.forma, 1)} m² · aço ${fmt(r.total.aco, 0)} kg`]] as [string, string][] : []),
      ]} />
      <Mensagens msgs={r.mensagens} />
      {r.notas.map((n, i) => <p key={i} className="muted small">{n}</p>)}
    </div>
  );
}

/** Grupo "Muros de arrimo":
```

`Revisao.tsx`: a janela de resultados reconhece o id de um muro (tipo `fundacao`) e mostra `JanelaBaseMuro`.

### `src/app/edificio/Revisao.tsx`

**Edição 1.** Localize este texto (exato; aparece uma única vez):

```tsx
import { JanelaCorrida, ehCorrida } from './CorridaUI';
```

Substitua por:

```tsx
import { JanelaCorrida, ehCorrida } from './CorridaUI';
import { JanelaBaseMuro } from './MurosUI';
```

**Edição 2.** Localize este texto (exato; aparece uma única vez):

```tsx
  const ehSC = j.tipo === 'fundacao' && ehCorrida(b, j.id);

```

Substitua por:

```tsx
  const ehSC = j.tipo === 'fundacao' && ehCorrida(b, j.id);
  const ehMuro = j.tipo === 'fundacao' && !!b.murosArrimo?.some((x) => x.id === j.id);

```

**Edição 3.** Localize este texto (exato; aparece uma única vez):

```tsx
...(b.fundacao?.corridas ?? [])] : b.lajes)
```

Substitua por:

```tsx
...(b.fundacao?.corridas ?? []), ...(b.murosArrimo ?? [])] : b.lajes)
```

**Edição 4.** Localize este texto (exato; aparece uma única vez):

```tsx
${ehVF ? 'Viga de fundação' : ehSC ? 'Sapata corrida'
```

Substitua por:

```tsx
${ehMuro ? 'Base do muro' : ehVF ? 'Viga de fundação' : ehSC ? 'Sapata corrida'
```

**Edição 5.** Localize este texto (exato; aparece uma única vez):

```tsx
j.tipo === 'fundacao' ? (ehVF ? <JanelaVigaFundacao id={j.id} />
```

Substitua por:

```tsx
j.tipo === 'fundacao' ? (ehMuro ? <JanelaBaseMuro id={j.id} /> : ehVF ? <JanelaVigaFundacao id={j.id} />
```

`Edificio.tsx`: cartão "Bases dos muros de arrimo" na aba Dimensionamento, depois do cartão das sapatas corridas.

### `src/app/edificio/Edificio.tsx`

**Edição 1.** Localize este texto (exato; aparece uma única vez):

```tsx
Duplo clique abre o corte transversal e as verificações.</Hint>
            </div>
          )}

```

Substitua por:

```tsx
Duplo clique abre o corte transversal e as verificações.</Hint>
            </div>
          )}
          {!!dim.basesMuros?.length && (
            <div className="card" data-card-bases-muros>
              <h3>Bases dos muros de arrimo</h3>
              <table className="data quadro">
                <thead><tr><th>Muro</th><th>B (m)</th><th>Cota / df (m)</th><th>σmáx / σadm (kN/m²)</th><th>Fonte da σadm</th><th>Concreto da base (m³)</th><th>Aço da base (kg)</th><th>Situação</th></tr></thead>
                <tbody>{filtro(dim.basesMuros).map((x) => (
                  <LinhaElemento key={x.id} className={`click ${cls(x.status)}`} title={x.mensagens.join(' ')} ir={() => abrirJanela({ tipo: 'fundacao', id: x.id })} abrir={() => abrirJanela({ tipo: 'fundacao', id: x.id })}>
                    <td className="tl">{x.nome}</td><td className="num">{fmt(x.B)}</td><td className="num">{fmt(x.cota)} / {fmt(x.profundidade)}</td>
                    <td className="num">{fmt(x.sigmaMax, 1)} / {x.sigmaAdm !== null ? fmt(x.sigmaAdm, 0) : '—'}</td><td className="tl">{x.sigmaFonte === 'propria' ? 'própria do muro' : x.sigmaFonte === 'terreno' ? 'terreno (informada)' : x.sigmaFonte === 'spt' ? 'SPT (menor furo)' : '—'}</td>
                    <td className="num">{x.total ? fmt(x.total.concreto, 1) : `${fmt(x.porMetro.concreto)}/m`}</td><td className="num">{x.total ? fmt(x.total.aco, 0) : `${fmt(x.porMetro.aco, 1)}/m`}</td>
                    <td>{x.status === 'ok' ? 'ok' : 'não atende'}</td>
                  </LinhaElemento>))}</tbody>
              </table>
              <Hint>Base do muro de arrimo isolado na fundação: σadm própria, do terreno ou pelo SPT (menor furo); cota de assentamento e quantitativos da base (totais só com o comprimento do muro). Duplo clique abre a janela.</Hint>
            </div>
          )}

```

## Verificação
```bash
npx tsc -b
npx vitest run src/app/design/design.test.ts src/core/building/sapataParede.test.ts src/core/building/muroArrimoDim.test.ts
npm run e2e -- --no-build E1d   # o fluxo dos muros de arrimo não pode quebrar
```
