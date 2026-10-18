import { useEffect, useMemo, useState } from 'react';
import { useStore } from './store';
import { Check, Group, Hint, NumField, Select, TextField } from './ui';
import { fmt, getDesign, useAnalysis } from './results';
import { buildCharacteristics } from './Library';
import { listLibrary, loadFromLibrary, type LibraryItem, type SavedCharacteristics } from './storage';
import {
  PILE_LABEL, PRECAST_CATALOG, SOIL_LABEL, STRUCT, capacityCurve, defaultFoundationParams, recommendedOption, sampleFoundation, solveSupport,
  type FLoad, type FoundationData, type FoundationParams, type PileSolution, type PileType, type SoilClass,
} from '../core/piles';

const SOILS = Object.keys(SOIL_LABEL) as SoilClass[];
const SOIL_COLOR: Record<SoilClass, string> = { argila: '#b0764a', silteArgiloso: '#c9a36b', silteArenoso: '#d8c27a', areia: '#e6d58f' };

function parseSoil(t: string): SoilClass {
  const s = t.toLowerCase();
  if (s.includes('silte') && s.includes('are')) return 'silteArenoso';
  if (s.includes('silte')) return 'silteArgiloso';
  if (s.startsWith('are') || s.includes('areia')) return 'areia';
  return 'argila';
}

export function Fundacoes() {
  const st = useStore();
  const a = useAnalysis();
  const f: FoundationData = useMemo(() => {
    const base = st.model.foundation ?? sampleFoundation();
    return { ...base, params: { ...defaultFoundationParams(), ...base.params } };
  }, [st.model.foundation]);
  const upd = (fn: (d: FoundationData) => void, msg?: string) => st.commit((m) => {
    const d: FoundationData = m.foundation ?? JSON.parse(JSON.stringify(f));
    d.params = { ...defaultFoundationParams(), ...d.params };
    fn(d);
    m.foundation = d;
  }, msg);
  const setP = (p: Partial<FoundationParams>) => upd((d) => { d.params = { ...d.params, ...p }; });

  const results = useMemo(() => f.loads.map((ld) => solveSupport(ld, f)), [f]);
  const [sel, setSel] = useState<{ load: number; type: PileType; D: number } | null>(null);
  const [paste, setPaste] = useState('');
  const [saved, setSaved] = useState<LibraryItem[]>([]);
  useEffect(() => { listLibrary().then((r) => setSaved(r.items.filter((i) => i.kind === 'characteristics'))).catch(() => {}); }, []);

  const selected: PileSolution | null = useMemo(() => {
    if (!sel) {
      const r = results[0]?.byType[0];
      return r?.recommended ?? null;
    }
    const r = results.find((x) => x.load.id === sel.load);
    return r?.byType.find((t) => t.type === sel.type)?.diameters.find((d) => d.D === sel.D)?.best ?? null;
  }, [sel, results]);
  const selLoad = sel ? f.loads.find((l) => l.id === sel.load) : f.loads[0];

  const importModel = () => {
    if (a.prep.error) { st.set({ message: 'O pórtico está instável: não há reações para importar.' }); return; }
    const ch = buildCharacteristics(st.model, getDesign(a));
    upd((d) => { d.loads = ch.supports; }, `${ch.supports.length} apoio(s) importados do pórtico atual (valores característicos).`);
  };
  const importSaved = async (id: string) => {
    const e = await loadFromLibrary(id);
    if (!e) return;
    const ch = e.payload as SavedCharacteristics;
    upd((d) => { d.loads = ch.supports.map((s, i) => ({ ...s, id: i + 1, source: e.name })); }, `Cargas de “${e.name}” importadas.`);
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
    upd((d) => { d.boring.meters = meters; }, `${meters.length} metros de SPT colados.`);
    setPaste('');
  };

  const b = f.boring, p = f.params;
  return (
    <div className="fund">
      <aside className="fund-in">
        <Group title="Sondagem SPT">
          <div className="row">
            <TextField label="Identificação" value={b.name} onChange={(v) => upd((d) => { d.boring.name = v; })} />
            <NumField label="Nível d'água" unit="m" value={b.water ?? 0} onChange={(v) => upd((d) => { d.boring.water = v > 0 ? v : null; })} />
          </div>
          <Check label="Sondagem terminou em impenetrável" checked={b.endImpenetrable} onChange={(v) => upd((d) => { d.boring.endImpenetrable = v; })} />
          <div className="spt">
            <div className="spt-table">
              <div className="spt-h"><span>m</span><span>N</span><span>Solo</span><span /></div>
              {b.meters.map((m, i) => (
                <div className={`spt-r${b.water !== null && i + 1 > b.water ? ' wet' : ''}`} key={i}>
                  <span className="muted">{i + 1}</span>
                  <input aria-label={`N no metro ${i + 1}`} value={m.N} inputMode="numeric" onChange={(e) => { const v = parseInt(e.target.value || '0', 10); if (Number.isFinite(v)) upd((d) => { d.boring.meters[i].N = v; }); }} />
                  <select aria-label={`Solo no metro ${i + 1}`} value={m.soil} onChange={(e) => upd((d) => { d.boring.meters[i].soil = e.target.value as SoilClass; })}>
                    {SOILS.map((s) => <option key={s} value={s}>{SOIL_LABEL[s]}</option>)}
                  </select>
                  <button type="button" className="x" aria-label="Remover metro" onClick={() => upd((d) => { d.boring.meters.splice(i, 1); })}>×</button>
                </div>
              ))}
              <button type="button" className="mini" onClick={() => upd((d) => { const last = d.boring.meters.at(-1) ?? { N: 10, soil: 'argila' as SoilClass }; d.boring.meters.push({ ...last }); })}>+ metro</button>
            </div>
            <SptChart f={f} sol={selected} />
          </div>
          <label className="field" htmlFor="sptpaste"><span className="flabel">Colar do boletim (uma linha por metro: “N” ou “prof; N; solo”)</span>
            <textarea id="sptpaste" rows={3} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'1; 4; argila\n2; 6; silte argiloso'} />
          </label>
          <button type="button" className="btn ghost" disabled={!paste.trim()} onClick={applyPaste}>Substituir SPT pelo texto colado</button>
        </Group>

        <Group title="Cargas por apoio (características)">
          <div className="row wrap">
            <button type="button" className="btn" onClick={importModel}>Importar do pórtico atual</button>
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
          <Hint>kN e kN·m, valores característicos no topo do bloco. N mín negativo indica tração. N perm é a parcela permanente (casos G); ela entra com γf = {fmt(p.gammaFfav, 1)} em Nd,mín, e o alívio variável (N perm − N mín) e o binário do momento com γf = {fmt(p.gammaF, 1)}. Vazio: adota-se N perm = N máx (a favor da segurança). Do pórtico 2D: X = Rx, My = Mz; direção Y livre para você completar.</Hint>
        </Group>

        <Group title="Premissas" open={false}>
          <div className="row wrap">
            {(['helice', 'escavada', 'premoldada'] as PileType[]).map((t) => (
              <Check key={t} label={PILE_LABEL[t]} checked={p.types.includes(t)} onChange={(v) => setP({ types: v ? [...p.types, t] : p.types.filter((x) => x !== t) })} />
            ))}
          </div>
          <TextField label="Diâmetros moldadas in loco (cm)" value={p.diameters.join(', ')} onChange={(v) => setP({ diameters: v.split(/[,;\s]+/).map(Number).filter((x) => x > 0) })} />
          <TextField label="Diâmetros pré-moldadas (cm, catálogo)" value={p.precastDiameters.join(', ')} onChange={(v) => setP({ precastDiameters: v.split(/[,;\s]+/).map(Number).filter((x) => PRECAST_CATALOG[x]) })} />
          <div className="row">
            <NumField label="Cota de arrasamento" unit="m" value={p.cutoff} onChange={(v) => setP({ cutoff: Math.max(0, v) })} />
            <NumField label="Comprimento mínimo" unit="m" value={p.minLength} onChange={(v) => setP({ minLength: Math.max(1, v) })} />
          </div>
          <div className="row">
            <NumField label="Peso do bloco" unit="% de N" value={p.blockWeightPct} onChange={(v) => setP({ blockWeightPct: v })} />
            <NumField label="Espaç. moldadas" unit="×φ" value={p.spacingInSitu} onChange={(v) => setP({ spacingInSitu: v })} />
            <NumField label="Espaç. pré-mold." unit="×φ" value={p.spacingPrecast} onChange={(v) => setP({ spacingPrecast: v })} />
          </div>
          <div className="row">
            <NumField label="Hélice: prof. máx." unit="m" value={p.hcMaxDepth} onChange={(v) => setP({ hcMaxDepth: v })} />
            <NumField label="Pré-moldada: N de parada" value={p.precastStopN} onChange={(v) => setP({ precastStopN: v })} />
            <NumField label="Escavada: N do trado" value={p.augerStopN} onChange={(v) => setP({ augerStopN: v })} />
          </div>
          <div className="row">
            <Select label="CAA (Tabela 4)" value={p.caa} options={[{ v: 'I-II', label: 'I-II' }, { v: 'III-IV', label: 'III-IV' }]} onChange={(v) => setP({ caa: v })} />
            <NumField label="Cobrimento" unit="cm" value={p.cover * 100} onChange={(v) => setP({ cover: v / 100 })} />
            <NumField label="nh argila média" unit="MN/m³" value={p.nhClay} onChange={(v) => setP({ nhClay: v })} />
          </div>
          <div className="row">
            <NumField label="Estribo espiral φ" unit="mm" value={p.stirrupPhi} onChange={(v) => setP({ stirrupPhi: v })} />
            <NumField label="passo" unit="cm" value={p.stirrupS * 100} onChange={(v) => setP({ stirrupS: v / 100 })} />
            <NumField label="1 m³ equivale a" unit="kg aço" value={p.steelPerM3} onChange={(v) => setP({ steelPerM3: v })} />
          </div>
          <div className="row">
            <NumField label="γf desfavorável" value={p.gammaF} onChange={(v) => setP({ gammaF: v })} />
            <NumField label="γf permanente favorável" value={p.gammaFfav} onChange={(v) => setP({ gammaFfav: v })} />
          </div>
          <Hint>Hélice: C{STRUCT.helice[p.caa].fck}, γc {STRUCT.helice[p.caa].gc}, σ sem armar {STRUCT.helice.sigmaLim} MPa, armadura mínima {STRUCT.helice.Lmin} m. Escavada: C{STRUCT.escavada[p.caa].fck}, γc {STRUCT.escavada[p.caa].gc}, {STRUCT.escavada.sigmaLim} MPa, {STRUCT.escavada.Lmin} m. As,mín 0,4%. N de parada da pré-moldada é estimativa: confirme com nega e repique na cravação. A solução escolhida minimiza concreto das estacas + bloco estimado + aço convertido pela equivalência acima.</Hint>
          <button type="button" className="btn ghost" onClick={() => upd((d) => { d.params = defaultFoundationParams(); }, 'Premissas restauradas.')}>Restaurar padrões</button>
        </Group>
      </aside>

      <section className="fund-out">
        {results.length === 0 && <p className="hint">Lance as cargas dos apoios para dimensionar.</p>}
        {results.map((r) => (
          <div className="fcard" key={r.load.id}>
            <div className="fcard-h">
              <b>{r.load.label}</b>
              <span className="muted">N {fmt(r.load.Nk, 0)} / {fmt(r.load.NkMin, 0)} kN · H {fmt(Math.hypot(r.load.Hx, r.load.Hy), 1)} kN · M {fmt(Math.hypot(r.load.Mx, r.load.My), 1)} kN·m</span>
            </div>
            <div className="fsum">
              {r.byType.map((t) => (
                <button type="button" key={t.type} className={`fpick${selected && sel?.load === r.load.id && sel.type === t.type && t.recommended && sel.D === Math.round(t.recommended.D * 100) ? ' on' : ''}`} onClick={() => t.recommended && setSel({ load: r.load.id, type: t.type, D: Math.round(t.recommended.D * 100) })}>
                  <span className="ftype">{PILE_LABEL[t.type]}</span>
                  {t.recommended ? <b>{t.recommended.n} × Ø{Math.round(t.recommended.D * 100)} · L = {t.recommended.L} m</b> : <b className="bad">sem solução</b>}
                  {t.recommended && recommendedOption(t.recommended.struct.options) && <span className="muted">{recommendedOption(t.recommended.struct.options)!.n} φ{fmt(recommendedOption(t.recommended.struct.options)!.phi, 1).replace(',0', '')} em {fmt(t.recommended.struct.armedLength, 1)} m · espiral φ{p.stirrupPhi} c/{Math.round(p.stirrupS * 100)}</span>}
                  {t.recommended && t.type === 'premoldada' && <span className="muted">armadura de fábrica</span>}
                </button>
              ))}
            </div>
            <details>
              <summary>Todos os diâmetros</summary>
              <div className="tablewrap">
                <table className="data">
                  <thead><tr><th className="l">Tipo</th><th>Ø</th><th>Estacas</th><th>L (m)</th><th>Padm</th><th>N/estaca</th><th>Aço</th><th className="l">Observação</th></tr></thead>
                  <tbody>
                    {r.byType.flatMap((t) => t.diameters.map((d) => (
                      <tr key={`${t.type}-${d.D}`} className={d.best ? 'click' : 'dimrow'} onClick={() => d.best && setSel({ load: r.load.id, type: t.type, D: d.D })}>
                        <td className="l">{PILE_LABEL[t.type].split(' ')[0]}</td><td>{d.D}</td>
                        {d.best ? (<><td>{d.best.n}</td><td>{d.best.L}</td><td>{fmt(d.best.cap.Padm, 0)}</td><td>{fmt(d.best.loads.Nmax, 0)}</td><td>{d.best.struct.options.length ? `${fmt(d.best.steelKg, 0)} kg` : '—'}</td><td className="l">{t.recommended === d.best ? 'recomendada' : ''}</td></>)
                          : (<><td colSpan={5}>—</td><td className="l muted">{d.reason}</td></>)}
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        ))}
        {selected && selLoad && <SolutionDetail s={selected} f={f} />}
      </section>
    </div>
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

function SptChart({ f, sol }: { f: FoundationData; sol: PileSolution | null }) {
  const b = f.boring;
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
      {sol && <g><rect x={28} y={top + f.params.cutoff * rowH} width={4} height={(sol.L - f.params.cutoff) * rowH} className="pilebar" /><text x={2} y={Math.min(H - 1, top + sol.L * rowH + 10)} className="axl" textAnchor="start">ponta {sol.L} m</text></g>}
    </svg>
  );
}

function SolutionDetail({ s, f }: { s: PileSolution; f: FoundationData }) {
  const st = s.struct, c = s.cap, pl = s.loads;
  const curve = useMemo(() => capacityCurve(s.type, s.D, f.boring, f.params), [s, f]);
  return (
    <div className="fdetail">
      <h3>{PILE_LABEL[s.type]} · Ø{Math.round(s.D * 100)} cm · {s.n} estaca{s.n > 1 ? 's' : ''} · L = {s.L} m</h3>
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
            <dt>Bloco estimado</dt><dd>{fmt(s.blockVolume, 2)} m³</dd>
          </dl>
          <BlockSketch s={s} />
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
                <tbody>{st.options.map((o) => <tr key={o.phi} className={recommendedOption(st.options) === o ? 'rec' : ''}><td>{fmt(o.phi, 1).replace(',0', '')}{recommendedOption(st.options) === o ? ' ★' : ''}</td><td>{o.n}</td><td>{fmt(o.As * 1e4)}</td><td>{fmt(o.spacing * 100, 1)}</td><td className="l">{o.notes.join('; ') || 'ok'}</td></tr>)}</tbody>
              </table>
              <Hint>★ sugerida: menor área de aço com φ ≥ 10 mm. A lista para na primeira bitola que resolve com o mínimo de 3 barras; bitolas maiores só acrescentariam aço.</Hint>
            </>
          )}
          {st.messages.map((m, i) => <div className="note" key={i}>{m}</div>)}
          <h4>Capacidade × profundidade</h4>
          <CapChart curve={curve} s={s} />
        </div>
      </div>
    </div>
  );
}

function BlockSketch({ s }: { s: PileSolution }) {
  const pts = s.loads.coords, D = s.D;
  const ext = Math.max(...pts.flatMap(([x, y]) => [Math.abs(x), Math.abs(y)])) + D;
  const W = 160, k = (W / 2 - 10) / ext;
  return (
    <svg className="blocksk" viewBox={`0 0 ${W} ${W}`} role="img" aria-label="Disposição das estacas">
      <rect x={W / 2 - (ext - D / 2 + 0.15) * k} y={W / 2 - (ext - D / 2 + 0.15) * k} width={2 * (ext - D / 2 + 0.15) * k} height={2 * (ext - D / 2 + 0.15) * k} className="blk" />
      {pts.map(([x, y], i) => <circle key={i} cx={W / 2 + x * k} cy={W / 2 - y * k} r={(D / 2) * k} className="pile" />)}
      <text x={W / 2} y={W - 3} className="axl" textAnchor="middle">{s.n} × Ø{Math.round(D * 100)} · s = {fmt(s.loads.s, 2)} m</text>
    </svg>
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
