# E4b — cartão 1: ferramenta Escada, menu flutuante e estado da planta (C8.5, C8.38, C1.33)

Classe: Haiku. Depende da E4a (cartão 2: `useEscadaUI`, ícone `escada`) e da D6. Leia antes `00-leia-primeiro.md`.

## Arquivos (4)
1. `src/app/edificio/plantaStore.ts`
   - `Ferramenta` ganha `'escada'`.
   - Estado novo (não vai para o arquivo), no mesmo bloco das outras ferramentas de lançamento:
     `escadaFn: 'criar' | 'editar' | 'apagar' | 'mover' | 'girar'` (padrão `'criar'`);
     `escadaPadrao: { dados: DadosComunsEscada; lances: { tipo: string }[]; nome?: string } | null` (C8.38: dados da última escada lançada; vale enquanto a obra não muda e o programa não fecha: zerar ao trocar de obra, ao abrir arquivo e ao `novaObra`, onde as outras ferramentas já zeram seu estado; manter ao desfazer);
     `escadaRepetir: boolean` (padrão `true`: inserção repetida de escadas iguais, C8.35);
     `escadaCopiar: string | null` (id da escada de que a nova copia dados e lances, C8.39).
   - Em `aoEscolher`, `'escada'` não troca de pavimento nem de nível, mas se a planta está no nível de fundação a ferramenta não deve ser escolhida (mensagem "Escadas só se lançam nos pavimentos."), como a ferramenta Pilar faz.
2. `src/app/edificio/EscadaMenu.tsx` (novo): menu flutuante (C8.5) mostrado pela `Planta` quando `ferramenta === 'escada'`, no padrão de `ControlesPlanta.tsx`. `Seg` com os rótulos "Criar", "Editar", "Apagar", "Mover", "Girar" ligado a `escadaFn`; ao lado, "Ver detalhe de armadura" e "Ver esforços e deslocamentos" como `Button variant="mini"` com `disabled` e `title` "Disponível na frente E4d" / "Disponível na frente E4c". Em "Criar": `Check` "Inserção repetida" (`escadaRepetir`) e `Select` "Copiar dados de" com "(nenhuma)" e as escadas do grupo atual (`escadaCopiar`, C8.39), mais o botão "Dados da nova escada…" que abre `useEscadaUI.getState().abrir()` (a janela do cartão 2 da E4a; o cartão 2 desta fatia a estende). Mostra, em `Hint`, o grupo atual: "Grupo atual: <nome do grupo>" (C8.7).
3. `src/app/edificio/FaixaEdificio.tsx`: na aba Lançamento, `RibbonGroup label="Elementos"`, um `RibbonButton icon="escada" label="Escada" onClick` que faz `plantaStore.set({ ferramenta: 'escada', ...aoEscolher('escada') })` (o botão "Escadas…" da E4a, que abre a janela, continua). Atalho Shift+E mostrado no `title`.
4. `src/app/edificio/Planta.tsx` (só o essencial deste cartão): montar `<EscadaMenu />` junto dos controles da planta quando a ferramenta é Escada, e tratar `Shift+E` antes da linha `ferr[k.toLowerCase()]` (`if (k === 'E' && e.shiftKey) { P.set({ ferramenta: 'escada', ...aoEscolher('escada') }); return; }`). Nenhum clique na planta ainda (cartões 2 e 3).

## Guia de etapas (C1.33)
`src/app/edificio/EtapasObra.tsx` (e `GuiaRapido.tsx`, se listar as etapas por id): o passo "escadas" já vem do núcleo com estado "feito/pendente". Garantir que clicar na etapa "Escadas" escolhe a ferramenta Escada (como as etapas Pilares e Vigas escolhem as suas). Em `EtapasObra.test`/testes de etapas existentes, nada muda além de a etapa não ser mais "indisponível".

## Teste
`npx tsc -b`; `npx vitest related src/app/design/design.test.ts src/core/building/etapas.test.ts --run --reporter=dot`. e2e no cartão 6.
