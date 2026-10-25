// Fluxos de interface — portico (parte 1/1).
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NO_PICKERS, fileMenu, tab, openGroup, downloadText, num } from './helpers.mjs';

export const f_desenho_por_coordenadas_apoio_carga_e_di = {
    name: 'desenho por coordenadas, apoio, carga e diagrama de momento',
    async run({ newPage }) {
      const page = await newPage();
      await fileMenu(page, 'Novo modelo');
      await page.locator('#coordinput').fill('0 0 6 0');
      await page.locator('#coordinput').press('Enter');
      await page.waitForFunction(() => document.querySelectorAll('svg rect.node').length === 2);
      await page.locator('#coordinput').blur();
      await page.keyboard.press('f'); // enquadrar
      // seleção por janela sobre todo o desenho (nós e barra)
      const box = await page.locator('section.stage svg').first().boundingBox();
      await page.mouse.move(box.x + 8, box.y + 8);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
      await page.mouse.move(box.x + box.width - 8, box.y + box.height - 8, { steps: 5 });
      await page.mouse.up();
      await tab(page, 'Estrutura');
      await page.getByRole('button', { name: 'Engaste', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'Apoio aplicado a 2 nó(s)' }).waitFor();
      await tab(page, 'Cargas');
      await page.getByRole('button', { name: /^Aplicar em/ }).click(); // padrão: distribuída global qy = −10 kN/m
      await tab(page, 'Resultados');
      await page.locator('.panel').getByRole('radio', { name: 'Momento', exact: true }).click();
      await page.locator('svg polygon.diag.M').first().waitFor();
      // biengastada, q = 10 kN/m, L = 6 m: M vão = qL²/24 = 15; M apoio = −qL²/12 = −30 kN·m
      const row = page.locator('table.summary tr', { has: page.locator('th.vM') });
      const [hi, lo] = (await row.locator('td').allTextContents()).map(num);
      assert.ok(Math.abs(hi - 15) < 0.05, `M máx. = ${hi}`);
      assert.ok(Math.abs(lo + 30) < 0.05, `M mín. = ${lo}`);
    },
  };

export const f_exemplo_do_portico_dimensionar_e_memoria = {
    name: 'exemplo do pórtico, dimensionar e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await fileMenu(page, 'Pórtico de galpão');
      await tab(page, 'Dimensionar');
      await page.getByRole('button', { name: 'Abrir memorial de cálculo' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial de cálculo' });
      await memo.waitFor();
      assert.match(await memo.innerText(), /Memorial/);
      assert.ok(await memo.locator('h2').count() >= 4, 'memorial com seções');
    },
  };

export const f_salvar_trabalho_no_computador_e_abrir_em = {
    name: 'salvar trabalho no computador e abrir em outro contexto',
    async run({ newPage, tmp }) {
      const page = await newPage(NO_PICKERS);
      const nome = 'Teste e2e salvar e abrir';
      await page.getByLabel('Nome do modelo').fill(nome);
      const f = await downloadText(page, () => fileMenu(page, 'Salvar no computador'));
      assert.match(f.name, /\.statikos$/);
      const ws = JSON.parse(f.text);
      assert.equal(ws.model.name, nome);
      const file = join(tmp, f.name);
      writeFileSync(file, f.text);

      const page2 = await newPage(NO_PICKERS);
      assert.notEqual(await page2.getByLabel('Nome do modelo').inputValue(), nome);
      const [chooser] = await Promise.all([page2.waitForEvent('filechooser'), fileMenu(page2, 'Abrir trabalho do computador')]);
      await chooser.setFiles(file);
      await page2.waitForFunction((n) => document.querySelector('input[aria-label="Nome do modelo"]')?.value === n, nome);
      await page2.locator('.statusbar .msg', { hasText: 'aberto de' }).waitFor();
    },
  };

export const f_estabilidade_e_vibracao = {
    name: 'estabilidade e vibração: calcular modos',
    async run({ newPage }) {
      const page = await newPage();
      await fileMenu(page, 'Pórtico de galpão');
      await tab(page, 'Resultados');
      const g = await openGroup(page, 'Estabilidade e vibração');
      await g.getByRole('button', { name: 'Calcular modos' }).click();
      const rows = g.locator('table.data tbody tr');
      await rows.first().waitFor();
      assert.ok(await rows.count() >= 1);
    },
  };

export const f_exportar_desenho_DXF = {
    name: 'exportar desenho DXF',
    async run({ newPage }) {
      const page = await newPage();
      await fileMenu(page, 'Pórtico de galpão');
      const f = await downloadText(page, () => fileMenu(page, 'Desenho DXF'));
      assert.match(f.name, /\.dxf$/);
      // pares (código, valor); comentários 999 iniciais são permitidos antes da primeira seção
      const lines = f.text.split(/\r?\n/).map((l) => l.trim());
      let i = 0;
      while (lines[i] === '999') i += 2;
      assert.equal(`${lines[i]}\n${lines[i + 1]}`, '0\nSECTION');
      assert.equal(lines.filter(Boolean).at(-1), 'EOF');
    },
  };

export const f_perfil_metalico_de_catalogo = {
    name: 'perfil metálico de catálogo',
    async run({ newPage }) {
      const page = await newPage();
      await tab(page, 'Estrutura');
      const box = page.locator('.quickrect', { hasText: 'Perfil de catálogo' });
      await box.locator('select').nth(0).selectOption({ label: 'H laminado HP' });
      await box.locator('select').nth(1).selectOption({ label: 'HP310×125,0' });
      await box.getByRole('button').click();
      await page.locator('.statusbar .msg', { hasText: 'Seção HP310×125,0 criada' }).waitFor();
      await page.locator('.panel .hint', { hasText: 'sem raio de concordância' }).first().waitFor();
      const A = await page.locator('.panel dl.kv dt', { hasText: /^A$/ }).last().locator('xpath=following-sibling::dd[1]').innerText();
      // 2·312·17,4 + (312 − 2·17,4)·17,4 = 15 681 mm²
      assert.ok(Math.abs(num(A) - 156.81) < 0.01, `A = ${A}`);
    },
  };

export const f_PWA = {
    name: 'PWA: manifest, service worker e abertura sem internet',
    async run({ newPage }) {
      const page = await newPage();
      const man = await page.evaluate(async () => {
        const href = document.querySelector('link[rel="manifest"]')?.getAttribute('href');
        return href ? (await fetch(href)).json() : null;
      });
      assert.ok(man, 'link rel=manifest');
      assert.equal(man.name, 'Statikos');
      assert.ok(man.file_handlers?.some((h) => Object.values(h.accept).flat().includes('.statikos')), 'file_handlers .statikos');
      await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 15000 });
      await page.context().setOffline(true);
      await page.reload();
      await page.locator('.bname', { hasText: 'Statikos' }).waitFor();
      await page.locator('svg rect.node').first().waitFor();
      await page.context().setOffline(false);
    },
  };

export const f_PWA_2 = {
    name: 'PWA: arquivo .statikos recebido do sistema (launchQueue)',
    async run({ newPage }) {
      const page = await newPage(() => {
        window.__written = '';
        // launchQueue nativo é somente leitura: substitui pela fila simulada.
        Object.defineProperty(window, 'launchQueue', { value: { setConsumer(cb) { window.__launch = cb; } }, configurable: true });
      });
      const nome = 'Aberto com duplo clique';
      await page.getByLabel('Nome do modelo').fill(nome);
      const f = await downloadText(page, () => fileMenu(page, 'Só o modelo (.json)'));
      await fileMenu(page, 'Viga contínua');
      assert.notEqual(await page.getByLabel('Nome do modelo').inputValue(), nome);
      await page.waitForFunction(() => typeof window.__launch === 'function');
      await page.evaluate((txt) => window.__launch({
        files: [{
          name: 'obra.statikos',
          getFile: async () => new File([txt], 'obra.statikos'),
          createWritable: async () => ({ write: async (d) => { window.__written += d; }, close: async () => {} }),
        }],
      }), f.text);
      await page.waitForFunction((n) => document.querySelector('input[aria-label="Nome do modelo"]')?.value === n, nome);
      await page.locator('.statusbar .msg', { hasText: 'obra.statikos' }).waitFor();
      // Com a File System Access API, Ctrl+S grava no próprio arquivo recebido.
      if (await page.evaluate(() => typeof window.showSaveFilePicker === 'function')) {
        await page.locator('section.stage').click({ position: { x: 5, y: 5 } });
        await page.keyboard.press('Control+s');
        await page.waitForFunction(() => window.__written.includes('statikos-workspace'));
      }
    },
  };

export const f_MD8 = {
    name: 'MD8: memória de cálculo detalhada do pórtico (botão no dimensionar e no memorial, passos de vigas e pilares, γz, filtro, HTML, JSON, CSV e ZIP com OpenSees 2D)',
    async run({ newPage }) {
      const page = await newPage();
      await fileMenu(page, 'Pórtico de galpão');
      await tab(page, 'Dimensionar');
      await page.getByRole('button', { name: 'Memória de cálculo detalhada', exact: true }).click();
      const dlg = page.getByRole('dialog', { name: 'Memória de cálculo detalhada do pórtico' });
      const doc = dlg.locator('[data-memoria-detalhada]');
      await doc.waitFor({ timeout: 60000 });
      const t = await doc.innerText();
      for (const s of ['Índice', 'Por elemento', 'Cargas', 'Combinações', 'Análise estrutural', 'Esforços de cálculo', 'Dimensionamento', 'Detalhamento', 'Pórtico', 'Viga B2', 'Pilar B1', 'Estabilidade global (γz)', 'Desaprumo global']) assert.ok(t.includes(s), s);
      assert.match(t, /As = .* cm²/);
      assert.match(t, /VRd2 = 0,27·/);
      assert.match(t, /M1d,mín = /);
      assert.match(t, /γz = 1\/\(1 − /);
      assert.match(t, /NBR 8681:2003/);
      const total = await doc.locator('tr[data-passo]').count();
      assert.ok(total > 300, `passos: ${total}`);
      assert.equal(await doc.locator('a[href="#md-dimensionamento-viga-b2"]').count(), 2);
      assert.equal(await doc.locator('#md-dimensionamento-viga-b2').count(), 1);
      // filtro por elemento: os passos globais e os da viga
      await dlg.getByLabel(/^Elemento/).selectOption({ label: 'Viga B2' });
      await page.waitForFunction((n) => document.querySelectorAll('[data-memoria-detalhada] tr[data-passo]').length < n, total);
      const tf = await doc.innerText();
      assert.ok(tf.includes('Viga B2') && !tf.includes('Viga B3') && !tf.includes('Pilar B1'));
      const baixar = async (rot) => {
        const [dl] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: rot, exact: true }).click()]);
        return { nome: dl.suggestedFilename(), dados: readFileSync(await dl.path()) };
      };
      const html = await baixar('Exportar HTML');
      assert.match(html.nome, /^memoria-detalhada-.*\.html$/);
      assert.match(html.dados.toString('utf8'), /^<!doctype html>[\s\S]*data-memoria-detalhada[\s\S]*Viga B2/);
      const json = await baixar('Exportar JSON');
      const mem = JSON.parse(json.dados.toString('utf8'));
      assert.equal(mem.versao, 1);
      assert.ok(mem.passos.length >= total);
      assert.ok(mem.passos.every((p) => p.id && p.etapa && p.formula && p.expressao && p.unidade !== undefined));
      const csv = await baixar('Exportar CSV');
      assert.match(csv.nome, /\.csv$/);
      assert.ok(csv.dados.toString('utf8').startsWith('id;etapa;elemento'));
      const zip = await baixar('Dados da análise e OpenSees (ZIP)');
      assert.match(zip.nome, /\.zip$/);
      assert.equal(zip.dados.subarray(0, 2).toString('latin1'), 'PK');
      const texto = zip.dados.toString('latin1');
      for (const f of ['analise/nos.csv', 'analise/barras.csv', 'analise/combinacoes.csv', 'analise/reacoes_combinacoes.csv', 'analise/esforcos_combinacoes.csv', 'memoria/memoria.csv', 'opensees/portico2d.py']) assert.ok(texto.includes(f), f);
      assert.ok(texto.includes('"-ndm", 2, "-ndf", 3'));
      await dlg.getByRole('button', { name: 'Fechar', exact: true }).click();
      await dlg.waitFor({ state: 'detached' });
      // também pelo memorial de cálculo
      await page.getByRole('button', { name: 'Abrir memorial de cálculo' }).click();
      const memorial = page.getByRole('dialog', { name: 'Memorial de cálculo', exact: true });
      await memorial.waitFor();
      await memorial.getByRole('button', { name: 'Memória de cálculo detalhada', exact: true }).click();
      await dlg.locator('[data-memoria-detalhada]').waitFor({ timeout: 60000 });
    },
  };
