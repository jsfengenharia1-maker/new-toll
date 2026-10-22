# Cartão L1-12 — Ações da loja do edifício (nova obra, exemplo, arranques, versões)

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões 04, 07, 08, 09 e 10.

## Objetivo
A interface chama ações da `useBuilding` (zustand) em vez de mexer na `Sessao`. Itens: C1.15, C1.16, C1.24, C1.40, C1.41, C1.44, C1.48.

## Arquivos
1. `src/app/edificio/store.ts` (editar)
Leia antes: `store.ts` inteiro (ações `novo`, `carregar`, `exec`, função `edificioParaArquivo`, constante `semCalculo`, função interna `atualizar`).

## Alterações em `store.ts`
1. Imports novos: `import { registrarRecente, type OrigemRecente } from './recentes';` `import { criarExemplo, type IdExemplo } from '../../core/building/exemplos';` `import type { EspecificacaoObra } from '../../core/building/assistente';` `import type { ResultadoArranques } from '../../core/building/importarArranques';` e de `'../../core/building/file'` acrescente `arquivoComExtras, recuperarVersao, type VersaoObra` ao import que já existe.
2. Função auxiliar no nível do módulo (acima de `useBuilding`):
```ts
/** Registra a abertura da obra na lista de recentes (só metadados). */
function lembrar(s: Sessao, origem: OrigemRecente) {
  const o = s.modelo.obra;
  registrarRecente({ nome: o.nome, descricao: (o.descricao ?? []).join(' · '), origem, pavimentos: s.modelo.pavimentos.length });
}
export interface OpcoesArquivo { versoes: number; resultados: boolean }
```
3. Em `interface BState` acrescente:
```ts
  /** Cria a obra pelo assistente numa sessão nova (um passo no histórico). */
  novaObra(espec: EspecificacaoObra): Resultado;
  /** Abre uma obra de exemplo (fictícia). */
  novaObraExemplo(id: IdExemplo): void;
  /** Cria a obra só de arranques a partir da importação de texto. */
  novaObraArranques(nome: string, resultado: ResultadoArranques): Resultado;
  /** O que o próximo "Salvar" inclui no arquivo: nº de versões anteriores (0 a 20) e resultados do último cálculo. */
  opcoesArquivo: OpcoesArquivo;
  setOpcoesArquivo(o: Partial<OpcoesArquivo>): void;
  /** Versões anteriores do arquivo aberto e avisos do último salvamento. */
  versoesArquivo: VersaoObra[];
  avisosArquivo: string[];
  /** Recupera uma versão do arquivo aberto (vira a obra atual; o log é cortado ali). */
  recuperarVersao(indice: number): void;
```
4. No objeto devolvido por `create`, acrescente (perto de `novo`/`carregar`):
```ts
    novaObra(espec) {
      const s = new Sessao(edificioVazio());
      const r = s.executar('obra.assistente', { espec }, 'usuario');
      if (!r.ok) { msg(r.erros.map((e) => e.mensagem).join(' ')); return r; }
      atualizar(s); set({ ...semCalculo, versoesArquivo: [] }); lembrar(s, espec.origem ?? 'assistente');
      msg(`${r.mensagem ?? 'Obra criada.'} Confira normas e materiais nos dados gerais.`);
      return r;
    },
    novaObraExemplo(id) { const s = criarExemplo(id); atualizar(s); set({ ...semCalculo, versoesArquivo: [] }); lembrar(s, 'exemplo'); msg(`Exemplo “${s.modelo.obra.nome}” aberto.`); },
    novaObraArranques(nome, resultado) {
      const s = new Sessao(edificioVazio());
      const r = s.executar('obra.importarArranques', { nome, resultado }, 'usuario');
      if (!r.ok) { msg(r.erros.map((e) => e.mensagem).join(' ')); return r; }
      atualizar(s); set({ ...semCalculo, versoesArquivo: [] }); lembrar(s, 'texto'); msg(r.mensagem ?? 'Obra criada.');
      return r;
    },
    opcoesArquivo: { versoes: 0, resultados: false },
    setOpcoesArquivo(o) { set({ opcoesArquivo: { ...get().opcoesArquivo, ...o } }); },
    versoesArquivo: [],
    avisosArquivo: [],
    recuperarVersao(indice) {
      const st = get(), r = recuperarVersao({ building: st.sessao.modelo, buildingLog: st.sessao.log, versoes: st.versoesArquivo }, indice);
      if (!r) { msg('Versão não encontrada.'); return; }
      atualizar(new Sessao(r.building, r.buildingLog)); set({ ...semCalculo }); msg(`Versão anterior recuperada (antes do comando ${indice + 1}).`);
    },
```
5. Em `novo(vazio)`: depois de `atualizar(s); set(semCalculo);` acrescente `set({ versoesArquivo: [] }); lembrar(s, vazio ? 'vazio' : 'padrao');`.
6. Em `carregar(f)`: o corpo vira
`const s = f ? new Sessao(f.building, f.buildingLog) : new Sessao(edificioVazio()); atualizar(s, false); set({ ...semCalculo, versoesArquivo: f?.versoes ?? [] }); if (f) lembrar(s, 'arquivo');`
7. Troque `edificioParaArquivo()` por:
```ts
export function edificioParaArquivo(): BuildingFile | null {
  const st = useBuilding.getState(), s = st.sessao;
  if (!(s.modelo.pavimentos.length || s.log.length)) return null;
  const dim = st.dim && calculoAtual(st) ? st.dim : null;
  const { arquivo, avisos } = arquivoComExtras(s.modelo, s.log, st.opcoesArquivo, dim, s.revCalculo);
  useBuilding.setState({ avisosArquivo: avisos });
  return arquivo;
}
```
(A versão antiga chamava `compactarLog`; `arquivoComExtras` já a aplica. Se `compactarLog` ficar sem uso em `store.ts`, remova do import, mas ele continua usado em `persistirJa`.)

## Verificação
Esta camada não tem teste unitário próprio (a loja depende do navegador); a lógica pura foi testada nos cartões 03 a 10 e o fluxo completo é o e2e `L1` do cartão 23.
```bash
npx tsc -b && npx vitest run src/app/workspace.test.ts src/core/building/file.versoes.test.ts
```
