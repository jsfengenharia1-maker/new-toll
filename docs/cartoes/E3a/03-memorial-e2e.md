# E3a — cartão 3: memorial das fichas usadas e e2e `E3a`

Classe: Haiku (seção de memorial sobre dados prontos e fluxo e2e roteirizado). Aplicar depois dos cartões 1 e 2.

## Arquivos (2)
1. `src/app/edificio/MemorialEdificio.tsx`: aplicar o diff abaixo. A seção "Fichas de vigotas usadas" aparece só quando alguma laje usa ficha, logo antes de "Premissas". Dados: `fichasNoMemorial(b)` de `src/core/building/tiposLaje.ts` (tabela por ficha com a marca "dado do fabricante, não verificado pelo programa", ou "ficha fictícia (demonstração)", e o peso por m² calculado). A premissa `tipos-laje` já está em `PREMISSAS` e aparece sozinha.
2. `e2e/flows.mjs`: acrescentar o fluxo abaixo no fim do array (antes do `];` final).

```diff
--- a/src/app/edificio/MemorialEdificio.tsx
+++ b/src/app/edificio/MemorialEdificio.tsx
@@ -20,6 +20,7 @@
 import { deltaXi } from '../../core/design';
 import { PREMISSAS, TAXAS } from '../../core/building/premissas';
 import { normasNoMemorial } from '../../core/normas/memorial';
+import { fichasNoMemorial } from '../../core/building/tiposLaje';
 
 import { cotaFundacao, inicioDe, lancesDoPilar, pavimentosOrdenados, peDireito, USOS, VENTO_PADRAO, ORIGEM_ROTULO } from '../../core/building/types';
 import { apoioDoPilar, excentricidadeApoio } from '../../core/building/transicao';
@@ -745,6 +746,18 @@
             <tbody>{normasNoMemorial(b).map((n) => <tr key={n.id}><td className="l">{n.titulo}</td><td className="l">{n.edicao}</td><td className="l">{n.fonte}{n.aConfirmar ? ' [a confirmar]' : ''}</td><td className="l">{n.origem}{n.nota ? ` (${n.nota})` : ''}</td></tr>)}</tbody>
           </table>
 
+          {fichasNoMemorial(b).length > 0 && (<>
+            {h2('Fichas de vigotas usadas')}
+            <p>Dados de ficha são do fabricante e não são verificados pelo programa, que só confere a coerência lógica. Peso por m² = capa + nervuras + enchimento, calculado (ou o informado na ficha).</p>
+            {fichasNoMemorial(b).map((f) => (
+              <table key={f.id} className="quadro" data-memorial-ficha={f.id}>
+                <caption>{f.nome} ({f.familia}; {f.origem}) — {f.marca}</caption>
+                <thead><tr><th>Laje</th><th>h (cm)</th><th>Intereixo (cm)</th><th>Capa (cm)</th><th>Nervura (cm)</th><th>Peso (kN/m²)</th><th>Mu+ (kN·m)</th><th>Mfis+ (kN·m)</th><th>VRd1 (kN)</th><th>Usada</th></tr></thead>
+                <tbody>{f.series.map((s) => <tr key={s.id}><td className="l">{s.id}{s.tipo ? ` (${s.tipo})` : ''}</td><td>{fmt(s.altura * 100, 0)}</td><td>{fmt(s.intereixo * 100, 0)}</td><td>{fmt(s.capa * 100, 1)}</td><td>{fmt(s.bw * 100, 1)}</td><td>{fmt(s.pp, 2)}</td><td>{s.Mu === undefined ? '—' : fmt(s.Mu, 2)}</td><td>{s.Mfis === undefined ? '—' : fmt(s.Mfis, 2)}</td><td>{s.VRd1 === undefined ? '—' : fmt(s.VRd1, 2)}</td><td>{s.usada ? 'sim' : ''}</td></tr>)}</tbody>
+              </table>
+            ))}
+          </>)}
+
           {h2('Premissas', true)}
           <ul>{PREMISSAS.map((p) => <li key={p.id}><b>{p.tema}.</b> {p.texto} <i>({p.fonte}{p.aConfirmar ? '; a confirmar' : ''})</i></li>)}</ul>
           {guia && <MemorialGuia h2={h2} />}
```

## Fluxo e2e `E3a` (acrescentar ao fim de `e2e/flows.mjs`)
Regras já aplicadas: `{ exact: true }` nos botões e rótulos de célula; `Select` e `NumField` (o `<label>` envolve o controle, então o texto exato não casa) por regex ancorada.
```js
  {
    name: 'E3a: tipos de laje (copiar a ficha de exemplo, erro lógico, enchimento, atribuir em cascata, exportar e importar JSON, ficha em uso, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperarModelo = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 20000 });
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [0, 4], [5, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      const g = page.locator('.edif-in details', { has: page.locator('summary', { hasText: /^Tipos de laje/ }) }).first();
      await g.locator('summary').first().click();
      // 1) a ficha de exemplo é fictícia e somente leitura; copiar dá uma ficha editável
      await g.getByLabel(/^Ficha de vigotas/).selectOption({ label: 'Armada exemplo (fictícia) · exemplo fictício' });
      assert.match(await g.locator('[data-selos-ficha]').innerText(), /somente leitura/);
      assert.match(await g.locator('[data-selos-ficha]').innerText(), /fictícia/);
      await g.getByRole('button', { name: 'Copiar ficha', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposLaje?.fichas?.length === 1, null);
      assert.match(await g.locator('[data-selos-ficha]').innerText(), /editável/);
      // 2) erro lógico: Mu positivo abaixo de Mfis
      await g.getByRole('radio', { name: 'Positivo', exact: true }).click();
      const mu = g.getByLabel(/^Mu positivo/);
      assert.equal((await mu.inputValue()).replace(',', '.'), '6');
      await mu.fill('1'); await mu.press('Enter');
      await g.locator('[data-erros-ficha]').waitFor();
      assert.match(await g.locator('[data-erros-ficha]').innerText(), /maior que Mfis/);
      await mu.fill('6'); await mu.press('Enter');
      await g.locator('[data-erros-ficha]').waitFor({ state: 'detached' });
      // 3) enchimento genérico da biblioteca
      await g.getByRole('button', { name: 'Novo enchimento', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposLaje?.enchimentos?.length === 1, null);
      const pe = g.getByLabel(/^Peso do enchimento genérico/);
      await pe.fill('0,6'); await pe.press('Enter');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposLaje?.enchimentos?.[0]?.pesoM2 === 0.6, null);
      // 4) atribuir em cascata no grupo Lajes e preencher os panos
      const lj = page.locator('.edif-in details', { has: page.locator('summary', { hasText: /^Lajes/ }) }).first();
      await lj.locator('summary').first().click();
      await lj.getByLabel(/^Tipo$/).selectOption('vigotas');
      await lj.getByLabel(/^Fabricante \(filtro\)/).selectOption('Fictício');
      const copia = (await modelo()).tiposLaje.fichas[0];
      await lj.getByLabel(/^Ficha da laje/).selectOption(copia.id);
      await lj.getByLabel(/^Série da laje/).selectOption('A12');
      await lj.getByRole('button', { name: 'Preencher todos os panos', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]?.tipo?.tipo === 'vigotas', null);
      assert.equal((await modelo()).lajes[0].tipo.serie, 'A12');
      // 5) a ficha em uso não pode ser removida
      await g.getByRole('button', { name: 'Remover ficha', exact: true }).click();
      await g.locator('[data-erros-tipos-laje]').waitFor();
      assert.match(await g.locator('[data-erros-tipos-laje]').innerText(), /usada por lajes/);
      // 6) exportar e importar JSON
      const { name, text } = await downloadText(page, () => g.getByRole('button', { name: 'Exportar tipos de laje', exact: true }).click());
      assert.match(name, /tipos-laje\.json$/);
      const j = JSON.parse(text);
      assert.equal(j.formato, 'statikos-tipos-laje');
      assert.equal(j.fichas.length, 1);
      assert.equal(j.enchimentos.length, 1);
      await g.getByLabel('Importar JSON de tipos de laje', { exact: true }).setInputFiles({ name: 'tipos.json', mimeType: 'application/json', buffer: Buffer.from(text) });
      await page.waitForFunction(() => /importados/.test(document.querySelector('.statusbar .msg')?.textContent ?? ''), null, { timeout: 20000 });
      await g.getByLabel('Importar JSON de tipos de laje', { exact: true }).setInputFiles({ name: 'ruim.json', mimeType: 'application/json', buffer: Buffer.from('{"formato": "outro"}') });
      await g.locator('[data-erros-tipos-laje]').waitFor();
      // 7) cálculo e memorial com a tabela da ficha
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const tab = memo.locator(`[data-memorial-ficha="${copia.id}"]`);
      await tab.waitFor();
      assert.match(await tab.innerText(), /fictícia/);
      assert.match(await tab.innerText(), /A12/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  },
```

## Verificação
`npx tsc -b && npm run e2e -- E3a && npm run e2e -- --no-build R6` (o fluxo copia a ficha de exemplo, provoca e corrige um erro lógico, cria um enchimento genérico, atribui a ficha em cascata, confere a ficha em uso, exporta e importa o JSON e confere o memorial).
