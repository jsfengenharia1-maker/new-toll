# E4b — cartão 5: memorial por grupo, escadas nas formas e na locação, Navegador/Propriedades

Classe: Haiku. Depende dos cartões 1 a 3.

## Itens
1. **Memorial** (`MemorialEscadas.tsx` do cartão 3 da E4a): antes das linhas por escada, a tabela "Escadas por grupo" com `escadasPorGrupo(b)`: colunas Grupo, Escada, Origem (x ; y), Sentido (°), Lances, Degraus. Mesmo estilo de tabela do arquivo (classes de `memorial.css`).
2. **Formas e locação** (C8 "Pranchas: escadas e setas de subida nas formas e na locação (contorno e sentido)"): nas pranchas de formas de cada pavimento e na de locação (`Pranchas.tsx` / `desenhoMemorial.ts`, onde as lajes e vigas são desenhadas) acrescentar, depois das lajes, `desenhoPlantaEscada(...)` das escadas do grupo do pavimento: contorno (`<path>` com classe de traço médio já existente nas pranchas), degraus em traço fino, setas de subida e o nome da escada. Camada DXF `ESCADAS` em `dxf.ts` (ou o gerador do DXF da planta do edifício): `contornos` como LWPOLYLINE fechadas, `degraus` e `setas` como LINE, `rotulo` como TEXT. Teste unitário no teste do gerador existente: obra com uma escada tem a camada `ESCADAS` com ≥ 1 polilinha.
3. **Navegador** (D4): no nó "Escadas" (E4a, cartão 4), clique com o botão direito/menu do nó: "Editar", "Duplicar" (`escada.copiarDe { de: id, dx: 0, dy: 0 }` + selecionar a nova) e "Apagar" (`escada.remover`). O filho mostra "<nome> — <n> lance(s)".
4. **Propriedades** (D5): acrescentar o grupo "Posição" (origem x, origem y, sentido de subida; chamam `escada.editar`) ao cartão da escada do cartão 4 da E4a e o botão "Girar 90°" (`escada.girar { ids: [id], angulo: 90 }`).

## Teste
`npx tsc -b`; testes citados; `design.test.ts`; `npm run mapa`.
