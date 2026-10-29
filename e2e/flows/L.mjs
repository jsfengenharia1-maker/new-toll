// Fluxos de interface — L (parte 1/1).
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NO_PICKERS, fileMenu, faixaAba, abrirConfiguracao, grupoEdif, tab, downloadText, num, telaDe, reenquadrarAte, dxfGradeL2, dwgMinimoL2 } from './helpers.mjs';

export const f_L1 = {
    name: 'L1: assistente de nova obra, dados gerais, etapas, versões no arquivo, recentes, exemplos, desfazer e texto de cargas',
    async run({ newPage, tmp }) {
      const page = await newPage(NO_PICKERS);
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const campo = async (loc, v) => { await loc.fill(v); await loc.press('Tab'); };
      const nPav = () => page.locator('.edpav tbody tr').count();
      await fileMenu(page, 'Nova obra…');
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
      assert.match(muros, /pendente/);
      assert.match(muros, /Opcional/);
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.textContent();
      assert.match(mt, /Descrição.*Residencial fictício · Teste de interface 2/s);
      assert.match(mt, /Origem do lançamento.*Assistente de nova obra/s);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await abrirConfiguracao(page, 'Dados gerais');
      await campo(page.getByLabel('Cidade', { exact: true }), 'Cidade Y');
      const ga = await grupoEdif(page, /^Arquivo e versões/);
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
      await page2.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const ga2 = await grupoEdif(page2, /^Arquivo e versões/);
      await ga2.getByRole('button', { name: 'Recuperar' }).click();
      await abrirConfiguracao(page2, 'Dados gerais');
      await page2.waitForFunction(() => [...document.querySelectorAll('label.field')].find((l) => l.textContent.startsWith('Cidade'))?.querySelector('input')?.value === 'Cidade X');
      await page2.close();
      await fileMenu(page, 'Obras recentes…');
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
      await fileMenu(page, 'Nova obra…');
      const nova2 = page.getByRole('dialog', { name: 'Nova obra' });
      await nova2.getByRole('button', { name: 'Assistente passo a passo' }).click();
      for (let i = 0; i < 6; i++) await nova2.getByRole('button', { name: 'Avançar' }).click();
      await nova2.getByRole('button', { name: 'Criar obra' }).click();
      await page.getByRole('dialog', { name: 'Dados gerais da obra' }).getByRole('button', { name: 'Concluir' }).click();
      assert.equal(await nPav(), 5);
      await page.getByRole('button', { name: 'Desfazer (Ctrl+Z)', exact: true }).click();
      assert.equal(await nPav(), 0);
      await fileMenu(page, 'Nova obra…');
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
  };

export const f_L2 = {
    name: 'L2: lançamento por DXF/DWG por camada, gerenciador de gabaritos, vistas por pavimento, viga pelo gabarito e F3',
    async run({ newPage, tmp }) {
      const page = await newPage(NO_PICKERS);
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const msgBarra = (re) => page.locator('.statusbar .msg', { hasText: re }).waitFor();
      const abrirGrupo = (re) => grupoEdif(page, re);
      const arq = join(tmp, 'grade.dxf');
      writeFileSync(arq, dxfGradeL2());
      const arqDwg = join(tmp, 'arq.dwg');
      writeFileSync(arqDwg, dwgMinimoL2());
      // 1) Nova obra › Lançamento por DXF/DWG: cria o edifício padrão e abre o assistente
      await fileMenu(page, 'Nova obra…');
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
      await faixaAba(page, 'Lançamento');
      await page.getByRole('toolbar', { name: /^Comandos: Lançamento/ }).getByRole('radio', { name: 'Viga pelo gabarito', exact: true }).click();
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
      await page.getByRole('radio', { name: 'Linha = eixo', exact: true }).click();
      await clique(3.0, 0.925);
      await page.locator('summary', { hasText: /^Vigas — Tipo \(3\)/ }).waitFor();
      assert.equal(await page.getByLabel('Alinhamento de V3', { exact: true }).inputValue(), 'centro');
      await page.keyboard.press('Escape');
      // 3) F3 e a janela de captura
      await faixaAba(page, 'Lançamento');
      await page.getByRole('toolbar', { name: /^Comandos: Lançamento/ }).getByRole('button', { name: 'Capturas…', exact: true }).click();
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
      await faixaAba(page, 'Lançamento');
      await page.getByRole('toolbar', { name: /^Comandos: Lançamento/ }).getByRole('button', { name: 'Gabaritos e vistas…', exact: true }).click();
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
      await faixaAba(page, 'Lançamento');
      await page.getByRole('toolbar', { name: /^Comandos: Lançamento/ }).getByRole('button', { name: 'Vistas por pavimento…', exact: true }).click();
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
  };

export const f_L3 = {
    name: 'L3: importação de IFC (leitor web-ifc sob demanda, pavimentos e grupos, materiais, revisão, aplicação e memorial)',
    async run({ newPage }) {
      const page = await newPage(NO_PICKERS);
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const esperar = (fn, arg, t = 30000) => page.waitForFunction(fn, arg, { timeout: t });
      const arq = new URL('../../src/core/ifc/fixtures/edificio.ifc', import.meta.url).pathname;
      // 1) Nova obra › Importação de IFC
      await fileMenu(page, 'Nova obra…');
      const nova = page.getByRole('dialog', { name: 'Nova obra' });
      await nova.getByRole('button', { name: 'Importação de IFC', exact: true }).click();
      await nova.getByRole('button', { name: 'Importar arquivo IFC…', exact: true }).click();
      const wiz = page.getByRole('dialog', { name: 'Importação de IFC' });
      await wiz.waitFor();
      // 2) passo Arquivo: o leitor vem de vendor/ sob demanda; se o WASM não carregar neste ambiente, vale a mensagem de indisponível
      await wiz.locator('input[type=file]').setInputFiles(arq);
      const resumo = wiz.locator('[data-ifc-resumo]');
      const indisp = wiz.getByText(/IFC indisponível neste ambiente/);
      await Promise.race([resumo.waitFor({ timeout: 60000 }), indisp.waitFor({ timeout: 60000 })]);
      if (await indisp.count()) { console.log('    (L3: WASM do web-ifc indisponível neste ambiente; verificada só a mensagem)'); return; }
      const txt = await resumo.innerText();
      assert.match(txt, /edificio\.ifc/);
      assert.match(txt, /IFC4/);
      assert.match(txt, /IFCCOLUMN\s+9/);
      assert.match(txt, /IFCBEAM\s+8/);
      assert.match(txt, /IFCSLAB\s+2/);
      assert.match(txt, /IFCFOOTING\s+1/);
      await wiz.getByRole('button', { name: 'Avançar', exact: true }).click();
      // 3) passo Edifício e pavimentos: dois pavimentos de planta idêntica sugeridos como um grupo
      assert.equal(await wiz.getByLabel('Nome da obra', { exact: true }).inputValue(), 'Edificio Ficticio');
      const tab = wiz.locator('[data-ifc-pavimentos]');
      assert.equal(await tab.locator('tbody tr').count(), 2);
      assert.equal(await wiz.getByLabel('Grupo de Pavimento 1', { exact: true }).inputValue(), 'Tipo');
      assert.equal(await wiz.getByLabel('Grupo de Pavimento 2', { exact: true }).inputValue(), 'Tipo');
      assert.equal(await wiz.getByLabel('Cota de Pavimento 2', { exact: true }).inputValue(), '3');
      assert.match(await tab.locator('tbody tr').nth(1).innerText(), /3,00/);
      const nome = wiz.getByLabel('Nome da obra', { exact: true });
      await nome.fill('Obra IFC teste');
      await nome.press('Tab');
      await wiz.getByRole('button', { name: 'Avançar', exact: true }).click();
      // 4) passo Materiais: concreto e aço do arquivo ligados aos tipos de elemento
      const mats = await wiz.locator('[data-ifc-materiais-arquivo]').innerText();
      assert.match(mats, /Concreto C30\s+fck 30 MPa/);
      assert.match(mats, /CA-50\s+CA-50/);
      assert.equal(await wiz.getByLabel('fck de pilares', { exact: true }).inputValue(), '30');
      assert.equal(await wiz.getByLabel('fck de lajes', { exact: true }).inputValue(), '25');
      assert.equal(await wiz.getByLabel(/^Material de lajes/).inputValue(), 'Concreto C25');
      assert.equal(await wiz.getByLabel(/^Aço de pilares/).inputValue(), 'CA-50');
      await wiz.getByRole('button', { name: 'Avançar', exact: true }).click();
      // 5) revisão: contagens da proposta, ignorados e aplicação
      const rev = await wiz.locator('[data-ifc-revisao]').innerText();
      assert.match(rev, /Pavimentos\s+2/);
      assert.match(rev, /Grupos\s+1/);
      assert.match(rev, /Pilares\s+5/);
      assert.match(rev, /Vigas\s+4/);
      assert.match(rev, /Lajes \(IfcSlab\)\s+1/);
      assert.match(rev, /Paredes de concreto\s+1/);
      assert.match(await wiz.innerText(), /Ignorado: 1 × IFCPILE/);
      await wiz.getByRole('button', { name: 'Importar', exact: true }).click();
      const gerais = page.getByRole('dialog', { name: 'Dados gerais da obra' });
      await gerais.waitFor();
      assert.equal(await gerais.getByLabel('Nome da obra').inputValue(), 'Obra IFC teste');
      await gerais.getByRole('button', { name: 'Concluir' }).click();
      // 6) modelo gerado: pavimentos, grupo, pilares (um com circular, um girado), vigas, laje com abertura, parede, origem
      await esperar(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pilares ?? []).length === 5, null);
      const m = await page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building')).building);
      assert.equal(m.obra.origem, 'ifc');
      assert.equal(m.pavimentos.length, 2);
      assert.equal(m.grupos.length, 1);
      assert.equal(m.vigas.length, 4);
      assert.equal(m.lajes.length, 1);
      assert.equal(m.lajes[0].furos.length, 1);
      assert.equal(m.paredes.length, 1);
      assert.ok(m.pilares.some((p) => p.secao.tipo === 'circ' && Math.abs(p.secao.d - 0.3) < 1e-9));
      assert.ok(m.pilares.some((p) => p.angulo === 90));
      assert.ok(m.pilares.every((p) => p.origemLancamento.startsWith('ifc:') && p.nasce === 'fundacao'));
      assert.deepEqual(m.norma.fckElem, { laje: 25 });
      // 7) memorial: origem IFC, materiais e relatório
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mi = await memo.locator('[data-memorial-ifc]').innerText();
      assert.match(mi, /Arquivo\s+edificio\.ifc/);
      assert.match(mi, /Esquema\s+IFC4/);
      assert.match(mi, /Lajes\s+Concreto C25\s+25 MPa/);
      assert.match(mi, /Pilares lançados\s+5/);
      assert.match(mi, /Ignorado: 1 × IFCFOOTING/);
      assert.match(await memo.textContent(), /Origem do lançamento.*Importação de IFC/s);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 8) desfazer volta ao estado anterior à importação em um passo
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await page.keyboard.press('Control+z');
      await esperar(() => (JSON.parse(localStorage.getItem('statikos:building')).building.pilares ?? []).length === 0, null);
    },
  };

export const f_L4 = {
    name: 'L4: cópia entre grupos, união, áreas, ajuda F1, atalhos configuráveis, guia rápido, referências e memorial',
    async run({ newPage }) {
      const page = await newPage(NO_PICKERS);
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const abrirGrupo = (re) => grupoEdif(page, re);
      const cmd = async (txt) => { await page.locator('#edcmd').fill(txt); await page.locator('#edcmd').press('Enter'); };
      const pil = (x, y) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`;
      const viga = (a, z) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": [${JSON.stringify(a)}, ${JSON.stringify(z)}], "secao": {"b": 0.15, "h": 0.4}}}`;
      await cmd('lote {"comandos": [' + [pil(0, 0), pil(5, 0), pil(5, 4), pil(0, 4), viga([0, 0], [5, 0]), viga([5, 0], [5, 4]), viga([5, 4], [0, 4]), viga([0, 4], [0, 0]),
        '{"nome": "laje.criar", "params": {"grupo": "g_3", "contorno": [[0, 0], [5, 0], [5, 4], [0, 4]]}}'].join(', ') + ']}');
      await page.locator('summary', { hasText: 'Pilares (4)' }).waitFor();

      // 1) áreas por grupo e cópia do Tipo para a Cobertura
      const gr = await abrirGrupo(/^Grupos: cópia, união e áreas/);
      const linha = (id) => gr.locator(`[data-areas-grupos] tr[data-grupo="${id}"]`);
      assert.match(await linha('g_3').innerText(), /3\s+20,00/);
      assert.match(await linha('g_7').innerText(), /1\s+0,00/);
      await gr.getByRole('button', { name: 'Copiar de outro grupo…', exact: true }).click();
      const dlg = page.getByRole('dialog', { name: 'Copiar de outro grupo' });
      await dlg.getByLabel(/^Grupo de origem/).selectOption({ label: 'Tipo' });
      await dlg.getByLabel(/^Grupo de destino/).selectOption({ label: 'Cobertura' });
      assert.equal(await dlg.locator('.esq-pav.origem').count(), 3);
      assert.equal(await dlg.locator('.esq-pav.destino').count(), 1);
      // ajuda da janela
      await dlg.getByRole('button', { name: 'Ajuda de Copiar de outro grupo', exact: true }).click();
      await page.getByRole('status', { name: 'Ajuda', exact: true }).getByText('Escolha o grupo de origem', { exact: false }).waitFor();
      await page.getByRole('button', { name: 'Fechar a ajuda', exact: true }).click();
      await dlg.getByRole('button', { name: 'Copiar conteúdo do grupo', exact: true }).click();
      await dlg.waitFor({ state: 'detached' });
      assert.match(await linha('g_7').innerText(), /1\s+20,00/);
      // um passo no histórico: desfazer volta
      await page.keyboard.press('Control+z');
      assert.match(await linha('g_7').innerText(), /1\s+0,00/);
      await page.keyboard.press('Control+y');
      assert.match(await linha('g_7').innerText(), /1\s+20,00/);

      // 2) modo de ajuda: F1 liga, clique mostra a explicação sem agir, Esc desliga
      await page.keyboard.press('F1');
      await page.waitForFunction(() => document.body.classList.contains('ajuda-on'));
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Premissas', exact: true }).click();
      const painel = page.getByRole('status', { name: 'Ajuda', exact: true });
      await painel.getByText('Todas as hipóteses de cálculo', { exact: false }).waitFor();
      assert.equal(await page.locator('.edif-tabs').getByRole('tab', { name: 'Premissas', exact: true }).getAttribute('aria-selected'), 'false');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.body.classList.contains('ajuda-on'));
      assert.equal(await painel.count(), 0);
      // botão da barra de título e botão direito
      await page.getByRole('button', { name: 'Modo de ajuda (F1)', exact: true }).click();
      await page.waitForFunction(() => document.body.classList.contains('ajuda-on'));
      await page.locator('.edif-main').click({ button: 'right', position: { x: 20, y: 60 } });
      await page.waitForFunction(() => !document.body.classList.contains('ajuda-on'));

      // 3) barra de atalhos configurável e persistente
      await page.getByRole('button', { name: 'Atalho: Desfazer', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Atalho: Pilar', exact: true }).count(), 0);
      await page.getByRole('button', { name: 'Configurar a barra de atalhos', exact: true }).click();
      const cfg = page.getByRole('dialog', { name: 'Configurar atalhos' });
      await cfg.getByLabel('Atalho Pilar', { exact: true }).check();
      await cfg.getByLabel('Atalho Desfazer', { exact: true }).uncheck();
      await cfg.getByRole('button', { name: 'Fechar', exact: true }).click();
      await page.getByRole('button', { name: 'Atalho: Pilar', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Atalho: Desfazer', exact: true }).count(), 0);
      assert.deepEqual(JSON.parse(await page.evaluate(() => localStorage.getItem('statikos:barra'))), ['refazer', 'ajuda', 'guia', 'pilar']);
      await page.getByRole('button', { name: 'Atalho: Pilar', exact: true }).click();
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'pilar');
      await page.getByRole('button', { name: 'Configurar a barra de atalhos', exact: true }).click();
      await page.getByRole('dialog', { name: 'Configurar atalhos' }).getByRole('button', { name: 'Restaurar atalhos padrão', exact: true }).click();
      await page.getByRole('dialog', { name: 'Configurar atalhos' }).getByRole('button', { name: 'Fechar', exact: true }).click();
      await page.getByRole('button', { name: 'Atalho: Desfazer', exact: true }).waitFor();

      // 4) guia rápido: sem as ajudas dos diálogos
      await page.getByRole('button', { name: 'Atalho: Guia rápido', exact: true }).click();
      const guia = page.getByRole('dialog', { name: 'Guia rápido' });
      const gt = await guia.locator('[data-guia-rapido]').innerText();
      assert.match(gt, /Opções de cálculo/);
      assert.match(gt, /Mover texto de referência/);
      assert.doesNotMatch(gt, /Copiar de outro grupo\s*\n?\s*Escolha o grupo de origem/);
      await guia.getByRole('button', { name: 'Fechar', exact: true }).click();

      // 5) referências: tipos de texto na obra e mover o texto do pilar por dois cliques
      const ref = await abrirGrupo(/^Referências e dados/);
      await ref.getByLabel('Mostrar texto: cargas', { exact: true }).uncheck();
      await ref.getByLabel('Mostrar texto: cargas', { exact: true }).waitFor();
      assert.equal(await ref.getByLabel('Mostrar texto: cargas', { exact: true }).isChecked(), false);
      await ref.getByLabel('Mostrar texto: cargas', { exact: true }).check();
      await page.locator('.planta-cv').click({ position: { x: 5, y: 5 }, button: 'right' });
      await page.keyboard.press('f');
      await page.waitForTimeout(100);
      await ref.getByRole('button', { name: 'Mover texto de referência', exact: true }).click();
      const [ax, ay] = await telaDe(page, 0.1, 0.2);
      await page.mouse.move(ax, ay); await page.mouse.click(ax, ay);
      const [bx, by] = await telaDe(page, 1.2, 1.5);
      await page.mouse.move(bx, by); await page.mouse.click(bx, by);
      await ref.getByText('1 texto(s) fora da posição automática.', { exact: true }).waitFor();
      await ref.getByRole('button', { name: 'Restaurar posições dos textos', exact: true }).click();
      await ref.getByText('Dois cliques', { exact: false }).waitFor();

      // 6) memorial: áreas por grupo e anexo do guia rápido
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo.locator('[data-memorial-areas]').innerText(), /Tipo\s+3\s+20,00/);
      assert.equal(await memo.locator('[data-guia-rapido]').count(), 0);
      await memo.getByLabel('Incluir guia rápido (anexo)', { exact: true }).check();
      assert.equal(await memo.locator('[data-guia-rapido]').count(), 1);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_L5 = {
    name: 'L5: contorno retangular, modo simples, Backspace, prolongar por comprimento, panos a definir, abertura retangular, direção do pano e cargas rápidas',
    async run({ newPage }) {
      const page = await newPage(NO_PICKERS);
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const pil = (x, y) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`;
      await cmd('lote {"comandos": [' + [pil(0, 0), pil(8, 0), pil(8, 5), pil(0, 5)].join(', ') + ']}');
      await page.locator('summary', { hasText: 'Pilares (4)' }).waitFor();
      await page.locator('.planta-cv[data-vista]').waitFor();
      const solta = () => page.evaluate(() => document.activeElement?.blur?.());
      const abrir = async () => { const d = page.locator('.edif-in details.group').filter({ has: page.locator(':scope > summary', { hasText: /^Ferramentas de lançamento/ }) }).first(); if (!(await d.evaluate((x) => x.open))) await d.locator(':scope > summary').click(); return d; };
      const clicar = async (x, y) => { const [sx, sy] = await telaDe(page, x, y); await page.mouse.click(sx, sy); };
      const vigas = (n) => page.locator('summary', { hasText: new RegExp(`^Vigas — Tipo \\(${n}\\)`) }).waitFor();
      const msgBarra = (t) => page.locator('.statusbar .msg', { hasText: t }).waitFor();
      const painel = await abrir();
      await painel.getByLabel('Criar o pano a definir (?) ao fechar um contorno por vigas').uncheck(); // L7: o fluxo detecta os panos pelo botão
      const num = async (re, v) => { const c = painel.getByLabel(re); await c.fill(v); await c.press('Enter'); };

      // 1) contorno retangular (ângulo zero): dois cliques e Enter criam as quatro vigas, um passo no desfazer
      await painel.getByRole('button', { name: 'Lançar contorno retangular', exact: true }).click();
      await page.locator('.planta-cv[data-vista]').waitFor();
      await solta();
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'contornoRet');
      await clicar(0, 0);
      await clicar(8, 5);
      await page.keyboard.press('Enter');
      await vigas(4);
      await solta();
      await page.keyboard.press('Control+z');
      await vigas(0);
      await page.keyboard.press('Control+y');
      await vigas(4);

      // 2) viga em polilinha: Backspace apaga o último ponto
      await page.keyboard.press('Escape');
      await page.keyboard.press('v');
      await clicar(0, 10);
      await clicar(3, 10);
      await page.keyboard.press('Backspace');
      await clicar(6, 10);
      await page.keyboard.press('Enter');
      await vigas(5);
      const g = page.locator('.edif-in details.group').filter({ has: page.locator(':scope > summary', { hasText: /^Vigas — Tipo/ }) }).first();
      if (!(await g.evaluate((x) => x.open))) await g.locator(':scope > summary').click();
      assert.equal((await g.locator('table.quadro tbody tr').last().locator('td.num').first().innerText()).trim(), '6,00');

      // 3) prolongar por comprimento fixo (O): 1,5 m a mais na ponta
      await num(/^Prolongar por comprimento/, '1,5');
      await solta();
      await page.keyboard.press('o');
      await clicar(5.9, 10.02);
      await msgBarra('ajustada');
      assert.equal((await g.locator('table.quadro tbody tr').last().locator('td.num').first().innerText()).trim(), '7,50');
      await num(/^Prolongar por comprimento/, '0');

      // 4) modo simples com deslocamento: cada par de pontos é uma viga
      await painel.getByLabel('Modo simples: cada par de pontos é uma viga').check();
      await num(/^Deslocamento da linha clicada/, '10');
      await solta();
      await page.keyboard.press('v');
      await clicar(0, 12);
      await clicar(4, 12);
      await vigas(6);
      await clicar(0, 13);
      await clicar(4, 13);
      await vigas(7);
      await painel.getByLabel('Modo simples: cada par de pontos é uma viga').uncheck();
      await num(/^Deslocamento da linha clicada/, '0');

      // 5) panos a definir: erro DEFINIR_PANO e cálculo bloqueado até atribuir o tipo
      await painel.getByRole('button', { name: 'Detectar panos como a definir', exact: true }).click();
      await painel.getByText('1 pano(s) a definir', { exact: false }).waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: /^Verificação/ }).click();
      await page.getByText('é um pano a definir', { exact: false }).waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Análise', exact: true }).click();
      await page.getByRole('button', { name: 'Calcular', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'DEFINIR_PANO' }).waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta', exact: true }).click();
      await painel.getByRole('button', { name: 'Atribuir o tipo da ferramenta Laje aos panos a definir', exact: true }).click();
      await painel.getByText('Todo contorno fechado por vigas', { exact: false }).waitFor();

      // 6) abertura retangular com viga de borda alta
      await painel.getByLabel(/^Modo da abertura/).selectOption({ label: 'ângulo zero (dois cantos)' });
      await painel.getByLabel(/^Viga de borda da abertura/).selectOption({ label: 'alta' });
      await painel.getByRole('button', { name: 'Lançar abertura retangular', exact: true }).click();
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'aberturaRet');
      await clicar(4, 2.5);
      await clicar(2, 1);
      await clicar(3, 2);
      await msgBarra('Abertura retangular');
      await vigas(11);

      // 7) direção do pano por dois pontos
      await painel.getByLabel(/^Direção do pano por/).selectOption({ label: 'dois pontos' });
      await painel.getByRole('button', { name: 'Definir a direção do pano', exact: true }).click();
      await clicar(6, 3.5);
      await clicar(1, 1);
      await clicar(2, 2);
      await msgBarra('alterada');
      await painel.getByRole('button', { name: 'Mudar o ponto de inserção do pano', exact: true }).click();
      await clicar(6, 3.5);
      await clicar(7.8, 4.8);
      await msgBarra('alterada');

      // 8) cargas rápidas: laje inteira (um clique) e ao longo da viga
      await painel.getByRole('button', { name: 'Lançar carga na laje inteira', exact: true }).click();
      await clicar(6, 3.5);
      await msgBarra('kN/m²');
      await painel.getByRole('button', { name: 'Lançar carga ao longo da viga', exact: true }).click();
      await clicar(3, 10.02);
      await msgBarra('carga(s) linear(es)');

      // 9) memorial: aberturas com a viga de borda
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo.locator('[data-memorial-aberturas]').innerText(), /L1\s+Tipo\s+1\s+\d+,\d+\s+viga alta/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta', exact: true }).click();
      await solta();
      await page.keyboard.press('Control+z');
      await page.keyboard.press('Control+z');
    },
  };

export const f_L6 = {
    name: 'L6: cotas temporárias editáveis, desfazer, série de cotas com Tab e Esc e fixar a cota',
    async run({ newPage }) {
      const page = await newPage(NO_PICKERS);
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const esperar = (fn, arg, t = 30000) => page.waitForFunction(fn, arg, { timeout: t });
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building')).building);
      await cmd('lote {"comandos": [' + [0, 5, 10].map((x) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": 0, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pilares?.length === 3, null);
      await page.locator('.planta-cv[data-vista]').waitFor();
      await reenquadrarAte(page, [[0, -3], [10, 3]]);
      const solta = () => page.evaluate(() => document.activeElement?.blur?.());
      const clicar = async (x, y, dx = 0) => { const [sx, sy] = await telaDe(page, x, y); await page.mouse.click(sx + dx, sy); };

      // 1) selecionar o pilar do meio mostra as cotas temporárias; clicar no valor, digitar 450 e Enter move o selecionado
      await clicar(5, 0);
      await solta();
      await clicar(7.5, 0);
      const campo = page.getByLabel('Valor da cota (cm)', { exact: true });
      await campo.waitFor();
      assert.equal(await campo.inputValue(), '470');
      await campo.fill('450');
      await campo.press('Enter');
      await esperar(() => Math.abs(JSON.parse(localStorage.getItem('statikos:building')).building.pilares[1].x - 5.2) < 1e-6, null);
      assert.equal((await modelo()).pilares[2].x, 10);
      // um desfazer restaura
      await solta();
      await page.keyboard.press('Control+z');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building')).building.pilares[1].x === 5, null);

      // 2) fixar: a marca + ao lado do valor cria a cota permanente de 470 cm
      await clicar(5, 0);
      await solta();
      await clicar(7.5, 0, 24);
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building')).building.cotas?.length === 1, null);
      assert.equal((await modelo()).cotas[0].refs.length, 2);

      // 3) série: D com Medir ativa alterna para Cota em série; Tab troca face e eixo; Enter fecha; clique posiciona a linha
      await solta();
      await page.keyboard.press('Escape');
      await page.keyboard.press('d');
      await page.keyboard.press('d');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'cota');
      await clicar(0, 0);
      await clicar(5, 0);
      await clicar(10, 0);
      await page.keyboard.press('Tab');
      await page.locator('.statusbar .msg', { hasText: 'eixos e centros' }).waitFor();
      await page.keyboard.press('Tab');
      await page.locator('.statusbar .msg', { hasText: 'faces' }).waitFor();
      await page.keyboard.press('Enter');
      await clicar(5, -2);
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building')).building.cotas?.length === 2, null);
      const serie = (await modelo()).cotas[1];
      assert.equal(serie.refs.length, 4);
      assert.equal(serie.linha.offset, -2);
      // Esc termina a ferramenta
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'selecionar');
      // desfazer da cota criada: um passo
      await page.keyboard.press('Control+z');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building')).building.cotas?.length === 1, null);
    },
  };

export const f_L7 = {
    name: 'L7: pano a definir ao fechar o contorno (um desfazer), pano apagado vira abertura com cruz tracejada, restaurar e grupo de lançamento aberto ao escolher o tipo da seção',
    async run({ newPage }) {
      const page = await newPage(NO_PICKERS);
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const pil = (x, y) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`;
      await cmd('lote {"comandos": [' + [pil(0, 0), pil(8, 0), pil(8, 5), pil(0, 5)].join(', ') + ']}');
      await page.locator('summary', { hasText: 'Pilares (4)' }).waitFor();
      await page.locator('.planta-cv[data-vista]').waitFor();
      const solta = () => page.evaluate(() => document.activeElement?.blur?.());
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building')).building);
      const esperar = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 30000 });
      const clicar = async (x, y) => { const [sx, sy] = await telaDe(page, x, y); await page.mouse.click(sx, sy); };
      const grupoLanc = page.locator('.edif-in details.group').filter({ has: page.locator(':scope > summary', { hasText: /^Ferramentas de lançamento/ }) }).first();
      const abrirLanc = async () => { if (!(await grupoLanc.evaluate((x) => x.open))) await grupoLanc.locator(':scope > summary').click(); return grupoLanc; };

      // 1) contorno retangular de vigas: o pano a definir nasce no mesmo passo (C7.2)
      const painel = await abrirLanc();
      await painel.getByRole('button', { name: 'Lançar contorno retangular', exact: true }).click();
      await page.locator('.planta-cv[data-vista]').waitFor();
      await solta();
      await clicar(0, 0);
      await clicar(8, 5);
      await page.keyboard.press('Enter');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building')).building.lajes.length === 1, null);
      let m = await modelo();
      assert.equal(m.vigas.length, 4);
      assert.equal(m.lajes[0].definir, true);
      await painel.getByText('1 pano(s) a definir', { exact: false }).waitFor();
      // um desfazer leva vigas e pano
      await solta();
      await page.keyboard.press('Control+z');
      await esperar(() => { const b = JSON.parse(localStorage.getItem('statikos:building')).building; return b.vigas.length === 0 && b.lajes.length === 0; }, null);
      await solta();
      await page.keyboard.press('Control+y');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building')).building.lajes.length === 1, null);

      // 2) apagar o pano selecionado: vira abertura (cruz tracejada) e a detecção não o recria
      await page.keyboard.press('Escape');
      await page.keyboard.press('s');
      await clicar(4, 2.5);
      await painel.getByRole('button', { name: 'Apagar o pano selecionado (vira abertura)', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building')).building.panosVazios?.length === 1, null);
      m = await modelo();
      assert.equal(m.lajes.length, 0);
      assert.equal(await page.locator('canvas.int').getAttribute('data-panos-vazios'), '1');
      await painel.getByText('1 abertura(s) de pano', { exact: false }).waitFor();
      await painel.getByRole('button', { name: 'Detectar panos como a definir', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'Nenhuma região fechada por vigas sem laje' }).waitFor();
      assert.equal((await modelo()).lajes.length, 0);

      // 3) restaurar a abertura: volta como pano a definir
      await painel.getByRole('button', { name: 'Restaurar a abertura 1 como pano', exact: true }).click();
      await esperar(() => { const b = JSON.parse(localStorage.getItem('statikos:building')).building; return b.lajes.length === 1 && !b.panosVazios; }, null);
      assert.equal((await modelo()).lajes[0].definir, true);

      // 4) o grupo Ferramentas de lançamento abre ao escolher o tipo da seção da viga (C6.3)
      await grupoLanc.locator(':scope > summary').click();
      assert.equal(await grupoLanc.evaluate((x) => x.open), false);
      const gvigas = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Vigas — / }) });
      if (!(await gvigas.evaluate((x) => x.open))) await gvigas.locator(':scope > summary').click();
      await gvigas.locator('table.quadro tbody tr').first().locator('td').nth(3).click();
      await grupoEdif(page, 'Vínculos, flambagem e cobrimento');
      const sv = page.locator('[data-secao-viga]');
      await sv.waitFor();
      await sv.getByLabel(/^Tipo da seção/).selectOption('T');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building')).building.vigas.some((v) => v.mesa?.tipo === 'T'), null);
      await page.waitForFunction(() => { const d = [...document.querySelectorAll('.edif-in details.group')].find((x) => /^Ferramentas de lançamento/.test(x.querySelector(':scope > summary')?.textContent ?? '')); return !!d?.open; }, null, { timeout: 15000 });
    },
  };

export const f_L8 = {
    name: 'L8: alinhamento (rastreamento) ao lançar pilares: P2 prende o Y de P1, rótulo na barra, F9 desliga',
    async run({ newPage }) {
      const page = await newPage(NO_PICKERS);
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      // pilar de enquadramento longe das linhas de alinhamento do teste
      const pil = (x, y) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`;
      await cmd('lote {"comandos": [' + [pil(0, 0), pil(8, 6)].join(', ') + ']}');
      await page.locator('summary', { hasText: 'Pilares (2)' }).waitFor();
      await page.locator('.planta-cv[data-vista]').waitFor();
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building')).building);
      const esperarPilares = (n) => page.waitForFunction((k) => JSON.parse(localStorage.getItem('statikos:building')).building.pilares.length === k, n, { timeout: 30000 });
      await page.locator('.planta-st').click();
      await page.keyboard.press('p');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'pilar');
      await reenquadrarAte(page, [[0, 0], [8, 6], [5, 1.5]]);
      // P1 pelo clique
      const [x1, y1] = await telaDe(page, 2, 1.5);
      await page.mouse.click(x1, y1);
      await esperarPilares(3);
      const p1 = (await modelo()).pilares.find((q) => q.x > 1 && q.x < 3);
      // cursor 5 px abaixo do alinhamento horizontal de P1 (tolerância padrão 8 px): a barra mostra o alinhamento e o clique prende o Y
      const [x2, y2] = await telaDe(page, 5, p1.y);
      await page.mouse.move(x2, y2 + 5, { steps: 4 });
      await page.waitForFunction(() => /alinhamento/.test(document.querySelector('.planta-st .num')?.textContent ?? ''), null, { timeout: 20000 });
      await page.mouse.click(x2, y2 + 5);
      await esperarPilares(4);
      const m = await modelo();
      const p2 = m.pilares.find((q) => q.x > 4 && q.x < 6);
      assert.equal(p2.y, p1.y);
      assert.notEqual(p2.x, p1.x);
      // F9 desliga o alinhamento: o mesmo desvio de 5 px não prende mais
      await page.keyboard.press('F9');
      await page.locator('.statusbar .msg', { hasText: /Alinhamento desligado/ }).waitFor();
      await page.mouse.move(x2 + 40, y2 + 5, { steps: 4 });
      await page.waitForFunction(() => !/alinhamento/.test(document.querySelector('.planta-st .num')?.textContent ?? ''), null, { timeout: 20000 });
      await page.keyboard.press('F9');
      await page.locator('.statusbar .msg', { hasText: /Alinhamento ligado/ }).waitFor();
    },
  };
