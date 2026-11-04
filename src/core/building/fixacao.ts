// Fixar (alfinete): elementos fixados não podem ser movidos, girados, espelhados, alinhados, deslocados nem apagados.
// A regra vale para todo comando (interface, arquivo, linha de comando e MCP): `aplicarComando` chama `bloqueioPorFixacao`
// antes de validar. Quem cria um comando novo de movimento só precisa que o nome termine em .mover, .girar, .espelhar,
// .alinhar, .deslocar ou .remover e que os ids do que se move estejam em `id`, `ids`, `pilares`, `vigas`, `lajes`,
// `cargas`, `paredes`, `eixos`, `mascaras`, `fundacoes`, `escadas` ou `elementos` (ver CHAVES_ALVO).
import type { BuildingModel } from './types';
import type { Diagnostico } from './verify';

export type TipoElemento = 'pilar' | 'viga' | 'laje' | 'carga' | 'parede' | 'pilarParede' | 'eixo' | 'mascara' | 'fundacao' | 'escada';

/** Rótulo de cada tipo (plural) para janelas e mensagens. */
export const ROTULO_TIPO: Record<TipoElemento, { singular: string; plural: string }> = {
  pilar: { singular: 'pilar', plural: 'pilares' }, viga: { singular: 'viga', plural: 'vigas' }, laje: { singular: 'laje', plural: 'lajes' },
  carga: { singular: 'carga', plural: 'cargas' }, parede: { singular: 'parede', plural: 'paredes' }, pilarParede: { singular: 'pilar-parede', plural: 'pilares-parede' },
  eixo: { singular: 'eixo', plural: 'eixos' }, mascara: { singular: 'gabarito', plural: 'gabaritos' }, fundacao: { singular: 'fundação', plural: 'fundações' },
  escada: { singular: 'escada', plural: 'escadas' },
};

/** Tipo e nome do elemento de id dado, ou null (id inexistente). */
export function elementoDe(b: BuildingModel, id: string): { tipo: TipoElemento; nome: string } | null {
  const por = (tipo: TipoElemento, lista: { id: string; nome?: string }[] | undefined) => { const e = lista?.find((x) => x.id === id); return e ? { tipo, nome: e.nome ?? id } : null; };
  return por('pilar', b.pilares) ?? por('viga', b.vigas) ?? por('laje', b.lajes) ?? por('eixo', b.eixos) ?? por('mascara', b.mascaras) ?? por('parede', b.paredes)
    ?? por('pilarParede', b.pilaresParede) ?? por('escada', b.escadas)
    ?? (b.cargas.some((c) => c.id === id) ? { tipo: 'carga' as const, nome: 'carga' } : null)
    ?? por('fundacao', [...(b.fundacao?.elementos ?? []), ...(b.fundacao?.radiers ?? []), ...(b.fundacao?.corridas ?? [])].map((e) => ({ id: e.id, nome: (e as { nome?: string }).nome })));
}

export const ehFixo = (b: BuildingModel, id: string): boolean => !!b.fixados?.includes(id);

/** Ids de eixos e de gabaritos (máscaras DXF/DWG): o padrão útil do alfinete. */
export const idsEixosEGabaritos = (b: BuildingModel, tipos: ('eixos' | 'mascaras')[]): string[] =>
  [...(tipos.includes('eixos') ? b.eixos.map((e) => e.id) : []), ...(tipos.includes('mascaras') ? b.mascaras.map((m) => m.id) : [])];

/** Parâmetros que levam ids do que o comando altera. */
export const CHAVES_ALVO = ['id', 'ids', 'pilares', 'vigas', 'lajes', 'cargas', 'paredes', 'eixos', 'mascaras', 'fundacoes', 'escadas', 'elementos'] as const;
const OPERACAO = /\.(mover|remover|girar|espelhar|alinhar|deslocar)$/;
const VERBO: Record<string, string> = { mover: 'movido', remover: 'apagado', girar: 'girado', espelhar: 'espelhado', alinhar: 'alinhado', deslocar: 'deslocado', editar: 'movido' };
/** Parâmetros de geometria: `<x>.editar` com algum deles move o elemento. */
const GEOMETRIA = ['x', 'y', 'p1', 'p2', 'pontos', 'contorno'];
/** Comandos de nome parecido que não movem o elemento (só o texto de referência dele). */
const EXCECOES = new Set(['ref.mover']);

function idsDe(p: Record<string, unknown>, nome = ''): string[] {
  const out: string[] = [];
  // editar.alinhar: só o elemento a alinhar (`alvo`, descritor com `id`) se move; a referência (`ref`) pode ser fixa
  if (nome === 'editar.alinhar') { const a = p.alvo as { id?: unknown } | undefined; return typeof a?.id === 'string' ? [a.id] : []; }
  for (const k of CHAVES_ALVO) { const v = p[k]; if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) for (const x of v) if (typeof x === 'string') out.push(x); }
  return out;
}

/** Erro por elemento fixado atingido pelo comando; vazio quando o comando não move, gira, espelha, alinha, desloca nem apaga fixados. */
export function bloqueioPorFixacao(b: BuildingModel, nome: string, p: Record<string, unknown>): Diagnostico[] {
  if (!b.fixados?.length || EXCECOES.has(nome)) return [];
  const m = OPERACAO.exec(nome);
  let verbo: string | undefined = m ? VERBO[m[1]] : undefined;
  if (!verbo && nome.endsWith('.editar') && GEOMETRIA.some((k) => p[k] !== undefined)) verbo = VERBO.editar;
  if (!verbo) return [];
  // espelhar com cópia mantém os originais
  if (nome === 'editar.espelhar' && p.copiar === true) return [];
  // deslocar com cópia mantém os originais
  if (nome === 'editar.deslocar' && p.copiar === true) return [];
  const fixos = [...new Set(idsDe(p, nome))].filter((id) => ehFixo(b, id));
  if (!fixos.length) return [];
  const nomes = fixos.map((id) => elementoDe(b, id)?.nome ?? id);
  return [{
    codigo: 'ELEMENTO_FIXADO', severidade: 'erro', elementos: fixos,
    mensagem: `${fixos.length === 1 ? 'Elemento fixado' : 'Elementos fixados'} (${nomes.join(', ')}): não pode${fixos.length === 1 ? '' : 'm'} ser ${verbo}${fixos.length === 1 ? '' : 's'}. Solte-${fixos.length === 1 ? 'o' : 'os'} antes (Soltar).`,
  }];
}

/** Ponto de ancoragem do alfinete de cada elemento fixado na planta do grupo (centro do elemento), ou null. */
export function ancoraDoElemento(b: BuildingModel, id: string, grupo: string): [number, number] | null {
  const media = (pts: [number, number][]): [number, number] => [pts.reduce((s, q) => s + q[0], 0) / pts.length, pts.reduce((s, q) => s + q[1], 0) / pts.length];
  const pil = b.pilares.find((x) => x.id === id); if (pil) return [pil.x, pil.y];
  const e = b.eixos.find((x) => x.id === id); if (e) return [(e.p1[0] + e.p2[0]) / 2, (e.p1[1] + e.p2[1]) / 2];
  const v = b.vigas.find((x) => x.id === id); if (v) return v.grupo === grupo ? media([v.pontos[0], v.pontos[v.pontos.length - 1]]) : null;
  const l = b.lajes.find((x) => x.id === id); if (l) return l.grupo === grupo ? media(l.contorno) : null;
  const c = b.cargas.find((x) => x.id === id); if (c) return c.grupo === grupo ? media(c.pontos) : null;
  const w = b.paredes?.find((x) => x.id === id); if (w) return media(w.pontos);
  const f = b.fundacao?.elementos.find((x) => x.id === id); if (f) return [f.x, f.y];
  const m = b.mascaras.find((x) => x.id === id); if (m) return m.grupo === grupo || m.grupos?.includes(grupo) ? [m.dx, m.dy] : null;
  return null;
}
