# E4b — cartão 4: biblioteca de tipos de lance, bloqueio e importação/exportação (C8.17, C8.40, C8.42–C8.44)

Classe: Haiku (padrão de `TiposLaje.tsx` + `storage.ts` `tiposLaje`, que já importam e exportam `.json` e guardam na biblioteca do usuário). Depende da E4a (cartão 1: `TiposLanceUI.tsx`).

## Arquivos (3)
1. `src/app/edificio/TiposLanceUI.tsx` (aba "Tipos de lance" da janela das escadas):
   - Lista com duas seções, "Da obra" e "Predefinidos" (C8.40); cada tipo da obra mostra o selo "Em uso por N lance(s)" (`tiposLanceEmUso`) e, se `tipoLanceBloqueado(b, id)`, o cadeado e os campos desabilitados com `Hint` "Bloqueado: o tipo é usado em outro lance. Desbloqueie para editar ou copie com nova referência." (C8.43).
   - Botões por tipo: "Desbloquear"/"Bloquear" (`tipoLance.desbloquear { id, desbloquear }`), "Copiar com nova referência" (pede o nome em `TextField`, chama `tipoLance.copiar { de, nome }`, C8.42) e "Remover" (já existe; mantém a mensagem de tipo em uso).
   - A edição de um tipo bloqueado devolve `TIPO_LANCE_BLOQUEADO`: mostrar a mensagem do comando em `Note tone="bad"` (não ocultar o erro).
   - Botões da biblioteca: "Exportar da obra (.json)" (`exportarTiposLance(b)` → `download('tipos-de-lance.json', JSON.stringify(bib, null, 2))`, de `src/app/ui`), "Importar (.json)" (input de arquivo do design system; `lerBibliotecaTiposLance(texto, opcoesEmUso(b.opcoes, perfilDe(b)))`; mostrar os `erros` linha a linha e, se houver `tipos`, `exec('tipoLance.importar', { tipos })`, cujo resultado diz quantos entraram e quantos já existiam) e "Guardar na biblioteca do usuário"/"Trazer da biblioteca do usuário" (item 2).
2. `src/app/storage.ts`: `LibraryKind` ganha `'tiposLance'`; `LibraryPayload` ganha `BibliotecaTiposLance` (de `core/building/escadasEdicao`). Guardar com `saveToLibrary('tiposLance', nome, resumo, bib)`; o resumo é "N tipo(s) de lance". Listar e abrir como `tiposLaje` já faz (mesmo código de nuvem/localStorage, limite de 240 KB). Trazer = ler o payload e chamar `tipoLance.importar`.
3. `src/app/Library.tsx`: o rótulo do novo `kind` na lista da biblioteca ("Tipos de lance de escada"), no mesmo `Record` dos outros tipos; abrir a entrada na biblioteca importa para a obra aberta (sem trocar o modelo).

## Teste
`npx tsc -b`; teste unitário do payload em `src/app/storage.test.ts` (se existir; senão o caso entra no e2e): gravar e reabrir `tiposLance` devolve o mesmo JSON. `design.test.ts`. e2e no cartão 6 (`E4b-biblioteca`).
