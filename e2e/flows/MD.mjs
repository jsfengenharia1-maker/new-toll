// Fluxos de interface — MD (memória de cálculo detalhada), parte 1/1.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export const f_MD1 = {
    name: 'MD1: memória de cálculo detalhada (índice por etapa e elemento, passos da viga e do pilar, filtro, HTML, JSON e ZIP com dados da análise e OpenSees)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const botao = page.getByRole('button', { name: 'Memória de cálculo detalhada', exact: true });
      assert.equal(await botao.isDisabled(), true); // sem cálculo
      await page.getByRole('button', { name: 'Calcular e dimensionar', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      await botao.click();
      const dlg = page.getByRole('dialog', { name: 'Memória de cálculo detalhada' });
      const doc = dlg.locator('[data-memoria-detalhada]');
      await doc.waitFor({ timeout: 60000 });
      const t = await doc.innerText();
      for (const s of ['Índice', 'Por elemento', 'Cargas', 'Combinações', 'Análise estrutural', 'Esforços de cálculo', 'Dimensionamento', 'Detalhamento', 'Viga V1', 'Pilar P1 · Tipo 1']) assert.ok(t.includes(s), s);
      assert.match(t, /As = .* cm²/);
      assert.match(t, /VRd2 = 0,27·/);
      assert.match(t, /M1d,mín = /);
      assert.match(t, /lb = \(/);
      assert.match(t, /NBR 6118:2023, 17\.2\.2/);
      const total = await doc.locator('tr[data-passo]').count();
      assert.ok(total > 500, `passos: ${total}`);
      // índice: o link leva à seção do elemento
      assert.equal(await doc.locator('a[href="#md-dimensionamento-viga-v1"]').count(), 2); // índice por etapa e por elemento
      assert.equal(await doc.locator('#md-dimensionamento-viga-v1').count(), 1);
      // filtro por elemento: só os passos globais e os da viga
      await dlg.getByLabel(/^Elemento/).selectOption({ label: 'Viga V2' });
      await page.waitForFunction((n) => document.querySelectorAll('[data-memoria-detalhada] tr[data-passo]').length < n, total);
      const tf = await dlg.locator('[data-memoria-detalhada]').innerText();
      assert.ok(tf.includes('Viga V2') && !tf.includes('Viga V1') && !tf.includes('Pilar P1'));
      // exportações
      const baixar = async (rot) => {
        const [dl] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: rot, exact: true }).click()]);
        return { nome: dl.suggestedFilename(), dados: readFileSync(await dl.path()) };
      };
      const html = await baixar('Exportar HTML');
      assert.match(html.nome, /^memoria-detalhada-.*\.html$/);
      assert.match(html.dados.toString('utf8'), /^<!doctype html>[\s\S]*data-memoria-detalhada[\s\S]*Viga V2/);
      const json = await baixar('Exportar JSON');
      const mem = JSON.parse(json.dados.toString('utf8'));
      assert.equal(mem.versao, 1);
      assert.ok(mem.passos.length >= total);
      assert.ok(mem.passos.every((p) => p.id && p.etapa && p.formula && p.expressao && p.unidade !== undefined));
      const zip = await baixar('Dados da análise e OpenSees (ZIP)');
      assert.match(zip.nome, /\.zip$/);
      assert.equal(zip.dados.subarray(0, 2).toString('latin1'), 'PK');
      const texto = zip.dados.toString('latin1');
      for (const f of ['analise/nos.csv', 'analise/barras.csv', 'analise/combinacoes.csv', 'analise/reacoes_combinacoes.csv', 'analise/esforcos_combinacoes.csv', 'memoria/memoria.csv', 'opensees/portico.py']) assert.ok(texto.includes(f), f);
      await dlg.getByRole('button', { name: 'Fechar', exact: true }).click();
      await dlg.waitFor({ state: 'detached' });
    },
  };
