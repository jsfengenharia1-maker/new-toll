# Cartão FU7b-3 — memorial, fluxo e2e `FU7b` e linhas dos checklists

Executor: Haiku. Só interface, e2e e documentação; **não altere nada em `src/core/`**. Depende dos cartões FU7b-1 e FU7b-2 (editor "Base da parede", `BaseParedeUI.tsx`, tabela `data-mu-base`, cartão `data-card-bases-muros`, `JanelaBaseMuro`).

## Regras (valem para todo o cartão)
- Só interface. **Não altere nada em `src/core/`** (o núcleo da FU7b está pronto e testado em `src/core/building/sapataParede.test.ts`). Componentes só de `src/app/ui` (nunca controles crus); sem cor literal, sem CSS novo, sem estilo inline (as classes usadas já existem em `global.css`); nenhum botão novo na barra da planta.
- Os rótulos abaixo são **exatos e únicos** no escopo em que o e2e os procura: não os renomeie, não acrescente `unit` aos campos (a unidade já está no texto do rótulo) e mantenha o `aria-label` igual ao rótulo nos `Select` (é por ele que `getByLabel(…, { exact: true })` encontra a lista).
- Aplique as edições na ordem. Se um texto a localizar não existir (outro agente mexeu no arquivo), pare e descreva o que encontrou: não improvise.

## 1. Memorial do edifício
`MemorialEdificio.tsx`: depois do bloco das sapatas corridas (cinta e tabelas), um parágrafo e a tabela `data-memorial-corridas-parede` das sapatas de parede e, em seguida, a seção "Bases dos muros de arrimo na fundação" com a tabela `data-memorial-bases-muros`. Os valores de `opc` (`fundCorridaAtrito`, `fundCorridaFSDesliz`, `fundCorridaDeslizamento`) já existem em `OpcoesCalculo`.

### `src/app/edificio/MemorialEdificio.tsx`

**Edição 1.** Localize este texto (exato; aparece uma única vez):

```tsx
            {quantFund && quantFund.linhas.length > 0 && (<>
```

Substitua por:

```tsx
            {!!dim.corridas?.some((x) => x.parede) && (<>
              <p>
                Sapatas de parede e de muro (FU7b): a base da parede cria a sapata corrida vinculada ao eixo e à espessura da parede. A carga por metro vem das reações da base da parede na análise (normal, momento em torno do eixo e cortante normal à parede,
                por caso, espalhadas em janelas de {fmt(opc.corridaJanela)} m) mais as cargas lançadas no nível de fundação; o momento vira excentricidade M/(N + peso próprio) somada à geométrica no sentido desfavorável (pressão sem tração);
                o deslizamento é FS = μ·(N + peso próprio)/H nas combinações raras, com μ = {fmt(opc.fundCorridaAtrito)} e FS mínimo {fmt(opc.fundCorridaFSDesliz, 1)} ({opc.fundCorridaDeslizamento === 1 ? 'reprova' : 'só informa'}), sem empuxo passivo (a confirmar).
                Pilares que nascem na fundação sobre o eixo viram sapata isolada equivalente a × a, (Pk + q·a)(1 + 5 %) ≤ σadm(a)·a², e a reação é espalhada por a metros no eixo.
              </p>
              <table data-memorial-corridas-parede>
                <thead><tr><th className="l">Sapata</th><th className="l">Parede</th><th className="l">Cargas</th><th>M máx. (kN·m/m)</th><th>e = M/N (cm)</th><th>H máx. (kN/m)</th><th>μ</th><th>FS desliz. (mín.)</th><th className="l">Pilares sobre o eixo (a × a)</th></tr></thead>
                <tbody>{dim.corridas.filter((x) => x.parede).map((x) => <tr key={x.id}><td className="l">{x.nome}</td><td className="l">{x.parede!.nome}</td><td className="l">{x.parede!.origem === 'reacoes' ? 'reações da análise' : 'só lançadas'}</td><td>{fmt(x.parede!.M, 1)}</td><td>{fmt(x.parede!.eM * 100, 0)}</td><td>{fmt(x.parede!.H, 1)}</td><td>{x.parede!.deslizamento ? fmt(x.parede!.deslizamento.mu) : '—'}</td><td>{x.parede!.deslizamento ? `${fmt(x.parede!.deslizamento.FS)} (${fmt(x.parede!.deslizamento.FSmin, 1)})` : '—'}</td><td className="l">{(x.parede!.pilaresEq ?? []).map((q) => `${q.pilar} ${fmt(q.a)} × ${fmt(q.a)} m`).join('; ') || '—'}</td></tr>)}</tbody>
              </table>
            </>)}
            {!!dim.basesMuros?.length && (<>
              {h2('Bases dos muros de arrimo na fundação')}
              <p>A σadm da base do muro é a própria, ou a informada do terreno, ou a menor estimada pelo SPT de todos os furos com a largura B do muro (o muro não tem posição em planta); a tensão máxima é a da estabilidade (rara, por metro, com a sobrecarga). Quantitativos da base: ponta, talão e distribuição; totais com o comprimento do muro.</p>
              <table data-memorial-bases-muros>
                <thead><tr><th className="l">Muro</th><th>B (m)</th><th>Cota (m)</th><th>df (m)</th><th>σmáx (kN/m²)</th><th>σadm (kN/m²)</th><th className="l">Fonte</th><th>Concreto (m³/m)</th><th>Forma (m²/m)</th><th>Aço (kg/m)</th><th>Comprimento (m)</th><th className="l">Situação</th><th className="l">Mensagens</th></tr></thead>
                <tbody>{dim.basesMuros.map((x) => <tr key={x.id}><td className="l">{x.nome}</td><td>{fmt(x.B)}</td><td>{fmt(x.cota)}</td><td>{fmt(x.profundidade)}</td><td>{fmt(x.sigmaMax, 1)}</td><td>{x.sigmaAdm !== null ? fmt(x.sigmaAdm, 0) : '—'}</td><td className="l">{x.sigmaFonte === 'propria' ? 'própria' : x.sigmaFonte === 'terreno' ? 'terreno' : x.sigmaFonte === 'spt' ? 'SPT (menor furo)' : '—'}</td><td>{fmt(x.porMetro.concreto)}</td><td>{fmt(x.porMetro.forma)}</td><td>{fmt(x.porMetro.aco, 1)}</td><td>{x.comprimento !== null ? fmt(x.comprimento) : '—'}</td><td className="l">{ST[x.status]}</td><td className="l">{x.mensagens.join(' ')}</td></tr>)}</tbody>
              </table>
            </>)}

            {quantFund && quantFund.linhas.length > 0 && (<>
```

## 2. Fluxo e2e `FU7b` (em `e2e/flows.mjs`, logo antes do fluxo `R7g`)
Insira o objeto abaixo no array `flows`, imediatamente antes de `{ name: 'R7g: …`. O nome é exato. Todos os rótulos usam `getByLabel(…, { exact: true })` dentro do contêiner do bloco. As funções `reenquadrarAte` e `telaDe` já existem no arquivo.

```js
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
```

O fluxo cobre: base da parede criada no lançamento (`parede.criar { base }`) e vinculada à parede; cartão das sapatas com "parede M1"; deslizamento reprovado sob o empuxo (`FUND_CORRIDA_DESLIZA`); editor "Base da parede" (resultados com momento, cortante e FS; atrito da sapata editado); opção "Reprovar o deslizamento (parede)" desligada (o erro some); janela da sapata; troca da base para apoio direto remove a sapata; lançamento pela planta com "Fundação da parede" = sapata corrida (M3 nasce com SC-M3); muro de arrimo com comprimento (tabela `data-mu-base`, cartão e janela da base); memorial e pranchas de fundação (sapata da parede e quantitativos com a base do muro).

## 3. Checklists (depois do e2e verde)
Em cada linha, trocar `Parcial` por **Feito**, a frente `FU` por `—` e substituir a nota; depois `npm run checklists`.
- `docs/checklist-manual-cypecad.md`:
  - **C5.28**: "sapata isolada equivalente de cada pilar que nasce na fundação sobre a parede ((Pk + q·a)(1 + 5 %) ≤ σadm(a)·a²), reação espalhada por a no eixo e largura da sapata cobrindo a; lista no editor da parede, na janela e no memorial (`sapataCorrida.ts`, `BaseParedeUI.tsx`) [FU7b]"
  - **C11.28**: "base da parede ao lançar (seletor Fundação da parede: apoio direto ou sapata corrida) e no editor da parede (`parede.sapata`: aba, B, h, σadm, atrito, cota); engaste ou rótula em Base [FU7b]"
  - **C11.31**: "atribuir sapata corrida a parede já lançada pelo bloco Base da parede do editor (`parede.sapata`); remover devolve o apoio direto [FU7b]"
  - **C5.2** continua Parcial (verificar o texto da nota: base da parede feita; falta a E1e para alvenaria); só tire a menção a "cartões FU7b".
- `docs/checklist-manual-calculo-cypecad.md`: **K1.9.47** continua Parcial (falta a base em viga de fundação, FU7c); K1.9.48, K1.9.110 e K1.4.74 sem mudança de situação.
- No fim do "Histórico de conferência" de cada arquivo, uma entrada `- **<data> — fatia FU7b, interface.** …` listando os itens que passaram a Feito (manual do usuário: C5.28, C11.28, C11.31) com as sublinhas "Situação: ver o resumo (recontado por `npm run checklists`)." e "Pendências por frente: FU reduz em 3 itens (manual do usuário)."
- `docs/historico-fatias.md`: acrescentar no fim "- <data>: FU7b, interface: `BaseParedeUI.tsx` (bloco Base da parede no editor, seletor Fundação da parede no lançamento), sapata de parede na lista, no editor e na janela (`CorridaUI.tsx`), base do muro de arrimo (`MurosUI.tsx`, `JanelaBaseMuro`, cartão em `Edificio.tsx`, janela em `Revisao.tsx`), memorial; e2e `FU7b`. Frente FU7b concluída (FU7c pendente)."
- `docs/plano-execucao.md`: no Andamento, depois da linha "FU7b, núcleo concluído", "- <data>: FU7b, interface concluída (cartões `docs/cartoes/FU7b/`); e2e `FU7b` verde."

## Verificação
```bash
npx tsc -b
npx vitest run src/core/checklists.test.ts src/app/design/design.test.ts src/core/building/sapataParede.test.ts
npm run e2e -- FU7b
npm run e2e -- --no-build FU   # os fluxos de fundação não podem quebrar
npm run e2e -- --no-build E1   # nem os de paredes e muros
```
