# D5 — cartão 01: cartão do tipo e contagem (componente da ui) e `Propriedades` (casca)

Classe: Sonnet baixo.

## Arquivos
- `src/app/ui/TypeCard.tsx` (novo) e `src/app/ui/index.tsx` (uma linha)
- `src/app/edificio/Propriedades.tsx` (novo)
- `src/app/design/global.css` (`.typecard`, `.ico`, `.psel`)

## `src/app/ui/TypeCard.tsx`
```tsx
// Cartão do tipo da paleta Propriedades (D5): ícone, nome do elemento, tipo, contagem da seleção e "Editar tipo".
import type { ReactNode } from 'react';
import { Button } from './index';
import { Icone } from './Icone';

export function TypeCard({ icone, nome, tipo, contagem, onEditarTipo, children }: { icone: string; nome: string; tipo: string; contagem?: string; onEditarTipo?: () => void; children?: ReactNode }) {
  return (
    <>
      <div className="typecard"><div className="ico"><Icone nome={icone} /></div><div><b>{nome}</b><span>{tipo}</span></div></div>
      {(contagem || onEditarTipo) && (
        <div className="psel"><span>{contagem}</span>{onEditarTipo && <Button variant="mini" onClick={onEditarTipo}>Editar tipo</Button>}</div>
      )}
      {children}
    </>
  );
}
```
`src/app/ui/index.tsx` (fim): `export { TypeCard } from './TypeCard';`

CSS (fim de `global.css`):
```css
.typecard { display: flex; align-items: center; gap: var(--sp-3); margin: var(--sp-3); padding: var(--sp-3); background: var(--field); border: 1px solid var(--line); border-radius: var(--radius); }
.typecard .ico { width: 32px; height: 32px; display: grid; place-items: center; background: var(--surface-2); border-radius: var(--radius); color: var(--muted); }
.typecard .ico .icone { width: 20px; height: 20px; }
.typecard b { display: block; color: var(--ink-strong); font-weight: 600; font-size: var(--fs-lg); }
.typecard span { color: var(--muted); }
.psel { display: flex; align-items: center; justify-content: space-between; padding: 0 var(--sp-4) var(--sp-3); color: var(--muted); }
```

## `src/app/edificio/Propriedades.tsx` (casca; os grupos entram no cartão 02)
O cartão do tipo reflete a seleção da planta (primeiro elemento selecionado); sem seleção mostra a obra.
```tsx
// Paleta Propriedades (doca direita do Edifício): cartão do tipo do selecionado + os grupos de elemento que já existiam.
import { useEffect, useRef, type ReactNode } from 'react';
import { Palette, TypeCard } from '../ui';
import { useBuilding } from './store';
import { usePlanta } from './plantaStore';
import { useEdifUI } from './uiStore';
import { lancesDoPilar } from '../../core/building/types';

const fmtCm = (v: number) => String(+(v * 100).toFixed(1)).replace('.', ',');

/** Descrição do primeiro selecionado: ícone, nome, tipo e a contagem da seleção ("Pilares (2)"). */
export function useResumoSelecao() {
  const b = useBuilding((s) => s.sessao.modelo);
  const sel = usePlanta((s) => s.selecao);
  const ids = [...sel];
  const id = ids[0];
  const n = ids.length;
  const pilar = b.pilares.find((x) => x.id === id);
  if (pilar) return { tipo: 'pilar' as const, id, icone: 'pilar', nome: pilar.nome, desc: `${pilar.secao.tipo === 'ret' ? `${fmtCm(pilar.secao.b)} × ${fmtCm(pilar.secao.h)} cm` : `ø ${fmtCm(pilar.secao.d)} cm`} · ${lancesDoPilar(b, pilar).length} lance(s)`, contagem: `Pilares (${n})` };
  const viga = b.vigas.find((x) => x.id === id);
  if (viga) return { tipo: 'viga' as const, id, icone: 'viga', nome: viga.nome, desc: `${fmtCm(viga.secao.b)} × ${fmtCm(viga.secao.h)} cm`, contagem: `Vigas (${n})` };
  const laje = b.lajes.find((x) => x.id === id);
  if (laje) return { tipo: 'laje' as const, id, icone: 'laje', nome: laje.nome, desc: laje.tipo.tipo ?? 'laje', contagem: `Lajes (${n})` };
  const fund = b.fundacao?.elementos.find((x) => x.id === id);
  if (fund) return { tipo: 'fundacao' as const, id, icone: 'fundacao', nome: fund.nome, desc: String(fund.tipo), contagem: `Elementos de fundação (${n})` };
  return null;
}

export function Propriedades({ children }: { children: ReactNode }) {
  const r = useResumoSelecao();
  const b = useBuilding((s) => s.sessao.modelo);
  const corpo = useRef<HTMLDivElement>(null);
  // abre e rola até o grupo do tipo do selecionado (Pilares, Vigas, Lajes)
  useEffect(() => {
    if (!r) return;
    const prefixo = r.tipo === 'pilar' ? 'Pilares' : r.tipo === 'viga' ? 'Vigas' : r.tipo === 'laje' ? 'Lajes' : '';
    if (!prefixo) return;
    const g = [...(corpo.current?.querySelectorAll('details.group') ?? [])].find((d) => (d.querySelector(':scope > summary')?.textContent ?? '').startsWith(prefixo)) as HTMLDetailsElement | undefined;
    if (g) { g.open = true; g.scrollIntoView({ block: 'nearest' }); }
  }, [r?.tipo, r?.id]);
  return (
    <Palette titulo="Propriedades" grow>
      {r
        ? <TypeCard icone={r.icone} nome={r.nome} tipo={r.desc} contagem={r.contagem} onEditarTipo={r.tipo === 'laje' ? () => useEdifUI.getState().set({ cfg: 'tiposLaje' }) : r.tipo === 'fundacao' ? () => useEdifUI.getState().set({ cfg: 'fundacao' }) : undefined} />
        : <TypeCard icone="obra" nome={b.obra.nome} tipo="Obra" contagem="Nada selecionado" />}
      <div className="edif-in" ref={corpo}>{children}</div>
    </Palette>
  );
}
```
Se `tsc` reclamar do tipo de `laje.tipo` ou `fund.tipo`, usar o rótulo de `TIPO_FUNDACAO_LABEL` (de `core/building/fundacao`) para a fundação e `propriedadesLaje`/`tipoLajeRotulo` existente para a laje (procurar com `grep -n "export function.*[Rr]otulo" src/core/building/*.ts`).

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run build`; `npm run mapa`. Nada é montado ainda (o cartão 02 liga a paleta à doca).
