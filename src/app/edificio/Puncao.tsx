// Punção e cortante das lajes (frente N2d): aba da janela da laje com os contornos críticos C, C′ e C″ em SVG (recortados
// pela laje e pelos furos), τSd × resistências por contorno, a armadura de punção (calculada e informada, com o
// editor de grupos), a varredura de cortante e a origem dos resultados.
import { useState } from 'react';
import { useBuilding } from './store';
import { executarERecalcular } from './Armadura';
import { fmt, phiTxt } from './Detalhamento';
import { Mensagens, Origens } from './Revisao';
import { Button, Hint, KV, NumField, Pill, Select } from '../ui';
import type { P } from '../../core/geom/faces';
import type { ResultadoPuncao } from '../../core/building/puncao';
import { BITOLAS_PUNCAO } from '../../core/building/puncao';

const TIPO_TXT = { interno: 'interno', borda: 'de borda', canto: 'de canto' } as const;
const ST_PUN = { ok: 'sem armadura', armadura: 'com armadura', fail: 'não atende' } as const;
const BIT = BITOLAS_PUNCAO.map((v) => ({ v, label: phiTxt(v) }));
const kPa = (v: number) => fmt(v, 3);

/** Cantos do pilar (m) a partir do centro, das dimensões e do ângulo. */
export function cantosDoPilar(r: Pick<ResultadoPuncao, 'centro' | 'c1' | 'c2' | 'circular' | 'angulo'>): P[] {
  const a = (r.angulo * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a), n = r.circular ? 24 : 4;
  if (r.circular) return Array.from({ length: n }, (_, k) => [r.centro[0] + (r.c1 / 2) * Math.cos((2 * Math.PI * k) / n), r.centro[1] + (r.c1 / 2) * Math.sin((2 * Math.PI * k) / n)] as P);
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([i, j]) => { const u = (i * r.c1) / 2, v = (j * r.c2) / 2; return [r.centro[0] + u * co - v * si, r.centro[1] + u * si + v * co] as P; });
}

function FiguraPuncao({ r }: { r: ResultadoPuncao }) {
  const l = useBuilding((s) => s.sessao.modelo.lajes.find((x) => x.id === r.laje) ?? s.sessao.modelo.fundacao?.radiers?.find((x) => x.id === r.laje));
  const pts = [...cantosDoPilar(r), ...r.contornos.flatMap((c) => c.pontos.flat()), ...r.armadura?.posicoes.flat() ?? []];
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), mg = 0.25;
  const x0 = Math.min(...xs) - mg, x1 = Math.max(...xs) + mg, y0 = Math.min(...ys) - mg, y1 = Math.max(...ys) + mg;
  const W = 560, esc = Math.min(W / (x1 - x0), 380 / (y1 - y0)), H = (y1 - y0) * esc;
  const X = (v: number) => +((v - x0) * esc).toFixed(1), Y = (v: number) => +((y1 - v) * esc).toFixed(1);
  const anel = (q: P[], fecha = true) => q.map((p, i) => `${i ? 'L' : 'M'}${X(p[0])},${Y(p[1])}`).join('') + (fecha ? 'Z' : '');
  return (
    <svg className="det pun-fig" viewBox={`0 0 ${W} ${H.toFixed(0)}`} role="img" aria-label={`Contornos críticos de punção do pilar ${r.nome}`} data-puncao-fig={r.pilar} data-contornos={r.contornos.length}>
      {l && <path d={anel(l.contorno as P[])} className="pun-laje" />}
      {(l?.furos ?? []).map((f, i) => <path key={i} d={anel(f as P[])} className="det-furo" />)}
      <path d={anel(cantosDoPilar(r))} className="det-pilar" />
      {r.contornos.map((c, k) => c.pontos.map((pl, j) => <path key={`${k}.${j}`} d={anel(pl, false)} className={`pun-c pun-c${k}${c.ok ? '' : ' falha'}`} data-contorno={c.nome} />))}
      {r.armadura?.posicoes.map((linha, i) => linha.map((p, j) => <circle key={`${i}.${j}`} cx={X(p[0])} cy={Y(p[1])} r={2.6} className="pun-barra" data-barra />))}
      {r.contornos.map((c, k) => c.pontos[0] && <text key={k} x={X(c.pontos[0][0][0]) + 3} y={Y(c.pontos[0][0][1]) - 3} className="det-txt cota">{c.nome}</text>)}
    </svg>
  );
}

function EditorGrupos({ r }: { r: ResultadoPuncao }) {
  const [n, setN] = useState({ linhas: 8, barras: 3, phi: 6.3, s: 12 });
  const b = useBuilding((s) => s.sessao.modelo), calculando = useBuilding((s) => s.calculando);
  const laje = b.lajes.find((x) => x.id === r.laje);
  const grupos = (laje?.puncao ?? []).filter((g) => g.pilar === r.pilar);
  return (
    <div data-editor-puncao>
      <h4>Armadura de punção informada (somada à calculada)</h4>
      {grupos.length === 0 ? <p className="muted small">Nenhum grupo informado.</p> : (
        <ul className="revmsg" data-grupos-puncao={grupos.length}>
          {grupos.map((g) => (
            <li key={g.id}>
              {g.linhas} linhas × {g.barras} barras {phiTxt(g.phi)} c/{fmt((g.s ?? 0.15) * 100, 0)} cm{' '}
              <Button variant="danger" disabled={calculando} onClick={() => executarERecalcular('laje.puncao', { id: r.laje, remover: [g.id] })}>Apagar</Button>
            </li>
          ))}
        </ul>
      )}
      <div className="row wrap">
        <NumField label="Linhas radiais" width={90} value={n.linhas} onChange={(v) => v >= 2 && setN({ ...n, linhas: Math.round(v) })} />
        <NumField label="Barras por linha" width={100} value={n.barras} onChange={(v) => v >= 1 && setN({ ...n, barras: Math.round(v) })} />
        <Select label="φ" value={n.phi} options={BIT} onChange={(v) => setN({ ...n, phi: v })} />
        <NumField label="Espaçamento radial" unit="cm" width={110} value={n.s} onChange={(v) => v >= 3 && setN({ ...n, s: v })} />
        <Button disabled={calculando} onClick={() => executarERecalcular('laje.puncao', { id: r.laje, adicionar: [{ pilar: r.pilar, linhas: n.linhas, barras: n.barras, phi: n.phi, s: n.s / 100 }] })}>Adicionar grupo</Button>
        <Button variant="danger" disabled={calculando || !grupos.length} onClick={() => executarERecalcular('laje.puncao', { id: r.laje, pilares: [r.pilar] })}>Apagar os grupos do pilar</Button>
      </div>
      <Hint>As barras novas somam-se às calculadas; para substituir, apague antes. O recálculo abate a armadura informada da exigência.</Hint>
    </div>
  );
}

/** Cartão de um apoio: figura, tensões por contorno, armadura e cortante; `semEditor` no radier (sem grupos informados). */
export function CartaoPuncao({ r, semEditor }: { r: ResultadoPuncao; semEditor?: boolean }) {
  const tom = r.status === 'fail' ? 'bad' : r.status === 'armadura' ? 'warn' : 'ok';
  const dim1 = r.circular ? `ø${fmt(r.c1 * 100, 0)}` : `${fmt(r.c1 * 100, 0)}×${fmt(r.c2 * 100, 0)}`;
  const a = r.armadura;
  return (
    <section className="rev-lance" data-puncao={r.pilar} data-status={r.status} data-tipo-apoio={r.tipo}>
      <h4>{r.nome} {dim1} cm · pilar {TIPO_TXT[r.tipo]}{r.origem === 'viga' ? ' (viga chata)' : r.origem === 'radier' ? ` (radier ${r.lajeNome}${r.combinacao ? `, ${r.combinacao}` : ''})` : ''} · <Pill tone={tom}>{ST_PUN[r.status]}</Pill></h4>
      <FiguraPuncao r={r} />
      <div className="tablewrap">
        <table className="data quadro" data-contornos-puncao>
          <thead><tr><th>Contorno</th><th>Afastamento (m)</th><th>u (m)</th><th>τSd (MPa)</th><th>Resistência</th><th>Valor (MPa)</th><th></th></tr></thead>
          <tbody>
            {r.contornos.map((c) => <tr key={c.nome} className={c.ok ? '' : 'bad'} data-contorno={c.nome}><td className="tl">{c.nome}</td><td className="num">{fmt(c.a)}</td><td className="num">{fmt(c.u)}</td><td className="num">{kPa(c.tau)}</td><td className="tl">{c.limiteNome}</td><td className="num">{kPa(c.limite)}</td><td className="tl">{c.ok ? 'ok' : 'excede'}</td></tr>)}
          </tbody>
        </table>
      </div>
      <KV rows={[
        ['FSd (kN)', fmt(r.F, 1)], ['MSd com excentricidade em u / v (kN·m)', `${fmt(r.M[0], 1)} / ${fmt(r.M[1], 1)}`],
        ['K em u / v', `${fmt(r.K[0])} / ${fmt(r.K[1])}`], ['Wp (C′) em u / v (m²)', `${fmt(r.contornos[1].Wp[0], 3)} / ${fmt(r.contornos[1].Wp[1], 3)}`],
        ['e* (C′) em u / v (m)', `${fmt(r.contornos[1].e[0], 3)} / ${fmt(r.contornos[1].e[1], 3)}`], ['MSd1 (C′) em u / v (kN·m)', `${fmt(r.contornos[1].M1[0], 1)} / ${fmt(r.contornos[1].M1[1], 1)}`],
        ['h / d (cm)', `${fmt(r.h * 100, 1)} / ${fmt(r.d * 100, 1)}`], ['ρ = √(ρx·ρy) (%)', fmt(r.rho * 100, 3)], ['τRd1 / τRd2 (MPa)', `${kPa(r.tauRd1)} / ${kPa(r.tauRd2)}`],
        ...(r.tauRd3 !== undefined ? [['τRd3 com a armadura (MPa)', kPa(r.tauRd3)] as [string, string]] : []),
      ]} />
      {a && (
        <>
          <h4>Armadura de punção calculada</h4>
          <KV rows={[
            ['Tipo', a.tipo === 'estribo' ? 'estribos (grampos verticais, 2 pernas)' : 'conectores (1 perna)'], ['Barras', `${a.linhas} linhas radiais × ${a.barras} barras ${phiTxt(a.phi)} = ${a.total}`],
            ['Primeira barra / entre barras', `${fmt(a.s0 * 100, 1)} / ${fmt(a.sr * 100, 1)} cm`], ['Asw por anel', `${fmt(a.AswAnel)} cm²`],
          ]} />
        </>
      )}
      {r.cortante.superficies.length > 0 && (
        <details className="small">
          <summary>Cortante da laje em superfícies afastadas ({r.cortante.superficies.length}){r.cortante.falha ? ' — excede VRd1' : ''}</summary>
          <div className="tablewrap">
            <table className="data quadro" data-cortante-puncao>
              <thead><tr><th>Afastamento (m)</th><th>u (m)</th><th>Área (m²)</th><th>V (kN)</th><th>v (kN/m)</th><th>VRd1 (kN/m)</th><th>Asw/anel (cm²)</th></tr></thead>
              <tbody>{r.cortante.superficies.map((s, i) => <tr key={i} className={s.ok ? '' : 'bad'}><td className="num">{fmt(s.a)}</td><td className="num">{fmt(s.u)}</td><td className="num">{fmt(s.A)}</td><td className="num">{fmt(s.V, 1)}</td><td className="num">{fmt(s.v, 1)}</td><td className="num">{fmt(s.vRd1, 1)}</td><td className="num">{s.Asw ? fmt(s.Asw) : '—'}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="hint">VRd2 = {fmt(r.cortante.vRd2, 1)} kN/m. Superfícies a cada 0,75d a partir do contorno C′ (varredura), com V = FSd − q·A.</p>
        </details>
      )}
      {!semEditor && <EditorGrupos r={r} />}
      <Origens o={r.origens} />
      <Mensagens msgs={r.mensagens} />
    </section>
  );
}

/** Aba "Punção e cortante" da janela da laje: um cartão por pilar (e viga chata), do pavimento escolhido. */
export function JanelaPuncao({ id }: { id: string }) {
  const dim = useBuilding((s) => s.dim);
  const rs = dim?.puncao?.filter((r) => r.laje === id) ?? [];
  const pavs = [...new Set(rs.map((r) => r.pavimento))];
  const [pav, setPav] = useState<string>('');
  if (!rs.length) return <p className="muted">Sem verificação de punção nesta laje (só pilares que apoiam a laje sem viga e vigas chatas largas).</p>;
  const atual = pavs.includes(pav) ? pav : pavs[0];
  return (
    <div data-janela-puncao={id}>
      <p className="small">Contornos C (face do pilar), C′ (a 2d) e C″ (a 2d da última linha de armadura) recortados pela laje e pelos furos; τSd = FSd/(u·d) + ΣK·MSd1/(Wp·d). Contorno em vermelho: a tensão excede a resistência.</p>
      {pavs.length > 1 && <Select label="Pavimento" value={atual} options={pavs.map((p) => ({ v: p, label: p }))} onChange={setPav} />}
      {rs.filter((r) => r.pavimento === atual).map((r) => <CartaoPuncao key={r.id} r={r} />)}
    </div>
  );
}
