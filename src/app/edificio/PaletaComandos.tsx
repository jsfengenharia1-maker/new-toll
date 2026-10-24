// Paleta de comandos (Ctrl+K): busca ferramentas, ações, comandos do registro sem parâmetros obrigatórios, abas,
// pavimentos e elementos (pilares, vigas, lajes). Enter executa; o item executado fica como "último comando",
// que o Enter na planta (ferramenta Selecionar, nada pendente) repete.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useBuilding } from './store';
import { aoEscolher, usePlanta, type Ferramenta } from './plantaStore';
import { ROTULO_FERRAMENTA, TECLA_FERRAMENTA } from './Planta';
import { listarComandos } from '../../core/commands';
import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';
import { useStore } from '../store';
import { Button, Input, Modal } from '../ui';
import { useEdifUI } from './uiStore';
import { useDiagonaisUI } from './DiagonaisUI';
import { useConsolosUI } from './ConsolosUI';
import { useInclinadasUI } from './InclinadasUI';
import { useEscadaCalculoUI } from './EscadaCalculoUI';

export interface ItemPaleta { id: string; tipo: 'Ferramenta' | 'Ação' | 'Comando' | 'Aba' | 'Pavimento' | 'Pilar' | 'Viga' | 'Laje'; rotulo: string; detalhe?: string; executar: () => void; repetivel: boolean }

/** Normaliza para a busca: minúsculas, sem acentos. */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Itens que casam com todas as palavras da busca (em rótulo, tipo e detalhe), os de rótulo que começa com a busca primeiro. */
export function filtrarPaleta(itens: ItemPaleta[], busca: string, max = 60): ItemPaleta[] {
  const q = norm(busca.trim()), palavras = q.split(/\s+/).filter(Boolean);
  if (!palavras.length) return itens.slice(0, max);
  const ok = itens.filter((i) => { const t = norm(`${i.rotulo} ${i.tipo} ${i.detalhe ?? ''}`); return palavras.every((p) => t.includes(p)); });
  return ok.sort((a, z) => Number(!norm(a.rotulo).startsWith(q)) - Number(!norm(z.rotulo).startsWith(q))).slice(0, max);
}

const ABAS: [string, string][] = [['planta', 'Planta'], ['elevacao', 'Elevação'], ['verificacao', 'Verificação'], ['analise', 'Análise'], ['dimensionamento', 'Dimensionamento'], ['pranchas', 'Pranchas'], ['premissas', 'Premissas']];

function itensDaPaleta(b: BuildingModel, ctx: { exec: (n: string, p: Record<string, unknown>) => unknown; desfazer: () => void; refazer: () => void; calcular: () => void; setAba: (a: string) => void }): ItemPaleta[] {
  const pl = usePlanta.getState();
  const ps = pavimentosOrdenados(b);
  const pavAtual = ps.find((p) => p.id === pl.pavimento) ?? ps[Math.min(1, ps.length - 1)];
  const grupo = pavAtual?.grupo;
  const naPlanta = (set: Parameters<typeof pl.set>[0]) => { ctx.setAba('planta'); usePlanta.getState().set(set); };
  const out: ItemPaleta[] = [];
  for (const f of Object.keys(ROTULO_FERRAMENTA) as Ferramenta[]) {
    if (f === 'alinhar' && !b.mascaras.length) continue;
    out.push({ id: `f:${f}`, tipo: 'Ferramenta', rotulo: ROTULO_FERRAMENTA[f], detalhe: TECLA_FERRAMENTA[f] ? `tecla ${TECLA_FERRAMENTA[f]}` : undefined, repetivel: true, executar: () => naPlanta({ ferramenta: f, ...aoEscolher(f) }) });
  }
  out.push(
    { id: 'a:calcular', tipo: 'Ação', rotulo: 'Calcular e dimensionar', repetivel: true, executar: ctx.calcular },
    { id: 'a:desfazer', tipo: 'Ação', rotulo: 'Desfazer', detalhe: 'Ctrl+Z', repetivel: true, executar: ctx.desfazer },
    { id: 'a:refazer', tipo: 'Ação', rotulo: 'Refazer', detalhe: 'Ctrl+Y', repetivel: true, executar: ctx.refazer },
    { id: 'a:limpar', tipo: 'Ação', rotulo: 'Limpar a seleção', repetivel: true, executar: () => usePlanta.getState().set({ selecao: new Set() }) },
    { id: 'a:cotas-temp', tipo: 'Ação', rotulo: 'Cotas temporárias: ligar ou desligar', detalhe: pl.cotasTemp ? 'ligadas' : 'desligadas', repetivel: true, executar: () => usePlanta.getState().set({ cotasTemp: !usePlanta.getState().cotasTemp }) },
    { id: 'a:enquadrar', tipo: 'Ação', rotulo: 'Enquadrar a planta', detalhe: 'tecla F', repetivel: true, executar: () => naPlanta({ vista: null }) },
    { id: 'a:inclinadas', tipo: 'Ação', rotulo: 'Vigas inclinadas', detalhe: 'lançar, editar e ver resultados', repetivel: false, executar: () => useInclinadasUI.getState().abrir() },
    { id: 'a:escadas-calculo', tipo: 'Ação', rotulo: 'Calcular escadas', detalhe: 'reações, esforços e deslocamentos de cada lance', repetivel: false, executar: () => useEscadaCalculoUI.getState().abrir() },
    { id: 'a:diagonais', tipo: 'Ação', rotulo: 'Diagonais de contraventamento', detalhe: 'lançar, editar e ver resultados', repetivel: false, executar: () => useDiagonaisUI.getState().abrir() },
    { id: 'a:consolos', tipo: 'Ação', rotulo: 'Consolos curtos', detalhe: 'lançar, editar e ver resultados', repetivel: false, executar: () => useConsolosUI.getState().abrir() },
    { id: 'a:viga-curva', tipo: 'Ação', rotulo: 'Viga: alternar trecho reto ou curvo', detalhe: 'ferramenta Viga, tecla R', repetivel: true, executar: () => naPlanta({ ferramenta: 'viga', ...aoEscolher('viga'), curvaViga: !usePlanta.getState().curvaViga, passagemViga: null }) },
  );
  if (grupo) {
    out.push(
      { id: 'a:renumerar-vigas', tipo: 'Ação', rotulo: 'Renumerar as vigas do grupo', detalhe: b.grupos.find((g) => g.id === grupo)?.nome, repetivel: true, executar: () => ctx.exec('viga.renumerar', { grupo }) },
      { id: 'a:detectar-lajes', tipo: 'Ação', rotulo: 'Detectar as lajes do grupo', detalhe: 'panos fechados por vigas', repetivel: true, executar: () => ctx.exec('laje.detectarPanos', { grupo }) },
    );
  }
  // comandos do registro que rodam sem parâmetros
  for (const c of listarComandos()) {
    const req = (c.schema as { required?: string[] }).required ?? [];
    if (req.length || c.risco === 'destrutivo') continue;
    out.push({ id: `c:${c.nome}`, tipo: 'Comando', rotulo: c.nome, detalhe: c.descricao.split('. ')[0], repetivel: true, executar: () => ctx.exec(c.nome, {}) });
  }
  for (const [k, l] of ABAS) out.push({ id: `t:${k}`, tipo: 'Aba', rotulo: l, repetivel: false, executar: () => ctx.setAba(k) });
  for (const p of [...ps].reverse()) out.push({ id: `p:${p.id}`, tipo: 'Pavimento', rotulo: p.nome, detalhe: `cota ${String(p.cota).replace('.', ',')} m`, repetivel: false, executar: () => naPlanta({ pavimento: p.id, selecao: new Set() }) });
  const foco = (id: string, pav?: string) => { const n = (usePlanta.getState().foco?.n ?? 0) + 1; naPlanta({ ...(pav ? { pavimento: pav } : {}), selecao: new Set([id]), foco: { id, n } }); };
  for (const p of b.pilares) out.push({ id: `e:${p.id}`, tipo: 'Pilar', rotulo: p.nome, repetivel: false, executar: () => foco(p.id) });
  const pavDoGrupo = (g: string) => (grupo === g ? undefined : ps.find((p) => p.grupo === g)?.id);
  const nomeGrupo = (g: string) => b.grupos.find((x) => x.id === g)?.nome ?? g;
  for (const v of b.vigas) out.push({ id: `e:${v.id}`, tipo: 'Viga', rotulo: v.nome, detalhe: nomeGrupo(v.grupo), repetivel: false, executar: () => foco(v.id, pavDoGrupo(v.grupo)) });
  for (const v of b.vigasInclinadas ?? []) out.push({ id: `e:${v.id}`, tipo: 'Viga', rotulo: v.nome, detalhe: 'viga inclinada', repetivel: false, executar: () => useInclinadasUI.getState().abrir(v.id) });
  for (const d of b.diagonais ?? []) out.push({ id: `e:${d.id}`, tipo: 'Viga', rotulo: d.nome, detalhe: 'diagonal de contraventamento', repetivel: false, executar: () => useDiagonaisUI.getState().abrir(d.id) });
  for (const c of b.consolos ?? []) out.push({ id: `e:${c.id}`, tipo: 'Pilar', rotulo: `Consolo ${c.nome}`, detalhe: 'consolo curto', repetivel: false, executar: () => useConsolosUI.getState().abrir(c.id) });
  for (const l of b.lajes) out.push({ id: `e:${l.id}`, tipo: 'Laje', rotulo: l.nome, detalhe: nomeGrupo(l.grupo), repetivel: false, executar: () => foco(l.id, pavDoGrupo(l.grupo)) });
  return out;
}

export function PaletaComandos({ setAba }: { setAba: (a: string) => void }) {
  const aberta = useEdifUI((s) => s.paleta);
  const setAberta = (f: boolean | ((a: boolean) => boolean)) => useEdifUI.getState().set({ paleta: typeof f === 'function' ? f(useEdifUI.getState().paleta) : f });
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (useStore.getState().module !== 'edificio') return;
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); setAberta((a) => !a); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  return aberta ? <Paleta setAba={setAba} onClose={() => setAberta(false)} /> : null;
}

function Paleta({ setAba, onClose }: { setAba: (a: string) => void; onClose: () => void }) {
  const { sessao, exec, desfazer, refazer, calcular } = useBuilding();
  const b = sessao.modelo;
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState(0);
  const lista = useRef<HTMLDivElement>(null);
  const itens = useMemo(() => itensDaPaleta(b, { exec, desfazer, refazer, calcular: () => { void calcular(); }, setAba }), [b, exec, desfazer, refazer, calcular, setAba]);
  const achados = useMemo(() => filtrarPaleta(itens, busca), [itens, busca]);
  const i = Math.min(sel, Math.max(0, achados.length - 1));
  useEffect(() => { lista.current?.querySelector('.on')?.scrollIntoView({ block: 'nearest' }); }, [i]);
  const executar = (it: ItemPaleta | undefined) => {
    if (!it) return;
    onClose();
    it.executar();
    if (it.repetivel) usePlanta.getState().set({ ultimaAcao: { tipo: 'paleta', rotulo: it.rotulo, executar: it.executar } });
  };
  return (
    <Modal titulo="Paleta de comandos" onClose={onClose}>
      <Input className="paleta-busca" autoFocus aria-label="Buscar comando, pavimento ou elemento" placeholder="Comando, ferramenta, pavimento ou elemento (P1, V3, L2…)" value={busca}
        onChange={(e) => { setBusca(e.target.value); setSel(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSel(Math.min(i + 1, achados.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(Math.max(i - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); executar(achados[i]); }
          e.stopPropagation();
        }} />
      <div className="paleta-lista" ref={lista} role="listbox" aria-label="Resultados" data-resultados={achados.length}>
        {achados.map((it, k) => (
          <Button variant="nenhuma" key={it.id} type="button" role="option" aria-selected={k === i} className={`paleta-item${k === i ? ' on' : ''}`} data-item={it.id} onMouseEnter={() => setSel(k)} onClick={() => executar(it)}>
            <span className="paleta-tipo">{it.tipo}</span><b>{it.rotulo}</b>{it.detalhe && <span className="muted small">{it.detalhe}</span>}
          </Button>
        ))}
        {!achados.length && <p className="muted small">Nada encontrado.</p>}
      </div>
      <p className="muted small">↑ ↓ escolhem, Enter executa, Esc fecha. Na planta, Enter (com Selecionar e nada pendente) repete o último comando.</p>
    </Modal>
  );
}
