// Esforços do pilar-parede por hipótese (V7c, C4.60) na janela de esforços: tabela das resultantes por lado e pavimento
// (envoltória, combinação ou caso) e diagrama ao longo da altura de um lado. A matemática vem de
// src/core/resultados/pilarParedeHipotese.ts.
import { useMemo } from 'react';
import type { ResultadoPilarParede } from '../../core/building/pilarParedeEsforcos';
import type { HipoteseEsforco } from '../../core/resultados/esforcosCaso';
import { baseDoPilarParede, esforcosPilarParedePorHipotese, GRANDEZAS_PP } from '../../core/resultados/pilarParedeHipotese';
import { Select } from '../ui';
import type { JanelaEsforco } from './esforcosStore';

const f2 = (v: number) => v.toFixed(2).replace('.', ',');
const LARG = 640, ALT = 260, PAD = 28;

export function EsforcosPilarParede({ n, j, pp, hip, mudar }: { n: number; j: JanelaEsforco; pp: ResultadoPilarParede | undefined; hip: HipoteseEsforco; mudar: (p: Partial<JanelaEsforco>) => void }) {
  const linhas = useMemo(() => (pp ? esforcosPilarParedePorHipotese(pp, hip) : []), [pp, hip]);
  const base = useMemo(() => (pp ? baseDoPilarParede(pp, hip) : null), [pp, hip]);
  if (!pp || !linhas.length) return <p className="hint">Nenhum pilar-parede calculado (calcule a estrutura na aba Dimensionamento).</p>;
  const env = hip.tipo === 'envoltoria', g = GRANDEZAS_PP.find((x) => x.v === j.grandezaPP) ?? GRANDEZAS_PP[0];
  const lados = [...new Map(linhas.map((l) => [l.lado, l.nome])).entries()];
  const ladoSel = lados.some(([i]) => i === j.ladoPP) ? j.ladoPP : lados[0][0];
  const serie = linhas.filter((l) => l.lado === ladoSel);
  const vmax = Math.max(1e-9, ...serie.flatMap((l) => [Math.abs(l.max[g.v]), Math.abs(l.min[g.v])]));
  const cx = LARG / 2, X = (v: number) => cx + (v / vmax) * (cx - PAD), h = (ALT - 2 * PAD) / serie.length, Y = (k: number) => ALT - PAD - k * h;
  const degrau = (k: 'max' | 'min') => serie.map((l, i) => `${X(l[k][g.v]).toFixed(1)},${Y(i).toFixed(1)} ${X(l[k][g.v]).toFixed(1)},${Y(i + 1).toFixed(1)}`).join(' ');
  const dados = JSON.stringify({ tipo: 'pilarParede', hipotese: hip.id, grandeza: g.v, lado: ladoSel, lances: serie.length, max: +Math.max(...serie.map((l) => l.max[g.v])).toFixed(3), min: +Math.min(...serie.map((l) => l.min[g.v])).toFixed(3), envoltoria: env });
  return (
    <div data-esf-pp={dados}>
      <div className="row esf-barra">
        <Select label={`Grandeza do pilar-parede (janela ${n})`} value={g.v} options={GRANDEZAS_PP.map((x) => ({ v: x.v, label: x.rotulo }))} onChange={(v) => mudar({ grandezaPP: v })} />
        {lados.length > 1 && <Select label={`Lado do pilar-parede (janela ${n})`} value={String(ladoSel)} options={lados.map(([i, nome]) => ({ v: String(i), label: nome }))} onChange={(v) => mudar({ ladoPP: Number(v) })} />}
      </div>
      <svg className="esf-svg" role="img" aria-label={`Diagrama do pilar-parede ao longo da altura (janela ${n})`} viewBox={`0 0 ${LARG} ${ALT}`}>
        <line className="esf-eixo" x1={cx} x2={cx} y1={PAD} y2={ALT - PAD} />
        <polyline className="esf-curva" points={degrau('max')} />
        {env && <polyline className="esf-curva-min" points={degrau('min')} />}
        {serie.map((l, i) => <text key={l.pavimento} className="esf-valor" x={PAD} y={Y(i + 0.5)}>{l.nomePav}</text>)}
        <text className="esf-valor" x={LARG - PAD} y={14} textAnchor="end">{`${g.v}: máx ${f2(Math.max(...serie.map((l) => l.max[g.v])))} · mín ${f2(Math.min(...serie.map((l) => l.min[g.v])))} ${g.unidade}`}</text>
      </svg>
      <div className="tablewrap">
        <table className="data quadro">
          <thead><tr><th>Lado</th><th>Pavimento</th>{GRANDEZAS_PP.map((x) => <th key={x.v}>{x.v} ({x.unidade}){env ? ' máx. / mín.' : ''}</th>)}</tr></thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={`${l.lado}-${l.pavimento}`}>
                <td className="tl">{l.nome}</td><td className="tl">{l.nomePav}</td>
                {GRANDEZAS_PP.map((x) => <td key={x.v} className="num">{env ? `${f2(l.max[x.v])} / ${f2(l.min[x.v])}` : f2(l.max[x.v])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {base && (
        <p className="hint small" data-esf-pp-base>
          Carga na base ({hip.nome}), compressão +: {(['N', 'Vx', 'Vy'] as const).map((k) => `${k} ${env ? `${f2(base.max[k])} / ${f2(base.min[k])}` : f2(base.max[k])} kN`).join('; ')}; {(['Mx', 'My'] as const).map((k) => `${k} ${env ? `${f2(base.max[k])} / ${f2(base.min[k])}` : f2(base.max[k])} kN·m`).join('; ')}{env ? ' (máx. / mín. de cada componente)' : ''}.
          N de cada lado: tração +; lado em casca = média do painel no lance; lado em barra = extremo do lance.
        </p>
      )}
    </div>
  );
}
