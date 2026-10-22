# Cartão V2-5 — aba "3D" nas janelas de armadura da viga, do pilar e da laje

Executor: Haiku. Depende do cartão 1 (`.armadura3d`, cores).

## Comportamento
- Componente `Armadura3D({ tipo, id })` (`src/app/vista3d/Armadura3D.tsx`): concreto do elemento (translúcido) e as barras em 3D, com os mesmos controles de câmera da vista do edifício (`ligarControles`), sem caminhar. A geometria vem de `cenaDoElemento` (viga e laje: o primeiro pavimento do grupo; pilar: todos os lances).
- Sem WebGL ou sem o vendor do three: isométrico estático do concreto e o aviso; as barras ficam nas tabelas do detalhamento.
- `Revisao.tsx`: o seletor de abas da viga e do pilar ganha "3D"; na laje, a aba "3D" aparece quando há detalhamento (`temDetalhe`). Atributos para o e2e: `data-armadura3d` (JSON com `tipo`, `barras`, `segmentos`, `camadas`), `.armadura3d-cv[data-status]`.

## Rótulos
Abas (`Seg`): `3D` (radio, `exact: true`; o rótulo da aba principal "3D" é `tab`, não `radio`). Na aba: Dropdown `Cor das barras por`, Check `Concreto do elemento translúcido`, Check `Barras do elemento como tubos`, Slider `Espessura das barras do elemento` (regex ancorada).

## Diff esperado
```diff
diff --git a/src/app/edificio/Revisao.tsx b/src/app/edificio/Revisao.tsx
index 0e0cbcd..93642ea 100644
--- a/src/app/edificio/Revisao.tsx
+++ b/src/app/edificio/Revisao.tsx
@@ -21,6 +21,7 @@ import { CopiarArmadura, DetalheDaViga } from './Detalhamento';
 import { DetalheDoPilar } from './DetalhamentoPilar';
 import { SegundaOrdemPilar } from './SegundaOrdem';
 import { DetalheDaLaje } from './DetalhamentoLaje';
+import { Armadura3D } from '../vista3d/Armadura3D';
 import { JanelaVigotas } from './Vigotas';
 import { TabelaFlechas } from './FlechasTabela';
 import { JanelaPuncao } from './Puncao';
@@ -230,8 +231,9 @@ export function Origens({ o }: { o?: Origem[] }) {
   );
 }
 
-function AbasDetalhe({ aba, onChange }: { aba: 'resultados' | 'detalhamento'; onChange: (a: 'resultados' | 'detalhamento') => void }) {
-  return <Seg value={aba} onChange={onChange} options={[{ v: 'resultados', label: 'Resultados e armadura' }, { v: 'detalhamento', label: 'Detalhamento' }]} />;
+type AbaDet = 'resultados' | 'detalhamento' | '3d';
+function AbasDetalhe({ aba, onChange }: { aba: AbaDet; onChange: (a: AbaDet) => void }) {
+  return <Seg value={aba} onChange={onChange} options={[{ v: 'resultados', label: 'Resultados e armadura' }, { v: 'detalhamento', label: 'Detalhamento' }, { v: '3d', label: '3D' }]} />;
 }
 
 /** Capacidade resistente (MRd+ e MRd−) da viga pela armadura detalhada, ou null sem detalhamento. */
@@ -243,9 +245,10 @@ function capacidadeDaViga(b: BuildingModel, id: string, dim: DimEdificio): Ponto
 
 function JanelaViga({ id }: { id: string }) {
   const dim = useBuilding((s) => s.dim)!, b = useBuilding((s) => s.sessao.modelo);
-  const [aba, setAba] = useState<'resultados' | 'detalhamento'>('resultados');
+  const [aba, setAba] = useState<AbaDet>('resultados');
   const v = dim.vigas.find((x) => x.viga === id);
   if (!v) return <p className="muted">Viga sem resultado.</p>;
+  if (aba === '3d') return <><AbasDetalhe aba={aba} onChange={setAba} /><Armadura3D tipo="viga" id={id} /></>;
   if (aba === 'detalhamento') return <><AbasDetalhe aba={aba} onChange={setAba} /><DetalheDaViga id={id} /></>;
   const { pontos, determinantes: d } = v.envoltoria;
   const xs = pontos.map((p) => p.s), L = Math.max(v.L, xs.at(-1) ?? 0, 0.01);
@@ -323,9 +326,10 @@ export function ApoioDoPilar({ id }: { id: string }) {
 
 function JanelaPilar({ id, pavimento }: { id: string; pavimento?: string }) {
   const dim = useBuilding((s) => s.dim)!, b = useBuilding((s) => s.sessao.modelo);
-  const [aba, setAba] = useState<'resultados' | 'detalhamento'>('resultados');
+  const [aba, setAba] = useState<AbaDet>('resultados');
   const lances = dim.pilares.filter((x) => x.pilar === id);
   if (!lances.length) return <p className="muted">Pilar sem resultado.</p>;
+  if (aba === '3d') return <><AbasDetalhe aba={aba} onChange={setAba} /><Armadura3D tipo="pilar" id={id} /></>;
   if (aba === 'detalhamento') return <><AbasDetalhe aba={aba} onChange={setAba} /><DetalheDoPilar id={id} /></>;
   return (
     <>
@@ -391,7 +395,7 @@ function JanelaLajeResultados({ ls }: { ls: DimEdificio['lajes'] }) {
 
 function JanelaLaje({ id }: { id: string }) {
   const dim = useBuilding((s) => s.dim)!;
-  const [aba, setAba] = useState<'resultados' | 'detalhamento' | 'vigotas' | 'puncao'>('resultados');
+  const [aba, setAba] = useState<'resultados' | 'detalhamento' | 'vigotas' | 'puncao' | '3d'>('resultados');
   const ls = dim.lajes.filter((x) => x.laje === id);
   if (!ls.length) return <p className="muted">Laje sem resultado.</p>;
   const temDetalhe = !!dim.detalhesLajes?.some((x) => x.laje === id);
@@ -401,12 +405,13 @@ function JanelaLaje({ id }: { id: string }) {
     { v: 'resultados' as const, label: temVigotas ? 'Resultados' : 'Resultados e armadura' },
     ...(temVigotas ? [{ v: 'vigotas' as const, label: 'Vigotas' }] : temDetalhe ? [{ v: 'detalhamento' as const, label: 'Detalhamento' }] : []),
     ...(temPuncao ? [{ v: 'puncao' as const, label: 'Punção e cortante' }] : []),
+    ...(temDetalhe ? [{ v: '3d' as const, label: '3D' }] : []),
   ];
   const atual = abas.some((x) => x.v === aba) ? aba : 'resultados';
   return (
     <>
       {abas.length > 1 && <Seg value={atual} onChange={setAba} options={abas} />}
-      {atual === 'vigotas' ? <JanelaVigotas id={id} /> : atual === 'detalhamento' ? <DetalheDaLaje id={id} /> : atual === 'puncao' ? <JanelaPuncao id={id} /> : <JanelaLajeResultados ls={ls} />}
+      {atual === '3d' ? <Armadura3D tipo="laje" id={id} /> : atual === 'vigotas' ? <JanelaVigotas id={id} /> : atual === 'detalhamento' ? <DetalheDaLaje id={id} /> : atual === 'puncao' ? <JanelaPuncao id={id} /> : <JanelaLajeResultados ls={ls} />}
     </>
   );
 }
diff --git a/src/app/vista3d/Armadura3D.tsx b/src/app/vista3d/Armadura3D.tsx
new file mode 100644
index 0000000..bf46dbc
--- /dev/null
+++ b/src/app/vista3d/Armadura3D.tsx
@@ -0,0 +1,126 @@
+// Aba "3D" das janelas de armadura da viga, do pilar e da laje (V2): o concreto do elemento (translúcido) e as barras
+// em 3D, com os mesmos controles de câmera da vista do edifício. Sem WebGL ou sem o vendor do three, mostra a lista
+// das barras e o isométrico estático do concreto.
+import { useEffect, useMemo, useRef, useState } from 'react';
+import { useBuilding } from '../edificio/store';
+import { usePlanta } from '../edificio/plantaStore';
+import { cenaDoElemento, camadasDeArmadura, type AgruparPor, type OrigemArmadura } from '../../core/vista3d/armaduras3d';
+import { enquadrar, type Camera3D } from '../../core/vista3d/camera';
+import { isometricoSvg } from '../../core/vista3d/isometrico';
+import { TIPOS_3D, type TipoElemento3D } from '../../core/vista3d/registro';
+import { cssVar } from '../design/tokens';
+import { Check, Dropdown, Slider } from '../ui';
+import { carregarThree, temWebGL, type Three } from './carregarThree';
+import { ligarControles } from './controles';
+import { RenderizadorCena, type CoresCena } from './renderizador';
+
+const CHAVES_COR = ['fundo', 'linha', 'selecao', 'destaque', 'pendente'] as const;
+function lerCores(el: HTMLElement): CoresCena {
+  const v = (n: string) => cssVar(`v3d-${n}`, el);
+  const base = Object.fromEntries(CHAVES_COR.map((k) => [k, v(k)])) as Record<(typeof CHAVES_COR)[number], string>;
+  return { ...base, tipos: Object.fromEntries(TIPOS_3D.map((t) => [t.v, v(t.v)])) as Record<TipoElemento3D, string> };
+}
+
+export function Armadura3D({ tipo, id }: { tipo: OrigemArmadura; id: string }) {
+  const b = useBuilding((s) => s.sessao.modelo);
+  const rev = useBuilding((s) => s.rev);
+  const dim = useBuilding((s) => s.dim);
+  const tema = usePlanta((s) => s.tema);
+  const [por, setPor] = useState<AgruparPor>('bitola');
+  const [tubos, setTubos] = useState(false);
+  const [ghost, setGhost] = useState(true);
+  const [esc, setEsc] = useState(4);
+  const [status, setStatus] = useState<'carregando' | 'pronto' | 'sem-3d'>('carregando');
+  const [T, setT] = useState<Three | null>(null);
+  const cont = useRef<HTMLDivElement>(null);
+  const rend = useRef<RenderizadorCena | null>(null);
+  const camRef = useRef<Camera3D | null>(null);
+  const sujo = useRef(false);
+
+  const r = useMemo(() => (dim ? cenaDoElemento(b, dim, tipo, id) : null), [b, rev, dim, tipo, id]);
+  const camadas = useMemo(() => (r ? camadasDeArmadura(r.armaduras, por) : []), [r, por]);
+  const limitesRef = useRef(r?.cena.limites);
+  limitesRef.current = r?.cena.limites;
+
+  const desenhar = () => {
+    sujo.current = false;
+    const rd = rend.current;
+    if (!rd || !camRef.current) return;
+    rd.definirCamera(camRef.current);
+    const ms = rd.renderizar();
+    if (cont.current) cont.current.dataset.frameMs = ms.toFixed(1);
+  };
+  const pedir = () => { if (!sujo.current) { sujo.current = true; requestAnimationFrame(desenhar); } };
+  const reenquadrar = () => {
+    const el = cont.current, l = limitesRef.current;
+    if (!el || !l) return;
+    const q = el.getBoundingClientRect();
+    camRef.current = enquadrar(l, q.width / Math.max(1, q.height), { projecao: 'perspectiva' });
+  };
+
+  useEffect(() => {
+    let vivo = true;
+    if (!temWebGL()) { setStatus('sem-3d'); return; }
+    carregarThree().then((t) => { if (vivo) setT(t); }).catch(() => { if (vivo) setStatus('sem-3d'); });
+    return () => { vivo = false; };
+  }, []);
+
+  useEffect(() => {
+    const el = cont.current;
+    if (!T || !el) return;
+    let rd: RenderizadorCena;
+    try { rd = new RenderizadorCena(T, el); } catch { setStatus('sem-3d'); return; }
+    rend.current = rd;
+    rd.canvas.setAttribute('aria-label', 'Armadura em 3D');
+    const medir = () => { const q = el.getBoundingClientRect(); rd.redimensionar(q.width, q.height); pedir(); };
+    medir();
+    const ro = new ResizeObserver(medir);
+    ro.observe(el);
+    const ctl = ligarControles(el, {
+      camera: () => camRef.current!, definirCamera: (c) => { camRef.current = c; },
+      caminhando: () => false, olhar: () => { throw new Error('sem caminhar'); }, definirOlhar: () => undefined, velocidade: () => 0,
+      limites: () => limitesRef.current!, clique: () => undefined, passar: () => undefined, mudarPavimento: () => undefined,
+      enquadrar: () => { reenquadrar(); pedir(); }, mudou: pedir,
+    });
+    setStatus('pronto');
+    return () => { ro.disconnect(); ctl.desligar(); rd.dispose(); rend.current = null; };
+  }, [T]);
+
+  // cena, armaduras e translucidez
+  useEffect(() => {
+    const rd = rend.current, el = cont.current;
+    if (status !== 'pronto' || !rd || !el || !r) return;
+    rd.definirCena(r.cena, lerCores(el));
+    const op = ghost ? 0.18 : 1;
+    rd.atualizarMateriais({ opacidade: { pilar: op, viga: op, laje: op }, textura: false });
+    rd.definirArmaduras(camadas, Array.from({ length: 8 }, (_, i) => cssVar(`v3d-arm-${i + 1}`, el)), tubos ? 'tubos' : 'linhas', 0.0025 * esc);
+    if (!camRef.current) reenquadrar();
+    pedir();
+  }, [r, camadas, ghost, tubos, esc, tema, status]);
+
+  if (!dim) return <p className="muted">Calcule o dimensionamento para ver a armadura em 3D.</p>;
+  if (!r || !r.armaduras.barras.length) return <p className="muted">Sem armadura detalhada para este elemento.</p>;
+  const resumo = { barras: r.armaduras.barras.length, segmentos: r.armaduras.segmentos, camadas: camadas.length };
+  return (
+    <div className="v3d armadura3d" data-tema={tema} data-armadura3d={JSON.stringify({ tipo, ...resumo })}>
+      <div className="row wrap">
+        <Dropdown aria-label="Cor das barras por" value={por} onChange={(e) => setPor(e.target.value as AgruparPor)}>
+          <option value="bitola">Cor por bitola</option>
+          <option value="tipo">Cor por tipo de barra</option>
+          <option value="posicao">Cor por posição</option>
+        </Dropdown>
+        <Check label="Concreto do elemento translúcido" checked={ghost} onChange={setGhost} />
+        {status === 'pronto' && <Check label="Barras do elemento como tubos" checked={tubos} onChange={setTubos} />}
+        {status === 'pronto' && tubos && <Slider label="Espessura das barras do elemento" value={esc} min={1} max={20} unit="×" onChange={setEsc} />}
+      </div>
+      <div ref={cont} className="v3d-cv armadura3d-cv" tabIndex={0} role="application" aria-label="Vista 3D da armadura do elemento" data-status={status}>
+        {status === 'sem-3d' && (
+          <div className="v3d-iso-box" dangerouslySetInnerHTML={{ __html: isometricoSvg(r.cena, {}).svg }} />
+        )}
+        {status === 'sem-3d' && <div className="v3d-aviso" role="status">Sem WebGL ou sem o three.js neste ambiente: isométrico do concreto; as barras estão nas tabelas do detalhamento.</div>}
+        {status === 'carregando' && <div className="v3d-aviso" role="status">Carregando a vista 3D…</div>}
+      </div>
+      <p className="muted">{resumo.barras} barras, {resumo.segmentos} segmentos em {resumo.camadas} camada(s){r.armaduras.truncado ? ' (limite de segmentos atingido)' : ''}. Arraste: girar · Shift: deslocar · roda: aproximar · Home: enquadrar.</p>
+    </div>
+  );
+}
```

## Verificação
```bash
npx tsc -b
npx vitest run src/app/design/design.test.ts src/core/vista3d
```
