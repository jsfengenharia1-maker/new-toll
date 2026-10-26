// Comparação de deformadas (V6b, C12.22): 2 a 4 janelas lado a lado, cada uma com a sua hipótese (caso ou combinação) e
// escala, câmera sincronizada opcional. Um renderizador por janela (hook da V6c), com contagem de contextos WebGL: o que
// passa do limite não é desenhado e o aviso aparece; fechar a janela libera os contextos. A lógica (hipóteses iniciais,
// escalas, limite) está em src/core/vista3d/comparar.ts.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnaliseEdificio } from '../../core/building/analitico';
import type { Hipotese } from '../../core/resultados/deformada';
import { deformarCena, type CenaDeformada } from '../../core/resultados/deformadaCena';
import type { Camera3D } from '../../core/vista3d/camera';
import type { Cena3D } from '../../core/vista3d/registro';
import {
  LIMITE_CONTEXTOS_WEBGL, MAX_JANELAS, MIN_JANELAS, avisoContextos, escalasDasJanelas, grade, hipotesesIniciais, razoesEmRelacao, referenciaDaRampa,
  type ModoEscalaComparar,
} from '../../core/vista3d/comparar';
import { cssVar } from '../design/tokens';
import { Check, Dropdown, Modal, Slider } from '../ui';
import { lerCores, useCena3DIsolada, type Status3D } from './useCena3DIsolada';

interface Ponte { aplicar(c: Camera3D): void; atual(): Camera3D | null }

interface PropsJanela {
  idx: number;
  cena: Cena3D;
  cd: CenaDeformada | null;
  hipoteses: Hipotese[];
  hipotese: string;
  escala: number;
  referencia: number;
  tema: string;
  manual: boolean;
  aoHipotese(id: string): void;
  aoEscala(v: number): void;
  ponte: { registrar(i: number, p: Ponte | null): void; emitir(i: number, c: Camera3D): void };
  aoStatus(i: number, s: Status3D): void;
}

function JanelaDeformada(p: PropsJanela) {
  const { idx, cena, cd, escala, referencia, tema } = p;
  const { cont, rend, camRef, status, pedir, reenquadrar } = useCena3DIsolada(cena.limites, `Deformada ${idx + 1}`, { aoCamera: (c) => p.ponte.emitir(idx, c) });
  const escalaRef = useRef(escala);
  escalaRef.current = escala;

  useEffect(() => { p.aoStatus(idx, status); }, [status]);
  useEffect(() => {
    p.ponte.registrar(idx, { aplicar: (c) => { camRef.current = c; pedir(); }, atual: () => camRef.current });
    return () => p.ponte.registrar(idx, null);
  }, [idx]);
  useEffect(() => {
    const rd = rend.current, el = cont.current;
    if (status !== 'pronto' || !rd || !el) return;
    rd.definirCena(cena, lerCores(el));
    rd.definirDeformada(cd, null, [1, 2, 3, 4, 5].map((i) => cssVar(`v3d-def-${i}`, el)), 'completa', referencia);
    rd.atualizarDeformada(escalaRef.current, 1, true);
    if (!camRef.current) reenquadrar();
    pedir();
  }, [cena, cd, referencia, tema, status]);
  useEffect(() => {
    if (status !== 'pronto') return;
    rend.current?.atualizarDeformada(escala, 1, true);
    pedir();
  }, [escala, status]);

  const dmaxMm = cd ? cd.dmax * 1000 : 0;
  return (
    <div className="v3d-comp-jan" data-janela={idx + 1}>
      <div className="v3d-comp-cab">
        <Dropdown aria-label={`Hipótese da janela ${idx + 1}`} value={p.hipotese} onChange={(e) => p.aoHipotese(e.target.value)}>
          {p.hipoteses.map((h) => <option key={h.id} value={h.id}>{h.nome}</option>)}
        </Dropdown>
        <span className="muted">|Δ|máx <b className="num">{dmaxMm.toFixed(2).replace('.', ',')}</b> mm · escala ×<span className="num">{escala.toFixed(0)}</span></span>
      </div>
      {p.manual && <Slider label={`Escala da janela ${idx + 1}`} value={Math.min(1000, Math.max(1, Math.round(escala)))} min={1} max={1000} unit="×" onChange={p.aoEscala} />}
      <div ref={cont} className="v3d-comp-cv" tabIndex={0} role="application" aria-label={`Vista 3D da deformada ${idx + 1}`} data-status={status}>
        {status === 'carregando' && <div className="v3d-aviso" role="status">Carregando a vista 3D…</div>}
        {status === 'sem-3d' && <div className="v3d-aviso" role="status">Sem contexto WebGL livre para esta janela.</div>}
      </div>
    </div>
  );
}

export function CompararDeformadas({ cena, analise, hipoteses, atual, tema, onClose }: {
  cena: Cena3D; analise: AnaliseEdificio; hipoteses: Hipotese[]; atual: string; tema: string; onClose(): void;
}) {
  const ids = useMemo(() => hipoteses.map((h) => h.id), [hipoteses]);
  const [n, setN] = useState(2);
  const [hips, setHips] = useState<string[]>(() => hipotesesIniciais(ids, MAX_JANELAS, atual));
  const [modo, setModo] = useState<ModoEscalaComparar>('comum');
  const [manuais, setManuais] = useState<number[]>(() => Array(MAX_JANELAS).fill(50));
  const [sincronizar, setSincronizar] = useState(true);
  const [status, setStatus] = useState<Record<number, Status3D>>({});

  // deformadas por hipótese, calculadas sob demanda e guardadas enquanto a cena e a análise não mudam
  const cache = useMemo(() => new Map<string, CenaDeformada>(), [cena, analise]);
  const cdDe = (id: string): CenaDeformada | null => {
    const h = hipoteses.find((x) => x.id === id);
    if (!h) return null;
    let c = cache.get(id);
    if (!c) { c = deformarCena(cena, analise, h); cache.set(id, c); }
    return c;
  };
  const visiveis = hips.slice(0, n);
  const cds = visiveis.map(cdDe);
  const dmax = cds.map((c) => c?.dmax ?? 0);
  const altura = Math.max(1e-6, cena.limites.max[2] - cena.limites.min[2]);
  const escalas = escalasDasJanelas(dmax, altura, modo, manuais.slice(0, n));
  const refs = referenciaDaRampa(dmax, modo);
  const g = grade(n);

  // câmera sincronizada: a janela que muda a câmera repassa às demais
  const janelas = useRef(new Map<number, Ponte>());
  const sincRef = useRef(sincronizar);
  sincRef.current = sincronizar;
  const ponte = useMemo(() => ({
    registrar: (i: number, p: Ponte | null) => { if (p) janelas.current.set(i, p); else janelas.current.delete(i); },
    emitir: (i: number, c: Camera3D) => { if (sincRef.current) for (const [k, p] of janelas.current) if (k !== i) p.aplicar(c); },
  }), []);
  useEffect(() => {
    if (!sincronizar) return;
    const c = janelas.current.get(0)?.atual();
    if (c) ponte.emitir(0, c);
  }, [sincronizar]);

  const mudarN = (k: number) => { setN(k); setHips((h) => hipotesesIniciais(ids, MAX_JANELAS, atual, h)); };
  const semContexto = visiveis.filter((_, i) => status[i] === 'sem-3d').length;
  const aviso = avisoContextos(n, n - semContexto, LIMITE_CONTEXTOS_WEBGL);
  const razoes = razoesEmRelacao(dmax);

  const resumo = {
    n, modo, sincronizar,
    janelas: visiveis.map((h, i) => ({ hipotese: hipoteses.find((x) => x.id === h)?.nome ?? '', dmaxMm: +(dmax[i] * 1000).toFixed(3), escala: +escalas[i].toFixed(2), razao: +razoes[i].toFixed(3), status: status[i] ?? 'carregando' })),
  };
  return (
    <Modal titulo="Comparar deformadas" onClose={onClose} larga>
      <div className="v3d v3d-comp" data-tema={tema} data-comparar={JSON.stringify(resumo)}>
        <div className="row wrap">
          <Dropdown aria-label="Número de janelas" value={n} onChange={(e) => mudarN(+e.target.value)}>
            {Array.from({ length: MAX_JANELAS - MIN_JANELAS + 1 }, (_, i) => MIN_JANELAS + i).map((k) => <option key={k} value={k}>{k} janelas</option>)}
          </Dropdown>
          <Dropdown aria-label="Escala das deformadas" value={modo} onChange={(e) => setModo(e.target.value as ModoEscalaComparar)}>
            <option value="comum">Escala comum (o maior deslocamento = 5 % da altura)</option>
            <option value="propria">Escala automática de cada janela</option>
            <option value="manual">Escala manual por janela</option>
          </Dropdown>
          <Check label="Sincronizar a câmera" checked={sincronizar} onChange={setSincronizar} />
        </div>
        {aviso && <p className="muted" role="alert">{aviso}</p>}
        <div className="v3d-comp-grade" data-colunas={g.colunas}>
          {visiveis.map((h, i) => (
            <JanelaDeformada
              key={i} idx={i} cena={cena} cd={cds[i]} hipoteses={hipoteses} hipotese={h} escala={escalas[i]} referencia={refs[i]} tema={tema}
              manual={modo === 'manual'}
              aoHipotese={(id) => setHips((a) => a.map((x, k) => (k === i ? id : x)))}
              aoEscala={(v) => setManuais((a) => a.map((x, k) => (k === i ? v : x)))}
              ponte={ponte}
              aoStatus={(k, s) => setStatus((a) => (a[k] === s ? a : { ...a, [k]: s }))}
            />
          ))}
        </div>
        <div className="v3d-def-leg">
          <span>Deslocamento resultante |Δ|:</span>
          <span className="num">0</span>
          <div className="v3d-def-rampa" role="img" aria-label="Legenda da comparação" />
          <span className="num">{(Math.max(0, ...refs) * 1000).toFixed(2).replace('.', ',')} mm</span>
          <span className="muted">{modo === 'comum' ? 'mesma rampa e mesma escala em todas as janelas' : 'rampa de cada janela até o seu máximo'}</span>
        </div>
        <p className="muted">Arraste: girar · Shift: deslocar · roda: aproximar · Home: enquadrar. Limite de {LIMITE_CONTEXTOS_WEBGL} contextos WebGL (a confirmar).</p>
      </div>
    </Modal>
  );
}
