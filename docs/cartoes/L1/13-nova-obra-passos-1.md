# Cartão L1-13 — Passos Obra, Normas e Pavimentos da janela "Nova obra"

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões 02, 03 e 11.

## Objetivo
Três componentes de passo, sem estado próprio (recebem a especificação e devolvem mudanças). Itens: C1.16, K1.9.2, C1.14.

## Arquivos
1. `src/app/edificio/NovaObraPassos.tsx` (criar)
Leia antes: `src/app/ui/index.tsx` (`NumField`, `TextField`, `Select`, `Seg`, `Check`, `Hint`, `Button`, `Note`), `src/core/building/assistente.ts`, `src/core/building/categoriasUso.ts`, `src/app/edificio/OpcoesCalculo.tsx` (exemplo de estilo de componente do módulo).

## Regras de interface
Somente componentes de `../ui` (nunca `<button>`, `<input>`, `<select>`, `<textarea>`); sem cor literal; sem `style` (nenhum valor calculado aqui); classes só `row`, `row wrap`, `muted`, `nova-obra`. Rótulos exatos como abaixo (os testes de interface os usam). Valores numéricos do usuário chegam por `NumField` (aceita vírgula).

## Conteúdo do arquivo
```tsx
// Passos da janela "Nova obra" (L1): cada passo edita uma parte da especificação do assistente.
import { Button, Check, Hint, NumField, Seg, Select, TextField } from '../ui';
import { categoriasDeUso } from '../../core/building/categoriasUso';
import { VENTO_PADRAO, type Norma, type CategoriaVento } from '../../core/building/types';
import type { EspecificacaoObra } from '../../core/building/assistente';

export interface PassoProps { espec: EspecificacaoObra; mudar(p: Partial<EspecificacaoObra>): void }
```

### `PassoObra`
Em `<div className="nova-obra">`, nesta ordem:
- `TextField` "Nome da obra" → `mudar({ nome: v })`.
- `TextField` "Descrição (linha 1)" e `TextField` "Descrição (linha 2)": valor `espec.descricao?.[0] ?? ''` / `[1]`; ao mudar `mudar({ descricao: [l1, l2] })` com a outra linha preservada (`''` se ausente).
- `TextField` "Cidade" → `mudar({ cidade: v })`.
- `NumField` "Fundação abaixo do pavimento mais baixo" unit `m`, valor `espec.profundidadeFundacao ?? 1.5` → `mudar({ profundidadeFundacao: v })`.
- `Hint`: `Cada linha da descrição aceita até 120 caracteres. A descrição vai à capa do memorial e ao carimbo das pranchas.`

### `PassoNormas`
- `NumField` "fck" unit `MPa`, valor `espec.norma?.fck ?? 30` → `mudar({ norma: { ...norma, fck: v } })`, onde `norma = espec.norma ?? { fck: 30, aco: 'CA-50', caa: 'II' }`.
- `Select` "Aço" com opções CA-50 e CA-60; `Select` "CAA" com opções I, II, III e IV (rótulos iguais aos valores).
- `Seg` (radiogroup) com opções `{ v: 'sistema', label: 'Padrão do sistema' }` e `{ v: 'nbr', label: 'Padrão NBR 6118' }`, valor `espec.perfil ?? 'sistema'` → `mudar({ perfil: v })`; logo abaixo um `Hint`: `O perfil define os padrões das opções de cálculo (editáveis depois): o do sistema segue o critério de mercado onde ele fixa valor; o da NBR segue a NBR 6118.`
- `Check` "Considerar vento": marcado quando `espec.vento` existe; marcar → `mudar({ vento: { v0: VENTO_PADRAO.v0, categoria: VENTO_PADRAO.categoria } })`; desmarcar → `mudar({ vento: undefined })`.
- Se há vento: `NumField` "V0" unit `m/s` e `Select` "Categoria de rugosidade" com opções `I` a `V` (tipo `CategoriaVento`).
- `Hint`: `Cobrimentos pela CAA (NBR 6118, Tabela 7.2); demais materiais e coeficientes ficam nos dados gerais da obra.`

### `PassoPavimentos`
Cabeçalho `Hint`: `Do mais baixo (1) para o mais alto. “Repetições” cria pavimentos iguais no mesmo grupo (pavimento-tipo). O pé-direito do pavimento 1 só vale para as repetições dele.`
Para cada `p` de `espec.pavimentos` (índice `i`, número `n = i + 1`), uma `<div className="row wrap">` com:
- `TextField` `Nome ${n}` → altera `nome` da linha;
- `NumField` `Pé-direito ${n}` unit `m` → `peDireito`;
- `Select` `Uso ${n}` com `categoriasDeUso().map((c) => ({ v: c.id, label: c.rotulo }))`, valor `p.categoria`; ao mudar: `categoria` novo e `q` removido (`undefined`);
- `NumField` `Sobrecarga ${n}` unit `kN/m²`, valor `p.q ?? espec.qCategoria?.[p.categoria] ?? categoriaPorId(p.categoria)?.q ?? 0` (importe `categoriaPorId`) → `q`;
- `NumField` `Repetições ${n}` → `repeticoes = Math.min(60, Math.max(1, Math.round(v)))`;
- `Button` com `aria-label={`Remover pavimento ${n}`}` e texto `Remover`, desabilitado quando só há 1 pavimento → remove a linha.
Abaixo das linhas: `Button` `Adicionar pavimento` → acrescenta ao fim `{ nome: `Pavimento ${espec.pavimentos.length + 1}`, peDireito: último.peDireito ?? 3, categoria: último.categoria ?? 'residencial', repeticoes: 1 }`.
Toda alteração chama `mudar({ pavimentos: novaLista })` com cópia nova (imutável).
Ao fim, mostre `Hint` com a altura total: `Altura total: ${total} m em ${pavimentos} pavimento(s).` onde `pavimentos = soma das repetições` e `total` = soma de `peDireito × repeticoes` das linhas **a partir da segunda**, mais `(repeticoes − 1) × peDireito` da primeira; vírgula decimal, 2 casas (`toFixed(2).replace('.', ',')`).

## Verificação
Sem teste unitário de componente (o projeto testa interface por e2e: cartão 23); o `tsc` e o teste do design system conferem tipos, classes e ausência de cor literal.
```bash
npx tsc -b && npx vitest run src/app/design/design.test.ts
```
