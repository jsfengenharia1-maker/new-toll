# Auditoria independente da frente L (produtividade de lançamento, L1 a L6)

Data: 24/10/2026. Base: `worktree-agent-a26c2d73fd0a9b470` (L3 completa, d17738e). Auditor: agente que não executou a frente. Só leitura; nada foi corrigido.

## Números
- Build ok. e2e um a um, por nome exato, `--no-build`: L1, L2, L3, L4, L5 e L6 rodaram (1 fluxo cada) e passaram, 0 falhas. Nenhum processo (vite preview, Chromium) ficou aberto.
- vitest dos arquivos de contrato (design.test, checklists.test, mapa.test, src/core/ifc, lancamentoDxf.test): 6 arquivos, 62 testes, 0 falhas. O vitest completo fica com o orquestrador.
- Checklists: 74 linhas com frente L ou nota [L1]–[L6]; 65 Feito, 5 Parcial com frente L (K1.9.103, C6.3, C6.6, C7.2, C7.5), 1 Falta com frente E (C1.29). Tabela de `plano-frentes.md` (L: 4 + 1 = 5) confere com as linhas.
- 82 símbolos citados nas notas (`laje.detectarPanos`, `vigasDoClique`, `avaliarNumeracao` etc.): todos existem em `src/`.

## Bloqueantes
Nenhum.

## Corrigir
1. **Parcial com frente L e sem dono real** (`docs/checklist-manual-cypecad.md` C6.3, C6.6, C7.2, C7.5; `docs/checklist-manual-calculo-cypecad.md` K1.9.103). A L está concluída (L1 a L6) e o resíduo continua marcado "L". Itens e o que falta: C7.2 (criar o pano a definir automaticamente ao fechar o contorno; hoje só pelo botão), C7.5 (insercão não muda numeração das vigotas nem origem da malha, depende da E3b), K1.9.103 ("apagar o pano = abertura (cruz tracejada)" e a grelha ainda ignora furos), C6.3 (painel flutuante: decisão de manter o grupo na barra lateral), C6.6 (Ctrl+T/Ctrl+B deliberadamente não copiados). Proposta: C7.5 e a grelha de K1.9.103 passam para E (E3b); C6.3 e C6.6 viram decisão registrada (funcionalidade equivalente, atalho proprietário não copiado, regra do módulo) e Feito com nota, ou ficam Parcial com frente V/E; C7.2 automático e a cruz tracejada ganham fatia nomeada. Hoje `checklists.test.ts` só exige frente, não que a frente esteja aberta.
2. **Nota contraditória em C2.21** (Feito, mas a nota ainda diz "tecla própria a conferir"). F3 existe (`Planta.tsx:2037`, `capturasAntes`) e o e2e L2 cobre. Remover o texto antigo da nota.
3. **CLAUDE.md desatualizado sobre o vendor DWG** (linha "DWG: nasjidwg..."): diz que o vendor só tem o escritor e que os leitores só entram nos testes, mas a L2 gerou `public/vendor/nasjidwg-leitor-0.18.0.mjs` (607 KB, `scripts/vendor-nasjidwg.mjs`) para ler DWG no app. Atualizar a regra (e registrar o tamanho). Licença MIT coberta pelos mesmos `nasjidwg-LICENSE.txt` e `nasjidwg-NOTICE.txt`.
4. **C1.29 Falta/E**: o passo "Muros e paredes" do assistente existe desligado (`MUROS_DISPONIVEIS = false`, `src/core/building/etapas.ts:9`). Dono correto (E1c, spec-frente-E1), mas `plano-frentes.md` não cita "E1c" por nome; a rastreabilidade depende da nota. Acrescentar a referência.

## Sugestões
1. **IFC só validado com arquivo sintético** (`src/core/ifc/fixtures/edificio.ifc`, 19 KB). Já está em `pendencias-usuario.md` (linha 85, gabarito de IFC real dos programas de referência); manter e, quando chegar, acrescentar um teste de regressão com ele. O leitor cobre IFC2x3 e IFC4, mas só um arquivo é exercitado.
2. **Acessibilidade**: as tabelas do fluxo IFC (`LancamentoIfc.tsx:72,92,120,150`) e `GruposL4.tsx:26`, `Gabaritos.tsx:43` não têm legenda (`<caption>`) nem `aria-label`; `LancamentoL5.tsx`, `GuiaRapido.tsx`, `DadosL4.tsx` e `MemorialIfc.tsx` não têm nenhum atributo aria (dependem dos componentes de `src/app/ui`). Sem `input`/`select`/`button` crus nesses arquivos, então rótulos vêm da biblioteca. Sugestão: caption nas tabelas de revisão.
3. Fatia L6 não tem linha própria nos checklists (por desenho: "sem item próprio"); a rastreabilidade está em `historico-fatias.md` e na premissa `cotas-planta`. Sem ação, só registro.

## Verificações sem achado
- (1) Feitos implementados e cobertos: amostra de C1.15, C3.30, C4.30, C6.63, C7.82, K1.4.69, K1.9.54, C2.21: código, comando e e2e da frente existem.
- (3) Premissas visíveis: `src/core/building/premissas.ts` traz `assistente` (L1), `lancamento-dxf` (L2), `lancamento-ifc` (L3), `unidade-dxf`, `cotas-planta` (L6), com `aConfirmar` onde cabe; `MemorialIfc.tsx` + `src/core/ifc/memorial.ts` escrevem origem, unidade, materiais, relatório, classes ignoradas e ambiguidades no memorial.
- (4) Design system: `design.test.ts` verde; nos arquivos da L não há cor literal nem `style={{` (grep).
- (6) Repositório público: único fixture versionado é `edificio.ifc`. Cabeçalho: FILE_DESCRIPTION 'ViewDefinition [CoordinationView]', FILE_NAME 'edificio-ficticio.ifc' com autor/organização vazios e aplicativo 'Statikos teste'; IfcProject 'Edificio Ficticio', IfcSite 'Terreno', IfcBuilding 'Bloco A'; sem IfcOrganization, IfcPerson nem endereço postal. Nenhum .dxf/.dwg versionado (gerados em código nos testes).
- (7) Licenças: `web-ifc-LICENSE.txt` (MPL-2.0 completo) e `web-ifc-NOTICE.txt` (origem, versão fixa 0.0.78, arquivos sem modificação, carga sob demanda); `nasjidwg-LICENSE.txt` (MIT) e `nasjidwg-NOTICE.txt`; `three-LICENSE.txt`.
- (8) Regressões: nenhuma encontrada nos testes e fluxos rodados.
