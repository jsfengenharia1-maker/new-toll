// Fluxos de interface — edificio-geral (parte 1/1).
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NO_PICKERS, fileMenu, grupoEdif, tab, downloadText, num, telaDe, importarMascara } from './helpers.mjs';

export const f_edificio = {
    name: 'edifício: pavimentos por comando, verificação, desfazer, salvar e reabrir',
    async run({ newPage, tmp }) {
      const page = await newPage(NO_PICKERS);
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const linhas = page.locator('table.edpav tbody tr');
      await linhas.first().waitFor();
      assert.equal(await linhas.count(), 5); // edifício padrão
      assert.equal(await linhas.first().locator('input').first().inputValue(), 'Cobertura');

      // "+1" no Tipo 3: insere Tipo 4 e sobe a cobertura
      await page.getByRole('button', { name: '+1' }).nth(1).click();
      await page.waitForFunction(() => document.querySelectorAll('table.edpav tbody tr').length === 6);
      assert.equal(await page.getByLabel('Cota de Cobertura').inputValue(), '15,00');

      // linha de comando: pé-direito diferente no grupo gera erro com correção sugerida
      await page.locator('#edcmd').fill('pavimento.editar {"id": "pav_9", "cota": 12.5}');
      await page.locator('#edcmd').press('Enter');
      await page.locator('.edif-tabs').getByRole('tab', { name: /Verificação/ }).click();
      await page.locator('.diags li.erro', { hasText: 'Tipo 4' }).waitFor();
      await page.locator('.statusbar .status.bad').waitFor();
      await page.locator('.diags li.erro').getByRole('button', { name: /Criar um grupo próprio/ }).click();
      await page.locator('.diags', { hasText: 'Tipo 4' }).waitFor({ state: 'detached' });

      // desfazer pelo teclado (fora dos campos) volta o erro
      await page.locator('.edif .card h3').first().click();
      await page.keyboard.press('Control+z');
      await page.locator('.diags li.erro', { hasText: 'Tipo 4' }).waitFor();
      await page.keyboard.press('Control+y');
      await page.locator('.diags li.erro').waitFor({ state: 'detached' });

      // comando inválido não altera e mostra o motivo
      await page.locator('#edcmd').fill('pavimento.criar {"nome": "X", "cota": 3}');
      await page.locator('#edcmd').press('Enter');
      await page.locator('.hint.bad', { hasText: 'cota 3' }).waitFor();

      const f = await downloadText(page, () => fileMenu(page, 'Salvar no computador'));
      const ws = JSON.parse(f.text);
      assert.equal(ws.version, 2);
      assert.equal(ws.building.pavimentos.length, 6);
      assert.ok(ws.buildingLog.length >= 7);
      const file = join(tmp, 'edificio.statikos');
      writeFileSync(file, f.text);

      const page2 = await newPage(NO_PICKERS);
      const [chooser] = await Promise.all([page2.waitForEvent('filechooser'), fileMenu(page2, 'Abrir trabalho do computador')]);
      await chooser.setFiles(file);
      await page2.locator('.statusbar .msg', { hasText: 'edifício com 6 pavimento(s)' }).waitFor();
      await page2.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      await page2.waitForFunction(() => document.querySelectorAll('table.edpav tbody tr').length === 6);
      assert.equal(await page2.getByLabel('Cota de Tipo 4').inputValue(), '12,50');
    },
  };

export const f_planta = {
    name: 'planta: máscara DXF, capturas, pilar por clique e por coordenada, janela, desfazer',
    async run({ newPage, tmp }) {
      const page = await newPage();
      await importarMascara(page, tmp);
      await page.locator('.planta-cv[data-vista]').waitFor();
      await page.keyboard.press('p');
      // canto interno da parede (0,15; 0,15): captura de extremidade a ~1 px
      const [sx, sy] = await telaDe(page, 0.16, 0.16);
      await page.mouse.move(sx, sy);
      await page.locator('.planta-st', { hasText: 'extremidade' }).waitFor();
      assert.match(await page.locator('.planta-st .num').textContent(), /x 0,15 {2}y 0,15/);
      await page.mouse.click(sx, sy);
      await page.locator('summary', { hasText: 'Pilares (1)' }).waitFor();
      // coordenada digitada
      await page.keyboard.type('7,5;5');
      await page.keyboard.press('Enter');
      await page.locator('summary', { hasText: 'Pilares (2)' }).waitFor();
      await grupoEdif(page, /^Pilares \(/);
      assert.equal(await page.getByLabel('x de P2').inputValue(), '7,500');
      // sobreposição recusada
      await page.keyboard.type('7,55;5');
      await page.keyboard.press('Enter');
      await page.locator('.statusbar .msg', { hasText: 'sobrepõe' }).waitFor();
      await page.keyboard.press('Control+z');
      await page.locator('summary', { hasText: 'Pilares (1)' }).waitFor();
      // janela da esquerda para a direita em volta do P1 e Del
      await page.keyboard.press('s');
      const [ax, ay] = await telaDe(page, 0.02, 1), [zx, zy] = await telaDe(page, 1, -0.3);
      await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(zx, zy, { steps: 4 }); await page.mouse.up();
      await page.locator('.statusbar .msg', { hasText: '1 elemento(s) selecionado(s)' }).waitFor();
      await page.keyboard.press('Delete');
      await page.locator('summary', { hasText: 'Pilares (0)' }).waitFor();
      await page.keyboard.press('Control+z');
      await page.locator('summary', { hasText: 'Pilares (1)' }).waitFor();
    },
  };

export const f_planta_2 = {
    name: 'planta: desempenho com 20 mil segmentos de máscara',
    async run({ newPage, tmp }) {
      const page = await newPage();
      await importarMascara(page, tmp, 20000);
      await page.waitForFunction(() => +document.querySelector('.planta-cv')?.dataset.segmentos >= 20000);
      const box = await page.locator('canvas.int').boundingBox();
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      await page.mouse.move(cx, cy);
      for (let i = 0; i < 15; i++) { await page.mouse.wheel(0, i < 8 ? -120 : 120); }
      await page.mouse.down({ button: 'middle' });
      await page.mouse.move(cx + 200, cy + 80, { steps: 30 });
      await page.mouse.up({ button: 'middle' });
      await page.waitForTimeout(300);
      for (let i = 0; i < 20; i++) await page.mouse.move(cx + i * 7, cy + i * 3);
      const d = await page.locator('.planta-cv').evaluate((e) => ({ ...e.dataset }));
      console.log(`        quadro médio ${d.frameMs} ms · máscara completa ${d.mascaraMs} ms · captura ${d.snapMs} ms · ${d.segmentos} segmentos`);
      assert.ok(+d.frameMs < 16, `quadro médio ${d.frameMs} ms`); // pan/zoom e cursor reaproveitam o cache da máscara
      assert.ok(+d.mascaraMs < 250, `máscara completa ${d.mascaraMs} ms`); // redesenho ao parar o gesto (headless, sem GPU)
      assert.ok(+d.snapMs < 2, `captura ${d.snapMs} ms`);
    },
  };

export const f_planta_3 = {
    name: 'planta: vigas por clique com captura no centro dos pilares, verificação e desfazer',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      await page.locator('#edcmd').fill('lote {"comandos": [' + [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await page.locator('#edcmd').press('Enter');
      await page.locator('summary', { hasText: 'Pilares (4)' }).waitFor();
      await page.keyboard.press('f');
      await page.waitForTimeout(100);
      await page.locator('.planta-cv').click({ position: { x: 5, y: 5 }, button: 'right' }); // foco na planta, sem ação
      await page.keyboard.press('v');
      for (const [x, y] of [[0, 0], [5, 0], [5, 4]]) { const [sx, sy] = await telaDe(page, x, y); await page.mouse.move(sx, sy); await page.mouse.click(sx, sy); }
      await page.keyboard.press('Enter');
      for (const [x, y] of [[5, 4], [0, 4], [0, 0]]) { const [sx, sy] = await telaDe(page, x, y); await page.mouse.move(sx, sy); await page.mouse.click(sx, sy); }
      await page.keyboard.press('Enter');
      await page.locator('summary', { hasText: 'Vigas — Tipo (2)' }).waitFor();
      await grupoEdif(page, 'Vigas');
      assert.equal(await page.getByLabel('Seção de V1').inputValue(), '15x40');
      await page.locator('.statusbar .status.ok').waitFor();
      // viga solta digitada: erro de verificação; desfazer volta ao estado sem erro
      await page.keyboard.type('2;2'); await page.keyboard.press('Enter');
      await page.keyboard.type('3;2'); await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await page.locator('.statusbar .status.bad', { hasText: '1 erro' }).waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: /Verificação/ }).click();
      await page.locator('.diags li.erro', { hasText: 'V3 não se apoia' }).waitFor();
      await page.keyboard.press('Control+z');
      await page.locator('.statusbar .status.ok').waitFor();
    },
  };

export const f_planta_4 = {
    name: 'planta: laje no pano por clique, preencher panos e alvenaria gerada da máscara',
    async run({ newPage, tmp }) {
      const page = await newPage();
      await importarMascara(page, tmp);
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [10, 0], [0, 4], [5, 4], [10, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [10, 0]], [[0, 4], [10, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]], [[10, 0], [10, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.5}}}`).join(', ') + ']}');
      await page.locator('summary', { hasText: 'Vigas — Tipo (5)' }).waitFor();
      await page.locator('.planta-cv').click({ position: { x: 5, y: 5 }, button: 'right' });
      await page.keyboard.press('l');
      const [sx, sy] = await telaDe(page, 2.5, 2);
      await page.mouse.move(sx, sy); await page.mouse.click(sx, sy);
      await page.locator('summary', { hasText: 'Lajes — Tipo (1)' }).waitFor();
      await grupoEdif(page, 'Lajes');
      await page.getByRole('button', { name: 'Preencher todos os panos' }).click();
      await page.locator('summary', { hasText: 'Lajes — Tipo (2)' }).waitFor();
      await grupoEdif(page, 'Cargas');
      await page.getByRole('button', { name: 'Gerar 1 trecho(s) de parede' }).click();
      await page.locator('summary', { hasText: 'Cargas — Tipo (1)' }).waitFor();
      await page.locator('.statusbar .msg', { hasText: '1 trecho(s) de alvenaria (3 m, altura 2,5 m)' }).waitFor();
    },
  };

export const f_analise_do_edificio_no_worker = {
    name: 'análise do edifício no worker: cargas na fundação em equilíbrio, vento e γz',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Análise' }).click();
      await page.getByRole('button', { name: 'Calcular', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'Análise concluída' }).waitFor();
      const txt = await page.locator('.edif-out').textContent();
      assert.match(txt, /equilíbrio \(reações − cargas\): G -?0,000, Q -?0,000 kN/);
      // vento ligado por padrão: γz nas 4 direções e cargas na fundação dos 4 pilares
      const tabelas = page.locator('.edif-out table.quadro');
      assert.equal(await tabelas.nth(0).locator('tbody tr').count(), 4);
      assert.match(await tabelas.nth(0).textContent(), /0°.*90°.*180°.*270°/s);
      assert.equal(await page.locator('.edif-out .card', { hasText: 'Cargas na fundação' }).locator('tbody tr').count(), 4);
    },
  };

export const f_dimensionamento_do_edificio = {
    name: 'dimensionamento do edifício: tabelas, cargas enviadas ao módulo Fundações e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      const card = (t) => page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: t }) });
      assert.equal(await card(/^Vigas$/).locator('tbody tr').count(), 4);
      assert.equal(await card('Pilares (por lance)').locator('tbody tr').count(), 20);
      assert.match(await card('Pilares (por lance)').textContent(), /\d+ φ\d/);
      assert.match(await card(/^Vigas$/).locator('thead').textContent(), /Flecha \/ lim\. \(mm\)/);
      assert.match(await card(/^Lajes$/).locator('thead').textContent(), /Flecha Q \/ lim\. \(mm\)/);
      assert.match(await card(/^Vigas$/).locator('tbody tr').first().locator('td').nth(12).textContent(), /^\d+,\d \/ \d+,\d$/);
      assert.match(await page.locator('.edif-out').textContent(), /Vigas 4\/4 ok/);
      // clicar numa viga seleciona o elemento na planta
      await card(/^Vigas$/).locator('tbody tr').first().click();
      await page.locator('.edif-tabs [aria-selected="true"]', { hasText: 'Planta' }).waitFor(); // um clique espera o duplo clique (230 ms)
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo.textContent(), /Dimensionamento dos pilares.*Cargas na fundação.*Quantitativos/s);
      assert.equal(await memo.locator('figure svg').count(), 1); // só grupos com vigas ou lajes
      await memo.getByRole('button', { name: 'Fechar' }).click();
      await page.getByRole('button', { name: 'Enviar cargas ao módulo Fundações' }).click();
      await page.locator('.statusbar .msg', { hasText: '4 pilar(es) importados do edifício' }).waitFor();
      assert.equal(await page.locator('table.loads-ed tbody tr').count(), 4);
      assert.equal(await page.locator('table.loads-ed tbody tr').first().locator('input').first().inputValue(), 'P1');
    },
  };

export const f_pranchas = {
    name: 'pranchas: prévia, carimbo e downloads em PDF, DXF e DWG',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('eixo.malha {"dx": [6], "dy": [5]}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const prev = page.locator('.prancha-prev');
      await prev.locator('svg').waitFor();
      assert.equal(await prev.getAttribute('data-escala'), '75'); // automática a partir de 1:75 (folhas de referência)
      assert.match(await prev.textContent(), /V1 15×40.*QUADRO DE PILARES.*PLANTA DE FORMAS — TIPO/s);
      await page.getByLabel('Responsável técnico').fill('Eng. Teste');
      await page.getByLabel('Responsável técnico').press('Enter');
      await prev.getByText('Eng. Teste').waitFor();
      await page.getByLabel('ART / RRT').fill('ART 2026-001');
      await page.getByLabel('ART / RRT').press('Enter');
      await prev.getByText('ART 2026-001').waitFor();
      assert.match(await prev.textContent(), /\d{2}\/\d{2}\/\d{4}/); // data de hoje quando vazia
      // formato fixo pelo comando: a prévia acompanha
      await page.getByLabel('Formato').selectOption('A1');
      // o conjunto é montado no worker: a prévia anterior fica com data-estado="carregando" até a resposta
      await page.locator('.prancha-prev[data-estado="pronto"][data-formato="A1"]').waitFor();
      const baixar = async (rot) => {
        const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: rot }).click()]);
        return { nome: dl.suggestedFilename(), dados: readFileSync(await dl.path()) };
      };
      const pdf = await baixar('PDF (todas)');
      assert.match(pdf.nome, /pranchas\.pdf$/);
      assert.equal(pdf.dados.subarray(0, 8).toString('latin1'), '%PDF-1.5');
      const dxf = await baixar('DXF R2000');
      assert.match(dxf.nome, /\.dxf$/);
      assert.match(dxf.dados.toString('latin1'), /AC1015[\s\S]*Eng\. Teste/);
      const dwg = await baixar('DWG R2018');
      assert.match(dwg.nome, /\.dwg$/);
      assert.equal(dwg.dados.subarray(0, 6).toString('latin1'), 'AC1032');
    },
  };

export const f_vigas = {
    name: 'vigas: contorno locado na face externa dos pilares',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await grupoEdif(page, 'Vigas — Tipo');
      await page.getByRole('button', { name: 'Contorno na face externa' }).click();
      await page.locator('.statusbar .msg', { hasText: 'alinhada(s) à face externa' }).waitFor();
      for (const v of ['V1', 'V2', 'V3', 'V4']) assert.notEqual(await page.getByLabel(`Alinhamento de ${v}`).inputValue(), 'centro');
      await page.locator('.edif-tabs').getByRole('tab', { name: /Verificação/ }).click();
      assert.doesNotMatch(await page.locator('.edif-out').textContent(), /VIGA_/);
    },
  };

export const f_opcoes_de_calculo_do_edificio = {
    name: 'opções de cálculo do edifício: alterar, marcar e voltar ao padrão',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      await grupoEdif(page, 'Opções de cálculo');
      const malha = page.getByLabel('Malha da grelha das lajes');
      assert.equal(await malha.inputValue(), '0,25');
      await malha.fill('0,5');
      await malha.press('Enter');
      await page.locator('summary', { hasText: 'Opções de cálculo (1 alterada)' }).waitFor();
      await page.getByRole('button', { name: 'Voltar ao padrão' }).click();
      await page.locator('summary', { hasText: /^Opções de cálculo$/ }).waitFor();
      assert.equal(await malha.inputValue(), '0,25');
    },
  };

export const f_vinculos = {
    name: 'vínculos: engaste na base do pilar selecionado, desfazer e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await grupoEdif(page, 'Pilares (4)');
      await page.locator('table.quadro tbody tr').first().click();
      await grupoEdif(page, 'Vínculos, flambagem e cobrimento');
      const base = page.getByLabel('Engaste na base');
      assert.equal(await base.inputValue(), '1');
      await base.fill('0');
      await base.press('Enter');
      await page.locator('.statusbar .msg', { hasText: 'Engaste de 1 lance(s) de pilar alterado' }).waitFor();
      assert.equal(await base.inputValue(), '0');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo.textContent(), /Vínculos e engastes alterados por elemento.*Pilar P1, lance até Tipo 1: engaste base 0\./s);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await page.getByRole('button', { name: 'Desfazer (Ctrl+Z)', exact: true }).click();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      assert.doesNotMatch(await memo.textContent(), /Vínculos e engastes alterados/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      await page.waitForFunction(() => [...document.querySelectorAll('label.field')].find((l) => l.textContent.startsWith('Engaste na base'))?.querySelector('input')?.value === '1');
    },
  };

export const f_materiais_e_seguranca = {
    name: 'materiais e segurança: fck das vigas, γc e voltar ao padrão',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      await grupoEdif(page, 'Materiais e segurança');
      const fck = page.getByLabel('fck vigas');
      assert.equal(await fck.inputValue(), '30');
      await fck.fill('35');
      await fck.press('Enter');
      await page.locator('summary', { hasText: 'Materiais e segurança (alterados)' }).waitFor();
      const gc = page.getByLabel('γc', { exact: true });
      await gc.fill('1,5');
      await gc.press('Enter');
      await page.locator('.statusbar .msg', { hasText: 'Materiais e segurança alterados' }).waitFor();
      await page.getByRole('button', { name: 'Voltar ao padrão' }).click();
      await page.locator('summary', { hasText: /^Materiais e segurança$/ }).waitFor();
      assert.equal(await fck.inputValue(), '30');
      assert.equal(await gc.inputValue(), '1,4');
    },
  };

export const f_casos_de_carga = {
    name: 'casos de carga: caso adicional, carga no pilar e lista de combinações',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      // caso adicional pelo grupo "Casos de carga"
      await grupoEdif(page, 'Casos de carga');
      await page.getByLabel('Novo caso').fill('Neve');
      await page.getByLabel('Novo caso').press('Enter');
      await page.getByRole('button', { name: 'Criar caso' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Caso Neve (Q) criado' }).waitFor();
      assert.equal(await page.getByLabel('Natureza de Neve').inputValue(), 'Q');
      // carga no pilar selecionado
      await grupoEdif(page, 'Pilares (4)');
      await page.locator('table.quadro tbody tr').filter({ has: page.locator('input[aria-label^="Nome de P1"]') }).first().click();
      await grupoEdif(page, 'Vínculos, flambagem e cobrimento');
      await page.getByLabel(/^Caso \(lance/).selectOption({ label: 'Neve' });
      const n = page.getByLabel('N (kN)');
      await n.fill('25');
      await n.press('Enter');
      await page.getByRole('button', { name: 'Adicionar carga no lance' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Carga no pilar P1' }).waitFor();
      assert.equal(await page.getByRole('button', { name: /^Remover carga/ }).count(), 1);
      // análise: o quadro de combinações lista o novo caso
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Análise' }).click();
      await page.getByRole('button', { name: 'Calcular', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'Análise concluída' }).waitFor();
      await page.locator('summary', { hasText: /^Combinações \(\d+\)$/ }).click();
      const quadro = page.locator('.edif-out .card', { hasText: 'Exportar CSV' });
      assert.match(await quadro.locator('thead').textContent(), /Neve/);
      assert.ok(await quadro.locator('tbody tr').count() > 4);
      const col = (await quadro.locator('thead th').allTextContents()).indexOf('Neve');
      const celulas = await quadro.locator(`tbody tr td:nth-child(${col + 1})`).allTextContents();
      assert.ok(celulas.some((t) => t.trim() !== ''), 'o caso Neve entra em alguma combinação');
    },
  };

export const f_vento = {
    name: 'vento: coeficiente por sentido e platibanda no grupo, estado e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await grupoEdif(page, 'Vento e combinações');
      const xn = page.getByLabel('Coef. sentido −X');
      assert.equal(await xn.inputValue(), '1');
      await xn.fill('0,5');
      await xn.press('Enter');
      const plat = page.getByLabel('Platibanda');
      await plat.fill('1');
      await plat.press('Enter');
      await page.locator('.statusbar .msg', { hasText: 'Vento alterado' }).waitFor();
      assert.equal(await page.getByLabel('Coef. sentido −X').inputValue(), '0,5');
      assert.equal(await page.getByLabel('Platibanda').inputValue(), '1');
      assert.equal(await page.getByLabel('Coef. sentido +X').inputValue(), '1');
      // o estado vai para o memorial
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const txt = await memo.textContent();
      assert.match(txt, /coeficiente por sentido: −X 0,50/);
      assert.match(txt, /platibanda 1,00 m/);
    },
  };

export const f_perfis_de_padroes = {
    name: 'perfis de padrões: sistema × NBR 6118 nas opções, com o outro padrão ao lado',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      await grupoEdif(page, 'Opções de cálculo');
      const red = page.getByLabel('Redistribuição de negativos das vigas');
      assert.equal(await red.inputValue(), '15');
      await page.getByLabel('Perfil dos padrões').selectOption('nbr');
      await page.getByText('Padrão NBR 6118 em uso.').waitFor();
      assert.equal(await red.inputValue(), '0');
      const linha = page.locator('.row', { has: red });
      assert.match(await linha.innerText(), /sistema: 15/);
      await page.getByLabel('Perfil dos padrões').selectOption('sistema');
      await page.getByText('Padrão do sistema em uso').waitFor();
      assert.equal(await red.inputValue(), '15');
    },
  };
