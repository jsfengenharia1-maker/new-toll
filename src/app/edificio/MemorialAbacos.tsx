// Memorial dos ábacos das lajes nervuradas bidirecionais (frente E3d): parâmetros da geração e dimensões por face, altura e
// rebaixo, armadura base, reforço e cortante por nervura no ábaco e punção dos pilares atendidos. As linhas vêm do núcleo
// (`abacosNoMemorial`, `puncaoSemAbaco`); fonte e interpretações "a confirmar" (docs/pendencias-usuario.md).
import type { ReactNode } from 'react';
import { fmt } from './Detalhamento';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import { abacosNoMemorial, puncaoSemAbaco } from '../../core/building/abacosMemorial';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import type { BuildingModel } from '../../core/building/types';

const barras = (x: { n: number; phi: number } | null) => (x ? `${x.n}φ${String(x.phi).replace('.', ',')}` : 'sem armadura');

export function MemorialAbacos({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const linhas = dim?.nervuradas?.length ? abacosNoMemorial(b, dim, opcoesEmUso(b.opcoes, perfilDe(b))) : [];
  const sem = dim ? puncaoSemAbaco(dim) : [];
  if (!linhas.length && !sem.length) return null;
  return (
    <>
      {h2('Ábacos das lajes nervuradas bidirecionais')}
      <div data-memorial-abacos>
        <p>O ábaco é a zona maciça sobre o pilar: as cubetas dentro dele são retiradas (o contorno se ajusta às nervuras inteiras) e a altura total é a do ábaco, que pode descer abaixo da laje; o rebaixo entra na rigidez da grelha. A geração automática dimensiona cada face pela fração da distância entre eixos até o pilar mais próximo dentro do cone, com extensão mínima e limites mínimo e máximo (parâmetros das opções, a confirmar). A altura do ábaco vale em C e C′ da punção; o C″ usa a altura da laje.</p>
        {linhas.map((l, k) => (
          <div key={l.id} className="avoid" data-memorial-abaco={l.id}>
            <h3>Ábaco AB{linhas.filter((x) => x.laje === l.laje).indexOf(l) + 1 || k + 1} · {b.lajes.find((x) => x.id === l.laje)?.nome}{l.pilarNome ? ` · pilar ${l.pilarNome}` : ''} · {l.automatico ? 'automático' : 'manual'}</h3>
            <p>
              Altura {fmt(l.hAbaco * 100, 0)} cm; área {fmt(l.area)} m² ({fmt(l.largura)} × {fmt(l.altura)} m); rebaixo {fmt(l.rebaixo, 3)} m³.
              {l.parametros ? ` Parâmetros: fração ${fmt(l.parametros.fracao, 3)}, cone ${fmt(l.parametros.cone, 0)}°, extensão mínima ${fmt(l.parametros.extensao * 100, 0)} cm, limites ${fmt(l.parametros.limMin)} a ${fmt(l.parametros.limMax)} m.` : ''}
              {l.faces.length > 0 ? ` Extensão por face: ${l.faces.map((f) => `${f.lado} ${fmt(f.extensao * 100, 0)} cm (${f.origem === 'cone' ? `cone${f.vizinho ? `, vizinho ${f.vizinho}` : ''}` : f.origem === 'oposto' ? 'sentido oposto' : 'mínimo'}${f.limitado ? `, limitado ao ${f.limitado === 'min' ? 'mínimo' : 'máximo'}` : ''})`).join('; ')}.` : ''}
              {' '}Armadura base entre nervuras: inferior {barras(l.base.inf)}, superior {barras(l.base.sup)}{l.base.padrao ? ' (padrão)' : ''}.
            </p>
            {l.nervuras.length > 0 && (
              <table>
                <thead><tr><th>Nervura</th><th>Trecho (m)</th><th>M− (kN·m)</th><th>As nec. (cm²)</th><th>As base (cm²)</th><th>As borda (cm²)</th><th>Reforço</th><th>C (m)</th><th>V (kN)</th><th>VRd1 (kN)</th><th>Estribo</th></tr></thead>
                <tbody>{l.nervuras.map((n, i) => <tr key={i}><td className="l">{n.nervura}</td><td>{fmt(n.trecho[0])} a {fmt(n.trecho[1])}</td><td>{fmt(n.Mneg)}</td><td>{fmt(n.AsNec)}</td><td>{fmt(n.AsBase)}</td><td>{fmt(n.AsBorda)}</td><td className="l">{n.reforco}</td><td>{fmt(n.comprimento)}</td><td>{fmt(n.cortante.V, 1)}</td><td>{fmt(n.cortante.VRd1, 1)}</td><td className="l">{n.cortante.estribo ?? '—'}</td></tr>)}</tbody>
              </table>
            )}
            {l.puncao.length > 0 && (
              <table>
                <thead><tr><th>Pilar</th><th>Pavimento</th><th>FSd (kN)</th><th>d ábaco / laje (cm)</th><th>C′ no ábaco</th><th>Contornos (τSd / limite, MPa)</th><th>Armadura</th><th>Situação</th></tr></thead>
                <tbody>{l.puncao.map((p, i) => <tr key={i}><td className="l">{p.pilar}</td><td className="l">{p.pavimento}</td><td>{fmt(p.F, 1)}</td><td>{fmt(p.dAbaco * 100, 1)} / {fmt(p.dLaje * 100, 1)}</td><td>{p.c2NoAbaco ? 'sim' : 'não'}</td><td className="l">{p.contornos.map((c) => `${c.nome} ${fmt(c.tau, 3)} / ${fmt(c.limite, 3)} (${c.limiteNome})`).join('; ')}</td><td className="l">{[p.armadura, p.armaduraForaDoAbaco ? `fora do ábaco: ${p.armaduraForaDoAbaco}` : null].filter(Boolean).join('; ') || '—'}</td><td className="l">{p.status === 'fail' ? 'não atende' : p.status === 'armadura' ? 'com armadura' : 'sem armadura'}</td></tr>)}</tbody>
              </table>
            )}
            {l.puncao.flatMap((p) => p.mensagens).length > 0 && <ul>{l.puncao.flatMap((p) => p.mensagens).map((m, i) => <li key={i}><i>{m}</i></li>)}</ul>}
          </div>
        ))}
        {sem.length > 0 && <p data-memorial-sem-abaco>Pilares das nervuradas sem ábaco (punção verificada só nas nervuras, com a altura da laje): {sem.map((s) => `${s.pilar} (${s.pavimento}, ${s.laje})`).join('; ')}.</p>}
      </div>
    </>
  );
}
