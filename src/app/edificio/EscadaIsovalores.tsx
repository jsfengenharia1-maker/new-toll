// Isovalores do lance da escada (E4e, C8.51): mapa de deslocamentos e esforços de um lance na planta do lance e em vista 3D (projeção
// isométrica). O cálculo está em core/building/escadasIsovalores; esta tela só escolhe lance, grandeza e caso e desenha os triângulos.
import { useMemo, useState } from 'react';
import { Hint, Select, Seg } from '../ui';
import { campoLance, GRANDEZAS_ESCADA, projetarCampo, type CampoEscada, type CasoEscadaIso, type GrandezaEscada } from '../../core/building/escadasIsovalores';
import type { ResultadoEscadas } from '../../core/building/escadasCalculo';
import { gamas } from '../../core/building/materiais';
import { N_FAIXAS_ISO, faixaDoCampo } from '../../core/building/paredesLista';
import { useBuilding } from './store';

const fmt = (v: number) => v.toFixed(3).replace('.', ',');

function Legenda({ c }: { c: CampoEscada }) {
  return (
    <div className="iso-leg" data-escada-iso-leg>
      {Array.from({ length: N_FAIXAS_ISO }, (_, k) => <span key={k} className={`iso-cel iso-${k}`} />)}
      <span className="small">mín. {fmt(c.min)} · máx. {fmt(c.max)} {c.unidade}</span>
    </div>
  );
}

/** Mapas de isovalores de um lance; `res` precisa vir de `calcularEscadas(b, { detalhe: true })`. */
export function IsovaloresEscada({ res }: { res: ResultadoEscadas }) {
  const b = useBuilding((s) => s.sessao.modelo);
  const lances = res.lances.filter((l) => !l.erro && l.nosDetalhe?.length);
  const [lanceSel, setLance] = useState('');
  const [grandeza, setGrandeza] = useState<GrandezaEscada>('uz');
  const [caso, setCaso] = useState<CasoEscadaIso>('comb');
  const chave = (l: { escada: string; lance: number }) => `${l.escada}|${l.lance}`;
  const lance = lances.find((l) => chave(l) === lanceSel) ?? lances[0];
  const campo = useMemo(() => (lance ? campoLance(lance, grandeza, caso, gamas(b)) : undefined), [lance, grandeza, caso, b]);
  const proj = useMemo(() => (campo ? projetarCampo(campo) : undefined), [campo]);
  if (!lance || !campo || !proj) return <Hint>Sem malha de cálculo para desenhar os isovalores.</Hint>;
  const [x0, y0, x1, y1] = campo.caixa, [px0, py0, px1, py1] = proj.caixa!;
  return (
    <div data-escada-iso>
      <div className="row wrap">
        <Select label="Lance" value={chave(lance)} options={lances.map((l) => ({ v: chave(l), label: `${l.nome}, lance ${l.lance}` }))} onChange={setLance} />
        <Select label="Grandeza" value={grandeza} options={GRANDEZAS_ESCADA.map((g) => ({ v: g.v, label: `${g.label} (${g.unidade})` }))} onChange={setGrandeza} />
        <Seg value={caso} options={[{ v: 'G', label: 'G' }, { v: 'Q', label: 'Q' }, { v: 'comb', label: grandeza === 'uz' ? 'G + Q' : 'ELU' }]} onChange={setCaso} />
      </div>
      <p className="small" data-escada-iso-titulo>{campo.titulo}</p>
      <div className="iso-par">
        <div data-escada-iso-planta>
          <p className="small">Planta do lance</p>
          <svg className="iso-svg" role="img" aria-label={`${campo.titulo}, planta`} viewBox={`${x0} ${-y1} ${x1 - x0} ${y1 - y0}`} preserveAspectRatio="xMidYMid meet" data-escada-iso-svg="planta">
            {campo.tris.map((t, i) => <polygon key={i} className={`iso iso-${faixaDoCampo(t.valor, campo.min, campo.max)}`} points={t.v.map((p) => `${p[0]},${-p[1]}`).join(' ')} />)}
          </svg>
        </div>
        <div data-escada-iso-3d>
          <p className="small">Vista 3D (isométrica)</p>
          <svg className="iso-svg" role="img" aria-label={`${campo.titulo}, vista 3D`} viewBox={`${px0} ${py0} ${px1 - px0} ${py1 - py0}`} preserveAspectRatio="xMidYMid meet" data-escada-iso-svg="3d">
            {proj.map((t, i) => <polygon key={i} className={`iso iso-${faixaDoCampo(t.valor, campo.min, campo.max)}`} points={t.pts.map((p) => `${p[0]},${p[1]}`).join(' ')} />)}
          </svg>
        </div>
      </div>
      <Legenda c={campo} />
      <p className="small muted">Valores por elemento suavizados nos nós; planta no sistema local do lance (x no sentido da subida do primeiro trecho).</p>
    </div>
  );
}
