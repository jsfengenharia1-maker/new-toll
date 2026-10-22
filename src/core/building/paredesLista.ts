// Listas e parâmetros de comandos da interface da armadura das paredes (E1d): funções puras sobre o resultado do
// dimensionamento, para a janela da parede/pilar-parede, o editor de aberturas, os muros e as isofaixas dos campos.
// A interface só desenha o que estas funções devolvem (texto com vírgula decimal, valores em cm).
import type { DetalheParede } from './detalhamentoParedes';
import type { ResultadoAbertura, ResultadoPano, ResultadoParedeDim } from './paredesDim';
import type { CampoLado } from './campoParede';
import type { ResultadoMuroDim } from './muroArrimoDim';
import type { ArmaduraAbertura, BuildingModel } from './types';

const n = (v: number, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('.', ',');
const malha = (m: { phi: number; s: number } | null) => (m ? `φ${n(m.phi, 1)} c/${n(m.s * 100, 1)}` : '—');
export const SITUACAO: Record<string, string> = { ok: 'atende', review: 'revisar', fail: 'não atende' };

export interface LinhaPano {
  /** Chave única `lado|pavimento|pano`. */
  chave: string;
  lado: number; trecho: string; pavimento: string; lance: string; pano: number; panos: number;
  /** Intervalo ao longo do eixo, texto "a a b" (m). */
  intervalo: string;
  necessaria: string; vertical: string; horizontal: string; cumprimento: string; origem: 'bloqueada' | 'calculada' | 'sem armadura'; situacao: string; status: 'ok' | 'fail';
  /** Malhas adotadas (para preencher o editor). */
  vert: { phi: number; s: number } | null; hor: { phi: number; s: number } | null;
}

/** Uma linha por pano de lado em casca (ordem: trecho, lance, pano). */
export function linhasPanos(r: ResultadoParedeDim): LinhaPano[] {
  return r.panos.map((p: ResultadoPano) => ({
    chave: `${p.lado}|${p.pavimento}|${p.pano}`, lado: p.lado, trecho: p.nomeLado, pavimento: p.pavimento, lance: p.nomePav, pano: p.pano, panos: p.panos,
    intervalo: `${n(p.s0)} a ${n(p.s1)}`, necessaria: `${n(p.req.vert)} / ${n(p.req.hor)}`, vertical: malha(p.vert), horizontal: malha(p.hor),
    cumprimento: `${n(p.cumprimento * 100, 1)} % (exigido ${n(p.exigido * 100, 0)} %)`, origem: p.bloqueada ? 'bloqueada' : p.armada ? 'calculada' : 'sem armadura', situacao: SITUACAO[p.status], status: p.status,
    vert: p.vert, hor: p.hor,
  }));
}

export interface ResumoCartao { armadura: string; cumprimentoMin: string; situacao: string; status: 'ok' | 'fail'; panos: number }
/** Linha do cartão do Dimensionamento: a malha mais pesada (vertical e horizontal), o menor cumprimento e a situação. */
export function resumoCartao(r: ResultadoParedeDim): ResumoCartao {
  const armados = r.panos.filter((p) => p.armada), v = [...armados].sort((a, z) => z.asVert - a.asVert)[0], h = [...armados].sort((a, z) => z.asHor - a.asHor)[0];
  return {
    armadura: armados.length ? `V ${malha(v.vert)} · H ${malha(h.hor)}` : r.panos.length ? 'sem armadura' : '—',
    cumprimentoMin: r.panos.length ? `${n(Math.min(...r.panos.map((p) => p.cumprimento)) * 100, 1)} %` : '—', situacao: SITUACAO[r.status], status: r.status, panos: r.panos.length,
  };
}

export interface LinhaPonto { trecho: string; lance: string; descricao: string; faixa: string; adicional: string }
/** Reforços locais e pontos que não atendem de todos os panos (até 5 pontos por pano). */
export function linhasPontos(r: ResultadoParedeDim): LinhaPonto[] {
  return r.panos.flatMap((p) => [
    ...p.reforcos.map((q) => ({ trecho: p.nomeLado, lance: p.nomePav, descricao: `reforço ${q.direcao}`, faixa: `${n(q.de)} a ${n(q.ate)} m`, adicional: `${q.n} φ${n(q.phi, 1)} (${n(q.As)} cm²)` })),
    ...p.pontos.slice(0, 5).map((q) => ({ trecho: p.nomeLado, lance: p.nomePav, descricao: `ponto (${n(q.s)}; ${n(q.z)}) — ${q.motivo}`, faixa: `${n(q.area)} m²`, adicional: `+${n(q.dv)} V / +${n(q.dh)} H cm²/m` })),
  ]);
}

export interface LinhaEmendaUI { chave: string; pavimento: string; trecho: string; acima: string; tipo: string; phi: string; minimo: string; adotada: string; origem: string }
export function linhasEmendas(d: DetalheParede | undefined): LinhaEmendaUI[] {
  return (d?.emendas ?? []).map((e) => ({ chave: `${e.lado}|${e.pavimento}`, pavimento: e.pavimento, trecho: e.nomeLado, acima: e.nomePav, tipo: e.tipo === 'tracao' ? 'tracionada' : 'comprimida', phi: `φ${n(e.phi, 1)}`, minimo: n(e.minimo * 100, 0), adotada: n(e.comprimento * 100, 0), origem: e.editada ? 'editada' : 'calculada' }));
}

export interface MensagemUI { local: string; texto: string }
/** Todas as mensagens do elemento (panos, lados, aberturas, detalhamento) com o local. */
export function mensagensDe(r: ResultadoParedeDim, d?: DetalheParede): MensagemUI[] {
  return [
    ...r.mensagens.map((t) => ({ local: '—', texto: t })),
    ...r.panos.flatMap((p) => p.mensagens.map((t) => ({ local: `${p.nomeLado}, ${p.nomePav}, pano ${p.pano + 1}`, texto: t }))),
    ...r.lados.flatMap((l) => l.mensagens.map((t) => ({ local: `${l.nome}, ${l.nomePav}`, texto: t }))),
    ...r.aberturas.flatMap((a) => a.mensagens.map((t) => ({ local: `abertura (${a.tipo}), ${a.nomePav}`, texto: t }))),
    ...(d?.avisos ?? []).map((t) => ({ local: 'detalhamento', texto: t })),
  ];
}

export interface LinhaLadoCurto { lado: number; trecho: string; lance: string; comprimento: string; barras: string; estribo: string; utilizacao: string; situacao: string }
export function linhasLadosCurtos(r: ResultadoParedeDim): LinhaLadoCurto[] {
  return r.lados.filter((l) => l.modelo === 'barra').map((l) => ({ lado: l.lado, trecho: l.nome, lance: l.nomePav, comprimento: n(l.L * 100, 0), barras: l.barra?.vert ? `${l.barra.n} φ${n(l.barra.vert.phi, 1)}` : '—', estribo: l.barra ? `φ${n(l.barra.estribo.phi, 1)} c/${n(l.barra.estribo.s * 100, 0)}` : '—', utilizacao: n(l.util), situacao: SITUACAO[l.status] }));
}

// ---------------------------------------------------------------- parâmetros dos comandos

export interface MalhaCm { phi: number; sCm: number }
const emM = (cm: number) => +(cm / 100).toFixed(4);

/** Parâmetros de `parede.armadura` / `pilarParede.armadura` que bloqueiam a malha de um pano (espaçamentos em cm na interface, m no comando). */
export function paramsBloquearPano(id: string, l: Pick<LinhaPano, 'lado' | 'pavimento' | 'pano'>, vert: MalhaCm, hor: MalhaCm): Record<string, unknown> {
  return { id, lado: l.lado, pavimento: l.pavimento, pano: l.pano, vert: { phi: vert.phi, s: emM(vert.sCm) }, hor: { phi: hor.phi, s: emM(hor.sCm) } };
}
/** Parâmetros que editam o comprimento de emenda (cm) de um pavimento; vazio mantém o calculado. */
export function paramsEmendas(id: string, pavimento: string, tracaoCm?: number, compressaoCm?: number): Record<string, unknown> {
  return { id, emendas: [{ pavimento, ...(tracaoCm !== undefined ? { tracao: emM(tracaoCm) } : {}), ...(compressaoCm !== undefined ? { compressao: emM(compressaoCm) } : {}) }] };
}

/** Comando que bloqueia a malha e edita as emendas de uma parede ou de um pilar-parede. */
export const comandoDe = (tipo: 'parede' | 'pilarParede') => (tipo === 'parede' ? 'parede.armadura' : 'pilarParede.armadura');
/** Valores iniciais do editor de malha (espaçamentos em cm): os da linha do pano ou φ8 c/15. */
export function valoresIniciais(l: Pick<LinhaPano, 'vert' | 'hor'> | undefined): { vPhi: number; vS: number; hPhi: number; hS: number } {
  return { vPhi: l?.vert?.phi ?? 8, vS: l?.vert ? +(l.vert.s * 100).toFixed(1) : 15, hPhi: l?.hor?.phi ?? 8, hS: l?.hor ? +(l.hor.s * 100).toFixed(1) : 15 };
}

// ---------------------------------------------------------------- aberturas

export interface LinhaAbertura {
  id: string; tipo: 'porta' | 'janela'; parede: string; lance: string; dimensoes: string; necessaria: string;
  verga: string; estribo: string; peitoril: string; montante: string; canto: string; origem: string; situacao: string; status: 'ok' | 'fail';
  armadura: ArmaduraAbertura;
}
const barras = (x?: { n: number; phi: number }) => (x ? `${x.n} φ${n(x.phi, 1)}` : '—');
export function linhasAberturas(res: ResultadoParedeDim[]): LinhaAbertura[] {
  return res.filter((r) => r.tipo === 'parede').flatMap((r) => r.aberturas.map((a: ResultadoAbertura) => ({
    id: a.id, tipo: a.tipo, parede: r.nome, lance: a.nomePav, dimensoes: `${n(a.largura)} × ${n(a.altura)} m`, necessaria: `${n(a.necessaria.verga)} / ${n(a.necessaria.peitoril)} / ${n(a.necessaria.montante)} cm²`,
    verga: barras(a.armadura.verga), estribo: `φ${n(a.armadura.estribo.phi, 1)} c/${n(a.armadura.estribo.s * 100, 0)}`, peitoril: barras(a.armadura.peitoril), montante: barras(a.armadura.montante), canto: barras(a.armadura.canto),
    origem: a.origem, situacao: SITUACAO[a.status], status: a.status, armadura: a.armadura,
  })));
}

export interface FormAbertura { vergaN: number; vergaPhi: number; estriboPhi: number; estriboSCm: number; peitorilN: number; peitorilPhi: number; montanteN: number; montantePhi: number; cantoN: number; cantoPhi: number }
export const formDaArmadura = (a: ArmaduraAbertura): FormAbertura => ({ vergaN: a.verga.n, vergaPhi: a.verga.phi, estriboPhi: a.estribo.phi, estriboSCm: +(a.estribo.s * 100).toFixed(1), peitorilN: a.peitoril?.n ?? 0, peitorilPhi: a.peitoril?.phi ?? 10, montanteN: a.montante.n, montantePhi: a.montante.phi, cantoN: a.canto?.n ?? 0, cantoPhi: a.canto?.phi ?? 10 });
/** `ArmaduraAbertura` do formulário (peitoril e cantos só com n > 0; peitoril só em janela). */
export function armaduraDoForm(f: FormAbertura, tipo: 'porta' | 'janela'): ArmaduraAbertura {
  return {
    verga: { n: f.vergaN, phi: f.vergaPhi }, estribo: { phi: f.estriboPhi, s: emM(f.estriboSCm) }, montante: { n: f.montanteN, phi: f.montantePhi },
    ...(tipo === 'janela' && f.peitorilN > 0 ? { peitoril: { n: f.peitorilN, phi: f.peitorilPhi } } : {}), ...(f.cantoN > 0 ? { canto: { n: f.cantoN, phi: f.cantoPhi } } : {}),
  };
}
/** Ids das aberturas do mesmo tipo (todas as paredes), menos a de origem: destino do "copiar para as de mesmo tipo". */
export function aberturasDoMesmoTipo(b: BuildingModel, id: string): string[] {
  const todas = (b.paredes ?? []).flatMap((w) => w.aberturas ?? []);
  const o = todas.find((a) => a.id === id);
  return o ? todas.filter((a) => a.tipo === o.tipo && a.id !== id).map((a) => a.id) : [];
}

// ---------------------------------------------------------------- muros de arrimo

export interface LinhaMuro { id: string; nome: string; geometria: string; fsTombamento: string; fsDeslizamento: string; tensao: string; fuste: string; base: string; aco: string; situacao: string; status: 'ok' | 'fail' }
export function linhasMuros(b: BuildingModel, muros: ResultadoMuroDim[] | undefined): LinhaMuro[] {
  return (b.murosArrimo ?? []).map((m) => {
    const r = muros?.find((x) => x.id === m.id);
    const base = `H ${n(m.H)} m · base ${n(m.B)} × ${n(m.hBase)} m · fuste ${n(m.tTopo * 100, 0)}–${n(m.tBase * 100, 0)} cm`;
    if (!r) return { id: m.id, nome: m.nome, geometria: base, fsTombamento: '—', fsDeslizamento: '—', tensao: '—', fuste: '—', base: '—', aco: '—', situacao: 'calcule', status: 'ok' as const };
    const e = r.estabilidade;
    return {
      id: m.id, nome: m.nome, geometria: base, fsTombamento: n(e.FSt), fsDeslizamento: n(e.FSd), tensao: `${n(e.sigmaMax, 1)} / ${n(e.sigmaMin, 1)} kN/m²`,
      fuste: `${malha(r.fuste.principal)}${r.fuste.alturaCorte !== null ? `, metade cortada a ${n(r.fuste.alturaCorte)} m` : ''}`, base: `ponta ${malha(r.base.ponta.malha)} · talão ${malha(r.base.talao.malha)}`, aco: `${n(r.peso, 1)} kg/m`,
      situacao: r.status === 'ok' && e.atende.tombamento && e.atende.deslizamento && e.atende.tensao ? 'atende' : 'não atende', status: r.status === 'ok' && e.atende.tombamento && e.atende.deslizamento && e.atende.tensao ? 'ok' as const : 'fail' as const,
    };
  });
}

// ---------------------------------------------------------------- isofaixas dos campos

export const N_FAIXAS_ISO = 11;
/** Faixa (0 a `faixas − 1`) do valor entre o mínimo e o máximo do campo; campo constante cai na faixa do meio. */
export function faixaDoCampo(valor: number, min: number, max: number, faixas = N_FAIXAS_ISO): number {
  if (!(max > min)) return Math.floor((faixas - 1) / 2);
  return Math.max(0, Math.min(faixas - 1, Math.floor(((valor - min) / (max - min)) * faixas)));
}
/** Caixa (s, z) dos triângulos do campo, para o `viewBox` do SVG. */
export function caixaDoCampo(c: CampoLado): { s0: number; z0: number; s1: number; z1: number } {
  const ps = c.tris.flatMap((t) => t.v);
  return { s0: Math.min(...ps.map((p) => p[0])), s1: Math.max(...ps.map((p) => p[0])), z0: Math.min(...ps.map((p) => p[1])), z1: Math.max(...ps.map((p) => p[1])) };
}
