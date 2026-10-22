// Vista 3D do edifício (V1): three.js carregado sob demanda (public/vendor); sem o arquivo ou sem WebGL, o isométrico
// estático em SVG da mesma cena. Escopo por pavimento, grupo ou intervalo, tipos, transparência, perspectiva/isométrica,
// caminhar, seleção sincronizada com a planta e captura PNG. A geometria vem de src/core/vista3d (função pura).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBuilding } from '../edificio/store';
import { usePlanta } from '../edificio/plantaStore';
import { abrirJanela, irParaElemento } from '../edificio/Revisao';
import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';
import { construirCena, resumoCena, TIPOS_3D, PAV_FUNDACAO, type Cena3D, type Objeto3D, type TipoElemento3D } from '../../core/vista3d/cena';
import { isometricoSvg } from '../../core/vista3d/isometrico';
import {
  ALTURA_OLHO, alternarProjecao, definirAngulos, enquadrar, iniciarCaminhar, type Camera3D, type EstadoCaminhar,
} from '../../core/vista3d/camera';
import { cssVar } from '../design/tokens';
import { Button, Check, Chip, Dropdown, Seg, Slider, download } from '../ui';
import { carregarThree, temWebGL, type Three } from './carregarThree';
import { ligarControles } from './controles';
import { RenderizadorCena, type CoresCena } from './renderizador';
import { opcoesDaVista, useVista3d } from './vista3dStore';

type Status = 'carregando' | 'pronto' | 'sem-vendor' | 'sem-webgl';
const graus = (r: number) => (r * 180) / Math.PI;
const CHAVES_COR = ['fundo', 'linha', 'selecao', 'destaque', 'pendente'] as const;

/** Cores lidas dos tokens `--v3d-*` do contêiner (que carrega o tema). */
function lerCores(el: HTMLElement): CoresCena {
  const v = (n: string) => cssVar(`v3d-${n}`, el);
  const base = Object.fromEntries(CHAVES_COR.map((k) => [k, v(k)])) as Record<(typeof CHAVES_COR)[number], string>;
  return { ...base, tipos: Object.fromEntries(TIPOS_3D.map((t) => [t.v, v(t.v)])) as Record<TipoElemento3D, string> };
}

const TIPO_ALVO: Partial<Record<TipoElemento3D, 'pilar' | 'viga' | 'laje' | 'fundacao'>> = { pilar: 'pilar', viga: 'viga', laje: 'laje', fundacao: 'fundacao' };

export function Vista3D({ onPlanta }: { onPlanta: () => void }) {
  const b: BuildingModel = useBuilding((s) => s.sessao.modelo);
  const rev = useBuilding((s) => s.rev);
  const dim = useBuilding((s) => s.dim);
  const st = useVista3d();
  const tema = usePlanta((s) => s.tema);
  const selecaoPlanta = usePlanta((s) => s.selecao);
  const ps = useMemo(() => pavimentosOrdenados(b), [b, rev]);
  // os controles são ligados uma vez: leem o modelo e os pavimentos atuais por estas referências
  const bRef = useRef(b); bRef.current = b;
  const psRef = useRef(ps); psRef.current = ps;

  const cont = useRef<HTMLDivElement>(null);
  const rend = useRef<RenderizadorCena | null>(null);
  const camRef = useRef<Camera3D | null>(null);
  const olhoRef = useRef<EstadoCaminhar | null>(null);
  const pavCaminhar = useRef(0);
  const cenaRef = useRef<Cena3D | null>(null);
  const stRef = useRef(st);
  stRef.current = st;
  const [status, setStatus] = useState<Status>('carregando');
  const [T, setT] = useState<Three | null>(null);
  const [angulos, setAngulos] = useState({ az: -55, el: 28 });
  const [dica, setDica] = useState<{ x: number; y: number; texto: string } | null>(null);
  const [aviso, setAviso] = useState('');

  // ---------------------------------------------------------------- cena (função pura do núcleo)
  const opcoes = useMemo(() => opcoesDaVista(b, st), [b, rev, st.escopo, st.grupo, st.de, st.ate, st.pavimento, st.tipos, st.detalhe]);
  const cena = useMemo(
    () => construirCena(b, { ...opcoes, fundacoes: dim?.fundacoes, vigasFundacao: dim?.vigasFundacao }),
    [b, rev, opcoes, dim?.fundacoes, dim?.vigasFundacao],
  );
  cenaRef.current = cena;
  const chaveEscopo = `${st.escopo}|${st.grupo}|${st.de}|${st.ate}|${st.pavimento}`;
  const ultimoEscopo = useRef('');

  // ---------------------------------------------------------------- quadros sob demanda
  const sujo = useRef(false);
  const desenhar = useCallback(() => {
    sujo.current = false;
    const r = rend.current;
    if (!r || !camRef.current) return;
    r.definirCamera(camRef.current, stRef.current.caminhar && olhoRef.current ? olhoRef.current : undefined);
    const ms = r.renderizar();
    if (cont.current) cont.current.dataset.frameMs = ms.toFixed(1);
  }, []);
  const pedir = useCallback(() => {
    if (sujo.current) return;
    sujo.current = true;
    requestAnimationFrame(desenhar);
  }, [desenhar]);

  const ajustarCamera = useCallback((reenquadrar: boolean) => {
    const el = cont.current, c = cenaRef.current;
    if (!el || !c) return;
    const r = el.getBoundingClientRect(), asp = r.width / Math.max(1, r.height), atual = camRef.current;
    if (reenquadrar || !atual) camRef.current = enquadrar(c.limites, asp, { azimute: atual?.azimute, elevacao: atual?.elevacao, projecao: stRef.current.projecao });
  }, []);

  // ---------------------------------------------------------------- carregamento do three e do WebGL
  useEffect(() => {
    let vivo = true;
    if (!temWebGL()) { setStatus('sem-webgl'); return; }
    carregarThree().then((t) => { if (vivo) { setT(t); } }).catch(() => { if (vivo) setStatus('sem-vendor'); });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    const el = cont.current;
    if (!T || !el) return;
    let r: RenderizadorCena;
    try { r = new RenderizadorCena(T, el); } catch { setStatus('sem-webgl'); return; }
    rend.current = r;
    r.canvas.setAttribute('aria-label', 'Vista 3D do edifício');
    const medir = () => { const q = el.getBoundingClientRect(); r.redimensionar(q.width, q.height); pedir(); };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    let ultimo = 0, hover = 0, temporizador = 0;
    const sincronizar = () => {
      const c = camRef.current;
      if (c) setAngulos({ az: Math.round(graus(c.azimute)), el: Math.round(graus(c.elevacao)) });
    };
    const ctl = ligarControles(el, {
      camera: () => camRef.current!,
      definirCamera: (c) => { camRef.current = c; window.clearTimeout(temporizador); temporizador = window.setTimeout(sincronizar, 80); },
      caminhando: () => stRef.current.caminhar && !!olhoRef.current,
      olhar: () => olhoRef.current!,
      definirOlhar: (e) => { olhoRef.current = e; },
      velocidade: () => stRef.current.velocidade,
      limites: () => cenaRef.current!.limites,
      clique: (x, y, duplo) => tratarClique(r.pick(x, y), duplo),
      passar: (p) => {
        if (!p) { setDica(null); r.destacar(null); pedir(); return; }
        const t = performance.now();
        if (t - hover < 60) return;
        hover = t;
        const o = r.pick(p.x, p.y);
        setDica(o ? { x: p.x + 14, y: p.y + 14, texto: o.descricao } : null);
        r.destacar(o?.id ?? null);
        pedir();
      },
      mudarPavimento: (d) => irPavimento(d),
      enquadrar: () => { ajustarCamera(true); pedir(); sincronizar(); },
      mudou: pedir,
    });
    // andar com o teclado: um laço que só gira enquanto o modo caminhar está ligado
    let laco = 0;
    const volta = (t: number) => {
      const dt = Math.min(0.1, (t - ultimo) / 1000);
      ultimo = t;
      if (ctl.passo(dt)) pedir();
      laco = stRef.current.caminhar ? requestAnimationFrame(volta) : 0;
    };
    const ligaLaco = () => { if (!laco && stRef.current.caminhar) { ultimo = performance.now(); laco = requestAnimationFrame(volta); } };
    el.addEventListener('keydown', ligaLaco);
    el.addEventListener('pointerdown', ligaLaco);
    setStatus('pronto');
    return () => {
      ro.disconnect(); ctl.desligar();
      el.removeEventListener('keydown', ligaLaco); el.removeEventListener('pointerdown', ligaLaco);
      cancelAnimationFrame(laco); window.clearTimeout(temporizador);
      r.dispose(); rend.current = null;
    };
  }, [T]);

  // ---------------------------------------------------------------- cena -> renderizador
  useEffect(() => {
    const r = rend.current, el = cont.current;
    if (status !== 'pronto' || !r || !el) return;
    r.definirCena(cena, lerCores(el));
    const mudouEscopo = ultimoEscopo.current !== chaveEscopo;
    ajustarCamera(mudouEscopo || !camRef.current);
    ultimoEscopo.current = chaveEscopo;
    r.selecionar(selecaoPlanta);
    pedir();
  }, [cena, tema, status]);

  useEffect(() => {
    rend.current?.atualizarMateriais({ opacidade: { laje: 1 - st.transpLajes / 100, parede: 1 - st.transpParedes / 100 }, textura: st.textura });
    pedir();
  }, [st.transpLajes, st.transpParedes, st.textura, cena, pedir]);

  useEffect(() => { rend.current?.selecionar(selecaoPlanta); pedir(); }, [selecaoPlanta, pedir]);

  // projeção: o enquadramento (alvo, distância, ângulos) é o mesmo nas duas
  useEffect(() => {
    if (camRef.current) { camRef.current = alternarProjecao(camRef.current, st.projecao); pedir(); }
  }, [st.projecao, pedir]);

  // caminhar: começa no centro da planta, na altura do olho, no pavimento escolhido
  useEffect(() => {
    if (!st.caminhar) { pedir(); return; }
    const pv = stRef.current.escopo === 'pavimento' ? ps.findIndex((p) => p.id === stRef.current.pavimento) : ps.findIndex((p) => p.id === usePlanta.getState().pavimento);
    pavCaminhar.current = Math.max(0, pv);
    olhoRef.current = iniciarCaminhar(cenaRef.current!.limites, ps[pavCaminhar.current]?.cota ?? 0);
    cont.current?.focus({ preventScroll: true });
    pedir();
  }, [st.caminhar]);

  function irPavimento(delta: number) {
    const lista = psRef.current, i = Math.min(lista.length - 1, Math.max(0, pavCaminhar.current + delta));
    pavCaminhar.current = i;
    if (olhoRef.current && lista[i]) olhoRef.current = { ...olhoRef.current, pos: [olhoRef.current.pos[0], olhoRef.current.pos[1], lista[i].cota + ALTURA_OLHO] };
    pedir();
  }

  // ---------------------------------------------------------------- seleção
  function tratarClique(o: Objeto3D | null, duplo: boolean) {
    const P = usePlanta.getState();
    if (!o) { if (!duplo) P.set({ selecao: new Set() }); return; }
    const tipo = TIPO_ALVO[o.tipo];
    if (o.pendente || !tipo) { setAviso(o.pendente ? 'Pano ainda sem laje: escolha o tipo na planta (ferramenta Laje).' : ''); return; }
    setAviso('');
    if (!duplo) irParaElemento(bRef.current, tipo, o.elemento, o.pavimentoNome);
    else abrirJanela({ tipo, id: o.elemento, pavimento: o.pavimentoNome });
  }

  const selecionados = useMemo(() => cena.objetos.filter((o) => selecaoPlanta.has(o.elemento)), [cena, selecaoPlanta]);
  const alvoJanela = selecionados[0] && TIPO_ALVO[selecionados[0].tipo] ? selecionados[0] : null;

  // ---------------------------------------------------------------- saídas
  async function capturar() {
    const r = rend.current;
    const png = r ? await r.capturar() : null;
    if (png) { await download('vista-3d.png', new Uint8Array(await png.arrayBuffer()), 'image/png'); return; }
    await download('vista-3d.svg', isometricoSvg(cena, { azimute: (angulos.az * Math.PI) / 180, elevacao: (angulos.el * Math.PI) / 180 }).svg, 'image/svg+xml');
  }
  const fallback = status === 'sem-vendor' || status === 'sem-webgl';
  const svg = useMemo(() => (fallback ? isometricoSvg(cena, { azimute: (angulos.az * Math.PI) / 180, elevacao: (angulos.el * Math.PI) / 180, destaque: selecaoPlanta }).svg : ''), [fallback, cena, angulos, selecaoPlanta]);
  const aoClicarSvg = (e: React.MouseEvent, duplo: boolean) => {
    const id = (e.target as Element).closest('path')?.getAttribute('data-id');
    tratarClique(cena.objetos.find((o) => o.id === id) ?? null, duplo);
  };

  const contagem = cena.contagens.porTipo;
  const tiposVisiveis = TIPOS_3D.filter((t) => ['pilar', 'viga', 'laje', 'fundacao'].includes(t.v) || (contagem[t.v] ?? 0) > 0 || !st.tipos[t.v]);
  const nomePav = (id: string) => (id === PAV_FUNDACAO ? 'Fundação' : ps.find((p) => p.id === id)?.nome ?? id);
  const grupoSel = b.grupos.find((g) => g.id === st.grupo)?.id ?? b.grupos[0]?.id ?? '';
  const pavSel = (id: string) => (ps.some((p) => p.id === id) || id === PAV_FUNDACAO ? id : ps[0]?.id ?? '');

  return (
    <div className="v3d" data-tema={tema}>
      <div className="v3d-barra">
        <label className="rot">Escopo
          <Dropdown aria-label="Escopo da vista 3D" value={st.escopo} onChange={(e) => st.set({ escopo: e.target.value as typeof st.escopo })}>
            <option value="edificio">Edifício completo</option>
            <option value="grupo">Grupo</option>
            <option value="intervalo">Intervalo de pavimentos</option>
            <option value="pavimento">Um pavimento</option>
          </Dropdown>
        </label>
        {st.escopo === 'grupo' && (
          <Dropdown aria-label="Grupo" value={grupoSel} onChange={(e) => st.set({ grupo: e.target.value })}>
            {b.grupos.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </Dropdown>
        )}
        {st.escopo === 'intervalo' && (
          <>
            <Dropdown aria-label="Pavimento inicial" value={pavSel(st.de)} onChange={(e) => st.set({ de: e.target.value })}>
              <option value={PAV_FUNDACAO}>Fundação</option>
              {ps.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </Dropdown>
            <span className="muted">até</span>
            <Dropdown aria-label="Pavimento final" value={st.ate && ps.some((p) => p.id === st.ate) ? st.ate : ps.at(-1)?.id ?? ''} onChange={(e) => st.set({ ate: e.target.value })}>
              {ps.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </Dropdown>
          </>
        )}
        {st.escopo === 'pavimento' && (
          <Dropdown aria-label="Pavimento" value={pavSel(st.pavimento)} onChange={(e) => st.set({ pavimento: e.target.value })}>
            {[...ps].reverse().map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            <option value={PAV_FUNDACAO}>Fundação</option>
          </Dropdown>
        )}
        <div className="row" role="group" aria-label="Tipos visíveis">
          {tiposVisiveis.map((t) => (
            <Chip key={t.v} on={st.tipos[t.v]} className={`t-${t.v}`} aria-pressed={st.tipos[t.v]} title={`${t.label}: ${contagem[t.v] ?? 0}`} onClick={() => st.set({ tipos: { ...st.tipos, [t.v]: !st.tipos[t.v] } })}>{t.label}</Chip>
          ))}
        </div>
        {!fallback && <Seg small value={st.projecao} options={[{ v: 'perspectiva', label: 'Perspectiva' }, { v: 'isometrica', label: 'Isométrica' }]} onChange={(v) => st.set({ projecao: v })} />}
        {!fallback && <Slider label="Lajes" value={st.transpLajes} min={0} max={100} step={5} unit=" %" onChange={(v) => st.set({ transpLajes: v })} />}
        {!fallback && <Slider label="Paredes" value={st.transpParedes} min={0} max={100} step={5} unit=" %" onChange={(v) => st.set({ transpParedes: v })} />}
        <Slider label="Azimute" value={angulos.az} min={-180} max={180} unit="°" onChange={(v) => { const c = camRef.current; if (c) camRef.current = definirAngulos(c, v, angulos.el); setAngulos({ ...angulos, az: v }); pedir(); }} />
        <Slider label="Elevação" value={angulos.el} min={-89} max={89} unit="°" onChange={(v) => { const c = camRef.current; if (c) camRef.current = definirAngulos(c, angulos.az, v); setAngulos({ ...angulos, el: v }); pedir(); }} />
        {!fallback && <Chip on={st.caminhar} aria-pressed={st.caminhar} title="Andar por dentro da estrutura (W A S D ou setas; arraste para olhar; Q/E sobem ou descem um pavimento)" onClick={() => st.set({ caminhar: !st.caminhar })}>Caminhar</Chip>}
        {!fallback && st.caminhar && <Slider label="Velocidade" value={st.velocidade} min={0.5} max={8} step={0.5} unit=" m/s" onChange={(v) => st.set({ velocidade: v })} />}
        {!fallback && <Check label="Textura" checked={st.textura} onChange={(v) => st.set({ textura: v })} />}
        <Seg small value={st.detalhe} options={[{ v: 'baixo', label: 'Detalhe baixo' }, { v: 'alto', label: 'Detalhe alto', title: 'Vigotas das lajes treliçadas' }]} onChange={(v) => st.set({ detalhe: v })} />
        <Button onClick={() => { ajustarCamera(true); pedir(); setAngulos((a) => ({ ...a })); }}>Enquadrar</Button>
        <Button onClick={() => { void capturar(); }}>{fallback ? 'Baixar SVG' : 'Capturar PNG'}</Button>
      </div>
      <div
        ref={cont}
        className="v3d-cv"
        tabIndex={0}
        role="application"
        aria-label="Vista 3D do edifício"
        data-cena={JSON.stringify(resumoCena(cena))}
        data-projecao={fallback ? 'svg' : st.projecao}
        data-status={status}
        data-caminhar={st.caminhar ? '1' : '0'}
      >
        {fallback && <div className="v3d-iso-box" onClick={(e) => aoClicarSvg(e, false)} onDoubleClick={(e) => aoClicarSvg(e, true)} dangerouslySetInnerHTML={{ __html: svg }} />}
        {fallback && (
          <div className="v3d-aviso" role="status">
            {status === 'sem-webgl' ? 'Este navegador não oferece WebGL.' : 'O three.js não está disponível neste ambiente (public/vendor não foi publicado, como no artifact do claude.ai).'} Vista isométrica estática da mesma geometria; use as barras de azimute e elevação para girar.
          </div>
        )}
        {status === 'carregando' && <div className="v3d-aviso" role="status">Carregando a vista 3D…</div>}
        {dica && <div className="v3d-dica" style={{ left: dica.x, top: dica.y }}>{dica.texto}</div>}
        {cena.avisos.length > 0 && <div className="v3d-aviso" role="alert">{cena.avisos.join(' ')}</div>}
      </div>
      <div className="v3d-st">
        <span>Cena: <b className="num">{cena.contagens.total}</b> objetos — {TIPOS_3D.filter((t) => contagem[t.v]).map((t) => `${t.label.toLowerCase()} ${contagem[t.v]}`).join(', ') || 'vazia'}</span>
        <span>Pavimentos: {Object.keys(cena.contagens.porPavimento).map(nomePav).join(', ') || '—'}</span>
        {selecionados.length > 0 && (
          <span className="v3d-sel-info">
            Selecionado: <b>{selecionados[0].descricao}</b>{selecionados.length > 1 ? ` (+${selecionados.length - 1})` : ''}
            <Button variant="ghost" onClick={onPlanta}>Ver na planta</Button>
            {alvoJanela && <Button variant="ghost" onClick={() => abrirJanela({ tipo: TIPO_ALVO[alvoJanela.tipo]!, id: alvoJanela.elemento, pavimento: alvoJanela.pavimentoNome })}>Abrir janela</Button>}
          </span>
        )}
        {aviso && <span>{aviso}</span>}
        {!dim?.fundacoes?.length && b.fundacao?.elementos.length ? <span className="muted">Calcule as fundações para vê-las na vista 3D.</span> : null}
        <span className="muted">Arraste: girar · Shift ou botão direito: deslocar · roda: aproximar · clique: selecionar · duplo clique: abrir a janela · Home: enquadrar</span>
      </div>
    </div>
  );
}
