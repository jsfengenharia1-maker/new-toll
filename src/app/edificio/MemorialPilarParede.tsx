// Memorial dos pilares-parede (E1b): tipos e geometria (com a prévia em planta), modelo de cada lado e, depois do cálculo,
// as cargas na base e os esforços resultantes por lado e pavimento. Reaproveita as tabelas do memorial do edifício.
import type { ReactNode } from 'react';
import { memo } from '../design/tokens';
import { ladosDoPP, contornoDoLado, lancesDoPP } from '../../core/building/pilarParede';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');

/** Figura estática (SVG) dos lados do pilar-parede no primeiro lance, com o eixo e o ponto de inserção. */
function figura(b: BuildingModel, id: string): string {
  const pp = b.pilaresParede?.find((q) => q.id === id);
  if (!pp) return '';
  const l0 = lancesDoPP(b, pp)[0]?.id ?? '', lados = ladosDoPP(b, pp), cs = lados.map((g) => contornoDoLado(g, l0));
  const pts = cs.flat();
  if (!pts.length) return '';
  const x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
  const m = Math.max(0.2, 0.1 * Math.max(x1 - x0, y1 - y0)), W = 220, k = W / (x1 - x0 + 2 * m), H = (y1 - y0 + 2 * m) * k;
  const X = (x: number) => ((x - x0 + m) * k).toFixed(1), Y = (y: number) => ((y1 + m - y) * k).toFixed(1);
  const poli = cs.map((c, i) => `<polygon points="${c.map((p) => `${X(p[0])},${Y(p[1])}`).join(' ')}" fill="${memo(lados[i].casca ? 'iso-parede' : 'laje')}" stroke="${memo('ink')}" stroke-width="1"/>`).join('');
  const eixos = lados.map((g) => `<line x1="${X(g.a[0])}" y1="${Y(g.a[1])}" x2="${X(g.z[0])}" y2="${Y(g.z[1])}" stroke="${memo('accent')}" stroke-width="0.8" stroke-dasharray="4 2"/>`).join('');
  const nomes = lados.map((g) => `<text x="${X((g.a[0] + g.z[0]) / 2)}" y="${Y((g.a[1] + g.z[1]) / 2)}" font-size="8" text-anchor="middle" fill="${memo('ink')}">${g.i + 1}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H.toFixed(0)}" viewBox="0 0 ${W} ${H.toFixed(0)}">${poli}${eixos}${nomes}<circle cx="${X(pp.x)}" cy="${Y(pp.y)}" r="2.5" fill="${memo('bad')}"/></svg>`;
}

export function MemorialPilaresParede({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const pps = b.pilaresParede ?? [];
  if (!pps.length) return null;
  const opc = opcoesEmUso(b.opcoes, perfilDe(b)), ps = pavimentosOrdenados(b);
  const nomePav = (id: string) => (id === 'fundacao' ? 'fundação' : ps.find((p) => p.id === id)?.nome ?? id);
  return (
    <div data-memorial-pilares-parede>
      {h2('Pilares-parede')}
      <p>Seção composta de retângulos (tipos reutilizáveis): cada lado é um segmento do eixo com a espessura à esquerda e à direita; a geometria em planta é a mesma em toda a altura e só a espessura varia por pavimento. Lado com comprimento ≥ {fmt(opc.pilarParedeLimite, 1)} × a espessura é modelado em casca de 6 nós (membrana e placa de Mindlin no plano do eixo; EI bruto, EA × {fmt(opc.axialPilares, 1)} nas cargas verticais, 0,8·Eci·Ic no γz; malha de {fmt(opc.malhaCasca, 2)} m com os pavimentos como linhas); o lado mais curto é modelado como pilar (barra), ligado aos vizinhos por trecho rígido. Em cada nível, uma viga fictícia de {fmt(opc.pilarParedeVigaAltura, 0)} cm de altura no topo do lado em casca recebe vigas e lajes em qualquer posição. Não nasce em pilar nem apoia pilar. Premissas e1b-* a confirmar.</p>
      <table data-memorial-pp-tipos>
        <thead><tr><th className="l">Pilar-parede</th><th className="l">Tipo</th><th>Ponto (m)</th><th>Âng.</th><th className="l">Nasce</th><th className="l">Morre</th><th className="l">Base</th><th className="l">Lados (comprimento × espessura, cm; modelo)</th></tr></thead>
        <tbody>
          {pps.map((q) => {
            const l0 = lancesDoPP(b, q)[0]?.id ?? '', lados = ladosDoPP(b, q);
            return <tr key={q.id}>
              <td className="l">{q.nome}</td><td className="l">{b.tiposPilarParede?.find((t) => t.id === q.tipo)?.nome ?? q.tipo}</td><td>{fmt(q.x)}; {fmt(q.y)}</td><td>{fmt(q.angulo, 0)}°</td>
              <td className="l">{nomePav(q.nasce)}</td><td className="l">{nomePav(q.morre)}</td><td className="l">{q.vinculoBase === 'rotula' ? 'rotulada' : q.vinculoBase === 'molas' ? 'sobre molas' : 'engastada'}</td>
              <td className="l">{lados.map((g) => `${g.i + 1}: ${fmt(g.L * 100, 0)} × ${fmt(g.esp(l0).t * 100, 0)} (${g.casca ? 'casca' : 'barra'})`).join('; ')}</td>
            </tr>;
          })}
        </tbody>
      </table>
      {pps.map((q) => { const svg = figura(b, q.id); return svg ? <figure key={q.id}><div dangerouslySetInnerHTML={{ __html: svg }} /><figcaption>{q.nome}: lados no primeiro lance (cinza: casca; laranja: barra; ponto vermelho: inserção).</figcaption></figure> : null; })}
      {dim?.pilaresParede?.map((r) => (
        <div key={r.id} data-memorial-pp={r.id}>
          <h3>{r.nome} — cargas na base e esforços por lado</h3>
          <p>Cargas na base (resultante das reações no centroide {fmt(r.centro[0])}; {fmt(r.centro[1])} m; compressão positiva): Nd máx. {fmt(r.baseElu.Nmax, 1)} kN ({r.baseElu.cNmax}) e Nd mín. {fmt(r.baseElu.Nmin, 1)} kN ({r.baseElu.cNmin}).</p>
          <table>
            <thead><tr><th className="l">Caso</th><th>N (kN)</th><th>Vx (kN)</th><th>Vy (kN)</th><th>Mx (kN·m)</th><th>My (kN·m)</th></tr></thead>
            <tbody>{Object.entries(r.base).map(([c, v]) => <tr key={c}><td className="l">{c}</td><td>{fmt(v.N, 1)}</td><td>{fmt(v.Vx, 1)}</td><td>{fmt(v.Vy, 1)}</td><td>{fmt(v.Mx, 1)}</td><td>{fmt(v.My, 1)}</td></tr>)}</tbody>
          </table>
          <table>
            <thead><tr><th className="l">Lado</th><th className="l">Pavimento</th><th>t (cm)</th><th className="l">Modelo</th><th>N mín./máx. (kN)</th><th>V plano mín./máx. (kN)</th><th>M plano mín./máx. (kN·m)</th><th>V fora mín./máx. (kN)</th><th>M fora mín./máx. (kN·m)</th></tr></thead>
            <tbody>{r.lados.map((l) => <tr key={`${l.nome}${l.pavimento}`}><td className="l">{l.nome}</td><td className="l">{l.nomePav}</td><td>{fmt(l.t * 100, 0)}</td><td className="l">{l.modelo}</td>{(['N', 'Vp', 'Mp', 'Vo', 'Mo'] as const).map((k) => <td key={k}>{fmt(l.elu[k].min, 1)} / {fmt(l.elu[k].max, 1)}</td>)}</tr>)}</tbody>
          </table>
          <p>Esforços resultantes dos lados em casca: médias sobre a altura do painel dos esforços de membrana e de placa (N &gt; 0 é tração); extremos nas combinações ELU. Lados em barra: extremos do lance. A armadura, as tensões e as verificações estão na seção de armadura das paredes e pilares-parede.</p>
        </div>
      ))}
    </div>
  );
}
