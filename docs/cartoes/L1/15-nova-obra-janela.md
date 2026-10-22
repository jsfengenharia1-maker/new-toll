# Cartão L1-15 — Janela "Nova obra" (modos de criação e assistente em etapas)

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões 08, 12, 13 e 14.

## Objetivo
A janela que reúne os modos de criação e o assistente de 6 etapas. Itens: C1.15, C1.16, C1.24, C1.44.

## Arquivos
1. `src/app/edificio/NovaObra.tsx` (criar)
Leia antes: `src/app/edificio/NovaObraPassos.tsx`, `src/app/edificio/store.ts` (ações `novo`, `novaObra`, `novaObraExemplo`), `Modal`, `Seg`, `Chip`, `Button`, `Note`, `Hint` em `src/app/ui/index.tsx`, `src/app/edificio/EstadosLimite.tsx` (exemplo de componente com Modal).

## Contrato
```tsx
export function NovaObra({ onClose, onCriada, onTexto }: { onClose(): void; onCriada(): void; onTexto(): void })
```
`onCriada` é chamado depois que a obra foi criada (o pai fecha a janela e abre os dados gerais, cartão 20). `onTexto` abre a importação de texto (cartão 18; o pai fecha esta janela).

## Estado
- `const [passo, setPasso] = useState<Passo>('modo')`, com `type Passo = 'modo' | 'obra' | 'normas' | 'pavimentos' | 'eixos' | 'cargas' | 'resumo'`.
- `const [modo, setModo] = useState<Modo>('assistente')`, com `type Modo = 'assistente' | 'vazio' | 'padrao' | 'exemplo' | 'texto' | 'dxf' | 'ifc'`.
- `const [espec, setEspec] = useState<EspecificacaoObra>(() => structuredClone(ESPEC_PADRAO))`; `const mudar = (p: Partial<EspecificacaoObra>) => setEspec((e) => ({ ...e, ...p }))`.
- `const erros = validarEspecificacao(espec)`.
- Da loja: `const { novo, novaObra, novaObraExemplo } = useBuilding();`.

## Estrutura (JSX)
`<Modal titulo="Nova obra" onClose={onClose} larga>` contendo, em ordem:
1. Se `modo === 'assistente'`: `Seg small` de passos com `options` `[{ v: 'modo', label: 'Modo' }, { v: 'obra', label: 'Obra' }, { v: 'normas', label: 'Normas e materiais' }, { v: 'pavimentos', label: 'Pavimentos' }, { v: 'eixos', label: 'Eixos' }, { v: 'cargas', label: 'Cargas' }, { v: 'resumo', label: 'Resumo' }]`, valor `passo`, `onChange={setPasso}`.
2. Corpo (`<div className="nova-obra">`):
   - `passo === 'modo'`: `Hint` `Como começar a nova obra?`; uma `<div className="row wrap">` de `Chip` (prop `on={modo === m.v}`, `onClick={() => setModo(m.v)}`), com os rótulos exatos: `Assistente passo a passo`, `Obra vazia`, `Edifício padrão`, `Obra de exemplo`, `Cargas de arquivo de texto`, `Lançamento por DXF/DWG`, `Importação de IFC`. Os dois últimos com `disabled` e `title` `Chega com a frente L2` / `Chega com a frente L3`. Depois, conforme o modo:
     - `assistente`: `Hint` `Responda em 6 etapas; a obra é gerada de uma vez e abre a janela de dados gerais.`
     - `vazio`: `Hint` `Obra sem pavimentos: crie pavimentos, grupos e pilares pelos comandos e pela planta.` e `Button variant="primary"` `Criar obra vazia` → `novo(true); onCriada();`
     - `padrao`: `Hint` `Térreo, 3 pavimentos-tipo e cobertura, pé-direito de 3 m.` e `Button variant="primary"` `Criar edifício padrão` → `novo(false); onCriada();`
     - `exemplo`: para cada `e` de `EXEMPLOS_OBRA` (de `../../core/building/exemplos`) um bloco `<div className="recente">` com `<div className="recente-info"><span className="recente-nome">{e.nome}</span><span className="recente-meta">{e.descricao.join(' · ')} — {e.resumo}</span></div>` e `Button` `Abrir exemplo` com `aria-label={`Abrir exemplo ${e.nome}`}` → `novaObraExemplo(e.id); onCriada();`
     - `texto`: `Hint` `Arquivo de texto com as hipóteses de carga, os esforços nos arranques e a dimensão da base dos pilares: gera uma obra só de arranques para calcular as fundações.` e `Button variant="primary"` `Escolher arquivo de texto…` → `onTexto()`.
     - `dxf`/`ifc`: não chegam a ser escolhidos (chips desabilitados).
   - `passo === 'obra'` → `<PassoObra espec={espec} mudar={mudar} />`; `'normas'` → `PassoNormas`; `'pavimentos'` → `PassoPavimentos`; `'eixos'` → `PassoEixos`; `'cargas'` → `PassoCargas`; `'resumo'` → `<PassoResumo espec={espec} mudar={mudar} erros={erros} />`.
   - Em qualquer modo diferente de `assistente`, mostre também `Note`: `A nova obra substitui a obra atual. Guarde a atual antes, pelo Arquivo › Salvar no computador, se precisar.`
3. Rodapé `<div className="nova-obra-rodape">`: `Button variant="ghost"` `Cancelar` (→ `onClose`); `Spacer`; só no modo `assistente`: texto `Etapa {k} de 6` (`<span className="muted">`; `k` = índice do passo na ordem `obra…resumo`, 0 no passo `modo` mostra `Início`), `Button` `Voltar` (volta um passo; desabilitado em `modo`), e à direita `Button variant="primary"` `Avançar` (passos `modo` a `cargas`) ou `Button variant="primary"` `Criar obra` (passo `resumo`; `disabled={erros.length > 0}`) → `const r = novaObra(espec); if (r.ok) onCriada();`.
O passo `modo` com `modo !== 'assistente'` não mostra Voltar/Avançar.

## Verificação
```bash
npx tsc -b && npx vitest run src/app/design/design.test.ts
```
