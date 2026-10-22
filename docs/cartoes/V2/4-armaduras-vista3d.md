# Cartão V2-4 — armaduras na vista 3D do edifício

Executor: Haiku. Independente dos cartões 2 e 3; depende do 1 (cores `--v3d-arm-*`). **Não regere o `public/vendor/three-*.mjs`:** as barras usam só `LineSegments` (linhas) e `Mesh` com `BufferGeometry` (tubos, `malhaDeTubos` do núcleo), classes que o vendor já exporta.

## Comportamento
- Check "Armaduras" na barra da vista 3D; ligado, mostra as barras dos pavimentos da cena (ou só dos elementos selecionados na planta), em uma camada por cor (`camadasDeArmadura`): um objeto de linhas (ou uma malha de tubos) por camada, nunca um objeto por barra. Limite de 20 000 segmentos (`armaduras3D`); acima disso, aviso na barra de estado.
- Controles (aparecem com "Armaduras" ligado): Dropdown "Colorir armaduras por" (bitola, tipo, elemento, posição), Check "Concreto translúcido" (opacidade 0,10 a 0,18 nos tipos), Check "Só elementos selecionados", Check "Barras como tubos" e Slider "Espessura das barras" (× 2,5 mm de raio; padrão 4; premissa: raio exagerado, a confirmar). Sem WebGL, as armaduras não aparecem (aviso na barra de estado).
- O contêiner publica `data-armaduras` (`0` quando desligado; senão `{barras, segmentos, truncado, camadas}`) para o e2e.
- Sem dimensionamento (`dim` nulo), aviso "Calcule o dimensionamento para ver as armaduras."

## Rótulos
`Armaduras`, `Colorir armaduras por`, `Concreto translúcido`, `Só elementos selecionados`, `Barras como tubos`, `Espessura das barras` (Slider: regex ancorada).

## Diff esperado
```diff
diff --git a/src/app/vista3d/Vista3D.tsx b/src/app/vista3d/Vista3D.tsx
index acd8f85..d701d0d 100644
--- a/src/app/vista3d/Vista3D.tsx
+++ b/src/app/vista3d/Vista3D.tsx
@@ -8,6 +8,7 @@ import { abrirJanela, irParaElemento } from '../edificio/Revisao';
 import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';
 import { construirCena, resumoCena, TIPOS_3D, PAV_FUNDACAO, type Cena3D, type Objeto3D, type TipoElemento3D } from '../../core/vista3d/cena';
 import { isometricoSvg } from '../../core/vista3d/isometrico';
+import { armaduras3D, camadasDeArmadura, type AgruparPor } from '../../core/vista3d/armaduras3d';
 import {
   ALTURA_OLHO, alternarProjecao, definirAngulos, enquadrar, iniciarCaminhar, type Camera3D, type EstadoCaminhar,
 } from '../../core/vista3d/camera';
@@ -64,6 +65,13 @@ export function Vista3D({ onPlanta }: { onPlanta: () => void }) {
     [b, rev, opcoes, dim?.fundacoes, dim?.vigasFundacao],
   );
   cenaRef.current = cena;
+  // armaduras (V2): barras dos pavimentos da cena (ou só dos elementos selecionados), fundidas em uma camada por cor
+  const pavsCena = useMemo(() => Object.keys(cena.contagens.porPavimento).filter((p) => p !== PAV_FUNDACAO), [cena]);
+  const arm = useMemo(
+    () => (st.armaduras && dim ? armaduras3D(b, dim, { pavimentos: pavsCena, ...(st.armSoSelecao && selecaoPlanta.size ? { elementos: [...selecaoPlanta] } : {}) }) : null),
+    [b, rev, dim, st.armaduras, st.armSoSelecao, selecaoPlanta, pavsCena],
+  );
+  const camadasArm = useMemo(() => (arm ? camadasDeArmadura(arm, st.armPor) : []), [arm, st.armPor]);
   const chaveEscopo = `${st.escopo}|${st.grupo}|${st.de}|${st.ate}|${st.pavimento}`;
   const ultimoEscopo = useRef('');
 
@@ -170,12 +178,21 @@ export function Vista3D({ onPlanta }: { onPlanta: () => void }) {
   }, [cena, tema, status]);
 
   useEffect(() => {
-    rend.current?.atualizarMateriais({ opacidade: { laje: 1 - st.transpLajes / 100, parede: 1 - st.transpParedes / 100 }, textura: st.textura });
+    const fantasma = st.armaduras && st.armGhost && !!arm?.barras.length;
+    rend.current?.atualizarMateriais({ opacidade: fantasma ? { pilar: 0.15, viga: 0.15, laje: 0.1, parede: 0.1, escada: 0.15, fundacao: 0.15 } : { laje: 1 - st.transpLajes / 100, parede: 1 - st.transpParedes / 100 }, textura: st.textura });
     pedir();
-  }, [st.transpLajes, st.transpParedes, st.textura, cena, pedir]);
+  }, [st.transpLajes, st.transpParedes, st.textura, st.armaduras, st.armGhost, arm, cena, pedir]);
 
   useEffect(() => { rend.current?.selecionar(selecaoPlanta); pedir(); }, [selecaoPlanta, pedir]);
 
+  useEffect(() => {
+    const r = rend.current, el = cont.current;
+    if (status !== 'pronto' || !r || !el) return;
+    const cores = Array.from({ length: 8 }, (_, i) => cssVar(`v3d-arm-${i + 1}`, el));
+    r.definirArmaduras(camadasArm, cores, st.armTubos ? 'tubos' : 'linhas', 0.0025 * st.armEscala);
+    pedir();
+  }, [camadasArm, st.armTubos, st.armEscala, tema, status, pedir]);
+
   // projeção: o enquadramento (alvo, distância, ângulos) é o mesmo nas duas
   useEffect(() => {
     if (camRef.current) { camRef.current = alternarProjecao(camRef.current, st.projecao); pedir(); }
@@ -280,6 +297,21 @@ export function Vista3D({ onPlanta }: { onPlanta: () => void }) {
         {!fallback && st.caminhar && <Slider label="Velocidade" value={st.velocidade} min={0.5} max={8} step={0.5} unit=" m/s" onChange={(v) => st.set({ velocidade: v })} />}
         {!fallback && <Check label="Textura" checked={st.textura} onChange={(v) => st.set({ textura: v })} />}
         <Seg small value={st.detalhe} options={[{ v: 'baixo', label: 'Detalhe baixo' }, { v: 'alto', label: 'Detalhe alto', title: 'Vigotas das lajes treliçadas' }]} onChange={(v) => st.set({ detalhe: v })} />
+        <Check label="Armaduras" checked={st.armaduras} onChange={(v) => st.set({ armaduras: v })} />
+        {st.armaduras && (
+          <>
+            <Dropdown aria-label="Colorir armaduras por" value={st.armPor} onChange={(e) => st.set({ armPor: e.target.value as AgruparPor })}>
+              <option value="bitola">Cor por bitola</option>
+              <option value="tipo">Cor por tipo de barra</option>
+              <option value="elemento">Cor por elemento</option>
+              <option value="posicao">Cor por posição</option>
+            </Dropdown>
+            <Check label="Concreto translúcido" checked={st.armGhost} onChange={(v) => st.set({ armGhost: v })} />
+            <Check label="Só elementos selecionados" checked={st.armSoSelecao} onChange={(v) => st.set({ armSoSelecao: v })} />
+            {!fallback && <Check label="Barras como tubos" checked={st.armTubos} onChange={(v) => st.set({ armTubos: v })} />}
+            {!fallback && st.armTubos && <Slider label="Espessura das barras" value={st.armEscala} min={1} max={20} unit="×" onChange={(v) => st.set({ armEscala: v })} />}
+          </>
+        )}
         <Button onClick={() => { ajustarCamera(true); pedir(); setAngulos((a) => ({ ...a })); }}>Enquadrar</Button>
         <Button onClick={() => { void capturar(); }}>{fallback ? 'Baixar SVG' : 'Capturar PNG'}</Button>
       </div>
@@ -293,6 +325,7 @@ export function Vista3D({ onPlanta }: { onPlanta: () => void }) {
         data-projecao={fallback ? 'svg' : st.projecao}
         data-status={status}
         data-caminhar={st.caminhar ? '1' : '0'}
+        data-armaduras={arm ? JSON.stringify({ barras: arm.barras.length, segmentos: arm.segmentos, truncado: arm.truncado, camadas: camadasArm.length }) : '0'}
       >
         {fallback && <div className="v3d-iso-box" onClick={(e) => aoClicarSvg(e, false)} onDoubleClick={(e) => aoClicarSvg(e, true)} dangerouslySetInnerHTML={{ __html: svg }} />}
         {fallback && (
@@ -315,6 +348,9 @@ export function Vista3D({ onPlanta }: { onPlanta: () => void }) {
           </span>
         )}
         {aviso && <span>{aviso}</span>}
+        {st.armaduras && !dim && <span className="muted">Calcule o dimensionamento para ver as armaduras.</span>}
+        {st.armaduras && fallback && <span className="muted">As armaduras só aparecem com WebGL (aqui, o isométrico estático não as desenha).</span>}
+        {arm && <span>Armaduras: <b className="num">{arm.barras.length}</b> barras, <span className="num">{arm.segmentos}</span> segmentos em {camadasArm.length} camada(s){arm.avisos.length ? ` — ${arm.avisos.join(' ')}` : ''}</span>}
         {!dim?.fundacoes?.length && b.fundacao?.elementos.length ? <span className="muted">Calcule as fundações para vê-las na vista 3D.</span> : null}
         <span className="muted">Arraste: girar · Shift ou botão direito: deslocar · roda: aproximar · clique: selecionar · duplo clique: abrir a janela · Home: enquadrar</span>
       </div>
diff --git a/src/app/vista3d/renderizador.ts b/src/app/vista3d/renderizador.ts
index 19390e7..d6789e2 100644
--- a/src/app/vista3d/renderizador.ts
+++ b/src/app/vista3d/renderizador.ts
@@ -4,6 +4,7 @@
 import type * as THREE from 'three';
 import { direcaoOlhar, metadeAltura, posicaoCamera, type Camera3D, type EstadoCaminhar } from '../../core/vista3d/camera';
 import type { Cena3D, Objeto3D, TipoElemento3D } from '../../core/vista3d/registro';
+import { malhaDeTubos, type CamadaArmadura } from '../../core/vista3d/armaduras3d';
 import type { Three } from './carregarThree';
 
 export interface CoresCena {
@@ -48,6 +49,7 @@ export class RenderizadorCena {
   private ativa: THREE.Camera;
   private raiz: THREE.Group;
   private realce: THREE.Group;
+  private arm: THREE.Group;
   private blocos: Bloco[] = [];
   private objetos = new Map<string, Objeto3D>();
   private ray: THREE.Raycaster;
@@ -71,7 +73,8 @@ export class RenderizadorCena {
     this.ativa = this.persp;
     this.raiz = new T.Group();
     this.realce = new T.Group();
-    this.cena.add(this.raiz, this.realce);
+    this.arm = new T.Group();
+    this.cena.add(this.raiz, this.realce, this.arm);
     this.cena.add(new T.HemisphereLight(undefined, undefined, 1.1));
     const sol = new T.DirectionalLight(undefined, 1.6);
     sol.position.set(-0.6, -0.9, 1.4);
@@ -180,6 +183,27 @@ export class RenderizadorCena {
     return new this.T.LineSegments(g, mat);
   }
 
+  /** Armaduras (V2): uma camada = um objeto (linhas ou malha de tubos) com a cor da camada; `raio` em m para os tubos. */
+  definirArmaduras(camadas: CamadaArmadura[], cores: string[], modo: 'linhas' | 'tubos', raio: number): void {
+    const T = this.T;
+    this.limparArmaduras();
+    camadas.forEach((c, i) => {
+      if (!c.linhas.length) return;
+      const cor = new T.Color(cores[i % cores.length]);
+      if (modo === 'linhas') { this.arm.add(this.linhas(c.linhas, new T.LineBasicMaterial({ color: cor }))); return; }
+      const { pos, idx } = malhaDeTubos(c.linhas, raio);
+      const g = new T.BufferGeometry();
+      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
+      g.setIndex(new T.Uint32BufferAttribute(idx, 1));
+      g.computeVertexNormals();
+      this.arm.add(new T.Mesh(g, new T.MeshLambertMaterial({ color: cor, side: T.DoubleSide })));
+    });
+  }
+
+  private limparArmaduras(): void {
+    for (const f of [...this.arm.children]) { this.arm.remove(f); (f as THREE.Mesh).geometry.dispose(); ((f as THREE.Mesh).material as THREE.Material).dispose(); }
+  }
+
   /** Transparência por tipo e textura procedural. */
   atualizarMateriais(aj: AjustesMateriais): void {
     this.aj = aj;
@@ -300,6 +324,7 @@ export class RenderizadorCena {
 
   dispose(): void {
     this.limpar();
+    this.limparArmaduras();
     for (const f of [...this.realce.children]) { (f as THREE.Mesh).geometry.dispose(); ((f as THREE.Mesh).material as THREE.Material).dispose(); }
     this.textura?.dispose();
     this.R.dispose();
diff --git a/src/app/vista3d/vista3dStore.ts b/src/app/vista3d/vista3dStore.ts
index fa626fa..6d551c4 100644
--- a/src/app/vista3d/vista3dStore.ts
+++ b/src/app/vista3d/vista3dStore.ts
@@ -4,6 +4,7 @@ import type { BuildingModel } from '../../core/building/types';
 import { pavimentosOrdenados } from '../../core/building/types';
 import { PAV_FUNDACAO, type OpcoesCena, type TipoElemento3D } from '../../core/vista3d/registro';
 import { VELOCIDADE_INICIAL, type Projecao } from '../../core/vista3d/camera';
+import type { AgruparPor } from '../../core/vista3d/armaduras3d';
 
 /** O que entra na cena: o edifício todo, um grupo, um intervalo de pavimentos ou um pavimento só. */
 export type Escopo = 'edificio' | 'grupo' | 'intervalo' | 'pavimento';
@@ -23,6 +24,13 @@ export interface V3State {
   detalhe: 'baixo' | 'alto';
   caminhar: boolean;
   velocidade: number;
+  /** Armaduras em 3D (V2): liga, cor por, tubos, concreto translúcido, só os selecionados e espessura (× 2,5 mm de raio). */
+  armaduras: boolean;
+  armPor: AgruparPor;
+  armTubos: boolean;
+  armGhost: boolean;
+  armSoSelecao: boolean;
+  armEscala: number;
   set(p: Partial<Omit<V3State, 'set'>>): void;
 }
 
@@ -32,6 +40,7 @@ export const useVista3d = create<V3State>((set) => ({
   transpLajes: 40, transpParedes: 40,
   projecao: 'perspectiva', textura: false, detalhe: 'baixo',
   caminhar: false, velocidade: VELOCIDADE_INICIAL,
+  armaduras: false, armPor: 'bitola', armTubos: false, armGhost: true, armSoSelecao: false, armEscala: 4,
   set: (p) => set(p),
 }));
 
```

## Verificação
```bash
npx tsc -b
npx vitest run src/app/design/design.test.ts src/core/vista3d
```
