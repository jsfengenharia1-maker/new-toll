// Base das vistas 3D isoladas de um elemento (aba 3D da armadura, janela da viga de fundação): carrega o three sob demanda,
// cria o renderizador no contêiner, liga os controles de câmera (órbita, deslocar, zoom) e redesenha a pedido. A cena e
// os materiais ficam por conta de cada vista, que usa `rend` depois que `status` vira 'pronto'.
import { useEffect, useRef, useState } from 'react';
import { enquadrar, type Camera3D } from '../../core/vista3d/camera';
import { TIPOS_3D, type Cena3D, type TipoElemento3D } from '../../core/vista3d/registro';
import { cssVar } from '../design/tokens';
import { carregarThree, temWebGL, type Three } from './carregarThree';
import { ligarControles } from './controles';
import { contextosWebgl } from './contextos';
import { RenderizadorCena, type CoresCena } from './renderizador';

const CHAVES_COR = ['fundo', 'linha', 'selecao', 'destaque', 'pendente'] as const;
/** Cores da cena a partir dos tokens `--v3d-*` do tema em vigor no elemento. */
export function lerCores(el: HTMLElement): CoresCena {
  const v = (n: string) => cssVar(`v3d-${n}`, el);
  const base = Object.fromEntries(CHAVES_COR.map((k) => [k, v(k)])) as Record<(typeof CHAVES_COR)[number], string>;
  return { ...base, tipos: Object.fromEntries(TIPOS_3D.map((t) => [t.v, v(t.v)])) as Record<TipoElemento3D, string> };
}

export type Status3D = 'carregando' | 'pronto' | 'sem-3d';

export interface OpcoesCena3DIsolada {
  /** Falso = não cria renderizador (janela sem contexto WebGL disponível); status fica 'sem-3d'. */
  ativo?: boolean;
  /** Chamado a cada mudança de câmera feita pelo usuário (órbita, deslocar, zoom, enquadrar). */
  aoCamera?: (c: Camera3D) => void;
}

export function useCena3DIsolada(limites: Cena3D['limites'] | undefined, rotulo: string, opcoes: OpcoesCena3DIsolada = {}) {
  const ativo = opcoes.ativo ?? true;
  const aoCameraRef = useRef(opcoes.aoCamera);
  aoCameraRef.current = opcoes.aoCamera;
  const [status, setStatus] = useState<Status3D>('carregando');
  const [T, setT] = useState<Three | null>(null);
  const cont = useRef<HTMLDivElement>(null);
  const rend = useRef<RenderizadorCena | null>(null);
  const camRef = useRef<Camera3D | null>(null);
  const sujo = useRef(false);
  const limitesRef = useRef(limites);
  limitesRef.current = limites;

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
    aoCameraRef.current?.(camRef.current);
  };

  useEffect(() => {
    let vivo = true;
    if (!temWebGL()) { setStatus('sem-3d'); return; }
    carregarThree().then((t) => { if (vivo) setT(t); }).catch(() => { if (vivo) setStatus('sem-3d'); });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    const el = cont.current;
    if (!T || !el || !ativo) return;
    if (!contextosWebgl.adquirir()) { setStatus('sem-3d'); return; }
    let rd: RenderizadorCena;
    try { rd = new RenderizadorCena(T, el); } catch { contextosWebgl.liberar(); setStatus('sem-3d'); return; }
    rend.current = rd;
    rd.canvas.setAttribute('aria-label', rotulo);
    const medir = () => { const q = el.getBoundingClientRect(); rd.redimensionar(q.width, q.height); pedir(); };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    const ctl = ligarControles(el, {
      camera: () => camRef.current!, definirCamera: (c) => { camRef.current = c; aoCameraRef.current?.(c); },
      caminhando: () => false, olhar: () => { throw new Error('sem caminhar'); }, definirOlhar: () => undefined, velocidade: () => 0,
      limites: () => limitesRef.current!, clique: () => undefined, passar: () => undefined, mudarPavimento: () => undefined,
      enquadrar: () => { reenquadrar(); pedir(); }, mudou: pedir,
    });
    setStatus('pronto');
    return () => { ro.disconnect(); ctl.desligar(); rd.dispose(); rend.current = null; contextosWebgl.liberar(); };
  }, [T, ativo]);

  return { cont, rend, camRef, status, pedir, reenquadrar };
}
