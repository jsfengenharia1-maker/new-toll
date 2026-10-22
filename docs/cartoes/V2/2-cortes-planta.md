# Cartão V2-2 — ferramentas Corte e Seção, marcas na planta, grupo e janelas

Executor: Haiku. Depende do cartão 1 (classes `corte-*`).

## Comportamento
- Ferramentas `corte` (poligonal; Enter, duplo clique ou botão direito termina) e `secao` (dois cliques) na planta. **Sem tecla própria** (todas as letras estão ocupadas) e **sem botão na barra da planta** (quebra os e2e de fundação): a entrada é o grupo "Cortes e seções" da barra lateral e a paleta Ctrl+K (`ROTULO_FERRAMENTA` já a põe lá).
- Ao terminar o corte ou a seção, `plantaStore.janelaCorte` abre a janela (`JanelaCorte`, montada em `Edificio.tsx`): elevação hachurada do corte, ou diagrama da seção com a tabela de vãos (`data-secao-vaos`) e o seletor "Pavimento da seção".
- Marcas na planta (Canvas 2D, cor `cores.janela` da paleta; nada de cor nova): traço e ponto, seta para o lado visto e o nome nas pontas; as linhas de seção do pavimento ativo com círculos nas pontas e o nome. Ligam/desligam pelo Check "Mostrar cortes e seções na planta" (`mostrarCortes`, não vai para o arquivo).
- Grupo "Cortes e seções" (`CortesGrupo`): lado visto e profundidade do próximo corte (0 = até o fim do edifício), botões para traçar, lista de cortes (nome editável, lado, profundidade, abrir, apagar) e de seções (nome, abrir, apagar).

## Rótulos (únicos; use exatamente estes)
| Controle | Rótulo |
|---|---|
| Select (grupo) | `Lado visto do novo corte` |
| NumField (grupo) | `Profundidade do novo corte` |
| Botões | `Traçar corte na planta`, `Traçar linha de seção na planta` |
| Check | `Mostrar cortes e seções na planta` |
| TextCell por corte / seção | `Nome do corte <nome>`, `Nome da seção <nome>` |
| Select por corte | `Lado visto de <nome>` |
| NumField por corte | `Profundidade de <nome>` |
| Botões por item | `Abrir <nome>`, `Apagar <nome>` |
| Janelas (Modal) | `Corte — <nome>`, `Seção — <nome>` |
| Select na janela da seção | `Pavimento da seção` |
Atributos para o e2e: `data-cortes-lancar`, `data-cortes-lista`, `data-secoes-lista`, `data-corte`, `data-secao`, `data-janela-corte`, `data-janela-secao`, `data-secao-vaos`.

## Núcleo usado (já existe)
- `src/core/commands/cortes.ts`: comandos `corte.criar { pontos, sentido, profundidade? }`, `corte.editar { id, nome?, pontos?, sentido?, profundidade? (0 = até o fim) }`, `corte.remover { ids }`, `secao.criar { a, b, nome?, pavimento? }`, `secao.editar`, `secao.remover`; dados em `b.cortes?` e `b.secoes?` (`CorteEdificio`, `LinhaSecao` em `building/types.ts`).
- `src/core/vista3d/corte.ts`: `cortarCena(cena, corte)`, `desenharCorte(b, corte, { cena?, idSvg? })` (devolve `svg`, `cena` com `secoes[]`/`vistos[]`, `niveis`, `eixos`, `cotas`), `secaoDoPavimento(b, linha, pavimentoId?)` (devolve `svg`, `elementos`, `apoios`, `vaos`).
- `src/core/vista3d/armaduras3d.ts`: `armaduras3D(b, dim, { elementos?, pavimentos?, tipos?, limiteSegmentos? })`, `camadasDeArmadura(a, por)`, `malhaDeTubos(linhas, raio)`, `cenaDoElemento(b, dim, origem, id, pavimento?)`.

## Diff esperado
```diff
diff --git a/src/app/edificio/CortesUI.tsx b/src/app/edificio/CortesUI.tsx
new file mode 100644
index 0000000..efbf215
--- /dev/null
+++ b/src/app/edificio/CortesUI.tsx
@@ -0,0 +1,104 @@
+// Cortes do edifício e linhas de seção (V2): grupo da barra lateral (lançar, nomear, lado visto, profundidade, apagar) e
+// janela com a elevação do corte ou com o diagrama da seção do pavimento. A geometria vem de core/vista3d/corte.ts.
+import { useMemo } from 'react';
+import { Button, Check, Group, Hint, Modal, NumField, Select, TextCell } from '../ui';
+import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';
+import { construirCena } from '../../core/vista3d/cena';
+import { desenharCorte, secaoDoPavimento } from '../../core/vista3d/corte';
+import { useBuilding } from './store';
+import { usePlanta } from './plantaStore';
+
+const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
+const LADOS = [{ v: 'esq' as const, label: 'esquerda do traçado' }, { v: 'dir' as const, label: 'direita do traçado' }];
+
+/** Grupo "Cortes e seções" da barra lateral. */
+export function CortesGrupo({ b, onPlanta }: { b: BuildingModel; onPlanta?: () => void }) {
+  const { exec } = useBuilding();
+  const pl = usePlanta();
+  const cs = b.cortes ?? [], ss = b.secoes ?? [];
+  const ps = pavimentosOrdenados(b);
+  const abrir = (tipo: 'corte' | 'secao', id: string) => pl.set({ janelaCorte: { tipo, id } });
+  return (
+    <Group title={`Cortes e seções (${cs.length + ss.length})`} open={cs.length + ss.length > 0}>
+      <div className="row wrap" data-cortes-lancar>
+        <Select label="Lado visto do novo corte" value={pl.corteLanc.sentido} options={LADOS} onChange={(v) => pl.set({ corteLanc: { ...pl.corteLanc, sentido: v } })} />
+        <NumField label="Profundidade do novo corte" unit="m" width={120} value={pl.corteLanc.profundidade} onChange={(v) => pl.set({ corteLanc: { ...pl.corteLanc, profundidade: Math.max(0, v) } })} />
+      </div>
+      <div className="row wrap">
+        <Button onClick={() => { pl.set({ ferramenta: 'corte' }); onPlanta?.(); }}>Traçar corte na planta</Button>
+        <Button onClick={() => { pl.set({ ferramenta: 'secao' }); onPlanta?.(); }}>Traçar linha de seção na planta</Button>
+        <Check label="Mostrar cortes e seções na planta" checked={pl.mostrarCortes} onChange={(v) => pl.set({ mostrarCortes: v })} />
+      </div>
+      <Hint>Profundidade 0 = até o fim do edifício. O corte olha para o lado escolhido do traçado, no sentido em que os pontos foram dados.</Hint>
+      {cs.length > 0 && (
+        <div className="corte-lista" data-cortes-lista>
+          {cs.map((c) => (
+            <div key={c.id} className="corte-item" data-corte={c.id}>
+              <TextCell value={c.nome} label={`Nome do corte ${c.nome}`} onCommit={(v) => exec('corte.editar', { id: c.id, nome: v })} />
+              <Select aria-label={`Lado visto de ${c.nome}`} value={c.sentido} options={LADOS} onChange={(v) => exec('corte.editar', { id: c.id, sentido: v })} />
+              <NumField label={`Profundidade de ${c.nome}`} unit="m" width={110} value={c.profundidade ?? 0} onChange={(v) => exec('corte.editar', { id: c.id, profundidade: Math.max(0, v) })} />
+              <Button variant="mini" onClick={() => abrir('corte', c.id)}>{`Abrir ${c.nome}`}</Button>
+              <Button variant="mini" aria-label={`Apagar ${c.nome}`} onClick={() => exec('corte.remover', { ids: [c.id] })}>×</Button>
+            </div>
+          ))}
+        </div>
+      )}
+      {ss.length > 0 && (
+        <div className="corte-lista" data-secoes-lista>
+          {ss.map((s) => (
+            <div key={s.id} className="corte-item" data-secao={s.id}>
+              <TextCell value={s.nome} label={`Nome da seção ${s.nome}`} onCommit={(v) => exec('secao.editar', { id: s.id, nome: v })} />
+              <span className="muted">{ps.find((p) => p.id === s.pavimento)?.nome ?? 'pavimento de lançamento'}</span>
+              <Button variant="mini" onClick={() => abrir('secao', s.id)}>{`Abrir ${s.nome}`}</Button>
+              <Button variant="mini" aria-label={`Apagar ${s.nome}`} onClick={() => exec('secao.remover', { ids: [s.id] })}>×</Button>
+            </div>
+          ))}
+        </div>
+      )}
+    </Group>
+  );
+}
+
+/** Janela do corte ou da seção aberta em `plantaStore.janelaCorte` (abre sozinha ao traçar). */
+export function JanelaCorte() {
+  const b = useBuilding((s) => s.sessao.modelo);
+  const rev = useBuilding((s) => s.rev);
+  const dim = useBuilding((s) => s.dim);
+  const j = usePlanta((s) => s.janelaCorte);
+  const plPav = usePlanta((s) => s.pavimento);
+  const set = usePlanta((s) => s.set);
+  const corte = j?.tipo === 'corte' ? b.cortes?.find((c) => c.id === j.id) : undefined;
+  const secao = j?.tipo === 'secao' ? b.secoes?.find((c) => c.id === j.id) : undefined;
+  const ps = pavimentosOrdenados(b);
+  const pavSecao = secao ? (ps.some((p) => p.id === secao.pavimento) ? secao.pavimento! : ps.some((p) => p.id === plPav) ? plPav! : ps[0]?.id ?? '') : '';
+  const des = useMemo(() => (corte ? desenharCorte(b, corte, { cena: construirCena(b, { fundacoes: dim?.fundacoes, vigasFundacao: dim?.vigasFundacao }) }) : null), [b, rev, corte, dim?.fundacoes, dim?.vigasFundacao]);
+  const sec = useMemo(() => (secao ? secaoDoPavimento(b, secao, pavSecao) : null), [b, rev, secao, pavSecao]);
+  if (!j || (!corte && !secao)) return null;
+  const fechar = () => set({ janelaCorte: null });
+  return (
+    <Modal titulo={corte ? `Corte — ${corte.nome}` : `Seção — ${secao!.nome}`} onClose={fechar} larga>
+      {des && (
+        <div data-janela-corte={corte!.id}>
+          <div className="corte-folha" dangerouslySetInnerHTML={{ __html: des.svg }} />
+          <p className="muted">{des.cena.secoes.length} polígono(s) seccionado(s); {des.cena.vistos.length} elemento(s) vistos além do plano{corte!.profundidade ? ` até ${fmt(corte!.profundidade)} m` : ''}. Níveis: {des.niveis.map((n) => `${n.nome} ${fmt(n.cota)}`).join(' · ')}.</p>
+        </div>
+      )}
+      {sec && secao && (
+        <div data-janela-secao={secao.id}>
+          <div className="row wrap">
+            <Select label="Pavimento da seção" value={pavSecao} options={[...ps].reverse().map((p) => ({ v: p.id, label: p.nome }))} onChange={(v) => useBuilding.getState().exec('secao.editar', { id: secao.id, pavimento: v })} />
+          </div>
+          <div className="corte-folha" dangerouslySetInnerHTML={{ __html: sec.svg }} />
+          <table className="data quadro" data-secao-vaos>
+            <thead><tr><th>Vão entre</th><th>Livre (m)</th><th>Eixo a eixo (m)</th><th>Laje</th></tr></thead>
+            <tbody>
+              {sec.vaos.map((v, i) => <tr key={i}><td>{v.apoioIni} — {v.apoioFim}</td><td className="num">{fmt(v.livre)}</td><td className="num">{fmt(v.eixo)}</td><td>{v.laje ? 'sim' : 'não'}</td></tr>)}
+              {!sec.vaos.length && <tr><td colSpan={4} className="muted">A linha não cruza dois apoios neste pavimento.</td></tr>}
+            </tbody>
+          </table>
+          <p className="muted">Comprimento da linha {fmt(sec.comprimento)} m · {sec.elementos.length} elemento(s) cortado(s) em {sec.pavimentoNome}.</p>
+        </div>
+      )}
+    </Modal>
+  );
+}
diff --git a/src/app/edificio/Edificio.tsx b/src/app/edificio/Edificio.tsx
index 1f3cc1f..5921c9b 100644
--- a/src/app/edificio/Edificio.tsx
+++ b/src/app/edificio/Edificio.tsx
@@ -33,6 +33,7 @@ import { CartaoPilaresParede, PilaresParedeGrupo } from './PilarParedeUI';
 import { CartaoParedes } from './ParedesUI';
 import { CartaoAlvenaria } from './AlvenariaResumo';
 import { ParedesGrupo } from './ParedesUI';
+import { CortesGrupo, JanelaCorte } from './CortesUI';
 import { MurosGrupo } from './MurosUI';
 import { AlvenariaGrupo } from './AlvenariaUI';
 import { CasosGrupo } from './Casos';
@@ -121,6 +122,7 @@ export function Edificio() {
         <LajesGrupo b={b} />
         <FundacaoGrupo b={b} onPlanta={() => setAba('planta')} />
         <CargasGrupo b={b} />
+        <CortesGrupo b={b} onPlanta={() => setAba('planta')} />
         <VentoGrupo b={b} />
         <AbacosVentoGrupo b={b} />
         <CasosGrupo b={b} />
@@ -202,6 +204,7 @@ export function Edificio() {
       {dialogoL1 === 'texto' && <ImportarTexto onClose={() => setDialogoL1(null)} onCriada={() => { setDialogoL1(null); useStore.getState().set({ module: 'fundacoes' }); }} />}
       {dialogoL1 === 'gerais' && <DadosGeraisJanela b={b} onClose={() => setDialogoL1(null)} />}
       <JanelaElemento />
+      <JanelaCorte />
       <PaletaComandos setAba={(a) => setAba(a as typeof aba)} />
     </div>
   );
diff --git a/src/app/edificio/Planta.tsx b/src/app/edificio/Planta.tsx
index 414b25d..96d015d 100644
--- a/src/app/edificio/Planta.tsx
+++ b/src/app/edificio/Planta.tsx
@@ -33,7 +33,7 @@ import { Input } from '../ui';
 type P2 = [number, number];
 const RAIO_PX = 12;
 /** Ferramentas de polilinha: Enter, duplo clique e botão direito terminam. */
-const POLILINHAS = ['viga', 'laje', 'carga', 'limite', 'radier', 'vigaElastica', 'corrida', 'parede'];
+const POLILINHAS = ['viga', 'laje', 'carga', 'limite', 'radier', 'vigaElastica', 'corrida', 'parede', 'corte'];
 const dprAtual = () => Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
 const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
 const msg = (m: string) => useStore.getState().set({ message: m });
@@ -130,7 +130,7 @@ const distSeg = (p: P2, a: P2, z: P2) => {
 /** Nome de cada ferramenta (barra da planta, paleta e repetição pelo Enter) e a tecla de atalho. */
 export const ROTULO_FERRAMENTA: Record<Ferramenta, string> = {
   selecionar: 'Selecionar', pilar: 'Pilar', viga: 'Viga', laje: 'Laje', carga: 'Carga', eixo: 'Eixo', fundacao: 'Fundação', vigaFund: 'Viga de fundação', girarFund: 'Girar 2 pontos', insFund: 'Ponto de inserção', radier: 'Radier', vigaElastica: 'Viga sobre base elástica', corrida: 'Sapata corrida', limite: 'Limite da fundação', limiteMascara: 'Limite pela máscara', mover: 'Mover', medir: 'Medir', alinhar: 'Alinhar máscara',
-  dividir: 'Dividir viga', unir: 'Unir vigas', prolongar: 'Prolongar viga', copiar: 'Copiar', girar: 'Girar', espelhar: 'Espelhar', puncao: 'Armadura de punção', zonaLaje: 'Zona de uniformização', linhaDobra: 'Linha de dobra', pilarParede: 'Pilar-parede', parede: 'Parede de concreto',
+  dividir: 'Dividir viga', unir: 'Unir vigas', prolongar: 'Prolongar viga', copiar: 'Copiar', girar: 'Girar', espelhar: 'Espelhar', puncao: 'Armadura de punção', zonaLaje: 'Zona de uniformização', corte: 'Corte do edifício', secao: 'Linha de seção', linhaDobra: 'Linha de dobra', pilarParede: 'Pilar-parede', parede: 'Parede de concreto',
 };
 export const TECLA_FERRAMENTA: Partial<Record<Ferramenta, string>> = { selecionar: 'S', pilar: 'P', viga: 'V', laje: 'L', carga: 'C', eixo: 'E', fundacao: 'U', vigaFund: 'B', girarFund: 'K', insFund: 'N', radier: 'W', vigaElastica: 'X', corrida: 'A', limite: 'T', limiteMascara: 'Q', mover: 'M', medir: 'D', dividir: 'I', unir: 'J', prolongar: 'O', copiar: 'Y', girar: 'G', espelhar: 'H', puncao: 'Z' };
 
@@ -155,6 +155,8 @@ const PASSOS: Record<Ferramenta, string[]> = {
   insFund: ['Clique no elemento de fundação (sapata ou bloco) cujo ponto de inserção quer mover.', 'Clique no novo centro do elemento (posição livre; o pilar fica excêntrico).'],
   limite: ['Primeiro vértice do limite (divisa, poço, reservatório); “Limite fechado” na barra fecha a polilinha.', 'Próximo vértice; Enter ou botão direito termina; Esc cancela.'],
   limiteMascara: ['Clique sobre uma linha da máscara DXF: a polilinha ligada a ela vira o limite da fundação.'],
+  corte: ['Clique os vértices do traçado do corte (capturas valem; Enter, duplo clique ou botão direito termina; Esc cancela). O lado visto e a profundidade ficam no grupo Cortes e seções.'],
+  secao: ['Primeiro ponto da linha de seção do pavimento.', 'Segundo ponto: a seção abre em uma janela.'],
   zonaLaje: ['Primeiro ponto da zona de uniformização das armaduras das lajes (linha ou canto do retângulo; forma, face e direção na barra).', 'Segundo ponto (outro canto, ou o fim da linha).'],
   linhaDobra: ['Primeiro ponto da linha de dobra das lajes (negativo máximo e emenda preferencial da armadura inferior).', 'Segundo ponto da linha.'],
   puncao: ['Clique num pilar que apoia a laje sem viga: adiciona (ou apaga, conforme o modo da barra) o grupo de armadura de punção informado. Calcule o dimensionamento antes; Esc volta a Selecionar.'],
@@ -410,6 +412,33 @@ export function Planta() {
     ctx.drawImage(s.cache, 0, 0);
   };
 
+  /** Marcas dos cortes (traço e ponto, seta para o lado visto e nome nas pontas) e das linhas de seção do pavimento (V2). */
+  const marcasDeCorte = (ctx: CanvasRenderingContext2D) => {
+    if (!pl.mostrarCortes) return;
+    ctx.save();
+    ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
+    ctx.strokeStyle = cores.janela; ctx.fillStyle = cores.janela; ctx.lineWidth = 2;
+    for (const c of b.cortes ?? []) {
+      const pts = c.pontos.map((q) => paraTela(q[0], q[1]));
+      ctx.setLineDash([16, 5, 3, 5]); ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); ctx.setLineDash([]);
+      for (const ini of [true, false]) {
+        const a = ini ? pts[0] : pts[pts.length - 1], z = ini ? pts[1] : pts[pts.length - 2], L = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1;
+        const ux = ((ini ? 1 : -1) * (z[0] - a[0])) / L, uy = ((ini ? 1 : -1) * (z[1] - a[1])) / L, lado = c.sentido === 'esq' ? 1 : -1;
+        const nx = lado * uy, ny = -lado * ux, fx = a[0] + nx * 26, fy = a[1] + ny * 26;
+        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(fx, fy); ctx.moveTo(fx, fy); ctx.lineTo(fx - nx * 8 + ny * 5, fy - ny * 8 - nx * 5); ctx.moveTo(fx, fy); ctx.lineTo(fx - nx * 8 - ny * 5, fy - ny * 8 + nx * 5); ctx.stroke();
+        ctx.fillText(c.nome, a[0] - ux * 18, a[1] - uy * 18);
+      }
+    }
+    for (const sc of b.secoes ?? []) {
+      if (sc.pavimento && sc.pavimento !== pav?.id) continue;
+      const a = paraTela(sc.a[0], sc.a[1]), z = paraTela(sc.b[0], sc.b[1]);
+      ctx.setLineDash([]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(z[0], z[1]); ctx.stroke();
+      for (const q of [a, z]) { ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, 2 * Math.PI); ctx.fill(); }
+      ctx.fillText(sc.nome, (a[0] + z[0]) / 2, (a[1] + z[1]) / 2 - 10);
+    }
+    ctx.restore();
+  };
+
   const desenharModelo = () => {
     const v = vista, ctx = prep(cvE.current);
     if (!v || !ctx) return;
@@ -795,6 +824,7 @@ export function Planta() {
         ctx.fillText(rot, Math.min(...xs) + 4, Math.max(...ys) - 4);
       }
     }
+    if (!nivelFund) marcasDeCorte(ctx);
   };
 
   const glifo = (ctx: CanvasRenderingContext2D, c: Captura) => {
@@ -872,6 +902,12 @@ export function Planta() {
         ctx.fillText(`${esc.length} pilar${esc.length === 1 ? '' : 'es'} escolhido${esc.length === 1 ? '' : 's'}${esc.length >= 2 ? ' — Enter cria' : ' — escolha ao menos mais um'}`, cen[0][0] + 10, cen[0][1] - 14);
       }
     }
+    // corte e linha de seção em desenho: vértices dados e o trecho até o cursor
+    if ((pl.ferramenta === 'corte' || pl.ferramenta === 'secao') && pontos.length && !s.pan) {
+      const tela = [...pontos, s.ponto].map((q) => paraTela(q[0], q[1]));
+      ctx.strokeStyle = cores.janela; ctx.lineWidth = 2; ctx.setLineDash([16, 5, 3, 5]);
+      ctx.beginPath(); tela.forEach((c, i) => (i ? ctx.lineTo(...c) : ctx.moveTo(...c))); ctx.stroke(); ctx.setLineDash([]);
+    }
     // limite em desenho: vértices já dados e o trecho até o cursor (fecha ao primeiro vértice se for fechado)
     if (pl.ferramenta === 'limite' && nivelFund && pontos.length && !s.pan) {
       const tela = [...pontos, s.ponto].map((q) => paraTela(q[0], q[1]));
@@ -1234,6 +1270,14 @@ export function Planta() {
       exec('viga.prolongar', { id, extremidade: ext, ate });
       return;
     }
+    if (f === 'secao') {
+      if (novos.length < 2) { setPontos(novos); return; }
+      setPontos([]);
+      const r = exec('secao.criar', { a: [+novos[0][0].toFixed(4), +novos[0][1].toFixed(4)], b: [+novos[1][0].toFixed(4), +novos[1][1].toFixed(4)], ...(!nivelFund && pav ? { pavimento: pav.id } : {}) });
+      const nova = useBuilding.getState().sessao.modelo.secoes?.at(-1);
+      if (r.ok && nova) usePlanta.getState().set({ janelaCorte: { tipo: 'secao', id: nova.id } });
+      return;
+    }
     if (f === 'copiar' && novos.length === 2) {
       const dx = +(novos[1][0] - novos[0][0]).toFixed(4), dy = +(novos[1][1] - novos[0][1]).toFixed(4), vezes = Math.max(1, Math.round(pl.copias));
       const sel = selecionados();
@@ -1283,6 +1327,15 @@ export function Planta() {
       if (pts.length >= (fechado ? 3 : 2)) exec('limite.criar', { pontos: q, ...(fechado ? { fechado: true } : {}) }); else msg(fechado ? 'Limite fechado: ao menos 3 vértices.' : 'Limite: ao menos 2 vértices.');
       setPontos([]); return;
     }
+    if (f === 'corte') {
+      const cl = usePlanta.getState().corteLanc;
+      if (pts.length >= 2) {
+        const r = exec('corte.criar', { pontos: q, sentido: cl.sentido, ...(cl.profundidade > 0 ? { profundidade: cl.profundidade } : {}) });
+        const novo = useBuilding.getState().sessao.modelo.cortes?.at(-1);
+        if (r.ok && novo) usePlanta.getState().set({ janelaCorte: { tipo: 'corte', id: novo.id } });
+      } else msg('Corte: ao menos 2 pontos.');
+      setPontos([]); return;
+    }
     if (f === 'parede') { if (pts.length >= 2) exec('parede.criar', { ...(usePlanta.getState().pwParams ?? {}), pontos: q }); else msg('Parede: ao menos 2 pontos.'); setPontos([]); return; }
     if (f === 'radier') { if (pts.length >= 3) exec('radier.criar', { contorno: q, h: usePlanta.getState().hRadier }); else msg('Radier: ao menos 3 vértices.'); setPontos([]); return; }
     if (f === 'corrida') {
diff --git a/src/app/edificio/plantaStore.ts b/src/app/edificio/plantaStore.ts
index 924afc0..d44c9a7 100644
--- a/src/app/edificio/plantaStore.ts
+++ b/src/app/edificio/plantaStore.ts
@@ -6,7 +6,7 @@ import { cssVar } from '../design/tokens';
 import { EVENTO_TEMA, temaEfetivo } from '../design/tema';
 
 export type Ferramenta = 'selecionar' | 'pilar' | 'viga' | 'laje' | 'carga' | 'eixo' | 'mover' | 'medir' | 'alinhar' | 'fundacao' | 'vigaFund' | 'girarFund'
-  | 'limite' | 'limiteMascara' | 'insFund' | 'radier' | 'vigaElastica' | 'corrida' | 'dividir' | 'unir' | 'prolongar' | 'copiar' | 'girar' | 'espelhar' | 'puncao' | 'zonaLaje' | 'linhaDobra' | 'pilarParede' | 'parede';
+  | 'limite' | 'limiteMascara' | 'insFund' | 'radier' | 'vigaElastica' | 'corrida' | 'dividir' | 'unir' | 'prolongar' | 'copiar' | 'girar' | 'espelhar' | 'puncao' | 'zonaLaje' | 'linhaDobra' | 'pilarParede' | 'parede' | 'corte' | 'secao';
 /** Ferramentas que só existem no nível de fundação; as que mantêm a seleção ao serem escolhidas (agem sobre ela ou sobre um elemento). */
 export const FERRAMENTAS_FUNDACAO: Ferramenta[] = ['fundacao', 'vigaFund', 'girarFund', 'limite', 'limiteMascara', 'insFund', 'radier', 'vigaElastica', 'corrida'];
 export const MANTEM_SELECAO: Ferramenta[] = ['girarFund', 'insFund'];
@@ -86,6 +86,10 @@ interface PState {
   ppParams: Record<string, unknown> | null;
   /** Ferramenta Parede de concreto (E1c): parâmetros do lançamento (espessura, nasce, morre, base), sem tipo próprio. */
   pwParams: Record<string, unknown> | null;
+  /** Cortes do edifício e linhas de seção (V2): lado visto e profundidade (m; 0 = até o fim) do próximo corte, marcas na planta e janela aberta. */
+  corteLanc: { sentido: 'esq' | 'dir'; profundidade: number };
+  mostrarCortes: boolean;
+  janelaCorte: { tipo: 'corte' | 'secao'; id: string } | null;
   alinharEscala: boolean;
   secaoViga: { b: number; h: number };
   alinhamento: Alinhamento;
@@ -163,6 +167,9 @@ export const usePlanta = create<PState>((set) => ({
   ppAngulo: 0,
   ppParams: null,
   pwParams: null,
+  corteLanc: { sentido: 'esq', profundidade: 0 },
+  mostrarCortes: true,
+  janelaCorte: null,
   alinharEscala: false,
   secaoViga: { b: 0.15, h: 0.4 },
   alinhamento: 'centro',
```

## Verificação
```bash
npx tsc -b
npx vitest run src/app/design/design.test.ts src/core/commands
```
Esperado: tsc limpo, 10 testes do design system e os de comandos passam. O comportamento fica coberto pelo e2e do cartão 6.
