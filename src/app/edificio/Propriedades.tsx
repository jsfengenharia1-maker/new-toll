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
