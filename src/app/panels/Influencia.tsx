import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { Group, Hint, NumField, Seg, Select, TextField } from '../ui';
import { useAnalysis, resultFor, fmt } from '../results';
import { defaultPath } from '../pathTable';
import { buildPath, influenceField, samplePath, trainEnvelope, trainEnvelopeAll, effectAt } from '../../core/influence';
import { nextId } from '../../core/edit';
import { sourceOptions, srcKey } from './Resultados';
import { useUnits } from '../units';

export function InfluenciaPanel() {
  const st = useStore();
  const a = useAnalysis();
  const { model, il } = st;
  const train = model.trains.find((t) => t.id === st.trainId) ?? model.trains[0];
  const [busy, setBusy] = useState(false);
  const pm = a.prep.members.find((m) => m.id === il.member);

  const pathIds = st.trainPath.length ? st.trainPath : defaultPath(model);
  const path = useMemo(() => (a.prep.error ? null : buildPath(a.prep, pathIds)), [a, pathIds]);

  const sectionStats = useMemo(() => {
    if (!pm || !path || a.prep.error) return null;
    const x = Math.min(Math.max(il.x, 0), pm.L);
    const field = influenceField(a.prep, pm.index, x, il.effect);
    const sm = samplePath(a.prep, field, path, 120);
    let pos = 0, neg = 0;
    for (let i = 1; i < sm.s.length; i++) {
      const ds = sm.s[i] - sm.s[i - 1], avg = (sm.f[i] + sm.f[i - 1]) / 2;
      if (avg > 0) pos += avg * ds; else neg += avg * ds;
    }
    const env = train ? trainEnvelope(sm, train) : null;
    const stat = st.trainStatic ? resultFor(a, st.trainStatic)[0] : undefined;
    const sv = stat ? effectAt(stat, pm.index, x, il.effect) : 0;
    return { pos, neg, env, sv, fmax: Math.max(...sm.f), fmin: Math.min(...sm.f) };
  }, [pm, path, a, il, train, st.trainStatic]);

  const U = useUnits();
  const ue = U.eff(il.effect), unit = ue.label;
  const updTrain = (fn: (t: NonNullable<typeof train>) => void) => train && st.commit((m) => { fn(m.trains.find((t) => t.id === train.id)!); });

  const computeAll = () => {
    if (!train || !path) return;
    setBusy(true);
    setTimeout(() => {
      const stat = st.trainStatic ? resultFor(a, st.trainStatic)[0] ?? null : null;
      const data = trainEnvelopeAll(a.prep, path, train, stat, 16, 24);
      st.set({ trainResult: { key: String(train.id), data } });
      setBusy(false);
      st.set({ message: 'Envoltória do trem-tipo calculada. Troque N/V/M acima para ver cada esforço.' });
    }, 20);
  };

  if (a.prep.error) return <div className="panel-body"><div className="alert">{a.prep.error}</div></div>;

  return (
    <div className="panel-body">
      <Group title="Linha de influência">
        <Seg value={il.effect} onChange={(v) => st.set({ il: { ...il, effect: v } })} options={[{ v: 'N', label: 'Normal' }, { v: 'V', label: 'Cortante' }, { v: 'M', label: 'Momento' }]} />
        {!pm ? <Hint>Clique numa barra da estrutura para escolher a seção.</Hint> : (
          <>
            <div className="row">
              <Select label="Barra" value={pm.id} options={a.prep.members.map((m) => ({ v: m.id, label: `Barra ${m.id} (L = ${fmt(m.L)} m)` }))} onChange={(v) => st.set({ il: { ...il, member: v } })} />
              <NumField label="x da seção" unit="m" value={il.x} onChange={(v) => st.set({ il: { ...il, x: Math.min(Math.max(v, 0), pm.L) } })} />
            </div>
            <input aria-label="Posição da seção" type="range" min={0} max={pm.L} step={pm.L / 200} value={il.x} onChange={(e) => st.set({ il: { ...il, x: +e.target.value } })} />
            {sectionStats && (
              <dl className="kv">
                <dt>Ordenada máx.</dt><dd>{fmt(sectionStats.fmax, 4)}</dd>
                <dt>Ordenada mín.</dt><dd>{fmt(sectionStats.fmin, 4)}</dd>
                <dt>Área positiva</dt><dd>{fmt(sectionStats.pos, 3)}</dd>
                <dt>Área negativa</dt><dd>{fmt(sectionStats.neg, 3)}</dd>
              </dl>
            )}
            <Hint>Carga unitária vertical para baixo percorrendo o caminho do trem-tipo. Ordenadas positivas desenhadas para cima.</Hint>
          </>
        )}
        {st.trainResult && <button type="button" className="btn ghost" onClick={() => st.set({ trainResult: null })}>Voltar à linha de influência</button>}
      </Group>

      <Group title="Trem-tipo" aside={<button type="button" className="mini" onClick={() => { const id = nextId(model.trains); st.commit((m) => { m.trains.push({ id, name: `Veículo ${id}`, length: 6, loads: [{ d: 1.5, P: 100 }, { d: 4.5, P: 100 }], q: 5, qIn: 0, impact: 1 }); }); st.set({ trainId: id }); }}>+ novo</button>}>
        {!train ? <Hint>Crie um veículo para calcular envoltórias de carga móvel.</Hint> : (
          <>
            {model.trains.length > 1 && <Select value={train.id} options={model.trains.map((t) => ({ v: t.id, label: t.name }))} onChange={(v) => st.set({ trainId: v })} />}
            <TextField label="Nome" value={train.name} onChange={(v) => updTrain((t) => { t.name = v; })} />
            <div className="row">
              <NumField label="Comprimento" unit="m" value={train.length} onChange={(v) => updTrain((t) => { t.length = Math.max(0, v); })} />
              <NumField label="Impacto" unit="×" value={train.impact} onChange={(v) => updTrain((t) => { t.impact = v; })} />
            </div>
            <div className="row">
              <NumField label="q fora do veículo" unit={U.q.label} value={U.q.to(train.q)} onChange={(v) => updTrain((t) => { t.q = U.q.from(v); })} />
              <NumField label="q′ sob o veículo" unit={U.q.label} value={U.q.to(train.qIn)} onChange={(v) => updTrain((t) => { t.qIn = U.q.from(v); })} />
            </div>
            <div className="trainloads">
              <div className="tl-head"><span>Posição a partir da frente (m)</span><span>Carga ({U.F.label})</span><span /></div>
              {train.loads.map((l, i) => (
                <div className="tl-row" key={i}>
                  <NumField label="" value={l.d} onChange={(v) => updTrain((t) => { t.loads[i].d = Math.min(Math.max(v, 0), t.length); })} />
                  <NumField label="" value={U.F.to(l.P)} onChange={(v) => updTrain((t) => { t.loads[i].P = U.F.from(v); })} />
                  <button type="button" className="x" aria-label="Remover eixo" onClick={() => updTrain((t) => { t.loads.splice(i, 1); })}>×</button>
                </div>
              ))}
              <button type="button" className="mini" onClick={() => updTrain((t) => { t.loads.push({ d: t.length, P: 50 }); })}>+ eixo</button>
            </div>
            <TrainSketch length={train.length} loads={train.loads.map((l) => ({ d: l.d, P: U.F.to(l.P) }))} />
            <Hint>Cargas concentradas sempre presentes; q e q′ entram só nos trechos desfavoráveis. O veículo percorre o caminho nos dois sentidos.</Hint>
          </>
        )}
      </Group>

      <Group title="Caminho e envoltória">
        <div className="row wrap">
          <span className="muted">{path ? `Caminho: ${pathIds.length} barra(s), ${fmt(path.reduce((s, p) => s + p.L, 0))} m` : 'As barras escolhidas não formam um caminho contínuo.'}</span>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={() => { if (!st.selMembers.size) { st.set({ tool: 'select', message: 'Selecione as barras do caminho (ferramenta Selecionar) e clique de novo.' }); return; } st.set({ trainPath: [...st.selMembers], trainResult: null, message: 'Caminho definido pelas barras selecionadas.' }); }}>Usar barras selecionadas</button>
          <button type="button" className="btn ghost" onClick={() => st.set({ trainPath: [], trainResult: null })}>Automático</button>
        </div>
        <Select label="Somar resultado estático" value={srcKey(st.trainStatic)} options={[{ v: '', label: 'Nenhum' }, ...sourceOptions(model).filter((o) => o.src.kind === 'case' || o.src.kind === 'combo').map((o) => ({ v: o.key, label: o.label }))]}
          onChange={(k) => st.set({ trainStatic: sourceOptions(model).find((o) => o.key === k)?.src ?? null, trainResult: null })} />
        {sectionStats?.env && (
          <dl className="kv">
            <dt>{il.effect} máx. na seção</dt><dd>{fmt(ue.to(sectionStats.env.max + sectionStats.sv))} {unit}</dd>
            <dt>{il.effect} mín. na seção</dt><dd>{fmt(ue.to(sectionStats.env.min + sectionStats.sv))} {unit}</dd>
            <dt>Frente do veículo (máx.)</dt><dd>{fmt(sectionStats.env.posMax)} m{sectionStats.env.revMax ? ' · sentido inverso' : ''}</dd>
            <dt>Frente do veículo (mín.)</dt><dd>{fmt(sectionStats.env.posMin)} m{sectionStats.env.revMin ? ' · sentido inverso' : ''}</dd>
          </dl>
        )}
        <button type="button" className="btn primary" disabled={!path || !train || busy} onClick={computeAll}>{busy ? 'Calculando…' : 'Calcular envoltória em toda a estrutura'}</button>
      </Group>
    </div>
  );
}

function TrainSketch({ length, loads }: { length: number; loads: { d: number; P: number }[] }) {
  const W = 280, pad = 14, L = Math.max(length, 0.1);
  const maxP = Math.max(1, ...loads.map((l) => Math.abs(l.P)));
  const x = (d: number) => pad + ((L - d) / L) * (W - 2 * pad);
  return (
    <svg className="trainsketch" viewBox={`0 -12 ${W} 88`} role="img" aria-label="Esquema do veículo">
      <rect x={pad} y={50} width={W - 2 * pad} height={10} rx={2} className="tbody" />
      <text x={W - pad} y={72} className="lbl" textAnchor="end">frente →</text>
      {loads.map((l, i) => {
        const h = 10 + (30 * Math.abs(l.P)) / maxP;
        return (
          <g key={i} className="load">
            <line x1={x(l.d)} x2={x(l.d)} y1={48 - h} y2={46} />
            <polygon points={`${x(l.d)},49 ${x(l.d) - 4},42 ${x(l.d) + 4},42`} />
            <text x={x(l.d)} y={44 - h} className="lbl load" textAnchor="middle">{fmt(l.P, 0)}</text>
          </g>
        );
      })}
    </svg>
  );
}
