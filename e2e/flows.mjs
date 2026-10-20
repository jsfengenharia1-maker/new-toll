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
];
