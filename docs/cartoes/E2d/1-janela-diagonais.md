# Cartão E2d-1 — janela das diagonais de contraventamento (lançar, editar no grupo atual, atribuir, mover extremos, remover) e setas na planta

Executor: Haiku. Depende só do núcleo da E2d. Cartões seguintes: `2-resultados.md` e `3-memorial-e2e.md`. Aplique na ordem: este cartão compila sozinho.

## Regras (valem para todo o cartão)
- Só interface. **Não altere nada em `src/core/`** (o núcleo da E2d está pronto e testado em `src/core/building/diagonais.test.ts`; a validação externa é `validation/opensees/diagonal.py`). Componentes só de `src/app/ui` (nunca controles crus); sem cor literal, sem CSS novo, sem estilo inline (as classes usadas já existem em `global.css`); **nenhum botão novo na barra da planta** (a janela abre pelo item "Diagonais de contraventamento" da paleta Ctrl+K).
- Os rótulos abaixo são **exatos e únicos** no escopo em que o e2e os procura: não os renomeie, não acrescente `unit` aos campos que já o trazem no rótulo. Todos começam por "Diagonal" ou terminam em "da diagonal", para não colidir com os da janela das vigas inclinadas (E2c). No e2e, `getByRole('button', { name, exact: true })` para botões; para `NumField`, `OptNumField` e `Select` (o nome acessível inclui valor ou unidade) use regex ancorada no início, como `getByLabel(/^Diagonal: largura b/)`.
- Aplique as edições na ordem. Se um texto a localizar não existir (outro agente mexeu no arquivo), pare e descreva o que encontrou: não improvise.
- Este cartão não depende dos cartões da E2c: se eles já foram aplicados, as âncoras abaixo continuam únicas.

## O que o núcleo já entrega (não reimplemente)
- `Obra.diagonais?: Diagonal[]` (`types.ts`): igual à `VigaInclinada` (pavimentos inicial e final `pavIni` e `pavFim` em grupos quaisquer, pontas `pIni` e `pFim` em planta, desnível das pontas, seção de concreto `{ b, h }` em m, `multipla`, ligações `ligIni` e `ligFim`, `flambagem` por plano), mais `excluidas` (pavimentos iniciais das barras de uma múltipla que viraram diagonais próprias). Sem cargas próprias e sem armadura editável.
- Comandos: `diagonal.criar`, `diagonal.editar { id, pavimento?, ... }`, `diagonal.mover { id, pavimento?, ponta: ini | fim | ambas, dx, dy }`, `diagonal.atribuir { id, de, pavimento?, campos? }` e `diagonal.remover { ids }`. `pavimento` é o grupo atual: numa diagonal múltipla, editar, mover e atribuir com ele valem só para a barra desse grupo, que vira uma diagonal própria; remover apaga todas.
- `src/core/building/diagonais.ts`: `resumoDiagonais(b, kV, kT)`, `expandirDiagonais(b)` (barras com `pavIni`, `pavFim`, `pIni`, `pFim`, `L`), `cruzamentosDiagonais(b)`. `src/core/building/inclinadas.ts`: `barrasDaInclinada(b, d)`.
- Resultados (cartão 2): `dim.diagonais`, `dim.detalhesDiagonais`; revisão com tipo `diagonal` e códigos DIAGONAL_ARMADURA, DIAGONAL_ESBELTEZ, DIAGONAL_ESBELTEZ_MAX, DIAGONAL_BIELA, DIAGONAL_CRUZAMENTO e DIAGONAL_NOS.

## 1. Criar `src/app/edificio/DiagonaisUI.tsx` (arquivo novo, cole inteiro)
```tsx
// Diagonais de contraventamento entre pavimentos (E2d, interface): janela com a lista, o lançamento (pavimentos e extremos, ou o
// centro de um pilar), a edição (seção, múltipla, ligações, desnível, flambagem, mover extremos, atribuir dados de outra diagonal e
// remover) e, quando o cartão 2 está aplicado, os resultados. Em diagonal múltipla, a edição pode valer só para o grupo atual. O
// cálculo está em core/building/diagonais.ts e nos comandos diagonal.*; aqui só se lançam comandos.
import { useState } from 'react';
import { create } from 'zustand';
import { Button, Check, Hint, Modal, NumField, OptNumField, Select } from '../ui';
import { resumoDiagonais } from '../../core/building/diagonais';
import { barrasDaInclinada } from '../../core/building/inclinadas';
import { centroNoLance, lancesDoPilar, pavimentosOrdenados, type BuildingModel, type Diagonal, type LigacaoBarra } from '../../core/building/types';
import { useBuilding } from './store';

interface EstadoJanela { aberta: boolean; id?: string; abrir: (id?: string) => void; fechar: () => void }
/** Estado da janela das diagonais (a paleta Ctrl+K a abre). */
export const useDiagonaisUI = create<EstadoJanela>((set) => ({ aberta: false, abrir: (id) => set({ aberta: true, id }), fechar: () => set({ aberta: false, id: undefined }) }));

/** Monta a janela quando aberta (colocada uma vez no Edifício). */
export function DiagonaisHost() {
  const { aberta, id, fechar } = useDiagonaisUI();
  return aberta ? <JanelaDiagonais id={id} onClose={fechar} /> : null;
}

const LIGACOES: { v: LigacaoBarra; label: string }[] = [{ v: 'engastada', label: 'engastada' }, { v: 'articulada', label: 'articulada' }];
const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');

/** Pilares que chegam ao pavimento, como opções de extremo. */
function pilaresDo(b: BuildingModel, pav: string) {
  return b.pilares.filter((p) => lancesDoPilar(b, p).some((l) => l.id === pav));
}

function LancarDiagonal({ b, aoLancar }: { b: BuildingModel; aoLancar: (id: string) => void }) {
  const { exec } = useBuilding();
  const ps = pavimentosOrdenados(b), opcoesPav = ps.map((p) => ({ v: p.id, label: `${p.nome} (${fmt(p.cota)})` }));
  const [pi, setPi] = useState(ps[1]?.id ?? ps[0]?.id ?? ''), [pf, setPf] = useState(ps[2]?.id ?? ps.at(-1)?.id ?? '');
  const [ini, setIni] = useState<[number, number]>([0, 0]), [fim, setFim] = useState<[number, number]>([0, 0]);
  const [bw, setBw] = useState(20), [h, setH] = useState(30), [multipla, setMultipla] = useState(false);
  const [ligI, setLigI] = useState<LigacaoBarra>('engastada'), [ligF, setLigF] = useState<LigacaoBarra>('engastada');
  const extremo = (pav: string, onSet: (p: [number, number]) => void, rotulo: string) => (
    <Select label={rotulo} value="" options={[{ v: '', label: 'coordenadas abaixo' }, ...pilaresDo(b, pav).map((p) => ({ v: p.id, label: p.nome }))]}
      onChange={(id) => { const p = b.pilares.find((x) => x.id === id); if (p) onSet(centroNoLance(p, pav)); }} />
  );
  return (
    <div data-diagonal-lancar>
      <p className="small"><b>Lançar diagonal de contraventamento</b></p>
      <div className="row wrap u-items-end">
        <Select label="Diagonal: pavimento inicial" value={pi} options={opcoesPav} onChange={setPi} />
        {extremo(pi, setIni, 'Diagonal: centro do pilar do extremo inicial')}
        <NumField label="Diagonal: extremo inicial x" unit="m" width={150} value={ini[0]} onChange={(x) => setIni([x, ini[1]])} />
        <NumField label="Diagonal: extremo inicial y" unit="m" width={150} value={ini[1]} onChange={(y) => setIni([ini[0], y])} />
        <Select label="Diagonal: ligação do extremo inicial" value={ligI} options={LIGACOES} onChange={setLigI} />
      </div>
      <div className="row wrap u-items-end">
        <Select label="Diagonal: pavimento final" value={pf} options={opcoesPav} onChange={setPf} />
        {extremo(pf, setFim, 'Diagonal: centro do pilar do extremo final')}
        <NumField label="Diagonal: extremo final x" unit="m" width={150} value={fim[0]} onChange={(x) => setFim([x, fim[1]])} />
        <NumField label="Diagonal: extremo final y" unit="m" width={150} value={fim[1]} onChange={(y) => setFim([fim[0], y])} />
        <Select label="Diagonal: ligação do extremo final" value={ligF} options={LIGACOES} onChange={setLigF} />
      </div>
      <div className="row wrap u-items-end">
        <NumField label="Diagonal: largura b" unit="cm" width={150} value={bw} onChange={setBw} />
        <NumField label="Diagonal: altura h" unit="cm" width={150} value={h} onChange={setH} />
        <Check label="Diagonal: múltipla (uma por pavimento)" checked={multipla} onChange={setMultipla} />
        <Button variant="primary" onClick={() => {
          const r = exec('diagonal.criar', { pavIni: pi, pavFim: pf, pIni: ini, pFim: fim, secao: { b: bw / 100, h: h / 100 }, ...(multipla ? { multipla: true } : {}), ...(ligI === 'articulada' ? { ligIni: ligI } : {}), ...(ligF === 'articulada' ? { ligFim: ligF } : {}) });
          if (r.ok) { const d = useBuilding.getState().sessao.modelo.diagonais?.at(-1); if (d) aoLancar(d.id); }
        }}>Lançar diagonal</Button>
      </div>
      <Hint>O extremo precisa tocar um pilar do pavimento ou o eixo de uma viga do grupo (escolha o pilar para usar o centro dele). Os pavimentos podem estar em grupos diferentes; a diagonal atravessa os intermediários sem se ligar a eles. Onde duas diagonais se cruzam o pórtico ganha um nó e a flambagem continua pelo comprimento total. Perfis de aço não estão disponíveis: só concreto.</Hint>
    </div>
  );
}

function EditarDiagonal({ b, v, outras }: { b: BuildingModel; v: Diagonal; outras: Diagonal[] }) {
  const { exec } = useBuilding();
  const nomePav = (id: string) => b.pavimentos.find((p) => p.id === id)?.nome ?? id;
  const barras = barrasDaInclinada(b, v);
  const [grupo, setGrupo] = useState(''), [de, setDe] = useState('');
  // "grupo atual": só numa múltipla; vale para a barra que começa nesse pavimento (ela vira uma diagonal própria)
  const atual = v.multipla && barras.some((x) => x.pavIni === grupo) ? grupo : '';
  const com = (params: Record<string, unknown>) => ({ id: v.id, ...(atual ? { pavimento: atual } : {}), ...params });
  const editar = (params: Record<string, unknown>) => exec('diagonal.editar', com(params));
  const [mover, setMover] = useState<'ambas' | 'ini' | 'fim'>('ambas'), [dx, setDx] = useState(0), [dy, setDy] = useState(0);
  return (
    <div data-diagonal-editar={v.id}>
      <p className="small"><b>Editar {v.nome}</b></p>
      {v.multipla && barras.length > 1 && (
        <div className="row wrap u-items-end">
          <Select label="Grupo atual da diagonal" value={atual} options={[{ v: '', label: 'todas as barras' }, ...barras.map((x) => ({ v: x.pavIni, label: `${nomePav(x.pavIni)} → ${nomePav(x.pavFim)}` }))]} onChange={setGrupo} />
          <Hint>Com um grupo escolhido, editar, mover e atribuir valem só para a barra desse grupo, que vira uma diagonal própria (selecione-a na lista); apagar remove todas.</Hint>
        </div>
      )}
      <div className="row wrap u-items-end">
        <NumField label="Seção da diagonal: largura b" unit="cm" width={170} value={+(v.secao.b * 100).toFixed(2)} onChange={(x) => editar({ secao: { b: x / 100, h: v.secao.h } })} />
        <NumField label="Seção da diagonal: altura h" unit="cm" width={170} value={+(v.secao.h * 100).toFixed(2)} onChange={(x) => editar({ secao: { b: v.secao.b, h: x / 100 } })} />
        <Check label="Diagonal múltipla" checked={!!v.multipla} onChange={(c) => exec('diagonal.editar', { id: v.id, multipla: c })} />
        <Select label="Ligação inicial da diagonal" value={v.ligIni ?? 'engastada'} options={LIGACOES} onChange={(l) => editar({ ligIni: l })} />
        <Select label="Ligação final da diagonal" value={v.ligFim ?? 'engastada'} options={LIGACOES} onChange={(l) => editar({ ligFim: l })} />
      </div>
      <div className="row wrap u-items-end">
        <OptNumField label="Desnível inicial da diagonal" unit="cm" width={180} value={v.nivelIni === undefined ? undefined : +(v.nivelIni * 100).toFixed(2)} onChange={(x) => editar({ nivelIni: (x ?? 0) / 100 })} />
        <OptNumField label="Desnível final da diagonal" unit="cm" width={180} value={v.nivelFim === undefined ? undefined : +(v.nivelFim * 100).toFixed(2)} onChange={(x) => editar({ nivelFim: (x ?? 0) / 100 })} />
        <OptNumField label="Flambagem da diagonal: k vertical (vazio = opção)" width={280} value={v.flambagem?.vertical} onChange={(x) => editar({ flambagem: { ...v.flambagem, vertical: x } })} />
        <OptNumField label="Flambagem da diagonal: k transversal (vazio = opção)" width={290} value={v.flambagem?.transversal} onChange={(x) => editar({ flambagem: { ...v.flambagem, transversal: x } })} />
      </div>
      <div className="row wrap u-items-end">
        <Select label="Extremo a mover da diagonal" value={mover} options={[{ v: 'ambas', label: 'os dois extremos' }, { v: 'ini', label: 'extremo inicial' }, { v: 'fim', label: 'extremo final' }]} onChange={setMover} />
        <NumField label="Deslocamento dx da diagonal" unit="m" width={170} value={dx} onChange={setDx} />
        <NumField label="Deslocamento dy da diagonal" unit="m" width={170} value={dy} onChange={setDy} />
        <Button onClick={() => exec('diagonal.mover', com({ ponta: mover, dx, dy }))}>Mover a diagonal</Button>
      </div>
      <div className="row wrap u-items-end">
        <Select label="Dados de outra diagonal" value={de} options={[{ v: '', label: 'escolha' }, ...outras.map((o) => ({ v: o.id, label: o.nome }))]} onChange={setDe} />
        <Button disabled={!de} onClick={() => exec('diagonal.atribuir', com({ de }))}>Atribuir os dados da diagonal</Button>
        <Button variant="danger" onClick={() => exec('diagonal.remover', { ids: [v.id] })}>Remover a diagonal</Button>
      </div>
      <Hint>Atribuir copia seção, ligações, flambagem e cobrimento da outra diagonal (a geometria não muda). Calcule o edifício na aba Dimensionamento para ver a armadura, a esbeltez e os erros.</Hint>
    </div>
  );
}

/** Janela das diagonais: lista, lançamento e edição da escolhida. */
export function JanelaDiagonais({ id, onClose }: { id?: string; onClose: () => void }) {
  const b = useBuilding((s) => s.sessao.modelo);
  const op = useBuilding((s) => s.analise?.opcoes);
  const lista = resumoDiagonais(b, op?.diagonalFlambagemVertical ?? 1, op?.diagonalFlambagemTransversal ?? 1);
  const [sel, setSel] = useState<string | undefined>(id);
  const v = b.diagonais?.find((x) => x.id === (sel ?? id)) ?? b.diagonais?.[0];
  return (
    <Modal titulo="Diagonais de contraventamento" onClose={onClose} larga>
      <div data-diagonais>
        {lista.length === 0
          ? <p className="muted small">Nenhuma diagonal lançada.</p>
          : (
            <div className="tablewrap">
              <table className="data quadro" data-diagonais-lista>
                <thead><tr><th>Diagonal</th><th>Pavimentos</th><th>Seção</th><th>Comprimento real (m)</th><th>Ângulo (°)</th><th>Ligações</th><th>Flambagem k (v / t)</th><th>Barras</th><th>Nós de cruzamento</th><th /></tr></thead>
                <tbody>
                  {lista.map((x) => (
                    <tr key={x.id} className={x.id === v?.id ? 'sel' : ''}>
                      <td className="tl">{x.nome}</td><td className="tl">{x.pavimentoIni} → {x.pavimentoFim}</td><td>{x.secao}</td><td>{fmt(x.comprimento)}</td><td>{fmt(x.angulo, 1)}</td><td className="tl">{x.ligacao}</td><td>{x.flambagem}</td><td>{x.multipla ? `${x.barras} (múltipla)` : '1'}</td><td>{x.cruzamentos}</td>
                      <td><Button variant="mini" aria-label={`Editar ${x.nome}`} onClick={() => setSel(x.id)}>editar</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        {v && <EditarDiagonal key={v.id} b={b} v={v} outras={(b.diagonais ?? []).filter((x) => x.id !== v.id)} />}
        <LancarDiagonal b={b} aoLancar={setSel} />
      </div>
    </Modal>
  );
}
```

## 2. Editar `src/app/edificio/Edificio.tsx`

Monta a janela uma vez no Edifício.

2.1. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
import { PaletaComandos } from './PaletaComandos';
```

Substitua por:

```tsx
import { PaletaComandos } from './PaletaComandos';
import { DiagonaisHost } from './DiagonaisUI';
```

2.2. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
      <PaletaComandos setAba={(a) => setAba(a as typeof aba)} />
```

Substitua por:

```tsx
      <DiagonaisHost />
      <PaletaComandos setAba={(a) => setAba(a as typeof aba)} />
```

## 3. Editar `src/app/edificio/PaletaComandos.tsx`

Item da paleta (Ctrl+K) que abre a janela, e um item por diagonal lançada.

3.1. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
import { Button, Input, Modal } from '../ui';
```

Substitua por:

```tsx
import { Button, Input, Modal } from '../ui';
import { useDiagonaisUI } from './DiagonaisUI';
```

3.2. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
    { id: 'a:viga-curva',
```

Substitua por:

```tsx
    { id: 'a:diagonais', tipo: 'Ação', rotulo: 'Diagonais de contraventamento', detalhe: 'lançar, editar e ver resultados', repetivel: false, executar: () => useDiagonaisUI.getState().abrir() },
    { id: 'a:viga-curva',
```

3.3. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
  for (const l of b.lajes) out.push({ id: `e:${l.id}`
```

Substitua por:

```tsx
  for (const d of b.diagonais ?? []) out.push({ id: `e:${d.id}`, tipo: 'Viga', rotulo: d.nome, detalhe: 'diagonal de contraventamento', repetivel: false, executar: () => useDiagonaisUI.getState().abrir(d.id) });
  for (const l of b.lajes) out.push({ id: `e:${l.id}`
```

## 4. Editar `src/app/edificio/Planta.tsx` (setas das diagonais, C6.42)

A planta mostra, no pavimento em que a diagonal começa ou termina, uma seta do extremo inicial ao final (a seta aponta para o extremo final), com o nome da diagonal no meio.

4.1. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
import { aberturasNaPlanta } from './paredesLista';
```

Substitua por:

```tsx
import { aberturasNaPlanta } from './paredesLista';
import { expandirDiagonais } from '../../core/building/diagonais';
```

4.2. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
    desenharCargas(ctx);
```

Substitua por:

```tsx
    // diagonais de contraventamento (E2d): seta do extremo inicial ao final nos pavimentos em que a barra começa ou termina
    if (pav) {
      ctx.save(); ctx.lineWidth = 2; ctx.strokeStyle = cores.cota; ctx.fillStyle = cores.cota; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      for (const x of expandirDiagonais(b)) {
        if (x.pavIni !== pav.id && x.pavFim !== pav.id) continue;
        const [a, z] = [paraTela(x.pIni[0], x.pIni[1]), paraTela(x.pFim[0], x.pFim[1])], ang = Math.atan2(z[1] - a[1], z[0] - a[0]);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(z[0], z[1]); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(z[0], z[1]); ctx.lineTo(z[0] - 10 * Math.cos(ang - 0.4), z[1] - 10 * Math.sin(ang - 0.4)); ctx.lineTo(z[0] - 10 * Math.cos(ang + 0.4), z[1] - 10 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill();
        ctx.fillText(x.nome, (a[0] + z[0]) / 2, (a[1] + z[1]) / 2 - 3);
      }
      ctx.restore();
    }
    desenharCargas(ctx);
```

## Limite conhecido
O lançamento é pela janela (pavimentos, coordenadas dos extremos ou o centro de um pilar); o lançamento por dois cliques na planta não faz parte deste cartão (fica para uma fatia de interface posterior, como o das vigas inclinadas). Erros de diagonal aparecem na lista de erros da revisão com o tipo "Diagonal"; a janela abre pela paleta.

## Verificação
`npx tsc -b` sem erros e `npx vitest run src/app/design` verde (nenhuma cor literal, classe sem CSS ou estilo inline). Relate só o resultado.
