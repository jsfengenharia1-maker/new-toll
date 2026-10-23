# Cartão E2e-3 — memorial dos consolos, do vínculo externo e das pré-moldadas e fluxo e2e `E2e`

Executor: Haiku. Depende dos cartões 1 e 2 aplicados. Este cartão compila sozinho depois deles.

## Regras (valem para todo o cartão)
- Só interface. **Não altere nada em `src/core/`** (o núcleo da E2e está pronto e testado em `src/core/building/consolos.test.ts` e `src/core/building/e2e.test.ts`). Componentes só de `src/app/ui` (nunca controles crus); sem cor literal, sem CSS novo, sem estilo inline (as classes usadas já existem em `global.css`); **nenhum botão novo na barra da planta** (a janela abre pelo item "Consolos curtos" da paleta Ctrl+K).
- Os rótulos abaixo são **exatos e únicos** no escopo em que o e2e os procura: não os renomeie, não acrescente `unit` aos campos que já o trazem no rótulo. No e2e, `getByRole('button', { name, exact: true })` para botões; para `NumField`, `OptNumField` e `Select` (o nome acessível inclui valor ou unidade) use regex ancorada no início, como `getByLabel(/^Geometria do consolo: altura h na face/)`.
- Aplique as edições na ordem. Se um texto a localizar não existir (outro agente mexeu no arquivo), pare e descreva o que encontrou: não improvise.

## O que o núcleo já entrega (não reimplemente)
- `BuildingModel.consolos?: Consolo[]` (`types.ts`): `{ id, nome, pilar, viga, ponta: 'ini' | 'fim', face, b, h, hp, a, c, aparelho: { l, b }, hd?, cobrimento?, armadura?: { tirante: { n, phi }, horizontais: { n, phi }, verticais: { phi, s } } }`, tudo em m. `Viga.vinculoExterno?: 'engaste' | 'articulacao' | 'deslizante'` e `Viga.premoldada?: { tipo: 'armada' | 'ficha', icamento?, ficha?: { nome, classe?, EI?, peso?, MRdPos, MRdNeg?, VRd, TRd? } }`.
- Comandos: `consolo.criar { viga, ponta, pilar, b?, h?, hp?, a?, c?, aparelho?, hd?, cobrimento?, nome? }`, `consolo.editar { id, ..., armadura? }` (informar a armadura a bloqueia; mudar a geometria solta), `consolo.remover { ids }`, `consolo.redimensionar { ids? }` e `viga.editar { id, vinculoExterno?: 'nenhum' | ..., premoldada?: { tipo: 'nenhuma' | 'armada' | 'ficha', icamento?, ficha? } }`.
- `src/core/building/consolos.ts`: `pontaToca`, `pontaDaViga`, `faceDoPilar`, `consoloPadrao`, `relatorioConsolo(r)`, `dimensionarConsolo`. Resultados: `dim.consolos` (um `ResultadoConsolo` por consolo: `tipo`, `Vd`, `Hd`, `Rst`, `As`, `biela`, `apoio`, `cortante`, `arranjo`, `ancoragem`, `status`, `mensagens`) e `dim.premoldadas`. Revisão com tipo `consolo` e códigos CONSOLO_* e PREMOLDADA_*.

- `src/core/building/memorialConsolos.ts`: `memorialConsolos(b, dim, opcoes)` devolve `{ tabelas: { id: 'consolos' | 'consolos-armadura' | 'vinculo-externo' | 'premoldadas', titulo, colunas, linhas }[], notas: string[], relatorios: string[][] }` (vazio sem consolos, vínculo externo ou pré-moldadas).

## 1. Criar `src/app/edificio/MemorialConsolos.tsx` (arquivo novo, cole inteiro)
```tsx
// Memorial dos consolos curtos, das vigas de vínculo externo e das vigas pré-moldadas (E2e): geometria, método, tirante, biela,
// estribos e ancoragem; vínculo e rigidez; içamento e ficha. As tabelas, as notas e os relatórios vêm do núcleo
// (core/building/memorialConsolos.ts).
import type { ReactNode } from 'react';
import { memorialConsolos } from '../../core/building/memorialConsolos';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import type { BuildingModel } from '../../core/building/types';

export function MemorialConsolos({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const m = memorialConsolos(b, dim, opcoesEmUso(b.opcoes, perfilDe(b)));
  if (!m.tabelas.length) return null;
  return (
    <>
      {h2('Consolos, vínculo externo e vigas pré-moldadas')}
      <div data-memorial-consolos>
        {m.tabelas.map((t) => (
          <div className="avoid" key={t.id} data-memorial-consolos-tabela={t.id}>
            <h3>{t.titulo}</h3>
            <table>
              <thead><tr>{t.colunas.map((c, i) => <th key={i} className="l">{c}</th>)}</tr></thead>
              <tbody>{t.linhas.map((l, i) => <tr key={i}>{l.map((c, k) => <td key={k} className="l">{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        ))}
        {m.relatorios.map((r, i) => <ul key={i} data-memorial-consolo-relatorio>{r.map((t, k) => <li key={k}>{t}</li>)}</ul>)}
        <ul>{m.notas.map((n, i) => <li key={i}>{n}</li>)}</ul>
      </div>
    </>
  );
}
```

## 2. Editar `src/app/edificio/MemorialEdificio.tsx`

O capítulo aparece só quando há consolos, vigas de vínculo externo ou pré-moldadas.

2.1. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
import { MemorialCortes } from './MemorialCortes';
```

Substitua por:

```tsx
import { MemorialCortes } from './MemorialCortes';
import { MemorialConsolos } from './MemorialConsolos';
```

2.2. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
          <MemorialCortes b={b} dim={dim} h2={h2} />
```

Substitua por:

```tsx
          <MemorialCortes b={b} dim={dim} h2={h2} />
          <MemorialConsolos b={b} dim={dim} h2={h2} />
```

## 3. Editar `e2e/flows.mjs`

Acrescente o fluxo abaixo no fim da lista de fluxos: o arquivo termina em `];` (a lista `flows`); cole o objeto **antes** desse `];` final, depois do último fluxo (que termina em `  },`).

```js
  {
    name: 'E2e: consolos curtos (lançar, editar, resultados e relatório, armadura bloqueada), vínculo externo e pré-moldada da viga, memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperar = (fn, arg, t = 30000) => page.waitForFunction(fn, arg, { timeout: t });
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 180000 });
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[6, 0], [6, 4]], [[6, 4], [0, 4]], [[0, 4], [0, 0]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('opcoes.definir {"valores": {"modeloGlobal": 0}}');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.length === 1, null);
      const abrir = async () => {
        await page.locator('#edcmd').blur();
        await page.keyboard.press('Control+k');
        await page.getByRole('dialog').getByRole('textbox').fill('Consolos curtos');
        await page.keyboard.press('Enter');
        const j = page.getByRole('dialog', { name: 'Consolos curtos', exact: true });
        await j.waitFor();
        return j;
      };
      const calcular = async () => {
        await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
        await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
        await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 180000 });
        await livre();
      };
      // 1. lança o consolo na ponta inicial de V1 (y = 0): o pilar P1 vem sugerido
      let jan = await abrir();
      await jan.getByLabel(/^Consolo: viga apoiada/).selectOption({ label: 'V1' });
      await jan.getByLabel(/^Consolo: ponta da viga/).selectOption('ini');
      await jan.getByRole('button', { name: 'Lançar consolo', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.length === 1, null);
      let m = await modelo();
      const c1 = m.consolos[0];
      assert.equal(c1.nome, 'C1');
      assert.equal(c1.ponta, 'ini');
      assert.equal(m.pilares.find((p) => p.id === c1.pilar).nome, 'P1');
      assert.equal(m.vigas.find((v) => v.id === c1.viga).nome, 'V1');
      await jan.locator('[data-consolos-lista]').getByText('não calculado', { exact: true }).waitFor();
      // 2. edita a altura na face (55 cm) e a distância a (25 cm)
      const alt = jan.getByLabel(/^Geometria do consolo: altura h na face/);
      await alt.fill('55'); await alt.press('Enter');
      await esperar(() => Math.abs(JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.[0]?.h - 0.55) < 1e-9, null);
      const hpp = jan.getByLabel(/^Geometria do consolo: altura na ponta/);
      await hpp.fill('30'); await hpp.press('Enter');
      await esperar(() => Math.abs(JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.[0]?.hp - 0.3) < 1e-9, null);
      const da = jan.getByLabel(/^Geometria do consolo: distância a/);
      await da.fill('25'); await da.press('Enter');
      await esperar(() => Math.abs(JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.[0]?.a - 0.25) < 1e-9, null);
      assert.match(await jan.locator('[data-consolo-resultados]').innerText(), /Calcule o edifício/);
      await page.keyboard.press('Escape');
      // 3. V3 do lado x = 6 com vínculo externo e V4 pré-moldada: editor da viga
      const gvigas = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Vigas — / }) });
      await gvigas.locator(':scope > summary').click();
      await page.locator('summary', { hasText: 'Vínculos, flambagem e cobrimento' }).click();
      const editor = async (i) => {
        await gvigas.locator('table.quadro tbody tr').nth(i).locator('td').nth(3).click();
        const sv = page.locator('[data-vinculo-premoldada]');
        await sv.waitFor();
        return sv;
      };
      let vp = await editor(2);
      await vp.getByLabel(/^Vínculo externo da viga/).selectOption('articulacao');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.find((v) => v.nome === 'V3')?.vinculoExterno === 'articulacao', null);
      vp = await editor(3);
      await vp.getByLabel(/^Viga pré-moldada/).selectOption('armada');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.find((v) => v.nome === 'V4')?.premoldada?.tipo === 'armada', null);
      const ic = vp.getByLabel(/^Içamento: distância dos pontos/);
      await ic.fill('80'); await ic.press('Enter');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.find((v) => v.nome === 'V4')?.premoldada?.icamento === 0.8, null);
      // 4. cálculo e resultados do consolo
      await calcular();
      jan = await abrir();
      const res = jan.locator('[data-consolo-resultados]');
      await res.locator('[data-consolo-desenho]').waitFor();
      const txt = await res.innerText();
      assert.match(txt, /consolo (curto|muito curto|longo) \(a\/d = \d+,\d+\)/);
      assert.match(txt, /Vd = \d+,\d kN/);
      assert.match(txt, /Tirante: Rst = \d+,\d kN/);
      assert.match(txt, /Contato no aparelho: \d+,\d MPa/);
      await res.getByRole('button', { name: /^Relatório do consolo C1/ }).click();
      const rel = res.locator('[data-consolo-relatorio]');
      await rel.waitFor();
      assert.match(await rel.innerText(), /Consolo C1 \(/);
      // 5. aparelho pequeno reprova (vermelho e erro), armadura bloqueada e redimensionar
      const apl = jan.getByLabel(/^Aparelho do consolo: comprimento l/), apb = jan.getByLabel(/^Aparelho do consolo: largura/);
      await apl.fill('2'); await apl.press('Enter');
      await apb.fill('2'); await apb.press('Enter');
      await esperar(() => { const a = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.[0]?.aparelho; return a && Math.abs(a.l - 0.02) < 1e-9 && Math.abs(a.b - 0.02) < 1e-9; }, null);
      await page.keyboard.press('Escape');
      await calcular();
      jan = await abrir();
      assert.match(await jan.locator('[data-consolos-lista]').innerText(), /não atende/);
      assert.equal(await jan.locator('[data-consolo-linha].bad').count(), 1);
      assert.match(await jan.locator('[data-consolo-erros]').innerText(), /Consolo: tensão de contato sob o aparelho/);
      await jan.getByLabel(/^Tirante do consolo: barras/).fill('3');
      await jan.getByLabel(/^Tirante do consolo: barras/).press('Enter');
      await jan.getByRole('button', { name: 'Fixar a armadura do consolo', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.[0]?.armadura?.tirante?.n === 3, null);
      await page.keyboard.press('Escape');
      await calcular();
      jan = await abrir();
      assert.match(await jan.locator('[data-consolo-resultados]').innerText(), /\(bloqueada\)/);
      await jan.getByRole('button', { name: 'Redimensionar o consolo', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.[0]?.armadura === undefined, null);
      await jan.getByLabel(/^Aparelho do consolo: comprimento l/).fill('20'); await jan.getByLabel(/^Aparelho do consolo: comprimento l/).press('Enter');
      await jan.getByLabel(/^Aparelho do consolo: largura/).fill('20'); await jan.getByLabel(/^Aparelho do consolo: largura/).press('Enter');
      await esperar(() => { const a = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.[0]?.aparelho; return a && Math.abs(a.l - 0.2) < 1e-9; }, null);
      await page.keyboard.press('Escape');
      await calcular();
      // 6. memorial: consolos, vínculo externo e pré-moldadas
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mc = memo.locator('[data-memorial-consolos]');
      await mc.waitFor();
      assert.match(await mc.locator('[data-memorial-consolos-tabela="consolos"]').innerText(), /C1[\s\S]*P1 \/ V1/);
      assert.match(await mc.locator('[data-memorial-consolos-tabela="vinculo-externo"]').innerText(), /V3[\s\S]*articulação/);
      assert.match(await mc.locator('[data-memorial-consolos-tabela="premoldadas"]').innerText(), /V4[\s\S]*armada/);
      assert.match(await mc.innerText(), /atrito-cisalhamento/);
      assert.match(await mc.innerText(), /a ser confirmad|a confirmar|ver pendências/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 7. remover o consolo pela janela
      jan = await abrir();
      await jan.getByRole('button', { name: 'Remover o consolo', exact: true }).click();
      await esperar(() => !JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.length, null);
      await page.keyboard.press('Escape');
    },
  },
```

## Verificação
`npx tsc -b` sem erros e `npx vitest run src/app/design` verde (nenhuma cor literal, classe sem CSS ou estilo inline). `npm run e2e -- E2e` verde (o comando refaz o build; sem `--no-build`). Relate só o resultado.
