# E3b — cartão 3: relatório de esforços da vigota, memorial das vigotas por ficha e e2e `E3b`

Classe: Haiku (janela com diagramas existentes, seção de memorial no padrão `MemorialInclinadas`, fluxo e2e e checklists).

## Arquivos (5)
1. `src/app/edificio/VigotasFicha.tsx`: botão e janela "Relatório de esforços da vigota" (diff abaixo, sobre o arquivo do cartão 1).
2. **Novo** `src/app/edificio/MemorialVigotasFicha.tsx` com o conteúdo exato abaixo.
3. `src/app/edificio/MemorialEdificio.tsx`: a seção "Lajes treliçadas" passa a listar só as treliçadas e entra a nova seção (diff abaixo).
4. `e2e/flows.mjs`: fluxo `E3b` (diff abaixo; inserir no fim do vetor `flows`, depois do `E3a`).
5. Checklists (ver o último item).

## Núcleo usado (já existe)
`relatorioEsforcos(b, an, resultado, indice)` (`vigotasRelatorio.ts`: envoltórias de momento, cortante e torção do alinhamento, croqui do grupo de pavimentos e da vigota), `vigotasNoMemorial`, `quantitativoVigotas` e `quantitativoMoldadas` (já calculados em `dim.quantitativoVigotas` e `dim.quantitativoMoldadas`), `Diagrama` (`Revisao.tsx`) e `Modal` (`ui`).

## Regras
Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus). Rótulos únicos na tela. Sem CSS novo, sem cor literal, sem botão na barra da planta. Nos testes de interface (`e2e/flows.mjs`), `getByRole`/`getByLabel` com `{ exact: true }`, exceto `NumField` e `Select`, cujo rótulo vem com texto extra: nesses, regex ancorada (`/^Tipo da série/`). O núcleo e os comandos (`vigota.*`, `laje.exposicao`, `laje.momentosMin`, `armadura.desbloquear`) já existem e estão testados; não altere nada de `src/core/`.

Rótulos: "Relatório de esforços da vigota" (botão), janela "Relatório de esforços da vigota N" (`Modal`), diagramas `rel-M`, `rel-V`, `rel-T`, croqui `data-croqui-vigota`; memorial: seção "Vigotas por ficha e moldadas no local" (`data-memorial-vigotas-ficha`, `data-memorial-quantitativo-vigotas`, `data-memorial-quantitativo-moldadas`). O botão "Recalcular" substitui "Calcular e dimensionar" depois do primeiro cálculo; a janela do relatório tem o seu próprio "Fechar".

## Diff de `src/app/edificio/VigotasFicha.tsx` (sobre o arquivo do cartão 1)
```diff
--- a/src/app/edificio/VigotasFicha.tsx
+++ b/src/app/edificio/VigotasFicha.tsx
@@ -6,10 +6,11 @@
 import { useBuilding } from './store';
 import { executarERecalcular } from './Armadura';
 import { fmt, phiTxt } from './Detalhamento';
-import { Mensagens } from './Revisao';
-import { Button, Hint, KV, NumField, Pill, Select, Seg } from '../ui';
+import { Diagrama, Mensagens } from './Revisao';
+import { Button, Hint, KV, Modal, NumField, Pill, Select, Seg } from '../ui';
 import { fichaPor } from '../../core/building/tiposLaje';
 import type { GrupoVigotas, ResultadoVigotas, VigotaIndividual } from '../../core/building/vigotas';
+import { relatorioEsforcos } from '../../core/building/vigotasRelatorio';
 
 const num = (v: number, d = 2) => fmt(v, d);
 const BITOLAS = [6.3, 8, 10, 12.5, 16, 20, 25].map((v) => ({ v, label: `φ${String(v).replace('.', ',')}` }));
@@ -121,8 +122,35 @@
     : [['Flecha', 'sem resultado para esta vigota']];
 }
 
+/** Relatório de esforços da vigota (C7.193): envoltórias de momento, cortante e torção do alinhamento e croqui do grupo de pavimentos. */
+function RelatorioVigota({ r, v, onClose }: { r: ResultadoVigotas; v: VigotaIndividual; onClose: () => void }) {
+  const b = useBuilding((s) => s.sessao.modelo), an = useBuilding((s) => s.analise);
+  const rel = an ? relatorioEsforcos(b, an, r, v.indice) : null;
+  const W = 420, m = 14, xs = rel ? rel.croqui.contorno.map((p) => p[0]) : [0, 1], ys = rel ? rel.croqui.contorno.map((p) => p[1]) : [0, 1];
+  const x0 = Math.min(...xs), y0 = Math.min(...ys), esc = (W - 2 * m) / Math.max(Math.max(...xs) - x0, 0.5), H = (Math.max(...ys) - y0) * esc + 2 * m;
+  const X = (q: number) => +(m + (q - x0) * esc).toFixed(1), Y = (q: number) => +(H - m - (q - y0) * esc).toFixed(1);
+  return (
+    <Modal titulo={`Relatório de esforços da vigota ${v.indice + 1}`} onClose={onClose} larga>
+      {!rel ? <p className="muted">Sem esforços da grelha para esta vigota: calcule o edifício.</p> : (
+        <div data-relatorio-vigota={v.indice}>
+          <p className="small">{rel.combinacao}. Pavimentos do grupo: {rel.pavimentos.join(', ')}. Esforços por nervura, no alinhamento da grelha mais próximo da vigota.</p>
+          <svg className="det" viewBox={`0 0 ${W} ${H.toFixed(0)}`} role="img" aria-label="Croqui do grupo de pavimentos e da vigota" data-croqui-vigota>
+            <path d={rel.croqui.contorno.map((p, i) => `${i ? 'L' : 'M'}${X(p[0])},${Y(p[1])}`).join('') + 'Z'} className="det-contorno" />
+            {rel.croqui.vigotas.map((q, i) => <line key={i} x1={X(q[0][0])} y1={Y(q[0][1])} x2={X(q[1][0])} y2={Y(q[1][1])} className="member st-ok" />)}
+            <line x1={X(rel.croqui.vigota[0][0])} y1={Y(rel.croqui.vigota[0][1])} x2={X(rel.croqui.vigota[1][0])} y2={Y(rel.croqui.vigota[1][1])} className="member sel" />
+          </svg>
+          <Diagrama id="rel-M" titulo="Momento por nervura" unid="kN·m" xs={rel.x} L={rel.x.at(-1) ?? 0} baixo cor="dg-m" series={[{ ys: rel.Mmax, rot: 'Mmax' }, { ys: rel.Mmin, rot: 'Mmin', alt: true }]} />
+          <Diagrama id="rel-V" titulo="Cortante por nervura" unid="kN" xs={rel.x} L={rel.x.at(-1) ?? 0} cor="dg-v" series={[{ ys: rel.V, rot: 'V' }]} />
+          <Diagrama id="rel-T" titulo="Torção por nervura" unid="kN·m" xs={rel.x} L={rel.x.at(-1) ?? 0} cor="dg-m" series={[{ ys: rel.T, rot: 'T' }]} />
+        </div>
+      )}
+    </Modal>
+  );
+}
+
 function PainelVigota({ r, v }: { r: ResultadoVigotas; v: VigotaIndividual }) {
   const [painel, setPainel] = useState<Painel>('pos');
+  const [relatorio, setRelatorio] = useState(false);
   const g = r.grupos[v.grupo];
   if (!g) return null;
   return (
@@ -131,6 +159,8 @@
       <Seg value={painel} options={PAINEIS} onChange={setPainel} small />
       <KV rows={linhasPainel(r, v, g, painel)} />
       {v.mensagens.length > 0 && <Mensagens msgs={v.mensagens} />}
+      <Button onClick={() => setRelatorio(true)}>Relatório de esforços da vigota</Button>
+      {relatorio && <RelatorioVigota r={r} v={v} onClose={() => setRelatorio(false)} />}
     </section>
   );
 }
```

## Conteúdo de `src/app/edificio/MemorialVigotasFicha.tsx`
```tsx
// Memorial das vigotas por ficha e moldadas no local (frente E3b): vigotas por tipo da série, classe de agressividade e nível
// de protensão, momentos de serviço comparados com o da ficha, redistribuição, vigotas à parte, erros e avisos, e o
// quantitativo (vigotas por tipo e armaduras das moldadas). Os dados vêm do núcleo (`vigotasNoMemorial`, `quantitativoVigotas`).
import type { ReactNode } from 'react';
import { fmt } from './Detalhamento';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import { vigotasNoMemorial } from '../../core/building/vigotasRelatorio';

export function MemorialVigotasFicha({ dim, h2 }: { dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const linhas = vigotasNoMemorial(dim?.vigotas ?? []);
  if (!linhas.length) return null;
  const qv = (dim?.quantitativoVigotas ?? []).filter((x) => x.familia !== 'trelicada'), qm = dim?.quantitativoMoldadas ?? [];
  return (
    <>
      {h2('Vigotas por ficha e moldadas no local')}
      <div data-memorial-vigotas-ficha>
        <p>Cada vigota real recebe os esforços do alinhamento da grelha mais próximo (envoltória ELU de todos os pavimentos do grupo), com momentos mínimos por tipo de vão e igualação ponto a ponto da discretização (passo de 0,25 m) [a confirmar]. O tipo da série é o de menor momento último que cobre o momento positivo; os dados de ficha são do fabricante e não são verificados pelo programa.</p>
        {linhas.map((l) => (
          <div key={l.laje} className="avoid" data-memorial-vigotas-laje={l.laje}>
            <h3>Laje {l.nome} · {l.ficha} {l.serie} ({l.familia}) · {l.vigotas} vigotas{l.pavimentos > 1 ? ` · ${l.pavimentos} pavimentos` : ''}</h3>
            <p>Tipos: {l.tipos.map((t) => `${t.tipo} × ${t.vigotas}`).join(', ')}.{l.protensao ? ` Classe de agressividade ${l.protensao.caa}: protensão ${l.protensao.nivel}, combinação ${l.protensao.combinacao} (NBR 6118, Tabela 13.4) [a confirmar].` : ''}{l.redistribuicao.length ? ` Redistribuição dos negativos: ${l.redistribuicao.map((r) => `grupo ${r.grupo} (δ = ${fmt(r.delta)})`).join(', ')}.` : ''}</p>
            {l.servico.length > 0 && (
              <table>
                <thead><tr><th>Grupo</th><th>Tipo</th><th>Mserv (kN·m)</th><th>Admissível da ficha (kN·m)</th><th>Situação</th></tr></thead>
                <tbody>{l.servico.map((s) => <tr key={s.grupo}><td className="l">G{s.grupo}</td><td className="l">{s.tipo}</td><td>{fmt(s.Mserv)}</td><td>{s.Madm === null ? '—' : fmt(s.Madm)}</td><td className="l">{s.ok ? 'atende' : 'NÃO ATENDE'}</td></tr>)}</tbody>
              </table>
            )}
            {l.especiais.length > 0 && <p>Vigotas à parte: {l.especiais.map((e) => `${e.vigota} (${e.motivo})`).join(', ')}.</p>}
            {l.erros.length > 0 && <ul>{l.erros.map((m, i) => <li key={i}>{m}</li>)}</ul>}
            {l.avisos.length > 0 && <ul>{l.avisos.map((m, i) => <li key={i}><i>{m}</i></li>)}</ul>}
          </div>
        ))}
        {qv.length > 0 && (
          <table data-memorial-quantitativo-vigotas>
            <caption>Quantitativo das vigotas por tipo (com perdas)</caption>
            <thead><tr><th>Tipo</th><th>Vigotas</th><th>Comprimento (m)</th><th>Com perdas (m)</th></tr></thead>
            <tbody>{qv.map((q) => <tr key={`${q.familia}|${q.tipo}`}><td className="l">{q.tipo}</td><td>{q.vigotas}</td><td>{fmt(q.comprimento)}</td><td>{fmt(q.comprimentoComPerdas)}</td></tr>)}</tbody>
          </table>
        )}
        {qm.length > 0 && (
          <table data-memorial-quantitativo-moldadas>
            <caption>Armaduras das nervuras moldadas no local</caption>
            <thead><tr><th>Armadura</th><th>Aço</th><th>φ (mm)</th><th>Comprimento (m)</th><th>Peso (kg)</th><th>Com perdas (kg)</th></tr></thead>
            <tbody>{qm.map((q) => <tr key={`${q.posicao}|${q.aco}|${q.phi}`}><td className="l">{q.posicao}</td><td className="l">{q.aco}</td><td>{fmt(q.phi, 1)}</td><td>{fmt(q.comprimento)}</td><td>{fmt(q.peso)}</td><td>{fmt(q.pesoComPerdas)}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
```

## Diff de `src/app/edificio/MemorialEdificio.tsx`
```diff
diff --git a/src/app/edificio/MemorialEdificio.tsx b/src/app/edificio/MemorialEdificio.tsx
index ad317d9..54112d5 100644
--- a/src/app/edificio/MemorialEdificio.tsx
+++ b/src/app/edificio/MemorialEdificio.tsx
@@ -5,6 +5,7 @@ import { MemorialParedes } from './MemorialParedes';
 import { MemorialAlvenaria } from './AlvenariaResumo';
 import { MemorialCortes } from './MemorialCortes';
 import { MemorialInclinadas } from './MemorialInclinadas';
+import { MemorialVigotasFicha } from './MemorialVigotasFicha';
 import { PAINEL_TELA } from '../../core/building/telasSoldadas';
 import { useMemo, useRef, useState, type ReactNode } from 'react';
 import { calculoAtual, dimAtual, useBuilding } from './store';
@@ -456,10 +457,10 @@ export function MemorialEdificio({ onClose }: { onClose: () => void }) {
                 </div>
               ))}
             </>)}
-            {dim.vigotas && dim.vigotas.length > 0 && (<>
+            {dim.vigotas?.some((r) => !r.familia) && (<>
               {h2('Lajes treliçadas')}
               <p>Esforços por nervura (alinhamentos da grelha na direção das vigotas × intereixo), na envoltória ELU dos pavimentos do grupo, com momentos mínimos {opc.vigotaMomentoMinPositivo > 0 ? `p·ℓ²/${fmt(opc.vigotaMomentoMinPositivo, 0)}` : 'desligado'} (positivo) e {opc.vigotaMomentoMinNegativo > 0 ? `p·ℓ²/${fmt(opc.vigotaMomentoMinNegativo, 0)}` : 'desligado'} (negativo) e igualação entre vigotas vizinhas ({opc.vigotaIgualacao === 0 ? 'desligada' : opc.vigotaIgualacao === 1 ? 'pelo máximo' : 'pela média'}, diferença de {fmt(opc.vigotaIgualacaoDif, 0)} %). Positiva em seção T com o banzo inferior da treliça (CA-60) descontado e adicional de 1 a 2 barras por nervura; negativos na capa sobre os apoios, com comprimento pelo diagrama decalado mais lb (mínimo de {fmt(opc.vigotaNegativoVao, 0)} % do vão); cortante sem armadura transversal (NBR 6118, 19.4.1) com faixa maciçada quando necessário; capa conforme 13.2.4.2; distribuição pela Tabela 19.1. Treliça por modelo, peso pela geometria, adicional no comprimento eixo a eixo e igualação de 100 % a confirmar.</p>
-              {dim.vigotas.map((r) => (
+              {dim.vigotas.filter((r) => !r.familia).map((r) => (
                 <div key={r.laje} className="avoid">
                   <h3>Laje {r.nome} · {r.modelo}+{fmt(r.capa * 100, 0)} · {r.trelica} · {r.vigotas} vigotas{r.repeticoes > 1 ? ` · ${r.repeticoes} pavimentos` : ''} · {ST[r.status]}{r.bloqueada ? ' · armadura bloqueada' : ''}</h3>
                   <table>
@@ -472,6 +473,7 @@ export function MemorialEdificio({ onClose }: { onClose: () => void }) {
                 </div>
               ))}
             </>)}
+            <MemorialVigotasFicha dim={dim} h2={h2} />
             {((dim.resumoAcoVigas?.length ?? 0) > 0 || (dim.resumoAcoPilares?.length ?? 0) > 0 || (dim.resumoAcoLajes?.length ?? 0) > 0 || (dim.resumoAcoVigotas?.length ?? 0) > 0 || (dim.resumoAcoParedes?.length ?? 0) > 0 || (dim.resumoTelas?.length ?? 0) > 0) && (<>
               {h2('Resumo geral de aço')}
               {([['Vigas', dim.resumoAcoVigas ?? []], ['Pilares', dim.resumoAcoPilares ?? []], ['Paredes e pilares-parede', dim.resumoAcoParedes ?? []], ['Lajes maciças', dim.resumoAcoLajes ?? []], ['Lajes treliçadas (adicionais, negativos e distribuição)', dim.resumoAcoVigotas ?? []], ['Total geral (vigas, pilares, paredes, lajes e vigotas)', somarResumosAco(dim.resumoAcoVigas ?? [], dim.resumoAcoPilares ?? [], dim.resumoAcoParedes ?? [], dim.resumoAcoLajes ?? [], dim.resumoAcoVigotas ?? [])]] as const).map(([tit, rs]) => (
```

## Diff de `e2e/flows.mjs`
```diff
diff --git a/e2e/flows.mjs b/e2e/flows.mjs
index 90151f7..de1e8dc 100644
--- a/e2e/flows.mjs
+++ b/e2e/flows.mjs
@@ -5760,4 +5760,118 @@ export const flows = [
       await memo.getByRole('button', { name: 'Fechar' }).click();
     },
   },
+  {
+    name: 'E3b: vigotas por ficha (lista vigota a vigota, painéis, edição das selecionadas, dupla, esforços atribuídos, relatório, erro em vermelho), exposição e momentos mínimos por pano e memorial',
+    async run({ newPage }) {
+      const page = await newPage();
+      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
+      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
+      const esperarModelo = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 30000 });
+      await cmd('lote {"comandos": [' + [[0, 0], [4, 0], [8, 0], [0, 5], [4, 5], [8, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
+      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 5], [8, 5]], [[0, 0], [0, 5]], [[4, 0], [4, 5]], [[8, 0], [8, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.45}}}`).join(', ') + ']}');
+      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "vigotas", "ficha": "ex:armada", "serie": "A12"}}');
+      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
+      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
+      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
+      const cardL = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Lajes/ }) });
+      const abrir = async () => {
+        await cardL.locator('tbody tr').first().dblclick();
+        const j = page.getByRole('dialog', { name: /Resultados do elemento — Laje/ });
+        await j.waitFor();
+        await j.getByRole('radio', { name: 'Vigotas', exact: true }).click();
+        await j.locator('[data-vigotas-ficha]').waitFor();
+        return j;
+      };
+      let jan = await abrir();
+      // 1) vigota a vigota: planta com as vigotas reais e a lista
+      const nVig = parseInt(await jan.locator('svg[data-vigotas-individuais]').first().getAttribute('data-n-vigotas'), 10);
+      assert.equal(nVig, 10, `vigotas reais ${nVig}`);
+      const linhas = jan.locator('table[data-tabela-vigotas] tbody tr');
+      assert.equal(await linhas.count(), nVig);
+      assert.match(await linhas.first().innerText(), /A1/);
+      // painéis da vigota selecionada
+      const painel = jan.locator('[data-painel-vigota]');
+      assert.match(await painel.innerText(), /Tipo da série\s*A1/);
+      await painel.getByRole('radio', { name: 'Negativo', exact: true }).click();
+      assert.match(await painel.innerText(), /Mu da seção típica \/ maciça/);
+      await painel.getByRole('radio', { name: 'Flecha', exact: true }).click();
+      assert.match(await painel.innerText(), /Flecha total/);
+      // 2) seleção em intervalo e edição em lote (tipo A2 nas vigotas 2 a 4)
+      await linhas.nth(1).click();
+      await linhas.nth(3).click({ modifiers: ['Shift'] });
+      const ed = jan.locator('[data-editor-vigotas-ficha]');
+      assert.match(await ed.innerText(), /Editar as vigotas selecionadas \(3\)/);
+      await ed.getByLabel(/^Tipo da série/).selectOption('A2');
+      await ed.getByRole('button', { name: 'Aplicar às vigotas selecionadas', exact: true }).click();
+      await esperarModelo(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes ?? []).some((l) => (l.edicaoVigotas ?? []).length === 3), null);
+      await page.waitForFunction(() => document.querySelectorAll('[data-vigota-linha]').length === 10 && /A2/.test(document.querySelectorAll('[data-vigota-linha]')[2].textContent ?? ''), null, { timeout: 60000 });
+      assert.match(await linhas.nth(2).innerText(), /✎/);
+      // 3) vigota dupla na vigota 7 (a ficha de exemplo admite até a tripla): uma vigota a menos na lista
+      await linhas.nth(6).click();
+      await ed.getByLabel(/^Vigotas lado a lado/).selectOption('2');
+      await ed.getByRole('button', { name: 'Aplicar à primeira vigota selecionada', exact: true }).click();
+      await page.waitForFunction(() => document.querySelectorAll('[data-vigota-linha]').length === 9, null, { timeout: 60000 });
+      assert.match(await jan.locator('table[data-tabela-vigotas]').innerText(), /dupla/);
+      // 4) esforços atribuídos (igualação manual) na vigota 1
+      await linhas.first().click();
+      const campo = (rot) => ed.getByLabel(new RegExp('^' + rot.replace(/[+()]/g, '\\$&')));
+      await campo('Md+ atribuído').fill('3'); await campo('Md+ atribuído').press('Enter');
+      await campo('Vsd atribuído (início)').fill('2'); await campo('Vsd atribuído (início)').press('Enter');
+      await campo('Vsd atribuído (fim)').fill('2'); await campo('Vsd atribuído (fim)').press('Enter');
+      await ed.getByRole('button', { name: 'Atribuir esforços às selecionadas', exact: true }).click();
+      await esperarModelo(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes ?? []).some((l) => (l.edicaoVigotas ?? []).some((e) => e.momentos?.pos === 3)), null);
+      // 5) relatório de esforços da vigota
+      await linhas.first().click();
+      await jan.getByRole('button', { name: 'Relatório de esforços da vigota', exact: true }).click();
+      const rel = page.getByRole('dialog', { name: /Relatório de esforços da vigota 1/ });
+      await rel.waitFor();
+      await rel.locator('svg[data-diagrama="rel-M"]').waitFor();
+      assert.equal(await rel.locator('svg[data-diagrama]').count(), 3);
+      assert.equal(await rel.locator('svg[data-croqui-vigota]').count(), 1, 'croqui do grupo e da vigota');
+      assert.match(await rel.innerText(), /ELU/);
+      await rel.getByRole('button', { name: 'Fechar', exact: true }).click();
+      // desbloquear a laje volta aos esforços calculados
+      await ed.getByRole('button', { name: 'Desbloquear a laje', exact: true }).click();
+      await esperarModelo(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes ?? []).every((l) => !(l.edicaoVigotas ?? []).length), null);
+      await jan.getByRole('button', { name: 'Fechar', exact: true }).click();
+      // 6) carga alta: vigotas com erro em vermelho na lista, na planta e na lista de erros
+      await cmd('carga.area {"grupo": "g_3", "contorno": [[0, 0], [8, 0], [8, 5], [0, 5]], "valor": 25}');
+      await page.getByRole('button', { name: 'Recalcular', exact: true }).click();
+      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
+      jan = await abrir();
+      assert.equal(await jan.locator('[data-vigotas-com-erro]').count(), 1, 'contagem de vigotas com erro');
+      assert.ok(await jan.locator('table[data-tabela-vigotas] tbody tr[data-status="fail"]').count() >= 1, 'vigota com erro em vermelho na lista');
+      assert.ok(await jan.locator('svg[data-vigotas-individuais] g[data-status="fail"]').count() >= 1, 'vigota com erro em vermelho na planta');
+      await jan.getByRole('button', { name: 'Fechar', exact: true }).click();
+      await page.locator('[data-lista-erros] [data-contagem]').waitFor();
+      assert.match(await page.locator('[data-lista-erros]').innerText(), /VIGOTA_(POS|CORTANTE|NEG)/);
+      // 7) exposição e momentos mínimos por pano (grupo Vínculos e engastes, com a laje selecionada na planta)
+      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
+      const [ax, ay] = await telaDe(page, -0.6, -0.6), [bx, by] = await telaDe(page, 8.6, 5.6);
+      await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(bx, by, { steps: 8 }); await page.mouse.up();
+      const vg = page.locator('.edif-in details', { has: page.locator('summary', { hasText: /^Vínculos, flambagem e cobrimento/ }) }).first();
+      await vg.locator('summary').first().click();
+      const pano = vg.locator('[data-vigotas-pano]');
+      await pano.waitFor();
+      await pano.getByLabel(/^Classe de agressividade do pano/).selectOption('III');
+      await esperarModelo(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes ?? []).some((l) => l.exposicao === 'III'), null);
+      await pano.getByLabel(/^Tipo de vão dos momentos mínimos/).selectOption('isolado');
+      const div = pano.getByLabel(/^Divisor do positivo mínimo/);
+      await div.fill('8'); await div.press('Enter');
+      await pano.getByRole('button', { name: 'Aplicar os momentos mínimos ao pano', exact: true }).click();
+      await esperarModelo(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes ?? []).some((l) => l.momentosMin?.isolado?.pos === 8), null);
+      // 8) memorial
+      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
+      await page.getByRole('button', { name: 'Recalcular', exact: true }).click();
+      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
+      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
+      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
+      const mv = memo.locator('[data-memorial-vigotas-ficha]');
+      await mv.waitFor();
+      assert.match(await mv.innerText(), /Armada exemplo \(fictícia\) A12/);
+      assert.match(await mv.innerText(), /Tipos: A\d/);
+      assert.equal(await mv.locator('[data-memorial-quantitativo-vigotas]').count(), 1, 'quantitativo das vigotas no memorial');
+      await memo.getByRole('button', { name: 'Fechar' }).click();
+    },
+  },
 ];
```

## Checklists (depois que tsc, design.test e os e2e `E3b`, `E3a` e `R6` passarem)
Nos dois checklists (`docs/checklist-manual-cypecad.md` e `docs/checklist-manual-calculo-cypecad.md`), as linhas abaixo passam de Parcial a Feito: troque a situação por `Feito`, a frente por `—` e apague de cada nota o trecho "interface nos cartões E3b" (e o "; " que sobrar). Manual do usuário: C7.10, C7.11, C7.14, C7.31, C7.32, C7.101, C7.117, C7.118, C7.119, C7.120, C7.121, C7.122, C7.123 e C7.193. Manual de cálculo: K1.4.40 e K1.12.5-9. As linhas C7.91, C7.100, C7.102 e C7.194 continuam Parcial (a nota já diz o que falta): só apague "interface nos cartões E3b" delas. Depois rode `npm run checklists` e `npx vitest run src/core/checklists.test.ts`, acrescente no "Histórico de conferência" de cada checklist uma linha "E3b, interface" com as linhas que mudaram e anote em `docs/historico-fatias.md` que os cartões `docs/cartoes/E3b/` foram aplicados.

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run e2e -- E3` e `npm run e2e -- R6`; `npm run mapa` (regenera `docs/mapa-codigo.md`).
