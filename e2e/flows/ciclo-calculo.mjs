// Fluxos de interface — ciclo calcular → corrigir → recalcular (janela "Antes de calcular", painel "Erros do cálculo", aviso de cálculo concluído).
import assert from 'node:assert/strict';

const PILARES = [[0, 0], [5, 0], [10, 0], [0, 4], [5, 4], [10, 4]];
const VIGAS = [[[0, 0], [5, 0]], [[5, 0], [10, 0]], [[0, 4], [5, 4]], [[5, 4], [10, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]], [[10, 0], [10, 4]]];

/** Lança seis pilares e sete vigas (dois panos) no grupo g_3 pela linha de comando. */
async function lancar(page, comandos = []) {
  const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
  await cmd('lote {"comandos": [' + PILARES.map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
  await page.locator('[data-etapa="pilares"][data-estado="feito"]').waitFor();
  await cmd('lote {"comandos": [' + VIGAS.map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
  for (const c of comandos) await cmd(c);
  return cmd;
}

const botaoCalcularFaixa = async (page) => {
  await page.locator('[data-etapa="calcular"]').click();
  return page.getByRole('toolbar', { name: /^Comandos: Calcular/ }).getByRole('button', { name: 'Calcular', exact: true });
};

export const f_ciclo_antes_de_calcular = {
  name: 'ciclo: lajes a definir → Calcular abre "Antes de calcular" (texto claro, ir ao elemento, definir tipo pelo seletor) → Calcular de novo sem impeditivos',
  async run({ newPage }) {
    const page = await newPage(undefined, { viewport: { width: 1440, height: 900 }, irAoResultado: true });
    await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
    await page.getByRole('navigation', { name: 'Etapas da obra' }).waitFor();
    await lancar(page, ['laje.detectarPanos {"grupo": "g_3", "definir": true}']);
    await page.locator('[data-etapa="vigasLajes"][data-estado="feito"]').waitFor();

    // 1) Calcular não roda a análise: abre a janela com a pendência em linguagem clara, o código só discreto
    await (await botaoCalcularFaixa(page)).click();
    const antes = page.getByRole('dialog', { name: 'Antes de calcular' });
    await antes.waitFor();
    const impeditivas = antes.locator('[data-pendencias-impeditivas] [data-pendencia="DEFINIR_PANO"]');
    assert.equal(await impeditivas.count(), 1, 'as duas lajes viram UMA pendência agrupada');
    assert.match(await impeditivas.locator('b').innerText(), /^2 lajes sem tipo definido \(L1, L2\)\.$/);
    assert.ok(!/DEFINIR_PANO/.test(await impeditivas.locator('b').innerText()), 'o código bruto não está no texto principal');
    assert.equal(await antes.locator('[data-pend-grupo="lajes"] h4').innerText(), 'Lajes');
    assert.match(await page.locator('.statusbar .msg').innerText(), /Antes de calcular/);
    assert.equal(await antes.getByRole('button', { name: 'Calcular', exact: true }).isDisabled(), true, 'Calcular só depois de resolver as impeditivas');
    assert.equal(await page.locator('[data-etapa="resultados"]').getAttribute('data-estado'), 'indisponivel', 'nada foi calculado');

    // 2) "Ir às lajes" fecha a janela, vai à planta e deixa as duas lajes selecionadas
    await antes.getByRole('button', { name: 'Ir às lajes', exact: true }).click();
    await antes.waitFor({ state: 'detached' });
    assert.equal(await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta', exact: true }).getAttribute('aria-selected'), 'true');
    await page.locator('[data-grupo-tipo-pano]').waitFor();
    assert.match(await page.locator('[data-grupo-tipo-pano] summary').innerText(), /Tipo de pano \(2\)/);

    // 3) de novo: o botão da correção abre o seletor de tipo com as duas lajes; escolher Maciça resolve a pendência
    await (await botaoCalcularFaixa(page)).click();
    await antes.waitFor();
    await antes.getByRole('button', { name: 'Definir tipo das lajes L1, L2', exact: true }).click();
    const tipo = page.getByRole('dialog', { name: 'Tipo das lajes' });
    await tipo.getByText('2 panos', { exact: true }).waitFor();
    await tipo.getByLabel(/^Tipo de pano/).selectOption({ label: 'Maciça' });
    await tipo.getByRole('button', { name: 'Fechar', exact: true }).click();
    await antes.locator('[data-sem-impeditivas]').waitFor();
    assert.equal(await antes.locator('[data-pendencias-impeditivas]').count(), 0);

    // 4) Calcular (da própria janela) roda a análise; não volta a abrir a janela
    await antes.getByRole('button', { name: /^Calcular( mesmo assim)?$/ }).click();
    await antes.waitFor({ state: 'detached' });
    await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
    await page.locator('[data-etapa="calcular"][data-estado="feito"]').waitFor();
    assert.equal(await page.getByRole('dialog', { name: 'Antes de calcular' }).count(), 0);
    // sem erros: etapa Resultados e aviso; com erros: vista Verificação com o painel (os dois sinais são visíveis, não só a mensagem de status)
    const ok = page.locator('[data-calculo-ok]'), erros = page.locator('[data-erros-calculo]');
    await ok.or(erros).first().waitFor();
  },
};

export const f_ciclo_erros_do_calculo = {
  name: 'ciclo: pilar reprovado → painel "Erros do cálculo" abre sozinho (por tipo e pavimento, com sugestão) → clique leva ao pilar; sem erros → etapa Resultados com aviso e atalhos',
  async run({ newPage }) {
    const page = await newPage(undefined, { viewport: { width: 1440, height: 900 }, irAoResultado: true });
    await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
    await page.getByRole('navigation', { name: 'Etapas da obra' }).waitFor();
    // carga enorme na laje: pilares (e vigas) não atendem
    await lancar(page, ['laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}', 'carga.area {"grupo": "g_3", "caso": "G", "contorno": [[0.5, 0.5], [9.5, 0.5], [9.5, 3.5], [0.5, 3.5]], "valor": 1500}']);
    await page.locator('[data-etapa="vigasLajes"][data-estado="feito"]').waitFor();
    await (await botaoCalcularFaixa(page)).click();
    await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });

    // 1) o painel abre sozinho na vista Verificação
    const painel = page.locator('[data-erros-calculo]');
    await painel.waitFor();
    assert.equal(await page.locator('.edif-tabs').getByRole('tab', { name: /^Verificação/ }).getAttribute('aria-selected'), 'true');
    assert.match(await painel.locator('[data-contagem-erros]').innerText(), /erros?: corrija o que está indicado/);
    assert.equal(await page.locator('[data-calculo-ok]').count(), 0);
    const grupoPilar = painel.locator('[data-erros-grupo="pilar"]');
    await grupoPilar.waitFor();
    assert.ok((await grupoPilar.locator('h4').count()) >= 1, 'agrupado por pavimento');
    assert.ok((await grupoPilar.locator('[data-sugestao]').count()) >= 1, 'a sugestão de correção aparece');

    // 2) clicar em "Ir ao elemento" leva à planta com o pilar selecionado (aba contextual do pilar na faixa)
    await grupoPilar.getByRole('button', { name: 'Ir ao elemento', exact: true }).first().click();
    assert.equal(await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta', exact: true }).getAttribute('aria-selected'), 'true');
    await page.getByRole('tablist', { name: 'Faixa de comandos' }).locator('.rtab.ctx', { hasText: /Pilar/ }).waitFor();

    // 3) "Abrir dimensionamento" abre a janela de resultados do elemento
    await page.locator('.edif-tabs').getByRole('tab', { name: /^Verificação/ }).click();
    await painel.waitFor();
    await grupoPilar.getByRole('button', { name: 'Abrir dimensionamento', exact: true }).first().click();
    await page.getByRole('dialog').first().waitFor();
  },
};

export const f_ciclo_calculo_concluido = {
  name: 'ciclo: cálculo sem erros → etapa Resultados e aviso "Cálculo concluído sem erros" com atalhos para esforços, deformada, armaduras e pranchas',
  async run({ newPage }) {
    const page = await newPage(undefined, { viewport: { width: 1440, height: 900 }, irAoResultado: true });
    await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
    await page.getByRole('navigation', { name: 'Etapas da obra' }).waitFor();
    await lancar(page, ['laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}', 'carga.area {"grupo": "g_3", "caso": "G", "contorno": [[0.5, 0.5], [9.5, 0.5], [9.5, 3.5], [0.5, 3.5]], "valor": 1}']);
    await (await botaoCalcularFaixa(page)).click();
    await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
    const aviso = page.locator('[data-calculo-ok]');
    await aviso.waitFor();
    assert.match(await aviso.innerText(), /Cálculo concluído sem erros/);
    assert.equal(await page.getByRole('tablist', { name: 'Faixa de comandos' }).locator('.rtab.on').innerText().then((t) => t.trim()), 'Resultados');
    assert.equal(await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento', exact: true }).getAttribute('aria-selected'), 'true');
    // atalhos
    await aviso.getByRole('button', { name: 'Esforços', exact: true }).click();
    assert.equal(await page.locator('.edif-tabs').getByRole('tab', { name: 'Esforços', exact: true }).getAttribute('aria-selected'), 'true');
    await aviso.getByRole('button', { name: 'Deformada', exact: true }).click();
    assert.equal(await page.locator('.edif-tabs').getByRole('tab', { name: 'Deslocamentos', exact: true }).getAttribute('aria-selected'), 'true');
    await aviso.getByRole('button', { name: 'Armaduras', exact: true }).click();
    assert.equal(await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento', exact: true }).getAttribute('aria-selected'), 'true');
    await aviso.getByRole('button', { name: 'Pranchas', exact: true }).click();
    assert.equal(await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas', exact: true }).getAttribute('aria-selected'), 'true');
    // dispensar
    await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento', exact: true }).click();
    await page.getByRole('button', { name: 'Dispensar o aviso de cálculo concluído', exact: true }).click();
    await aviso.waitFor({ state: 'detached' });
  },
};
