// Funções puras da interface dos planos inclinados (frente E3f): rótulo do Navegador, campos de edição e parâmetros dos comandos
// `plano.criar` e `plano.editar`. Sem React; o cálculo é do núcleo (`planos.ts`).
import { coeficientesPlano, inclinacaoDoPlano } from '../../core/building/planos';
import type { BuildingModel, DefinicaoPlano, Plano } from '../../core/building/types';
import { cssVar } from '../design/tokens';

/** Cor do plano (índice 0 a 7, token `--plano-N` do design system). */
export const corDoPlano = (cor: number | undefined) => cssVar(`plano-${(cor ?? 0) % 8}`);

export type TipoDef = DefinicaoPlano['tipo'];
export const TIPOS_DEF: { v: TipoDef; label: string }[] = [
  { v: 'tresPontos', label: 'Três pontos' }, { v: 'retaHorizontal', label: 'Reta horizontal + inclinação' }, { v: 'maximaDeclividade', label: 'Máxima declividade' },
];
export const CORES_PLANO = [0, 1, 2, 3, 4, 5, 6, 7].map((v) => ({ v, label: `Cor ${v + 1}` }));
export const fmtPlano = (x: number, n = 1) => x.toFixed(n).replace('.', ',');

/** Rótulo do nó do Navegador: `<nome> — <inclinação> %` (1 casa, vírgula). */
export function rotuloPlano(pl: Plano): string {
  const c = coeficientesPlano(pl.def);
  return `${pl.nome} — ${fmtPlano(c ? inclinacaoDoPlano(c).percentual : 0)} %`;
}

/** Campos do formulário do plano. `pontos`: três [x, y, desnível] ou dois [x, y] (m); `inclinacao` em `unidade`. */
export interface DadosPlano { nome: string; cor: number; tipo: TipoDef; pontos: number[][]; desnivel: number; inclinacao: number; unidade: '%' | 'graus' }
export const DADOS_PLANO_NOVO: DadosPlano = { nome: '', cor: 0, tipo: 'maximaDeclividade', pontos: [[0, 0], [0, 4]], desnivel: 0, inclinacao: 10, unidade: '%' };

export function dadosDoPlano(pl: Plano): DadosPlano {
  const d = pl.def;
  return d.tipo === 'tresPontos'
    ? { nome: pl.nome, cor: pl.cor ?? 0, tipo: d.tipo, pontos: d.pontos.map((q) => [...q]), desnivel: 0, inclinacao: 0, unidade: '%' }
    : { nome: pl.nome, cor: pl.cor ?? 0, tipo: d.tipo, pontos: d.pontos.map((q) => [...q]), desnivel: d.desnivel, inclinacao: d.inclinacao, unidade: '%' };
}

/** Troca o tipo de definição aproveitando os pontos; de dois para três pontos o terceiro sai perpendicular ao primeiro lado, na mesma cota. */
export function trocaTipoDef(d: DadosPlano, tipo: TipoDef): DadosPlano {
  if (tipo === d.tipo) return d;
  if (tipo === 'tresPontos') {
    const [a, b] = d.pontos;
    return { ...d, tipo, pontos: [[a[0], a[1], d.desnivel], [b[0], b[1], d.desnivel], [a[0] - (b[1] - a[1]), a[1] + (b[0] - a[0]), d.desnivel]] };
  }
  if (d.tipo === 'tresPontos') return { ...d, tipo, pontos: [[d.pontos[0][0], d.pontos[0][1]], [d.pontos[1][0], d.pontos[1][1]]], desnivel: d.pontos[0][2], inclinacao: 0 };
  return { ...d, tipo };
}

/** Parâmetros de `plano.criar` / `plano.editar` (sem `grupo` e `id`) a partir dos campos. */
export function paramsDoPlano(d: DadosPlano): Record<string, unknown> {
  return d.tipo === 'tresPontos'
    ? { tipo: d.tipo, pontos: d.pontos }
    : { tipo: d.tipo, pontos: d.pontos, desnivel: d.desnivel, inclinacao: d.inclinacao, unidade: d.unidade };
}

/** Passo da cópia do plano de um pano para panos de outro grupo (C7.8): reaproveita o plano igual do grupo ou manda criá-lo. */
export interface PassoCopiaPlano { grupo: string; lajes: string[]; existente?: string; criar?: Record<string, unknown> }

const mesmaDef = (a: DefinicaoPlano, b: DefinicaoPlano) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Cópia do plano de inclinação do pano `origem` para os panos `destinos` (C7.8). Os planos são de um grupo, mas a definição
 * é geométrica (coordenadas da obra): para destinos de outro grupo, o plano é recriado no grupo (ou reaproveitado se já existe
 * um igual); no mesmo grupo basta atribuir. Origem sem plano: os destinos voltam à horizontal (`existente` ausente e `criar` ausente).
 */
export function passosCopiaPlano(b: BuildingModel, origem: string, destinos: string[]): PassoCopiaPlano[] {
  const o = b.lajes.find((l) => l.id === origem), pl = o?.plano ? (b.planos ?? []).find((p) => p.id === o.plano) : undefined;
  const por = new Map<string, string[]>();
  for (const id of destinos) { const l = b.lajes.find((x) => x.id === id); if (l && id !== origem) por.set(l.grupo, [...(por.get(l.grupo) ?? []), id]); }
  return [...por].map(([grupo, lajes]) => {
    if (!pl) return { grupo, lajes };
    const igual = (b.planos ?? []).find((p) => p.grupo === grupo && (p.id === pl.id || mesmaDef(p.def, pl.def)));
    return igual ? { grupo, lajes, existente: igual.id } : { grupo, lajes, criar: { grupo, nome: pl.nome, cor: pl.cor ?? 0, ...paramsDoPlano(dadosDoPlano(pl)) } };
  });
}
