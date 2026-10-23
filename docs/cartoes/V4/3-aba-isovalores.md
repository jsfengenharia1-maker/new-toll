# Cartão V4-3 — aba "Isovalores"

Executor: Haiku. Depois dos cartões 1 e 2; `src/app/edificio/AbaIsovalores.tsx` (novo) e `Edificio.tsx`.

## Comportamento
- Nova aba "Isovalores" ao lado de "Deslocamentos". Sem cálculo atual: "Calcule a estrutura (aba Dimensionamento) para ver os mapas de isovalores."
- Botão "Nova janela de isovalores". Cada janela (`data-isov-janela="<n>"`, com `data-iso` em JSON: grandeza, unidade, bandas, níveis, isolinhas, min, max e posições) traz: Select "Grandeza (janela n)", Select "Hipótese (janela n)" (só para grandezas por hipótese), Select "Pavimento (janela n)" ou "Radier (janela n)", OptNumField "Limite mínimo (janela n)" e "Limite máximo (janela n)", NumField "Número de níveis (janela n)", TextField "Níveis definidos (janela n)" (separados por ponto e vírgula; vazio = automáticos 1-2-5), Check "Isolinhas (janela n)" e "Valores (janela n)", botão "Fechar janela n".
- O mapa é um SVG (`svg.isov-mapa`) com bandas (`polygon.iso-banda`), isolinhas (`polyline.iso-linha`), contorno, valores (`text.iso-valor`) e os marcadores de máximo e mínimo; legenda de cores (`.iso-leg`) e texto com o mínimo, o máximo, as posições e o número de bandas. Os limites restringem a faixa exibida (a ordem das cores se mantém).
- Clique no mapa converte o ponto em metros (`enquadramento`, `getScreenCTM`) e abre a janela da laje (`abrirJanela`, C12.15).
- Saídas: "Baixar SVG (janela n)", "Baixar PNG (janela n)" (SVG desenhado num canvas com a cor computada dos tokens), "Baixar DXF das isolinhas (janela n)" e "Baixar CSV x, y, valor (janela n)".
- As janelas ficam no `isovaloresStore` (várias ao mesmo tempo, independentes, mantidas até fechar o programa).

## Rótulos
`Isovalores` (aba), `Nova janela de isovalores`, `Grandeza (janela n)`, `Hipótese (janela n)`, `Pavimento (janela n)`, `Radier (janela n)`, `Limite mínimo (janela n)`, `Limite máximo (janela n)`, `Número de níveis (janela n)`, `Níveis definidos (janela n)`, `Isolinhas (janela n)`, `Valores (janela n)`, `Fechar janela n`, `Mapa de isovalores (janela n)` (SVG, `role="img"`), `Legenda do mapa (janela n)`, `Baixar SVG (janela n)`, `Baixar PNG (janela n)`, `Baixar DXF das isolinhas (janela n)`, `Baixar CSV x, y, valor (janela n)`.

## Diff esperado
```diff
diff --git a/src/app/edificio/AbaIsovalores.tsx b/src/app/edificio/AbaIsovalores.tsx
new file mode 100644
index 0000000..d81ad42
--- /dev/null
+++ b/src/app/edificio/AbaIsovalores.tsx
@@ -0,0 +1,162 @@
+// Aba "Isovalores" (V4): mapas de deslocamentos, esforços e áreas de aço das lajes (e tensões do radier) em bandas de
+// cor e isolinhas, com várias janelas lado a lado, limites mínimo e máximo, clique abrindo a janela da laje e saídas
+// SVG, PNG, DXF e CSV. A matemática vem de src/core/resultados (funções puras).
+import { useMemo, type MouseEvent } from 'react';
+import { calculoAtual, useBuilding } from './store';
+import { abrirJanela } from './Revisao';
+import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';
+import {
+  bandas, csvCampo, dxfIsolinhas, encadear, enquadramento, extremos, faixaExibida, fmtIso, isolinhas, legenda, niveisAutomaticos,
+  niveisDefinidos, nosParaRotulo, svgIsovalores, type Campo, type Limites,
+} from '../../core/resultados/bandas';
+import {
+  campoDoPavimento, campoDoRadier, elementoNoPonto, GRANDEZAS_ISO, hipotesesDeLaje, infoGrandeza, pavimentosComMapa,
+} from '../../core/resultados/isovalores';
+import { Button, Check, download, Group, Hint, NumField, OptNumField, Select, TextField } from '../ui';
+import { useIso, type JanelaIso } from './isovaloresStore';
+
+const LARGURA = 640;
+
+/** Cor computada de cada token `--iso-n` (para os arquivos exportados, que não têm folha de estilo). */
+function coresDosTokens(): (t: number) => string {
+  const cs = getComputedStyle(document.documentElement);
+  return (t) => cs.getPropertyValue(`--iso-${t}`).trim() || 'currentColor';
+}
+
+function niveisDa(j: JanelaIso, campo: Campo, lim: Limites): number[] {
+  const manual = j.niveisTexto.trim();
+  if (manual) return niveisDefinidos(manual.split(/[;\s]+/).map((t) => parseFloat(t.replace(',', '.'))));
+  const f = faixaExibida(campo, lim);
+  return niveisAutomaticos(f.lo, f.hi, j.nNiveis);
+}
+
+export function AbaIsovalores({ b }: { b: BuildingModel }) {
+  const an = useBuilding((s) => (calculoAtual(s) && !s.analise?.erro ? s.analise : null));
+  const janelas = useIso((s) => s.janelas);
+  const nova = useIso((s) => s.nova);
+  if (!an) return <div className="card"><h3>Isovalores</h3><p className="hint">Calcule a estrutura (aba Dimensionamento) para ver os mapas de isovalores.</p></div>;
+  return (
+    <div className="isov-aba">
+      <div className="row">
+        <Button variant="primary" onClick={() => nova()}>Nova janela de isovalores</Button>
+        <Hint>As janelas ficam lado a lado e mantêm a configuração até fechar o programa. Clique num ponto do mapa para abrir a janela da laje.</Hint>
+      </div>
+      <div className="isov-janelas" data-isov-janelas={janelas.length}>
+        {janelas.map((j) => <JanelaIsovalores key={j.id} j={j} b={b} />)}
+      </div>
+    </div>
+  );
+}
+
+function JanelaIsovalores({ j, b }: { j: JanelaIso; b: BuildingModel }) {
+  const an = useBuilding((s) => (calculoAtual(s) && !s.analise?.erro ? s.analise : null))!;
+  const dim = useBuilding((s) => s.dim);
+  const mudar = useIso((s) => s.mudar), fechar = useIso((s) => s.fechar);
+  const n = j.id, info = infoGrandeza(j.grandeza), doRadier = info.grupo === 'radier';
+  const pavs = useMemo(() => pavimentosComMapa(b, an), [b, an]);
+  const radiers = dim?.radiers ?? [];
+  const hips = useMemo(() => hipotesesDeLaje(b, an), [b, an]);
+  const alvo = doRadier ? (radiers.find((r) => r.id === j.alvo)?.id ?? radiers[0]?.id ?? '') : (pavs.find((p) => p.id === j.alvo)?.id ?? pavs[0]?.id ?? '');
+  const hip = hips.find((h) => h.id === j.hipotese) ?? hips[0];
+  const lim: Limites = { ...(j.min !== undefined ? { min: j.min } : {}), ...(j.max !== undefined ? { max: j.max } : {}) };
+
+  const res = useMemo(() => {
+    if (!alvo) return { campo: null as Campo | null, avisos: [doRadier ? 'Nenhum radier calculado.' : 'Sem pavimento com laje calculada.'] };
+    return doRadier
+      ? campoDoRadier(b, dim, alvo, j.grandeza as 'rSigmaMax' | 'rSigmaMin' | 'rW')
+      : campoDoPavimento(b, an, dim, { pavimento: alvo, grandeza: j.grandeza, hipotese: info.porHipotese ? hip : undefined });
+  }, [b, an, dim, alvo, j.grandeza, hip, doRadier, info.porHipotese]);
+  const campo = res.campo;
+  const niveis = useMemo(() => (campo ? niveisDa(j, campo, lim) : []), [campo, j.niveisTexto, j.nNiveis, j.min, j.max]); // eslint-disable-line react-hooks/exhaustive-deps
+  const E = useMemo(() => (campo ? enquadramento(campo, LARGURA) : null), [campo]);
+  const bs = useMemo(() => (campo ? bandas(campo, niveis, lim) : []), [campo, niveis, j.min, j.max]); // eslint-disable-line react-hooks/exhaustive-deps
+  const linhas = useMemo(() => (campo && j.isolinhas ? isolinhas(campo, niveis, lim).flatMap((il) => encadear(il.segmentos)) : []), [campo, niveis, j.isolinhas, j.min, j.max]); // eslint-disable-line react-hooks/exhaustive-deps
+  const leg = useMemo(() => (campo ? legenda(campo, niveis, lim) : null), [campo, niveis, j.min, j.max]); // eslint-disable-line react-hooks/exhaustive-deps
+  const ex = campo ? extremos(campo, lim) : null;
+
+  function clicar(e: MouseEvent<SVGSVGElement>) {
+    if (!campo || !E || doRadier) return;
+    const svg = e.currentTarget, pt = svg.createSVGPoint();
+    pt.x = e.clientX; pt.y = e.clientY;
+    const q = pt.matrixTransform(svg.getScreenCTM()!.inverse());
+    const id = elementoNoPonto(campo, E.xm(q.x), E.ym(q.y));
+    const pav = pavimentosOrdenados(b).find((p) => p.id === alvo);
+    if (id && pav) abrirJanela({ tipo: 'laje', id, pavimento: pav.nome });
+  }
+
+  const nome = `mapa-isovalores-${n}-${j.grandeza}`;
+  const svgTexto = (largura = LARGURA) => svgIsovalores(campo!, { niveis, limites: lim, cor: coresDosTokens(), comIsolinhas: j.isolinhas, comValores: j.valores, largura });
+  async function baixarPng() {
+    if (!campo) return;
+    const url = URL.createObjectURL(new Blob([svgTexto(1280)], { type: 'image/svg+xml' }));
+    const img = new Image();
+    await new Promise<void>((ok, erro) => { img.onload = () => ok(); img.onerror = () => erro(new Error('imagem')); img.src = url; });
+    const cv = document.createElement('canvas');
+    cv.width = 1280; cv.height = Math.round((1280 * (img.naturalHeight || 1)) / (img.naturalWidth || 1));
+    const g = cv.getContext('2d');
+    if (g) { g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--v3d-claro-fundo').trim() || 'transparent'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height); }
+    URL.revokeObjectURL(url);
+    const blob: Blob | null = await new Promise((ok) => cv.toBlob(ok, 'image/png'));
+    if (blob) await download(`${nome}.png`, new Uint8Array(await blob.arrayBuffer()), 'image/png');
+  }
+
+  const dados = campo && leg ? JSON.stringify({
+    grandeza: j.grandeza, unidade: campo.unidade, bandas: bs.length, niveis: niveis.length, isolinhas: linhas.length,
+    min: ex?.min ? +ex.min.valor.toFixed(4) : null, max: ex?.max ? +ex.max.valor.toFixed(4) : null,
+    minPos: ex?.min ? ex.min.pos.map((v) => +v.toFixed(3)) : null, maxPos: ex?.max ? ex.max.pos.map((v) => +v.toFixed(3)) : null,
+  }) : undefined;
+
+  return (
+    <Group title={`Janela ${n}`} aside={<Button variant="mini" onClick={() => fechar(n)}>{`Fechar janela ${n}`}</Button>}>
+      <div className="isov-janela" data-isov-janela={n} data-iso={dados}>
+        <div className="row isov-barra">
+          <Select label={`Grandeza (janela ${n})`} value={j.grandeza} options={GRANDEZAS_ISO.map((g) => ({ v: g.id, label: `${g.rotulo} [${g.unidade}]` }))} onChange={(v) => mudar(n, { grandeza: v })} />
+          {info.porHipotese && <Select label={`Hipótese (janela ${n})`} value={hip?.id ?? ''} options={hips.map((h) => ({ v: h.id, label: h.tipo === 'caso' ? `Caso ${h.nome}` : h.nome }))} onChange={(v) => mudar(n, { hipotese: v })} />}
+          {doRadier
+            ? <Select label={`Radier (janela ${n})`} value={alvo} options={radiers.map((r) => ({ v: r.id, label: r.nome }))} onChange={(v) => mudar(n, { alvo: v })} />
+            : <Select label={`Pavimento (janela ${n})`} value={alvo} options={pavs.map((p) => ({ v: p.id, label: p.nome }))} onChange={(v) => mudar(n, { alvo: v })} />}
+        </div>
+        <div className="row isov-barra">
+          <OptNumField label={`Limite mínimo (janela ${n})`} unit={info.unidade} value={j.min} onChange={(v) => mudar(n, { min: v })} />
+          <OptNumField label={`Limite máximo (janela ${n})`} unit={info.unidade} value={j.max} onChange={(v) => mudar(n, { max: v })} />
+          <NumField label={`Número de níveis (janela ${n})`} value={j.nNiveis} onChange={(v) => mudar(n, { nNiveis: Math.max(2, Math.min(40, Math.round(v))) })} />
+          <TextField label={`Níveis definidos (janela ${n})`} value={j.niveisTexto} placeholder="vazio = automáticos (1-2-5)" onChange={(v) => mudar(n, { niveisTexto: v })} />
+        </div>
+        <div className="row isov-barra">
+          <Check label={`Isolinhas (janela ${n})`} checked={j.isolinhas} onChange={(v) => mudar(n, { isolinhas: v })} />
+          <Check label={`Valores (janela ${n})`} checked={j.valores} onChange={(v) => mudar(n, { valores: v })} />
+        </div>
+        {res.avisos.map((a) => <p key={a} className="hint">{a}</p>)}
+        {campo && E && leg && (
+          <>
+            <svg className="iso-svg isov-mapa" role="img" aria-label={`Mapa de isovalores (janela ${n})`} viewBox={`0 0 ${E.W} ${E.H.toFixed(1)}`} onClick={clicar}>
+              {bs.flatMap((bd) => bd.poligonos.map((p, i) => (
+                <polygon key={`${bd.indice}-${i}`} className={`iso-banda iso-${bd.token}`} points={p.map((q) => `${E.X(q[0]).toFixed(1)},${E.Y(q[1]).toFixed(1)}`).join(' ')} />
+              )))}
+              {linhas.map((l, i) => <polyline key={i} className="iso-linha" points={l.map((q) => `${E.X(q[0]).toFixed(1)},${E.Y(q[1]).toFixed(1)}`).join(' ')} />)}
+              {(campo.contornos ?? []).map((c, i) => <polygon key={`c${i}`} className="iso-contorno" points={c.map((q) => `${E.X(q[0]).toFixed(1)},${E.Y(q[1]).toFixed(1)}`).join(' ')} />)}
+              {j.valores && nosParaRotulo(campo, Math.max(0.5, (E.x1 - E.x0) / 10), 40).map((i) => (
+                <text key={i} className="iso-valor" x={E.X(campo.nos[i][0])} y={E.Y(campo.nos[i][1])} textAnchor="middle">{fmtIso(campo.valores[i], 2)}</text>
+              ))}
+              {ex?.max && <circle className="iso-ext iso-ext-max" cx={E.X(ex.max.pos[0])} cy={E.Y(ex.max.pos[1])} r={4} />}
+              {ex?.min && <circle className="iso-ext iso-ext-min" cx={E.X(ex.min.pos[0])} cy={E.Y(ex.min.pos[1])} r={4} />}
+            </svg>
+            <div className="iso-leg" role="img" aria-label={`Legenda do mapa (janela ${n})`}>
+              {leg.itens.map((it, k) => <span key={k} className={`iso-cel iso-${it.token}`} title={`${it.rotulo} ${campo.unidade}`} />)}
+            </div>
+            <p className="hint small" data-iso-extremos>
+              {campo.rotulo}. Mínimo {ex?.min ? `${fmtIso(ex.min.valor, 3)} ${campo.unidade} em (${fmtIso(ex.min.pos[0])}; ${fmtIso(ex.min.pos[1])}) m` : '—'}; máximo {ex?.max ? `${fmtIso(ex.max.valor, 3)} ${campo.unidade} em (${fmtIso(ex.max.pos[0])}; ${fmtIso(ex.max.pos[1])}) m` : '—'}.
+              {' '}Faixa de {leg.itens[0] ? fmtIso(leg.itens[0].de, 3) : '—'} a {leg.itens.at(-1) ? fmtIso(leg.itens.at(-1)!.ate, 3) : '—'} {campo.unidade} em {leg.itens.length} bandas.
+            </p>
+            <div className="row wrap">
+              <Button onClick={() => { void download(`${nome}.svg`, svgTexto(), 'image/svg+xml'); }}>{`Baixar SVG (janela ${n})`}</Button>
+              <Button onClick={() => { void baixarPng(); }}>{`Baixar PNG (janela ${n})`}</Button>
+              <Button onClick={() => { void download(`${nome}.dxf`, dxfIsolinhas(campo, niveis, lim), 'application/dxf'); }}>{`Baixar DXF das isolinhas (janela ${n})`}</Button>
+              <Button onClick={() => { void download(`${nome}.csv`, csvCampo(campo), 'text/csv'); }}>{`Baixar CSV x, y, valor (janela ${n})`}</Button>
+            </div>
+          </>
+        )}
+      </div>
+    </Group>
+  );
+}
diff --git a/src/app/edificio/Edificio.tsx b/src/app/edificio/Edificio.tsx
index 0f97c74..20f8d1c 100644
--- a/src/app/edificio/Edificio.tsx
+++ b/src/app/edificio/Edificio.tsx
@@ -1,6 +1,7 @@
 // Módulo Edifícios: obra, pavimentos, grupos, máscara, pilares e eixos, tudo por comandos do registro; planta em Canvas.
 import { SegundaOrdemAnalise } from './SegundaOrdem';
 import { AbaDeslocamentos } from './AbaDeslocamentos';
+import { AbaIsovalores } from './AbaIsovalores';
 import { useEffect, useRef, useState } from 'react';
 import { calculoAtual, dimAtual, podeRearmar as podeRearm, useBuilding } from './store';
 import { FERRAMENTAS_FUNDACAO, aoEscolher, usePlanta, type Ferramenta, type Tema } from './plantaStore';
@@ -76,7 +77,7 @@ export function Edificio() {
   const aj = useAjuda();
   const b = sessao.modelo;
   const ps = pavimentosOrdenados(b);
-  const [aba, setAba] = useState<'planta' | 'vista3d' | 'elevacao' | 'verificacao' | 'analise' | 'deslocamentos' | 'dimensionamento' | 'pranchas' | 'premissas'>('planta');
+  const [aba, setAba] = useState<'planta' | 'vista3d' | 'elevacao' | 'verificacao' | 'analise' | 'deslocamentos' | 'isovalores' | 'dimensionamento' | 'pranchas' | 'premissas'>('planta');
   const [memo, setMemo] = useState(false);
   const [dialogoL1, setDialogoL1] = useState<null | 'nova' | 'recentes' | 'texto' | 'gerais'>(null);
   const [dialogoL2, setDialogoL2] = useState<null | { tipo: 'lancar'; inicial?: string } | { tipo: 'gabaritos' } | { tipo: 'vistas' }>(null);
@@ -198,7 +199,7 @@ export function Edificio() {
 
       <section className="edif-main">
         <div className="edif-tabs" role="tablist">
-          {([['planta', 'Planta'], ['vista3d', '3D'], ['elevacao', 'Elevação'], ['verificacao', `Verificação${diags.length ? ` (${diags.length})` : ''}`], ['analise', 'Análise'], ['deslocamentos', 'Deslocamentos'], ['dimensionamento', 'Dimensionamento'], ['pranchas', 'Pranchas'], ['premissas', 'Premissas']] as const).map(([k, l]) => (
+          {([['planta', 'Planta'], ['vista3d', '3D'], ['elevacao', 'Elevação'], ['verificacao', `Verificação${diags.length ? ` (${diags.length})` : ''}`], ['analise', 'Análise'], ['deslocamentos', 'Deslocamentos'], ['isovalores', 'Isovalores'], ['dimensionamento', 'Dimensionamento'], ['pranchas', 'Pranchas'], ['premissas', 'Premissas']] as const).map(([k, l]) => (
             <Button variant="nenhuma" key={k} type="button" role="tab" aria-selected={aba === k} data-ajuda={`aba:${k}`} className={`${aba === k ? 'on' : ''}${k === 'verificacao' && nErr ? ' bad' : ''}`} onClick={() => setAba(k)}>{l}</Button>
           ))}
         </div>
@@ -210,6 +211,7 @@ export function Edificio() {
             {aba === 'verificacao' && <div className="card"><h3>Verificação de lançamento</h3><Diagnosticos diags={diags} onIr={(ids) => { usePlanta.getState().set({ selecao: new Set(ids) }); setAba('planta'); }} /></div>}
             {aba === 'analise' && <Analise b={b} nErr={nErr} />}
             {aba === 'deslocamentos' && <AbaDeslocamentos b={b} />}
+            {aba === 'isovalores' && <AbaIsovalores b={b} />}
             {aba === 'dimensionamento' && <DimensionamentoAba onIr={(tipo, id, pav) => { irParaElemento(b, tipo, id, pav); setAba('planta'); }} onMemorial={() => setMemo(true)} />}
             {aba === 'pranchas' && <Pranchas />}
             {aba === 'premissas' && (
```
