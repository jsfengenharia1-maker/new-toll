// Controles de câmera próprios (sem addons do three): arrastar gira, Shift/botão direito ou do meio desloca, roda e
// pinça aproximam; no modo caminhar, arrastar muda o olhar e W A S D / setas andam (Shift corre).
import { caminhar as passoCaminhar, deslocar, dolly, orbitar, type Camera3D, type EstadoCaminhar, type Limites } from '../../core/vista3d/camera';

export interface ApiControles {
  camera(): Camera3D;
  definirCamera(c: Camera3D): void;
  caminhando(): boolean;
  olhar(): EstadoCaminhar;
  definirOlhar(e: EstadoCaminhar): void;
  velocidade(): number;
  limites(): Limites;
  /** Clique simples ou duplo (px relativos ao contêiner). */
  clique(x: number, y: number, duplo: boolean): void;
  /** Cursor parado ou movendo sem botão (px; null = saiu). */
  passar(p: { x: number; y: number } | null): void;
  /** Tecla Q / E (ou PageDown / PageUp) no modo caminhar: sobe ou desce um pavimento. */
  mudarPavimento(delta: number): void;
  enquadrar(): void;
  /** Pede um quadro novo. */
  mudou(): void;
}

const LIMIAR_CLIQUE = 4;

/** Liga os controles ao elemento; devolve a função que os desliga e o passo do caminhar (chamado a cada quadro). */
export function ligarControles(el: HTMLElement, api: ApiControles): { desligar(): void; passo(dt: number): boolean } {
  const ponteiros = new Map<number, { x: number; y: number }>();
  let inicio: { x: number; y: number; t: number; mov: number } | null = null;
  let distPinca = 0;
  const teclas = new Set<string>();
  const rel = (e: { clientX: number; clientY: number }) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const altura = () => Math.max(1, el.getBoundingClientRect().height);

  const aoDescer = (e: PointerEvent) => {
    el.focus({ preventScroll: true });
    el.setPointerCapture(e.pointerId);
    ponteiros.set(e.pointerId, rel(e));
    if (ponteiros.size === 1) inicio = { ...rel(e), t: performance.now(), mov: 0 };
    else { inicio = null; const [a, b] = [...ponteiros.values()]; distPinca = Math.hypot(a.x - b.x, a.y - b.y); }
    api.passar(null);
  };
  const aoMover = (e: PointerEvent) => {
    const p = rel(e), ant = ponteiros.get(e.pointerId);
    if (!ant) { api.passar(p); return; }
    ponteiros.set(e.pointerId, p);
    const dx = p.x - ant.x, dy = p.y - ant.y;
    if (ponteiros.size === 2) {
      const [a, b] = [...ponteiros.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (distPinca > 0 && d > 0 && !api.caminhando()) api.definirCamera(dolly(api.camera(), distPinca / d));
      distPinca = d;
      if (!api.caminhando()) api.definirCamera(deslocar(api.camera(), dx / 2 / altura(), -dy / 2 / altura()));
      api.mudou();
      return;
    }
    if (inicio) inicio.mov += Math.abs(dx) + Math.abs(dy);
    if (api.caminhando()) {
      api.definirOlhar(passoCaminhar(api.olhar(), { frente: 0, lado: 0, giro: -dx * 0.005, inclinar: -dy * 0.005 }, 0, 0, api.limites()));
    } else if (e.shiftKey || (e.buttons & 6) !== 0) {
      api.definirCamera(deslocar(api.camera(), dx / altura(), -dy / altura()));
    } else {
      api.definirCamera(orbitar(api.camera(), -dx * 0.006, dy * 0.006));
    }
    api.mudou();
  };
  const aoSubir = (e: PointerEvent) => {
    const era = ponteiros.has(e.pointerId);
    ponteiros.delete(e.pointerId);
    if (!era) return;
    if (inicio && inicio.mov < LIMIAR_CLIQUE && performance.now() - inicio.t < 600 && ponteiros.size === 0) api.clique(inicio.x, inicio.y, false);
    if (ponteiros.size === 0) inicio = null;
    distPinca = 0;
  };
  const aoSair = () => api.passar(null);
  const aoDuplo = (e: MouseEvent) => { const p = rel(e); api.clique(p.x, p.y, true); };
  const aoRolar = (e: WheelEvent) => {
    e.preventDefault();
    if (api.caminhando()) return;
    api.definirCamera(dolly(api.camera(), Math.exp(e.deltaY * 0.0012)));
    api.mudou();
  };
  const aoTecla = (e: KeyboardEvent, baixo: boolean) => {
    const k = e.key.toLowerCase();
    if (baixo && k === 'home') { api.enquadrar(); return; }
    if (!api.caminhando()) return;
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
      if (baixo) teclas.add(k); else teclas.delete(k);
      e.preventDefault();
      if (baixo) api.mudou();
    } else if (baixo && (k === 'e' || k === 'pageup')) { api.mudarPavimento(1); e.preventDefault(); }
    else if (baixo && (k === 'q' || k === 'pagedown')) { api.mudarPavimento(-1); e.preventDefault(); }
  };
  const aoTeclaBaixo = (e: KeyboardEvent) => aoTecla(e, true);
  const aoTeclaCima = (e: KeyboardEvent) => aoTecla(e, false);
  const aoPerderFoco = () => teclas.clear();
  const aoMenu = (e: Event) => e.preventDefault();

  el.addEventListener('pointerdown', aoDescer);
  el.addEventListener('pointermove', aoMover);
  el.addEventListener('pointerup', aoSubir);
  el.addEventListener('pointercancel', aoSubir);
  el.addEventListener('pointerleave', aoSair);
  el.addEventListener('dblclick', aoDuplo);
  el.addEventListener('wheel', aoRolar, { passive: false });
  el.addEventListener('keydown', aoTeclaBaixo);
  el.addEventListener('keyup', aoTeclaCima);
  el.addEventListener('blur', aoPerderFoco);
  el.addEventListener('contextmenu', aoMenu);

  return {
    desligar() {
      el.removeEventListener('pointerdown', aoDescer);
      el.removeEventListener('pointermove', aoMover);
      el.removeEventListener('pointerup', aoSubir);
      el.removeEventListener('pointercancel', aoSubir);
      el.removeEventListener('pointerleave', aoSair);
      el.removeEventListener('dblclick', aoDuplo);
      el.removeEventListener('wheel', aoRolar);
      el.removeEventListener('keydown', aoTeclaBaixo);
      el.removeEventListener('keyup', aoTeclaCima);
      el.removeEventListener('blur', aoPerderFoco);
      el.removeEventListener('contextmenu', aoMenu);
    },
    /** Anda enquanto houver tecla apertada no modo caminhar; devolve se algo mudou. */
    passo(dt: number) {
      if (!api.caminhando() || !teclas.size) return false;
      const frente = (teclas.has('w') || teclas.has('arrowup') ? 1 : 0) - (teclas.has('s') || teclas.has('arrowdown') ? 1 : 0);
      const lado = (teclas.has('d') ? 1 : 0) - (teclas.has('a') ? 1 : 0);
      const giro = (teclas.has('arrowleft') ? 1 : 0) - (teclas.has('arrowright') ? 1 : 0);
      if (!frente && !lado && !giro) return false;
      const v = api.velocidade() * (teclas.has('shift') ? 2.5 : 1);
      api.definirOlhar(passoCaminhar(api.olhar(), { frente, lado, giro: giro * 1.6 * dt, inclinar: 0 }, dt, v, api.limites()));
      return true;
    },
  };
}
