# Cartão E2c-3 — memorial das vigas inclinadas e fluxo e2e `E2c`

Executor: Haiku. Depende dos cartões 1 e 2 aplicados. Este cartão compila sozinho depois deles.

## Regras (valem para todo o cartão)
- Só interface. **Não altere nada em `src/core/`** (o núcleo da E2c está pronto e testado em `src/core/building/inclinadas.test.ts`; a validação externa é `validation/opensees/viga_inclinada.py`). Componentes só de `src/app/ui` (nunca controles crus); sem cor literal, sem CSS novo, sem estilo inline (as classes usadas já existem em `global.css`); **nenhum botão novo na barra da planta** (a janela abre pelo item "Vigas inclinadas" da paleta Ctrl+K e pela lista de erros).
- Os rótulos abaixo são **exatos e únicos** no escopo em que o e2e os procura: não os renomeie, não acrescente `unit` aos campos que já o trazem no rótulo. No e2e, `getByRole('button', { name, exact: true })` para botões; para `NumField`, `OptNumField` e `Select` (o nome acessível inclui valor ou unidade) use regex ancorada no início, como `getByLabel(/^Valor da carga/)`.
- Aplique as edições na ordem. Se um texto a localizar não existir (outro agente mexeu no arquivo), pare e descreva o que encontrou: não improvise.

## O que o núcleo já entrega (não reimplemente)
- `Obra.vigasInclinadas?: VigaInclinada[]` (`types.ts`): pavimentos inicial e final (`pavIni`, `pavFim`), pontas `pIni` e `pFim` em planta, desnível das pontas, seção `{ b, h }` (m), `multipla`, ligações `ligIni` e `ligFim` (`engastada` ou `articulada`), `cargas` (concentrada, linear, faixa e triangular, por caso), `flambagem` por plano, `armadura` bloqueada.
- Comandos: `inclinada.criar`, `inclinada.editar`, `inclinada.mover { id, ponta: ini | fim | ambas, dx, dy }`, `inclinada.remover { ids }`, `inclinada.armadura { id, sup, inf, laterais?, estribo }` e `inclinada.redimensionar { ids? }`.
- `src/core/building/inclinadas.ts`: `resumoInclinadas(b)`, `barrasDaInclinada`, `ligacaoDaPonta`. `src/core/building/inclinadasDim.ts`: `ResultadoInclinada` (em `dim.inclinadas`, uma por barra), `DetalheInclinada` (`dim.detalhesInclinadas`), `listagemInclinada`. `src/core/building/memorialInclinadas.ts`: `memorialInclinadas(b, dim)`.
- Revisão: tipo `inclinada` e códigos INCLINADA_ARMADURA, INCLINADA_ESBELTEZ, INCLINADA_ESBELTEZ_MAX, INCLINADA_BIELA e INCLINADA_NOS.

## 1. Criar `src/app/edificio/MemorialInclinadas.tsx` (arquivo novo, cole inteiro)
```tsx
// Memorial das vigas inclinadas (E2c): lista, envoltória dos esforços, armaduras e verificações, com o aviso dos nós de
// extremidade. As tabelas e as notas vêm do núcleo (core/building/memorialInclinadas.ts).
import type { ReactNode } from 'react';
import { memorialInclinadas } from '../../core/building/memorialInclinadas';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import type { BuildingModel } from '../../core/building/types';

export function MemorialInclinadas({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const m = memorialInclinadas(b, dim);
  if (!m.tabelas.length) return null;
  return (
    <>
      {h2('Vigas inclinadas')}
      <div data-memorial-inclinadas>
        {m.tabelas.map((t) => (
          <div className="avoid" key={t.id} data-memorial-inclinadas-tabela={t.id}>
            <h3>{t.titulo}</h3>
            <table>
              <thead><tr>{t.colunas.map((c, i) => <th key={i} className="l">{c}</th>)}</tr></thead>
              <tbody>{t.linhas.map((l, i) => <tr key={i}>{l.map((c, k) => <td key={k} className="l">{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        ))}
        <ul>{m.notas.map((n, i) => <li key={i}>{n}</li>)}</ul>
      </div>
    </>
  );
}
```

## 2. Editar `src/app/edificio/MemorialEdificio.tsx`

O capítulo aparece só quando há vigas inclinadas.

2.1. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
import { MemorialCortes } from './MemorialCortes';
```

Substitua por:

```tsx
import { MemorialCortes } from './MemorialCortes';
import { MemorialInclinadas } from './MemorialInclinadas';
```

2.2. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
          <MemorialCortes b={b} dim={dim} h2={h2} />

```

Substitua por:

```tsx
          <MemorialCortes b={b} dim={dim} h2={h2} />
          <MemorialInclinadas b={b} dim={dim} h2={h2} />

```

## 3. Editar `e2e/flows.mjs`

Acrescente o fluxo abaixo no fim da lista de fluxos: o arquivo termina em `];` (a lista `flows`); cole o objeto **antes** desse `];` final, depois do último fluxo (que termina em `  },`).

```js
  {
    name: 'E2c: viga inclinada entre pavimentos (lançamento, ligação, carga, resultados, armadura bloqueada e memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperar = (fn, arg, t = 30000) => page.waitForFunction(fn, arg, { timeout: t });
      await cmd('lote {"comandos": [' + [[0, 0], [8, 0]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.4, "h": 0.4}}}`).join(', ') + ']}');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pilares?.length === 2, null);
      // 1. janela pela paleta (Ctrl+K); lançamento do Tipo 1 ao Tipo 2, de P1 a P2
      const abrir = async () => {
        await page.locator('#edcmd').blur();
        await page.keyboard.press('Control+k');
        await page.getByRole('dialog').getByRole('textbox').fill('Vigas inclinadas');
        await page.keyboard.press('Enter');
        const j = page.getByRole('dialog', { name: 'Vigas inclinadas', exact: true });
        await j.waitFor();
        return j;
      };
      let jan = await abrir();
      await jan.getByLabel(/^Centro do pilar da ponta inicial/).selectOption({ label: 'P1' });
      await jan.getByLabel(/^Centro do pilar da ponta final/).selectOption({ label: 'P2' });
      for (const [rot, v] of [[/^Lançar: largura b/, '25'], [/^Lançar: altura h/, '60']]) { const c = jan.getByLabel(rot); await c.fill(v); await c.press('Enter'); }
      await jan.getByRole('button', { name: 'Lançar viga inclinada', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigasInclinadas?.length === 1, null);
      let m = await modelo(), vi = m.vigasInclinadas[0];
      assert.equal(vi.nome, 'VI1');
      assert.deepEqual(vi.pIni, [0, 0]);
      assert.deepEqual(vi.pFim, [8, 0]);
      assert.deepEqual(vi.secao, { b: 0.25, h: 0.6 });
      assert.equal(m.pavimentos.find((p) => p.id === vi.pavIni).nome, 'Tipo 1');
      assert.equal(m.pavimentos.find((p) => p.id === vi.pavFim).nome, 'Tipo 2');
      await jan.locator('[data-inclinadas-lista]').getByText('Tipo 1 → Tipo 2', { exact: true }).waitFor();
      // 2. ligação articulada na ponta inicial, desnível e uma carga linear de 20 kN/m
      await jan.getByLabel(/^Ligação da ponta inicial/).selectOption('articulada');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigasInclinadas?.[0]?.ligIni === 'articulada', null);
      const valor = jan.getByLabel(/^Valor da carga/);
      await valor.fill('20'); await valor.press('Enter');
      await jan.getByRole('button', { name: 'Acrescentar a carga', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigasInclinadas?.[0]?.cargas?.length === 1, null);
      vi = (await modelo()).vigasInclinadas[0];
      assert.deepEqual([vi.cargas[0].caso, vi.cargas[0].tipo, vi.cargas[0].valor], ['G', 'linear', 20]);
      assert.match(await jan.locator('[data-inclinada-resultados]').innerText(), /Calcule o edifício/);
      await page.keyboard.press('Escape');
      // 3. cálculo e resultados: armadura, esbeltez, desenho e envoltória
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Análise concluída' }).waitFor({ timeout: 120000 });
      jan = await abrir();
      const res = jan.locator('[data-inclinada-resultados]');
      await res.locator('[data-inclinada-desenho]').waitFor();
      const txt = await res.innerText();
      assert.match(txt, /Flambagem: ℓe = \d+,\d+ m \(vertical, λ = \d+\)/);
      assert.match(txt, /Armadura: \d+φ[\d,]+ sup \+ \d+φ[\d,]+ inf/);
      assert.match(txt, /ligações articulada \/ engastada/);
      await res.getByRole('button', { name: 'Detalhe das seções de VI1 (Tipo 1 → Tipo 2)', exact: true }).click();
      assert.equal(await res.locator('[data-inclinada-envoltoria] tbody tr').count(), 21);
      await res.getByRole('button', { name: 'Listagem de VI1 (Tipo 1 → Tipo 2)', exact: true }).click();
      const lis = res.locator('[data-inclinada-listagem]');
      await lis.waitFor();
      assert.match(await lis.innerText(), /Materiais: C30, aço CA-50/);
      assert.ok((await lis.locator('tbody tr').count()) === 21);
      // 4. armadura bloqueada (4φ16 em cima, 4φ20 embaixo): a janela passa a mostrar "(bloqueada)"
      for (const [rot, v] of [[/^Barras superiores/, '4'], [/^Barras inferiores/, '4']]) { const c = jan.getByLabel(rot); await c.fill(v); await c.press('Enter'); }
      await jan.getByLabel(/^Bitola das superiores/).selectOption({ label: 'φ16' });
      await jan.getByLabel(/^Bitola das inferiores/).selectOption({ label: 'φ20' });
      await jan.getByRole('button', { name: 'Bloquear a armadura', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigasInclinadas?.[0]?.armadura?.inf?.phi === 20, null);
      vi = (await modelo()).vigasInclinadas[0];
      assert.deepEqual([vi.armadura.sup, vi.armadura.inf], [{ n: 4, phi: 16 }, { n: 4, phi: 20 }]);
      await res.getByText('(bloqueada)', { exact: false }).waitFor({ timeout: 60000 });
      await jan.getByRole('button', { name: 'Redimensionar esta viga inclinada', exact: true }).click();
      await esperar(() => !JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigasInclinadas?.[0]?.armadura, null);
      await page.keyboard.press('Escape');
      // 5. memorial
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mi = memo.locator('[data-memorial-inclinadas]');
      await mi.waitFor();
      assert.match(await mi.locator('[data-memorial-inclinadas-tabela="lista"]').innerText(), /VI1[\s\S]*Tipo 1 → Tipo 2[\s\S]*25×60 cm/);
      assert.match(await mi.innerText(), /nós de extremidade/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  },
```

## Verificação
`npx tsc -b` sem erros e `npx vitest run src/app/design` verde (nenhuma cor literal, classe sem CSS ou estilo inline). `npm run e2e -- E2c` verde (o comando refaz o build; sem `--no-build`). Relate só o resultado.
