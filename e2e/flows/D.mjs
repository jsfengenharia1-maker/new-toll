// Fluxos de interface — D (parte 1/1).
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tab, telaDe, enquadrarEstavel } from './helpers.mjs';

export const f_D4 = {
    name: 'D4: navegador em árvore sincronizado com a planta (seções, vista, pilar nos dois sentidos) e Propriedades',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [4, 0]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      const arvore = page.getByRole('tree', { name: 'Navegador da obra' });
      await arvore.getByRole('treeitem', { name: /^Pavimentos/ }).waitFor();
      const pil = arvore.getByRole('treeitem', { name: /^Pilares(?!-)/ });
      if ((await pil.getAttribute('aria-expanded')) !== 'true') await pil.click();
      assert.equal(await pil.getAttribute('aria-expanded'), 'true');
      // vista pelo Navegador
      await arvore.getByRole('treeitem', { name: /^Vistas/ }).click();
      await arvore.getByRole('treeitem', { name: 'Elevação', exact: true }).click();
      assert.equal(await page.locator('.edif-tabs').getByRole('tab', { name: 'Elevação' }).getAttribute('aria-selected'), 'true');
      // árvore -> planta
      const p1 = arvore.getByRole('treeitem', { name: /^P1/ });
      await p1.click();
      assert.equal(await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta', exact: true }).getAttribute('aria-selected'), 'true');
      assert.equal(await p1.getAttribute('aria-selected'), 'true');
      await page.getByRole('region', { name: 'Propriedades' }).getByText('Pilares (1)').waitFor();
      // planta -> árvore: clique no segundo pilar
      await enquadrarEstavel(page);
      const [x, y] = await telaDe(page, 4, 0);
      await page.mouse.click(x, y);
      await arvore.getByRole('treeitem', { name: /^P2/ }).waitFor();
      assert.equal(await arvore.getByRole('treeitem', { name: /^P2/ }).getAttribute('aria-selected'), 'true');
    },
  };
