import { useEffect, useRef, useState, type JSX } from 'react';
import { useStore, type Tab, type Tool } from './app/store';
import { Canvas, fitView, svgSize } from './app/Canvas';
import { EstruturaPanel } from './app/panels/Estrutura';
import { CargasPanel } from './app/panels/Cargas';
import { ResultadosPanel } from './app/panels/Resultados';
import { InfluenciaPanel } from './app/panels/Influencia';
import { DimensionarPanel } from './app/panels/Dimensionar';
import { Memorial } from './app/Memorial';
import { Library } from './app/Library';
import { Fundacoes } from './app/Fundacoes';
import { SAMPLES } from './app/samples';
import { addMember, deleteSelection, ensureNode, nbrCombinations } from './core/edit';
import { emptyModel, type ForceUnit, type Model } from './core/types';
import { FORCE_UNITS } from './app/units';
import { copyText, download } from './app/ui';
import { useAnalysis, resultFor, sourceLabel } from './app/results';
import { buildDxf } from './app/dxf';
import { svgExportCss } from './app/exportCss';
import { adoptLaunchedFile, buildWorkspace, canPickFiles, launchQueue, currentFileName, forgetFile, mergeWorkspace, parseWorkspace, pickFromDisk, writeToDisk, WORKSPACE_EXT } from './app/workspace';
import { logActivity } from './app/history';

const TOOLS: { t: Tool; key: string; label: string; icon: JSX.Element }[] = [
  { t: 'select', key: 'S', label: 'Selecionar', icon: <path d="M5 3 L5 17 L9 13 L12 19 L14 18 L11 12 L16 12 Z" /> },
  { t: 'node', key: 'N', label: 'Inserir nó', icon: <><rect x="7" y="7" width="8" height="8" /><path d="M11 2v3M11 17v3M2 11h3M17 11h3" /></> },
  { t: 'member', key: 'M', label: 'Inserir barra', icon: <><path d="M4 17 L18 5" /><rect x="2" y="15" width="4" height="4" /><rect x="16" y="3" width="4" height="4" /></> },
  { t: 'pan', key: 'H', label: 'Mover vista', icon: <path d="M11 2v18M2 11h18M11 2l-3 3M11 2l3 3M11 20l-3-3M11 20l3-3M2 11l3-3M2 11l3 3M20 11l-3-3M20 11l-3 3" /> },
];

const TABS: { t: Tab; label: string }[] = [
  { t: 'estrutura', label: 'Estrutura' },
  { t: 'cargas', label: 'Cargas' },
  { t: 'resultados', label: 'Resultados' },
  { t: 'influencia', label: 'Influência' },
  { t: 'dimensionar', label: 'Dimensionar' },
];

export default function App() {
  const st = useStore();
  const a = useAnalysis();
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [coord, setCoord] = useState('');

  const fit = () => st.set({ view: fitView(useStore.getState().model, svgSize.w, svgSize.h) });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      if ((e.ctrlKey || e.metaKey) && !e.altKey && ['s', 'o'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        if (e.key.toLowerCase() === 's') saveRef.current(e.shiftKey); else openRef.current();
        return;
      }
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) s.redo(); else s.undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); s.redo(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') { s.set({ tool: s.tab === 'influencia' ? 'section' : 'select' }); s.clearSel(); }
      else if (k === 'delete' || k === 'backspace') {
        if (!s.selNodes.size && !s.selMembers.size) return;
        const n = new Set(s.selNodes), m = new Set(s.selMembers);
        s.commit((md) => deleteSelection(md, n, m), `${n.size} nó(s) e ${m.size} barra(s) removidos.`);
        s.clearSel();
      }
      else if (k === 's') s.set({ tool: 'select' });
      else if (k === 'n') s.set({ tool: 'node', tab: s.tab === 'resultados' || s.tab === 'influencia' ? 'estrutura' : s.tab });
      else if (k === 'm') s.set({ tool: 'member', tab: s.tab === 'resultados' || s.tab === 'influencia' ? 'estrutura' : s.tab });
      else if (k === 'h') s.set({ tool: 'pan' });
      else if (k === 'f') fit();
      else if (k === '1') setTab('estrutura');
      else if (k === '2') setTab('cargas');
      else if (k === '3') setTab('resultados');
      else if (k === '4') setTab('influencia');
      else if (k === '5') setTab('dimensionar');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function setTab(t: Tab) {
    const s = useStore.getState();
    const tool = t === 'influencia' ? 'section' : s.tool === 'section' ? 'select' : ((t === 'resultados' || t === 'dimensionar') && (s.tool === 'node' || s.tool === 'member')) ? 'select' : s.tool;
    s.set({ tab: t, tool });
  }

  const load = (m: Model, fromFile = false) => { st.setModel(m, false, fromFile); setTimeout(fit, 0); setMenu(false); };

  const openText = async (txt: string, fileName: string) => {
    try {
      const { model, workspace } = parseWorkspace(txt);
      load(model, true);
      st.set({ libraryId: null, module: 'portico' });
      const n = workspace ? await mergeWorkspace(workspace) : 0;
      logActivity(`Trabalho aberto do arquivo ${fileName}`, model.name);
      st.set({ message: workspace
        ? `Trabalho “${model.name}” aberto de ${fileName}${n ? ` · ${n} item(ns) adicionados à biblioteca` : ''}.`
        : `Modelo “${model.name}” aberto de ${fileName}.` });
    } catch { st.set({ message: `Arquivo inválido. Use um ${WORKSPACE_EXT} ou .json salvo por este programa.` }); }
  };

  const openWork = async () => {
    setMenu(false);
    const r = await pickFromDisk();
    if (r === 'unsupported') fileRef.current?.click();
    else if (r !== null) await openText(r, currentFileName() ?? 'arquivo');
  };

  const saveWork = async (saveAs = false) => {
    setMenu(false);
    const s = useStore.getState();
    const ws = await buildWorkspace(s.model);
    const txt = JSON.stringify(ws);
    const name = `${slug(s.model.name)}${WORKSPACE_EXT}`;
    let r: string = await writeToDisk(name, txt, saveAs);
    if (r === 'unsupported') r = await download(name, txt, 'application/json');
    if (r === 'declined') { st.set({ message: 'Gravação cancelada.' }); return; }
    s.setUnsaved(false);
    logActivity(`Trabalho salvo no computador (${currentFileName() ?? name})`, s.model.name);
    st.set({ message: r === 'saved'
      ? `Trabalho salvo em ${currentFileName() ?? name}. Ctrl+S grava de novo no mesmo arquivo.`
      : `Trabalho baixado como ${name} (pasta de downloads). Para retomar, use Arquivo › Abrir.` });
  };
  const saveRef = useRef(saveWork); saveRef.current = saveWork;
  const openRef = useRef(openWork); openRef.current = openWork;

  const openFile = (f: File) => { f.text().then((txt) => openText(txt, f.name)); };
  const openTextRef = useRef(openText); openTextRef.current = openText;

  // App instalado (PWA): .statikos aberto com duplo clique chega pela fila de abertura (File Handling API).
  useEffect(() => {
    launchQueue()?.setConsumer(async ({ files }) => {
      const h = files?.[0];
      if (!h) return;
      try { await openTextRef.current(await adoptLaunchedFile(h), h.name); }
      catch { useStore.getState().set({ message: `Não foi possível ler ${h.name}.` }); }
    });
  }, []);

  const saveJSON = async () => {
    const txt = JSON.stringify(st.model, null, 1);
    const name = `${slug(st.model.name)}.json`;
    setMenu(false);
    const r = await download(name, txt, 'application/json');
    if (r === 'saved') st.set({ message: `Modelo salvo como ${name}.` });
    else if (r === 'declined') st.set({ message: 'Download cancelado.' });
    else { const ok = await copyText(txt); st.set({ message: ok ? `Modelo exportado como ${name}. Se o download não iniciar, o JSON já está na área de transferência.` : `Modelo exportado como ${name}.` }); }
    setMenu(false);
  };

  const exportSVG = async () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = svgExportCss();
    clone.insertBefore(style, clone.firstChild);
    const txt = new XMLSerializer().serializeToString(clone);
    setMenu(false);
    const r = await download(`${slug(st.model.name)}-${st.tab}.svg`, txt, 'image/svg+xml');
    st.set({ message: r === 'declined' ? 'Download cancelado.' : 'Desenho exportado em SVG (abre no navegador, Inkscape ou CAD).' });
    setMenu(false);
  };

  const exportDXF = async () => {
    setMenu(false);
    const s = useStore.getState();
    const ok = !a.prep.error;
    const txt = buildDxf({
      model: s.model, analysis: ok ? a : null, results: ok ? resultFor(a, s.source) : [], resultLabel: sourceLabel(s.model, s.source),
      caseId: s.activeCase, diagScale: s.diagScale, mTension: s.mTension, dims: true,
    });
    const r = await download(`${slug(s.model.name)}.dxf`, txt, 'application/dxf');
    st.set({ message: r === 'declined' ? 'Download cancelado.' : `Desenho exportado em DXF R12 (metros), com camadas de geometria, apoios, cargas, cotas e diagramas${ok ? ` de “${sourceLabel(s.model, s.source)}”` : ''}.` });
  };

  const submitCoord = () => {
    const s = useStore.getState();
    const parts = coord.replace(/;/g, ' ').trim().split(/\s+/).map((p) => parseFloat(p.replace(',', '.')));
    if (parts.length < 2 || parts.some((p) => !Number.isFinite(p))) { s.set({ message: 'Digite coordenadas como “x y” (ex.: 6 4,5) ou “x1 y1 x2 y2” para uma barra.' }); return; }
    {
      const mat = s.model.materials[0]?.id ?? 1, sec = s.model.sections[0]?.id ?? 1;
      if (parts.length >= 4) s.commit((m) => { addMember(m, parts[0], parts[1], parts[2], parts[3], mat, sec); }, `Barra de (${parts[0]}; ${parts[1]}) a (${parts[2]}; ${parts[3]}).`);
      else s.commit((m) => { ensureNode(m, parts[0], parts[1]); }, `Nó em (${parts[0]}; ${parts[1]}).`);
      setCoord('');
    }
  };

  const status = a.prep.error ? { cls: 'bad', text: 'Instável' } : { cls: 'ok', text: `${st.model.nodes.length} nós · ${st.model.members.length} barras · ${a.prep.free.length} gdl` };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg viewBox="0 0 28 20" aria-hidden="true"><path d="M2 18 L2 6 L14 2 L26 6 L26 18" /><path d="M2 6 L26 6" className="thin" /><path d="M14 2 L14 6" className="thin" /></svg>
          <span className="bname">Statikos</span>
          <span className="bsub">pórticos planos</span>
        </div>
        <div className="menuwrap">
          <button type="button" className="tbtn" aria-expanded={menu} onClick={() => setMenu(!menu)}>Arquivo ▾</button>
          {menu && (
            <div className="menu" onMouseLeave={() => setMenu(false)}>
              <button type="button" onClick={() => { const m = emptyModel(); forgetFile(); load(m); logActivity('Novo modelo', m.name); }}>Novo modelo</button>
              <button type="button" onClick={openWork}>Abrir trabalho do computador… <span className="kbd">Ctrl+O</span></button>
              <button type="button" onClick={() => saveWork(false)}>Salvar no computador <span className="kbd">Ctrl+S</span></button>
              {canPickFiles() && <button type="button" onClick={() => saveWork(true)}>Salvar como… <span className="kbd">Ctrl+Shift+S</span></button>}
              <button type="button" onClick={() => { setMenu(false); st.set({ libraryOpen: true }); }}>Biblioteca e histórico…</button>
              <div className="msep">Exportar</div>
              <button type="button" onClick={saveJSON}>Só o modelo (.json)</button>
              <button type="button" onClick={exportSVG}>Exportar desenho (SVG)</button>
              <button type="button" onClick={exportDXF}>Desenho DXF (CAD)</button>
              <div className="msep">Exemplos</div>
              {SAMPLES.map((s) => <button type="button" key={s.key} onClick={() => { const m = s.make(); if (s.key === 'portico') m.combinations = nbrCombinations(m.cases, 1); forgetFile(); load(m); }}>{s.label}</button>)}
            </div>
          )}
          <input ref={fileRef} type="file" accept={`${WORKSPACE_EXT},.json,application/json`} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ''; }} />
        </div>
        <div className="mname" title="Nome do modelo">
          <input aria-label="Nome do modelo" value={st.model.name} onChange={(e) => st.commit((m) => { m.name = e.target.value; })} />
        </div>
        <div className="tgroup">
          <button type="button" className="tbtn icon" title="Desfazer (Ctrl+Z)" disabled={!st.past.length} onClick={st.undo}><svg viewBox="0 0 22 22"><path d="M8 5 L3 10 L8 15M3 10 H13 a5 5 0 0 1 0 10 H10" /></svg></button>
          <button type="button" className="tbtn icon" title="Refazer (Ctrl+Y)" disabled={!st.future.length} onClick={st.redo}><svg viewBox="0 0 22 22"><path d="M14 5 L19 10 L14 15M19 10 H9 a5 5 0 0 0 0 10 H12" /></svg></button>
        </div>
        <div className="modsw" role="tablist" aria-label="Módulo">
          <button type="button" role="tab" aria-selected={st.module === 'portico'} className={st.module === 'portico' ? 'on' : ''} onClick={() => st.set({ module: 'portico' })}>Pórtico</button>
          <button type="button" role="tab" aria-selected={st.module === 'fundacoes'} className={st.module === 'fundacoes' ? 'on' : ''} onClick={() => st.set({ module: 'fundacoes' })}>Fundações</button>
        </div>
        <span className={`status ${status.cls}`}>{status.text}</span>
        <button type="button" className={`tbtn memo-btn${st.unsaved ? ' unsaved' : ''}`} onClick={() => saveWork(false)} title={st.unsaved ? 'Há alterações não salvas no computador (Ctrl+S)' : 'Salvar no computador (Ctrl+S)'}>{st.unsaved ? '● ' : ''}Salvar</button>
        <button type="button" className="tbtn memo-btn" onClick={() => st.set({ libraryOpen: true })}>Biblioteca</button>
        <button type="button" className="tbtn memo-btn" onClick={() => st.set({ memorialOpen: true })}>Memorial</button>
        <button type="button" className="tbtn panel-toggle" onClick={() => setPanelOpen(!panelOpen)}>{panelOpen ? 'Ocultar painel' : 'Painel'}</button>
      </header>

      {st.module === 'fundacoes' ? <Fundacoes /> : (
      <div className={`main${panelOpen ? '' : ' nopanel'}`}>
        <nav className="toolbar" aria-label="Ferramentas">
          {TOOLS.map((t) => (
            <button type="button" key={t.t} className={`tool${st.tool === t.t ? ' on' : ''}`} title={`${t.label} (${t.key})`} aria-label={t.label} onClick={() => { st.set({ tool: t.t }); if ((t.t === 'node' || t.t === 'member') && (st.tab === 'resultados' || st.tab === 'influencia')) st.set({ tab: 'estrutura' }); }}>
              <svg viewBox="0 0 22 22">{t.icon}</svg>
              <span className="kbd">{t.key}</span>
            </button>
          ))}
          <div className="tsep" />
          <button type="button" className="tool" title="Enquadrar (F)" aria-label="Enquadrar" onClick={fit}><svg viewBox="0 0 22 22"><path d="M3 8V3h5M14 3h5v5M19 14v5h-5M8 19H3v-5" /></svg><span className="kbd">F</span></button>
        </nav>

        <section className="stage">
          <Canvas svgRef={svgRef} />
          {st.tool === 'member' && <div className="toast">Clique no ponto inicial e nos seguintes. Esc ou botão direito encerra a sequência.</div>}
          {st.tool === 'section' && st.tab === 'influencia' && <div className="toast">Clique numa barra para posicionar a seção da linha de influência.</div>}
        </section>

        {panelOpen && (
          <aside className="panel">
            <div className="tabs" role="tablist">
              {TABS.map((t, i) => (
                <button type="button" role="tab" aria-selected={st.tab === t.t} key={t.t} className={st.tab === t.t ? 'on' : ''} onClick={() => setTab(t.t)} title={`${t.label} (${i + 1})`}>{t.label}</button>
              ))}
            </div>
            {st.tab === 'estrutura' && <EstruturaPanel />}
            {st.tab === 'cargas' && <CargasPanel />}
            {st.tab === 'resultados' && <ResultadosPanel />}
            {st.tab === 'influencia' && <InfluenciaPanel />}
            {st.tab === 'dimensionar' && <DimensionarPanel />}
          </aside>
        )}
      </div>

      )}
      {st.memorialOpen && <Memorial onClose={() => st.set({ memorialOpen: false })} />}
      {st.libraryOpen && <Library />}
      <footer className="statusbar">
        <span className="msg">{st.message}</span>
        <form className="coordin" onSubmit={(e) => { e.preventDefault(); submitCoord(); }}>
          <input id="coordinput" aria-label="Entrada por coordenadas" placeholder="x y  ou  x1 y1 x2 y2  ↵" value={coord} onChange={(e) => setCoord(e.target.value)} />
        </form>
        <label className="check small" htmlFor="snapchk"><input id="snapchk" type="checkbox" checked={st.snap} onChange={(e) => st.set({ snap: e.target.checked })} /> <span>Snap</span></label>
        <label className="check small" htmlFor="dimchk" title="Cotas automáticas de vãos e níveis (saem também no SVG exportado; o DXF traz sempre a camada COTAS)"><input id="dimchk" type="checkbox" checked={st.showDims} onChange={(e) => st.set({ showDims: e.target.checked })} /> <span>Cotas</span></label>
        <label className="gridsel" htmlFor="gridsel">Grade
          <select id="gridsel" value={st.grid} onChange={(e) => st.set({ grid: +e.target.value })}>
            {[0.05, 0.1, 0.25, 0.5, 1, 2].map((g) => <option key={g} value={g}>{String(g).replace('.', ',')} m</option>)}
          </select>
        </label>
        <label className="gridsel" htmlFor="unitsel" title="Unidades de exibição e entrada. O cálculo, o dimensionamento e o memorial usam kN, m e MPa.">Unidades
          <select id="unitsel" value={st.model.units?.force ?? 'kN'} onChange={(e) => st.commit((m) => { m.units = { force: e.target.value as ForceUnit }; }, `Unidades: ${FORCE_UNITS.find((u) => u.v === e.target.value)?.label}.`)}>
            {FORCE_UNITS.map((u) => <option key={u.v} value={u.v}>{u.label}</option>)}
          </select>
        </label>
      </footer>
    </div>
  );
}

function slug(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'modelo';
}
