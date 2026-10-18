import { useState } from 'react';
import { useStore } from '../store';
import { Group, Hint, Seg, Select } from '../ui';
import { fmt, useAnalysis } from '../results';
import { buckling, comboLoading, vibration } from '../../core/secondorder';
import { sourceOptions } from './Resultados';

type Kind = 'buckling' | 'vibration';
type Row = { label: string; a: string; b: string; c: string; shape: Float64Array };

/** Flambagem global (fatores de carga crítica) e vibração livre (frequências e massas modais). */
export function ModosGroup() {
  const st = useStore();
  const a = useAnalysis();
  const { model } = st;
  const [kind, setKind] = useState<Kind>('buckling');
  const opts = sourceOptions(model).filter((o) => o.src.kind === 'case' || o.src.kind === 'combo');
  const [key, setKey] = useState(() => opts.find((o) => o.src.kind === 'combo')?.key ?? opts[0]?.key ?? '');
  const [rows, setRows] = useState<{ kind: Kind; key: string; list: Row[]; note: string; model: object } | null>(null);
  const stale = rows && rows.model !== model;

  const factorsOf = (k: string): Record<number, number> => {
    const o = opts.find((x) => x.key === k);
    if (!o) return {};
    if (o.src.kind === 'case') return { [o.src.id]: 1 };
    const id = o.src.kind === 'combo' ? o.src.id : -1;
    return model.combinations.find((c) => c.id === id)?.factors ?? {};
  };
  // massa: cargas permanentes + ψ2 das variáveis (combinação quase permanente)
  const massFactors = () => Object.fromEntries(model.cases.map((c) => [c.id, (c.nature ?? 'G') === 'G' ? 1 : c.psi2 ?? (c.nature === 'W' ? 0 : 0.3)]));

  const run = () => {
    if (a.prep.error) return;
    if (kind === 'buckling') {
      const r = buckling(a.prep, comboLoading(a.prep, factorsOf(key)), 4);
      setRows({ kind, key, model, note: r.error ?? `Carga crítica = λ × ${opts.find((o) => o.key === key)?.label ?? ''}. Análise elástica com EI integral (sem redução).`, list: r.modes.map((m, i) => ({ label: `${i + 1}`, a: fmt(m.factor, 3), b: m.factor < 1 ? 'instável' : m.factor < 10 ? 'sensível' : 'ok', c: '', shape: m.shape })) });
    } else {
      const r = vibration(a.prep, comboLoading(a.prep, massFactors()), new Map(), 6);
      const tot = r.totalMass || 1;
      setRows({ kind, key, model, note: r.error ?? `Massa total ${fmt(r.totalMass, 2)} t (G + ψ2·Q, concentrada nos nós; inércia rotacional desprezada).`, list: r.modes.map((m, i) => ({ label: `${i + 1}`, a: fmt(m.freq, 3), b: fmt(m.period, 3), c: `${Math.round((100 * m.massX) / tot)} / ${Math.round((100 * m.massY) / tot)}`, shape: m.shape })) });
    }
    st.set({ modeView: null });
  };

  const show = (r: Row) => st.set({ modeView: { title: `${rows!.kind === 'buckling' ? 'Modo de flambagem' : 'Modo de vibração'} ${r.label}: ${rows!.kind === 'buckling' ? `λ = ${r.a}` : `f = ${r.a} Hz`}`, shape: [...r.shape] }, message: 'Modo desenhado sobre a estrutura (amplitude arbitrária).' });

  return (
    <Group title="Estabilidade e vibração" open={false}>
      <Seg value={kind} onChange={(v) => { setKind(v); setRows(null); }} options={[{ v: 'buckling', label: 'Flambagem global' }, { v: 'vibration', label: 'Vibração livre' }]} />
      {kind === 'buckling' && <Select label="Carregamento" value={key} options={opts.map((o) => ({ v: o.key, label: o.label }))} onChange={setKey} />}
      <button type="button" className="btn primary" disabled={!!a.prep.error} onClick={run}>Calcular modos</button>
      {rows && rows.kind === kind && (
        <>
          {stale && <Hint>O modelo mudou: recalcule.</Hint>}
          <Hint>{rows.note}</Hint>
          {rows.list.length > 0 && (
            <div className="tablewrap">
              <table className="data">
                <thead><tr>{kind === 'buckling' ? <><th>Modo</th><th>λ (fator)</th><th>Situação</th></> : <><th>Modo</th><th>f (Hz)</th><th>T (s)</th><th>Massa X / Y (%)</th></>}<th /></tr></thead>
                <tbody>{rows.list.map((r) => (
                  <tr key={r.label}><td>{r.label}</td><td>{r.a}</td><td>{r.b}</td>{kind === 'vibration' && <td>{r.c}</td>}<td><button type="button" className="mini" onClick={() => show(r)}>ver</button></td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {st.modeView && <button type="button" className="btn ghost" onClick={() => st.set({ modeView: null })}>Ocultar modo</button>}
        </>
      )}
      <Hint>{kind === 'buckling' ? 'Resolve (K + λ·K_G)·φ = 0 com os esforços normais da análise linear. λ < 1: a estrutura flamba antes de atingir o carregamento escolhido.' : 'Resolve K·φ = ω²·M·φ. Massas das cargas verticais da combinação quase permanente divididas por g.'}</Hint>
    </Group>
  );
}


