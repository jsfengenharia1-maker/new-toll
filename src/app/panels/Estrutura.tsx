import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Check, Group, Hint, NumField, Select, Seg, TextField } from '../ui';
import { nextId, joinAtNode, selectionSets, transformSelection, type Xform } from '../../core/edit';
import { sectionProps } from '../../core/section';
import type { Material, MemberRole, Restraint, SectionShape, Support } from '../../core/types';
import { concrete } from '../../core/concrete';
import { lPolygon, polyProps, type Pt } from '../../core/fiber';
import { fmt, linkText } from '../results';
import { useUnits } from '../units';

const R_OPTS: { v: Restraint; label: string }[] = [
  { v: 'free', label: 'Livre' },
  { v: 'fixed', label: 'Fixo' },
  { v: 'spring', label: 'Mola' },
];

const PRESETS: { label: string; s: Support | null; title: string }[] = [
  { label: 'Engaste', s: { ux: 'fixed', uy: 'fixed', rz: 'fixed' }, title: 'Restringe X, Y e rotação' },
  { label: '2º gênero', s: { ux: 'fixed', uy: 'fixed', rz: 'free' }, title: 'Articulação fixa' },
  { label: '1º gênero Y', s: { ux: 'free', uy: 'fixed', rz: 'free' }, title: 'Apoio móvel vertical' },
  { label: '1º gênero X', s: { ux: 'fixed', uy: 'free', rz: 'free' }, title: 'Apoio móvel horizontal' },
  { label: 'Sem apoio', s: null, title: 'Remove o apoio' },
];

export function EstruturaPanel() {
  const st = useStore();
  const { model, selNodes, selMembers } = st;
  const nSel = [...selNodes], mSel = [...selMembers];
  const firstNode = model.nodes.find((n) => n.id === nSel[0]);
  const [sup, setSup] = useState<Support>(firstNode?.support ?? { ux: 'fixed', uy: 'fixed', rz: 'free' });
  useEffect(() => { if (firstNode?.support) setSup(firstNode.support); }, [firstNode?.id, firstNode?.support]);
  const [matId, setMatId] = useState(model.materials[0]?.id ?? 1);
  const [secId, setSecId] = useState(model.sections[0]?.id ?? 1);
  const mat = model.materials.find((m) => m.id === matId) ?? model.materials[0];
  const sec = model.sections.find((s) => s.id === secId) ?? model.sections[0];

  const applySupport = (s: Support | null) => {
    if (!nSel.length) return st.set({ message: 'Selecione nós para aplicar o apoio.' });
    st.commit((m) => { for (const n of m.nodes) if (selNodes.has(n.id)) { if (s) n.support = { ...s }; else delete n.support; } }, `Apoio aplicado a ${nSel.length} nó(s).`);
  };
  const setHinges = (i: boolean, j: boolean) => {
    if (!mSel.length) return st.set({ message: 'Selecione barras para definir rótulas.' });
    st.commit((m) => { for (const mm of m.members) if (selMembers.has(mm.id)) { mm.hingeI = i; mm.hingeJ = j; } }, `Rótulas atualizadas em ${mSel.length} barra(s).`);
  };
  const hingeAtNodes = (on: boolean) => {
    if (!nSel.length) return st.set({ message: 'Selecione nós.' });
    st.commit((m) => { for (const mm of m.members) { if (selNodes.has(mm.ni)) mm.hingeI = on; if (selNodes.has(mm.nj)) mm.hingeJ = on; } }, on ? 'Barras rotuladas nos nós selecionados.' : 'Rótulas removidas nos nós selecionados.');
  };

  const U = useUnits();
  const [kLink, setKLink] = useState(10000);
  const setSprings = (i: boolean, j: boolean) => {
    if (!mSel.length) return st.set({ message: 'Selecione barras para definir ligações semirrígidas.' });
    if (!(kLink > 0)) return st.set({ message: 'Informe k > 0.' });
    st.commit((m) => {
      for (const mm of m.members) if (selMembers.has(mm.id)) {
        if (i) { mm.springI = kLink; mm.hingeI = false; }
        if (j) { mm.springJ = kLink; mm.hingeJ = false; }
      }
    }, `Ligação semirrígida k = ${fmt(U.k.to(kLink), 0)} ${U.k.label} em ${mSel.length} barra(s).`);
  };
  const clearSprings = () => {
    if (!mSel.length) return st.set({ message: 'Selecione barras.' });
    st.commit((m) => { for (const mm of m.members) if (selMembers.has(mm.id)) { delete mm.springI; delete mm.springJ; } }, `Ligações semirrígidas removidas em ${mSel.length} barra(s).`);
  };

  const single = mSel.length === 1 ? model.members.find((m) => m.id === mSel[0]) : undefined;

  return (
    <div className="panel-body">
      <div className="selinfo">
        {nSel.length || mSel.length ? <><b>{nSel.length}</b> nó(s) · <b>{mSel.length}</b> barra(s) selecionados</> : <span className="muted">Nada selecionado. Clique ou arraste uma janela na estrutura.</span>}
      </div>

      {firstNode && nSel.length === 1 && (
        <Group title={`Nó ${firstNode.id}`}>
          <div className="row">
            <NumField label="x" unit="m" value={firstNode.x} onChange={(v) => st.commit((m) => { m.nodes.find((n) => n.id === firstNode.id)!.x = v; })} />
            <NumField label="y" unit="m" value={firstNode.y} onChange={(v) => st.commit((m) => { m.nodes.find((n) => n.id === firstNode.id)!.y = v; })} />
          </div>
          <button type="button" className="btn ghost" onClick={() => { const ok = { v: false }; st.commit((m) => { ok.v = joinAtNode(m, firstNode.id); }, 'Barras unidas.'); if (!ok.v) st.set({ message: 'Só é possível unir duas barras colineares, sem apoio no nó e sem cargas distribuídas.' }); }}>Unir barras colineares neste nó</button>
        </Group>
      )}

      {single && (
        <Group title={`Barra ${single.id}`}>
          <BarInfo id={single.id} />
        </Group>
      )}

      {mSel.length > 0 && <MemberDesignProps ids={mSel} />}

      <Group title="Apoios" aside={<span className="muted">{nSel.length ? `${nSel.length} nó(s)` : 'selecione nós'}</span>}>
        <div className="chips">
          {PRESETS.map((p) => <button type="button" key={p.label} className="chip" title={p.title} onClick={() => applySupport(p.s)}>{p.label}</button>)}
        </div>
        <div className="sup-grid">
          {(['ux', 'uy', 'rz'] as const).map((k) => (
            <div key={k} className="sup-row">
              <span className="flabel">{k === 'ux' ? 'Desloc. X' : k === 'uy' ? 'Desloc. Y' : 'Rotação'}</span>
              <Seg small value={sup[k]} options={R_OPTS} onChange={(v) => setSup({ ...sup, [k]: v })} />
              {sup[k] === 'spring' && (
                <NumField label="" unit={k === 'rz' ? 'kN·m/rad' : 'kN/m'} value={(k === 'ux' ? sup.kx : k === 'uy' ? sup.ky : sup.kr) ?? 0}
                  onChange={(v) => setSup({ ...sup, [k === 'ux' ? 'kx' : k === 'uy' ? 'ky' : 'kr']: v })} />
              )}
            </div>
          ))}
        </div>
        <div className="row">
          <NumField label="Inclinação do apoio" unit="°" value={sup.angle ?? 0} onChange={(v) => setSup({ ...sup, angle: v })} />
          <button type="button" className="btn" onClick={() => applySupport(sup)}>Aplicar</button>
        </div>
        <Hint>Em apoio inclinado, X e Y referem-se aos eixos girados do apoio.</Hint>
      </Group>

      <Group title="Rótulas e ligações" aside={<span className="muted">{mSel.length ? `${mSel.length} barra(s)` : 'selecione barras'}</span>}>
        <div className="chips">
          <button type="button" className="chip" onClick={() => setHinges(false, false)}>Nenhuma</button>
          <button type="button" className="chip" onClick={() => setHinges(true, false)}>Início</button>
          <button type="button" className="chip" onClick={() => setHinges(false, true)}>Fim</button>
          <button type="button" className="chip" onClick={() => setHinges(true, true)}>Ambas (treliça)</button>
        </div>
        <div className="chips">
          <button type="button" className="chip" onClick={() => hingeAtNodes(true)}>Rotular todas as barras nos nós selecionados</button>
          <button type="button" className="chip" onClick={() => hingeAtNodes(false)}>Remover nos nós</button>
        </div>
        <div className="row">
          <NumField label="Ligação semirrígida k" unit={U.k.label} value={U.k.to(kLink)} onChange={(v) => setKLink(U.k.from(v))} />
        </div>
        <div className="chips">
          <button type="button" className="chip" onClick={() => setSprings(true, false)}>Mola no início</button>
          <button type="button" className="chip" onClick={() => setSprings(false, true)}>Mola no fim</button>
          <button type="button" className="chip" onClick={() => setSprings(true, true)}>Ambas</button>
          <button type="button" className="chip" onClick={clearSprings}>Remover molas</button>
        </div>
        <div className="chips">
          <span className="muted small">Vínculo de deformação:</span>
          {([['', 'Normal'], ['axial', 'Inextensível'], ['full', 'Rígida']] as const).map(([v, label]) => (
            <button type="button" key={v} className="chip" onClick={() => { if (!mSel.length) return st.set({ message: 'Selecione barras.' }); st.commit((m) => { for (const mm of m.members) if (selMembers.has(mm.id)) { if (v) mm.rigid = v; else delete mm.rigid; } }, `${mSel.length} barra(s): ${label.toLowerCase()}.`); }}>{label}</button>
          ))}
        </div>
        <Hint>Inextensível: EA × 10⁶. Rígida (trecho rígido de ligação): EA e EI × 10⁶, não é dimensionada. Mola rotacional linear-elástica entre a barra e o nó; rótula na mesma extremidade prevalece. Referência de classificação (EN 1993-1-8, 5.2.2.5, só informativa): k·L/EI ≤ 0,5 ≈ rótula; ≥ 8 (contraventado) ou ≥ 25 (não contraventado) ≈ rígida.</Hint>
      </Group>

      <TransformGroup />

      <Group title="Materiais" aside={<button type="button" className="mini" onClick={() => { const id = nextId(model.materials); st.commit((m) => { m.materials.push({ ...(mat ?? { E: 2e8, nu: 0.3, alpha: 1e-5, gamma: 78.5 }), id, name: `Material ${id}` }); }); setMatId(id); }}>+ novo</button>}>
        <Select value={mat?.id ?? 0} options={model.materials.map((m) => ({ v: m.id, label: `${m.name} · ${countUse(model.members, 'material', m.id)} barras` }))} onChange={setMatId} />
        {mat && (
          <>
            <TextField label="Nome" value={mat.name} onChange={(v) => st.commit((m) => { m.materials.find((x) => x.id === mat.id)!.name = v; })} />
            <MaterialKind id={mat.id} />
            <div className="row">
              <NumField label="E" unit="GPa" value={mat.E / 1e6} onChange={(v) => st.commit((m) => { m.materials.find((x) => x.id === mat.id)!.E = v * 1e6; })} />
              <NumField label="ν" value={mat.nu} onChange={(v) => st.commit((m) => { m.materials.find((x) => x.id === mat.id)!.nu = v; })} />
            </div>
            <div className="row">
              <NumField label="α" unit="/°C" value={mat.alpha} onChange={(v) => st.commit((m) => { m.materials.find((x) => x.id === mat.id)!.alpha = v; })} />
              <NumField label="γ" unit="kN/m³" value={mat.gamma} onChange={(v) => st.commit((m) => { m.materials.find((x) => x.id === mat.id)!.gamma = v; })} />
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={() => mSel.length ? st.commit((m) => { m.members.forEach((x) => { if (selMembers.has(x.id)) x.material = mat.id; }); }, `Material aplicado a ${mSel.length} barra(s).`) : st.set({ message: 'Selecione barras.' })}>Aplicar às selecionadas</button>
              <button type="button" className="btn ghost" disabled={model.materials.length < 2 || countUse(model.members, 'material', mat.id) > 0} onClick={() => { st.commit((m) => { m.materials = m.materials.filter((x) => x.id !== mat.id); }); setMatId(model.materials[0].id); }}>Excluir</button>
            </div>
          </>
        )}
      </Group>

      <Group title="Seções" aside={<button type="button" className="mini" onClick={() => { const id = nextId(model.sections); st.commit((m) => { m.sections.push({ id, name: `Seção ${id}`, shape: { kind: 'rect', b: 0.2, h: 0.5 } }); }); setSecId(id); }}>+ nova</button>}>
        <Select value={sec?.id ?? 0} options={model.sections.map((s) => ({ v: s.id, label: `${s.name} · ${countUse(model.members, 'section', s.id)} barras` }))} onChange={setSecId} />
        <QuickRect onCreated={setSecId} />
        {sec && <SectionEditor id={sec.id} />}
        {sec && (
          <div className="row">
            <button type="button" className="btn" onClick={() => mSel.length ? st.commit((m) => { m.members.forEach((x) => { if (selMembers.has(x.id)) x.section = sec.id; }); }, `Seção aplicada a ${mSel.length} barra(s).`) : st.set({ message: 'Selecione barras.' })}>Aplicar às selecionadas</button>
            <button type="button" className="btn ghost" disabled={model.sections.length < 2 || countUse(model.members, 'section', sec.id) > 0} onClick={() => { st.commit((m) => { m.sections = m.sections.filter((x) => x.id !== sec.id); }); setSecId(model.sections[0].id); }}>Excluir</button>
          </div>
        )}
      </Group>

      <Group title="Opções de análise" open={false}>
        <Check label="Considerar deformação por cisalhamento (Timoshenko)" checked={model.options.shearDeformation} onChange={(v) => st.commit((m) => { m.options.shearDeformation = v; })} />
        <Check label="Desprezar deformação axial" checked={!model.options.axialDeformation} onChange={(v) => st.commit((m) => { m.options.axialDeformation = !v; })} />
      </Group>
    </div>
  );
}

function countUse(members: { material: number; section: number }[], k: 'material' | 'section', id: number) {
  return members.filter((m) => m[k] === id).length;
}

function BarInfo({ id }: { id: number }) {
  const model = useStore((s) => s.model);
  const U = useUnits();
  const m = model.members.find((x) => x.id === id)!;
  const a = model.nodes.find((n) => n.id === m.ni)!, b = model.nodes.find((n) => n.id === m.nj)!;
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const mat = model.materials.find((x) => x.id === m.material), sec = model.sections.find((x) => x.id === m.section);
  const EI = mat && sec ? mat.E * sectionProps(sec.shape).I : 0;
  const commit = useStore((s) => s.commit);
  return (
    <>
      <dl className="kv">
        <dt>Nós</dt><dd>{m.ni} → {m.nj}</dd>
        <dt>Comprimento</dt><dd>{fmt(L, 3)} m</dd>
        <dt>Ângulo</dt><dd>{fmt(ang, 2)}°</dd>
        <dt>Ligações</dt><dd>{linkText(m, U.k)}</dd>
        {EI > 0 && (m.springI || m.springJ) ? <><dt>k·L/EI</dt><dd>{[[m.hingeI, m.springI], [m.hingeJ, m.springJ]].map(([h, k]) => (!h && k ? fmt(((k as number) * L) / EI, 2) : '—')).join(' / ')}</dd></> : null}
      </dl>
      <button type="button" className="btn ghost" onClick={() => commit((md) => { const x = md.members.find((k) => k.id === id)!; [x.ni, x.nj] = [x.nj, x.ni]; [x.hingeI, x.hingeJ] = [x.hingeJ, x.hingeI]; [x.springI, x.springJ] = [x.springJ, x.springI]; }, 'Orientação da barra invertida.')}>Inverter orientação</button>
    </>
  );
}

const SHAPES: { v: SectionShape['kind']; label: string }[] = [
  { v: 'rect', label: 'Retangular' },
  { v: 'tee', label: 'T' },
  { v: 'ishape', label: 'I / H' },
  { v: 'box', label: 'Caixão' },
  { v: 'circle', label: 'Circular' },
  { v: 'tube', label: 'Tubo' },
  { v: 'polygon', label: 'Poligonal (L, qualquer)' },
  { v: 'generic', label: 'Genérica (A, I)' },
];

const DEFAULTS: Record<SectionShape['kind'], SectionShape> = {
  rect: { kind: 'rect', b: 0.2, h: 0.5 },
  tee: { kind: 'tee', bf: 0.8, tf: 0.12, bw: 0.2, h: 0.6 },
  ishape: { kind: 'ishape', bf: 0.2, tf: 0.0125, tw: 0.008, h: 0.4 },
  box: { kind: 'box', b: 0.3, h: 0.5, t: 0.02 },
  circle: { kind: 'circle', d: 0.4 },
  tube: { kind: 'tube', d: 0.1143, t: 0.006 },
  generic: { kind: 'generic', A: 0.01, I: 1e-4, h: 0.3 },
  polygon: { kind: 'polygon', pts: lPolygon(0.6, 0.6, 0.2, 0.2) },
};

const DIM_LABEL: Record<string, string> = { b: 'b', h: 'h', bf: 'bf', tf: 'tf', bw: 'bw', tw: 'tw', t: 't', d: 'D' };

function SectionEditor({ id }: { id: number }) {
  const model = useStore((s) => s.model);
  const commit = useStore((s) => s.commit);
  const sec = model.sections.find((s) => s.id === id)!;
  const sp = sectionProps(sec.shape);
  const upd = (fn: (sh: Record<string, number | string>) => void) => commit((m) => { fn(m.sections.find((s) => s.id === id)!.shape as unknown as Record<string, number | string>); });
  const shape = sec.shape as unknown as Record<string, number | string>;
  return (
    <>
      <TextField label="Nome" value={sec.name} onChange={(v) => commit((m) => { m.sections.find((s) => s.id === id)!.name = v; })} />
      <Select label="Forma" value={sec.shape.kind} options={SHAPES} onChange={(k) => commit((m) => { m.sections.find((s) => s.id === id)!.shape = { ...DEFAULTS[k] }; })} />
      <div className="row wrap">
        {sec.shape.kind === 'polygon' ? <PolygonEditor id={id} /> : sec.shape.kind === 'generic' ? (
          <>
            <NumField label="A" unit="cm²" value={sec.shape.A * 1e4} onChange={(v) => upd((s) => { s.A = v / 1e4; })} />
            <NumField label="I" unit="cm⁴" value={sec.shape.I * 1e8} onChange={(v) => upd((s) => { s.I = v / 1e8; })} />
            <NumField label="h" unit="cm" value={sec.shape.h * 100} onChange={(v) => upd((s) => { s.h = v / 100; })} />
          </>
        ) : (
          Object.keys(shape).filter((k) => k !== 'kind').map((k) => (
            <NumField key={k} label={DIM_LABEL[k] ?? k} unit="cm" value={(shape[k] as number) * 100} onChange={(v) => upd((s) => { s[k] = v / 100; })} />
          ))
        )}
      </div>
      <dl className="kv">
        <dt>A</dt><dd>{fmt(sp.A * 1e4, 2)} cm²</dd>
        <dt>I</dt><dd>{fmt(sp.I * 1e8, 1)} cm⁴</dd>
        <dt>A cis.</dt><dd>{fmt(sp.As * 1e4, 2)} cm²</dd>
        <dt>y CG</dt><dd>{fmt(sp.yc * 100, 2)} cm</dd>
      </dl>
    </>
  );
}

const CONCRETE_CLASSES = [20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90];
const STEELS: { name: string; fy: number; fu: number }[] = [
  { name: 'ASTM A36 / MR250', fy: 250, fu: 400 },
  { name: 'ASTM A572 Gr.50', fy: 345, fu: 450 },
  { name: 'ASTM A992', fy: 345, fu: 450 },
  { name: 'NBR 7007 AR350', fy: 350, fu: 450 },
  { name: 'Tubo VMB 250 / ASTM A500 Gr.B', fy: 290, fu: 400 },
];

function MaterialKind({ id }: { id: number }) {
  const model = useStore((s) => s.model);
  const commit = useStore((s) => s.commit);
  const mat = model.materials.find((m) => m.id === id)!;
  const kind = mat.kind ?? 'other';
  const upd = (fn: (m: Material) => void, msg?: string) => commit((md) => { fn(md.materials.find((x) => x.id === id)!); }, msg);
  return (
    <>
      <Seg small value={kind} onChange={(k) => upd((m) => {
        m.kind = k;
        if (k === 'concrete') { const f = m.fck ?? 30; m.fck = f; m.E = concrete(f).Ecs * 1000; m.nu = 0.2; m.alpha = 1e-5; m.gamma = 25; }
        if (k === 'steel') { m.fy = m.fy ?? 345; m.fu = m.fu ?? 450; m.E = 200e6; m.nu = 0.3; m.alpha = 1.2e-5; m.gamma = 78.5; }
      })} options={[{ v: 'concrete', label: 'Concreto armado' }, { v: 'steel', label: 'Aço estrutural' }, { v: 'other', label: 'Outro' }]} />
      {kind === 'concrete' && (
        <div className="row">
          <Select label="Classe" value={mat.fck ?? 30} options={CONCRETE_CLASSES.map((f) => ({ v: f, label: `C${f}` }))} onChange={(f) => upd((m) => { m.fck = f; m.E = concrete(f).Ecs * 1000; if (/^Concreto/.test(m.name)) m.name = `Concreto C${f}`; }, `C${f}: E = Ecs = ${(concrete(f).Ecs / 1000).toFixed(2)} GPa (NBR 6118, 8.2.8).`)} />
        </div>
      )}
      {kind === 'steel' && (
        <>
          <Select label="Aço" value={STEELS.findIndex((x) => x.fy === mat.fy && x.fu === mat.fu)} options={[{ v: -1, label: 'Personalizado' }, ...STEELS.map((x, i) => ({ v: i, label: `${x.name} (fy ${x.fy})` }))]} onChange={(i) => { if (i >= 0) upd((m) => { m.fy = STEELS[i].fy; m.fu = STEELS[i].fu; m.name = STEELS[i].name; }); }} />
          <div className="row">
            <NumField label="fy" unit="MPa" value={mat.fy ?? 345} onChange={(v) => upd((m) => { m.fy = v; })} />
            <NumField label="fu" unit="MPa" value={mat.fu ?? 450} onChange={(v) => upd((m) => { m.fu = v; })} />
          </div>
        </>
      )}
    </>
  );
}

const DIMS = [12, 14, 15, 19, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120, 130, 140, 150];

function QuickRect({ onCreated }: { onCreated: (id: number) => void }) {
  const st = useStore();
  const [b, setB] = useState(20);
  const [h, setH] = useState(50);
  const create = () => {
    const name = `Ret ${b}x${h}`;
    let id = st.model.sections.find((s) => s.shape.kind === 'rect' && Math.abs(s.shape.b - b / 100) < 1e-9 && Math.abs(s.shape.h - h / 100) < 1e-9)?.id;
    const sel = st.selMembers;
    st.commit((m) => {
      if (id === undefined) { id = nextId(m.sections); m.sections.push({ id, name, shape: { kind: 'rect', b: b / 100, h: h / 100 } }); }
      m.members.forEach((x) => { if (sel.has(x.id)) x.section = id!; });
    }, sel.size ? `${name} aplicada a ${sel.size} barra(s).` : `Seção ${name} criada.`);
    if (id !== undefined) onCreated(id);
  };
  return (
    <div className="quickrect">
      <span className="flabel">Retangular rápida (b × h, cm)</span>
      <div className="row">
        <Select value={b} options={DIMS.map((d) => ({ v: d, label: `b ${d}` }))} onChange={setB} />
        <Select value={h} options={DIMS.map((d) => ({ v: d, label: `h ${d}` }))} onChange={setH} />
        <button type="button" className="btn" onClick={create}>{st.selMembers.size ? 'Aplicar' : 'Criar'}</button>
      </div>
      <Hint>b = largura fora do plano; h = altura no plano do pórtico. De 12 cm a 1,50 m.</Hint>
    </div>
  );
}

function MemberDesignProps({ ids }: { ids: number[] }) {
  const model = useStore((s) => s.model);
  const commit = useStore((s) => s.commit);
  const set = new Set(ids);
  const first = model.members.find((m) => m.id === ids[0]);
  if (!first) return null;
  const a = model.nodes.find((n) => n.id === first.ni)!, b = model.nodes.find((n) => n.id === first.nj)!;
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  const upd = (fn: (m: (typeof model.members)[number], L: number) => void) => commit((md) => {
    md.members.forEach((m) => {
      if (!set.has(m.id)) return;
      const p = md.nodes.find((n) => n.id === m.ni)!, q = md.nodes.find((n) => n.id === m.nj)!;
      fn(m, Math.hypot(q.x - p.x, q.y - p.y));
    });
  });
  return (
    <Group title="Dimensionamento das barras" aside={<span className="muted">{ids.length} barra(s)</span>}>
      <Seg small value={first.role ?? 'auto'} onChange={(r: MemberRole) => upd((m) => { m.role = r; })} options={[{ v: 'auto', label: 'Automático' }, { v: 'beam', label: 'Viga' }, { v: 'column', label: 'Pilar' }, { v: 'none', label: 'Não dimensionar' }]} />
      <div className="row">
        <NumField label="le no plano" unit="m" value={first.leIn ?? L} onChange={(v) => upd((m) => { m.leIn = v > 0 ? v : undefined; })} />
        <NumField label="le fora do plano" unit="m" value={first.leOut ?? L} onChange={(v) => upd((m) => { m.leOut = v > 0 ? v : undefined; })} />
      </div>
      <button type="button" className="btn ghost" onClick={() => upd((m) => { delete m.leIn; delete m.leOut; })}>Usar o comprimento de cada barra</button>
      <Hint>Automático: inclinação acima de 60° é pilar. Fora do plano, informe a distância entre travamentos (vigas, terças, contraventamentos).</Hint>
    </Group>
  );
}

type Op = 'translate' | 'rotate' | 'mirror' | 'scale';
type Axis = 'v' | 'h' | 'p';

function TransformGroup() {
  const st = useStore();
  const { model, selNodes, selMembers } = st;
  const [copy, setCopy] = useState<'move' | 'copy'>('copy');
  const [op, setOp] = useState<Op>('translate');
  const [p, setP] = useState({ f: 2, dx: 5, dy: 0, cx: 0, cy: 0, deg: 90, axis: 'v' as Axis, c: 0, x1: 0, y1: 0, x2: 0, y2: 1, n: 1, loads: true, supports: true });
  const { members, nodes } = selectionSets(model, selNodes, selMembers);
  const first = model.nodes.find((n) => n.id === [...selNodes][0]);

  const xf = (): Xform => op === 'translate' ? { kind: 'translate', dx: p.dx, dy: p.dy }
    : op === 'rotate' ? { kind: 'rotate', cx: p.cx, cy: p.cy, deg: p.deg }
    : op === 'scale' ? { kind: 'scale', cx: p.cx, cy: p.cy, f: p.f }
    : p.axis === 'v' ? { kind: 'mirror', x1: p.c, y1: 0, x2: p.c, y2: 1 }
    : p.axis === 'h' ? { kind: 'mirror', x1: 0, y1: p.c, x2: 1, y2: p.c }
    : { kind: 'mirror', x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2 };

  const apply = () => {
    if (!nodes.size) return st.set({ message: 'Selecione nós e/ou barras para transformar.' });
    if (op === 'mirror' && p.axis === 'p' && Math.hypot(p.x2 - p.x1, p.y2 - p.y1) < 1e-9) return st.set({ message: 'Os dois pontos do eixo de espelhamento coincidem.' });
    if (op === 'scale' && !(p.f > 0)) return st.set({ message: 'Fator de escala deve ser positivo.' });
    const t = xf();
    let out = { nodes: [] as number[], members: [] as number[] };
    const verb = op === 'scale' ? (copy === 'copy' ? 'copiadas em escala' : 'escaladas') : op === 'translate' ? (copy === 'copy' ? 'copiadas' : 'movidas') : op === 'rotate' ? (copy === 'copy' ? 'copiadas com rotação' : 'giradas') : (copy === 'copy' ? 'copiadas espelhadas' : 'espelhadas');
    st.commit((m) => { out = transformSelection(m, selNodes, selMembers, t, { copy: copy === 'copy', copies: p.n, loads: p.loads, supports: p.supports }); }, `${members.length} barra(s) e ${nodes.size} nó(s) ${verb}.`);
    if (copy === 'copy') st.select(out.nodes, out.members);
  };
  const N = (k: keyof typeof p, label: string, unit?: string) => <NumField label={label} unit={unit} value={p[k] as number} onChange={(v) => setP({ ...p, [k]: v })} />;

  return (
    <Group title="Transformar seleção" open={false} aside={<span className="muted">{nodes.size ? `${members.length} barra(s) · ${nodes.size} nó(s)` : 'selecione'}</span>}>
      <Seg value={copy} onChange={setCopy} options={[{ v: 'copy', label: 'Copiar' }, { v: 'move', label: 'Mover' }]} />
      <Seg value={op} onChange={setOp} options={[{ v: 'translate', label: 'Transladar' }, { v: 'rotate', label: 'Girar' }, { v: 'mirror', label: 'Espelhar' }, { v: 'scale', label: 'Escalar' }]} />
      {op === 'translate' && <div className="row">{N('dx', 'Δx', 'm')}{N('dy', 'Δy', 'm')}</div>}
      {op === 'scale' && (
        <>
          <div className="row">{N('cx', 'Base x', 'm')}{N('cy', 'Base y', 'm')}{N('f', 'Fator')}</div>
          {first && <button type="button" className="chip" onClick={() => setP({ ...p, cx: first.x, cy: first.y })}>Base no nó {first.id}</button>}
        </>
      )}
      {op === 'rotate' && (
        <>
          <div className="row">{N('cx', 'Centro x', 'm')}{N('cy', 'Centro y', 'm')}{N('deg', 'Ângulo', '°')}</div>
          {first && <button type="button" className="chip" onClick={() => setP({ ...p, cx: first.x, cy: first.y })}>Centro no nó {first.id}</button>}
        </>
      )}
      {op === 'mirror' && (
        <>
          <Seg small value={p.axis} onChange={(axis) => setP({ ...p, axis })} options={[{ v: 'v', label: 'Eixo vertical' }, { v: 'h', label: 'Eixo horizontal' }, { v: 'p', label: 'Dois pontos' }]} />
          {p.axis === 'p' ? <div className="row">{N('x1', 'x₁', 'm')}{N('y1', 'y₁', 'm')}{N('x2', 'x₂', 'm')}{N('y2', 'y₂', 'm')}</div>
            : <div className="row">{N('c', p.axis === 'v' ? 'x do eixo' : 'y do eixo', 'm')}</div>}
        </>
      )}
      {copy === 'copy' && op !== 'mirror' && <div className="row">{N('n', 'Cópias em série')}</div>}
      <Check label="Levar as cargas" checked={p.loads} onChange={(v) => setP({ ...p, loads: v })} />
      <Check label="Levar os apoios" checked={p.supports} onChange={(v) => setP({ ...p, supports: v })} />
      <button type="button" className="btn primary" onClick={apply}>Aplicar</button>
      <Hint>Cópias se ligam à estrutura existente: nós coincidentes são reaproveitados e barras cruzadas são divididas. Cargas nodais não são duplicadas em nós que já existiam. No espelhamento, cargas globais são refletidas, cargas locais transversais e momentos trocam de sinal e as faces da temperatura se invertem; na translação e na rotação as cargas mantêm a direção (gravidade continua vertical).</Hint>
    </Group>
  );
}

function PolygonEditor({ id }: { id: number }) {
  const model = useStore((s) => s.model);
  const commit = useStore((s) => s.commit);
  const sh = model.sections.find((s) => s.id === id)!.shape;
  const pts = sh.kind === 'polygon' ? sh.pts : [];
  const txt0 = pts.map((p) => `${+(p[0] * 100).toFixed(2)} ${+(p[1] * 100).toFixed(2)}`.replace(/\./g, ',')).join('\n');
  const [txt, setTxt] = useState(txt0);
  useEffect(() => setTxt(txt0), [txt0]);
  const [L, setL] = useState({ b: 60, h: 60, tw: 20, tf: 20 });
  const apply = (list: Pt[], msg: string) => commit((m) => { m.sections.find((s) => s.id === id)!.shape = { kind: 'polygon', pts: list }; }, msg);
  const parse = () => {
    const list = txt.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l) => l.replace(/;/g, ' ').split(/\s+/).map((v) => parseFloat(v.replace(',', '.')) / 100)) as number[][];
    if (list.length < 3 || list.some((p) => p.length < 2 || !p.every(Number.isFinite))) return useStore.getState().set({ message: 'Informe ao menos 3 vértices “x y” (cm), um por linha, em ordem ao redor da seção.' });
    const poly = list.map((p) => [p[0], p[1]] as Pt);
    if (polyProps(poly).A < 1e-6) return useStore.getState().set({ message: 'Polígono com área nula.' });
    apply(poly, `Seção poligonal com ${poly.length} vértices.`);
  };
  return (
    <div className="grow">
      <label className="field grow" htmlFor={`poly${id}`}>
        <span className="flabel">Vértices x y (cm), em ordem; y = altura no plano do pórtico</span>
        <textarea id={`poly${id}`} rows={6} value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={parse} />
      </label>
      <div className="row">
        <NumField label="L: b" unit="cm" value={L.b} onChange={(v) => setL({ ...L, b: v })} />
        <NumField label="h" unit="cm" value={L.h} onChange={(v) => setL({ ...L, h: v })} />
        <NumField label="t alma" unit="cm" value={L.tw} onChange={(v) => setL({ ...L, tw: v })} />
        <NumField label="t aba" unit="cm" value={L.tf} onChange={(v) => setL({ ...L, tf: v })} />
      </div>
      <button type="button" className="chip" onClick={() => apply(lPolygon(L.b / 100, L.h / 100, L.tw / 100, L.tf / 100), 'Seção em L gerada.')}>Gerar L</button>
      <Hint>Pilares de concreto com seção poligonal ou circular são verificados por fibras, com flexão oblíqua pela linha neutra inclinada.</Hint>
    </div>
  );
}
