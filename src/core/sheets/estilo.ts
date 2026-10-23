// Estilo de desenho das pranchas (V5, K1.4.90): tabela editável de camadas (nome, cor ACI, pena, tipo de linha) e
// fator de tamanho de texto por tipo. O padrão é o atual (NBR 16861, `CAMADAS`), que também é o do perfil NBR.
// PDF, SVG, DXF e DWG leem o estilo resolvido da prancha (`Prancha.estilo`). Penas e cores fora do padrão: a confirmar.
import type { EstiloParcial } from '../building/types';
import { CAMADAS, type Camada, type Prancha, type Prim } from './prancha';

export interface CamadaEstilo { nome: string; cor: number; pena: number; tipo: 'cont' | 'trac' | 'eixo' }
export type TipoTexto = 'rotulos' | 'cotas' | 'eixos' | 'carimbo' | 'quadros' | 'armadura' | 'cargas';
export interface EstiloDesenho { camadas: Record<Camada, CamadaEstilo>; textos: Record<TipoTexto, number> }

/** Tipos de texto e as camadas a que se aplicam. */
export const TIPOS_TEXTO: Record<TipoTexto, { rotulo: string; camadas: Camada[] }> = {
  rotulos: { rotulo: 'Nomes e seções', camadas: ['TEXTO', 'LAJE', 'PILAR', 'VIGA', 'FUNDACAO'] },
  cotas: { rotulo: 'Cotas', camadas: ['COTA'] },
  eixos: { rotulo: 'Eixos', camadas: ['EIXO'] },
  carimbo: { rotulo: 'Legenda e títulos', camadas: ['FOLHA', 'FOLHA-FINA', 'FOLHA-TEXTO'] },
  quadros: { rotulo: 'Quadros e tabelas', camadas: ['QUADRO'] },
  armadura: { rotulo: 'Armaduras', camadas: ['ARMADURA', 'ARMADURA-NEG', 'CONCRETO', 'FORMA-FINA'] },
  cargas: { rotulo: 'Cargas', camadas: ['CARGA-G', 'CARGA-Q', 'CARGA-W', 'CARGA-E', 'CARGA-H', 'CARGA-ADIC'] },
};
export const PENAS_NBR16861 = [0.13, 0.18, 0.25, 0.35, 0.5, 0.7, 1, 1.4, 2];

export const ESTILO_PADRAO: EstiloDesenho = {
  camadas: Object.fromEntries((Object.keys(CAMADAS) as Camada[]).map((c) => [c, { nome: c, cor: CAMADAS[c].cor, pena: CAMADAS[c].pena, tipo: CAMADAS[c].tipo }])) as Record<Camada, CamadaEstilo>,
  textos: { rotulos: 1, cotas: 1, eixos: 1, carimbo: 1, quadros: 1, armadura: 1, cargas: 1 },
};

const NOME_INVALIDO = /[<>/\\":;?*|=`,]/;

/** Erros do estilo parcial (vazio = válido): camada desconhecida, cor ACI 1–255, pena 0,05–2,11 mm, nomes únicos e legais no DXF, fator de texto 0,5–3. */
export function validarEstilo(p: EstiloParcial | undefined): string[] {
  const erros: string[] = [];
  if (!p) return erros;
  const nomes = new Map<string, string>();
  const eff = resolverEstilo(p);
  for (const [c, v] of Object.entries(p.camadas ?? {})) {
    if (!(c in CAMADAS)) { erros.push(`Camada desconhecida: ${c}.`); continue; }
    if (v.cor !== undefined && (!Number.isInteger(v.cor) || v.cor < 1 || v.cor > 255)) erros.push(`Camada ${c}: cor ACI ${v.cor} fora de 1 a 255.`);
    if (v.pena !== undefined && !(v.pena >= 0.05 && v.pena <= 2.11)) erros.push(`Camada ${c}: pena ${v.pena} mm fora de 0,05 a 2,11.`);
    if (v.tipo !== undefined && !['cont', 'trac', 'eixo'].includes(v.tipo)) erros.push(`Camada ${c}: tipo de linha inválido.`);
    if (v.nome !== undefined && (!v.nome.trim() || v.nome.length > 60 || NOME_INVALIDO.test(v.nome))) erros.push(`Camada ${c}: nome inválido (vazio, longo ou com caracteres proibidos no DXF).`);
  }
  for (const c of Object.keys(eff.camadas) as Camada[]) {
    const n = eff.camadas[c].nome.toUpperCase(), outro = nomes.get(n);
    if (outro) erros.push(`Camadas ${outro} e ${c} com o mesmo nome (${eff.camadas[c].nome}).`); else nomes.set(n, c);
    if (['0', 'JANELA'].includes(n)) erros.push(`Camada ${c}: o nome ${eff.camadas[c].nome} é reservado.`);
  }
  for (const [t, f] of Object.entries(p.textos ?? {})) {
    if (!(t in TIPOS_TEXTO)) erros.push(`Tipo de texto desconhecido: ${t}.`);
    else if (!(f >= 0.5 && f <= 3)) erros.push(`Texto ${t}: fator ${f} fora de 0,5 a 3.`);
  }
  return erros;
}

export function resolverEstilo(p?: EstiloParcial): EstiloDesenho {
  const camadas = Object.fromEntries((Object.keys(ESTILO_PADRAO.camadas) as Camada[]).map((c) => [c, { ...ESTILO_PADRAO.camadas[c], ...(p?.camadas?.[c] ?? {}) }])) as Record<Camada, CamadaEstilo>;
  return { camadas, textos: { ...ESTILO_PADRAO.textos, ...(p?.textos ?? {}) } as Record<TipoTexto, number> };
}

/** Estilo da camada na prancha (o da prancha, ou o padrão). */
export const camadaEstilo = (pr: Pick<Prancha, 'estilo'>, c: Camada): CamadaEstilo => pr.estilo?.camadas[c] ?? ESTILO_PADRAO.camadas[c];
/** Nome da camada nos arquivos (DXF, DWG, PDF). */
export const nomeCamada = (pr: Pick<Prancha, 'estilo'>, c: Camada) => camadaEstilo(pr, c).nome;
/** Tipo de texto de uma camada. */
export const tipoDeTexto = (c: Camada): TipoTexto | null => (Object.keys(TIPOS_TEXTO) as TipoTexto[]).find((t) => TIPOS_TEXTO[t].camadas.includes(c)) ?? null;

/** Estilo é o padrão (nada a aplicar). */
export const estiloVazio = (p?: EstiloParcial) => !p || (!Object.keys(p.camadas ?? {}).length && !Object.keys(p.textos ?? {}).length);

/**
 * Aplica o estilo a uma prancha pronta: guarda o estilo resolvido (camadas, para os escritores) e escala a altura dos
 * textos por tipo (em torno do ponto de inserção). Sem estilo devolve a própria prancha.
 */
export function aplicarEstilo(pr: Prancha, p?: EstiloParcial): Prancha {
  if (estiloVazio(p)) return pr;
  const est = resolverEstilo(p);
  const esc = (q: Prim): Prim => {
    if (q.t !== 'txt') return q;
    const t = tipoDeTexto(q.c), f = t ? est.textos[t] : 1;
    return f === 1 ? q : { ...q, h: q.h * f };
  };
  return { ...pr, modelo: pr.modelo.map(esc), papel: pr.papel.map(esc), estilo: est };
}

// ---------------- biblioteca do usuário ----------------

export interface EstiloSalvo { tipo: 'estilo-desenho'; versao: 1; nome: string; estilo: EstiloParcial }
export const salvarEstilo = (nome: string, estilo: EstiloParcial): string => JSON.stringify({ tipo: 'estilo-desenho', versao: 1, nome, estilo } satisfies EstiloSalvo);
export function abrirEstilo(texto: string): { nome: string; estilo: EstiloParcial } | { erro: string } {
  try {
    const o = JSON.parse(texto) as Partial<EstiloSalvo>;
    if (o.tipo !== 'estilo-desenho' || o.versao !== 1 || !o.estilo) return { erro: 'Arquivo não é um estilo de desenho.' };
    const e = validarEstilo(o.estilo);
    return e.length ? { erro: e[0] } : { nome: String(o.nome ?? 'Estilo'), estilo: o.estilo };
  } catch { return { erro: 'Arquivo ilegível.' }; }
}
