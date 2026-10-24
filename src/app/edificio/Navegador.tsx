// Navegador da obra (doca esquerda): árvore Obra > Pavimentos, Pilares, Vigas e Lajes por grupo, Eixos, Fundação e Vistas.
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { Button, Palette, Tree, TreeItem } from '../ui';
import { useBuilding } from './store';
import { usePlanta } from './plantaStore';
import { useEdifUI, type AbaEdificio } from './uiStore';
import { irParaElemento } from './Revisao';
import { useEscadaUI } from './EscadaUI';
import { caminhoAte, idDoNo, montarArvore, type NoArvore } from './arvore';
import { lancesDoPilar, pavimentosOrdenados } from '../../core/building/types';

/** Abre e mostra o grupo (`details.group`) cujo título começa por `prefixo`, em qualquer doca. */
function abrirGrupo(prefixo: string) {
  const g = [...document.querySelectorAll('details.group')].find((d) => (d.querySelector(':scope > summary')?.textContent ?? '').startsWith(prefixo)) as HTMLDetailsElement | undefined;
  if (g) { g.open = true; g.scrollIntoView({ block: 'nearest' }); }
}

export function Navegador() {
  const b = useBuilding((s) => s.sessao.modelo);
  const arvore = useMemo(() => montarArvore(b), [b]);
  const selecao = usePlanta((s) => s.selecao);
  const pavAtual = usePlanta((s) => s.pavimento);
  const aba = useEdifUI((s) => s.aba);
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set(['obra', 'pavs']));
  const alternar = (id: string) => setAbertos((a) => { const n = new Set(a); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const primeiro = [...selecao][0];
  useEffect(() => {
    if (!primeiro) return;
    for (const tipo of ['pilar', 'viga', 'laje', 'eixo', 'fundacao', 'pilarParede', 'parede', 'carga'] as const) {
      const c = caminhoAte(arvore, idDoNo(tipo, primeiro));
      if (c.length) {
        setAbertos((a) => new Set([...a, ...c.slice(0, -1)]));
        requestAnimationFrame(() => document.querySelector('[role="tree"] [role="treeitem"][aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }));
        return;
      }
    }
  }, [primeiro, arvore]);

  const selecionado = (n: NoArvore): boolean | undefined => {
    if (!n.alvo) return undefined;
    if (n.alvo.tipo === 'vista') return aba === n.alvo.id;
    if (n.alvo.tipo === 'pavimento') return pavAtual === n.alvo.id && selecao.size === 0;
    return selecao.has(n.alvo.id);
  };
  const selecionar = (n: NoArvore) => {
    const a = n.alvo;
    if (!a) return;
    const ui = useEdifUI.getState();
    if (a.tipo === 'vista') { ui.set({ aba: a.id as AbaEdificio }); return; }
    ui.set({ aba: 'planta' });
    const P = usePlanta.getState();
    if (a.tipo === 'escada') { P.set({ selecao: new Set([a.id]) }); useEscadaUI.getState().abrir(a.id); return; }
    if (a.tipo === 'pavimento'){ P.set({ pavimento: a.id, selecao: new Set() }); return; }
    if (a.tipo === 'eixo') { P.set({ selecao: new Set([a.id]), foco: { id: a.id, n: Date.now() } }); return; }
    const ps = pavimentosOrdenados(b);
    if (a.tipo === 'carga') {
      const c = b.cargas.find((x) => x.id === a.id);
      const pav = c?.grupo === 'fundacao' ? 'fundacao' : ps.find((p) => p.grupo === c?.grupo)?.id;
      P.set({ selecao: new Set([a.id]), ...(pav ? { pavimento: pav } : {}) });
      return;
    }
    // elementos sem seleção própria na planta: abre o grupo do painel (Dados da obra ou Propriedades) ou a Configuração
    const grupoDe: Partial<Record<typeof a.tipo, string>> = { muro: 'Muros de arrimo', alvenaria: 'Alvenaria estrutural', grupo: 'Grupos (', corte: 'Cortes e seções' };
    if (a.tipo === 'sondagem') { ui.set({ cfg: 'fundacao' }); return; }
    if (grupoDe[a.tipo]) { abrirGrupo(grupoDe[a.tipo]!); return; }
    if (a.tipo === 'pilar') {
      const p = b.pilares.find((x) => x.id === a.id);
      irParaElemento(b, 'pilar', a.id, p ? lancesDoPilar(b, p).at(-1)?.nome : undefined);
    } else if (a.tipo === 'laje') {
      const l = b.lajes.find((x) => x.id === a.id);
      irParaElemento(b, 'laje', a.id, ps.find((p) => p.grupo === l?.grupo)?.nome);
    } else if (a.tipo === 'viga' || a.tipo === 'fundacao' || a.tipo === 'pilarParede' || a.tipo === 'parede') irParaElemento(b, a.tipo, a.id);
  };
  // menu do nó da escada (botão direito ou tecla de menu): Editar, Duplicar e Apagar (E4b)
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  useEffect(() => {
    if (!menu) return;
    const fecha = () => setMenu(null), tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    window.addEventListener('click', fecha); window.addEventListener('keydown', tecla); window.addEventListener('blur', fecha);
    return () => { window.removeEventListener('click', fecha); window.removeEventListener('keydown', tecla); window.removeEventListener('blur', fecha); };
  }, [menu]);
  const exec = useBuilding((s) => s.exec);
  const duplicar = (id: string) => {
    const r = exec('escada.copiarDe', { de: id, dx: 0, dy: 0 });
    const nova = useBuilding.getState().sessao.modelo.escadas?.at(-1);
    if (r.ok && nova) usePlanta.getState().set({ selecao: new Set([nova.id]) });
  };
  const desenhar = (n: NoArvore): ReactNode => (
    <TreeItem key={n.id} level={n.nivel} label={n.rotulo} count={n.contagem} expanded={n.filhos ? abertos.has(n.id) : undefined}
      onContextMenu={n.alvo?.tipo === 'escada' ? (e: MouseEvent) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, id: n.alvo!.id }); } : undefined}
      onToggle={() => alternar(n.id)} selected={selecionado(n)} onSelect={n.alvo ? () => selecionar(n) : undefined}>
      {n.filhos?.map(desenhar)}
    </TreeItem>
  );
  return (
    <Palette titulo="Navegador" aside={<Button variant="mini" title="Recolhe todos os ramos" onClick={() => setAbertos(new Set(['obra']))}>Recolher ramos</Button>}>
      <Tree label="Navegador da obra">{desenhar(arvore)}</Tree>
      {menu && (
        <div className="menu fixo" role="menu" aria-label="Menu da escada" style={{ left: menu.x, top: menu.y }}>
          <Button variant="nenhuma" role="menuitem" onClick={() => { usePlanta.getState().set({ selecao: new Set([menu.id]) }); useEscadaUI.getState().abrir(menu.id); }}>Editar</Button>
          <Button variant="nenhuma" role="menuitem" onClick={() => duplicar(menu.id)}>Duplicar</Button>
          <Button variant="nenhuma" role="menuitem" onClick={() => { exec('escada.remover', { ids: [menu.id] }); }}>Apagar</Button>
        </div>
      )}
    </Palette>
  );
}
