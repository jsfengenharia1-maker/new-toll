// Fluxos de interface. Cada fluxo recebe { newPage, baseURL, tmp }:
// newPage(initScript?) abre um contexto novo (localStorage vazio) já com o app carregado.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeDwg2018 } from 'nasjidwg';

/** Remove a File System Access API: o app cai no download e no <input type=file>. */
export const NO_PICKERS = () => {
  for (const k of ['showSaveFilePicker', 'showOpenFilePicker']) {
    try { delete window[k]; } catch { /* ignora */ }
    try { Object.defineProperty(window, k, { value: undefined, configurable: true, writable: true }); } catch { /* ignora */ }
  }
};

export async function fileMenu(page, item) {
  await page.getByRole('tablist', { name: 'Faixa de comandos' }).getByRole('tab', { name: 'Arquivo', exact: true }).click();
  await page.getByRole('toolbar', { name: /^Comandos: Arquivo/ }).getByRole('button', { name: item }).first().click();
}

/** Abre uma aba da faixa de comandos (a faixa guarda a aba ativa). */
export async function faixaAba(page, nome) {
  await page.getByRole('tablist', { name: 'Faixa de comandos' }).getByRole('tab', { name: nome, exact: true }).click();
}

/** Abre a aba contextual da faixa (aparece com um elemento selecionado: Pilar, Viga, Laje ou Fundação). */
export async function faixaCtx(page) {
  await page.getByRole('tablist', { name: 'Faixa de comandos' }).locator('.rtab.ctx').click();
}

/** Janela Configuração da obra (cobre a doca esquerda do Edifício, sem bloquear o desenho). */
export const janelaCfg = (page) => page.getByRole('dialog', { name: 'Configuração da obra' });
export async function fecharCfg(page) {
  if (await janelaCfg(page).count()) await janelaCfg(page).getByRole('button', { name: 'Fechar', exact: true }).click();
}
/** Abre a Configuração da obra numa seção do índice (título do índice) e devolve a janela; a aba da faixa volta ao que era. */
export async function abrirConfiguracao(page, secao) {
  if (!(await janelaCfg(page).count())) {
    const ativa = page.getByRole('tablist', { name: 'Faixa de comandos' }).locator('.rtab.on');
    const antes = (await ativa.count()) ? (await ativa.first().innerText()).trim() : null;
    await faixaAba(page, 'Arquivo');
    await page.getByRole('toolbar', { name: /^Comandos: Arquivo/ }).getByRole('button', { name: 'Configuração da obra…' }).click();
    if (antes && antes !== 'Arquivo') await faixaAba(page, antes);
  }
  await page.getByRole('navigation', { name: 'Seções da configuração' }).getByRole('button', { name: secao, exact: true }).click();
  return janelaCfg(page);
}

/** Título do grupo → seção da Configuração da obra (grupos que saíram da coluna esquerda). */
export const SECAO_CFG = [
  ['Dados gerais', 'Dados gerais'], ['Opções de cálculo', 'Opções de cálculo'], ['Materiais e segurança', 'Materiais e segurança'], ['Tabelas de armadura', 'Tabelas de armadura'],
  ['Biblioteca de normas', 'Biblioteca de normas'], ['Tipos de laje', 'Tipos de laje'], ['Casos de carga', 'Casos de carga'],
  ['Compatibilidade entre casos', 'Casos de carga'], ['Arranjos alternados', 'Casos de carga'], ['Estados-limite', 'Estados-limite e combinações'],
  ['Vento e combinações', 'Vento e combinações'], ['Ábacos de vento', 'Ábacos de vento'], ['Empuxo de terra', 'Empuxo de terra'],
  ['Etapas de carga', 'Etapas de carga'], ['Incêndio', 'Incêndio'], ['Arquivo e versões', 'Arquivo e versões'],
  ['Fundação', 'Fundação (terreno, estacas, sondagens, parâmetros)'], ['Parâmetros das sapatas corridas', 'Fundação (terreno, estacas, sondagens, parâmetros)'],
];

/** Grupo recolhível (`details.group`) do Edifício pelo título, onde estiver: Configuração da obra (abre a seção) ou coluna esquerda (fecha a Configuração). Deixa o grupo aberto. */
export async function grupoEdif(page, titulo) {
  const txt = titulo instanceof RegExp ? titulo.source.replace(/^\^/, '').replace(/\\(.)/g, '$1') : titulo;
  const s = SECAO_CFG.find(([p]) => txt.startsWith(p));
  if (s) await abrirConfiguracao(page, s[1]); else await fecharCfg(page);
  const g = page.locator('.edif-in details.group').filter({ has: page.locator(':scope > summary', { hasText: titulo }) }).first();
  if (!(await g.evaluate((d) => d.open))) await g.locator(':scope > summary').click();
  return g;
}

export async function tab(page, name) {
  await page.locator('.panel .tabs').getByRole('tab', { name, exact: true }).click();
}

/** Abre um grupo recolhível (<details>) do painel pelo título. */
export async function openGroup(page, title) {
  const g = page.locator('.panel details.group', { has: page.locator('summary', { hasText: title }) }).first();
  if (!(await g.evaluate((d) => d.open))) await g.locator('summary').click();
  return g;
}

export async function downloadText(page, action) {
  const [dl] = await Promise.all([page.waitForEvent('download'), action()]);
  const path = await dl.path();
  return { name: dl.suggestedFilename(), text: readFileSync(path, 'utf8'), path };
}

export const num = (s) => parseFloat(String(s).replace(/\s/g, '').replace('−', '-').replace(/\./g, '').replace(',', '.'));


/** DXF de planta 15 × 10 m em cm (paredes de 15 cm, porta, textos) com `extra` segmentos aleatórios. */
export function dxfPlanta(extra = 0) {
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
export const JPEG_TESTE = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAAEAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDHooorhPqD/9k=';

/** Ponto do mundo (m) na tela, pela vista publicada pela planta. */
export async function telaDe(page, x, y) {
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
export async function reenquadrarAte(page, pontos) {
  for (let t = 0; ; t++) {
    await page.keyboard.press('f');
    await page.waitForTimeout(150);
    const caixa = await page.locator('canvas.int').boundingBox();
    const tela = await Promise.all(pontos.map(([x, y]) => telaDe(page, x, y)));
    if (tela.every(([px, py]) => px > caixa.x + 5 && px < caixa.x + caixa.width - 5 && py > caixa.y + 5 && py < caixa.y + caixa.height - 5)) return;
    assert.ok(t < 20, 'planta não reenquadrou os pontos na área de desenho');
  }
}

export async function importarMascara(page, tmp, extra = 0) {
  const f = join(tmp, `planta-${extra}.dxf`);
  writeFileSync(f, dxfPlanta(extra));
  await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
  await grupoEdif(page, 'Máscara');
  await page.setInputFiles('input[aria-label="Arquivo DXF da máscara"]', f);
  await page.locator('.statusbar .msg', { hasText: 'unidade cm ($INSUNITS)' }).waitFor();
}

/** DXF fictício da L2 (cm): grade 3 × 2 de pilares 20 × 50, pilar girado e circular, vigas por faces, eixos, contorno, abertura e ponto fixo.
 *  O canto inferior esquerdo do desenho (-50; -100) vai à origem: mundo = (x / 100 + 0,5; y / 100 + 1,0). */
export function dxfGradeL2() {
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
export function dwgMinimoL2() {
  const c = (i) => ({ kind: 'aci', index: i });
  const camada = (name, i) => ({ name, color: c(i), on: true, frozen: false, locked: false });
  return writeDwg2018({
    header: { version: 'R2018', codepage: 'ANSI_1252', insUnits: 6, linetypeScale: 1, vars: {} },
    layers: [camada('0', 7), camada('PILARES', 1)], linetypes: [{ name: 'Continuous', description: 'Solid line', pattern: [] }], textStyles: [{ name: 'Standard', font: 'arial.ttf' }], blocks: {},
    entities: [{ type: 'polyline', layer: 'PILARES', color: { kind: 'byLayer' }, vertices: [{ x: 0, y: 0 }, { x: 0.3, y: 0 }, { x: 0.3, y: 0.3 }, { x: 0, y: 0.3 }], closed: true }],
    paperSpace: [], layouts: [{ name: 'Model', tabOrder: 0 }], warnings: [],
  }).data;
}

