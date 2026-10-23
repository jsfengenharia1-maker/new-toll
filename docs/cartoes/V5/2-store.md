# Cartão V5-2 — estado das janelas de esforços

Executor: Haiku. Depois do cartão 1. Só `src/app/edificio/esforcosStore.ts` (arquivo novo).

## Comportamento
- Store zustand em memória (não vai para o `.statikos`): lista de janelas com `id` (nunca reutilizado), `tipo` (viga, pilar, diagonal, vigotas), `elemento`, `hipotese`, `grandeza` (componente local: Mz, Vy, T, N, My, Vz), `pavimento`, `esforcos` (chave geral de exibição de esforços das vigotas, C7.92) e `vista` (momentos, cortantes, armaduraInferior).
- `nova()` copia a configuração da última, `fechar(id)`, `mudar(id, patch)`. Começa com a janela 1.

## Rótulos
Nenhum (sem interface).

## Regras desta frente (valem para este cartão)
- Só `src/app/ui` para controles (`Button`, `Check`, `Select`, `NumField`, `TextField`, `Group`, `Hint`); `<button>`, `<select>`, `<input>` crus reprovam em `design.test.ts` (o `<input type="file" hidden>` do cartão 4 é o padrão já usado em `Pranchas.tsx`).
- Nenhuma cor literal em TS/TSX, nenhum CSS fora de `src/app/design`, toda classe usada existe em `global.css`. Estilo inline só para valores calculados.
- Rótulos únicos: cada controle da aba leva o número da janela no nome, por exemplo `Hipótese (janela 1)`. Nos testes e2e, `getByLabel`/`getByRole` com `{ exact: true }`, **exceto** `NumField`, `OptNumField`, `TextField`, `Select` e `Slider`: nesses, regex ancorada no início, por exemplo `getByLabel(/^Hipótese \(janela 1\)/)`.
- Não altere `src/core/`: o núcleo da V5 está pronto e testado.
- O bloco `diff` é o resultado esperado, gerado e validado (tsc, `design.test.ts` e o fluxo e2e `V5`). Salve o bloco num arquivo `.patch` e aplique com `git apply`; se uma âncora não casar, procure o trecho equivalente e não invente código além do diff.

## Diff esperado
```diff
diff --git a/src/app/edificio/esforcosStore.ts b/src/app/edificio/esforcosStore.ts
new file mode 100644
index 0000000..70b78d5
--- /dev/null
+++ b/src/app/edificio/esforcosStore.ts
@@ -0,0 +1,44 @@
+// Estado das janelas de esforços por hipótese (V5, C12.14): várias janelas lado a lado, mantidas até fechar o programa.
+// Não vai para o arquivo .statikos.
+import { create } from 'zustand';
+import type { Componente } from '../../core/resultados/esforcosCaso';
+import type { VistaVigota } from '../../core/resultados/vigotasVista';
+
+export type TipoElementoEsforco = 'viga' | 'pilar' | 'diagonal' | 'vigotas';
+
+export interface JanelaEsforco {
+  /** Número da janela (nunca reutilizado; entra nos rótulos dos controles). */
+  id: number;
+  tipo: TipoElementoEsforco;
+  /** Id do elemento (viga, pilar, diagonal ou laje de vigotas); vazio = o primeiro. */
+  elemento: string;
+  /** Id da hipótese (envoltória, combinação ou caso); vazio = a primeira. */
+  hipotese: string;
+  grandeza: Componente;
+  /** Pavimento da viga (vazio = o primeiro). */
+  pavimento: string;
+  /** Vigotas: chave geral de exibição de esforços e vista. */
+  esforcos: boolean;
+  vista: VistaVigota;
+}
+
+interface EsfState {
+  janelas: JanelaEsforco[];
+  proximo: number;
+  nova: (base?: Partial<JanelaEsforco>) => void;
+  fechar: (id: number) => void;
+  mudar: (id: number, p: Partial<JanelaEsforco>) => void;
+}
+
+const padrao = (id: number): JanelaEsforco => ({ id, tipo: 'viga', elemento: '', hipotese: '', grandeza: 'Mz', pavimento: '', esforcos: true, vista: 'momentos' });
+
+export const useEsforcos = create<EsfState>((set) => ({
+  janelas: [padrao(1)],
+  proximo: 2,
+  nova: (base) => set((s) => {
+    const ult = s.janelas.at(-1);
+    return { janelas: [...s.janelas, { ...(ult ?? padrao(0)), ...base, id: s.proximo }], proximo: s.proximo + 1 };
+  }),
+  fechar: (id) => set((s) => ({ janelas: s.janelas.filter((j) => j.id !== id) })),
+  mudar: (id, p) => set((s) => ({ janelas: s.janelas.map((j) => (j.id === id ? { ...j, ...p } : j)) })),
+}));
```
