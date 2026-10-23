# Cotas em série e cotas temporárias editáveis (estudo, 23/10/2026)

Pedido do usuário (22–23/10/2026): duas ferramentas de edição de planta com comportamento inspirado no Revit. Só o comportamento observável serve de referência; textos, ícones e nomes de comandos da Autodesk não são copiados (reconstrução limpa). Fatia proposta: **L6**, depois da L5.

## A. Como o Revit se comporta (fontes públicas)

As páginas `help.autodesk.com` não abriram no ambiente (DNS); o que segue vem de trechos devolvidos pela busca e de artigos de terceiros. Itens marcados (?) não foram confirmados em página oficial.

**Cota alinhada em série**
- Escolha de "Pick": referências individuais (clique a clique) ou parede inteira (um clique gera a cadeia, com opções de aberturas, paredes e eixos que a cruzam). Referências de parede: eixo, face, centro do núcleo, face do núcleo. Em referências individuais, Tab alterna os pontos de referência do elemento sob o cursor; o ponto candidato é destacado. Cada clique acrescenta uma referência à mesma cadeia; ao fim, um clique no vazio posiciona a linha da cota. Tipo da cota (parâmetro de tipo): contínua, linha de base, ordenada.
  - https://help.autodesk.com/cloudhelp/2023/ENU/Revit-DocumentPresent/files/GUID-E0FB313E-CE57-4741-9EF5-6747BBA3BDDB.htm
  - https://help.autodesk.com/cloudhelp/2026/ENU/Revit-DocumentPresent/files/GUID-E0FB313E-CE57-4741-9EF5-6747BBA3BDDB.htm
  - https://forums.autodesk.com/t5/revit-architecture-forum/aligned-dimensions/m-p/7190280
- Mover a linha de testemunho (witness line) da cota permanente: https://help.autodesk.com/cloudhelp/2014/ENU/Revit/files/GUID-035C0EF4-7474-47F6-AA36-672322FD10FB.htm

**Cotas temporárias**
- Ao selecionar um elemento, aparecem cotas azuis até a referência mais próxima encontrada (parede, eixo/grade, abertura), medidas por padrão ao eixo ou à face conforme configuração global (Gerenciar > Configurações adicionais > Cotas temporárias: parede eixo/face/núcleo; abertura centro/bordas).
  - https://help.autodesk.com/cloudhelp/2023/ENU/RevitLT-DocumentPresent/files/GUID-74FFB00B-FB29-44B7-8FEA-613DBE010AD4.htm
  - https://ukcommunity.arkance.world/hc/en-us/articles/21550599348242-Revit-Tip-How-to-control-Temporary-Dimensions-default-measurement-method
- Trocar a referência: arrastar o controle da linha de testemunho (ou menu "mover linha de testemunho") até outra face/eixo; clicar no controle alterna eixo, face interna, face externa. A troca vale por sessão e é lembrada para aquele objeto.
  - https://help.autodesk.com/cloudhelp/2023/ENU/Revit-DocumentPresent/files/GUID-DE82A2B9-0129-4D03-BC47-17A52BD4E168.htm
  - https://www.cad-notes.com/revit-temporary-dimension/
- Editar: clicar no valor, digitar, Enter; o **elemento selecionado** se move, a referência fica parada. Recomendação de tutoriais: selecionar o que se quer mover (e não o vizinho) antes de editar. Com vários elementos selecionados o comportamento não ficou documentado nas fontes (?); na prática o Revit mostra as cotas do conjunto e o deslocamento vale para todos (?).
  - https://novedge.com/blogs/design-news/revit-tip-master-revit-modeling-with-temporary-dimensions
- Fixar: o símbolo de cota perto da cota temporária a converte em cota permanente (editável em propriedades e tipo). https://help.autodesk.com/cloudhelp/2014/ENU/Revit/files/GUID-805557AB-CB88-4AD6-9753-4CEBD0FB2C78.htm
- Cadeado: travar uma cota mantém a distância quando o modelo muda (restrição paramétrica). Fontes divergem sobre o uso em projeto; o comportamento exato ao mover não foi confirmado (?). https://novedge.com/blogs/design-news/revit-tip-convert-temporary-dimensions-to-persistent-constraints-in-revit

**Essencial a copiar como comportamento:** (1) cota temporária só para o que está selecionado, até o vizinho mais próximo em cada direção; (2) o valor é editável e o selecionado é o que anda; (3) referência trocável por clique no pé da cota, com memória por elemento; (4) série aberta clique a clique com Tab e um último clique para posicionar; (5) fixar vira cota permanente; (6) travar = restrição.

## B. O que o Statikos já tem

| Peça | Onde | Uso |
|---|---|---|
| Índice espacial de segmentos e arcos (Flatbush), capturas por prioridade, Tab entre candidatos, entrada digitada `x;y`, `@dx;dy`, `@d<ang` | `src/core/geom/snap.ts` (`IndiceCaptura.consultar`, `pontoDigitado`), `Planta.tsx` (`it.current.caps/ciclo`, `confirmarDigitado`) | Escolha de pontos da série e digitação da medida |
| Ferramenta `medir` (tecla D, dois pontos, mostra distância/Δx/Δy na mensagem) | `Planta.tsx` ~l.1296, `plantaStore.ts` (`Ferramenta`, `PASSOS`) | Base da série: vira cota desenhada |
| Seleção por id (`pl.selecao`, `selecionados()`), `foco` | `Planta.tsx` l.1124, `plantaStore.ts` | Origem das cotas temporárias |
| Cotas automáticas em cadeia pelos centros de pilares e total | `src/core/sheets/prancha.ts` `eixosECotas`, `src/app/dims.ts` (pórtico, não planta) | Estilo, texto em cm e linha de chamada |
| Contornos e centros dos elementos | `types.ts`: `centroPilar`, `contornoPilar`, `geometriaViga`, `offsetsViga`, `contornoNoLance`; paredes e `AberturaParede` (`s`, `largura`); fundação `ElementoFundacao` | Faces, eixos e centros como referências |
| Comandos de mover (um passo de desfazer, `lote`) | `pilar.mover`, `viga.mover`, `parede.mover` (leva as vigas embutidas), `fundacao.mover`, `eixo.editar`, `viga.alinharFace`, `parede.abertura`, `editar.girar/espelhar` | Edição pela cota |
| Validação de sobreposição ao mover | `pilar.mover` (`pilaresSobrepostos`) | Recusar valor inválido |
| Design system, `download`, DXF | `src/app/ui`, `design.test.ts`, `src/app/dxf.ts` | Estilo e exportação |

Teclas já ocupadas em `Planta.tsx` (lista `ferr`): S P V L C E M D U B K N T Q W X I J O Y G H Z; livres só A (condicional), F (enquadrar) e R (contextual) não servem; A (alinhamento da viga, ajuste do pilar, sapata corrida), R (viga curva, girar pilar/fundação), F (enquadrar), Enter, Esc, Tab, Delete/Backspace, F3, F8, F10, espaço. Não há cota permanente de planta no modelo; a prancha de locação gera cotas só pelos pilares.

## C. Desenho proposto

### C1. Modelo de dados (cota permanente de planta)
Em `BuildingModel`: `cotas?: CotaPlanta[]` (opcional, versão do arquivo sobe com normalização para `[]`).
```
CotaPlanta { id; pavimento (ou grupo); estilo: 'serie'|'baseline'; 
  refs: RefCota[]            // ≥ 2, na ordem da série
  linha: { eixoDir: 'x'|'y'|'alinhada'; offset: number }   // posição da linha, em m, na normal
  travada?: boolean }
RefCota { elem: {tipo:'pilar'|'viga'|'parede'|'abertura'|'fundacao'|'eixo'; id; sub?: number};
          parte: 'faceA'|'faceB'|'eixo'|'centro'|'extremoI'|'extremoJ';
          fixo?: [x,y] }     // ponto livre (sem elemento) quando o clique foi em captura geométrica
```
- Referência **associativa**: a coordenada é derivada na hora por `resolverRef(b, ref) → ponto | null` (usa `centroPilar`, `contornoPilar`, `geometriaViga`, parede, abertura). Elemento removido: a referência vira `fixo` com o último valor e a cota recebe aviso (nunca some em silêncio).
- Direção da medida: projeção sobre a normal da cota; texto = distância projetada (cm, inteiro, como as cotas das pranchas); total opcional.
- Estilo só por tokens do design system (classes de camada em `global.css`; sem cor literal). Camada DXF `COTAS` e prancha: **sim**, nas formas/locação (as cotas do pavimento entram junto com as automáticas, com opção "cotas do usuário" ligada por padrão); armação e fundação em 2ª etapa.
- Comandos (um passo de desfazer cada, `mcp: false`): `cota.criar { pavimento, refs, linha }`, `cota.editar` (offset, refs), `cota.remover`, `cota.travar`, `cota.mover { id, indice, valor, lado }` (ver C3).

### C2. Algoritmo das cotas temporárias
Núcleo puro `src/core/geom/cotasTemp.ts`:
1. Entrada: elemento selecionado (retângulo orientado ou segmento) e lista de candidatos do pavimento (pilares, vigas, paredes, aberturas, eixos, fundações, linhas da máscara).
2. Para cada direção (±x local e ±y local, 4 direções; para elemento girado, eixos do próprio elemento), projetar a "sombra" do selecionado e buscar o vizinho mais próximo cuja projeção ortogonal intersecte a sombra (varredura em faixa).
3. Índice: `IndiceCaptura` já existente para máscara e eixos; para elementos do modelo, índice Flatbush de caixas (um por pavimento, reconstruído só quando o modelo muda, `useMemo` por `modelo.versao`). Busca em faixa = `idx.search(caixa da faixa)`, depois ordenar por distância; custo O(log n + k).
4. Referência padrão (opção global, editável, no memorial como "premissa de interface"): selecionado → **face**; vizinho pilar/viga/parede → **face**; eixo estrutural e abertura → **eixo/centro**; configuráveis por classe (eixo, face, centro) como a configuração do Revit, com perfil do sistema = face e NBR = igual (sem norma envolvida).
5. Limite: no máximo 4 cotas (uma por direção) mais 2 laterais do próprio elemento (largura e altura da seção) = 6; vários selecionados: só o conjunto (caixa envolvente) e 4 cotas. Teto de candidatos 200 por consulta; recálculo apenas ao mudar seleção/modelo (não por quadro); desenho no canvas de interação já existente (`desenharInteracao`).
6. Troca de referência: clicar no pé da cota (zona de 8 px) alterna eixo → face A → face B → centro do vizinho; memória por par elemento/vizinho em `plantaStore` (`refTemp`, só sessão, como o Revit; não vai ao arquivo).

### C3. Edição pela cota
- Clique no valor abre o campo numérico já existente (`digitando`, `confirmarDigitado`), com o valor atual em cm. Enter aplica.
- `delta = novo − atual`, na direção da cota. Move **sempre o selecionado**, a referência fica parada. Se a cota liga dois vizinhos (cota permanente ou ordenada) e nenhum está selecionado, move o **segundo** da cadeia (o mais distante da origem do clique) e avisa; com `travada`, recusa e diz qual cota trava.
- Execução: `exec('lote', …)` com os comandos existentes por tipo (`pilar.mover`, `viga.mover`, `parede.mover` com embutidas, `fundacao.mover`, `eixo.editar`, `parede.abertura` para `s` da abertura). Um passo de desfazer. Vários selecionados: o mesmo delta para todos.
- Rejeição pelo `validar` do comando (sobreposição, parede inválida) vira mensagem no rodapé; nada é aplicado.
- Efeito colateral explícito na mensagem: "vigas apoiadas acompanham" (o modelo recalcula geometria de vigas por pilar); cotas permanentes associadas se atualizam sozinhas por `resolverRef`.
- Fixar: marca pequena desenhada ao lado do valor da cota temporária (clique) gera `cota.criar` com as refs da temporária.

### C4. Interação
- Ferramenta **Cota em série**: não há letra livre (o `O` é prolongar). Entra por **`D` pressionado com Medir já ativa** (alterna Medir ↔ Cota, mensagem no rodapé) e pela paleta Ctrl+K. Cliques: ponto 1, ponto 2, … Tab alterna candidatos (reaproveita `s.ciclo`); Backspace tira o último ponto; Enter ou duplo clique encerra a série e pede a linha (um clique posiciona; `digitando` aceita deslocamento numérico); **Esc termina a série** (descarta a que está sem linha). Série em objeto único: clicar numa viga/parede com Tab = "elemento inteiro" (extremos).
- Cotas temporárias: ativas na ferramenta Selecionar, sem tecla. Alternância "Mostrar cotas temporárias" fica na paleta Ctrl+K e em Opções, não em botão acima do canvas. Troca de referência por clique no pé; Tab com o cursor sobre uma cota temporária alterna a referência.
- Mensagens e passos via `PASSOS` e `msg()` já usados. Sem botões novos na barra superior.

### C5. Testes
Núcleo (vitest, valores): `resolverRef` para pilar retangular e girado (face, eixo, centro), viga com `offsetsViga`, abertura (s e largura); vizinhos mais próximos num pórtico 3×2 de 5 m com pilares 30×30 (cota face a face 4,70 m; eixo a eixo 5,00 m); limite de 6 cotas; recusa por sobreposição; `cota.mover` move o selecionado e um undo restaura; cota permanente acompanha o movimento do pilar; elemento removido vira `fixo`; `commands.test.ts` (aplicar + inverso); contagem de checklists; `design.test.ts`. e2e `L6`: selecionar pilar, ver 4 cotas, clicar valor, digitar 450, conferir posição e Ctrl+Z; série de 4 pontos com Tab e Esc; fixar e mover o pilar; prancha de locação com a cota do usuário.

### C6. Fatia, classes, estimativa
- **Não cabe na L5** (em execução): a L5 mexe em `Planta.tsx` (atalhos de viga, painel flutuante, aberturas) e em `types.ts`/registro de comandos, pontos quentes; a L6 muda o mesmo arquivo e o modelo. Entra como **L6, depois da L5**, na lane 2 (L1 → L5 → L6), sem depender do E3.
- Sem item de checklist próprio hoje: acrescentar linhas em `checklist-manual-cypecad.md` (cotas) como "Falta" com frente L6 e atualizar resumos (o teste de checklists exige).
- Cartões: núcleo S2 (modelo e `cota.*`, `cotasTemp.ts`, `cota.mover` sobre comandos existentes, normalização de arquivo, testes) em 3 cartões; interface S2 (ferramenta Cota, desenho temporário, pé da cota, digitação, fixar, estilo/design system) em 3 cartões, mais 1 cartão Haiku para pranchas/DXF e memorial; auditoria por agente independente.
- Estimativa: núcleo ~1 dia de execução, interface ~1,5 dia, e2e e auditoria ~0,5 dia; ~3 dias de agente no total, aproximadamente 25 a 30 testes novos e 1 fluxo e2e.
- Premissas "a confirmar" para o usuário: referência padrão (face vs eixo) por classe; regra de qual lado se move na cota permanente entre dois vizinhos; se o cadeado recusa ou propaga; cotas do usuário nas pranchas ligadas por padrão.
