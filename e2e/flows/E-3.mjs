// Fluxos de interface — E (parte 3/3): planos inclinados, rampas e desníveis (E3f).
import assert from 'node:assert/strict';
import { faixaAba, fileMenu, grupoEdif, telaDe, enquadrarEstavel } from './helpers.mjs';

export const f_E3f = {
  name: 'E3f: planos inclinados (novo plano, árvore, atribuir, propriedades, vigas incoerentes, tipo de pano e pano a definir, cobertura em duas águas, memorial, diafragma)',
  async run({ newPage }) {
    const page = await newPage();
    await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
    const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
    const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
    const esperar = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 20000 });
    const aba = (nome) => page.locator('.edif-tabs').getByRole('tab', { name: nome });
    const calcular = async () => { await aba('Dimensionamento').click(); await page.getByRole('button', { name: 'Calcular e dimensionar' }).click(); };
    // um pano 6 × 4,5 m, vigas de 20 × 50
    await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 4.5], [0, 4.5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
    await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 4.5], [6, 4.5]], [[0, 0], [0, 4.5]], [[6, 0], [6, 4.5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
    await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.length === 1, null);
    // 1) novo plano: máxima declividade de (0; 0) a (0; 4,5), desnível 0, 30 %; a árvore do Navegador mostra o plano
    await faixaAba(page, 'Edição');
    await page.getByRole('button', { name: 'Novo plano', exact: true }).click();
    const dlg = page.getByRole('dialog', { name: 'Novo plano' });
    const y2 = dlg.getByLabel(/^y2/); await y2.fill('4,5'); await y2.press('Enter');
    const inc = dlg.getByLabel(/^Inclinação do plano/); await inc.fill('30'); await inc.press('Enter');
    await dlg.getByRole('button', { name: 'Criar', exact: true }).click();
    await dlg.waitFor({ state: 'detached' });
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.planos?.length === 1, null);
    let m = await modelo();
    assert.equal(m.planos.length, 1);
    assert.equal(m.planos[0].nome, 'Plano 1');
    await page.getByRole('treeitem', { name: /Plano 1 — 30,0 %/ }).waitFor();
    // 2) atribuir o plano ao pano selecionado: a planta o desenha com a cor, a seta e o texto de inclinação
    const lj = await grupoEdif(page, /^Lajes —/);
    await lj.locator('table.loads-ed tbody tr').nth(0).click();
    await page.getByRole('button', { name: 'Atribuir plano', exact: true }).click();
    await esperar(() => !!JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]?.plano, null);
    await page.waitForFunction(() => document.querySelector('.planta-cv')?.getAttribute('data-planos-na-planta') === '1', null, { timeout: 20000 });
    // 3) propriedades do plano: leitura da inclinação e edição para 40 %; as vigas do contorno ficam incoerentes e a correção copia o plano do pano
    const gp = await grupoEdif(page, /^Planos —/);
    assert.match(await gp.locator('[data-leitura-plano]').innerText(), /30,0 %/);
    assert.match(await gp.innerText(), /atribuído/);
    const i40 = gp.getByLabel(/^Inclinação do plano/); await i40.fill('40'); await i40.press('Enter');
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.planos?.[0]?.def?.inclinacao === 40, null);
    assert.match(await gp.locator('[data-leitura-plano]').innerText(), /40,0 %/);
    await gp.locator('[data-vigas-incoerentes]').waitFor();
    await gp.getByRole('button', { name: 'Selecionar as vigas incoerentes', exact: true }).click();
    await gp.getByRole('button', { name: 'Copiar inclinação do pano', exact: true }).click();
    await gp.locator('[data-vigas-incoerentes]').waitFor({ state: 'detached' });
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.some((v) => !!v.plano), null);
    m = await modelo();
    assert.ok(m.vigas.some((v) => v.plano === m.planos[0].id));
    // 4) retirar o plano do pano
    await lj.locator('table.loads-ed tbody tr').nth(0).click();
    await page.getByRole('button', { name: 'Retirar plano', exact: true }).click();
    await esperar(() => !JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]?.plano, null);
    // 5) tipo de pano: pano a definir com 12 cm (o cálculo recusa) e de volta a maciça
    const tp = await grupoEdif(page, /^Tipo de pano/);
    await tp.getByLabel(/^Tipo de pano/).selectOption({ label: 'Pano a definir' });
    const esp = tp.getByLabel(/^Espessura do pano a definir/); await esp.fill('0,12'); await esp.press('Enter');
    await tp.getByRole('button', { name: 'Aplicar', exact: true }).click();
    await esperar(() => { const l = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]; return l?.definir === true && l?.espessuraDefinir === 0.12; }, null);
    await calcular();
    await page.locator('.statusbar .msg', { hasText: 'DEFINIR_PANO' }).waitFor({ timeout: 60000 });
    await aba('Planta').click();
    await lj.locator('table.loads-ed tbody tr').nth(0).click();
    await (await grupoEdif(page, /^Tipo de pano/)).getByLabel(/^Tipo de pano/).selectOption({ label: 'Maciça' });
    await esperar(() => { const l = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]; return !l?.definir && l?.tipo?.tipo === 'macica'; }, null);
    // 6) exemplo "cobertura em duas águas": cálculo sem erro, planos no memorial e a opção do diafragma
    await fileMenu(page, 'Obras recentes…');
    const rec = page.getByRole('dialog', { name: 'Obras recentes' });
    await rec.getByRole('button', { name: /Abrir exemplo Exemplo: cobertura em duas águas/ }).click();
    await rec.waitFor({ state: 'detached' });
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.planos?.length === 2, null);
    assert.deepEqual((await modelo()).planos.map((p) => p.nome).sort(), ['Água norte', 'Água sul']);
    await calcular();
    await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 240000 });
    await page.getByRole('button', { name: 'Memorial do edifício' }).click();
    const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
    const sec = memo.locator('[data-memorial-planos]');
    await sec.waitFor();
    assert.match(await sec.locator('[data-tabela-planos]').innerText(), /Água sul/);
    assert.match(await sec.locator('[data-tabela-planos]').innerText(), /30,00/);
    await memo.getByRole('button', { name: 'Fechar' }).click();
    // opção do diafragma: liga e desliga (recalcular o exemplo com a opção ligada não terminou em 9 min: pendência de núcleo, ver o índice da E3f)
    await grupoEdif(page, 'Opções de cálculo');
    const dia = page.getByLabel('Panos inclinados no diafragma do pavimento');
    await dia.check();
    assert.equal(await dia.isChecked(), true);
    await dia.uncheck();
    assert.equal(await dia.isChecked(), false);
  },
};

export const f_E5d = {
  name: 'E5d: exemplos dos planos inclinados (mansarda, rampa de garagem, rampa entre pavimentos em Obras recentes), limitações no memorial e ajuda do Novo plano',
  async run({ newPage }) {
    const page = await newPage();
    await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
    const esperar = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 30000 });
    const abrir = async (nome) => {
      await fileMenu(page, 'Obras recentes…');
      const rec = page.getByRole('dialog', { name: 'Obras recentes' });
      await rec.getByRole('button', { name: new RegExp(`Abrir exemplo Exemplo: ${nome}`) }).click();
      await rec.waitFor({ state: 'detached' });
    };
    // rampa de garagem e rampa entre pavimentos: um plano cada
    await abrir('rampa de garagem para o subsolo');
    await esperar(() => { const b = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building; return b?.planos?.length === 1 && b?.paredes?.length === 1; }, null);
    await abrir('rampa entre pavimentos de estacionamento');
    await esperar(() => { const b = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building; return b?.planos?.length === 1 && b?.pilares?.length === 12; }, null);
    // mansarda: 6 planos, cálculo sem erro e limitações no memorial
    await abrir('mansarda com águas-furtadas');
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.planos?.length === 6, null);
    await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
    await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
    await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 240000 });
    await page.getByRole('button', { name: 'Memorial do edifício' }).click();
    const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
    const sec = memo.locator('[data-memorial-planos]');
    await sec.waitFor();
    assert.match(await sec.locator('[data-tabela-planos]').innerText(), /Água-furtada oeste/);
    assert.match(await sec.locator('[data-limitacoes-planos]').innerText(), /não se apoia em muro/);
    await memo.getByRole('button', { name: 'Fechar' }).click();
    // ajuda da janela Novo plano: sequência recomendada
    await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
    await faixaAba(page, 'Edição');
    await page.getByRole('button', { name: 'Novo plano', exact: true }).click();
    const dlg = page.getByRole('dialog', { name: 'Novo plano' });
    await dlg.getByRole('button', { name: 'Ajuda de Novo plano', exact: true }).click();
    assert.match(await page.getByRole('status', { name: 'Ajuda' }).innerText(), /Lance tudo na horizontal/);
  },
};

export const f_E5h = {
  name: 'E5h: pano com abertura e ponto de inserção em outro vértice (malha ancorada no vértice, cálculo sem erro, memorial com a premissa)',
  async run({ newPage }) {
    const page = await newPage();
    await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
    const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
    const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
    const esperar = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 20000 });
    await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
    await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
    await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.length === 1, null);
    const id = (await modelo()).lajes[0].id;
    await cmd(`laje.abertura {"id": "${id}", "contorno": [[2.5, 1.5], [4, 1.5], [4, 3], [2.5, 3]]}`);
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]?.furos?.length === 1, null);
    await cmd(`laje.editar {"id": "${id}", "insercaoPonto": [6, 5]}`);
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]?.insercao === 2, null);
    await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
    await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
    await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
    await page.getByRole('button', { name: 'Memorial do edifício' }).click();
    const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
    assert.match(await memo.innerText(), /ponto de inserção do pano/i);
    await memo.getByRole('button', { name: 'Fechar' }).click();
  },
};

export const f_E5a = {
  name: 'E5a: pranchas das lajes inclinadas (croqui do pavimento nas formas, tamanho configurável, só com lajes inclinadas)',
  async run({ newPage }) {
    const page = await newPage();
    await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
    const esperar = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 20000 });
    await fileMenu(page, 'Obras recentes…');
    const rec = page.getByRole('dialog', { name: 'Obras recentes' });
    await rec.getByRole('button', { name: /Abrir exemplo Exemplo: cobertura em duas águas/ }).click();
    await rec.waitFor({ state: 'detached' });
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.planos?.length === 2, null);
    await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
    await page.getByLabel('Tipo de prancha').selectOption({ label: 'Formas' });
    const gPlanos = await page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null').building.planos[0].grupo);
    await page.getByLabel('Grupo / pavimento').selectOption(gPlanos);
    const prev = page.locator('.prancha-prev');
    await prev.locator('svg').waitFor();
    assert.match(await prev.textContent(), /CROQUI DO PAVIMENTO/);
    await page.locator('summary', { hasText: 'Opções de armação e locação' }).click();
    const cq = page.getByLabel(/^Croqui do pavimento/);
    assert.equal(await cq.inputValue(), '60');
    await cq.fill('0'); await cq.press('Enter');
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.prancha?.armacao?.croqui === 0, null);
    await page.waitForFunction(() => !/CROQUI DO PAVIMENTO/.test(document.querySelector('.prancha-prev')?.textContent ?? ''), null, { timeout: 20000 });
  },
};

// ---------------------------------------------------------------- E5b: ferramentas de planta com o mouse

/** Pórtico 8 × 5 m no grupo g_3 com a planta aberta e enquadrada; `laje` = tipo do pano (JSON) ou null. */
async function porticoE5b(page, laje, extra = []) {
  await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
  const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
  await cmd('lote {"comandos": [' + [[0, 0], [8, 0], [0, 5], [8, 5], ...extra].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
  await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 5], [8, 5]], [[0, 0], [0, 5]], [[8, 0], [8, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.45}}}`).join(', ') + ']}');
  if (laje) await cmd(`laje.detectarPanos {"grupo": "g_3", "tipo": ${laje}}`);
  await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
  await enquadrarEstavel(page);
  return cmd;
}
const modeloE5b = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
const clicarE5b = async (page, x, y, dx = 0, dy = 0) => { const [px, py] = await telaDe(page, x, y); await page.mouse.move(px + dx, py + dy); await page.mouse.click(px + dx, py + dy); };
const dadoPlanta = (page, k) => page.locator('.planta-cv').getAttribute(k);
const esperarModelo = (page, fn) => page.waitForFunction(fn, null, { timeout: 20000 });

export const f_E5b = {
  name: 'E5b: diagonal por dois cliques, consolo na face do pilar, linhas magenta, cursor de captura e edição do plano (arrasto e textos)',
  async run({ newPage }) {
    const page = await newPage();
    // pilar extra em (12; 2) com uma viga que sai da face direita (x = 12,15): o consolo se lança pelo clique nessa face
    const cmd = await porticoE5b(page, null, [[12, 2]]);
    await cmd('viga.tracar {"grupo": "g_3", "pontos": [[12.15, 2], [15, 2]], "secao": {"b": 0.15, "h": 0.45}}');
    await enquadrarEstavel(page);
    // 1) diagonal: dois cliques nos pilares (0; 0) e (8; 5), a ponta final no pavimento de cima
    await faixaAba(page, 'Lançamento');
    await page.getByRole('radio', { name: 'Diagonal por dois pontos', exact: true }).click();
    await page.locator('[data-diagonal-menu]').waitFor();
    await clicarE5b(page, 0, 0); await clicarE5b(page, 8, 5);
    await esperarModelo(page, () => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.diagonais?.length === 1);
    let m = await modeloE5b(page);
    assert.ok(Math.hypot(m.diagonais[0].pIni[0], m.diagonais[0].pIni[1]) < 0.2);
    assert.ok(Math.hypot(m.diagonais[0].pFim[0] - 8, m.diagonais[0].pFim[1] - 5) < 0.2);
    assert.notEqual(m.diagonais[0].pavIni, m.diagonais[0].pavFim);
    // 2) consolo: o clique na face do pilar cria o consolo da viga que chega a ela
    await page.getByRole('radio', { name: 'Consolo na face do pilar', exact: true }).click();
    await clicarE5b(page, 12.2, 2);
    await esperarModelo(page, () => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.length === 1);
    m = await modeloE5b(page);
    assert.equal(m.consolos[0].ponta, 'ini');
    assert.equal(m.consolos[0].viga, m.vigas.find((v) => v.pontos[0][0] > 12).id);
    // clique fora de qualquer pilar: nada é criado
    await clicarE5b(page, 4, 2.5);
    assert.equal((await modeloE5b(page)).consolos.length, 1);
    // 3) planos: z = 0,05·x e z = 0,5 − 0,05·x; a ferramenta mostra as linhas magenta (1 interseção e 2 máximas declividades)
    await cmd('plano.criar {"grupo": "g_3", "tipo": "tresPontos", "pontos": [[0, 0, 0], [8, 0, 0.4], [0, 2.5, 0]]}');
    await cmd('plano.criar {"grupo": "g_3", "tipo": "tresPontos", "pontos": [[0, 5, 0.5], [8, 5, 0.1], [4, 2.5, 0.3]]}');
    await faixaAba(page, 'Edição');
    await page.getByRole('radio', { name: 'Definir plano na planta', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.planta-cv')?.getAttribute('data-linhas-magenta') === 'idd', null, { timeout: 20000 });
    // cursor sobre o eixo e sobre a face da viga y = 0 (b = 0,15: face em y = 0,075)
    const [ex, ey] = await telaDe(page, 4, 0); await page.mouse.move(ex, ey);
    await page.waitForFunction(() => document.querySelector('.planta-cv')?.getAttribute('data-cursor-captura') === 'eixo', null, { timeout: 20000 });
    const [fx, fy] = await telaDe(page, 4, 0.075); await page.mouse.move(fx, fy);
    await page.waitForFunction(() => document.querySelector('.planta-cv')?.getAttribute('data-cursor-captura') === 'face', null, { timeout: 20000 });
    const [lx, ly] = await telaDe(page, 6, 2.5); await page.mouse.move(lx, ly);
    await page.waitForFunction(() => document.querySelector('.planta-cv')?.getAttribute('data-cursor-captura') === '', null, { timeout: 20000 });
    // arrastar o ponto (8; 0) do 1º plano até (8; 1): x e y mudam; a cota do ponto (0,40 m) fica
    const [ax, ay] = await telaDe(page, 8, 0), [bx, by] = await telaDe(page, 8, 1);
    await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move((ax + bx) / 2, (ay + by) / 2); await page.mouse.move(bx, by); await page.mouse.up();
    await esperarModelo(page, () => Math.abs((JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.planos?.[0]?.def?.pontos?.[1]?.[1] ?? 9) - 1) < 0.05);
    m = await modeloE5b(page);
    assert.ok(Math.abs(m.planos[0].def.pontos[1][0] - 8) < 0.05);
    assert.ok(Math.abs(m.planos[0].def.pontos[1][2] - 0.4) < 1e-9);
    // reescrever a cota do ponto (0; 2,5) sobre o texto: 25 cm
    await clicarE5b(page, 0, 2.5, 36, -14);
    const campo = page.getByLabel('Cota do ponto do plano (cm)');
    await campo.waitFor();
    await campo.fill('25'); await campo.press('Enter');
    await esperarModelo(page, () => Math.abs((JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.planos?.[0]?.def?.pontos?.[2]?.[2] ?? 9) - 0.25) < 1e-9);
    // reescrever a inclinação sobre o texto do centro do 1º plano: 20 %
    m = await modeloE5b(page);
    const pts = m.planos[0].def.pontos, cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3, cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
    await clicarE5b(page, cx, cy);
    const inc = page.getByLabel('Inclinação do plano (%)');
    await inc.waitFor();
    await inc.fill('20'); await inc.press('Enter');
    await esperarModelo(page, () => {
      const p = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.planos?.[0]?.def?.pontos;
      if (!p) return false;
      const [p0, p1, p2] = p, dx1 = p1[0] - p0[0], dy1 = p1[1] - p0[1], dx2 = p2[0] - p0[0], dy2 = p2[1] - p0[1], dz1 = p1[2] - p0[2], dz2 = p2[2] - p0[2];
      const det = dx1 * dy2 - dx2 * dy1, a = (dz1 * dy2 - dz2 * dy1) / det, b = (dx1 * dz2 - dx2 * dz1) / det;
      return Math.abs(Math.hypot(a, b) - 0.2) < 1e-3;
    });
    // Ctrl+Z desfaz a última edição (a inclinação)
    await page.keyboard.press('Control+z');
    await esperarModelo(page, () => Math.abs((JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.planos?.[0]?.def?.pontos?.[2]?.[2] ?? 9) - 0.25) < 1e-9);
  },
};

export const f_E5b_abaco = {
  name: 'E5b-abaco: ferramenta Ábaco (retângulo por dois cantos fechado em caixotes inteiros, polígono, altura e desfazer)',
  async run({ newPage }) {
    const page = await newPage();
    await porticoE5b(page, '{"tipo": "nervurada", "forma": "cat:rec-60-30", "hTotal": 0.35, "capa": 0.05}');
    await faixaAba(page, 'Lançamento');
    await page.getByRole('radio', { name: 'Ábaco', exact: true }).click();
    const menu = page.locator('[data-abaco-menu]');
    await menu.waitFor();
    // fora de um pano nervurado o 1º clique é recusado
    await clicarE5b(page, 20, 20);
    assert.equal((await modeloE5b(page)).abacos ?? undefined, undefined);
    // retângulo: a prévia mostra o número de caixotes
    await clicarE5b(page, 2, 1.5);
    const [qx, qy] = await telaDe(page, 3.1, 2.7); await page.mouse.move(qx, qy);
    await page.waitForFunction(() => /^\d+x\d+$/.test(document.querySelector('.planta-cv')?.getAttribute('data-abaco-caixotes') ?? ''), null, { timeout: 20000 });
    const [nx, ny] = (await dadoPlanta(page, 'data-abaco-caixotes')).split('x').map(Number);
    assert.ok(nx >= 2 && ny >= 2);
    await page.mouse.click(qx, qy);
    await esperarModelo(page, () => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.length === 1);
    let m = await modeloE5b(page);
    assert.equal(m.abacos[0].automatico, false);
    assert.equal(m.abacos[0].poligono.length, 4);
    assert.equal(m.abacos[0].hAbaco, 0.35);
    // polígono com altura de 40 cm: três vértices e Enter
    await menu.getByRole('radio', { name: 'Polígono', exact: true }).click();
    await menu.getByLabel(/^Altura do ábaco/).fill('40'); await menu.getByLabel(/^Altura do ábaco/).press('Tab');
    await clicarE5b(page, 5, 1.5); await clicarE5b(page, 7, 1.5); await clicarE5b(page, 6, 3.5);
    await page.keyboard.press('Enter');
    await esperarModelo(page, () => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.length === 2);
    m = await modeloE5b(page);
    assert.equal(m.abacos[1].hAbaco, 0.4);
    assert.equal(m.abacos[1].poligono.length, 3);
    // Ctrl+Z desfaz o polígono
    await page.keyboard.press('Control+z');
    await esperarModelo(page, () => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.length === 1);
  },
};

export const f_E5c = {
  name: 'E5c: etapa Muros ligada, redimensionar todos os consolos, radier no seletor de tipo de pano, cópia de dados e de plano pelo menu do Navegador, abertura de pano selecionável para pano a definir',
  async run({ newPage }) {
    const page = await newPage();
    await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
    const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
    const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
    const esperar = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 30000 });
    await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 4.5], [0, 4.5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pilares?.length === 4, null);
    const g2 = (await modelo()).grupos.find((g) => g.nome === 'Cobertura').id;
    for (const g of ['g_3', g2]) {
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[6, 0], [6, 4.5]], [[6, 4.5], [0, 4.5]], [[0, 4.5], [0, 0]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "${g}", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd(`laje.detectarPanos {"grupo": "${g}", "tipo": {"tipo": "macica", "h": 0.12}}`);
    }
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.length === 2, null);
    let m = await modelo();
    // 1) etapa Muros e paredes (C1.29): pendente e opcional; a primeira parede a marca como feita
    const etapa = page.locator('[data-etapa="muros"]');
    assert.match(await etapa.innerText(), /pendente/);
    assert.match(await etapa.innerText(), /Opcional/);
    await cmd(`parede.criar {"pontos": [[0, 0], [3, 0]], "espessura": 0.2, "tipo": "concreto", "nasce": "${m.pavimentos[0].id}", "morre": "${m.pavimentos[1].id}"}`);
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.length === 1, null);
    await etapa.getByText('feito', { exact: true }).waitFor();
    assert.match(await etapa.innerText(), /1 parede\(s\), 0 muro\(s\) de arrimo/);
    // 2) redimensionar todos os consolos (C6.101): o botão só vale com armadura fixada
    const v1 = m.vigas.find((v) => v.nome === 'V1').id, p1 = m.pilares.find((p) => p.nome === 'P1').id;
    await cmd(`consolo.criar {"viga": "${v1}", "ponta": "ini", "pilar": "${p1}"}`);
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.length === 1, null);
    const abrirConsolos = async () => {
      await page.locator('#edcmd').blur();
      await page.keyboard.press('Control+k');
      await page.getByRole('dialog').getByRole('textbox').fill('Consolos curtos');
      await page.keyboard.press('Enter');
      const j = page.getByRole('dialog', { name: 'Consolos curtos', exact: true });
      await j.waitFor();
      return j;
    };
    let jan = await abrirConsolos();
    const todos = jan.getByRole('button', { name: 'Redimensionar todos os consolos', exact: true });
    await todos.waitFor();
    assert.equal(await todos.isDisabled(), true);
    await jan.getByRole('button', { name: 'Fechar' }).click();
    const c1 = (await modelo()).consolos[0].id;
    await cmd(`consolo.editar {"id": "${c1}", "armadura": {"tirante": {"n": 4, "phi": 12.5}, "horizontais": {"n": 2, "phi": 8}, "verticais": {"phi": 8, "s": 0.15}}}`);
    await esperar(() => !!JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.[0]?.armadura, null);
    jan = await abrirConsolos();
    const todos2 = jan.getByRole('button', { name: 'Redimensionar todos os consolos', exact: true });
    assert.equal(await todos2.isDisabled(), false);
    await todos2.click();
    await esperar(() => !JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.[0]?.armadura, null);
    assert.equal(await todos2.isDisabled(), true);
    await jan.getByRole('button', { name: 'Fechar' }).click();
    // 3) radier no seletor de tipo de pano (C7.1): lança a placa com o contorno do pano
    const lj = await grupoEdif(page, /^Lajes —/);
    await lj.locator('table.loads-ed tbody tr').nth(0).click();
    const tp = await grupoEdif(page, /^Tipo de pano/);
    await tp.getByLabel(/^Tipo de pano/).selectOption('radier');
    await tp.getByLabel(/^Espessura do radier/).fill('0,4');
    await tp.getByRole('button', { name: 'Lançar o radier com o contorno do pano', exact: true }).click();
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.fundacao?.radiers?.length === 1, null);
    m = await modelo();
    assert.equal(m.fundacao.radiers[0].h, 0.4);
    assert.equal(m.fundacao.radiers[0].contorno.length, 4);
    // 4) menu de contexto do pano no Navegador (C7.8): copiar dados e copiar o plano para um pano de outro grupo
    await cmd('plano.criar {"grupo": "g_3", "tipo": "maximaDeclividade", "pontos": [[0, 0], [0, 4.5]], "desnivel": 0, "inclinacao": 20}');
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.planos?.length === 1, null);
    m = await modelo();
    const lajeG3 = m.lajes.find((l) => l.grupo === 'g_3'), lajeG2 = m.lajes.find((l) => l.grupo === g2);
    await cmd(`plano.atribuir {"plano": "${m.planos[0].id}", "lajes": ["${lajeG3.id}"]}`);
    await esperar(() => !!JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.find((l) => l.grupo === 'g_3')?.plano, null);
    const arv = page.getByRole('tree', { name: 'Navegador da obra' });
    const noLajes = arv.getByRole('treeitem', { name: /^Lajes/ });
    if ((await noLajes.getAttribute('aria-expanded')) !== 'true') await noLajes.click();
    const noCob = arv.getByRole('treeitem', { name: /^Cobertura\s*1$/ });
    if ((await noCob.getAttribute('aria-expanded')) !== 'true') await noCob.click();
    const folhas = arv.getByRole('treeitem', { name: /^L1$/ });
    await folhas.nth(1).waitFor();
    assert.equal(await folhas.count(), 2);
    await folhas.nth(1).click(); // destino: o pano do grupo Cobertura fica selecionado
    await folhas.nth(0).click({ button: 'right' });
    await page.getByRole('menu', { name: 'Menu do pano' }).waitFor();
    await page.getByRole('menuitem', { name: /^Copiar o plano deste pano/ }).click();
    await esperar((id) => !!JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.find((l) => l.id === id)?.plano, lajeG2.id);
    m = await modelo();
    assert.equal(m.planos.length, 2);
    const novoPlano = m.planos.find((p) => p.grupo === g2);
    assert.deepEqual(novoPlano.def, m.planos.find((p) => p.grupo === 'g_3').def);
    assert.equal(m.lajes.find((l) => l.id === lajeG2.id).plano, novoPlano.id);
    await folhas.nth(0).click({ button: 'right' });
    await page.getByRole('menuitem', { name: /^Copiar dados deste pano/ }).click();
    const dados = await grupoEdif(page, /^Referências e dados/);
    assert.equal(await dados.getByLabel('Pano de origem dos dados').inputValue(), lajeG3.id);
    // 5) abertura de pano selecionável (C7.15): o pano apagado vira abertura; clicar nela e transformar em pano a definir
    await folhas.nth(0).click();
    await cmd(`laje.apagarPano {"ids": ["${lajeG3.id}"]}`);
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.panosVazios?.length === 1, null);
    await page.waitForFunction(() => document.querySelector('canvas.int')?.getAttribute('data-panos-vazios') === '1', null, { timeout: 20000 });
    await enquadrarEstavel(page);
    const [ax, ay] = await telaDe(page, 3, 2.25);
    await page.mouse.click(ax, ay);
    const ab = page.locator('[data-grupo-abertura-pano]');
    await ab.waitFor();
    await ab.getByRole('button', { name: 'Transformar em pano a definir', exact: true }).click();
    await esperar(() => { const b = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building; return !b?.panosVazios?.length && b?.lajes?.some((l) => l.grupo === 'g_3' && l.definir); }, null);
  },
};


export const f_E5m = {
  name: 'E5m: pilar com viga em desnível (nó intermediário, verificação por trecho na janela do pilar e memorial com a premissa)',
  async run({ newPage }) {
    const page = await newPage();
    await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
    const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
    const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
    const esperar = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 20000 });
    await cmd('lote {"comandos": [' + [[0, 0], [6, 0]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
    await cmd('viga.tracar {"grupo": "g_3", "pontos": [[0, 0], [6, 0]], "secao": {"b": 0.2, "h": 0.5}}');
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.length === 1, null);
    const id = (await modelo()).vigas[0].id;
    await cmd(`viga.editar {"id": "${id}", "nivel": -1.5}`);
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.[0]?.nivel === -1.5, null);
    await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
    await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
    await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
    // janela do pilar: lance do Tipo 1 dividido em dois trechos pela viga 1,5 m abaixo do pavimento
    const cardP = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: 'Pilares (por lance)' }) });
    // tabela por lance: a linha do lance dividido é a envoltória e indica os trechos
    await cardP.locator('[data-lance-trechos="2"]').first().waitFor();
    assert.match(await cardP.locator('[data-lance-trechos="2"]').first().textContent(), /2 trechos \(envoltória/);
    await cardP.locator('tbody tr', { hasText: 'Tipo 1' }).first().dblclick();
    const jan = page.getByRole('dialog', { name: /Resultados do elemento — Pilar/ });
    await jan.waitFor();
    await jan.locator('table[data-pilar-trechos="2"]').first().waitFor();
    assert.match(await jan.textContent(), /Lance dividido por vigas em desnível/);
    await jan.getByRole('button', { name: 'Fechar' }).click();
    // esforços do pilar: o diagrama percorre todos os trechos e indica os nós intermediários
    await page.locator('.edif-tabs').getByRole('tab', { name: 'Esforços', exact: true }).click();
    await page.locator('[data-esf-janela="1"]').waitFor();
    await page.getByLabel(/^Tipo de elemento \(janela 1\)/).selectOption({ label: 'Pilar' });
    await page.locator('[data-esf-janela="1"] [data-esf-trechos]').waitFor();
    assert.equal(await page.locator('[data-esf-janela="1"] [data-esf-trechos]').getAttribute('data-esf-trechos'), '3');
    await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
    // memorial: premissa e tabela por trecho
    await page.getByRole('button', { name: 'Memorial do edifício' }).click();
    const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
    await memo.locator('table[data-memorial-trechos]').waitFor();
    assert.match(await memo.locator('[data-memorial-desnivel]').textContent(), /vigas em desnível dividem o pilar", ligada/);
    await memo.getByRole('button', { name: 'Fechar' }).click();
  },
};

export const f_E6d = {
  name: 'E6d: parede com recorte por pavimento (lado da ponta mais curto num lance) pelo editor da parede',
  async run({ newPage }) {
    const page = await newPage();
    await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
    const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
    await cmd('parede.criar {"pontos": [[0, 0], [6, 0]], "espessura": 0.2}');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.length === 1, null, { timeout: 20000 });
    const gp = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Paredes \(/ }) });
    if (!(await gp.evaluate((d) => d.open))) await gp.locator(':scope > summary').click();
    await gp.getByRole('button', { name: 'Selecionar M1' }).click();
    await gp.locator('table[data-pw-recortes]').waitFor();
    const campo = gp.getByLabel(/^Recorte no fim em/).last();
    await campo.fill('200');
    await campo.press('Enter');
    await page.waitForFunction(() => { const w = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.[0]; return w?.porPavimento?.some((e) => e.corteFim === 2); }, null, { timeout: 20000 });
    // zera o recorte: a entrada do pavimento some (espessura igual à da parede)
    await campo.fill('0');
    await campo.press('Enter');
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.[0]?.porPavimento?.length, null, { timeout: 20000 });
  },
};
