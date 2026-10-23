# L4 — cartão 04: Barra de atalhos configurável, guia rápido e ajuda por item e por ferramenta

Classe: Haiku (interface sobre núcleo pronto; código validado).

## Arquivos
- `src/app/edificio/BarraAtalhos.tsx` (novo): barra configurável no topo da barra lateral do edifício (não na barra da planta); botões só com ícone e `aria-label` "Atalho: <rótulo>"; configuração em janela; persistência `statikos:barra` protegida
- `src/app/edificio/GuiaRapido.tsx` (novo): `GuiaConteudo` e `GuiaRapidoDialogo` (imprimível em A4 com o CSS do memorial)
- `src/app/edificio/Edificio.tsx`: execução dos atalhos, `data-ajuda` nas abas e na tabela de pavimentos, janela do guia
- `src/app/edificio/OpcoesCalculo.tsx`: `data-ajuda="opcao:<chave>"` em cada opção
- `src/app/edificio/Planta.tsx`: `data-ajuda` da ferramenta ativa, tecla na barra de estado e painel `AjudaFerramenta` com o modo de ajuda ligado
- `src/app/design/global.css`: `atalhos`, `atalho-linha`, `ajuda-ferr`, `guia` e `planta` com posição relativa

## Núcleo usado (já existe)
Núcleo: `src/core/ajuda/atalhos.ts` (`ATALHOS_CATALOGO`, `lerBarra`, `salvarBarra`, `restaurarBarra`), `guia.ts` (`guiaRapido`), `catalogo.ts` (`ajudaDaFerramenta`).

## Aplicação
`git apply docs/cartoes/L4/patches/04-atalhos-guia-ajuda.patch` (ou aplique o bloco `diff` abaixo, trecho a trecho).

## Verificação
- `npx tsc -b`
- `npx vitest run src/app/design`
- `npm run e2e -- FU3` e `npm run e2e -- R7-0` (a barra de atalhos NÃO pode ficar acima da planta: reduz a altura do canvas e desloca o pilar P1 para fora da área clicável)

## Rótulos e regras
Botões `Atalho: <rótulo>`, `Configurar a barra de atalhos`, `Restaurar atalhos padrão`, `Subir <rótulo>`, `Descer <rótulo>`, `Imprimir guia rápido`; checks `Atalho <rótulo>`; janelas `Configurar atalhos` e `Guia rápido`; painel `Ajuda da ferramenta ativa`. Rótulos únicos: não repita o texto de outro botão da tela (o e2e usa `{ exact: true }`). Sem botões novos na barra da planta.

## Patch
```diff
diff --git a/src/app/design/global.css b/src/app/design/global.css
index d5bda57..a633660 100644
--- a/src/app/design/global.css
+++ b/src/app/design/global.css
@@ -616,7 +616,7 @@ svg.mono .hinge { fill: #fff !important; }
 .planta-barra { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 6px 10px; border-bottom: 1px solid var(--line); background: var(--surface); font-size: 12px; }
 .planta-barra select { border: 1px solid var(--line); border-radius: var(--radius); padding: 3px 6px; background: var(--surface); color: var(--ink); font-size: 12px; }
 .planta-barra .pavsel { display: flex; gap: 6px; align-items: center; color: var(--muted); }
-.planta { flex: 1; display: flex; flex-direction: column; min-height: 0; }
+.planta { position: relative; flex: 1; display: flex; flex-direction: column; min-height: 0; }
 .planta-cv { position: relative; flex: 1; min-height: 240px; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none; }
 .planta-cv canvas { position: absolute; left: 0; top: 0; }
 .planta-cv canvas.int { cursor: none; }
@@ -969,3 +969,13 @@ body.ajuda-on { cursor: help; }
 .esq-pav.destino { outline: 2px solid var(--ok); outline-offset: -2px; }
 .esq-pav.origem.destino { outline-color: var(--bad); }
 .esq-marca { margin-left: auto; font-weight: 600; }
+.atalhos { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; padding: 4px 8px; border-bottom: 1px solid var(--line); background: var(--surface-2); }
+.atalhos .btn { padding: 2px 6px; min-width: 28px; }
+.atalho-linha { display: flex; align-items: center; gap: 6px; }
+.ajuda-ferr { position: absolute; left: 12px; bottom: 36px; z-index: 5; width: min(360px, calc(100% - 24px)); background: var(--surface); border: 1px solid var(--accent); border-radius: var(--radius-lg); padding: 8px 10px; display: grid; gap: 4px; font-size: var(--fs); color: var(--ink); }
+.ajuda-ferr p, .ajuda-ferr ol { margin: 0; }
+.ajuda-ferr ol { padding-left: 18px; }
+.guia { display: grid; gap: 6px; }
+.guia dl { margin: 0; display: grid; gap: 4px; }
+.guia dt { font-weight: 600; color: var(--ink-strong); }
+.guia dd { margin: 0 0 4px; color: var(--ink); }
diff --git a/src/app/edificio/BarraAtalhos.tsx b/src/app/edificio/BarraAtalhos.tsx
new file mode 100644
index 0000000..10d97e1
--- /dev/null
+++ b/src/app/edificio/BarraAtalhos.tsx
@@ -0,0 +1,39 @@
+// Barra de atalhos configurável (L4, C1.6): o usuário põe, tira e reordena os botões; a escolha fica salva no navegador
+// (`statikos:barra`, protegida) e "Restaurar padrão" volta à barra original. Catálogo e persistência em src/core/ajuda/atalhos.ts.
+import { useEffect, useState } from 'react';
+import { alternarAtalho, ATALHOS_CATALOGO, lerBarra, moverAtalho, restaurarBarra, salvarBarra, type Atalho, type ArmazenamentoSimples } from '../../core/ajuda';
+import { Button, Check, dataAjuda, Icone, Modal } from '../ui';
+
+const armazenamento = (): ArmazenamentoSimples | null => { try { return window.localStorage; } catch { return null; } };
+const porId = (id: string) => ATALHOS_CATALOGO.find((a) => a.id === id);
+
+export function BarraAtalhos({ executar }: { executar: (a: Atalho) => void }) {
+  const [lista, setLista] = useState<string[]>(() => lerBarra(armazenamento()));
+  const [cfg, setCfg] = useState(false);
+  useEffect(() => { salvarBarra(armazenamento(), lista); }, [lista]);
+  return (
+    <div className="atalhos" role="toolbar" aria-label="Barra de atalhos" {...dataAjuda('barra:atalhos')}>
+      {lista.map(porId).filter((a): a is Atalho => !!a).map((a) => (
+        <Button key={a.id} title={a.rotulo} aria-label={`Atalho: ${a.rotulo}`} onClick={() => executar(a)}><Icone nome={a.icone} /></Button>
+      ))}
+      <Button variant="mini" title="Configurar a barra de atalhos" aria-label="Configurar a barra de atalhos" onClick={() => setCfg(true)}>⚙</Button>
+      {cfg && (
+        <Modal titulo="Configurar atalhos" onClose={() => setCfg(false)} ajuda="barra:atalhos" info="Marque os botões que a barra deve ter e use as setas para mudar a ordem. A escolha fica salva neste navegador.">
+          {ATALHOS_CATALOGO.map((a) => {
+            const on = lista.includes(a.id);
+            return (
+              <div key={a.id} className="atalho-linha">
+                <Check label={`Atalho ${a.rotulo}`} checked={on} onChange={() => setLista(alternarAtalho(lista, a.id))} />
+                {on && <>
+                  <Button variant="mini" aria-label={`Subir ${a.rotulo}`} onClick={() => setLista(moverAtalho(lista, a.id, -1))}>↑</Button>
+                  <Button variant="mini" aria-label={`Descer ${a.rotulo}`} onClick={() => setLista(moverAtalho(lista, a.id, 1))}>↓</Button>
+                </>}
+              </div>
+            );
+          })}
+          <div className="row"><Button onClick={() => setLista(restaurarBarra(armazenamento()))}>Restaurar atalhos padrão</Button></div>
+        </Modal>
+      )}
+    </div>
+  );
+}
diff --git a/src/app/edificio/Edificio.tsx b/src/app/edificio/Edificio.tsx
index 01c4c69..224e71c 100644
--- a/src/app/edificio/Edificio.tsx
+++ b/src/app/edificio/Edificio.tsx
@@ -14,7 +14,7 @@ import { casosDaObra, casosParaCarga, comprimentoPolilinha, cotaFundacao, ehArra
 import { useStore } from '../store';
 import { PREMISSAS, TAXAS } from '../../core/building/premissas';
 import type { Diagnostico } from '../../core/building/verify';
-import { Button, Check, Dropdown, Group, Hint, Input, Note, NumField, Seg, Select, TextCell, TextField, Textarea, download } from '../ui';
+import { Button, Check, Dropdown, Group, Hint, Input, Note, NumField, Seg, Select, TextCell, TextField, Textarea, dataAjuda, download, useAjuda } from '../ui';
 import { combinacoesEdificio } from '../../core/building/combinacoes';
 import { MemorialEdificio } from './MemorialEdificio';
 import { PaletaComandos } from './PaletaComandos';
@@ -54,6 +54,9 @@ import { GerenciadorGabaritos, JanelaCapturas, VistasRapidas } from './Gabaritos
 import { ObrasRecentes } from './ObrasRecentes';
 import { ImportarTexto } from './ImportarTexto';
 import { DadosL4Grupo } from './DadosL4';
+import { BarraAtalhos } from './BarraAtalhos';
+import { GuiaRapidoDialogo } from './GuiaRapido';
+import type { Atalho } from '../../core/ajuda';
 import { CopiarGrupoDialogo, GruposCopiaGrupo, UnirPavimentosDialogo, type DialogoGrupos } from './GruposL4';
 import { DadosGeraisCorpo, DadosGeraisJanela } from './DadosGerais';
 import { ArquivoGrupo, EtapasGrupo } from './EtapasObra';
@@ -67,15 +70,22 @@ const corGrupo = (b: BuildingModel, id: string) => `grupo-c${Math.max(0, b.grupo
 const num = (t: string) => parseFloat(t.replace(',', '.'));
 
 export function Edificio() {
-  const { sessao, exec, novo, diags } = useBuilding();
+  const { sessao, exec, novo, diags, desfazer, refazer } = useBuilding();
+  const aj = useAjuda();
   const b = sessao.modelo;
   const ps = pavimentosOrdenados(b);
   const [aba, setAba] = useState<'planta' | 'vista3d' | 'elevacao' | 'verificacao' | 'analise' | 'dimensionamento' | 'pranchas' | 'premissas'>('planta');
   const [memo, setMemo] = useState(false);
   const [dialogoL1, setDialogoL1] = useState<null | 'nova' | 'recentes' | 'texto' | 'gerais'>(null);
   const [dialogoL2, setDialogoL2] = useState<null | { tipo: 'lancar'; inicial?: string } | { tipo: 'gabaritos' } | { tipo: 'vistas' }>(null);
-  const [dialogoL4, setDialogoL4] = useState<DialogoGrupos>(null);
+  const [dialogoL4, setDialogoL4] = useState<DialogoGrupos | 'guia'>(null);
   const janelaCapturas = usePlanta((s) => s.janelaCapturas);
+  const executarAtalho = (a: Atalho) => {
+    if (a.tipo === 'ferramenta') { setAba('planta'); usePlanta.getState().set({ ferramenta: a.alvo as Ferramenta, ...aoEscolher(a.alvo as Ferramenta) }); return; }
+    if (a.tipo === 'aba') { setAba(a.alvo as typeof aba); return; }
+    if (a.alvo === 'desfazer') desfazer(); else if (a.alvo === 'refazer') refazer(); else if (a.alvo === 'ajuda') aj.alternar();
+    else if (a.alvo === 'guia' || a.alvo === 'copiarGrupo' || a.alvo === 'unirPavimentos') setDialogoL4(a.alvo);
+  };
   const nErr = diags.filter((d) => d.severidade === 'erro').length;
   const irEtapa = (id: EtapaId) => {
     if (id === 'obra') { setDialogoL1('gerais'); return; }
@@ -89,13 +99,14 @@ export function Edificio() {
   return (
     <div className="edif">
       <aside className="fund-in edif-in">
+        <BarraAtalhos executar={executarAtalho} />
         <EtapasGrupo b={b} aoIr={irEtapa} />
         <Group title="Obra" aside={<span className="row"><Button variant="mini" onClick={() => setDialogoL1('nova')}>Nova obra…</Button><Button variant="mini" onClick={() => setDialogoL1('recentes')}>Obras recentes…</Button><Button variant="mini" onClick={() => novo(false)}>Novo padrão</Button><Button variant="mini" onClick={() => novo(true)}>Novo vazio</Button></span>}>
           <DadosGeraisCorpo b={b} />
         </Group>
 
         <Group title={`Pavimentos (${ps.length})`}>
-          <table className="data loads-ed edpav">
+          <table className="data loads-ed edpav" {...dataAjuda('barra:pavimentos')}>
             <thead><tr><th>Nome</th><th>Grupo</th><th>Cota (m)</th><th>Pé-dir.</th><th /></tr></thead>
             <tbody>
               {[...ps].reverse().map((p) => (
@@ -185,7 +196,7 @@ export function Edificio() {
       <section className="edif-main">
         <div className="edif-tabs" role="tablist">
           {([['planta', 'Planta'], ['vista3d', '3D'], ['elevacao', 'Elevação'], ['verificacao', `Verificação${diags.length ? ` (${diags.length})` : ''}`], ['analise', 'Análise'], ['dimensionamento', 'Dimensionamento'], ['pranchas', 'Pranchas'], ['premissas', 'Premissas']] as const).map(([k, l]) => (
-            <Button variant="nenhuma" key={k} type="button" role="tab" aria-selected={aba === k} className={`${aba === k ? 'on' : ''}${k === 'verificacao' && nErr ? ' bad' : ''}`} onClick={() => setAba(k)}>{l}</Button>
+            <Button variant="nenhuma" key={k} type="button" role="tab" aria-selected={aba === k} data-ajuda={`aba:${k}`} className={`${aba === k ? 'on' : ''}${k === 'verificacao' && nErr ? ' bad' : ''}`} onClick={() => setAba(k)}>{l}</Button>
           ))}
         </div>
         {aba === 'planta' && <><PlantaBarra b={b} /><Planta /><PainelEdicaoLajes /></>}
@@ -212,6 +223,7 @@ export function Edificio() {
       {dialogoL1 === 'nova' && <NovaObra onClose={() => setDialogoL1(null)} onCriada={() => setDialogoL1('gerais')} onTexto={() => setDialogoL1('texto')} onDxf={() => { setDialogoL1(null); setDialogoL2({ tipo: 'lancar' }); }} />}
       {dialogoL4 === 'copiarGrupo' && <CopiarGrupoDialogo b={b} onClose={() => setDialogoL4(null)} />}
       {dialogoL4 === 'unirPavimentos' && <UnirPavimentosDialogo b={b} onClose={() => setDialogoL4(null)} />}
+      {dialogoL4 === 'guia' && <GuiaRapidoDialogo obra={b.obra.nome} onClose={() => setDialogoL4(null)} />}
       {dialogoL2?.tipo === 'lancar' && <LancamentoDxf inicial={dialogoL2.inicial} onClose={() => setDialogoL2(null)} />}
       {dialogoL2?.tipo === 'gabaritos' && <GerenciadorGabaritos onClose={() => setDialogoL2(null)} onLancar={(id) => setDialogoL2({ tipo: 'lancar', inicial: id })} />}
       {dialogoL2?.tipo === 'vistas' && <VistasRapidas onClose={() => setDialogoL2(null)} />}
diff --git a/src/app/edificio/GuiaRapido.tsx b/src/app/edificio/GuiaRapido.tsx
new file mode 100644
index 0000000..28af363
--- /dev/null
+++ b/src/app/edificio/GuiaRapido.tsx
@@ -0,0 +1,40 @@
+// Guia rápido (L4, C1.13): reúne as ajudas das abas, ferramentas, barras e opções, gerado do catálogo de ajuda
+// (src/core/ajuda); as ajudas dos diálogos ficam de fora. Imprimível em A4 (mesmo CSS de impressão do memorial).
+import { useRef, type ReactNode } from 'react';
+import { guiaRapido } from '../../core/ajuda';
+import { memo } from '../design/tokens';
+import { MEMO_CSS, memoPrintCss, printHtmlDoc } from '../Memorial';
+import { useStore } from '../store';
+import { Button, Modal } from '../ui';
+
+/** Conteúdo do guia (usado na janela e como anexo opcional do memorial). */
+export function GuiaConteudo({ h2 }: { h2?: (t: string) => ReactNode }) {
+  const secoes = guiaRapido();
+  return (
+    <div data-guia-rapido>
+      {secoes.map((s) => (
+        <section key={s.grupo}>
+          {h2 ? h2(s.rotulo) : <h3>{s.rotulo}</h3>}
+          <dl className="id">
+            {s.itens.map((a) => <div key={a.id}><dt>{a.titulo}</dt><dd>{a.texto}</dd></div>)}
+          </dl>
+        </section>
+      ))}
+    </div>
+  );
+}
+
+export function GuiaRapidoDialogo({ onClose, obra }: { onClose: () => void; obra: string }) {
+  const doc = useRef<HTMLDivElement>(null);
+  const imprimir = () => {
+    const css = memoPrintCss({ title: 'Guia rápido', obra, rev: 'R00', date: new Date().toLocaleDateString('pt-BR') }).replace('Memorial de cálculo · ', '');
+    printHtmlDoc(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Guia rápido</title><style>body{margin:0;background:${memo('paper')}}${MEMO_CSS}${css}</style></head><body><div class="memo"><h1>Guia rápido</h1>${doc.current?.innerHTML ?? ''}</div></body></html>`);
+    useStore.getState().set({ message: 'Impressão do guia rápido: escolha “Salvar como PDF”.' });
+  };
+  return (
+    <Modal titulo="Guia rápido" larga onClose={onClose} ajuda="barra:ajuda" info="Reúne as ajudas das abas, das ferramentas, das barras e das opções de cálculo. As ajudas dos diálogos não entram.">
+      <div className="row"><Button variant="primary" onClick={imprimir}>Imprimir guia rápido</Button></div>
+      <div ref={doc} className="guia"><GuiaConteudo /></div>
+    </Modal>
+  );
+}
diff --git a/src/app/edificio/OpcoesCalculo.tsx b/src/app/edificio/OpcoesCalculo.tsx
index 1229434..fd68124 100644
--- a/src/app/edificio/OpcoesCalculo.tsx
+++ b/src/app/edificio/OpcoesCalculo.tsx
@@ -33,7 +33,7 @@ export function OpcoesGrupo({ b }: { b: BuildingModel }) {
       {OPCOES_INFO.map((o) => {
         const pad = padraoDe(o, perfil), dif = o.padraoNBR !== undefined && o.padraoNBR !== o.padrao;
         return (
-          <div key={o.chave} className="row wrap u-items-end">
+          <div key={o.chave} className="row wrap u-items-end" data-ajuda={`opcao:${o.chave}`}>
             {o.booleana
               ? <Check label={o.rotulo} checked={!!op[o.chave]} onChange={(c) => exec('opcoes.definir', { valores: { [o.chave]: c ? 1 : 0 } })} />
               : <NumField label={o.rotulo} unit={o.unidade} width={190} value={op[o.chave]} onChange={(v) => exec('opcoes.definir', { valores: { [o.chave]: v } })} />}
diff --git a/src/app/edificio/Planta.tsx b/src/app/edificio/Planta.tsx
index 1efa5d5..e023a56 100644
--- a/src/app/edificio/Planta.tsx
+++ b/src/app/edificio/Planta.tsx
@@ -29,7 +29,8 @@ import { aberturasNaPlanta } from './paredesLista';
 import type { PilarParede } from '../../core/building/types';
 import { useStore } from '../store';
 import { executarERecalcular, idsBloqueados } from './Armadura';
-import { Input } from '../ui';
+import { Input, useAjuda } from '../ui';
+import { ajudaDaFerramenta } from '../../core/ajuda';
 import { ancoraMaisProxima, ancorasRef, deslocamentoPorCliques, refDe, textosVisiveis } from '../../core/building/vistaObra';
 
 type P2 = [number, number];
@@ -180,6 +181,7 @@ const PASSOS: Record<Ferramenta, string[]> = {
 
 export function Planta() {
   const { sessao, exec, diags } = useBuilding();
+  const aj = useAjuda();
   const b = sessao.modelo;
   const pl = usePlanta();
   const pavs = pavimentosOrdenados(b);
@@ -1580,7 +1582,7 @@ export function Planta() {
   const passo = PASSOS[pl.ferramenta][Math.min(pontos.length, PASSOS[pl.ferramenta].length - 1)];
   return (
     <div className="planta">
-      <div ref={wrap} className="planta-cv" data-tema={pl.tema} data-nivel={nivelFund ? 'fundacao' : pav?.nome} onContextMenu={(e) => e.preventDefault()}>
+      <div ref={wrap} className="planta-cv" data-ajuda={`ferramenta:${pl.ferramenta}`} data-tema={pl.tema} data-nivel={nivelFund ? 'fundacao' : pav?.nome} onContextMenu={(e) => e.preventDefault()}>
         <canvas ref={cvM} />
         <canvas ref={cvE} />
         <canvas ref={cvI} className="int" data-ferramenta={pl.ferramenta} aria-label="Planta do pavimento" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
@@ -1595,14 +1597,29 @@ export function Planta() {
             onChange={(e) => setDigitando(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') confirmarDigitado(); if (e.key === 'Escape') setDigitando(null); e.stopPropagation(); }} onBlur={() => setDigitando(null)} />
         )}
       </div>
-      <div className="planta-st">
+      <div className="planta-st" data-ajuda={`ferramenta:${pl.ferramenta}`}>
         <span ref={statusRef} className="num">—</span>
         <span className="muted">{passo}</span>
+        {TECLA_FERRAMENTA[pl.ferramenta] && <span className="muted">Tecla {TECLA_FERRAMENTA[pl.ferramenta]}</span>}
       </div>
+      {aj.ligada && <AjudaFerramenta f={pl.ferramenta} />}
     </div>
   );
 }
 
+/** Ajuda da ferramenta ativa durante o lançamento (L4, C6.2): o que ela faz, os passos e a tecla. */
+function AjudaFerramenta({ f }: { f: Ferramenta }) {
+  const h = ajudaDaFerramenta(f, PASSOS[f], TECLA_FERRAMENTA[f]);
+  return (
+    <aside className="ajuda-ferr" aria-label="Ajuda da ferramenta ativa" data-ajuda-controle>
+      <b>{h.titulo}</b>
+      <p>{h.texto}</p>
+      <ol>{h.passos.map((x, i) => <li key={i}>{x}</li>)}</ol>
+      {h.tecla && <p className="hint">Tecla de atalho: {h.tecla}</p>}
+    </aside>
+  );
+}
+
 function cruzaRet(a: P2, z: P2, x0: number, y0: number, x1: number, y1: number) {
   const lados: [P2, P2][] = [[[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]]];
   const cr = (p: P2, q: P2, r: P2) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
```
