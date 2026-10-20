import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStore } from './store';
import { useBuilding } from './edificio/store';
import { Check, Group, Hint, NumField, Select, TextField } from './ui';
import { fmt, getDesign, useAnalysis } from './results';
import { buildCharacteristics } from './Library';
import { listLibrary, loadFromLibrary, type LibraryItem, type SavedCharacteristics } from './storage';
import {
  KIND_LABEL, PILE_LABEL, PRECAST_CATALOG, SOIL_LABEL, STRUCT, boringsOf, capacityCurve, defaultFoundationParams, normalizeFoundation, recommendedOption, sampleFoundation,
  type Boring, type FLoad, type FoundationData, type FoundationKind, type FoundationParams, type PileSolution, type PileType, type SoilClass,
} from '../core/piles';
import { capFor, designSupport, type SupportDesign } from '../core/foundation';
import { isFooting } from '../core/footings';
import { isCaisson } from '../core/caissons';
import { CaissonDetail, CapDetail, FootingDetail, Tbc, barTxt, phiTxt } from './FundacoesDetail';

const SOILS = Object.keys(SOIL_LABEL) as SoilClass[];
const SOIL_COLOR: Record<SoilClass, string> = { argila: '#b0764a', silteArgiloso: '#c9a36b', silteArenoso: '#d8c27a', areia: '#e6d58f' };
const KINDS = Object.keys(KIND_LABEL) as FoundationKind[];
/** Campos por apoio preservados ao reimportar cargas (casados pelo nome do apoio). */
const KEEP: (keyof FLoad)[] = ['kind', 'boringId', 'boringMode', 'boringIds', 'x', 'y', 'ap', 'bp', 'pile'];
type Sel = { load: number; type?: PileType; D?: number } | null;
type SetLoad = (id: number, fn: (l: FLoad) => void, msg?: string) => void;

function parseSoil(t: string): SoilClass {
  const s = t.toLowerCase();
  if (s.includes('silte') && s.includes('are')) return 'silteArenoso';
  if (s.includes('silte')) return 'silteArgiloso';
  if (s.startsWith('are') || s.includes('areia')) return 'areia';
  return 'argila';
}

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
  const edDim = useBuilding((s) => s.dim), edVelha = useBuilding((s) => s.revAnalise !== s.sessao.rev);
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
  const [bi, setBi] = useState(0);
  const bIdx = Math.min(bi, borings.length - 1);
  const b = borings[bIdx];
  const updB = (fn: (x: Boring) => void, msg?: string) => upd((d) => fn(d.borings![bIdx]), msg);

  const designs = useMemo(() => f.loads.map((ld) => designSupport(ld, f)), [f]);
  const [sel, setSel] = useState<Sel>(null);
  const [paste, setPaste] = useState('');
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
  const applyPaste = () => {
    const rows = paste.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => l.split(/[;\t,]+|\s{2,}/).map((x) => x.trim()));
    const meters = rows.map((r) => {
      const nums = r.map((x) => parseFloat(x.replace(',', '.'))).filter((x) => Number.isFinite(x));
      const N = nums.length >= 2 ? nums[1] : nums[0];
      const soilTxt = r.find((x) => /[a-zA-Z]/.test(x)) ?? '';
      return { N: Math.max(0, Math.round(N ?? 0)), soil: soilTxt ? parseSoil(soilTxt) : 'argila' as SoilClass };
    }).filter((m) => Number.isFinite(m.N));
    if (!meters.length) { st.set({ message: 'Nada reconhecido. Cole uma linha por metro: “N” ou “prof; N; solo”.' }); return; }
    updB((x) => { x.meters = meters; }, `${meters.length} metros de SPT colados em ${b.name}.`);
    setPaste('');
  };
  const addBoring = () => {
    upd((d) => {
      const list = boringsOf(d);
      const id = Math.max(0, ...list.map((x) => x.id ?? 0)) + 1;
      d.borings = [...list, { id, name: `SP-${String(id).padStart(2, '0')}`, water: b.water, endImpenetrable: false, meters: clone(b.meters) }];
    }, 'Furo de sondagem adicionado (cópia do atual; edite os valores).');
    setBi(borings.length);
  };
  const removeBoring = () => {
    upd((d) => {
      const gone = d.borings![bIdx].id;
      d.borings!.splice(bIdx, 1);
      for (const l of d.loads) if (l.boringId === gone) delete l.boringId;
    }, 'Furo de sondagem removido.');
    setBi(0);
  };

  const p = f.params;
  return (
    <div className="fund">
      <aside className="fund-in">
        <Group title={`Sondagens SPT (${borings.length})`}>
          <div className="row wrap">
            <Select label="Furo" value={bIdx} options={borings.map((x, i) => ({ v: i, label: `${x.name}${x.x !== undefined && x.y !== undefined ? ` (${fmt(x.x, 1)}; ${fmt(x.y, 1)})` : ''}` }))} onChange={(v) => setBi(v)} />
            <button type="button" className="mini" onClick={addBoring}>+ furo</button>
            {borings.length > 1 && <button type="button" className="mini" onClick={removeBoring}>remover furo</button>}
          </div>
          <div className="row">
            <TextField label="Identificação" value={b.name} onChange={(v) => updB((x) => { x.name = v; })} />
            <NumField label="Nível d'água" unit="m" value={b.water ?? 0} onChange={(v) => updB((x) => { x.water = v > 0 ? v : null; })} />
          </div>
          <div className="row">
            <OptField label="x do furo" unit="m" value={b.x} onChange={(v) => updB((x) => { if (v === undefined) delete x.x; else x.x = v; })} />
            <OptField label="y do furo" unit="m" value={b.y} onChange={(v) => updB((x) => { if (v === undefined) delete x.y; else x.y = v; })} />
          </div>
          <Check label="Sondagem terminou em impenetrável" checked={b.endImpenetrable} onChange={(v) => updB((x) => { x.endImpenetrable = v; })} />
          <div className="spt">
            <div className="spt-table">
              <div className="spt-h"><span>m</span><span>N</span><span>Solo</span><span /><span /></div>
              {b.meters.map((m, i) => (
                <div className={`spt-r${b.water !== null && i + 1 > b.water ? ' wet' : ''}${m.excluded ? ' excl' : ''}`} key={i} title={m.excluded ? 'Leitura descartada: fica fora da média e é interpolada no furo isolado' : undefined}>
                  <span className="muted">{i + 1}</span>
                  <input aria-label={`N no metro ${i + 1}`} value={m.N} inputMode="numeric" onChange={(e) => { const v = parseInt(e.target.value || '0', 10); if (Number.isFinite(v)) updB((x) => { x.meters[i].N = v; }); }} />
                  <select aria-label={`Solo no metro ${i + 1}`} value={m.soil} onChange={(e) => updB((x) => { x.meters[i].soil = e.target.value as SoilClass; })}>
                    {SOILS.map((s) => <option key={s} value={s}>{SOIL_LABEL[s]}</option>)}
                  </select>
                  <button type="button" className={`x${m.excluded ? ' on' : ''}`} aria-label={m.excluded ? `Voltar a usar a leitura do metro ${i + 1}` : `Descartar a leitura do metro ${i + 1}`} title={m.excluded ? 'Voltar a usar esta leitura' : 'Descartar esta leitura (fora do padrão)'} onClick={() => updB((x) => { if (x.meters[i].excluded) delete x.meters[i].excluded; else x.meters[i].excluded = true; }, m.excluded ? `Leitura do metro ${i + 1} volta ao cálculo.` : `Leitura do metro ${i + 1} descartada.`)}>⊘</button>
                  <button type="button" className="x" aria-label="Remover metro" onClick={() => updB((x) => { x.meters.splice(i, 1); })}>×</button>
                </div>
              ))}
              <button type="button" className="mini" onClick={() => updB((x) => { const last = x.meters.at(-1) ?? { N: 10, soil: 'argila' as SoilClass }; x.meters.push({ ...last }); })}>+ metro</button>
            </div>
            <SptChart b={b} cutoff={p.cutoff} sol={selDesign && selDesign.boring.id === b.id ? selPile : null} />
          </div>
          <label className="field" htmlFor="sptpaste"><span className="flabel">Colar do boletim (uma linha por metro: “N” ou “prof; N; solo”)</span>
            <textarea id="sptpaste" rows={3} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'1; 4; argila\n2; 6; silte argiloso'} />
          </label>
          <button type="button" className="btn ghost" disabled={!paste.trim()} onClick={applyPaste}>Substituir SPT deste furo pelo texto colado</button>
          <Hint>Cada apoio usa o furo escolhido no seu cartão; em “automático”, o mais próximo quando apoio e furos têm coordenadas, senão o primeiro. Também é possível usar a média de todos os furos ou de alguns. ⊘ descarta uma leitura fora do padrão: na média, o metro usa só os demais furos; no furo isolado, a leitura é interpolada entre as vizinhas.</Hint>
          {borings.length > 1 && (
            <div className="row">
              <Select label="Média: profundidade" value={p.sptAvgDepth} options={[{ v: 'common', label: 'comum a todos os furos' }, { v: 'max', label: 'até o furo mais profundo' }]} onChange={(v) => setP({ sptAvgDepth: v })} />
              <Select label="Média: nível d'água" value={p.sptAvgWater} options={[{ v: 'shallowest', label: 'o mais raso' }, { v: 'mean', label: 'média dos furos' }]} onChange={(v) => setP({ sptAvgWater: v })} />
            </div>
          )}
        </Group>

        <Group title="Cargas por apoio (características)">
          <div className="row wrap">
            <button type="button" className="btn" onClick={importModel}>Importar do pórtico atual</button>
            <button type="button" className="btn" disabled={!edDim?.fundacao.length} title={edDim ? (edVelha ? 'O edifício mudou depois do cálculo: as cargas são do último cálculo.' : 'Cargas do último cálculo do edifício.') : 'Calcule o edifício (aba Edifício › Análise) para importar.'} onClick={() => edDim && importarCargasDoEdificio(edDim.fundacao)}>Importar do edifício</button>
            {saved.length > 0 && <Select value="" options={[{ v: '', label: 'Características salvas…' }, ...saved.map((s) => ({ v: s.id, label: s.name }))]} onChange={(id) => id && importSaved(id)} />}
          </div>
          <div className="tablewrap">
            <table className="loads-ed">
              <thead><tr><th>Apoio</th><th>N máx</th><th>N mín</th><th title="Parcela permanente (soma dos casos G). Vazio: adota-se N máx, a favor da segurança.">N perm</th><th>Hx</th><th>Hy</th><th>Mx</th><th>My</th><th /></tr></thead>
              <tbody>
                {f.loads.map((l, i) => (
                  <tr key={l.id}>
                    <td><input value={l.label} aria-label="Apoio" onChange={(e) => upd((d) => { d.loads[i].label = e.target.value; })} /></td>
                    {(['Nk', 'NkMin', 'NkPerm', 'Hx', 'Hy', 'Mx', 'My'] as (keyof FLoad)[]).map((k) => (
                      <td key={k}>{k === 'NkPerm'
                        ? <OptCell value={l.NkPerm} placeholder={fmt(l.Nk, 0)} onChange={(v) => upd((d) => { if (v === undefined) delete d.loads[i].NkPerm; else d.loads[i].NkPerm = v; })} />
                        : <NumCell value={l[k] as number} onChange={(v) => upd((d) => { (d.loads[i][k] as number) = v; })} />}</td>
                    ))}
                    <td><button type="button" className="x" aria-label="Remover apoio" onClick={() => upd((d) => { d.loads.splice(i, 1); })}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="mini" onClick={() => upd((d) => { const id = Math.max(0, ...d.loads.map((x) => x.id)) + 1; d.loads.push({ id, label: `P${id}`, Nk: 500, NkMin: 300, Hx: 0, Hy: 0, Mx: 0, My: 0 }); })}>+ apoio</button>
          <Hint>kN e kN·m, valores característicos no topo da fundação. N mín negativo indica tração. N perm é a parcela permanente (casos G); ela entra com γf = {fmt(p.gammaFfav, 1)} em Nd,mín, e o alívio variável (N perm − N mín) e o binário do momento com γf = {fmt(p.gammaF, 1)}. Vazio: adota-se N perm = N máx (a favor da segurança). Do pórtico 2D: X = Rx, My = Mz; direção Y livre para você completar. Tipo de fundação, furo, pilar e coordenadas ficam no cartão de cada apoio.</Hint>
        </Group>

        <Premissas p={p} setP={setP} reset={() => upd((d) => { d.params = defaultFoundationParams(); }, 'Premissas restauradas.')} />
      </aside>

      <section className="fund-out">
        {designs.length === 0 && <p className="hint">Lance as cargas dos apoios para dimensionar.</p>}
        {designs.map((ds) => <SupportCard key={ds.load.id} ds={ds} f={f} sel={sel} setSel={setSel} setLoad={setLoad} active={selDesign?.load.id === ds.load.id} />)}
        {selDesign && selDesign.kind === 'estacas' && selPile && <SolutionDetail s={selPile} ds={selDesign} f={f} setLoad={setLoad} />}
        {selDesign && selDesign.kind === 'sapata' && selDesign.footing && (
          <div className="fdetail">
            <h3>{selDesign.load.label} · sapata{isFooting(selDesign.footing) ? ` ${fmt(selDesign.footing.A * 100, 0)} × ${fmt(selDesign.footing.B * 100, 0)} × ${fmt(selDesign.footing.h * 100, 0)} cm` : ''} · furo {selDesign.boring.name}</h3>
            {isFooting(selDesign.footing) ? <FootingDetail r={selDesign.footing} ap={selDesign.ap} bp={selDesign.bp} p={p} /> : selDesign.footing.messages.map((m, i) => <div className="note bad" key={i}>{m}</div>)}
          </div>
        )}
        {selDesign && selDesign.kind === 'tubulao' && selDesign.caisson && (
          <div className="fdetail">
            <h3>{selDesign.load.label} · tubulão a céu aberto · furo {selDesign.boring.name}</h3>
            {isCaisson(selDesign.caisson) ? <CaissonDetail r={selDesign.caisson} water={selDesign.boring.water} p={p} /> : selDesign.caisson.messages.map((m, i) => <div className="note bad" key={i}>{m}</div>)}
          </div>
        )}
      </section>
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
        <OptField label="x" unit="m" width={72} value={ld.x} onChange={(v) => setLoad(ld.id, (l) => { if (v === undefined) delete l.x; else l.x = v; })} />
        <OptField label="y" unit="m" width={72} value={ld.y} onChange={(v) => setLoad(ld.id, (l) => { if (v === undefined) delete l.y; else l.y = v; })} />
      </div>
      {ld.boringMode === 'average' && ld.boringIds?.length ? (
        <div className="chips">
          <span className="muted small">Furos da média:</span>
          {borings.map((x) => {
            const on = ld.boringIds!.includes(x.id!);
            return <button type="button" key={x.id} className={`chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setLoad(ld.id, (l) => { const s = new Set(l.boringIds ?? []); if (on) s.delete(x.id!); else s.add(x.id!); l.boringIds = [...s]; if (!l.boringIds.length) l.boringIds = [x.id!]; })}>{x.name}</button>;
          })}
        </div>
      ) : null}
      {ds.kind === 'estacas' && r && (
        <>
          <div className="fsum">
            {r.byType.map((t) => (
              <button type="button" key={t.type} className={`fpick${sel?.load === ld.id && sel.type === t.type && t.recommended && sel.D === Math.round(t.recommended.D * 100) ? ' on' : ''}`} onClick={() => t.recommended && setSel({ load: ld.id, type: t.type, D: Math.round(t.recommended.D * 100) })}>
                <span className="ftype">{PILE_LABEL[t.type]}</span>
                {t.recommended ? <b>{t.recommended.n} × Ø{Math.round(t.recommended.D * 100)} · L = {t.recommended.L} m</b> : <b className="bad">sem solução</b>}
                {t.recommended && recommendedOption(t.recommended.struct.options) && <span className="muted">{recommendedOption(t.recommended.struct.options)!.n} φ{phiTxt(recommendedOption(t.recommended.struct.options)!.phi)} em {fmt(t.recommended.struct.armedLength, 1)} m · espiral φ{p.stirrupPhi} c/{Math.round(p.stirrupS * 100)}</span>}
                {t.recommended && t.type === 'premoldada' && <span className="muted">armadura de fábrica</span>}
              </button>
            ))}
          </div>
          {ds.pile && ds.cap && (
            <div className="fadopt">
              <span className="pill na">{ds.pileAdopted ? 'adotada' : 'recomendada'}</span>
              <span className={`pill ${ds.cap.ok ? 'ok' : 'bad'}`}>{ds.cap.ok ? 'bloco atende' : 'bloco não atende'}</span>
              <span>{PILE_LABEL[ds.pile.type].split(' ')[0]} Ø{Math.round(ds.pile.D * 100)} · {ds.pile.n} estaca{ds.pile.n > 1 ? 's' : ''} · L {ds.pile.L} m · bloco {fmt(ds.cap.lx * 100, 0)} × {fmt(ds.cap.ly * 100, 0)} × {fmt(ds.cap.h * 100, 0)} cm{ds.cap.ties[0]?.bars ? ` · tirante ${barTxt(ds.cap.ties[0].bars, false)}` : ''}</span>
              <button type="button" className="mini" onClick={() => setSel({ load: ld.id, type: ds.pile!.type, D: Math.round(ds.pile!.D * 100) })}>ver bloco</button>
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
        <button type="button" className={`fpick${active ? ' on' : ''}`} onClick={() => setSel({ load: ld.id })}>
          <span className="ftype">Sapata isolada</span>
          {isFooting(ds.footing) ? <>
            <b>{fmt(ds.footing.A * 100, 0)} × {fmt(ds.footing.B * 100, 0)} cm · h {fmt(ds.footing.h * 100, 0)} cm ({ds.footing.kind === 'rigida' ? 'rígida' : 'flexível'})</b>
            <span className="muted">σadm {fmt(ds.footing.sigmaAdm, 0)} kPa ({ds.footing.sigmaSrc.startsWith('estimada') ? 'SPT, a confirmar' : 'informada'}) · A: {barTxt(ds.footing.flex.x.bars)} · B: {barTxt(ds.footing.flex.y.bars)}{ds.footing.ok ? '' : ' · com pendências'}</span>
          </> : <b className="bad">{ds.footing.messages[0]}</b>}
        </button>
      )}
      {ds.kind === 'tubulao' && ds.caisson && (
        <button type="button" className={`fpick${active ? ' on' : ''}`} onClick={() => setSel({ load: ld.id })}>
          <span className="ftype">Tubulão a céu aberto</span>
          {isCaisson(ds.caisson) ? <>
            <b>Fuste Ø{fmt(ds.caisson.Df * 100, 0)} · base Ø{fmt(ds.caisson.Db * 100, 0)} · cota {fmt(ds.caisson.depth, 1)} m</b>
            <span className="muted">σadm {fmt(ds.caisson.sigmaAdm, 0)} kPa ({ds.caisson.sigmaSrc.startsWith('estimada') ? 'SPT, a confirmar' : 'informada'}) · H {fmt(ds.caisson.H * 100, 0)} cm · {fmt(ds.caisson.volume, 2)} m³</span>
          </> : <b className="bad">{ds.caisson.messages[0]}</b>}
        </button>
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
        <button type="button" className="btn ghost" onClick={reset}>Restaurar padrões (todas as premissas)</button>
      </Group>
    </>
  );
}

function OptField({ label, unit, value, onChange, width }: { label: string; unit?: string; value: number | undefined; onChange: (v: number | undefined) => void; width?: number }) {
  const show = (v: number | undefined) => (v === undefined ? '' : String(v).replace('.', ','));
  const [t, setT] = useState(show(value));
  useEffect(() => setT(show(value)), [value]);
  const commit = () => { if (!t.trim()) { if (value !== undefined) onChange(undefined); return; } const v = parseFloat(t.replace(',', '.')); if (Number.isFinite(v) && v !== value) onChange(v); else setT(show(value)); };
  return (
    <label className="field" style={width ? { width } : undefined}>
      <span className="flabel">{label}</span>
      <span className="finput"><input inputMode="decimal" placeholder="—" aria-label={label} value={t} onChange={(e) => setT(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />{unit && <span className="unit">{unit}</span>}</span>
    </label>
  );
}

function OptCell({ value, placeholder, onChange }: { value: number | undefined; placeholder: string; onChange: (v: number | undefined) => void }) {
  const show = (v: number | undefined) => (v === undefined ? '' : String(v).replace('.', ','));
  const [t, setT] = useState(show(value));
  useEffect(() => setT(show(value)), [value]);
  return <input className="num" inputMode="decimal" aria-label="parcela permanente" placeholder={placeholder} value={t} onChange={(e) => setT(e.target.value)} onBlur={() => { if (!t.trim()) { if (value !== undefined) onChange(undefined); return; } const v = parseFloat(t.replace(',', '.')); if (Number.isFinite(v) && v !== value) onChange(v); else setT(show(value)); }} />;
}

function NumCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [t, setT] = useState(String(value).replace('.', ','));
  useEffect(() => setT(String(value).replace('.', ',')), [value]);
  return <input className="num" inputMode="decimal" aria-label="valor" value={t} onChange={(e) => setT(e.target.value)} onBlur={() => { const v = parseFloat(t.replace(',', '.')); if (Number.isFinite(v) && v !== value) onChange(v); else setT(String(value).replace('.', ',')); }} />;
}

function SptChart({ b, cutoff, sol }: { b: Boring; cutoff: number; sol: PileSolution | null }) {
  const n = b.meters.length;
  const W = 150, rowH = 14, top = 18, H = top + n * rowH + 10;
  const Nmax = 50;
  return (
    <svg className="sptchart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Perfil SPT">
      <text x={34} y={11} className="axl">N_SPT</text>
      {[0, 10, 20, 30, 40, 50].map((v) => <line key={v} x1={34 + (v / Nmax) * (W - 44)} x2={34 + (v / Nmax) * (W - 44)} y1={top} y2={H - 10} className="gl" />)}
      {b.meters.map((m, i) => (
        <g key={i}>
          <rect x={0} y={top + i * rowH} width={26} height={rowH} fill={SOIL_COLOR[m.soil]} />
          <rect x={34} y={top + i * rowH + 2} width={(Math.min(m.N, Nmax) / Nmax) * (W - 44)} height={rowH - 4} className="nbar" />
          <text x={36 + (Math.min(m.N, Nmax) / Nmax) * (W - 44)} y={top + i * rowH + rowH - 4} className="nval">{m.N}</text>
        </g>
      ))}
      {b.water !== null && b.water <= n && <g><line x1={0} x2={W} y1={top + b.water * rowH} y2={top + b.water * rowH} className="wl" /><text x={W - 2} y={top + b.water * rowH - 2} className="axl" textAnchor="end">NA</text></g>}
      {sol && <g><rect x={28} y={top + cutoff * rowH} width={4} height={(sol.L - cutoff) * rowH} className="pilebar" /><text x={2} y={Math.min(H - 1, top + sol.L * rowH + 10)} className="axl" textAnchor="start">ponta {sol.L} m</text></g>}
    </svg>
  );
}

function SolutionDetail({ s, ds, f, setLoad }: { s: PileSolution; ds: SupportDesign; f: FoundationData; setLoad: SetLoad }) {
  const st = s.struct, c = s.cap, pl = s.loads;
  const curve = useMemo(() => capacityCurve(s.type, s.D, ds.boring, f.params), [s, f, ds.boring]);
  const cap = useMemo(() => capFor(s, ds.load, f), [s, ds.load, f]);
  const isAdopted = ds.pile === s && ds.pileAdopted;
  return (
    <div className="fdetail">
      <h3>{ds.load.label} · {PILE_LABEL[s.type]} · Ø{Math.round(s.D * 100)} cm · {s.n} estaca{s.n > 1 ? 's' : ''} · L = {s.L} m</h3>
      <div className="row wrap" style={{ marginBottom: 8, alignItems: 'center' }}>
        {isAdopted ? <span className="pill ok">adotada para o bloco e o memorial</span> : <button type="button" className="btn" onClick={() => setLoad(ds.load.id, (l) => { l.pile = { type: s.type, D: Math.round(s.D * 100) }; }, `${ds.load.label}: estaca adotada.`)}>Adotar esta estaca</button>}
        {ds.load.pile && <button type="button" className="btn ghost" onClick={() => setLoad(ds.load.id, (l) => { delete l.pile; }, `${ds.load.label}: volta à estaca recomendada.`)}>Voltar à recomendada</button>}
        <span className="muted">Furo {ds.boring.name}</span>
      </div>
      <div className="fgrid">
        <div>
          <h4>Capacidade geotécnica (Décourt-Quaresma)</h4>
          <dl className="kv">
            <dt>Np / Nl</dt><dd>{fmt(c.Np, 1)} / {fmt(c.Nl, 1)}</dd>
            <dt>Rp (ponta{s.type !== 'premoldada' ? ', ≤ Rl' : ''})</dt><dd>{fmt(c.RpUsed, 0)} kN{c.RpUsed < c.Rp ? ` (de ${fmt(c.Rp, 0)})` : ''}</dd>
            <dt>Rl (fuste)</dt><dd>{fmt(c.Rl, 0)} kN</dd>
            <dt>Padm</dt><dd>{fmt(c.Padm, 0)} kN ({c.governs === 'global' ? '(Rp+Rl)/2' : c.governs === 'parcial' ? 'Rp/4 + Rl/1,3' : '1,25·Rl'})</dd>
            <dt>Tração admissível</dt><dd>{fmt(c.Tadm, 0)} kN</dd>
            <dt>Limite de profundidade</dt><dd>{s.Lmax} m · {s.LmaxReason}</dd>
          </dl>
          <h4>Cargas por estaca (bloco rígido)</h4>
          <dl className="kv">
            <dt>N máx / N mín (k)</dt><dd>{fmt(pl.Nmax, 0)} / {fmt(pl.Nmin, 0)} kN</dd>
            <dt>Nd,mín = {fmt(f.params.gammaFfav, 1)}·(Gk+Wb)/n − {fmt(f.params.gammaF, 1)}·[(Gk−Nk,mín)/n + ΔN]</dt><dd>{fmt(pl.NdMin, 0)} kN{pl.NdMin < 0 ? ` → Td = ${fmt(-pl.NdMin, 0)} kN` : ''}</dd>
            <dt>Gk (permanente)</dt><dd>{fmt(pl.Gk, 0)} kN · {pl.GkSource}</dd>
            <dt>H por estaca</dt><dd>{fmt(pl.H, 1)} kN</dd>
            {pl.M0 > 0 && <><dt>Momento no topo</dt><dd>{fmt(pl.M0, 1)} kN·m</dd></>}
            <dt>Espaçamento</dt><dd>{fmt(pl.s, 2)} m</dd>
          </dl>
        </div>
        <div>
          <h4>Estrutural (NBR 6122)</h4>
          {st.kind === 'catalogo' ? (
            <dl className="kv">
              <dt>Carga estrutural (catálogo)</dt><dd>{st.Pcat ? `${st.Pcat} kN` : '—'}</dd>
              <dt>Tração (catálogo)</dt><dd>{st.Tcat ? `${st.Tcat} kN` : '—'}</dd>
              <dt>Miche: T / Mk</dt><dd>{fmt(st.T, 2)} m / {fmt(st.Mk, 1)} kN·m</dd>
              <dt>nh</dt><dd>{fmt(st.nh, 2)} MN/m³ · {st.nhLabel}</dd>
            </dl>
          ) : (
            <>
              <dl className="kv">
                <dt>Concreto</dt><dd>C{st.fck} · γc {fmt(st.gc!, 1)}</dd>
                <dt>σ = Nd/Ac</dt><dd>{fmt(st.sigma!, 2)} MPa (limite {st.sigmaLim} MPa)</dd>
                <dt>Miche: T / Mk / Md</dt><dd>{fmt(st.T, 2)} m / {fmt(st.Mk, 1)} / {fmt(st.Md, 1)} kN·m</dd>
                <dt>nh</dt><dd>{fmt(st.nh, 2)} MN/m³ · {st.nhLabel}</dd>
                <dt>As mín / compr. / tração</dt><dd>{fmt(st.AsMin * 1e4)} / {fmt(st.AsComp * 1e4)} / {fmt(st.AsTension * 1e4)} cm²</dd>
                <dt>Comprimento armado</dt><dd>{fmt(st.armedLength, 1)} m · {st.armedReason}</dd>
                <dt>Estribo</dt><dd>espiral φ{f.params.stirrupPhi} c/{Math.round(f.params.stirrupS * 100)}</dd>
              </dl>
              <h4>Armadura longitudinal por bitola</h4>
              <table className="data">
                <thead><tr><th>φ (mm)</th><th>Barras</th><th>As (cm²)</th><th>Espaç. (cm)</th><th className="l">Observação</th></tr></thead>
                <tbody>{st.options.map((o) => <tr key={o.phi} className={recommendedOption(st.options) === o ? 'rec' : ''}><td>{phiTxt(o.phi)}{recommendedOption(st.options) === o ? ' ★' : ''}</td><td>{o.n}</td><td>{fmt(o.As * 1e4)}</td><td>{fmt(o.spacing * 100, 1)}</td><td className="l">{o.notes.join('; ') || 'ok'}</td></tr>)}</tbody>
              </table>
              <Hint>★ sugerida: menor área de aço com φ ≥ 10 mm. A lista para na primeira bitola que resolve com o mínimo de 3 barras; bitolas maiores só acrescentariam aço.</Hint>
            </>
          )}
          {st.messages.map((m, i) => <div className="note" key={i}>{m}</div>)}
          <h4>Capacidade × profundidade</h4>
          <CapChart curve={curve} s={s} />
        </div>
      </div>
      <CapDetail cap={cap} coords={pl.coords} D={s.D} ap={ds.ap} bp={ds.bp} p={f.params} />
    </div>
  );
}

function CapChart({ curve, s }: { curve: { L: number; Padm: number; Rp: number; Rl: number }[]; s: PileSolution }) {
  if (!curve.length) return null;
  const W = 320, H = 200, l = 40, r = 10, t = 10, bt = 26;
  const maxP = Math.max(...curve.map((c) => c.Padm), s.loads.Nmax) * 1.1;
  const maxL = curve[curve.length - 1].L;
  const X = (v: number) => l + (v / maxP) * (W - l - r);
  const Y = (z: number) => t + (z / maxL) * (H - t - bt);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((q) => q * maxP);
  return (
    <svg className="capchart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Capacidade admissível por profundidade">
      {ticks.map((v) => <g key={v}><line x1={X(v)} x2={X(v)} y1={t} y2={H - bt} className="gl" /><text x={X(v)} y={H - bt + 12} className="axl" textAnchor="middle">{fmt(v, 0)}</text></g>)}
      {[0, Math.round(maxL / 2), maxL].map((z) => <text key={z} x={l - 4} y={Y(z) + 3} className="axl" textAnchor="end">{z} m</text>)}
      <text x={(l + W) / 2} y={H - 2} className="axl" textAnchor="middle">Padm (kN) por estaca</text>
      <line x1={X(s.loads.Nmax)} x2={X(s.loads.Nmax)} y1={t} y2={H - bt} className="nline" />
      <line x1={l} x2={W - r} y1={Y(s.Lmax)} y2={Y(s.Lmax)} className="lmax" />
      <polyline points={curve.map((c) => `${X(c.Padm)},${Y(c.L)}`).join(' ')} className="pcurve" />
      <circle cx={X(s.cap.Padm)} cy={Y(s.L)} r={4} className="pdot" />
    </svg>
  );
}
