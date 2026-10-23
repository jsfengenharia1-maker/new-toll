# D3 — cartão 04: faixa, abas Cargas e ações, Análise e Dimensionamento

Classe: Sonnet baixo.

## Arquivos
- `src/app/edificio/FaixaEdificio.tsx` (acrescenta as três abas)
- `src/app/edificio/Edificio.tsx` (nada a retirar neste cartão: os grupos de premissas só saem no cartão 07)
- `src/app/edificio/alvo.ts` (novo; extrai o cálculo do "alvo" da barra da planta)

## `src/app/edificio/alvo.ts`
O botão "Resultados do elemento" da `PlantaBarra` calcula o elemento selecionado dentro do componente. Extrair para um hook reutilizável (a barra de opções e a aba contextual usam o mesmo):
```ts
// Elemento (viga, pilar, laje, fundação) que está selecionado na planta, para "Resultados do elemento" e para a aba contextual da faixa.
import { useBuilding } from './store';
import { usePlanta } from './plantaStore';
import { pavimentosOrdenados } from '../../core/building/types';
import type { Alvo } from './Revisao';

export function useAlvoSelecionado(): Alvo | null {
  const b = useBuilding((s) => s.sessao.modelo);
  const sel = usePlanta((s) => s.selecao);
  const pav = usePlanta((s) => s.pavimento);
  const ps = pavimentosOrdenados(b);
  const atual = ps.find((p) => p.id === pav) ?? ps[Math.min(1, ps.length - 1)];
  for (const id of sel) {
    if (b.fundacao?.elementos.some((x) => x.id === id) || b.fundacao?.vigas?.some((x) => x.id === id) || b.fundacao?.radiers?.some((x) => x.id === id) || b.fundacao?.vigasElasticas?.some((x) => x.id === id) || b.fundacao?.corridas?.some((x) => x.id === id)) return { tipo: 'fundacao', id };
    if (b.vigas.some((x) => x.id === id)) return { tipo: 'viga', id };
    if (b.pilares.some((x) => x.id === id)) return { tipo: 'pilar', id, pavimento: atual?.nome };
    if (b.lajes.some((x) => x.id === id)) return { tipo: 'laje', id, pavimento: atual?.nome };
  }
  return null;
}
```
(É a mesma lógica do bloco `const alvo = (() => { … })()` de `PlantaBarra`, que passa a chamar `const alvo = useAlvoSelecionado();`.)

## `FaixaEdificio.tsx`: acrescentar
Imports: `import { useStore } from '../store'; import { importarCargasDoEdificio } from '../Fundacoes'; import { abrirJanela } from './Revisao'; import { useAlvoSelecionado } from './alvo';`
```tsx
const cfg = (id: string) => () => ui({ cfg: id });

function CargasEAcoes() {
  return (
    <>
      <RibbonGroup label="Casos e combinações">
        <RibbonButton icon="casos" label="Casos de carga" onClick={cfg('casos')} />
        <RibbonButton icon="estados" label="Estados-limite e combinações" onClick={cfg('estados')} />
      </RibbonGroup>
      <RibbonGroup label="Vento">
        <RibbonButton icon="vento" label="Vento e combinações" onClick={cfg('vento')} />
        <RibbonButton icon="vento" label="Ábacos de vento (NBR 6123)" onClick={cfg('abacos')} />
      </RibbonGroup>
      <RibbonGroup label="Outras ações">
        <RibbonButton icon="empuxo" label="Empuxo de terra" onClick={cfg('empuxo')} />
        <RibbonButton icon="casos" label="Etapas de carga (flechas)" onClick={cfg('etapasFlecha')} />
        <RibbonButton icon="fogo" label="Incêndio" onClick={cfg('incendio')} />
      </RibbonGroup>
    </>
  );
}

function Analise() {
  const { calcular, calculando } = useBuilding();
  return (
    <>
      <RibbonGroup label="Cálculo">
        <RibbonButton icon="calcular" label="Calcular obra" title="Mesma ação de Calcular e dimensionar (aba Dimensionamento)" disabled={calculando} onClick={() => { void calcular(); }} />
        <RibbonButton icon="modos" label="2ª ordem global…" title="Abre a vista Análise (P-Δ no lugar do γz)" onClick={() => ui({ aba: 'analise' })} />
      </RibbonGroup>
      <RibbonGroup label="Resultados">
        <RibbonButton icon="resultados" label="Ver Análise" onClick={() => ui({ aba: 'analise' })} />
        <RibbonButton icon="modos" label="Ver Deslocamentos" onClick={() => ui({ aba: 'deslocamentos' })} />
        <RibbonButton icon="camadas" label="Ver Isovalores" onClick={() => ui({ aba: 'isovalores' })} />
        <RibbonButton icon="verificacao" label="Ver Verificação" onClick={() => ui({ aba: 'verificacao' })} />
      </RibbonGroup>
      <RibbonGroup label="Opções"><RibbonButton icon="config" label="Opções de cálculo…" onClick={cfg('opcoes')} /></RibbonGroup>
    </>
  );
}

function Dimensionamento() {
  const { calcular, calculando, dim } = useBuilding();
  const alvo = useAlvoSelecionado();
  return (
    <>
      <RibbonGroup label="Calcular">
        <RibbonButton icon="calcular" label="Calcular obra" disabled={calculando} onClick={() => { void calcular(); }} />
        <RibbonButton icon="calcular" label="Calcular obra sem fundações" disabled={calculando} onClick={() => { void calcular(true); }} />
        <RibbonButton icon="dimensionamento" label="Ver Dimensionamento" onClick={() => ui({ aba: 'dimensionamento' })} />
      </RibbonGroup>
      <RibbonGroup label="Relatórios">
        <RibbonButton icon="memorial" label="Memorial da obra" onClick={() => ui({ memo: true })} />
        <RibbonButton icon="relatorio" label="Resultados do elemento" title={dim ? 'Resultados do elemento selecionado' : 'Calcule o dimensionamento primeiro'} disabled={!alvo || !dim} onClick={() => alvo && abrirJanela(alvo)} />
      </RibbonGroup>
      <RibbonGroup label="Proteção ao fogo"><RibbonButton icon="fogo" label="Resistência ao fogo…" onClick={cfg('incendio')} /></RibbonGroup>
      <RibbonGroup label="Fundações">
        <RibbonButton icon="enviar" label="Cargas para o módulo Fundações" disabled={!dim?.fundacao.length} onClick={() => { importarCargasDoEdificio(dim!.fundacao); useStore.getState().set({ module: 'fundacoes' }); }} />
      </RibbonGroup>
    </>
  );
}
```
em `FaixaEdificio`:
```tsx
  if (aba === 'cargas') return <CargasEAcoes />;
  if (aba === 'analise') return <Analise />;
  if (aba === 'dimensionamento') return <Dimensionamento />;
```
Os botões `Calcular e dimensionar` / `Recalcular`, `Calcular sem fundação`, `Enviar cargas ao módulo Fundações` e `Memorial do edifício` **ficam na vista Dimensionamento** (os fluxos os acham por esse nome; a faixa tem atalhos de rótulo diferente, ver mapa, seção 0, regra 3). Em `Edificio.tsx`, `ui.memo` (já no store) abre o `MemorialEdificio` que `Edificio` renderiza.

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run build`; `npm run mapa`; `npm run e2e -- --workers 4` completo (nada sai de lugar neste cartão; as seções `cfg` só ganham destino no cartão 07, até lá os botões "Casos de carga" etc. abrem a Configuração na seção Dados gerais).

## Rótulos
Atalhos com rótulo próprio ("Calcular obra", "Calcular obra sem fundações", "Memorial da obra", "Cargas para o módulo Fundações"); nenhum contém os textos exatos dos botões das vistas (`/^(Calcular e dimensionar|Recalcular)$/`, `Calcular sem fundação`, `Memorial do edifício`, `Enviar cargas ao módulo Fundações`).
