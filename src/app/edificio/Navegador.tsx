// Navegador da obra (doca esquerda): árvore Obra > Pavimentos, Pilares, Vigas e Lajes por grupo, Eixos, Fundação e Vistas.
import { useMemo, useState, type ReactNode } from 'react';
import { Button, Palette, Tree, TreeItem } from '../ui';
import { useBuilding } from './store';
import { usePlanta } from './plantaStore';
import { useEdifUI, type AbaEdificio } from './uiStore';
import { montarArvore, type NoArvore } from './arvore';

export function Navegador() {
  const b = useBuilding((s) => s.sessao.modelo);
  const arvore = useMemo(() => montarArvore(b), [b]);
  const selecao = usePlanta((s) => s.selecao);
  const pavAtual = usePlanta((s) => s.pavimento);
  const aba = useEdifUI((s) => s.aba);
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set(['obra', 'pavs']));
  const alternar = (id: string) => setAbertos((a) => { const n = new Set(a); if (n.has(id)) n.delete(id); else n.add(id); return n; });

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
    if (a.tipo === 'pavimento') usePlanta.getState().set({ pavimento: a.id, selecao: new Set() });
  };
  const desenhar = (n: NoArvore): ReactNode => (
    <TreeItem key={n.id} level={n.nivel} label={n.rotulo} count={n.contagem} expanded={n.filhos ? abertos.has(n.id) : undefined}
      onToggle={() => alternar(n.id)} selected={selecionado(n)} onSelect={n.alvo ? () => selecionar(n) : undefined}>
      {n.filhos?.map(desenhar)}
    </TreeItem>
  );
  return (
    <Palette titulo="Navegador" aside={<Button variant="mini" title="Recolhe todos os ramos" onClick={() => setAbertos(new Set(['obra']))}>Recolher ramos</Button>}>
      <Tree label="Navegador da obra">{desenhar(arvore)}</Tree>
    </Palette>
  );
}
