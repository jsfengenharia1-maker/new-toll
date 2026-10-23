// Docas laterais (D1): coluna redimensionável (arrastar a borda ou ← →) e recolhível, e Palette (cabeçalho + corpo) dentro dela.
import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { DOCA_MAX, DOCA_MIN, useLayout } from '../layout';
import { Button } from './index';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Doca lateral. `id` identifica a doca no layout salvo; `padrao` é a largura inicial (px). A borda de arrasto fica do lado do desenho. */
export function Dock({ id, lado, rotulo, padrao, children }: { id: string; lado: 'esq' | 'dir'; rotulo: string; padrao: number; children: ReactNode }) {
  const doca = useLayout((s) => s.docas[id]);
  const setDoca = useLayout((s) => s.setDoca);
  const w = doca?.w ?? padrao, aberta = doca?.aberta ?? true;
  const arrasto = useRef<{ x: number; w: number } | null>(null);
  const sinal = lado === 'esq' ? 1 : -1;
  const largura = `${w}px`; // sempre px: porcentagem numa coluna `auto` do grid zera a coluna do desenho
  const aoMover = (e: PointerEvent<HTMLDivElement>) => { if (arrasto.current) setDoca(id, { w: arrasto.current.w + sinal * (e.clientX - arrasto.current.x) }, padrao); };
  const aoTecla = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (d) { e.preventDefault(); setDoca(id, { w: w + sinal * d * 16 }, padrao); }
  };
  return (
    <aside className={cx('dock', lado === 'esq' ? 'l' : 'r', !aberta && 'off')} aria-label={rotulo} style={aberta ? { width: largura } : undefined}>
      <Button variant="nenhuma" className="dock-toggle" aria-expanded={aberta} aria-label={`${aberta ? 'Recolher' : 'Mostrar'} ${rotulo}`} title={`${aberta ? 'Recolher' : 'Mostrar'} ${rotulo}`} onClick={() => setDoca(id, { aberta: !aberta }, padrao)}>{(lado === 'esq') === aberta ? '‹' : '›'}</Button>
      <div className="dock-in">{children}</div>
      {aberta && (
        <div className="dock-grip" role="separator" aria-orientation="vertical" aria-label={`Largura de ${rotulo}`} aria-valuemin={DOCA_MIN} aria-valuemax={DOCA_MAX} aria-valuenow={w} tabIndex={0}
          onPointerDown={(e) => { arrasto.current = { x: e.clientX, w }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={aoMover}
          onPointerUp={() => { arrasto.current = null; }} onPointerCancel={() => { arrasto.current = null; }} onKeyDown={aoTecla} />
      )}
    </aside>
  );
}

/** Paleta: cabeçalho com título (e `aside`) e corpo rolável. `grow` ocupa o espaço que sobra na doca. */
export function Palette({ titulo, aside, grow, children }: { titulo: string; aside?: ReactNode; grow?: boolean; children: ReactNode }) {
  return (
    <section className={cx('pal', grow && 'grow')} aria-label={titulo}>
      <div className="phead"><span>{titulo}</span>{aside}</div>
      <div className="pbody">{children}</div>
    </section>
  );
}
