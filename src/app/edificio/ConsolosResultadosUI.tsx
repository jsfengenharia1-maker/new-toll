// Resultados dos consolos curtos (E2e, interface): informação (tipo, esforços, tirante, biela, contato, cortante e armadura), erros em
// vermelho, relatório das verificações (C6.100), redimensionar com os esforços do último cálculo (C6.101), armadura editada e
// bloqueada, e o perfil do consolo em SVG. O cálculo está em core/building/consolos.ts (dimensionarConsolo, relatorioConsolo).
import { useState } from 'react';
import { Button, Hint, NumField, Pill, Select } from '../ui';
import { relatorioConsolo, type ResultadoConsolo } from '../../core/building/consolos';
import type { BuildingModel, Consolo } from '../../core/building/types';
import { calculoAtual, dimAtual, useBuilding } from './store';

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const ST = { ok: 'atende', fail: 'não atende' } as const;
const TOM = { ok: 'ok', fail: 'bad' } as const;
const INFO = /^Consolo: (a\/d|ancoragem)/;
const PHI_TIRANTE = [12.5, 16, 20, 25].map((v) => ({ v, label: `φ${fmt(v, 1)}` }));
const PHI_EST = [6.3, 8, 10].map((v) => ({ v, label: `φ${fmt(v, 1)}` }));

/** Perfil do consolo (face do pilar à esquerda), com o aparelho, o tirante e a biela. */
export function DesenhoConsolo({ c, r }: { c: Consolo; r: ResultadoConsolo }) {
  const k = 150 / Math.max(c.c, c.h), m = 14, W = c.c * k + 2 * m + 30, H = c.h * k + 2 * m + 12;
  const x0 = m + 12, yb = m + c.h * k, xa = x0 + c.a * k, la = c.aparelho.l * k, yt = m + 6;
  return (
    <svg className="det" viewBox={`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`} role="img" aria-label={`Perfil do consolo ${c.nome}`} data-consolo-desenho>
      <line x1={x0} x2={x0} y1={m - 6} y2={yb + 6} className="det-contorno" />
      <polygon points={`${x0},${yb} ${x0 + c.c * k},${m + (c.h - c.hp) * k} ${x0 + c.c * k},${m} ${x0},${m}`} className="det-contorno" />
      <rect x={xa - la / 2} y={m - 4} width={la} height={4} className="det-pt inf" />
      <line x1={x0 - 10} x2={x0 + c.c * k - 3} y1={yt} y2={yt} className="det-barra sup" />
      {r.biela && <line x1={x0} x2={xa} y1={yb} y2={m} className="det-fio" />}
      <text x={x0 + 4} y={yt - 8 + 14} className="det-txt sup">{r.arranjo.tirante.n}φ{fmt(r.arranjo.tirante.phi, r.arranjo.tirante.phi % 1 ? 1 : 0)}</text>
      <text x={W / 2} y={H - 3} textAnchor="middle" className="det-txt cota">{fmt(c.b * 100, 0)} × {fmt(c.h * 100, 0)} / {fmt(c.hp * 100, 0)} cm · a = {fmt(c.a * 100, 0)} cm · balanço {fmt(c.c * 100, 0)} cm</text>
    </svg>
  );
}

/** Armadura do consolo: valores atuais (calculados ou bloqueados), edição e fixação. */
function ArmaduraConsolo({ c, r }: { c: Consolo; r: ResultadoConsolo }) {
  const { exec } = useBuilding();
  const [n, setN] = useState(r.arranjo.tirante.n), [phi, setPhi] = useState(r.arranjo.tirante.phi);
  const [nh, setNh] = useState(r.arranjo.horizontais.n), [phiH, setPhiH] = useState(r.arranjo.horizontais.phi);
  const [phiV, setPhiV] = useState(r.arranjo.verticais.phi), [sV, setSV] = useState(Math.round(r.arranjo.verticais.s * 100));
  return (
    <div data-consolo-armadura>
      <div className="row wrap u-items-end">
        <NumField label="Tirante do consolo: barras" width={190} value={n} onChange={(x) => setN(Math.max(2, Math.round(x)))} />
        <Select label="Tirante do consolo: bitola" value={phi} options={PHI_TIRANTE} onChange={setPhi} />
        <NumField label="Costura do consolo: estribos horizontais" width={250} value={nh} onChange={(x) => setNh(Math.max(1, Math.round(x)))} />
        <Select label="Costura do consolo: bitola" value={phiH} options={PHI_EST} onChange={setPhiH} />
        <Select label="Estribos verticais do consolo: bitola" value={phiV} options={PHI_EST} onChange={setPhiV} />
        <NumField label="Estribos verticais do consolo: espaçamento" unit="cm" width={290} value={sV} onChange={(x) => setSV(Math.max(3, x))} />
      </div>
      <div className="row wrap">
        <Button onClick={() => exec('consolo.editar', { id: c.id, armadura: { tirante: { n, phi }, horizontais: { n: nh, phi: phiH }, verticais: { phi: phiV, s: sV / 100 } } })}>Fixar a armadura do consolo</Button>
        <Button disabled={!c.armadura} onClick={() => exec('consolo.redimensionar', { ids: [c.id] })}>Redimensionar o consolo</Button>
      </div>
    </div>
  );
}

/** Resultados de um consolo lançado. */
export function ConsoloResultados({ b, id }: { b: BuildingModel; id: string }) {
  const atual = useBuilding((s) => calculoAtual(s) && dimAtual(s));
  const dim = useBuilding((s) => s.dim);
  const [relatorio, setRelatorio] = useState(false);
  const c = b.consolos?.find((x) => x.id === id);
  if (!c) return null;
  if (!dim || !atual) return <div data-consolo-resultados><Hint>Calcule o edifício (aba Dimensionamento) para ver o tirante, a biela e os erros deste consolo.</Hint></div>;
  const r = dim.consolos?.find((x) => x.consolo === id);
  if (!r) return <div data-consolo-resultados><Hint>Este consolo não entrou no último cálculo (a viga não foi dimensionada ou foi removida).</Hint></div>;
  const erros = r.mensagens.filter((m) => !INFO.test(m)), infos = r.mensagens.filter((m) => INFO.test(m));
  return (
    <div data-consolo-resultados>
      <p className="small"><b>{r.nome}</b> <Pill tone={TOM[r.status]}>{ST[r.status]}</Pill> — consolo {r.tipo} (a/d = {fmt(r.ad)})</p>
      <ul className="small">
        <li>Vd = {fmt(r.Vd, 1)} kN{r.combinacao ? ` (${r.combinacao})` : ''}; Hd = {fmt(r.Hd, 1)} kN (mínima {fmt(r.HdMin, 1)} kN); d = {fmt(r.d * 100, 1)} cm; z = {fmt(r.z * 100, 1)} cm.</li>
        <li>Tirante: Rst = {fmt(r.Rst, 1)} kN; As necessária {fmt(r.As.calc * 1e4)} cm² (mínima {fmt(r.As.min * 1e4)} cm²); adotada {fmt(r.As.ef * 1e4)} cm² ({r.arranjo.tirante.n}φ{fmt(r.arranjo.tirante.phi, r.arranjo.tirante.phi % 1 ? 1 : 0)}){r.bloqueada ? ' (bloqueada)' : ''}.</li>
        {r.biela && <li>Biela: θ = {fmt(r.biela.theta, 1)}°, σ = {fmt(r.biela.tensao, 1)} MPa de {fmt(r.biela.limite, 1)} MPa (utilização {fmt(r.biela.util)}).</li>}
        <li>Contato no aparelho: {fmt(r.apoio.tensao, 1)} MPa de {fmt(r.apoio.limite, 1)} MPa ({fmt(r.apoio.util)}); cortante: {fmt(r.cortante.Vd, 0)} kN de VRd2 = {fmt(r.cortante.VRd2, 0)} kN ({fmt(r.cortante.util)}).</li>
        <li>Costura: {r.arranjo.horizontais.n} estribos horizontais fechados φ{fmt(r.arranjo.horizontais.phi, 1)} ({fmt(r.costura.ef * 1e4)} de {fmt(r.costura.nec * 1e4)} cm²); estribos verticais φ{fmt(r.arranjo.verticais.phi, 1)} c/{fmt(r.arranjo.verticais.s * 100, 0)}; ancoragem {fmt(r.ancoragem.lbNec * 100, 0)} cm de {fmt(r.ancoragem.disponivel * 100, 0)} cm.</li>
      </ul>
      {infos.length > 0 && <ul className="small" data-consolo-avisos>{infos.map((m, i) => <li key={i} className="warn">{m}</li>)}</ul>}
      {erros.length > 0 && <ul className="small" data-consolo-erros>{erros.map((m, i) => <li key={i} className="bad">{m}</li>)}</ul>}
      <DesenhoConsolo c={c} r={r} />
      <div className="row wrap">
        <Button aria-label={`Relatório do consolo ${r.nome}`} onClick={() => setRelatorio(!relatorio)}>{relatorio ? 'Ocultar o relatório do consolo' : 'Ver o relatório do consolo'}</Button>
      </div>
      {relatorio && <ul className="small" data-consolo-relatorio>{relatorioConsolo(r).map((t, i) => <li key={i}>{t}</li>)}</ul>}
      <ArmaduraConsolo key={`${c.id}-${c.armadura ? 'b' : 'a'}-${r.arranjo.tirante.n}-${r.arranjo.tirante.phi}`} c={c} r={r} />
    </div>
  );
}
