# D3 — cartão 07: grupos de premissas vão para a Configuração da obra

Classe: Sonnet baixo (os componentes de grupo não mudam; só onde são montados).

## Arquivos
- `src/app/edificio/Configuracao.tsx` (registro `SECOES`)
- `src/app/edificio/Edificio.tsx` (retirar os grupos da coluna esquerda)
- `src/app/edificio/Fundacao.tsx` (exportar os blocos de premissa da fundação, se necessário)

## `Configuracao.tsx`: registro completo
Cada seção é o componente de grupo existente. Como cada um já é um `<Group title=…>` (`details`), a janela os abre (efeito do cartão 01). O `id` é o que a faixa usa (`ui({ cfg: '<id>' })`).
```tsx
import { OpcoesGrupo } from './OpcoesCalculo';
import { MateriaisGrupo } from './Materiais';
import { TabelasGrupo } from './TabelasArmadura';
import { BibliotecaNormasGrupo } from './BibliotecaNormas';
import { TiposLajeGrupo } from './TiposLaje';
import { CasosGrupo } from './Casos';
import { EstadosGrupo } from './EstadosLimite';
import { VentoGrupo } from './Edificio';           // exportar VentoGrupo
import { AbacosVentoGrupo } from './AbacosVento';
import { EmpuxoGrupo } from './Empuxo';
import { EtapasFlechaGrupo } from './EtapasFlecha';
import { IncendioGrupo } from './Incendio';
import { ArquivoGrupo } from './EtapasObra';
import { FundacaoGrupo } from './Fundacao';

export const SECOES: SecaoCfg[] = [
  { id: 'dados', titulo: 'Dados gerais', corpo: (b) => <DadosGeraisCorpo b={b} /> },
  { id: 'opcoes', titulo: 'Opções de cálculo', corpo: (b) => <OpcoesGrupo b={b} /> },
  { id: 'materiais', titulo: 'Materiais e segurança', corpo: (b) => <MateriaisGrupo b={b} /> },
  { id: 'tabelas', titulo: 'Tabelas de armadura', corpo: (b) => <TabelasGrupo b={b} /> },
  { id: 'normas', titulo: 'Biblioteca de normas', corpo: (b) => <BibliotecaNormasGrupo b={b} /> },
  { id: 'tiposLaje', titulo: 'Tipos de laje', corpo: (b) => <TiposLajeGrupo b={b} /> },
  { id: 'casos', titulo: 'Casos de carga', corpo: (b) => <CasosGrupo b={b} /> },
  { id: 'estados', titulo: 'Estados-limite e combinações', corpo: (b) => <EstadosGrupo b={b} /> },
  { id: 'vento', titulo: 'Vento e combinações', corpo: (b) => <VentoGrupo b={b} /> },
  { id: 'abacos', titulo: 'Ábacos de vento', corpo: (b) => <AbacosVentoGrupo b={b} /> },
  { id: 'empuxo', titulo: 'Empuxo de terra', corpo: (b) => <EmpuxoGrupo b={b} /> },
  { id: 'etapasFlecha', titulo: 'Etapas de carga', corpo: (b) => <EtapasFlechaGrupo b={b} /> },
  { id: 'incendio', titulo: 'Incêndio', corpo: (b) => <IncendioGrupo b={b} /> },
  { id: 'arquivo', titulo: 'Arquivo e versões', corpo: () => <ArquivoGrupo /> },
  { id: 'fundacao', titulo: 'Fundação (terreno, estacas, sondagens, parâmetros)', corpo: (b) => <FundacaoGrupo b={b} onPlanta={() => useEdifUI.getState().set({ cfg: null, aba: 'planta' })} /> },
];
```
Os títulos do índice são os dos grupos sem os sufixos dinâmicos (contagem, "alteradas"); os `Group` internos mantêm seus títulos completos (os fluxos que abrem um grupo pelo texto do `summary` continuam achando o mesmo texto, agora dentro da janela).

## `Edificio.tsx`: retirar da coluna esquerda
Remover as linhas (ou JSX) de: `<OpcoesGrupo b={b} />`, `<EtapasFlechaGrupo …/>`, `<IncendioGrupo …/>`, `<MateriaisGrupo …/>`, `<TabelasGrupo …/>`, `<BibliotecaNormasGrupo …/>`, `<TiposLajeGrupo …/>`, `<AbacosVentoGrupo …/>`, `<CasosGrupo …/>`, `<EstadosGrupo …/>`, `<EmpuxoGrupo …/>`, `<VentoGrupo …/>`, `<ArquivoGrupo />`, `<FundacaoGrupo …/>` e o `Group` "Obra" (o corpo `DadosGeraisCorpo` passou à seção `dados`; os botões Nova obra…, Obras recentes… e Dados gerais… já estão na faixa). Fica na coluna (até a D4 virar árvore): `BarraAtalhos` (vai para a QA no cartão D3-08), `EtapasGrupo`, Pavimentos, Grupos, Eixos, `GruposCopiaGrupo`, Máscara (camadas), Pilares, Pilares-parede, Paredes, Muros, Alvenaria, Vigas, `LancamentoL5Grupo`, Lajes, `DadosL4Grupo`, Cargas, Cortes, Vínculos. Exportar `VentoGrupo`.

`FundacaoGrupo` sobe inteiro (a lista de elementos e o editor de elemento vão para a árvore e para as propriedades na D4/D5); dentro dela ficam os botões com parâmetros (`Planta de fundação (U)` etc.). O `onPlanta` fecha a janela e leva à Planta.

## Atalhos que abrem uma seção
- `tabelaFoco` (atalho da lista de erros para uma tabela de armadura): em `TabelasGrupo`/`Revisao.tsx`, quem escreve `tabelaFoco` passa também `useEdifUI.getState().set({ cfg: 'tabelas' })`.
- `irEtapa('obra')` (botão "Ir" da etapa Dados gerais) abre `ui({ l1: 'gerais' })`: inalterado.

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run build`; `npm run mapa`; `npm run e2e -- --workers 4` completo. Fluxos afetados: todos os que abrem esses grupos pelo `summary` na coluna esquerda (`.edif-in`, `summary` com "Opções de cálculo", "Casos de carga", "Vento", "Estados-limite", "Empuxo", "Incêndio", "Materiais", "Tabelas de armadura", "Biblioteca de normas", "Tipos de laje", "Fundação", "Etapas de carga", "Arquivo e versões"): trocar por `await abrirConfiguracao(page, '<título do índice>')` (helper do D6-01: clica o botão do índice da janela `Configuração da obra`, abrindo-a pelo botão "Configuração da obra…" da aba Arquivo).

## Rótulos
Índice `nav aria-label="Seções da configuração"`; janela `role=dialog` de nome `Configuração da obra`.
