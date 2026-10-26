// Aba "3D" das janelas de armadura da viga, do pilar e da laje (V2): o concreto do elemento (translúcido) e as barras
// em 3D, com os mesmos controles de câmera da vista do edifício. Sem WebGL ou sem o vendor do three, mostra a lista
// das barras e o isométrico estático do concreto.
import { useEffect, useMemo, useState } from 'react';
import { useBuilding } from '../edificio/store';
import { usePlanta } from '../edificio/plantaStore';
import { cenaDoElemento, camadasDeArmadura, type AgruparPor, type OrigemArmadura } from '../../core/vista3d/armaduras3d';
import { isometricoSvg } from '../../core/vista3d/isometrico';
import { cssVar } from '../design/tokens';
import { Check, Dropdown, Slider } from '../ui';
import { lerCores, useCena3DIsolada } from './useCena3DIsolada';

export function Armadura3D({ tipo, id }: { tipo: OrigemArmadura; id: string }) {
  const b = useBuilding((s) => s.sessao.modelo);
  const rev = useBuilding((s) => s.rev);
  const dim = useBuilding((s) => s.dim);
  const tema = usePlanta((s) => s.tema);
  const [por, setPor] = useState<AgruparPor>('bitola');
  const [tubos, setTubos] = useState(false);
  const [ghost, setGhost] = useState(true);
  const [esc, setEsc] = useState(4);

  const r = useMemo(() => (dim ? cenaDoElemento(b, dim, tipo, id) : null), [b, rev, dim, tipo, id]);
  const camadas = useMemo(() => (r ? camadasDeArmadura(r.armaduras, por) : []), [r, por]);
  const { cont, rend, camRef, status, pedir, reenquadrar } = useCena3DIsolada(r?.cena.limites, 'Armadura em 3D');

  // cena, armaduras e translucidez
  useEffect(() => {
    const rd = rend.current, el = cont.current;
    if (status !== 'pronto' || !rd || !el || !r) return;
    rd.definirCena(r.cena, lerCores(el));
    const op = ghost ? 0.18 : 1;
    rd.atualizarMateriais({ opacidade: { pilar: op, viga: op, laje: op }, textura: false });
    rd.definirArmaduras(camadas, Array.from({ length: 8 }, (_, i) => cssVar(`v3d-arm-${i + 1}`, el)), tubos ? 'tubos' : 'linhas', 0.0025 * esc);
    if (!camRef.current) reenquadrar();
    pedir();
  }, [r, camadas, ghost, tubos, esc, tema, status]);

  if (!dim) return <p className="muted">Calcule o dimensionamento para ver a armadura em 3D.</p>;
  if (!r || !r.armaduras.barras.length) return <p className="muted">Sem armadura detalhada para este elemento.</p>;
  const resumo = { barras: r.armaduras.barras.length, segmentos: r.armaduras.segmentos, camadas: camadas.length };
  return (
    <div className="v3d armadura3d" data-tema={tema} data-armadura3d={JSON.stringify({ tipo, ...resumo })}>
      <div className="row wrap">
        <Dropdown aria-label="Cor das barras por" value={por} onChange={(e) => setPor(e.target.value as AgruparPor)}>
          <option value="bitola">Cor por bitola</option>
          <option value="tipo">Cor por tipo de barra</option>
          <option value="posicao">Cor por posição</option>
        </Dropdown>
        <Check label="Concreto do elemento translúcido" checked={ghost} onChange={setGhost} />
        {status === 'pronto' && <Check label="Barras do elemento como tubos" checked={tubos} onChange={setTubos} />}
        {status === 'pronto' && tubos && <Slider label="Espessura das barras do elemento" value={esc} min={1} max={20} unit="×" onChange={setEsc} />}
      </div>
      <div ref={cont} className="v3d-cv armadura3d-cv" tabIndex={0} role="application" aria-label="Vista 3D da armadura do elemento" data-status={status}>
        {status === 'sem-3d' && (
          <div className="v3d-iso-box" dangerouslySetInnerHTML={{ __html: isometricoSvg(r.cena, {}).svg }} />
        )}
        {status === 'sem-3d' && <div className="v3d-aviso" role="status">Sem WebGL ou sem o three.js neste ambiente: isométrico do concreto; as barras estão nas tabelas do detalhamento.</div>}
        {status === 'carregando' && <div className="v3d-aviso" role="status">Carregando a vista 3D…</div>}
      </div>
      <p className="muted">{resumo.barras} barras, {resumo.segmentos} segmentos em {resumo.camadas} camada(s){r.armaduras.truncado ? ' (limite de segmentos atingido)' : ''}. Arraste: girar · Shift: deslocar · roda: aproximar · Home: enquadrar.</p>
    </div>
  );
}
