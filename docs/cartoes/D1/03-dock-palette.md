# D1 — cartão 03: `Dock` (redimensionável e recolhível) e `Palette`

Classe: Haiku (código validado, teste com valores esperados).

## Arquivos
- `src/app/layout.ts` (novo): estado do layout (largura e recolhimento das docas, aba da faixa por módulo, faixa recolhida), guardado em `localStorage` (`statikos:layout`) com `try/catch`
- `src/app/layout.test.ts` (novo)
- `src/app/ui/Dock.tsx` (novo)
- `src/app/ui/index.tsx` (uma linha)

## `src/app/layout.ts`
```ts
// Estado do layout (D2): aba ativa da faixa de comandos por módulo, faixa recolhida e largura/recolhimento das docas.
// Fica no navegador (`statikos:layout`, protegido por try/catch) e não vai para o arquivo de trabalho.
import { create } from 'zustand';

export type Modulo = 'portico' | 'edificio' | 'fundacoes';
export interface Doca { w: number; aberta: boolean }
export const DOCA_MIN = 140;
export const DOCA_MAX = 640;
const CHAVE = 'statikos:layout';

interface Salvo { faixaAberta: boolean; aba: Record<string, string>; docas: Record<string, Doca> }
interface LayoutState extends Salvo {
  setFaixaAberta(v: boolean): void;
  setAba(modulo: Modulo, id: string): void;
  setDoca(id: string, p: Partial<Doca>, padrao: number): void;
}

export const limitaDoca = (w: number) => Math.min(DOCA_MAX, Math.max(DOCA_MIN, Math.round(w)));

function ler(): Salvo {
  const vazio: Salvo = { faixaAberta: true, aba: {}, docas: {} };
  try {
    const t = window.localStorage.getItem(CHAVE);
    if (!t) return vazio;
    const j = JSON.parse(t) as Partial<Salvo>;
    return { faixaAberta: j.faixaAberta !== false, aba: j.aba && typeof j.aba === 'object' ? j.aba : {}, docas: j.docas && typeof j.docas === 'object' ? j.docas : {} };
  } catch { return vazio; }
}

export const useLayout = create<LayoutState>((set) => ({
  ...ler(),
  setFaixaAberta: (v) => set({ faixaAberta: v }),
  setAba: (modulo, id) => set((s) => ({ aba: { ...s.aba, [modulo]: id } })),
  setDoca: (id, p, padrao) => set((s) => {
    const atual = s.docas[id] ?? { w: padrao, aberta: true };
    return { docas: { ...s.docas, [id]: { w: p.w === undefined ? atual.w : limitaDoca(p.w), aberta: p.aberta ?? atual.aberta } } };
  }),
}));

useLayout.subscribe((s) => {
  try { window.localStorage.setItem(CHAVE, JSON.stringify({ faixaAberta: s.faixaAberta, aba: s.aba, docas: s.docas })); } catch { /* sem armazenamento: o layout só vale nesta sessão */ }
});
```

## `src/app/layout.test.ts` (ambiente do vitest: sem `window`; o módulo tem de carregar sem erro e o armazenamento é opcional)
```ts
import { describe, expect, it } from 'vitest';
import { DOCA_MAX, DOCA_MIN, limitaDoca, useLayout } from './layout';

describe('layout', () => {
  it('limita a largura da doca entre 140 e 640 px e arredonda', () => {
    expect(limitaDoca(50)).toBe(DOCA_MIN);
    expect(limitaDoca(9999)).toBe(DOCA_MAX);
    expect(limitaDoca(301.6)).toBe(302);
  });
  it('doca sem registro nasce aberta com a largura padrão; setDoca muda só o pedido', () => {
    const s = useLayout.getState();
    s.setDoca('t-esq', { w: 500 }, 400);
    expect(useLayout.getState().docas['t-esq']).toEqual({ w: 500, aberta: true });
    s.setDoca('t-esq', { aberta: false }, 400);
    expect(useLayout.getState().docas['t-esq']).toEqual({ w: 500, aberta: false });
    s.setDoca('t-nova', { aberta: false }, 380);
    expect(useLayout.getState().docas['t-nova']).toEqual({ w: 380, aberta: false });
  });
  it('aba da faixa por módulo e faixa recolhida', () => {
    const s = useLayout.getState();
    s.setAba('edificio', 'analise');
    s.setAba('portico', 'vista');
    expect(useLayout.getState().aba).toMatchObject({ edificio: 'analise', portico: 'vista' });
    s.setFaixaAberta(false);
    expect(useLayout.getState().faixaAberta).toBe(false);
    s.setFaixaAberta(true);
  });
});
```
(`vitest` roda este arquivo em ambiente node: `window` não existe, `ler()` cai no `catch` e devolve o vazio; a assinatura de gravação também cai no `catch`.)

## `src/app/ui/Dock.tsx`
```tsx
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
```
Atenção ao teste de estilo inline do `design.test`: a expressão `style={{ width: largura }}` só pode ter chaves da lista permitida (`width`, `height`, `left`, `top`…); por isso a largura é calculada fora do JSX (um template com `${w}` dentro de `style={{ … }}` é lido como chave `w` e reprova).

## `src/app/ui/index.tsx` (fim)
```tsx
export { Dock, Palette } from './Dock';
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run mapa`.

## Rótulos
Botão `Recolher <rotulo>` / `Mostrar <rotulo>` (`aria-expanded`); separador `Largura de <rotulo>` (`role=separator`, setas ← → mudam 16 px). Os rótulos de doca da D2 são "painel lateral esquerdo" e "painel lateral direito" (a D4 e a D5 os renomeiam para Navegador e Propriedades; antes confira com `grep -n "getByLabel\|getByRole" e2e/flows.mjs` que nenhum fluxo busca "Navegador" ou "Propriedades").
