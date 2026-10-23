// Fluxos de interface — R (parte 2/2).
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { faixaAba, grupoEdif, tab, downloadText, num, telaDe } from './helpers.mjs';

export const f_R7b = {
    name: 'R7b: detalhamento de vigas (mostrar/ocultar, edição de posição com verificação DETALHE_INSUF, restaurar, opções no perfil do sistema, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 90000 });
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 90000 });
      await livre();
      const cardVigas = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) });
      await cardVigas.locator('tbody tr').first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Detalhamento' }).click();
      const svg = jan.locator('svg[data-detalhe]');
      await svg.waitFor();
      // mostrar / ocultar: sem estribos o desenho perde as zonas; sem seção some a seção; sem a face inferior perde barras
      const mostrar = jan.locator('[data-mostrar-detalhe]');
      assert.ok(await svg.locator('[data-zona]').count() > 0);
      await mostrar.getByLabel('estribos').uncheck();
      assert.equal(await svg.locator('[data-zona]').count(), 0);
      await mostrar.getByLabel('estribos').check();
      await mostrar.getByLabel('seção').uncheck();
      assert.equal(await jan.locator('svg[data-secao]').count(), 0);
      await mostrar.getByLabel('seção').check();
      await jan.locator('svg[data-secao]').waitFor();
      const nb = await svg.locator('g[data-barra]').count();
      await mostrar.getByLabel('inferior').uncheck();
      assert.ok((await svg.locator('g[data-barra]').count()) < nb);
      await mostrar.getByLabel('inferior').check();
      // edição: encurta demais a passante N1 (não cobre a necessária) e o recálculo reprova com DETALHE_INSUF
      const ed = jan.locator('[data-edicao-detalhe]');
      await ed.waitFor();
      assert.equal(await jan.locator('[data-detalhe-editado]').count(), 0);
      const fim = ed.getByLabel('N1 fim');
      const v0 = parseFloat((await fim.inputValue()).replace(',', '.'));
      await fim.fill(String(v0 - 1.5).replace('.', ',')); await fim.press('Enter');
      await ed.getByRole('button', { name: 'Aplicar edição' }).click();
      await livre();
      await jan.locator('[data-detalhe-editado]').waitFor();
      assert.match(await jan.locator('[data-avisos-det]').innerText(), /Detalhe editado insuficiente: armadura inferior/);
      assert.match(await jan.locator('table[data-tabela-barras]').innerText(), /N1 ✎/);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      await page.locator('[data-lista-erros]').locator('tbody tr.bad', { hasText: 'DETALHE_INSUF' }).first().waitFor();
      // restaurar o calculado: o erro some
      await cardVigas.locator('tbody tr').first().dblclick();
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Detalhamento' }).click();
      await jan.locator('[data-edicao-detalhe]').getByRole('button', { name: 'Restaurar calculado' }).click();
      await livre();
      await page.waitForFunction(() => !document.querySelector('[data-detalhe-editado]'));
      assert.equal(await jan.locator('[data-avisos-det]').getByText('Detalhe editado insuficiente').count(), 0);
      // tramo: o pórtico retangular não tem viga consecutiva e alinhada
      assert.match(await jan.locator('[data-tramo-viga]').innerText(), /Não há viga consecutiva e alinhada/);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // opções do perfil do sistema: redução de lb ligada e negativos mínimos
      const g = await grupoEdif(page, 'Opções de cálculo');
      assert.ok(await g.getByLabel('Vigas: reduzir lb por As,calc/As,ef').isChecked());
      assert.match(await g.innerText(), /Vigas: comprimento mínimo dos negativos/);
      // memorial: critérios do detalhamento das vigas
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo.locator('[data-memorial-det-vigas]').innerText(), /prolongamento dos cortes lb·As,calc\/As,ef/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_R7c = {
    name: 'R7c: detalhamento de pilares (edição de espera e traspasse com PILAR_DET_INSUF, restaurar, corte no topo, adensamento, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 90000 });
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 90000 });
      await livre();
      const cardP = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: 'Pilares (por lance)' }) });
      const abrir = async () => {
        await cardP.locator('tbody tr').first().dblclick();
        const j = page.getByRole('dialog', { name: /Resultados do elemento — Pilar/ });
        await j.waitFor();
        await j.getByRole('radio', { name: 'Detalhamento' }).click();
        await j.locator('svg[data-detalhe-pilar]').waitFor();
        return j;
      };
      // edição: espera na fundação e traspasse; traspasse curto demais reprova com PILAR_DET_INSUF
      let jan = await abrir();
      const ed = jan.locator('[data-edicao-pilar]');
      await ed.waitFor();
      assert.equal(await jan.locator('[data-detalhe-editado]').count(), 0);
      const esp = ed.getByLabel('Espera');
      await esp.fill('0,9'); await esp.press('Enter');
      const pass = ed.locator('[data-edicao-passagem]').first().locator('input');
      await pass.fill('0,1'); await pass.press('Enter');
      await ed.getByRole('button', { name: 'Aplicar edição' }).click();
      await livre();
      await jan.locator('[data-detalhe-editado]').waitFor();
      assert.match(await jan.locator('[data-avisos-det]').innerText(), /detalhe editado insuficiente: traspasse/);
      assert.match(await jan.locator('[data-edicao-pilar]').locator('[data-edicao-espera] input').inputValue(), /^0,9/);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      await page.locator('[data-lista-erros]').locator('tbody tr.bad', { hasText: 'PILAR_DET_INSUF' }).first().waitFor();
      // restaurar o calculado: o erro some
      jan = await abrir();
      await jan.locator('[data-edicao-pilar]').getByRole('button', { name: 'Restaurar calculado' }).click();
      await livre();
      await page.waitForFunction(() => !document.querySelector('[data-detalhe-editado]'));
      assert.equal(await jan.locator('[data-avisos-det]').getByText('detalhe editado insuficiente').count(), 0);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // opções: corte no topo e adensamento
      const g = await grupoEdif(page, 'Opções de cálculo');
      assert.ok(!(await g.getByLabel('Pilares: cortar as barras no topo do último lance').isChecked()));
      assert.ok(await g.getByLabel('Pilares: seção insuficiente sem desenho nem quantitativo').isChecked());
      assert.match(await g.innerText(), /Pilares: traspasse mínimo reduzido/);
      await g.getByLabel('Pilares: cortar as barras no topo do último lance').check();
      await g.getByLabel('Pilares: adensar estribos no topo e na base do lance').check();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).click();
      await livre();
      jan = await abrir();
      assert.match(await jan.locator('[data-avisos-det]').innerText(), /barras cortadas no topo/);
      assert.match(await jan.locator('[data-rotulo-estribo="0"]').innerHTML(), /ad\. c\/10 em 50/);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      await page.locator('[data-lista-erros]').locator('tbody tr', { hasText: 'PILAR_CORTE_TOPO' }).first().waitFor();
      // memorial: critérios do detalhamento dos pilares
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const t = await memo.locator('[data-memorial-det-pilares]').innerText();
      assert.match(t, /com as barras cortadas, sem ancoragem/);
      assert.match(t, /adensados a cada 10 cm numa altura de 0,50 m/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_R7d = {
    name: 'R7d: armadura base das lajes (tela Q138 detalhada em painéis, reforço, predefinida), resumo de telas e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [4, 0], [8, 0], [0, 4], [4, 4], [8, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 4], [8, 4]], [[0, 0], [0, 4]], [[4, 0], [4, 4]], [[8, 0], [8, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.45}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 90000 });
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 90000 });
      await livre();
      const cardL = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Lajes/ }) });
      await cardL.locator('tbody tr').first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Laje/ });
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Detalhamento' }).click();
      const svg = jan.locator('svg[data-detalhe-laje]');
      await svg.waitFor();
      assert.equal(await svg.locator('g[data-painel]').count(), 0);
      const base = jan.locator('[data-base-laje]');
      await base.waitFor();
      // base inferior: tela Q138, detalhada, nas lajes do pavimento
      await base.locator('[data-base-face="inf"]').getByLabel('Armadura base').selectOption({ label: 'tela soldada' });
      await base.getByLabel('Detalhar a base').selectOption({ label: 'sim (desenhar e medir)' });
      await base.getByLabel('Aplicar às lajes maciças do pavimento').check();
      await base.locator('[data-base-aplicar]').click();
      await livre();
      await jan.locator('g[data-painel]').first().waitFor();
      assert.ok(await jan.locator('g[data-painel][data-tela="Q138"]').count() >= 1);
      assert.match(await jan.locator('svg[data-detalhe-laje]').innerHTML(), /T1 – Q138 – \d,\d\d × \d,\d\d/);
      assert.match(await jan.locator('[data-base-indicada]').innerText(), /Tela Q138/);
      assert.ok(await jan.locator('table[data-tabela-paineis] tbody tr').count() >= 1);
      assert.ok(await jan.locator('g[data-tipo="reforco"]').count() >= 1, 'reforço = necessária − base');
      // predefinida superior: medida como lançada
      const pd = jan.locator('[data-predefinida-form]');
      await pd.getByLabel('Comprimento (m)').fill('2,5'); await pd.getByLabel('Comprimento (m)').press('Enter');
      await pd.locator('[data-predefinida-aplicar]').click();
      await livre();
      await jan.locator('g[data-tipo="predefinida"]').first().waitFor();
      assert.equal(await jan.locator('table[data-tabela-predefinidas] tbody tr').count(), 1);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // resumo de aço: tabela de telas (painéis e kg)
      const resumo = page.locator('[data-resumo-aco]');
      await resumo.locator('table[data-tabela-telas]').waitFor();
      const linha = resumo.locator('tr[data-tela="Q138"] td.num');
      assert.ok(parseInt(await linha.nth(0).innerText(), 10) >= 2, 'painéis');
      assert.ok(num(await linha.nth(2).innerText()) > 0, 'kg');
      const csv = await downloadText(page, () => resumo.getByRole('button', { name: 'Exportar CSV do aço' }).click());
      assert.match(csv.text, /Telas soldadas da base das lajes/);
      // opção de detalhamento da base na lista de opções
      const g = await grupoEdif(page, 'Opções de cálculo');
      assert.match(await g.innerText(), /Lajes: traspasse entre painéis de tela soldada/);
      assert.ok(!(await g.getByLabel('Lajes: detalhar a armadura base').isChecked()));
      // memorial: base, painéis e resumo de telas
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const t = await memo.innerText();
      assert.match(t, /Armadura base \(detalhada, desenhada e medida\)/);
      assert.match(t, /Painéis de tela: T1 Q138/);
      assert.match(t, /Telas soldadas da base das lajes \(NBR 7481/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_R7e = {
    name: 'R7e: edição das armaduras das lajes (painel não modal, edição bloqueada com ARM_BLOQ, agrupar, zona, linha de dobra, geração sem cálculo e refazer, rótulos da prancha, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [4, 0], [8, 0], [0, 4], [4, 4], [8, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 4], [8, 4]], [[0, 0], [0, 4]], [[4, 0], [4, 4]], [[8, 0], [8, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.45}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 90000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 90000 });
      await livre();
      // painel de edição não modal sob a planta, com as camadas inferior e superior juntas
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await faixaAba(page, 'Vista');
      await page.getByLabel('Armadura das lajes na planta').selectOption('editar');
      const painel = page.locator('[data-painel-edicao-lajes]');
      await painel.waitFor();
      assert.equal(await page.getByLabel('Armadura das lajes na planta').inputValue(), 'editar');
      const tab = painel.locator('[data-tabela-edicao-laje]');
      await tab.waitFor();
      const linhaPos = painel.locator('tr[data-pos-edicao][data-tipo="positiva"][data-face="inf"]');
      assert.ok(await linhaPos.count() >= 2, 'positivas nas duas direções');
      assert.ok(await painel.locator('tr[data-pos-edicao][data-face="sup"]').count() >= 1, 'negativos visíveis junto das positivas');
      const pos0 = (await linhaPos.first().locator('td').nth(1).innerText()).trim();
      const phi0 = await linhaPos.first().getByLabel(`Bitola de ${pos0}`).inputValue();
      const row = (p) => painel.locator(`tr[data-pos-edicao="${p}"]`);
      // 1) edição com mais armadura: bloqueada e marcada; o painel segue aberto
      await row(pos0).getByLabel(`Bitola de ${pos0}`).selectOption('16');
      await livre();
      await row(pos0).getByText('editada', { exact: true }).waitFor({ timeout: 60000 });
      assert.match(await painel.locator('[data-edicao-bloqueada]').innerText(), /1 posição editada/);
      assert.ok(await painel.isVisible());
      // 2) edição insuficiente: φ5 reprova com ARM_BLOQ na lista de erros
      await row(pos0).getByLabel(`Bitola de ${pos0}`).selectOption('5');
      await livre();
      await row(pos0).getByText('editada', { exact: true }).waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const lista = page.locator('[data-lista-erros]');
      await lista.locator('tbody tr.bad', { hasText: 'ARM_BLOQ' }).first().waitFor({ timeout: 30000 });
      assert.match(await lista.innerText(), /Armadura bloqueada insuficiente \(laje/);
      assert.match(await page.locator('[data-bloqueadas]').innerText(), /1 laje com armadura editada/);
      // reverter a posição: o erro some
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await row(pos0).getByLabel(`Selecionar ${pos0}`).check();
      await painel.getByRole('button', { name: 'Reverter marcadas' }).click();
      await livre();
      // o painel só volta a mostrar a tabela depois do recálculo: espera a tabela com a bitola original e sem posição editada
      await page.waitForFunction(([p, v]) => document.querySelector(`[data-painel-edicao-lajes] tr[data-pos-edicao="${p}"] select`)?.value === v && !document.querySelector('[data-painel-edicao-lajes] [data-edicao-bloqueada]'), [pos0, phi0], { timeout: 60000 });
      // 3) agrupar as duas positivas (iguala φ, espaçamento e comprimento) e desagrupar
      const pos1 = (await linhaPos.nth(1).locator('td').nth(1).innerText()).trim();
      await row(pos0).getByLabel(`Selecionar ${pos0}`).check();
      await row(pos1).getByLabel(`Selecionar ${pos1}`).check();
      await painel.locator('[data-agrupar]').click();
      await livre();
      await row(pos1).getByText('grupo 1').waitFor({ timeout: 60000 });
      assert.equal(await row(pos0).getByLabel(`Bitola de ${pos0}`).inputValue(), await row(pos1).getByLabel(`Bitola de ${pos1}`).inputValue());
      assert.equal(await row(pos0).getByLabel(`Comprimento de ${pos0}`).inputValue(), await row(pos1).getByLabel(`Comprimento de ${pos1}`).inputValue());
      await painel.locator('[data-desagrupar]').click();
      await livre();
      await page.waitForFunction(() => document.querySelector('[data-painel-edicao-lajes] tr[data-pos-edicao]') && ![...document.querySelectorAll('[data-painel-edicao-lajes] tr[data-pos-edicao] .pill')].some((q) => /grupo/.test(q.textContent)), null, { timeout: 60000 });
      // 4) zona de uniformização (formulário) e linha de dobra (ferramenta da planta)
      const det = painel.locator('details').filter({ hasText: 'Zonas de uniformização e linhas de dobra' }).first();
      await det.locator('summary').click();
      await det.locator('[data-criar-zona]').click();
      await livre();
      await det.locator('table[data-tabela-zonas] tbody tr').first().waitFor({ timeout: 60000 });
      await det.locator('[data-ferramenta-dobra]').click();
      // o painel reduz o quadro da planta: enquadra (F) e espera a vista caber nele antes de clicar
      await page.keyboard.press('f');
      await page.waitForFunction(() => { const c = document.querySelector('canvas.int'), v = JSON.parse(document.querySelector('.planta-cv').dataset.vista); return c && v && v.oy < c.getBoundingClientRect().height; }, null, { timeout: 20000 });
      const [x1, y1] = await telaDe(page, 2, 1), [x2, y2] = await telaDe(page, 2, 3);
      await page.mouse.move(x1, y1); await page.mouse.click(x1, y1);
      await page.mouse.move(x2, y2); await page.mouse.click(x2, y2);
      await livre();
      await det.locator('table[data-tabela-linhas-dobra] tbody tr').first().waitFor({ timeout: 60000 });
      // 5) memorial: zonas, linhas de dobra e posições editadas (edita uma posição para constar)
      await row(pos0).getByLabel(`Bitola de ${pos0}`).selectOption('12.5');
      await livre();
      await painel.locator('[data-edicao-bloqueada]').waitFor({ timeout: 60000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.innerText();
      assert.match(mt, /Zonas de uniformização e linhas de dobra/);
      assert.ok(await memo.locator('[data-memorial-zonas-lajes] tbody tr').count() >= 2);
      assert.match(mt, /posi(ção|ções) editad(a|as) e bloquead(a|as)/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 6) rótulo da barra na prancha: deslocamento em mm (dado de prancha, sem recalcular)
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      await page.getByLabel('Tipo de prancha').selectOption({ label: 'Armação de lajes' });
      const gr = page.locator('details', { has: page.locator('summary', { hasText: 'Rótulos das barras das lajes' }) }).first();
      await gr.locator('summary').click();
      const ro = gr.locator('[data-rotulos-lajes]');
      await ro.getByRole('button', { name: 'Rótulo à direita' }).click();
      await ro.locator('[data-rotulos-reposicionados]').waitFor();
      assert.match(await ro.locator('[data-rotulo-deslocamento]').innerText(), /5,0 ; 0,0 mm/);
      // 7) geração só com a geometria: confirmação, aviso e refazer
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await painel.locator('[data-gerar]').click();
      await painel.locator('[data-confirmar-gerar]').waitFor();
      assert.match(await painel.locator('[data-confirmar-gerar]').innerText(), /apaga a edição/);
      await painel.locator('[data-confirmar-gerar-ok]').click();
      await livre();
      await painel.locator('[data-sem-calculo]').waitFor({ timeout: 60000 });
      assert.equal(await painel.locator('[data-edicao-bloqueada]').count(), 0, 'a geração apaga a edição existente');
      await painel.locator('[data-refazer-laje]').click();
      await livre();
      await page.waitForFunction(() => document.querySelector('[data-painel-edicao-lajes] tr[data-pos-edicao]') && !document.querySelector('[data-sem-calculo]'), null, { timeout: 60000 });
      assert.ok(await painel.locator('tr[data-pos-edicao]').count() >= 3);
      // zona e linha de dobra permanecem depois do refazer
      assert.equal(await det.locator('table[data-tabela-zonas] tbody tr').count(), 1);
      assert.equal(await det.locator('table[data-tabela-linhas-dobra] tbody tr').count(), 1);
      await painel.locator('[data-fechar-painel-lajes]').click();
      assert.equal(await page.locator('[data-painel-edicao-lajes]').count(), 0);
    },
  };

export const f_R7f = {
    name: 'R7f: mudar tabela não refaz a análise (contadores de revisão), agrupar pórticos, seleção para bloqueio, seção alterada com esforços antigos e rearmar alterados, cópia das lajes, memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [10, 0], [0, 4], [5, 4], [10, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [10, 0]], [[0, 4], [10, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]], [[10, 0], [10, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 90000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 90000 });
      await livre();
      const rev = () => page.locator('[data-rearmar]').evaluate((el) => ({ ...el.dataset }));
      const espera = (f, arg) => page.waitForFunction(([src, a]) => { const el = document.querySelector('[data-rearmar]'); return !!el && new Function('d', 'a', `return (${src})(d, a)`)({ ...el.dataset }, a); }, [f.toString(), arg], { timeout: 90000 });
      const r0 = await rev();
      assert.equal(r0.analises, '1');
      assert.equal(r0.rearmes, '0');
      assert.equal(r0.dimAtual, '1');
      await page.waitForTimeout(500);
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building')).building);
      const m0 = await modelo();
      const horiz = m0.vigas.filter((v) => v.pontos[0][1] === v.pontos[1][1]);
      assert.equal(horiz.length, 2);
      const cardVigas = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) });
      // 1) tabela de estribos só com φ6,3: só o detalhe muda — revisão de detalhe sobe, a de cálculo e a análise não
      await cmd('tabela.definir {"tipo": "estribos", "tabela": {"id": "padrao", "nome": "Padrão", "linhas": [{"bAte": 999, "bitolas": [6.3], "sMin": 8, "sMax": 20, "ramos": [2]}]}}');
      await espera((d) => d.rearmes === '1' && d.dimAtual === '1');
      const r1 = await rev();
      assert.equal(r1.analises, '1', 'a análise não foi refeita');
      assert.equal(r1.revCalculo, r0.revCalculo);
      assert.equal(r1.revAnalise, r0.revAnalise);
      assert.equal(Number(r1.revDetalhe), Number(r0.revDetalhe) + 1);
      assert.equal(r1.revDim, r1.revDetalhe);
      assert.match(await cardVigas.locator('tbody tr').first().innerText(), /φ6,3/);
      // 2) opção de dimensionamento (redistribuição) também só rearma
      await cmd('opcoes.definir {"valores": {"redistribuicao": 0}}');
      await espera((d) => d.rearmes === '2' && d.dimAtual === '1');
      assert.equal((await rev()).analises, '1');
      // 3) agrupar as duas vigas horizontais (mesmos vãos e seção): a armadura do pórtico que governa vale para as duas
      await cmd(`vigas.agrupar {"acao": "criar", "ids": ${JSON.stringify(horiz.map((v) => v.id))}}`);
      await espera((d) => d.rearmes === '3' && d.dimAtual === '1');
      const ag = page.locator('[data-card-agrupamentos] tr[data-agrupamento="G1"]');
      await ag.waitFor();
      assert.match(await ag.innerText(), /vale/);
      assert.equal(await cardVigas.locator('td[data-bloq]', { hasText: 'agrup. G1' }).count(), 2);
      const arr = async () => (await cardVigas.locator('tbody tr').evaluateAll((rs) => rs.map((r) => [...r.querySelectorAll('td')].slice(0, 9).map((t) => t.textContent).join('|'))));
      const linhasAg = (await arr()).filter((t) => /^V[12]\|/.test(t));
      assert.equal(linhasAg.length, 2);
      assert.equal(linhasAg[0].split('|').slice(5).join('|'), linhasAg[1].split('|').slice(5).join('|'), 'mesma armadura no agrupamento');
      assert.equal((await rev()).analises, '1');
      // 4) seleção para bloqueio: todos, nenhum, contagem; bloquear e desbloquear
      await page.locator('[data-abrir-selecao-bloqueio]').click();
      const jsel = page.locator('[data-selecao-bloqueio]');
      await jsel.waitFor();
      assert.match(await jsel.locator('[data-sel-contagem]').innerText(), /^0 selecionado/);
      await jsel.locator('[data-sel-todos]').click();
      assert.match(await jsel.locator('[data-sel-contagem]').innerText(), /^11 selecionado\(s\): 5 viga\(s\), 6 pilar/);
      await jsel.locator('[data-sel-nenhum]').click();
      assert.match(await jsel.locator('[data-sel-contagem]').innerText(), /^0 selecionado/);
      await jsel.locator('[data-sel-todos]').click();
      await jsel.locator('[data-sel-bloquear]').click();
      await livre();
      await page.waitForFunction(() => /\b3 vigas bloqueadas/.test(document.querySelector('[data-bloqueadas]')?.textContent ?? ''), null, { timeout: 60000 });
      assert.equal((await rev()).analises, '1', 'bloquear não refaz a análise');
      await jsel.locator('[data-sel-desbloquear]').click();
      await livre();
      await page.waitForFunction(() => /\b0 vigas bloqueadas/.test(document.querySelector('[data-bloqueadas]')?.textContent ?? ''), null, { timeout: 60000 });
      await page.getByRole('dialog', { name: 'Seleção para bloqueio de armaduras' }).getByRole('button', { name: 'Fechar' }).click();
      // 5) seção alterada (viga vertical central 20×70): análise desatualizada, esforços guardados servem para rearmar
      const vert = m0.vigas.find((v) => v.pontos[0][0] === 5 && v.pontos[1][0] === 5);
      const rAntes = await rev();
      await cmd(`viga.editar {"id": "${vert.id}", "secao": {"b": 0.2, "h": 0.7}}`);
      await page.locator('[data-esforcos-antigos]').waitFor();
      const r2 = await rev();
      assert.equal(r2.analiseAtual, '0');
      assert.equal(r2.revEsforcos, rAntes.revEsforcos, 'seção não invalida os esforços guardados');
      assert.equal(Number(r2.revCalculo), Number(rAntes.revCalculo) + 1);
      await page.getByRole('button', { name: /^Rearmar alterados \(1\)$/ }).click();
      await livre();
      await espera((d, a) => Number(d.rearmes) === a, Number(r2.rearmes) + 1);
      const r3 = await rev();
      assert.equal(r3.analises, '1', 'rearmar alterados não refaz a análise');
      assert.equal(r3.analiseAtual, '0');
      const nomeVert = m0.vigas.find((v) => v.id === vert.id).nome;
      assert.match(await cardVigas.locator('tbody tr', { hasText: nomeVert }).first().innerText(), /20×70/);
      await page.locator('[data-lista-erros] tbody tr.warn', { hasText: 'ESFORCO_ANTIGO' }).first().waitFor({ timeout: 30000 });
      assert.match(await page.locator('[data-rearme-info]').innerText(), /modo “alterados”.*1 elemento\(s\) refeito\(s\)/);
      // refazer a análise: a nota some e a análise roda uma segunda vez
      await page.getByRole('button', { name: 'Refazer a análise' }).click();
      await page.waitForFunction(() => document.querySelector('[data-rearmar]')?.dataset.analises === '2' && document.querySelector('[data-rearmar]')?.dataset.analiseAtual === '1', null, { timeout: 120000 });
      assert.equal(await page.locator('[data-esforcos-antigos]').count(), 0);
      // 6) cópia da armadura das lajes: salvar, apagar a base, recuperar
      await cmd(`laje.armaduraBase {"ids": ["${m0.lajes[0].id}"], "inf": {"barras": [{"dir": 0, "phi": 6.3, "s": 15}]}}`);
      await livre();
      const copia = page.locator('[data-card-copia-lajes]');
      await copia.getByLabel('Nome da cópia').fill('Antes do furo');
      await copia.locator('[data-copia-salvar]').click();
      await copia.locator('tr[data-copia="Antes do furo"]').waitFor();
      await cmd(`laje.armaduraBase {"ids": ["${m0.lajes[0].id}"], "remover": ["inf"]}`);
      await livre();
      await copia.locator('tr[data-copia="Antes do furo"] [data-copia-recuperar]').click();
      await page.waitForFunction((id) => JSON.parse(localStorage.getItem('statikos:building')).building.lajes.find((l) => l.id === id)?.base?.inf?.barras?.[0]?.s === 15, m0.lajes[0].id, { timeout: 60000 });
      await livre();
      // 7) memorial: agrupamentos, rearme e cópias
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.textContent();
      assert.match(mt, /Pórticos agrupados/);
      assert.match(mt, /Rearme e cópias de armadura/);
      assert.match(mt, /Cópias da armadura das lajes guardadas: “Antes do furo”/);
      assert.match(mt, /rearmar-agrupar-copiar|Rearmar, agrupar e copiar \(R7f\)/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_R7g = {
    name: 'R7g: sugestões na legenda, janela do pilar (dados, taxa, situação e navegação), capacidade nas vigas, relatórios, gabarito e ponto fixo nas pranchas, memorial com listagem, índices e ELU por combinação',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [10, 0], [0, 4], [5, 4], [10, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [10, 0]], [[0, 4], [10, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]], [[10, 0], [10, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 90000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 90000 });
      await livre();
      await page.waitForTimeout(500);
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building')).building);
      const m0 = await modelo();
      // 1) legenda dos códigos com a sugestão de correção
      const lista = page.locator('[data-lista-erros]');
      await lista.locator('summary', { hasText: 'Legenda dos códigos' }).click();
      assert.match(await lista.locator('details').innerText(), /Sugestão[\s\S]*Aumente a largura ou a altura da seção/);
      // 2) relatórios e índices
      const rel = page.locator('[data-relatorios]');
      await rel.waitFor();
      const ind = await rel.locator('[data-indices] tbody tr').innerText();
      assert.ok(/\d/.test(ind));
      for (const k of ['pilares-html', 'pilares-csv', 'listagem', 'quantitativos', 'intercambio-json', 'intercambio-csv']) assert.equal(await rel.locator(`[data-relatorio="${k}"]`).count(), 1);
      await rel.locator('summary', { hasText: 'Quantitativos por pano' }).click();
      assert.equal(await rel.locator('[data-quant-panos] tbody tr').count(), m0.lajes.length);
      assert.equal(await rel.locator('[data-quant-vigas] tbody tr').count(), m0.vigas.length);
      // 3) janela do pilar: dados, taxa, planta de situação e navegação
      const cardPil = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: 'Pilares (por lance)' }) });
      await cardPil.locator('tbody tr', { hasText: 'P1' }).first().dblclick();
      const jp = page.getByRole('dialog', { name: /Resultados do elemento — Pilar/ });
      await jp.waitFor();
      assert.equal(await jp.locator('[data-situacao-pilares]').getAttribute('data-situacao-pilares'), '6');
      assert.equal(await jp.locator('[data-pilar-situacao]').count(), 6);
      assert.match(await jp.locator('[data-dados-pilar]').innerText(), /Ângulo[\s\S]*Ponto fixo[\s\S]*Engaste por lance[\s\S]*Profundidade do apoio/);
      assert.match(await jp.locator('.rev-lance').first().innerText(), /Taxa As\/Ac \(%\)\s*\d/);
      assert.equal(await jp.locator('[data-pilar-atual]').innerText(), 'P1');
      assert.equal(await jp.getByRole('button', { name: 'Pilar anterior' }).isDisabled(), true);
      await jp.getByRole('button', { name: 'Próximo pilar' }).click();
      await page.waitForFunction(() => document.querySelector('[data-pilar-atual]')?.textContent === 'P2', null, { timeout: 15000 });
      await jp.locator('[data-pilar-situacao]').nth(3).click();
      await page.waitForFunction(() => document.querySelector('[data-pilar-atual]')?.textContent === 'P4', null, { timeout: 15000 });
      await jp.getByRole('button', { name: 'Fechar' }).click();
      // 4) janela da viga: linhas de capacidade resistente no diagrama de momentos
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) }).locator('tbody tr').first().dblclick();
      const jv = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await jv.waitFor();
      await jv.locator('[data-diagrama="M"] [data-curva="MRd+"]').waitFor();
      assert.equal(await jv.locator('[data-diagrama="M"] [data-curva="MRd−"]').count(), 1);
      await jv.getByRole('button', { name: 'Fechar' }).click();
      // 5) pranchas: gabarito e ponto fixo
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const prev = page.locator('.prancha-prev');
      await page.getByLabel('Tipo de prancha').selectOption({ label: 'Formas' });
      await prev.locator('svg').waitFor();
      const n0 = await prev.locator('svg circle').count();
      await page.locator('summary', { hasText: 'Opções de armação e locação' }).click();
      await page.getByLabel(/^Gabarito \(máscara DXF\/DWG\)/).waitFor();
      await page.getByLabel('Ponto fixo dos pilares nas formas e nas lajes').check();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('statikos:building')).building.prancha?.armacao?.pontoFixo === 1, null, { timeout: 15000 });
      await page.waitForFunction((n) => document.querySelectorAll('.prancha-prev svg circle').length >= n + 6, n0, { timeout: 30000 });
      await page.getByLabel('Ponto fixo dos pilares nas formas e nas lajes').uncheck();
      await page.waitForFunction((n) => document.querySelectorAll('.prancha-prev svg circle').length === n, n0, { timeout: 30000 });
      // 6) memorial: listagem, índices e, ligado, as verificações ELU por combinação
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      await memo.locator('[data-memorial-listagem]').waitFor();
      const mt = await memo.innerText();
      assert.match(mt, /Pilares: coordenadas, dimensões e vínculos/);
      assert.match(mt, /Lajes: geometria e pesos/);
      assert.match(mt, /Taxa de armadura dos pilares/);
      assert.match(mt, /Quantitativos por pano e por viga/);
      await memo.locator('[data-memorial-indices]').waitFor();
      assert.equal(await memo.locator('[data-memorial-elu-comb]').count(), 0);
      await memo.getByLabel('ELU por combinação').check();
      await memo.locator('[data-memorial-elu-comb]').waitFor();
      assert.match(await memo.locator('[data-memorial-elu-comb]').innerText(), /Pilares: combinações determinantes[\s\S]*Vigas: combinação que dá cada extremo/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 7) pilar largo com a tabela de grampos "só o estribo perimetral": aviso GRAMPOS_TABELA
      const p1 = m0.pilares.find((p) => p.nome === 'P1');
      await cmd(`pilar.editar {"id": "${p1.id}", "secao": {"tipo": "ret", "b": 0.2, "h": 0.9}}`);
      await cmd('tabela.definir {"tipo": "pilares", "tabela": {"id": "padrao", "nome": "Padrão", "bitolas": [10, 12.5, 16, 20, 25], "espacamentos": [30, 25, 20, 15, 12, 10], "estribos": [], "grampos": [{"phiAte": 25, "ladoMaiorAte": 999, "modo": "nenhum"}]}}');
      await livre();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await livre();
      await lista.locator('tbody tr', { hasText: 'GRAMPOS_TABELA' }).first().waitFor({ timeout: 60000 });
    },
  };

export const f_R7g_2 = {
    name: 'R7g: sugestões na legenda, janela do pilar (dados, taxa, situação e navegação), capacidade nas vigas, relatórios, gabarito e ponto fixo nas pranchas, memorial com listagem, índices e ELU por combinação',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [10, 0], [0, 4], [5, 4], [10, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [10, 0]], [[0, 4], [10, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]], [[10, 0], [10, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 90000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 90000 });
      await livre();
      await page.waitForTimeout(500);
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building')).building);
      const m0 = await modelo();
      // 1) legenda dos códigos com a sugestão de correção
      const lista = page.locator('[data-lista-erros]');
      await lista.locator('summary', { hasText: 'Legenda dos códigos' }).click();
      assert.match(await lista.locator('details').innerText(), /Sugestão[\s\S]*Aumente a largura ou a altura da seção/);
      // 2) relatórios e índices
      const rel = page.locator('[data-relatorios]');
      await rel.waitFor();
      const ind = await rel.locator('[data-indices] tbody tr').innerText();
      assert.ok(/\d/.test(ind));
      for (const k of ['pilares-html', 'pilares-csv', 'listagem', 'quantitativos', 'intercambio-json', 'intercambio-csv']) assert.equal(await rel.locator(`[data-relatorio="${k}"]`).count(), 1);
      await rel.locator('summary', { hasText: 'Quantitativos por pano' }).click();
      assert.equal(await rel.locator('[data-quant-panos] tbody tr').count(), m0.lajes.length);
      assert.equal(await rel.locator('[data-quant-vigas] tbody tr').count(), m0.vigas.length);
      // 3) janela do pilar: dados, taxa, planta de situação e navegação
      const cardPil = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: 'Pilares (por lance)' }) });
      await cardPil.locator('tbody tr', { hasText: 'P1' }).first().dblclick();
      const jp = page.getByRole('dialog', { name: /Resultados do elemento — Pilar/ });
      await jp.waitFor();
      assert.equal(await jp.locator('[data-situacao-pilares]').getAttribute('data-situacao-pilares'), '6');
      assert.equal(await jp.locator('[data-pilar-situacao]').count(), 6);
      assert.match(await jp.locator('[data-dados-pilar]').innerText(), /Ângulo[\s\S]*Ponto fixo[\s\S]*Engaste por lance[\s\S]*Profundidade do apoio/);
      assert.match(await jp.locator('.rev-lance').first().innerText(), /Taxa As\/Ac \(%\)\s*\d/);
      assert.equal(await jp.locator('[data-pilar-atual]').innerText(), 'P1');
      assert.equal(await jp.getByRole('button', { name: 'Pilar anterior' }).isDisabled(), true);
      await jp.getByRole('button', { name: 'Próximo pilar' }).click();
      await page.waitForFunction(() => document.querySelector('[data-pilar-atual]')?.textContent === 'P2', null, { timeout: 15000 });
      await jp.locator('[data-pilar-situacao]').nth(3).click();
      await page.waitForFunction(() => document.querySelector('[data-pilar-atual]')?.textContent === 'P4', null, { timeout: 15000 });
      await jp.getByRole('button', { name: 'Fechar' }).click();
      // 4) janela da viga: linhas de capacidade resistente no diagrama de momentos
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) }).locator('tbody tr').first().dblclick();
      const jv = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await jv.waitFor();
      await jv.locator('[data-diagrama="M"] [data-curva="MRd+"]').waitFor();
      assert.equal(await jv.locator('[data-diagrama="M"] [data-curva="MRd−"]').count(), 1);
      await jv.getByRole('button', { name: 'Fechar' }).click();
      // 5) pranchas: gabarito e ponto fixo
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const prev = page.locator('.prancha-prev');
      await page.getByLabel('Tipo de prancha').selectOption({ label: 'Formas' });
      await prev.locator('svg').waitFor();
      const n0 = await prev.locator('svg circle').count();
      await page.locator('summary', { hasText: 'Opções de armação e locação' }).click();
      await page.getByLabel(/^Gabarito \(máscara DXF\/DWG\)/).waitFor();
      await page.getByLabel('Ponto fixo dos pilares nas formas e nas lajes').check();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('statikos:building')).building.prancha?.armacao?.pontoFixo === 1, null, { timeout: 15000 });
      await page.waitForFunction((n) => document.querySelectorAll('.prancha-prev svg circle').length >= n + 6, n0, { timeout: 30000 });
      await page.getByLabel('Ponto fixo dos pilares nas formas e nas lajes').uncheck();
      await page.waitForFunction((n) => document.querySelectorAll('.prancha-prev svg circle').length === n, n0, { timeout: 30000 });
      // 6) memorial: listagem, índices e, ligado, as verificações ELU por combinação
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      await memo.locator('[data-memorial-listagem]').waitFor();
      const mt = await memo.innerText();
      assert.match(mt, /Pilares: coordenadas, dimensões e vínculos/);
      assert.match(mt, /Lajes: geometria e pesos/);
      assert.match(mt, /Taxa de armadura dos pilares/);
      assert.match(mt, /Quantitativos por pano e por viga/);
      await memo.locator('[data-memorial-indices]').waitFor();
      assert.equal(await memo.locator('[data-memorial-elu-comb]').count(), 0);
      await memo.getByLabel('ELU por combinação').check();
      await memo.locator('[data-memorial-elu-comb]').waitFor();
      assert.match(await memo.locator('[data-memorial-elu-comb]').innerText(), /Pilares: combinações determinantes[\s\S]*Vigas: combinação que dá cada extremo/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 7) pilar largo com a tabela de grampos "só o estribo perimetral": aviso GRAMPOS_TABELA
      const p1 = m0.pilares.find((p) => p.nome === 'P1');
      await cmd(`pilar.editar {"id": "${p1.id}", "secao": {"tipo": "ret", "b": 0.2, "h": 0.9}}`);
      await cmd('tabela.definir {"tipo": "pilares", "tabela": {"id": "padrao", "nome": "Padrão", "bitolas": [10, 12.5, 16, 20, 25], "espacamentos": [30, 25, 20, 15, 12, 10], "estribos": [], "grampos": [{"phiAte": 25, "ladoMaiorAte": 999, "modo": "nenhum"}]}}');
      await livre();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await livre();
      await lista.locator('tbody tr', { hasText: 'GRAMPOS_TABELA' }).first().waitFor({ timeout: 60000 });
    },
  };
