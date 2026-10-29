// Paleta Propriedades (doca direita do Edifício): cartão do tipo do selecionado + os grupos de elemento que já existiam.
import { useEffect, useRef, type ReactNode } from 'react';
import { Palette, TypeCard } from '../ui';
import { useBuilding } from './store';
import { usePlanta } from './plantaStore';
import { useEdifUI } from './uiStore';
import { lancesDoPilar } from '../../core/building/types';
import { useEscadaUI } from './EscadaUI';
import { EscadaPropriedades } from './EscadaPropriedades';

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
  const pp = b.pilaresParede?.find((x) => x.id === id);
  if (pp) return { tipo: 'pilarParede' as const, id, icone: 'pilar', nome: pp.nome, desc: `Pilar-parede · ${pp.tipo}`, contagem: `Pilares-parede (${n})` };
  const parede = b.paredes?.find((x) => x.id === id);
  if (parede) return { tipo: 'parede' as const, id, icone: 'laje', nome: parede.nome, desc: `Parede de ${parede.tipo === 'concreto' ? 'concreto' : parede.tipo === 'blocos' ? 'blocos' : 'alvenaria'} · ${parede.pontos.length - 1} trecho(s)`, contagem: `Paredes (${n})` };
  const muro = b.murosArrimo?.find((x) => x.id === id);
  if (muro) return { tipo: 'muro' as const, id, icone: 'fundacao', nome: muro.nome, desc: `Muro de arrimo · H ${String(+muro.H.toFixed(2)).replace('.', ',')} m`, contagem: `Muros (${n})` };
  const f = b.fundacao;
  const vf = f?.vigas?.find((x) => x.id === id);
  if (vf) return { tipo: 'vigaFundacao' as const, id, icone: 'fundacao', nome: vf.nome, desc: `Viga de fundação · ${String(vf.tipo)}`, contagem: `Vigas de fundação (${n})` };
  const ve = f?.vigasElasticas?.find((x) => x.id === id);
  if (ve) return { tipo: 'vigaFundacao' as const, id, icone: 'fundacao', nome: ve.nome, desc: 'Viga de fundação sobre base elástica', contagem: `Vigas de fundação (${n})` };
  const rad = f?.radiers?.find((x) => x.id === id);
  if (rad) return { tipo: 'radier' as const, id, icone: 'fundacao', nome: rad.nome, desc: 'Radier sobre base elástica', contagem: `Radiers (${n})` };
  const cor = f?.corridas?.find((x) => x.id === id);
  if (cor) return { tipo: 'corrida' as const, id, icone: 'fundacao', nome: cor.nome, desc: 'Sapata corrida', contagem: `Sapatas corridas (${n})` };
  const con = b.consolos?.find((x) => x.id === id);
  if (con) return { tipo: 'consolo' as const, id, icone: 'pilar', nome: con.nome, desc: 'Consolo curto', contagem: `Consolos (${n})` };
  const esc = b.escadas?.find((x) => x.id === id);
  if (esc) return { tipo: 'escada' as const, id, icone: 'escada', nome: esc.nome, desc: `Escada · ${esc.lances.length} lance(s)`, contagem: `Escadas (${n})` };
  if (n > 0) return { tipo: 'outros' as const, id, icone: 'obra', nome: `${n} elemento(s) selecionado(s)`, desc: 'Seleção', contagem: `Seleção (${n})` };
  return null;
}

/** `semElementos`: vistas que não editam elementos (Pranchas, Premissas) não mostram a seleção nem os grupos de elemento do contexto anterior. */
export function Propriedades({ children, semElementos = false }: { children: ReactNode; semElementos?: boolean }) {
  const r0 = useResumoSelecao();
  const r = semElementos ? null : r0;
  const b = useBuilding((s) => s.sessao.modelo);
  const corpo = useRef<HTMLDivElement>(null);
  // abre e rola até o grupo do tipo do selecionado (Pilares, Vigas, Lajes)
  useEffect(() => {
    if (!r) return;
    const prefixo = ({ pilar: 'Pilares', viga: 'Vigas', laje: 'Lajes', pilarParede: 'Pilares-parede', parede: 'Paredes', muro: 'Muros de arrimo' } as Record<string, string>)[r.tipo] ?? '';
    if (!prefixo) return;
    const g = [...(corpo.current?.querySelectorAll('details.group') ?? [])].find((d) => (d.querySelector(':scope > summary')?.textContent ?? '').startsWith(prefixo)) as HTMLDetailsElement | undefined;
    if (g) { g.open = true; g.scrollIntoView({ block: 'nearest' }); }
  }, [r?.tipo, r?.id]);
  return (
    <Palette titulo="Propriedades" grow>
      {r
        ? <TypeCard icone={r.icone} nome={r.nome} tipo={r.desc} contagem={r.contagem} onEditarTipo={r.tipo === 'escada' ? () => useEscadaUI.getState().abrir(r.id, 'tipos') : r.tipo === 'laje' ?() => useEdifUI.getState().set({ cfg: 'tiposLaje' }) : r.tipo === 'fundacao' ? () => useEdifUI.getState().set({ cfg: 'fundacao' }) : undefined} />
        : <TypeCard icone="obra" nome={b.obra.nome} tipo="Obra" contagem="Nada selecionado" />}
      <div className="edif-in" ref={corpo}>{semElementos ? <p className="muted">Esta vista não edita elementos; volte à Planta para alterar a seleção.</p> : <>{r?.tipo === 'escada' && b.escadas?.find((x) => x.id === r.id) && <EscadaPropriedades e={b.escadas.find((x) => x.id === r.id)!} />}{children}</>}</div>
    </Palette>
  );
}
