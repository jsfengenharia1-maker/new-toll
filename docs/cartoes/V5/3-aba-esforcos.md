# Cartão V5-3 — vista "Esforços"

Executor: Haiku. Depois dos cartões 1 e 2. **Aplicar depois da D7** (toca `FaixaEdificio.tsx` e `arvore.ts`). Regras em `0-leia-primeiro.md`.

## Onde aparece no layout novo
- Aba de vista **Esforços** em `.edif-tabs` (entre Isovalores e Dimensionamento).
- Nó **Esforços** em Vistas do Navegador (`arvore.ts`, constante `VISTAS`).
- Botão **Ver Esforços** no grupo "Resultados" da aba **Análise** da faixa de comandos.
- Sem cálculo atual: "Calcule a estrutura (aba Dimensionamento) para ver os diagramas por hipótese."

## Comportamento da vista
Botão "Nova janela de esforços". Cada janela (`data-esf-janela="<n>"`, `data-esf` em JSON com tipo, hipótese, grandeza, pontos, máximo, mínimo e combinações determinantes) traz: tipo de elemento, elemento, hipótese (envoltória ELU/rara/frequente/quase permanente primeiro, depois combinações e casos), grandeza e, nas vigas com vários pavimentos, o pavimento. Diagrama em SVG (`polyline.esf-curva`; na envoltória também `polyline.esf-curva-min`), extremos em texto. Viga e pilar retangular: bloco `data-esf-secao="<domínio>"` (seção, barras, linha neutra, domínio, εc, x, x/d, MRd). Vigotas: chave "Exibir esforços das vigotas (janela n)" e vista.

## Rótulos
`Esforços` (aba, nó e título), `Ver Esforços` (botão da faixa), `Nova janela de esforços`, `Fechar janela n`, `Tipo de elemento (janela n)`, `Elemento (janela n)`, `Hipótese (janela n)` (opções "Caso G", "Caso Q", nomes das combinações e "Envoltória ELU"), `Grandeza (janela n)`, `Pavimento (janela n)`, `Exibir esforços das vigotas (janela n)`, `Vista das vigotas (janela n)`.

**Arquivo novo** `src/app/edificio/AbaEsforcos.tsx`
```tsx
// Aba "Esforços" (V5): diagramas de M, V, N e T de vigas, pilares, diagonais e vigotas por hipótese (envoltória,
// combinação ou caso), estado da seção do concreto (deformações, linha neutra e tensões) e vistas das vigotas com a
// chave geral de exibição de esforços. A matemática vem de src/core/resultados (funções puras).
import { useMemo } from 'react';
import { calculoAtual, useBuilding } from './store';
import type { BuildingModel } from '../../core/building/types';
import {
  diagramaInclinada, diagramaPilar, diagramaViga, hipotesesDeEsforco, type DiagramaBarras, type HipoteseEsforco, type Componente,
} from '../../core/resultados/esforcosCaso';
import { diagramaVigotas, rotulosDeVigotas, vistaDisponivel, type VistaVigota } from '../../core/resultados/vigotasVista';
import { estadoDaViga, estadoDoPilar, type EstadoDoElemento } from '../../core/resultados/estadoElementos';
import { Button, Check, Group, Hint, Select } from '../ui';
import { useEsforcos, type JanelaEsforco, type TipoElementoEsforco } from './esforcosStore';

const GRANDEZAS: { v: Componente; label: string; unidade: string }[] = [
  { v: 'Mz', label: 'Momento no plano (M)', unidade: 'kN·m' }, { v: 'Vy', label: 'Cortante (V no plano)', unidade: 'kN' }, { v: 'T', label: 'Torção (T)', unidade: 'kN·m' },
  { v: 'N', label: 'Normal (N)', unidade: 'kN' }, { v: 'My', label: 'Momento fora do plano', unidade: 'kN·m' }, { v: 'Vz', label: 'Cortante fora do plano', unidade: 'kN' },
];
const TIPOS: { v: TipoElementoEsforco; label: string }[] = [{ v: 'viga', label: 'Viga' }, { v: 'pilar', label: 'Pilar' }, { v: 'diagonal', label: 'Diagonal' }, { v: 'vigotas', label: 'Vigotas' }];
const VISTAS: { v: VistaVigota; label: string }[] = [{ v: 'momentos', label: 'Momentos / tipos' }, { v: 'cortantes', label: 'Cortantes / treliça' }, { v: 'armaduraInferior', label: 'Armadura inferior (moldada)' }];
const LARG = 640, ALT = 220, PAD = 28;
const f2 = (v: number) => v.toFixed(2).replace('.', ',');

export function AbaEsforcos({ b }: { b: BuildingModel }) {
  const an = useBuilding((s) => (calculoAtual(s) && !s.analise?.erro ? s.analise : null));
  const janelas = useEsforcos((s) => s.janelas);
  const nova = useEsforcos((s) => s.nova);
  if (!an) return <div className="card"><h3>Esforços</h3><p className="hint">Calcule a estrutura (aba Dimensionamento) para ver os diagramas por hipótese.</p></div>;
  return (
    <div className="esf-aba">
      <div className="row">
        <Button variant="primary" onClick={() => nova()}>Nova janela de esforços</Button>
        <Hint>Escolha o elemento, a hipótese (envoltória, combinação ou caso) e a grandeza. As janelas ficam lado a lado.</Hint>
      </div>
      <div className="isov-janelas" data-esf-janelas={janelas.length}>
        {janelas.map((j) => <JanelaEsforcos key={j.id} j={j} b={b} />)}
      </div>
    </div>
  );
}

/** Diagrama em SVG: abscissa horizontal, valor na vertical (o momento é desenhado para baixo, do lado tracionado). */
function Diagrama({ n, d, g, us, unidade }: { n: number; d: DiagramaBarras; g: Componente; us: number[]; unidade: string }) {
  const u0 = Math.min(...us), u1 = Math.max(...us, u0 + 1e-6);
  const vmax = Math.max(1e-9, ...d.pontos.map((p) => Math.max(Math.abs(p.max[g]), Math.abs(p.min[g]))));
  const sinal = g === 'Mz' || g === 'My' ? 1 : -1, cy = ALT / 2;
  const X = (u: number) => PAD + ((u - u0) / (u1 - u0)) * (LARG - 2 * PAD), Y = (v: number) => cy + sinal * (v / vmax) * (cy - PAD);
  const pts = (k: 'max' | 'min') => d.pontos.map((p, i) => `${X(us[i]).toFixed(1)},${Y(p[k][g]).toFixed(1)}`).join(' ');
  const env = d.hipotese.tipo === 'envoltoria', ex = d.extremos[g];
  const area = `${X(us[0]).toFixed(1)},${cy} ${pts('max')} ${X(us.at(-1)!).toFixed(1)},${cy}`;
  return (
    <svg className="esf-svg" role="img" aria-label={`Diagrama de esforços (janela ${n})`} viewBox={`0 0 ${LARG} ${ALT}`}>
      <line className="esf-eixo" x1={PAD} x2={LARG - PAD} y1={cy} y2={cy} />
      <polygon className="esf-area" points={area} />
      <polyline className="esf-curva" points={pts('max')} />
      {env && <polyline className="esf-curva-min" points={pts('min')} />}
      <text className="esf-valor" x={PAD} y={14}>{`máx ${f2(ex.max.valor)} ${unidade} · mín ${f2(ex.min.valor)} ${unidade}`}</text>
    </svg>
  );
}

/** Seção do concreto: contorno, barras (escoando em destaque) e linha neutra, na escala de 1 m = `esc` px. */
function SecaoSvg({ n, e }: { n: number; e: EstadoDoElemento }) {
  const esc = 260 / Math.max(e.b, e.h), W = e.b * esc, H = e.h * esc, m = 14, s = e.estado;
  const X = (x: number) => m + x * esc, Y = (y: number) => m + (e.h - y) * esc; // y da seção para cima
  const u = s.normal, ln = s.s0 === null ? null : { cx: e.b / 2 + s.s0 * u[0], cy: e.h / 2 + s.s0 * u[1] };
  return (
    <svg className="esf-svg" role="img" aria-label={`Seção do concreto (janela ${n})`} viewBox={`0 0 ${W + 2 * m} ${H + 2 * m}`}>
      <rect className="esf-sec-conc" x={m} y={m} width={W} height={H} />
      <svg x={m} y={m} width={W} height={H} overflow="hidden">
        {ln && <line className="esf-sec-ln" x1={(ln.cx - u[1] * 5) * esc} y1={(e.h - (ln.cy + u[0] * 5)) * esc} x2={(ln.cx + u[1] * 5) * esc} y2={(e.h - (ln.cy - u[0] * 5)) * esc} />}
      </svg>
      {s.barras.map((q, i) => <circle key={i} className={q.escoa ? 'esf-barra-aco-esc' : 'esf-barra-aco'} cx={X(q.x)} cy={Y(q.y)} r={Math.max(2.5, Math.sqrt(q.A / Math.PI) * esc)} />)}
    </svg>
  );
}

function JanelaEsforcos({ j, b }: { j: JanelaEsforco; b: BuildingModel }) {
  const an = useBuilding((s) => (calculoAtual(s) && !s.analise?.erro ? s.analise : null))!;
  const dim = useBuilding((s) => s.dim);
  const mudar = useEsforcos((s) => s.mudar), fechar = useEsforcos((s) => s.fechar);
  const n = j.id;
  const hips = useMemo(() => hipotesesDeEsforco(b, an), [b, an]);
  const hip: HipoteseEsforco = hips.find((h) => h.id === j.hipotese) ?? hips[0];
  const elementos = useMemo(() => {
    if (j.tipo === 'viga') return b.vigas.map((v) => ({ v: v.id, label: v.nome }));
    if (j.tipo === 'pilar') return b.pilares.map((p) => ({ v: p.id, label: p.nome }));
    if (j.tipo === 'diagonal') return (an.inclinadas ?? []).map((i) => ({ v: i.id, label: i.nome }));
    return (dim?.vigotas ?? []).map((r) => ({ v: r.laje, label: r.nome }));
  }, [j.tipo, b, an, dim]);
  const elemento = elementos.find((e) => e.v === j.elemento)?.v ?? elementos[0]?.v ?? '';
  const info = GRANDEZAS.find((g) => g.v === j.grandeza)!;

  const dv = useMemo(() => (j.tipo === 'viga' && elemento ? diagramaViga(b, an, elemento, hip) : []), [j.tipo, b, an, elemento, hip]);
  const pavs = dv.map((d) => d.pavimento);
  const pav = pavs.includes(j.pavimento) ? j.pavimento : pavs[0];
  const dViga = dv.find((d) => d.pavimento === pav);
  const dPilar = useMemo(() => (j.tipo === 'pilar' && elemento ? diagramaPilar(an, elemento, hip) : null), [j.tipo, an, elemento, hip]);
  const dDiag = useMemo(() => (j.tipo === 'diagonal' && elemento ? diagramaInclinada(an, elemento, hip) : null), [j.tipo, an, elemento, hip]);
  const diag: DiagramaBarras | null = dViga ?? dPilar ?? dDiag;
  const us = dViga ? dViga.s : dPilar ? dPilar.altura : dDiag ? dDiag.pontos.map((p) => p.x) : [];

  const estado = useMemo(() => {
    if (!dim) return null;
    if (j.tipo === 'viga') { const r = dim.vigas.find((x) => x.viga === elemento); return r ? estadoDaViga(b, r) : null; }
    if (j.tipo === 'pilar') { const r = dim.pilares.find((x) => x.pilar === elemento && x.determinantes?.length); return r ? estadoDoPilar(b, r) : null; }
    return null;
  }, [j.tipo, dim, b, elemento]);

  const vig = j.tipo === 'vigotas' ? dim?.vigotas?.find((r) => r.laje === elemento) : undefined;
  const rotVig = useMemo(() => (vig ? rotulosDeVigotas(vig, j.vista, j.esforcos) : []), [vig, j.vista, j.esforcos]);
  const dVig = useMemo(() => (vig ? diagramaVigotas(b, an, vig, hip) : []), [vig, b, an, hip]);

  const dados = diag ? JSON.stringify({
    tipo: j.tipo, hipotese: hip.id, grandeza: j.grandeza, pontos: diag.pontos.length, max: +diag.extremos[j.grandeza].max.valor.toFixed(3), min: +diag.extremos[j.grandeza].min.valor.toFixed(3),
    porMax: diag.extremos[j.grandeza].max.por, porMin: diag.extremos[j.grandeza].min.por, envoltoria: hip.tipo === 'envoltoria',
  }) : vig ? JSON.stringify({ tipo: 'vigotas', hipotese: hip.id, faixas: dVig.length, rotulos: rotVig.length, textos: rotVig.map((r) => r.texto), esforcos: j.esforcos, vista: j.vista }) : undefined;

  // vigotas na planta: caixa dos alinhamentos
  const vb = useMemo(() => {
    if (!vig) return null;
    const xs = vig.faixas.flatMap((f) => [f.a[0], f.z[0]]), ys = vig.faixas.flatMap((f) => [f.a[1], f.z[1]]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), k = 520 / Math.max(x1 - x0, 1e-6);
    return { X: (x: number) => 40 + (x - x0) * k, Y: (y: number) => 20 + (y1 - y) * k, W: 80 + (x1 - x0) * k, H: 40 + (y1 - y0) * k };
  }, [vig]);

  return (
    <Group title={`Janela ${n}`} aside={<Button variant="mini" onClick={() => fechar(n)}>{`Fechar janela ${n}`}</Button>}>
      <div className="isov-janela" data-esf-janela={n} data-esf={dados}>
        <div className="row esf-barra">
          <Select label={`Tipo de elemento (janela ${n})`} value={j.tipo} options={TIPOS} onChange={(v) => mudar(n, { tipo: v, elemento: '' })} />
          <Select label={`Elemento (janela ${n})`} value={elemento} options={elementos} onChange={(v) => mudar(n, { elemento: v })} />
          <Select label={`Hipótese (janela ${n})`} value={hip.id} options={hips.map((h) => ({ v: h.id, label: h.tipo === 'caso' ? `Caso ${h.nome}` : h.nome }))} onChange={(v) => mudar(n, { hipotese: v })} />
          {j.tipo !== 'vigotas' && <Select label={`Grandeza (janela ${n})`} value={j.grandeza} options={GRANDEZAS.map((g) => ({ v: g.v, label: g.label }))} onChange={(v) => mudar(n, { grandeza: v })} />}
          {j.tipo === 'viga' && pavs.length > 1 && <Select label={`Pavimento (janela ${n})`} value={pav} options={pavs.map((p) => ({ v: p, label: b.pavimentos.find((x) => x.id === p)?.nome ?? p }))} onChange={(v) => mudar(n, { pavimento: v })} />}
        </div>
        {!elementos.length && <p className="hint">Nenhum elemento calculado deste tipo.</p>}
        {diag && <Diagrama n={n} d={diag} g={j.grandeza} us={us} unidade={info.unidade} />}
        {diag && diag.ignorados.length > 0 && <p className="hint small">Casos sem esforço nesta barra: {diag.ignorados.join(', ')}.</p>}
        {diag && (
          <p className="hint small" data-esf-extremos>
            {info.label}: máximo {f2(diag.extremos[j.grandeza].max.valor)} {info.unidade} ({diag.extremos[j.grandeza].max.por}); mínimo {f2(diag.extremos[j.grandeza].min.valor)} {info.unidade} ({diag.extremos[j.grandeza].min.por}).
          </p>
        )}
        {estado?.estado.resolvido && (
          <div data-esf-secao={estado.estado.dominio}>
            <SecaoSvg n={n} e={estado} />
            <p className="hint small">{estado.rotulo}. Domínio {estado.estado.dominio}; εc = {f2(estado.estado.epsTopo * 1000)}‰; linha neutra x = {estado.estado.x === null ? '—' : f2(estado.estado.x * 100)} cm (x/d = {estado.estado.xd === null ? '—' : f2(estado.estado.xd)}); MRd = {f2(estado.estado.MRd)} kN·m.</p>
          </div>
        )}
        {j.tipo === 'vigotas' && vig && vb && (
          <>
            <div className="row esf-barra">
              <Check label={`Exibir esforços das vigotas (janela ${n})`} checked={j.esforcos} onChange={(v) => mudar(n, { esforcos: v, vista: !vistaDisponivel(j.vista, v) ? 'momentos' : j.vista })} />
              <Select label={`Vista das vigotas (janela ${n})`} value={j.vista} options={VISTAS.filter((v) => vistaDisponivel(v.v, j.esforcos))} onChange={(v) => mudar(n, { vista: v })} />
            </div>
            <svg className="esf-svg" role="img" aria-label={`Vigotas da laje (janela ${n})`} viewBox={`0 0 ${vb.W} ${vb.H}`}>
              {vig.faixas.map((f, i) => <line key={i} className="esf-vig-faixa" x1={vb.X(f.a[0])} y1={vb.Y(f.a[1])} x2={vb.X(f.z[0])} y2={vb.Y(f.z[1])} />)}
              {rotVig.map((r, i) => <text key={i} className="esf-vig-rot" x={vb.X(r.pos[0])} y={vb.Y(r.pos[1])} textAnchor="middle">{r.texto}</text>)}
            </svg>
            {dVig.length > 0 && <p className="hint small">Hipótese {hip.nome}: M máx. {f2(Math.max(...dVig.flatMap((f) => f.Mmax.map((m) => m / f.intereixo))))} kN·m/m; V máx. {f2(Math.max(...dVig.flatMap((f) => f.V.map((v) => v / f.intereixo))))} kN/m; torção nula.</p>}
          </>
        )}
      </div>
    </Group>
  );
}
```

## Edições

**Trocar em** `src/app/edificio/uiStore.ts`
```text
| 'isovalores' | 'dimensionamento'
```
por
```text
| 'isovalores' | 'esforcos' | 'dimensionamento'
```

**Trocar em** `src/app/edificio/arvore.ts`
```text
['isovalores', 'Isovalores'], ['dimensionamento'
```
por
```text
['isovalores', 'Isovalores'], ['esforcos', 'Esforços'], ['dimensionamento'
```

**Trocar em** `src/app/edificio/arvore.test.ts`
```text
expect(VISTAS.length).toBe(10);
```
por
```text
expect(VISTAS.length).toBe(11);
```
(Se a D7 ou outra fatia já mudou esse número, some 1 ao valor vigente.)

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
import { AbaIsovalores } from './AbaIsovalores';
```
por
```text
import { AbaIsovalores } from './AbaIsovalores';
import { AbaEsforcos } from './AbaEsforcos';
```

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
['isovalores', 'Isovalores'], ['dimensionamento'
```
por
```text
['isovalores', 'Isovalores'], ['esforcos', 'Esforços'], ['dimensionamento'
```

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
{aba === 'isovalores' && <AbaIsovalores b={b} />}
```
por
```text
{aba === 'isovalores' && <AbaIsovalores b={b} />}
            {aba === 'esforcos' && <AbaEsforcos b={b} />}
```

**Trocar em** `src/app/edificio/FaixaEdificio.tsx`
```text
<RibbonButton icon="camadas" label="Ver Isovalores" onClick={() => ui({ aba: 'isovalores' })} />
```
por
```text
<RibbonButton icon="camadas" label="Ver Isovalores" onClick={() => ui({ aba: 'isovalores' })} />
        <RibbonButton icon="resultados" label="Ver Esforços" onClick={() => ui({ aba: 'esforcos' })} />
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design src/app/edificio/arvore.test.ts`.
