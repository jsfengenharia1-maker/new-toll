# N2g — cartão 3: memorial, fluxo e2e `N2g` e checklist

Classe: Haiku (memorial com dados prontos; e2e no padrão do fluxo `N2f`). Pré-requisito: cartões 1 e 2 aplicados. O texto abaixo foi executado como está (tsc, design.test.ts e o fluxo e2e).

## Arquivos (4)
1. `src/app/edificio/MemorialEdificio.tsx`
2. `e2e/flows.mjs` (fluxo novo no fim do array, depois do `N2f`)
3. `docs/checklist-manual-cypecad.md` e `docs/checklist-manual-calculo-cypecad.md`
4. depois, `npm run checklists`

## Memorial
Nenhum import novo. Na função do memorial, logo antes da linha `            {h2('Erros e avisos')}` (única), inserir exatamente (`opc` e `fmt` já existem no arquivo):
```tsx
            {dim.fogo && (<>
              {h2('Resistência ao fogo')}
              <div data-memorial-fogo>
                <p>Verificação em situação de incêndio pela NBR 15200: método tabular nas lajes e vigas (edição de 2004, dimensões mínimas e distância c1 do eixo da armadura à face exposta, TRRF de 30 a 120 min, sem interpolação) e, nos pilares, {opc.fogoPilarMetodo ? 'a tabela da edição de 2004 por μfi' : 'o método analítico da edição de 2012 (TRF = 120·[(Rμ + Ra + Rl + Rb + Rn)/120]^1,8)'}. c1 = cobrimento + φ do estribo + φ/2 das barras adotadas; o revestimento de proteção soma a c1 (e à largura das vigas e à espessura das lajes) pela eficiência do material (cal e areia 67 %, cimento e areia 100 %). μfi dos pilares {fmt(opc.fogoMuFi)}, {opc.fogoFacesPilar} face(s) exposta(s), ℓef,fi {opc.fogoLefReducao ? '= 0,5·ℓe (0,7·ℓe no último pavimento) com γz ≤ 1,1' : '= ℓe'}; lajes {opc.fogoLajeCompartimentadora ? 'compartimentadoras (espessura mínima também verificada)' : 'sem função compartimentadora (só c1)'}. Tabelas da edição de 2012 para lajes maciças e vigas e as tabelas gerais dos pilares não foram transcritas (a confirmar).</p>
                {dim.fogo.sugestao && <p>Sugestão pela ocupação {dim.fogo.sugestao.divisao} e altura {fmt(dim.fogo.sugestao.altura, 1)} m (classe {dim.fogo.sugestao.classe}): {dim.fogo.sugestao.trrf === null ? 'consultar o corpo técnico dos bombeiros' : `${dim.fogo.sugestao.trrf} min`}. {dim.fogo.sugestao.fonte}.</p>}
                <table>
                  <thead><tr><th className="l">Grupo</th><th>TRRF (min)</th><th className="l">Origem</th></tr></thead>
                  <tbody>{dim.fogo.grupos.map((g) => <tr key={g.grupo}><td className="l">{g.nome}</td><td>{g.trrf}</td><td className="l">{g.origem === 'grupo' ? 'informado para o grupo' : g.origem === 'ocupacao' ? 'sugerido pela ocupação' : g.origem === 'elemento' ? 'do elemento' : 'padrão das opções'}</td></tr>)}</tbody>
                </table>
                <table>
                  <thead><tr><th className="l">Elemento</th><th className="l">Tipo</th><th className="l">Pavimento</th><th>TRRF (min)</th><th>TRF (min)</th><th>Folga (min)</th><th className="l">Tabela ou método</th><th className="l">Exigido</th><th className="l">Adotado</th><th className="l">Situação</th></tr></thead>
                  <tbody>{dim.fogo.elementos.map((e) => <tr key={`${e.tipo}-${e.id}-${e.pavimento ?? ''}`}><td className="l">{e.nome}</td><td className="l">{e.tipo}</td><td className="l">{e.pavimento ?? '—'}</td><td>{e.trrf}</td><td>{e.metodo === 'analítico' ? e.trf : e.trf > 0 ? `${e.limiteTabela ? '≥ ' : ''}${e.trf}` : '< 30'}</td><td className={e.folga < 0 ? 'bad' : undefined}>{e.folga}</td><td className="l">{e.tabela}</td><td className="l">{e.exigido}</td><td className="l">{e.adotado}</td><td className="l">{e.status === 'ok' ? 'atende' : e.status === 'review' ? 'revisar' : 'não atende'}</td></tr>)}</tbody>
                </table>
              </div>
            </>)}
```

## Fluxo e2e `N2g` (inserir antes do `];` final de `e2e/flows.mjs`)
```js
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
```
Rodar só ele: `npm run e2e -- N2g` (ou `--no-build N2g` depois de um build).

## Checklist
- `docs/checklist-manual-cypecad.md`: nas linhas `C4.44` e `C10.6` trocar a situação `Parcial` por `Feito`, a frente `N` por `—` e a nota por, respectivamente:
  - C4.44: `N2g: pilares pelo método analítico da NBR 15200:2012 (TRF) ou tabular de 2004 e uma face exposta (`fogoPilar` em `src/core/building/fogo.ts`); grupo Incêndio (`Incendio.tsx`), card `FogoCard.tsx`, memorial e e2e N2g`
  - C10.6: `N2g: verificação de fogo pela NBR 15200 com revestimentos de proteção por grupo e elemento (`fogo.definir`, grupo Incêndio em `Incendio.tsx`); e2e N2g`
- `docs/checklist-manual-calculo-cypecad.md`: nas linhas `K1.5.15` e `K1.9.23` trocar `Parcial` por `Feito`, a frente `N` por `—` e a nota por:
  - K1.5.15: `N2g: verificação opcional de incêndio (estado-limite "incendio", grupo Incêndio, card e memorial); e2e N2g`
  - K1.9.23: `N2g: incêndio por grupo e elemento com revestimento, TRRF (ou sugestão pela ocupação) e laje compartimentadora (`Incendio.tsx`); e2e N2g`
- Acrescentar ao "Histórico de conferência" de cada arquivo (no fim do arquivo, mesmo formato das entradas anteriores): `- **dd/mm/2026 — fatia N2g, interface.** C4.44 e C10.6 (K1.5.15 e K1.9.23 no manual de cálculo) passam a Feito (Incendio.tsx, FogoCard.tsx, memorial, e2e N2g).` seguido da linha `  - Situação: ver o resumo (recontado por `npm run checklists`).`
- Rodar `npm run checklists`.

## Verificação
`npx tsc -b && npx vitest run src/core/checklists.test.ts src/app/design/design.test.ts && npm run e2e -- N2g`
