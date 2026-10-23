// Fluxos de interface. Cada fluxo recebe { newPage, baseURL, tmp }:
// newPage(initScript?) abre um contexto novo (localStorage vazio) já com o app carregado.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeDwg2018 } from 'nasjidwg';

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
  for (let t = 0; ; t++) {
    const v = JSON.parse(await page.locator('.planta-cv').getAttribute('data-vista'));
    const box = await page.locator('canvas.int').boundingBox();
    const px = box.x + v.ox + x * v.k, py = box.y + v.oy - y * v.k;
    // fora da área de desenho (layout da barra mudou a altura): reenquadra e tenta de novo
    if ((px > box.x + 5 && px < box.x + box.width - 5 && py > box.y + 5 && py < box.y + box.height - 5) || t >= 10) return [px, py];
    await page.keyboard.press('f');
    await page.waitForTimeout(200);
  }
}

/** Reenquadra (F) até todos os pontos do modelo caírem dentro da área de desenho: a barra da ferramenta muda a altura da planta e o
 *  reenquadramento pode correr antes do layout assentar; um clique fora da área não vira ponto. */
async function reenquadrarAte(page, pontos) {
  for (let t = 0; ; t++) {
    await page.keyboard.press('f');
    await page.waitForTimeout(150);
    const caixa = await page.locator('canvas.int').boundingBox();
    const tela = await Promise.all(pontos.map(([x, y]) => telaDe(page, x, y)));
    if (tela.every(([px, py]) => px > caixa.x + 5 && px < caixa.x + caixa.width - 5 && py > caixa.y + 5 && py < caixa.y + caixa.height - 5)) return;
    assert.ok(t < 20, 'planta não reenquadrou os pontos na área de desenho');
  }
}

async function importarMascara(page, tmp, extra = 0) {
  const f = join(tmp, `planta-${extra}.dxf`);
  writeFileSync(f, dxfPlanta(extra));
  await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
  await page.locator('summary', { hasText: 'Máscara' }).click();
  await page.setInputFiles('input[aria-label="Arquivo DXF da máscara"]', f);
  await page.locator('.statusbar .msg', { hasText: 'unidade cm ($INSUNITS)' }).waitFor();
}

/** DXF fictício da L2 (cm): grade 3 × 2 de pilares 20 × 50, pilar girado e circular, vigas por faces, eixos, contorno, abertura e ponto fixo.
 *  O canto inferior esquerdo do desenho (-50; -100) vai à origem: mundo = (x / 100 + 0,5; y / 100 + 1,0). */
function dxfGradeL2() {
  const L = [];
  const p = (...a) => L.push(...a.map(String));
  const poli = (lay, pts) => p(0, 'LWPOLYLINE', 8, lay, 90, pts.length, 70, 1, ...pts.flatMap(([x, y]) => [10, x, 20, y]));
  const linha = (lay, a, z) => p(0, 'LINE', 8, lay, 10, a[0], 20, a[1], 11, z[0], 21, z[1]);
  const texto = (lay, x, y, t) => p(0, 'TEXT', 8, lay, 10, x, 20, y, 40, 10, 1, t);
  const ret = (cx, cy, b, h, ang = 0) => {
    const a = (ang * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [+(cx + ((i * b) / 2) * c - ((j * h) / 2) * s).toFixed(4), +(cy + ((i * b) / 2) * s + ((j * h) / 2) * c).toFixed(4)]);
  };
  p(0, 'SECTION', 2, 'HEADER', 9, '$INSUNITS', 70, 5, 0, 'ENDSEC', 0, 'SECTION', 2, 'ENTITIES');
  let n = 1;
  for (const y of [0, 450]) for (const x of [0, 500, 1000]) { poli('PILARES', ret(x, y, 20, 50)); texto('TEXTO', x + 30, y + 40, `P${n++}`); }
  poli('PILARES', ret(0, 0, 8, 8)); // contorno duplicado dentro do P1: ambíguo
  poli('PILARES', ret(750, 700, 30, 30, 30));
  p(0, 'CIRCLE', 8, 'PILARES', 10, 250, 20, 700, 40, 20);
  for (const y of [0, 450]) for (const [x0, x1] of [[10, 490], [510, 990]]) { linha('VIGAS', [x0, y + 7.5], [x1, y + 7.5]); linha('VIGAS', [x0, y - 7.5], [x1, y - 7.5]); }
  linha('VIGAS', [300, 300], [400, 300]); // linha sem par: ambígua
  for (const [x, nome] of [[0, 'A'], [500, 'B'], [1000, 'C']]) { linha('EIXOS', [x, -100], [x, 550]); texto('EIXOS', x - 5, -125, nome); }
  poli('CONTORNO', [[-50, -50], [1050, -50], [1050, 500], [-50, 500]]);
  poli('ABERTURA', [[200, 150], [260, 150], [260, 210], [200, 210]]);
  poli('PONTO-FIXO', [[1005, 470], [1015, 470], [1015, 480], [1005, 480]]);
  p(0, 'ENDSEC', 0, 'EOF');
  return L.join('\n');
}

/** DWG R2018 mínimo (um pilar 30 × 30 cm numa polilinha fechada, em m), gerado com o escritor do nasjidwg. */
function dwgMinimoL2() {
  const c = (i) => ({ kind: 'aci', index: i });
  const camada = (name, i) => ({ name, color: c(i), on: true, frozen: false, locked: false });
  return writeDwg2018({
    header: { version: 'R2018', codepage: 'ANSI_1252', insUnits: 6, linetypeScale: 1, vars: {} },
    layers: [camada('0', 7), camada('PILARES', 1)], linetypes: [{ name: 'Continuous', description: 'Solid line', pattern: [] }], textStyles: [{ name: 'Standard', font: 'arial.ttf' }], blocks: {},
    entities: [{ type: 'polyline', layer: 'PILARES', color: { kind: 'byLayer' }, vertices: [{ x: 0, y: 0 }, { x: 0.3, y: 0 }, { x: 0.3, y: 0.3 }, { x: 0, y: 0.3 }], closed: true }],
    paperSpace: [], layouts: [{ name: 'Model', tabOrder: 0 }], warnings: [],
  }).data;
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
      await page.locator('summary', { hasText: /^Pilares \(/ }).click();
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
      // R7f: só a viga paralela (mesmo vão) é elegível; as perpendiculares têm vão diferente e mostram o motivo da recusa
      assert.equal(await lista.locator('[data-motivo-copia]').count(), 2);
      assert.match(await lista.locator('[data-motivo-copia]').first().innerText(), /difere em \d+ cm/);
      assert.equal(await lista.locator('input:checked').count(), 1, 'só a elegível do mesmo grupo e seção vem marcada');
      await lista.getByRole('button', { name: /^Copiar para 1 viga$/ }).click();
      await pronto();
      await jan.getByRole('button', { name: 'Fechar' }).click();
      assert.match(await page.locator('[data-bloqueadas]').innerText(), /2 vigas bloqueadas/);
      assert.equal(await cardVigas.locator('td[data-bloq]', { hasText: 'bloq.' }).count(), 2);
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
      assert.match(mt, /Total geral \(vigas, pilares, paredes, lajes e vigotas\)/);
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
      assert.match(csv.text, /Resumo geral de aço \(vigas, pilares, paredes, lajes e vigotas\)/);
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
      assert.match(mt, /Total geral \(vigas, pilares, paredes, lajes e vigotas\)/);
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
      assert.match(await lista.innerText(), /SLP/);
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
      for (const sg of ['SLP', 'SCF', 'SCV', 'SCP', 'SCL']) assert.match(await lista.innerText(), new RegExp(sg));
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
      assert.match(mt, /Total geral \(vigas, pilares, paredes, lajes e vigotas\)/);
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
    name: 'FU4: Gerar fundações — diálogo, 4 sapatas de canto com as vigas de equilíbrio num passo só, cálculo sem FUND_EXC_SEM_VIGA e um desfazer',
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
      // diálogo de parâmetros com os valores das opções (D = 3 m, A = 30°, associação a 1 m)
      await grupo.locator('[data-gerar-fundacoes]').click();
      const dlg = page.getByRole('dialog', { name: 'Gerar fundações' });
      await dlg.waitFor();
      assert.equal(await dlg.getByLabel('Distância de visão D').inputValue(), '3');
      assert.equal(await dlg.getByLabel('Ângulo de visão A').inputValue(), '30');
      assert.match(await dlg.innerText(), /Sem análise em vigor/);
      await dlg.locator('[data-gerar-confirmar]').click();
      await page.locator('.statusbar .msg', { hasText: /Fundações geradas: 4 sapatas \(4 de canto\); vigas: 4 de equilíbrio/ }).waitFor();
      assert.equal(await grupo.locator('table[data-fundacoes] tbody tr').count(), 4);
      assert.equal(await grupo.locator('table[data-vigas-fundacao-tabela] tbody tr').count(), 4);
      // sem elemento a gerar, o botão fica desligado
      assert.equal(await grupo.locator('[data-gerar-fundacoes]').isDisabled(), true);
      // calcular: nenhum elemento fica excêntrico sem viga
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      const lista = page.locator('[data-lista-erros]');
      await lista.getByLabel('Tipo').selectOption('fundacao');
      assert.equal(await lista.locator('.tablewrap tbody tr', { hasText: 'FUND_EXC_SEM_VIGA' }).count(), 0);
      assert.equal(await page.locator('[data-card-vigas-fundacao] tbody tr').count(), 4);
      // um desfazer remove elementos e vigas
      await page.getByRole('button', { name: /Desfazer/ }).click();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      assert.match(await grupo.locator('summary').first().innerText(), /Fundação \(0 elementos\)/i);
    },
  },
  {
    name: 'FU3: sapata associada de 2 pilares pela planta, limite que apara, altura constante, igualar, impor as calculadas e eliminar sobreposição',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      // P1 (0;0) e P2 (3;0) formam a associada; P3 (7;0) e P4 (8;0), a 1 m um do outro, se sobrepõem; P5 e P6 fecham o pórtico
      await cmd('lote {"comandos": [' + [[0, 0], [3, 0], [7, 0], [8, 0], [0, 5], [8, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 5], [8, 5]], [[0, 0], [0, 5]], [[8, 0], [8, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('details.group > summary', { hasText: /^Fundação \(/ }).click();
      const grupo = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Fundação \(/ }) });
      const sigma = grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^σadm$/ }) }).locator('input');
      await sigma.fill('120');
      await sigma.press('Enter');
      await page.getByRole('radio', { name: 'Fundação' }).click();
      assert.equal(await page.locator('.planta-cv').getAttribute('data-nivel'), 'fundacao');
      await grupo.getByLabel('Posição no pilar').selectOption('centrada');
      // as ferramentas novas só existem no nível de fundação
      for (const n of ['Limite da fundação', 'Limite pela máscara', 'Ponto de inserção']) assert.equal(await page.getByRole('radio', { name: n }).count(), 1, n);

      // associada: ferramenta Fundação em modo "vários pilares" (clique em cada pilar, Enter cria)
      await page.getByLabel('Vários pilares (Enter cria)').check();
      await page.mouse.click(...(await telaDe(page, 0, 0)));
      await page.mouse.click(...(await telaDe(page, 3, 0)));
      await page.keyboard.press('Enter');
      await page.locator('.statusbar .msg', { hasText: 'S1 (sapata, 2 pilares) lançado sob P1, P2' }).waitFor();
      await page.getByLabel('Vários pilares (Enter cria)').uncheck();
      // sapatas isoladas de P3 e P4
      await page.mouse.click(...(await telaDe(page, 7, 0)));
      await page.locator('.statusbar .msg', { hasText: 'S2 (sapata) lançado sob P3' }).waitFor();
      await page.mouse.click(...(await telaDe(page, 8, 0)));
      await page.locator('.statusbar .msg', { hasText: 'S3 (sapata) lançado sob P4' }).waitFor();
      const linhas = grupo.locator('table[data-fundacoes] tbody tr');
      assert.equal(await linhas.count(), 3);

      // limite: divisa vertical a 15 cm do eixo de P1 (com o modelo integrado a resultante P1 + P2 fica mais perto de P2 e a sapata, mais curta à esquerda), à esquerda dele (tecla T)
      await page.locator('.planta-st').click();
      await page.keyboard.press('t');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'limite');
      await page.mouse.click(...(await telaDe(page, -0.15, 0.9)));
      await page.mouse.click(...(await telaDe(page, -0.15, -0.2)));
      await page.keyboard.press('Enter');
      await page.locator('.statusbar .msg', { hasText: 'Limite L1 criado (2 vértices)' }).waitFor();
      const tabL = grupo.locator('table[data-limites-tabela] tbody tr');
      assert.equal(await tabL.count(), 1);
      assert.match(await tabL.first().innerText(), /L1.*2.*aberto/s);
      // o limite selecionado abre o editor de vértices
      await tabL.first().click();
      const edL = grupo.locator('[data-editor-limite]');
      await edL.waitFor();
      assert.equal(await edL.locator('table[data-vertices-limite] tbody tr').count(), 2);

      // altura constante na associada (só ela é aparada por limites) pelo editor do elemento
      await linhas.first().click();
      const ed = grupo.locator('[data-editor-fundacao]');
      await ed.waitFor();
      assert.match(await ed.locator('h4').innerText(), /sob 2 pilares \(P1, P2\)/i);
      await ed.getByLabel('Altura constante (h0 = h; só ela é aparada por limites)').check();
      assert.equal(await ed.getByLabel('Altura constante (h0 = h; só ela é aparada por limites)').isChecked(), true);

      // calcular o edifício (as fundações vão junto)
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      const cardF = page.locator('[data-card-fundacoes]');
      await cardF.waitFor();
      assert.equal(await cardF.locator('tbody tr').count(), 3);
      // janela da associada: pilares, limite que apara, quadro por pilar e croqui com o contorno
      await cardF.locator('tbody tr', { hasText: 'S1' }).dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Fundação S1/ });
      await jan.waitFor();
      const jt = await jan.innerText();
      assert.match(jt, /Pilares do elemento.*P1.*P2/s);
      assert.match(jt, /Ponto de referência \(resultante\)/);
      assert.match(jt, /Limites que aparam o elemento\s*L1/);
      assert.match(jt, /altura constante/);
      assert.ok(await jan.locator('[data-grupo-sapata]').count() === 1, 'quadro da sapata de vários pilares');
      assert.ok(await jan.locator('.fsketch svg polygon').count() >= 2, 'contorno poligonal no croqui');
      assert.ok(await jan.locator('[data-malha-superior]').count() >= 1, 'negativo entre pilares / malha superior nas duas direções');
      await jan.getByRole('button', { name: 'Fechar' }).click();

      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();

      // impor as calculadas em S2 (sapata isolada): fica só verificada
      await linhas.nth(1).click();
      await ed.waitFor();
      const imp = grupo.locator('[data-impostas-fundacao]');
      await imp.waitFor();
      await imp.getByRole('button', { name: 'Impor as calculadas' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Dimensões impostas em 1 elemento' }).waitFor();
      await grupo.locator('[data-impostas-fundacao] .pill', { hasText: 'só verificadas' }).waitFor();
      await imp.getByRole('button', { name: 'Remover a imposição' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Dimensões impostas removidas' }).waitFor();

      // igualar S3 (pilar P4) a S2 (pilar P3)
      await linhas.nth(2).click();
      await ed.waitFor();
      await ed.getByLabel('Igualar a').selectOption({ label: 'S2 (Sapata)' });
      await ed.getByRole('button', { name: 'Igualar este ao modelo' }).click();
      await page.locator('.statusbar .msg', { hasText: 'igualado(s) a S2' }).waitFor();
      await grupo.locator('[data-igualado-a]').waitFor();

      // recalcular só as fundações: S2 e S3 se sobrepõem (1 m entre os pilares) e o aviso oferece unir
      await grupo.getByRole('button', { name: 'Calcular fundações' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Fundações calculadas' }).waitFor({ timeout: 60000 });
      const sob = grupo.locator('[data-sobreposicao]');
      await sob.waitFor();
      assert.match(await sob.innerText(), /FUND_SOBREPOSTA.*S2 \+ S3|FUND_SOBREPOSTA.*S3 \+ S2/s);
      // a revisão mostra o aviso e a ação de unir
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const lista = page.locator('[data-lista-erros]');
      await lista.getByLabel('Tipo').selectOption('fundacao');
      assert.ok(await lista.locator('.tablewrap tbody tr', { hasText: 'FUND_SOBREPOSTA' }).count() >= 1);
      assert.ok(await lista.locator('[data-acao-unir]').count() >= 1, 'botão que une as sapatas sobrepostas');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await sob.getByRole('button', { name: /Eliminar sobreposições/ }).click();
      await page.locator('.statusbar .msg', { hasText: 'sobreposição(ões) eliminada(s)' }).waitFor();
      assert.equal(await linhas.count(), 2, 'S2 e S3 viraram uma só (associada)');
      assert.match(await linhas.nth(1).innerText(), /S2/);
      await linhas.nth(1).click();
      assert.match(await ed.locator('h4').innerText(), /sob 2 pilares \(P3, P4\)/i);
      // desfazer a união é um passo só
      await page.keyboard.press('Control+z');
      await page.locator('.statusbar .msg', { hasText: 'Desfeito: fundacao.eliminarSobreposicoes' }).waitFor();
      assert.equal(await linhas.count(), 3);
    },
  },
  {
    name: 'FU3: limite capturado da máscara DXF — a polilinha ligada ao clique vira um limite fechado e o editor de vértices o altera',
    async run({ newPage, tmp }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      // o nível de fundação mostra a máscara do grupo do pavimento mais baixo (Térreo)
      const sel = page.getByLabel('Pavimento da planta');
      await sel.selectOption(await sel.locator('option', { hasText: 'Térreo' }).first().getAttribute('value'));
      await importarMascara(page, tmp);
      await page.getByRole('radio', { name: 'Fundação' }).click();
      assert.equal(await page.locator('.planta-cv').getAttribute('data-nivel'), 'fundacao');
      await page.locator('.planta-cv[data-vista]').waitFor();
      await page.locator('.planta-st').click();
      await page.keyboard.press('q');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'limiteMascara');
      // parede externa (retângulo 15 × 10 m): clique no meio do lado inferior
      await page.mouse.click(...(await telaDe(page, 7.5, 0)));
      await page.locator('.statusbar .msg', { hasText: 'Limite L1 criado (4 vértices)' }).waitFor();
      await page.locator('details.group > summary', { hasText: /^Fundação \(/ }).click();
      const grupo = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Fundação \(/ }) });
      const linha = grupo.locator('table[data-limites-tabela] tbody tr');
      assert.equal(await linha.count(), 1);
      assert.match(await linha.first().innerText(), /L1\s+4\s+fechado/);
      // seleção na planta (clique na linha do limite) abre o editor; remover um vértice deixa 3 (mínimo de um limite fechado)
      await page.keyboard.press('s');
      await page.mouse.click(...(await telaDe(page, 7.5, 0)));
      const ed = grupo.locator('[data-editor-limite]');
      await ed.waitFor();
      assert.equal(await ed.locator('table[data-vertices-limite] tbody tr').count(), 4);
      await ed.getByRole('button', { name: 'Remover vértice 4' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Limite L1 alterado' }).waitFor();
      assert.equal(await ed.locator('table[data-vertices-limite] tbody tr').count(), 3);
      assert.equal(await ed.getByRole('button', { name: 'Remover vértice 1' }).isDisabled(), true);
      // Del remove o limite selecionado
      await page.locator('.planta-st').click();
      await page.keyboard.press('Delete');
      await page.locator('.statusbar .msg', { hasText: 'limite(s) removido(s)' }).waitFor();
      assert.equal(await linha.count(), 0);
    },
  },
  {
    name: 'FU3: bloco sobre estacas com 2 pilares — escolhido na planta, cálculo, bielas por pilar na janela e pilar retirado volta ao bloco simples',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [2, 0], [0, 5], [8, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 5], [8, 5]], [[0, 0], [0, 5]], [[8, 0], [8, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('details.group > summary', { hasText: /^Fundação \(/ }).click();
      const grupo = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Fundação \(/ }) });
      // estaca de capacidade informada (500 kN)
      await grupo.getByRole('button', { name: '+ estaca' }).click();
      await grupo.locator('table[data-estacas] select[aria-label^="Modo da estaca"]').selectOption('informada');
      await grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^Tipo$/ }) }).first().locator('select').selectOption('bloco');
      await page.getByRole('radio', { name: 'Fundação' }).click();
      await page.getByLabel('Vários pilares (Enter cria)').check();
      await page.mouse.click(...(await telaDe(page, 0, 0)));
      await page.mouse.click(...(await telaDe(page, 2, 0)));
      await page.keyboard.press('Enter');
      await page.locator('.statusbar .msg', { hasText: 'B1 (bloco, 2 pilares) lançado sob P1, P2' }).waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      const cardF = page.locator('[data-card-fundacoes]');
      await cardF.waitFor();
      await cardF.locator('tbody tr', { hasText: 'B1' }).dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Fundação B1/ });
      await jan.waitFor();
      const jt = await jan.innerText();
      assert.match(jt, /Pilares do elemento.*P1.*P2/s);
      assert.ok(await jan.locator('[data-bielas-por-pilar] tbody tr').count() === 2, 'uma linha de verificação por pilar');
      assert.ok(await jan.locator('.fsketch svg').count() >= 1, 'croqui do bloco com os dois pilares');
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // retirar um pilar pelo editor: o elemento volta a ter um pilar só
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await grupo.locator('table[data-fundacoes] tbody tr').first().click();
      await grupo.getByRole('button', { name: 'Retirar o pilar P2' }).click();
      await page.locator('.statusbar .msg', { hasText: 'B1 alterado' }).waitFor();
      assert.match(await grupo.locator('[data-editor-fundacao] h4').innerText(), /sob P1/i);
    },
  },
  {
    name: 'FU5: pranchas de fundação — tipo Fundação, locação com rótulos e cargas, detalhamento das sapatas (SFS), vigas, quantitativos, ancoragem editável e conjunto numerado',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [7, 0], [7, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [7, 0]], [[0, 5], [7, 5]], [[0, 0], [0, 5]], [[7, 0], [7, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('eixo.malha {"dx": [7], "dy": [5]}');
      // pilares 19 × 19 não atendem: sem esta opção (R7c) ficariam fora da prancha de pilares do conjunto
      await cmd('opcoes.definir {"valores": {"pilarInsuficienteSemDesenho": 0}}');
      await page.locator('details.group > summary', { hasText: /^Fundação \(/ }).click();
      const grupo = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Fundação \(/ }) });
      const sigma = grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^σadm$/ }) }).locator('input');
      await sigma.fill('300');
      await sigma.press('Enter');
      await grupo.locator('[data-gerar-fundacoes]').click();
      const dlg = page.getByRole('dialog', { name: 'Gerar fundações' });
      await dlg.waitFor();
      await dlg.locator('[data-gerar-confirmar]').click();
      await page.locator('.statusbar .msg', { hasText: /Fundações geradas: 4 sapatas/ }).waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const tipo = page.getByLabel('Tipo de prancha');
      await tipo.selectOption({ label: 'Fundação (locação, detalhes e quantitativos)' });
      // sem cálculo: aviso claro
      await page.locator('[data-aviso-calculo="sem"]').waitFor();
      assert.equal(await page.locator('[data-lista-folhas]').count(), 0);
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const prev = page.locator('.prancha-prev');
      const lista = page.locator('[data-lista-folhas]');
      await tipo.selectOption({ label: 'Fundação (locação, detalhes e quantitativos)' });
      await page.waitForFunction(() => document.querySelector('.prancha-prev')?.getAttribute('data-tipo') === 'fundacao');
      await prev.locator('svg').waitFor();
      // locação, detalhamento das sapatas, vigas de fundação e quantitativos
      assert.ok((await page.locator('[data-folha-item]').count()) >= 4, await lista.innerText());
      const itens = await lista.innerText();
      assert.match(itens, /SFS/);
      assert.match(itens, /locação/);
      assert.match(itens, /sapatas/);
      assert.match(itens, /vigas de fundação/);
      assert.match(itens, /quantitativos/);
      const texto = await prev.textContent();
      assert.match(texto, /h0 = \d+ cm/);
      assert.match(texto, /df = \d+ cm/);
      assert.match(texto, /Nk,máx/);
      // detalhamento das sapatas: planta e corte 1:50 e peso de aço
      await page.locator('[data-folha-item]', { hasText: /sapatas/ }).click();
      await page.waitForFunction(() => /PLANTA ESC 1:50/.test(document.querySelector('.prancha-prev')?.textContent ?? ''));
      assert.ok(parseFloat(await page.locator('[data-aco-folha]').getAttribute('data-aco-peso')) > 0, 'peso de aço da folha de sapatas');
      // quantitativos
      await page.locator('[data-folha-item]', { hasText: /quantitativos/ }).click();
      await page.waitForFunction(() => /QUANTITATIVOS POR ELEMENTO/.test(document.querySelector('.prancha-prev')?.textContent ?? ''));
      // ancoragem editável: muda o desenho depois de calcular as fundações
      await page.locator('summary', { hasText: 'Ancoragem das vigas de fundação' }).click();
      const anc = page.locator('[data-ancoragem-vf] tbody tr').first().locator('input').first();
      await anc.fill('120');
      await anc.press('Enter');
      await page.locator('[data-aviso-fundacao="desatualizada"]').waitFor();
      await page.locator('[data-aviso-fundacao="desatualizada"]').getByRole('button', { name: 'Calcular fundações' }).click();
      await page.locator('[data-aviso-fundacao="desatualizada"]').waitFor({ state: 'detached' });
      await page.locator('[data-folha-item]', { hasText: /vigas de fundação/ }).click();
      await page.waitForFunction(() => /Ancoragem das barras superiores: 120 cm/.test(document.querySelector('.prancha-prev')?.textContent ?? ''));
      // conjunto completo: locação dos pilares (SLP), fundação (SFS) e as demais, numerado
      await tipo.selectOption({ label: 'Conjunto completo' });
      await prev.locator('svg').waitFor();
      const todos = await lista.innerText();
      for (const sg of ['SLP', 'SFS', 'SCF', 'SCV', 'SCP']) assert.match(todos, new RegExp(sg));
      const n = parseInt(await prev.getAttribute('data-total'), 10);
      assert.equal(await page.locator('[data-folha-item]').count(), n);
    },
  },
  {
    name: 'FU6: radier sobre base elástica — lançado pela planta, pilares sem vínculo, cálculo, mapa por nó na janela, viga sobre base elástica e pranchas da base elástica',
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
      // ferramenta Radier (W) no nível de fundação: contorno por 4 vértices e Enter
      await page.getByRole('radio', { name: 'Fundação' }).click();
      await page.locator('.planta-st').click();
      await page.keyboard.press('w');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'radier');
      const vertRad = [[-0.4, -0.4], [7.4, -0.4], [7.4, 5.4], [-0.4, 5.4]];
      await reenquadrarAte(page, vertRad);
      for (const [x, y] of vertRad) await page.mouse.click(...(await telaDe(page, x, y)));
      await page.keyboard.press('Enter');
      await page.locator('.statusbar .msg', { hasText: /Radier R1 lançado .*4 pilar\(es\) sobre ele/ }).waitFor();
      const tab = grupo.locator('table[data-bases-elasticas] tbody tr');
      assert.equal(await tab.count(), 1);
      assert.match(await tab.first().innerText(), /R1.*radier h = 30/s);
      // pilares sobre o radier não pedem elemento próprio: "Lançar centrados" sem pilares
      assert.match(await grupo.getByRole('button', { name: /Lançar centrados em/ }).innerText(), /em 0 pilares/);
      // seleção na planta (clique dentro do radier): editor com h, k e σadm
      await page.keyboard.press('s');
      await page.mouse.click(...(await telaDe(page, 3.5, 2.5)));
      const ed = grupo.locator('[data-editor-radier]');
      await ed.waitFor();
      const k = ed.locator('label.field', { has: page.locator('.flabel', { hasText: /^k \(vazio/ }) }).locator('input');
      await k.fill('40000');
      await k.press('Enter');
      await page.locator('.statusbar .msg', { hasText: 'Radier R1 alterado' }).waitFor();
      // carga do piso sobre o radier (nível de fundação)
      await cmd('carga.area {"grupo": "fundacao", "contorno": [[-0.4, -0.4], [7.4, -0.4], [7.4, 5.4], [-0.4, 5.4]], "valor": 5, "caso": "Q"}');
      // calcular: card da base elástica, sem FUND_PILAR_SEM_ELEMENTO
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      const card = page.locator('[data-card-base-elastica]');
      await card.waitFor();
      assert.match(await card.innerText(), /R1.*radier h = 30.*40000/s);
      assert.equal(await page.locator('[data-lista-erros]').locator('.tablewrap tbody tr', { hasText: 'FUND_PILAR_SEM_ELEMENTO' }).count(), 0);
      // janela: mapa por nó, nós de maior tensão e posições da armadura
      await card.locator('tbody tr', { hasText: 'R1' }).dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Radier R1/ });
      await jan.waitFor();
      assert.ok(parseInt(await jan.locator('svg[data-mapa-base]').getAttribute('data-mapa-nos'), 10) > 50, 'mapa com os nós da malha');
      assert.ok(await jan.locator('.mapa-no').count() > 50);
      assert.match(await jan.innerText(), /σ máxima \(raras\)/);
      assert.ok(await jan.locator('table[data-posicoes-radier] tbody tr').count() >= 4, 'malhas inferior e superior nas duas direções');
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // planta: mapa de tensões e viga sobre base elástica (X)
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await page.getByLabel('Mapa da base elástica').selectOption('tensao');
      await page.locator('.planta-st').click();
      await page.keyboard.press('x');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'vigaElastica');
      await reenquadrarAte(page, [[-0.3, 5.9], [7.3, 5.9]]);
      await page.mouse.click(...(await telaDe(page, -0.3, 5.9)));
      await page.mouse.click(...(await telaDe(page, 7.3, 5.9)));
      await page.keyboard.press('Enter');
      await page.locator('.statusbar .msg', { hasText: /VE1 \(50×80, sobre base elástica\) lançada/ }).waitFor();
      assert.equal(await tab.count(), 2);
      // pranchas do tipo Fundação: folhas da base elástica e quantitativos
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Recalcular' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      // a mensagem “dimensionamento em” da primeira rodada ainda pode estar na barra: espera o estado (VE1 no card) em vez do texto transitório
      await page.waitForFunction(() => /VE1/.test(document.querySelector('[data-card-base-elastica]')?.textContent ?? ''), null, { timeout: 90000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      await page.getByLabel('Tipo de prancha').selectOption({ label: 'Fundação (locação, detalhes e quantitativos)' });
      await page.waitForFunction(() => document.querySelector('.prancha-prev')?.getAttribute('data-tipo') === 'fundacao');
      const itens = await page.locator('[data-lista-folhas]').innerText();
      assert.match(itens, /base elástica — malha inferior/);
      assert.match(itens, /base elástica — malha superior/);
      assert.match(itens, /quantitativos/);
      await page.locator('[data-folha-item]', { hasText: /malha inferior/ }).click();
      await page.waitForFunction(() => /RADIERS — TENSÕES NO SOLO/.test(document.querySelector('.prancha-prev')?.textContent ?? ''));
      assert.ok(parseFloat(await page.locator('[data-aco-folha]').getAttribute('data-aco-peso')) > 0, 'peso de aço da malha inferior');
    },
  },
  {
    name: 'FU7a: sapata corrida — lançada pela planta (A) sob parede, cálculo rígido por metro, janela com corte transversal, edição, sob pilares na análise global e pranchas',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      // estrutura (para a análise) em y = 0 a 6; a parede da sapata SC1 fica entre x = 2 e 6 em y = 0 (longe dos pilares); os pilares de y = 6 ficam sobre a SC2
      await cmd('lote {"comandos": [' + [[0, 0], [8, 0], [8, 6], [0, 6]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 6], [8, 6]], [[0, 0], [0, 6]], [[8, 0], [8, 6]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('details.group > summary', { hasText: /^Fundação \(/ }).click();
      const grupo = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Fundação \(/ }) });
      const sigma = grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^σadm$/ }) }).locator('input');
      await sigma.fill('200');
      await sigma.press('Enter');
      // carga linear da parede (nível de fundação): G 250 + Q 100 kN/m
      await cmd('carga.linha {"grupo": "fundacao", "pontos": [[2, 0], [6, 0]], "valor": 250, "caso": "G"}');
      await cmd('carga.linha {"grupo": "fundacao", "pontos": [[2, 0], [6, 0]], "valor": 100, "caso": "Q"}');
      // ferramenta Sapata corrida (A) no nível de fundação: eixo por 2 pontos e Enter
      await page.getByRole('radio', { name: 'Fundação' }).click();
      await page.locator('.planta-st').click();
      await page.keyboard.press('a');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'corrida');
      await page.keyboard.press('f');
      await page.mouse.click(...(await telaDe(page, 2, 0)));
      await page.mouse.click(...(await telaDe(page, 6, 0)));
      await page.keyboard.press('Enter');
      await page.locator('.statusbar .msg', { hasText: /Sapata corrida SC1 lançada .*sob parede/ }).waitFor();
      const tab = grupo.locator('table[data-corridas-tabela] tbody tr');
      assert.equal(await tab.count(), 1);
      assert.match(await tab.first().innerText(), /SC1.*sob parede/s);
      const idSC1 = await tab.first().getAttribute('data-corrida-id');
      // seleção na planta (clique sobre o eixo): editor
      await page.keyboard.press('s');
      await page.mouse.click(...(await telaDe(page, 4, 0)));
      const ed = grupo.locator('[data-editor-corrida]');
      await ed.waitFor();
      // sob pilares: SC2 pelo comando, ao longo de y = 6 (passa pelos dois pilares): B e h informadas
      await cmd('corrida.criar {"pontos": [[0, 6], [8, 6]], "bw": 0.3, "B": 1.2, "h": 0.5}');
      await page.locator('.statusbar .msg', { hasText: /Sapata corrida SC2 lançada .*2 pilar\(es\) sobre ela/ }).waitFor();
      assert.equal(await tab.count(), 2);
      // calcular: card das sapatas corridas
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      const card = page.locator('[data-card-corridas]');
      await card.waitFor();
      assert.match(await card.innerText(), /SC1.*sob parede.*185 × 55 \/ 20/s);
      assert.match(await card.innerText(), /SC2.*sob pilares/s);
      // janela da SC1: corte transversal, flexão transversal CEB-70 e armadura
      await card.locator('tbody tr', { hasText: 'SC1' }).dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Sapata corrida SC1/ });
      await jan.waitFor();
      await jan.locator('svg[data-corte-corrida]').waitFor();
      assert.match(await jan.innerText(), /CEB-70.*Md = 96,8/s);
      assert.match(await jan.innerText(), /φ12,5 c\/14/);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // janela da SC2 (sob pilares): viga sobre base elástica
      await card.locator('tbody tr', { hasText: 'SC2' }).dblclick();
      const jan2 = page.getByRole('dialog', { name: /Resultados do elemento — Sapata corrida SC2/ });
      await jan2.waitFor();
      assert.match(await jan2.innerText(), /Viga: Md inf\. \/ sup\./);
      await jan2.getByRole('button', { name: 'Fechar' }).click();
      // editar a SC1 (B imposta pequena): erro FUND_CORRIDA_SEM_SOLUCAO na lista de revisão após recalcular
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await page.locator('.planta-st').click();
      await page.keyboard.press('s');
      await page.mouse.click(...(await telaDe(page, 4, 0)));
      const ed2 = grupo.locator('[data-editor-corrida]').first();
      await ed2.waitFor();
      const bf = ed2.locator('label.field', { has: page.locator('.flabel', { hasText: /^B \(vazio/ }) }).locator('input');
      await bf.fill('0.5');
      await bf.press('Enter');
      await page.locator('.statusbar .msg', { hasText: /Sapata corrida SC1 alterada/ }).waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Recalcular' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      assert.ok(await page.locator('[data-lista-erros]').locator('.tablewrap tbody tr', { hasText: 'FUND_CORRIDA_SEM_SOLUCAO' }).count() >= 1, 'erro da largura imposta');
      // volta ao cálculo pela σadm e abre as pranchas do tipo Fundação
      await cmd('corrida.editar {"id": "' + idSC1 + '", "limpar": ["B"]}');
      await page.getByRole('button', { name: 'Recalcular' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      await page.getByLabel('Tipo de prancha').selectOption({ label: 'Fundação (locação, detalhes e quantitativos)' });
      await page.waitForFunction(() => document.querySelector('.prancha-prev')?.getAttribute('data-tipo') === 'fundacao');
      const itens = await page.locator('[data-lista-folhas]').innerText();
      assert.match(itens, /sapatas corridas — locação/);
      assert.match(itens, /Fundação — sapatas corridas/);
      await page.locator('[data-folha-item]', { hasText: /^.*Fundação — sapatas corridas(?! —)/ }).first().click();
      await page.waitForFunction(() => /CORTE TRANSVERSAL/.test(document.querySelector('.prancha-prev')?.textContent ?? ''));
      assert.ok(parseFloat(await page.locator('[data-aco-folha]').getAttribute('data-aco-peso')) > 0, 'peso de aço das sapatas corridas');
    },
  },
  {
    name: 'FU8: cintas da sapata corrida de aba única (lançadas no editor, alavanca, alívio no elemento interno, janela e pranchas), radier sem carga (definir e seguir) e ligação com o módulo Fundações (sondagens nos dois sentidos, abrir no Edifício)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [7, 0], [7, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [7, 0]], [[0, 5], [7, 5]], [[0, 0], [0, 5]], [[7, 0], [7, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('details.group > summary', { hasText: /^Fundação \(/ }).click();
      const grupo = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Fundação \(/ }) });
      const sigma = grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^σadm$/ }) }).locator('input');
      await sigma.fill('250');
      await sigma.press('Enter');
      await page.getByRole('radio', { name: 'Fundação' }).click();
      // sapatas centradas sob P1 (0; 0) e P2 (7; 0)
      await grupo.getByLabel('Posição no pilar').selectOption('centrada');
      await page.mouse.click(...(await telaDe(page, 0, 0)));
      await page.locator('.statusbar .msg', { hasText: 'S1 (sapata) lançado sob P1' }).waitFor();
      await page.mouse.click(...(await telaDe(page, 7, 0)));
      await page.locator('.statusbar .msg', { hasText: 'S2 (sapata) lançado sob P2' }).waitFor();
      // sapata corrida de aba à esquerda (+y) sob uma parede a 3,5 m das sapatas, carga linear G = 200 kN/m
      await cmd('carga.linha {"grupo": "fundacao", "pontos": [[0, -3.5], [7, -3.5]], "valor": 200, "caso": "G"}');
      await cmd('corrida.criar {"pontos": [[0, -3.5], [7, -3.5]], "bw": 0.2, "aba": "esq"}');
      await page.locator('.statusbar .msg', { hasText: /Sapata corrida SC1 lançada .*sob parede/ }).waitFor();
      const tab = grupo.locator('table[data-corridas-tabela] tbody tr');
      await tab.first().click();
      const ed = grupo.locator('[data-editor-corrida]');
      await ed.waitFor();
      // cintas pelo editor: a primeira nasce no meio e vai para S1; a segunda vai para S2
      const cintas = ed.locator('[data-cintas]');
      await cintas.getByRole('button', { name: 'Adicionar cinta' }).click();
      await page.locator('.statusbar .msg', { hasText: /Cinta CT1 lançada na sapata corrida SC1/ }).waitFor();
      const linha = (n) => cintas.locator('[data-cinta-id]').nth(n);
      const campoS = (n) => linha(n).locator('label.field', { has: page.locator('.flabel', { hasText: /^s \(0 a/ }) }).locator('input');
      await campoS(0).fill('0');
      await campoS(0).press('Enter');
      await page.locator('.statusbar .msg', { hasText: /Cinta CT1 alterada/ }).waitFor();
      await cintas.getByRole('button', { name: 'Adicionar cinta' }).click();
      await page.locator('.statusbar .msg', { hasText: /Cinta CT2 lançada/ }).waitFor();
      await campoS(1).fill('7');
      await campoS(1).press('Enter');
      await linha(1).locator('select').selectOption({ label: 'S2' });
      await page.locator('.statusbar .msg', { hasText: /Cinta CT2 alterada/ }).waitFor();
      assert.equal(await cintas.locator('[data-cinta-id]').count(), 2);
      // calcular: cintas na janela da sapata corrida, com alavanca e alívio
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      const card = page.locator('[data-card-corridas]');
      await card.waitFor();
      await card.locator('tbody tr', { hasText: 'SC1' }).dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Sapata corrida SC1/ });
      await jan.waitFor();
      const txt = await jan.innerText();
      assert.match(txt, /Cinta CT1/);
      assert.match(txt, /Cinta CT2/);
      assert.match(txt, /alívio ΔN \d+,\d kN em S1/);
      assert.match(txt, /alívio ΔN \d+,\d kN em S2/);
      assert.doesNotMatch(txt, /FUND_CORRIDA_EXC/);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // o elemento interno recebe o alívio (janela da sapata S1)
      const cardF = page.locator('[data-card-fundacoes]');
      if (await cardF.count()) assert.match(await cardF.innerText(), /S1/);
      // pranchas: elevação longitudinal da corrida e cintas nas folhas das vigas de fundação
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      await page.getByLabel('Tipo de prancha').selectOption({ label: 'Fundação (locação, detalhes e quantitativos)' });
      await page.waitForFunction(() => document.querySelector('.prancha-prev')?.getAttribute('data-tipo') === 'fundacao');
      await page.locator('[data-folha-item]', { hasText: /^.*Fundação — sapatas corridas(?! —)/ }).first().click();
      await page.waitForFunction(() => /ELEVAÇÃO LONGITUDINAL/.test(document.querySelector('.prancha-prev')?.textContent ?? ''));
      const folhas = await page.locator('[data-lista-folhas]').innerText();
      assert.match(folhas, /Fundação — vigas de fundação/);

      // radier sem carga: define a carga na hora e segue o cálculo
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await cmd('radier.criar {"contorno": [[10, 0], [14, 0], [14, 4], [10, 4]], "h": 0.3}');
      await page.locator('.statusbar .msg', { hasText: /Radier .* lançado/ }).waitFor();
      await grupo.locator('table[data-bases-elasticas] tbody tr').first().click();
      const semCarga = grupo.locator('[data-radier-sem-carga]');
      await semCarga.waitFor();
      await semCarga.getByRole('button', { name: 'Definir carga e seguir' }).click();
      await grupo.locator('[data-radier-sem-carga]').waitFor({ state: 'detached' });
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });

      // ligação com o módulo Fundações: sondagens nos dois sentidos e atalho para o Edifício
      await cmd('sondagem.criar {"nome": "SP-E1", "x": 1, "y": 1, "nivelAgua": 6, "leituras": [{"N": 5, "solo": "areia"}, {"N": 8, "solo": "areia"}, {"N": 12, "solo": "areia"}, {"N": 18, "solo": "areia"}]}');
      await page.getByRole('tab', { name: 'Fundações', exact: true }).click();
      const lig = page.locator('[data-ligacao-edificio]');
      await lig.waitFor();
      assert.match(await lig.innerText(), /1 furo\(s\) de sondagem no edifício/);
      await lig.getByRole('button', { name: 'Copiar sondagens do edifício' }).click();
      await page.locator('.statusbar .msg', { hasText: /1 furo\(s\) de sondagem copiado\(s\) do edifício/ }).waitFor();
      assert.match(await lig.innerText(), /1 neste módulo/);
      await lig.getByRole('button', { name: 'Copiar sondagens para o edifício' }).click();
      await page.locator('.statusbar .msg', { hasText: /1 furo\(s\) de sondagem copiado\(s\) do módulo Fundações \(substituíram os do edifício\)/ }).waitFor();
      assert.match(await lig.innerText(), /1 furo\(s\) de sondagem no edifício/);
      await lig.getByRole('button', { name: /Abrir no Edifício/ }).click();
      await page.locator('.planta-cv').waitFor();
      assert.equal(await page.locator('.planta-cv').getAttribute('data-nivel'), 'fundacao');
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
      await page.getByRole('button', { name: 'Lajes', exact: true }).click();
      await page.waitForFunction((t) => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-cena')).total < t, total);
      await page.getByRole('button', { name: 'Lajes', exact: true }).click();
      // clique no desenho seleciona o elemento (o mesmo estado da planta)
      await cv.locator('svg.v3d-iso path[data-id^="pilar:"]').first().click({ force: true });
      await page.locator('.v3d-sel-info').waitFor();
      assert.match(await page.locator('.v3d-sel-info').innerText(), /Selecionado:\s+P\d/);
    },
  },
  {
    webgl: true,
    name: 'V2: cortes e linhas de seção (traçar, janela, renomear, profundidade, memorial, apagar) e armaduras em 3D (vista do edifício e aba 3D da viga, do pilar e da laje)',
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

      // ---- corte traçado na planta: a janela abre sozinha com a elevação hachurada
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta', exact: true }).click();
      await page.locator('.planta-cv[data-vista]').waitFor();
      await page.locator('summary', { hasText: /^Cortes e seções/ }).click();
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
  },
  {
    webgl: true,
    name: 'V3: deformada 3D (hipótese, escala, eixos, animação, legenda), consulta de deslocamentos por nó, máximos por pano e pavimento, CSV e flecha entre dois pontos da laje',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');

      // ---- sem cálculo: aviso na aba
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Deslocamentos', exact: true }).click();
      await page.getByText('Calcule a estrutura (aba Dimensionamento) para consultar os deslocamentos.').waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
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
  },
  {
    name: 'N2a: compatibilidade e arranjos em xadrez, estados-limite, situações do usuário com alerta, empuxo (caso H), ábacos de vento e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [0, 5, 10].flatMap((x) => [0, 4, 8].map((y) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`)).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [10, 0]], [[0, 4], [10, 4]], [[0, 8], [10, 8]], [[0, 0], [0, 8]], [[5, 0], [5, 8]], [[10, 0], [10, 8]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const msg = (t) => page.locator('.statusbar .msg', { hasText: t }).waitFor();
      const grupo = (t) => page.locator('details.group', { has: page.locator(':scope > summary', { hasText: t }) });

      // ---- casos: compatibilidade e arranjos ----
      await page.locator('summary', { hasText: /^Casos de carga/ }).click();
      const casos = grupo(/^Casos de carga/);
      for (const n of ['Água', 'Vazio']) {
        await casos.getByLabel('Novo caso').fill(n);
        await casos.getByLabel('Novo caso').press('Enter');
        await casos.getByRole('button', { name: 'Criar caso' }).click();
        await msg(`Caso ${n} (Q) criado`);
      }
      await casos.locator('summary', { hasText: 'Compatibilidade entre casos' }).click();
      await casos.getByLabel('Relação entre Água e Vazio').selectOption('incompativel');
      await msg('Água e Vazio: incompativel');
      assert.equal(await casos.getByLabel('Relação entre Água e Vazio').inputValue(), 'incompativel');
      await casos.locator('summary', { hasText: 'Arranjos alternados e móveis' }).click();
      await casos.getByLabel('Nome do caso', { exact: true }).fill('Uso alternado');
      await casos.getByLabel('Nome do caso', { exact: true }).press('Enter');
      await casos.getByRole('button', { name: 'Gerar arranjos' }).click();
      await msg('2 arranjos em xadrez');
      assert.equal(await casos.getByLabel('Natureza de Uso alternado A').inputValue(), 'Q');
      assert.match(await casos.innerText(), /arranjo de Uso alternado/);

      // ---- estados-limite ----
      await page.locator('summary', { hasText: /^Estados-limite e combinações/ }).click();
      const est = grupo(/^Estados-limite e combinações/);
      assert.equal(await est.getByLabel('Ativar Concreto armado (ELU)').isDisabled(), true);
      await est.getByLabel('Ativar Flechas (quase permanentes)').uncheck();
      await msg('Estados-limite alterados');
      await page.locator('summary', { hasText: /^Estados-limite e combinações \(alterados\)/ }).waitFor();
      await est.getByLabel('Ativar Flechas (quase permanentes)').check();
      await est.getByLabel('Controle de execução').selectOption('premoldado');
      await msg('Parâmetros de norma alterados');

      // ---- análise e situações do usuário ----
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Análise' }).click();
      await page.getByRole('button', { name: 'Calcular', exact: true }).click();
      await msg('Análise concluída');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await est.getByRole('button', { name: 'Situações do usuário…' }).click();
      const jan = page.getByRole('dialog', { name: 'Situações do usuário' });
      await jan.getByRole('button', { name: 'Importar da norma' }).click();
      await msg('situação(ões) importada(s) da norma em Concreto armado (ELU)');
      const linhas = await jan.locator('tbody tr').count();
      assert.ok(linhas >= 8, `${linhas} situações importadas`);
      assert.equal(await jan.locator('.alert').count(), 0, 'importada da norma: sem alerta');
      // modo usuário num grupo com situação de fator menor que o da norma: alerta de responsabilidade
      await jan.getByRole('button', { name: 'Fechar' }).click();
      await est.getByLabel('Modo de Tensões no solo (raras)').selectOption('usuario');
      await msg('Estados-limite alterados');
      await est.getByRole('button', { name: 'Situações do usuário…' }).click();
      await jan.getByLabel('Grupo de estados').selectOption({ label: 'Tensões no solo (raras)' });
      await jan.getByLabel('Nome da nova situação').fill('Baixa');
      await jan.getByLabel('Nome da nova situação').press('Enter');
      await jan.getByRole('button', { name: 'Nova situação' }).click();
      await jan.getByLabel('Nome da situação Baixa').waitFor();
      const q = jan.getByLabel('Fator de Q em Baixa');
      await q.fill('0,5');
      await q.press('Enter');
      await jan.locator('.alert').first().waitFor();
      assert.match(await jan.locator('.alert').first().innerText(), /Combinações do usuário \(Tensões no solo \(raras\)\):.*fator máximo de Q = 0,5, abaixo de 1 da norma/s);
      // colagem de uma situação própria
      await jan.locator('summary', { hasText: 'Colar tabela' }).click();
      await jan.getByLabel('Tabela colada').fill('\tG\tQ\nPrópria\t1\t0,8');
      await jan.getByRole('button', { name: 'Criar situações da colagem' }).click();
      await jan.getByLabel('Nome da situação Própria').waitFor();
      await jan.getByRole('button', { name: 'Fechar' }).click();

      // ---- empuxo de terra e caso H ----
      await page.locator('summary', { hasText: /^Empuxo de terra/ }).click();
      const emp = grupo(/^Empuxo de terra/);
      await emp.getByLabel('Novo tipo de empuxo').fill('Subsolo');
      await emp.getByLabel('Novo tipo de empuxo').press('Enter');
      await emp.getByRole('button', { name: 'Criar tipo' }).click();
      await msg('Empuxo “Subsolo” (repouso, K = 0,5)');
      const caixa = emp.locator('.emp-box');
      const R0 = parseFloat(await caixa.getAttribute('data-resultante'));
      const na = emp.getByLabel('Cota do nível d\'água');
      await na.fill('-0,5'); // dentro da parede (cota da base −1,5 m)
      await na.press('Enter');
      await page.waitForFunction((r) => parseFloat(document.querySelector('.emp-box').getAttribute('data-resultante')) > r, R0);
      assert.ok(await caixa.locator('svg.emp-fig polygon.emp-agua').count() >= 1, 'a água entra no diagrama');
      await casos.getByLabel('Novo caso').fill('Empuxo do subsolo');
      await casos.getByLabel('Novo caso').press('Enter');
      await casos.locator('label.field', { has: page.locator('.flabel', { hasText: /^Natureza$/ }) }).locator('select').selectOption('H');
      await casos.getByRole('button', { name: 'Criar caso' }).click();
      await msg('Caso Empuxo do subsolo (H) criado');
      await casos.getByLabel('Empuxo de Empuxo do subsolo').selectOption({ label: 'Subsolo' });
      await msg('Caso Empuxo do subsolo alterado');

      // ---- ábacos de vento ----
      await page.locator('summary', { hasText: /^Ábacos de vento/ }).click();
      const ab = grupo(/^Ábacos de vento/);
      assert.deepEqual(await ab.getByLabel('Coeficiente de arrasto Ca').locator('option').allInnerTexts(), ['Informado (Ca em X e Y)']);
      await ab.locator('summary', { hasText: /^Ca, baixa turbulência/ }).click();
      await ab.getByLabel('Ca, baixa turbulência: pontos da curva 1').fill('0,2; 1,04\n5; 1,04');
      await ab.getByRole('button', { name: 'Aplicar ca, baixa turbulência' }).click();
      await msg('Vento alterado');
      await ab.getByLabel('Coeficiente de arrasto Ca').selectOption('1');
      await msg('Vento alterado');
      await page.locator('summary', { hasText: /^Ábacos de vento \(NBR 6123\) \(em uso\)/ }).waitFor();

      // ---- memorial ----
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.locator('text=O modelo mudou depois do cálculo').waitFor({ state: 'detached' });
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const t = await memo.textContent();
      assert.match(t, /Categorias de uso, arranjos e compatibilidade/);
      assert.match(t, /Uso alternado.*Uso alternado A; Uso alternado B/s);
      assert.match(t, /Estados-limite e coeficientes/);
      assert.match(t, /Pré-moldado com controle rigoroso/);
      assert.match(t, /Situações de projeto do usuário/);
      assert.match(t, /Combinações do usuário \(Tensões no solo \(raras\)\): fator máximo de Q = 0,8, abaixo de 1 da norma/);
      assert.match(t, /Empuxo de terra.*Subsolo.*método de repouso/s);
      assert.ok(await memo.locator('figure svg').count() >= 1);
      assert.match(t, /Equilíbrio global \(tombamento\)/);
      assert.match(t, /Ca pelo ábaco de baixa turbulência/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
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
  {
    name: 'R7b: detalhamento de vigas (mostrar/ocultar, edição de posição com verificação DETALHE_INSUF, restaurar, opções no perfil do sistema, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
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
      const g = page.locator('.edif-in details', { has: page.locator('summary', { hasText: 'Opções de cálculo' }) }).first();
      await g.locator('summary').click();
      assert.ok(await g.getByLabel('Vigas: reduzir lb por As,calc/As,ef').isChecked());
      assert.match(await g.innerText(), /Vigas: comprimento mínimo dos negativos/);
      // memorial: critérios do detalhamento das vigas
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo.locator('[data-memorial-det-vigas]').innerText(), /prolongamento dos cortes lb·As,calc\/As,ef/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  },
  {
    name: 'R7c: detalhamento de pilares (edição de espera e traspasse com PILAR_DET_INSUF, restaurar, corte no topo, adensamento, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
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
      const g = page.locator('.edif-in details', { has: page.locator('summary', { hasText: 'Opções de cálculo' }) }).first();
      await g.locator('summary').click();
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
  },
  {
    name: 'R7d: armadura base das lajes (tela Q138 detalhada em painéis, reforço, predefinida), resumo de telas e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
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
      const g = page.locator('.edif-in details', { has: page.locator('summary', { hasText: 'Opções de cálculo' }) }).first();
      await g.locator('summary').click();
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
  },
  {
    name: 'N2d: punção das lajes (contornos C, C′ e C″, armadura calculada, grupos informados, camada e ferramenta na planta, envoltória do grupo, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      await cmd('vento.definir {"ativo": false}');
      await cmd('grupo.editar {"id": "g_3", "q": 14}');
      // laje lisa de 12 × 12 m, h = 16 cm, em 3 × 3 pilares 50 × 50 (1 interno, 4 de borda e 4 de canto)
      await cmd('lote {"comandos": [' + [0.25, 6, 11.75].flatMap((x) => [0.25, 6, 11.75].map((y) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.5, "h": 0.5}}}`)).join(', ') + ']}');
      await cmd('laje.criar {"grupo": "g_3", "contorno": [[0, 0], [12, 0], [12, 12], [0, 12]], "tipo": {"tipo": "macica", "h": 0.16}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 120000 });
      await livre();
      // cartão de punção: 9 pilares por pavimento do grupo; o interno leva armadura, os de borda e de canto reprovam na biela
      const card = page.locator('[data-card-puncao]');
      await card.waitFor();
      assert.equal(await card.locator('tbody tr').count(), 27);
      assert.ok(await card.locator('tbody tr', { hasText: 'com armadura' }).count() >= 1);
      assert.ok(await card.locator('tbody tr.bad', { hasText: 'não atende' }).count() >= 1);
      assert.ok(await page.locator('[data-lista-erros]').getByText('PUNCAO_BIELA').first().isVisible());
      // janela da laje, aba Punção e cortante
      await card.locator('tbody tr', { hasText: 'com armadura' }).first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Laje/ });
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Punção e cortante' }).click();
      const cartao = jan.locator('section[data-status="armadura"]').first();
      await cartao.waitFor();
      assert.equal(await cartao.getAttribute('data-tipo-apoio'), 'interno');
      assert.ok(await cartao.locator('svg[data-puncao-fig] [data-contorno="C″"]').count() > 0);
      assert.ok(await cartao.locator('svg circle[data-barra]').count() >= 4);
      assert.match(await cartao.locator('table[data-contornos-puncao]').innerText(), /τRd3/);
      assert.match(await cartao.innerText(), /armadura de punção calculada/i);
      // grupo informado soma-se à calculada e pode ser apagado
      await cartao.getByRole('button', { name: 'Adicionar grupo' }).click();
      await livre();
      await jan.locator('[data-grupos-puncao="1"]').waitFor();
      await cartao.getByRole('button', { name: 'Apagar os grupos do pilar' }).click();
      await livre();
      await jan.locator('[data-grupos-puncao]').waitFor({ state: 'detached' });
      // envoltória dos pavimentos do grupo (C3.4)
      await jan.getByRole('radio', { name: 'Resultados e armadura' }).click();
      await jan.getByRole('radio', { name: 'Envoltória do grupo' }).click();
      await jan.locator('[data-envoltoria-laje]').waitFor();
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // camada na planta (Tipo 1): contornos dos 9 pilares
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await page.getByLabel('Armadura das lajes na planta').selectOption('puncao');
      await page.waitForFunction(() => document.querySelector('.planta-cv')?.getAttribute('data-puncao') === '9', null, { timeout: 15000 });
      // ferramenta: um clique no pilar interno lança o grupo informado; no modo Apagar, remove
      await page.getByRole('button', { name: 'Armadura de punção', exact: true }).click();
      await page.keyboard.press('f');
      const [px, py] = await telaDe(page, 6, 6);
      await page.mouse.click(px, py);
      await page.waitForTimeout(500);
      await livre();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await card.locator('tbody tr', { hasText: 'informada' }).first().waitFor({ timeout: 30000 });
      // radier sob os 9 pilares (FU6): punção do radier na janela e no memorial
      await cmd('radier.criar {"contorno": [[0, 0], [12, 0], [12, 12], [0, 12]], "h": 0.3, "k": 40000, "sigmaAdm": 400}');
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await livre();
      const cardBase = page.locator('[data-card-base-elastica]');
      await cardBase.waitFor({ timeout: 60000 });
      await cardBase.locator('tbody tr').first().dblclick();
      const janR = page.getByRole('dialog', { name: /Resultados do elemento/ });
      await janR.locator('[data-puncao-radier="9"]').waitFor();
      assert.equal(await janR.locator('[data-puncao-radier] section[data-puncao]').count(), 9);
      assert.equal(await janR.locator('[data-puncao-radier] [data-editor-puncao]').count(), 0);
      await janR.getByRole('button', { name: 'Fechar' }).click();
      // memorial
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const t = await memo.textContent();
      assert.ok(await memo.locator('[data-memorial-puncao-radier]').count() > 0);
      assert.match(t, /Punção e cortante das lajes/);
      assert.match(t, /Punção por pilar/);
      assert.match(t, /Cortante das lajes nos apoios em vigas/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  },
  {
    name: 'R7e: edição das armaduras das lajes (painel não modal, edição bloqueada com ARM_BLOQ, agrupar, zona, linha de dobra, geração sem cálculo e refazer, rótulos da prancha, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
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
  },
  {
    name: 'N2b: modelo integrado (lajes condensadas no pórtico) em uso, opção no grupo Opções e volta ao modelo separado',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      // opção no grupo Opções de cálculo, ligada por padrão (padrão do sistema)
      await page.locator('summary', { hasText: 'Opções de cálculo' }).click();
      const opcao = page.getByLabel('Modelo integrado (lajes no pórtico)');
      assert.equal(await opcao.isChecked(), true);
      assert.equal(await page.getByLabel('Deformação por cortante nas barras de laje').isChecked(), true);
      assert.equal(await page.getByLabel('Malha das cascas (tamanho alvo)').inputValue(), '1');
      // análise: indicação do modelo em uso, gdl e tempo
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Análise' }).click();
      await page.getByRole('button', { name: 'Calcular', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'Análise concluída' }).waitFor({ timeout: 120000 });
      const linha = page.locator('[data-modelo]');
      await linha.waitFor();
      assert.equal(await linha.getAttribute('data-modelo'), 'integrado');
      assert.match(await linha.textContent(), /Modelo integrado \(\d+ pavimento\(s\) condensados no pórtico\) · \d+ gdl em \d+ ms/);
      assert.match(await page.locator('.edif-out').textContent(), /superelemento/);
      // desliga: volta ao modelo separado (comportamento anterior)
      await opcao.uncheck();
      await page.locator('summary', { hasText: 'Opções de cálculo (1 alterada)' }).waitFor();
      await page.getByRole('button', { name: 'Calcular', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[data-modelo]')?.getAttribute('data-modelo') === 'separado', null, { timeout: 120000 });
      assert.match(await page.locator('[data-modelo]').textContent(), /Modelo separado/);
      // memorial descreve o modelo em uso
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 120000 });
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo.textContent(), /modelo separado/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  },
  {
    name: 'N2c: vínculo externo com molas, carga uniforme no pilar, P-Δ na aba Análise, 2ª ordem local e cortante por direção na janela do pilar, memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      // vínculo externo: molas na base do P1 (giros) e carga uniforme no lance
      await page.locator('summary', { hasText: 'Pilares (4)' }).click();
      await page.locator('table.quadro tbody tr').first().click();
      await page.locator('summary', { hasText: 'Vínculos, flambagem e cobrimento' }).click();
      const vinc = page.locator('[data-vinculo-externo]');
      await vinc.waitFor();
      await vinc.getByLabel('Vínculo da base').selectOption({ label: 'molas' });
      await page.locator('.statusbar .msg', { hasText: 'Vínculo de 1 pilar(es) alterado' }).waitFor();
      const kx = vinc.getByLabel('kθx');
      await kx.fill('50000');
      await kx.press('Enter');
      await page.waitForFunction(() => [...document.querySelectorAll('[data-vinculo-externo] label.field')].find((l) => l.textContent.startsWith('kθx'))?.querySelector('input')?.value === '50000');
      await page.locator('select', { has: page.locator('option', { hasText: 'em faixa' }) }).selectOption({ label: 'uniforme' });
      const hx = page.getByLabel('Hx (kN/m)');
      await hx.fill('2');
      await hx.press('Enter');
      await page.getByRole('button', { name: 'Adicionar carga no lance' }).click();
      await page.locator('tr[data-carga-pilar="uniforme"]').waitFor();
      // P-Δ na aba Análise
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Análise' }).click();
      const card = page.locator('[data-card-2ordem]');
      await card.getByLabel('P-Δ no pórtico 3D (no lugar do γz)').check();
      await page.getByRole('button', { name: 'Calcular', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'Análise concluída' }).waitFor({ timeout: 120000 });
      const pd = card.locator('[data-segunda-ordem="pDelta"]');
      await pd.waitFor({ timeout: 60000 });
      assert.ok(parseInt(await pd.getAttribute('data-pdelta-combinacoes'), 10) > 0);
      assert.match(await pd.textContent(), /P-Δ.*sem a ampliação 0,95·γz/s);
      // janela do pilar: método local por direção, diagrama de 1ª e 2ª ordem e cortante por direção
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 120000 });
      const cardP = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: 'Pilares (por lance)' }) });
      await cardP.locator('tbody tr').first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Pilar/ });
      await jan.waitFor();
      assert.match(await jan.locator('[data-pilar-2ordem]').first().getAttribute('data-pilar-2ordem'), /^(curvatura|curvaturaFluencia|geral)\|/);
      assert.match(await jan.textContent(), /2ª ordem local u \(b\)/);
      await jan.locator('svg[data-diagrama="M2"]').first().waitFor();
      assert.ok(await jan.locator('table[data-cortante-direcao="2"]').count() >= 1);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // memorial: método global P-Δ, efeitos locais, cortante por direção e vínculo com molas
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      await memo.locator('[data-memorial-2ordem="pDelta"]').waitFor();
      assert.match(await memo.textContent(), /processo P-Δ/);
      assert.match(await memo.textContent(), /Pilar P1: base sobre molas/);
      await memo.locator('table[data-memorial-cortante]').waitFor();
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  },
  {
    name: 'R7f: mudar tabela não refaz a análise (contadores de revisão), agrupar pórticos, seleção para bloqueio, seção alterada com esforços antigos e rearmar alterados, cópia das lajes, memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
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
  },
  {
    name: 'E1a: pilar sobre pilar (realce e coordenadas relativas ao pilar de baixo, nome P5a) e pilar sobre viga (transição): janela, viga de transição, memorial e pranchas',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 90000 });
      const sec = (b, h) => `{"tipo": "ret", "b": ${b}, "h": ${h}}`;
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": ${sec(0.6, 0.6)}}}`).join(', ') + ']}');
      // P5 da fundação ao Tipo 3 (admite outro por cima) e P6 nasce no Tipo 3 sobre a viga de y = 0
      await cmd(`pilar.inserir {"x": 3, "y": 2.5, "secao": ${sec(0.3, 0.3)}, "morre": "pav_6"}`);
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[6, 0], [6, 5]], [[6, 5], [0, 5]], [[0, 5], [0, 0]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.6}}}`).join(', ') + ']}');
      await cmd(`pilar.inserir {"x": 3, "y": 0, "secao": ${sec(0.25, 0.25)}, "nasce": "pav_6"}`);
      // pilar sem apoio embaixo é erro; sobre viga é só informação
      await cmd(`pilar.inserir {"x": 1.5, "y": 3.5, "secao": ${sec(0.25, 0.25)}, "nasce": "pav_6"}`);
      // planta do Tipo 3: pilar da ferramenta passa sobre o pilar de baixo (P5): realce, coordenadas relativas e P5a
      const sel = page.getByLabel('Pavimento da planta');
      await sel.selectOption(await sel.locator('option', { hasText: 'Tipo 3' }).first().getAttribute('value'));
      await page.locator('.planta-cv[data-vista]').waitFor();
      await page.locator('.planta-st').click();
      await page.keyboard.press('p');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'pilar');
      await reenquadrarAte(page, [[0, 0], [6, 0], [6, 5], [0, 5], [3, 2.5]]);
      const [px, py] = await telaDe(page, 3.1, 2.5);
      await page.mouse.move(px, py);
      await page.waitForFunction(() => /sobre P5: Δx/.test(document.querySelector('.planta-st .num')?.textContent ?? ''), null, { timeout: 20000 });
      // um pilar que não admite outro por cima (P1 vai até a cobertura) não mostra a referência
      const [qx, qy] = await telaDe(page, 0, 0);
      await page.mouse.move(qx, qy);
      await page.waitForFunction(() => !/sobre P/.test(document.querySelector('.planta-st .num')?.textContent ?? ''), null, { timeout: 20000 });
      await page.mouse.move(px, py);
      await page.waitForFunction(() => /sobre P5: Δx/.test(document.querySelector('.planta-st .num')?.textContent ?? ''), null, { timeout: 20000 });
      await page.mouse.click(px, py);
      await page.locator('.statusbar .msg', { hasText: /P5a inserido/ }).waitFor({ timeout: 20000 });
      // tabela de pilares: P5a nasce no Tipo 3, sem erro de lançamento em P5a
      await page.keyboard.press('s');
      const gp = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Pilares \(/ }) });
      await gp.locator(':scope > summary').click();
      assert.equal(await gp.getByLabel('Nasce P5a').inputValue(), 'pav_6');
      // Cobertura: seleciona P6 (sobre a viga) e vê o apoio e o lance
      await sel.selectOption(await sel.locator('option', { hasText: 'Cobertura' }).first().getAttribute('value'));
      await reenquadrarAte(page, [[0, 0], [6, 0], [3, 2.5], [0, 5]]);
      await page.locator('.planta-st').click();
      await page.keyboard.press('s');
      await page.mouse.click(...(await telaDe(page, 3, 0)));
      const gv = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Vínculos, flambagem/ }) });
      await gv.locator(':scope > summary').click();
      await gv.locator('[data-apoio="viga"]').waitFor({ timeout: 20000 });
      assert.match(await gv.locator('[data-apoio="viga"]').innerText(), /sobre a viga V1 \(viga de transição\)/);
      await gv.getByLabel('Início do pilar').waitFor();
      // verificação do lançamento: P7 sem apoio é erro; P6 sobre a viga é só informação
      await page.locator('.edif-tabs').getByRole('tab', { name: /^Verificação/ }).click();
      const ver = await page.locator('.edif-out').innerText();
      assert.match(ver, /P7 nasce em Tipo 3 sem pilar, viga ou laje embaixo/);
      assert.match(ver, /P6 nasce sobre V1 em Tipo 3: viga de transição/);
      // calcula e dimensiona
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 120000 });
      await livre();
      // janela da viga de transição: tabela com o pilar P6, Nd e cortante nas faces
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) }).locator('tbody tr', { hasText: 'V1' }).first().dblclick();
      const jv = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await jv.waitFor();
      const tr = jv.locator('table[data-transicoes]');
      await tr.waitFor();
      assert.match(await tr.innerText(), /P6/);
      assert.match(await jv.innerText(), /Transição: P6 nasce sobre a viga/);
      await jv.getByRole('button', { name: 'Fechar' }).click();
      // janela do pilar P6: o apoio detectado e o pé ligado ao modelo
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: 'Pilares (por lance)' }) }).locator('tbody tr', { hasText: 'P6' }).first().dblclick();
      const jp = page.getByRole('dialog', { name: /Resultados do elemento — Pilar/ });
      await jp.waitFor();
      assert.match(await jp.locator('[data-apoio="viga"]').innerText(), /Pé ligado ao apoio no modelo/);
      await jp.getByRole('button', { name: 'Fechar' }).click();
      // memorial: pilares apoiados e vigas de transição
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.innerText();
      assert.match(mt, /Pilares que nascem acima da fundação \(apoiados\)/);
      assert.match(mt, /Vigas de transição \(pilares que nascem sobre vigas\)/);
      assert.ok(await memo.locator('[data-memorial-transicoes] tbody tr').count() >= 1);
      assert.match(mt, /P5a[\s\S]*pilar P5/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // pranchas: pilares com "nasce em ..." e vigas com a carga da transição
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const tipo = page.getByLabel('Tipo de prancha');
      const prev = page.locator('.prancha-prev');
      await tipo.selectOption({ label: 'Armação de pilares' });
      await prev.locator('svg').waitFor();
      const tp = await prev.textContent();
      assert.match(tp, /nasce em V1/);
      assert.match(tp, /nasce em P5/);
      await tipo.selectOption({ label: 'Armação de vigas' });
      await prev.locator('svg').waitFor();
      assert.match(await prev.textContent(), /P6 nasce aqui · Nd = \d+ kN/);
    },
  },
  {
    name: 'E1b: pilar-parede (tipo reto criado no grupo, lançamento, planta, janela com esforços por lado, viga apoiada ao longo, memorial e pranchas)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      const sec = '{"tipo": "ret", "b": 0.3, "h": 0.3}';
      await cmd('lote {"comandos": [' + [[6, 0], [0, 5], [6, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": ${sec}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[6, 0], [6, 5]], [[6, 5], [0, 5]], [[0, 5], [0, 0]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.criar {"grupo": "g_3", "contorno": [[0, 0], [6, 0], [6, 5], [0, 5]], "tipo": {"tipo": "macica", "h": 0.12}}');
      // grupo Pilares-parede: cria o tipo reto de 4 m × 20 cm e lança em (0; 0)
      const gp = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Pilares-parede/ }) });
      await gp.locator(':scope > summary').click();
      await gp.getByLabel('Novo tipo').fill('Parede 4 m');
      await gp.getByLabel('Comprimento').fill('400');
      await gp.getByLabel('Espessura').first().fill('20');
      await gp.getByRole('button', { name: 'Criar tipo reto' }).click();
      await gp.locator('[data-pp-previa]').waitFor({ timeout: 20000 });
      assert.equal(await gp.locator('table[data-pp-lados] tbody tr').count(), 1);
      assert.match(await gp.locator('table[data-pp-lados] tbody tr').first().innerText(), /casca/);
      await gp.getByRole('button', { name: 'Inserir em (x; y)' }).click();
      await gp.locator('table[data-pp-lista] tbody tr', { hasText: 'PP1' }).waitFor({ timeout: 20000 });
      // a planta desenha o pilar-parede; clique no corpo seleciona; o realce vai para a lista
      await page.locator('.planta-cv[data-vista]').waitFor();
      await page.locator('.planta-st').click();
      await reenquadrarAte(page, [[0, 0], [6, 0], [6, 5], [0, 5], [4, 0]]);
      await page.keyboard.press('s');
      await page.mouse.click(...(await telaDe(page, 2, 0)));
      await gp.locator('table[data-pp-lista] tbody tr[aria-selected="true"]').waitFor({ timeout: 20000 });
      // verificação: nenhum erro de lançamento do pilar-parede
      await page.locator('.edif-tabs').getByRole('tab', { name: /^Verificação/ }).click();
      assert.doesNotMatch(await page.locator('.edif-out').innerText(), /PPAREDE_APOIO|PPAREDE_SOBREPOSTO/);
      // calcula e dimensiona
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 180000 });
      await livre();
      const cartao = page.locator('[data-pp-cartao]');
      await cartao.waitFor({ timeout: 30000 });
      assert.match(await cartao.innerText(), /PP1[\s\S]*casca/);
      // janela com as cargas na base e os esforços por lado e pavimento
      await cartao.getByRole('button', { name: 'Resultados de PP1' }).click();
      const jp = page.getByRole('dialog', { name: /Resultados do elemento — Pilar-parede PP1/ });
      await jp.waitFor();
      await jp.locator('table[data-pp-base]').waitFor();
      assert.match(await jp.locator('table[data-pp-base]').innerText(), /Nd máx\./);
      const lado = jp.locator('details[data-pp-lado]').first();
      assert.ok(await lado.locator('tbody tr').count() >= 2);
      await jp.getByLabel('Caso').selectOption('G');
      assert.match(await lado.locator('tbody tr').first().innerText(), /-?\d/);
      await jp.getByRole('button', { name: 'Fechar' }).click();
      // a viga sobre a parede (apoio longitudinal) foi dimensionada e detalhada
      const cardVigas = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) });
      assert.ok(await cardVigas.locator('tbody tr').count() >= 3);
      // memorial: seção dos pilares-parede com a figura e as tabelas
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.innerText();
      assert.match(mt, /Pilares-parede/);
      assert.match(mt, /PP1 — cargas na base e esforços por lado/);
      assert.ok(await memo.locator('[data-memorial-pilares-parede] svg').count() >= 1);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // pranchas: formas e locação trazem PP1
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const tipo = page.getByLabel('Tipo de prancha');
      const prev = page.locator('.prancha-prev');
      await tipo.selectOption({ label: 'Formas' });
      await prev.locator('svg').waitFor();
      assert.match(await prev.textContent(), /PP1/);
      await tipo.selectOption({ label: 'Locação e cargas' });
      await prev.locator('svg').waitFor();
      assert.match(await prev.textContent(), /PP1/);
    },
  },
  {
    name: 'E1c: paredes de concreto (traçar na planta, abertura, empuxo de terra, fora do diafragma, janela com empuxo)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      await cmd('obra.definir {"profundidadeFundacao": 1}');
      await cmd('empuxo.tipo {"nome": "Aterro", "metodo": "repouso", "estratos": [{"espessura": 20, "gama": 18, "phi": 30}], "cotaAterro": 3}');
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.empuxos?.length > 0, null, { timeout: 20000 });
      const idEmp = await page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.empuxos[0].id);
      await cmd('caso.criar {"nome": "Empuxo", "natureza": "H", "empuxo": "' + idEmp + '"}');
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.casos?.some((c) => c.nome === 'Empuxo'), null, { timeout: 20000 });
      await cmd('laje.criar {"grupo": "g_3", "contorno": [[0, 0], [12, 0], [12, 6], [0, 6]], "tipo": {"tipo": "macica", "h": 0.12}}');
      // grupo Paredes: espessura 20 cm, morre no Tipo 3; traça as duas paredes na planta
      const gp = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Paredes/ }) });
      await gp.locator(':scope > summary').click();
      await gp.getByLabel('Espessura').first().fill('20');
      await gp.getByLabel('Morre em').selectOption({ label: 'Tipo 3' });
      await page.locator('.planta-cv[data-vista]').waitFor();
      await page.locator('.planta-st').click();
      await reenquadrarAte(page, [[0, 0], [12, 0], [12, 6], [0, 6]]);
      await gp.getByRole('button', { name: 'Traçar na planta' }).click();
      await page.mouse.click(...(await telaDe(page, 0, 0)));
      await page.mouse.click(...(await telaDe(page, 12, 0)));
      await page.keyboard.press('Enter');
      await gp.getByRole('button', { name: 'Traçar na planta' }).click();
      await page.mouse.click(...(await telaDe(page, 0, 6)));
      await page.mouse.click(...(await telaDe(page, 12, 6)));
      await page.keyboard.press('Enter');
      await gp.locator('table[data-pw-lista] tbody tr').nth(1).waitFor({ timeout: 20000 });
      assert.equal(await gp.locator('table[data-pw-lista] tbody tr').count(), 2);
      assert.match(await gp.locator('table[data-pw-lista]').innerText(), /M1[\s\S]*M2/);
      // M1: abertura de janela na base do Térreo
      await gp.getByRole('button', { name: 'Selecionar M1' }).click();
      const ed = gp.locator('[data-pw-editor]');
      const campo = (t) => ed.locator('label.field', { has: page.locator('.flabel', { hasText: new RegExp('^' + t + '$') }) }).locator('input');
      await ed.getByRole('radio', { name: 'janela' }).click();
      await campo('s').fill('400');
      await campo('Largura').fill('200');
      await campo('Peitoril').fill('50');
      await campo('Altura').fill('200');
      await ed.getByLabel('Pavimento da abertura').selectOption({ label: 'Térreo' });
      await ed.getByRole('button', { name: 'Acrescentar abertura' }).click();
      await gp.locator('table[data-pw-aberturas] tbody tr').waitFor({ timeout: 20000 });
      assert.equal(await gp.locator('table[data-pw-aberturas] tbody tr').count(), 1);
      // empuxo: M1 com o terreno à direita; M2 com o terreno à esquerda
      await ed.getByLabel('Caso do empuxo').selectOption({ label: 'Empuxo' });
      await ed.getByRole('radio', { name: 'terreno à direita' }).click();
      await ed.getByRole('button', { name: 'Aplicar empuxo' }).click();
      await gp.getByRole('button', { name: 'Selecionar M2' }).click();
      await ed.getByLabel('Caso do empuxo').selectOption({ label: 'Empuxo' });
      await ed.getByRole('radio', { name: 'terreno à esquerda' }).click();
      await ed.getByRole('button', { name: 'Aplicar empuxo' }).click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.every((w) => w.empuxos?.length === 1), null, { timeout: 20000 });
      const linhas = gp.locator('table[data-pw-lista] tbody tr');
      assert.match(await linhas.nth(0).innerText(), /sim/);
      assert.match(await linhas.nth(1).innerText(), /sim/);
      // verificação: a parede chega ao Tipo 3 e não há sobreposição nem abertura inválida
      await page.locator('.edif-tabs').getByRole('tab', { name: /^Verificação/ }).click();
      const out = await page.locator('.edif-out').innerText();
      // a tela mostra a mensagem (não o código): fora do diafragma no Térreo; sem sobreposição nem abertura inválida
      assert.match(out, /não toca laje em Térreo: fora do diafragma rígido/);
      assert.doesNotMatch(out, /sobreposta|abertura/i);
      // calcula e dimensiona
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 180000 });
      await livre();
      const cartao = page.locator('[data-pw-cartao]');
      await cartao.waitFor({ timeout: 30000 });
      assert.match(await cartao.innerText(), /M1/);
      assert.match(await cartao.innerText(), /M2/);
      // janela de M1: resultante do empuxo (Fy = 810 kN)
      await cartao.getByRole('button', { name: 'Resultados de M1' }).click();
      const jp = page.getByRole('dialog', { name: /M1/ });
      await jp.waitFor();
      const texto = await jp.locator('table[data-pw-empuxo]').innerText();
      assert.match(texto, /810/);
      await jp.getByRole('button', { name: 'Fechar' }).click();
    },
  },
  {
    name: 'E1d: armadura de paredes (janela com panos, bloqueio e desbloqueio, emendas, abertura, isovalores, muro de arrimo, memorial, resumo de aço e prancha de paredes)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperarModelo = (fn, arg, t = 20000) => page.waitForFunction(fn, arg, { timeout: t });
      // modelo enxuto: Térreo e Tipo 1, empuxo de terra, duas paredes de 12 m, uma abertura e um muro de arrimo
      await cmd('obra.definir {"profundidadeFundacao": 1}');
      await esperarModelo(() => !!JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pavimentos, null);
      let b0 = await modelo();
      for (const nome of ['Cobertura', 'Tipo 3', 'Tipo 2']) {
        const p = b0.pavimentos.find((x) => x.nome === nome);
        const antes = b0.pavimentos.length;
        await cmd('pavimento.remover {"id": "' + p.id + '"}');
        await esperarModelo((n) => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pavimentos?.length === n, antes - 1);
        b0 = await modelo();
      }
      assert.equal(b0.pavimentos.length, 2);
      const terreo = b0.pavimentos.find((p) => p.nome === 'Térreo'), tipo1 = b0.pavimentos.find((p) => p.nome === 'Tipo 1');
      await cmd('empuxo.tipo {"nome": "Aterro", "metodo": "repouso", "estratos": [{"espessura": 20, "gama": 18, "phi": 30}], "cotaAterro": 3}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.empuxos?.length > 0, null);
      const idEmp = (await modelo()).empuxos[0].id;
      await cmd('caso.criar {"nome": "Empuxo", "natureza": "H", "empuxo": "' + idEmp + '"}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.casos?.some((c) => c.nome === 'Empuxo'), null);
      const idCaso = (await modelo()).casos.find((c) => c.nome === 'Empuxo').id;
      await cmd('laje.criar {"grupo": "' + tipo1.grupo + '", "contorno": [[0, 0], [12, 0], [12, 6], [0, 6]], "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('parede.criar {"pontos": [[0, 0], [12, 0]], "espessura": 0.2, "morre": "' + tipo1.id + '"}');
      await cmd('parede.criar {"pontos": [[0, 6], [12, 6]], "espessura": 0.2, "morre": "' + tipo1.id + '"}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.length === 2, null);
      const ws = (await modelo()).paredes;
      const m1 = ws.find((w) => w.nome === 'M1').id, m2 = ws.find((w) => w.nome === 'M2').id;
      await cmd('parede.empuxo {"parede": "' + m1 + '", "empuxos": [{"caso": "' + idCaso + '", "lado": "dir"}]}');
      await cmd('parede.empuxo {"parede": "' + m2 + '", "empuxos": [{"caso": "' + idCaso + '", "lado": "esq"}]}');
      await cmd('parede.abertura {"parede": "' + m1 + '", "s": 5, "largura": 1, "altura": 2.1, "pavimento": "' + terreo.id + '"}');
      await esperarModelo((id) => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.find((w) => w.id === id)?.aberturas?.length === 1, m1);
      await cmd('muro.arrimo {"nome": "MA1", "H": 3, "tTopo": 0.2, "tBase": 0.3, "B": 2.6, "ponta": 0.5, "hBase": 0.4, "solo": {"gama": 18, "phi": 30, "metodo": "rankine"}, "sobrecarga": 10, "atrito": 0.6}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.murosArrimo?.length === 1, null);
      // 2. cálculo e grupo de muros na barra lateral
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 180000 });
      await page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      const gm = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Muros de arrimo/ }) });
      await gm.locator('table[data-mu-lista]').waitFor({ timeout: 30000 });
      assert.match(await gm.locator('table[data-mu-lista]').innerText(), /MA1/);
      assert.match(await gm.locator('table[data-mu-lista]').innerText(), /atende/);
      // 3. cartão de paredes com as colunas de armadura
      const cartao = page.locator('[data-pw-cartao]');
      await cartao.waitFor({ timeout: 30000 });
      assert.match(await cartao.innerText(), /M1/);
      assert.match(await cartao.innerText(), /Cumprimento mín\./);
      await cartao.getByRole('button', { name: 'Resultados de M1' }).click();
      const jp = page.getByRole('dialog', { name: /M1/ });
      await jp.waitFor();
      // 4. panos: malha bloqueada reprova; desbloquear volta à calculada
      assert.equal(await jp.locator('table[data-pw-panos] tbody tr').count(), 3);
      assert.match(await jp.locator('table[data-pw-panos] tbody tr').first().innerText(), /calculada/);
      await jp.locator('table[data-pw-panos] tbody tr').first().click();
      const edMalha = jp.locator('[data-pw-editor-malha]');
      await edMalha.getByLabel('φ vertical').selectOption({ label: '6,3' });
      await edMalha.getByLabel('s vertical').fill('40');
      await edMalha.getByLabel('φ horizontal').selectOption({ label: '6,3' });
      await edMalha.getByLabel('s horizontal').fill('40');
      await edMalha.getByRole('button', { name: 'Bloquear malha' }).click();
      await page.waitForFunction(() => document.querySelector('table[data-pw-panos] tbody tr')?.textContent?.includes('bloqueada'), null, { timeout: 90000 });
      const primeira = await jp.locator('table[data-pw-panos] tbody tr').first().innerText();
      assert.match(primeira, /bloqueada/);
      assert.match(primeira, /não atende/);
      assert.match(await jp.locator('ul[data-pw-mensagens]').innerText(), /Armadura bloqueada/);
      await edMalha.getByRole('button', { name: 'Desbloquear' }).click();
      await page.waitForFunction(() => document.querySelector('table[data-pw-panos] tbody tr')?.textContent?.includes('calculada'), null, { timeout: 90000 });
      // 5. emendas: tração e compressão editadas e depois voltar às calculadas
      assert.ok(await jp.locator('table[data-pw-emendas] tbody tr').count() >= 1);
      const edEm = jp.locator('[data-pw-editor-emendas]');
      await edEm.getByLabel('Tração').fill('20');
      await edEm.getByLabel('Compressão').fill('20');
      await edEm.getByRole('button', { name: 'Aplicar emendas' }).click();
      await jp.locator('table[data-pw-emendas]', { hasText: 'editada' }).waitFor({ timeout: 90000 });
      assert.match(await jp.locator('ul[data-pw-mensagens]').innerText(), /abaixo do mínimo/);
      await edEm.getByRole('button', { name: 'Voltar às calculadas' }).click();
      await jp.locator('table[data-pw-emendas]', { hasText: 'calculada' }).waitFor({ timeout: 90000 });
      // 6. abertura: armadura bloqueada, relatório e limpeza
      const tabAb = jp.locator('table[data-pw-aberturas-arm-lista] tbody tr');
      assert.equal(await tabAb.count(), 1);
      assert.match(await tabAb.first().innerText(), /porta/);
      await tabAb.first().click();
      const edAb = jp.locator('[data-pw-editor-abertura]');
      await edAb.getByLabel('Verga n').fill('4');
      await edAb.getByLabel('Verga φ').selectOption({ label: '16' });
      await edAb.getByLabel('Montante n').fill('6');
      await edAb.getByLabel('Montante φ').selectOption({ label: '16' });
      await jp.getByRole('button', { name: 'Bloquear armadura da abertura' }).click();
      await page.waitForFunction(() => document.querySelector('table[data-pw-aberturas-arm-lista] tbody tr')?.textContent?.includes('bloqueada'), null, { timeout: 90000 });
      await jp.locator('details[data-pw-relatorio-abertura] summary').click();
      const relAb = await jp.locator('details[data-pw-relatorio-abertura]').innerText();
      assert.match(relAb, /Necessária/);
      assert.match(relAb, /Cortante da verga/);
      await jp.getByRole('button', { name: 'Limpar armadura' }).click();
      await page.waitForFunction(() => document.querySelector('table[data-pw-aberturas-arm-lista] tbody tr')?.textContent?.includes('calculada'), null, { timeout: 90000 });
      // 7. isovalores: tensões e deslocamentos com legenda
      const iso = jp.locator('[data-pw-iso-svg] polygon');
      assert.ok(await iso.count() > 10);
      assert.match(await jp.locator('[data-pw-iso-leg]').first().innerText(), /mín\./);
      await jp.getByRole('radio', { name: 'deslocamentos' }).click();
      assert.ok(await iso.count() > 0);
      assert.match(await jp.locator('[data-pw-iso-leg]').first().innerText(), /mm/);
      await jp.getByRole('button', { name: 'Fechar' }).click();
      // 8. memorial do edifício: armadura das paredes, resumo de aço e muros
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const textoMemo = await memo.textContent();
      assert.match(textoMemo, /Armadura das paredes, pilares-parede e muros de arrimo/);
      assert.match(textoMemo, /Armadura por pano/);
      assert.equal(await memo.locator('[data-memorial-paredes="panos"]').count(), 1);
      assert.match(textoMemo, /Paredes e pilares-parede/);
      assert.match(textoMemo, /Muros de arrimo: estabilidade/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 9. resumo de aço com as paredes
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      assert.match(await page.locator('[data-resumo-aco]').innerText(), /Paredes e pilares-parede/);
      // 10. pranchas de paredes e escala
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      await page.getByLabel('Tipo de prancha').selectOption({ label: 'Armação de paredes e pilares-parede' });
      await page.locator('.prancha-prev[data-tipo="paredes"] svg').first().waitFor({ timeout: 90000 });
      assert.match(await page.locator('.prancha-prev[data-tipo="paredes"]').innerText(), /SCM/);
      assert.match(await page.locator('.prancha-prev[data-tipo="paredes"]').innerText(), /M1/);
      await page.locator('summary', { hasText: 'Opções de armação e locação' }).click();
      await page.getByLabel('Escala das elevações de paredes').selectOption({ label: '1:75' });
      await page.locator('.prancha-prev[data-tipo="paredes"][data-escala="75"]').waitFor({ timeout: 90000 });
    },
  },
  {
    name: 'FU7b: sapata corrida de paredes e muros (base da parede criada no lançamento, cargas das reações da base, momento e deslizamento do empuxo, editor da parede, opção de deslizamento, base do muro de arrimo na fundação, memorial e pranchas)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperarModelo = (fn, arg, t = 20000) => page.waitForFunction(fn, arg, { timeout: t });
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      const calcular = async () => {
        await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
        await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
        await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 180000 });
        await livre();
      };
      // 1. modelo enxuto: Térreo e Tipo 1, empuxo de terra, laje e duas paredes de 12 m com a base em sapata corrida (criadas no lançamento)
      await cmd('obra.definir {"profundidadeFundacao": 1}');
      await esperarModelo(() => !!JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pavimentos, null);
      let b0 = await modelo();
      for (const nome of ['Cobertura', 'Tipo 3', 'Tipo 2']) {
        const p = b0.pavimentos.find((x) => x.nome === nome);
        const antes = b0.pavimentos.length;
        await cmd('pavimento.remover {"id": "' + p.id + '"}');
        await esperarModelo((n) => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pavimentos?.length === n, antes - 1);
        b0 = await modelo();
      }
      const terreo = b0.pavimentos.find((p) => p.nome === 'Térreo'), tipo1 = b0.pavimentos.find((p) => p.nome === 'Tipo 1');
      await cmd('empuxo.tipo {"nome": "Aterro", "metodo": "repouso", "estratos": [{"espessura": 20, "gama": 18, "phi": 30}], "cotaAterro": 3}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.empuxos?.length > 0, null);
      const idEmp = (await modelo()).empuxos[0].id;
      await cmd('caso.criar {"nome": "Empuxo", "natureza": "H", "empuxo": "' + idEmp + '"}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.casos?.some((c) => c.nome === 'Empuxo'), null);
      const idCaso = (await modelo()).casos.find((c) => c.nome === 'Empuxo').id;
      await cmd('laje.criar {"grupo": "' + tipo1.grupo + '", "contorno": [[0, 0], [12, 0], [12, 6], [0, 6]], "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('fundacao.terreno {"sigmaAdm": 200}');
      await cmd('parede.criar {"pontos": [[0, 0], [12, 0]], "espessura": 0.2, "morre": "' + tipo1.id + '", "base": {"tipo": "sapataCorrida"}}');
      await cmd('parede.criar {"pontos": [[0, 6], [12, 6]], "espessura": 0.2, "morre": "' + tipo1.id + '", "base": {"tipo": "sapataCorrida"}}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.length === 2, null);
      const ws = (await modelo()).paredes;
      const m1 = ws.find((w) => w.nome === 'M1').id, m2 = ws.find((w) => w.nome === 'M2').id;
      await cmd('parede.empuxo {"parede": "' + m1 + '", "empuxos": [{"caso": "' + idCaso + '", "lado": "dir"}]}');
      await cmd('parede.empuxo {"parede": "' + m2 + '", "empuxos": [{"caso": "' + idCaso + '", "lado": "esq"}]}');
      // a base da parede criou as duas sapatas no mesmo passo (vinculadas às paredes)
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.fundacao?.corridas?.length === 2, null);
      const cs = (await modelo()).fundacao.corridas;
      assert.deepEqual(cs.map((c) => c.nome).sort(), ['SC-M1', 'SC-M2']);
      // este fluxo confere a verificação de cada sapata isolada (o conjunto travado pela laje é testado em sapataParede.test.ts)
      await cmd('opcoes.definir {"valores": {"fundCorridaDeslizGrupo": 0}}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.opcoes?.fundCorridaDeslizGrupo === 0, null);
      assert.equal(cs.find((c) => c.nome === 'SC-M1').parede, m1);
      // 2. cálculo: as sapatas aparecem no cartão com "parede M1" e o deslizamento da base sob o empuxo reprova (FS < 1,5)
      await calcular();
      const card = page.locator('[data-card-corridas]');
      await card.waitFor({ timeout: 30000 });
      assert.match(await card.innerText(), /SC-M1[\s\S]*parede M1/);
      assert.match(await card.innerText(), /SC-M2[\s\S]*parede M2/);
      assert.ok(await page.locator('[data-lista-erros]').locator('.tablewrap tbody tr', { hasText: 'FUND_CORRIDA_DESLIZA' }).count() >= 1, 'deslizamento reprovado');
      // 3. editor da parede M1: base da parede, resultados com momento, cortante e deslizamento
      const gp = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Paredes \(/ }) });
      if (!(await gp.evaluate((d) => d.open))) await gp.locator('summary').click();
      await gp.getByRole('button', { name: 'Selecionar M1' }).click();
      const base = page.locator('[data-pw-base-parede]');
      await base.waitFor({ timeout: 30000 });
      assert.equal(await base.getByLabel('Base da parede', { exact: true }).inputValue(), 'sapata');
      const txt = await base.innerText();
      assert.match(txt, /SC-M1: B \d+ × h \d+/);
      assert.match(txt, /Momento fora do plano/);
      assert.match(txt, /Cortante normal à parede/);
      assert.match(txt, /Deslizamento[\s\S]*FS 0,4/);
      assert.match(await gp.locator('table[data-pw-lista]').innerText(), /sapata corrida/);
      // atrito da sapata da parede: μ 0,9 (FS sobe, continua abaixo do mínimo); a mensagem do comando aparece na barra
      const atr = base.getByLabel('Atrito base-solo da sapata da parede (vazio = opção)', { exact: true });
      await atr.fill('0,9');
      await atr.press('Enter');
      await page.locator('.statusbar .msg', { hasText: /Sapata corrida SC-M1 da parede M1 alterada/ }).waitFor();
      await calcular();
      await gp.getByRole('button', { name: 'Selecionar M1' }).click();
      assert.match(await page.locator('[data-pw-base-parede]').innerText(), /Deslizamento[\s\S]*μ 0,9/);
      // 4. a opção "Reprovar o deslizamento (parede)" desligada: o erro some e o FS continua informado
      const gf = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Fundação \(/ }) });
      if (!(await gf.evaluate((d) => d.open))) await gf.locator(':scope > summary').click();
      const par = gf.locator('details', { has: page.locator(':scope > summary', { hasText: 'Parâmetros das sapatas corridas' }) }).first();
      if (!(await par.evaluate((d) => d.open))) await par.locator(':scope > summary').click();
      await par.getByLabel('Reprovar o deslizamento (parede)', { exact: true }).uncheck();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.opcoes?.fundCorridaDeslizamento === 0, null);
      await calcular();
      assert.equal(await page.locator('[data-lista-erros]').locator('.tablewrap tbody tr', { hasText: 'FUND_CORRIDA_DESLIZA' }).count(), 0);
      // 5. janela da sapata da parede (duplo clique no cartão): dados da parede e deslizamento
      await card.locator('tbody tr', { hasText: 'SC-M1' }).dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Sapata corrida SC-M1/ });
      await jan.waitFor();
      const tj = await jan.innerText();
      assert.match(tj, /Parede[\s\S]*M1/);
      assert.match(tj, /Momento fora do plano/);
      assert.match(tj, /Deslizamento/);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // 6. trocar a base da parede M2 para apoio direto pelo editor remove a sapata (e a de M1 fica)
      await gp.getByRole('button', { name: 'Selecionar M2' }).click();
      const base2 = page.locator('[data-pw-base-parede]');
      await base2.getByLabel('Base da parede', { exact: true }).selectOption('apoio');
      await page.locator('.statusbar .msg', { hasText: /Sapata da parede M2 removida/ }).waitFor();
      await base2.getByLabel('Aba da sapata da parede', { exact: true }).waitFor({ state: 'detached' });
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.fundacao?.corridas?.length === 1, null);
      assert.deepEqual((await modelo()).fundacao.corridas.map((c) => c.nome), ['SC-M1']);
      // 6b. lançamento pela planta com "Fundação da parede" = sapata corrida: a parede M3 já nasce com a sapata SC-M3
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await page.locator('.planta-cv[data-vista]').waitFor();
      await page.locator('.planta-st').click();
      await reenquadrarAte(page, [[0, 0], [12, 0], [12, 10], [0, 10]]);
      const lanc = gp.locator('[data-pw-lancar]');
      await lanc.getByLabel('Fundação da parede', { exact: true }).selectOption('sapata');
      await lanc.getByRole('button', { name: 'Traçar na planta' }).click();
      await page.mouse.click(...(await telaDe(page, 0, 10)));
      await page.mouse.click(...(await telaDe(page, 12, 10)));
      await page.keyboard.press('Enter');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.length === 3, null);
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.fundacao?.corridas?.length === 2, null);
      assert.deepEqual((await modelo()).fundacao.corridas.map((c) => c.nome).sort(), ['SC-M1', 'SC-M3']);
      // 7. muro de arrimo isolado com comprimento: base na fundação com a σadm do terreno
      await cmd('muro.arrimo {"nome": "MA1", "H": 3, "tTopo": 0.2, "tBase": 0.3, "B": 2.6, "ponta": 0.5, "hBase": 0.4, "solo": {"gama": 18, "phi": 30, "metodo": "rankine"}, "sobrecarga": 10, "atrito": 0.6, "comprimento": 20}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.murosArrimo?.length === 1, null);
      await calcular();
      const gm = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Muros de arrimo/ }) });
      const tb = gm.locator('table[data-mu-base]');
      await tb.waitFor({ timeout: 30000 });
      const tt = await tb.innerText();
      assert.match(tt, /MA1/);
      assert.match(tt, /terreno \(informada\)/);
      assert.match(tt, /20,8/); // concreto da base: 2,6 × 0,4 × 20 m
      const cardM = page.locator('[data-card-bases-muros]');
      await cardM.waitFor();
      assert.match(await cardM.innerText(), /MA1[\s\S]*terreno \(informada\)/);
      await tb.getByRole('button', { name: 'Resultados da base de MA1' }).click();
      const jm = page.getByRole('dialog', { name: /Resultados do elemento — Base do muro MA1/ });
      await jm.waitFor();
      assert.match(await jm.innerText(), /Quantitativos totais/);
      assert.match(await jm.innerText(), /σ máx\. \/ σadm/);
      await jm.getByRole('button', { name: 'Fechar' }).click();
      // 8. memorial do edifício: sapatas de parede e bases dos muros
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const textoMemo = await memo.textContent();
      assert.match(textoMemo, /Sapatas de parede e de muro/);
      assert.equal(await memo.locator('[data-memorial-corridas-parede]').count(), 1);
      assert.match(textoMemo, /Bases dos muros de arrimo na fundação/);
      assert.equal(await memo.locator('[data-memorial-bases-muros]').count(), 1);
      assert.match(textoMemo, /Base de muro de arrimo/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 9. pranchas do tipo Fundação: sapata da parede (momento e deslizamento) e quantitativos com a base do muro
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      await page.getByLabel('Tipo de prancha').selectOption({ label: 'Fundação (locação, detalhes e quantitativos)' });
      await page.waitForFunction(() => document.querySelector('.prancha-prev')?.getAttribute('data-tipo') === 'fundacao', null, { timeout: 90000 });
      await page.locator('[data-folha-item]', { hasText: /^.*Fundação — sapatas corridas(?! —)/ }).first().click();
      await page.waitForFunction(() => /Base da parede M1/.test(document.querySelector('.prancha-prev')?.textContent ?? ''), null, { timeout: 90000 });
      assert.match(await page.locator('.prancha-prev').innerText(), /deslizamento FS/);
      await page.locator('[data-folha-item]', { hasText: /quantitativos/i }).first().click();
      await page.waitForFunction(() => /Base de muro de arrimo/.test(document.querySelector('.prancha-prev')?.textContent ?? ''), null, { timeout: 90000 });
    },
  },
  {
    name: 'R7g: sugestões na legenda, janela do pilar (dados, taxa, situação e navegação), capacidade nas vigas, relatórios, gabarito e ponto fixo nas pranchas, memorial com listagem, índices e ELU por combinação',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
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
  },
  {
    name: 'N2e: apoios, limites e avisos de modelagem (suspensão no cruzamento, arredondamento, viga-parede, opções e memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      await cmd('vento.definir {"ativo": false}');
      // vigas A (y = 0) e C (y = 4) de 6 m em pilares nas pontas; B (x = 3) apoia-se nelas; e uma viga curta e alta (viga-parede)
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [0, 4], [6, 4], [10, 0], [11, 0]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0], 0.15, 0.4], [[0, 4], [6, 4], 0.15, 0.4], [[3, 0], [3, 4], 0.15, 0.4], [[10, 0], [11, 0], 0.15, 0.6]].map(([a, z, b, h]) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify([a, z])}, "secao": {"b": ${b}, "h": ${h}}}}`).join(', ') + ']}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await livre();
      // lista de erros e avisos: a viga curta e alta é viga-parede
      const lista = page.locator('[data-lista-erros]');
      await lista.locator('[data-contagem]').waitFor();
      await lista.locator('details summary').click();
      assert.match(await lista.locator('details').innerText(), /VIGA_PAREDE/);
      // opções novas no grupo Opções de cálculo, com a fonte e o padrão por perfil
      const g = page.locator('.edif-in details', { has: page.locator('summary', { hasText: 'Opções de cálculo' }) }).first();
      await g.locator('summary').click();
      const t = await g.innerText();
      assert.match(t, /Arredondamento do diagrama no apoio/);
      assert.match(t, /Vigas: armadura de suspensão nos apoios em vigas/);
      assert.match(t, /Desnível entre panos: limite da continuidade/);
      // memorial: critério de arredondamento, tabela de suspensão (A e C recebem a reação de B) e avisos
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const ap = await memo.locator('[data-memorial-apoios]').innerText();
      assert.match(ap, /parábola cúbica M\(x\) = a·x³/);
      assert.match(ap, /Armadura de suspensão \(NBR 6118, 18\.3\.6\)/);
      assert.equal(await memo.locator('[data-memorial-suspensao] tbody tr').count(), 2);
      assert.match(await memo.innerText(), /VIGA_PAREDE/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // perfil NBR: ΔM = R·t/8
      await cmd('opcoes.definir {"perfil": "nbr"}');
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await livre();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo2 = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo2.locator('[data-memorial-apoios]').innerText(), /ΔM = R·t\/8/);
      await memo2.getByRole('button', { name: 'Fechar' }).click();
    },
  },
  {
    name: 'N2f: flechas por etapas (etapas, limites por elemento, janela da viga, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      await cmd('vento.definir {"ativo": false}');
      // 4 pilares 20×40 nos cantos; vigas 15×50 no contorno (grupo g_3); laje maciça de 12 cm nos painéis
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[6, 0], [6, 5]], [[6, 5], [0, 5]], [[0, 5], [0, 0]]].map(([a, b]) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify([a, b])}, "secao": {"b": 0.15, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await livre();
      // 1) grupo Etapas de carga (flechas): quatro etapas padrão
      const etapas = page.locator('.edif-in details', { has: page.locator('summary', { hasText: 'Etapas de carga (flechas)' }) }).first();
      await etapas.locator('summary').click();
      assert.equal(await etapas.locator('[data-etapas] tbody tr').count(), 4);
      assert.equal(await etapas.locator('[data-etapas] tbody tr').first().locator('input').first().inputValue(), 'Desforma (peso próprio)');
      // colagem de uma etapa única: a lista vira uma linha
      await etapas.locator('textarea[aria-label="Etapas coladas"]').fill('A\t30\t1\t1\t1\t1');
      await etapas.getByRole('button', { name: 'Aplicar colagem' }).click();
      await livre();
      assert.equal(await etapas.locator('[data-etapas] tbody tr').count(), 1);
      await etapas.getByRole('button', { name: 'Voltar ao padrão' }).click();
      await livre();
      // 2) opções de cálculo com os limites de flecha
      const g = page.locator('.edif-in details', { has: page.locator('summary', { hasText: 'Opções de cálculo' }) }).first();
      await g.locator('summary').click();
      const t = await g.innerText();
      assert.match(t, /Limite da flecha ativa \(vão \/ …\)/);
      assert.match(t, /Fator simplificado da flecha ativa \(maciças\)/);
      // 3) limite de flecha ativa impossível para as vigas: erro FLECHA_ATIVA na lista
      await cmd('flechas.limites {"elemento": "viga", "tipo": "ativa", "limite": {"rel": 100000}}');
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await livre();
      const lista = page.locator('[data-lista-erros]');
      await lista.locator('[data-contagem]').waitFor();
      await lista.locator('details summary').click();
      assert.match(await lista.locator('details').innerText(), /FLECHA_ATIVA/);
      // 4) janela da viga: tabela de flechas com quatro linhas
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) }).locator('tbody tr').first().dblclick();
      const janela = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await janela.waitFor();
      assert.equal(await janela.locator('[data-flechas] tbody tr').count(), 4);
      assert.match(await janela.innerText(), /Ativa \(após as paredes\)/);
      await page.keyboard.press('Escape');
      // 5) memorial: etapas de carga e limites
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo.locator('[data-memorial-flechas]').innerText(), /Desforma \(peso próprio\)/);
      assert.match(await memo.locator('[data-memorial-flechas]').innerText(), /ℓ\/500 e 1 cm/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  },
  {
    name: 'L1: assistente de nova obra, dados gerais, etapas, versões no arquivo, recentes, exemplos, desfazer e texto de cargas',
    async run({ newPage, tmp }) {
      const page = await newPage(NO_PICKERS);
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const campo = async (loc, v) => { await loc.fill(v); await loc.press('Tab'); };
      const nPav = () => page.locator('.edpav tbody tr').count();
      await page.getByRole('button', { name: 'Nova obra…' }).click();
      const nova = page.getByRole('dialog', { name: 'Nova obra' });
      await nova.getByRole('button', { name: 'Assistente passo a passo' }).click();
      await nova.getByRole('button', { name: 'Avançar' }).click();
      await campo(nova.getByLabel('Nome da obra'), 'Obra L1 teste');
      await campo(nova.getByLabel('Descrição (linha 1)'), 'Residencial fictício');
      await campo(nova.getByLabel('Descrição (linha 2)'), 'Teste de interface');
      await campo(nova.getByLabel('Cidade'), 'Cidade X');
      await nova.getByRole('button', { name: 'Avançar' }).click();
      await campo(nova.getByLabel('fck'), '35');
      await nova.getByLabel('CAA').selectOption('III');
      await nova.getByRole('button', { name: 'Avançar' }).click();
      await campo(nova.getByLabel('Repetições 2'), '2');
      await nova.getByRole('button', { name: 'Avançar' }).click();
      await nova.getByLabel('Criar malha de eixos').check();
      await nova.getByRole('button', { name: 'Avançar' }).click();
      await campo(nova.getByLabel('Revestimento e piso'), '1,5');
      await nova.getByRole('button', { name: 'Avançar' }).click();
      assert.match(await nova.innerText(), /4 em 3 grupo\(s\)/);
      await nova.getByRole('button', { name: 'Criar obra' }).click();
      const gerais = page.getByRole('dialog', { name: 'Dados gerais da obra' });
      await gerais.waitFor();
      assert.equal(await gerais.getByLabel('Nome da obra').inputValue(), 'Obra L1 teste');
      assert.equal(await gerais.getByLabel('fck').inputValue(), '35');
      await campo(gerais.getByLabel('Descrição (linha 2)'), 'Teste de interface 2');
      await gerais.getByRole('button', { name: 'Concluir' }).click();
      assert.equal(await nPav(), 4);
      assert.match(await page.locator('[data-etapa="pavimentos"]').innerText(), /feito/);
      assert.match(await page.locator('[data-etapa="pilares"]').innerText(), /pendente/);
      const muros = await page.locator('[data-etapa="muros"]').innerText();
      assert.match(muros, /indispon/);
      assert.match(muros, /E1c/);
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.textContent();
      assert.match(mt, /Descrição.*Residencial fictício · Teste de interface 2/s);
      assert.match(mt, /Origem do lançamento.*Assistente de nova obra/s);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await campo(page.getByLabel('Cidade', { exact: true }), 'Cidade Y');
      const ga = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Arquivo e versões/ }) });
      await ga.locator(':scope > summary').click();
      await campo(ga.getByLabel('Versões anteriores no arquivo'), '2');
      const f = await downloadText(page, () => fileMenu(page, 'Salvar no computador'));
      const ws = JSON.parse(f.text);
      assert.equal(ws.building.obra.cidade, 'Cidade Y');
      assert.deepEqual(ws.versoes.map((v) => v.rotulo), ['obra.definir', 'obra.definir']);
      assert.equal(ws.versoes[1].building.obra.cidade, 'Cidade X');
      assert.equal(ws.versoes[0].building.obra.descricao[1], 'Teste de interface');
      const file = join(tmp, f.name);
      writeFileSync(file, f.text);
      const page2 = await newPage(NO_PICKERS);
      const [chooser] = await Promise.all([page2.waitForEvent('filechooser'), fileMenu(page2, 'Abrir trabalho do computador')]);
      await chooser.setFiles(file);
      await page2.locator('.statusbar .msg', { hasText: 'aberto de' }).waitFor();
      await page2.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const ga2 = page2.locator('details.group', { has: page2.locator(':scope > summary', { hasText: /^Arquivo e versões/ }) });
      await ga2.locator(':scope > summary').click();
      await ga2.getByRole('button', { name: 'Recuperar' }).click();
      await page2.waitForFunction(() => [...document.querySelectorAll('label.field')].find((l) => l.textContent.startsWith('Cidade'))?.querySelector('input')?.value === 'Cidade X');
      await page2.close();
      await page.getByRole('button', { name: 'Obras recentes…' }).click();
      const rec = page.getByRole('dialog', { name: 'Obras recentes' });
      await campo(rec.getByLabel('Buscar obra'), 'residencial');
      assert.ok((await rec.locator('.recente-nome', { hasText: 'Obra L1 teste' }).count()) >= 1);
      await campo(rec.getByLabel('Buscar obra'), 'zzzz');
      assert.equal(await rec.locator('.recente-nome', { hasText: 'Obra L1 teste' }).count(), 0);
      await campo(rec.getByLabel('Buscar obra'), '');
      await rec.getByRole('button', { name: 'Guardar na biblioteca' }).click();
      await rec.getByRole('button', { name: 'Abrir Obra L1 teste' }).waitFor();
      await rec.getByRole('button', { name: /Abrir exemplo Exemplo: com subsolo/ }).click();
      await rec.waitFor({ state: 'detached' });
      assert.equal(await nPav(), 5);
      await page.getByRole('button', { name: 'Nova obra…' }).click();
      const nova2 = page.getByRole('dialog', { name: 'Nova obra' });
      await nova2.getByRole('button', { name: 'Assistente passo a passo' }).click();
      for (let i = 0; i < 6; i++) await nova2.getByRole('button', { name: 'Avançar' }).click();
      await nova2.getByRole('button', { name: 'Criar obra' }).click();
      await page.getByRole('dialog', { name: 'Dados gerais da obra' }).getByRole('button', { name: 'Concluir' }).click();
      assert.equal(await nPav(), 5);
      await page.getByRole('button', { name: /Desfazer/ }).click();
      assert.equal(await nPav(), 0);
      await page.getByRole('button', { name: 'Nova obra…' }).click();
      const nova3 = page.getByRole('dialog', { name: 'Nova obra' });
      await nova3.getByRole('button', { name: 'Cargas de arquivo de texto' }).click();
      await nova3.getByRole('button', { name: 'Escolher arquivo de texto…' }).click();
      const imp = page.getByRole('dialog', { name: 'Importar cargas de texto' });
      await campo(imp.getByLabel('Nome da obra a criar'), 'Obra de arranques e2e');
      await campo(imp.getByLabel('Ou cole o texto aqui'), 'Pilar;Caso;N;Hx;Hy;Mx;My;bx;by\nP1;G;500,5;0;0;0;0;30;40\nP1;Q;100;0;0;0;0;30;40\nP2;G;300;0;0;0;0;25;25\n');
      assert.match(await imp.innerText(), /2 arranque\(s\), 2 hipótese\(s\)/);
      await imp.getByRole('button', { name: 'Criar obra e calcular fundações' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Obra só com arranques' }).waitFor({ timeout: 120000 });
    },
  },
  {
    name: 'N2g: resistência ao fogo (grupo Incêndio, TRRF, revestimento, card do Dimensionamento, erros e memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      const calcular = async () => {
        await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
        await livre();
      };
      await cmd('vento.definir {"ativo": false}');
      // 4 pilares 20×40 nos cantos; vigas 15×50 no contorno (grupo g_3); laje maciça de 12 cm nos painéis
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[6, 0], [6, 5]], [[6, 5], [0, 5]], [[0, 5], [0, 0]]].map(([a, b]) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify([a, b])}, "secao": {"b": 0.15, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await calcular();
      // sem a verificação ligada: nenhum card de fogo
      assert.equal(await page.locator('[data-card-fogo]').count(), 0);
      // 1) grupo Incêndio: liga a verificação e informa ocupação e altura (sugestão pela IT)
      const g = page.locator('.edif-in details', { has: page.locator('summary', { hasText: 'Incêndio' }) }).first();
      await g.locator('summary').click();
      await g.getByLabel('Verificar resistência ao fogo (NBR 15200)').check();
      await g.getByLabel('Ocupação (NBR 14432 / IT)').selectOption('D-1');
      assert.match(await g.innerText(), /Sugestão: TRRF de \d+ min/);
      assert.ok((await g.locator('[data-fogo-grupos] tbody tr').count()) >= 1);
      // 2) TRRF de 120 min no grupo g_3 (linha de comando) reprova as vigas: erro FOGO_TRRF
      await cmd('fogo.definir {"trrf": {"g_3": 120}}');
      await calcular();
      const lista = page.locator('[data-lista-erros]');
      await lista.locator('[data-contagem]').waitFor();
      await lista.locator('details summary').click();
      assert.match(await lista.locator('details').innerText(), /FOGO_TRRF/);
      // 3) card do Dimensionamento: elementos com TRRF, TRF e folga; as vigas não atendem
      const card = page.locator('[data-card-fogo]');
      await card.waitFor();
      assert.match(await card.innerText(), /TRRF \(min\)/);
      assert.ok((await card.locator('tbody tr', { hasText: 'viga' }).filter({ hasText: 'não atende' }).count()) >= 1);
      // 4) revestimento de 60 mm de argamassa de cimento e areia no grupo: as vigas passam a atender
      await cmd('fogo.definir {"revestimentos": {"g_3": {"material": "cimento", "espessura": 60}}}');
      await calcular();
      assert.equal(await card.locator('tbody tr', { hasText: 'viga' }).filter({ hasText: 'não atende' }).count(), 0);
      // 5) janela da viga pelo duplo clique no card
      await card.locator('tbody tr', { hasText: 'viga' }).first().dblclick();
      await page.getByRole('dialog', { name: /Resultados do elemento — Viga/ }).waitFor();
      await page.keyboard.press('Escape');
      // 6) memorial: seção Resistência ao fogo com a tabela por elemento
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mf = await memo.locator('[data-memorial-fogo]').innerText();
      assert.match(mf, /NBR 15200/);
      assert.match(mf, /Tabela 9 \(vigas contínuas ou de pórtico\)|Tabela 8 \(vigas biapoiadas\)/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 7) desligar a verificação: o card some
      await g.getByLabel('Verificar resistência ao fogo (NBR 15200)').uncheck();
      await calcular();
      assert.equal(await page.locator('[data-card-fogo]').count(), 0);
    },
  },
  {
    name: 'E1e: alvenaria estrutural (blocos e tipos no grupo, paredes de blocos, janela com panos, verga e modulação, quantitativo, cartão, memorial e biblioteca)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperarModelo = (fn, arg, t = 20000) => page.waitForFunction(fn, arg, { timeout: t });
      // 1. modelo enxuto: Térreo e Tipo 1 (como no E1d)
      await cmd('obra.definir {"profundidadeFundacao": 1}');
      await esperarModelo(() => !!JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pavimentos, null);
      let b0 = await modelo();
      for (const nome of ['Cobertura', 'Tipo 3', 'Tipo 2']) {
        const p = b0.pavimentos.find((x) => x.nome === nome);
        const antes = b0.pavimentos.length;
        await cmd('pavimento.remover {"id": "' + p.id + '"}');
        await esperarModelo((n) => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pavimentos?.length === n, antes - 1);
        b0 = await modelo();
      }
      const terreo = b0.pavimentos.find((p) => p.nome === 'Térreo'), tipo1 = b0.pavimentos.find((p) => p.nome === 'Tipo 1');
      // 2. grupo "Alvenaria estrutural": bloco e tipo de blocos pela interface
      const ga = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Alvenaria estrutural/ }) });
      await ga.evaluate((el) => { el.open = true; });
      const eb = ga.locator('[data-alv-editor-bloco]');
      await eb.getByLabel('Bloco: nome', { exact: true }).fill('B20');
      await eb.getByLabel(/^Bloco: comprimento/).fill('40');
      await eb.getByLabel(/^Bloco: largura/).fill('20');
      await eb.getByLabel(/^Bloco: altura/).fill('20');
      await eb.getByLabel(/^Bloco: fbk/).fill('8');
      await eb.getByRole('button', { name: 'Criar bloco', exact: true }).click();
      await ga.locator('table[data-alv-blocos] tbody tr').waitFor({ timeout: 20000 });
      assert.match(await ga.locator('table[data-alv-blocos]').innerText(), /40 × 20 × 20 cm/);
      assert.match(await ga.locator('table[data-alv-blocos]').innerText(), /automático \(não\)/);
      const et = ga.locator('[data-alv-editor-tipo]');
      await et.getByLabel('Tipo de alvenaria: nome', { exact: true }).fill('Blocos B20');
      await et.getByLabel(/^Tipo de alvenaria: peso específico/).fill('14');
      await et.getByRole('button', { name: 'Criar tipo de alvenaria', exact: true }).click();
      await ga.locator('table[data-alv-tipos] tbody tr').waitFor({ timeout: 20000 });
      const linhaTipo = await ga.locator('table[data-alv-tipos] tbody tr').first().innerText();
      assert.match(linhaTipo, /Blocos B20/);
      assert.match(linhaTipo, /2,24/); // fd = 0,7 · (0,8 · 8) / 2
      // edição do tipo: prisma informado de 10 MPa → fd = 3,50 MPa
      await ga.getByRole('button', { name: 'Editar tipo Blocos B20', exact: true }).click();
      await et.getByLabel(/^Tipo de alvenaria: prisma fpk/).fill('10');
      await et.getByRole('button', { name: 'Salvar tipo de alvenaria', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('table[data-alv-tipos] tbody tr')?.textContent?.includes('3,50'), null, { timeout: 20000 });
      // 3. duas paredes de blocos de 12 m com laje maciça e uma porta fora da modulação
      const mat = (await modelo()).tiposAlvenaria[0].id;
      await cmd('laje.criar {"grupo": "' + tipo1.grupo + '", "contorno": [[0, 0], [12, 0], [12, 6], [0, 6]], "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('parede.criar {"pontos": [[0, 0], [12, 0]], "espessura": 0.2, "tipo": "blocos", "material": "' + mat + '", "morre": "' + tipo1.id + '"}');
      await cmd('parede.criar {"pontos": [[0, 6], [12, 6]], "espessura": 0.2, "tipo": "blocos", "material": "' + mat + '", "morre": "' + tipo1.id + '"}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.length === 2, null);
      const m1 = (await modelo()).paredes.find((w) => w.nome === 'M1').id;
      await cmd('parede.abertura {"parede": "' + m1 + '", "s": 5.07, "largura": 0.9, "altura": 2.1, "pavimento": "' + terreo.id + '"}');
      await esperarModelo((id) => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.find((w) => w.id === id)?.aberturas?.length === 1, m1);
      // o tipo em uso não sai
      await ga.getByRole('button', { name: 'Remover tipo Blocos B20', exact: true }).click();
      assert.match(await ga.locator('[data-alv-msg]').innerText(), /Há paredes com este tipo de alvenaria/);
      // lista de paredes mostra o tipo
      const gp = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Paredes \(/ }) });
      assert.match(await gp.locator('table[data-pw-lista]').innerText(), /Blocos \(Blocos B20\)/);
      // 4. cálculo e cartões
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 180000 });
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 180000 });
      await livre();
      const cartao = page.locator('[data-pw-cartao]');
      await cartao.waitFor({ timeout: 30000 });
      assert.match(await cartao.innerText(), /Blocos \(Blocos B20\)/);
      assert.match(await cartao.innerText(), /Cumprimento mín\./);
      const ca = page.locator('[data-alv-cartao]');
      await ca.waitFor({ timeout: 30000 });
      assert.ok(await ca.locator('table[data-alv-resumo-blocos] tbody tr').count() >= 1);
      assert.match(await ca.locator('table[data-alv-resumo-blocos]').innerText(), /B20/);
      // 5. janela de M1: panos, quantitativo, verga e modulação
      await cartao.getByRole('button', { name: 'Resultados de M1' }).click();
      const jp = page.getByRole('dialog', { name: /M1/ });
      await jp.waitFor();
      const raiz = jp.locator('[data-alv-parede]');
      assert.equal(await raiz.locator('table[data-alv-panos] tbody tr').count(), 3);
      assert.match(await raiz.locator('[data-alv-situacao]').innerText(), /Blocos B20.*não armada/);
      assert.match(await raiz.locator('table[data-alv-quant]').innerText(), /Total/);
      assert.equal(await raiz.locator('table[data-alv-vergas] tbody tr').count(), 1);
      assert.match(await raiz.locator('table[data-alv-vergas] tbody tr').first().innerText(), /porta[\s\S]*não/);
      assert.match(await raiz.innerText(), /Nenhum pilar em contato com esta parede/);
      await raiz.getByRole('button', { name: 'Ajustar aberturas à modulação', exact: true }).click();
      await page.waitForFunction(() => /sim/.test(document.querySelector('table[data-alv-vergas] tbody tr')?.textContent ?? ''), null, { timeout: 180000 });
      assert.match(await raiz.locator('table[data-alv-vergas] tbody tr').first().innerText(), /1,00 × 2,20 m/);
      // verga bloqueada e depois limpa
      await raiz.locator('table[data-alv-vergas] tbody tr').first().click();
      const ev = raiz.locator('[data-alv-editor-verga]');
      await ev.getByLabel(/^Verga: n/).fill('2');
      await ev.getByLabel(/^Verga: φ/).selectOption({ label: '12,5' });
      await raiz.getByRole('button', { name: 'Bloquear verga', exact: true }).click();
      await page.waitForFunction(() => /bloqueada/.test(document.querySelector('table[data-alv-vergas] tbody tr')?.textContent ?? ''), null, { timeout: 180000 });
      await raiz.getByRole('button', { name: 'Limpar verga', exact: true }).click();
      await page.waitForFunction(() => /calculada/.test(document.querySelector('table[data-alv-vergas] tbody tr')?.textContent ?? ''), null, { timeout: 180000 });
      assert.ok(await raiz.locator('ul[data-alv-mensagens], p.muted').count() >= 1);
      assert.ok(await jp.locator('[data-pw-iso-svg] polygon').count() > 10);
      await jp.getByRole('button', { name: 'Fechar' }).click();
      // 6. memorial do edifício
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const textoMemo = await memo.textContent();
      assert.match(textoMemo, /Alvenaria estrutural e blocos de concreto/);
      assert.match(textoMemo, /Verificação das tensões-limite por pano/);
      assert.equal(await memo.locator('[data-memorial-alvenaria="alv-panos"]').count(), 1);
      assert.equal(await memo.locator('[data-memorial-alvenaria="alv-blocos"]').count(), 1);
      assert.match(textoMemo, /Quantitativo de blocos por parede e pavimento/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 7. biblioteca do usuário: gravar e trazer (nada novo na mesma obra)
      await ga.locator('details[data-alv-biblioteca] > summary').click();
      await ga.getByLabel('Nome na biblioteca de alvenaria', { exact: true }).fill('Minha alvenaria');
      await ga.getByLabel('Nome na biblioteca de alvenaria', { exact: true }).press('Enter'); // TextField confirma no Enter/blur
      await ga.getByRole('button', { name: 'Gravar alvenaria da obra', exact: true }).click();
      await page.waitForFunction(() => [...document.querySelectorAll('select option')].some((o) => o.textContent?.includes('Minha alvenaria')), null, { timeout: 20000 });
      await ga.getByLabel(/^Alvenaria gravada/).selectOption({ index: 1 }); // índice 0 é “— escolha —”
      await ga.getByRole('button', { name: 'Trazer para a obra', exact: true }).click();
      assert.match(await ga.locator('[data-alv-msg-biblioteca]').innerText(), /Nada novo/);
    },
  },
  {
    name: 'R7g: sugestões na legenda, janela do pilar (dados, taxa, situação e navegação), capacidade nas vigas, relatórios, gabarito e ponto fixo nas pranchas, memorial com listagem, índices e ELU por combinação',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
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
  },
  {
    name: 'N2e: apoios, limites e avisos de modelagem (suspensão no cruzamento, arredondamento, viga-parede, opções e memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      await cmd('vento.definir {"ativo": false}');
      // vigas A (y = 0) e C (y = 4) de 6 m em pilares nas pontas; B (x = 3) apoia-se nelas; e uma viga curta e alta (viga-parede)
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [0, 4], [6, 4], [10, 0], [11, 0]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0], 0.15, 0.4], [[0, 4], [6, 4], 0.15, 0.4], [[3, 0], [3, 4], 0.15, 0.4], [[10, 0], [11, 0], 0.15, 0.6]].map(([a, z, b, h]) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify([a, z])}, "secao": {"b": ${b}, "h": ${h}}}}`).join(', ') + ']}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await livre();
      // lista de erros e avisos: a viga curta e alta é viga-parede
      const lista = page.locator('[data-lista-erros]');
      await lista.locator('[data-contagem]').waitFor();
      await lista.locator('details summary').click();
      assert.match(await lista.locator('details').innerText(), /VIGA_PAREDE/);
      // opções novas no grupo Opções de cálculo, com a fonte e o padrão por perfil
      const g = page.locator('.edif-in details', { has: page.locator('summary', { hasText: 'Opções de cálculo' }) }).first();
      await g.locator('summary').click();
      const t = await g.innerText();
      assert.match(t, /Arredondamento do diagrama no apoio/);
      assert.match(t, /Vigas: armadura de suspensão nos apoios em vigas/);
      assert.match(t, /Desnível entre panos: limite da continuidade/);
      // memorial: critério de arredondamento, tabela de suspensão (A e C recebem a reação de B) e avisos
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const ap = await memo.locator('[data-memorial-apoios]').innerText();
      assert.match(ap, /parábola cúbica M\(x\) = a·x³/);
      assert.match(ap, /Armadura de suspensão \(NBR 6118, 18\.3\.6\)/);
      assert.equal(await memo.locator('[data-memorial-suspensao] tbody tr').count(), 2);
      assert.match(await memo.innerText(), /VIGA_PAREDE/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // perfil NBR: ΔM = R·t/8
      await cmd('opcoes.definir {"perfil": "nbr"}');
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await livre();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo2 = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo2.locator('[data-memorial-apoios]').innerText(), /ΔM = R·t\/8/);
      await memo2.getByRole('button', { name: 'Fechar' }).click();
    },
  },
  {
    name: 'N2f: flechas por etapas (etapas, limites por elemento, janela da viga, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      await cmd('vento.definir {"ativo": false}');
      // 4 pilares 20×40 nos cantos; vigas 15×50 no contorno (grupo g_3); laje maciça de 12 cm nos painéis
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[6, 0], [6, 5]], [[6, 5], [0, 5]], [[0, 5], [0, 0]]].map(([a, b]) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify([a, b])}, "secao": {"b": 0.15, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await livre();
      // 1) grupo Etapas de carga (flechas): quatro etapas padrão
      const etapas = page.locator('.edif-in details', { has: page.locator('summary', { hasText: 'Etapas de carga (flechas)' }) }).first();
      await etapas.locator('summary').click();
      assert.equal(await etapas.locator('[data-etapas] tbody tr').count(), 4);
      assert.equal(await etapas.locator('[data-etapas] tbody tr').first().locator('input').first().inputValue(), 'Desforma (peso próprio)');
      // colagem de uma etapa única: a lista vira uma linha
      await etapas.locator('textarea[aria-label="Etapas coladas"]').fill('A\t30\t1\t1\t1\t1');
      await etapas.getByRole('button', { name: 'Aplicar colagem' }).click();
      await livre();
      assert.equal(await etapas.locator('[data-etapas] tbody tr').count(), 1);
      await etapas.getByRole('button', { name: 'Voltar ao padrão' }).click();
      await livre();
      // 2) opções de cálculo com os limites de flecha
      const g = page.locator('.edif-in details', { has: page.locator('summary', { hasText: 'Opções de cálculo' }) }).first();
      await g.locator('summary').click();
      const t = await g.innerText();
      assert.match(t, /Limite da flecha ativa \(vão \/ …\)/);
      assert.match(t, /Fator simplificado da flecha ativa \(maciças\)/);
      // 3) limite de flecha ativa impossível para as vigas: erro FLECHA_ATIVA na lista
      await cmd('flechas.limites {"elemento": "viga", "tipo": "ativa", "limite": {"rel": 100000}}');
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await livre();
      const lista = page.locator('[data-lista-erros]');
      await lista.locator('[data-contagem]').waitFor();
      await lista.locator('details summary').click();
      assert.match(await lista.locator('details').innerText(), /FLECHA_ATIVA/);
      // 4) janela da viga: tabela de flechas com quatro linhas
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) }).locator('tbody tr').first().dblclick();
      const janela = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await janela.waitFor();
      assert.equal(await janela.locator('[data-flechas] tbody tr').count(), 4);
      assert.match(await janela.innerText(), /Ativa \(após as paredes\)/);
      await page.keyboard.press('Escape');
      // 5) memorial: etapas de carga e limites
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo.locator('[data-memorial-flechas]').innerText(), /Desforma \(peso próprio\)/);
      assert.match(await memo.locator('[data-memorial-flechas]').innerText(), /ℓ\/500 e 1 cm/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  },
  {
    name: 'L1: assistente de nova obra, dados gerais, etapas, versões no arquivo, recentes, exemplos, desfazer e texto de cargas',
    async run({ newPage, tmp }) {
      const page = await newPage(NO_PICKERS);
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const campo = async (loc, v) => { await loc.fill(v); await loc.press('Tab'); };
      const nPav = () => page.locator('.edpav tbody tr').count();
      await page.getByRole('button', { name: 'Nova obra…' }).click();
      const nova = page.getByRole('dialog', { name: 'Nova obra' });
      await nova.getByRole('button', { name: 'Assistente passo a passo' }).click();
      await nova.getByRole('button', { name: 'Avançar' }).click();
      await campo(nova.getByLabel('Nome da obra'), 'Obra L1 teste');
      await campo(nova.getByLabel('Descrição (linha 1)'), 'Residencial fictício');
      await campo(nova.getByLabel('Descrição (linha 2)'), 'Teste de interface');
      await campo(nova.getByLabel('Cidade'), 'Cidade X');
      await nova.getByRole('button', { name: 'Avançar' }).click();
      await campo(nova.getByLabel('fck'), '35');
      await nova.getByLabel('CAA').selectOption('III');
      await nova.getByRole('button', { name: 'Avançar' }).click();
      await campo(nova.getByLabel('Repetições 2'), '2');
      await nova.getByRole('button', { name: 'Avançar' }).click();
      await nova.getByLabel('Criar malha de eixos').check();
      await nova.getByRole('button', { name: 'Avançar' }).click();
      await campo(nova.getByLabel('Revestimento e piso'), '1,5');
      await nova.getByRole('button', { name: 'Avançar' }).click();
      assert.match(await nova.innerText(), /4 em 3 grupo\(s\)/);
      await nova.getByRole('button', { name: 'Criar obra' }).click();
      const gerais = page.getByRole('dialog', { name: 'Dados gerais da obra' });
      await gerais.waitFor();
      assert.equal(await gerais.getByLabel('Nome da obra').inputValue(), 'Obra L1 teste');
      assert.equal(await gerais.getByLabel('fck').inputValue(), '35');
      await campo(gerais.getByLabel('Descrição (linha 2)'), 'Teste de interface 2');
      await gerais.getByRole('button', { name: 'Concluir' }).click();
      assert.equal(await nPav(), 4);
      assert.match(await page.locator('[data-etapa="pavimentos"]').innerText(), /feito/);
      assert.match(await page.locator('[data-etapa="pilares"]').innerText(), /pendente/);
      const muros = await page.locator('[data-etapa="muros"]').innerText();
      assert.match(muros, /indispon/);
      assert.match(muros, /E1c/);
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.textContent();
      assert.match(mt, /Descrição.*Residencial fictício · Teste de interface 2/s);
      assert.match(mt, /Origem do lançamento.*Assistente de nova obra/s);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await campo(page.getByLabel('Cidade', { exact: true }), 'Cidade Y');
      const ga = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Arquivo e versões/ }) });
      await ga.locator(':scope > summary').click();
      await campo(ga.getByLabel('Versões anteriores no arquivo'), '2');
      const f = await downloadText(page, () => fileMenu(page, 'Salvar no computador'));
      const ws = JSON.parse(f.text);
      assert.equal(ws.building.obra.cidade, 'Cidade Y');
      assert.deepEqual(ws.versoes.map((v) => v.rotulo), ['obra.definir', 'obra.definir']);
      assert.equal(ws.versoes[1].building.obra.cidade, 'Cidade X');
      assert.equal(ws.versoes[0].building.obra.descricao[1], 'Teste de interface');
      const file = join(tmp, f.name);
      writeFileSync(file, f.text);
      const page2 = await newPage(NO_PICKERS);
      const [chooser] = await Promise.all([page2.waitForEvent('filechooser'), fileMenu(page2, 'Abrir trabalho do computador')]);
      await chooser.setFiles(file);
      await page2.locator('.statusbar .msg', { hasText: 'aberto de' }).waitFor();
      await page2.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const ga2 = page2.locator('details.group', { has: page2.locator(':scope > summary', { hasText: /^Arquivo e versões/ }) });
      await ga2.locator(':scope > summary').click();
      await ga2.getByRole('button', { name: 'Recuperar' }).click();
      await page2.waitForFunction(() => [...document.querySelectorAll('label.field')].find((l) => l.textContent.startsWith('Cidade'))?.querySelector('input')?.value === 'Cidade X');
      await page2.close();
      await page.getByRole('button', { name: 'Obras recentes…' }).click();
      const rec = page.getByRole('dialog', { name: 'Obras recentes' });
      await campo(rec.getByLabel('Buscar obra'), 'residencial');
      assert.ok((await rec.locator('.recente-nome', { hasText: 'Obra L1 teste' }).count()) >= 1);
      await campo(rec.getByLabel('Buscar obra'), 'zzzz');
      assert.equal(await rec.locator('.recente-nome', { hasText: 'Obra L1 teste' }).count(), 0);
      await campo(rec.getByLabel('Buscar obra'), '');
      await rec.getByRole('button', { name: 'Guardar na biblioteca' }).click();
      await rec.getByRole('button', { name: 'Abrir Obra L1 teste' }).waitFor();
      await rec.getByRole('button', { name: /Abrir exemplo Exemplo: com subsolo/ }).click();
      await rec.waitFor({ state: 'detached' });
      assert.equal(await nPav(), 5);
      await page.getByRole('button', { name: 'Nova obra…' }).click();
      const nova2 = page.getByRole('dialog', { name: 'Nova obra' });
      await nova2.getByRole('button', { name: 'Assistente passo a passo' }).click();
      for (let i = 0; i < 6; i++) await nova2.getByRole('button', { name: 'Avançar' }).click();
      await nova2.getByRole('button', { name: 'Criar obra' }).click();
      await page.getByRole('dialog', { name: 'Dados gerais da obra' }).getByRole('button', { name: 'Concluir' }).click();
      assert.equal(await nPav(), 5);
      await page.getByRole('button', { name: /Desfazer/ }).click();
      assert.equal(await nPav(), 0);
      await page.getByRole('button', { name: 'Nova obra…' }).click();
      const nova3 = page.getByRole('dialog', { name: 'Nova obra' });
      await nova3.getByRole('button', { name: 'Cargas de arquivo de texto' }).click();
      await nova3.getByRole('button', { name: 'Escolher arquivo de texto…' }).click();
      const imp = page.getByRole('dialog', { name: 'Importar cargas de texto' });
      await campo(imp.getByLabel('Nome da obra a criar'), 'Obra de arranques e2e');
      await campo(imp.getByLabel('Ou cole o texto aqui'), 'Pilar;Caso;N;Hx;Hy;Mx;My;bx;by\nP1;G;500,5;0;0;0;0;30;40\nP1;Q;100;0;0;0;0;30;40\nP2;G;300;0;0;0;0;25;25\n');
      assert.match(await imp.innerText(), /2 arranque\(s\), 2 hipótese\(s\)/);
      await imp.getByRole('button', { name: 'Criar obra e calcular fundações' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Obra só com arranques' }).waitFor({ timeout: 120000 });
    },
  },
  {
    name: 'N2g: resistência ao fogo (grupo Incêndio, TRRF, revestimento, card do Dimensionamento, erros e memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      const calcular = async () => {
        await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
        await livre();
      };
      await cmd('vento.definir {"ativo": false}');
      // 4 pilares 20×40 nos cantos; vigas 15×50 no contorno (grupo g_3); laje maciça de 12 cm nos painéis
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[6, 0], [6, 5]], [[6, 5], [0, 5]], [[0, 5], [0, 0]]].map(([a, b]) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify([a, b])}, "secao": {"b": 0.15, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await calcular();
      // sem a verificação ligada: nenhum card de fogo
      assert.equal(await page.locator('[data-card-fogo]').count(), 0);
      // 1) grupo Incêndio: liga a verificação e informa ocupação e altura (sugestão pela IT)
      const g = page.locator('.edif-in details', { has: page.locator('summary', { hasText: 'Incêndio' }) }).first();
      await g.locator('summary').click();
      await g.getByLabel('Verificar resistência ao fogo (NBR 15200)').check();
      await g.getByLabel('Ocupação (NBR 14432 / IT)').selectOption('D-1');
      assert.match(await g.innerText(), /Sugestão: TRRF de \d+ min/);
      assert.ok((await g.locator('[data-fogo-grupos] tbody tr').count()) >= 1);
      // 2) TRRF de 120 min no grupo g_3 (linha de comando) reprova as vigas: erro FOGO_TRRF
      await cmd('fogo.definir {"trrf": {"g_3": 120}}');
      await calcular();
      const lista = page.locator('[data-lista-erros]');
      await lista.locator('[data-contagem]').waitFor();
      await lista.locator('details summary').click();
      assert.match(await lista.locator('details').innerText(), /FOGO_TRRF/);
      // 3) card do Dimensionamento: elementos com TRRF, TRF e folga; as vigas não atendem
      const card = page.locator('[data-card-fogo]');
      await card.waitFor();
      assert.match(await card.innerText(), /TRRF \(min\)/);
      assert.ok((await card.locator('tbody tr', { hasText: 'viga' }).filter({ hasText: 'não atende' }).count()) >= 1);
      // 4) revestimento de 60 mm de argamassa de cimento e areia no grupo: as vigas passam a atender
      await cmd('fogo.definir {"revestimentos": {"g_3": {"material": "cimento", "espessura": 60}}}');
      await calcular();
      assert.equal(await card.locator('tbody tr', { hasText: 'viga' }).filter({ hasText: 'não atende' }).count(), 0);
      // 5) janela da viga pelo duplo clique no card
      await card.locator('tbody tr', { hasText: 'viga' }).first().dblclick();
      await page.getByRole('dialog', { name: /Resultados do elemento — Viga/ }).waitFor();
      await page.keyboard.press('Escape');
      // 6) memorial: seção Resistência ao fogo com a tabela por elemento
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mf = await memo.locator('[data-memorial-fogo]').innerText();
      assert.match(mf, /NBR 15200/);
      assert.match(mf, /Tabela 9 \(vigas contínuas ou de pórtico\)|Tabela 8 \(vigas biapoiadas\)/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 7) desligar a verificação: o card some
      await g.getByLabel('Verificar resistência ao fogo (NBR 15200)').uncheck();
      await calcular();
      assert.equal(await page.locator('[data-card-fogo]').count(), 0);
    },
  },
  {
    name: 'E2a: seção das vigas (T com mesa colaborante, chata, não estrutural e de amarração), detalhe com barras de canto da mesa e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperar = (fn, arg, t = 30000) => page.waitForFunction(fn, arg, { timeout: t });
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [10, 0], [0, 4], [5, 4], [10, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [10, 0]], [[0, 4], [10, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]], [[10, 0], [10, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.length === 2, null);
      // seleciona a viga da linha `i` da tabela (V1 = 0 … V4 = 3) e devolve o editor de seção
      const gvigas = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Vigas — / }) });
      await gvigas.locator(':scope > summary').click();
      await page.locator('summary', { hasText: 'Vínculos, flambagem e cobrimento' }).click();
      const editor = async (i) => {
        await gvigas.locator('table.quadro tbody tr').nth(i).locator('td').nth(3).click();
        const sv = page.locator('[data-secao-viga]');
        await sv.waitFor();
        return sv;
      };
      // 1. V4 (x = 5, laje dos dois lados, 1 vão de 4 m): T automática, a = 4 m, b1 = 0,1·a = 40 cm, bf = 20 + 80 = 100 cm
      let sv = await editor(3);
      assert.equal(await sv.locator('svg[data-secao-previa]').getAttribute('data-secao-previa'), 'ret');
      await sv.getByLabel(/^Tipo da seção/).selectOption('T');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.some((v) => v.mesa?.tipo === 'T'), null);
      assert.match(await sv.innerText(), /Seção T: bf = 100 cm \(NBR 6118 14\.6\.2\.2: a = 4 m, abas 40 e 40 cm\), hf = 12 cm/);
      assert.equal(await sv.locator('svg[data-secao-previa]').getAttribute('data-secao-previa'), 'T');
      // bf informada (90 cm) prevalece; vazio volta à colaborante
      await sv.getByLabel(/^Largura da mesa bf/).fill('90');
      await sv.getByLabel(/^Largura da mesa bf/).press('Enter');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.some((v) => v.mesa?.bf === 0.9), null);
      assert.match(await sv.innerText(), /bf = 90 cm informada/);
      await sv.getByLabel(/^Largura da mesa bf/).fill('');
      await sv.getByLabel(/^Largura da mesa bf/).press('Enter');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.some((v) => v.mesa && v.mesa.bf === undefined), null);
      // 2. V1 vira viga chata (altura 12 cm da laje) e desfazer devolve os 50 cm
      sv = await editor(0);
      await sv.getByLabel('Viga chata (altura da laje que contorna)', { exact: true }).check();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.find((v) => v.nome === 'V1')?.secao.h === 0.12, null);
      await page.getByRole('button', { name: /Desfazer/ }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.find((v) => v.nome === 'V1')?.secao.h === 0.5, null);
      // 3. V2 não estrutural e V3 de amarração
      sv = await editor(1);
      await sv.getByLabel('Viga não estrutural (só fecha o contorno do pano)', { exact: true }).check();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.find((v) => v.nome === 'V2')?.estrutural === false, null);
      sv = await editor(2);
      await sv.getByLabel('Viga de amarração (sem flexão vertical)', { exact: true }).check();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.find((v) => v.nome === 'V3')?.amarracao === true, null);
      // 4. flexão na seção T (opção) e cálculo
      await cmd('opcoes.definir {"valores": {"mesaDimensionamento": 1}}');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.opcoes?.mesaDimensionamento === 1, null);
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 180000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 180000 });
      await livre();
      const cardVigas = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) });
      await cardVigas.waitFor({ timeout: 30000 });
      assert.equal(await cardVigas.locator('tbody tr').count(), 4, 'V2 não estrutural fica fora do dimensionamento');
      assert.equal(await cardVigas.locator('tbody tr', { hasText: 'V2' }).count(), 0);
      // 5. janela de V4: detalhamento com a seção T e as barras de canto da mesa
      await cardVigas.locator('tbody tr', { hasText: 'V4' }).first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Detalhamento' }).click();
      const secao = jan.locator('svg[data-secao]');
      await secao.waitFor();
      assert.equal(await secao.locator('[data-mesa-aba]').count(), 2);
      assert.equal(await secao.locator('[data-canto-mesa]').count(), 2);
      assert.match(await secao.textContent(), /bf 100 × hf 12/);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // 6. memorial: quadro das seções especiais
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const q = memo.locator('[data-memorial-secoes-viga]');
      await q.waitFor();
      const txt = await q.innerText();
      assert.match(txt, /V4[\s\S]*T[\s\S]*mesa colaborante \(NBR 6118, 14\.6\.2\.2\)/);
      assert.match(txt, /V2[\s\S]*não estrutural/);
      assert.match(txt, /V3[\s\S]*amarração/);
      assert.match(txt, /dimensionada na seção T onde a mesa está comprimida/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  },
  {
    name: 'L2: lançamento por DXF/DWG por camada, gerenciador de gabaritos, vistas por pavimento, viga pelo gabarito e F3',
    async run({ newPage, tmp }) {
      const page = await newPage(NO_PICKERS);
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const msgBarra = (re) => page.locator('.statusbar .msg', { hasText: re }).waitFor();
      const abrirGrupo = async (re) => {
        const g = page.locator('.edif-in details.group').filter({ has: page.locator(':scope > summary', { hasText: re }) }).first();
        if (!(await g.evaluate((d) => d.open))) await g.locator(':scope > summary').click();
        return g;
      };
      const arq = join(tmp, 'grade.dxf');
      writeFileSync(arq, dxfGradeL2());
      const arqDwg = join(tmp, 'arq.dwg');
      writeFileSync(arqDwg, dwgMinimoL2());
      // 1) Nova obra › Lançamento por DXF/DWG: cria o edifício padrão e abre o assistente
      await page.getByRole('button', { name: 'Nova obra…' }).click();
      const nova = page.getByRole('dialog', { name: 'Nova obra' });
      await nova.getByRole('button', { name: 'Lançamento por DXF/DWG', exact: true }).click();
      await nova.getByRole('button', { name: 'Criar edifício padrão e lançar pelo gabarito…', exact: true }).click();
      const wiz = page.getByRole('dialog', { name: 'Lançamento por DXF/DWG' });
      await wiz.waitFor();
      // passo Arquivos: um DXF e um DWG (o leitor de DWG vem de vendor/, sob demanda)
      await wiz.locator('input[type=file]').setInputFiles(arq);
      await wiz.getByLabel('Remover grade.dxf', { exact: true }).waitFor();
      assert.match(await wiz.innerText(), /DXF\s+7 camada/);
      await wiz.locator('input[type=file]').setInputFiles(arqDwg);
      await wiz.getByLabel('Remover arq.dwg', { exact: true }).waitFor();
      assert.match(await wiz.innerText(), /DWG\s+1 camada/);
      assert.equal(await wiz.getByLabel(/^Unidade de grade\.dxf/).inputValue(), '0.01');
      assert.equal(await wiz.getByLabel(/^Unidade de arq\.dwg/).inputValue(), '1');
      await wiz.getByLabel('Remover arq.dwg', { exact: true }).click();
      await wiz.getByRole('button', { name: 'Avançar', exact: true }).click();
      // passo Camadas: papéis sugeridos pelo nome e pela geometria, visibilidade, cor e prévia
      const prev = wiz.getByRole('img', { name: 'Prévia das camadas', exact: true });
      assert.equal(await wiz.getByLabel('Papel da camada PILARES', { exact: true }).inputValue(), 'pilar');
      assert.equal(await wiz.getByLabel('Papel da camada VIGAS', { exact: true }).inputValue(), 'vigaFaces');
      assert.equal(await wiz.getByLabel('Papel da camada EIXOS', { exact: true }).inputValue(), 'eixo');
      assert.equal(await wiz.getByLabel('Papel da camada CONTORNO', { exact: true }).inputValue(), 'contorno');
      assert.equal(await wiz.getByLabel('Papel da camada ABERTURA', { exact: true }).inputValue(), 'abertura');
      assert.equal(await wiz.getByLabel('Papel da camada PONTO-FIXO', { exact: true }).inputValue(), 'pontoFixo');
      assert.equal(await prev.locator('path').count(), 6);
      await wiz.getByLabel('Camada EIXOS visível', { exact: true }).uncheck();
      assert.equal(await prev.locator('path').count(), 5);
      await wiz.getByLabel('Camada EIXOS visível', { exact: true }).check();
      await wiz.getByLabel('Cor da camada PILARES', { exact: true }).fill('#ff0000');
      assert.equal(await prev.locator('path[data-camada="PILARES"]').getAttribute('stroke'), '#ff0000');
      await wiz.getByLabel(/^Altura da viga/).fill('45');
      await wiz.getByLabel(/^Altura da viga/).press('Tab');
      await wiz.getByRole('button', { name: 'Avançar', exact: true }).click();
      // passo Grupos: o gabarito entra no grupo da planta aberta
      assert.equal(await wiz.getByLabel('grade em Tipo', { exact: true }).isChecked(), true);
      await wiz.getByRole('button', { name: 'Avançar', exact: true }).click();
      // passo Revisão: contagens, ambíguo desmarcado e aplicação parcial (sem as vigas, que saem pelo clique no gabarito)
      const rev = wiz.locator('[data-revisao="grade"]');
      const txt = await rev.innerText();
      assert.match(txt, /Pilares\s+9/);
      assert.match(txt, /Vigas\s+2/);
      assert.match(txt, /Eixos\s+3/);
      assert.match(txt, /Aberturas\s+1/);
      assert.match(txt, /Contorno do edifício\s+1/);
      assert.match(txt, /linha sem par/i);
      assert.equal(await wiz.getByLabel(/^Incluir PILAR_DENTRO_DE_PILAR em grade/).isChecked(), false);
      await wiz.getByLabel('Lançar vigas de grade', { exact: true }).uncheck();
      await wiz.getByRole('button', { name: 'Aplicar lançamento', exact: true }).click();
      await wiz.waitFor({ state: 'detached' });
      await page.locator('summary', { hasText: /^Pilares \(8\)/ }).waitFor();
      assert.ok((await page.locator('tr.lancado').count()) >= 8);
      assert.equal(await page.locator('summary', { hasText: /^Eixos \(3\)/ }).count(), 1);
      // um passo só no histórico: desfazer tira o gabarito e os elementos; refazer devolve
      await page.keyboard.press('Control+z');
      await page.locator('summary', { hasText: 'Pilares (0)' }).waitFor();
      await page.keyboard.press('Control+y');
      await page.locator('summary', { hasText: 'Pilares (8)' }).waitFor();
      // 2) viga pelo gabarito: clique na face e depois do lado do corpo da viga
      const masc = await abrirGrupo(/^Máscara/);
      assert.match(await masc.locator('summary').innerText(), /Máscara — Tipo \(1\)/);
      await masc.getByRole('button', { name: 'Viga pelo gabarito', exact: true }).click();
      await reenquadrarAte(page, [[3.0, 1.075], [3.0, 1.4], [3.0, 0.75]]);
      const clique = async (x, y) => { const [px, py] = await telaDe(page, x, y); await page.mouse.click(px, py); };
      await clique(3.0, 1.075);
      await clique(3.0, 1.4);
      await page.locator('summary', { hasText: /^Vigas — Tipo \(1\)/ }).waitFor();
      await abrirGrupo(/^Vigas — Tipo/);
      assert.equal(await page.getByLabel('Alinhamento de V1', { exact: true }).inputValue(), 'dir');
      await clique(3.0, 1.075);
      await clique(3.0, 0.75);
      await page.locator('summary', { hasText: /^Vigas — Tipo \(2\)/ }).waitFor();
      assert.equal(await page.getByLabel('Alinhamento de V2', { exact: true }).inputValue(), 'esq');
      await clique(3.0, 1.075);
      await clique(3.0, 1.4);
      await msgBarra(/já foram lançadas/);
      await masc.getByRole('radio', { name: 'Linha = eixo', exact: true }).click();
      await clique(3.0, 0.925);
      await page.locator('summary', { hasText: /^Vigas — Tipo \(3\)/ }).waitFor();
      assert.equal(await page.getByLabel('Alinhamento de V3', { exact: true }).inputValue(), 'centro');
      await page.keyboard.press('Escape');
      // 3) F3 e a janela de captura
      await masc.getByRole('button', { name: 'Capturas…', exact: true }).click();
      const cap = page.getByRole('dialog', { name: 'Modos de captura' });
      await cap.getByRole('button', { name: 'Nenhum', exact: true }).click();
      await cap.getByRole('button', { name: 'Concluir', exact: true }).click();
      await cap.waitFor({ state: 'detached' });
      await page.keyboard.press('F3');
      await cap.waitFor();
      await cap.getByRole('button', { name: 'Todos', exact: true }).click();
      await cap.getByRole('button', { name: 'Concluir', exact: true }).click();
      await cap.waitFor({ state: 'detached' });
      await page.keyboard.press('F3');
      await msgBarra(/Capturas desligadas/);
      await page.keyboard.press('F3');
      await msgBarra(/Capturas ligadas/);
      // 4) gerenciador de gabaritos: apelido, textos, visibilidade, unidade e origem original, copiar, salvar e abrir a configuração
      await masc.getByRole('button', { name: 'Gabaritos e vistas…', exact: true }).click();
      const ger = page.getByRole('dialog', { name: 'Gabaritos e vistas' });
      const prevG = ger.getByRole('img', { name: 'Prévia da configuração de grade', exact: true });
      assert.equal(await prevG.locator('path').count(), 6);
      await ger.getByLabel('Camada EIXOS visível em grade', { exact: true }).uncheck();
      assert.equal(await prevG.locator('path').count(), 5);
      await ger.getByLabel('Camada EIXOS visível em grade', { exact: true }).check();
      await ger.getByLabel('Textos da camada TEXTO em grade', { exact: true }).uncheck();
      const ap = ger.getByLabel('Apelido da camada PILARES em grade', { exact: true });
      await ap.fill('Pilares da arquitetura');
      await ap.press('Tab');
      await ger.getByLabel('Unidade de grade', { exact: true }).selectOption('1');
      const bOriginal = ger.getByRole('button', { name: 'Origem original de grade', exact: true });
      await bOriginal.click();
      assert.equal(await ger.getByLabel('Unidade de grade', { exact: true }).inputValue(), '0.01');
      assert.equal(await bOriginal.isDisabled(), true);
      const cfg = await downloadText(page, () => ger.getByRole('button', { name: 'Salvar configuração de grade', exact: true }).click());
      const j = JSON.parse(cfg.text);
      assert.equal(j.versao, 1);
      const pil = j.camadas.find((c) => c.nome === 'PILARES');
      assert.equal(pil.apelido, 'Pilares da arquitetura');
      assert.equal(j.camadas.find((c) => c.nome === 'TEXTO').textos, false);
      assert.equal(j.regras.papeis.VIGAS, 'vigaFaces');
      pil.apelido = 'Pilares abertos do arquivo';
      pil.cor = '#00ff00';
      const cfgArq = join(tmp, 'camadas-grade.json');
      writeFileSync(cfgArq, JSON.stringify(j));
      await ger.locator('input[type=file][aria-label="Abrir configuração de grade…"]').setInputFiles(cfgArq);
      await page.waitForFunction(() => document.querySelector('input[aria-label="Apelido da camada PILARES em grade"]')?.value === 'Pilares abertos do arquivo');
      assert.equal(await ger.getByLabel('Cor da camada PILARES em grade', { exact: true }).inputValue(), '#00ff00');
      await ger.getByLabel(/^Copiar grade para o grupo/).selectOption({ label: 'Cobertura' });
      await ger.getByRole('button', { name: 'Copiar vista de grade', exact: true }).click();
      await ger.getByLabel(/^Gabarito/).selectOption({ label: 'grade (Cobertura) — Cobertura' });
      assert.equal(await ger.getByLabel('Nome do gabarito grade (Cobertura)', { exact: true }).inputValue(), 'grade (Cobertura)');
      await ger.getByRole('button', { name: 'Remover grade (Cobertura)', exact: true }).click();
      await ger.getByRole('button', { name: 'Fechar', exact: true }).click();
      // 5) vistas por pavimento: desligar a vista tira o desenho da planta
      await masc.getByRole('button', { name: 'Vistas por pavimento…', exact: true }).click();
      const vis = page.getByRole('dialog', { name: 'Vistas por pavimento' });
      const segs = () => page.locator('.planta-cv').getAttribute('data-segmentos').then(Number);
      assert.ok((await segs()) > 0);
      await vis.getByLabel('grade em Tipo 1', { exact: true }).uncheck();
      await page.waitForFunction(() => document.querySelector('.planta-cv')?.dataset.segmentos === '0');
      await vis.getByLabel('grade em Tipo 1', { exact: true }).check();
      await page.waitForFunction(() => Number(document.querySelector('.planta-cv')?.dataset.segmentos) > 0);
      await vis.getByRole('button', { name: 'Fechar', exact: true }).click();
      // 6) memorial: gabaritos, unidade, escala e papéis
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mg = await memo.locator('[data-memorial-gabaritos]').innerText();
      assert.match(mg, /grade\.dxf \(DXF\)/);
      assert.match(mg, /Pilares abertos do arquivo: pilares/);
      assert.match(mg, /cm/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  },
  {
    name: 'N3: biblioteca de normas (editar uma linha da tabela de TRRF, ver o resultado no grupo Incêndio, valor inválido, exportar e importar JSON, restaurar, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const g = page.locator('.edif-in details', { has: page.locator('summary', { hasText: 'Biblioteca de normas' }) }).first();
      await g.locator('summary').click();
      await g.getByLabel(/^Norma/).selectOption('NBR 14432 / IT 06');
      const tabela = g.locator('table[data-tabela-norma="nbr14432.trrf-ocupacao"]');
      await tabela.waitFor();
      assert.match(await g.locator('[data-selos-norma]').innerText(), /de fábrica/);
      assert.match(await g.locator('[data-selos-norma]').innerText(), /a confirmar/);
      const inc = page.locator('.edif-in details', { has: page.locator('summary', { hasText: 'Incêndio' }) }).first();
      await inc.locator('summary').click();
      assert.match(await inc.getByLabel('Ocupação (NBR 14432 / IT)').innerText(), /A-1 — Residencial(?! N3)/);
      // 1) altera a ocupação da primeira linha: selo "alterada" e a opção do grupo Incêndio muda
      const cel = g.getByLabel('Ocupação da linha 1', { exact: true });
      await cel.fill('Residencial N3'); await cel.press('Enter');
      await page.waitForFunction(() => /alterada pela obra/.test(document.querySelector('[data-selos-norma]')?.textContent ?? ''));
      assert.match(await g.locator('summary').first().innerText(), /\(1 alterada\)/);
      assert.match(await inc.getByLabel('Ocupação (NBR 14432 / IT)').innerText(), /A-1 — Residencial N3/);
      // 2) valor inválido num número: mensagem e nada gravado
      const num = g.getByLabel('S2 (subsolo > 10 m) da linha 1', { exact: true });
      await num.fill('abc'); await num.press('Enter');
      await g.locator('[data-erros-normas]').waitFor();
      assert.match(await g.locator('summary').first().innerText(), /\(1 alterada\)/);
      // 3) exporta a tabela, restaura e importa de volta
      const { name, text } = await downloadText(page, () => g.getByRole('button', { name: 'Exportar esta tabela', exact: true }).click());
      assert.match(name, /norma-nbr14432\.trrf-ocupacao\.json$/);
      const j = JSON.parse(text);
      assert.equal(j.formato, 'statikos-normas');
      assert.equal(j.tabelas['nbr14432.trrf-ocupacao'].linhas[0].ocupacao, 'Residencial N3');
      await g.getByRole('button', { name: 'Restaurar tabela de fábrica', exact: true }).click();
      await page.waitForFunction(() => /de fábrica/.test(document.querySelector('[data-selos-norma]')?.textContent ?? ''));
      assert.match(await inc.getByLabel('Ocupação (NBR 14432 / IT)').innerText(), /A-1 — Residencial(?! N3)/);
      await g.getByLabel('Arquivo de normas').setInputFiles({ name: 'normas.json', mimeType: 'application/json', buffer: Buffer.from(text) });
      await page.waitForFunction(() => /alterada pela obra/.test(document.querySelector('[data-selos-norma]')?.textContent ?? ''));
      // arquivo inválido: mensagem
      await g.getByLabel('Arquivo de normas').setInputFiles({ name: 'ruim.json', mimeType: 'application/json', buffer: Buffer.from('{"formato": "outro"}') });
      await g.locator('[data-erros-normas]').waitFor();
      // 4) memorial lista a tabela como alterada pelo usuário
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mn = await memo.locator('[data-memorial-normas]').innerText();
      assert.match(mn, /TRRF por ocupação e altura[\s\S]*alterada pelo usuário/);
      assert.match(mn, /Catálogo SCAC|Estacas pré-moldadas/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 5) restaura a biblioteca toda
      await g.getByRole('button', { name: 'Restaurar toda a biblioteca', exact: true }).click();
      assert.doesNotMatch(await g.locator('summary').first().innerText(), /alterada/);
    },
  },
];
