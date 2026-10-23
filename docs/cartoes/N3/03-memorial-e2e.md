# N3 — cartão 3: memorial das tabelas normativas e e2e `N3`

Classe: Haiku (seção de memorial sobre dados prontos e fluxo e2e roteirizado).

## Arquivos (2)
1. `src/app/edificio/MemorialEdificio.tsx`: aplicar o diff abaixo. A seção "Tabelas normativas em uso" fica fora do bloco condicional do dimensionamento (aparece sem calcular), logo antes de "Premissas". Dados: `normasNoMemorial(b)` de `src/core/normas/memorial.ts`.
2. `e2e/flows.mjs`: acrescentar o fluxo abaixo no fim do array (antes do `];` final).

```diff
diff --git a/src/app/edificio/MemorialEdificio.tsx b/src/app/edificio/MemorialEdificio.tsx
index 53e3e6d..20b71c3 100644
--- a/src/app/edificio/MemorialEdificio.tsx
+++ b/src/app/edificio/MemorialEdificio.tsx
@@ -19,4 +19,5 @@ import { memorialFlechas } from '../../core/building/flechas';
 import { deltaXi } from '../../core/design';
 import { PREMISSAS, TAXAS } from '../../core/building/premissas';
+import { normasNoMemorial } from '../../core/normas/memorial';
 
 import { cotaFundacao, inicioDe, lancesDoPilar, pavimentosOrdenados, peDireito, USOS, VENTO_PADRAO, ORIGEM_ROTULO } from '../../core/building/types';
@@ -672,4 +673,11 @@ export function MemorialEdificio({ onClose }: { onClose: () => void }) {
           </>)}
 
+          {h2('Tabelas normativas em uso')}
+          <p>Biblioteca de normas da obra: tabelas que o cálculo lê, com a edição, a fonte e a origem (de fábrica ou alterada pelo projetista).</p>
+          <table className="quadro" data-memorial-normas>
+            <thead><tr><th>Tabela</th><th>Norma e edição</th><th>Fonte</th><th>Origem</th></tr></thead>
+            <tbody>{normasNoMemorial(b).map((n) => <tr key={n.id}><td className="l">{n.titulo}</td><td className="l">{n.edicao}</td><td className="l">{n.fonte}{n.aConfirmar ? ' [a confirmar]' : ''}</td><td className="l">{n.origem}{n.nota ? ` (${n.nota})` : ''}</td></tr>)}</tbody>
+          </table>
+
           {h2('Premissas', true)}
           <ul>{PREMISSAS.map((p) => <li key={p.id}><b>{p.tema}.</b> {p.texto} <i>({p.fonte}{p.aConfirmar ? '; a confirmar' : ''})</i></li>)}</ul>
```

## Fluxo e2e `N3` (acrescentar ao fim de `e2e/flows.mjs`)
Regras já aplicadas: `{ exact: true }` nos rótulos de botão e de célula; o rótulo do `Select` "Norma" usa regex ancorada (o `<label>` envolve o `<select>`, então o texto exato não casa).
```js
  {
    name: 'N3: biblioteca de normas (editar uma linha da tabela de TRRF, ver o resultado no grupo Incêndio, valor inválido, exportar e importar JSON, restaurar, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const g = page.locator('.edif-in details', { has: page.locator('summary', { hasText: 'Biblioteca de normas' }) }).first();
      await g.locator('summary').click();
      await g.getByLabel(/^Norma/).selectOption('NBR 14432 / IT 06');
      const tabela = g.locator('table[data-tabela-norma="nbr14432.trrf-ocupacao"]');
      await tabela.waitFor();
      assert.match(await g.locator('[data-selos-norma]').innerText(), /de fábrica/);
      assert.match(await g.locator('[data-selos-norma]').innerText(), /a confirmar/);
      const inc = page.locator('.edif-in details', { has: page.locator('summary', { hasText: 'Incêndio' }) }).first();
      await inc.locator('summary').click();
      assert.match(await inc.getByLabel('Ocupação (NBR 14432 / IT)').innerText(), /A-1 — Residencial(?! N3)/);
      // 1) altera a ocupação da primeira linha: selo "alterada" e a opção do grupo Incêndio muda
      const cel = g.getByLabel('Ocupação da linha 1', { exact: true });
      await cel.fill('Residencial N3'); await cel.press('Enter');
      await page.waitForFunction(() => /alterada pela obra/.test(document.querySelector('[data-selos-norma]')?.textContent ?? ''));
      assert.match(await g.locator('summary').first().innerText(), /\(1 alterada\)/);
      assert.match(await inc.getByLabel('Ocupação (NBR 14432 / IT)').innerText(), /A-1 — Residencial N3/);
      // 2) valor inválido num número: mensagem e nada gravado
      const num = g.getByLabel('S2 (subsolo > 10 m) da linha 1', { exact: true });
      await num.fill('abc'); await num.press('Enter');
      await g.locator('[data-erros-normas]').waitFor();
      assert.match(await g.locator('summary').first().innerText(), /\(1 alterada\)/);
      // 3) exporta a tabela, restaura e importa de volta
      const { name, text } = await downloadText(page, () => g.getByRole('button', { name: 'Exportar esta tabela', exact: true }).click());
      assert.match(name, /norma-nbr14432\.trrf-ocupacao\.json$/);
      const j = JSON.parse(text);
      assert.equal(j.formato, 'statikos-normas');
      assert.equal(j.tabelas['nbr14432.trrf-ocupacao'].linhas[0].ocupacao, 'Residencial N3');
      await g.getByRole('button', { name: 'Restaurar tabela de fábrica', exact: true }).click();
      await page.waitForFunction(() => /de fábrica/.test(document.querySelector('[data-selos-norma]')?.textContent ?? ''));
      assert.match(await inc.getByLabel('Ocupação (NBR 14432 / IT)').innerText(), /A-1 — Residencial(?! N3)/);
      await g.getByLabel('Arquivo de normas').setInputFiles({ name: 'normas.json', mimeType: 'application/json', buffer: Buffer.from(text) });
      await page.waitForFunction(() => /alterada pela obra/.test(document.querySelector('[data-selos-norma]')?.textContent ?? ''));
      // arquivo inválido: mensagem
      await g.getByLabel('Arquivo de normas').setInputFiles({ name: 'ruim.json', mimeType: 'application/json', buffer: Buffer.from('{"formato": "outro"}') });
      await g.locator('[data-erros-normas]').waitFor();
      // 4) memorial lista a tabela como alterada pelo usuário
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mn = await memo.locator('[data-memorial-normas]').innerText();
      assert.match(mn, /TRRF por ocupação e altura[\s\S]*alterada pelo usuário/);
      assert.match(mn, /Catálogo SCAC|Estacas pré-moldadas/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 5) restaura a biblioteca toda
      await g.getByRole('button', { name: 'Restaurar toda a biblioteca', exact: true }).click();
      assert.doesNotMatch(await g.locator('summary').first().innerText(), /alterada/);
    },
  },
```

## Verificação
`npx tsc -b && npm run e2e -- N3` (o fluxo altera uma linha da tabela de TRRF, vê a opção mudar no grupo Incêndio, tenta um valor inválido, exporta, restaura, importa, confere o memorial e restaura a biblioteca).
