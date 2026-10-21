// Fluxos de interface. Cada fluxo recebe { newPage, baseURL, tmp }:
// newPage(initScript?) abre um contexto novo (localStorage vazio) já com o app carregado.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Remove a File System Access API: o app cai no download e no <input type=file>. */
const NO_PICKERS = () => {
  for (const k of ['showSaveFilePicker', 'showOpenFilePicker']) {
    try { delete window[k]; } catch { /* ignora */ }
    try { Object.defineProperty(window, k, { value: undefined, configurable: true, writable: true }); } catch { /* ignora */ }
  }
};

async function fileMenu(page, item) {
  await page.getByRole('button', { name: 'Arquivo ▾' }).click();
  await page.locator('.menu button', { hasText: item }).first().click();
}

async function tab(page, name) {
  await page.locator('.panel .tabs').getByRole('tab', { name, exact: true }).click();
}

/** Abre um grupo recolhível (<details>) do painel pelo título. */
async function openGroup(page, title) {
  const g = page.locator('.panel details.group', { has: page.locator('summary', { hasText: title }) }).first();
  if (!(await g.evaluate((d) => d.open))) await g.locator('summary').click();
  return g;
}

async function downloadText(page, action) {
  const [dl] = await Promise.all([page.waitForEvent('download'), action()]);
  const path = await dl.path();
  return { name: dl.suggestedFilename(), text: readFileSync(path, 'utf8'), path };
}

const num = (s) => parseFloat(String(s).replace(/\s/g, '').replace('−', '-').replace(/\./g, '').replace(',', '.'));


/** DXF de planta 15 × 10 m em cm (paredes de 15 cm, porta, textos) com `extra` segmentos aleatórios. */
function dxfPlanta(extra = 0) {
  const L = [];
  const p = (...a) => L.push(...a.map(String));
  p(0, 'SECTION', 2, 'HEADER', 9, '$INSUNITS', 70, 5, 0, 'ENDSEC', 0, 'SECTION', 2, 'ENTITIES');
  const rect = (x0, y0, x1, y1, lay) => p(0, 'LWPOLYLINE', 8, lay, 90, 4, 70, 1, 10, x0, 20, y0, 10, x1, 20, y0, 10, x1, 20, y1, 10, x0, 20, y1);
  rect(0, 0, 1500, 1000, 'PAREDE'); rect(15, 15, 1485, 985, 'PAREDE'); rect(500, 15, 515, 985, 'PAREDE');
  p(0, 'ARC', 8, 'PORTA', 10, 515, 20, 300, 40, 80, 50, 0, 51, 90);
  p(0, 'TEXT', 8, 'TEXTO', 10, 200, 20, 750, 40, 25, 1, 'SALA');
  p(0, 'LINE', 8, 'ALVENARIA', 10, 100, 20, 100, 11, 400, 21, 100, 0, 'LINE', 8, 'ALVENARIA', 10, 100, 20, 115, 11, 400, 21, 115);
  let s = 3;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < extra; i++) { const x = r() * 1500, y = r() * 1000; p(0, 'LINE', 8, 'HACHURA', 10, x.toFixed(2), 20, y.toFixed(2), 11, (x + r() * 40).toFixed(2), 21, (y + r() * 40).toFixed(2)); }
  p(0, 'ENDSEC', 0, 'EOF');
  return L.join('\n');
}

/** JPEG 8 × 4 px (vermelho) para o logo do carimbo. */
const JPEG_TESTE = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAAEAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDHooorhPqD/9k=';

/** Ponto do mundo (m) na tela, pela vista publicada pela planta. */
async function telaDe(page, x, y) {
  const v = JSON.parse(await page.locator('.planta-cv').getAttribute('data-vista'));
  const box = await page.locator('canvas.int').boundingBox();
  return [box.x + v.ox + x * v.k, box.y + v.oy - y * v.k];
}

async function importarMascara(page, tmp, extra = 0) {
  const f = join(tmp, `planta-${extra}.dxf`);
  writeFileSync(f, dxfPlanta(extra));
  await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
  await page.locator('summary', { hasText: 'Máscara' }).click();
  await page.setInputFiles('input[aria-label="Arquivo DXF da máscara"]', f);
  await page.locator('.statusbar .msg', { hasText: 'unidade cm ($INSUNITS)' }).waitFor();
}

export const flows = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
{
    name: 'edifício: pavimentos por comando, verificação, desfazer, salvar e reabrir',
    async run({ newPage, tmp }) {
      const page = await newPage(NO_PICKERS);
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
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
      await page.locator('.topbar .status.bad').waitFor();
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
      await page2.getByRole('tab', { name: 'Edifício', exact: true }).click();
      await page2.waitForFunction(() => document.querySelectorAll('table.edpav tbody tr').length === 6);
      assert.equal(await page2.getByLabel('Cota de Tipo 4').inputValue(), '12,50');
    },
  },
{
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
      await page.locator('summary', { hasText: 'Pilares' }).click();
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
  },
  {
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
  },
{
    name: 'planta: vigas por clique com captura no centro dos pilares, verificação e desfazer',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
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
      await page.locator('summary', { hasText: 'Vigas' }).click();
      assert.equal(await page.getByLabel('Seção de V1').inputValue(), '15x40');
      await page.locator('.topbar .status.ok').waitFor();
      // viga solta digitada: erro de verificação; desfazer volta ao estado sem erro
      await page.keyboard.type('2;2'); await page.keyboard.press('Enter');
      await page.keyboard.type('3;2'); await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await page.locator('.topbar .status.bad', { hasText: '1 erro' }).waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: /Verificação/ }).click();
      await page.locator('.diags li.erro', { hasText: 'V3 não se apoia' }).waitFor();
      await page.keyboard.press('Control+z');
      await page.locator('.topbar .status.ok').waitFor();
    },
  },
{
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
      await page.locator('summary', { hasText: 'Lajes' }).click();
      await page.getByRole('button', { name: 'Preencher todos os panos' }).click();
      await page.locator('summary', { hasText: 'Lajes — Tipo (2)' }).waitFor();
      await page.locator('summary', { hasText: 'Cargas' }).click();
      await page.getByRole('button', { name: 'Gerar 1 trecho(s) de parede' }).click();
      await page.locator('summary', { hasText: 'Cargas — Tipo (1)' }).waitFor();
      await page.locator('.statusbar .msg', { hasText: '1 trecho(s) de alvenaria (3 m, altura 2,5 m)' }).waitFor();
    },
  },
{
    name: 'análise do edifício no worker: cargas na fundação em equilíbrio, vento e γz',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
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
  },
  {
    name: 'dimensionamento do edifício: tabelas, cargas enviadas ao módulo Fundações e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
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
  },
  {
    name: 'pranchas: prévia, carimbo e downloads em PDF, DXF e DWG',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
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
  },
  {
    name: 'vigas: contorno locado na face externa dos pilares',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await page.locator('summary', { hasText: 'Vigas — Tipo' }).click();
      await page.getByRole('button', { name: 'Contorno na face externa' }).click();
      await page.locator('.statusbar .msg', { hasText: 'alinhada(s) à face externa' }).waitFor();
      for (const v of ['V1', 'V2', 'V3', 'V4']) assert.notEqual(await page.getByLabel(`Alinhamento de ${v}`).inputValue(), 'centro');
      await page.locator('.edif-tabs').getByRole('tab', { name: /Verificação/ }).click();
      assert.doesNotMatch(await page.locator('.edif-out').textContent(), /VIGA_/);
    },
  },
  {
    name: 'opções de cálculo do edifício: alterar, marcar e voltar ao padrão',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      await page.locator('summary', { hasText: 'Opções de cálculo' }).click();
      const malha = page.getByLabel('Malha da grelha das lajes');
      assert.equal(await malha.inputValue(), '0,25');
      await malha.fill('0,5');
      await malha.press('Enter');
      await page.locator('summary', { hasText: 'Opções de cálculo (1 alterada)' }).waitFor();
      await page.getByRole('button', { name: 'Voltar ao padrão' }).click();
      await page.locator('summary', { hasText: /^Opções de cálculo$/ }).waitFor();
      assert.equal(await malha.inputValue(), '0,25');
    },
  },
  {
    name: 'vínculos: engaste na base do pilar selecionado, desfazer e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await page.locator('summary', { hasText: 'Pilares (4)' }).click();
      await page.locator('table.quadro tbody tr').first().click();
      await page.locator('summary', { hasText: 'Vínculos, flambagem e cobrimento' }).click();
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
      await page.getByRole('button', { name: /Desfazer/ }).click();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      assert.doesNotMatch(await memo.textContent(), /Vínculos e engastes alterados/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      await page.waitForFunction(() => [...document.querySelectorAll('label.field')].find((l) => l.textContent.startsWith('Engaste na base'))?.querySelector('input')?.value === '1');
    },
  },
  {
    name: 'materiais e segurança: fck das vigas, γc e voltar ao padrão',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      await page.locator('summary', { hasText: 'Materiais e segurança' }).click();
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
  },
  {
    name: 'casos de carga: caso adicional, carga no pilar e lista de combinações',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      // caso adicional pelo grupo "Casos de carga"
      await page.locator('summary', { hasText: 'Casos de carga' }).click();
      await page.getByLabel('Novo caso').fill('Neve');
      await page.getByLabel('Novo caso').press('Enter');
      await page.getByRole('button', { name: 'Criar caso' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Caso Neve (Q) criado' }).waitFor();
      assert.equal(await page.getByLabel('Natureza de Neve').inputValue(), 'Q');
      // carga no pilar selecionado
      await page.locator('summary', { hasText: 'Pilares (4)' }).click();
      await page.locator('table.quadro tbody tr').filter({ has: page.locator('input[aria-label^="Nome de P1"]') }).first().click();
      await page.locator('summary', { hasText: 'Vínculos, flambagem e cobrimento' }).click();
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
  },
  {
    name: 'vento: coeficiente por sentido e platibanda no grupo, estado e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('summary', { hasText: 'Vento e combinações' }).click();
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
  },
  {
    name: 'N1e: redistribuição e limite de fissura nas opções, colunas Td/wk e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('summary', { hasText: 'Opções de cálculo' }).click();
      const red = page.getByLabel('Redistribuição de negativos das vigas');
      await red.fill('20');
      await red.press('Enter');
      const fis = page.getByLabel('Abertura de fissuras máxima');
      await fis.fill('0,2');
      await fis.press('Enter');
      await page.locator('summary', { hasText: 'Opções de cálculo (2 alteradas)' }).waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      const card = (t) => page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: t }) });
      const cab = await card(/^Vigas$/).locator('thead').textContent();
      assert.match(cab, /Td \(kN·m\)/);
      assert.match(cab, /wk inf \/ sup \/ lim\./);
      assert.match(await card('Pilares (por lance)').locator('thead').textContent(), /Vd \(kN\)/);
      assert.match(await card(/^Lajes$/).locator('thead').textContent(), /wk \/ lim\./);
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const txt = await memo.textContent();
      assert.match(txt, /Redistribuição \(NBR 6118, 14\.6\.4\.3\): 20 %/);
      assert.match(txt, /limite 0,20 mm \(opção\)/);
    },
  },
  {
    name: 'perfis de padrões: sistema × NBR 6118 nas opções, com o outro padrão ao lado',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      await page.locator('summary', { hasText: 'Opções de cálculo' }).click();
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
  },
  {
    name: 'R1: erros na planta, lista clicável, janela do elemento com diagramas, deslocamentos e CSV',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [7, 0], [7, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [7, 0]], [[0, 5], [7, 5]], [[0, 0], [0, 5]], [[7, 0], [7, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      // lista de erros: contagem e filtro por nível
      const lista = page.locator('[data-lista-erros]');
      const cont = await lista.locator('[data-contagem]').innerText();
      const nErros = parseInt(/(\d+) erro/.exec(cont)?.[1] ?? '0', 10);
      assert.ok(nErros > 0, `esperava erros, veio: ${cont}`);
      const linhasErro = await lista.locator('tbody tr.bad').count();
      assert.equal(linhasErro, nErros);
      await lista.getByLabel('Nível').selectOption('aviso');
      assert.equal(await lista.locator('tbody tr.bad').count(), 0);
      await lista.getByLabel('Nível').selectOption('erro');
      await lista.locator('details summary').click();
      assert.match(await lista.locator('details').innerText(), /BIELA|FLECHA|ARMADURA/);
      // clicar numa linha leva à planta com o elemento selecionado
      const alvo = lista.locator('tbody tr.click').first();
      const nomeAlvo = (await alvo.locator('td').first().innerText()).trim();
      await alvo.click();
      await page.locator('.planta-barra').waitFor();
      assert.equal(await page.getByRole('button', { name: 'Resultados do elemento' }).isEnabled(), true);
      // a planta marca os reprovados (chave Mostrar erros ligada) e a chave desliga
      const chave = page.getByLabel('Mostrar erros');
      assert.equal(await chave.isChecked(), true);
      await chave.uncheck();
      await chave.check();
      // janela do elemento pela planta
      await page.getByRole('button', { name: 'Resultados do elemento' }).click();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento/ });
      await jan.waitFor();
      assert.match(await jan.getAttribute('aria-label'), new RegExp(nomeAlvo.split(' ').at(-1)));
      const txt = await jan.innerText();
      if (/^Viga/.test(nomeAlvo)) {
        for (const d of ['M', 'V', 'T']) assert.equal(await jan.locator(`svg[data-diagrama="${d}"]`).count(), 1);
        assert.ok(await jan.locator('svg[data-diagrama="M"] [data-extremo]').count() >= 1);
        assert.match(txt, /Combinações determinantes/i);
        assert.match(txt, /Mensagens/i);
      } else {
        assert.match(txt, /Mensagens/i);
      }
      await jan.getByRole('button', { name: 'Fechar' }).click();
      assert.equal(await jan.count(), 0);
      // duplo clique numa linha da tabela de vigas abre a janela de uma viga, com diagramas e cabeçalhos
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) }).locator('tbody tr').first().dblclick();
      const jv = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await jv.waitFor();
      for (const d of ['M', 'V', 'T']) assert.equal(await jv.locator(`svg[data-diagrama="${d}"]`).count(), 1);
      assert.match(await jv.innerText(), /Momento fletor Md/i);
      await page.keyboard.press('Escape');
      assert.equal(await jv.count(), 0);
      // pilar: tabela das combinações determinantes
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: 'Pilares (por lance)' }) }).locator('tbody tr').first().dblclick();
      const jp = page.getByRole('dialog', { name: /Resultados do elemento — Pilar/ });
      await jp.waitFor();
      const cab = await jp.locator('thead').first().innerText();
      assert.match(cab, /Nd \(kN\)/);
      assert.match(cab, /Md,tot u \/ v/);
      await jp.getByRole('button', { name: 'Fechar' }).click();
      // exportar CSV com separador ";" e vírgula decimal
      const csv = await downloadText(page, () => page.getByRole('button', { name: 'Exportar CSV' }).first().click());
      assert.match(csv.name, /listagem-edificio\.csv$/);
      const linhas = csv.text.replace('\ufeff', '').split(/\r?\n/).filter(Boolean);
      assert.match(linhas[0], /^Tipo;Elemento;Pavimento;/);
      assert.ok(linhas.some((l) => l.startsWith('Viga;')) && linhas.some((l) => l.startsWith('Pilar;')) && linhas.some((l) => l.startsWith('Laje;')));
      // deslocamentos na aba Análise
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Análise' }).click();
      await page.getByRole('button', { name: 'Calcular', exact: true }).click();
      const dl = page.locator('[data-deslocamentos]');
      await dl.waitFor({ timeout: 60000 });
      assert.match(await dl.innerText(), /ψ1 = 0,3/);
      assert.match(await dl.innerText(), /Tabela 13\.3/);
      assert.ok(await dl.locator('table[data-direcao]').count() >= 1);
      assert.match(await dl.locator('table').first().locator('thead').innerText(), /Entre pavimentos \(mm\)/);
      assert.ok(await dl.locator('tr[data-topo]').count() >= 1);
      // memorial: deslocamentos e erros e avisos
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.textContent();
      assert.match(mt, /Deslocamentos laterais do vento/);
      assert.match(mt, /Erros e avisos/);
      assert.match(mt, new RegExp(`${nErros} ${nErros === 1 ? 'erro' : 'erros'} e`));
    },
  },
  {
    name: 'R2: edita a armadura de uma viga (2 φ8 reprova), restaura, bloqueia em lote e conta',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const calcular = async (nome) => {
        await page.getByRole('button', { name: nome }).click();
        await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      };
      await calcular('Calcular e dimensionar');
      const cardVigas = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) });
      const linhaOk = cardVigas.locator('tbody tr', { hasText: /ok$/ }).first();
      assert.ok(await linhaOk.count() >= 1, 'esperava uma viga que atende');
      const nome = (await linhaOk.locator('td').first().innerText()).trim();
      await linhaOk.dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await jan.waitFor();
      const ed = jan.locator('[data-editor-armadura="viga"]');
      assert.equal(await ed.locator('[data-bloqueada]').count(), 0);
      // arranjo calculado pré-preenchido (> 2 φ8) e área necessária visível
      const inf = ed.locator('[data-armadura="Inferior"]');
      assert.match(await inf.innerText(), /necessária/);
      await inf.getByLabel('Inferior (nº barras)').fill('2');
      await inf.getByLabel('Inferior (nº barras)').press('Enter');
      await inf.getByLabel('Bitola').selectOption('8');
      assert.match(await inf.locator('[data-as]').innerText(), /As efetiva 1,01 cm²/);
      await ed.getByRole('button', { name: 'Aplicar e bloquear' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await jan.locator('[data-editor-armadura="viga"] [data-bloqueada]').waitFor();
      assert.match(await jan.innerText(), /Armadura bloqueada insuficiente: inferior/);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // a lista de erros mostra ARM_BLOQ e a tabela marca "bloq."
      const lista = page.locator('[data-lista-erros]');
      assert.ok(await lista.locator('tbody tr.bad', { hasText: 'ARM_BLOQ' }).count() >= 1);
      assert.ok(await cardVigas.locator('td[data-bloq]', { hasText: 'bloq.' }).count() >= 1);
      assert.match(await page.locator('[data-bloqueadas]').innerText(), /1 viga bloqueada/);
      // restaurar a calculada: volta a atender
      await cardVigas.locator('tbody tr', { hasText: nome }).first().dblclick();
      await jan.waitFor();
      await jan.getByRole('button', { name: 'Restaurar calculada' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await jan.locator('[data-editor-armadura="viga"]').waitFor();
      assert.equal(await jan.locator('[data-bloqueada]').count(), 0);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      assert.equal(await lista.locator('tbody tr.bad', { hasText: 'ARM_BLOQ' }).count(), 0);
      assert.match(await cardVigas.locator('tbody tr', { hasText: nome }).first().innerText(), /ok$/);
      // bloqueio em lote de todos e contagem
      await page.getByRole('button', { name: 'Bloquear todos', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      const nVigas = await cardVigas.locator('tbody tr').count();
      const txt = await page.locator('[data-bloqueadas]').innerText();
      assert.match(txt, new RegExp(`${nVigas} vigas bloqueadas`));
      const nLances = await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: 'Pilares (por lance)' }) }).locator('tbody tr').count();
      assert.match(txt, new RegExp(`${nLances} lances de pilar bloqueados`));
      assert.equal(await cardVigas.locator('td[data-bloq]', { hasText: 'bloq.' }).count(), nVigas);
      // memorial lista as armaduras bloqueadas
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo.textContent(), /Armaduras bloqueadas/);
      assert.match(await memo.textContent(), /só as verifica/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // desbloquear todos
      await page.getByRole('button', { name: 'Desbloquear todos', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      assert.match(await page.locator('[data-bloqueadas]').innerText(), /0 vigas bloqueadas/);
    },
  },
  {
    name: 'R3a: detalhamento da viga (elevação, tabela de barras), resumo de aço com CSV e cópia de armadura',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const pronto = () => page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await pronto();
      // resumo de aço: total > 0 e CSV
      const resumo = page.locator('[data-resumo-aco]');
      await resumo.waitFor();
      const totalTxt = await resumo.locator('tr[data-total-aco] td.num').nth(1).innerText();
      assert.ok(num(totalTxt) > 0, `peso total ${totalTxt}`);
      assert.match(await resumo.innerText(), /Perdas de 10,0 %/);
      const csv = await downloadText(page, () => resumo.getByRole('button', { name: 'Exportar CSV do aço' }).click());
      assert.match(csv.name, /\.csv$/);
      assert.match(csv.text, /Resumo de aço das vigas/);
      assert.match(csv.text, /Lista de barras/);
      assert.match(csv.text, /;N1;Passante;/);
      assert.match(csv.text, /Total;;/);
      // janela da viga, aba Detalhamento
      const cardVigas = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) });
      const nVigas = await cardVigas.locator('tbody tr').count();
      assert.equal(nVigas, 4);
      const nomes = [];
      for (let i = 0; i < nVigas; i++) nomes.push((await cardVigas.locator('tbody tr').nth(i).locator('td').first().innerText()).trim());
      await cardVigas.locator('tbody tr').first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Detalhamento' }).click();
      const svg = jan.locator('svg[data-detalhe]');
      await svg.waitFor();
      const nb = parseInt(await svg.getAttribute('data-barras'), 10);
      assert.ok(nb >= 2, `barras no desenho: ${nb}`);
      assert.equal(await svg.locator('g[data-barra]').count(), nb);
      assert.ok(parseInt(await svg.getAttribute('data-estribos'), 10) >= 1);
      assert.match(await svg.innerHTML(), /N1 – \d+ φ[\d,]+ – C = \d+,\d\d/);
      assert.ok(await svg.locator('rect[data-apoio]').count() >= 2);
      const tabela = jan.locator('table[data-tabela-barras]');
      assert.match(await tabela.innerText(), /N1/);
      assert.match(await tabela.innerText(), /Passante/);
      assert.match(await tabela.innerText(), /Estribo/);
      assert.ok(await jan.locator('svg[data-secao]').count() === 1);
      assert.ok(parseInt(await jan.locator('svg[data-secao]').getAttribute('data-barras-secao'), 10) >= 2);
      assert.match(await jan.innerText(), /lb inferior \(boa aderência\)\s*\d+ cm/);
      assert.match(await jan.innerText(), /lb superior\s*\d+ cm \((boa|má) aderência\)/);
      assert.ok(await jan.locator('[data-avisos-det]').count() === 1);
      // copiar armadura: bloqueia esta viga e copia para as outras
      await jan.getByRole('radio', { name: 'Resultados e armadura' }).click();
      assert.equal(await jan.locator('[data-copiar-armadura] button', { hasText: 'Copiar para…' }).count(), 0);
      await jan.locator('[data-editor-armadura="viga"]').getByRole('button', { name: 'Aplicar e bloquear' }).click();
      await pronto();
      await jan.locator('[data-editor-armadura="viga"] [data-bloqueada]').waitFor();
      await jan.getByRole('button', { name: 'Copiar para…' }).click();
      const lista = jan.locator('[data-lista-copia]');
      assert.equal(await lista.getByRole('checkbox').count(), 3);
      for (let i = 0; i < 3; i++) assert.ok(await lista.getByRole('checkbox').nth(i).isChecked(), 'mesma seção e nº de vãos pré-marcadas');
      await lista.getByRole('checkbox').nth(2).uncheck();
      await lista.getByRole('button', { name: /^Copiar para 2 vigas$/ }).click();
      await pronto();
      await jan.getByRole('button', { name: 'Fechar' }).click();
      assert.match(await page.locator('[data-bloqueadas]').innerText(), /3 vigas bloqueadas/);
      assert.equal(await cardVigas.locator('td[data-bloq]', { hasText: 'bloq.' }).count(), 3);
      // memorial: detalhamento das vigas e resumo de aço
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.textContent();
      assert.match(mt, /Detalhamento das vigas/);
      assert.match(mt, /Resumo de aço das vigas/);
      assert.match(mt, /detalhamento-vigas|Detalhamento\.\s*Vigas: armadura necessária/);
      assert.match(mt, new RegExp(`Viga ${nomes[0]} —`));
    },
  },
  {
    name: 'R3b: prédio de 3 pavimentos-tipo, detalhamento do pilar (elevação, tabelas), resumo geral de aço e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('pavimento.repetir {"id": "pav_6", "vezes": 2}');
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      // resumo de aço: vigas, pilares e total geral
      const resumo = page.locator('[data-resumo-aco]');
      await resumo.waitFor();
      const peso = async (m) => num(await resumo.locator(`tr[data-total-aco="${m}"] td.num`).nth(1).innerText());
      const pv = await peso('vigas'), pp = await peso('pilares'), pl = await peso('lajes'), pg = await peso('geral');
      assert.ok(pp > 0, `peso dos pilares ${pp}`);
      assert.ok(Math.abs(pg - (pv + pp + pl)) < 0.03, `geral ${pg} = vigas ${pv} + pilares ${pp} + lajes ${pl}`);
      const csv = await downloadText(page, () => resumo.getByRole('button', { name: 'Exportar CSV do aço' }).click());
      assert.match(csv.text, /Resumo de aço dos pilares/);
      assert.match(csv.text, /Resumo geral de aço/);
      assert.match(csv.text, /Lista de barras dos pilares/);
      // janela do pilar, aba Detalhamento
      const cardP = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: 'Pilares (por lance)' }) });
      await cardP.locator('tbody tr').first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Pilar/ });
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Detalhamento' }).click();
      const svg = jan.locator('svg[data-detalhe-pilar]');
      await svg.waitFor();
      const nb = parseInt(await svg.getAttribute('data-barras'), 10), nl = parseInt(await svg.getAttribute('data-lances'), 10);
      assert.ok(nb >= 1, `barras no desenho: ${nb}`);
      assert.ok(nl >= 3, `lances: ${nl}`);
      assert.equal(await svg.locator('g[data-barra]').count(), nb);
      assert.equal(await svg.locator('g[data-lance]').count(), nl);
      assert.match(await svg.innerHTML(), /N1 – \d+ φ[\d,]+ – C = \d+,\d\d/);
      assert.equal(await jan.locator('svg[data-barras-secao]').count(), nl);
      const tb = jan.locator('table[data-tabela-barras-pilar]');
      assert.match(await tb.innerText(), /N1/);
      assert.match(await tb.innerText(), /Longitudinal/);
      assert.equal(await jan.locator('table[data-tabela-estribos-pilar] tbody tr').count(), nl + 1);
      assert.match(await jan.innerText(), /lb – .* \(boa aderência\)\s*\d+ cm/);
      assert.ok(await jan.locator('[data-avisos-det]').count() === 1);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // memorial
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.textContent();
      assert.match(mt, /Detalhamento dos pilares/);
      assert.match(mt, /Resumo geral de aço/);
      assert.match(mt, /Total geral \(vigas, pilares, lajes e vigotas\)/);
      assert.match(mt, /detalhamento-pilares|Detalhamento\.\s*Pilares/);
    },
  },
  {
    name: 'R4: duas lajes contínuas, detalhamento da laje (planta SVG, tabela de posições), resumo geral de aço com lajes e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [4, 0], [8, 0], [0, 4], [4, 4], [8, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 4], [8, 4]], [[0, 0], [0, 4]], [[4, 0], [4, 4]], [[8, 0], [8, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      // resumo de aço com lajes
      const resumo = page.locator('[data-resumo-aco]');
      await resumo.waitFor();
      const peso = async (m) => num(await resumo.locator(`tr[data-total-aco="${m}"] td.num`).nth(1).innerText());
      const pv = await peso('vigas'), pp = await peso('pilares'), pl = await peso('lajes'), pg = await peso('geral');
      assert.ok(pl > 0, `peso das lajes ${pl}`);
      assert.ok(Math.abs(pg - (pv + pp + pl)) < 0.03, `geral ${pg} = ${pv} + ${pp} + ${pl}`);
      const csv = await downloadText(page, () => resumo.getByRole('button', { name: 'Exportar CSV do aço' }).click());
      assert.match(csv.text, /Resumo de aço das lajes/);
      assert.match(csv.text, /Resumo geral de aço \(vigas, pilares, lajes e vigotas\)/);
      assert.match(csv.text, /Lista de posições das lajes/);
      // janela da laje, aba Detalhamento
      const cardL = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Lajes/ }) });
      assert.ok(await cardL.locator('tbody tr').count() >= 2);
      await cardL.locator('tbody tr').first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Laje/ });
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Detalhamento' }).click();
      const svg = jan.locator('svg[data-detalhe-laje]');
      await svg.waitFor();
      const np = parseInt(await svg.getAttribute('data-posicoes'), 10);
      assert.ok(np >= 3, `posições no desenho: ${np}`);
      assert.equal(await svg.locator('g[data-pos]').count(), np);
      assert.ok(await svg.locator('g[data-pos][data-tipo="positiva"]').count() >= 2);
      assert.ok(await svg.locator('g[data-pos][data-tipo="negativa"]').count() >= 1, 'negativa sobre a borda contínua');
      assert.match(await svg.innerHTML(), /N1 – \d+ φ[\d,]+ c\/\d+ – C = \d+,\d\d/);
      assert.ok(await svg.locator('g[data-borda="continua"]').count() >= 1);
      const tb = jan.locator('table[data-tabela-posicoes-laje]');
      assert.match(await tb.innerText(), /Positiva/);
      assert.match(await tb.innerText(), /Negativa/);
      assert.equal(await tb.locator('tbody tr').count(), np + 1);
      // camadas: desligar as superiores deixa só as inferiores
      await jan.getByLabel('Superiores (negativas)').uncheck();
      assert.equal(await svg.locator('g[data-face="sup"]').count(), 0);
      assert.equal(parseInt(await svg.getAttribute('data-posicoes'), 10), await svg.locator('g[data-face="inf"]').count());
      await jan.getByLabel('Superiores (negativas)').check();
      assert.match(await jan.innerText(), /lb inferior \(boa aderência\)\s*\d+ cm/);
      assert.ok(await jan.locator('table[data-tabela-positivas-laje] tbody tr').count() === 2);
      assert.ok(await jan.locator('[data-avisos-det]').count() === 1);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // camada de armadura das lajes na planta
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      const camada = page.getByLabel('Armadura das lajes na planta');
      await camada.selectOption('inf');
      await page.waitForTimeout(300);
      await camada.selectOption('sup');
      await page.waitForTimeout(300);
      assert.ok(parseFloat(await page.locator('[data-frame-ms]').first().getAttribute('data-frame-ms')) < 50, 'quadro da planta com a camada de armadura');
      await camada.selectOption('nenhuma');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      // memorial
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.textContent();
      assert.match(mt, /Detalhamento das lajes/);
      assert.match(mt, /Total geral \(vigas, pilares, lajes e vigotas\)/);
      assert.match(mt, /detalhamento-lajes|Detalhamento\.\s*Lajes/);
    },
  },
  {
    name: 'R5: pranchas de armação (vigas, pilares, lajes), locação com cargas e conjunto numerado; aviso sem cálculo; PDF',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [4, 0], [8, 0], [0, 4], [4, 4], [8, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 4], [8, 4]], [[0, 0], [0, 4]], [[4, 0], [4, 4]], [[8, 0], [8, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('eixo.malha {"dx": [4, 4], "dy": [4]}');
      // sem cálculo: aviso claro nas pranchas de armação
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const tipo = page.getByLabel('Tipo de prancha');
      await tipo.selectOption({ label: 'Armação de vigas' });
      await page.locator('[data-aviso-calculo="sem"]').waitFor();
      assert.equal(await page.locator('[data-lista-folhas]').count(), 0);
      // calcular e dimensionar
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const prev = page.locator('.prancha-prev');
      const lista = page.locator('[data-lista-folhas]');
      const peso = async () => parseFloat(await page.locator('[data-aco-folha]').getAttribute('data-aco-peso'));
      // armação de vigas
      await tipo.selectOption({ label: 'Armação de vigas' });
      await prev.locator('svg').waitFor();
      assert.equal(await prev.getAttribute('data-tipo'), 'vigas');
      assert.match(await prev.textContent(), /N1/);
      assert.ok((await peso()) > 0, 'peso de aço da folha de vigas');
      assert.match(await lista.innerText(), /SCV/);
      // armação de pilares
      await tipo.selectOption({ label: 'Armação de pilares' });
      await prev.locator('svg').waitFor();
      assert.equal(await prev.getAttribute('data-tipo'), 'pilares');
      assert.match(await prev.textContent(), /N1/);
      assert.match(await lista.innerText(), /SCP/);
      assert.ok((await peso()) > 0, 'peso de aço da folha de pilares');
      // armação de lajes
      await tipo.selectOption({ label: 'Armação de lajes' });
      await prev.locator('svg').waitFor();
      assert.equal(await prev.getAttribute('data-tipo'), 'lajes');
      assert.match(await prev.textContent(), /N1/);
      assert.match(await lista.innerText(), /SCL/);
      // locação e cargas
      await tipo.selectOption({ label: 'Locação e cargas' });
      await prev.locator('svg').waitFor();
      assert.equal(await prev.getAttribute('data-tipo'), 'locacao');
      assert.match(await prev.textContent(), /kN/);
      assert.match(await lista.innerText(), /SFN/);
      // opção de armação: escala das vigas muda a folha
      await page.locator('summary', { hasText: 'Opções de armação e locação' }).click();
      await tipo.selectOption({ label: 'Armação de vigas' });
      await page.getByLabel('Escala das vigas').selectOption({ label: '1:50' });
      await page.waitForFunction(() => /1:50/.test(document.querySelector('[data-lista-folhas]')?.textContent ?? ''));
      await page.getByLabel('Escala das vigas').selectOption({ label: '1:75' });
      // conjunto completo, numerado
      await tipo.selectOption({ label: 'Conjunto completo' });
      await prev.locator('svg').waitFor();
      const n = parseInt(await prev.getAttribute('data-total'), 10);
      assert.ok(n >= 5, `folhas do conjunto: ${n}`);
      assert.equal(await page.locator('[data-folha-item]').count(), n);
      assert.match(await prev.textContent(), /01\//);
      for (const sg of ['SFN', 'SCF', 'SCV', 'SCP', 'SCL']) assert.match(await lista.innerText(), new RegExp(sg));
      await page.getByRole('button', { name: 'Próxima folha' }).click();
      assert.equal(await prev.getAttribute('data-folha'), '2');
      assert.match(await prev.textContent(), /02\//);
      // exportar
      const baixar = async (rot) => {
        const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: rot }).click()]);
        return { nome: dl.suggestedFilename(), dados: readFileSync(await dl.path()) };
      };
      const pdf = await baixar('PDF da folha');
      assert.match(pdf.nome, /-SCF-02\.pdf$/);
      assert.equal(pdf.dados.subarray(0, 5).toString('latin1'), '%PDF-');
      const todas = await baixar('PDF (todas)');
      assert.match(todas.nome, /-conjunto\.pdf$/);
      assert.ok(todas.dados.length > pdf.dados.length);
      const dxf = await baixar('DXF (zip de todas)');
      assert.match(dxf.nome, /-dxf\.zip$/);
      assert.equal(dxf.dados.subarray(0, 2).toString('latin1'), 'PK');
      // só dados de prancha: a revisão de cálculo não muda e as folhas de armação continuam
      await cmd('prancha.definir {"carimbo": {"responsavel": "Eng. Z"}}');
      await tipo.selectOption({ label: 'Armação de lajes' });
      await prev.getByText('Eng. Z').waitFor();
      assert.equal(await page.locator('[data-aviso-calculo]').count(), 0);
      assert.equal(await prev.getAttribute('data-tipo'), 'lajes');
      // modelo alterado: dimensionamento desatualizado, aviso
      await cmd('eixo.malha {"dx": [4, 4, 1], "dy": [4]}');
      await tipo.selectOption({ label: 'Armação de lajes' });
      await page.locator('[data-aviso-calculo="desatualizado"]').waitFor();
    },
  },
  {
    name: 'R6: duas lajes treliçadas H12 contínuas, janela Vigotas (planta SVG, diagramas, tabela de grupos), bloqueio da armadura, resumo de aço com treliças e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [4, 0], [8, 0], [0, 4], [4, 4], [8, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 4], [8, 4]], [[0, 0], [0, 4]], [[4, 0], [4, 4]], [[8, 0], [8, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "trelicada", "modelo": "H12", "capa": 0.04}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      // resumo de aço: vigotas e treliças
      const resumo = page.locator('[data-resumo-aco]');
      await resumo.waitFor();
      const peso = async (m) => num(await resumo.locator(`tr[data-total-aco="${m}"] td.num`).nth(1).innerText());
      const pv = await peso('vigas'), pp = await peso('pilares'), pl = await peso('lajes'), pz = await peso('vigotas'), pg = await peso('geral');
      assert.ok(pz > 0, `peso das vigotas ${pz}`);
      assert.ok(Math.abs(pg - (pv + pp + pl + pz)) < 0.05, `geral ${pg} = ${pv} + ${pp} + ${pl} + ${pz}`);
      const tre = resumo.locator('table[data-tabela-trelicas]');
      assert.match(await tre.innerText(), /TR 12645/);
      assert.ok(num(await tre.locator('tr[data-total-trelicas] td.num').nth(0).innerText()) > 10, 'comprimento de treliça');
      assert.ok(num(await tre.locator('tr[data-total-trelicas] td.num').nth(1).innerText()) > 5, 'peso da treliça');
      const csv = await downloadText(page, () => resumo.getByRole('button', { name: 'Exportar CSV do aço' }).click());
      assert.match(csv.text, /Treliças eletrossoldadas por tipo/);
      assert.match(csv.text, /Resumo de aço das lajes treliçadas/);
      assert.match(csv.text, /Lajes treliçadas por grupo de igualação/);
      // janela da laje, aba Vigotas
      const cardL = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Lajes/ }) });
      assert.ok(await cardL.locator('tbody tr').count() >= 2);
      await cardL.locator('tbody tr').first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Laje/ });
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Vigotas' }).click();
      const svg = jan.locator('svg[data-vigotas-laje]');
      await svg.waitFor();
      const nf = parseInt(await svg.getAttribute('data-faixas'), 10), ng = parseInt(await svg.getAttribute('data-grupos'), 10);
      assert.ok(nf >= 3, `faixas no desenho: ${nf}`);
      assert.ok(ng >= 1 && ng <= nf);
      // padrão: uma faixa representativa por grupo; a chave mostra todas
      assert.equal(parseInt(await svg.getAttribute('data-faixas-visiveis'), 10), ng, 'uma faixa por grupo');
      assert.equal(await svg.locator('g[data-faixa]').count(), ng);
      assert.ok(await svg.locator('[data-largura-grupo]').count() >= 1, 'largura do grupo indicada');
      assert.equal(await svg.locator('text[data-rotulo-grupo]').count(), ng);
      await jan.getByLabel('Mostrar todas as faixas').check();
      assert.equal(parseInt(await svg.getAttribute('data-faixas-visiveis'), 10), nf);
      assert.equal(await svg.locator('g[data-faixa]').count(), nf);
      assert.equal(await svg.locator('text[data-rotulo-grupo]').count(), ng);
      assert.ok(await svg.locator('line.vig-neg').count() >= 1, 'negativos sobre o apoio contínuo');
      const tb = jan.locator('table[data-tabela-grupos-vigotas]');
      assert.equal(await tb.locator('tbody tr').count(), ng);
      assert.match(await tb.innerText(), /G1/);
      // diagramas da vigota selecionada
      await svg.locator('g[data-faixa="1"]').click();
      const dg = jan.locator('[data-diagrama-vigota="1"]');
      await dg.waitFor();
      assert.equal(await dg.locator('svg[data-diagrama]').count(), 2);
      assert.ok(await dg.locator('g[data-ref="VRd1"]').count() >= 1, 'linha de VRd1');
      assert.match(await dg.innerText(), /VRd1 = \d+,\d/);
      assert.match(await jan.innerText(), /Peso da treliça \(por pavimento\)\s*\d+,\d\d kg/);
      assert.match(await jan.innerText(), /Distribuição na capa\s*φ[\d,]+ c\/\d+ cm/);
      // bloqueio com armadura adicional insuficiente reprova; desbloquear volta
      const ed = jan.locator('[data-editor-armadura="vigotas"]');
      const adicional = await tb.locator('tbody tr').first().locator('td').nth(10).innerText();
      await ed.getByRole('button', { name: 'Aplicar e bloquear' }).click();
      await jan.locator('[data-bloqueada]').first().waitFor({ timeout: 90000 });
      await ed.getByRole('button', { name: 'Desbloquear' }).click();
      await page.waitForFunction(() => !document.querySelector('[data-editor-armadura="vigotas"] [data-bloqueada]'), null, { timeout: 90000 });
      assert.ok(adicional.length > 0);
      // bloquear com 0 barras adicionais: ou atende (treliça basta) ou reprova com código na lista de erros
      const nInf = ed.locator('[data-armadura="Inferior"] input').first();
      await nInf.fill('0'); await nInf.press('Enter');
      await ed.getByRole('button', { name: 'Aplicar e bloquear' }).click();
      await jan.locator('[data-bloqueada]').first().waitFor({ timeout: 90000 });
      await jan.getByRole('button', { name: 'Fechar' }).click();
      await page.locator('[data-lista-erros] [data-contagem]').waitFor();
      const lista = await page.locator('[data-lista-erros]').innerText();
      const reprovou = /ARM_BLOQ|VIGOTA_POS/.test(lista);
      // desbloquear de novo
      await cardL.locator('tbody tr').first().dblclick();
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Vigotas' }).click();
      await jan.locator('[data-editor-armadura="vigotas"]').getByRole('button', { name: 'Desbloquear' }).click();
      await page.waitForFunction(() => !document.querySelector('[data-editor-armadura="vigotas"] [data-bloqueada]'), null, { timeout: 90000 });
      await jan.getByRole('button', { name: 'Fechar' }).click();
      assert.ok(reprovou, 'bloqueio com 0 barras adicionais deve reprovar (ARM_BLOQ ou VIGOTA_POS) na lista de erros');
      // camada de armadura das lajes na planta (inclui as treliçadas)
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      const camada = page.getByLabel('Armadura das lajes na planta');
      await camada.selectOption('inf');
      await page.waitForTimeout(300);
      await camada.selectOption('sup');
      await page.waitForTimeout(300);
      assert.ok(parseFloat(await page.locator('[data-frame-ms]').first().getAttribute('data-frame-ms')) < 50, 'quadro da planta com a camada de armadura');
      await camada.selectOption('nenhuma');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      // memorial
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.textContent();
      assert.match(mt, /Lajes treliçadas/);
      assert.match(mt, /Treliças eletrossoldadas \(por tipo\)/);
      assert.match(mt, /Total geral \(vigas, pilares, lajes e vigotas\)/);
    },
  },
  {
    name: 'FU1: fundação no edifício — divisa e centrada lançadas na planta, cálculo, janela do elemento, FUND_EXC_SEM_VIGA, σadm sem refazer a análise e aba Fundações em leitura',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [7, 0], [7, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [7, 0]], [[0, 5], [7, 5]], [[0, 0], [0, 5]], [[7, 0], [7, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      // arranque (nasce e morre na fundação): linha da tabela de pilares e opção "fundação (arranque)" do seletor "Morre"
      await cmd('pilar.inserir {"x": 3.5, "y": 2.5, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}, "nasce": "fundacao", "morre": "fundacao"}');
      await page.locator('details.group > summary', { hasText: 'Pilares (' }).click();
      const linhaArr = page.locator('tr', { has: page.locator('select[aria-label^="Morre"]') }).last();
      assert.match(await linhaArr.innerText(), /arranque/);
      assert.equal(await linhaArr.locator('select[aria-label^="Morre"] option[value="fundacao"]').count(), 1);

      // grupo Fundação: terreno (σadm informada) e planta do nível de fundação
      await page.locator('details.group > summary', { hasText: /^Fundação \(/ }).click();
      const grupo = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Fundação \(/ }) });
      const sigma = grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^σadm$/ }) }).locator('input');
      await sigma.fill('300');
      await sigma.press('Enter');
      await page.getByRole('radio', { name: 'Fundação' }).click();
      assert.equal(await page.locator('.planta-cv').getAttribute('data-nivel'), 'fundacao');
      // P1 (0;0): sapata de divisa, clicando na face −x do pilar; P2 (7;0): sapata centrada
      await grupo.getByLabel('Posição no pilar').selectOption('divisa');
      const [x1, y1] = await telaDe(page, -0.07, 0);
      await page.mouse.click(x1, y1);
      await page.locator('.statusbar .msg', { hasText: 'S1 (sapata) lançado sob P1' }).waitFor();
      await grupo.getByLabel('Posição no pilar').selectOption('centrada');
      const [x2, y2] = await telaDe(page, 7, 0);
      await page.mouse.click(x2, y2);
      await page.locator('.statusbar .msg', { hasText: 'S2 (sapata) lançado sob P2' }).waitFor();
      const linhas = grupo.locator('table[data-fundacoes] tbody tr');
      assert.equal(await linhas.count(), 2);
      assert.match(await linhas.first().innerText(), /de divisa/);
      assert.match(await linhas.nth(1).innerText(), /centrada/);
      // desfazer e refazer pelo histórico do edifício (um passo por lançamento)
      await page.keyboard.press('Control+z');
      await page.locator('.statusbar .msg', { hasText: 'Desfeito: fundacao.criar' }).waitFor();
      assert.equal(await linhas.count(), 1);
      await page.keyboard.press('Control+y');
      await page.locator('.statusbar .msg', { hasText: 'Refeito: fundacao.criar' }).waitFor();
      assert.equal(await linhas.count(), 2);

      // calcular o edifício (as fundações vão junto) e ver os erros: divisa sem viga de equilíbrio
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      const lista = page.locator('[data-lista-erros]');
      await lista.getByLabel('Tipo').selectOption('fundacao');
      const erroDivisa = lista.locator('.tablewrap tbody tr', { hasText: 'FUND_EXC_SEM_VIGA' });
      assert.equal(await erroDivisa.count(), 1);
      assert.match(await erroDivisa.innerText(), /Fundação S1/);
      assert.equal(await lista.locator('.tablewrap tbody tr', { hasText: /Fundação S2/ }).count(), 0, 'a sapata centrada atende');
      const cardF = page.locator('[data-card-fundacoes]');
      assert.equal(await cardF.locator('tbody tr').count(), 2);
      // um clique leva à planta de fundação com o elemento selecionado; "Resultados do elemento" abre a janela
      await erroDivisa.click();
      await page.locator('.planta-barra').waitFor();
      assert.equal(await page.locator('.planta-cv').getAttribute('data-nivel'), 'fundacao');
      assert.equal(await page.locator('.planta-barra').getByRole('button', { name: 'Resultados do elemento' }).isEnabled(), true);
      await page.locator('.planta-barra').getByRole('button', { name: 'Resultados do elemento' }).click();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Fundação S1/ });
      await jan.waitFor();
      const jt = await jan.innerText();
      assert.match(jt, /FUND_EXC_SEM_VIGA/);
      assert.match(jt, /de divisa/);
      assert.match(jt, /Excentricidade do pilar/);
      assert.match(jt, /FUND_SEM_SOLUCAO/, 'sapata de divisa sem viga de equilíbrio não tem solução');
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // sapata centrada: janela pelo duplo clique na tabela do dimensionamento
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await cardF.locator('tbody tr', { hasText: 'S2' }).dblclick();
      const jan2 = page.getByRole('dialog', { name: /Resultados do elemento — Fundação S2/ });
      await jan2.waitFor();
      assert.match(await jan2.innerText(), /σadm.*300/);
      assert.ok(await jan2.locator('.fsketch svg').count() >= 1, 'desenho da sapata do módulo Fundações');
      assert.match(await jan2.innerText(), /Dimensionamento da sapata|Armadura|Flexão/i);
      await jan2.getByRole('button', { name: 'Fechar' }).click();

      // muda σadm: as fundações ficam desatualizadas e a análise NÃO é refeita ao recalcular só as fundações
      const bloco = grupo.locator('[data-fundacao-calculo]');
      const idAntes = await bloco.getAttribute('data-fundacao-calculo');
      assert.ok(idAntes);
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      // o arranque aparece na planta de fundação; selecionado, o grupo oferece as cargas no arranque
      await page.keyboard.press('s');
      const [x5, y5] = await telaDe(page, 3.5, 2.5);
      await page.mouse.click(x5, y5);
      await grupo.getByText('Cargas no arranque P5').waitFor();
      await sigma.fill('250');
      await sigma.press('Enter');
      await grupo.locator('[data-fundacao-velha]').waitFor();
      await grupo.getByRole('button', { name: 'Calcular fundações' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Fundações calculadas' }).waitFor({ timeout: 60000 });
      assert.match(await page.locator('.statusbar .msg').innerText(), /a análise da estrutura não foi refeita/);
      assert.equal(await bloco.getAttribute('data-fundacao-calculo'), idAntes, 'o cálculo da estrutura (worker) não mudou');
      assert.equal(await grupo.locator('[data-fundacao-velha]').count(), 0);
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await cardF.locator('tbody tr', { hasText: 'S2' }).dblclick();
      const jan3 = page.getByRole('dialog', { name: /Resultados do elemento — Fundação S2/ });
      await jan3.waitFor();
      assert.match(await jan3.innerText(), /σadm.*250/);
      await jan3.getByRole('button', { name: 'Fechar' }).click();

      // aba Fundações em leitura: aviso, elementos do edifício listados e controles desabilitados
      await page.getByRole('tab', { name: 'Fundações', exact: true }).click();
      const aviso = page.locator('[data-fundacoes-edificio]');
      await aviso.waitFor();
      assert.match(await aviso.innerText(), /modo leitura/);
      assert.equal(await aviso.locator('tbody tr').count(), 2);
      assert.equal(await page.locator('[data-somente-leitura]').evaluate((f) => f.disabled), true);
      assert.equal(await page.getByRole('button', { name: '+ furo' }).isDisabled(), true);
    },
  },
  {
    name: 'FU1: obra vazia só com arranques — arranque pela planta de fundação, cargas, sapata e cálculo só da fundação',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      await page.getByRole('button', { name: 'Novo vazio' }).click();
      assert.match(await page.locator('header .status').innerText(), /^0 pavimentos/);
      // ferramenta Pilar com "Arranque": a planta vai para o nível de fundação e o pilar nasce e morre na fundação
      await page.locator('details.group > summary', { hasText: 'Pilares (' }).click();
      await page.getByLabel('Arranque (pilar de altura zero, só leva cargas à fundação)').check();
      assert.equal(await page.locator('.planta-cv').getAttribute('data-nivel'), 'fundacao');
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('eixo.criar {"nome": "A", "p1": [0, 0], "p2": [6, 0]}');
      await page.locator('.planta-st').click();
      await page.keyboard.press('f');
      const [x1, y1] = await telaDe(page, 2, 0.6);
      await page.mouse.click(x1, y1);
      await page.locator('select[aria-label="Morre P1"]').waitFor();
      assert.match(await page.locator('tr', { has: page.locator('select[aria-label^="Morre"]') }).last().innerText(), /arranque/);
      // terreno, sapata automática (clique no centro do pilar = centrada) e cargas no arranque
      await page.locator('details.group > summary', { hasText: /^Fundação \(/ }).click();
      const grupo = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Fundação \(/ }) });
      const sigma = grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^σadm$/ }) }).locator('input');
      await sigma.fill('250');
      await sigma.press('Enter');
      await page.keyboard.press('u');
      const [x2, y2] = await telaDe(page, 2, 0.6);
      await page.mouse.click(x2, y2);
      await page.locator('.statusbar .msg', { hasText: /S1 \(sapata\) lançado sob P1/ }).waitFor();
      assert.match(await grupo.locator('table[data-fundacoes] tbody tr').first().innerText(), /centrada/);
      await page.keyboard.press('s');
      await page.mouse.click(x2, y2);
      await grupo.getByText('Cargas no arranque P1').waitFor();
      await grupo.getByLabel('N (kN)').fill('400');
      await grupo.getByLabel('N (kN)').press('Enter');
      await grupo.getByRole('button', { name: 'Adicionar carga no lance' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Carga no pilar P1' }).waitFor();
      // sem estrutura para analisar, o cálculo traz só as fundações
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Obra só com arranques: 1 fundação' }).waitFor({ timeout: 60000 });
      const cardF = page.locator('[data-card-fundacoes]');
      assert.equal(await cardF.locator('tbody tr').count(), 1);
      assert.match(await cardF.innerText(), /S1: \d,\d\d × \d,\d\d m/);
      // as duas formas de calcular: sem fundação e com fundação
      await page.getByRole('button', { name: 'Calcular sem fundação' }).click();
      await page.locator('.statusbar .msg', { hasText: /Análise|Obra só/ }).waitFor();
    },
  },
  {
    name: 'R7-0: dividir, unir e prolongar viga pela planta e desfazer; copiar e espelhar; quadro de vigas colado; Ctrl+K e Enter repete; cores da planta; janela da viga com origem e face do pilar; logo no carimbo',
    async run({ newPage, tmp }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [10, 0], [0, 4], [5, 4], [10, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [10, 0]], [[0, 4], [10, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]], [[10, 0], [10, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await page.locator('.planta-cv[data-vista]').waitFor();
      const solta = () => page.evaluate(() => document.activeElement?.blur?.());
      const abrir = async (t) => { const d = page.locator('.edif-in details', { has: page.locator('summary', { hasText: t }) }).first(); if (!(await d.evaluate((x) => x.open))) await d.locator('summary').click(); return d; };
      await solta();
      const vigas = (n) => page.locator('summary', { hasText: new RegExp(`^Vigas — Tipo \\(${n}\\)`) }).waitFor();
      const clicar = async (x, y) => { const [sx, sy] = await telaDe(page, x, y); await page.mouse.click(sx, sy); };
      await vigas(5);
      // dividir a viga de 10 m no meio (tecla I) e desfazer/refazer
      await page.keyboard.press('i');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'dividir');
      await clicar(2.5, 0.02);
      await vigas(6);
      await page.keyboard.press('Control+z');
      await vigas(5);
      await page.keyboard.press('Control+y');
      await vigas(6);
      // unir as duas metades (tecla J): primeira e segunda viga
      await page.keyboard.press('j');
      await clicar(2, 0.02);
      await clicar(8, 0.02);
      await vigas(5);
      // prolongar (tecla O): viga de 4 m em y = 6 até x = 10 (ponto), e desfazer
      await cmd('viga.tracar {"grupo": "g_3", "pontos": [[0, 6], [4, 6]], "secao": {"b": 0.15, "h": 0.4}}');
      await vigas(6);
      await solta();
      await page.keyboard.press('o');
      await clicar(3.9, 6.02);
      await clicar(10, 6.5);
      await page.locator('.statusbar .msg', { hasText: 'ajustada' }).waitFor();
      const g = await abrir('Vigas — Tipo');
      const ultima = g.locator('table.quadro tbody tr').last();
      assert.equal((await ultima.locator('td.num').first().innerText()).trim(), '10,00');
      await solta();
      await page.keyboard.press('Control+z');
      await page.waitForFunction(() => [...document.querySelectorAll('details.group table.quadro tbody tr')].some((tr) => tr.textContent.includes('4,00')));
      // copiar o pilar P1 (tecla Y) com deslocamento digitado
      await page.keyboard.press('Escape');
      await abrir('Pilares');
      await page.getByLabel('x de P1').click();
      await solta();
      await page.keyboard.press('y');
      await page.keyboard.type('0;0'); await page.keyboard.press('Enter');
      await page.keyboard.type('@0;8'); await page.keyboard.press('Enter');
      await page.locator('summary', { hasText: 'Pilares (7)' }).waitFor();
      // espelhar (tecla H) o pilar selecionado pelo eixo x = 20: vai para x = 40
      await page.keyboard.press('h');
      await page.keyboard.type('20;0'); await page.keyboard.press('Enter');
      await page.keyboard.type('20;1'); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('input[aria-label="x de P1"]')?.value === '40,000');
      await page.keyboard.press('Control+z');
      await page.waitForFunction(() => document.querySelector('input[aria-label="x de P1"]')?.value === '0,000');
      // quadro de vigas colado do Excel (Tab entre colunas): uma nova e a V1 atualizada
      await page.getByLabel('Colar vigas do Excel').fill('V20\t15\t50\t0\t9\t10\t9\nV1\t20\t50\t0\t0\t10\t0');
      await page.getByRole('button', { name: 'Aplicar quadro de vigas' }).click();
      await vigas(7);
      assert.equal(await page.getByLabel('Seção de V1').inputValue(), '20x50');
      await solta();
      // Ctrl+K: ferramenta Pilar pela paleta; Esc volta a Selecionar; Enter repete a última
      await page.locator('canvas.int').hover();
      await page.keyboard.press('Control+k');
      const pal = page.getByRole('dialog', { name: 'Paleta de comandos' });
      await pal.waitFor();
      await pal.getByLabel('Buscar comando, pavimento ou elemento').fill('ferramenta pilar');
      await pal.getByLabel('Buscar comando, pavimento ou elemento').press('Enter');
      await pal.waitFor({ state: 'detached' });
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'pilar');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'selecionar');
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'pilar');
      await page.keyboard.press('Escape');
      // Ctrl+K executa um comando: detectar as lajes do grupo
      await page.keyboard.press('Control+k');
      await pal.getByLabel('Buscar comando, pavimento ou elemento').fill('detectar lajes');
      await pal.getByLabel('Buscar comando, pavimento ou elemento').press('Enter');
      await page.locator('summary', { hasText: /^Lajes — Tipo \([1-9]/ }).waitFor();
      // cores da planta editáveis (tema atual) e restaurar
      await page.locator('.planta-barra').getByRole('button', { name: /^Cores/ }).click();
      const cores = page.getByRole('dialog', { name: /Cores da planta/ });
      await cores.getByLabel('Cor: Vigas').fill('#ff0000');
      await page.locator('.planta-barra').getByRole('button', { name: 'Cores (1)' }).waitFor();
      await cores.getByRole('button', { name: 'Restaurar as cores do tema' }).click();
      await page.locator('.planta-barra').getByRole('button', { name: 'Cores', exact: true }).waitFor();
      await cores.getByRole('button', { name: 'Fechar' }).click();
      // remove as vigas soltas (y > 5) e a cópia do pilar por janela de cruzamento antes do cálculo
      await solta();
      await page.keyboard.press('s');
      const [ax, ay] = await telaDe(page, 12, 9.6), [zx, zy] = await telaDe(page, -1, 5.5);
      await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(zx, zy, { steps: 4 }); await page.mouse.up();
      await page.locator('.statusbar .msg', { hasText: '3 elemento(s) selecionado(s)' }).waitFor();
      await page.keyboard.press('Delete');
      await vigas(5);
      // janela da viga: origem dos resultados e momento na face dos pilares
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) }).locator('tbody tr').first().dblclick();
      const jv = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await jv.waitFor();
      assert.ok(+(await jv.locator('[data-origens]').first().getAttribute('data-origens')) >= 4);
      assert.match(await jv.locator('[data-origens]').first().innerText(), /17\.2\.2/);
      assert.ok(+(await jv.locator('[data-faces]').getAttribute('data-faces')) >= 2);
      await page.keyboard.press('Escape');
      // logo no carimbo: aparece na prévia e vai no PDF como imagem JPEG
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const logo = join(tmp, 'logo.jpg');
      writeFileSync(logo, Buffer.from(JPEG_TESTE, 'base64'));
      await page.setInputFiles('input[aria-label="Imagem do logo"]', logo);
      await page.locator('[data-logo]:not([data-logo=""])').waitFor();
      await page.locator('.prancha-prev[data-estado="pronto"] svg image').waitFor();
      const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PDF da folha' }).click()]);
      assert.match(readFileSync(await dl.path()).toString('latin1'), /\/Filter \/DCTDecode[\s\S]*\/Logo Do/);
      const [dz] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'DXF R2000' }).click()]);
      assert.match(dz.suggestedFilename(), /\.zip$/); // DXF + logo.jpg
      await page.getByRole('button', { name: 'Remover logo' }).click();
      await page.locator('[data-logo=""]').waitFor();
    },
  },
  {
    name: 'FU2: sapata de divisa + viga de equilíbrio até um pilar interno — lançada pela planta, cálculo, FUND_EXC_SEM_VIGA some, janela da viga, giro por 2 pontos e cargas do nível',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [7, 0], [7, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [7, 0]], [[0, 5], [7, 5]], [[0, 0], [0, 5]], [[7, 0], [7, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('details.group > summary', { hasText: /^Fundação \(/ }).click();
      const grupo = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Fundação \(/ }) });
      const sigma = grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^σadm$/ }) }).locator('input');
      await sigma.fill('300');
      await sigma.press('Enter');
      await page.getByRole('radio', { name: 'Fundação' }).click();
      // P1 (0;0): sapata de divisa pela face −x; P2 (7;0): sapata centrada
      await grupo.getByLabel('Posição no pilar').selectOption('divisa');
      const [x1, y1] = await telaDe(page, -0.07, 0);
      await page.mouse.click(x1, y1);
      await page.locator('.statusbar .msg', { hasText: 'S1 (sapata) lançado sob P1' }).waitFor();
      await grupo.getByLabel('Posição no pilar').selectOption('centrada');
      const [x2, y2] = await telaDe(page, 7, 0);
      await page.mouse.click(x2, y2);
      await page.locator('.statusbar .msg', { hasText: 'S2 (sapata) lançado sob P2' }).waitFor();
      // as ferramentas de viga de fundação e de giro só existem no nível de fundação
      assert.equal(await page.getByRole('radio', { name: 'Viga de fundação' }).count(), 1);
      // viga de equilíbrio: clique em S1 e depois em S2 (ferramenta Viga de fundação, tecla B)
      await page.locator('.planta-st').click();
      await page.keyboard.press('b');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'vigaFund');
      await page.mouse.click(...(await telaDe(page, 0, 0)));
      await page.mouse.click(...(await telaDe(page, 7, 0)));
      await page.locator('.statusbar .msg', { hasText: 'VF1 (equilíbrio) lançada' }).waitFor();
      const tabV = grupo.locator('table[data-vigas-fundacao-tabela] tbody tr');
      assert.equal(await tabV.count(), 1);
      assert.match(await tabV.first().innerText(), /VF1.*equilíbrio.*S1 — S2/s);
      // um segundo clique igual duplica: a viga entre os mesmos pilares é recusada
      await page.mouse.click(...(await telaDe(page, 0, 0)));
      await page.mouse.click(...(await telaDe(page, 7, 0)));
      await page.locator('.statusbar .msg', { hasText: /Já existe a viga VF1/ }).waitFor();
      assert.equal(await tabV.count(), 1);
      // selecionada na planta (clique no meio da viga): editor com tipo, pontas equilibradas, seção e igualar
      await page.keyboard.press('s');
      await page.mouse.click(...(await telaDe(page, 3.5, 0)));
      const ed = grupo.locator('[data-editor-viga-fundacao]');
      await ed.waitFor();
      assert.equal(await ed.getByLabel('Pontas equilibradas').inputValue(), 'auto');
      assert.equal(await ed.getByRole('button', { name: 'Igualar esta ao modelo' }).isDisabled(), true, 'sem outra viga para igualar');

      // calcular: a divisa passa a ter viga de equilíbrio
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      const lista = page.locator('[data-lista-erros]');
      await lista.getByLabel('Tipo').selectOption('fundacao');
      assert.equal(await lista.locator('.tablewrap tbody tr', { hasText: 'FUND_EXC_SEM_VIGA' }).count(), 0, 'o erro FUND_EXC_SEM_VIGA some com a viga de equilíbrio');
      const cardV = page.locator('[data-card-vigas-fundacao]');
      await cardV.waitFor();
      assert.equal(await cardV.locator('tbody tr').count(), 1);
      assert.match(await cardV.innerText(), /VF1.*equilíbrio.*S1 — S2/s);
      // janela da viga pelo duplo clique: ações, detalhe longitudinal e transversal
      await cardV.locator('tbody tr', { hasText: 'VF1' }).dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Viga de fundação VF1/ });
      await jan.waitFor();
      const jt = await jan.innerText();
      assert.match(jt, /Alívio levado a cada ponta/);
      assert.match(jt, /Armadura superior/);
      assert.match(jt, /Estribo/);
      assert.equal(await jan.locator('svg[data-detalhe-vf]').count(), 1, 'detalhe longitudinal');
      assert.equal(await jan.locator('svg[data-secao-vf]').count(), 1, 'seção transversal');
      assert.ok(await jan.locator('[data-diagrama-vf]').count() >= 3, 'diagramas de momento e cortante');
      assert.ok(await jan.locator('[data-ponta-vf]').count() === 2, 'pilares das pontas');
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // janela do elemento equilibrado: alavanca e alívio
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const cardF = page.locator('[data-card-fundacoes]');
      await cardF.locator('tbody tr', { hasText: 'S1' }).dblclick();
      const jan1 = page.getByRole('dialog', { name: /Resultados do elemento — Fundação S1/ });
      await jan1.waitFor();
      assert.match(await jan1.innerText(), /Alavanca: carga do pilar/);
      await jan1.getByRole('button', { name: 'Fechar' }).click();
      await cardF.locator('tbody tr', { hasText: 'S2' }).dblclick();
      const jan2 = page.getByRole('dialog', { name: /Resultados do elemento — Fundação S2/ });
      await jan2.waitFor();
      assert.match(await jan2.innerText(), /Alívio recebido de vigas de equilíbrio/);
      await jan2.getByRole('button', { name: 'Fechar' }).click();

      // planta: a viga aparece selecionável e abre a janela pelo duplo clique
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await page.locator('.planta-st').click();
      await page.keyboard.press('s');
      const [mx, my] = await telaDe(page, 3.5, 0);
      await page.mouse.dblclick(mx, my);
      await page.getByRole('dialog', { name: /Viga de fundação VF1/ }).waitFor();
      await page.getByRole('dialog', { name: /Viga de fundação VF1/ }).getByRole('button', { name: 'Fechar' }).click();

      // giro por dois pontos: S2 selecionada gira para a direção de (2;1) a (2;3) = 90°
      await page.keyboard.press('s');
      await page.mouse.click(...(await telaDe(page, 7.3, 0.3)));
      await page.keyboard.press('k');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'girarFund');
      await page.mouse.click(...(await telaDe(page, 2, 1)));
      await page.mouse.click(...(await telaDe(page, 2, 3)));
      await page.locator('.statusbar .msg', { hasText: /girado/ }).waitFor();
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'selecionar');

      // cargas no nível de fundação: parede sobre a viga (linha, grupo "fundação")
      await grupo.locator('[data-cargas-fundacao]').getByLabel('Tipo').selectOption('linha');
      await page.locator('.planta-st').click();
      await page.keyboard.press('c');
      await page.mouse.click(...(await telaDe(page, 2, 0)));
      await page.mouse.click(...(await telaDe(page, 5, 0)));
      await page.keyboard.press('Enter');
      await page.locator('.statusbar .msg', { hasText: /Carga linear de/ }).waitFor();
      assert.match(await grupo.locator('[data-cargas-fundacao]').innerText(), /Cargas no nível de fundação \(1\)/);
    },
  },
  {
    webgl: true,
    name: 'V1: vista 3D — abre a aba, canvas, filtro por pavimento muda data-cena, projeção, caminhar, transparência, seleção sincronizada com a planta e o vendor do three fora do HTML',
    async run({ newPage, baseURL }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
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
      const sel = page.locator('.v3d-barra').getByLabel('Pavimento', { exact: true });
      const opcoes = await sel.locator('option').allInnerTexts();
      assert.ok(opcoes.includes('Tipo 2'), opcoes.join(','));
      await sel.selectOption({ label: 'Tipo 2' });
      await page.waitForFunction((t) => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-cena')).total < t, inicial.total);
      const um = await cena();
      assert.equal(Object.keys(um.pavimentos).length, 1);
      assert.ok(um.laje >= 1 && um.viga >= 4, JSON.stringify(um));
      // tipo oculto sai da contagem
      await page.getByRole('button', { name: 'Pilares' }).click();
      await page.waitForFunction(() => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-cena')).pilar === undefined);
      await page.getByRole('button', { name: 'Pilares' }).click();
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
  },
  {
    name: 'V1: sem o three.js (artifact do claude.ai) a vista 3D cai para o isométrico em SVG, com barras de rotação e seleção',
    async run({ newPage }) {
      // sem service worker para a rota abortar o vendor de verdade (o worker responderia por ele)
      const page = await newPage(undefined, { serviceWorkers: 'block' });
      await page.context().route('**/vendor/three-*', (r) => r.abort());
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
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
      await page.getByRole('button', { name: 'Lajes' }).click();
      await page.waitForFunction((t) => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-cena')).total < t, total);
      await page.getByRole('button', { name: 'Lajes' }).click();
      // clique no desenho seleciona o elemento (o mesmo estado da planta)
      await cv.locator('svg.v3d-iso path[data-id^="pilar:"]').first().click({ force: true });
      await page.locator('.v3d-sel-info').waitFor();
      assert.match(await page.locator('.v3d-sel-info').innerText(), /Selecionado:\s+P\d/);
    },
  },
  {
    name: 'R7a: tabelas de armadura (bitola restrita muda a viga, tabela impossível gera FORA_TABELA com atalho, restaurar, exportar e importar JSON, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const calcular = async () => {
        await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
        await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 90000 });
        await page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 90000 });
      };
      await calcular();
      const cardVigas = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) });
      const antes = await cardVigas.locator('tbody tr').first().innerText();
      assert.ok(!/φ25/.test(antes), `esperava a viga sem φ25 antes da tabela: ${antes}`);
      // grupo Tabelas de armadura (fechado) e a aba de vigas
      const g = page.locator('.edif-in details', { has: page.locator('summary', { hasText: 'Tabelas de armadura' }) }).first();
      await g.locator('summary').click();
      const tabela = g.locator('table[data-tabela="vigas"]');
      await tabela.waitFor();
      const chips = (rot) => g.getByRole('group', { name: rot });
      const so = async (rot, phi) => {
        const grupo = chips(rot);
        for (const t of ['8', '10', '12,5', '16', '20', '25', '32']) {
          const b = grupo.getByRole('button', { name: t, exact: true });
          const ligado = (await b.getAttribute('aria-pressed')) === 'true';
          if (ligado !== (t === phi)) await b.click();
        }
      };
      // só φ25 nos positivos e nos negativos do grupo 1 (b ≤ 20 cm): a viga passa a usar φ25
      await so('Positivos do grupo 1', '25');
      await so('Negativos do grupo 1', '25');
      assert.match(await g.locator('[data-tabelas-alteradas]').innerText(), /Vigas \(barras\): Padrão \(padrão alterada\)|Padrão/);
      await calcular();
      const depois = await cardVigas.locator('tbody tr').first().innerText();
      assert.match(depois, /φ25/);
      // tabela impossível (só φ8, 6 barras em uma camada): erro FORA_TABELA na lista e atalho que abre a tabela
      await so('Positivos do grupo 1', '8');
      const cam = g.getByLabel('Camadas positivos do grupo 1'), nmin = g.getByLabel('n mínimo positivos do grupo 1');
      await cam.fill('1'); await cam.press('Enter');
      await nmin.fill('6'); await nmin.press('Enter'); // 6 φ8 não cabem em uma camada de 20 cm
      await calcular();
      const lista = page.locator('[data-lista-erros]');
      const linhaErro = lista.locator('tbody tr.bad', { hasText: 'FORA_TABELA' }).first();
      await linhaErro.waitFor();
      assert.match(await linhaErro.innerText(), /Fora de tabela \(barras\)/);
      await g.locator('summary').click(); // fecha o grupo para ver o atalho abrir
      await linhaErro.locator('[data-atalho-tabela]').click();
      await page.waitForFunction(() => document.querySelector('[data-grupo-tabelas] details')?.open === true);
      assert.equal(await g.locator('table[data-tabela="vigas"]').count(), 1);
      // restaurar a padrão de fábrica: some o erro e a lista de alteradas
      await g.getByRole('button', { name: 'Restaurar a padrão de fábrica' }).click();
      assert.equal(await g.locator('[data-tabelas-alteradas]').count(), 0);
      await calcular();
      assert.equal(await lista.locator('tbody tr.bad, tbody tr.warn', { hasText: 'FORA_TABELA' }).count(), 0);
      assert.ok(!/φ25/.test(await cardVigas.locator('tbody tr').first().innerText()));
      // altera de novo, exporta o JSON, restaura e importa de volta
      await so('Positivos do grupo 1', '20');
      const { name, text } = await downloadText(page, () => g.getByRole('button', { name: 'Exportar JSON' }).click());
      assert.match(name, /tabelas-armadura.*\.json$/);
      const j = JSON.parse(text);
      assert.equal(j.formato, 'statikos-tabelas-armadura');
      assert.equal(j.tabelas[0].tipo, 'vigas');
      assert.deepEqual(j.tabelas[0].tabela.linhas[0].pos.bitolas, [20]);
      await g.getByRole('button', { name: 'Restaurar a padrão de fábrica' }).click();
      assert.equal(await g.locator('[data-tabelas-alteradas]').count(), 0);
      await g.getByLabel('Arquivo de tabelas de armadura').setInputFiles({ name: 'tabelas.json', mimeType: 'application/json', buffer: Buffer.from(text) });
      await g.locator('[data-tabelas-alteradas]').waitFor();
      // arquivo inválido: mensagem e nada importado
      await g.getByLabel('Arquivo de tabelas de armadura').setInputFiles({ name: 'ruim.json', mimeType: 'application/json', buffer: Buffer.from('{"formato": "outro"}') });
      await g.locator('[data-erros-importacao]').waitFor();
      // duplicar como nova tabela, remover e as abas dos outros elementos
      await g.getByRole('button', { name: 'Duplicar como nova tabela' }).click();
      assert.match(await g.locator('select').first().innerText(), /\(cópia\)/);
      await g.getByRole('button', { name: 'Remover tabela' }).click();
      for (const [aba, t] of [['Estribos de vigas', 'estribos'], ['Pilares', 'pilares'], ['Lajes', 'lajes']]) {
        await g.getByRole('radio', { name: aba, exact: true }).click();
        await g.locator(`[data-tabela="${t}"]`).waitFor();
      }
      // memorial: seção das tabelas alteradas
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo.textContent(), /Tabelas de armadura/);
      assert.match(await memo.textContent(), /Tolerância de simetria da armadura dos pilares: 0 %/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  },
];
