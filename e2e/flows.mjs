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
  let s = 3;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < extra; i++) { const x = r() * 1500, y = r() * 1000; p(0, 'LINE', 8, 'HACHURA', 10, x.toFixed(2), 20, y.toFixed(2), 11, (x + r() * 40).toFixed(2), 21, (y + r() * 40).toFixed(2)); }
  p(0, 'ENDSEC', 0, 'EOF');
  return L.join('\n');
}

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
      await page.locator('.diags li.erro').getByRole('button').click();
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
];
