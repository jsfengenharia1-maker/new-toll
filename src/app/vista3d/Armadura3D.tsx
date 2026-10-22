// Aba "3D" das janelas de armadura da viga, do pilar e da laje (V2): o concreto do elemento (translúcido) e as barras
// em 3D, com os mesmos controles de câmera da vista do edifício. Sem WebGL ou sem o vendor do three, mostra a lista
// das barras e o isométrico estático do concreto.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useBuilding } from '../edificio/store';
import { usePlanta } from '../edificio/plantaStore';
import { cenaDoElemento, camadasDeArmadura, type AgruparPor, type OrigemArmadura } from '../../core/vista3d/armaduras3d';
import { enquadrar, type Camera3D } from '../../core/vista3d/camera';
import { isometricoSvg } from '../../core/vista3d/isometrico';
import { TIPOS_3D, type TipoElemento3D } from '../../core/vista3d/registro';
import { cssVar } from '../design/tokens';
import { Check, Dropdown, Slider } from '../ui';
import { carregarThree, temWebGL, type Three } from './carregarThree';
import { ligarControles } from './controles';
import { RenderizadorCena, type CoresCena } from './renderizador';

const CHAVES_COR = ['fundo', 'linha', 'selecao', 'destaque', 'pendente'] as const;
function lerCores(el: HTMLElement): CoresCena {
  const v = (n: string) => cssVar(`v3d-${n}`, el);
  const base = Object.fromEntries(CHAVES_COR.map((k) => [k, v(k)])) as Record<(typeof CHAVES_COR)[number], string>;
  return { ...base, tipos: Object.fromEntries(TIPOS_3D.map((t) => [t.v, v(t.v)])) as Record<TipoElemento3D, string> };
}

export function Armadura3D({ tipo, id }: { tipo: OrigemArmadura; id: string }) {
  const b = useBuilding((s) => s.sessao.modelo);
  const rev = useBuilding((s) => s.rev);
  const dim = useBuilding((s) => s.dim);
  const tema = usePlanta((s) => s.tema);
  const [por, setPor] = useState<AgruparPor>('bitola');
  const [tubos, setTubos] = useState(false);
  const [ghost, setGhost] = useState(true);
  const [esc, setEsc] = useState(4);
  const [status, setStatus] = useState<'carregando' | 'pronto' | 'sem-3d'>('carregando');
  const [T, setT] = useState<Three | null>(null);
  const cont = useRef<HTMLDivElement>(null);
  const rend = useRef<RenderizadorCena | null>(null);
  const camRef = useRef<Camera3D | null>(null);
  const sujo = useRef(false);

  const r = useMemo(() => (dim ? cenaDoElemento(b, dim, tipo, id) : null), [b, rev, dim, tipo, id]);
  const camadas = useMemo(() => (r ? camadasDeArmadura(r.armaduras, por) : []), [r, por]);
  const limitesRef = useRef(r?.cena.limites);
  limitesRef.current = r?.cena.limites;

  const desenhar = () => {
    sujo.current = false;
    const rd = rend.current;
    if (!rd || !camRef.current) return;
    rd.definirCamera(camRef.current);
    const ms = rd.renderizar();
    if (cont.current) cont.current.dataset.frameMs = ms.toFixed(1);
  };
  const pedir = () => { if (!sujo.current) { sujo.current = true; requestAnimationFrame(desenhar); } };
  const reenquadrar = () => {
    const el = cont.current, l = limitesRef.current;
    if (!el || !l) return;
    const q = el.getBoundingClientRect();
    camRef.current = enquadrar(l, q.width / Math.max(1, q.height), { projecao: 'perspectiva' });
  };

  useEffect(() => {
    let vivo = true;
    if (!temWebGL()) { setStatus('sem-3d'); return; }
    carregarThree().then((t) => { if (vivo) setT(t); }).catch(() => { if (vivo) setStatus('sem-3d'); });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    const el = cont.current;
    if (!T || !el) return;
    let rd: RenderizadorCena;
    try { rd = new RenderizadorCena(T, el); } catch { setStatus('sem-3d'); return; }
    rend.current = rd;
    rd.canvas.setAttribute('aria-label', 'Armadura em 3D');
    const medir = () => { const q = el.getBoundingClientRect(); rd.redimensionar(q.width, q.height); pedir(); };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    const ctl = ligarControles(el, {
      camera: () => camRef.current!, definirCamera: (c) => { camRef.current = c; },
      caminhando: () => false, olhar: () => { throw new Error('sem caminhar'); }, definirOlhar: () => undefined, velocidade: () => 0,
      limites: () => limitesRef.current!, clique: () => undefined, passar: () => undefined, mudarPavimento: () => undefined,
      enquadrar: () => { reenquadrar(); pedir(); }, mudou: pedir,
    });
    setStatus('pronto');
    return () => { ro.disconnect(); ctl.desligar(); rd.dispose(); rend.current = null; };
  }, [T]);

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
