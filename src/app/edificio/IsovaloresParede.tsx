// Isovalores da casca (E1d-2, bloco B): mapas de tensões (ELU) e de deslocamentos por lado de casca de uma parede
// ou pilar-parede. O cálculo está em core/building/campoParede; esta tela só escolhe lado, grandeza e caso.
import { useState } from 'react';
import { Hint, Select, Seg } from '../ui';
import { combinacoesDoEstado } from '../../core/building/combinacoes';
import { campoDeslocamentoLado, campoTensaoLado, type ComponenteDeslocamento, type ComponenteTensao } from '../../core/building/campoParede';
import { N_FAIXAS_ISO, caixaDoCampo, faixaDoCampo } from '../../core/building/paredesLista';
import { useBuilding } from './store';

const fmt = (v: number) => v.toFixed(3).replace('.', ',');
const GRANDEZAS: { v: ComponenteTensao; label: string }[] = [
  { v: 'sigmaX', label: 'σx (MPa)' }, { v: 'sigmaY', label: 'σy (MPa)' }, { v: 'tauXY', label: 'τxy (MPa)' },
  { v: 'My', label: 'My (kN·m/m)' }, { v: 'Mx', label: 'Mx (kN·m/m)' }, { v: 'Qmax', label: 'Q máx. (kN/m)' },
];
const COMPONENTES: { v: ComponenteDeslocamento; label: string }[] = [
  { v: 'normal', label: 'normal ao plano' }, { v: 'vertical', label: 'vertical' }, { v: 'alongo', label: 'ao longo do eixo' },
];
const FACES_TENSAO = new Set<ComponenteTensao>(['sigmaX', 'sigmaY', 'tauXY']);

/** Mapa de isovalores de um lado de casca da parede ou do pilar-parede `id`, com legenda de 11 faixas. */
export function IsovaloresParede({ id, tipo }: { id: string; tipo: 'parede' | 'pilarParede' }) {
  const dim = useBuilding((s) => s.dim), an = useBuilding((s) => s.analise), b = useBuilding((s) => s.sessao.modelo);
  const lados = (dim?.armaduraParedes?.find((x) => x.id === id)?.lados ?? []).filter((l) => l.modelo === 'casca');
  const porLado = [...new Map(lados.map((l) => [l.lado, l])).values()];
  const [ladoEscolhido, setLado] = useState<number | null>(null);
  const [modo, setModo] = useState<'tensao' | 'deslocamento'>('tensao');
  const [grandeza, setGrandeza] = useState<ComponenteTensao>('sigmaX');
  const [face, setFace] = useState<'-1' | '1'>('-1');
  const [combEscolhida, setComb] = useState('');
  const [casoEscolhido, setCaso] = useState('');
  const [comp, setComp] = useState<ComponenteDeslocamento>('normal');
  if (!an || porLado.length === 0) return <Hint>Calcule o dimensionamento para ver os mapas.</Hint>;

  const ladoEf = porLado.some((l) => l.lado === ladoEscolhido) ? ladoEscolhido! : porLado[0].lado;
  const ladoId = `${id}:${ladoEf}`;
  const combs = combinacoesDoEstado(b, an, 'concreto').filter((c) => c.tipo === 'ELU');
  const combEf = combs.some((c) => c.nome === combEscolhida) ? combEscolhida : combs[0]?.nome ?? '';
  const comb = combs.find((c) => c.nome === combEf);
  const casos = [...an.casos, ...(an.vento?.casos.map((c) => c.nome) ?? [])];
  const casoEf = casos.includes(casoEscolhido) ? casoEscolhido : casos[0] ?? '';
  const nomeCaso = (c: string) => b.casos?.find((x) => x.id === c)?.nome ?? c;

  const campo = modo === 'tensao'
    ? (comb ? campoTensaoLado(b, an, ladoId, comb, grandeza, face === '1' ? 1 : -1) : null)
    : (casoEf ? campoDeslocamentoLado(b, an, ladoId, casoEf, comp) : null);

  return (
    <div data-pw-isovalores={id} data-tipo={tipo}>
      <h4>Tensões e deslocamentos</h4>
      <div className="row wrap">
        <Select label="Lado do mapa" value={ladoEf} options={porLado.map((l) => ({ v: l.lado, label: l.nome }))} onChange={setLado} />
        <Seg value={modo} options={[{ v: 'tensao', label: 'tensões' }, { v: 'deslocamento', label: 'deslocamentos' }]} onChange={setModo} />
        {modo === 'tensao' ? (
          <>
            <Select label="Grandeza" value={grandeza} options={GRANDEZAS} onChange={setGrandeza} />
            <Select label="Combinação ELU" value={combEf} options={combs.map((c) => ({ v: c.nome, label: c.nome }))} onChange={setComb} />
            {FACES_TENSAO.has(grandeza) && <Seg value={face} options={[{ v: '-1', label: 'face z−' }, { v: '1', label: 'face z+' }]} onChange={setFace} />}
          </>
        ) : (
          <>
            <Select label="Caso" value={casoEf} options={casos.map((c) => ({ v: c, label: nomeCaso(c) }))} onChange={setCaso} />
            <Select label="Componente" value={comp} options={COMPONENTES} onChange={setComp} />
          </>
        )}
      </div>
      {!campo ? <p className="muted">Sem resultado para este lado.</p> : (() => {
        const cx = caixaDoCampo(campo);
        return (
          <>
            <svg className="iso-svg" role="img" aria-label={campo.titulo} data-pw-iso-svg viewBox={`${cx.s0} ${-cx.z1} ${cx.s1 - cx.s0} ${cx.z1 - cx.z0}`} preserveAspectRatio="xMidYMid meet">
              {campo.tris.map((t, i) => (
                <polygon key={i} className={`iso iso-${faixaDoCampo(t.valor, campo.min, campo.max)}`} points={t.v.map((p) => `${p[0]},${-p[1]}`).join(' ')} />
              ))}
            </svg>
            <div className="iso-leg" data-pw-iso-leg>
              {Array.from({ length: N_FAIXAS_ISO }, (_, k) => <span key={k} className={`iso-cel iso-${k}`} />)}
              <span className="small">mín. {fmt(campo.min)} · máx. {fmt(campo.max)} {campo.unidade} — {campo.titulo}</span>
            </div>
          </>
        );
      })()}
    </div>
  );
}
