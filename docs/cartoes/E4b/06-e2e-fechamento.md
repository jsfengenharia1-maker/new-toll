# E4b — cartão 6: fluxos e2e `E4b` e fechamento dos checklists

Classe: Haiku. Depende dos cartões 1 a 5. Os fluxos entram no arquivo de fluxos da frente E4 (`e2e/flows/E4.mjs` ou equivalente; hoje `e2e/flows.mjs` pode ainda conter o `E4a`: acrescentar ao lado dele, mesmo estilo e mesmos auxiliares `faixaAba`, `fileMenu`, `newPage`).

## Fluxos (filtro `E4b`)
Pré-condição de todos: obra de exemplo carregada (como o fluxo `E4a`), planta num pavimento do grupo dos pavimentos-tipo, uma escada com tipo "Reto, 18 degraus" e espelho de 1/6 m (0,1667) e piso 0,2967.
1. `E4b-inserir`: faixa Lançamento → botão "Escada" (ou Shift+E); mensagem de grupo atual visível ("Grupo atual:"); clicar na planta (1º ponto), mover e clicar (2º ponto, ortogonal ligado com F8); a camada mostra a escada "E1" (`getByText('E1', { exact: true })` no SVG); com "Inserção repetida" ligada, lançar uma segunda: aparece "E2"; Esc encerra (ferramenta volta a Selecionar); Ctrl+Z remove E2 e deixa E1. Erro geométrico: trocar o espelho para 0,20 em "Dados da nova escada…", lançar: `data-escada-erro="ESCADA_ALTURA"` visível e nenhuma escada nova.
2. `E4b-editar`: ferramenta Escada → Editar → clicar em E1 abre a janela com "Largura da escada"; alterar e conferir; Mover (dois cliques, dx conhecido) e conferir "Origem x" na janela; Girar digitando 90 e conferir "Sentido de subida" = 90 (soma com o anterior); "Duplicar lance 1" na aba Lances → duas linhas; Apagar por clique: E1 some; Ctrl+Z traz de volta.
3. `E4b-copiar`: "Copiar dados de" E1, trocar "Giro ao subir" para direita, lançar: a nova escada tem giro à direita e os mesmos lances (aba Lances com a mesma contagem).
4. `E4b-biblioteca`: aba Tipos de lance: o tipo usado mostra "Em uso por 1 lance(s)" e os campos desabilitados; "Desbloquear" habilita; editar os degraus e salvar; "Copiar com nova referência" cria "<nome> (cópia)"; "Exportar da obra (.json)" baixa `tipos-de-lance.json`; em obra nova, "Importar (.json)" com esse arquivo traz o tipo (mensagem "1 tipo(s) de lance importado(s)"); importar de novo diz "0 ... já existia(m)".
5. `E4b-guia`: o guia de etapas mostra "Escadas" pendente em obra sem escada e "feito" depois do lançamento.
6. `E4b-formas`: a prancha de formas do pavimento contém o texto "E1" e a de locação também; o memorial traz "Escadas por grupo".

## Fechamento dos checklists (depois de e2e e testes verdes)
`npm run checklist -- set <id> --situacao Feito --nota "..."` para: C8.5 (menu; os dois itens de resultados ficam desabilitados e a nota remete às E4c/E4d — se o usuário não aceitar menu parcial, deixar Parcial com frente E4c), C8.6, C8.7, C8.33, C8.34, C8.35, C8.36, C8.38, C8.39, C8.40, C8.41, C8.42, C8.43, C8.44, C8.45, C8.46, C8.47, C8.48, C8.17, C1.33; cada nota cita o arquivo e a função. Depois `npm run checklists`, `npm run mapa`, e o Andamento de `docs/plano-execucao.md` e a linha de `docs/historico-fatias.md` (`npm run checklist -- historico "..."`) dizem que a E4b está concluída.
