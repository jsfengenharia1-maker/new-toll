# Cartão V3-2 — deformada na vista 3D do edifício

Executor: Haiku. Depende do cartão 1 (cores `--v3d-def-*`, lidas em tempo de execução). Independente dos cartões 3 e 4. **Não regere o `public/vendor/three-*.mjs`:** a deformada usa só `Mesh` e `LineSegments` com `BufferGeometry` e atributo `color` por vértice (classes que o vendor já exporta).

## Comportamento
- Check "Deformada" na barra da vista 3D; ligado, a cena original some e entram as malhas deformadas (refinadas, `deformarCena`) coloridas por |Δ| (rampa de 5 cores), com a legenda no rodapé: 0, a rampa, o maior |Δ| em mm, a hipótese e a escala.
- Controles (com "Deformada" ligado): Dropdown "Hipótese da deformada" (casos simples `caso:<id>` e combinações), Check "Escala automática" (maior deslocamento = 5 % da altura; desligado, Slider "Escala da deformada" de 1 a 1000×), Check "Só eixos das barras" (estrutura simplificada: polilinhas de Hermite, 8 a 16 pontos), Check "Animar" e Slider "Período da animação" (u(t) = u·sin(2πt/T); padrão 2 s; parada com a aba oculta; começa desligada, o que respeita `prefers-reduced-motion`).
- O contêiner publica `data-deformada` (`0` desligada; senão `{{hipotese, modo: 'completa'|'eixos', dmaxMm, escala, animando, objetos}}`) para o e2e.
- Sem cálculo atual (`calculoAtual`), aviso "Calcule a estrutura (aba Dimensionamento) para ver a deformada." na barra de estado; sem WebGL, a deformada não aparece (aviso na barra de estado).
- Nos quadros da animação as normais não são refeitas (sombreamento aproximado); parada, `atualizarDeformada(escala, 1, true)` refaz.

## Rótulos
`Deformada`, `Hipótese da deformada` (Dropdown com `aria-label`), `Escala automática`, `Escala da deformada` (Slider: regex ancorada), `Só eixos das barras`, `Animar`, `Período da animação` (Slider: regex ancorada), `Legenda da deformada` (imagem da rampa).

## Diff esperado
```diff
diff --git a/src/app/vista3d/Vista3D.tsx b/src/app/vista3d/Vista3D.tsx
index d701d0d..b2b6303 100644
--- a/src/app/vista3d/Vista3D.tsx
+++ b/src/app/vista3d/Vista3D.tsx
@@ -2,13 +2,15 @@
 // estático em SVG da mesma cena. Escopo por pavimento, grupo ou intervalo, tipos, transparência, perspectiva/isométrica,
 // caminhar, seleção sincronizada com a planta e captura PNG. A geometria vem de src/core/vista3d (função pura).
 import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
-import { useBuilding } from '../edificio/store';
+import { calculoAtual, useBuilding } from '../edificio/store';
 import { usePlanta } from '../edificio/plantaStore';
 import { abrirJanela, irParaElemento } from '../edificio/Revisao';
 import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';
 import { construirCena, resumoCena, TIPOS_3D, PAV_FUNDACAO, type Cena3D, type Objeto3D, type TipoElemento3D } from '../../core/vista3d/cena';
 import { isometricoSvg } from '../../core/vista3d/isometrico';
 import { armaduras3D, camadasDeArmadura, type AgruparPor } from '../../core/vista3d/armaduras3d';
+import { eixosDeformados, escalaAutomatica, fatorAnimacao, hipotesesDisponiveis } from '../../core/resultados/deformada';
+import { deformarCena } from '../../core/resultados/deformadaCena';
 import {
   ALTURA_OLHO, alternarProjecao, definirAngulos, enquadrar, iniciarCaminhar, type Camera3D, type EstadoCaminhar,
 } from '../../core/vista3d/camera';
@@ -72,6 +74,17 @@ export function Vista3D({ onPlanta }: { onPlanta: () => void }) {
     [b, rev, dim, st.armaduras, st.armSoSelecao, selecaoPlanta, pavsCena],
   );
   const camadasArm = useMemo(() => (arm ? camadasDeArmadura(arm, st.armPor) : []), [arm, st.armPor]);
+  // deformada (V3): hipótese (caso ou combinação), malha refinada colorida por |Δ| ou só os eixos das barras
+  const analiseAtual = useBuilding((s) => (calculoAtual(s) && !s.analise?.erro ? s.analise : null));
+  const hips = useMemo(() => (analiseAtual ? hipotesesDisponiveis(b, analiseAtual) : []), [b, rev, analiseAtual]);
+  const hip = hips.find((h) => h.id === st.defHipotese) ?? hips[0] ?? null;
+  const cd = useMemo(() => (st.deformada && analiseAtual && hip && !st.defEixos ? deformarCena(cena, analiseAtual, hip) : null), [st.deformada, st.defEixos, analiseAtual, hip, cena]);
+  const eixos = useMemo(
+    () => (st.deformada && analiseAtual && hip && st.defEixos ? eixosDeformados(analiseAtual, hip).filter((e) => (e.pavimento in cena.contagens.porPavimento || e.tipo === 'fundacao') && (st.tipos[e.tipo as TipoElemento3D] ?? true)) : null),
+    [st.deformada, st.defEixos, st.tipos, analiseAtual, hip, cena],
+  );
+  const defDmax = cd ? cd.dmax : eixos ? Math.max(0, ...eixos.flatMap((e) => e.delta)) : 0;
+  const escalaDef = st.defAuto ? (cd ? cd.escalaAuto : escalaAutomatica(defDmax, Math.max(1e-6, cena.limites.max[2] - cena.limites.min[2]))) : st.defEscala;
   const chaveEscopo = `${st.escopo}|${st.grupo}|${st.de}|${st.ate}|${st.pavimento}`;
   const ultimoEscopo = useRef('');
 
@@ -193,6 +206,29 @@ export function Vista3D({ onPlanta }: { onPlanta: () => void }) {
     pedir();
   }, [camadasArm, st.armTubos, st.armEscala, tema, status, pedir]);
 
+  useEffect(() => {
+    const r = rend.current, el = cont.current;
+    if (status !== 'pronto' || !r || !el) return;
+    r.definirDeformada(cd, eixos, [1, 2, 3, 4, 5].map((i) => cssVar(`v3d-def-${i}`, el)), cd ? 'completa' : 'simplificada', defDmax);
+    pedir();
+  }, [cd, eixos, tema, status, pedir]);
+  useEffect(() => {
+    if (!st.defAnimar) { rend.current?.atualizarDeformada(escalaDef, 1, true); pedir(); }
+  }, [escalaDef, cd, eixos, st.defAnimar, status, pedir]);
+  // animação u(t) = u·sin(2πt/T): para quando a aba fica oculta e começa desligada (prefers-reduced-motion)
+  useEffect(() => {
+    const r = rend.current;
+    if (status !== 'pronto' || !r || !(cd || eixos) || !st.defAnimar) return;
+    const t0 = performance.now();
+    let id = 0;
+    const volta = (t: number) => {
+      if (!document.hidden) { r.atualizarDeformada(escalaDef, fatorAnimacao((t - t0) / 1000, st.defPeriodo), false); pedir(); }
+      id = requestAnimationFrame(volta);
+    };
+    id = requestAnimationFrame(volta);
+    return () => cancelAnimationFrame(id);
+  }, [cd, eixos, st.defAnimar, st.defPeriodo, escalaDef, status, pedir]);
+
   // projeção: o enquadramento (alvo, distância, ângulos) é o mesmo nas duas
   useEffect(() => {
     if (camRef.current) { camRef.current = alternarProjecao(camRef.current, st.projecao); pedir(); }
@@ -312,6 +348,19 @@ export function Vista3D({ onPlanta }: { onPlanta: () => void }) {
             {!fallback && st.armTubos && <Slider label="Espessura das barras" value={st.armEscala} min={1} max={20} unit="×" onChange={(v) => st.set({ armEscala: v })} />}
           </>
         )}
+        <Check label="Deformada" checked={st.deformada} onChange={(v) => st.set({ deformada: v })} />
+        {st.deformada && (
+          <>
+            <Dropdown aria-label="Hipótese da deformada" value={hip?.id ?? ''} onChange={(e) => st.set({ defHipotese: e.target.value })}>
+              {hips.map((h) => <option key={h.id} value={h.id}>{h.tipo === 'caso' ? `Caso ${h.nome}` : h.nome}</option>)}
+            </Dropdown>
+            <Check label="Escala automática" checked={st.defAuto} onChange={(v) => st.set({ defAuto: v })} />
+            {!st.defAuto && <Slider label="Escala da deformada" value={st.defEscala} min={1} max={1000} unit="×" onChange={(v) => st.set({ defEscala: v })} />}
+            <Check label="Só eixos das barras" checked={st.defEixos} onChange={(v) => st.set({ defEixos: v })} />
+            {!fallback && <Check label="Animar" checked={st.defAnimar} onChange={(v) => st.set({ defAnimar: v })} />}
+            {!fallback && st.defAnimar && <Slider label="Período da animação" value={st.defPeriodo} min={0.5} max={8} step={0.5} unit=" s" onChange={(v) => st.set({ defPeriodo: v })} />}
+          </>
+        )}
         <Button onClick={() => { ajustarCamera(true); pedir(); setAngulos((a) => ({ ...a })); }}>Enquadrar</Button>
         <Button onClick={() => { void capturar(); }}>{fallback ? 'Baixar SVG' : 'Capturar PNG'}</Button>
       </div>
@@ -325,6 +374,7 @@ export function Vista3D({ onPlanta }: { onPlanta: () => void }) {
         data-projecao={fallback ? 'svg' : st.projecao}
         data-status={status}
         data-caminhar={st.caminhar ? '1' : '0'}
+        data-deformada={cd || eixos ? JSON.stringify({ hipotese: hip?.nome, modo: cd ? 'completa' : 'eixos', dmaxMm: +(defDmax * 1000).toFixed(3), escala: +escalaDef.toFixed(2), animando: st.defAnimar, objetos: cd ? cd.objetos.length : eixos!.length }) : '0'}
         data-armaduras={arm ? JSON.stringify({ barras: arm.barras.length, segmentos: arm.segmentos, truncado: arm.truncado, camadas: camadasArm.length }) : '0'}
       >
         {fallback && <div className="v3d-iso-box" onClick={(e) => aoClicarSvg(e, false)} onDoubleClick={(e) => aoClicarSvg(e, true)} dangerouslySetInnerHTML={{ __html: svg }} />}
@@ -337,6 +387,15 @@ export function Vista3D({ onPlanta }: { onPlanta: () => void }) {
         {dica && <div className="v3d-dica" style={{ left: dica.x, top: dica.y }}>{dica.texto}</div>}
         {cena.avisos.length > 0 && <div className="v3d-aviso" role="alert">{cena.avisos.join(' ')}</div>}
       </div>
+      {(cd || eixos) && !fallback && (
+        <div className="v3d-def-leg">
+          <span>Deslocamento resultante |Δ|:</span>
+          <span className="num">0</span>
+          <div className="v3d-def-rampa" role="img" aria-label="Legenda da deformada" />
+          <span className="num">{(defDmax * 1000).toFixed(2).replace('.', ',')} mm</span>
+          <span>{hip?.nome} · escala ×<span className="num">{escalaDef.toFixed(0)}</span>{cd?.avisos.length ? ` — ${cd.avisos.join(' ')}` : ''}</span>
+        </div>
+      )}
       <div className="v3d-st">
         <span>Cena: <b className="num">{cena.contagens.total}</b> objetos — {TIPOS_3D.filter((t) => contagem[t.v]).map((t) => `${t.label.toLowerCase()} ${contagem[t.v]}`).join(', ') || 'vazia'}</span>
         <span>Pavimentos: {Object.keys(cena.contagens.porPavimento).map(nomePav).join(', ') || '—'}</span>
@@ -348,6 +407,8 @@ export function Vista3D({ onPlanta }: { onPlanta: () => void }) {
           </span>
         )}
         {aviso && <span>{aviso}</span>}
+        {st.deformada && !analiseAtual && <span className="muted">Calcule a estrutura (aba Dimensionamento) para ver a deformada.</span>}
+        {st.deformada && fallback && <span className="muted">A deformada só aparece com WebGL.</span>}
         {st.armaduras && !dim && <span className="muted">Calcule o dimensionamento para ver as armaduras.</span>}
         {st.armaduras && fallback && <span className="muted">As armaduras só aparecem com WebGL (aqui, o isométrico estático não as desenha).</span>}
         {arm && <span>Armaduras: <b className="num">{arm.barras.length}</b> barras, <span className="num">{arm.segmentos}</span> segmentos em {camadasArm.length} camada(s){arm.avisos.length ? ` — ${arm.avisos.join(' ')}` : ''}</span>}
diff --git a/src/app/vista3d/renderizador.ts b/src/app/vista3d/renderizador.ts
index d6789e2..5aa5b30 100644
--- a/src/app/vista3d/renderizador.ts
+++ b/src/app/vista3d/renderizador.ts
@@ -5,6 +5,8 @@ import type * as THREE from 'three';
 import { direcaoOlhar, metadeAltura, posicaoCamera, type Camera3D, type EstadoCaminhar } from '../../core/vista3d/camera';
 import type { Cena3D, Objeto3D, TipoElemento3D } from '../../core/vista3d/registro';
 import { malhaDeTubos, type CamadaArmadura } from '../../core/vista3d/armaduras3d';
+import type { CenaDeformada } from '../../core/resultados/deformadaCena';
+import type { EixoDeformado } from '../../core/resultados/deformada';
 import type { Three } from './carregarThree';
 
 export interface CoresCena {
@@ -19,6 +21,8 @@ export interface AjustesMateriais {
 }
 
 interface Faixa { ini: number; fim: number; obj: Objeto3D }
+/** Atributo de posição da deformada: posições originais, deslocamentos e o atributo do three que recebe base + escala · fator · desl. */
+interface RegistroDef { attr: THREE.BufferAttribute; base: Float32Array; desl: Float32Array; geo: THREE.BufferGeometry }
 interface Bloco { chave: string; tipo: TipoElemento3D; pendente: boolean; mesh: THREE.Mesh; faixas: Faixa[] }
 
 /** Textura procedural de concreto: ruído em tons de cinza, gerado pixel a pixel (sem imagem externa). */
@@ -50,6 +54,8 @@ export class RenderizadorCena {
   private raiz: THREE.Group;
   private realce: THREE.Group;
   private arm: THREE.Group;
+  private def: THREE.Group;
+  private registrosDef: RegistroDef[] = [];
   private blocos: Bloco[] = [];
   private objetos = new Map<string, Objeto3D>();
   private ray: THREE.Raycaster;
@@ -74,7 +80,8 @@ export class RenderizadorCena {
     this.raiz = new T.Group();
     this.realce = new T.Group();
     this.arm = new T.Group();
-    this.cena.add(this.raiz, this.realce, this.arm);
+    this.def = new T.Group();
+    this.cena.add(this.raiz, this.realce, this.arm, this.def);
     this.cena.add(new T.HemisphereLight(undefined, undefined, 1.1));
     const sol = new T.DirectionalLight(undefined, 1.6);
     sol.position.set(-0.6, -0.9, 1.4);
@@ -218,6 +225,72 @@ export class RenderizadorCena {
     }
   }
 
+
+  // ---------------------------------------------------------------- deformada (V3)
+
+  private limparDeformada(): void {
+    for (const f of [...this.def.children]) { this.def.remove(f); const g = f as THREE.Mesh; g.geometry.dispose(); (g.material as THREE.Material).dispose(); }
+    this.registrosDef = [];
+  }
+
+  /** Cor da rampa (cores[0] = menor |Δ|) na posição `t` de 0 a 1. */
+  private corRampa(cores: THREE.Color[], t: number): THREE.Color {
+    const x = Math.min(1, Math.max(0, t)) * (cores.length - 1), i = Math.min(cores.length - 2, Math.floor(x));
+    return cores[i].clone().lerp(cores[i + 1], x - i);
+  }
+
+  /**
+   * Mostra a deformada no lugar da cena original (que fica oculta): `completa` = malhas refinadas coloridas por |Δ|;
+   * `simplificada` = eixos das barras. `cd` nulo desliga. `cores` = rampa `--v3d-def-1..5`.
+   */
+  definirDeformada(cd: CenaDeformada | null, eixos: EixoDeformado[] | null, cores: string[], modo: 'completa' | 'simplificada', dmax: number): void {
+    const T = this.T;
+    this.limparDeformada();
+    this.raiz.visible = !(cd || eixos);
+    if (!cd && !eixos) return;
+    const rampa = cores.map((c) => new T.Color(c)), cor = (d: number) => this.corRampa(rampa, dmax > 1e-12 ? d / dmax : 0);
+    const registrar = (geo: THREE.BufferGeometry, base: Float32Array, desl: Float32Array) => {
+      const attr = new T.Float32BufferAttribute(base.slice(), 3);
+      geo.setAttribute('position', attr);
+      this.registrosDef.push({ attr, base, desl, geo });
+    };
+    if (modo === 'completa' && cd) {
+      for (const o of cd.objetos) {
+        const geo = new T.BufferGeometry(), nv = o.pos.length / 3, col = new Float32Array(nv * 3);
+        for (let v = 0; v < nv; v++) { const c = cor(o.delta[v]); col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; }
+        registrar(geo, o.pos, o.desl);
+        geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
+        geo.setIndex(new T.Uint32BufferAttribute(o.idx, 1));
+        this.def.add(new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide })));
+      }
+    } else if (eixos) {
+      const base: number[] = [], desl: number[] = [], col: number[] = [];
+      for (const e of eixos) for (let k = 0; k + 1 < e.delta.length; k++) {
+        for (const j of [k, k + 1]) {
+          base.push(e.pos[j * 3], e.pos[j * 3 + 1], e.pos[j * 3 + 2]); desl.push(e.desl[j * 3], e.desl[j * 3 + 1], e.desl[j * 3 + 2]);
+          const c = cor(e.delta[j]); col.push(c.r, c.g, c.b);
+        }
+      }
+      const geo = new T.BufferGeometry();
+      registrar(geo, Float32Array.from(base), Float32Array.from(desl));
+      geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
+      this.def.add(new T.LineSegments(geo, new T.LineBasicMaterial({ vertexColors: true })));
+    }
+    this.atualizarDeformada(1, 1, true);
+  }
+
+  /** Posições = original + escala · fator · deslocamento; `normais` refaz o sombreamento (não nos quadros da animação). */
+  atualizarDeformada(escala: number, fator: number, normais: boolean): void {
+    const k = escala * fator;
+    for (const r of this.registrosDef) {
+      const a = r.attr.array as Float32Array;
+      for (let i = 0; i < a.length; i++) a[i] = r.base[i] + k * r.desl[i];
+      r.attr.needsUpdate = true;
+      if (normais && r.geo.index) r.geo.computeVertexNormals();
+      r.geo.computeBoundingSphere();
+    }
+  }
+
   // ---------------------------------------------------------------- realce (seleção e cursor)
 
   private construirRealce(ids: Iterable<string>, cor: string, opacidade: number): THREE.Mesh | null {
@@ -325,6 +398,7 @@ export class RenderizadorCena {
   dispose(): void {
     this.limpar();
     this.limparArmaduras();
+    this.limparDeformada();
     for (const f of [...this.realce.children]) { (f as THREE.Mesh).geometry.dispose(); ((f as THREE.Mesh).material as THREE.Material).dispose(); }
     this.textura?.dispose();
     this.R.dispose();
diff --git a/src/app/vista3d/vista3dStore.ts b/src/app/vista3d/vista3dStore.ts
index 6d551c4..3a19a30 100644
--- a/src/app/vista3d/vista3dStore.ts
+++ b/src/app/vista3d/vista3dStore.ts
@@ -31,6 +31,14 @@ export interface V3State {
   armGhost: boolean;
   armSoSelecao: boolean;
   armEscala: number;
+  /** Deformada (V3): liga, hipótese ('' = o primeiro caso), escala manual, escala automática, só eixos, animação e período (s). */
+  deformada: boolean;
+  defHipotese: string;
+  defEscala: number;
+  defAuto: boolean;
+  defEixos: boolean;
+  defAnimar: boolean;
+  defPeriodo: number;
   set(p: Partial<Omit<V3State, 'set'>>): void;
 }
 
@@ -41,6 +49,7 @@ export const useVista3d = create<V3State>((set) => ({
   projecao: 'perspectiva', textura: false, detalhe: 'baixo',
   caminhar: false, velocidade: VELOCIDADE_INICIAL,
   armaduras: false, armPor: 'bitola', armTubos: false, armGhost: true, armSoSelecao: false, armEscala: 4,
+  deformada: false, defHipotese: '', defEscala: 50, defAuto: true, defEixos: false, defAnimar: false, defPeriodo: 2,
   set: (p) => set(p),
 }));
 
```
