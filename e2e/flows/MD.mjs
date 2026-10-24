// Fluxos de interface — MD (memória de cálculo detalhada), parte 1/1 (MD1: vigas e pilares; MD2: lajes maciças).
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

export const f_MD2 = {
    name: 'MD2: memória de cálculo detalhada das lajes maciças (Wood-Armer por nó, flexão, fissuração, cortante, flecha, negativos; índice por elemento, filtro, HTML, JSON e CSV)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [12, 0], [0, 5], [6, 5], [12, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [12, 0]], [[0, 5], [12, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]], [[12, 0], [12, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.1}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      await page.getByRole('button', { name: 'Memória de cálculo detalhada', exact: true }).click();
      const dlg = page.getByRole('dialog', { name: 'Memória de cálculo detalhada' });
      const doc = dlg.locator('[data-memoria-detalhada]');
      await doc.waitFor({ timeout: 60000 });
      const t = await doc.innerText();
      for (const s of ['Laje L1', 'Laje L2', 'Cargas por pano', 'Momentos da grelha – ELU', 'Wood-Armer', 'Momento volvente', 'Flexão – armadura positiva, direção 0', 'Fissuração – armadura positiva, direção 0', 'Cortante da laje (19.4)', 'Flecha (ELS-DEF)', 'Negativos – borda com L2', 'Armadura mínima por metro']) assert.ok(t.includes(s), s);
      assert.match(t, /mx = .*γ|mx = .*·/);
      assert.match(t, /VRd1 = 0,25·/);
      assert.match(t, /NBR 6118:2023, 19\.3\.3\.2/);
      // índice por etapa e por elemento: o link leva à seção da laje
      assert.equal(await doc.locator('a[href="#md-esforcos-laje-l1"]').count(), 2);
      assert.equal(await doc.locator('#md-esforcos-laje-l1').count(), 1);
      assert.equal(await doc.locator('#md-dimensionamento-laje-l1').count(), 1);
      assert.equal(await doc.locator('#md-detalhamento-laje-l1').count(), 1);
      const total = await doc.locator('tr[data-passo]').count();
      // filtro por elemento: só a laje L2 (e os passos globais)
      await dlg.getByLabel(/^Elemento/).selectOption({ label: 'Laje L2' });
      await page.waitForFunction((n) => document.querySelectorAll('[data-memoria-detalhada] tr[data-passo]').length < n, total);
      const tf = await dlg.locator('[data-memoria-detalhada]').innerText();
      assert.ok(tf.includes('Laje L2') && !tf.includes('Laje L1 ') && !tf.includes('Viga V1') && tf.includes('Wood-Armer'));
      const baixar = async (rot) => {
        const [dl] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: rot, exact: true }).click()]);
        return { nome: dl.suggestedFilename(), dados: readFileSync(await dl.path()) };
      };
      const html = await baixar('Exportar HTML');
      assert.match(html.dados.toString('utf8'), /^<!doctype html>[\s\S]*data-memoria-detalhada[\s\S]*Laje L2[\s\S]*Wood-Armer/);
      const json = await baixar('Exportar JSON');
      const mem = JSON.parse(json.dados.toString('utf8'));
      const dosL2 = mem.passos.filter((p) => p.elemento === 'Laje L2');
      assert.ok(dosL2.length > 40, `passos da laje: ${dosL2.length}`);
      assert.ok(dosL2.every((p) => p.id && p.etapa && p.formula && p.expressao && p.entradas && typeof p.entradas === 'object'));
      assert.ok(['cargas', 'esforcos', 'dimensionamento', 'detalhamento'].every((e) => dosL2.some((p) => p.etapa === e)));
      assert.ok(dosL2.some((p) => /^Momento (positivo|negativo) máximo/.test(p.descricao) && typeof p.entradas.mx === 'number'));
      const zip = await baixar('Dados da análise e OpenSees (ZIP)');
      assert.ok(zip.dados.toString('latin1').includes('memoria/memoria.csv'));
      await dlg.getByRole('button', { name: 'Fechar', exact: true }).click();
      await dlg.waitFor({ state: 'detached' });
    },
  };
