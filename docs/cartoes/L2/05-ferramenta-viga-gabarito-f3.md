# Cartão L2-05 — Ferramenta Viga pelo gabarito, tecla F3 e estado da planta

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões anteriores na ordem do índice; o núcleo da L2 (`lancamentoDxf.ts`, `commands/lancamento.ts`, `dwgLeitor.ts`, comandos `mascara.*`) já está no repositório. Não edite o núcleo.

## Objetivo
Estado novo no `plantaStore` (ferramenta, modo face/eixo, memória das capturas, janela de capturas) e, na planta, o clique que gera vigas pelo gabarito e a tecla F3 que liga e desliga as capturas. Itens: C6.63, C2.21. Classe sugerida: Haiku, esforço baixo; se falhar uma vez, Sonnet (integração na planta).

## Arquivos
1. `src/app/edificio/plantaStore.ts` (editar)
2. `src/app/edificio/Planta.tsx` (editar)

Leia antes: `src/app/edificio/plantaStore.ts`; `src/app/edificio/Planta.tsx` (funções `agir` e o `useEffect` do teclado; tipo `Ferramenta`); `src/core/building/lancamentoDxf.ts` (`vigasDoClique`); `src/core/commands/lancamento.ts` (`viga.daMascara`).

## Editar `src/app/edificio/plantaStore.ts`
Faça as trocas abaixo, na ordem. Em cada uma, o trecho “Procure” aparece uma única vez no arquivo (copie-o exatamente, com os espaços); substitua-o pelo trecho “Coloque”.

### Troca 1
**Procure:**
````ts
  | 'limite' | 'limiteMascara' | 'insFund' | 'radier' | 'vigaElastica' | 'corrida' | 'dividir' | 'unir' | 'prolongar' | 'copiar' | 'girar' | 'espelhar' | 'puncao' | 'zonaLaje' | 'linhaDobra' | 'pilarParede' | 'parede';
````
**Coloque:**
````ts
  | 'limite' | 'limiteMascara' | 'insFund' | 'radier' | 'vigaElastica' | 'corrida' | 'dividir' | 'unir' | 'prolongar' | 'copiar' | 'girar' | 'espelhar' | 'puncao' | 'zonaLaje' | 'linhaDobra' | 'pilarParede' | 'parede' | 'vigaGabarito';
````

### Troca 2
**Procure:**
````ts
  inferior: boolean;
````
**Coloque:**
````ts
  inferior: boolean;
  /** Capturas que estavam ligadas antes de F3 desligá-las (F3 as restaura; vazio = abre a janela de seleção). */
  capturasAntes: Set<TipoCaptura>;
  /** Janela de seleção dos modos de captura aberta (não vai para o arquivo). */
  janelaCapturas: boolean;
  /** Ferramenta Viga pelo gabarito (L2): a linha clicada é a face oposta ao 2º clique (face) ou o eixo (eixo). */
  modoVigaGab: 'face' | 'eixo';
````

### Troca 3
**Procure:**
````ts
  capturas: new Set(TODAS),
````
**Coloque:**
````ts
  capturas: new Set(TODAS),
  capturasAntes: new Set(),
  janelaCapturas: false,
  modoVigaGab: 'face',
````

## Editar `src/app/edificio/Planta.tsx`
Faça as trocas abaixo, na ordem. Em cada uma, o trecho “Procure” aparece uma única vez no arquivo (copie-o exatamente, com os espaços); substitua-o pelo trecho “Coloque”.

### Troca 1
**Procure:**
````tsx
import { geometriaMascara } from '../../core/building/pilares';
````
**Coloque:**
````tsx
import { geometriaMascara } from '../../core/building/pilares';
import { vigasDoClique } from '../../core/building/lancamentoDxf';
````

### Troca 2
**Procure:**
````tsx
  selecionar: 'Selecionar', pilar: 'Pilar', viga: 'Viga', laje: 'Laje', carga: 'Carga', eixo: 'Eixo', fundacao: 'Fundação', vigaFund: 'Viga de fundação', girarFund: 'Girar 2 pontos', insFund: 'Ponto de inserção', radier: 'Radier', vigaElastica: 'Viga sobre base elástica', corrida: 'Sapata corrida', limite: 'Limite da fundação', limiteMascara: 'Limite pela máscara', mover: 'Mover', medir: 'Medir', alinhar: 'Alinhar máscara',
````
**Coloque:**
````tsx
  selecionar: 'Selecionar', pilar: 'Pilar', viga: 'Viga', laje: 'Laje', carga: 'Carga', eixo: 'Eixo', fundacao: 'Fundação', vigaFund: 'Viga de fundação', girarFund: 'Girar 2 pontos', insFund: 'Ponto de inserção', radier: 'Radier', vigaElastica: 'Viga sobre base elástica', vigaGabarito: 'Viga pelo gabarito', corrida: 'Sapata corrida', limite: 'Limite da fundação', limiteMascara: 'Limite pela máscara', mover: 'Mover', medir: 'Medir', alinhar: 'Alinhar máscara',
````

### Troca 3
**Procure:**
````tsx
  medir: ['Primeiro ponto.', 'Segundo ponto.'],
````
**Coloque:**
````tsx
  medir: ['Primeiro ponto.', 'Segundo ponto.'],
  vigaGabarito: ['Clique numa linha, arco ou polilinha do gabarito (modo eixo: a viga sai pelo eixo; modo face: a linha é a face da viga).', 'Clique do lado em que o corpo da viga deve ficar (a linha é a face oposta ao clique).'],
````

### Troca 4
**Procure:**
````tsx
    if (f === 'selecionar') return;
````
**Coloque:**
````tsx
    if (f === 'selecionar') return;
    if (f === 'vigaGabarito') {
      // L2 (C6.63): clique na linha, arco ou polilinha do gabarito; no modo face, o 2º clique diz o lado do corpo da viga
      if (nivelFund) { msg('A viga pelo gabarito é lançada nas plantas dos pavimentos.'); return; }
      const c = it.current.cursor, r4 = (q: P2) => [+q[0].toFixed(4), +q[1].toFixed(4)], raio = 12 / (vista?.k || 1);
      if (pl.modoVigaGab === 'eixo') { exec('viga.daMascara', { grupo, ponto: r4(c), modo: 'eixo', secao: pl.secaoViga, raio }); return; }
      if (!pontosRef.current.length) {
        if (!vigasDoClique({ mascaras }, grupo, c, c, 'face', raio).length) { msg('Nenhuma linha, arco ou polilinha do gabarito perto do clique.'); return; }
        setPontos([c]); return;
      }
      const a = pontosRef.current[0];
      setPontos([]);
      exec('viga.daMascara', { grupo, ponto: r4(a), cursor: r4(c), modo: 'face', secao: pl.secaoViga, raio });
      return;
    }
````

### Troca 5
**Procure:**
````tsx
      if (k === 'F8') { e.preventDefault(); P.set({ orto: !P.orto }); msg(`Ortogonal ${P.orto ? 'desligado' : 'ligado'}.`); return; }
````
**Coloque:**
````tsx
      if (k === 'F8') { e.preventDefault(); P.set({ orto: !P.orto }); msg(`Ortogonal ${P.orto ? 'desligado' : 'ligado'}.`); return; }
      if (k === 'F3') {
        // F3 (L2, C2.21): liga e desliga as capturas; sem nenhum modo escolhido, abre a janela de seleção
        e.preventDefault();
        if (P.capturas.size) { P.set({ capturasAntes: new Set(P.capturas), capturas: new Set() }); msg('Capturas desligadas (F3 liga de novo).'); }
        else if (P.capturasAntes.size) { P.set({ capturas: new Set(P.capturasAntes) }); msg('Capturas ligadas.'); }
        else P.set({ janelaCapturas: true });
        return;
      }
````

## Verificação
```bash
npx tsc -b && npx vitest run src/app/design/design.test.ts
```

## Pontos de atenção
- A ferramenta não tem tecla (as 26 letras estão em uso); é ligada pelo botão do grupo Máscara (cartão 08), sem botão novo na barra da planta.
- No modo face há dois cliques: o primeiro na linha, o segundo do lado em que o corpo da viga deve ficar (usa o cursor bruto, não o ponto capturado). No modo eixo basta um clique.
- F3: com capturas ligadas guarda-as em `capturasAntes` e desliga; com todas desligadas e `capturasAntes` não vazio, restaura; sem nenhuma das duas, abre `janelaCapturas` (a janela é do cartão 07).
