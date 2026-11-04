// Aba Modificar da faixa: estado das janelas (corresponder propriedades, filtro da seleção), seleção por tipo e por igualdade,
// "criar semelhante" e apagar a seleção. Sem React (a Planta e a faixa importam daqui). Nada disto vai para o arquivo.
import { create } from 'zustand';
import { CAMPOS, tipoCorresp, type TipoCorresp } from '../../core/building/corresponder';
import { ehArranque, lancesDoPilar, type BuildingModel } from '../../core/building/types';
import { usePlanta, type Restringir } from './plantaStore';

export type ChaveTipo = 'pilares' | 'vigas' | 'lajes' | 'paredes' | 'cargas' | 'fundacoes' | 'eixos' | 'cotas';
export const TIPOS_FILTRO: { chave: ChaveTipo; rotulo: string }[] = [
  { chave: 'pilares', rotulo: 'Pilares' }, { chave: 'vigas', rotulo: 'Vigas' }, { chave: 'lajes', rotulo: 'Lajes' }, { chave: 'paredes', rotulo: 'Paredes' },
  { chave: 'cargas', rotulo: 'Cargas' }, { chave: 'fundacoes', rotulo: 'Fundações' }, { chave: 'eixos', rotulo: 'Eixos' }, { chave: 'cotas', rotulo: 'Cotas' },
];

/** Tipo de filtro do elemento de id dado (fundações: elementos, vigas, radiers e sapatas corridas), ou null. */
export function chaveDoId(b: BuildingModel, id: string): ChaveTipo | null {
  if (b.pilares.some((x) => x.id === id)) return 'pilares';
  if (b.vigas.some((x) => x.id === id)) return 'vigas';
  if (b.lajes.some((x) => x.id === id)) return 'lajes';
  if (b.paredes?.some((x) => x.id === id) || b.pilaresParede?.some((x) => x.id === id)) return 'paredes';
  if (b.cargas.some((x) => x.id === id)) return 'cargas';
  if (b.eixos.some((x) => x.id === id)) return 'eixos';
  if (b.cotas?.some((x) => x.id === id)) return 'cotas';
  const f = b.fundacao;
  if (f && (f.elementos.some((x) => x.id === id) || f.vigas?.some((x) => x.id === id) || f.radiers?.some((x) => x.id === id) || f.vigasElasticas?.some((x) => x.id === id) || f.corridas?.some((x) => x.id === id))) return 'fundacoes';
  return null;
}

/** Ids agrupados por tipo de filtro; ids de outro tipo (escadas, limites…) ficam em `outros`. */
export function agruparPorTipo(b: BuildingModel, ids: Iterable<string>): { porTipo: Record<ChaveTipo, string[]>; outros: string[] } {
  const porTipo = Object.fromEntries(TIPOS_FILTRO.map((t) => [t.chave, [] as string[]])) as Record<ChaveTipo, string[]>;
  const outros: string[] = [];
  for (const id of ids) { const k = chaveDoId(b, id); if (k) porTipo[k].push(id); else outros.push(id); }
  return { porTipo, outros };
}

/** Rótulo da quantidade por tipo, "2 pilares", "1 viga"… */
export function resumoPorTipo(porTipo: Record<ChaveTipo, string[]>): string {
  return TIPOS_FILTRO.filter((t) => porTipo[t.chave].length).map((t) => `${porTipo[t.chave].length} ${t.rotulo.toLowerCase()}`).join(', ');
}

const json = (x: unknown) => JSON.stringify(x);
/** Assinatura de igualdade do elemento (seção ou tipo): o que "Selecionar todos iguais" compara. */
function assinatura(b: BuildingModel, id: string): string | null {
  const p = b.pilares.find((x) => x.id === id); if (p) return `pilar|${json(p.secao)}`;
  const v = b.vigas.find((x) => x.id === id); if (v) return `viga|${v.secao.b}x${v.secao.h}`;
  const l = b.lajes.find((x) => x.id === id); if (l) return `laje|${json(l.tipo)}`;
  const w = b.paredes?.find((x) => x.id === id); if (w) return `parede|${w.tipo}|${w.esq}|${w.dir}|${w.material ?? ''}`;
  const c = b.cargas.find((x) => x.id === id); if (c) return `carga|${c.tipo}|${c.caso}|${c.valor}`;
  const f = b.fundacao?.elementos.find((x) => x.id === id); if (f) return `fundacao|${f.tipo}|${f.posicao}`;
  return null;
}
/** Ids iguais ao elemento dado (mesma seção ou tipo): `pavimento` = só os que aparecem no pavimento aberto (null = nível de fundação); `obra` = todos. */
export function iguaisA(b: BuildingModel, id: string, escopo: 'pavimento' | 'obra', pavimento: string | null, grupo: string): string[] {
  const alvo = assinatura(b, id);
  if (!alvo) return [];
  const pav = escopo === 'pavimento';
  const cand: string[] = [
    ...b.pilares.filter((p) => !pav || (pavimento !== null && lancesDoPilar(b, p).some((l) => l.id === pavimento))).map((p) => p.id),
    ...b.vigas.filter((v) => !pav || v.grupo === grupo).map((v) => v.id),
    ...b.lajes.filter((l) => !pav || l.grupo === grupo).map((l) => l.id),
    ...(b.paredes ?? []).map((w) => w.id), // a parede atravessa pavimentos: vale nos dois escopos
    ...b.cargas.filter((c) => !pav || c.grupo === grupo).map((c) => c.id),
    ...(pav && pavimento !== null ? [] : (b.fundacao?.elementos ?? []).map((f) => f.id)),
  ];
  return cand.filter((c) => assinatura(b, c) === alvo);
}

/** Parâmetros da ferramenta de lançamento que reproduzem o elemento (Criar semelhante), ou null se o tipo não tem ferramenta de lançamento. */
export function semelhante(b: BuildingModel, id: string): { ferramenta: 'pilar' | 'viga' | 'laje' | 'carga' | 'fundacao'; estado: Parameters<ReturnType<typeof usePlanta.getState>['set']>[0]; rotulo: string } | null {
  const p = b.pilares.find((x) => x.id === id);
  if (p) return { ferramenta: 'pilar', rotulo: p.nome, estado: { secao: p.secao.tipo === 'circ' ? { tipo: 'circ', d: p.secao.d } : { tipo: 'ret', b: p.secao.b, h: p.secao.h }, angulo: p.angulo, ajuste: p.ajuste, arranque: ehArranque(p) } };
  const v = b.vigas.find((x) => x.id === id);
  if (v) return { ferramenta: 'viga', rotulo: v.nome, estado: { secaoViga: { b: v.secao.b, h: v.secao.h }, alinhamento: v.alinhamento, invertida: !!v.invertida } };
  const l = b.lajes.find((x) => x.id === id);
  if (l) return { ferramenta: 'laje', rotulo: l.nome, estado: { tipoLaje: JSON.parse(json(l.tipo)) } };
  const c = b.cargas.find((x) => x.id === id);
  if (c && !c.escada) return { ferramenta: 'carga', rotulo: `carga de ${c.valor}`, estado: { tipoCarga: c.tipo, caso: c.caso, valorCarga: c.valor } };
  const f = b.fundacao?.elementos.find((x) => x.id === id);
  if (f) return { ferramenta: 'fundacao', rotulo: f.nome, estado: { tipoFund: f.tipo, posFund: f.posicao, estacaFund: f.estaca?.id ?? null } };
  return null;
}

/** Comandos que apagam os elementos dados (cada tipo no seu comando de remoção). */
export function comandosApagar(b: BuildingModel, ids: Iterable<string>): { nome: string; params: { ids: string[] } }[] {
  const { porTipo } = agruparPorTipo(b, ids);
  const f = b.fundacao;
  const dasFund = (lista: { id: string }[] | undefined, tipos: string[]) => tipos.filter((i) => lista?.some((x) => x.id === i));
  const fund = porTipo.fundacoes;
  const cmds: { nome: string; params: { ids: string[] } }[] = [];
  const add = (nome: string, lista: string[]) => { if (lista.length) cmds.push({ nome, params: { ids: lista } }); };
  add('vigaFundacao.remover', dasFund(f?.vigas, fund));
  add('fundacao.remover', dasFund(f?.elementos, fund));
  add('radier.remover', dasFund(f?.radiers, fund));
  add('vigaElastica.remover', dasFund(f?.vigasElasticas, fund));
  add('corrida.remover', dasFund(f?.corridas, fund));
  add('pilar.remover', porTipo.pilares);
  add('viga.remover', porTipo.vigas);
  add('laje.remover', porTipo.lajes);
  add('carga.remover', porTipo.cargas);
  add('parede.remover', porTipo.paredes.filter((i) => b.paredes?.some((w) => w.id === i)));
  add('pilarParede.remover', porTipo.paredes.filter((i) => b.pilaresParede?.some((w) => w.id === i)));
  add('eixo.remover', porTipo.eixos);
  add('cota.remover', porTipo.cotas);
  return cmds;
}

/** Deslocamento restrito a uma direção. */
export function restringirDelta(dx: number, dy: number, r: Restringir): [number, number] {
  return r === 'horizontal' ? [dx, 0] : r === 'vertical' ? [0, dy] : [dx, dy];
}

const CHAVE_CAMPOS = 'statikos:corresponder-campos';
function camposSalvos(): Record<TipoCorresp, string[]> {
  const padrao = Object.fromEntries((Object.keys(CAMPOS) as TipoCorresp[]).map((t) => [t, CAMPOS[t].filter((c) => c.padrao).map((c) => c.id)])) as Record<TipoCorresp, string[]>;
  try {
    const o = JSON.parse(localStorage.getItem(CHAVE_CAMPOS) ?? '{}') as Partial<Record<TipoCorresp, unknown>>;
    for (const t of Object.keys(CAMPOS) as TipoCorresp[]) if (Array.isArray(o[t])) padrao[t] = (o[t] as unknown[]).filter((c): c is string => typeof c === 'string' && CAMPOS[t].some((x) => x.id === c));
  } catch { /* sem armazenamento */ }
  return padrao;
}

interface ModificarState {
  /** Corresponder propriedades: elemento de origem escolhido na planta (null = ainda não escolhido) e janela de campos aberta. */
  corrOrigem: string | null;
  corrJanela: boolean;
  /** Campos marcados por tipo, lembrados entre sessões (neste navegador). */
  corrCampos: Record<TipoCorresp, string[]>;
  /** Janela do filtro da seleção por tipo aberta. */
  filtro: boolean;
  set(p: Partial<Omit<ModificarState, 'set' | 'escolherCampos'>>): void;
  escolherCampos(tipo: TipoCorresp, campos: string[]): void;
}

export const useModificar = create<ModificarState>((set, get) => ({
  corrOrigem: null,
  corrJanela: false,
  corrCampos: camposSalvos(),
  filtro: false,
  set: (p) => set(p),
  escolherCampos(tipo, campos) {
    const corrCampos = { ...get().corrCampos, [tipo]: campos };
    set({ corrCampos });
    try { localStorage.setItem(CHAVE_CAMPOS, JSON.stringify(corrCampos)); } catch { /* sem armazenamento */ }
  },
}));

/** Tipo de correspondência do elemento de origem atual (null se não há ou se o modelo não o tem mais). */
export const tipoDaOrigem = (b: BuildingModel): TipoCorresp | null => { const o = useModificar.getState().corrOrigem; return o ? tipoCorresp(b, o) : null; };
