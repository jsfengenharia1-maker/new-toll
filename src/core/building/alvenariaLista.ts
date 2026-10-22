// Listas, formulários e parâmetros de comandos da interface da alvenaria estrutural (E1e): funções puras sobre o modelo e o
// resultado do dimensionamento, para o grupo de tipos e blocos, a janela da parede, o cartão do Dimensionamento e o memorial.
// A interface só desenha o que estas funções devolvem (texto com vírgula decimal, valores em cm).
import { blocoDe, precisaCanto, resistenciaAlvenaria, tipoAlvenariaDe } from './alvenaria';
import type { ResultadoAlvenaria, ResultadoAlvenariaParede } from './alvenariaDim';
import { opcoesEmUso, perfilDe } from './opcoes';
import type { ArmaduraVerga, BuildingModel, Parede, TipoAlvenaria, TipoBloco } from './types';

const n = (v: number, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('.', ',');
const cm = (m: number) => +(m * 100).toFixed(2);
const emM = (c: number) => +(c / 100).toFixed(4);
const malha = (m?: { phi: number; s: number } | null) => (m ? `φ${n(m.phi, 1)} c/${n(m.s * 100, 1)}` : '—');
export const SITUACAO_ALV: Record<string, string> = { ok: 'atende', fail: 'não atende' };
const MOTIVO = { compressao: 'compressão', tracao: 'tração', cisalhamento: 'cisalhamento' } as const;

// ---------------------------------------------------------------- blocos e tipos de alvenaria

export interface LinhaBloco { id: string; nome: string; dimensoes: string; fbk: string; canto: string; emUso: number }
/** Uma linha por bloco da biblioteca da obra; `emUso` = tipos de alvenaria que o usam. */
export function linhasBlocos(b: BuildingModel): LinhaBloco[] {
  return (b.blocos ?? []).map((x) => ({
    id: x.id, nome: x.nome, dimensoes: `${n(cm(x.comprimento), 0)} × ${n(cm(x.largura), 0)} × ${n(cm(x.altura), 0)} cm`, fbk: n(x.fbk),
    canto: x.canto === undefined ? (precisaCanto(x) ? 'automático (sim)' : 'automático (não)') : x.canto ? 'sim' : 'não', emUso: (b.tiposAlvenaria ?? []).filter((t) => t.bloco === x.id).length,
  }));
}

export interface LinhaTipoAlvenaria {
  id: string; nome: string; modelo: 'generica' | 'blocos'; modeloTexto: string; bloco: string; gama: string;
  fd: string; ftd: string; fk: string; E: string; G: string; nu: string; armada: string; emUso: number;
}
/** Uma linha por tipo de alvenaria, com as resistências e a rigidez calculadas (perfil de opções da obra). */
export function linhasTiposAlvenaria(b: BuildingModel): LinhaTipoAlvenaria[] {
  const op = opcoesEmUso(b.opcoes, perfilDe(b));
  return (b.tiposAlvenaria ?? []).map((t) => {
    const bl = blocoDe(b, t), r = resistenciaAlvenaria(t, bl, op);
    return {
      id: t.id, nome: t.nome, modelo: t.modelo, modeloTexto: t.modelo === 'blocos' ? 'blocos de concreto' : 'alvenaria genérica', bloco: bl?.nome ?? '—', gama: n(t.gama, 1),
      fd: n(r.fd), ftd: n(r.ftd), fk: r.fk !== undefined ? n(r.fk) : '—', E: n(r.E, 0), G: n(r.G, 0), nu: n(r.nu), armada: r.armada ? 'sim' : 'não', emUso: (b.paredes ?? []).filter((w) => w.material === t.id).length,
    };
  });
}

/** Rótulo do tipo de parede: "Concreto", "Alvenaria genérica (nome)" ou "Blocos (nome)". */
export function rotuloTipoParede(b: BuildingModel, w: Pick<Parede, 'tipo' | 'material'>): string {
  if (w.tipo === 'concreto') return 'Concreto';
  const t = tipoAlvenariaDe(b, w);
  return `${w.tipo === 'blocos' ? 'Blocos' : 'Alvenaria genérica'}${t ? ` (${t.nome})` : ' (sem tipo)'}`;
}
/** Largura do bloco do tipo de alvenaria (cm) para a espessura da parede de blocos; undefined na genérica. */
export function larguraDoMaterialCm(b: BuildingModel, materialId: string): number | undefined {
  const t = b.tiposAlvenaria?.find((x) => x.id === materialId), bl = blocoDe(b, t);
  return bl ? cm(bl.largura) : undefined;
}
/** Tipos de alvenaria que servem ao tipo de parede (genérica para 'alvenaria', blocos para 'blocos'). */
export const tiposDoTipoParede = (b: BuildingModel, tipo: 'alvenaria' | 'blocos'): TipoAlvenaria[] => (b.tiposAlvenaria ?? []).filter((t) => t.modelo === (tipo === 'blocos' ? 'blocos' : 'generica'));

export interface FormBloco { nome: string; comprimentoCm: number; larguraCm: number; alturaCm: number; fbk: number; canto: 'auto' | 'sim' | 'nao' }
export const FORM_BLOCO_PADRAO: FormBloco = { nome: 'Bloco 15 × 20 × 40', comprimentoCm: 40, larguraCm: 15, alturaCm: 20, fbk: 6, canto: 'auto' };
export const formDoBloco = (x: TipoBloco): FormBloco => ({ nome: x.nome, comprimentoCm: cm(x.comprimento), larguraCm: cm(x.largura), alturaCm: cm(x.altura), fbk: x.fbk, canto: x.canto === undefined ? 'auto' : x.canto ? 'sim' : 'nao' });
/** Parâmetros de `bloco.tipo` (cm do formulário em m); com `id` edita. `canto` automático não é gravado (na edição, o formulário "auto" não apaga um canto já definido). */
export function paramsBloco(f: FormBloco, id?: string): Record<string, unknown> {
  return { ...(id ? { id } : {}), nome: f.nome.trim() || FORM_BLOCO_PADRAO.nome, comprimento: emM(f.comprimentoCm), largura: emM(f.larguraCm), altura: emM(f.alturaCm), fbk: f.fbk, ...(f.canto !== 'auto' ? { canto: f.canto === 'sim' } : {}) };
}

export const GRAUTEAMENTOS: { v: 'nenhum' | 'parcial' | 'total'; label: string }[] = [{ v: 'nenhum', label: 'sem graute' }, { v: 'parcial', label: 'parcial' }, { v: 'total', label: 'total' }];
export const BITOLAS_ALV_VERTICAL = [8, 10, 12.5, 16, 20];
export const BITOLAS_ALV_HORIZONTAL = [5, 6.3, 8, 10];

export interface FormAlvenaria {
  nome: string; modelo: 'generica' | 'blocos'; gama: number;
  /** Genérica: E (MPa) e fd (MPa) são obrigatórios; ftd e fvd opcionais (vazios = pelas opções). */
  E?: number; fd?: number; ftd?: number; fvd?: number;
  considerarG: boolean; G?: number;
  /** Blocos: id do bloco, argamassa e graute (MPa), grauteamento, prisma (MPa) e armada (com a armadura bloqueada opcional, espaçamentos em cm). */
  bloco: string; argamassa?: number; graute?: number; grauteamento: 'nenhum' | 'parcial' | 'total'; fpk?: number;
  armada: boolean; vPhi?: number; vSCm?: number; hPhi?: number; hSCm?: number;
}
export function formDoTipo(t?: TipoAlvenaria, modelo: 'generica' | 'blocos' = 'blocos', blocoId = ''): FormAlvenaria {
  if (!t) return { nome: modelo === 'blocos' ? 'Blocos de concreto' : 'Alvenaria genérica', modelo, gama: modelo === 'blocos' ? 14 : 13, ...(modelo === 'generica' ? { E: 1500, fd: 1.2 } : {}), considerarG: false, bloco: blocoId, grauteamento: 'nenhum', armada: false };
  return {
    nome: t.nome, modelo: t.modelo, gama: t.gama, E: t.E, fd: t.fd, ftd: t.ftd, fvd: t.fvd, considerarG: !!t.considerarG, G: t.G, bloco: t.bloco ?? blocoId, argamassa: t.argamassa, graute: t.graute,
    grauteamento: t.grauteamento ?? 'nenhum', fpk: t.fpk, armada: !!t.armada,
    vPhi: t.armadura?.vertical?.phi, vSCm: t.armadura?.vertical ? cm(t.armadura.vertical.s) : undefined, hPhi: t.armadura?.horizontal?.phi, hSCm: t.armadura?.horizontal ? cm(t.armadura.horizontal.s) : undefined,
  };
}
const CAMPOS_LIMPAR = ['E', 'G', 'ftd', 'fvd', 'fpk', 'argamassa', 'graute'] as const;
/**
 * Parâmetros de `alvenaria.tipo`. Com `id` (edição) e o tipo anterior, os campos opcionais que o formulário esvaziou vão em
 * `limpar`. Só entram os campos do modelo (genérica ou blocos); armadura só com `armada` e os dois espaçamentos informados.
 */
export function paramsTipoAlvenaria(f: FormAlvenaria, id?: string, anterior?: TipoAlvenaria): Record<string, unknown> {
  const p: Record<string, unknown> = { ...(id ? { id } : { modelo: f.modelo }), nome: f.nome.trim() || (f.modelo === 'blocos' ? 'Blocos de concreto' : 'Alvenaria genérica'), gama: f.gama };
  const campos: Record<string, number | undefined> = f.modelo === 'generica'
    ? { E: f.E, fd: f.fd, ftd: f.ftd, fvd: f.fvd, G: f.considerarG ? f.G : undefined }
    : { E: f.E, ftd: f.ftd, fpk: f.fpk, argamassa: f.argamassa, graute: f.graute, G: f.considerarG ? f.G : undefined };
  for (const [k, v] of Object.entries(campos)) if (v !== undefined) p[k] = v;
  p.considerarG = f.considerarG;
  if (f.modelo === 'blocos') {
    p.bloco = f.bloco; p.grauteamento = f.grauteamento; p.armada = f.armada;
    const vertical = f.vPhi !== undefined && f.vSCm ? { phi: f.vPhi, s: emM(f.vSCm) } : undefined, horizontal = f.hPhi !== undefined && f.hSCm ? { phi: f.hPhi, s: emM(f.hSCm) } : undefined;
    if (f.armada && (vertical || horizontal)) p.armadura = { ...(vertical ? { vertical } : {}), ...(horizontal ? { horizontal } : {}) };
  }
  if (id && anterior) {
    const limpar: string[] = CAMPOS_LIMPAR.filter((k) => anterior[k] !== undefined && p[k] === undefined);
    if (anterior.armadura && !p.armadura) limpar.push('armadura');
    if (limpar.length) p.limpar = limpar;
  }
  return p;
}

// ---------------------------------------------------------------- biblioteca do usuário

/** Conteúdo gravado na biblioteca do usuário: blocos e tipos de alvenaria sem ids (o tipo cita o bloco pelo nome). */
export interface BibliotecaAlvenaria {
  blocos: Omit<TipoBloco, 'id'>[];
  tipos: (Omit<TipoAlvenaria, 'id' | 'bloco'> & { blocoNome?: string })[];
}
/** Blocos e tipos de alvenaria da obra para gravar na biblioteca (os `ids` dados; ausentes = todos). */
export function bibliotecaDeAlvenaria(b: BuildingModel, ids?: string[]): BibliotecaAlvenaria {
  const tipos = (b.tiposAlvenaria ?? []).filter((t) => !ids || ids.includes(t.id)), blocosIds = new Set(tipos.map((t) => t.bloco).filter(Boolean));
  const blocos = (b.blocos ?? []).filter((x) => (ids ? blocosIds.has(x.id) : true));
  return {
    blocos: blocos.map(({ id: _i, ...x }) => structuredClone(x)),
    tipos: tipos.map(({ id: _i, bloco, ...t }) => ({ ...structuredClone(t), ...(bloco ? { blocoNome: b.blocos?.find((x) => x.id === bloco)?.nome } : {}) })),
  };
}
export const resumoBiblioteca = (lib: BibliotecaAlvenaria): string => `${lib.blocos.length} bloco(s) e ${lib.tipos.length} tipo(s) de alvenaria`;
/** Comandos que trazem a biblioteca para a obra (blocos e tipos de mesmo nome que já existem são pulados); rodam em `lote`. */
export function comandosDaBiblioteca(b: BuildingModel, lib: BibliotecaAlvenaria): { nome: string; params: Record<string, unknown> }[] {
  const out: { nome: string; params: Record<string, unknown> }[] = [];
  for (const x of lib.blocos) if (!b.blocos?.some((q) => q.nome === x.nome)) out.push({ nome: 'bloco.tipo', params: { nome: x.nome, comprimento: x.comprimento, largura: x.largura, altura: x.altura, fbk: x.fbk, ...(x.canto !== undefined ? { canto: x.canto } : {}) } });
  for (const t of lib.tipos) if (!b.tiposAlvenaria?.some((q) => q.nome === t.nome)) out.push({ nome: 'alvenaria.tipo', params: structuredClone(t) as unknown as Record<string, unknown> });
  return out;
}

// ---------------------------------------------------------------- janela da parede

export interface LinhaPanoAlv {
  chave: string; lado: number; trecho: string; pavimento: string; lance: string; pano: number; panos: number; intervalo: string;
  esbeltez: string; utilizacao: string; cumprimento: string; vertical: string; horizontal: string; origem: string; governa: string; situacao: string; status: 'ok' | 'fail';
}
/** Uma linha por pano de lado em casca (ordem: trecho, lance, pano). */
export function linhasPanosAlv(r: ResultadoAlvenariaParede): LinhaPanoAlv[] {
  return r.panos.map((p) => ({
    chave: `${p.lado}|${p.pavimento}|${p.pano}`, lado: p.lado, trecho: p.nomeLado, pavimento: p.pavimento, lance: p.nomePav, pano: p.pano, panos: p.panos, intervalo: `${n(p.s0)} a ${n(p.s1)}`,
    esbeltez: `${n(p.lambda, 1)} (máx. ${n(p.lambdaMax, 0)})`, utilizacao: `${n(p.util.comp)} / ${n(p.util.trac)} / ${n(p.util.cis)}`, cumprimento: `${n(p.cumprimento * 100, 1)} % (exigido ${n(p.exigido * 100, 0)} %)`,
    vertical: malha(p.armadura?.vert), horizontal: malha(p.armadura?.hor), origem: p.armadura ? p.armadura.origem : '—',
    governa: p.governa ? `${p.governa.combo} (${MOTIVO[p.governa.modo]})` : '—', situacao: SITUACAO_ALV[p.status], status: p.status,
  }));
}
export interface LinhaPontoAlv { trecho: string; lance: string; ponto: string; area: string; limite: string; utilizacao: string; combinacao: string }
/** Pontos que excedem as tensões-limite (até 5 por pano, os de maior área). */
export function linhasPontosAlv(r: ResultadoAlvenariaParede): LinhaPontoAlv[] {
  return r.panos.flatMap((p) => p.pontos.slice(0, 5).map((q) => ({ trecho: p.nomeLado, lance: p.nomePav, ponto: `${n(q.s)}; ${n(q.z)}`, area: n(q.area), limite: MOTIVO[q.motivo], utilizacao: n(q.util), combinacao: q.combo })));
}
export interface LinhaLadoAlv { trecho: string; lance: string; comprimento: string; esbeltez: string; utilizacao: string; combinacao: string; situacao: string }
/** Trechos curtos (pilares de alvenaria). */
export function linhasLadosAlv(r: ResultadoAlvenariaParede): LinhaLadoAlv[] {
  return r.lados.filter((l) => l.modelo === 'barra').map((l) => ({ trecho: l.nome, lance: l.nomePav, comprimento: n(l.L * 100, 0), esbeltez: n(l.lambda, 1), utilizacao: n(l.util), combinacao: l.combo || '—', situacao: SITUACAO_ALV[l.status] }));
}

export interface LinhaVerga {
  id: string; tipo: 'porta' | 'janela'; lance: string; dimensoes: string; modular: 'sim' | 'não'; necessaria: string; verga: string; contraverga: string; estribo: string; cortante: string; origem: string; situacao: string; status: 'ok' | 'fail';
  armadura: ArmaduraVerga;
}
export function linhasVergas(r: ResultadoAlvenariaParede): LinhaVerga[] {
  return r.vergas.map((a) => ({
    id: a.id, tipo: a.tipo, lance: a.nomePav, dimensoes: `${n(a.largura)} × ${n(a.altura)} m`, modular: a.modular ? 'sim' : 'não', necessaria: `${n(a.necessaria.verga)} / ${n(a.necessaria.contraverga)} cm²`,
    verga: `${a.armadura.n} φ${n(a.armadura.phi, 1)}`, contraverga: a.armadura.contraverga ? `${a.armadura.contraverga.n} φ${n(a.armadura.contraverga.phi, 1)}` : '—',
    estribo: a.armadura.estribo ? `φ${n(a.armadura.estribo.phi, 1)} c/${n(a.armadura.estribo.s * 100, 0)}` : '—', cortante: `${n(a.cortante.V, 1)} / ${n(a.cortante.VRd, 1)} kN`, origem: a.origem, situacao: SITUACAO_ALV[a.status], status: a.status, armadura: a.armadura,
  }));
}

export interface FormVerga { n: number; phi: number; estriboPhi: number; estriboSCm: number; contravergaN: number; contravergaPhi: number }
export const BITOLAS_ESTRIBO_VERGA = [5, 6.3, 8];
/** Formulário da verga: a armadura dada ou 2 φ10, estribo φ5 c/20 e, sem contraverga, n = 0. */
export const formDaVerga = (a?: ArmaduraVerga): FormVerga => ({ n: a?.n ?? 2, phi: a?.phi ?? 10, estriboPhi: a?.estribo?.phi ?? 5, estriboSCm: a?.estribo ? cm(a.estribo.s) : 20, contravergaN: a?.contraverga?.n ?? 0, contravergaPhi: a?.contraverga?.phi ?? 10 });
/** `ArmaduraVerga` do formulário (estribo sempre; contraverga só em janela e com n > 0). */
export function armaduraVergaDoForm(f: FormVerga, tipo: 'porta' | 'janela'): ArmaduraVerga {
  return { n: f.n, phi: f.phi, estribo: { phi: f.estriboPhi, s: emM(f.estriboSCm) }, ...(tipo === 'janela' && f.contravergaN > 0 ? { contraverga: { n: f.contravergaN, phi: f.contravergaPhi } } : {}) };
}
/** Parâmetros de `verga.armadura` que bloqueiam a verga de uma abertura. */
export const paramsVergaEditar = (abertura: string, f: FormVerga, tipo: 'porta' | 'janela'): Record<string, unknown> => ({ acao: 'editar', abertura, armadura: armaduraVergaDoForm(f, tipo) });
/** Ids das aberturas do mesmo tipo (porta ou janela) em paredes de blocos, menos a de origem: destino do "copiar para as de mesmo tipo". */
export function aberturasBlocosDoMesmoTipo(b: BuildingModel, id: string): string[] {
  const todas = (b.paredes ?? []).filter((w) => w.tipo === 'blocos').flatMap((w) => w.aberturas ?? []), o = todas.find((a) => a.id === id);
  return o ? todas.filter((a) => a.tipo === o.tipo && a.id !== id).map((a) => a.id) : [];
}

export interface MensagemAlv { local: string; texto: string }
export function mensagensAlv(r: ResultadoAlvenariaParede): MensagemAlv[] {
  return [
    ...r.mensagens.map((t) => ({ local: '—', texto: t })),
    ...r.panos.flatMap((p) => p.mensagens.map((t) => ({ local: `${p.nomeLado}, ${p.nomePav}, pano ${p.pano + 1}`, texto: t }))),
    ...r.lados.flatMap((l) => l.mensagens.map((t) => ({ local: `${l.nome}, ${l.nomePav}`, texto: t }))),
    ...r.vergas.flatMap((a) => a.mensagens.map((t) => ({ local: `abertura (${a.tipo}), ${a.nomePav}`, texto: t }))),
  ];
}

export interface LinhaBlocosLance { lance: string; fiadas: string; inteiros: string; meios: string; cantos: string; canaletas: string; total: string; area: string }
/** Quantitativo de blocos por lance da parede (última linha: total). */
export function linhasQuantitativo(r: ResultadoAlvenariaParede): LinhaBlocosLance[] {
  const q = r.quantitativo;
  if (!q) return [];
  return [
    ...q.lances.map((l) => ({ lance: l.nomePav, fiadas: String(l.fiadas), inteiros: String(l.inteiros), meios: String(l.meios), cantos: String(l.cantos), canaletas: String(l.canaletas), total: String(l.total), area: n(l.area) })),
    { lance: 'Total', fiadas: '', inteiros: String(q.totais.inteiros), meios: String(q.totais.meios), cantos: String(q.totais.cantos), canaletas: String(q.totais.canaletas), total: String(q.totais.total), area: n(q.totais.area) },
  ];
}
export interface LinhaDesligamento { pilar: string; pavimento: string; laje: string; desligado: string }
/** Pilares em contato com a parede (ou com todas, sem `parede`). */
export function linhasDesligamentos(al: ResultadoAlvenaria, parede?: string): LinhaDesligamento[] {
  return al.desligamentos.filter((d) => !parede || d.parede === parede).map((d) => ({ pilar: d.nomePilar, pavimento: d.nomePav, laje: d.laje === 'vigotas' ? 'vigotas' : d.laje === 'macica' ? 'maciça' : 'sem laje', desligado: d.desligado ? 'sim' : 'não' }));
}
export interface LinhaVigaMuro { viga: string; papel: string; secao: string; armadura: string; situacao: string }
export function linhasVigasMuro(al: ResultadoAlvenaria, parede?: string): LinhaVigaMuro[] {
  return al.vigasMuro.filter((v) => !parede || v.parede === parede).map((v) => ({
    viga: v.nome, papel: v.papel === 'topoSubsolo' ? 'topo de muro de subsolo' : v.papel === 'coroamento' ? 'coroamento em blocos' : 'nível da laje (alvenaria genérica)',
    secao: `${n(v.b * 100, 0)} × ${n(v.h * 100, 0)} cm`, armadura: !v.opcional ? 'sempre armada' : v.dispensada ? 'opcional dispensada' : 'opcional armada', situacao: SITUACAO_ALV[v.status],
  }));
}

export interface ResumoCartaoAlv { material: string; armada: string; cumprimentoMin: string; blocos: string; situacao: string; status: 'ok' | 'fail'; panos: number }
/** Linha do cartão do Dimensionamento: material, cumprimento mínimo, total de peças e situação. */
export function resumoCartaoAlv(r: ResultadoAlvenariaParede): ResumoCartaoAlv {
  return {
    material: r.nomeMaterial, armada: r.armada ? 'armada' : 'não armada', cumprimentoMin: r.panos.length ? `${n(Math.min(...r.panos.map((p) => p.cumprimento)) * 100, 1)} %` : '—',
    blocos: r.quantitativo ? String(r.quantitativo.totais.total) : '—', situacao: SITUACAO_ALV[r.status], status: r.status, panos: r.panos.length,
  };
}
