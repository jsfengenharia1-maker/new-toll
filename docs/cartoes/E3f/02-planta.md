# E3f — cartão 2: planta (cores, seta, texto de inclinação, vigas incoerentes, face superior e definição na planta)

Executor: Haiku (camadas no desenho da planta e uma ferramenta de cliques no padrão de `direcaoPano`; núcleo pronto). Regras em `00-indice.md`. Depois do cartão 1. **Aplicar depois da D6/D7.** Compila sozinho; as âncoras usam só texto estável do `Planta.tsx` (independe dos cartões da E3c, E3d e E3e, que acrescentam blocos próprios).

## Onde aparece
- **Planta**: o pano com plano é preenchido com a cor do plano (`--plano-0` … `--plano-7`, tokens novos de `global.css`: neutros e o accent da paleta enxuta); a seta da máxima declividade (sentido descendente, 30 % do menor lado do pano) com o texto de inclinação do pano (`+0,60 i = 40,0 %`) junto ao texto de seção; vigas planas que giram com o plano mostram a face superior em traço contínuo (C7.73).
- **Vigas incoerentes** com o pano (diagnóstico `PLANO_VIGA`, erro): já saem em vermelho pela lista de erros da planta; no grupo "Planos" da doca Propriedades aparece "Copiar inclinação do pano", que age sobre as vigas incoerentes selecionadas (`plano.corrigirVigas`).
- **Definição na planta**: botão "Definir plano na planta" no grupo "Planos" da faixa (ferramenta `plano`, sem tecla). No grupo "Planos" da doca, com a ferramenta ativa: "Definição na planta" (três pontos, reta horizontal + inclinação ou máxima declividade) e os desníveis. Três cliques (três pontos, "Desnível do ponto 1/2/3") ou dois (reta horizontal e máxima declividade, "Desnível do primeiro ponto" e "Inclinação da definição na planta"); cada clique captura o eixo ou a face da viga mais próxima (`capturaPlano`); o último cria o plano (`plano.criar`) e o escolhe.

## Núcleo usado (já existe)
`planoPor`, `setaDeclividade(b, laje)`, `textoInclinacao(b, laje)`, `vigasIncoerentes(b, grupo)`, `secaoNoPlano(b, viga)`, `faceSuperiorDaViga(b, viga)` e `capturaPlano(b, grupo, p, tol)` (`planos.ts`); comandos `plano.criar` e `plano.corrigirVigas { vigas }`. Cores: `cssVar('plano-N')` (`design/tokens.ts`), nunca literal em TS.

## Rótulos
Faixa: "Definir plano na planta" (ferramenta `plano`). Doca: "Definição na planta", "Desnível do ponto 1", "Desnível do ponto 2", "Desnível do ponto 3", "Desnível do primeiro ponto", "Inclinação da definição na planta", "Selecionar as vigas incoerentes", "Copiar inclinação do pano". Atributos de teste: `data-definir-plano`, `data-vigas-incoerentes` e, no contêiner do desenho, `data-planos-na-planta` (número de panos desenhados com plano).

## Fora desta entrega (notas)
- Alças nos pontos de controle com arrasto (`plano.editar { pontos }`) e o duplo clique no texto de cota para reescrever o desnível: os pontos e o desnível se editam por número no grupo "Planos" (cartão 1); o arrasto fica para uma fatia de interação da planta.
- Classe `cursor-captura` do cursor sobre eixo ou face: a captura vale no clique, sem realce.
- Ajuda F1 da ferramenta `plano` (linhas de `SEQUENCIA_PLANOS`): exige entrada em `src/core/ajuda/catalogo.ts` (`IDS_FERRAMENTAS` e o teste de contagem), fora do escopo dos cartões de interface.

## Edições em `global.css`

**Trocar em** `src/app/design/global.css`
```text
  --pl-pb-limite: #000000;
```
por
```text
  --pl-pb-limite: #000000;
  /* planos inclinados (E3f): cor de cada plano (índice 0 a 7) no preenchimento dos panos da planta; neutros e o accent da paleta enxuta */
  --plano-0: #6995fe; --plano-1: #8a8a8a; --plano-2: #3b63fb; --plano-3: #afafaf; --plano-4: #505050; --plano-5: #a0a0a0; --plano-6: #717171; --plano-7: #dbdbdb;
```

## Edições em `planosUtil.ts`

**Trocar em** `src/app/edificio/planosUtil.ts`
```text
import type { DefinicaoPlano, Plano } from '../../core/building/types';
```
por
```text
import type { DefinicaoPlano, Plano } from '../../core/building/types';
import { cssVar } from '../design/tokens';

/** Cor do plano (índice 0 a 7, token `--plano-N` do design system). */
export const corDoPlano = (cor: number | undefined) => cssVar(`plano-${(cor ?? 0) % 8}`);
```

## Edições em `plantaStore.ts`

**Trocar em** `src/app/edificio/plantaStore.ts`
```text
| 'direcaoPano' | 'insercaoPano' | 'cota';
```
por
```text
| 'direcaoPano' | 'insercaoPano' | 'cota' | 'plano';
```

**Trocar em** `src/app/edificio/plantaStore.ts`
```text
  novoPlano: boolean;
```
por
```text
  novoPlano: boolean;
  /** Definição do plano na planta (E3f, ferramenta `plano`): tipo, desníveis dos pontos (três pontos) ou do primeiro ponto e inclinação em % (não vai para o arquivo). */
  planoDef: { tipo: 'tresPontos' | 'retaHorizontal' | 'maximaDeclividade'; desnivel: number; inclinacao: number; z: [number, number, number] };
```

**Trocar em** `src/app/edificio/plantaStore.ts`
```text
  novoPlano: false,
```
por
```text
  novoPlano: false,
  planoDef: { tipo: 'maximaDeclividade', desnivel: 0, inclinacao: 10, z: [0, 0, 0] },
```

## Edições em `Planta.tsx`

**Trocar em** `src/app/edificio/Planta.tsx`
```text
import { useEffect, useMemo, useRef, useState } from 'react'
```
por
```text
import { capturaPlano, faceSuperiorDaViga, planoPor, secaoNoPlano, setaDeclividade, textoInclinacao } from '../../core/building/planos';
import { corDoPlano } from './planosUtil';
import { useEffect, useMemo, useRef, useState } from 'react'
```

**Trocar em** `src/app/edificio/Planta.tsx`
```text
  selecionar: 'Selecionar', pilar: 'Pilar',
```
por
```text
  selecionar: 'Selecionar', plano: 'Definir plano na planta', pilar: 'Pilar',
```

**Trocar em** `src/app/edificio/Planta.tsx`
```text
  insercaoPano: ['Clique no pano.', 'Clique perto do vértice que será o ponto de inserção do pano.'],
```
por
```text
  insercaoPano: ['Clique no pano.', 'Clique perto do vértice que será o ponto de inserção do pano.'],
  plano: ['Primeiro ponto do plano (captura o eixo ou a face da viga mais próxima); o tipo de definição e os desníveis ficam no grupo Planos da doca Propriedades.', 'Próximo ponto do plano.', 'Último ponto: cria o plano. Esc cancela.'],
```

**Trocar em** `src/app/edificio/Planta.tsx`
```text
  const bloqueados = useMemo(() => idsBloqueados(
```
por
```text
  // planos inclinados (E3f): cor de cada plano (tokens --plano-N) e número de panos com plano
  const coresPlano = useMemo(() => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => corDoPlano(i)), [pl.tema]);
  const bloqueados = useMemo(() => idsBloqueados(
```

**Trocar em** `src/app/edificio/Planta.tsx`
```text
ctx.fillStyle = cAlerta ?? (sel ? cores.selecao : cores.laje); ctx.fill(path, 'evenodd');
```
por
```text
ctx.fillStyle = cAlerta ?? (sel ? cores.selecao : (l.plano ? coresPlano[(planoPor(b, l.plano)?.cor ?? 0) % 8] : cores.laje)); ctx.fill(path, 'evenodd');
```

**Trocar em** `src/app/edificio/Planta.tsx`
```text
      if (l.insercao !== undefined && l.contorno[l.insercao]) {
```
por
```text
      const seta = l.plano ? setaDeclividade(b, l) : null; // plano inclinado (E3f): seta da máxima declividade e texto de inclinação
      if (seta) {
        const xs = l.contorno.map((q) => q[0]), ys = l.contorno.map((q) => q[1]), lado = 0.3 * Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
        const [ax, ay] = paraTela(seta.origem[0], seta.origem[1]), [bx, by] = paraTela(seta.origem[0] + seta.direcao[0] * lado, seta.origem[1] + seta.direcao[1] * lado);
        const ang = Math.atan2(by - ay, bx - ax);
        ctx.strokeStyle = cores.laje; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.moveTo(bx, by); ctx.lineTo(bx - 8 * Math.cos(ang - 0.4), by - 8 * Math.sin(ang - 0.4)); ctx.moveTo(bx, by); ctx.lineTo(bx - 8 * Math.cos(ang + 0.4), by - 8 * Math.sin(ang + 0.4)); ctx.stroke();
        if (textosVis.includes('secoes')) { ctx.font = '10px system-ui, sans-serif'; ctx.fillStyle = cores.laje; ctx.fillText(textoInclinacao(b, l), tx + lx, ty + 20 + ly); }
      }
      if (l.insercao !== undefined && l.contorno[l.insercao]) {
```

**Trocar em** `src/app/edificio/Planta.tsx`
```text
    // punção e cortante: contornos C
```
por
```text
    // planos inclinados (E3f, C7.73): vigas planas que giram com o plano mostram a face superior em traço contínuo
    if (wrap.current) wrap.current.dataset.planosNaPlanta = String(lajes.filter(({ l }) => !!l.plano).length);
    for (const { v } of vigas) {
      if (!secaoNoPlano(b, v)?.gira) continue;
      ctx.strokeStyle = cores.viga; ctx.lineWidth = 1; ctx.setLineDash([]);
      for (const [fa, fz] of faceSuperiorDaViga(b, v).linhas) { const [x1, y1] = paraTela(fa[0], fa[1]), [x2, y2] = paraTela(fz[0], fz[1]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    }
    // punção e cortante: contornos C
```

**Trocar em** `src/app/edificio/Planta.tsx`
```text
    if (f === 'direcaoPano' || f === 'insercaoPano') {
```
por
```text
    if (f === 'plano') {
      // E3f (C7.66): três cliques (três pontos, com os desníveis do grupo Planos) ou dois (reta horizontal ou máxima declividade); cada clique captura o eixo ou a face da viga mais próxima
      const P = usePlanta.getState();
      if (nivelFund || !pav) { msg('Planos são definidos nas plantas dos pavimentos.'); return; }
      const cap = capturaPlano(b, grupo, [p[0], p[1]], 0.15), q: P2 = cap ? [cap.ponto[0], cap.ponto[1]] : p, d = P.planoDef, tres = d.tipo === 'tresPontos';
      const pts = [...pontosRef.current, q];
      if (pts.length < (tres ? 3 : 2)) { setPontos(pts); msg(`Ponto ${pts.length} do plano marcado${cap ? ` (${cap.tipo === 'eixo' ? 'eixo' : 'face'} da viga)` : ''}: marque o próximo.`); return; }
      setPontos([]);
      const pontos = pts.map((c, i) => (tres ? [+c[0].toFixed(4), +c[1].toFixed(4), d.z[i]] : [+c[0].toFixed(4), +c[1].toFixed(4)]));
      const r = exec('plano.criar', tres ? { grupo, tipo: d.tipo, pontos } : { grupo, tipo: d.tipo, pontos, desnivel: d.desnivel, inclinacao: d.inclinacao });
      if (r.ok) P.set({ planoSel: useBuilding.getState().sessao.modelo.planos?.filter((x) => x.grupo === grupo).at(-1)?.id ?? null });
      return;
    }
    if (f === 'direcaoPano' || f === 'insercaoPano') {
```

## Edições em `PlanosUI.tsx` (faixa e grupo "Planos")

**Trocar em** `src/app/edificio/PlanosUI.tsx`
```text
import { coeficientesPlano, grausDaTangente, inclinacaoDoPlano, planoAtribuido } from '../../core/building/planos';
```
por
```text
import { coeficientesPlano, grausDaTangente, inclinacaoDoPlano, planoAtribuido, vigasIncoerentes } from '../../core/building/planos';
```

**Trocar em** `src/app/edificio/PlanosUI.tsx`
```text
        {grupo && <ListaPlanos b={b} grupo={grupo.id} />}
```
por
```text
        {grupo && <ListaPlanos b={b} grupo={grupo.id} />}
        <DefinirNaPlanta />
        {grupo && <CorrigirVigas b={b} grupo={grupo.id} />}
```

**Acrescentar ao fim de** `src/app/edificio/PlanosUI.tsx`
```tsx

/** Definição do plano pelos cliques na planta (ferramenta `plano`): tipo e desníveis; visível com a ferramenta ativa. */
function DefinirNaPlanta() {
  const pl = usePlanta();
  const d = pl.planoDef, tres = d.tipo === 'tresPontos';
  if (pl.ferramenta !== 'plano') return <Hint>Para definir o plano na planta use “Definir plano na planta” (faixa, aba Edição, grupo Planos): marque os pontos com o mouse; o clique captura o eixo ou a face da viga mais próxima.</Hint>;
  return (
    <div data-definir-plano>
      <div className="row wrap">
        <Select label="Definição na planta" value={d.tipo} options={TIPOS_DEF} onChange={(v) => pl.set({ planoDef: { ...d, tipo: v } })} />
        {tres
          ? [0, 1, 2].map((k) => <NumField key={k} label={`Desnível do ponto ${k + 1}`} unit="m" width={110} value={d.z[k]} onChange={(v) => pl.set({ planoDef: { ...d, z: d.z.map((x, i) => (i === k ? v : x)) as [number, number, number] } })} />)
          : <>
            <NumField label="Desnível do primeiro ponto" unit="m" width={130} value={d.desnivel} onChange={(v) => pl.set({ planoDef: { ...d, desnivel: v } })} />
            <NumField label="Inclinação da definição na planta" unit="%" width={130} value={d.inclinacao} onChange={(v) => pl.set({ planoDef: { ...d, inclinacao: v } })} />
          </>}
      </div>
      <Hint>{tres ? 'Três cliques: um por ponto, com o desnível de cada um.' : d.tipo === 'retaHorizontal' ? 'Dois cliques: a reta horizontal; a inclinação sobe para a esquerda de p1 → p2.' : 'Dois cliques: a linha de máxima declividade; a inclinação sobe de p1 para p2.'} Esc cancela.</Hint>
    </div>
  );
}

/** Vigas incoerentes com o pano inclinado do grupo (PLANO_VIGA) e a correção pelo clique: copia a inclinação do pano para as selecionadas. */
function CorrigirVigas({ b, grupo }: { b: BuildingModel; grupo: string }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const inc = vigasIncoerentes(b, grupo);
  if (!inc.length) return null;
  const sel = [...new Set(inc.filter((x) => pl.selecao.has(x.viga)).map((x) => x.viga))];
  return (
    <div data-vigas-incoerentes>
      <p className="small bad" role="alert">{new Set(inc.map((x) => x.viga)).size} viga(s) não acompanham a inclinação do pano (erro PLANO_VIGA): selecione-as na planta e copie a inclinação do pano.</p>
      <div className="row wrap">
        <Button onClick={() => pl.set({ selecao: new Set(inc.map((x) => x.viga)) })}>Selecionar as vigas incoerentes</Button>
        <Button disabled={!sel.length} onClick={() => { const r = exec('plano.corrigirVigas', { vigas: sel }); if (!r.ok) useStore.getState().set({ message: r.erros[0]?.mensagem ?? 'Correção recusada.' }); }}>Copiar inclinação do pano</Button>
      </div>
    </div>
  );
}
```

## Edições em `FaixaEdificio.tsx`

**Trocar em** `src/app/edificio/FaixaEdificio.tsx`
```text
      <PlanosFaixa />
```
por
```text
      <PlanosFaixa><Ferr f="plano" icon="laje" /></PlanosFaixa>
```

## Edições no mapa de migração do layout e na guarda

A ferramenta nova entra no mapa (`docs/analises/layout-bimcraft-mapa.md`) e a guarda `mapaLayout.test.ts` passa a contar 42 ferramentas e 225 itens.

**Trocar em** `docs/analises/layout-bimcraft-mapa.md`
```text
| T41 | Cota em série | | PlantaBarra | RB:lancamento / Anotação (L6; acrescentada após o mapa) |
```
por
```text
| T41 | Cota em série | | PlantaBarra | RB:lancamento / Anotação (L6; acrescentada após o mapa) |
| T42 | Definir plano na planta | | PlanosUI | RB:edicao / Planos (E3f; acrescentada após o mapa) |
```

**Trocar em** `docs/analises/layout-bimcraft-mapa.md`
```text
- Total: 58 + 44 + 41 + 22 + 16 + 31 + 6 + 6 = **224 itens**
```
por
```text
- Total: 58 + 44 + 42 + 22 + 16 + 31 + 6 + 6 = **225 itens**
```

**Trocar em** `src/app/design/mapaLayout.test.ts`
```text
    expect(mapa).toContain('**224 itens**');
```
por
```text
    expect(mapa).toContain('**225 itens**');
```

**Trocar em** `src/app/design/mapaLayout.test.ts`
```text
  it('as 41 ferramentas da planta têm linha no mapa, com a tecla quando existe', () => {
    expect(rotulos.length).toBe(41);
```
por
```text
  it('as 42 ferramentas da planta têm linha no mapa, com a tecla quando existe', () => {
    expect(rotulos.length).toBe(42);
```

## Verificação
`npx tsc -b`; `npx vitest run src/app`. O e2e do fluxo `E3f` (cartão 4) cobre a planta.
