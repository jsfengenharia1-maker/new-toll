# Cartão FU7b-1 — base da parede na fundação (editor da parede, lista das sapatas e janela da sapata)

Executor: Haiku. Depende só do núcleo da FU7b (comando `parede.sapata`, `SapataCorrida.parede`, `ResultadoCorrida.parede`, opções `fundCorridaAtrito`, `fundCorridaFSDesliz` e `fundCorridaDeslizamento`).

## Regras (valem para todo o cartão)
- Só interface. **Não altere nada em `src/core/`** (o núcleo da FU7b está pronto e testado em `src/core/building/sapataParede.test.ts`). Componentes só de `src/app/ui` (nunca controles crus); sem cor literal, sem CSS novo, sem estilo inline (as classes usadas já existem em `global.css`); nenhum botão novo na barra da planta.
- Os rótulos abaixo são **exatos e únicos** no escopo em que o e2e os procura: não os renomeie, não acrescente `unit` aos campos (a unidade já está no texto do rótulo) e mantenha o `aria-label` igual ao rótulo nos `Select` (é por ele que `getByLabel(…, { exact: true })` encontra a lista).
- Aplique as edições na ordem. Se um texto a localizar não existir (outro agente mexeu no arquivo), pare e descreva o que encontrou: não improvise.

## O que o núcleo já entrega (não reimplemente)
- A parede de concreto que nasce na fundação com `Parede.base.tipo = 'sapataCorrida'` (por `parede.criar { base }` ou `parede.editar { base }`) ganha a sapata corrida **no mesmo passo do comando** (`SapataCorrida.parede` = id da parede; nome `SC-M1`; aba nas duas faces; B e h de `base.largura`/`base.altura`). Ela segue o eixo e a espessura da parede e some com ela ou quando a base volta a `{ tipo: 'apoio' }`. Por isso `b.fundacao.corridas` já contém a sapata e as telas existentes (planta de fundação, lista de sapatas corridas) a mostram sem mudança.
- Comando `parede.sapata` (`mcp: false`): `{ parede }` cria a sapata (aba `ambas`); `{ parede, remover: true }` remove e devolve a parede ao apoio direto; `{ parede, aba | B | h | h0 | sigmaAdm | atrito | cota | k | alvenaria | equilibrio }` altera; `{ parede, limpar: ['B' | 'h' | 'h0' | 'sigmaAdm' | 'atrito' | 'cota' | 'k' | 'alvenaria' | 'equilibrio'] }` volta o campo ao calculado. Só vale para parede que nasce na fundação (senão erro `PAREDE_BASE_NASCE`).
- Resultado: `dim.corridas[i].parede?: { id, nome, virtual, origem: 'reacoes' | 'lancadas', M, H, eM, deslizamento?: { mu, N, H, FS, FSmin, ok, comb }, pilares: string[], pilaresEq?: { pilar, Nk, a, rege }[] }` (M em kN·m/m, H em kN/m, eM em m). Opções `fundCorridaAtrito` (μ, 0,4), `fundCorridaFSDesliz` (1,5) e `fundCorridaDeslizamento` (1 = reprova; 0 = só informa).

## 1. Criar `src/app/edificio/BaseParedeUI.tsx` (arquivo novo, cole inteiro)
```tsx
// Base da parede na fundação (FU7b, interface): bloco do editor da parede com a escolha entre apoio direto e sapata corrida,
// os parâmetros da sapata (comando `parede.sapata`) e o resultado (carga por metro das reações da base, momento fora do plano,
// cortante, deslizamento e sapata isolada equivalente dos pilares sobre a parede). O cálculo está em core/building/sapataCorrida.
import { Button, Check, Hint, KV, OptNumField, Pill, Select } from '../ui';
import type { AbaCorrida, BuildingModel, Parede } from '../../core/building/types';
import { Mensagens } from './CorridaUI';
import { usePlanta } from './plantaStore';
import { useBuilding } from './store';

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const cm = (v: number) => Math.round(v * 100);
const ABAS: { v: AbaCorrida; label: string }[] = [
  { v: 'ambas', label: 'Abas dos dois lados' }, { v: 'esq', label: 'Aba à esquerda (apoio na divisa à direita)' }, { v: 'dir', label: 'Aba à direita (apoio na divisa à esquerda)' },
];
const BASES: { v: 'apoio' | 'sapata'; label: string }[] = [{ v: 'apoio', label: 'apoio direto (engaste ou rótula)' }, { v: 'sapata', label: 'sapata corrida' }];

/** Base da parede: apoio direto ou sapata corrida (aba, B, h, σadm, atrito, cota) e os resultados dela. */
export function BaseDaParede({ b, w }: { b: BuildingModel; w: Parede }) {
  const { exec } = useBuilding();
  const dim = useBuilding((s) => s.dim);
  const c = b.fundacao?.corridas?.find((x) => x.parede === w.id);
  const r = c ? dim?.corridas?.find((x) => x.id === c.id) : undefined;
  const p = r?.parede;
  const ed = (q: Record<string, unknown>) => exec('parede.sapata', { parede: w.id, ...q });
  const opt = (campo: 'B' | 'h' | 'sigmaAdm' | 'atrito' | 'cota') => (v: number | undefined) => ed(v === undefined ? { limpar: [campo] } : { [campo]: v });
  const rows: [string, string][] = r ? [
    ['Sapata', `${r.nome}: B ${cm(r.B)} × h ${cm(r.h)}${r.h0 < r.h ? ` / h0 ${cm(r.h0)}` : ''} cm${r.fixa ? ' (B imposta)' : ''}`],
    ...(r.carga ? [['Carga por metro (rara)', `Nk ${fmt(r.carga.Nk, 1)} kN/m · ${r.carga.comb}`]] as [string, string][] : []),
    ...(r.pressao ? [['σ máx. / σadm', `${fmt(r.pressao.sigmaMax, 1)} / ${r.sigmaAdm ? fmt(r.sigmaAdm, 0) : '—'} kN/m²`]] as [string, string][] : []),
    ...(p ? [
      ['Momento fora do plano', `${fmt(p.M, 1)} kN·m/m · excentricidade ${fmt(p.eM * 100, 0)} cm`],
      ['Cortante normal à parede', `${fmt(p.H, 1)} kN/m`],
    ] as [string, string][] : []),
    ...(p?.deslizamento ? [['Deslizamento', `FS ${fmt(p.deslizamento.FS)} (mín. ${fmt(p.deslizamento.FSmin, 1)}; μ ${fmt(p.deslizamento.mu)}; H ${fmt(p.deslizamento.H, 1)} kN/m; N ${fmt(p.deslizamento.N, 1)} kN/m)`]] as [string, string][] : []),
    ...(p?.pilaresEq ?? []).map((q): [string, string] => [`Pilar ${q.pilar} sobre a parede`, `Nk ${fmt(q.Nk, 0)} kN → sapata isolada equivalente ${fmt(q.a)} × ${fmt(q.a)} m (${q.rege ? 'coberta pela largura B' : 'B menor: aumente B'})`]),
  ] : [];
  return (
    <div data-pw-base-parede={w.id}>
      <h4>Base da parede</h4>
      {w.nasce !== 'fundacao' ? (
        <Hint>Esta parede nasce num pavimento, não na fundação: só paredes que nascem na fundação têm sapata corrida.</Hint>
      ) : (
        <>
          <div className="row wrap u-items-end">
            <Select label="Base da parede" aria-label="Base da parede" value={c ? 'sapata' : 'apoio'} options={BASES}
              onChange={(v) => { if (v === 'sapata' && !c) ed({}); else if (v === 'apoio' && c) ed({ remover: true }); }} />
          </div>
          {c && (
            <>
              <div className="row wrap u-items-end">
                <Select label="Aba da sapata da parede" aria-label="Aba da sapata da parede" value={c.aba} options={ABAS} onChange={(v) => ed({ aba: v })} />
                <OptNumField label="Largura B da sapata da parede (m; vazio = pela σadm)" width={190} value={c.B} onChange={opt('B')} />
                <OptNumField label="Altura h da sapata da parede (m; vazio = calculada)" width={190} value={c.h} onChange={opt('h')} />
              </div>
              <div className="row wrap u-items-end">
                <OptNumField label="σadm da sapata da parede (kN/m²; vazio = terreno)" width={190} value={c.sigmaAdm} onChange={opt('sigmaAdm')} />
                <OptNumField label="Atrito base-solo da sapata da parede (vazio = opção)" width={190} value={c.atrito} onChange={opt('atrito')} />
                <OptNumField label="Cota de assentamento da sapata da parede (m)" width={190} value={c.cota} onChange={opt('cota')} />
              </div>
              <div className="row wrap">
                <Check label="Aba de um lado: equilibrada por cintas (sapata da parede)" checked={!!c.equilibrio} onChange={(v) => ed({ equilibrio: v })} />
              </div>
              <div className="row wrap">
                <Button disabled={!r} onClick={() => usePlanta.getState().set({ janela: { tipo: 'fundacao', id: c.id } })}>Resultados da sapata da parede</Button>
                <Button onClick={() => usePlanta.getState().set({ pavimento: 'fundacao', selecao: new Set([c.id]), foco: { id: c.id, n: Date.now() } })}>Ver a sapata na planta de fundação</Button>
              </div>
              {r ? (
                <>
                  <div className="row wrap u-items-center"><Pill tone={r.status === 'ok' ? 'ok' : 'bad'}>{r.status === 'ok' ? 'atende' : 'não atende'}</Pill></div>
                  <KV rows={rows} />
                  <Mensagens msgs={r.mensagens} />
                </>
              ) : <p className="muted small" data-pw-base-sem-resultado>Calcule o edifício (aba Dimensionamento) para ver a sapata da parede.</p>}
            </>
          )}
          <Hint>
            Sapata corrida sob a parede: o eixo e a largura do apoio seguem a parede. A carga por metro vem das reações da base da parede na análise (normal, momento fora do plano e cortante do empuxo) e das cargas lançadas no nível de fundação sobre o eixo;
            pilares que nascem na fundação sobre a parede viram sapata isolada equivalente. Aba de um lado exige cintas (grupo Fundação). Premissa sapata-parede a confirmar.
          </Hint>
        </>
      )}
    </div>
  );
}
```

## 2. Edições nos arquivos existentes
`Mensagens` de `CorridaUI.tsx` passa a ser exportada (o `BaseParedeUI.tsx` a importa). Lista das sapatas: a coluna Modo mostra `parede M1`. Editor da sapata: para a sapata de parede o eixo e `bw` seguem a parede (campo `bw` some). Janela da sapata: linhas da parede (momento, cortante, deslizamento, sapata equivalente dos pilares). Parâmetros: μ, FS mínimo e a opção de reprovar o deslizamento.

### `src/app/edificio/CorridaUI.tsx`

**Edição 1.** Localize este texto (exato; aparece uma única vez):

```tsx
function Mensagens({ msgs }: { msgs: string[] }) {
```

Substitua por:

```tsx
export function Mensagens({ msgs }: { msgs: string[] }) {
```

**Edição 2.** Localize este texto (exato; aparece uma única vez):

```tsx
<td className="tl">{modo === 'pilares' ? 'sob pilares' : 'sob parede'}</td>
                  <td className="num">{r ? `${cm(r.B)} × ${cm(r.h)} / ${cm(r.h0)}`
```

Substitua por:

```tsx
<td className="tl">{modo === 'pilares' ? 'sob pilares' : c.parede ? `parede ${b.paredes?.find((q) => q.id === c.parede)?.nome ?? ''}` : 'sob parede'}</td>
                  <td className="num">{r ? `${cm(r.B)} × ${cm(r.h)} / ${cm(r.h0)}`
```

**Edição 3.** Localize este texto (exato; aparece uma única vez):

```tsx
        <NumField label="bw" unit="m" width={80} value={c.bw} onChange={(v) => ed({ bw: v })} />

```

Substitua por:

```tsx
        {c.parede ? <p className="muted small" data-corrida-parede={c.parede}>Sapata da parede {b.paredes?.find((q) => q.id === c.parede)?.nome ?? ''}: o eixo e a largura do apoio seguem a parede (edite a base em Paredes).</p> : <NumField label="bw" unit="m" width={80} value={c.bw} onChange={(v) => ed({ bw: v })} />}

```

**Edição 4.** Localize este texto (exato; aparece uma única vez):

```tsx
        ...(r.pressao ? [['σ máx. / mín. (raras)'
```

Substitua por:

```tsx
        ...(r.parede ? [
          ['Parede', `${r.parede.nome}${r.parede.virtual ? ' (sapata derivada da base da parede)' : ''} · cargas ${r.parede.origem === 'reacoes' ? 'das reações da base na análise' : 'só as lançadas no nível de fundação'}`],
          ['Momento fora do plano', `${fmt(r.parede.M, 1)} kN·m/m · excentricidade M/N ${fmt(r.parede.eM * 100, 0)} cm`],
          ['Cortante normal à parede', `${fmt(r.parede.H, 1)} kN/m`],
          ...(r.parede.deslizamento ? [['Deslizamento', `FS ${fmt(r.parede.deslizamento.FS)} (mín. ${fmt(r.parede.deslizamento.FSmin, 1)}; μ ${fmt(r.parede.deslizamento.mu)}) em ${r.parede.deslizamento.comb}`]] as [string, string][] : []),
          ...(r.parede.pilaresEq ?? []).map((q): [string, string] => [`Pilar ${q.pilar} sobre a parede`, `Nk ${fmt(q.Nk, 0)} kN → sapata isolada equivalente ${fmt(q.a)} × ${fmt(q.a)} m (${q.rege ? 'coberta pela largura B' : 'B menor: aumente B'})`]),
        ] as [string, string][] : []),
        ...(r.pressao ? [['σ máx. / mín. (raras)'
```

**Edição 5.** Localize este texto (exato; aparece uma única vez):

```tsx
          <NumField label="Janela da carga linear" unit="m" width={150} value={op.corridaJanela} onChange={(v) => opc('corridaJanela', v)} />
        </div>

```

Substitua por:

```tsx
          <NumField label="Janela da carga linear" unit="m" width={150} value={op.corridaJanela} onChange={(v) => opc('corridaJanela', v)} />
        </div>
        <div className="row wrap u-items-end" data-corrida-deslizamento>
          <NumField label="μ da base da parede (a confirmar)" width={190} value={op.fundCorridaAtrito} onChange={(v) => opc('fundCorridaAtrito', v)} />
          <NumField label="FS mínimo ao deslizamento (parede)" width={190} value={op.fundCorridaFSDesliz} onChange={(v) => opc('fundCorridaFSDesliz', v)} />
          <Check label="Reprovar o deslizamento (parede)" checked={op.fundCorridaDeslizamento === 1} onChange={(v) => opc('fundCorridaDeslizamento', v ? 1 : 0)} />
        </div>

```

O editor da parede (`EditorParede`) ganha o bloco "Base da parede"; a lista de paredes ganha a coluna Base; o lançamento pela planta ganha o seletor "Fundação da parede" (a parede já nasce com a sapata; só vale quando "Nasce em" = fundação; `Gerar da máscara` não aceita base: use o editor).

### `src/app/edificio/ParedesUI.tsx`

**Edição 1.** Localize este texto (exato; aparece uma única vez):

```tsx
import { IsovaloresParede } from './IsovaloresParede';
```

Substitua por:

```tsx
import { IsovaloresParede } from './IsovaloresParede';
import { BaseDaParede } from './BaseParedeUI';
```

**Edição 2.** Localize este texto (exato; aparece uma única vez):

```tsx
  const [vinc, setVinc] = useState<'engaste' | 'rotula'>('engaste');

```

Substitua por:

```tsx
  const [vinc, setVinc] = useState<'engaste' | 'rotula'>('engaste');
  const [fund, setFund] = useState<'apoio' | 'sapata'>('apoio');

```

**Edição 3.** Localize este texto (exato; aparece uma única vez):

```tsx
        <Select label="Base" value={vinc} options={[{ v: 'engaste', label: 'engastada' }, { v: 'rotula', label: 'rotulada' }]} onChange={setVinc} />

```

Substitua por:

```tsx
        <Select label="Base" value={vinc} options={[{ v: 'engaste', label: 'engastada' }, { v: 'rotula', label: 'rotulada' }]} onChange={setVinc} />
        <Select label="Fundação da parede" aria-label="Fundação da parede" value={fund} options={[{ v: 'apoio', label: 'apoio direto' }, { v: 'sapata', label: 'sapata corrida' }]} onChange={setFund} />

```

**Edição 4.** Localize este texto (exato; aparece uma única vez):

```tsx
pwParams: { espessura: cm2m(esp), nasce, morre: morreEf, vinculoBase: vinc } });
```

Substitua por:

```tsx
pwParams: { espessura: cm2m(esp), nasce, morre: morreEf, vinculoBase: vinc, ...(fund === 'sapata' && nasce === 'fundacao' ? { base: { tipo: 'sapataCorrida' } } : {}) } });
```

**Edição 5.** Localize este texto (exato; aparece uma única vez):

```tsx
<th>Nasce</th><th>Morre</th><th>Aberturas</th><th>Empuxo</th><th /></tr></thead>
```

Substitua por:

```tsx
<th>Nasce</th><th>Morre</th><th>Base</th><th>Aberturas</th><th>Empuxo</th><th /></tr></thead>
```

**Edição 6.** Localize este texto (exato; aparece uma única vez):

```tsx
                  <td className="tl">{nomePav(w.morre)}</td>
                  <td className="num">{l.nAberturas}</td>
```

Substitua por:

```tsx
                  <td className="tl">{nomePav(w.morre)}</td>
                  <td className="tl">{b.fundacao?.corridas?.some((c) => c.parede === w.id) ? 'sapata corrida' : 'apoio'}</td>
                  <td className="num">{l.nAberturas}</td>
```

**Edição 7.** Localize este texto (exato; aparece uma única vez):

```tsx
      <h4>Aberturas</h4>
      {(w.aberturas ?? []).length > 0 && (
```

Substitua por:

```tsx
      <BaseDaParede b={b} w={w} />
      <h4>Aberturas</h4>
      {(w.aberturas ?? []).length > 0 && (
```

O cartão "Sapatas corridas" da aba Dimensionamento mostra `parede M1` na coluna Modo.

### `src/app/edificio/Edificio.tsx`

**Edição 1.** Localize este texto (exato; aparece uma única vez):

```tsx
<td className="tl">{x.nome}</td><td className="tl">{x.modo === 'pilares' ? 'sob pilares' : 'sob parede'}</td><td className="num">{fmt(x.L)}</td>
```

Substitua por:

```tsx
<td className="tl">{x.nome}</td><td className="tl">{x.modo === 'pilares' ? 'sob pilares' : x.parede ? `parede ${x.parede.nome}` : 'sob parede'}</td><td className="num">{fmt(x.L)}</td>
```

## Verificação
```bash
npx tsc -b
npx vitest run src/app/design/design.test.ts src/core/building/sapataParede.test.ts
npm run e2e -- --no-build FU7a   # o fluxo da sapata corrida não pode quebrar
```
