import { useState } from 'react';
import { useStore } from '../store';
import { Button, Check, Dropdown, Group, Hint, Input, NumField, Seg, Select, TextField } from '../ui';
import { caseGroup, nbrCombinations, nextId } from '../../core/edit';
import type { CaseNature, ComboKind, Load, LoadSystem } from '../../core/types';
import { fmt } from '../results';
import { useUnits, type Units } from '../units';

type Kind = 'nodal' | 'dist' | 'thermal' | 'endMoment' | 'presc';

export function CargasPanel() {
  const st = useStore();
  const { model, activeCase, selNodes, selMembers } = st;
  const cs = model.cases.find((c) => c.id === activeCase) ?? model.cases[0];
  const U = useUnits();
  const [kind, setKind] = useState<Kind>('dist');
  const [nod, setNod] = useState({ fx: 0, fy: -10, mz: 0 });
  const [dist, setDist] = useState({ system: 'global' as LoadSystem, qxi: 0, qyi: -10, qxj: 0, qyj: -10, uniform: true });
  const [th, setTh] = useState({ tTop: 0, tBot: 15 });
  const [em, setEm] = useState({ mi: 0, mj: 0 });
  const [pr, setPr] = useState({ dx: 0, dy: -10, rz: 0 });

  const caseLoads = model.loads.filter((l) => l.caseId === cs?.id);
  const sw = caseLoads.find((l) => l.kind === 'selfWeight');

  const apply = () => {
    if (!cs) return;
    const needNodes = kind === 'nodal' || kind === 'presc';
    const targets = needNodes ? [...selNodes] : [...selMembers];
    if (!targets.length) return st.set({ message: needNodes ? 'Selecione nós para aplicar esta carga.' : 'Selecione barras para aplicar esta carga.' });
    st.commit((m) => {
      let id = nextId(m.loads);
      for (const t of targets) {
        let ld: Load;
        if (kind === 'nodal') ld = { kind, id: id++, caseId: cs.id, node: t, ...nod };
        else if (kind === 'presc') ld = { kind, id: id++, caseId: cs.id, node: t, dx: pr.dx / 1000, dy: pr.dy / 1000, rz: pr.rz };
        else if (kind === 'dist') ld = { kind, id: id++, caseId: cs.id, member: t, system: dist.system, qxi: dist.qxi, qyi: dist.qyi, qxj: dist.uniform ? dist.qxi : dist.qxj, qyj: dist.uniform ? dist.qyi : dist.qyj };
        else if (kind === 'thermal') ld = { kind, id: id++, caseId: cs.id, member: t, ...th };
        else ld = { kind: 'endMoment', id: id++, caseId: cs.id, member: t, ...em };
        m.loads.push(ld);
      }
    }, `Carga aplicada a ${targets.length} ${needNodes ? 'nó(s)' : 'barra(s)'} em “${cs.name}”.`);
  };

  return (
    <div className="panel-body">
      <Group title="Casos de carga" aside={<Button variant="mini" onClick={() => { const id = nextId(model.cases); st.commit((m) => { m.cases.push({ id, name: `Caso ${id}`, nature: 'Q' }); }); st.set({ activeCase: id }); }}>+ novo</Button>}>
        <div className="caselist">
          {model.cases.map((c) => (
            <Button variant="caseitem" key={c.id} className={c.id === cs?.id ? ' on' : ''} onClick={() => st.set({ activeCase: c.id })}>
              <span className={`nat ${c.nature ?? 'G'}`}>{c.nature ?? 'G'}</span>
              <span className="cname">{c.name}</span>
              <span className="muted">{model.loads.filter((l) => l.caseId === c.id).length}</span>
            </Button>
          ))}
        </div>
        {cs && (
          <>
            <div className="row">
              <TextField label="Nome" value={cs.name} onChange={(v) => st.commit((m) => { m.cases.find((c) => c.id === cs.id)!.name = v; })} />
            </div>
            <div className="row">
              <span className="flabel">Natureza</span>
              <Seg small value={cs.nature ?? 'G'} options={[{ v: 'G' as CaseNature, label: 'Permanente' }, { v: 'Q', label: 'Variável' }, { v: 'W', label: 'Vento' }]} onChange={(v) => st.commit((m) => { m.cases.find((c) => c.id === cs.id)!.nature = v; })} />
            </div>
            {(cs.nature === 'Q' || cs.nature === 'W') && (
              <div className="row">
                {([0, 1, 2] as const).map((k) => (
                  <NumField key={k} label={`ψ${k}`} value={cs[`psi${k}`] ?? (cs.nature === 'W' ? [0.6, 0.3, 0][k] : [0.5, 0.4, 0.3][k])} onChange={(v) => st.commit((m) => { m.cases.find((c) => c.id === cs.id)![`psi${k}`] = v; })} />
                ))}
              </div>
            )}
            {(cs.nature === 'Q' || cs.nature === 'W') && (
              <>
                <div className="row">
                  <TextField label="Grupo excludente" value={caseGroup(cs)} onChange={(v) => st.commit((m) => { m.cases.find((c) => c.id === cs.id)!.group = v.trim(); }, v.trim() ? `Caso no grupo excludente “${v.trim()}”.` : 'Caso sem grupo excludente.')} />
                </div>
                <Hint>Casos do mesmo grupo nunca atuam juntos nas combinações (ex.: vento 0° e vento 90°). Por padrão, os casos de vento ficam no grupo “vento”. Deixe vazio para combinar com todos.</Hint>
              </>
            )}
            <div className="row">
              <Check label="Peso próprio neste caso" checked={!!sw} onChange={(v) => st.commit((m) => { if (v) m.loads.push({ kind: 'selfWeight', id: nextId(m.loads), caseId: cs.id, factor: 1 }); else m.loads = m.loads.filter((l) => !(l.kind === 'selfWeight' && l.caseId === cs.id)); })} />
              <Button variant="ghost" disabled={model.cases.length < 2} onClick={() => { st.commit((m) => { m.cases = m.cases.filter((c) => c.id !== cs.id); m.loads = m.loads.filter((l) => l.caseId !== cs.id); m.combinations.forEach((cb) => delete cb.factors[cs.id]); }, 'Caso excluído.'); st.set({ activeCase: model.cases.find((c) => c.id !== cs.id)!.id }); }}>Excluir caso</Button>
            </div>
          </>
        )}
      </Group>

      <Group title="Aplicar carga" aside={<span className="muted">{kind === 'nodal' || kind === 'presc' ? `${selNodes.size} nó(s)` : `${selMembers.size} barra(s)`}</span>}>
        <Seg small value={kind} onChange={setKind} options={[
          { v: 'dist', label: 'Distribuída' }, { v: 'nodal', label: 'Nodal' }, { v: 'thermal', label: 'Térmica' }, { v: 'endMoment', label: 'Mom. extrem.' }, { v: 'presc', label: 'Recalque' },
        ]} />
        {kind === 'nodal' && (
          <div className="row">
            <NumField label="Fx" unit={U.F.label} value={U.F.to(nod.fx)} onChange={(v) => setNod({ ...nod, fx: U.F.from(v) })} />
            <NumField label="Fy" unit={U.F.label} value={U.F.to(nod.fy)} onChange={(v) => setNod({ ...nod, fy: U.F.from(v) })} />
            <NumField label="Mz" unit={U.M.label} value={U.M.to(nod.mz)} onChange={(v) => setNod({ ...nod, mz: U.M.from(v) })} />
          </div>
        )}
        {kind === 'dist' && (
          <>
            <Select label="Sistema" value={dist.system} onChange={(v) => setDist({ ...dist, system: v })} options={[
              { v: 'global', label: 'Global (por metro de barra)' }, { v: 'projected', label: 'Global projetada (por metro projetado)' }, { v: 'local', label: 'Local da barra' },
            ]} />
            <Check label="Uniforme" checked={dist.uniform} onChange={(v) => setDist({ ...dist, uniform: v })} />
            <div className="row">
              <NumField label={dist.uniform ? 'qx' : 'qx início'} unit={U.q.label} value={U.q.to(dist.qxi)} onChange={(v) => setDist({ ...dist, qxi: U.q.from(v) })} />
              <NumField label={dist.uniform ? 'qy' : 'qy início'} unit={U.q.label} value={U.q.to(dist.qyi)} onChange={(v) => setDist({ ...dist, qyi: U.q.from(v) })} />
            </div>
            {!dist.uniform && (
              <div className="row">
                <NumField label="qx fim" unit={U.q.label} value={U.q.to(dist.qxj)} onChange={(v) => setDist({ ...dist, qxj: U.q.from(v) })} />
                <NumField label="qy fim" unit={U.q.label} value={U.q.to(dist.qyj)} onChange={(v) => setDist({ ...dist, qyj: U.q.from(v) })} />
              </div>
            )}
            <Hint>Valores negativos em Y apontam para baixo. No sistema local, x segue a barra do nó inicial ao final.</Hint>
          </>
        )}
        {kind === 'thermal' && (
          <div className="row">
            <NumField label="ΔT fibra superior (y+)" unit="°C" value={th.tTop} onChange={(v) => setTh({ ...th, tTop: v })} />
            <NumField label="ΔT fibra inferior (y−)" unit="°C" value={th.tBot} onChange={(v) => setTh({ ...th, tBot: v })} />
          </div>
        )}
        {kind === 'endMoment' && (
          <div className="row">
            <NumField label="M início" unit={U.M.label} value={U.M.to(em.mi)} onChange={(v) => setEm({ ...em, mi: U.M.from(v) })} />
            <NumField label="M fim" unit={U.M.label} value={U.M.to(em.mj)} onChange={(v) => setEm({ ...em, mj: U.M.from(v) })} />
          </div>
        )}
        {kind === 'presc' && (
          <>
            <div className="row">
              <NumField label="dx" unit="mm" value={pr.dx} onChange={(v) => setPr({ ...pr, dx: v })} />
              <NumField label="dy" unit="mm" value={pr.dy} onChange={(v) => setPr({ ...pr, dy: v })} />
              <NumField label="θ" unit="rad" value={pr.rz} onChange={(v) => setPr({ ...pr, rz: v })} />
            </div>
            <Hint>O recalque só atua nas direções em que o nó tem apoio fixo.</Hint>
          </>
        )}
        <Button variant="primary" onClick={apply}>Aplicar em “{cs?.name}”</Button>
      </Group>

      <Group title={`Cargas em “${cs?.name ?? ''}”`} aside={<span className="muted">{caseLoads.length}</span>}>
        {caseLoads.length === 0 && <Hint>Nenhuma carga neste caso.</Hint>}
        <ul className="loadlist">
          {caseLoads.map((l) => (
            <li key={l.id}>
              <span>{describe(l, U)}</span>
              <Button variant="x" aria-label="Remover carga" onClick={() => st.commit((m) => { m.loads = m.loads.filter((x) => x.id !== l.id); }, 'Carga removida.')}>×</Button>
            </li>
          ))}
        </ul>
      </Group>

      <Group title="Combinações" aside={<Button variant="mini" onClick={() => { const id = nextId(model.combinations); st.commit((m) => { m.combinations.push({ id, name: `Comb ${id}`, kind: 'ELU', factors: Object.fromEntries(m.cases.map((c) => [c.id, 1.4])) }); }); }}>+ nova</Button>}>
        <Button onClick={() => st.commit((m) => { m.combinations = nbrCombinations(m.cases, 1); }, 'Combinações NBR 8681 geradas. Revise os fatores.')}>Gerar combinações NBR 8681</Button>
        <Hint>ELU normal com γg = 1,4 / 1,0 e γq = 1,4 (acompanhantes × ψ0), uma de cada grupo excludente, e a principal sozinha; ELS quase permanente e frequente. Natureza, ψ e grupo de cada caso definem os fatores.</Hint>
        {model.combinations.length > 0 && (
          <div className="tablewrap">
            <table className="combo">
              <thead><tr><th>Combinação</th><th>Tipo</th>{model.cases.map((c) => <th key={c.id} title={c.name}>{c.name.slice(0, 10)}</th>)}<th /></tr></thead>
              <tbody>
                {model.combinations.map((cb) => (
                  <tr key={cb.id}>
                    <td className="cbname">{cb.name}</td>
                    <td><Dropdown className="factor kind" aria-label="Tipo da combinação" value={cb.kind ?? (/^ELS/i.test(cb.name) ? (/quase/i.test(cb.name) ? 'QP' : 'FREQ') : 'ELU')} onChange={(e) => st.commit((m) => { m.combinations.find((k) => k.id === cb.id)!.kind = e.target.value as ComboKind; })}>
                      <option value="ELU">ELU</option><option value="QP">ELS-QP</option><option value="FREQ">ELS-F</option><option value="RARA">Rara</option>
                    </Dropdown></td>
                    {model.cases.map((c) => (
                      <td key={c.id}><FactorInput value={cb.factors[c.id] ?? 0} onChange={(v) => st.commit((m) => { const x = m.combinations.find((k) => k.id === cb.id)!; if (v) x.factors[c.id] = v; else delete x.factors[c.id]; })} /></td>
                    ))}
                    <td><Button variant="x" aria-label="Excluir combinação" onClick={() => st.commit((m) => { m.combinations = m.combinations.filter((k) => k.id !== cb.id); })}>×</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Group>
    </div>
  );
}

function FactorInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [t, setT] = useState(String(value).replace('.', ','));
  return <Input className="factor" aria-label="Fator" value={t} onChange={(e) => setT(e.target.value)} onFocus={() => setT(String(value).replace('.', ','))} onBlur={() => { const v = parseFloat(t.replace(',', '.')); if (Number.isFinite(v)) onChange(v); else setT(String(value)); }} />;
}

function describe(l: Load, U: Units): string {
  switch (l.kind) {
    case 'nodal': return `Nó ${l.node}: Fx ${fmt(U.F.to(l.fx))} · Fy ${fmt(U.F.to(l.fy))} ${U.F.label} · Mz ${fmt(U.M.to(l.mz))} ${U.M.label}`;
    case 'dist': return `Barra ${l.member}: ${l.qxi === l.qxj && l.qyi === l.qyj ? `qx ${fmt(U.q.to(l.qxi))} · qy ${fmt(U.q.to(l.qyi))}` : `qx ${fmt(U.q.to(l.qxi))}→${fmt(U.q.to(l.qxj))} · qy ${fmt(U.q.to(l.qyi))}→${fmt(U.q.to(l.qyj))}`} ${U.q.label} (${l.system === 'global' ? 'global' : l.system === 'local' ? 'local' : 'projetada'})`;
    case 'thermal': return `Barra ${l.member}: ΔT sup ${fmt(l.tTop, 1)} · inf ${fmt(l.tBot, 1)} °C`;
    case 'endMoment': return `Barra ${l.member}: M início ${fmt(U.M.to(l.mi))} · fim ${fmt(U.M.to(l.mj))} ${U.M.label}`;
    case 'presc': return `Nó ${l.node}: recalque dx ${fmt((l.dx ?? 0) * 1000)} · dy ${fmt((l.dy ?? 0) * 1000)} mm · θ ${fmt(l.rz ?? 0, 4)}`;
    case 'selfWeight': return `Peso próprio × ${fmt(l.factor)}`;
  }
}
