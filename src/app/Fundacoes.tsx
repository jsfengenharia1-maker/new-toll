import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStore } from './store';
import { useBuilding } from './edificio/store';
import { Button, Check, Chip, Dock, Group, Hint, Input, Note, NumCell, NumField, OptNumCell, OptNumField, Pill, Select, TextField } from './ui';
import { fmt, getDesign, useAnalysis } from './results';
import { buildCharacteristics } from './Library';
import { listLibrary, loadFromLibrary, type LibraryItem, type SavedCharacteristics } from './storage';
import {
  KIND_LABEL, PILE_LABEL, PRECAST_CATALOG, STRUCT, boringsOf, defaultFoundationParams, normalizeFoundation, recommendedOption, sampleFoundation,
  type Boring, type FLoad, type FoundationData, type FoundationKind, type FoundationParams, type PileSolution, type PileType,
} from '../core/piles';
import { designSupport, type SupportDesign } from '../core/foundation';
import { isFooting } from '../core/footings';
import { isCaisson } from '../core/caissons';
import { CaissonDetail, FootingDetail, SolutionDetail, Tbc, barTxt, phiTxt } from './FundacoesDetail';
import { SondagemEditor } from './SondagemEditor';
import { FundacoesDoEdificio, LigacaoEdificio } from './edificio/Fundacao';

const KINDS = Object.keys(KIND_LABEL) as FoundationKind[];
/** Campos por apoio preservados ao reimportar cargas (casados pelo nome do apoio). */
const KEEP: (keyof FLoad)[] = ['kind', 'boringId', 'boringMode', 'boringIds', 'x', 'y', 'ap', 'bp', 'pile'];
type Sel = { load: number; type?: PileType; D?: number } | null;
type SetLoad = (id: number, fn: (l: FLoad) => void, msg?: string) => void;

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** Troca as cargas pelas novas, preservando (pelo nome do apoio) os campos de `keep` que o usuário já ajustou. */
function mergeLoads(d: FoundationData, incoming: FLoad[], keep: (keyof FLoad)[] = KEEP) {
  const old = new Map(d.loads.map((l) => [l.label, l]));
  d.loads = incoming.map((s) => { const o = old.get(s.label); const k: Partial<FLoad> = {}; if (o) for (const c of keep) if (o[c] !== undefined) (k as Record<string, unknown>)[c] = o[c]; return { ...s, ...k }; });
}

/** Cargas do módulo Edifícios (posição e seção do pilar vêm do edifício; tipo de fundação e sondagem ficam). */
export function importarCargasDoEdificio(loads: FLoad[]) {
  const st = useStore.getState();
  st.commit((m) => {
    const d = normalizeFoundation(clone(m.foundation ?? sampleFoundation()));
    mergeLoads(d, loads, ['kind', 'boringId', 'boringMode', 'boringIds', 'pile']);
    d.boring = d.borings![0];
    m.foundation = d;
  }, `${loads.length} pilar(es) importados do edifício (valores característicos).`);
}

export function Fundacoes() {
  const st = useStore();
  const a = useAnalysis();
  const edDim = useBuilding((s) => s.dim), edVelha = useBuilding((s) => s.revAnalise !== s.sessao.revCalculo);
  const f: FoundationData = useMemo(() => normalizeFoundation(clone(st.model.foundation ?? sampleFoundation())), [st.model.foundation]);
  const upd = (fn: (d: FoundationData) => void, msg?: string) => st.commit((m) => {
    const d = normalizeFoundation(clone(m.foundation ?? f));
    fn(d);
    d.boring = d.borings![0];
    m.foundation = d;
  }, msg);
  const setP = (p: Partial<FoundationParams>) => upd((d) => { d.params = { ...d.params, ...p }; });
  const setLoad: SetLoad = (id, fn, msg) => upd((d) => { const l = d.loads.find((x) => x.id === id); if (l) fn(l); }, msg);

  const borings = f.borings!;

  const designs = useMemo(() => f.loads.map((ld) => designSupport(ld, f)), [f]);
  const [sel, setSel] = useState<Sel>(null);
  const [saved, setSaved] = useState<LibraryItem[]>([]);
  useEffect(() => { listLibrary().then((r) => setSaved(r.items.filter((i) => i.kind === 'characteristics'))).catch(() => {}); }, []);

  const selDesign: SupportDesign | undefined = (sel ? designs.find((x) => x.load.id === sel.load) : undefined) ?? designs[0];
  const selPile: PileSolution | null = useMemo(() => {
    if (!selDesign || selDesign.kind !== 'estacas') return null;
    if (sel?.type && sel.D !== undefined && sel.load === selDesign.load.id) return selDesign.piles?.byType.find((t) => t.type === sel.type)?.diameters.find((d) => d.D === sel.D)?.best ?? selDesign.pile ?? null;
    return selDesign.pile ?? null;
  }, [sel, selDesign]);

  const importModel = () => {
    if (a.prep.error) { st.set({ message: 'O pórtico está instável: não há reações para importar.' }); return; }
    const ch = buildCharacteristics(st.model, getDesign(a));
    upd((d) => mergeLoads(d, ch.supports), `${ch.supports.length} apoio(s) importados do pórtico atual (valores característicos).`);
  };
  const importSaved = async (id: string) => {
    const e = await loadFromLibrary(id);
    if (!e) return;
    const ch = e.payload as SavedCharacteristics;
    upd((d) => mergeLoads(d, ch.supports.map((s, i) => ({ ...s, id: i + 1, source: e.name }))), `Cargas de “${e.name}” importadas.`);
  };

  const addBoring = (b?: Boring) => upd((d) => {
    const list = boringsOf(d);
    const id = Math.max(0, ...list.map((x) => x.id ?? 0)) + 1;
    d.borings = [...list, { id, name: `SP-${String(id).padStart(2, '0')}`, water: b?.water ?? null, endImpenetrable: false, meters: clone(b?.meters ?? []) }];
  }, 'Furo de sondagem adicionado (cópia do atual; edite os valores).');
  const removeBoring = (i: number) => upd((d) => {
    const gone = d.borings![i].id;
    d.borings!.splice(i, 1);
    for (const l of d.loads) if (l.boringId === gone) delete l.boringId;
  }, 'Furo de sondagem removido.');

  const p = f.params;
  // edifício com fundações lançadas: esta aba fica só para leitura (o dimensionamento está na aba Edifício)
  const elementos = useBuilding((s) => s.sessao.modelo.fundacao?.elementos.length ?? 0);
  const leitura = elementos > 0;
  return (
    <div className="fund-wrap">
      <div>
        <LigacaoEdificio />
        {leitura && <FundacoesDoEdificio />}
      </div>
    <fieldset className="fund" disabled={leitura} data-somente-leitura={leitura || undefined}>
      <Dock id="fundacoes-esq" lado="esq" rotulo="painel lateral esquerdo" padrao={440}>
      <aside className="fund-in">
        <SondagemEditor furos={borings} cutoff={p.cutoff} sol={(x) => (selDesign && selDesign.boring.id === x.id ? selPile : null)} onEdit={(i, fn, msg) => upd((d) => fn(d.borings![i]), msg)} onAdd={addBoring} onRemove={removeBoring}
          onMessage={(m) => st.set({ message: m })} media={{ depth: p.sptAvgDepth, water: p.sptAvgWater, onChange: setP }} />

        <Group title="Cargas por apoio (características)">
          <div className="row wrap">
            <Button onClick={importModel}>Importar do pórtico atual</Button>
            <Button disabled={!edDim?.fundacao.length} title={edDim ? (edVelha ? 'O edifício mudou depois do cálculo: as cargas são do último cálculo.' : 'Cargas do último cálculo do edifício.') : 'Calcule o edifício (aba Edifício › Análise) para importar.'} onClick={() => edDim && importarCargasDoEdificio(edDim.fundacao)}>Importar do edifício</Button>
            {saved.length > 0 && <Select value="" options={[{ v: '', label: 'Características salvas…' }, ...saved.map((s) => ({ v: s.id, label: s.name }))]} onChange={(id) => id && importSaved(id)} />}
          </div>
          <div className="tablewrap">
            <table className="loads-ed">
              <thead><tr><th>Apoio</th><th>N máx</th><th>N mín</th><th title="Parcela permanente (soma dos casos G). Vazio: adota-se N máx, a favor da segurança.">N perm</th><th>Hx</th><th>Hy</th><th>Mx</th><th>My</th><th /></tr></thead>
              <tbody>
                {f.loads.map((l, i) => (
                  <tr key={l.id}>
                    <td><Input value={l.label} aria-label="Apoio" onChange={(e) => upd((d) => { d.loads[i].label = e.target.value; })} /></td>
                    {(['Nk', 'NkMin', 'NkPerm', 'Hx', 'Hy', 'Mx', 'My'] as (keyof FLoad)[]).map((k) => (
                      <td key={k}>{k === 'NkPerm'
                        ? <OptNumCell value={l.NkPerm} placeholder={fmt(l.Nk, 0)} onChange={(v) => upd((d) => { if (v === undefined) delete d.loads[i].NkPerm; else d.loads[i].NkPerm = v; })} />
                        : <NumCell value={l[k] as number} onChange={(v) => upd((d) => { (d.loads[i][k] as number) = v; })} />}</td>
                    ))}
                    <td><Button variant="x" aria-label="Remover apoio" onClick={() => upd((d) => { d.loads.splice(i, 1); })}>×</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="mini" onClick={() => upd((d) => { const id = Math.max(0, ...d.loads.map((x) => x.id)) + 1; d.loads.push({ id, label: `P${id}`, Nk: 500, NkMin: 300, Hx: 0, Hy: 0, Mx: 0, My: 0 }); })}>+ apoio</Button>
          <Hint>kN e kN·m, valores característicos no topo da fundação. N mín negativo indica tração. N perm é a parcela permanente (casos G); ela entra com γf = {fmt(p.gammaFfav, 1)} em Nd,mín, e o alívio variável (N perm − N mín) e o binário do momento com γf = {fmt(p.gammaF, 1)}. Vazio: adota-se N perm = N máx (a favor da segurança). Do pórtico 2D: X = Rx, My = Mz; direção Y livre para você completar. Tipo de fundação, furo, pilar e coordenadas ficam no cartão de cada apoio.</Hint>
        </Group>

        <Premissas p={p} setP={setP} reset={() => upd((d) => { d.params = defaultFoundationParams(); }, 'Premissas restauradas.')} />
      </aside>
      </Dock>

      <section className="fund-out">
        {designs.length === 0 && <p className="hint">Lance as cargas dos apoios para dimensionar.</p>}
        {designs.map((ds) => <SupportCard key={ds.load.id} ds={ds} f={f} sel={sel} setSel={setSel} setLoad={setLoad} active={selDesign?.load.id === ds.load.id} />)}
        {selDesign && selDesign.kind === 'estacas' && selPile && <SolutionDetail s={selPile} ds={selDesign} f={f} setLoad={setLoad} />}
        {selDesign && selDesign.kind === 'sapata' && selDesign.footing && (
          <div className="fdetail">
            <h3>{selDesign.load.label} · sapata{isFooting(selDesign.footing) ? ` ${fmt(selDesign.footing.A * 100, 0)} × ${fmt(selDesign.footing.B * 100, 0)} × ${fmt(selDesign.footing.h * 100, 0)} cm` : ''} · furo {selDesign.boring.name}</h3>
            {isFooting(selDesign.footing) ? <FootingDetail r={selDesign.footing} ap={selDesign.ap} bp={selDesign.bp} p={p} /> : selDesign.footing.messages.map((m, i) => <Note tone="bad" key={i}>{m}</Note>)}
          </div>
        )}
        {selDesign && selDesign.kind === 'tubulao' && selDesign.caisson && (
          <div className="fdetail">
            <h3>{selDesign.load.label} · tubulão a céu aberto · furo {selDesign.boring.name}</h3>
            {isCaisson(selDesign.caisson) ? <CaissonDetail r={selDesign.caisson} water={selDesign.boring.water} p={p} /> : selDesign.caisson.messages.map((m, i) => <Note tone="bad" key={i}>{m}</Note>)}
          </div>
        )}
      </section>
    </fieldset>
    </div>
  );
}

function SupportCard({ ds, f, sel, setSel, setLoad, active }: { ds: SupportDesign; f: FoundationData; sel: Sel; setSel: (s: Sel) => void; setLoad: SetLoad; active: boolean }) {
  const ld = ds.load, p = f.params;
  const borings = f.borings!;
  const r = ds.piles;
  return (
    <div className={`fcard${active ? ' on' : ''}`}>
      <div className="fcard-h">
        <b>{ld.label}</b>
        <span className="muted">N {fmt(ld.Nk, 0)} / {fmt(ld.NkMin, 0)} kN · H {fmt(Math.hypot(ld.Hx, ld.Hy), 1)} kN · M {fmt(Math.hypot(ld.Mx, ld.My), 1)} kN·m · furo {ds.boring.name} ({ds.boringChoice})</span>
      </div>
      <div className="row wrap fctl">
        <Select label="Fundação" value={ds.kind} options={KINDS.map((k) => ({ v: k, label: KIND_LABEL[k] }))} onChange={(v) => { setLoad(ld.id, (l) => { if (v === 'estacas') delete l.kind; else l.kind = v; }); setSel({ load: ld.id }); }} />
        <Select label="Sondagem" value={ld.boringMode === 'average' ? (ld.boringIds?.length ? -2 : -1) : ld.boringId ?? 0} options={[{ v: 0, label: 'Automático' }, ...borings.map((x) => ({ v: x.id!, label: x.name })), ...(borings.length > 1 ? [{ v: -1, label: 'Média de todos os furos' }, { v: -2, label: 'Média dos furos escolhidos' }] : [])]} onChange={(v) => setLoad(ld.id, (l) => {
          if (v < 0) { l.boringMode = 'average'; delete l.boringId; if (v === -1) delete l.boringIds; else l.boringIds = l.boringIds?.length ? l.boringIds : borings.map((x) => x.id!); }
          else { delete l.boringMode; delete l.boringIds; if (!v) delete l.boringId; else l.boringId = v; }
        })} />
        <NumField label="Pilar a (x)" unit="cm" width={92} value={ds.ap * 100} onChange={(v) => setLoad(ld.id, (l) => { l.ap = Math.max(0.1, v / 100); })} />
        <NumField label="b (y)" unit="cm" width={80} value={ds.bp * 100} onChange={(v) => setLoad(ld.id, (l) => { l.bp = Math.max(0.1, v / 100); })} />
        <OptNumField label="x" unit="m" width={72} value={ld.x} onChange={(v) => setLoad(ld.id, (l) => { if (v === undefined) delete l.x; else l.x = v; })} />
        <OptNumField label="y" unit="m" width={72} value={ld.y} onChange={(v) => setLoad(ld.id, (l) => { if (v === undefined) delete l.y; else l.y = v; })} />
      </div>
      {ld.boringMode === 'average' && ld.boringIds?.length ? (
        <div className="chips">
          <span className="muted small">Furos da média:</span>
          {borings.map((x) => {
            const on = ld.boringIds!.includes(x.id!);
            return <Chip key={x.id} on={on} aria-pressed={on} onClick={() => setLoad(ld.id, (l) => { const s = new Set(l.boringIds ?? []); if (on) s.delete(x.id!); else s.add(x.id!); l.boringIds = [...s]; if (!l.boringIds.length) l.boringIds = [x.id!]; })}>{x.name}</Chip>;
          })}
        </div>
      ) : null}
      {ds.kind === 'estacas' && r && (
        <>
          <div className="fsum">
            {r.byType.map((t) => (
              <Button variant="fpick" key={t.type} className={sel?.load === ld.id && sel.type === t.type && t.recommended && sel.D === Math.round(t.recommended.D * 100) ? ' on' : ''} onClick={() => t.recommended && setSel({ load: ld.id, type: t.type, D: Math.round(t.recommended.D * 100) })}>
                <span className="ftype">{PILE_LABEL[t.type]}</span>
                {t.recommended ? <b>{t.recommended.n} × Ø{Math.round(t.recommended.D * 100)} · L = {t.recommended.L} m</b> : <b className="bad">sem solução</b>}
                {t.recommended && recommendedOption(t.recommended.struct.options) && <span className="muted">{recommendedOption(t.recommended.struct.options)!.n} φ{phiTxt(recommendedOption(t.recommended.struct.options)!.phi)} em {fmt(t.recommended.struct.armedLength, 1)} m · espiral φ{p.stirrupPhi} c/{Math.round(p.stirrupS * 100)}</span>}
                {t.recommended && t.type === 'premoldada' && <span className="muted">armadura de fábrica</span>}
              </Button>
            ))}
          </div>
          {ds.pile && ds.cap && (
            <div className="fadopt">
              <Pill tone="na">{ds.pileAdopted ? 'adotada' : 'recomendada'}</Pill>
              <Pill tone={ds.cap.ok ? 'ok' : 'bad'}>{ds.cap.ok ? 'bloco atende' : 'bloco não atende'}</Pill>
              <span>{PILE_LABEL[ds.pile.type].split(' ')[0]} Ø{Math.round(ds.pile.D * 100)} · {ds.pile.n} estaca{ds.pile.n > 1 ? 's' : ''} · L {ds.pile.L} m · bloco {fmt(ds.cap.lx * 100, 0)} × {fmt(ds.cap.ly * 100, 0)} × {fmt(ds.cap.h * 100, 0)} cm{ds.cap.ties[0]?.bars ? ` · tirante ${barTxt(ds.cap.ties[0].bars, false)}` : ''}</span>
              <Button variant="mini" onClick={() => setSel({ load: ld.id, type: ds.pile!.type, D: Math.round(ds.pile!.D * 100) })}>ver bloco</Button>
            </div>
          )}
          <details>
            <summary>Todos os diâmetros</summary>
            <div className="tablewrap">
              <table className="data">
                <thead><tr><th className="l">Tipo</th><th>Ø</th><th>Estacas</th><th>L (m)</th><th>Padm</th><th>N/estaca</th><th>Aço</th><th className="l">Observação</th></tr></thead>
                <tbody>
                  {r.byType.flatMap((t) => t.diameters.map((d) => (
                    <tr key={`${t.type}-${d.D}`} className={d.best ? 'click' : 'dimrow'} onClick={() => d.best && setSel({ load: ld.id, type: t.type, D: d.D })}>
                      <td className="l">{PILE_LABEL[t.type].split(' ')[0]}</td><td>{d.D}</td>
                      {d.best ? (<><td>{d.best.n}</td><td>{d.best.L}</td><td>{fmt(d.best.cap.Padm, 0)}</td><td>{fmt(d.best.loads.Nmax, 0)}</td><td>{d.best.struct.options.length ? `${fmt(d.best.steelKg, 0)} kg` : '—'}</td><td className="l">{[t.recommended === d.best ? 'recomendada' : '', ds.pile === d.best ? 'adotada no bloco' : ''].filter(Boolean).join(' · ')}</td></>)
                        : (<><td colSpan={5}>—</td><td className="l muted">{d.reason}</td></>)}
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
      {ds.kind === 'sapata' && ds.footing && (
        <Button variant="fpick" className={active ? ' on' : ''} onClick={() => setSel({ load: ld.id })}>
          <span className="ftype">Sapata isolada</span>
          {isFooting(ds.footing) ? <>
            <b>{fmt(ds.footing.A * 100, 0)} × {fmt(ds.footing.B * 100, 0)} cm · h {fmt(ds.footing.h * 100, 0)} cm ({ds.footing.kind === 'rigida' ? 'rígida' : 'flexível'})</b>
            <span className="muted">σadm {fmt(ds.footing.sigmaAdm, 0)} kPa ({ds.footing.sigmaSrc.startsWith('estimada') ? 'SPT, a confirmar' : 'informada'}) · A: {barTxt(ds.footing.flex.x.bars)} · B: {barTxt(ds.footing.flex.y.bars)}{ds.footing.ok ? '' : ' · com pendências'}</span>
          </> : <b className="bad">{ds.footing.messages[0]}</b>}
        </Button>
      )}
      {ds.kind === 'tubulao' && ds.caisson && (
        <Button variant="fpick" className={active ? ' on' : ''} onClick={() => setSel({ load: ld.id })}>
          <span className="ftype">Tubulão a céu aberto</span>
          {isCaisson(ds.caisson) ? <>
            <b>Fuste Ø{fmt(ds.caisson.Df * 100, 0)} · base Ø{fmt(ds.caisson.Db * 100, 0)} · cota {fmt(ds.caisson.depth, 1)} m</b>
            <span className="muted">σadm {fmt(ds.caisson.sigmaAdm, 0)} kPa ({ds.caisson.sigmaSrc.startsWith('estimada') ? 'SPT, a confirmar' : 'informada'}) · H {fmt(ds.caisson.H * 100, 0)} cm · {fmt(ds.caisson.volume, 2)} m³</span>
          </> : <b className="bad">{ds.caisson.messages[0]}</b>}
        </Button>
      )}
    </div>
  );
}

const Row = ({ children }: { children: ReactNode }) => <div className="row">{children}</div>;

function Premissas({ p, setP, reset }: { p: FoundationParams; setP: (x: Partial<FoundationParams>) => void; reset: () => void }) {
  return (
    <>
      <Group title="Premissas — estacas" open={false}>
        <div className="row wrap">
          {(['helice', 'escavada', 'premoldada'] as PileType[]).map((t) => (
            <Check key={t} label={PILE_LABEL[t]} checked={p.types.includes(t)} onChange={(v) => setP({ types: v ? [...p.types, t] : p.types.filter((x) => x !== t) })} />
          ))}
        </div>
        <TextField label="Diâmetros moldadas in loco (cm)" value={p.diameters.join(', ')} onChange={(v) => setP({ diameters: v.split(/[,;\s]+/).map(Number).filter((x) => x > 0) })} />
        <TextField label="Diâmetros pré-moldadas (cm, catálogo)" value={p.precastDiameters.join(', ')} onChange={(v) => setP({ precastDiameters: v.split(/[,;\s]+/).map(Number).filter((x) => PRECAST_CATALOG[x]) })} />
        <Row>
          <NumField label="Cota de arrasamento" unit="m" value={p.cutoff} onChange={(v) => setP({ cutoff: Math.max(0, v) })} />
          <NumField label="Comprimento mínimo" unit="m" value={p.minLength} onChange={(v) => setP({ minLength: Math.max(1, v) })} />
        </Row>
        <Row>
          <NumField label="Peso do bloco" unit="% de N" value={p.blockWeightPct} onChange={(v) => setP({ blockWeightPct: v })} />
          <NumField label="Espaç. moldadas" unit="×φ" value={p.spacingInSitu} onChange={(v) => setP({ spacingInSitu: v })} />
          <NumField label="Espaç. pré-mold." unit="×φ" value={p.spacingPrecast} onChange={(v) => setP({ spacingPrecast: v })} />
        </Row>
        <Row>
          <NumField label="Hélice: prof. máx." unit="m" value={p.hcMaxDepth} onChange={(v) => setP({ hcMaxDepth: v })} />
          <NumField label="Pré-moldada: N de parada" value={p.precastStopN} onChange={(v) => setP({ precastStopN: v })} />
          <NumField label="Escavada: N do trado" value={p.augerStopN} onChange={(v) => setP({ augerStopN: v })} />
        </Row>
        <Row>
          <Select label="CAA (Tabela 4)" value={p.caa} options={[{ v: 'I-II', label: 'I-II' }, { v: 'III-IV', label: 'III-IV' }]} onChange={(v) => setP({ caa: v })} />
          <NumField label="Cobrimento" unit="cm" value={p.cover * 100} onChange={(v) => setP({ cover: v / 100 })} />
          <NumField label="nh argila média" unit="MN/m³" value={p.nhClay} onChange={(v) => setP({ nhClay: v })} />
        </Row>
        <Row>
          <NumField label="Estribo espiral φ" unit="mm" value={p.stirrupPhi} onChange={(v) => setP({ stirrupPhi: v })} />
          <NumField label="passo" unit="cm" value={p.stirrupS * 100} onChange={(v) => setP({ stirrupS: v / 100 })} />
          <NumField label="1 m³ equivale a" unit="kg aço" value={p.steelPerM3} onChange={(v) => setP({ steelPerM3: v })} />
        </Row>
        <Row>
          <NumField label="γf desfavorável" value={p.gammaF} onChange={(v) => setP({ gammaF: v })} />
          <NumField label="γf permanente favorável" value={p.gammaFfav} onChange={(v) => setP({ gammaFfav: v })} />
        </Row>
        <Hint>Hélice: C{STRUCT.helice[p.caa].fck}, γc {STRUCT.helice[p.caa].gc}, σ sem armar {STRUCT.helice.sigmaLim} MPa, armadura mínima {STRUCT.helice.Lmin} m. Escavada: C{STRUCT.escavada[p.caa].fck}, γc {STRUCT.escavada[p.caa].gc}, {STRUCT.escavada.sigmaLim} MPa, {STRUCT.escavada.Lmin} m. As,mín 0,4%. N de parada da pré-moldada é estimativa: confirme com nega e repique na cravação. A solução escolhida minimiza concreto das estacas + bloco estimado + aço convertido pela equivalência acima. O cobrimento vale também para blocos, sapatas e tubulões.</Hint>
      </Group>

      <Group title="Premissas — pilar e concreto" open={false}>
        <Row>
          <NumField label="Pilar padrão a (x)" unit="cm" value={p.colA * 100} onChange={(v) => setP({ colA: Math.max(0.1, v / 100) })} />
          <NumField label="b (y)" unit="cm" value={p.colB * 100} onChange={(v) => setP({ colB: Math.max(0.1, v / 100) })} />
          <NumField label="φ do pilar" unit="mm" value={p.colPhi} onChange={(v) => setP({ colPhi: v })} />
        </Row>
        <Row>
          <NumField label="fck blocos/sapatas" unit="MPa" value={p.fckFound} onChange={(v) => setP({ fckFound: v })} />
          <NumField label="γc" value={p.gammaC} onChange={(v) => setP({ gammaC: v })} />
          <NumField label="γs" value={p.gammaS} onChange={(v) => setP({ gammaS: v })} />
          <NumField label="fyk" unit="MPa" value={p.fyk} onChange={(v) => setP({ fyk: v })} />
        </Row>
        <Hint>O pilar padrão vale para apoios sem seção informada (na importação do pórtico, vem da seção retangular da barra ligada ao apoio). O φ do pilar define o comprimento de ancoragem lb (NBR 6118 9.4.2.4, boa aderência, sem gancho), que limita a altura mínima de blocos e sapatas: informe a bitola real.</Hint>
      </Group>

      <Group title="Premissas — blocos de coroamento" open={false}>
        <Row>
          <NumField label="θ mín" unit="°" value={p.capThetaMin} onChange={(v) => setP({ capThetaMin: v })} />
          <NumField label="θ máx" unit="°" value={p.capThetaMax} onChange={(v) => setP({ capThetaMax: v })} />
          <NumField label="Borda além da estaca" unit="cm" value={p.capEdge * 100} onChange={(v) => setP({ capEdge: v / 100 })} />
        </Row>
        <div className="tbcrow"><span>Limites das bielas K·KR·fcd (Blévot)</span><Tbc /></div>
        <Row>
          <NumField label="K 2 est." value={p.capK2} onChange={(v) => setP({ capK2: v })} />
          <NumField label="K 3" value={p.capK3} onChange={(v) => setP({ capK3: v })} />
          <NumField label="K 4" value={p.capK4} onChange={(v) => setP({ capK4: v })} />
        </Row>
        <Row>
          <NumField label="K 5" value={p.capK5} onChange={(v) => setP({ capK5: v })} />
          <NumField label="K 6" value={p.capK6} onChange={(v) => setP({ capK6: v })} />
          <NumField label="KR" value={p.capKR} onChange={(v) => setP({ capKR: v })} />
        </Row>
        <Row>
          <NumField label="d′ mínimo" unit="cm" value={p.capDprime * 100} onChange={(v) => setP({ capDprime: v / 100 })} />
          <NumField label="Faixa sobre estaca" unit="×D" value={p.capBand} onChange={(v) => setP({ capBand: v })} />
          <NumField label="Malha / principal" unit="%" value={p.capDistRatio * 100} onChange={(v) => setP({ capDistRatio: v / 100 })} />
        </Row>
        <Row>
          <NumField label="Suspensão se s >" unit="×D" value={p.capSuspFactor} onChange={(v) => setP({ capSuspFactor: v })} />
          <NumField label="Pele (2 estacas)" unit="% b·h" value={p.capSkinRatio * 100} onChange={(v) => setP({ capSkinRatio: v / 100 })} />
          <NumField label="1 estaca: h / lado" value={p.cap1Ratio} onChange={(v) => setP({ cap1Ratio: v })} />
        </Row>
        <Hint>K = 1,4 / 1,75 / 2,1 para 2 / 3 / 4 estacas (Blévot, como nos livros-texto); 5 e 6 estacas por extensão do valor de 4; KR = 0,90 (efeito Rüsch, faixa usual 0,90–0,95). Todos a confirmar, inclusive a referência (Blévot, Fusco ou NBR 6118 22.7). d′ ≥ máx(valor acima; lado da estaca quadrada equivalente/5). Faixa de 1,2D, malha de 20% e suspensão Nd/(1,5·n·fyd) são valores de livro-texto, a confirmar.</Hint>
      </Group>

      <Group title="Premissas — sapatas" open={false}>
        <Row>
          <Select label="σadm do solo" value={p.ftSigmaMode} options={[{ v: 'spt', label: 'Estimada pelo SPT' }, { v: 'informada', label: 'Informada' }]} onChange={(v) => setP({ ftSigmaMode: v })} />
          <NumField label="σadm informada" unit="kPa" value={p.ftSigmaAdm} disabled={p.ftSigmaMode !== 'informada'} onChange={(v) => setP({ ftSigmaAdm: v })} />
        </Row>
        {p.ftSigmaMode === 'spt' && <div className="tbcrow"><span>σadm ≈ N̄/{fmt(p.ftSptDiv, 0)} MPa (regra empírica)</span><Tbc /></div>}
        <Row>
          <NumField label="Divisor de N̄" value={p.ftSptDiv} onChange={(v) => setP({ ftSptDiv: v })} />
          <NumField label="N̄ máximo" value={p.ftNmaxEst} onChange={(v) => setP({ ftNmaxEst: v })} />
          <NumField label="Bulbo" unit="× lado" value={p.ftBulb} onChange={(v) => setP({ ftBulb: v })} />
        </Row>
        <Row>
          <NumField label="Cota de apoio" unit="m" value={p.ftDepth} onChange={(v) => setP({ ftDepth: v })} />
          <NumField label="Peso próprio + solo" unit="% N" value={p.ftPP} onChange={(v) => setP({ ftPP: v })} />
          <NumField label="γ solo" unit="kN/m³" value={p.gammaSoil} onChange={(v) => setP({ gammaSoil: v })} />
        </Row>
        <Row>
          <NumField label="σmáx ≤ fator·σadm" value={p.ftEdgeFactor} onChange={(v) => setP({ ftEdgeFactor: v })} />
          <NumField label="Área comprimida mín." unit="%" value={Math.round(p.ftMinCompressed * 1000) / 10} onChange={(v) => setP({ ftMinCompressed: v / 100 })} />
          <NumField label="A/B máx." value={p.ftMaxRatio} onChange={(v) => setP({ ftMaxRatio: v })} />
        </Row>
        <Row>
          <Select label="Tipo" value={p.ftKind} options={[{ v: 'rigida', label: 'Rígida' }, { v: 'flexivel', label: 'Flexível' }]} onChange={(v) => setP({ ftKind: v })} />
          <Select label="Flexão" value={p.ftMethod} options={[{ v: 'ceb70', label: 'CEB-70' }, { v: 'bielas', label: 'Bielas (só rígida)' }]} onChange={(v) => setP({ ftMethod: v })} />
        </Row>
        <Row>
          <NumField label="ρ mín." unit="%" value={p.ftRhoMin * 100} onChange={(v) => setP({ ftRhoMin: v / 100 })} />
          <NumField label="h0 mín." unit="cm" value={p.ftH0Min * 100} onChange={(v) => setP({ ftH0Min: v / 100 })} />
        </Row>
        <Hint>Planta em passos de 5 cm, lado mínimo 60 cm, balanços iguais quando possível. Base sem tração; σmáx ≤ fator·σadm; área comprimida ≥ 2/3 (a confirmar o item da NBR 6122). Rígida: h ≥ (a − ap)/3 (NBR 6118 22.6.1) e h ≥ lb + c; h0 ≥ máx(h/3; 20 cm) (prática usual). Flexível: punção em C e C′ (19.5). ρmín 0,15% (Tab. 17.3, a confirmar para sapatas). Peso próprio: o maior entre o percentual e o peso do concreto calculado; σadm tratada como líquida (o solo sobre a sapata é só informado): a confirmar.</Hint>
      </Group>

      <Group title="Premissas — tubulões" open={false}>
        <Row>
          <Select label="σadm na base" value={p.tbSigmaMode} options={[{ v: 'spt', label: 'Estimada pelo SPT' }, { v: 'informada', label: 'Informada' }]} onChange={(v) => setP({ tbSigmaMode: v })} />
          <NumField label="σadm informada" unit="kPa" value={p.tbSigmaAdm} disabled={p.tbSigmaMode !== 'informada'} onChange={(v) => setP({ tbSigmaAdm: v })} />
        </Row>
        {p.tbSigmaMode === 'spt' && <div className="tbcrow"><span>σadm ≈ N̄/{fmt(p.tbSptDiv, 0)} MPa (regra empírica)</span><Tbc /></div>}
        <Row>
          <NumField label="Divisor de N̄" value={p.tbSptDiv} onChange={(v) => setP({ tbSptDiv: v })} />
          <NumField label="N̄ máximo" value={p.tbNmaxEst} onChange={(v) => setP({ tbNmaxEst: v })} />
          <NumField label="Cota da base (0 = auto)" unit="m" value={p.tbDepth} onChange={(v) => setP({ tbDepth: Math.max(0, v) })} />
        </Row>
        <Row>
          <NumField label="Cota mínima" unit="m" value={p.tbMinDepth} onChange={(v) => setP({ tbMinDepth: v })} />
          <NumField label="Fuste mín." unit="cm" value={p.tbDfMin * 100} onChange={(v) => setP({ tbDfMin: v / 100 })} />
          <NumField label="Base máx." unit="cm" value={p.tbDbMax * 100} onChange={(v) => setP({ tbDbMax: v / 100 })} />
        </Row>
        <Row>
          <NumField label="fck fuste" unit="MPa" value={p.tbFck} onChange={(v) => setP({ tbFck: v })} />
          <NumField label="γc fuste" value={p.tbGc} onChange={(v) => setP({ tbGc: v })} />
          <NumField label="H base máx." unit="cm" value={p.tbHmax * 100} onChange={(v) => setP({ tbHmax: v / 100 })} />
          <NumField label="Rodapé" unit="cm" value={p.tbRodape * 100} onChange={(v) => setP({ tbRodape: v / 100 })} />
        </Row>
        <Check label="Somar o peso próprio do tubulão na base" checked={p.tbWeight} onChange={(v) => setP({ tbWeight: v })} />
        <Hint>Fuste de concreto simples: γf·N/Af ≤ 0,85·fck/γc (C25 e γc 1,6: a confirmar). Base: Ab = (N + peso)/σadm, altura 0,866·(Db − Df) (60°) + rodapé, H ≤ 1,8 m (prática, a confirmar). Céu aberto: base acima do nível d'água. Cota automática: a de menor volume entre a cota mínima e o NA. Bulbo para N̄ igual ao das sapatas.</Hint>
        <Button variant="ghost" onClick={reset}>Restaurar padrões (todas as premissas)</Button>
      </Group>
    </>
  );
}



