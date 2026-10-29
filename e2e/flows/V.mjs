// Fluxos de interface — V (parte 1/1).
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { faixaAba, grupoEdif, tab, telaDe, botaoCalcular } from './helpers.mjs';

export const f_V1 = {
    webgl: true,
    name: 'V1: vista 3D — abre a aba, canvas, filtro por pavimento muda data-cena, projeção, caminhar, transparência, seleção sincronizada com a planta e o vendor do three fora do HTML',
    async run({ newPage, baseURL }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: '3D', exact: true }).click();
      const cv = page.locator('.v3d-cv');
      await cv.waitFor();
      await page.waitForFunction(() => document.querySelector('.v3d-cv')?.getAttribute('data-status') !== 'carregando');
      const cena = async () => JSON.parse(await cv.getAttribute('data-cena'));
      const status = await cv.getAttribute('data-status');
      const inicial = await cena();
      console.log(`        (vista 3D em modo ${status}; cena ${JSON.stringify(inicial)})`);
      assert.ok(inicial.total > 0 && inicial.pilar > 0 && inicial.viga > 0 && inicial.laje > 0, JSON.stringify(inicial));
      // o three.js não entra no HTML único: vem de /vendor, sob demanda
      const html = await (await page.request.get(baseURL)).text();
      assert.ok(!html.includes('THREE.WebGLRenderer'), 'o HTML único não pode conter o three.js');
      assert.equal((await page.request.get(baseURL + 'vendor/three-0.186.1.mjs')).status(), 200);

      if (status === 'pronto') {
        assert.equal(await cv.locator('canvas').count(), 1);
        await page.waitForFunction(() => Number(document.querySelector('.v3d-cv')?.getAttribute('data-frame-ms')) >= 0);
        // girar arrastando muda o azimute exibido
        const az = async () => page.locator('.v3d-barra .slider', { hasText: 'Azimute' }).locator('input').inputValue();
        const az0 = await az();
        const box = await cv.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 20, { steps: 6 });
        await page.mouse.up();
        await page.waitForFunction((a) => [...document.querySelectorAll('.slider')].find((l) => l.textContent.startsWith('Azimute')).querySelector('input').value !== a, az0);
        // perspectiva <-> isométrica
        assert.equal(await cv.getAttribute('data-projecao'), 'perspectiva');
        await page.getByRole('radio', { name: 'Isométrica' }).click();
        assert.equal(await cv.getAttribute('data-projecao'), 'isometrica');
        await page.getByRole('radio', { name: 'Perspectiva' }).click();
        assert.equal(await cv.getAttribute('data-projecao'), 'perspectiva');
        // transparência das lajes
        await page.locator('.v3d-barra .slider', { hasText: 'Lajes' }).locator('input').fill('80');
        assert.match(await page.locator('.slider', { hasText: 'Lajes' }).locator('output').innerText(), /80/);
        // caminhar: liga o modo, anda com W e volta
        await page.getByRole('button', { name: 'Caminhar' }).click();
        assert.equal(await cv.getAttribute('data-caminhar'), '1');
        await cv.focus();
        await page.keyboard.down('w');
        await page.waitForTimeout(250);
        await page.keyboard.up('w');
        await page.getByRole('button', { name: 'Caminhar' }).click();
        assert.equal(await cv.getAttribute('data-caminhar'), '0');
      } else {
        // sem WebGL: o isométrico em SVG da mesma cena
        assert.equal(await cv.getAttribute('data-projecao'), 'svg');
        assert.ok(await cv.locator('svg.v3d-iso path').count() > 0);
      }

      // filtro por pavimento: a contagem exposta muda e fica só naquele pavimento
      await page.locator('.v3d-barra').getByLabel('Escopo da vista 3D').selectOption('pavimento');
      const sel = page.locator('.v3d-barra').getByLabel('Pavimento');
      const opcoes = await sel.locator('option').allInnerTexts();
      assert.ok(opcoes.includes('Tipo 2'), opcoes.join(','));
      await sel.selectOption({ label: 'Tipo 2' });
      await page.waitForFunction((t) => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-cena')).total < t, inicial.total);
      const um = await cena();
      assert.equal(Object.keys(um.pavimentos).length, 1);
      assert.ok(um.laje >= 1 && um.viga >= 4, JSON.stringify(um));
      // tipo oculto sai da contagem
      await page.getByRole('button', { name: 'Pilares', exact: true }).click();
      await page.waitForFunction(() => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-cena')).pilar === undefined);
      await page.getByRole('button', { name: 'Pilares', exact: true }).click();
      // edifício completo de volta
      await page.locator('.v3d-barra').getByLabel('Escopo da vista 3D').selectOption('edificio');
      await page.waitForFunction((t) => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-cena')).total === t, inicial.total);

      // seleção sincronizada com a planta: o que a planta seleciona aparece na barra de estado da vista
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta', exact: true }).click();
      await page.locator('.planta-st').click();
      await page.keyboard.press('s');
      const v = JSON.parse(await page.locator('.planta-cv').getAttribute('data-vista'));
      const caixa = await page.locator('canvas.int').boundingBox();
      await page.mouse.click(caixa.x + v.ox, caixa.y + v.oy);
      await page.locator('.edif-tabs').getByRole('tab', { name: '3D', exact: true }).click();
      await page.locator('.v3d-sel-info').waitFor();
      assert.match(await page.locator('.v3d-sel-info').innerText(), /Selecionado:\s+P\d/);

      // memorial do edifício: a vista isométrica (mesma geometria) é opcional e sai como figura SVG
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.equal(await memo.locator('figure[data-isometrico]').count(), 0);
      await memo.getByLabel('Incluir vista isométrica').check();
      assert.ok(await memo.locator('figure[data-isometrico] svg path[fill]').count() > 20);
    },
  };

export const f_V1_2 = {
    name: 'V1: sem o three.js (artifact do claude.ai) a vista 3D cai para o isométrico em SVG, com barras de rotação e seleção',
    async run({ newPage }) {
      // sem service worker para a rota abortar o vendor de verdade (o worker responderia por ele)
      const page = await newPage(undefined, { serviceWorkers: 'block' });
      await page.context().route('**/vendor/three-*', (r) => r.abort());
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: '3D', exact: true }).click();
      const cv = page.locator('.v3d-cv');
      await page.waitForFunction(() => document.querySelector('.v3d-cv')?.getAttribute('data-status') === 'sem-vendor');
      assert.equal(await cv.getAttribute('data-projecao'), 'svg');
      assert.match(await page.locator('.v3d-aviso').first().innerText(), /three\.js não está disponível/);
      assert.ok(await cv.locator('svg.v3d-iso path').count() > 20);
      assert.equal(await cv.locator('canvas').count(), 0);
      // as barras de azimute e elevação refazem o desenho
      const antes = await cv.locator('svg.v3d-iso').innerHTML();
      await page.locator('.v3d-barra .slider', { hasText: 'Azimute' }).locator('input').fill('40');
      assert.notEqual(await cv.locator('svg.v3d-iso').innerHTML(), antes);
      // o filtro por tipo vale no fallback
      const total = JSON.parse(await cv.getAttribute('data-cena')).total;
      await page.getByRole('button', { name: 'Lajes', exact: true }).click();
      await page.waitForFunction((t) => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-cena')).total < t, total);
      await page.getByRole('button', { name: 'Lajes', exact: true }).click();
      // clique no desenho seleciona o elemento (o mesmo estado da planta)
      await cv.locator('svg.v3d-iso path[data-id^="pilar:"]').first().click({ force: true });
      await page.locator('.v3d-sel-info').waitFor();
      assert.match(await page.locator('.v3d-sel-info').innerText(), /Selecionado:\s+P\d/);
    },
  };

export const f_V2 = {
    webgl: true,
    name: 'V2: cortes e linhas de seção (traçar, janela, renomear, profundidade, memorial, apagar) e armaduras em 3D (vista do edifício e aba 3D da viga, do pilar e da laje)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });

      // ---- corte traçado na planta: a janela abre sozinha com a elevação hachurada
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta', exact: true }).click();
      await page.locator('.planta-cv[data-vista]').waitFor();
      await grupoEdif(page, /^Cortes e seções/);
      await page.getByRole('button', { name: 'Traçar corte na planta', exact: true }).click();
      await page.waitForTimeout(300);
      const [ax, ay] = await telaDe(page, -1, 2.5), [bx, by] = await telaDe(page, 7, 2.5);
      await page.mouse.click(ax, ay);
      await page.mouse.click(bx, by);
      await page.keyboard.press('Enter');
      const jc = page.getByRole('dialog', { name: /^Corte — Corte AA/ });
      await jc.waitFor();
      const svg = jc.locator('svg.corte-svg');
      assert.ok(Number(await svg.getAttribute('data-secoes')) >= 3, await svg.getAttribute('data-secoes'));
      assert.ok(await svg.locator('polygon.corte-sec').count() >= 3);
      assert.match(await jc.innerText(), /Fundação .*Térreo/);
      await page.keyboard.press('Escape');
      assert.equal(await jc.count(), 0);

      // ---- lista: renomear, profundidade, reabrir
      const nome = page.getByLabel('Nome do corte Corte AA', { exact: true });
      await nome.fill('Longitudinal');
      await nome.press('Enter');
      await page.getByLabel('Nome do corte Longitudinal', { exact: true }).waitFor();
      await page.getByLabel(/^Profundidade de Longitudinal/).fill('1');
      await page.getByLabel(/^Profundidade de Longitudinal/).press('Enter');
      await page.getByRole('button', { name: 'Abrir Longitudinal', exact: true }).click();
      const jc2 = page.getByRole('dialog', { name: /^Corte — Longitudinal/ });
      await jc2.waitFor();
      assert.match(await jc2.innerText(), /até 1,00 m/);
      await page.keyboard.press('Escape');

      // ---- linha de seção: dois cliques e a janela abre sozinha com os vãos
      await page.getByRole('button', { name: 'Traçar linha de seção na planta', exact: true }).click();
      await page.waitForTimeout(300);
      const [cx, cy] = await telaDe(page, -1, 2.5), [dx, dy] = await telaDe(page, 7, 2.5);
      await page.mouse.click(cx, cy);
      await page.mouse.click(dx, dy);
      const js = page.getByRole('dialog', { name: /^Seção — Seção 1/ });
      await js.waitFor();
      assert.ok(await js.locator('[data-secao-vaos] tbody tr').count() >= 1);
      assert.match(await js.locator('[data-secao-vaos]').innerText(), /5,85/); // 6 m de eixo a eixo − 15 cm de viga
      assert.ok(await js.locator('svg.corte-svg rect.corte-sec').count() >= 3);
      await js.getByLabel(/^Pavimento da seção/).selectOption({ label: 'Tipo 2' });
      await js.getByText(/em Tipo 2/).waitFor();
      await page.keyboard.press('Escape');

      // ---- memorial: uma figura por corte e por seção
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.equal(await memo.locator('figure[data-memorial-corte] svg.corte-svg').count(), 1);
      assert.equal(await memo.locator('figure[data-memorial-secao] svg.corte-svg').count(), 1);
      await memo.getByRole('button', { name: 'Fechar' }).click();

      // ---- armaduras na vista 3D do edifício
      await page.locator('.edif-tabs').getByRole('tab', { name: '3D', exact: true }).click();
      const cv = page.locator('.v3d-cv').first();
      await page.waitForFunction(() => document.querySelector('.v3d-cv')?.getAttribute('data-status') !== 'carregando');
      const status = await cv.getAttribute('data-status');
      console.log(`        (V2: vista 3D em modo ${status})`);
      assert.equal(await cv.getAttribute('data-armaduras'), '0');
      await page.getByLabel('Armaduras', { exact: true }).check();
      await page.waitForFunction(() => { const a = document.querySelector('.v3d-cv')?.getAttribute('data-armaduras'); return !!a && a !== '0' && JSON.parse(a).barras > 0; });
      const arm = JSON.parse(await cv.getAttribute('data-armaduras'));
      assert.ok(arm.segmentos > 100 && arm.camadas >= 2 && !arm.truncado, JSON.stringify(arm));
      await page.locator('.v3d-barra').getByLabel('Colorir armaduras por', { exact: true }).selectOption('elemento');
      await page.waitForFunction((n) => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-armaduras')).camadas !== n, arm.camadas);
      if (status === 'pronto') {
        await page.getByLabel('Barras como tubos', { exact: true }).check();
        await page.locator('.v3d-barra .slider', { hasText: 'Espessura das barras' }).locator('input').fill('10');
        await page.waitForFunction(() => Number(document.querySelector('.v3d-cv')?.getAttribute('data-frame-ms')) >= 0);
      }
      // escopo de um pavimento: menos barras
      await page.locator('.v3d-barra').getByLabel('Escopo da vista 3D').selectOption('pavimento');
      await page.locator('.v3d-barra').getByLabel('Pavimento', { exact: true }).selectOption({ label: 'Tipo 2' });
      await page.waitForFunction((n) => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-armaduras')).segmentos < n, arm.segmentos);

      // ---- aba 3D das janelas de armadura
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const card = (t) => page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: t }) });
      for (const [titulo, dialogo, tipo] of [[/^Vigas$/, /Resultados do elemento — Viga/, 'viga'], ['Pilares (por lance)', /Resultados do elemento — Pilar/, 'pilar'], [/^Lajes$/, /Resultados do elemento — Laje/, 'laje']]) {
        await card(titulo).locator('tbody tr').first().dblclick();
        const j = page.getByRole('dialog', { name: dialogo });
        await j.waitFor();
        await j.getByRole('radio', { name: '3D', exact: true }).click();
        const a3 = j.locator('[data-armadura3d]');
        await a3.waitFor();
        const info = JSON.parse(await a3.getAttribute('data-armadura3d'));
        assert.equal(info.tipo, tipo);
        assert.ok(info.barras > 0 && info.segmentos > 0, JSON.stringify(info));
        if (status === 'pronto') {
          await j.locator('.armadura3d-cv[data-status="pronto"] canvas').waitFor();
          await page.waitForFunction(() => Number(document.querySelector('.armadura3d-cv')?.getAttribute('data-frame-ms')) >= 0);
        } else {
          assert.equal(await j.locator('.armadura3d-cv canvas').count(), 0);
        }
        await page.keyboard.press('Escape');
      }

      // ---- apagar corte e seção
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta', exact: true }).click();
      await page.getByRole('button', { name: 'Apagar Longitudinal', exact: true }).click();
      await page.getByRole('button', { name: 'Apagar Seção 1', exact: true }).click();
      assert.equal(await page.locator('[data-cortes-lista]').count(), 0);
      assert.equal(await page.locator('[data-secoes-lista]').count(), 0);
    },
  };

export const f_V3 = {
    webgl: true,
    name: 'V3: deformada 3D (hipótese, escala, eixos, animação, legenda), consulta de deslocamentos por nó, máximos por pano e pavimento, CSV e flecha entre dois pontos da laje',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');

      // ---- sem cálculo: aviso na aba
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Deslocamentos', exact: true }).click();
      await page.getByText('Calcule a estrutura (aba Dimensionamento) para consultar os deslocamentos.').waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });

      // ---- deformada na vista 3D
      await page.locator('.edif-tabs').getByRole('tab', { name: '3D', exact: true }).click();
      const cv = page.locator('.v3d-cv');
      await cv.waitFor();
      await page.waitForFunction(() => document.querySelector('.v3d-cv')?.getAttribute('data-status') !== 'carregando');
      const status = await cv.getAttribute('data-status');
      console.log(`        (V3: vista 3D em modo ${status})`);
      assert.equal(await cv.getAttribute('data-deformada'), '0');
      await page.getByLabel('Deformada', { exact: true }).check();
      await page.waitForFunction(() => { const a = document.querySelector('.v3d-cv')?.getAttribute('data-deformada'); return !!a && a !== '0'; });
      const def = async () => JSON.parse(await cv.getAttribute('data-deformada'));
      const d0 = await def();
      assert.equal(d0.modo, 'completa');
      assert.ok(d0.dmaxMm > 0.01 && d0.escala > 1 && d0.objetos > 5, JSON.stringify(d0));
      if (status === 'pronto') {
        const leg = page.locator('.v3d-def-leg');
        await leg.waitFor();
        assert.match(await leg.innerText(), /mm/);
        assert.equal(await leg.getByRole('img', { name: 'Legenda da deformada', exact: true }).count(), 1);
      }
      // troca a hipótese: o máximo muda
      const lista = page.locator('.v3d-barra').getByLabel('Hipótese da deformada', { exact: true });
      const valores = await lista.locator('option').evaluateAll((os) => os.map((o) => o.value));
      assert.ok(valores.includes('caso:G') && valores.includes('caso:Q') && valores.length > 4, valores.join(','));
      await lista.selectOption('caso:Q');
      await page.waitForFunction((n) => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-deformada')).dmaxMm !== n, d0.dmaxMm);
      const dq = await def();
      assert.ok(dq.dmaxMm > 0 && dq.dmaxMm < d0.dmaxMm, `${dq.dmaxMm} < ${d0.dmaxMm}`);
      // escala manual e de volta à automática
      await page.getByLabel('Escala automática', { exact: true }).uncheck();
      await page.locator('.v3d-barra .slider', { hasText: 'Escala da deformada' }).locator('input').fill('100');
      await page.waitForFunction(() => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-deformada')).escala === 100);
      await page.getByLabel('Escala automática', { exact: true }).check();
      // estrutura simplificada (eixos)
      await page.getByLabel('Só eixos das barras', { exact: true }).check();
      await page.waitForFunction(() => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-deformada')).modo === 'eixos');
      await page.getByLabel('Só eixos das barras', { exact: true }).uncheck();
      await page.waitForFunction(() => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-deformada')).modo === 'completa');
      // animação (só com WebGL): liga, ajusta o período, desliga
      if (status === 'pronto') {
        await page.getByLabel('Animar', { exact: true }).check();
        await page.waitForFunction(() => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-deformada')).animando === true);
        await page.locator('.v3d-barra .slider', { hasText: 'Período da animação' }).locator('input').fill('4');
        await page.waitForFunction(() => Number(document.querySelector('.v3d-cv')?.getAttribute('data-frame-ms')) >= 0);
        await page.getByLabel('Animar', { exact: true }).uncheck();
      }
      await page.getByLabel('Deformada', { exact: true }).uncheck();
      await page.waitForFunction(() => document.querySelector('.v3d-cv')?.getAttribute('data-deformada') === '0');

      // ---- aba Deslocamentos: consulta por nó
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Deslocamentos', exact: true }).click();
      await page.getByLabel(/^X da consulta/).fill('3');
      await page.getByLabel(/^X da consulta/).press('Enter');
      await page.getByLabel(/^Y da consulta/).fill('2,5');
      await page.getByLabel(/^Y da consulta/).press('Enter');
      const consulta = page.locator('[data-consulta-no]');
      await consulta.waitFor();
      assert.ok((await consulta.locator('tbody tr').count()) > 5);
      const linhaG = consulta.locator('tbody tr', { hasText: /^Caso G/ }).first();
      const uzG = parseFloat((await linhaG.locator('td').nth(3).innerText()).replace(',', '.'));
      assert.ok(uzG < -0.01, `uz de G no meio da laje: ${uzG} mm`);
      // máximos por pano e por pavimento
      assert.ok(Number(await page.locator('[data-desloc-panos]').getAttribute('data-desloc-panos')) >= 1);
      assert.ok(Number(await page.locator('[data-desloc-pilares]').getAttribute('data-desloc-pilares')) >= 3);
      // CSV da malha
      const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar CSV dos deslocamentos da malha', exact: true }).click()]);
      assert.equal(dl.suggestedFilename(), 'deslocamentos-malha.csv');

      // ---- flecha entre dois pontos: combinação mais desfavorável (padrão), secante e tangente
      const flecha = async () => JSON.parse(await page.locator('[data-flecha]').getAttribute('data-flecha'));
      await page.locator('[data-flecha]').waitFor();
      const f0 = await flecha();
      assert.ok(f0.L > 4 && f0.flechaMm > 0.01 && f0.razao > 1, JSON.stringify(f0));
      await page.getByLabel(/^X inicial/).fill('1');
      await page.getByLabel(/^X inicial/).press('Enter');
      await page.waitForFunction((L) => JSON.parse(document.querySelector('[data-flecha]').getAttribute('data-flecha')).L !== L, f0.L);
      const f1 = await flecha();
      assert.ok(f1.L < f0.L);
      await page.getByRole('radio', { name: 'Tangente no ponto inicial', exact: true }).click();
      await page.waitForFunction((v) => JSON.parse(document.querySelector('[data-flecha]').getAttribute('data-flecha')).flechaMm !== v, f1.flechaMm);
      await page.getByRole('radio', { name: 'Secante', exact: true }).click();
      await page.waitForFunction((v) => JSON.parse(document.querySelector('[data-flecha]').getAttribute('data-flecha')).flechaMm === v, f1.flechaMm);
      await page.getByLabel(/^Amplificação da flecha/).fill('2');
      await page.getByLabel(/^Amplificação da flecha/).press('Enter');
      await page.waitForFunction((v) => Math.abs(JSON.parse(document.querySelector('[data-flecha]').getAttribute('data-flecha')).flechaMm - 2 * v) < 0.01, f1.flechaMm);
      await page.getByLabel(/^Hipótese da flecha/).selectOption('caso:G');
      assert.equal(await page.locator('svg.flecha-perfil path.fp-curva').count(), 1);
    },
  };

export const f_V4 = {
    name: 'V4: isovalores da laje (grandeza, hipótese, níveis, limites, isolinhas e valores), várias janelas independentes, clique abrindo a janela da laje e saídas SVG, PNG, DXF e CSV',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');

      // ---- sem cálculo: aviso
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Isovalores', exact: true }).click();
      await page.getByText('Calcule a estrutura (aba Dimensionamento) para ver os mapas de isovalores.').waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Isovalores', exact: true }).click();

      const dados = async (n) => JSON.parse(await page.locator(`[data-isov-janela="${n}"]`).getAttribute('data-iso'));
      // ---- janela 1: deslocamento vertical do primeiro caso (negativo para baixo), mínimo no centro da laje
      await page.locator('[data-isov-janela="1"]').waitFor();
      let d1 = await dados(1);
      assert.equal(d1.grandeza, 'uz');
      assert.ok(d1.min < -0.01 && d1.bandas >= 3 && d1.isolinhas >= 2, JSON.stringify(d1));
      assert.ok(Math.abs(d1.minPos[0] - 3) < 0.6 && Math.abs(d1.minPos[1] - 2.5) < 0.6, JSON.stringify(d1.minPos));
      assert.equal(await page.locator('[data-isov-janela="1"] svg.isov-mapa').count(), 1);
      assert.ok((await page.locator('[data-isov-janela="1"] svg.isov-mapa polygon.iso-banda').count()) >= 3);
      // isolinhas e valores ligam e desligam
      await page.getByLabel('Isolinhas (janela 1)', { exact: true }).uncheck();
      assert.equal(await page.locator('[data-isov-janela="1"] polyline.iso-linha').count(), 0);
      await page.getByLabel('Isolinhas (janela 1)', { exact: true }).check();
      assert.ok((await page.locator('[data-isov-janela="1"] polyline.iso-linha').count()) >= 2);
      await page.getByLabel('Valores (janela 1)', { exact: true }).check();
      assert.ok((await page.locator('[data-isov-janela="1"] text.iso-valor').count()) >= 1);
      await page.getByLabel('Valores (janela 1)', { exact: true }).uncheck();

      // ---- grandeza de cálculo e área de aço
      await page.getByLabel(/^Grandeza \(janela 1\)/).selectOption('MxInf');
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-isov-janela="1"]').getAttribute('data-iso')).grandeza === 'MxInf');
      d1 = await dados(1);
      assert.ok(d1.max > 1 && d1.min >= 0, JSON.stringify(d1));
      await page.getByLabel(/^Grandeza \(janela 1\)/).selectOption('AsInfX');
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-isov-janela="1"]').getAttribute('data-iso')).grandeza === 'AsInfX');
      const asMax = (await dados(1)).max, asMin = (await dados(1)).min;
      assert.ok(asMax > 0.5 && asMax > asMin + 0.2, `As máx. ${asMax}, mín. ${asMin}`);

      // ---- limite mínimo restringe a faixa: o mínimo passa a ser o do limite
      const meio = +((asMax + asMin) / 2).toFixed(3);
      await page.getByLabel(/^Limite mínimo \(janela 1\)/).fill(String(meio).replace('.', ','));
      await page.getByLabel(/^Limite mínimo \(janela 1\)/).press('Enter');
      await page.waitForFunction((v) => JSON.parse(document.querySelector('[data-isov-janela="1"]').getAttribute('data-iso')).min >= v - 1e-3, meio);
      assert.ok(Math.abs((await dados(1)).max - asMax) < 1e-3);
      await page.getByLabel(/^Limite mínimo \(janela 1\)/).fill('');
      await page.getByLabel(/^Limite mínimo \(janela 1\)/).press('Enter');
      await page.waitForFunction((v) => JSON.parse(document.querySelector('[data-isov-janela="1"]').getAttribute('data-iso')).min < v - 1e-3, meio);

      // ---- níveis definidos
      await page.getByLabel(/^Níveis definidos \(janela 1\)/).fill('1; 2; 3');
      await page.getByLabel(/^Níveis definidos \(janela 1\)/).press('Tab');
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-isov-janela="1"]').getAttribute('data-iso')).niveis === 3);
      await page.getByLabel(/^Níveis definidos \(janela 1\)/).fill('');
      await page.getByLabel(/^Níveis definidos \(janela 1\)/).press('Tab');

      // ---- várias janelas independentes
      await page.getByRole('button', { name: 'Nova janela de isovalores', exact: true }).click();
      await page.locator('[data-isov-janela="2"]').waitFor();
      assert.equal(await page.locator('[data-isov-janelas]').getAttribute('data-isov-janelas'), '2');
      await page.getByLabel(/^Grandeza \(janela 2\)/).selectOption('uz');
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-isov-janela="2"]').getAttribute('data-iso')).grandeza === 'uz');
      assert.equal((await dados(1)).grandeza, 'AsInfX');
      const opcoes = await page.getByLabel(/^Hipótese \(janela 2\)/).evaluate((el) => [...el.options].map((o) => ({ v: o.value, t: o.textContent })));
      const casoG = opcoes.find((o) => /Caso G/.test(o.t)).v, casoQ = opcoes.find((o) => /Caso Q/.test(o.t))?.v;
      await page.getByLabel(/^Hipótese \(janela 2\)/).selectOption(casoG);
      const uzG = (await dados(2)).min;
      if (casoQ) {
        await page.getByLabel(/^Hipótese \(janela 2\)/).selectOption(casoQ);
        await page.waitForFunction((v) => JSON.parse(document.querySelector('[data-isov-janela="2"]').getAttribute('data-iso')).min !== v, uzG);
      }
      assert.equal((await dados(1)).grandeza, 'AsInfX');

      // ---- clique no mapa abre a janela da laje
      await page.locator('[data-isov-janela="2"] svg.isov-mapa').scrollIntoViewIfNeeded();
      const caixa = await page.locator('[data-isov-janela="2"] svg.isov-mapa').boundingBox();
      await page.mouse.click(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
      await page.locator('.modal, [role="dialog"]').first().waitFor({ timeout: 5000 });
      await page.keyboard.press('Escape');

      // ---- saídas
      const baixar = async (rot, ext) => {
        const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: rot, exact: true }).click()]);
        assert.ok(dl.suggestedFilename().endsWith(ext), dl.suggestedFilename());
      };
      await baixar('Baixar SVG (janela 1)', '.svg');
      await baixar('Baixar PNG (janela 1)', '.png');
      await baixar('Baixar DXF das isolinhas (janela 1)', '.dxf');
      await baixar('Baixar CSV x, y, valor (janela 1)', '.csv');

      // ---- fechar a janela 2 não mexe na 1
      await page.getByRole('button', { name: 'Fechar janela 2', exact: true }).click();
      assert.equal(await page.locator('[data-isov-janelas]').getAttribute('data-isov-janelas'), '1');
      assert.equal((await dados(1)).grandeza, 'AsInfX');
    },
  };

export const f_V5 = {
    webgl: true,
    name: 'V5: esforços por hipótese (envoltória, combinação, caso) em viga e pilar, estado da seção, janelas independentes, símbolos dos pilares e estilo de desenho nas pranchas',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');

      // ---- a vista aparece nas abas, no Navegador e na faixa (Análise)
      const vistas = page.locator('.edif-tabs');
      await vistas.getByRole('tab', { name: 'Esforços', exact: true }).click();
      await page.getByText('Calcule a estrutura (aba Dimensionamento) para ver os diagramas por hipótese.').waitFor();
      await vistas.getByRole('tab', { name: 'Planta', exact: true }).click();
      const arvore = page.getByRole('tree', { name: 'Navegador da obra' });
      const nv = arvore.getByRole('treeitem', { name: /^Vistas/ });
      if ((await nv.getAttribute('aria-expanded')) !== 'true') await nv.click();
      await arvore.getByRole('treeitem', { name: 'Esforços', exact: true }).click();
      assert.equal(await vistas.getByRole('tab', { name: 'Esforços', exact: true }).getAttribute('aria-selected'), 'true');
      await vistas.getByRole('tab', { name: 'Planta', exact: true }).click();
      await faixaAba(page, 'Resultados');
      await page.getByRole('toolbar', { name: /^Comandos: Resultados/ }).getByRole('button', { name: 'Ver Esforços', exact: true }).click();
      assert.equal(await vistas.getByRole('tab', { name: 'Esforços', exact: true }).getAttribute('aria-selected'), 'true');

      // ---- calcula e volta aos esforços
      await vistas.getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      await vistas.getByRole('tab', { name: 'Esforços', exact: true }).click();

      const dados = async (n) => JSON.parse(await page.locator(`[data-esf-janela="${n}"]`).getAttribute('data-esf'));
      // ---- janela 1: viga, envoltória ELU (a primeira hipótese), momento no plano
      await page.locator('[data-esf-janela="1"]').waitFor();
      const d1 = await dados(1);
      assert.equal(d1.tipo, 'viga');
      assert.equal(d1.envoltoria, true);
      assert.equal(d1.hipotese, 'env:ELU');
      assert.ok(d1.max > 5 && d1.min < d1.max && d1.pontos > 20, JSON.stringify(d1));
      assert.equal(await page.locator('[data-esf-janela="1"] polyline.esf-curva').count(), 1);
      assert.equal(await page.locator('[data-esf-janela="1"] polyline.esf-curva-min').count(), 1);
      // caso G: um só valor por ponto, sem a curva do mínimo
      await page.getByLabel(/^Hipótese \(janela 1\)/).selectOption({ label: 'Caso G' });
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-esf-janela="1"]').getAttribute('data-esf')).hipotese === 'caso:G');
      const dG = await dados(1);
      assert.equal(dG.envoltoria, false);
      assert.ok(dG.max > 0 && dG.max < d1.max, JSON.stringify(dG));
      assert.equal(await page.locator('[data-esf-janela="1"] polyline.esf-curva-min').count(), 0);
      // a envoltória ELU contém o caso G majorado por 1,4
      assert.ok(dG.max * 1.4 <= d1.max + 1e-6);
      // estado da seção da viga: domínio, desenho e barras
      const sec = page.locator('[data-esf-janela="1"] [data-esf-secao]');
      await sec.waitFor();
      assert.match(await sec.getAttribute('data-esf-secao'), /^(2|3|4)$/);
      assert.ok((await sec.locator('svg.esf-svg circle').count()) >= 2);
      assert.match(await sec.innerText(), /linha neutra x =/);

      // ---- janela 2 independente: pilar, normal
      await page.getByRole('button', { name: 'Nova janela de esforços', exact: true }).click();
      await page.locator('[data-esf-janela="2"]').waitFor();
      await page.getByLabel(/^Tipo de elemento \(janela 2\)/).selectOption({ label: 'Pilar' });
      await page.getByLabel(/^Grandeza \(janela 2\)/).selectOption({ label: 'Normal (N)' });
      await page.getByLabel(/^Hipótese \(janela 2\)/).selectOption({ label: 'Caso G' });
      await page.waitForFunction(() => { const e = document.querySelector('[data-esf-janela="2"]'); const d = e && JSON.parse(e.getAttribute('data-esf') ?? 'null'); return d && d.tipo === 'pilar' && d.grandeza === 'N' && d.hipotese === 'caso:G'; });
      const dP = await dados(2);
      assert.ok(dP.max > 50, JSON.stringify(dP)); // compressão positiva: carga acumulada dos pavimentos
      assert.equal((await dados(1)).tipo, 'viga'); // a janela 1 não mudou
      assert.equal((await dados(1)).hipotese, 'caso:G');
      await page.locator('[data-esf-janela="2"] [data-esf-secao]').waitFor();
      // fechar a janela 2 mantém a 1
      await page.getByRole('button', { name: 'Fechar janela 2', exact: true }).click();
      assert.equal(await page.locator('[data-esf-janela]').count(), 1);

      // ---- pranchas: símbolos dos pilares e estilo de desenho (pela faixa Pranchas)
      await faixaAba(page, 'Pranchas e memorial');
      await page.getByRole('toolbar', { name: /^Comandos: Pranchas/ }).getByRole('button', { name: 'Estilo de desenho e símbolos…', exact: true }).click();
      await page.locator('[data-estilo-pranchas]').waitFor();
      await page.getByLabel(/^Símbolo do pilar que passa/).selectOption({ label: 'Cruz (X)' });
      assert.equal(await page.getByLabel(/^Símbolo do pilar que passa/).inputValue(), 'cruz');
      await page.getByLabel(/^Camada do estilo/).selectOption('PILAR');
      await page.getByLabel(/^Cor ACI da camada/).fill('30');
      await page.getByLabel(/^Cor ACI da camada/).press('Enter');
      await page.getByRole('button', { name: 'Voltar ao estilo padrão', exact: true }).click();
      await page.getByRole('button', { name: 'Símbolos padrão', exact: true }).click();
      assert.equal(await page.getByLabel(/^Símbolo do pilar que passa/).inputValue(), 'hachura');
      // folha de perspectiva axonométrica na lista de tipos
      await page.getByLabel(/^Tipo de prancha/).selectOption({ label: 'Perspectiva axonométrica' });
      await page.locator('[data-lista-folhas="1"]').waitFor({ timeout: 30000 });
    },
  };

export const f_V6d = {
    webgl: true,
    name: 'V6d: flecha por dois cliques na planta e pelas envoltórias, consulta de nó pelo clique na vista 3D e esforços do pilar por hipótese na janela do pilar',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const abas = page.locator('.edif-tabs');

      // ---- sem cálculo, a ferramenta avisa
      await faixaAba(page, 'Resultados');
      const barra = page.getByRole('toolbar', { name: /^Comandos: Resultados/ });
      await barra.getByRole('radio', { name: 'Flecha entre dois pontos', exact: true }).click();
      await page.keyboard.press('f');
      const [a0x, a0y] = await telaDe(page, 0.5, 2.5), [z0x, z0y] = await telaDe(page, 5.5, 2.5);
      await page.mouse.click(a0x, a0y);
      await page.mouse.click(z0x, z0y);
      await page.locator('.statusbar .msg', { hasText: 'Calcule a obra' }).waitFor();

      await abas.getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });

      // ---- flecha pelos dois cliques na planta: abre a aba Deslocamentos com os pontos
      await abas.getByRole('tab', { name: 'Planta', exact: true }).click();
      await faixaAba(page, 'Resultados');
      await page.getByRole('toolbar', { name: /^Comandos: Resultados/ }).getByRole('radio', { name: 'Flecha entre dois pontos', exact: true }).click();
      await page.keyboard.press('f');
      const [ax, ay] = await telaDe(page, 0.5, 2.5), [zx, zy] = await telaDe(page, 5.5, 2.5);
      await page.mouse.click(ax, ay);
      await page.mouse.click(zx, zy);
      await page.locator('[data-flecha]').waitFor();
      assert.equal(await abas.getByRole('tab', { name: 'Deslocamentos', exact: true }).getAttribute('aria-selected'), 'true');
      const flecha = async () => JSON.parse(await page.locator('[data-flecha]').getAttribute('data-flecha'));
      const f0 = await flecha();
      assert.ok(Math.abs(f0.L - 5) < 0.2 && f0.flechaMm > 0.01, JSON.stringify(f0));
      assert.ok(Math.abs((await page.getByLabel(/^X inicial/).inputValue()).replace(',', '.') - 0.5) < 0.3);

      // ---- acesso pelas envoltórias: a combinação da família de maior flecha
      const hip = page.getByLabel(/^Hipótese da flecha/);
      const opcoes = await hip.locator('option').evaluateAll((os) => os.map((o) => o.value));
      assert.ok(['env:RARA', 'env:FREQ', 'env:QP'].every((v) => opcoes.includes(v)), opcoes.join(','));
      await hip.selectOption('env:RARA');
      await page.waitForFunction((n) => document.querySelector('[data-flecha]')?.innerText.includes('Hipótese') && document.querySelector('[data-flecha]').getAttribute('data-flecha') !== n, JSON.stringify(f0));
      const fr = await flecha();
      assert.ok(fr.flechaMm >= f0.flechaMm - 1e-6, `rara ${fr.flechaMm} >= quase permanente ${f0.flechaMm}`);

      // ---- consulta do nó pelo clique na vista vista 3D
      await abas.getByRole('tab', { name: '3D', exact: true }).click();
      const cv = page.locator('.v3d-cv');
      await cv.waitFor();
      await page.waitForFunction(() => document.querySelector('.v3d-cv')?.getAttribute('data-status') !== 'carregando');
      const status = await cv.getAttribute('data-status');
      console.log(`        (V6d: vista 3D em modo ${status})`);
      await page.getByRole('button', { name: 'Consultar nó', exact: true }).click();
      await page.locator('[data-consulta-3d=""]').waitFor();
      if (status === 'pronto') {
        const box = await cv.boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      } else {
        await page.locator('.v3d-iso-box path[data-id^="laje"]').first().click();
      }
      const c3 = page.locator('[data-consulta-3d]:not([data-consulta-3d=""])');
      await c3.waitFor();
      assert.ok((await c3.locator('tbody tr').count()) > 5);
      const uz = parseFloat((await c3.locator('tbody tr', { hasText: /^Caso G/ }).first().locator('td').nth(3).innerText()).replace(',', '.'));
      assert.ok(uz < 0, `uz de G no nó clicado: ${uz} mm`);
      await c3.getByRole('button', { name: 'Abrir na aba Deslocamentos', exact: true }).click();
      assert.equal(await abas.getByRole('tab', { name: 'Deslocamentos', exact: true }).getAttribute('aria-selected'), 'true');
      await page.locator('[data-consulta-no]').waitFor();

      // ---- esforços do pilar por hipótese, na janela do pilar
      await abas.getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: 'Pilares (por lance)' }) }).locator('tbody tr').first().dblclick();
      const jp = page.getByRole('dialog', { name: /Resultados do elemento — Pilar/ });
      await jp.waitFor();
      const ep = jp.locator('[data-esf-pilar]');
      await ep.waitFor();
      await jp.getByLabel(/^Hipótese dos esforços do pilar/).selectOption('caso:G');
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-esf-pilar]').getAttribute('data-esf-pilar')).hipotese === 'caso:G');
      const e0 = JSON.parse(await ep.getAttribute('data-esf-pilar'));
      assert.equal(e0.altura, 0);
      assert.ok(e0.N > 10, `N na base: ${e0.N}`);
      await jp.getByLabel(/^Altura acima da base/).fill('2');
      await jp.getByLabel(/^Altura acima da base/).press('Enter');
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-esf-pilar]').getAttribute('data-esf-pilar')).altura > 1.9);
      const e2 = JSON.parse(await ep.getAttribute('data-esf-pilar'));
      assert.ok(e2.N > 0 && e2.N <= e0.N + 1e-6, `N a 2 m (${e2.N}) não maior que na base (${e0.N})`);
      await jp.getByLabel(/^Grandeza do diagrama do pilar/).selectOption('N');
      assert.equal(await jp.locator('svg[aria-label="Diagrama de esforços (pilar)"]').count(), 1);
    },
  };

export const f_V6e = {
    name: 'V6e: cargas coloridas por caso com legenda na planta, setas de vento por pavimento (camada Vento na planta) e resumo do vento no memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('carga.linha {"grupo": "g_3", "caso": "G", "valor": 5, "pontos": [[0, 0], [6, 0]]}');
      await cmd('carga.ponto {"grupo": "g_3", "caso": "Q", "valor": 10, "ponto": [3, 2]}');
      await cmd('carga.ponto {"grupo": "g_3", "caso": "Q", "valor": 4, "ponto": [2, 3]}');
      const cv = page.locator('.planta-cv');
      const leg = async () => cv.getAttribute('data-legenda-cargas');
      await page.waitForFunction(() => (document.querySelector('.planta-cv')?.getAttribute('data-legenda-cargas') ?? '').includes('carga-caso-q:2'));
      const l0 = await leg();
      assert.ok(l0.includes('carga-caso-g:1') && l0.includes('carga-caso-q:2'), l0);

      // chave Cargas por caso: desligada, a legenda some e a cor volta a ser única
      await faixaAba(page, 'Vista');
      const chave = page.getByRole('checkbox', { name: 'Cargas por caso' });
      await chave.uncheck();
      await page.waitForFunction(() => document.querySelector('.planta-cv')?.getAttribute('data-legenda-cargas') === '');
      await chave.check();
      await page.waitForFunction(() => (document.querySelector('.planta-cv')?.getAttribute('data-legenda-cargas') ?? '').includes('carga-caso-g'));

      // sem cálculo não há vento por pavimento para desenhar
      assert.equal(await page.getByLabel('Vento na planta', { exact: true }).count(), 0);
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });

      // setas de vento: uma por zona do pavimento aberto
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta', exact: true }).click();
      await faixaAba(page, 'Vista');
      const vento = page.getByLabel('Vento na planta', { exact: true });
      await vento.waitFor();
      const casos = await vento.locator('option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
      assert.ok(casos.length >= 4, casos.join(','));
      assert.equal(await cv.getAttribute('data-vento-setas'), '0');
      await vento.selectOption(casos[0]);
      await page.waitForFunction(() => Number(document.querySelector('.planta-cv')?.getAttribute('data-vento-setas')) >= 1);
      await vento.selectOption('');
      await page.waitForFunction(() => document.querySelector('.planta-cv')?.getAttribute('data-vento-setas') === '0');

      // memorial: resumo do vento por pavimento e direção, com a soma na base
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const r = memo.locator('[data-memorial-vento-resumo]');
      await r.waitFor();
      assert.ok(+(await r.getAttribute('data-memorial-vento-resumo')) >= 1);
      assert.match(await r.innerText(), /Soma na base/);
    },
  };

export const f_V6f = {
    name: 'V6f: mapa de taxa de armadura em nervuradas, menu de lajes na aba Isovalores, mapas de resultados no memorial e folha de resultados nas pranchas',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 6], [0, 6]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 6], [6, 6]], [[0, 0], [0, 6]], [[6, 0], [6, 6]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.6}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "nervurada", "forma": "cat:rec-60-30", "hTotal": 0.35, "capa": 0.05}}');
      const abas = page.locator('.edif-tabs');
      await abas.getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });

      // ---- taxa de armadura (cm²/m) em laje nervurada: antes não havia mapa
      await abas.getByRole('tab', { name: 'Isovalores', exact: true }).click();
      const janela = page.locator('[data-isov-janela="1"]');
      await janela.waitFor();
      await janela.getByLabel(/^Grandeza \(janela 1\)/).selectOption('AsInf');
      await page.waitForFunction(() => { const a = document.querySelector('[data-isov-janela="1"]')?.getAttribute('data-iso'); return !!a && JSON.parse(a).grandeza === 'AsInf'; });
      const iso = JSON.parse(await janela.getAttribute('data-iso'));
      assert.equal(iso.unidade, 'cm²/m');
      assert.ok(iso.max > 0.8 && iso.max >= iso.min, JSON.stringify(iso));
      assert.ok(iso.bandas >= 1);

      // ---- menu de lajes igual ao da aba Dimensionamento: um clique vai à planta, duplo clique abre a janela da laje
      const menu = page.locator('[data-menu-lajes]');
      await menu.waitFor();
      assert.ok(+(await menu.locator('[data-tabela-lajes]').getAttribute('data-tabela-lajes')) >= 1);
      await menu.locator('tbody tr').first().dblclick();
      const jl = page.getByRole('dialog', { name: /Resultados do elemento — Laje/ });
      await jl.waitFor();
      await page.keyboard.press('Escape');

      // ---- memorial: mapas de resultados das lajes (opcionais)
      await abas.getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.equal(await memo.locator('[data-memorial-mapas]').count(), 0);
      await memo.getByLabel('Incluir mapas de resultados das lajes').check();
      const mapas = memo.locator('[data-memorial-mapas]');
      await mapas.waitFor();
      assert.ok(+(await mapas.getAttribute('data-memorial-mapas')) >= 3);
      const gr = await mapas.locator('figure').evaluateAll((fs) => fs.map((f) => f.getAttribute('data-memorial-mapa')));
      assert.deepEqual([...new Set(gr)], ['uz', 'MxInf', 'AsInf']);
      assert.equal(gr.length % 3, 0);
      assert.ok((await mapas.locator('figure').first().locator('polygon.iso-banda').count()) > 5);
      await page.keyboard.press('Escape');
      await memo.getByRole('button', { name: 'Fechar', exact: true }).click();

      // ---- folha Resultados (SCR) na lista de tipos de prancha
      await abas.getByRole('tab', { name: 'Pranchas', exact: true }).click();
      await page.getByLabel(/^Tipo de prancha/).selectOption({ label: 'Resultados (mapa de isovalores por pavimento)' });
      await page.waitForFunction(() => Number(document.querySelector('[data-lista-folhas]')?.getAttribute('data-lista-folhas')) >= 1, null, { timeout: 60000 });
    },
  };

export const f_V6f_alveolar = {
    name: 'V6f: esforços por hipótese das lajes alveolares no menu único de esforços e atalho para o mapa de momentos das lajes',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 4.8], [0, 4.8]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.4, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 4.8], [6, 4.8]], [[0, 0], [0, 4.8]], [[6, 0], [6, 4.8]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.4, "h": 2}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "alveolar", "ficha": "ex:alveolar", "placa": "A25-1"}}');
      const abas = page.locator('.edif-tabs');
      await abas.getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });

      await abas.getByRole('tab', { name: 'Esforços', exact: true }).click();
      const janela = page.locator('[data-esf-janela="1"]');
      await janela.waitFor();
      await janela.getByLabel(/^Tipo de elemento \(janela 1\)/).selectOption('alveolar');
      await page.waitForFunction(() => { const a = document.querySelector('[data-esf-janela="1"]')?.getAttribute('data-esf'); return !!a && JSON.parse(a).tipo === 'alveolar'; });
      const d = JSON.parse(await janela.getAttribute('data-esf'));
      assert.ok(d.faixas >= 2 && d.Mmax > 5 && d.V > 5, JSON.stringify(d));
      assert.equal(await janela.locator('svg[aria-label^="Diagrama da faixa de alveolares"]').count(), 1);
      await janela.getByLabel(/^Hipótese \(janela 1\)/).selectOption('caso:G');
      await page.waitForFunction((m) => JSON.parse(document.querySelector('[data-esf-janela="1"]').getAttribute('data-esf')).Mmax < m, d.Mmax);
      // atalho para o mapa de momentos das lajes (aba Isovalores)
      await janela.getByRole('button', { name: 'Abrir o mapa de momentos das lajes', exact: true }).click();
      assert.equal(await abas.getByRole('tab', { name: 'Isovalores', exact: true }).getAttribute('aria-selected'), 'true');
      await page.locator('[data-isov-janela="2"]').waitFor();
      assert.equal(await page.locator('[data-isov-janela="2"]').getByLabel(/^Grandeza \(janela 2\)/).inputValue(), 'Mx');
    },
  };

export const f_V7a = {
    name: 'V7a: seletor de esforços (tipo de hipótese, filtro, hipótese e abscissa) nas janelas da viga e do pilar',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const abas = page.locator('.edif-tabs');
      await abas.getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });

      // ---- janela da viga: envoltória ELU, depois só casos (G) e combinações
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) }).locator('tbody tr').first().dblclick();
      const jv = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await jv.waitFor();
      const ev = jv.locator('[data-esf-viga]');
      await ev.waitFor();
      const lerV = async () => JSON.parse(await ev.getAttribute('data-esf-viga'));
      const v0 = await lerV();
      assert.equal(v0.hipotese, 'env:ELU');
      assert.equal(v0.envoltoria, true);
      assert.equal(await jv.locator('svg[aria-label="Diagrama de esforços (viga)"] polyline.esf-curva-min').count(), 1);
      await jv.getByLabel(/^Tipo de hipótese dos esforços da viga/).selectOption({ label: 'Casos simples' });
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-esf-viga]').getAttribute('data-esf-viga')).hipotese.startsWith('caso:'));
      assert.equal(await jv.locator('svg[aria-label="Diagrama de esforços (viga)"] polyline.esf-curva-min').count(), 0);
      await jv.getByLabel(/^Hipótese dos esforços da viga/).selectOption('caso:G');
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-esf-viga]').getAttribute('data-esf-viga')).hipotese === 'caso:G');
      const vG = await lerV();
      assert.equal(vG.envoltoria, false);
      assert.ok(Math.abs(vG.M) <= Math.abs(v0.M) + 1e-6, JSON.stringify([vG, v0]));
      await jv.getByLabel(/^Tipo de hipótese dos esforços da viga/).selectOption({ label: 'Combinações' });
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-esf-viga]').getAttribute('data-esf-viga')).hipotese.startsWith('comb:'));
      // filtro sem resultado mantém a lista inteira
      const nTodas = await jv.getByLabel(/^Hipótese dos esforços da viga/).locator('option').count();
      await jv.getByLabel(/^Filtrar hipóteses \(viga\)/).fill('zzz');
      assert.equal(await jv.getByLabel(/^Hipótese dos esforços da viga/).locator('option').count(), nTodas);
      // abscissa: valor interpolado no meio da viga
      await jv.getByLabel(/^Abscissa s ao longo da viga/).fill('3');
      await jv.getByLabel(/^Abscissa s ao longo da viga/).press('Enter');
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-esf-viga]').getAttribute('data-esf-viga')).s > 2.9);
      await jv.getByRole('button', { name: 'Fechar' }).click();

      // ---- janela do pilar: o mesmo seletor
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: 'Pilares (por lance)' }) }).locator('tbody tr').first().dblclick();
      const jp = page.getByRole('dialog', { name: /Resultados do elemento — Pilar/ });
      await jp.waitFor();
      await jp.getByLabel(/^Tipo de hipótese dos esforços do pilar/).selectOption({ label: 'Combinações' });
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-esf-pilar]').getAttribute('data-esf-pilar')).hipotese.startsWith('comb:'));
      await jp.getByLabel(/^Tipo de hipótese dos esforços do pilar/).selectOption({ label: 'Envoltórias' });
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-esf-pilar]').getAttribute('data-esf-pilar')).hipotese.startsWith('env:'));
    },
  };

export const f_V7b = {
    name: 'V7b: camada das vigotas na planta (vista, chave geral de esforços e legenda)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [4, 0], [0, 5], [4, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [4, 0]], [[0, 5], [4, 5]], [[0, 0], [0, 5]], [[4, 0], [4, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "moldada", "capa": 0.05, "intereixo": 0.5, "bw": 0.12, "h": 0.25, "enchimento": "eps"}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await faixaAba(page, 'Vista');
      const cv = page.locator('.planta-cv');
      const vista = page.getByLabel('Vista das vigotas na planta');
      const esf = page.getByLabel('Esforços das vigotas');
      const rot = async () => parseInt(await cv.getAttribute('data-vigotas-rotulos'), 10);
      // sem texto por padrão
      await vista.waitFor();
      assert.equal(await vista.inputValue(), 'nenhuma');
      assert.equal(await rot(), 0);
      assert.equal(await cv.getAttribute('data-vigotas-legenda'), '');
      // armadura inferior (moldadas): φ e comprimento, sem esforços
      await vista.selectOption('armaduraInferior');
      await page.waitForFunction(() => parseInt(document.querySelector('.planta-cv').getAttribute('data-vigotas-rotulos'), 10) > 0);
      assert.match(await cv.getAttribute('data-vigotas-legenda'), /armadura inferior/);
      // chave geral de esforços: a armadura inferior sai de oferta e a vista passa a momentos por metro
      await esf.check();
      assert.equal(await vista.inputValue(), 'momentos');
      assert.equal(await vista.locator('option[value="armaduraInferior"]').isDisabled(), true);
      await page.waitForFunction(() => /momento positivo/.test(document.querySelector('.planta-cv').getAttribute('data-vigotas-legenda')));
      assert.ok((await rot()) > 0);
      await vista.selectOption('cortantes');
      await page.waitForFunction(() => /cortante de cálculo/.test(document.querySelector('.planta-cv').getAttribute('data-vigotas-legenda')));
      // esforços desligados: tipo da vigota
      await esf.uncheck();
      await vista.selectOption('momentos');
      await page.waitForFunction(() => /tipo/.test(document.querySelector('.planta-cv').getAttribute('data-vigotas-legenda')));
      await vista.selectOption('nenhuma');
      await page.waitForFunction(() => document.querySelector('.planta-cv').getAttribute('data-vigotas-rotulos') === '0');
    },
  };

export const f_V7d = {
    name: 'V7d: símbolos dos pilares na planta e editor com amostras, estilo (tipo de linha, pena da série), folha livre e margens, mapa da folha de resultados',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const abas = page.locator('.edif-tabs');
      const cv = page.locator('.planta-cv');

      // ---- planta: a chave liga os símbolos escolhidos para as pranchas
      await faixaAba(page, 'Vista');
      await cv.waitFor();
      assert.equal(await cv.getAttribute('data-simbolos-planta'), '');
      await page.getByLabel('Símbolos das pranchas', { exact: true }).check();
      await page.waitForFunction(() => document.querySelector('.planta-cv').getAttribute('data-simbolos-planta') === 'hachura|tracejado|hachura');

      // ---- editor: amostras acompanham a escolha, e a planta também
      await faixaAba(page, 'Pranchas e memorial');
      await page.getByRole('toolbar', { name: /^Comandos: Pranchas/ }).getByRole('button', { name: 'Estilo de desenho e símbolos…', exact: true }).click();
      await page.locator('[data-estilo-pranchas]').waitFor();
      assert.equal(await page.locator('[data-simbolos-previa]').getAttribute('data-simbolos-previa'), 'hachura|tracejado|hachura');
      assert.equal(await page.locator('[data-simbolo-previa]').count(), 3);
      await page.getByLabel(/^Símbolo do pilar que passa/).selectOption({ label: 'Cruz (X)' });
      assert.equal(await page.locator('[data-simbolos-previa]').getAttribute('data-simbolos-previa'), 'cruz|tracejado|hachura');
      await abas.getByRole('tab', { name: 'Planta', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.planta-cv').getAttribute('data-simbolos-planta') === 'cruz|tracejado|hachura');
      await abas.getByRole('tab', { name: 'Pranchas', exact: true }).click();
      await page.getByRole('button', { name: 'Símbolos padrão', exact: true }).click();
      assert.equal(await page.locator('[data-simbolos-previa]').getAttribute('data-simbolos-previa'), 'hachura|tracejado|hachura');

      // ---- estilo: tipo de linha e pena da série entram no resumo das camadas alteradas
      assert.equal(await page.locator('[data-estilo-resumo]').count(), 0);
      await page.getByLabel(/^Camada do estilo/).selectOption('PILAR');
      await page.getByLabel(/^Tipo de linha da camada/).selectOption({ label: 'Tracejada' });
      await page.getByLabel(/^Pena da série NBR 16861/).selectOption({ label: '0.5 mm' });
      await page.locator('[data-estilo-resumo="1"]').waitFor();
      assert.match(await page.locator('[data-estilo-resumo] tbody').innerText(), /PILAR\s+PILAR\s+\d+\s+0\.5\s+Tracejada/);
      await page.getByRole('button', { name: 'Voltar ao estilo padrão', exact: true }).click();
      assert.equal(await page.locator('[data-estilo-resumo]').count(), 0);

      // ---- folha livre e margens
      await page.getByLabel(/^Formato/).selectOption({ label: 'livre (folha do usuário)' });
      await page.getByLabel(/^Largura da folha livre/).fill('500');
      await page.getByLabel(/^Largura da folha livre/).press('Enter');
      await page.getByLabel(/^Altura da folha livre/).fill('330');
      await page.getByLabel(/^Altura da folha livre/).press('Enter');
      await page.getByLabel(/^Margem esquerda/).fill('15');
      await page.getByLabel(/^Margem esquerda/).press('Enter');
      await page.locator('[data-folha-usuario="500x330|15|7"]').waitFor();
      await page.locator('.prancha-prev[data-formato="livre"][data-estado="pronto"]').waitFor({ timeout: 30000 });
      assert.match(await page.locator('.prancha-prev svg').first().getAttribute('viewBox'), /^0 0 500 330$/);
      // área útil insuficiente: recusado, a folha não muda
      await page.getByLabel(/^Largura da folha livre/).fill('200');
      await page.getByLabel(/^Largura da folha livre/).press('Enter');
      await page.locator('.statusbar .msg', { hasText: 'área útil' }).waitFor();
      await page.locator('[data-folha-usuario="500x330|15|7"]').waitFor();
      await page.getByRole('button', { name: 'Folha e margens padrão', exact: true }).click();
      await page.locator('[data-folha-usuario="420x297|20|7"]').waitFor();
      await page.getByLabel(/^Formato/).selectOption({ label: 'automático' });

      // ---- folha de resultados: grandeza e hipótese
      await abas.getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await abas.getByRole('tab', { name: 'Pranchas', exact: true }).click();
      await page.getByLabel(/^Tipo de prancha/).selectOption({ label: 'Resultados (mapa de isovalores por pavimento)' });
      await page.locator('[data-resultados-folha="uz|"]').waitFor();
      await page.getByLabel(/^Grandeza do mapa/).selectOption('Mx');
      await page.getByLabel(/^Hipótese do mapa/).selectOption('caso:G');
      await page.locator('[data-resultados-folha="Mx|caso:G"]').waitFor();
      await page.locator('.prancha-prev[data-tipo="resultados"][data-estado="pronto"]').waitFor({ timeout: 60000 });
      assert.match(await page.locator('.prancha-prev svg').first().innerHTML(), /MOMENTO MX/);
    },
  };

export const f_V7e = {
    name: 'V7e: radier por hipótese e combinação (mapa e tabela), limite mínimo por bitola e espaçamento e pela σadm, deslocamento do radier na aba Deslocamentos',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[1, 1], [7, 1], [7, 6], [1, 6]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[1, 1], [7, 1]], [[1, 6], [7, 6]], [[1, 1], [1, 6]], [[7, 1], [7, 6]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('caso.criar {"nome": "Piso", "natureza": "Q"}');
      await cmd('radier.criar {"contorno": [[0, 0], [8, 0], [8, 7], [0, 7]], "h": 0.4, "k": 40000, "sigmaAdm": 300}');
      const abas = page.locator('.edif-tabs');
      await abas.getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });

      // ---- isovalores do radier por hipótese
      await abas.getByRole('tab', { name: 'Isovalores', exact: true }).click();
      const jan = page.locator('[data-isov-janela="1"]');
      await jan.waitFor();
      await page.getByLabel(/^Grandeza \(janela 1\)/).selectOption('rSigma');
      const hip = page.getByLabel(/^Hipótese \(janela 1\)/);
      await hip.waitFor();
      const dados = async () => JSON.parse(await jan.getAttribute('data-iso'));
      await hip.selectOption({ label: 'Caso G' });
      await page.waitForFunction(() => { const d = document.querySelector('[data-isov-janela="1"]')?.getAttribute('data-iso'); return !!d && JSON.parse(d).grandeza === 'rSigma'; });
      const dG = await dados();
      assert.equal(dG.grandeza, 'rSigma');
      assert.ok(dG.max > 0, JSON.stringify(dG));
      // a combinação rara (última de cada família) tem tensão maior que o caso G isolado
      const opcoes = await hip.locator('option').allTextContents();
      const rara = opcoes.find((t) => /rara/i.test(t));
      assert.ok(rara, opcoes.join(' | '));
      await hip.selectOption({ label: rara });
      await page.waitForFunction((g) => { const d = JSON.parse(document.querySelector('[data-isov-janela="1"]').getAttribute('data-iso')); return d.max > g + 1e-6; }, dG.max);

      // ---- tabela por hipótese (casos e combinações) e levantamento
      const tabela = page.locator('[data-radier-hipoteses="1"]');
      await tabela.waitFor();
      assert.ok((await tabela.locator('[data-radier-hipotese]').count()) >= 4);
      assert.ok((await tabela.locator('[data-radier-hipotese^="caso:"]').count()) >= 2);
      assert.ok((await tabela.locator('[data-radier-hipotese^="comb:"]').count()) >= 2);
      assert.equal(await tabela.locator('tr.bad').count(), 0);
      await tabela.getByRole('button', { name: /^Baixar CSV/ }).waitFor();

      // ---- limite mínimo pela σadm do radier (tensão): nenhuma região passa de 300 kPa
      await page.getByLabel(/^Grandeza \(janela 1\)/).selectOption('rSigmaMax');
      await page.getByRole('button', { name: /^Usar a σadm do radier/ }).click();
      await page.locator('[data-iso-acima]').waitFor();
      assert.equal(await page.locator('[data-iso-acima]').getAttribute('data-iso-acima'), '0.0000');

      // ---- limite mínimo por bitola e espaçamento (armadura da laje)
      await page.getByLabel(/^Grandeza \(janela 1\)/).selectOption('AsInf');
      await page.getByLabel(/^Bitola do limite \(janela 1\)/).selectOption({ label: 'φ 12,5 mm' });
      await page.getByLabel(/^Espaçamento do limite \(janela 1\)/).fill('15');
      await page.getByLabel(/^Espaçamento do limite \(janela 1\)/).press('Enter');
      await page.getByRole('button', { name: /^Usar φ 12,5 c\/15 = 8,18 cm²\/m como limite mínimo/ }).click();
      await page.waitForFunction(() => !!document.querySelector('[data-iso-acima]'));
      assert.match(await page.locator('[data-iso-acima]').innerText(), /Região com valor a partir do limite mínimo/);
      await page.locator('[data-iso-bitola-max]').waitFor();

      // ---- deslocamento do radier por caso na aba Deslocamentos
      await abas.getByRole('tab', { name: 'Deslocamentos', exact: true }).click();
      const dr = page.locator('[data-desloc-radiers="1"]');
      await dr.waitFor();
      assert.match(await dr.locator('tbody tr').first().innerText(), /-\d+,\d\d/);
    },
  };

export const f_V7c = {
    name: 'V7c: seção circular no estado da seção, esforços do pilar-parede por hipótese e vento por direção, distorção e vento na malha',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      await cmd('pilarParede.tipo {"nome": "Reta 4 m", "vertices": [[0, 0], [4, 0]], "esq": 0.1, "dir": 0.1}');
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposPilarParede?.length === 1);
      await cmd('pilarParede.inserir {"tipo": "' + (await modelo()).tiposPilarParede[0].id + '", "x": 0, "y": 0}');
      await cmd('lote {"comandos": [' + [[0, 5], [4, 5], [7, 0]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "circ", "d": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[1, 0], [7, 0]], [[0, 5], [4, 5]], [[0, 0], [0, 5]], [[4, 0], [4, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.criar {"grupo": "g_3", "contorno": [[0, 0], [4, 0], [4, 5], [0, 5]], "tipo": {"tipo": "macica", "h": 0.12}}');
      const abas = page.locator('.edif-tabs');
      await abas.getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 120000 });

      // ---- estado da seção do pilar circular
      await abas.getByRole('tab', { name: 'Esforços', exact: true }).click();
      const janela = page.locator('[data-esf-janela="1"]');
      await janela.waitFor();
      await janela.getByLabel(/^Tipo de elemento \(janela 1\)/).selectOption('pilar');
      await janela.locator('[data-esf-secao]').waitFor();
      assert.equal(await janela.locator('svg[aria-label^="Seção do concreto"] circle.esf-sec-conc').count(), 1);
      assert.ok(await janela.locator('svg[aria-label^="Seção do concreto"] circle.esf-barra-aco, svg[aria-label^="Seção do concreto"] circle.esf-barra-aco-esc').count() >= 6);

      // ---- pilar-parede por hipótese
      await janela.getByLabel(/^Tipo de elemento \(janela 1\)/).selectOption('pilarParede');
      await janela.locator('[data-esf-pp]').waitFor();
      const lerPP = async () => JSON.parse(await janela.locator('[data-esf-pp]').getAttribute('data-esf-pp'));
      const e0 = await lerPP();
      assert.equal(e0.tipo, 'pilarParede');
      assert.equal(e0.envoltoria, true);
      assert.ok(e0.lances >= 2 && e0.max > e0.min, JSON.stringify(e0));
      assert.equal(await janela.locator('svg[aria-label^="Diagrama do pilar-parede"] polyline.esf-curva-min').count(), 1);
      await janela.getByLabel(/^Hipótese \(janela 1\)/).selectOption('caso:G');
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-esf-pp]').getAttribute('data-esf-pp')).hipotese === 'caso:G');
      const eG = await lerPP();
      assert.equal(eG.envoltoria, false);
      assert.ok(eG.min < 0 && eG.max <= e0.max + 1e-6, JSON.stringify([eG, e0]));
      assert.equal(await janela.locator('svg[aria-label^="Diagrama do pilar-parede"] polyline.esf-curva-min').count(), 0);
      await janela.getByLabel(/^Grandeza do pilar-parede \(janela 1\)/).selectOption('Mo');
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-esf-pp]').getAttribute('data-esf-pp')).grandeza === 'Mo');
      await janela.locator('[data-esf-pp-base]').waitFor();

      // ---- vento por direção, distorção e vento na malha
      await abas.getByRole('tab', { name: 'Deslocamentos', exact: true }).click();
      const vd = page.locator('[data-desloc-vento]');
      await vd.waitFor();
      assert.ok(Number(await vd.getAttribute('data-desloc-vento')) >= 4);
      assert.ok((await vd.locator('tbody tr').count()) >= 8);
      assert.match(await vd.locator('tbody tr').first().innerText(), /\d,\d\d\d‰/);
      await page.locator('[data-desloc-vento-topo]').waitFor();
      assert.ok(Number(await page.locator('[data-desloc-vento-panos]').getAttribute('data-desloc-vento-panos')) >= 1);
      await page.getByRole('button', { name: 'Baixar CSV do vento na malha', exact: true }).waitFor();
      await page.getByRole('columnheader', { name: /^Pilar e combinação da distorção x/ }).waitFor();
    },
  };

export const f_V7f = {
    name: 'V7f: opções de cálculo próprias da viga, da laje e do pilar nas janelas dos elementos (alterar, ver a da obra, voltar)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const abas = page.locator('.edif-tabs');
      await abas.getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      const propriasNoModelo = async (lista) => (await modelo())[lista].filter((e) => e.opcoes && Object.keys(e.opcoes).length).map((e) => ({ nome: e.nome, ...e.opcoes }));
      const esperaProprias = async (lista, n) => { await page.waitForFunction(([l, q]) => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.[l] ?? []).filter((e) => e.opcoes && Object.keys(e.opcoes).length).length === q, [lista, n]); return propriasNoModelo(lista); };

      // ---- viga
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) }).locator('tbody tr').first().dblclick();
      const jv = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await jv.waitFor();
      const gv = jv.locator('[data-opcoes-elemento^="viga:"]');
      await gv.locator('summary').click();
      assert.equal(await gv.getAttribute('data-opcoes-proprias'), '0');
      await gv.getByLabel(/^Vigas: taxa mínima de armadura longitudinal/).fill('0.8');
      await gv.getByLabel(/^Vigas: taxa mínima de armadura longitudinal/).press('Enter');
      await page.waitForFunction(() => document.querySelector('[data-opcoes-elemento^="viga:"]')?.getAttribute('data-opcoes-proprias') === '1');
      assert.equal((await esperaProprias('vigas', 1))[0].vigaTaxaMin, 0.8);
      await gv.getByRole('button', { name: /^Usar a da obra: Vigas: taxa mínima/ }).click();
      await page.waitForFunction(() => document.querySelector('[data-opcoes-elemento^="viga:"]')?.getAttribute('data-opcoes-proprias') === '0');
      await esperaProprias('vigas', 0);
      await jv.getByRole('button', { name: 'Fechar' }).click();

      // ---- laje: valor fora da faixa é recusado; valor válido grava e a mensagem aparece nos resultados
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Lajes$/ }) }).locator('tbody tr').first().dblclick();
      const jl = page.getByRole('dialog', { name: /Resultados do elemento — Laje/ });
      await jl.waitFor();
      const gl = jl.locator('[data-opcoes-elemento^="laje:"]');
      await gl.locator('summary').click();
      await gl.getByLabel(/^Lajes: taxa mínima de armadura/).fill('9');
      await gl.getByLabel(/^Lajes: taxa mínima de armadura/).press('Enter');
      await page.waitForTimeout(800);
      assert.equal(await gl.getAttribute('data-opcoes-proprias'), '0');
      await gl.getByLabel(/^Lajes: taxa mínima de armadura/).fill('1');
      await gl.getByLabel(/^Lajes: taxa mínima de armadura/).press('Enter');
      await page.waitForFunction(() => document.querySelector('[data-opcoes-elemento^="laje:"]')?.getAttribute('data-opcoes-proprias') === '1');
      assert.equal((await esperaProprias('lajes', 1))[0].lajeTaxaMin, 1);
      await gl.getByRole('button', { name: /^Remover todas as opções próprias da laje/ }).click();
      await page.waitForFunction(() => document.querySelector('[data-opcoes-elemento^="laje:"]')?.getAttribute('data-opcoes-proprias') === '0');
      await jl.getByRole('button', { name: 'Fechar' }).click();

      // ---- pilar
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: 'Pilares (por lance)' }) }).locator('tbody tr').first().dblclick();
      const jp = page.getByRole('dialog', { name: /Resultados do elemento — Pilar/ });
      await jp.waitFor();
      const gp = jp.locator('[data-opcoes-elemento^="pilar:"]');
      await gp.locator('summary').click();
      await gp.getByLabel(/^Pilares: taxa geométrica mínima/).fill('1');
      await gp.getByLabel(/^Pilares: taxa geométrica mínima/).press('Enter');
      await page.waitForFunction(() => document.querySelector('[data-opcoes-elemento^="pilar:"]')?.getAttribute('data-opcoes-proprias') === '1');
      assert.equal((await esperaProprias('pilares', 1))[0].pilarTaxaMin, 1);
      await gp.getByRole('button', { name: /^Remover todas as opções próprias do pilar/ }).click();
      await page.waitForFunction(() => document.querySelector('[data-opcoes-elemento^="pilar:"]')?.getAttribute('data-opcoes-proprias') === '0');
      await esperaProprias('pilares', 0);
    },
  };

export const f_V7g = {
    name: 'V7g: torçor da base do pilar-parede na janela de esforços (caso de vento, envoltória, mudança de polo)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      await cmd('pilarParede.tipo {"nome": "L 3x2", "vertices": [[0, 0], [3, 0], [3, 2]], "esq": 0.1, "dir": 0.1}');
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposPilarParede?.length === 1);
      await cmd('pilarParede.inserir {"tipo": "' + (await modelo()).tiposPilarParede[0].id + '", "x": 0, "y": 0}');
      await cmd('lote {"comandos": [' + [[0, 5], [7, 5], [7, 0]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[1, 0], [7, 0]], [[0, 5], [7, 5]], [[0, 0], [0, 5]], [[7, 0], [7, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.criar {"grupo": "g_3", "contorno": [[0, 0], [7, 0], [7, 5], [0, 5]], "tipo": {"tipo": "macica", "h": 0.12}}');
      const abas = page.locator('.edif-tabs');
      await abas.getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 120000 });
      await abas.getByRole('tab', { name: 'Esforços', exact: true }).click();
      const janela = page.locator('[data-esf-janela="1"]');
      await janela.waitFor();
      await janela.getByLabel(/^Tipo de elemento \(janela 1\)/).selectOption('pilarParede');
      await janela.locator('[data-esf-pp-torsor]').waitFor();
      const lerT = async () => JSON.parse(await janela.locator('[data-esf-pp-torsor]').getAttribute('data-esf-pp-torsor'));
      // envoltória ELU: máximo e mínimo do torçor, centroide como polo
      const env = await lerT();
      assert.equal(env.envoltoria, true);
      assert.ok(env.max > env.min, JSON.stringify(env));
      assert.deepEqual(env.ref, env.centro);
      await janela.getByText(/Torçor da base \(Mz/).waitFor();
      // caso de vento: valor único e mudança de polo exata (Mz(P) = Mz(O) + (Ox − Px)·Vy − (Oy − Py)·Vx)
      const opcoes = await janela.getByLabel(/^Hipótese \(janela 1\)/).evaluate((el) => [...el.options].map((o) => o.value));
      const vento = opcoes.find((v) => v.startsWith('caso:W'));
      assert.ok(vento, JSON.stringify(opcoes));
      await janela.getByLabel(/^Hipótese \(janela 1\)/).selectOption(vento);
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-esf-pp-torsor]').getAttribute('data-esf-pp-torsor')).envoltoria === false);
      const t0 = await lerT();
      assert.equal(t0.max, t0.min);
      assert.ok(Math.abs(t0.max) > 1 && Math.abs(t0.vx) + Math.abs(t0.vy) > 1, JSON.stringify(t0));
      await janela.getByLabel(/^Polo do torçor x \(janela 1\)/).fill(String(t0.centro[0] + 2).replace('.', ','));
      await janela.getByLabel(/^Polo do torçor x \(janela 1\)/).press('Enter');
      await page.waitForFunction((x) => Math.abs(JSON.parse(document.querySelector('[data-esf-pp-torsor]').getAttribute('data-esf-pp-torsor')).ref[0] - x) < 1e-3, t0.centro[0] + 2);
      const t1 = await lerT();
      const esperado = t0.max + (t0.centro[0] - t1.ref[0]) * t0.vy - (t0.centro[1] - t1.ref[1]) * t0.vx;
      assert.ok(Math.abs(t1.max - esperado) < 2e-3 + 1e-4 * Math.abs(esperado), JSON.stringify([t0, t1, esperado]));
      await janela.getByRole('button', { name: /^Centroide \(janela 1\)/ }).click();
      await page.waitForFunction(() => { const d = JSON.parse(document.querySelector('[data-esf-pp-torsor]').getAttribute('data-esf-pp-torsor')); return d.ref[0] === d.centro[0] && d.ref[1] === d.centro[1]; });
      assert.ok(Math.abs((await lerT()).max - t0.max) < 1e-3);
    },
  };

export const f_V7h = {
    name: 'V7h: esforços internos do pilar-parede por pavimento (base e topo de cada lance, com o torçor) na janela de esforços',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      await cmd('pilarParede.tipo {"nome": "L 3x2", "vertices": [[0, 0], [3, 0], [3, 2]], "esq": 0.1, "dir": 0.1}');
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposPilarParede?.length === 1);
      await cmd('pilarParede.inserir {"tipo": "' + (await modelo()).tiposPilarParede[0].id + '", "x": 0, "y": 0}');
      await cmd('laje.criar {"grupo": "g_3", "contorno": [[0, 0], [3, 0], [3, 2], [0, 2]], "tipo": {"tipo": "macica", "h": 0.12}}');
      const abas = page.locator('.edif-tabs');
      await abas.getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 120000 });
      await abas.getByRole('tab', { name: 'Esforços', exact: true }).click();
      const janela = page.locator('[data-esf-janela="1"]');
      await janela.waitFor();
      await janela.getByLabel(/^Tipo de elemento \(janela 1\)/).selectOption('pilarParede');
      await janela.locator('[data-esf-pp-secoes]').waitFor();
      const ler = async () => JSON.parse(await janela.locator('[data-esf-pp-secoes]').getAttribute('data-esf-pp-secoes'));
      // envoltória ELU: base e topo de cada lance, máximo e mínimo
      const env = await ler();
      assert.equal(env.envoltoria, true);
      assert.ok(env.secoes.length >= 4 && env.secoes.length % 2 === 0, JSON.stringify(env.secoes.length));
      assert.deepEqual(env.secoes.slice(0, 2).map((x) => x.posicao), ['base', 'topo']);
      assert.ok(env.secoes.every((x, i) => x.N >= x.Nmin - 1e-9 && x.Mz >= x.Mzmin - 1e-9 && (i === 0 || x.cota >= env.secoes[i - 1].cota - 1e-9)), JSON.stringify(env.secoes[0]));
      assert.ok(env.secoes[0].N > env.secoes[env.secoes.length - 1].N, 'a compressão cai da base ao topo');
      await janela.getByText('Base do lance').first().waitFor();
      await janela.getByRole('table', { name: /^Seções do pilar-parede por pavimento \(janela 1\)/ }).waitFor();
      // caso de vento: o cortante é constante dentro do lance (sem carga horizontal entre pavimentos) e a mudança de polo transporta o torçor de cada seção
      const opcoes = await janela.getByLabel(/^Hipótese \(janela 1\)/).evaluate((el) => [...el.options].map((o) => o.value));
      const vento = opcoes.find((v) => v.startsWith('caso:W'));
      assert.ok(vento, JSON.stringify(opcoes));
      await janela.getByLabel(/^Hipótese \(janela 1\)/).selectOption(vento);
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-esf-pp-secoes]').getAttribute('data-esf-pp-secoes')).envoltoria === false);
      const c0 = await ler();
      assert.ok(c0.secoes.some((x) => Math.abs(x.Vx) + Math.abs(x.Vy) > 1), JSON.stringify(c0.secoes[0]));
      for (let i = 0; i < c0.secoes.length; i += 2) assert.ok(Math.abs(c0.secoes[i].Vx - c0.secoes[i + 1].Vx) < 2e-3 && Math.abs(c0.secoes[i].Vy - c0.secoes[i + 1].Vy) < 2e-3, JSON.stringify(c0.secoes.slice(i, i + 2)));
      const px = c0.ref[0] + 2;
      await janela.getByLabel(/^Polo do torçor x \(janela 1\)/).fill(String(px).replace('.', ','));
      await janela.getByLabel(/^Polo do torçor x \(janela 1\)/).press('Enter');
      await page.waitForFunction((x) => Math.abs(JSON.parse(document.querySelector('[data-esf-pp-secoes]').getAttribute('data-esf-pp-secoes')).ref[0] - x) < 1e-3, px);
      const c1 = await ler();
      c0.secoes.forEach((x, i) => {
        const esperado = x.Mz + (c0.ref[0] - c1.ref[0]) * x.Vy - (c0.ref[1] - c1.ref[1]) * x.Vx;
        assert.ok(Math.abs(c1.secoes[i].Mz - esperado) < 3e-3 + 1e-4 * Math.abs(esperado), JSON.stringify([x, c1.secoes[i], esperado]));
      });
      await janela.getByRole('button', { name: /^Centroide \(janela 1\)/ }).click();
      await page.waitForFunction((x) => Math.abs(JSON.parse(document.querySelector('[data-esf-pp-secoes]').getAttribute('data-esf-pp-secoes')).ref[0] - x) < 1e-3, c0.ref[0]);
      assert.ok(Math.abs((await ler()).secoes[0].Mz - c0.secoes[0].Mz) < 1e-3);
    },
  };

export const f_V6a = {
    name: 'V6a: cortes do edifício nas pranchas — ativar o corte, marca nas plantas de formas, folha de cortes (escala configurável) e marca com tamanho próprio',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('corte.criar {"nome": "Corte AA", "pontos": [[-1, 2.5], [7, 2.5]], "sentido": "esq"}');
      const abas = page.locator('.edif-tabs');
      await abas.getByRole('tab', { name: 'Pranchas', exact: true }).click();
      const prev = page.locator('.prancha-prev');
      await prev.waitFor();
      await page.waitForFunction(() => document.querySelector('.prancha-prev')?.getAttribute('data-estado') === 'pronto', null, { timeout: 60000 });
      // sem corte ativo, a planta de formas não leva marca
      assert.equal(await prev.locator('svg').evaluate((s) => s.textContent.includes('Corte AA')), false);
      await page.getByText(/^Cortes nas pranchas \(0 de 1\)/).click();
      await page.getByLabel('Corte na prancha: Corte AA', { exact: true }).check();
      await page.getByText(/^Cortes nas pranchas \(1 de 1\)/).waitFor();
      const ativo = await page.locator('[data-cortes-pranchas]').getAttribute('data-cortes-pranchas');
      assert.ok(ativo && ativo.length > 0, 'um corte ativo');
      // planta de formas: marca de corte (nome nas duas pontas)
      await page.waitForFunction(() => (document.querySelector('.prancha-prev svg')?.textContent.match(/Corte AA/g) ?? []).length >= 2, null, { timeout: 60000 });
      // marca maior (a tela guarda no modelo)
      const marca = page.getByLabel(/^Tamanho da marca de corte/);
      await marca.fill('16');
      await marca.press('Enter');
      await page.waitForFunction(() => document.querySelector('.prancha-prev')?.getAttribute('data-estado') === 'pronto');
      assert.equal(await marca.inputValue(), '16');
      // folha de cortes
      await page.getByLabel(/^Tipo de prancha/).selectOption({ label: 'Cortes do edifício' });
      await page.waitForFunction(() => document.querySelector('.prancha-prev')?.getAttribute('data-tipo') === 'cortes', null, { timeout: 60000 });
      await page.locator('[data-lista-folhas="1"]').waitFor();
      const auto = Number(await prev.getAttribute('data-escala'));
      assert.ok([50, 75, 100, 125, 200].includes(auto), String(auto));
      const txt = await prev.locator('svg').evaluate((s) => s.textContent);
      assert.match(txt, /CORTES DO EDIFÍCIO/);
      assert.match(txt, /CORTE AA/);
      assert.match(txt, /SCT/);
      assert.ok(await prev.locator('svg').evaluate((s) => s.querySelectorAll('path, polygon, polyline').length) > 10);
      // escala da folha configurável
      await page.getByLabel(/^Escala da folha de cortes/).selectOption({ label: '1:100' });
      await page.waitForFunction(() => document.querySelector('.prancha-prev')?.getAttribute('data-escala') === '100', null, { timeout: 60000 });
      // desativar: a folha some
      await page.getByLabel('Corte na prancha: Corte AA', { exact: true }).uncheck();
      await page.getByText(/^Cortes nas pranchas \(0 de 1\)/).waitFor();
      await page.locator('[data-lista-folhas]').waitFor({ state: 'detached' });
    },
  };

export const f_V6c = {
    webgl: true,
    name: 'V6c: vista 3D isolada da viga de fundação — botão na janela da viga, janela própria com a viga e as duas sapatas das pontas, canvas (ou isométrico sem WebGL)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [7, 0], [7, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [7, 0]], [[0, 5], [7, 5]], [[0, 0], [0, 5]], [[7, 0], [7, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const grupo = await grupoEdif(page, /^Fundação \(/);
      const sigma = grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^σadm$/ }) }).locator('input');
      await sigma.fill('300');
      await sigma.press('Enter');
      await page.getByRole('radio', { name: 'Fundação' }).click();
      await grupo.getByLabel('Posição no pilar').selectOption('divisa');
      await page.mouse.click(...(await telaDe(page, -0.07, 0)));
      await page.locator('.statusbar .msg', { hasText: 'S1 (sapata) lançado sob P1' }).waitFor();
      await grupo.getByLabel('Posição no pilar').selectOption('centrada');
      await page.mouse.click(...(await telaDe(page, 7, 0)));
      await page.locator('.statusbar .msg', { hasText: 'S2 (sapata) lançado sob P2' }).waitFor();
      await page.locator('.planta-st').click();
      await page.keyboard.press('b');
      await page.mouse.click(...(await telaDe(page, 0, 0)));
      await page.mouse.click(...(await telaDe(page, 7, 0)));
      await page.locator('.statusbar .msg', { hasText: 'VF1 (equilíbrio) lançada' }).waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      const cardV = page.locator('[data-card-vigas-fundacao]');
      await cardV.waitFor();
      await cardV.locator('tbody tr', { hasText: 'VF1' }).dblclick();
      const jf = page.getByRole('dialog', { name: /Resultados do elemento — Viga de fundação VF1/ });
      await jf.waitFor();
      await jf.getByRole('button', { name: 'Vista 3D da viga', exact: true }).click();
      const j3 = page.getByRole('dialog', { name: 'Vista 3D — VF1', exact: true });
      await j3.waitFor();
      const info = JSON.parse(await j3.locator('[data-vf3d]').getAttribute('data-vf3d'));
      assert.deepEqual(info.apoios, ['S1', 'S2']);
      assert.equal(info.objetos, 3);
      assert.ok(info.hAdot > 0 && info.bAdot > 0, JSON.stringify(info));
      await page.waitForFunction(() => document.querySelector('.armadura3d-cv')?.getAttribute('data-status') !== 'carregando');
      const status = await j3.locator('.armadura3d-cv').getAttribute('data-status');
      if (status === 'pronto') {
        await j3.locator('.armadura3d-cv[data-status="pronto"] canvas').waitFor();
        await page.waitForFunction(() => Number(document.querySelector('.armadura3d-cv')?.getAttribute('data-frame-ms')) >= 0);
      } else {
        assert.equal(await j3.locator('.armadura3d-cv svg').count() > 0, true);
      }
      await j3.getByLabel('Elementos da fundação translúcidos', { exact: true }).uncheck();
      await page.keyboard.press('Escape');
      assert.equal(await j3.count(), 0);
    },
  };

export const f_V6b = {
    webgl: true,
    name: 'V6b: comparar deformadas — 2 a 4 janelas lado a lado, hipótese e escala por janela (comum, própria, manual), câmera sincronizada, fechar libera os contextos',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: '3D', exact: true }).click();
      const cv = page.locator('.v3d-cv');
      await cv.waitFor();
      await page.waitForFunction(() => document.querySelector('.v3d-cv')?.getAttribute('data-status') !== 'carregando');
      const status = await cv.getAttribute('data-status');
      console.log(`        (V6b: vista 3D em modo ${status})`);
      await page.getByLabel('Deformada', { exact: true }).check();
      const botao = page.getByRole('button', { name: 'Comparar deformadas', exact: true });
      await botao.waitFor();
      if (status !== 'pronto') { assert.equal(await botao.isDisabled(), true); return; }

      await botao.click();
      const jan = page.getByRole('dialog', { name: 'Comparar deformadas', exact: true });
      await jan.waitFor();
      const raiz = jan.locator('[data-comparar]');
      const le = async () => JSON.parse(await raiz.getAttribute('data-comparar'));
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-comparar]').getAttribute('data-comparar')).janelas.every((j) => j.status === 'pronto'));
      let d = await le();
      assert.equal(d.n, 2);
      assert.equal(d.modo, 'comum');
      assert.equal(await jan.locator('.v3d-comp-cv canvas').count(), 2);
      // hipóteses iniciais distintas, escala comum igual nas duas
      assert.notEqual(d.janelas[0].hipotese, d.janelas[1].hipotese);
      assert.equal(d.janelas[0].escala, d.janelas[1].escala);
      assert.ok(d.janelas[0].dmaxMm > 0 && d.janelas[1].dmaxMm > 0);
      // 4 janelas em grade 2×2
      await jan.getByLabel('Número de janelas', { exact: true }).selectOption('4');
      await page.waitForFunction(() => document.querySelectorAll('[data-comparar] .v3d-comp-cv canvas').length === 4);
      d = await le();
      assert.equal(d.janelas.length, 4);
      assert.equal(new Set(d.janelas.map((j) => j.hipotese)).size, 4);
      const colunas = await jan.locator('.v3d-comp-grade').evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').length);
      assert.equal(colunas, 2);
      // trocar a hipótese da janela 2 muda o máximo dela
      const antes = d.janelas[1].dmaxMm;
      const lista = jan.getByLabel('Hipótese da janela 2', { exact: true });
      const atual = await lista.inputValue();
      const outra = (await lista.locator('option').evaluateAll((os) => os.map((o) => o.value))).filter((v) => v !== atual);
      await lista.selectOption(outra[outra.length - 1]);
      await page.waitForFunction((a) => JSON.parse(document.querySelector('[data-comparar]').getAttribute('data-comparar')).janelas[1].dmaxMm !== a, antes);
      // escala própria: o maior deslocamento ganha a menor escala; manual: slider por janela
      await jan.getByLabel('Escala das deformadas', { exact: true }).selectOption('propria');
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-comparar]').getAttribute('data-comparar')).modo === 'propria');
      d = await le();
      const imax = d.janelas.reduce((m, j, i, a) => (j.dmaxMm > a[m].dmaxMm ? i : m), 0), imin = d.janelas.reduce((m, j, i, a) => (j.dmaxMm < a[m].dmaxMm ? i : m), 0);
      if (d.janelas[imax].dmaxMm > d.janelas[imin].dmaxMm * 1.01) assert.ok(d.janelas[imax].escala < d.janelas[imin].escala, JSON.stringify(d.janelas));
      await jan.getByLabel('Escala das deformadas', { exact: true }).selectOption('manual');
      await jan.locator('.slider', { hasText: 'Escala da janela 3' }).locator('input').fill('120');
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-comparar]').getAttribute('data-comparar')).janelas[2].escala === 120);
      // câmera sincronizada: ligada por padrão, desligável
      assert.equal(await jan.getByLabel('Sincronizar a câmera', { exact: true }).isChecked(), true);
      await jan.getByLabel('Sincronizar a câmera', { exact: true }).uncheck();
      assert.equal((await le()).sincronizar, false);
      // reduz a 2 janelas: os contextos das outras são liberados (canvas removidos)
      await jan.getByLabel('Número de janelas', { exact: true }).selectOption('2');
      await page.waitForFunction(() => document.querySelectorAll('[data-comparar] .v3d-comp-cv canvas').length === 2);
      await page.keyboard.press('Escape');
      assert.equal(await jan.count(), 0);
      assert.equal(await page.locator('.v3d-comp-cv').count(), 0);
      await page.getByLabel('Deformada', { exact: true }).uncheck();
    },
  };
