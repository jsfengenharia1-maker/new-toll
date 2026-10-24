// Vento nos deslocamentos (V7c, K1.11.50 e K1.15.3-1): deslocamento e distorção por direção de vento e por pavimento, e o
// vento nos nós da malha (máximo por pano e saída em CSV). A matemática vem de src/core/resultados/ventoDirecao.ts.
import { useMemo } from 'react';
import type { AnaliseEdificio } from '../../core/building/analitico';
import type { BuildingModel } from '../../core/building/types';
import { csvDeslocamentosVento, deslocamentosVentoMalha, maximosVentoPorPano, ventoPorDirecao } from '../../core/resultados/ventoDirecao';
import { Button, Group, Hint, download } from '../ui';

const mm = (v: number, d = 2) => (v * 1000).toFixed(d).replace('.', ',');

export function DeslocamentosVento({ b, an }: { b: BuildingModel; an: AnaliseEdificio }) {
  const dirs = useMemo(() => ventoPorDirecao(b, an), [b, an]);
  const linhas = useMemo(() => deslocamentosVentoMalha(b, an), [b, an]);
  const panos = useMemo(() => maximosVentoPorPano(b, linhas), [b, linhas]);
  const casos = an.vento?.casos.map((c) => c.nome) ?? [];
  if (!dirs.length) return <Group title="Vento por direção e na malha"><p className="hint">A obra não tem vento calculado (ative o vento nas ações).</p></Group>;
  return (
    <Group title="Vento por direção e na malha">
      <p className="hint">Valores característicos de cada caso de vento; o limite é conferido na combinação frequente (ψ1 = {dirs[0].psi1.toString().replace('.', ',')}). Distorção = deslocamento relativo do lance ÷ altura.</p>
      <div className="tablewrap" data-desloc-vento={dirs.length}>
        <table className="data quadro">
          <thead><tr><th>Caso (direção)</th><th>Pavimento</th><th>|u| topo (mm)</th><th>Pilar</th><th>Δ do lance (mm)</th><th>Distorção</th><th>Pilar da distorção</th><th>Δ freq. (mm)</th><th>Limite hi/n (mm)</th><th>Situação</th></tr></thead>
          <tbody>
            {dirs.flatMap((d) => d.pavimentos.map((p, i) => (
              <tr key={`${d.caso}-${p.pavimento}`} className={p.ok ? '' : 'bad'}>
                <td className="tl">{i === 0 ? `${d.caso} (${d.direcao}°)` : ''}</td><td className="tl">{p.pavimentoNome}</td>
                <td className="num">{mm(p.u)}</td><td className="tl">{p.pilarU}</td><td className="num">{mm(p.drift)}</td>
                <td className="num">{(p.distorcao * 1000).toFixed(3).replace('.', ',')}‰</td><td className="tl">{p.pilarDrift}</td>
                <td className="num">{mm(p.driftFreq)}</td><td className="num">{mm(p.limDrift)}</td><td className="tl">{p.ok ? 'atende' : 'não atende'}</td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
      <div className="tablewrap" data-desloc-vento-topo={dirs.length}>
        <table className="data quadro">
          <thead><tr><th>Caso (direção)</th><th>H (m)</th><th>Topo freq. (mm)</th><th>Limite H/n (mm)</th><th>Situação</th></tr></thead>
          <tbody>
            {dirs.map((d) => <tr key={d.caso} className={d.ok ? '' : 'bad'}><td className="tl">{d.caso} ({d.direcao}°)</td><td className="num">{d.H.toFixed(2).replace('.', ',')}</td><td className="num">{mm(d.topoFreq)}</td><td className="num">{mm(d.limTopo)}</td><td className="tl">{d.ok ? 'atende' : 'não atende'}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p className="hint small">Vento na malha: cada nó da malha de cada pavimento segue o movimento de corpo rígido do diafragma (translação e giro do topo do pilar mais próximo) [premissa a confirmar para vários diafragmas independentes].</p>
      <div className="tablewrap" data-desloc-vento-panos={panos.length}>
        <table className="data quadro">
          <thead><tr><th>Pano</th><th>Pavimento</th>{casos.map((c) => <th key={c}>|u| máx. {c} (mm)</th>)}</tr></thead>
          <tbody>
            {panos.map((p) => <tr key={`${p.pavimento}-${p.laje}`}><td className="tl">{p.nome}</td><td className="tl">{p.pavimentoNome}</td>{casos.map((c) => <td key={c} className="num">{p.casos[c] ? mm(p.casos[c].u) : '—'}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      <Hint>Os nós dos panos vêm da malha da grelha; o vento não gera deslocamento vertical nela (só ações verticais).</Hint>
      <div className="row"><Button onClick={() => { void download('deslocamentos-vento-malha.csv', csvDeslocamentosVento(linhas), 'text/csv'); }}>Baixar CSV do vento na malha</Button></div>
    </Group>
  );
}
