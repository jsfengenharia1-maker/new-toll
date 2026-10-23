# D5 — cartão 03: Propriedades para a fundação (Edifício) e para o Pórtico

Classe: Sonnet baixo.

## Arquivos
- `src/App.tsx` (cartão do tipo no topo do painel direito do Pórtico)
- `src/app/panels/PropriedadesPortico.tsx` (novo)
- `src/app/Fundacoes.tsx` (módulo Fundações: Propriedades do apoio selecionado)

## 1. Pórtico
O painel direito já é de propriedades (aba Estrutura: grupos `Nó n` e `Barra n`, Apoios, Rótulas e ligações, Materiais, Seções). O que falta é o cartão do tipo. `src/app/panels/PropriedadesPortico.tsx`:
```tsx
// Cartão do tipo no topo do painel direito do Pórtico: barra, nó ou nada selecionado, com a contagem.
import { TypeCard } from '../ui';
import { useStore } from '../store';

export function PropriedadesPortico() {
  const st = useStore();
  const nm = st.selMembers.size, nn = st.selNodes.size;
  if (nm) {
    const id = [...st.selMembers][0];
    const m = st.model.members.find((x) => x.id === id);
    const sec = st.model.sections.find((s) => s.id === m?.section);
    return <TypeCard icone="barra" nome={`Barra ${id}`} tipo={sec?.name ?? 'sem seção'} contagem={`Barras (${nm})`} onEditarTipo={() => st.set({ tab: 'estrutura' })} />;
  }
  if (nn) return <TypeCard icone="no" nome={`Nó ${[...st.selNodes][0]}`} tipo="Nó" contagem={`Nós (${nn})`} />;
  return <TypeCard icone="obra" nome={st.model.name} tipo="Modelo" contagem="Nada selecionado" />;
}
```
(Campos de `Model` conforme `src/core/types.ts`: `members[].section` é o id da seção e `sections[].name` o nome; ajustar se o `tsc` apontar.) Em `App.tsx`, dentro do `<aside className="panel">`, entre as abas e o conteúdo: `<PropriedadesPortico />` (somente quando a aba é Estrutura: `{st.tab === 'estrutura' && <PropriedadesPortico />}`). "Editar tipo" leva à aba Estrutura (grupos Materiais e Seções).

## 2. Fundação (Edifício)
A edição completa do elemento de fundação (tipo, posição, dimensões impostas, estaca, pilares associados) está em `FundacaoGrupo` → `ElementoGrupoEditor`, agora na Configuração da obra (seção "Fundação"). Na doca direita, `Propriedades` já mostra o cartão do tipo do elemento de fundação selecionado e o botão "Editar tipo" que abre essa seção (cartão 01).

Nada mais é movido: o editor do elemento continua inteiro na Configuração (decisão de escopo: dividir `Fundacao.tsx`, 692 linhas, é uma frente própria e exige auditoria dos cálculos de fundação).

## 3. Módulo Fundações
O painel esquerdo (sondagens, cargas por apoio e premissas) fica como está. Acrescentar a doca direita `Propriedades` com o `SupportCard` do apoio escolhido: em `Fundacoes.tsx`, `sel` (apoio e tipo) já existe; o detalhe (`SolutionDetail`, `CapDetail`…) hoje é renderizado no centro (`fund-out`) e permanece lá. Portanto, nesta fatia **não** há doca direita no módulo Fundações (nada a mostrar que já não esteja no centro); o mapa registra a decisão (M4: centro).

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run build`; `npm run mapa`; `npm run e2e -- --workers 4` completo.

## Rótulos
`TypeCard` não tem `role` próprio; textos: `Barra <id>`, `Nó <id>`, `Barras (n)`, `Nós (n)`. Conferir `grep -n "getByText('Barra\|getByText('Nó" e2e/flows.mjs` (esperado: nenhum uso sem escopo; se houver, escopar pelo `.panel`).
