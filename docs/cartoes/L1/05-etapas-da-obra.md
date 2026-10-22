# Cartão L1-05 — Guia de etapas (`etapasDaObra`)

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis.

## Objetivo
Lista das etapas do lançamento com o estado de cada uma calculado do modelo. Itens: C1.16, C1.28, C1.29.

## Arquivos
1. `src/core/building/etapas.ts` (criar)
2. `src/core/building/etapas.test.ts` (criar)

## `etapas.ts` — conteúdo exato
```ts
// Guia de etapas do lançamento (L1): o estado de cada etapa sai do modelo, nada é guardado.
import { ehArranque, type BuildingModel } from './types';

export type EtapaId = 'obra' | 'pavimentos' | 'gabarito' | 'pilares' | 'pilaresParede' | 'muros' | 'vigas' | 'lajes' | 'cargas' | 'escadas' | 'calculo';
export type EstadoEtapa = 'pendente' | 'feito' | 'indisponivel';
export interface Etapa { id: EtapaId; rotulo: string; estado: EstadoEtapa; detalhe: string }

/** Muros e paredes chegam com a frente E1c; escadas, com a E4. Troque para true quando existirem. */
export const MUROS_DISPONIVEIS = false;
export const ESCADAS_DISPONIVEIS = false;

export function etapasDaObra(b: BuildingModel, calculado = false): Etapa[] {
  const nPil = b.pilares.filter((p) => !ehArranque(p)).length;
  const nPP = b.pilaresParede?.length ?? 0;
  const e = (id: EtapaId, rotulo: string, feito: boolean, detalhe: string): Etapa => ({ id, rotulo, estado: feito ? 'feito' : 'pendente', detalhe });
  const nomeDado = !!b.obra.nome.trim() && b.obra.nome !== 'Edifício sem nome';
  return [
    e('obra', 'Obra', nomeDado, nomeDado ? b.obra.nome : 'Dê um nome à obra.'),
    e('pavimentos', 'Pavimentos', b.pavimentos.length > 0, `${b.pavimentos.length} pavimento(s) em ${b.grupos.length} grupo(s)`),
    e('gabarito', 'Gabarito e eixos', b.mascaras.length > 0 || b.eixos.length > 0, `${b.mascaras.length} gabarito(s), ${b.eixos.length} eixo(s)`),
    e('pilares', 'Pilares', nPil > 0, `${nPil} pilar(es)`),
    e('pilaresParede', 'Pilares-parede', nPP > 0, nPP ? `${nPP} pilar(es)-parede` : 'Opcional: lance pelo grupo Pilares-parede.'),
    MUROS_DISPONIVEIS
      ? e('muros', 'Muros e paredes', false, 'Lance os muros e paredes de apoio.')
      : { id: 'muros', rotulo: 'Muros e paredes', estado: 'indisponivel', detalhe: 'Muros e paredes estruturais chegam com a frente E1c.' },
    e('vigas', 'Vigas', b.vigas.length > 0, `${b.vigas.length} viga(s)`),
    e('lajes', 'Lajes', b.lajes.length > 0, `${b.lajes.length} laje(s)`),
    e('cargas', 'Cargas', b.cargas.length > 0 || (b.cargasPilar?.length ?? 0) > 0 || b.grupos.length > 0, `${b.cargas.length} carga(s) de área/linha/ponto, ${b.cargasPilar?.length ?? 0} em pilares; sobrecarga por grupo`),
    ESCADAS_DISPONIVEIS
      ? e('escadas', 'Escadas', false, 'Lance as escadas.')
      : { id: 'escadas', rotulo: 'Escadas', estado: 'indisponivel', detalhe: 'Escadas chegam com a frente E4.' },
    e('calculo', 'Cálculo', calculado, calculado ? 'Cálculo em vigor.' : 'Calcule na aba Dimensionamento.'),
  ];
}

/** Primeira etapa pendente (a próxima a fazer), ou `undefined` quando não há. */
export const proximaEtapa = (et: Etapa[]): Etapa | undefined => et.find((x) => x.estado === 'pendente');
```
Note que `Etapa.estado` do `muros`/`escadas` indisponíveis precisa do tipo literal: declare os objetos com `as Etapa` se o tsc reclamar.

## Testes (`etapas.test.ts`)
Importe `describe, expect, it` de vitest; `Sessao`, `comandosEdificioPadrao` de `../commands`; `edificioVazio` de `./types`; `etapasDaObra`, `proximaEtapa` de `./etapas`; `edificioExemplo` de `../sheets/exemplo`.
1. Obra vazia (`edificioVazio()`): estados na ordem dos ids `obra pendente, pavimentos pendente, gabarito pendente, pilares pendente, pilaresParede pendente, muros indisponivel, vigas pendente, lajes pendente, cargas pendente, escadas indisponivel, calculo pendente` — (`cargas` fica pendente porque `grupos` está vazio); `proximaEtapa(...)!.id === 'obra'`.
2. Edifício padrão (`comandosEdificioPadrao` numa `Sessao`): `obra` feito (nome "Edifício residencial"), `pavimentos` feito com detalhe `'5 pavimento(s) em 3 grupo(s)'`, `cargas` feito, `pilares` pendente; `proximaEtapa(...)!.id === 'gabarito'`.
3. `edificioExemplo().modelo`: `pilares`, `vigas`, `lajes`, `gabarito` (tem eixos) todos `feito`; `etapasDaObra(modelo, true)` marca `calculo` feito e `proximaEtapa` é `pilaresParede`.
4. Só arranques: sessão vazia com `pilar.inserir { x: 0, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: 'fundacao', morre: 'fundacao' }` → `pilares` continua `pendente` (arranque não conta).
5. `muros` e `escadas` ficam `indisponivel` em todos os casos acima e o `detalhe` de `muros` contém `'E1c'`.

## Verificação
```bash
npx tsc -b && npx vitest run src/core/building/etapas.test.ts
```
