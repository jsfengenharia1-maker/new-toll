// Fluxos de interface — layout (parte 1/1).
import assert from 'node:assert/strict';
import { tab } from './helpers.mjs';

export const f_layout = {
    name: 'layout: faixa de comandos por módulo, faixa recolhível, docas recolhíveis e redimensionáveis, largura guardada',
    async run({ newPage }) {
      const page = await newPage();
      const modulo = (n) => page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: n, exact: true });
      await modulo('Edifício').click();
      const abas = page.getByRole('tablist', { name: 'Faixa de comandos' }).getByRole('tab');
      const nomes = async () => (await abas.allTextContents()).map((t) => t.trim());
      const ed = await nomes();
      for (const a of ['Arquivo', 'Lançamento', 'Edição', 'Cargas e ações', 'Análise', 'Dimensionamento', 'Fundações', 'Pranchas', 'Vista']) assert.ok(ed.includes(a), `aba ${a} no Edifício`);
      await modulo('Pórtico').click();
      const po = await nomes();
      for (const a of ['Arquivo', 'Lançamento', 'Edição', 'Análise', 'Vista']) assert.ok(po.includes(a), `aba ${a} no Pórtico`);
      await modulo('Fundações').click();
      const fu = await nomes();
      for (const a of ['Arquivo', 'Lançamento', 'Fundações', 'Vista']) assert.ok(fu.includes(a), `aba ${a} em Fundações`);
      await modulo('Edifício').click();
      // faixa recolhível
      await page.getByRole('button', { name: 'Recolher a faixa de comandos' }).click();
      assert.equal(await page.getByRole('toolbar', { name: /^Comandos:/ }).count(), 0);
      await page.getByRole('button', { name: 'Expandir a faixa de comandos' }).click();
      assert.equal(await page.getByRole('toolbar', { name: /^Comandos:/ }).count(), 1);
      // doca esquerda: recolher, mostrar, redimensionar pelo teclado
      const dock = page.getByRole('complementary', { name: 'painel lateral esquerdo' });
      const w0 = Math.round((await dock.boundingBox()).width);
      await dock.getByRole('button', { name: 'Recolher painel lateral esquerdo' }).click();
      assert.ok((await dock.boundingBox()).width < 40);
      await dock.getByRole('button', { name: 'Mostrar painel lateral esquerdo' }).click();
      await dock.getByRole('separator').focus();
      for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
      assert.equal(Math.round((await dock.boundingBox()).width), w0 + 80);
      // a largura volta ao recarregar
      await page.reload();
      await page.locator('.bname').waitFor();
      await modulo('Edifício').click();
      assert.equal(Math.round((await page.getByRole('complementary', { name: 'painel lateral esquerdo' }).boundingBox()).width), w0 + 80);
    },
  };
