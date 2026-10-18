import { useState } from 'react';
import { useStore, type Diagram, type Source } from '../store';
import { Check, Group, Hint, Seg, copyText, download } from '../ui';
import { useAnalysis, resultFor, fmt, memberSeries, sourceLabel, type Eff } from '../results';
import { P } from '../../core/math';
import { useUnits, type Units } from '../units';
import { buildPath } from '../../core/influence';
import { defaultPath, pathTable } from '../pathTable';
import { ModosGroup } from './Modos';

export function sourceOptions(model: { cases: { id: number; name: string }[]; combinations: { id: number; name: string }[] }) {
  const opts: { key: string; label: string; src: Source }[] = [];
  model.cases.forEach((c) => opts.push({ key: `c${c.id}`, label: `Caso · ${c.name}`, src: { kind: 'case', id: c.id } }));
  model.combinations.forEach((c) => opts.push({ key: `k${c.id}`, label: `Comb. · ${c.name}`, src: { kind: 'combo', id: c.id } }));
  if (model.cases.length > 1) opts.push({ key: 'ec', label: 'Envoltória dos casos', src: { kind: 'envCases' } });
  if (model.combinations.length > 1) opts.push({ key: 'ek', label: 'Envoltória das combinações', src: { kind: 'envCombos' } });
  return opts;
}
export const srcKey = (s: Source | null) => (!s ? '' : s.kind === 'case' ? `c${s.id}` : s.kind === 'combo' ? `k${s.id}` : s.kind === 'envCases' ? 'ec' : 'ek');

export function ResultadosPanel() {
  const st = useStore();
  const U = useUnits();
  const a = useAnalysis();
  const { model } = st;
  const opts = sourceOptions(model);
  const results = resultFor(a, st.source);
  const [table, setTable] = useState<'reac' | 'disp' | 'ends'>('reac');

  if (a.prep.error) {
    return <div className="panel-body"><div className="alert">{a.prep.error}</div><Hint>Corrija na aba Estrutura (apoios, rótulas) e os resultados aparecem na hora.</Hint></div>;
  }

  const summary = (['N', 'V', 'M'] as Eff[]).map((e) => {
    let hi = -Infinity, lo = Infinity, at = '';
    for (const pm of a.prep.members) {
      const s = memberSeries(results, pm.index, pm.L, e);
      s.xs.forEach((x, j) => { if (s.max[j] > hi) { hi = s.max[j]; at = `barra ${pm.id}, x = ${fmt(x)} m`; } if (s.min[j] < lo) lo = s.min[j]; });
    }
    return { e, hi, lo, at };
  });
  let dmax = 0, dnode = 0;
  for (const r of results) model.nodes.forEach((n, k) => { const d = Math.hypot(r.u[k * 3], r.u[k * 3 + 1]); if (d > dmax) { dmax = d; dnode = n.id; } });

  const rows = buildTable(table, results.length === 1 ? results[0] : null, a, model, U);

  return (
    <div className="panel-body">
      <Group title="Carregamento">
        <div className="srclist">
          {opts.map((o) => (
            <button type="button" key={o.key} className={`caseitem${srcKey(st.source) === o.key ? ' on' : ''}`} onClick={() => st.set({ source: o.src })}>{o.label}</button>
          ))}
        </div>
      </Group>
      <Group title="Diagrama">
        <Seg value={st.diagram} onChange={(v: Diagram) => st.set({ diagram: v })} options={[
          { v: 'N', label: 'Normal' }, { v: 'V', label: 'Cortante' }, { v: 'M', label: 'Momento' }, { v: 'deformed', label: 'Deformada' }, { v: 'none', label: '—' },
        ]} />
        <label className="field" htmlFor="diagscale">
          <span className="flabel">Escala do desenho · {fmt(st.diagScale, 1)}×</span>
          <input id="diagscale" type="range" min={0.2} max={4} step={0.1} value={st.diagScale} onChange={(e) => st.set({ diagScale: +e.target.value })} />
        </label>
        <div className="row wrap">
          <Check label="Valores" checked={st.showValues} onChange={(v) => st.set({ showValues: v })} />
          <Check label="Reações" checked={st.showReactions} onChange={(v) => st.set({ showReactions: v })} />
          <Check label="Momento no lado tracionado" checked={st.mTension} onChange={(v) => st.set({ mTension: v })} />
        </div>
        <Hint>Passe o mouse sobre uma barra para ler N, V, M e deslocamentos no ponto.</Hint>
      </Group>
      <Group title={`Extremos · ${sourceLabel(model, st.source)}`}>
        <table className="summary">
          <thead><tr><th /><th>máx.</th><th>mín.</th></tr></thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s.e} title={s.at}><th className={`v${s.e}`}>{`${s.e} (${U.eff(s.e).label})`}</th><td>{fmt(U.eff(s.e).to(s.hi))}</td><td>{fmt(U.eff(s.e).to(s.lo))}</td></tr>
            ))}
            <tr><th>Desloc. (mm)</th><td colSpan={2}>{fmt(dmax * 1000)} no nó {dnode}</td></tr>
          </tbody>
        </table>
      </Group>
      <Group title="Tabelas">
        {results.length !== 1 ? <Hint>Tabelas disponíveis para um caso ou uma combinação (não para envoltórias).</Hint> : (
          <>
            <Seg small value={table} onChange={setTable} options={[{ v: 'reac', label: 'Reações' }, { v: 'disp', label: 'Deslocamentos' }, { v: 'ends', label: 'Esforços nas extremidades' }]} />
            <div className="tablewrap">
              <table className="data">
                <thead><tr>{rows.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{rows.body.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={async () => { const csv = toCSV(rows); const ok = await copyText(csv); st.set({ message: ok ? 'Tabela copiada (CSV com ;). Cole no Excel.' : 'Não foi possível copiar.' }); }}>Copiar</button>
              <button type="button" className="btn ghost" onClick={() => { download(`${table}.csv`, '﻿' + toCSV(rows), 'text/csv'); }}>Baixar CSV</button>
            </div>
          </>
        )}
      </Group>
      <Group title="Ao longo de um caminho">
        <Hint>Usa as barras selecionadas (em cadeia contínua); sem seleção, o caminho do trem-tipo ou as barras horizontais mais altas. Gera s acumulado, barra, x local, N, V, M ({U.F.label}, {U.M.label}) e δx, δy (mm); em envoltória, máximos e mínimos. M no sentido do caminho.</Hint>
        <button type="button" className="btn" onClick={() => {
          if (!results.length) { st.set({ message: 'Escolha um caso, uma combinação ou uma envoltória com resultados.' }); return; }
          const ids = st.selMembers.size ? [...st.selMembers] : st.trainPath.length ? st.trainPath : defaultPath(model);
          const path = buildPath(a.prep, ids);
          if (!path) { st.set({ message: 'As barras escolhidas não formam uma cadeia contínua (sem ramificações). Ajuste a seleção.' }); return; }
          const rows = pathTable(a, results, path, U);
          const name = `caminho-${sourceLabel(model, st.source).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}.csv`;
          download(name, '\ufeff' + toCSV(rows), 'text/csv');
          st.set({ message: `CSV ao longo do caminho: barras ${path.map((p) => a.prep.members[p.k].id).join(' → ')} · ${fmt(path.reduce((s, p) => s + p.L, 0))} m · ${rows.body.length} pontos.` });
        }}>CSV ao longo do caminho</button>
      </Group>
      <ModosGroup />
    </div>
  );
}

type Rows = { head: string[]; body: string[][] };

function buildTable(kind: 'reac' | 'disp' | 'ends', r: ReturnType<typeof resultFor>[number] | null, a: ReturnType<typeof useAnalysis>, model: { nodes: { id: number }[] }, U: Units): Rows {
  if (!r) return { head: [], body: [] };
  if (kind === 'reac') {
    const body: string[][] = [];
    r.reactions.forEach((R, k) => body.push([String(model.nodes[k].id), fmt(U.F.to(R[0])), fmt(U.F.to(R[1])), fmt(U.M.to(R[2]))]));
    return { head: ['Nó', `Rx (${U.F.label})`, `Ry (${U.F.label})`, `Mz (${U.M.label})`], body };
  }
  if (kind === 'disp') {
    return { head: ['Nó', 'δx (mm)', 'δy (mm)', 'θz (rad)'], body: model.nodes.map((n, k) => [String(n.id), fmt(r.u[k * 3] * 1000, 3), fmt(r.u[k * 3 + 1] * 1000, 3), fmt(r.u[k * 3 + 2], 6)]) };
  }
  return {
    head: ['Barra', `N i (${U.F.label})`, `V i (${U.F.label})`, `M i (${U.M.label})`, `N j (${U.F.label})`, `V j (${U.F.label})`, `M j (${U.M.label})`],
    body: a.prep.members.map((pm) => {
      const m = r.members[pm.index];
      const ev = (p: number[], x: number, c = U.F) => fmt(c.to(P.evaluate(p, x)));
      return [String(pm.id), ev(m.N, 0), ev(m.V, 0), ev(m.M, 0, U.M), ev(m.N, pm.L), ev(m.V, pm.L), ev(m.M, pm.L, U.M)];
    }),
  };
}

function toCSV(rows: Rows) {
  return [rows.head, ...rows.body].map((r) => r.join(';')).join('\n');
}
