# Cartão E3f-02 — planta: cores, seta, texto, vigas incoerentes, definição gráfica

Aplicar depois da D6 e do cartão 01. Compila sozinho. Edita a camada de lajes e vigas da planta (`Planta.tsx` ou o componente de desenho que a D5 separou; grep `docs/mapa-codigo.md` por `Planta`) e cria a ferramenta `plano` (como as ferramentas da L5, sem tecla nova; entra pela faixa "Planos" → `Definir na planta`).

## Núcleo
- `planoPor(b, id)`, `setaDeclividade(b, laje)` → `{ origem, direcao, percentual, graus } | null`, `textoInclinacao(b, laje)` (ex.: `+0,60 i = 40,0 %`), `vigasIncoerentes(b, grupo)` → `{ viga, laje, desvio, sugerido }[]`, `secaoNoPlano(b, viga)`, `faceSuperiorDaViga(b, viga)` (duas linhas da face superior), `capturaPlano(b, grupo, p, tol)` → `{ ponto, tipo: 'eixo' | 'face', viga } | null`, `pontosDeControle(plano)`.
- Comandos: `plano.corrigirVigas { vigas }`, `plano.editar { id, pontos }` (arrastar), `plano.criar` (ao fechar a definição gráfica).
- Diagnósticos em `verificar(b)`: PLANO_VIGA (erro, com `sugestao` = `plano.corrigirVigas`), PLANO_NERVURAS, PLANO_MURO, DESNIVEL_VIGA (avisos).

## O que desenhar
1. Pano com plano: preenchimento com a classe `laje-plano-<cor>` (definir em `global.css` sobre `--plano-<cor>`, opacidade baixa).
2. Seta da máxima declividade (sentido descendente) a partir de `origem`, comprimento 30 % do lado do pano, com o texto `textoInclinacao` junto ao texto de desnível (C7.195).
3. Vigas de `vigasIncoerentes` em vermelho (classe de erro existente da R1); clique com a viga incoerente selecionada mostra o botão do painel `Copiar inclinação do pano` → `plano.corrigirVigas { vigas: [id] }`.
4. Vigas planas com `secaoNoPlano(...).gira`: face superior pelas linhas de `faceSuperiorDaViga` em traço contínuo (C7.73).
5. Ferramenta `plano`: três cliques (três pontos; pede o desnível de cada num NumField `Desnível do ponto`), ou dois cliques + inclinação, conforme a definição escolhida no painel; o cursor usa a classe `cursor-captura` quando `capturaPlano` acha eixo ou face. Plano selecionado: alças nos `pontosDeControle`; arrastar chama `plano.editar { id, pontos }`; duplo clique no texto da cota abre NumField para reescrever o desnível.

## Testes
- `vigasIncoerentes` no exemplo `criarExemplo('telhado')` retorna `[]` (já coerente); depois de `plano.editar { id: sul, inclinacao: 40 }` retorna caibros da água sul.
- Texto do pano: no telhado de teste (`planos.test.ts`, função `telhado`) `textoInclinacao` = `+0,60 i = 40,0 %`.

## e2e (fluxo `E3f`)
Abrir o exemplo `Exemplo: cobertura em duas águas`; mudar a inclinação da água sul para 40 no painel; a lista de erros mostra `PLANO_VIGA`; selecionar o caibro e `Copiar inclinação do pano`; a lista de erros não tem mais `PLANO_VIGA`.
