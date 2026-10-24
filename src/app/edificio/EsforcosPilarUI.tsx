// Esforços do pilar por hipótese na janela do pilar (V6d, K1.11.28): seletor de envoltória, combinação ou caso, diagrama
// ao longo da altura e valores de N, M, V e T numa altura escolhida. A matemática vem de src/core/resultados.
import { useMemo, useState } from 'react';
import { calculoAtual, useBuilding } from './store';
import { diagramaPilar, esforcosPilarEmAltura, hipotesesDeEsforco, type Componente } from '../../core/resultados/esforcosCaso';
import { Diagrama, GRANDEZAS } from './AbaEsforcos';
import { NumField, Select } from '../ui';

const f2 = (v: number) => v.toFixed(2).replace('.', ',');
const LINHAS: { v: Componente; rot: string; un: string }[] = [
  { v: 'N', rot: 'N (compressão +)', un: 'kN' }, { v: 'Mz', rot: 'M no plano', un: 'kN·m' }, { v: 'My', rot: 'M fora do plano', un: 'kN·m' },
  { v: 'Vy', rot: 'V no plano', un: 'kN' }, { v: 'Vz', rot: 'V fora do plano', un: 'kN' }, { v: 'T', rot: 'Torção T', un: 'kN·m' },
];

export function EsforcosDoPilar({ id }: { id: string }) {
  const b = useBuilding((s) => s.sessao.modelo);
  const an = useBuilding((s) => (calculoAtual(s) && !s.analise?.erro ? s.analise : null));
  const [hipId, setHipId] = useState('');
  const [g, setG] = useState<Componente>('Mz');
  const [alt, setAlt] = useState(0);
  const hips = useMemo(() => (an ? hipotesesDeEsforco(b, an) : []), [b, an]);
  const hip = hips.find((h) => h.id === hipId) ?? hips[0];
  const d = useMemo(() => (an && hip ? diagramaPilar(an, id, hip) : null), [an, hip, id]);
  if (!an || !hip) return <p className="muted small">Calcule a estrutura (aba Dimensionamento) para ver os esforços do pilar por hipótese.</p>;
  if (!d) return <p className="muted small">Este pilar não tem barras no pórtico espacial.</p>;
  const e = esforcosPilarEmAltura(d, alt), info = GRANDEZAS.find((x) => x.v === g)!;
  const dados = JSON.stringify({ hipotese: hip.id, grandeza: g, altura: +e.altura.toFixed(3), N: +e.max.N.toFixed(3), Mz: +e.max.Mz.toFixed(3), V: +e.max.Vy.toFixed(3), T: +e.max.T.toFixed(3), pontos: d.pontos.length });
  return (
    <section className="rev-lance" data-esf-pilar={dados}>
      <h4>Esforços por hipótese ao longo da altura</h4>
      <div className="row">
        <Select label="Hipótese dos esforços do pilar" value={hip.id} options={hips.map((h) => ({ v: h.id, label: h.tipo === 'caso' ? `Caso ${h.nome}` : h.nome }))} onChange={setHipId} />
        <Select label="Grandeza do diagrama do pilar" value={g} options={GRANDEZAS.map((x) => ({ v: x.v, label: x.label }))} onChange={setG} />
        <NumField label="Altura acima da base" value={alt} unit="m" min={0} onChange={setAlt} />
      </div>
      <Diagrama n="pilar" d={d} g={g} us={d.altura} unidade={info.unidade} />
      <div className="tablewrap">
        <table className="data quadro">
          <thead><tr><th>Esforço a {f2(e.altura)} m ({e.lance})</th><th>Máximo</th><th>Mínimo</th></tr></thead>
          <tbody>{LINHAS.map((l) => <tr key={l.v}><td className="tl">{l.rot} ({l.un})</td><td className="num">{f2(e.max[l.v])}</td><td className="num">{f2(e.min[l.v])}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="hint small">Envoltória: extremos entre as combinações da família; caso ou combinação: valor único. Altura fora do pilar fica no extremo mais próximo.</p>
    </section>
  );
}
