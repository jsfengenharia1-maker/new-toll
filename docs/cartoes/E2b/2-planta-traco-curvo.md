# Cartão E2b-2 — traçado da viga curva na planta (tecla R), viga comum em traço-ponto e item da paleta

Executor: Haiku. Depende só do núcleo da E2b (o e2e do cartão 3 usa também o editor do cartão 1). Este cartão compila sozinho.

## Regras (valem para todo o cartão)
- Só interface. **Não altere nada em `src/core/`** (o núcleo da E2b está pronto e testado em `src/core/building/curvas.test.ts` e `src/core/building/vigaComum.test.ts`). Componentes só de `src/app/ui` (nunca controles crus); sem cor literal, sem CSS novo, sem estilo inline (as classes usadas já existem em `global.css`); **nenhum botão novo na barra da planta** (a ferramenta é a Viga existente, com a tecla R, e o item da paleta Ctrl+K).
- Os rótulos abaixo são **exatos e únicos** no escopo em que o e2e os procura: não os renomeie, não acrescente `unit` aos campos que já o trazem no rótulo e mantenha o `aria-label` igual ao rótulo. No e2e, `getByLabel(..., { exact: true })` para botões; para `NumField`, `OptNumField` e `Select` (o nome acessível inclui valor ou unidade) use regex ancorada no início, como `getByLabel(/^Grupo associado/)`.
- Aplique as edições na ordem. Se um texto a localizar não existir (outro agente mexeu no arquivo), pare e descreva o que encontrou: não improvise.

## Como funciona
Na ferramenta Viga (tecla V) a tecla **R** alterna o próximo trecho entre reto e curvo. No trecho curvo o primeiro clique marca a passagem do arco e o segundo, o fim (início, passagem e fim); Enter, duplo clique ou botão direito termina e o comando `viga.tracar` recebe `passagens` (um ponto por trecho, `null` nos retos). A prévia mostra os arcos. O item "Viga: alternar trecho reto ou curvo" da paleta (Ctrl+K) faz o mesmo sem tecla. Vigas comuns (origem e associada) têm o eixo em traço-ponto.

## O que o núcleo já entrega (não reimplemente)
- `Viga.arcos?: { ini, fim }[]` (faixas de vértices de `pontos` que formam arco; a poligonal de cordas já está em `pontos`), `Viga.comum?: { grupo }` (origem) e `Viga.comumDe?: string` (associada, criada e mantida igual à origem a cada comando).
- Comandos: `viga.tracar { …, passagens }` (um ponto de passagem por trecho; `null` = reto; os trechos curvos viram arcos pela opção `curvaSegmento`), `viga.editar { pontos, passagens }`, `viga.compor { ids }`, `viga.decompor { id }`, `viga.comum { id, grupo, de?, ate? }` (`de` e `ate` em m ao longo da viga: só essa parte vira comum), `viga.comumDesfazer { id }` (aceita a origem ou a associada), `viga.ajustarPlano { id, modo: 'interseccao' | 'maximaDeclividade', planos: [{ a, b, c } | { pontos: [[x, y, z] × 3] }] }`. A associada não aceita editar geometria, dividir, unir nem remover (erro `VIGA_COMUM_ASSOCIADA`).
- `src/core/building/curvas.ts`: `ehCurva(v)`, `dadosDosArcos(v)` (raio, ângulo, número de cordas, corda máxima de cada trecho curvo), `comprimentoDesenvolvido(v)`, `decomporPoligonal(v)`, `montarPoligonal(pontos, passagens, corda)` (poligonal e arcos de uma viga por pontos de controle e passagens), `resumoVigasCurvas(b)`. `src/core/building/vigaComum.ts`: `resumoVigasComuns(b)`, `pavimentoAlvoComum`.
- Opções `curvaSegmento` (cm) e `curvaTorcaoEquilibrio` (aparecem sozinhas no grupo Opções de cálculo).

## 1. Editar `src/app/edificio/plantaStore.ts`

1.1. Campos novos do estado da planta (depois de `invertida: boolean;`).

Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
  invertida: boolean;
  tipoLaje: TipoLaje;
```

Substitua por:

```tsx
  invertida: boolean;
  /** Viga curva (E2b): o próximo trecho é um arco (clique na passagem e depois no fim); tecla R alterna. */
  curvaViga: boolean;
  /** Passagem do arco em andamento e passagens dos trechos já lançados da viga (null = trecho reto). */
  passagemViga: [number, number] | null;
  passagensViga: ([number, number] | null)[];
  tipoLaje: TipoLaje;
```

1.2. Valores iniciais (depois de `invertida: false,`).

Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
  invertida: false,
  tipoLaje: { tipo: 'macica', h: 0.1 },
```

Substitua por:

```tsx
  invertida: false,
  curvaViga: false,
  passagemViga: null,
  passagensViga: [],
  tipoLaje: { tipo: 'macica', h: 0.1 },
```

## 2. Editar `src/app/edificio/Planta.tsx`

2.1. Importar `montarPoligonal` (o texto localizado é o início do import de `types` já existente; mantenha o resto da linha).

Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
import { centroPilar, contornoPilar, dimsSecao, ehArranque, geometriaViga,
```

Substitua por:

```tsx
import { montarPoligonal } from '../../core/building/curvas';
import { centroPilar, contornoPilar, dimsSecao, ehArranque, geometriaViga,
```

2.2. Texto dos passos da ferramenta Viga (dica da barra de status).

Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
viga: ['Primeiro ponto da viga (A alterna eixo/face esquerda/face direita).', 'Próximo ponto; Enter, duplo clique ou botão direito termina; Esc cancela.'],
```

Substitua por:

```tsx
viga: ['Primeiro ponto da viga (A alterna eixo/face esquerda/face direita; R alterna trecho reto/curvo).', 'Próximo ponto; Enter, duplo clique ou botão direito termina; Esc cancela. Trecho curvo (R): clique na passagem e depois no fim do arco.'],
```

2.3. Clique da ferramenta Viga: no trecho curvo, o 1º clique é a passagem do arco e o 2º, o fim.

Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
    if (f === 'viga') { setPontos(novos); return; }
    if (f === 'laje') {
```

Substitua por:

```tsx
    if (f === 'viga') {
      // viga curva (E2b): no trecho curvo o 1º clique é a passagem do arco e o 2º, o fim; os trechos retos guardam null
      const P = usePlanta.getState(), n = pontosRef.current.length;
      if (!n) { P.set({ passagemViga: null, passagensViga: [] }); setPontos(novos); return; }
      if (P.curvaViga && !P.passagemViga) { P.set({ passagemViga: [p[0], p[1]] }); msg('Passagem do arco marcada: clique no fim do arco.'); desenharInteracao(); return; }
      P.set({ passagensViga: [...P.passagensViga.slice(0, n - 1), P.curvaViga ? P.passagemViga : null], passagemViga: null });
      setPontos(novos); return;
    }
    if (f === 'laje') {
```

2.4. Terminar a viga com as passagens dos arcos.

Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
  const terminarViga = (pts: P2[] = pontos) => {
    if (pts.length >= 2) exec('viga.tracar', { grupo, pontos: pts.map((q) => [+q[0].toFixed(4), +q[1].toFixed(4)]), secao: pl.secaoViga, alinhamento: pl.alinhamento, invertida: pl.invertida });
    setPontos([]);
  };
```

Substitua por:

```tsx
  const terminarViga = (pts: P2[] = pontos) => {
    const P = usePlanta.getState();
    // passagens dos arcos (E2b), uma por trecho: null = reto
    const passagens = Array.from({ length: Math.max(0, pts.length - 1) }, (_, i) => { const q = P.passagensViga[i]; return q ? [+q[0].toFixed(4), +q[1].toFixed(4)] : null; });
    if (pts.length >= 2) exec('viga.tracar', { grupo, pontos: pts.map((q) => [+q[0].toFixed(4), +q[1].toFixed(4)]), ...(passagens.some((q) => q) ? { passagens } : {}), secao: pl.secaoViga, alinhamento: pl.alinhamento, invertida: pl.invertida });
    P.set({ passagemViga: null, passagensViga: [] });
    setPontos([]);
  };
```

2.5. Duplo clique: com passagem pendente o ponto duplicado não foi criado.

Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
            if (POLILINHAS.includes(pl.ferramenta)) terminar(pontosRef.current.slice(0, -1).length >= 2 ? pontosRef.current.slice(0, -1) : pontosRef.current);
```

Substitua por:

```tsx
            if (POLILINHAS.includes(pl.ferramenta)) terminar(pl.ferramenta === 'viga' && usePlanta.getState().passagemViga ? pontosRef.current : pontosRef.current.slice(0, -1).length >= 2 ? pontosRef.current.slice(0, -1) : pontosRef.current);
```

2.6. Tecla R alterna trecho reto/curvo na ferramenta Viga.

Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
      if (P.ferramenta === 'viga' && k.toLowerCase() === 'a') {
```

Substitua por:

```tsx
      if (P.ferramenta === 'viga' && k.toLowerCase() === 'r') { P.set({ curvaViga: !P.curvaViga, passagemViga: null }); msg(P.curvaViga ? 'Próximo trecho da viga: reto.' : 'Próximo trecho da viga: curvo (passagem e fim do arco).'); return; }
      if (P.ferramenta === 'viga' && k.toLowerCase() === 'a') {
```

2.7. Esc limpa a passagem pendente.

Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
      if (k === 'Escape') { it.current.fundPilar = null;
```

Substitua por:

```tsx
      if (k === 'Escape') { P.set({ passagemViga: null, passagensViga: [] }); it.current.fundPilar = null;
```

2.8. Prévia do traçado com os arcos (mesma discretização da viga).

Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
      const g = geometriaViga({ pontos: [...pontos, s.ponto], secao: pl.secaoViga, alinhamento: pl.alinhamento });
      ctx.strokeStyle = cores.viga;
```

Substitua por:

```tsx
      // viga curva (E2b): trechos curvos já lançados e o em andamento (passagem marcada) como arcos pela mesma discretização da viga
      const ctl = [...pontos, s.ponto], pass = Array.from({ length: ctl.length - 1 }, (_, i) => (i < pontos.length - 1 ? pl.passagensViga[i] ?? null : pl.passagemViga));
      const arco = pass.some((q) => q) ? montarPoligonal(ctl, pass, b.opcoes?.curvaSegmento ? b.opcoes.curvaSegmento / 100 : undefined) : null;
      const g = geometriaViga({ pontos: arco && !('degenerado' in arco) ? arco.pontos : ctl, secao: pl.secaoViga, alinhamento: pl.alinhamento });
      if (pl.passagemViga) { const [qx, qy] = paraTela(...pl.passagemViga); ctx.strokeStyle = cores.viga; ctx.beginPath(); ctx.arc(qx, qy, 4, 0, 2 * Math.PI); ctx.stroke(); }
      ctx.strokeStyle = cores.viga;
```

2.9. Viga comum a dois grupos: eixo em traço-ponto.

Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
      // rótulo no meio do trecho mais longo, legível (sem ficar de cabeça para baixo)
```

Substitua por:

```tsx
      if (v.comum || v.comumDe) { ctx.setLineDash([10, 3, 2, 3]); ctx.lineWidth = 1.2; ctx.beginPath(); g.eixo.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]); } // viga comum a dois grupos: eixo em traço-ponto (E2b)
      // rótulo no meio do trecho mais longo, legível (sem ficar de cabeça para baixo)
```

2.10. Rótulo da viga: marca de comum e de associada.

Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
${v.amarracao ? ' amar.' : ''}
```

Substitua por:

```tsx
${v.amarracao ? ' amar.' : ''}${v.comum ? ' comum' : ''}${v.comumDe ? ' (assoc.)' : ''}
```

## 3. Editar `src/app/edificio/PaletaComandos.tsx`

3.1. Item da paleta (depois de "Enquadrar a planta").

Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
    { id: 'a:enquadrar', tipo: 'Ação', rotulo: 'Enquadrar a planta', detalhe: 'tecla F', repetivel: true, executar: () => naPlanta({ vista: null }) },

```

Substitua por:

```tsx
    { id: 'a:enquadrar', tipo: 'Ação', rotulo: 'Enquadrar a planta', detalhe: 'tecla F', repetivel: true, executar: () => naPlanta({ vista: null }) },
    { id: 'a:viga-curva', tipo: 'Ação', rotulo: 'Viga: alternar trecho reto ou curvo', detalhe: 'ferramenta Viga, tecla R', repetivel: true, executar: () => naPlanta({ ferramenta: 'viga', ...aoEscolher('viga'), curvaViga: !usePlanta.getState().curvaViga, passagemViga: null }) },

```

## Verificação
`npx tsc -b` sem erros e `npx vitest run src/app/design` verde. Relate só o resultado.
