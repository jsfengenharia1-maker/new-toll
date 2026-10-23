# Cartão E2e-2 — resultados dos consolos (informação, erros em vermelho, relatório, armadura bloqueada, redimensionar) e vínculo externo e pré-moldada no editor da viga

Executor: Haiku. Depende do cartão 1 (`1-janela-consolos.md`) aplicado. Cartão seguinte: `3-memorial-e2e.md`. Este cartão compila sozinho depois do 1.

## Regras (valem para todo o cartão)
- Só interface. **Não altere nada em `src/core/`** (o núcleo da E2e está pronto e testado em `src/core/building/consolos.test.ts` e `src/core/building/e2e.test.ts`). Componentes só de `src/app/ui` (nunca controles crus); sem cor literal, sem CSS novo, sem estilo inline (as classes usadas já existem em `global.css`); **nenhum botão novo na barra da planta** (a janela abre pelo item "Consolos curtos" da paleta Ctrl+K).
- Os rótulos abaixo são **exatos e únicos** no escopo em que o e2e os procura: não os renomeie, não acrescente `unit` aos campos que já o trazem no rótulo. No e2e, `getByRole('button', { name, exact: true })` para botões; para `NumField`, `OptNumField` e `Select` (o nome acessível inclui valor ou unidade) use regex ancorada no início, como `getByLabel(/^Geometria do consolo: altura h na face/)`.
- Aplique as edições na ordem. Se um texto a localizar não existir (outro agente mexeu no arquivo), pare e descreva o que encontrou: não improvise.

## O que o núcleo já entrega (não reimplemente)
- `BuildingModel.consolos?: Consolo[]` (`types.ts`): `{ id, nome, pilar, viga, ponta: 'ini' | 'fim', face, b, h, hp, a, c, aparelho: { l, b }, hd?, cobrimento?, armadura?: { tirante: { n, phi }, horizontais: { n, phi }, verticais: { phi, s } } }`, tudo em m. `Viga.vinculoExterno?: 'engaste' | 'articulacao' | 'deslizante'` e `Viga.premoldada?: { tipo: 'armada' | 'ficha', icamento?, ficha?: { nome, classe?, EI?, peso?, MRdPos, MRdNeg?, VRd, TRd? } }`.
- Comandos: `consolo.criar { viga, ponta, pilar, b?, h?, hp?, a?, c?, aparelho?, hd?, cobrimento?, nome? }`, `consolo.editar { id, ..., armadura? }` (informar a armadura a bloqueia; mudar a geometria solta), `consolo.remover { ids }`, `consolo.redimensionar { ids? }` e `viga.editar { id, vinculoExterno?: 'nenhum' | ..., premoldada?: { tipo: 'nenhuma' | 'armada' | 'ficha', icamento?, ficha? } }`.
- `src/core/building/consolos.ts`: `pontaToca`, `pontaDaViga`, `faceDoPilar`, `consoloPadrao`, `relatorioConsolo(r)`, `dimensionarConsolo`. Resultados: `dim.consolos` (um `ResultadoConsolo` por consolo: `tipo`, `Vd`, `Hd`, `Rst`, `As`, `biela`, `apoio`, `cortante`, `arranjo`, `ancoragem`, `status`, `mensagens`) e `dim.premoldadas`. Revisão com tipo `consolo` e códigos CONSOLO_* e PREMOLDADA_*.

## 1. Criar `src/app/edificio/ConsolosResultadosUI.tsx` (arquivo novo, cole inteiro)
```tsx
// Resultados dos consolos curtos (E2e, interface): informação (tipo, esforços, tirante, biela, contato, cortante e armadura), erros em
// vermelho, relatório das verificações (C6.100), redimensionar com os esforços do último cálculo (C6.101), armadura editada e
// bloqueada, e o perfil do consolo em SVG. O cálculo está em core/building/consolos.ts (dimensionarConsolo, relatorioConsolo).
import { useState } from 'react';
import { Button, Hint, NumField, Pill, Select } from '../ui';
import { relatorioConsolo, type ResultadoConsolo } from '../../core/building/consolos';
import type { BuildingModel, Consolo } from '../../core/building/types';
import { calculoAtual, dimAtual, useBuilding } from './store';

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const ST = { ok: 'atende', fail: 'não atende' } as const;
const TOM = { ok: 'ok', fail: 'bad' } as const;
const INFO = /^Consolo: (a\/d|ancoragem)/;
const PHI_TIRANTE = [12.5, 16, 20, 25].map((v) => ({ v, label: `φ${fmt(v, 1)}` }));
const PHI_EST = [6.3, 8, 10].map((v) => ({ v, label: `φ${fmt(v, 1)}` }));

/** Perfil do consolo (face do pilar à esquerda), com o aparelho, o tirante e a biela. */
export function DesenhoConsolo({ c, r }: { c: Consolo; r: ResultadoConsolo }) {
  const k = 150 / Math.max(c.c, c.h), m = 14, W = c.c * k + 2 * m + 30, H = c.h * k + 2 * m + 12;
  const x0 = m + 12, yb = m + c.h * k, xa = x0 + c.a * k, la = c.aparelho.l * k, yt = m + 6;
  return (
    <svg className="det" viewBox={`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`} role="img" aria-label={`Perfil do consolo ${c.nome}`} data-consolo-desenho>
      <line x1={x0} x2={x0} y1={m - 6} y2={yb + 6} className="det-contorno" />
      <polygon points={`${x0},${yb} ${x0 + c.c * k},${m + (c.h - c.hp) * k} ${x0 + c.c * k},${m} ${x0},${m}`} className="det-contorno" />
      <rect x={xa - la / 2} y={m - 4} width={la} height={4} className="det-pt inf" />
      <line x1={x0 - 10} x2={x0 + c.c * k - 3} y1={yt} y2={yt} className="det-barra sup" />
      {r.biela && <line x1={x0} x2={xa} y1={yb} y2={m} className="det-fio" />}
      <text x={x0 + 4} y={yt - 8 + 14} className="det-txt sup">{r.arranjo.tirante.n}φ{fmt(r.arranjo.tirante.phi, r.arranjo.tirante.phi % 1 ? 1 : 0)}</text>
      <text x={W / 2} y={H - 3} textAnchor="middle" className="det-txt cota">{fmt(c.b * 100, 0)} × {fmt(c.h * 100, 0)} / {fmt(c.hp * 100, 0)} cm · a = {fmt(c.a * 100, 0)} cm · balanço {fmt(c.c * 100, 0)} cm</text>
    </svg>
  );
}

/** Armadura do consolo: valores atuais (calculados ou bloqueados), edição e fixação. */
function ArmaduraConsolo({ c, r }: { c: Consolo; r: ResultadoConsolo }) {
  const { exec } = useBuilding();
  const [n, setN] = useState(r.arranjo.tirante.n), [phi, setPhi] = useState(r.arranjo.tirante.phi);
  const [nh, setNh] = useState(r.arranjo.horizontais.n), [phiH, setPhiH] = useState(r.arranjo.horizontais.phi);
  const [phiV, setPhiV] = useState(r.arranjo.verticais.phi), [sV, setSV] = useState(Math.round(r.arranjo.verticais.s * 100));
  return (
    <div data-consolo-armadura>
      <div className="row wrap u-items-end">
        <NumField label="Tirante do consolo: barras" width={190} value={n} onChange={(x) => setN(Math.max(2, Math.round(x)))} />
        <Select label="Tirante do consolo: bitola" value={phi} options={PHI_TIRANTE} onChange={setPhi} />
        <NumField label="Costura do consolo: estribos horizontais" width={250} value={nh} onChange={(x) => setNh(Math.max(1, Math.round(x)))} />
        <Select label="Costura do consolo: bitola" value={phiH} options={PHI_EST} onChange={setPhiH} />
        <Select label="Estribos verticais do consolo: bitola" value={phiV} options={PHI_EST} onChange={setPhiV} />
        <NumField label="Estribos verticais do consolo: espaçamento" unit="cm" width={290} value={sV} onChange={(x) => setSV(Math.max(3, x))} />
      </div>
      <div className="row wrap">
        <Button onClick={() => exec('consolo.editar', { id: c.id, armadura: { tirante: { n, phi }, horizontais: { n: nh, phi: phiH }, verticais: { phi: phiV, s: sV / 100 } } })}>Fixar a armadura do consolo</Button>
        <Button disabled={!c.armadura} onClick={() => exec('consolo.redimensionar', { ids: [c.id] })}>Redimensionar o consolo</Button>
      </div>
    </div>
  );
}

/** Resultados de um consolo lançado. */
export function ConsoloResultados({ b, id }: { b: BuildingModel; id: string }) {
  const atual = useBuilding((s) => calculoAtual(s) && dimAtual(s));
  const dim = useBuilding((s) => s.dim);
  const [relatorio, setRelatorio] = useState(false);
  const c = b.consolos?.find((x) => x.id === id);
  if (!c) return null;
  if (!dim || !atual) return <div data-consolo-resultados><Hint>Calcule o edifício (aba Dimensionamento) para ver o tirante, a biela e os erros deste consolo.</Hint></div>;
  const r = dim.consolos?.find((x) => x.consolo === id);
  if (!r) return <div data-consolo-resultados><Hint>Este consolo não entrou no último cálculo (a viga não foi dimensionada ou foi removida).</Hint></div>;
  const erros = r.mensagens.filter((m) => !INFO.test(m)), infos = r.mensagens.filter((m) => INFO.test(m));
  return (
    <div data-consolo-resultados>
      <p className="small"><b>{r.nome}</b> <Pill tone={TOM[r.status]}>{ST[r.status]}</Pill> — consolo {r.tipo} (a/d = {fmt(r.ad)})</p>
      <ul className="small">
        <li>Vd = {fmt(r.Vd, 1)} kN{r.combinacao ? ` (${r.combinacao})` : ''}; Hd = {fmt(r.Hd, 1)} kN (mínima {fmt(r.HdMin, 1)} kN); d = {fmt(r.d * 100, 1)} cm; z = {fmt(r.z * 100, 1)} cm.</li>
        <li>Tirante: Rst = {fmt(r.Rst, 1)} kN; As necessária {fmt(r.As.calc * 1e4)} cm² (mínima {fmt(r.As.min * 1e4)} cm²); adotada {fmt(r.As.ef * 1e4)} cm² ({r.arranjo.tirante.n}φ{fmt(r.arranjo.tirante.phi, r.arranjo.tirante.phi % 1 ? 1 : 0)}){r.bloqueada ? ' (bloqueada)' : ''}.</li>
        {r.biela && <li>Biela: θ = {fmt(r.biela.theta, 1)}°, σ = {fmt(r.biela.tensao, 1)} MPa de {fmt(r.biela.limite, 1)} MPa (utilização {fmt(r.biela.util)}).</li>}
        <li>Contato no aparelho: {fmt(r.apoio.tensao, 1)} MPa de {fmt(r.apoio.limite, 1)} MPa ({fmt(r.apoio.util)}); cortante: {fmt(r.cortante.Vd, 0)} kN de VRd2 = {fmt(r.cortante.VRd2, 0)} kN ({fmt(r.cortante.util)}).</li>
        <li>Costura: {r.arranjo.horizontais.n} estribos horizontais fechados φ{fmt(r.arranjo.horizontais.phi, 1)} ({fmt(r.costura.ef * 1e4)} de {fmt(r.costura.nec * 1e4)} cm²); estribos verticais φ{fmt(r.arranjo.verticais.phi, 1)} c/{fmt(r.arranjo.verticais.s * 100, 0)}; ancoragem {fmt(r.ancoragem.lbNec * 100, 0)} cm de {fmt(r.ancoragem.disponivel * 100, 0)} cm.</li>
      </ul>
      {infos.length > 0 && <ul className="small" data-consolo-avisos>{infos.map((m, i) => <li key={i} className="warn">{m}</li>)}</ul>}
      {erros.length > 0 && <ul className="small" data-consolo-erros>{erros.map((m, i) => <li key={i} className="bad">{m}</li>)}</ul>}
      <DesenhoConsolo c={c} r={r} />
      <div className="row wrap">
        <Button aria-label={`Relatório do consolo ${r.nome}`} onClick={() => setRelatorio(!relatorio)}>{relatorio ? 'Ocultar o relatório do consolo' : 'Ver o relatório do consolo'}</Button>
      </div>
      {relatorio && <ul className="small" data-consolo-relatorio>{relatorioConsolo(r).map((t, i) => <li key={i}>{t}</li>)}</ul>}
      <ArmaduraConsolo key={`${c.id}-${c.armadura ? 'b' : 'a'}-${r.arranjo.tirante.n}-${r.arranjo.tirante.phi}`} c={c} r={r} />
    </div>
  );
}
```

## 2. Editar `src/app/edificio/ConsolosUI.tsx`

Mostra os resultados do consolo escolhido logo abaixo da edição.

2.1. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
import { calculoAtual, dimAtual, useBuilding } from './store';
```

Substitua por:

```tsx
import { calculoAtual, dimAtual, useBuilding } from './store';
import { ConsoloResultados } from './ConsolosResultadosUI';
```

2.2. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
        {c && <EditarConsolo key={c.id} b={b} c={c} />}
```

Substitua por:

```tsx
        {c && <EditarConsolo key={c.id} b={b} c={c} />}
        {c && <ConsoloResultados b={b} id={c.id} />}
```

## 3. Criar `src/app/edificio/VinculoPremoldadaUI.tsx` (arquivo novo, cole inteiro)
```tsx
// Vínculo externo e pré-moldada no editor da viga (E2e, interface): topo de muro (engaste, articulação ou deslizante), viga
// pré-moldada armada (içamento) ou pré-fabricada de ficha do fabricante (EI, peso, MRd, VRd). Só comandos `viga.editar`; os
// resultados do içamento e da ficha saem na janela da viga e no memorial.
import { useState } from 'react';
import { Button, Hint, NumField, OptNumField, Select, TextField } from '../ui';
import type { FichaPremoldada, Viga } from '../../core/building/types';
import { useBuilding } from './store';

const VINCULOS = [
  { v: 'nenhum', label: 'nenhum (viga comum)' }, { v: 'engaste', label: 'engaste (topo de muro)' },
  { v: 'articulacao', label: 'articulação (topo de muro)' }, { v: 'deslizante', label: 'articulação com deslizamento horizontal' },
] as const;
const TIPOS = [{ v: 'nenhuma', label: 'nenhuma' }, { v: 'armada', label: 'armada (NBR 9062)' }, { v: 'ficha', label: 'pré-fabricada de ficha' }] as const;
const CLASSES = [{ v: 'protendida', label: 'protendida' }, { v: 'trelicada', label: 'treliçada' }, { v: 'outra', label: 'outra' }] as const;

function EditorFicha({ v, aplicar }: { v: Viga; aplicar: (f: FichaPremoldada) => void }) {
  const f0 = v.premoldada?.ficha;
  const [nome, setNome] = useState(f0?.nome ?? 'Ficha'), [classe, setClasse] = useState<'protendida' | 'trelicada' | 'outra'>(f0?.classe ?? 'protendida');
  const [EI, setEI] = useState<number | undefined>(f0?.EI), [peso, setPeso] = useState<number | undefined>(f0?.peso);
  const [mp, setMp] = useState(f0?.MRdPos ?? 100), [mn, setMn] = useState<number | undefined>(f0?.MRdNeg), [vr, setVr] = useState(f0?.VRd ?? 100), [tr, setTr] = useState<number | undefined>(f0?.TRd);
  return (
    <div data-ficha-premoldada>
      <div className="row wrap u-items-end">
        <TextField label="Ficha da viga: nome" value={nome} onChange={setNome} />
        <Select label="Ficha da viga: classe" value={classe} options={[...CLASSES]} onChange={setClasse} />
        <OptNumField label="Ficha da viga: rigidez EI (vazio = seção bruta)" unit="kN·m²" width={290} value={EI} onChange={setEI} />
        <OptNumField label="Ficha da viga: peso (vazio = seção)" unit="kN/m" width={220} value={peso} onChange={setPeso} />
      </div>
      <div className="row wrap u-items-end">
        <NumField label="Ficha da viga: momento resistente positivo" unit="kN·m" width={290} value={mp} onChange={setMp} />
        <OptNumField label="Ficha da viga: momento resistente negativo" unit="kN·m" width={290} value={mn} onChange={setMn} />
        <NumField label="Ficha da viga: cortante resistente" unit="kN" width={240} value={vr} onChange={setVr} />
        <OptNumField label="Ficha da viga: torçor resistente" unit="kN·m" width={240} value={tr} onChange={setTr} />
        <Button onClick={() => aplicar({ nome: nome.trim() || 'Ficha', classe, ...(EI ? { EI } : {}), ...(peso !== undefined ? { peso } : {}), MRdPos: mp, ...(mn ? { MRdNeg: mn } : {}), VRd: vr, ...(tr ? { TRd: tr } : {}) })}>Aplicar a ficha da viga</Button>
      </div>
    </div>
  );
}

/** Vínculo externo e pré-moldada da seleção de vigas (o primeiro elemento mostra o valor; a edição vale para todos). */
export function VinculoEPremoldada({ vigas }: { vigas: Viga[] }) {
  const { exec } = useBuilding();
  const v0 = vigas[0];
  if (!v0) return null;
  const lote = (params: Record<string, unknown>) => exec('lote', { comandos: vigas.map((x) => ({ nome: 'viga.editar', params: { id: x.id, ...params } })) });
  const tipo = v0.premoldada?.tipo ?? 'nenhuma';
  return (
    <div data-vinculo-premoldada>
      <p className="small"><b>Vínculo externo e pré-moldada {vigas.length > 1 ? `de ${vigas.length} vigas` : `de ${v0.nome}`}</b></p>
      <div className="row wrap u-items-end">
        <Select label="Vínculo externo da viga" value={v0.vinculoExterno ?? 'nenhum'} options={[...VINCULOS]} onChange={(x) => lote({ vinculoExterno: x })} />
        <Select label="Viga pré-moldada" value={tipo} options={[...TIPOS]} onChange={(t) => lote({ premoldada: t === 'ficha' && !v0.premoldada?.ficha ? { tipo: 'ficha', ficha: { nome: 'Ficha', MRdPos: 100, VRd: 100 } } : { tipo: t } })} />
        {tipo === 'armada' && <OptNumField label="Içamento: distância dos pontos às extremidades (vazio = opção)" unit="cm" width={380} value={v0.premoldada?.icamento === undefined ? undefined : +(v0.premoldada.icamento * 100).toFixed(1)} onChange={(x) => lote({ premoldada: { tipo: 'armada', ...(x ? { icamento: x / 100 } : {}) } })} />}
      </div>
      {tipo === 'ficha' && <EditorFicha key={v0.id + (v0.premoldada?.ficha?.nome ?? '')} v={v0} aplicar={(f) => lote({ premoldada: { tipo: 'ficha', ficha: f } })} />}
      <Hint>Vínculo externo: a viga simula o topo de um muro, com apoios em todos os nós de discretização (EI × 100); pilares coincidentes devem ser desligados no grupo. Pré-moldada armada: γc do controle pré-moldado, ligações articuladas por padrão e verificação de içamento. Ficha: viga protendida ou treliçada pré-fabricada, só verificada contra os valores do fabricante.</Hint>
    </div>
  );
}
```

## 4. Editar `src/app/edificio/Vinculos.tsx`

O bloco aparece no editor de vigas (grupo "Vínculos, flambagem e cobrimento"), logo abaixo da seção da viga.

4.1. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
import { SecaoDaViga } from './SecaoVigaUI';
```

Substitua por:

```tsx
import { SecaoDaViga } from './SecaoVigaUI';
import { VinculoEPremoldada } from './VinculoPremoldadaUI';
```

4.2. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
        <SecaoDaViga b={b} vigas={vigas} />
```

Substitua por:

```tsx
        <SecaoDaViga b={b} vigas={vigas} />
        <VinculoEPremoldada vigas={vigas} />
```

## Verificação
`npx tsc -b` sem erros e `npx vitest run src/app/design` verde (nenhuma cor literal, classe sem CSS ou estilo inline). Relate só o resultado.
