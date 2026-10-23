# Cartão E2b-3 — memorial das vigas curvas e comuns e fluxo e2e `E2b`

Executor: Haiku. Depende do núcleo da E2b e dos cartões `1-editor-viga-curva-comum.md` e `2-planta-traco-curvo.md` (o fluxo e2e usa o traçado por teclas e o editor).

## Regras (valem para todo o cartão)
- Só interface. **Não altere nada em `src/core/`** (o núcleo da E2b está pronto e testado em `src/core/building/curvas.test.ts` e `src/core/building/vigaComum.test.ts`). Componentes só de `src/app/ui` (nunca controles crus); sem cor literal, sem CSS novo, sem estilo inline (as classes usadas já existem em `global.css`); **nenhum botão novo na barra da planta** (a ferramenta é a Viga existente, com a tecla R, e o item da paleta Ctrl+K).
- Os rótulos abaixo são **exatos e únicos** no escopo em que o e2e os procura: não os renomeie, não acrescente `unit` aos campos que já o trazem no rótulo e mantenha o `aria-label` igual ao rótulo. No e2e, `getByLabel(..., { exact: true })` para botões; para `NumField`, `OptNumField` e `Select` (o nome acessível inclui valor ou unidade) use regex ancorada no início, como `getByLabel(/^Grupo associado/)`.
- Aplique as edições na ordem. Se um texto a localizar não existir (outro agente mexeu no arquivo), pare e descreva o que encontrou: não improvise.

## O que o núcleo já entrega (não reimplemente)
- `Viga.arcos?: { ini, fim }[]` (faixas de vértices de `pontos` que formam arco; a poligonal de cordas já está em `pontos`), `Viga.comum?: { grupo }` (origem) e `Viga.comumDe?: string` (associada, criada e mantida igual à origem a cada comando).
- Comandos: `viga.tracar { …, passagens }` (um ponto de passagem por trecho; `null` = reto; os trechos curvos viram arcos pela opção `curvaSegmento`), `viga.editar { pontos, passagens }`, `viga.compor { ids }`, `viga.decompor { id }`, `viga.comum { id, grupo, de?, ate? }` (`de` e `ate` em m ao longo da viga: só essa parte vira comum), `viga.comumDesfazer { id }` (aceita a origem ou a associada), `viga.ajustarPlano { id, modo: 'interseccao' | 'maximaDeclividade', planos: [{ a, b, c } | { pontos: [[x, y, z] × 3] }] }`. A associada não aceita editar geometria, dividir, unir nem remover (erro `VIGA_COMUM_ASSOCIADA`).
- `src/core/building/curvas.ts`: `ehCurva(v)`, `dadosDosArcos(v)` (raio, ângulo, número de cordas, corda máxima de cada trecho curvo), `comprimentoDesenvolvido(v)`, `decomporPoligonal(v)`, `montarPoligonal(pontos, passagens, corda)` (poligonal e arcos de uma viga por pontos de controle e passagens), `resumoVigasCurvas(b)`. `src/core/building/vigaComum.ts`: `resumoVigasComuns(b)`, `pavimentoAlvoComum`.
- Opções `curvaSegmento` (cm) e `curvaTorcaoEquilibrio` (aparecem sozinhas no grupo Opções de cálculo).

## 1. Editar `src/app/edificio/MemorialEdificio.tsx`

1.1. Importar os dois quadros (depois do import de `resumoSecoesVigas`).

Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
import { resumoSecoesVigas } from '../../core/building/secaoViga';
```

Substitua por:

```tsx
import { resumoSecoesVigas } from '../../core/building/secaoViga';
import { resumoVigasCurvas } from '../../core/building/curvas';
import { resumoVigasComuns } from '../../core/building/vigaComum';
```

1.2. Calcular os dois quadros (depois de `secoesEsp`).

Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
  const secoesEsp = useMemo(() => resumoSecoesVigas(b), [b]);
```

Substitua por:

```tsx
  const secoesEsp = useMemo(() => resumoSecoesVigas(b), [b]);
  const vigasCurvas = useMemo(() => resumoVigasCurvas(b), [b]);
  const vigasComuns = useMemo(() => resumoVigasComuns(b), [b]);
```

1.3. Quadros no memorial: o texto localizado é só o começo de uma linha existente (mantenha o resto dela); o bloco novo entra antes dessa linha e a substituição abaixo já o traz.

Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
          {opcoesAlteradas(b.opcoes, perfil).length > 0 && <p className="warn">Opções diferentes do padrão do perfil:
```

Substitua por:

```tsx
          {vigasCurvas.length > 0 && (
            <div data-memorial-vigas-curvas>
              <h3>Vigas curvas</h3>
              <table>
                <thead><tr><th>Viga</th><th>Raio (m)</th><th>Ângulo (°)</th><th>Cordas</th><th>Corda máx. (cm)</th><th>Comprimento desenvolvido (m)</th></tr></thead>
                <tbody>
                  {vigasCurvas.map((x) => (
                    <tr key={x.viga}>
                      <td className="l">{x.nome}</td><td>{x.raios.map((r) => fmt(r, 2)).join('; ')}</td><td>{x.angulos.map((a) => fmt(a, 1)).join('; ')}</td>
                      <td>{x.cordas}</td><td>{fmt(x.cordaMax * 100, 0)}</td><td>{fmt(x.comprimentoDesenvolvido, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>Cada trecho curvo (arco por três pontos) é analisado como poligonal de cordas de até {fmt(opc.curvaSegmento, 0)} cm, as das pontas com 25 % do tamanho das do meio; a torção da curvatura é de equilíbrio e a viga curva mantém a rigidez à torção da seção bruta{opc.curvaTorcaoEquilibrio ? '' : ' (opção desligada: vale o redutor das vigas retas)'}. A verificação à torção é feita sempre. A força radial da armadura longitudinal (As·fyd/R) deve ser equilibrada pelos estribos (a confirmar). A elevação da prancha é desenvolvida ao longo do eixo (a confirmar a representação).</p>
            </div>
          )}
          {vigasComuns.length > 0 && (
            <div data-memorial-vigas-comuns>
              <h3>Vigas comuns a dois grupos</h3>
              <table>
                <thead><tr><th>Viga de origem</th><th>Grupo de origem</th><th>Viga associada</th><th>Grupo associado</th><th>Comprimento (m)</th><th>Pavimento associado → pavimento que recebe a carga</th></tr></thead>
                <tbody>
                  {vigasComuns.map((x) => (
                    <tr key={x.origem}>
                      <td className="l">{x.nomeOrigem}</td><td className="l">{x.grupoOrigem}</td><td className="l">{x.nomeAssociada}</td><td className="l">{x.grupoAssociado}</td><td>{fmt(x.comprimento, 2)}</td>
                      <td className="l">{x.pavimentos.map((q) => `${q.associado} → ${q.origem}`).join('; ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>A viga comum é uma barra só no pórtico (a do grupo de origem), que recebe as lajes dos dois grupos: a viga associada apoia a laje do seu grupo e as reações são levadas à viga de origem, no pavimento do grupo de origem de menor cota igual ou acima do associado (senão o mais alto abaixo; a confirmar). Armadura, envoltórias e dimensionamento só na origem.</p>
            </div>
          )}
          {opcoesAlteradas(b.opcoes, perfil).length > 0 && <p className="warn">Opções diferentes do padrão do perfil:
```

## 2. Editar `e2e/flows.mjs`
Acrescente o fluxo abaixo como **último elemento** do array `flows` (depois do `},` que fecha o fluxo anterior e antes do `];` final do arquivo). O fluxo tira o foco da linha de comando e desliga o rastreamento polar (senão os cliques em ângulos são ajustados), traça uma viga curva com V, clique, R, passagem, fim e Enter, confere o editor, a corda máxima da opção, a decomposição da poliviga, a viga comum (paleta Ctrl+K para chegar à associada e abrir o grupo de origem), o memorial e o ajuste a planos.
```js
  {
    name: 'E2b: viga curva (traçado por três pontos), poliviga, viga comum a dois grupos, ajuste a planos e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperar = (fn, arg, t = 30000) => page.waitForFunction(fn, arg, { timeout: t });
      await cmd('lote {"comandos": [' + [[0, 0], [8, 0]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pilares?.length === 2, null);
      // 1. traçado pelo mouse: V, clique no início, R (trecho curvo), clique na passagem, clique no fim e Enter
      await page.locator('.planta-cv[data-vista]').waitFor();
      await reenquadrarAte(page, [[1, 0], [4, 2], [7, 0]]);
      await page.locator('#edcmd').blur(); // o foco sai da linha de comando: as teclas V e R vão para a planta
      await page.getByLabel('Polar 15° (F10)', { exact: true }).uncheck(); // sem polar, os cliques valem a grade de 0,5 m
      await page.evaluate(() => document.activeElement?.blur());
      await page.keyboard.press('v');
      let [sx, sy] = await telaDe(page, 1, 0);
      await page.mouse.click(sx, sy);
      await page.keyboard.press('r');
      [sx, sy] = await telaDe(page, 4, 2);
      await page.mouse.click(sx, sy);
      await page.locator('.statusbar .msg', { hasText: 'Passagem do arco marcada' }).waitFor();
      [sx, sy] = await telaDe(page, 7, 0);
      await page.mouse.click(sx, sy);
      await page.keyboard.press('Enter');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.length === 1, null);
      let v = (await modelo()).vigas[0];
      assert.equal(v.arcos.length, 1, 'trecho curvo registrado');
      assert.deepEqual(v.arcos[0], { ini: 0, fim: v.pontos.length - 1 });
      assert.ok(v.pontos.length >= 14, 'poligonal de cordas');
      // corda de 6 m e flecha de 2 m: R = 3,25 m, ângulo 134,8°, comprimento desenvolvido 7,64 m
      await page.keyboard.press('s');
      const gvigas = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Vigas — / }) });
      if (!(await gvigas.evaluate((el) => el.open))) await gvigas.locator(':scope > summary').click();
      const gv = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: 'Vínculos, flambagem e cobrimento' }) });
      if (!(await gv.evaluate((el) => el.open))) await gv.locator(':scope > summary').click();
      const linha = async (i) => { await gvigas.locator('table.quadro tbody tr').nth(i).locator('td').nth(3).click(); const e = page.locator('[data-viga-curva-comum]'); await e.waitFor(); return e; };
      let ed = await linha(0);
      await ed.locator('[data-viga-curva]').waitFor();
      assert.match(await ed.locator('[data-viga-curva]').innerText(), /R = 3,25 m, 134,8°, \d+ cordas de até (49|50) cm\. Comprimento desenvolvido 7,64 m\./);
      // 2. a corda máxima da opção refaz a discretização (mesmo círculo) e desfazer devolve
      const n0 = v.pontos.length;
      await cmd('opcoes.definir {"valores": {"curvaSegmento": 20}}');
      await esperar((n) => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas[0].pontos.length > n, n0);
      v = (await modelo()).vigas[0];
      assert.deepEqual(v.arcos[0], { ini: 0, fim: v.pontos.length - 1 });
      ed = await linha(0);
      assert.match(await ed.locator('[data-viga-curva]').innerText(), /R = 3,25 m, 134,8°.*cordas de até (19|20) cm/);
      // 3. poliviga: reta + curva + reta, decompor em três vigas pelo editor e compor de novo pelo comando
      await cmd('viga.tracar {"grupo": "g_3", "pontos": [[0, 6], [4, 6], [8, 10], [8, 14]], "passagens": [null, [7.2, 6.8], null], "secao": {"b": 0.2, "h": 0.5}, "nome": "PV"}');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.length === 2, null);
      ed = await linha(1);
      await ed.getByRole('button', { name: 'Decompor a viga (trechos retos e curvos)', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.length === 4, null);
      const partes = (await modelo()).vigas.filter((x) => x.nome !== 'V1');
      assert.deepEqual(partes.map((x) => x.arcos?.length ?? 0), [0, 1, 0]);
      await cmd(`viga.compor {"ids": ${JSON.stringify(partes.map((x) => x.id))}}`);
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.length === 2, null);
      assert.equal((await modelo()).vigas.find((x) => x.nome !== 'V1').arcos.length, 1);
      // 4. viga comum: o grupo associado (Rampa) é criado, a viga PV vira comum e a associada aparece no outro grupo
      await cmd('grupo.criar {"nome": "Rampa"}');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.grupos?.some((g) => g.nome === 'Rampa'), null);
      const rampa = (await modelo()).grupos.find((g) => g.nome === 'Rampa').id;
      await cmd(`pavimento.criar {"nome": "Rampa 1", "cota": 1.5, "grupo": "${rampa}"}`);
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pavimentos?.some((p) => p.nome === 'Rampa 1'), null);
      await page.getByLabel('Pavimento da planta', { exact: true }).selectOption({ label: 'Tipo 1 (3,00)' }); // o pavimento novo vira o atual: volta ao Tipo
      ed = await linha(1);
      await ed.getByLabel(/^Grupo associado/).selectOption({ label: 'Rampa' });
      await ed.getByRole('button', { name: 'Tornar comum a dois grupos', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.some((x) => x.comumDe), null);
      let m = await modelo();
      const origem = m.vigas.find((x) => x.comum), assoc = m.vigas.find((x) => x.comumDe);
      assert.equal(origem.nome, 'PV');
      assert.equal(assoc.grupo, rampa);
      assert.deepEqual(assoc.pontos, origem.pontos);
      assert.deepEqual(assoc.arcos, origem.arcos);
      assert.match(await page.locator('[data-viga-comum]').innerText(), /Comum ao grupo Rampa: uma barra só no pórtico/);
      // a associada pelo atalho da paleta (Ctrl+K), com o botão para abrir o grupo de origem
      await page.keyboard.press('Control+k');
      await page.getByRole('dialog').getByRole('textbox').fill(assoc.nome + ' Rampa');
      await page.keyboard.press('Enter');
      await page.locator('[data-viga-comum]', { hasText: 'Viga associada de PV (Tipo)' }).waitFor();
      await page.getByRole('button', { name: 'Abrir o grupo de origem', exact: true }).click();
      await page.locator('[data-viga-comum]', { hasText: 'Comum ao grupo Rampa' }).waitFor();
      // 5. memorial com o quadro das vigas curvas e das comuns
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const qc = memo.locator('[data-memorial-vigas-curvas]');
      await qc.waitFor();
      assert.match(await qc.innerText(), /V1[\s\S]*3,25[\s\S]*134,8[\s\S]*7,64/);
      assert.match(await qc.innerText(), /poligonal de cordas de até 20 cm/);
      const qm = memo.locator('[data-memorial-vigas-comuns]');
      assert.match(await qm.innerText(), /PV[\s\S]*Tipo[\s\S]*Rampa/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      // 6. desfazer a viga comum pelo editor: voltam as duas vigas independentes
      await page.getByRole('button', { name: 'Desfazer a viga comum', exact: true }).click();
      await esperar(() => !JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.some((x) => x.comum || x.comumDe), null);
      assert.equal((await modelo()).vigas.length, 3);
      // 7. ajuste a planos inclinados: cumeeira em x = 5 (z = 0,3·x e z = 3 − 0,3·x)
      await cmd(`viga.tracar {"grupo": "g_3", "pontos": [[4.8, 0], [5.3, 4], [5.1, 9]], "secao": {"b": 0.2, "h": 0.4}, "nome": "CM"}`);
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.some((x) => x.nome === 'CM'), null);
      await page.keyboard.press('Escape');
      ed = await linha(2);
      const campo = async (rot, valor) => { const c = ed.getByLabel(rot); await c.fill(String(valor)); await c.press('Enter'); };
      await campo(/^Plano 1, inclinação a/, 0.3);
      await campo(/^Plano 2, inclinação a/, -0.3);
      await campo(/^Plano 2, cota c/, 3);
      await ed.getByRole('button', { name: 'Ajustar a viga aos planos', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.find((x) => x.nome === 'CM')?.pontos.every((p) => Math.abs(p[0] - 5) < 1e-4), null);
    },
  },
```

## Verificação
`npx tsc -b`, `npx vitest run src/app/design` e `npm run e2e -- E2b` verdes. Relate só o resultado.
