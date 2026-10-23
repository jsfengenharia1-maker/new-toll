# Cartão V4-2 — estado das janelas de isovalores

Executor: Haiku. Depois do cartão 1; só `src/app/edificio/isovaloresStore.ts` (arquivo novo).

## Comportamento
- Store zustand em memória (não vai para o `.statikos`): lista de janelas com `id` (número que nunca se repete), `alvo` (pavimento ou radier), `grandeza`, `hipotese`, `nNiveis` (padrão 10), `niveisTexto` (vazio = automáticos), `min`, `max` (limites opcionais), `isolinhas` (padrão ligado) e `valores` (padrão desligado).
- `nova()` cria a janela copiando a configuração da última (comparar permanente e variável, ou pavimentos), `fechar(id)`, `mudar(id, patch)`. Começa com a janela 1.

## Rótulos
Nenhum (sem interface).

## Diff esperado
```diff
diff --git a/src/app/edificio/isovaloresStore.ts b/src/app/edificio/isovaloresStore.ts
new file mode 100644
index 0000000..7bd4474
--- /dev/null
+++ b/src/app/edificio/isovaloresStore.ts
@@ -0,0 +1,44 @@
+// Estado das janelas de isovalores (V4, C12.17): várias janelas lado a lado, mantidas até fechar o programa.
+// Não vai para o arquivo .statikos.
+import { create } from 'zustand';
+import type { GrandezaIso } from '../../core/resultados/isovalores';
+
+export interface JanelaIso {
+  /** Número da janela (nunca reutilizado; entra nos rótulos dos controles). */
+  id: number;
+  /** Pavimento (grandezas das lajes) ou radier (grandezas do radier). */
+  alvo: string;
+  grandeza: GrandezaIso;
+  /** Id da hipótese (caso ou combinação); vazio = a primeira. */
+  hipotese: string;
+  /** Número aproximado de níveis automáticos (escala 1-2-5). */
+  nNiveis: number;
+  /** Níveis definidos, separados por ponto e vírgula; vazio = automáticos. */
+  niveisTexto: string;
+  min?: number;
+  max?: number;
+  isolinhas: boolean;
+  valores: boolean;
+}
+
+interface IsoState {
+  janelas: JanelaIso[];
+  proximo: number;
+  nova: (base?: Partial<JanelaIso>) => void;
+  fechar: (id: number) => void;
+  mudar: (id: number, p: Partial<JanelaIso>) => void;
+}
+
+const padrao = (id: number): JanelaIso => ({ id, alvo: '', grandeza: 'uz', hipotese: '', nNiveis: 10, niveisTexto: '', isolinhas: true, valores: false });
+
+export const useIso = create<IsoState>((set) => ({
+  janelas: [padrao(1)],
+  proximo: 2,
+  nova: (base) => set((s) => {
+    // a nova janela copia a configuração da última (para comparar permanente e variável, ou pavimentos)
+    const ult = s.janelas.at(-1);
+    return { janelas: [...s.janelas, { ...(ult ?? padrao(0)), ...base, id: s.proximo }], proximo: s.proximo + 1 };
+  }),
+  fechar: (id) => set((s) => ({ janelas: s.janelas.filter((j) => j.id !== id) })),
+  mudar: (id, p) => set((s) => ({ janelas: s.janelas.map((j) => (j.id === id ? { ...j, ...p } : j)) })),
+}));
```
