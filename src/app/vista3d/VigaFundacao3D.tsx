// Vista 3D isolada da viga de fundação (V6c, C11.49): janela própria com o sólido da viga (realçado) e os elementos de
// fundação das pontas, reaproveitando a cena e o renderizador da vista 3D do edifício (V1) e os mesmos controles de
// câmera. Sem WebGL ou sem o vendor do three, mostra o isométrico estático.
import { useEffect, useMemo, useState } from 'react';
import { useBuilding } from '../edificio/store';
import { usePlanta } from '../edificio/plantaStore';
import { isometricoSvg } from '../../core/vista3d/isometrico';
import { cenaDaVigaFundacao } from '../../core/vista3d/vigaFundacao3d';
import { Check, Modal } from '../ui';
import { lerCores, useCena3DIsolada } from './useCena3DIsolada';

const cm = (v: number) => String(Math.round(v * 100));

export function VigaFundacao3D({ id, onClose }: { id: string; onClose: () => void }) {
  const b = useBuilding((s) => s.sessao.modelo);
  const rev = useBuilding((s) => s.rev);
  const dim = useBuilding((s) => s.dim);
  const tema = usePlanta((s) => s.tema);
  const [ghost, setGhost] = useState(true);
  const r = useMemo(() => cenaDaVigaFundacao(b, dim, id), [b, rev, dim, id]);
  const rv = dim?.vigasFundacao?.find((x) => x.id === id);
  const v = b.fundacao?.vigas?.find((x) => x.id === id);
  const { cont, rend, camRef, status, pedir, reenquadrar } = useCena3DIsolada(r.cena.limites, 'Viga de fundação em 3D');

  useEffect(() => {
    const rd = rend.current, el = cont.current;
    if (status !== 'pronto' || !rd || !el || !r.viga) return;
    rd.definirCena(r.cena, lerCores(el));
    rd.atualizarMateriais({ opacidade: { fundacao: ghost ? 0.4 : 1 }, textura: false });
    rd.selecionar(new Set([id]));
    if (!camRef.current) reenquadrar();
    pedir();
  }, [r, ghost, tema, status]);

  const resumo = { apoios: r.apoios.map((a) => a.nome), objetos: r.cena.contagens.total, hAdot: rv?.hAdot ?? 0, bAdot: rv?.bAdot ?? 0 };
  return (
    <Modal titulo={`Vista 3D — ${v?.nome ?? 'Viga de fundação'}`} onClose={onClose} larga>
      {!r.viga ? (
        <p className="muted">Calcule as fundações (grupo Fundação › Calcular fundações) para ver a viga em 3D.</p>
      ) : (
        <div className="v3d armadura3d" data-tema={tema} data-vf3d={JSON.stringify(resumo)}>
          <div className="row wrap">
            <Check label="Elementos da fundação translúcidos" checked={ghost} onChange={setGhost} />
          </div>
          <div ref={cont} className="v3d-cv armadura3d-cv" tabIndex={0} role="application" aria-label="Vista 3D da viga de fundação" data-status={status}>
            {status === 'sem-3d' && <div className="v3d-iso-box" dangerouslySetInnerHTML={{ __html: isometricoSvg(r.cena, {}).svg }} />}
            {status === 'sem-3d' && <div className="v3d-aviso" role="status">Sem WebGL ou sem o three.js neste ambiente: isométrico estático da viga e das pontas.</div>}
            {status === 'carregando' && <div className="v3d-aviso" role="status">Carregando a vista 3D…</div>}
          </div>
          <p className="muted">
            Viga {cm(rv?.bAdot ?? v?.b ?? 0)}×{cm(rv?.hAdot ?? v?.h ?? 0)} cm entre {r.apoios.map((a) => a.nome).join(' e ') || 'as pontas'} · topo {r.topo.toFixed(2).replace('.', ',')} m, base {r.base.toFixed(2).replace('.', ',')} m. Arraste: girar · Shift: deslocar · roda: aproximar · Home: enquadrar.
          </p>
        </div>
      )}
    </Modal>
  );
}
